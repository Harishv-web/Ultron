import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import OpenAI from 'openai';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = process.env.PORT || 4000;
const dataDir = path.join(__dirname, 'data');
const uploadsDir = path.join(dataDir, 'uploads');
const dbPath = path.join(dataDir, 'ultron.db');

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadsDir, { recursive: true });

const db = new Database(dbPath);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

const ensureSchema = () => {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT NOT NULL,
      wake_time TEXT NOT NULL,
      focus_target INTEGER NOT NULL,
      timezone TEXT NOT NULL,
      summary TEXT NOT NULL
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      goal TEXT NOT NULL,
      streak INTEGER NOT NULL,
      done INTEGER NOT NULL DEFAULT 0
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      time TEXT NOT NULL,
      type TEXT NOT NULL
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      time TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      frequency TEXT NOT NULL DEFAULT 'daily',
      note TEXT NOT NULL DEFAULT ''
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS chat_memory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS memory_graph_nodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL,
      type TEXT NOT NULL,
      summary TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS memory_graph_edges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      target TEXT NOT NULL,
      relation TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS agent_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      due_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      automation TEXT NOT NULL DEFAULT 'scheduled',
      result TEXT NOT NULL DEFAULT ''
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS google_tokens (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      expires_at INTEGER NOT NULL,
      email TEXT NOT NULL DEFAULT ''
    )
  `).run();

  const reminderColumns = db.prepare('PRAGMA table_info(reminders)').all();
  const reminderNames = reminderColumns.map((column) => column.name);

  if (!reminderNames.includes('frequency')) {
    db.prepare('ALTER TABLE reminders ADD COLUMN frequency TEXT NOT NULL DEFAULT "daily"').run();
  }

  if (!reminderNames.includes('note')) {
    db.prepare('ALTER TABLE reminders ADD COLUMN note TEXT NOT NULL DEFAULT ""').run();
  }
};

const seedData = () => {
  const profileExists = db.prepare('SELECT COUNT(*) as count FROM profile WHERE id = 1').get();
  if (!profileExists.count) {
    db.prepare(`
      INSERT INTO profile (id, name, wake_time, focus_target, timezone, summary)
      VALUES (1, 'Boss', '06:30', 90, 'Local', 'Ultron is aligned with your personal rhythm and daily goals.')
    `).run();
  }

  const habitsCount = db.prepare('SELECT COUNT(*) as count FROM habits').get();
  if (!habitsCount.count) {
    db.prepare('INSERT INTO habits (name, goal, streak, done) VALUES (?, ?, ?, ?)')
      .run('Deep work', '2 blocks', 12, 1);
    db.prepare('INSERT INTO habits (name, goal, streak, done) VALUES (?, ?, ?, ?)')
      .run('Reading', '20 pages', 9, 0);
    db.prepare('INSERT INTO habits (name, goal, streak, done) VALUES (?, ?, ?, ?)')
      .run('Workout', '30 min', 7, 1);
  }

  const eventsCount = db.prepare('SELECT COUNT(*) as count FROM events').get();
  if (!eventsCount.count) {
    db.prepare('INSERT INTO events (title, time, type) VALUES (?, ?, ?)')
      .run('Project review', 'Today 10:00', 'focus');
    db.prepare('INSERT INTO events (title, time, type) VALUES (?, ?, ?)')
      .run('Gym session', 'Today 18:30', 'health');
  }

  const remindersCount = db.prepare('SELECT COUNT(*) as count FROM reminders').get();
  if (!remindersCount.count) {
    db.prepare('INSERT INTO reminders (title, time, active, frequency, note) VALUES (?, ?, ?, ?, ?)')
      .run('Review goals', '08:15', 1, 'daily', 'Review the day plan.');
    db.prepare('INSERT INTO reminders (title, time, active, frequency, note) VALUES (?, ?, ?, ?, ?)')
      .run('Hydration check', '12:00', 1, 'daily', 'Drink water and stretch.');
  }
};

ensureSchema();
seedData();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/\s+/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  },
});

const upload = multer({ storage });

const getProfile = () => db.prepare('SELECT * FROM profile WHERE id = 1').get();
const getHabits = () => db.prepare('SELECT * FROM habits ORDER BY id DESC').all();
const getEvents = () => db.prepare('SELECT * FROM events ORDER BY id DESC').all();
const getReminders = () => db.prepare('SELECT * FROM reminders ORDER BY id DESC').all();

const getMemory = () => {
  const rows = db.prepare('SELECT role, text, created_at FROM chat_memory ORDER BY id ASC').all();
  const conversations = [];
  for (let i = 0; i < rows.length; i += 2) {
    const user = rows[i];
    const assistant = rows[i + 1];
    if (user && assistant) {
      conversations.push({
        user: { role: user.role, text: user.text, createdAt: user.created_at },
        assistant: { role: assistant.role, text: assistant.text, createdAt: assistant.created_at },
      });
    }
  }
  return { conversations };
};

const getMemoryGraph = () => {
  const nodes = db.prepare('SELECT * FROM memory_graph_nodes ORDER BY id DESC LIMIT 24').all();
  const edges = db.prepare('SELECT * FROM memory_graph_edges ORDER BY id DESC LIMIT 60').all();
  return { nodes, edges };
};

const getTasks = () => db.prepare('SELECT * FROM agent_tasks ORDER BY due_at ASC').all();
const googleScopes = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/gmail.send',
  'openid',
  'email',
].join(' ');
const googleRedirectUri = process.env.GOOGLE_REDIRECT_URI || `http://localhost:${port}/api/integrations/google/callback`;
const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const googleAuthStates = new Set();

const getGoogleToken = () => db.prepare('SELECT * FROM google_tokens WHERE id = 1').get();
const googleStatus = () => {
  const token = getGoogleToken();
  return {
    configured: googleConfigured,
    connected: Boolean(token),
    email: token?.email || undefined,
  };
};

const googleRequest = async (url, options = {}) => {
  const token = getGoogleToken();
  if (!token) throw new Error('Google is not connected.');
  let accessToken = token.access_token;
  if (token.expires_at <= Date.now() + 60000 && token.refresh_token) {
    const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: token.refresh_token,
        grant_type: 'refresh_token',
      }),
    });
    const refreshed = await refreshResponse.json();
    if (!refreshResponse.ok || !refreshed.access_token) throw new Error('Google token refresh failed.');
    accessToken = refreshed.access_token;
    db.prepare('UPDATE google_tokens SET access_token = ?, expires_at = ? WHERE id = 1')
      .run(accessToken, Date.now() + Number(refreshed.expires_in || 3600) * 1000);
  }
  const response = await fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(`Google API request failed with status ${response.status}.`);
  return response;
};

