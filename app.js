const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const STORAGE_KEY = 'ultron-os-state-v3';
const FOCUS_CIRCUMFERENCE = 270;
let focusTimer = null;
let captureMode = 'memory';
let reminderTimers = [];
let vaultMode = 'encrypt';
let pendingEncryptedBackup = null;

function defaults() {
  return {
    profile: { name: 'Boss', locale: navigator.language || 'en-US' },
    habits: [
      { title: 'Hydration', detail: '6 / 8 glasses', done: true },
      { title: 'Deep study', detail: '90 min target', done: true },
      { title: 'Evening reset', detail: '9:30 PM', done: false }
    ],
    agenda: [
      { time: '08:00', title: 'Morning reset', detail: 'Complete · 20 min', done: true },
      { time: '09:30', title: 'Algorithms revision', detail: 'Deep work · 90 min', now: true, done: false },
      { time: '12:30', title: 'Lunch + walk', detail: 'Recovery · 45 min', done: false },
      { time: '18:00', title: 'Weekly planning', detail: 'Personal · 30 min', done: false }
    ],
    memory: [
      { text: 'Call me Boss.', type: 'Preference', savedAt: Date.now() - 86400000 },
      { text: 'Strongest focus window: 9:00 — 11:30 AM.', type: 'Insight', savedAt: Date.now() - 7200000 },
      { text: 'Today’s intention is Algorithms revision.', type: 'Context', savedAt: Date.now() - 3600000 }
    ],
    activity: [
      { text: 'Private memory vault initialized on this device.', type: 'SYSTEM', time: Date.now() - 1800000 },
      { text: 'Deep study marked complete for today.', type: 'HABIT', time: Date.now() - 1200000 },
      { text: 'Next best move identified: Algorithms revision.', type: 'INTELLIGENCE', time: Date.now() - 600000 }
    ],
    history: [],
    reminders: [],
    goals: [
      { title: 'Algorithms mastery', current: 4, target: 10, createdAt: Date.now() - 86400000 },
      { title: 'Consistent morning routine', current: 9, target: 14, createdAt: Date.now() - 172800000 }
    ],
    approvals: [],
    model: { enabled: false, endpoint: 'http://localhost:11434', model: 'llama3.2', lastError: '' },
    focus: { total: 25 * 60, remaining: 25 * 60, running: false, intention: 'Algorithms revision', sessions: 0, history: [] },
    settings: { quiet: false, speak: false, notifications: false, theme: 'dark' }
  };
}

function normalize(raw) {
  const base = defaults();
  let oldHabits = null;
  let oldHistory = null;
  try { oldHabits = JSON.parse(localStorage.getItem('ultron-habits') || 'null'); oldHistory = JSON.parse(localStorage.getItem('ultron-chat') || 'null'); } catch { /* use fresh state */ }
  const source = raw && typeof raw === 'object' ? raw : {};
  const habits = Array.isArray(source.habits) ? source.habits : (Array.isArray(oldHabits) ? base.habits.map((habit, index) => ({ ...habit, done: Boolean(oldHabits[index]) })) : base.habits);
  return {
    ...base,
    ...source,
    profile: { ...base.profile, ...(source.profile || {}) },
    settings: { ...base.settings, ...(source.settings || {}) },
    focus: { ...base.focus, ...(source.focus || {}) },
    habits: habits.map((habit, index) => ({ ...base.habits[index % base.habits.length], ...habit })),
    agenda: Array.isArray(source.agenda) ? source.agenda : base.agenda,
    memory: Array.isArray(source.memory) ? source.memory : base.memory,
    activity: Array.isArray(source.activity) ? source.activity : base.activity,
    reminders: Array.isArray(source.reminders) ? source.reminders : base.reminders,
    goals: Array.isArray(source.goals) ? source.goals : base.goals,
    approvals: Array.isArray(source.approvals) ? source.approvals : base.approvals,
    model: { ...base.model, ...(source.model || {}) },
    history: Array.isArray(source.history) ? source.history : (Array.isArray(oldHistory) ? oldHistory : [])
  };
}

let state = normalize((() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; } })());

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  localStorage.setItem('ultron-theme', state.settings.theme);
}

function escapeHtml(value) {
  const node = document.createElement('div');
  node.textContent = String(value);
  return node.innerHTML;
}

