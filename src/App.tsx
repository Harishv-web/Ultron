import React, { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Bell,
  BrainCircuit,
  CheckCircle2,
  CalendarDays,
  ChevronRight,
  CircleDot,
  Clock3,
  Cpu,
  Download,
  FileText,
  Globe,
  ListChecks,
  MessageSquareText,
  Mic,
  MoonStar,
  Phone,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
  Upload,
  UserRound,
  Volume2,
  Wand2,
  Wifi,
  Zap,
} from 'lucide-react';
import { registerPlugin } from '@capacitor/core';

type NativeControlsPlugin = {
  call(options: { phoneNumber: string }): Promise<void>;
  sendSms(options: { phoneNumber: string; message: string }): Promise<void>;
  lockScreen(): Promise<void>;
  scheduleReminder(options: { id: number; title: string; note: string; time: string; frequency: string }): Promise<void>;
  cancelReminder(options: { id: number }): Promise<void>;
};

const NativeControls = registerPlugin<NativeControlsPlugin>('NativeControls');

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

type Insight = {
  id: number;
  title: string;
  summary: string;
  action: string;
  priority: 'High' | 'Medium';
};

type AssistantMode = {
  label: string;
  detail: string;
};

type MemoryNode = {
  id: number;
  label: string;
  type: string;
  summary: string;
  created_at: string;
};

type MemoryEdge = {
  id: number;
  source: string;
  target: string;
  relation: string;
  created_at: string;
};

type AgentTask = {
  id: number;
  title: string;
  description: string;
  due_at: string;
  status: string;
  automation: string;
  result: string;
};

type GoogleStatus = {
  configured: boolean;
  connected: boolean;
  email?: string;
};

type LiveActivity = {
  id: number;
  label: string;
  detail: string;
  time: string;
  state: 'done' | 'working' | 'queued';
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
  'Draft a message for my team',
];

const defaultInsights: Insight[] = [
  {
    id: 1,
    title: 'Focus pulse',
    summary: 'Your momentum is strongest before lunch. Keep high-value tasks in the morning window.',
    action: 'Launch deep work',
    priority: 'High',
  },
  {
    id: 2,
    title: 'Calendar sync',
    summary: 'Your next key event is lined up for the day. Use the afternoon for follow-up and communication.',
    action: 'Review schedule',
    priority: 'High',
  },
  {
    id: 3,
    title: 'Recovery mode',
    summary: 'A health reset will keep the streak sustainable. Hydration and a short walk are worth prioritizing.',
    action: 'Reset recovery',
    priority: 'Medium',
  },
];

const assistantModes: AssistantMode[] = [
  { label: 'Focus', detail: 'Deep work + no-distraction mode' },
  { label: 'Travel', detail: 'Quick planning + itinerary flow' },
  { label: 'Social', detail: 'Message drafting + response prep' },
  { label: 'Recovery', detail: 'Stretch, rest, and reset guidance' },
];