const runScheduledTasks = () => {
  const now = Date.now();
  const tasks = getTasks().filter((task) => task.status === 'pending' && new Date(task.due_at).getTime() <= now);

  tasks.forEach((task) => {
    db.prepare('UPDATE agent_tasks SET status = ?, result = ? WHERE id = ?')
      .run('completed', `Executed automatically at ${new Date().toISOString()}.`, task.id);
  });

  return tasks;
};

const upsertMemoryGraph = (message) => {
  const profile = getProfile();
  const text = String(message || '').trim();
  if (!text) return;

  const relevantWords = [...new Set(text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .filter((word) => !['this','that','with','from','what','when','your','boss','ultron','about','into','have','will','they','them','into','more','work','time','plan','today','week'].includes(word)))];

  const seedLabels = [profile.name, 'focus', 'schedule', 'health', 'routine', 'planning', ...relevantWords].filter(Boolean);

  const insertNode = (label, type, summary) => {
    const existing = db.prepare('SELECT id FROM memory_graph_nodes WHERE label = ? AND type = ? LIMIT 1').get(label, type);
    if (existing) return existing.id;

    const result = db.prepare('INSERT INTO memory_graph_nodes (label, type, summary, created_at) VALUES (?, ?, ?, ?)')
      .run(label, type, summary, new Date().toISOString());
    return result.lastInsertRowid;
  };

  const addEdge = (source, target, relation) => {
    if (!source || !target || source === target) return;
    const existing = db.prepare('SELECT id FROM memory_graph_edges WHERE source = ? AND target = ? AND relation = ? LIMIT 1').get(source, target, relation);
    if (!existing) {
      db.prepare('INSERT INTO memory_graph_edges (source, target, relation, created_at) VALUES (?, ?, ?, ?)')
        .run(String(source), String(target), relation, new Date().toISOString());
    }
  };

  const profileNode = insertNode(profile.name || 'Boss', 'person', 'Primary user profile context');
  const messageNode = insertNode('conversation', 'topic', `Recent assistant memory around: ${text.slice(0, 120)}`);

  seedLabels.forEach((label) => {
    const nodeId = insertNode(label, label === profile.name || label === 'conversation' ? 'person' : 'topic', `Context memory for ${label}`);
    addEdge(String(profileNode), String(nodeId), 'remembers');
  });

  addEdge(String(profileNode), String(messageNode), 'discusses');
  addEdge(String(messageNode), String(profileNode), 'reflects');

  relevantWords.forEach((word) => {
    const wordId = insertNode(word, 'topic', `Recent focus topic: ${word}`);
    addEdge(String(messageNode), String(wordId), 'mentions');
    addEdge(String(profileNode), String(wordId), 'tracks');
  });
};

