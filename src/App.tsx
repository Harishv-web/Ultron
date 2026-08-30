import React, { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Bell,
  BrainCircuit,
  CalendarDays,
  ChevronRight,
  Clock3,
  Download,
  FileText,
  Globe,
  MessageSquareText,
  Mic,
  MoonStar,
  Phone,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Upload,
  UserRound,
  Volume2,
  Wand2,
  Zap,
} from 'lucide-react';

type ChatMessage = {
  id: number;
  role: 'assistant' | 'user';
  text: string;
};

type Goal = {
  title: string;
  value: string;
  progress: number;
};

type Habit = {
  id: number;
  name: string;
  goal: string;
  streak: number;
  done: boolean;
};

type EventItem = {
  id: number;
  title: string;
  time: string;
  type: string;
};

type Reminder = {
  id: number;
  title: string;
  time: string;
  active: boolean;
  frequency: string;
  note: string;
};

type Analytics = {
  focusScore: number;
  weeklyScore: number;
  completionRate: number;
  currentStreak: number;
  tasksCompleted: number;
};

type ChartPoint = {
  day: string;
  focus: number;
  tasks: number;
};

const initialMessages: ChatMessage[] = [
  {
    id: 1,
    role: 'assistant',
    text: 'Good evening, boss. I am Ultron, your personal AI. I am ready to assist with planning, communication, focus, and life management.',
  },
  {
    id: 2,
    role: 'user',
    text: 'Wake me up at 6:30, summarize my day, and help me stay productive.',
  },
  {
    id: 3,
    role: 'assistant',
    text: 'Absolutely, boss. I will structure your morning, prioritize your most important tasks, and keep you aligned with your goals.',
  },
];

const quickActions = [
  'Plan my day',
  'Summarize my schedule',
  'Draft a message',
  'Create an image prompt',
  'Check my habits',
  'Set reminder for 18:30',
];

const featureCards = [
  { icon: BrainCircuit, label: 'AI reasoning', detail: 'Context-aware assistance' },
  { icon: Mic, label: 'Voice assistant', detail: 'Wake word + voice commands' },
  { icon: Wand2, label: 'Image generation', detail: 'Prompt-based visuals' },
  { icon: CalendarDays, label: 'Planning system', detail: 'Calendar + habits' },
  { icon: ShieldCheck, label: 'Privacy mode', detail: 'Single-user local insights' },
  { icon: Globe, label: 'Multi-language', detail: 'Global communication' },
];

const goals: Goal[] = [
  { title: 'Deep work', value: '4.2 hrs', progress: 72 },
  { title: 'Reading habit', value: '9/12 days', progress: 81 },
  { title: 'Health routine', value: '6.5/8 hrs', progress: 68 },
];

const defaultChart: ChartPoint[] = [
  { day: 'Mon', focus: 76, tasks: 8 },
  { day: 'Tue', focus: 81, tasks: 9 },
  { day: 'Wed', focus: 69, tasks: 7 },
  { day: 'Thu', focus: 88, tasks: 11 },
  { day: 'Fri', focus: 92, tasks: 12 },
  { day: 'Sat', focus: 72, tasks: 8 },
  { day: 'Sun', focus: 85, tasks: 10 },
];