function formatDuration(seconds) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function relativeTime(time) {
  const seconds = Math.max(0, Math.round((Date.now() - time) / 1000));
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(window.ultronToastTimer);
  window.ultronToastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

function addActivity(text, type = 'INTELLIGENCE') {
  state.activity.unshift({ text, type, time: Date.now() });
  state.activity = state.activity.slice(0, 12);
  persist();
  renderActivity();
}

function addMemory(text, type = 'Saved note') {
  const clean = text.trim();
  if (!clean) return;
  state.memory.unshift({ text: clean, type, savedAt: Date.now() });
  state.memory = state.memory.slice(0, 30);
  addActivity(`Saved to private memory: “${clean.slice(0, 54)}${clean.length > 54 ? '…' : ''}”`, 'MEMORY');
  persist();
}

function speak(text) {
  if (!state.settings.speak || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.03;
  utterance.pitch = .92;
  window.speechSynthesis.speak(utterance);
}

function addMessage(text, sender = 'ultron', persistMessage = true) {
  const item = document.createElement('div');
  item.className = `message ${sender === 'user' ? 'user-message' : 'ultron-message'}`;
  item.innerHTML = sender === 'user' ? `<p>${escapeHtml(text)}</p>` : `<span class="message-mark">U</span><p>${escapeHtml(text)}</p>`;
  $('#conversation').append(item);
  $('#conversation').scrollTop = $('#conversation').scrollHeight;
  if (persistMessage) {
    state.history.push({ text, sender, time: Date.now() });
    state.history = state.history.slice(-30);
    persist();
  }
  if (sender === 'ultron') speak(text);
}

function getDailyBrief() {
  const undone = state.habits.filter(habit => !habit.done).length;
  const agendaRemaining = state.agenda.filter(item => !item.done).length;
  return `Briefing, ${state.profile.name}: your highest-leverage move is ${state.focus.intention}. You have ${agendaRemaining} agenda items and ${undone} habit${undone === 1 ? '' : 's'} still open. Begin with one protected focus block.`;
}

function respondTo(input) {
  const lower = input.toLowerCase().trim();
  const remember = input.match(/^remember(?: that)?\s+(.+)/i);
  const remind = input.match(/^remind me to\s+(.+)/i);
  if (remember) {
    addMemory(remember[1], 'Explicit memory');
    return 'Locked in, Boss. I saved that to your private memory vault on this device.';
  }
  if (remind) {
    state.agenda.push({ time: 'NEXT', title: remind[1], detail: 'Captured by Ultron · needs a time', done: false });
    persist(); renderAgenda(); addActivity(`Captured a reminder: ${remind[1]}`, 'TASK');
    return `Captured: “${remind[1]}.” It is now in your agenda as an unscheduled item.`;
  }
  if (/(lock.*phone|phone.*lock|place.*call|call.*\b|send.*(?:message|email)|email.*\b|social media)/.test(lower)) {
    const action = input.slice(0, 96);
    if (!state.approvals.some(item => item.action === action)) {
      state.approvals.unshift({ id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), action, scope: 'Native connector required', createdAt: Date.now() });
      state.approvals = state.approvals.slice(0, 6);
      addActivity(`Created a consent review for: ${action}`, 'CONSENT');
      persist(); renderApprovals();
    }
    return 'I placed that request in the consent queue, Boss. A browser cannot control a phone, call, email, or social account; a native connector and your explicit approval would be required before any action.';
  }
  if (lower.includes('daily brief') || lower.includes('brief me')) return getDailyBrief();
  if (lower.includes('what do you remember') || lower.includes('memory')) return `My current useful context: ${state.memory.slice(0, 3).map(item => item.text).join(' · ')}. You can review or erase any of it in the Memory vault.`;
  if (lower.includes('plan') || lower.includes('day')) return 'Plan locked: protect a 25-minute Algorithms revision block, handle lunch recovery at 12:30, then use weekly planning at 18:00. The only required first step is opening your notes.';
  if (lower.includes('focus') || lower.includes('start')) { openFocusDialog(); return 'Focus protocol is open, Boss. Choose a duration and begin when the intention is clear.'; }
  if (lower.includes('progress') || lower.includes('week')) return `This week: 18 deep-work hours, a 14-day streak, and ${state.habits.filter(habit => habit.done).length} of ${state.habits.length} daily systems complete. Your strongest focus window remains 9:00–11:30 AM.`;
  if (lower.includes('hello') || lower.includes('hi')) return `Hello, ${state.profile.name}. What single result would make today a win?`;
  return 'I have that, Boss. This private interface can organize your intent, focus, memories, and data locally. When you connect an approved local model gateway, it can answer with your on-device model while keeping the same permission boundaries.';
}

function isLocalModelSafe() {
  try {
    const url = new URL(state.model.endpoint);
    return ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  } catch { return false; }
}

async function requestLocalModel(text) {
  if (!state.model.enabled || !isLocalModelSafe()) return null;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 25000);
  try {
    const endpoint = state.model.endpoint.replace(/\/+$/, '');
    const messages = [{ role: 'system', content: `You are Ultron, a concise, direct private assistant. Address the user as ${state.profile.name}. Never claim to perform an external action; state when confirmation or a native integration is needed.` }, ...state.history.slice(-12).map(item => ({ role: item.sender === 'user' ? 'user' : 'assistant', content: item.text }))];
    const response = await fetch(`${endpoint}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal, body: JSON.stringify({ model: state.model.model, stream: false, messages }) });
    if (!response.ok) throw new Error(`Local model returned ${response.status}`);
    const data = await response.json();
    const answer = data?.message?.content?.trim();
    if (!answer) throw new Error('Local model returned no answer');
    state.model.lastError = ''; persist();
    return answer;
  } catch (error) {
    state.model.lastError = error.name === 'AbortError' ? 'Local model timed out' : 'Local model unavailable';
    persist();
    toast(`${state.model.lastError}; using Ultron local reasoning.`);
    return null;
  } finally { clearTimeout(timeout); }
}

function isLocalCommand(text) {
  return /^(remember|remind)|daily brief|brief me|what do you remember|\bmemory\b|\bplan\b|\bfocus\b|\bstart\b|\bprogress\b|\bweek\b|\bhello\b|^hi\b|lock.*phone|phone.*lock|place.*call|call.*\b|send.*(?:message|email)|email.*\b|social media/i.test(text);
}

function sendMessage(text) {
  const clean = text.trim();
  if (!clean) return;
  addMessage(clean, 'user');
  window.setTimeout(async () => addMessage((!isLocalCommand(clean) && await requestLocalModel(clean)) || respondTo(clean)), 280);
}

function renderClock() {
  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';
  $('.greeting h1').innerHTML = `${greeting}, <em>${escapeHtml(state.profile.name)}.</em>`;
  $('#clock').textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  $('#today').textContent = now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  $('#daily-brief').textContent = state.focus.running ? `Focus protocol active: ${state.focus.intention}. Your attention is protected.` : 'Your day is under control. One focused move at a time.';
}

function renderHabits() {
  $('#habit-list').innerHTML = state.habits.map((habit, index) => `<label class="habit"><input type="checkbox" data-habit="${index}" ${habit.done ? 'checked' : ''}/><span><strong>${escapeHtml(habit.title)}</strong><small>${escapeHtml(habit.detail)}</small></span></label>`).join('');
  $('#habit-summary').textContent = `${state.habits.filter(habit => habit.done).length} / ${state.habits.length} complete`;
}

function renderAgenda() {
  $('.timeline').innerHTML = state.agenda.map((item, index) => `<button class="time-row ${item.done ? 'done' : ''} ${item.now && !item.done ? 'now' : ''}" data-event-done="${index}" aria-label="Mark ${escapeHtml(item.title)} ${item.done ? 'open' : 'complete'}"><time>${escapeHtml(item.time)}</time><span class="node"></span><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.detail)}</small></div>${item.done ? '<b>✓</b>' : item.now ? '<b>NOW</b>' : '<b></b>'}</button>`).join('');
}

function renderFocus() {
  const ratio = state.focus.total ? Math.max(0, Math.min(1, state.focus.remaining / state.focus.total)) : 1;
  $('#focus-countdown').textContent = formatDuration(state.focus.remaining);
  $('#focus-modal-countdown').textContent = formatDuration(state.focus.remaining);
  $('#focus-state').textContent = state.focus.running ? 'IN PROGRESS' : state.focus.remaining === 0 ? 'COMPLETE' : 'READY';
  $('#focus-modal-state').textContent = $('#focus-state').textContent;
  $('#focus-intention').textContent = state.focus.intention;
  $('#focus-intention-input').value = state.focus.intention;
  $('#focus-ring-progress').style.strokeDashoffset = String(FOCUS_CIRCUMFERENCE * (1 - ratio));
  $('#focus-start-button').textContent = state.focus.running ? 'Pause focus' : state.focus.remaining === 0 ? 'Start new session' : 'Begin focus';
}

function renderActivity() {
  $('#activity-list').innerHTML = state.activity.slice(0, 3).map(item => `<article class="activity-entry"><time><i>●</i>${escapeHtml(item.type)} · ${relativeTime(item.time)}</time><p>${escapeHtml(item.text)}</p></article>`).join('');
}

function formatReminderTime(due) {
  const date = new Date(due);
  if (Number.isNaN(date.getTime())) return 'Time needed';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) === new Date().toLocaleDateString([], { month: 'short', day: 'numeric' })
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function renderReminders() {
  const reminders = state.reminders.filter(item => !item.completed).sort((a, b) => new Date(a.due) - new Date(b.due)).slice(0, 3);
  $('#reminder-list').innerHTML = reminders.length ? reminders.map(item => `<div class="reminder-row"><time>${escapeHtml(formatReminderTime(item.due))}</time><span><strong>${escapeHtml(item.text)}</strong><small>${new Date(item.due) <= new Date() ? 'Ready now' : 'Scheduled locally'}</small></span><button data-reminder-done="${escapeHtml(item.id)}">Done</button></div>`).join('') : '<div class="approval-row empty"><span><strong>No scheduled reminders</strong><small>Schedule one when you need Ultron to keep time with you.</small></span></div>';
}

function renderGoals() {
  $('#goal-list').innerHTML = state.goals.slice(0, 3).map((goal, index) => {
    const ratio = Math.min(100, Math.round((goal.current / goal.target) * 100));
    return `<div class="goal-row"><span><strong>${escapeHtml(goal.title)}</strong><small>${goal.current} / ${goal.target} units · ${ratio}%</small></span><button data-goal-progress="${index}" aria-label="Advance ${escapeHtml(goal.title)}">+1</button><div class="goal-progress"><i style="width:${ratio}%"></i></div></div>`;
  }).join('');
}

function renderApprovals() {
  $('#approval-list').innerHTML = state.approvals.length ? state.approvals.slice(0, 3).map(item => `<div class="approval-row"><span><strong>${escapeHtml(item.action)}</strong><small>${escapeHtml(item.scope)} · requires your review</small></span><button data-approval-remove="${escapeHtml(item.id)}">Dismiss</button></div>`).join('') : '<div class="approval-row empty"><span><strong>No sensitive requests queued</strong><small>Ultron will surface a consent request before an account or device action.</small></span></div>';
}

function renderModelStatus() {
  const el = $('#ai-mode-text');
  if (state.model.enabled && isLocalModelSafe()) { el.textContent = `LOCAL MODEL · ${state.model.model.toUpperCase()}`; el.classList.add('model-connected'); }
  else { el.textContent = 'LOCAL MODE'; el.classList.remove('model-connected'); }
}

function renderSettings() {
  document.body.classList.toggle('light', state.settings.theme === 'light');
  $('#quiet-toggle').classList.toggle('active', state.settings.quiet);
  $('#quiet-label').textContent = state.settings.quiet ? 'Quiet mode on' : 'Quiet mode off';
  $('#system-status').innerHTML = state.settings.quiet ? '<span></span>Quiet mode active' : '<span></span>All systems nominal';
}

function renderAll() { renderClock(); renderHabits(); renderAgenda(); renderFocus(); renderActivity(); renderReminders(); renderGoals(); renderApprovals(); renderModelStatus(); renderSettings(); }

function ensureFocusTimer() {
  clearInterval(focusTimer);
  if (!state.focus.running) return;
  focusTimer = window.setInterval(() => {
    if (!state.focus.running) return;
    state.focus.remaining = Math.max(0, state.focus.remaining - 1);
    if (state.focus.remaining === 0) {
      state.focus.running = false; state.focus.sessions += 1; state.focus.history.unshift({ intention: state.focus.intention, seconds: state.focus.total, completedAt: Date.now() }); state.focus.history = state.focus.history.slice(0, 40); clearInterval(focusTimer);
      addActivity(`Completed a protected focus session: ${state.focus.intention}.`, 'FOCUS');
      toast('Focus session complete. Take a deliberate break, Boss.');
      if (state.settings.notifications && 'Notification' in window && Notification.permission === 'granted') new Notification('Ultron focus complete', { body: 'Your protected focus session is complete.' });
      speak('Focus session complete. Take a deliberate break, Boss.');
    }
    persist(); renderFocus(); renderClock();
  }, 1000);
}

function startOrPauseFocus() {
  if (state.focus.running) { state.focus.running = false; clearInterval(focusTimer); addActivity(`Paused focus protocol: ${state.focus.intention}.`, 'FOCUS'); toast('Focus protocol paused.'); }
  else { if (state.focus.remaining === 0) state.focus.remaining = state.focus.total; state.focus.intention = $('#focus-intention-input').value.trim() || 'Protected focus'; state.focus.running = true; addActivity(`Focus protocol started: ${state.focus.intention}.`, 'FOCUS'); toast('Focus protocol active. One thing only.'); }
  persist(); renderAll(); ensureFocusTimer();
}

function resetFocus() { clearInterval(focusTimer); state.focus.running = false; state.focus.remaining = state.focus.total; persist(); renderAll(); toast('Focus timer reset.'); }

function setFocusDuration(minutes) {
  if (state.focus.running) { toast('Pause the current session before changing duration.'); return; }
  state.focus.total = minutes * 60; state.focus.remaining = minutes * 60;
  $$('.duration-pills button').forEach(button => button.classList.toggle('selected', Number(button.dataset.duration) === minutes));
  persist(); renderFocus();
}

function openFocusDialog() { if (!$('#focus-dialog').open) $('#focus-dialog').showModal(); renderFocus(); }

function openCapture(mode) {
  captureMode = mode;
  const content = { habit: ['HABIT ENGINE', 'Add a daily system.', 'SYSTEM NAME', 'e.g. Read 10 pages'], event: ['MISSION CONTROL', 'Capture an agenda item.', 'NEXT ACTION', 'e.g. Submit lab assignment'], memory: ['PRIVATE MEMORY', 'Save a useful memory.', 'WHAT SHOULD ULTRON REMEMBER?', 'e.g. My exam is on Friday'] }[mode];
  $('#capture-eyebrow').textContent = content[0]; $('#capture-title').textContent = content[1]; $('#capture-label').childNodes[0].textContent = content[2]; $('#capture-input').placeholder = content[3]; $('#capture-input').value = '';
  $('#capture-dialog').showModal(); window.setTimeout(() => $('#capture-input').focus(), 50);
}

function submitCapture(value) {
  const clean = value.trim(); if (!clean) return;
  if (captureMode === 'habit') { state.habits.push({ title: clean, detail: 'Daily system', done: false }); addActivity(`Added “${clean}” to daily systems.`, 'HABIT'); toast('New daily system added.'); }
  if (captureMode === 'event') { state.agenda.push({ time: 'NEXT', title: clean, detail: 'Captured by Ultron · needs a time', done: false }); addActivity(`Added “${clean}” to mission control.`, 'TASK'); toast('Agenda item captured.'); }
  if (captureMode === 'memory') { addMemory(clean, 'Saved note'); toast('Saved to private memory.'); }
  persist(); renderAll(); $('#capture-dialog').close();
}

function exportData() {
  const payload = { exportedAt: new Date().toISOString(), app: 'Ultron OS', version: 3, state };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = `ultron-private-backup-${new Date().toISOString().slice(0, 10)}.json`; document.body.append(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
  addActivity('Created an encrypted-ready local data export.', 'DATA'); toast('Private backup exported to this device.');
}

function restoreState(payload) {
  state = normalize(payload.state || payload);
  state.focus.running = false;
  persist(); renderAll(); ensureFocusTimer(); scheduleReminders();
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = () => { try { const parsed = JSON.parse(reader.result); if (parsed.encrypted === true) { pendingEncryptedBackup = parsed; openVault('decrypt'); return; } restoreState(parsed); toast('Private backup restored locally.'); } catch { toast('That file is not a valid Ultron backup.'); } };
  reader.readAsText(file);
}

function clearData() {
  clearInterval(focusTimer); localStorage.removeItem(STORAGE_KEY); localStorage.removeItem('ultron-habits'); localStorage.removeItem('ultron-chat'); localStorage.removeItem('ultron-theme'); state = defaults(); $('#confirm-dialog').close(); $('#conversation').innerHTML = '<div class="message ultron-message"><span class="message-mark">U</span><p>Private workspace reset. Ready when you are, Boss.</p></div>'; persist(); renderAll(); toast('Local Ultron data cleared.');
}

function requestNotifications() {
  if (!('Notification' in window)) { toast('This browser does not provide notifications.'); return; }
  Notification.requestPermission().then(permission => { state.settings.notifications = permission === 'granted'; persist(); if (permission === 'granted') { new Notification('Ultron notifications enabled', { body: 'You will only receive alerts that you explicitly configure.' }); toast('Notifications enabled.'); } else toast('Notifications stay off. You can enable them later in browser settings.'); });
}

function localDateTimeValue(date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function openScheduleDialog() {
  $('#reminder-input').value = '';
  $('#reminder-due').value = localDateTimeValue(new Date(Date.now() + 60 * 60 * 1000));
  $('#schedule-dialog').showModal();
  window.setTimeout(() => $('#reminder-input').focus(), 50);
}

function submitReminder(text, due) {
  const when = new Date(due);
  if (!text.trim() || Number.isNaN(when.getTime())) { toast('Add a reminder and a valid time.'); return; }
  const item = { id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, text: text.trim(), due: when.toISOString(), completed: false, notified: false };
  state.reminders.push(item); persist(); renderReminders(); scheduleReminders(); addActivity(`Scheduled “${item.text}” for ${formatReminderTime(item.due)}.`, 'TIME'); $('#schedule-dialog').close(); toast('Private reminder scheduled.');
}

function triggerReminder(id) {
  const item = state.reminders.find(reminder => reminder.id === id);
  if (!item || item.completed || item.notified) return;
  item.notified = true; persist(); renderReminders(); addActivity(`Reminder due: ${item.text}`, 'TIME');
  const announcement = `Reminder, ${state.profile.name}: ${item.text}`;
  toast(announcement); speak(announcement);
  if (!state.settings.quiet && state.settings.notifications && 'Notification' in window && Notification.permission === 'granted') new Notification('Ultron reminder', { body: item.text });
}

function scheduleReminders() {
  reminderTimers.forEach(timer => clearTimeout(timer));
  reminderTimers = [];
  state.reminders.filter(item => !item.completed && !item.notified).forEach(item => {
    const delay = new Date(item.due).getTime() - Date.now();
    if (delay <= 0) triggerReminder(item.id);
    else if (delay < 2147483647) reminderTimers.push(window.setTimeout(() => triggerReminder(item.id), delay));
  });
}

function openGoalDialog() {
  $('#goal-title-input').value = '';
  $('#goal-target-input').value = '10';
  $('#goal-dialog').showModal();
  window.setTimeout(() => $('#goal-title-input').focus(), 50);
}

function submitGoal(title, target) {
  const clean = title.trim(); const max = Number(target);
  if (!clean || !Number.isFinite(max) || max < 1) { toast('Add a goal and a target greater than zero.'); return; }
  state.goals.unshift({ title: clean, current: 0, target: Math.round(max), createdAt: Date.now() }); state.goals = state.goals.slice(0, 12); persist(); renderGoals(); addActivity(`Created strategic goal: ${clean}.`, 'GOAL'); $('#goal-dialog').close(); toast('Goal created. Make the first unit small.');
}

function toBase64(bytes) {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  return btoa(binary);
}

function fromBase64(value) { return Uint8Array.from(atob(value), character => character.charCodeAt(0)); }

async function deriveVaultKey(passphrase, salt) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

function downloadJson(payload, filename) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; document.body.append(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
}

function openVault(mode) {
  if (!window.crypto?.subtle) { toast('Encrypted vault needs a secure browser context. Use HTTPS or localhost.'); return; }
  vaultMode = mode;
  const decrypting = mode === 'decrypt';
  $('#vault-title').textContent = decrypting ? 'Unlock encrypted backup.' : 'Create encrypted backup.';
  $('#vault-copy').textContent = decrypting ? 'Enter the passphrase used to make this backup. Ultron cannot recover a lost passphrase.' : 'Your passphrase is never stored. Without it, the backup cannot be recovered.';
  $('#vault-submit').textContent = decrypting ? 'Unlock backup' : 'Encrypt backup';
  $('#vault-passphrase').value = ''; $('#vault-passphrase').autocomplete = decrypting ? 'current-password' : 'new-password';
  $('#vault-dialog').showModal(); window.setTimeout(() => $('#vault-passphrase').focus(), 50);
}

async function submitVault(passphrase) {
  if (passphrase.length < 12) { toast('Use a passphrase of at least 12 characters.'); return; }
  try {
    if (vaultMode === 'encrypt') {
      const salt = crypto.getRandomValues(new Uint8Array(16)); const iv = crypto.getRandomValues(new Uint8Array(12)); const key = await deriveVaultKey(passphrase, salt);
      const data = new TextEncoder().encode(JSON.stringify({ app: 'Ultron OS', version: 4, exportedAt: new Date().toISOString(), state }));
      const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data));
      downloadJson({ encrypted: true, app: 'Ultron OS', version: 1, algorithm: 'AES-GCM', kdf: 'PBKDF2-SHA-256', iterations: 250000, salt: toBase64(salt), iv: toBase64(iv), ciphertext: toBase64(cipher) }, `ultron-encrypted-backup-${new Date().toISOString().slice(0, 10)}.json`);
      addActivity('Created AES-GCM encrypted local backup.', 'DATA'); toast('Encrypted backup exported. Keep the passphrase safe.');
    } else {
      const envelope = pendingEncryptedBackup;
      if (!envelope?.salt || !envelope?.iv || !envelope?.ciphertext) throw new Error('Invalid encrypted backup');
      const key = await deriveVaultKey(passphrase, fromBase64(envelope.salt));
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(envelope.iv) }, key, fromBase64(envelope.ciphertext));
      restoreState(JSON.parse(new TextDecoder().decode(plain)));
      pendingEncryptedBackup = null; toast('Encrypted backup unlocked and restored locally.');
    }
    $('#vault-dialog').close();
  } catch { toast(vaultMode === 'decrypt' ? 'Could not unlock backup. Check the passphrase.' : 'Could not create encrypted backup.'); }
}

function openModelDialog() {
  $('#model-endpoint').value = state.model.endpoint;
  $('#model-name').value = state.model.model;
  $('#model-dialog').showModal();
}

function submitModel(endpoint, model) {
  try {
    const url = new URL(endpoint.trim());
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('not-local');
    if (!model.trim()) throw new Error('no-model');
    state.model = { ...state.model, enabled: true, endpoint: endpoint.trim().replace(/\/+$/, ''), model: model.trim(), lastError: '' };
    persist(); renderModelStatus(); if (state.currentView === 'assistant') renderModule('assistant'); $('#model-dialog').close(); addActivity(`Configured local model gateway: ${state.model.model}.`, 'AI'); toast('Local model gateway saved. Ultron will use it for open-ended questions.');
  } catch { toast('Use a localhost endpoint and a model name. Remote AI endpoints are intentionally blocked.'); }
}

function moduleCard(title, copy, action, stat = '', tag = '') { return `<article class="module-card panel-lift"><span class="eyebrow">${escapeHtml(tag || 'PRIVATE MODULE')}</span><h2>${escapeHtml(title)}</h2><p>${escapeHtml(copy)}</p>${stat ? `<span class="module-stat">${escapeHtml(stat)}</span>` : ''}${action ? `<button data-action="${action}">${escapeHtml(action.replaceAll('-', ' '))} →</button>` : ''}</article>`; }

function renderModule(view) {
  const done = state.habits.filter(item => item.done).length;
  const cards = {
    assistant: [moduleCard('Voice channel', 'Speech-to-text is available through your browser; optional voice replies stay off until you choose them.', 'voice-settings', 'READY', 'VOICE'), moduleCard('Local model gateway', 'Connect an Ollama-compatible model that is running only on your own device.', 'connect-local-model', state.model.enabled ? state.model.model.toUpperCase() : 'OFFLINE', 'AI ENGINE'), moduleCard('Document workspace', 'Attach files to the current session. Their contents are not uploaded by this interface.', 'attach-file', 'PRIVATE', 'FILES')],
    mission: [moduleCard('Daily completion', 'Daily systems build predictable progress.', 'add-habit', `${done} / ${state.habits.length}`, 'HABIT ENGINE'), moduleCard('Mission control', 'Capture the next thing before it becomes mental noise.', 'add-event', `${state.agenda.filter(item => !item.done).length} OPEN`, 'AGENDA'), moduleCard('Time intelligence', 'Schedule browser-local reminders for the moments that matter.', 'schedule-reminder', `${state.reminders.filter(item => !item.completed).length} LIVE`, 'SCHEDULER')],
    focus: [moduleCard('Protected focus timer', 'Choose a clear intention and a duration. Ultron records only the session you choose to start.', 'open-focus', formatDuration(state.focus.remaining), 'FOCUS PROTOCOL'), moduleCard('Session history', 'Completed blocks are a signal, not a measure of your worth.', '', `${state.focus.sessions} SESSIONS`, 'LOCAL METRIC'), moduleCard('Attention safeguards', 'Native app integrations can later offer opt-in notification silencing or app blocking.', 'open-focus', 'OPT-IN', 'DEVICE CONTROL')],
    memory: [moduleCard('Memory capture', 'Save only the details that will be useful later.', 'save-memory', `${state.memory.length} ITEMS`, 'PRIVATE VAULT'), moduleCard('Encrypted backup', 'Create an AES-GCM backup secured with a passphrase that is never stored.', 'encrypt-backup', 'AES-256', 'DATA PORTABILITY'), moduleCard('Import backup', 'Restore an Ultron backup you explicitly select from this device.', 'import-data', 'LOCAL', 'DATA PORTABILITY'), `<article class="memory-vault panel-lift"><span class="eyebrow">MEMORY VAULT · REVIEWABLE & ERASABLE</span><h2>Current private context</h2>${state.memory.slice(0, 6).map((item, index) => `<div class="vault-row"><small>${escapeHtml(item.type)} · ${relativeTime(item.savedAt)}</small><p>${escapeHtml(item.text)}</p><button data-memory-remove="${index}" aria-label="Remove memory">×</button></div>`).join('')}<div class="dialog-actions"><button class="primary-action" data-action="save-memory">Save new memory</button><button class="ghost-action" data-action="clear-data">Clear all local data</button></div></article>`],
    settings: [moduleCard('Voice replies', 'Keep spoken Ultron replies off or on. This setting remains in your browser.', 'voice-settings', state.settings.speak ? 'ON' : 'OFF', 'VOICE'), moduleCard('Notifications', 'Ultron can request browser notifications only after you activate them.', 'enable-notifications', state.settings.notifications ? 'ON' : 'OFF', 'ALERTS'), moduleCard('Appearance', 'Switch between the low-light command interface and a bright work surface.', 'toggle-theme', state.settings.theme.toUpperCase(), 'DISPLAY'), moduleCard('Local AI gateway', 'Configure a localhost-only model endpoint. No remote endpoint is accepted.', 'connect-local-model', state.model.enabled ? 'READY' : 'OFF', 'ON-DEVICE AI'), `<article class="settings-note">Sensitive integrations—including calendar edits, emails, social messages, calls, device locks, and screen-time controls—are intentionally unavailable until you connect a native, permissioned integration. Ultron should ask before it acts.</article>`],
    intel: [moduleCard('Calendar bridge', 'Read or write calendar events only after a direct OAuth connection you approve.', 'connect-calendar', 'NOT CONNECTED', 'ACCOUNT'), moduleCard('Device capabilities', 'Phone calls, lock commands, wake words, and screen-time controls need an approved native mobile companion.', 'device-roadmap', 'NATIVE REQUIRED', 'DEVICE'), moduleCard('Privacy model', 'Actions affecting accounts, people, or devices must cross a visible consent gate.', 'privacy-brief', 'ACTIVE', 'SAFETY'), `<article class="settings-note">Ultron OS is currently running as a private local web app. It can work offline after its first load; local AI, secure syncing, and native device features are progressive integrations, not invisible background access.</article>`]
  };
  const intros = { assistant: ['CONVERSATIONAL INTELLIGENCE', 'A direct answer, whenever you need one.', 'Use voice, local files, and an optional local model gateway without losing control of your data.'], mission: ['HABIT & GOAL SYSTEM', 'Build the system behind your goals.', 'Your goals become actionable only when the next move is visible.'], focus: ['DEEP WORK PROTOCOL', 'Make your next hour count.', 'A deliberately small focus layer: intention, timer, history, and no hidden device control.'], memory: ['PRIVATE MEMORY', 'Useful context that stays yours.', 'Every saved item is visible, exportable, and erasable from this device.'], settings: ['CONTROL CENTER', 'You decide every connection.', 'Tune the parts of Ultron that are allowed to run and keep every sensitive integration off by default.'], intel: ['INTEGRATION INTELLIGENCE', 'The future layer—permission first.', 'A real personal assistant needs trustworthy connections, not silent access.'] };
  const [eyebrow, title, copy] = intros[view] || intros.settings;
  $('#secondary-eyebrow').textContent = eyebrow; $('#secondary-title').textContent = title; $('#secondary-copy').textContent = copy; $('#module-grid').innerHTML = (cards[view] || cards.settings).join('');
}

function showView(view) {
  state.currentView = view;
  const isCommand = view === 'command'; $('#dashboard').hidden = !isCommand; $('#secondary-view').hidden = isCommand; $$('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.view === view)); $('#view-label').textContent = isCommand ? 'COMMAND CENTER' : (view || 'COMMAND').toUpperCase(); if (!isCommand) renderModule(view); $('.rail').classList.remove('open'); window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleAction(action) {
  const actions = { 'daily-brief': () => sendMessage('Run my daily brief'), 'open-focus': openFocusDialog, 'reset-focus': resetFocus, 'add-event': () => openCapture('event'), 'add-habit': () => openCapture('habit'), 'add-goal': openGoalDialog, 'schedule-reminder': openScheduleDialog, 'save-memory': () => openCapture('memory'), 'export-data': exportData, 'encrypt-backup': () => openVault('encrypt'), 'import-data': () => $('#import-input').click(), 'clear-data': () => $('#confirm-dialog').showModal(), 'enable-notifications': requestNotifications, 'toggle-theme': () => { state.settings.theme = state.settings.theme === 'light' ? 'dark' : 'light'; persist(); renderSettings(); if (state.currentView === 'settings') renderModule('settings'); toast(`${state.settings.theme === 'light' ? 'Light' : 'Low-light'} workspace enabled.`); }, 'voice-settings': () => { state.settings.speak = !state.settings.speak; persist(); if (state.currentView === 'assistant' || state.currentView === 'settings') renderModule(state.currentView); toast(`Voice replies ${state.settings.speak ? 'enabled' : 'disabled'}.`); }, 'attach-file': () => $('#file-input').click(), 'connect-local-model': openModelDialog, 'connect-calendar': () => toast('Calendar connection stays off until you add an OAuth integration and approve it.'), 'device-roadmap': () => toast('Native phone control needs a Capacitor companion and explicit device permissions.'), 'privacy-brief': () => toast('Privacy rule: Ultron must ask before any action affecting a person, account, or device.'), 'open-calendar': () => toast('Calendar integrations are deliberately opt-in.'), 'close-dialog': () => $$('dialog[open]').forEach(dialog => dialog.close()) };
  if (actions[action]) actions[action]();
}

function setupVoice() {
  const button = $('#voice-button'); const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) { button.addEventListener('click', () => toast('Voice input needs a browser with speech recognition enabled.')); return; }
  const recognition = new Recognition(); recognition.lang = state.profile.locale; recognition.interimResults = false;
  recognition.onstart = () => { button.classList.add('is-listening'); toast(`Listening, ${state.profile.name}…`); };
  recognition.onend = () => button.classList.remove('is-listening');
  recognition.onresult = event => { $('#chat-input').value = event.results[0][0].transcript; $('#chat-form').requestSubmit(); };
  recognition.onerror = () => toast('I could not hear that. Check microphone permission and try again.');
  button.addEventListener('click', () => recognition.start());
}

function setupPalette() {
  const dialog = $('#command-palette'); const toggle = () => dialog.open ? dialog.close() : dialog.showModal();
  $('#command-button').addEventListener('click', toggle);
  $('#palette-input').addEventListener('input', event => { const term = event.target.value.toLowerCase(); $$('#palette-actions button').forEach(button => { button.hidden = !button.textContent.toLowerCase().includes(term); }); });
  $$('#palette-actions button').forEach(button => button.addEventListener('click', event => { event.preventDefault(); dialog.close(); const command = button.dataset.command; if (command === 'open-focus') openFocusDialog(); else if (command === 'daily-brief') sendMessage('Run my daily brief'); else showView(command); }));
  window.addEventListener('keydown', event => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); toggle(); } if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) { event.preventDefault(); $('#chat-input').focus(); } });
}

function bindEvents() {
  document.addEventListener('click', event => {
    const view = event.target.closest('[data-view]'); if (view) { showView(view.dataset.view); return; }
    const prompt = event.target.closest('[data-prompt]'); if (prompt) { sendMessage(prompt.dataset.prompt); return; }
    const action = event.target.closest('[data-action]'); if (action) { handleAction(action.dataset.action); return; }
    const habit = event.target.closest('[data-habit]'); if (habit) { const index = Number(habit.dataset.habit); state.habits[index].done = habit.checked; addActivity(`${state.habits[index].title} marked ${habit.checked ? 'complete' : 'open'}.`, 'HABIT'); persist(); renderHabits(); toast(habit.checked ? `${state.habits[index].title} complete.` : 'Habit reopened.'); return; }
    const agenda = event.target.closest('[data-event-done]'); if (agenda) { const index = Number(agenda.dataset.eventDone); state.agenda[index].done = !state.agenda[index].done; state.agenda[index].now = false; addActivity(`${state.agenda[index].title} marked ${state.agenda[index].done ? 'complete' : 'open'}.`, 'TASK'); persist(); renderAgenda(); return; }
    const removeMemory = event.target.closest('[data-memory-remove]'); if (removeMemory) { const index = Number(removeMemory.dataset.memoryRemove); const [removed] = state.memory.splice(index, 1); addActivity(`Removed a saved memory: “${removed.text.slice(0, 40)}${removed.text.length > 40 ? '…' : ''}”`, 'MEMORY'); persist(); renderModule('memory'); toast('Memory removed from this device.'); return; }
    const reminder = event.target.closest('[data-reminder-done]'); if (reminder) { const item = state.reminders.find(entry => entry.id === reminder.dataset.reminderDone); if (item) { item.completed = true; persist(); renderReminders(); scheduleReminders(); addActivity(`Completed reminder: ${item.text}.`, 'TIME'); toast('Reminder completed.'); } return; }
    const goal = event.target.closest('[data-goal-progress]'); if (goal) { const item = state.goals[Number(goal.dataset.goalProgress)]; if (item) { item.current = Math.min(item.target, item.current + 1); persist(); renderGoals(); addActivity(`Advanced goal: ${item.title} (${item.current}/${item.target}).`, 'GOAL'); if (item.current === item.target) toast(`Goal complete: ${item.title}.`); } return; }
    const approval = event.target.closest('[data-approval-remove]'); if (approval) { state.approvals = state.approvals.filter(item => item.id !== approval.dataset.approvalRemove); persist(); renderApprovals(); toast('Consent request dismissed.'); }
  });
  $('#quiet-toggle').addEventListener('click', () => { state.settings.quiet = !state.settings.quiet; persist(); renderSettings(); toast(state.settings.quiet ? 'Quiet mode enabled.' : 'Quiet mode disabled.'); });
  $('#theme-toggle').addEventListener('click', () => handleAction('toggle-theme'));
  $('#chat-form').addEventListener('submit', event => { event.preventDefault(); const input = $('#chat-input'); sendMessage(input.value); input.value = ''; });
  $('#attach-button').addEventListener('click', () => $('#file-input').click());
  $('#file-input').addEventListener('change', event => { const files = [...event.target.files]; if (files.length) { addActivity(`${files.length} private file${files.length > 1 ? 's' : ''} selected for this session.`, 'FILES'); toast(`${files.length} file${files.length > 1 ? 's' : ''} selected locally for this session.`); } event.target.value = ''; });
  $('#focus-start-button').addEventListener('click', startOrPauseFocus);
  $('#focus-intention-input').addEventListener('change', event => { state.focus.intention = event.target.value.trim() || 'Protected focus'; persist(); renderFocus(); });
  $$('.duration-pills button').forEach(button => button.addEventListener('click', () => setFocusDuration(Number(button.dataset.duration))));
  $('#capture-form').addEventListener('submit', event => { event.preventDefault(); submitCapture($('#capture-input').value); });
  $('#schedule-form').addEventListener('submit', event => { event.preventDefault(); submitReminder($('#reminder-input').value, $('#reminder-due').value); });
  $('#goal-form').addEventListener('submit', event => { event.preventDefault(); submitGoal($('#goal-title-input').value, $('#goal-target-input').value); });
  $('#vault-form').addEventListener('submit', event => { event.preventDefault(); submitVault($('#vault-passphrase').value); });
  $('#model-form').addEventListener('submit', event => { event.preventDefault(); submitModel($('#model-endpoint').value, $('#model-name').value); });
  $('#confirm-clear').addEventListener('click', clearData);
  $('#import-input').addEventListener('change', event => { const file = event.target.files[0]; if (file) importData(file); event.target.value = ''; });
}

function init() {
  state.currentView = 'command'; renderAll(); state.history.forEach(message => addMessage(message.text, message.sender, false)); bindEvents(); setupVoice(); setupPalette(); ensureFocusTimer(); scheduleReminders(); setInterval(renderClock, 1000);
  window.addEventListener('online', () => { $('#system-status').innerHTML = '<span></span>All systems nominal'; toast('Connection restored. Local data remains on this device.'); });
  window.addEventListener('offline', () => { $('#system-status').innerHTML = '<span></span>Offline · local mode'; toast('Offline mode active. Your private workspace is still available.'); });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
}

init();