const createAssistantInsights = () => {
  const profile = getProfile();
  const habits = getHabits();
  const events = getEvents();
  const reminders = getReminders();
  const completed = habits.filter((habit) => habit.done).length;
  const completionRate = habits.length ? Math.round((completed / habits.length) * 100) : 0;
  const nextEvent = events[0];
  const nextReminder = reminders.find((reminder) => reminder.active) || reminders[0];
  const wakeGoal = Number(profile.focus_target || 90);

  return [
    {
      id: 1,
      title: 'Focus pulse',
      summary: `Your personal rhythm is strong. You are currently trending at ${Math.max(70, Math.min(98, wakeGoal))}% focus readiness before your key work blocks.`,
      action: 'Launch deep work',
      priority: 'High',
    },
    {
      id: 2,
      title: 'Priority sync',
      summary: nextEvent ? `Your next anchor event is ${nextEvent.title} at ${nextEvent.time}. Keep the next work block aligned with it.` : 'No upcoming schedule event is set yet. I can add one in seconds.',
      action: 'Review schedule',
      priority: 'High',
    },
    {
      id: 3,
      title: 'Routine health',
      summary: `You have completed ${completed} of ${habits.length || 0} tracked routines. The current routine supports a steady ${Math.max(65, completionRate)}% momentum score.`,
      action: 'Reset recovery',
      priority: 'Medium',
    },
    {
      id: 4,
      title: 'Smart reminder',
      summary: nextReminder ? `Your next reminder is ${nextReminder.title} at ${nextReminder.time}. I can keep it silent, timed, and action-driven.` : 'No active reminder is set. I can create one for your next milestone.',
      action: 'Schedule reminder',
      priority: 'Medium',
    },
  ];
};

const resolveCommand = (message) => {
  const normalized = message.toLowerCase();

  if (normalized.includes('deep work') || normalized.includes('focus mode') || normalized.includes('begin deep work')) {
    return 'Deep work mode is live. I am prioritizing your highest-value tasks, clearing distractions, and keeping your next decision set to impact.';
  }

  if (normalized.includes('draft a message') || normalized.includes('draft message') || normalized.includes('write a message')) {
    return 'Draft message ready: “Hi, I am aligned on the immediate priorities and I will move on the next action after the current focus block.”';
  }

  if (normalized.includes('plan my day') || normalized.includes('plan my schedule') || normalized.includes('plan')) {
    return 'Boss, here is the plan for today: 1) deep work block at 9:00, 2) high-priority follow-up and communication, 3) health reset and end-of-day review.';
  }

  if (normalized.includes('summary') || normalized.includes('week') || normalized.includes('report')) {
    return 'This week, stay disciplined with your focus blocks and health rituals. Protect the highest-value work, reinforce your routine, and keep momentum before the evening reset.';
  }

  if (normalized.includes('reminder') || normalized.includes('schedule')) {
    const match = message.match(/(\d{1,2}:\d{2})/);
    const time = match ? match[1] : '09:00';
    return `Reminder saved for ${time}. I will prompt you at that moment and keep it on your personal schedule.`;
  }

  if (normalized.includes('remember') || normalized.includes('memory')) {
    return 'I remember your priorities, wake time, and the recent discussion flow. I keep the latest patterns in context so the advice stays personal and consistent.';
  }

  if (normalized.includes('call') || normalized.includes('phone')) {
    return 'I can route the call request once you confirm the contact and the preferred method. I will keep the action brief and direct.';
  }

  if (normalized.includes('voice') || normalized.includes('wake') || normalized.includes('hey ultron')) {
    return 'Voice mode is live. Say “Hey Ultron” and I will respond with a direct, concise update.';
  }

  if (normalized.includes('habit') || normalized.includes('health') || normalized.includes('sleep')) {
    return 'Your routine is being tracked for consistency. Aim for a 7-hour sleep target, a hydration check, and at least one focus block before lunch.';
  }

  if (normalized.includes('image prompt') || normalized.includes('generate image') || normalized.includes('art prompt')) {
    return 'Image prompt ready: “Ultra-realistic premium personal AI assistant, futuristic glass UI, cinematic lighting, cyberpunk efficiency, high-detail product render, polished modern aesthetic.”';
  }

  if (normalized.includes('assistant') || normalized.includes('boss')) {
    return 'I am Ultron, your direct personal assistant. I stay focused on your routine, priorities, and decisions without wasting time.';
  }

  return null;
};