const voiceCommands = [
  'Hey Ultron, plan my day',
  'Ultron, set a reminder for 7:00',
  'Summarize my week',
  'What do you remember from my last chat?',
  'Begin deep work mode',
];

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [habitList, setHabitList] = useState<Habit[]>([
    { id: 1, name: 'Deep work', goal: '2 blocks', streak: 12, done: true },
    { id: 2, name: 'Reading', goal: '20 pages', streak: 9, done: false },
    { id: 3, name: 'Workout', goal: '30 min', streak: 7, done: true },
  ]);
  const [eventList, setEventList] = useState<EventItem[]>([
    { id: 1, title: 'Project review', time: 'Today 10:00', type: 'focus' },
    { id: 2, title: 'Gym session', time: 'Today 18:30', type: 'health' },
  ]);
  const [reminders, setReminders] = useState<Reminder[]>([
    { id: 1, title: 'Review goals', time: '08:15', active: true, frequency: 'daily', note: 'Reset the priority list.' },
    { id: 2, title: 'Hydration check', time: '12:00', active: true, frequency: 'daily', note: 'Drink water and stretch.' },
  ]);
  const [reminderDraft, setReminderDraft] = useState({
    title: 'Hydration check',
    time: '12:00',
    frequency: 'daily',
    note: 'Drink water and reset focus.',
  });
  const [profile, setProfile] = useState({ name: 'Boss', wakeTime: '06:30', focusTarget: 90, timezone: 'Local' });
  const [summary, setSummary] = useState('Ultron is aligned with your personal rhythm and daily goals.');
  const [profileForm, setProfileForm] = useState({ name: 'Boss', wakeTime: '06:30', focusTarget: 90, timezone: 'Local' });
  const [analytics, setAnalytics] = useState<Analytics>({
    focusScore: 92,
    weeklyScore: 81,
    completionRate: 87,
    currentStreak: 14,
    tasksCompleted: 27,
  });
  const [chartSeries, setChartSeries] = useState<ChartPoint[]>(defaultChart);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const reminderAlertsRef = useRef<Record<string, boolean>>({});

  const assistantSummary = useMemo(() => summary, [summary]);
  const chartMaxValue = useMemo(
    () => Math.max(...chartSeries.flatMap((point) => [point.focus, point.tasks]), 100),
    [chartSeries],
  );

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const dashboardResponse = await fetch('http://localhost:4000/api/dashboard');
        const dashboard = await dashboardResponse.json();

        if (dashboard.profile) {
          const nextProfile = dashboard.profile;
          setProfile(nextProfile);
          setProfileForm(nextProfile);
        }
        if (Array.isArray(dashboard.habits)) setHabitList(dashboard.habits);
        if (Array.isArray(dashboard.events)) setEventList(dashboard.events);
        if (Array.isArray(dashboard.reminders)) setReminders(dashboard.reminders);
        if (dashboard.summary) setSummary(dashboard.summary);
      } catch {
        const cached = localStorage.getItem('ultron-dashboard');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.profile) {
            setProfile(parsed.profile);
            setProfileForm(parsed.profile);
          }
          if (Array.isArray(parsed.habits)) setHabitList(parsed.habits);
          if (Array.isArray(parsed.events)) setEventList(parsed.events);
          if (Array.isArray(parsed.reminders)) setReminders(parsed.reminders);
          if (parsed.summary) setSummary(parsed.summary);
        }
      }

      try {
        const analyticsResponse = await fetch('http://localhost:4000/api/analytics');
        const analyticsData = await analyticsResponse.json();
        if (analyticsData) {
          setAnalytics({
            focusScore: analyticsData.focusScore ?? 92,
            weeklyScore: analyticsData.weeklyScore ?? 81,
            completionRate: analyticsData.completionRate ?? 87,
            currentStreak: analyticsData.currentStreak ?? 14,
            tasksCompleted: analyticsData.tasksCompleted ?? 27,
          });
          if (Array.isArray(analyticsData.chart) && analyticsData.chart.length) {
            setChartSeries(analyticsData.chart);
          }
        }
      } catch {
        // fallback analytics remain local
      }

      try {
        const memoryResponse = await fetch('http://localhost:4000/api/memory');
        const data = await memoryResponse.json();
        if (Array.isArray(data.conversations) && data.conversations.length > 0) {
          const flattened = data.conversations.flatMap((entry: any, index: number) => [
            { id: index * 2, role: 'user' as const, text: entry.user?.text ?? 'User message' },
            { id: index * 2 + 1, role: 'assistant' as const, text: entry.assistant?.text ?? 'Assistant reply' },
          ]);
          setMessages((current) => [...current, ...flattened]);
        }
      } catch {
        // ignore memory issues and stay on the starter conversation
      }

      if ('Notification' in window) {
        setNotificationsEnabled(Notification.permission === 'granted');
      }
    };

    loadDashboard();
  }, []);

  useEffect(() => {
    const snapshot = { profile, habits: habitList, events: eventList, reminders, summary };
    localStorage.setItem('ultron-dashboard', JSON.stringify(snapshot));
  }, [profile, habitList, eventList, reminders, summary]);

  useEffect(() => {
    if (!('Notification' in window)) return;

    const timer = window.setInterval(() => {
      const now = new Date();
      const todayKey = now.toDateString();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      reminders.forEach((reminder) => {
        if (!reminder.active || !reminder.time) return;

        const [hour, minute] = reminder.time.split(':').map(Number);
        const reminderMinutes = hour * 60 + minute;
        const alertKey = `${todayKey}-${reminder.id}`;

        if (Math.abs(currentMinutes - reminderMinutes) <= 1 && !reminderAlertsRef.current[alertKey]) {
          reminderAlertsRef.current[alertKey] = true;
          if (Notification.permission === 'granted') {
            new Notification(`Ultron reminder: ${reminder.title}`, { body: reminder.note || reminder.title });
          }
          speakText(`Reminder: ${reminder.title}. ${reminder.note || 'Time to act.'}`);
        }
      });
    }, 30000);

    return () => window.clearInterval(timer);
  }, [reminders]);

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const requestNotifications = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support notifications.');
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationsEnabled(permission === 'granted');

    if (permission === 'granted') {
      new Notification('Ultron is online', { body: 'Your personal assistant is ready.' });
    }
  };

  const sendNotification = (title: string, body: string) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    new Notification(title, { body });
  };

  const handleSend = async (messageOverride?: string) => {
    const trimmed = (messageOverride ?? input).trim();
    if (!trimmed) return;

    const userMessage: ChatMessage = { id: Date.now(), role: 'user', text: trimmed };
    setMessages((current) => [...current, userMessage]);
    setInput('');

    try {
      const response = await fetch('http://localhost:4000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      });

      const data = await response.json();
      const assistantMessage: ChatMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        text: data.reply ?? 'I am here, boss.',
      };

      setMessages((current) => [...current, assistantMessage]);
      speakText(assistantMessage.text);
      sendNotification('Ultron update', assistantMessage.text);

      if (data.reply) {
        setSummary('Ultron is updating your personal routine and progress using your latest conversation.');
      }
    } catch {
      const fallback: ChatMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        text: `Understood, boss. I can help with “${trimmed}” and keep the response direct, precise, and action-focused.`,
      };
      setMessages((current) => [...current, fallback]);
      speakText(fallback.text);
    }
  };

  const handleReminderSave = async () => {
    const payload = {
      title: reminderDraft.title || 'Reminder',
      time: reminderDraft.time || '09:00',
      frequency: reminderDraft.frequency || 'daily',
      note: reminderDraft.note || 'Stay on track.',
      active: true,
    };

    try {
      const response = await fetch('http://localhost:4000/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (Array.isArray(data.reminders)) {
        setReminders(data.reminders);
      }
    } catch {
      const newReminder: Reminder = {
        id: Date.now(),
        ...payload,
      };
      setReminders((current) => [...current, newReminder]);
    }

    setReminderDraft({
      title: 'Hydration check',
      time: '12:00',
      frequency: 'daily',
      note: 'Drink water and reset focus.',
    });
  };

  const handleReminderToggle = async (reminderId: number) => {
    try {
      const response = await fetch(`http://localhost:4000/api/reminders/${reminderId}/toggle`, {
        method: 'POST',
      });
      const data = await response.json();
      if (Array.isArray(data.reminders)) {
        setReminders(data.reminders);
      }
    } catch {
      setReminders((current) => current.map((item) => item.id === reminderId ? { ...item, active: !item.active } : item));
    }
  };

  const handleProfileSave = async () => {
    const nextProfile = {
      ...profileForm,
      focusTarget: Number(profileForm.focusTarget) || 90,
    };

    try {
      const response = await fetch('http://localhost:4000/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextProfile),
      });
      const data = await response.json();
      if (data.profile) {
        setProfile(data.profile);
        setProfileForm(data.profile);
        setSummary(data.summary || summary);
      }
    } catch {
      setProfile(nextProfile);
      setProfileForm(nextProfile);
    }
  };

  const handleHabitToggle = async (habitId: number) => {
    try {
      const response = await fetch(`http://localhost:4000/api/habits/${habitId}/toggle`, {
        method: 'POST',
      });
      const data = await response.json();
      if (Array.isArray(data.habits)) {
        setHabitList(data.habits);
      }
    } catch {
      setHabitList((current) => current.map((habit) => habit.id === habitId ? { ...habit, done: !habit.done } : habit));
    }
  };

  const handleVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Voice recognition is not supported in this browser.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    setIsListening(true);
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0]?.transcript ?? '')
        .join(' ')
        .trim();

      if (transcript) {
        setInput(transcript);
        setTimeout(() => handleSend(transcript), 250);
      }
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:4000/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.file?.filename) {
        setUploadedFile(data.file.filename);
        setMessages((current) => [
          ...current,
          {
            id: Date.now(),
            role: 'assistant',
            text: `File received and stored securely: ${data.file.originalName}.`,
          },
        ]);
      }
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: Date.now(),
          role: 'assistant',
          text: 'The file upload could not complete. Please try again.',
        },
      ]);
    }

    event.target.value = '';
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-row">
          <div className="brand-mark">U</div>
          <div>
            <p className="eyebrow">AI personal assistant</p>
            <h1>Ultron</h1>
          </div>
        </div>

        <nav className="nav-list">
          {['Overview', 'Assistant', 'Calendar', 'Habits', 'Media', 'Security'].map((item, index) => (
            <button className={index === 1 ? 'nav-item active' : 'nav-item'} key={item}>
              <span>{item}</span>
              <ChevronRight size={16} />
            </button>
          ))}
        </nav>

        <div className="panel compact">
          <div className="panel-header">
            <ShieldCheck size={16} />
            <span>Privacy shield</span>
          </div>
          <p>Single-user mode active. Sensitive data is isolated and protected with local-first controls.</p>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Your command center</p>
            <h2>Good morning, {profile.name}</h2>
          </div>
          <div className="top-actions">
            <button className="icon-circle" aria-label="Notifications" onClick={requestNotifications}>
              <Bell size={16} />
            </button>
            <button className="icon-circle" aria-label="Dark mode">
              <MoonStar size={16} />
            </button>
            <div className="avatar-pill">
              <UserRound size={16} />
              <span>{notificationsEnabled ? 'Alerts on' : 'Alerts off'}</span>
            </div>
          </div>
        </header>

        <section className="hero-grid">
          <div className="hero-card large-card">
            <div className="hero-head">
              <div className="hero-label">Live overview</div>
              <div className="status-pill">
                <span className="dot" />
                Online
              </div>
            </div>
            <h3>{assistantSummary}</h3>
            <div className="metric-row">
              <div>
                <span>Tasks completed</span>
                <strong>{analytics.tasksCompleted}</strong>
              </div>
              <div>
                <span>Focus score</span>
                <strong>{profile.focusTarget}%</strong>
              </div>
              <div>
                <span>Wake time</span>
                <strong>{profile.wakeTime}</strong>
              </div>
            </div>
          </div>

          <div className="hero-card right-card">
            <p className="eyebrow">Assistant status</p>
            <div className="mini-list">
              <div><Sparkles size={16} /> <span>AI generation</span></div>
              <div><Volume2 size={16} /> <span>Voice output</span></div>
              <div><Phone size={16} /> <span>Call routing</span></div>
              <div><CalendarDays size={16} /> <span>Calendar sync</span></div>
            </div>
          </div>
        </section>

        <section className="feature-grid">
          {featureCards.map(({ icon: Icon, label, detail }) => (
            <div key={label} className="feature-card">
              <Icon size={18} />
              <h4>{label}</h4>
              <p>{detail}</p>
            </div>
          ))}
        </section>

        <section className="analytics-grid">
          <div className="panel analytics-panel">
            <div className="panel-header">
              <Activity size={16} />
              <span>Weekly analytics</span>
            </div>
            <div className="analytics-row">
              <div>
                <label>Focus score</label>
                <strong>{analytics.focusScore}%</strong>
              </div>
              <div>
                <label>Weekly score</label>
                <strong>{analytics.weeklyScore}%</strong>
              </div>
              <div>
                <label>Completion</label>
                <strong>{analytics.completionRate}%</strong>
              </div>
              <div>
                <label>Streak</label>
                <strong>{analytics.currentStreak}d</strong>
              </div>
            </div>
            <div className="chart-panel">
              <div className="chart-legend">
                <span><i className="legend focus" /> Focus</span>
                <span><i className="legend tasks" /> Tasks</span>
              </div>
              <div className="chart-bars">
                {chartSeries.map((point) => (
                  <div key={point.day} className="chart-column">
                    <div className="bar-stack">
                      <span className="bar focus-bar" style={{ height: `${(point.focus / chartMaxValue) * 100}%` }} />
                      <span className="bar task-bar" style={{ height: `${(point.tasks / chartMaxValue) * 100}%` }} />
                    </div>
                    <label>{point.day}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="lower-grid">
          <div className="chat-panel panel">
            <div className="panel-header">
              <MessageSquareText size={16} />
              <span>Conversation</span>
            </div>

            <div className="messages">
              {messages.map((message) => (
                <div key={message.id} className={`message ${message.role}`}>
                  <span>{message.role === 'assistant' ? 'Ultron' : 'You'}</span>
                  <p>{message.text}</p>
                </div>
              ))}
            </div>

            <div className="quick-actions">
              {quickActions.map((action) => (
                <button key={action} onClick={() => setInput(action)}>{action}</button>
              ))}
            </div>

            <div className="composer">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask Ultron anything..."
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleSend();
                }}
              />
              <div className="composer-actions">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <button className="ghost-btn" aria-label="Upload file" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={16} />
                </button>
                <button className="ghost-btn" aria-label="Download file">
                  <Download size={16} />
                </button>
                <button className={`voice-btn ${isListening ? 'listening' : ''}`} aria-label="Voice input" onClick={handleVoice}>
                  <Mic size={16} />
                </button>
                <button onClick={() => handleSend()} className="send-btn">Send</button>
              </div>
            </div>
            {uploadedFile && (
              <div className="upload-status">Uploaded file: {uploadedFile}</div>
            )}
          </div>

          <div className="side-stack">
            <div className="panel goals-panel">
              <div className="panel-header">
                <Target size={16} />
                <span>Goal tracking</span>
              </div>
              <div className="goal-list">
                {habitList.map((habit) => (
                  <div key={habit.id} className="goal-item">
                    <div className="goal-meta">
                      <span>{habit.name}</span>
                      <button className="toggle-habit" onClick={() => handleHabitToggle(habit.id)}>
                        {habit.done ? 'Done' : 'Mark'}
                      </button>
                    </div>
                    <div className="progress-bar">
                      <div style={{ width: `${Math.min(habit.streak * 10, 100)}%` }} />
                    </div>
                    <small>{habit.goal}</small>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel media-panel">
              <div className="panel-header">
                <TrendingUp size={16} />
                <span>Today</span>
              </div>
              <ul>
                {eventList.map((event) => (
                  <li key={event.id}><CalendarDays size={14} /> {event.title} · {event.time}</li>
                ))}
              </ul>
              <div className="reminder-list">
                {reminders.map((item) => (
                  <div key={item.id} className="reminder-item">
                    <Bell size={12} />
                    <span>{item.title}</span>
                    <button className="mini-toggle" onClick={() => handleReminderToggle(item.id)}>
                      {item.active ? 'Active' : 'Off'}
                    </button>
                    <strong>{item.time}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel reminder-panel">
              <div className="panel-header">
                <Clock3 size={16} />
                <span>Reminder scheduler</span>
              </div>
              <div className="reminder-form">
                <label>
                  <span>Title</span>
                  <input
                    value={reminderDraft.title}
                    onChange={(event) => setReminderDraft((current) => ({ ...current, title: event.target.value }))}
                  />
                </label>
                <label>
                  <span>Time</span>
                  <input
                    type="time"
                    value={reminderDraft.time}
                    onChange={(event) => setReminderDraft((current) => ({ ...current, time: event.target.value }))}
                  />
                </label>
                <label>
                  <span>Frequency</span>
                  <select
                    value={reminderDraft.frequency}
                    onChange={(event) => setReminderDraft((current) => ({ ...current, frequency: event.target.value }))}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="custom">Custom</option>
                  </select>
                </label>
                <label>
                  <span>Note</span>
                  <textarea
                    rows={2}
                    value={reminderDraft.note}
                    onChange={(event) => setReminderDraft((current) => ({ ...current, note: event.target.value }))}
                  />
                </label>
                <button className="save-btn" onClick={handleReminderSave}>Save reminder</button>
              </div>
            </div>

            <div className="panel profile-panel">
              <div className="panel-header">
                <ShieldCheck size={16} />
                <span>Profile settings</span>
              </div>
              <div className="profile-form">
                <label>
                  <span>Name</span>
                  <input
                    value={profileForm.name}
                    onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))}
                  />
                </label>
                <label>
                  <span>Wake time</span>
                  <input
                    value={profileForm.wakeTime}
                    onChange={(event) => setProfileForm((current) => ({ ...current, wakeTime: event.target.value }))}
                  />
                </label>
                <label>
                  <span>Focus target</span>
                  <input
                    type="number"
                    min={50}
                    max={100}
                    value={profileForm.focusTarget}
                    onChange={(event) => setProfileForm((current) => ({ ...current, focusTarget: Number(event.target.value) }))}
                  />
                </label>
                <button className="save-btn" onClick={handleProfileSave}>Save profile</button>
              </div>
            </div>

            <div className="panel voice-panel">
              <div className="panel-header">
                <Zap size={16} />
                <span>Voice commands</span>
              </div>
              <div className="voice-list">
                {voiceCommands.map((command) => (
                  <button key={command} onClick={() => handleSend(command)}>{command}</button>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