const professionalWorkflows = [
  { label: 'Executive briefing', prompt: 'Prepare a concise executive briefing from my priorities, schedule, and open tasks.' },
  { label: 'Inbox zero plan', prompt: 'Create an inbox zero plan and draft responses for the most important messages.' },
  { label: 'Meeting prep', prompt: 'Prepare me for my next meeting with an agenda, talking points, and follow-up checklist.' },
  { label: 'Weekly review', prompt: 'Run a professional weekly review with wins, risks, priorities, and next actions.' },
  { label: 'Research sprint', prompt: 'Break my research goal into a focused sprint with sources, milestones, and a deliverable.' },
  { label: 'Personal reset', prompt: 'Create a realistic reset plan for my energy, health, home, and focus.' },
];

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [activeSection, setActiveSection] = useState('Assistant');
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
  const [insights, setInsights] = useState<Insight[]>(defaultInsights);
  const [memoryGraph, setMemoryGraph] = useState<{ nodes: MemoryNode[]; edges: MemoryEdge[] }>({ nodes: [], edges: [] });
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [taskDraft, setTaskDraft] = useState({ title: 'Prepare focus review', description: 'Review priorities and prepare the next action list.', dueAt: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16), automation: 'scheduled' });
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [wakeWordActive, setWakeWordActive] = useState(false);
  const [voiceLanguage, setVoiceLanguage] = useState('en-US');
  const [voiceRate, setVoiceRate] = useState(1);
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus>({ configured: false, connected: false });
  const [imagePrompt, setImagePrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [smsMessage, setSmsMessage] = useState('');
  const [gmailDraft, setGmailDraft] = useState({ to: '', subject: 'Ultron progress update', body: 'Hi,\n\nI wanted to share a quick progress update on the current workstream.\n\nBest,' });
  const [isThinking, setIsThinking] = useState(false);
  const [pwaUpdateAvailable, setPwaUpdateAvailable] = useState(false);
  const [liveTime, setLiveTime] = useState(new Date());
  const [activeWorkspace, setActiveWorkspace] = useState('Command center');
  const [liveActivity, setLiveActivity] = useState<LiveActivity[]>([
    { id: 1, label: 'Context loaded', detail: 'Profile, routines, and priorities are in memory.', time: 'now', state: 'done' },
    { id: 2, label: 'Calendar watch', detail: 'Monitoring schedule conflicts and upcoming events.', time: 'now', state: 'working' },
    { id: 3, label: 'Focus plan queued', detail: 'Ready to build your next high-value action list.', time: 'next', state: 'queued' },
  ]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const reminderAlertsRef = useRef<Record<string, boolean>>({});
  const wakeWordRef = useRef(false);

  const assistantSummary = useMemo(() => summary, [summary]);
  const chartMaxValue = useMemo(
    () => Math.max(...chartSeries.flatMap((point) => [point.focus, point.tasks]), 100),
    [chartSeries],
  );

  useEffect(() => {
    const handlePwaUpdate = () => setPwaUpdateAvailable(true);
    window.addEventListener('pwa-update-ready', handlePwaUpdate);

    return () => window.removeEventListener('pwa-update-ready', handlePwaUpdate);
  }, []);

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
        const insightResponse = await fetch('http://localhost:4000/api/assistant/insights');
        const insightData = await insightResponse.json();
        if (Array.isArray(insightData.insights) && insightData.insights.length) {
          setInsights(insightData.insights);
        }
      } catch {
        // keep default insight cards if the API is unavailable
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
        if (data.graph) {
          setMemoryGraph(data.graph);
        }
      } catch {
        // ignore memory issues and stay on the starter conversation
      }

      try {
        const tasksResponse = await fetch('http://localhost:4000/api/tasks');
        const tasksData = await tasksResponse.json();
        if (Array.isArray(tasksData.tasks)) {
          setTasks(tasksData.tasks);
        }
      } catch {
        // keep empty task list if the API is unavailable
      }

      if ('Notification' in window) {
        setNotificationsEnabled(Notification.permission === 'granted');
      }

      try {
        const googleResponse = await fetch('http://localhost:4000/api/integrations/google/status');
        const googleData = await googleResponse.json();
        setGoogleStatus(googleData);
      } catch {
        // Google integration remains disconnected when the local API is unavailable.
      }
    };

    loadDashboard();
  }, []);

  useEffect(() => {
    const snapshot = { profile, habits: habitList, events: eventList, reminders, summary };
    localStorage.setItem('ultron-dashboard', JSON.stringify(snapshot));
  }, [profile, habitList, eventList, reminders, summary]);

  useEffect(() => {
    const timer = window.setInterval(() => setLiveTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLiveActivity((current) => current.map((item) => item.state === 'working'
        ? { ...item, time: `${liveTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` }
        : item));
    }, 5000);
    return () => window.clearInterval(timer);
  }, [liveTime]);

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
    utterance.lang = voiceLanguage;
    utterance.rate = voiceRate;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const toggleWakeWord = () => {
    if (wakeWordActive) {
      wakeWordRef.current = false;
      setWakeWordActive(false);
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Wake-word listening needs Speech Recognition support or the Android app.');
      return;
    }

    wakeWordRef.current = true;
    setWakeWordActive(true);
    const recognition = new SpeechRecognition();
    recognition.lang = voiceLanguage;
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .slice(event.resultIndex || 0)
        .map((result: any) => result[0]?.transcript ?? '')
        .join(' ')
        .trim();
      if (!transcript) return;
      const spoken = transcript.toLowerCase();
      if (!spoken.includes('hey ultron') && !spoken.includes('ultron')) return;
      const command = transcript.replace(/hey\s*ultron|ultron/gi, '').trim();
      if (command) handleSend(command);
    };
    recognition.onerror = () => setWakeWordActive(false);
    recognition.onend = () => {
      if (wakeWordRef.current) {
        try { recognition.start(); } catch { setWakeWordActive(false); }
      }
    };
    recognition.start();
  };

  const generateImage = async () => {
    const prompt = imagePrompt.trim();
    if (!prompt) return;
    try {
      const response = await fetch('http://localhost:4000/api/media/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Image generation failed.');
      setGeneratedImage(data.imageUrl);
      setMessages((current) => [...current, { id: Date.now(), role: 'assistant', text: 'Image generated and ready to preview.' }]);
    } catch (error) {
      setMessages((current) => [...current, {
        id: Date.now(),
        role: 'assistant',
        text: error instanceof Error ? error.message : 'Image generation is unavailable right now.',
      }]);
    }
  };

  const openGoogleAuth = () => {
    window.location.href = 'http://localhost:4000/api/integrations/google/auth';
  };

  const runPhoneAction = async (action: 'call' | 'sms' | 'lock') => {
    try {
      if (action === 'call') {
        await NativeControls.call({ phoneNumber });
      } else if (action === 'sms') {
        await NativeControls.sendSms({ phoneNumber, message: smsMessage });
      } else {
        await NativeControls.lockScreen();
      }
    } catch {
      if (action === 'call' && phoneNumber) window.location.href = `tel:${phoneNumber}`;
      if (action === 'sms' && phoneNumber) window.location.href = `sms:${phoneNumber}?body=${encodeURIComponent(smsMessage)}`;
      if (action === 'lock') {
        setMessages((current) => [...current, { id: Date.now(), role: 'assistant', text: 'Screen lock requires the Android app with device-admin permission enabled.' }]);
      }
    }
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

  const handlePwaRefresh = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration?.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          setTimeout(() => window.location.reload(), 150);
          return;
        }

        window.location.reload();
      }).catch(() => window.location.reload());
      return;
    }

    window.location.reload();
  };

  const streamAssistantReply = async (text: string) => {
    const messageId = Date.now() + 1;
    setMessages((current) => [...current, { id: messageId, role: 'assistant', text: '' }]);

    const words = text.split(' ');
    let visibleText = '';
    for (let index = 0; index < words.length; index += 1) {
      visibleText = `${visibleText}${index > 0 ? ' ' : ''}${words[index]}`;
      setMessages((current) => current.map((message) => (
        message.id === messageId ? { ...message, text: visibleText } : message
      )));
      await new Promise((resolve) => window.setTimeout(resolve, 22));
    }
  };

  const handleSend = async (messageOverride?: string) => {
    const trimmed = (messageOverride ?? input).trim();
    if (!trimmed) return;

    const userMessage: ChatMessage = { id: Date.now(), role: 'user', text: trimmed };
    setMessages((current) => [...current, userMessage]);
    setInput('');
    setIsThinking(true);
    setLiveActivity((current) => [
      { id: Date.now(), label: 'Reasoning', detail: `Working through: ${trimmed.slice(0, 72)}`, time: 'now', state: 'working' },
      ...current.filter((item) => item.state !== 'working').slice(0, 3),
    ]);

    try {
      const response = await fetch('http://localhost:4000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      });

      const data = await response.json();
      const assistantText = data.reply ?? 'I am here, boss.';
      await streamAssistantReply(assistantText);
      setLiveActivity((current) => [
        { id: Date.now(), label: 'Response ready', detail: 'Answer delivered with your personal context.', time: 'now', state: 'done' },
        ...current.filter((item) => item.state !== 'working').slice(0, 3),
      ]);
      speakText(assistantText);
      sendNotification('Ultron update', assistantText);

      if (data.reply) {
        setSummary('Ultron is updating your personal routine and progress using your latest conversation.');
      }
    } catch {
      const fallback: ChatMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        text: `Understood, boss. I can help with “${trimmed}” and keep the response direct, precise, and action-focused.`,
      };
      await new Promise((resolve) => window.setTimeout(resolve, 650));
      await streamAssistantReply(fallback.text);
      setLiveActivity((current) => [
        { id: Date.now(), label: 'Offline assist', detail: 'Using the local response mode while the API reconnects.', time: 'now', state: 'done' },
        ...current.filter((item) => item.state !== 'working').slice(0, 3),
      ]);
      speakText(fallback.text);
    } finally {
      setIsThinking(false);
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
        try {
          await NativeControls.scheduleReminder({ id: data.reminders[0].id, ...payload });
        } catch {
          // Browser notifications continue to handle reminders when native scheduling is unavailable.
        }
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
        if (!data.reminders.find((item: Reminder) => item.id === reminderId)?.active) {
          try { await NativeControls.cancelReminder({ id: reminderId }); } catch { /* web fallback */ }
        }
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

  const handleModeSelect = (mode: string) => {
    const modeMap: Record<string, string> = {
      Focus: 'Activate deep work mode and keep me on the highest-value tasks without distractions.',
      Travel: 'Plan my travel flow and keep my schedule organized with a quick itinerary check.',
      Social: 'Draft a polished message for my team and keep my communication concise and effective.',
      Recovery: 'I need a recovery block with hydration, movement, and a reset before the next deep work session.',
    };

    const prompt = modeMap[mode] ?? `Switch to ${mode} mode and help me stay efficient.`;
    setSummary(`Ultron shifted into ${mode} mode for a faster, more adaptive workflow.`);
    handleSend(prompt);
  };

  const handleAssistantAction = async (action: 'calendar' | 'gmail' | 'whatsapp') => {
    const endpointMap = {
      calendar: googleStatus.connected ? 'http://localhost:4000/api/integrations/google/calendar' : 'http://localhost:4000/api/actions/calendar',
      gmail: googleStatus.connected && gmailDraft.to ? 'http://localhost:4000/api/integrations/google/gmail/draft' : 'http://localhost:4000/api/actions/gmail',
      whatsapp: 'http://localhost:4000/api/actions/whatsapp',
    };

    try {
      const response = await fetch(endpointMap[action], {
        method: action === 'calendar' ? 'GET' : 'POST',
        headers: action === 'calendar' ? undefined : { 'Content-Type': 'application/json' },
        body: action === 'gmail' && googleStatus.connected && gmailDraft.to
          ? JSON.stringify(gmailDraft)
          : action === 'calendar' ? undefined : JSON.stringify({
          name: profile.name,
          objective: action === 'gmail' ? 'progress update' : 'check-in',
          recipient: action === 'whatsapp' ? 'team' : undefined,
        }),
      });

      const data = await response.json();
      const message = data.draft || data.message || data.suggestion || 'Action ready.';
      setMessages((current) => [
        ...current,
        { id: Date.now(), role: 'assistant', text: `Action ready: ${message}` },
      ]);
      setSummary(`Ultron prepared a ${action.toUpperCase()} action for faster execution.`);
    } catch {
      setMessages((current) => [
        ...current,
        { id: Date.now(), role: 'assistant', text: 'The action system is ready. I can help you prepare the next step directly.' },
      ]);
    }
  };

  const handleTaskCreate = async () => {
    const payload = {
      title: taskDraft.title || 'New agent task',
      description: taskDraft.description || 'Automate the next action with a focused workflow.',
      dueAt: taskDraft.dueAt ? new Date(taskDraft.dueAt).toISOString() : new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      automation: taskDraft.automation || 'scheduled',
    };

    try {
      const response = await fetch('http://localhost:4000/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (Array.isArray(data.tasks)) {
        setTasks(data.tasks);
      }
    } catch {
      setTasks((current) => [
        ...current,
        {
          id: Date.now(),
          title: payload.title,
          description: payload.description,
          due_at: payload.dueAt,
          status: 'pending',
          automation: payload.automation,
          result: '',
        },
      ]);
    }

    setTaskDraft({
      title: 'Prepare focus review',
      description: 'Review priorities and prepare the next action list.',
      dueAt: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
      automation: 'scheduled',
    });
  };

  const handleTaskComplete = async (taskId: number) => {
    try {
      const response = await fetch(`http://localhost:4000/api/tasks/${taskId}/complete`, { method: 'POST' });
      const data = await response.json();
      if (Array.isArray(data.tasks)) {
        setTasks(data.tasks);
      }
    } catch {
      setTasks((current) => current.map((task) => task.id === taskId ? { ...task, status: 'completed', result: 'Completed manually.' } : task));
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
        const spoken = transcript.toLowerCase();
        const wakeWordDetected = spoken.includes('hey ultron') || spoken.includes('ultron');
        setWakeWordActive(wakeWordDetected);

        if (wakeWordDetected) {
          const cleaned = transcript.replace(/hey\s*ultron|ultron/gi, '').trim();
          setInput(cleaned || 'What can you do for me?');
          setTimeout(() => handleSend(cleaned || 'What can you do for me?'), 250);
          return;
        }

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

        <nav className="nav-list" aria-label="Primary navigation">
          {['Overview', 'Assistant', 'Calendar', 'Habits', 'Media', 'Security'].map((item) => (
            <button
              type="button"
              className={activeSection === item ? 'nav-item active' : 'nav-item'}
              key={item}
              aria-current={activeSection === item ? 'page' : undefined}
              onClick={() => {
                setActiveSection(item);
                document.getElementById(item.toLowerCase())?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
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
        {pwaUpdateAvailable && (
          <div className="pwa-update-banner" role="status" aria-live="polite">
            <div>
              <strong>Update ready</strong>
              <span>Refresh to install the newest Ultron build.</span>
            </div>
            <button type="button" onClick={handlePwaRefresh}>Refresh now</button>
          </div>
        )}

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
            <div className={`wake-pill ${wakeWordActive ? 'active' : ''}`}>
              {wakeWordActive ? 'Wake word ready' : 'Wake word idle'}
            </div>
          </div>
        </header>

        <section id="overview" className="hero-grid">
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

        <section id="assistant" className="live-cockpit panel">
          <div className="live-cockpit-head">
            <div>
              <p className="eyebrow">Realtime intelligence layer</p>
              <h3>Ultron is working with you</h3>
              <p className="compact">A live operating view of your assistant, priorities, and next best action.</p>
            </div>
            <div className="live-clock">
              <span className="live-dot" />
              <strong>{liveTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
              <small>{liveTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</small>
            </div>
          </div>
          <div className="cockpit-grid">
            <div className="ai-orb-card">
              <div className={`ai-orb ${isThinking ? 'thinking' : ''}`}>
                <div className="orb-core"><Cpu size={28} /></div>
                <span className="orb-ring ring-one" />
                <span className="orb-ring ring-two" />
              </div>
              <div className="orb-status">
                <strong>{isThinking ? 'Thinking through your request' : 'Ready for your next command'}</strong>
                <span><Wifi size={13} /> Secure assistant channel · {activeWorkspace}</span>
              </div>
              <div className="workspace-tabs">
                {['Command center', 'Executive', 'Personal', 'Deep work'].map((workspace) => (
                  <button key={workspace} className={activeWorkspace === workspace ? 'workspace-tab active' : 'workspace-tab'} onClick={() => setActiveWorkspace(workspace)}>
                    {workspace}
                  </button>
                ))}
              </div>
            </div>
            <div className="live-feed">
              <div className="feed-header"><span><CircleDot size={14} /> Live activity</span><small>updates automatically</small></div>
              {liveActivity.map((item) => (
                <div className="feed-item" key={item.id}>
                  <span className={`feed-icon ${item.state}`}>
                    {item.state === 'done' ? <CheckCircle2 size={14} /> : item.state === 'working' ? <Activity size={14} /> : <Timer size={14} />}
                  </span>
                  <div><strong>{item.label}</strong><p>{item.detail}</p></div>
                  <time>{item.time}</time>
                </div>
              ))}
            </div>
            <div className="next-action-card">
              <span className="next-action-label"><Sparkles size={14} /> Recommended next action</span>
              <h4>Protect your next focus block</h4>
              <p>Silence distractions, finish the priority review, and leave a clean handoff for your afternoon.</p>
              <button className="send-btn" onClick={() => handleSend('Start a 45-minute focus block and give me the exact first three actions.')}>Start focus block <Send size={14} /></button>
            </div>
          </div>
        </section>

        <section id="media" className="feature-grid">
          {featureCards.map(({ icon: Icon, label, detail }) => (
            <div key={label} className="feature-card">
              <Icon size={18} />
              <h4>{label}</h4>
              <p>{detail}</p>
            </div>
          ))}
        </section>

        <section className="capability-grid">
          <div className="panel capability-panel">
            <div className="panel-header"><Volume2 size={16} /><span>Voice & language</span></div>
            <div className="capability-form">
              <label>
                <span>Output language</span>
                <select value={voiceLanguage} onChange={(event) => setVoiceLanguage(event.target.value)}>
                  <option value="en-US">English (US)</option>
                  <option value="en-GB">English (UK)</option>
                  <option value="es-ES">Español</option>
                  <option value="fr-FR">Français</option>
                  <option value="de-DE">Deutsch</option>
                  <option value="hi-IN">हिन्दी</option>
                  <option value="ja-JP">日本語</option>
                </select>
              </label>
              <label>
                <span>Voice speed · {voiceRate.toFixed(1)}x</span>
                <input type="range" min="0.6" max="1.4" step="0.1" value={voiceRate} onChange={(event) => setVoiceRate(Number(event.target.value))} />
              </label>
              <button className={`save-btn ${wakeWordActive ? 'danger-btn' : ''}`} onClick={toggleWakeWord}>
                {wakeWordActive ? 'Stop wake-word listener' : 'Enable Hey Ultron listener'}
              </button>
              <small className="compact">The browser listener works while this page is open. Android background wake-word support is provided by the native app shell.</small>
            </div>
          </div>

          <div className="panel capability-panel">
            <div className="panel-header"><Wand2 size={16} /><span>Image generation</span></div>
            <div className="capability-form">
              <textarea rows={3} value={imagePrompt} onChange={(event) => setImagePrompt(event.target.value)} placeholder="Describe the image you want Ultron to create..." />
              <button className="save-btn" onClick={generateImage}>Generate image</button>
              {generatedImage && <img className="generated-image" src={generatedImage} alt="Generated by Ultron" />}
            </div>
          </div>

          <div className="panel capability-panel">
            <div className="panel-header"><CalendarDays size={16} /><span>Google Workspace</span></div>
            <p className="compact">{googleStatus.connected ? `Connected${googleStatus.email ? ` as ${googleStatus.email}` : ''}.` : googleStatus.configured ? 'Google OAuth is ready to connect.' : 'Add Google OAuth credentials to enable Calendar and Gmail.'}</p>
            <button className="save-btn" onClick={openGoogleAuth} disabled={!googleStatus.configured}>
              {googleStatus.connected ? 'Reconnect Google' : 'Connect Calendar + Gmail'}
            </button>
            {googleStatus.connected && (
              <div className="capability-form">
                <input value={gmailDraft.to} onChange={(event) => setGmailDraft((current) => ({ ...current, to: event.target.value }))} placeholder="Gmail recipient" type="email" />
                <input value={gmailDraft.subject} onChange={(event) => setGmailDraft((current) => ({ ...current, subject: event.target.value }))} placeholder="Subject" />
                <textarea rows={2} value={gmailDraft.body} onChange={(event) => setGmailDraft((current) => ({ ...current, body: event.target.value }))} placeholder="Message" />
              </div>
            )}
          </div>

          <div className="panel capability-panel">
            <div className="panel-header"><Phone size={16} /><span>Phone controls</span></div>
            <div className="capability-form">
              <input value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} placeholder="Phone number" inputMode="tel" />
              <input value={smsMessage} onChange={(event) => setSmsMessage(event.target.value)} placeholder="SMS message" />
              <div className="inline-actions">
                <button className="ghost-btn" onClick={() => runPhoneAction('call')} disabled={!phoneNumber}>Call</button>
                <button className="ghost-btn" onClick={() => runPhoneAction('sms')} disabled={!phoneNumber}>SMS</button>
                <button className="ghost-btn" onClick={() => runPhoneAction('lock')}>Lock screen</button>
              </div>
              <small className="compact">Calls and SMS open native phone controls. Screen lock requires granting device-admin access in Android settings.</small>
            </div>
          </div>
        </section>

        <section id="habits" className="analytics-grid">
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

        <section id="calendar" className="panel intelligence-panel">
          <div className="panel-header">
            <Sparkles size={16} />
            <span>AI command center</span>
          </div>
          <div className="mode-row">
            {assistantModes.map((mode) => (
              <button key={mode.label} className="mode-chip" onClick={() => handleModeSelect(mode.label)}>
                <strong>{mode.label}</strong>
                <span>{mode.detail}</span>
              </button>
            ))}
          </div>
          <div className="insight-grid">
            {insights.map((insight) => (
              <div key={insight.id} className="insight-card">
                <div className="insight-head">
                  <span className={`priority ${insight.priority.toLowerCase()}`}>{insight.priority}</span>
                  <h4>{insight.title}</h4>
                </div>
                <p>{insight.summary}</p>
                <button onClick={() => handleSend(insight.action)}>{insight.action}</button>
              </div>
            ))}
          </div>
          <div className="workflow-header">
            <div><span className="eyebrow">Professional workflows</span><h4>Delegate the work, not just the question</h4></div>
            <span className="workflow-badge"><ListChecks size={13} /> Ready to run</span>
          </div>
          <div className="workflow-grid">
            {professionalWorkflows.map((workflow) => (
              <button key={workflow.label} className="workflow-card" onClick={() => handleSend(workflow.prompt)}>
                <span>{workflow.label}</span><ChevronRight size={15} />
              </button>
            ))}
          </div>
        </section>

        <section id="security" className="panel action-panel">
          <div className="panel-header">
            <CalendarDays size={16} />
            <span>Assistant actions</span>
          </div>
          <div className="action-grid">
            <button className="action-card" onClick={() => handleAssistantAction('calendar')}>
              <strong>Calendar block</strong>
              <span>Create a focus plan and schedule it.</span>
            </button>
            <button className="action-card" onClick={() => handleAssistantAction('gmail')}>
              <strong>Draft Gmail</strong>
              <span>Write a polished status update fast.</span>
            </button>
            <button className="action-card" onClick={() => handleAssistantAction('whatsapp')}>
              <strong>WhatsApp note</strong>
              <span>Send a quick check-in message.</span>
            </button>
          </div>
          {memoryGraph.nodes.length > 0 && (
            <div className="memory-graph">
              <div className="panel-header">
                <BrainCircuit size={16} />
                <span>Memory graph</span>
              </div>
              <div className="graph-tags">
                {memoryGraph.nodes.slice(0, 8).map((node) => (
                  <span key={node.id} className="graph-tag">{node.label}</span>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="panel automation-panel">
          <div className="panel-header">
            <Zap size={16} />
            <span>Agent automation</span>
          </div>
          <div className="task-form">
            <input
              value={taskDraft.title}
              onChange={(event) => setTaskDraft((current) => ({ ...current, title: event.target.value }))}
              placeholder="Task title"
            />
            <textarea
              rows={2}
              value={taskDraft.description}
              onChange={(event) => setTaskDraft((current) => ({ ...current, description: event.target.value }))}
              placeholder="Task description"
            />
            <div className="task-form-row">
              <input
                type="datetime-local"
                value={taskDraft.dueAt}
                onChange={(event) => setTaskDraft((current) => ({ ...current, dueAt: event.target.value }))}
              />
              <select
                value={taskDraft.automation}
                onChange={(event) => setTaskDraft((current) => ({ ...current, automation: event.target.value }))}
              >
                <option value="scheduled">Scheduled</option>
                <option value="triggered">Triggered</option>
                <option value="manual">Manual</option>
              </select>
            </div>
            <button className="save-btn" onClick={handleTaskCreate}>Add scheduled task</button>
          </div>
          <div className="task-list">
            {tasks.length === 0 ? (
              <p className="compact">No automated tasks yet. Add one to let Ultron handle the next action.</p>
            ) : tasks.map((task) => (
              <div key={task.id} className="task-item">
                <div>
                  <strong>{task.title}</strong>
                  <p>{task.description}</p>
                </div>
                <div className="task-meta">
                  <span>{task.status}</span>
                  <small>{new Date(task.due_at).toLocaleString()}</small>
                  <button onClick={() => handleTaskComplete(task.id)}>Complete</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="lower-grid">
          <div className="chat-panel panel">
            <div className="panel-header">
              <MessageSquareText size={16} />
              <span>Conversation</span>
            </div>

            <div className="messages" aria-live="polite" aria-label="Conversation history">
              {messages.map((message) => (
                <div key={message.id} className={`message ${message.role}`}>
                  <span>{message.role === 'assistant' ? 'Ultron' : 'You'}</span>
                  <p>{message.text}</p>
                </div>
              ))}
              {isThinking && (
                <div className="message assistant typing-message" role="status">
                  <span>Ultron</span>
                  <p className="typing-indicator"><i /> <i /> <i /><em>Thinking</em></p>
                </div>
              )}
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