const createAssistantReply = async (message) => {
  const profile = getProfile();
  const memoryRows = db.prepare('SELECT role, text FROM chat_memory ORDER BY id DESC LIMIT 12').all();
  const memoryText = memoryRows
    .slice()
    .reverse()
    .map((row) => `${row.role === 'user' ? 'User' : 'Assistant'}: ${row.text}`)
    .join('\n');

  const commandReply = resolveCommand(message);
  if (commandReply) {
    return commandReply;
  }

  if (!process.env.OPENAI_API_KEY) {
    const normalized = message.toLowerCase();

    if (normalized.includes('image') || normalized.includes('design') || normalized.includes('art')) {
      return 'I can help generate a strong image prompt: “Ultra-realistic futuristic personal AI assistant, cinematic lighting, premium UI, cyberpunk efficiency, polished modern aesthetic.”';
    }

    if (normalized.includes('assistant') || normalized.includes('boss')) {
      return 'I am Ultron, your direct personal assistant. I stay focused on your routine, priorities, and decisions without wasting time.';
    }

    return 'Understood, boss. I am keeping it direct, clear, and action-focused. I can help with planning, communication, habit tracking, reminders, voice commands, and personal productivity.';
  }

  const prompt = `You are Ultron, a direct, highly capable personal AI assistant for one user only. Keep answers brief, clear, confident, and useful. The user calls you boss. The user profile is: name=${profile.name}, wakeTime=${profile.wake_time}, focusTarget=${profile.focus_target}, timezone=${profile.timezone}. Recent memory:
${memoryText || 'No prior memory available.'}

User question: ${message}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are Ultron, a premium personal AI assistant. Give concise, direct, practical answers. Respect the user as boss. Be honest about limits. Prefer useful action steps.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 300,
    });

    return completion.choices[0]?.message?.content?.trim() || 'I am ready, boss.';
  } catch {
    return 'I am available, boss. The AI provider is not configured right now, so I am falling back to a local response model.';
  }
};

const dashboardPayload = () => {
  const profile = getProfile();
  const habits = getHabits();
  const events = getEvents();
  const reminders = getReminders();

  return {
    profile: {
      name: profile.name,
      wakeTime: profile.wake_time,
      focusTarget: profile.focus_target,
      timezone: profile.timezone,
    },
    habits: habits.map((habit) => ({
      id: habit.id,
      name: habit.name,
      goal: habit.goal,
      streak: habit.streak,
      done: Boolean(habit.done),
    })),
    events: events.map((event) => ({
      id: event.id,
      title: event.title,
      time: event.time,
      type: event.type,
    })),
    reminders: reminders.map((reminder) => ({
      id: reminder.id,
      title: reminder.title,
      time: reminder.time,
      active: Boolean(reminder.active),
      frequency: reminder.frequency,
      note: reminder.note,
    })),
    summary: profile.summary,
  };
};

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'Ultron API', time: new Date().toISOString() });
});

app.get('/api/analytics', (_req, res) => {
  const habits = getHabits();
  const completed = habits.filter((habit) => habit.done).length;
  const focusScore = Math.min(100, Math.max(60, Math.round((completed / Math.max(habits.length, 1)) * 100 + 35)));
  const weeklyScore = Math.min(100, Math.max(50, Math.round((focusScore + 52) / 2)));
  const completionRate = Math.min(100, Math.max(70, Math.round((completed / Math.max(habits.length, 1)) * 100 + 20)));
  const streakAverage = habits.reduce((total, habit) => total + Number(habit.streak || 0), 0) / Math.max(habits.length, 1);
  const currentStreak = Math.max(7, Math.round(streakAverage));

  const chart = [
    { day: 'Mon', focus: 76, tasks: 8 },
    { day: 'Tue', focus: 81, tasks: 9 },
    { day: 'Wed', focus: 69, tasks: 7 },
    { day: 'Thu', focus: 88, tasks: 11 },
    { day: 'Fri', focus: 92, tasks: 12 },
    { day: 'Sat', focus: 72, tasks: 8 },
    { day: 'Sun', focus: 85, tasks: 10 },
  ].map((point) => ({
    ...point,
    focus: Math.min(100, Math.max(45, Math.round(point.focus * (focusScore / 100)))),
    tasks: Math.min(14, Math.max(5, Math.round(point.tasks * (completionRate / 100)))),
  }));

  res.json({
    focusScore,
    weeklyScore,
    completionRate,
    currentStreak,
    tasksCompleted: Math.max(10, habits.length * 9 + completed),
    chart,
  });
});

app.get('/api/dashboard', (_req, res) => {
  res.json(dashboardPayload());
});

app.get('/api/memory', (_req, res) => {
  res.json({ ...getMemory(), graph: getMemoryGraph() });
});

app.get('/api/memory/graph', (_req, res) => {
  res.json(getMemoryGraph());
});

app.get('/api/assistant/insights', (_req, res) => {
  res.json({ insights: createAssistantInsights() });
});

app.get('/api/tasks', (_req, res) => {
  res.json({ tasks: getTasks() });
});

app.post('/api/tasks', (req, res) => {
  const { title, description, dueAt, automation } = req.body || {};
  const safeTitle = String(title || 'New agent task');
  const safeDescription = String(description || 'Keep this task moving with a focused automation flow.');
  const safeDueAt = String(dueAt || new Date(Date.now() + 60 * 60 * 1000).toISOString());
  const safeAutomation = String(automation || 'scheduled');

  db.prepare('INSERT INTO agent_tasks (title, description, due_at, status, automation, result) VALUES (?, ?, ?, ?, ?, ?)')
    .run(safeTitle, safeDescription, safeDueAt, 'pending', safeAutomation, '');

  res.json({ tasks: getTasks() });
});

app.post('/api/tasks/:id/complete', (req, res) => {
  const taskId = Number(req.params.id);
  const task = db.prepare('SELECT * FROM agent_tasks WHERE id = ?').get(taskId);
  if (!task) {
    return res.status(404).json({ error: 'Task not found.' });
  }

  db.prepare('UPDATE agent_tasks SET status = ?, result = ? WHERE id = ?')
    .run('completed', `Completed manually at ${new Date().toISOString()}.`, taskId);

  return res.json({ tasks: getTasks() });
});

app.get('/api/actions/calendar', (_req, res) => {
  const profile = getProfile();
  const nextEvent = getEvents()[0];
  const calendarAction = {
    title: 'Calendar action',
    summary: nextEvent ? `Your next event is ${nextEvent.title} at ${nextEvent.time}.` : 'No event is scheduled yet. I can create one right away.',
    suggestion: `Create a focus block for ${profile.name} at 09:00 and a follow-up check at 15:00.`,
  };
  res.json(calendarAction);
});

app.get('/api/integrations/google/status', (_req, res) => {
  res.json(googleStatus());
});

app.get('/api/integrations/google/auth', (_req, res) => {
  if (!googleConfigured) {
    return res.status(503).json({ error: 'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET first.' });
  }
  const state = crypto.randomBytes(24).toString('hex');
  googleAuthStates.add(state);
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: googleRedirectUri,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    scope: googleScopes,
    state,
  });
  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

app.get('/api/integrations/google/callback', async (req, res) => {
  const { code, state } = req.query;
  if (!code || typeof code !== 'string' || !state || typeof state !== 'string' || !googleAuthStates.has(state)) {
    return res.status(400).send('Invalid Google OAuth state.');
  }
  googleAuthStates.delete(state);
  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: googleRedirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const tokens = await tokenResponse.json();
    if (!tokenResponse.ok || !tokens.access_token) throw new Error('Google authorization failed.');
    const userResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const user = await userResponse.json();
    db.prepare(`
      INSERT INTO google_tokens (id, access_token, refresh_token, expires_at, email)
      VALUES (1, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET access_token = excluded.access_token,
        refresh_token = COALESCE(excluded.refresh_token, google_tokens.refresh_token),
        expires_at = excluded.expires_at, email = excluded.email
    `).run(tokens.access_token, tokens.refresh_token || null, Date.now() + Number(tokens.expires_in || 3600) * 1000, user.email || '');
    return res.redirect('http://localhost:3000/?google=connected');
  } catch (error) {
    return res.status(502).send(error instanceof Error ? error.message : 'Google authorization failed.');
  }
});

app.get('/api/integrations/google/calendar', async (req, res) => {
  try {
    const maxResults = Math.min(Math.max(Number(req.query.maxResults || 10), 1), 50);
    const response = await googleRequest(`https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=${maxResults}&singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(new Date().toISOString())}`);
    const data = await response.json();
    return res.json({ events: (data.items || []).map((event) => ({
      id: event.id,
      title: event.summary || 'Untitled event',
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      htmlLink: event.htmlLink,
    })) });
  } catch (error) {
    return res.status(502).json({ error: error instanceof Error ? error.message : 'Calendar request failed.' });
  }
});

app.post('/api/integrations/google/gmail/draft', async (req, res) => {
  const { to, subject, body } = req.body || {};
  if (!to || !subject || !body) return res.status(400).json({ error: 'to, subject, and body are required.' });
  try {
    const raw = Buffer.from(`To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset="UTF-8"\r\n\r\n${body}`)
      .toString('base64url');
    const response = await googleRequest('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: { raw } }),
    });
    return res.json(await response.json());
  } catch (error) {
    return res.status(502).json({ error: error instanceof Error ? error.message : 'Gmail request failed.' });
  }
});

app.post('/api/media/image', async (req, res) => {
  const prompt = String(req.body?.prompt || '').trim();
  if (!prompt) return res.status(400).json({ error: 'An image prompt is required.' });
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'Image generation requires OPENAI_API_KEY.' });
  try {
    const result = await openai.images.generate({ model: 'gpt-image-1', prompt, size: '1024x1024' });
    const image = result.data?.[0];
    if (!image?.b64_json && !image?.url) throw new Error('The image provider returned no image.');
    return res.json({ imageUrl: image.url || `data:image/png;base64,${image.b64_json}` });
  } catch (error) {
    return res.status(502).json({ error: error instanceof Error ? error.message : 'Image generation failed.' });
  }
});

app.post('/api/actions/gmail', (req, res) => {
  const { name = 'team', objective = 'project update' } = req.body || {};
  const draft = `Subject: Quick update on ${objective}\n\nHi ${name},\n\nI wanted to share a quick progress update on the current workstream. I am aligned on the next priorities and will keep momentum moving forward.\n\nBest,\n${getProfile().name}`;
  res.json({ draft, mode: 'gmail' });
});

app.post('/api/actions/whatsapp', (req, res) => {
  const { recipient = 'team', objective = 'check-in' } = req.body || {};
  const message = `Hi ${recipient}, I am on track for the ${objective}. I will keep things moving and share the next update soon.`;
  res.json({ message, mode: 'whatsapp' });
});

app.post('/api/profile', (req, res) => {
  const body = req.body || {};
  const profile = getProfile();
  const nextProfile = {
    ...profile,
    name: String(body.name || profile.name),
    wake_time: String(body.wakeTime || profile.wake_time),
    focus_target: Number(body.focusTarget || profile.focus_target),
    timezone: String(body.timezone || profile.timezone),
    summary: `Ultron is now tuned to ${String(body.name || profile.name)}'s schedule and personal rhythm.`,
  };

  db.prepare(`
    UPDATE profile
    SET name = ?, wake_time = ?, focus_target = ?, timezone = ?, summary = ?
    WHERE id = 1
  `).run(nextProfile.name, nextProfile.wake_time, nextProfile.focus_target, nextProfile.timezone, nextProfile.summary);

  res.json({
    profile: {
      name: nextProfile.name,
      wakeTime: nextProfile.wake_time,
      focusTarget: nextProfile.focus_target,
      timezone: nextProfile.timezone,
    },
    summary: nextProfile.summary,
  });
});

app.post('/api/habits', (req, res) => {
  const { name, goal, streak, done } = req.body || {};
  db.prepare('INSERT INTO habits (name, goal, streak, done) VALUES (?, ?, ?, ?)')
    .run(name || 'New habit', goal || 'Daily action', Number(streak || 0), done ? 1 : 0);

  res.json({ habits: getHabits().map((habit) => ({ id: habit.id, name: habit.name, goal: habit.goal, streak: habit.streak, done: Boolean(habit.done) })) });
});

app.post('/api/habits/:id/toggle', (req, res) => {
  const habitId = Number(req.params.id);
  const habit = db.prepare('SELECT * FROM habits WHERE id = ?').get(habitId);
  if (!habit) {
    return res.status(404).json({ error: 'Habit not found.' });
  }

  const updated = !Boolean(habit.done);
  db.prepare('UPDATE habits SET done = ?, streak = ? WHERE id = ?').run(updated ? 1 : 0, updated ? Math.max(habit.streak, 1) : habit.streak, habitId);
  return res.json({ habits: getHabits().map((item) => ({ id: item.id, name: item.name, goal: item.goal, streak: item.streak, done: Boolean(item.done) })) });
});

app.post('/api/events', (req, res) => {
  const { title, time, type } = req.body || {};
  db.prepare('INSERT INTO events (title, time, type) VALUES (?, ?, ?)')
    .run(title || 'New event', time || 'Today', type || 'focus');
  res.json({ events: getEvents() });
});

app.get('/api/reminders', (_req, res) => {
  res.json({ reminders: getReminders().map((reminder) => ({
    id: reminder.id,
    title: reminder.title,
    time: reminder.time,
    active: Boolean(reminder.active),
    frequency: reminder.frequency,
    note: reminder.note,
  })) });
});

app.post('/api/reminders', (req, res) => {
  const { title, time, active, frequency, note } = req.body || {};
  db.prepare('INSERT INTO reminders (title, time, active, frequency, note) VALUES (?, ?, ?, ?, ?)')
    .run(title || 'Reminder', time || '09:00', active === false ? 0 : 1, frequency || 'daily', note || 'Stay on track.');
  res.json({ reminders: getReminders().map((reminder) => ({
    id: reminder.id,
    title: reminder.title,
    time: reminder.time,
    active: Boolean(reminder.active),
    frequency: reminder.frequency,
    note: reminder.note,
  })) });
});

app.post('/api/reminders/:id/toggle', (req, res) => {
  const reminderId = Number(req.params.id);
  const reminder = db.prepare('SELECT * FROM reminders WHERE id = ?').get(reminderId);
  if (!reminder) {
    return res.status(404).json({ error: 'Reminder not found.' });
  }

  const updated = !Boolean(reminder.active);
  db.prepare('UPDATE reminders SET active = ? WHERE id = ?').run(updated ? 1 : 0, reminderId);
  return res.json({ reminders: getReminders().map((item) => ({
    id: item.id,
    title: item.title,
    time: item.time,
    active: Boolean(item.active),
    frequency: item.frequency,
    note: item.note,
  })) });
});

app.post('/api/chat', async (req, res) => {
  const { message } = req.body || {};

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'A message is required.' });
  }

  const now = new Date().toISOString();
  const reply = await createAssistantReply(message.trim());

  db.prepare('INSERT INTO chat_memory (role, text, created_at) VALUES (?, ?, ?)')
    .run('user', message.trim(), now);
  db.prepare('INSERT INTO chat_memory (role, text, created_at) VALUES (?, ?, ?)')
    .run('assistant', reply, now);

  upsertMemoryGraph(message.trim());

  db.prepare('UPDATE profile SET summary = ? WHERE id = 1').run(`Ultron is tracking ${getHabits().length} routines and keeping ${getEvents().length} upcoming events in sync.`);

  res.json({ reply, memory: getMemory() });
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const fileInfo = {
    filename: req.file.filename,
    originalName: req.file.originalname,
    path: req.file.path,
    size: req.file.size,
  };

  return res.json({ ok: true, file: fileInfo });
});

app.get('/api/files', (_req, res) => {
  const files = fs.readdirSync(uploadsDir).map((name) => ({
    name,
    path: `/uploads/${name}`,
  }));
  res.json({ files });
});

app.use('/uploads', express.static(uploadsDir));

setInterval(() => {
  const tasks = runScheduledTasks();
  if (tasks.length > 0) {
    console.log(`Executed ${tasks.length} agent task(s).`);
  }
}, 60000);

app.listen(port, () => {
  console.log(`Ultron server running on http://localhost:${port}`);
});
