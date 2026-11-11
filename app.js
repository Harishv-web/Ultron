const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const state = {
  habits: JSON.parse(localStorage.getItem('ultron-habits') || '[true,true,false]'),
  history: JSON.parse(localStorage.getItem('ultron-chat') || '[]'),
  currentView: 'command'
};

const modules = {
  assistant: { eyebrow: 'CONVERSATIONAL INTELLIGENCE', title: 'A direct answer, whenever you need one.', copy: 'Use this space for questions, voice notes, and private files. A local model connection can be added when you are ready.', cards: [['Voice channel','Use your microphone for a hands-free session.','Activate microphone'],['Private files','Attach a document or image for this session.','Attach a file'],['Languages','Choose the language you want Ultron to use.','Language settings']] },
  mission: { eyebrow: 'HABIT & GOAL SYSTEM', title: 'Build the system behind your goals.', copy: 'Track daily habits, weekly missions, and long-term milestones in one private dashboard.', cards: [['Daily completion','4 / 5 systems checked in','Open habits'],['This week','18 focused hours logged','Review week'],['Milestones','3 moments worth remembering','View timeline']] },
  focus: { eyebrow: 'DEEP WORK PROTOCOL', title: 'Make your next hour count.', copy: 'A distraction-light focus mode with local timers and session history.', cards: [['Focus timer','Start a 25-minute uninterrupted sprint.','Start 25 minutes'],['Today’s depth','3h 40m of 6h target','Set target'],['Distraction log','No interruptions recorded','Open focus mode']] },
  memory: { eyebrow: 'PRIVATE MEMORY', title: 'Useful context that stays yours.', copy: 'Memories are intentionally saved on this device. You decide what Ultron keeps and what it forgets.', cards: [['Saved preferences','“Call me Boss”','Manage preferences'],['Recent context','Today’s agenda and goals','Review memory'],['Data control','Export or clear local data at any time.','Open data controls']] },
  settings: { eyebrow: 'PRIVATE BY DESIGN', title: 'Control every connection.', copy: 'Connect only the services you want. Sensitive device actions always need your explicit approval.', cards: [['Local-first data','This demo stores data in your browser.','Privacy settings'],['Calendar connection','Not connected yet','Connect calendar'],['Offline readiness','Service worker enabled after first visit.','Check offline status']] }
};

function save() {
  localStorage.setItem('ultron-habits', JSON.stringify(state.habits));
  localStorage.setItem('ultron-chat', JSON.stringify(state.history.slice(-20)));
}

function escapeHtml(value) {
  const node = document.createElement('div'); node.textContent = value; return node.innerHTML;
}

function addMessage(text, sender = 'ultron', saveMessage = true) {
  const item = document.createElement('div');
  item.className = `message ${sender === 'user' ? 'user-message' : 'ultron-message'}`;
  item.innerHTML = sender === 'user' ? `<p>${escapeHtml(text)}</p>` : `<span class="message-mark">U</span><p>${escapeHtml(text)}</p>`;
  $('#conversation').append(item);
  $('#conversation').scrollTop = $('#conversation').scrollHeight;
  if (saveMessage) { state.history.push({ text, sender }); save(); }
}

function replyFor(text) {
  const input = text.toLowerCase();
  if (input.includes('plan') || input.includes('day')) return 'Plan locked: finish Algorithms revision, protect a 25-minute focus block, then handle your weekly planning at 18:00. Start with the next 10 minutes.';
  if (input.includes('focus')) { $('#focus-hours').innerHTML = '3<small>h 41m</small>'; return 'Focus protocol is ready, Boss. I’ve marked the next 25 minutes as distraction-free. Your timer can be connected in the Focus module.'; }
  if (input.includes('progress') || input.includes('week')) return 'This week: 18 focused hours, a 14-day habit streak, and four habits holding steady. Your strongest focus window remains 9:00–11:30 AM.';
  if (input.includes('hello') || input.includes('hi')) return 'Hello, Boss. What is the one result that would make today a win?';
  return 'I’ve captured that, Boss. For a production local assistant, connect a local model such as Ollama in the integration layer; the dashboard and private activity data remain on your device.';
}

function sendMessage(text) {
  const clean = text.trim(); if (!clean) return;
  addMessage(clean, 'user');
  window.setTimeout(() => addMessage(replyFor(clean)), 450);
}

function renderHabits() {
  const habits = [['Hydration','6 / 8 glasses'],['Deep study','90 min target'],['Evening reset','9:30 PM']];
  $('#habit-list').innerHTML = habits.map(([name, detail], index) => `<label class="habit"><input type="checkbox" data-habit="${index}" ${state.habits[index] ? 'checked' : ''}/><span><strong>${name}</strong><small>${detail}</small></span></label>`).join('');
  $$('[data-habit]').forEach(input => input.addEventListener('change', () => { state.habits[Number(input.dataset.habit)] = input.checked; save(); toast(input.checked ? `${input.parentElement.innerText.split('\n')[0]} complete.` : 'Habit reopened.'); }));
}

function updateClock() {
  const now = new Date();
  $('#clock').textContent = now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
  $('#today').textContent = now.toLocaleDateString([], {weekday:'long', month:'short', day:'numeric'});
}

function toast(message) { const el = $('#toast'); el.textContent = message; el.classList.add('show'); clearTimeout(window.toastTimer); window.toastTimer = setTimeout(() => el.classList.remove('show'), 2600); }

function showView(view) {
  const isCommand = view === 'command'; state.currentView = view;
  $('#dashboard').hidden = !isCommand; $('#secondary-view').hidden = isCommand;
  $$('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.view === view));
  $('#view-label').textContent = isCommand ? 'COMMAND CENTER' : (view || 'COMMAND').toUpperCase();
  if (!isCommand) {
    const data = modules[view] || modules.settings;
    $('#secondary-eyebrow').textContent = data.eyebrow; $('#secondary-title').textContent = data.title; $('#secondary-copy').textContent = data.copy;
    $('#module-grid').innerHTML = data.cards.map(([title, copy, action], i) => `<article class="module-card panel-lift"><span class="eyebrow">0${i + 1} / ${view.toUpperCase()}</span><h2>${title}</h2><p>${copy}</p><button data-module-action="${action}">${action} →</button></article>`).join('');
    $$('[data-module-action]').forEach(button => button.addEventListener('click', () => toast(`${button.dataset.moduleAction} is ready for the production integration.`)));
  }
  $('.rail').classList.remove('open'); window.scrollTo({top: 0, behavior: 'smooth'});
}

function setupVoice() {
  const button = $('#voice-button');
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) { button.addEventListener('click', () => toast('Voice input needs a Chromium browser with speech recognition enabled.')); return; }
  const recognition = new Recognition(); recognition.lang = navigator.language || 'en-US'; recognition.interimResults = false;
  recognition.onstart = () => { button.classList.add('is-listening'); toast('Listening, Boss…'); };
  recognition.onend = () => button.classList.remove('is-listening');
  recognition.onresult = event => { $('#chat-input').value = event.results[0][0].transcript; $('#chat-form').requestSubmit(); };
  recognition.onerror = () => toast('I could not hear that. Try again when microphone permission is available.');
  button.addEventListener('click', () => recognition.start());
}

function setupPalette() {
  const dialog = $('#command-palette');
  const toggle = () => dialog.open ? dialog.close() : dialog.showModal();
  $('#command-button').addEventListener('click', toggle);
  window.addEventListener('keydown', event => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); toggle(); } if (event.key === '/' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) { event.preventDefault(); $('#chat-input').focus(); } });
  $$('[data-command]').forEach(button => button.addEventListener('click', () => { showView(button.dataset.command); dialog.close(); }));
}

function init() {
  renderHabits(); updateClock(); setInterval(updateClock, 1000);
  state.history.forEach(message => addMessage(message.text, message.sender, false));
  $$('.nav-item[data-view], [data-view="command"]').forEach(button => button.addEventListener('click', () => showView(button.dataset.view)));
  $('#chat-form').addEventListener('submit', event => { event.preventDefault(); const input = $('#chat-input'); sendMessage(input.value); input.value = ''; });
  $$('.quick-prompts button').forEach(button => button.addEventListener('click', () => sendMessage(button.dataset.prompt)));
  $('#attach-button').addEventListener('click', () => $('#file-input').click());
  $('#file-input').addEventListener('change', event => { const files = [...event.target.files]; if (files.length) toast(`${files.length} file${files.length > 1 ? 's' : ''} attached locally for this session.`); event.target.value = ''; });
  $('#theme-toggle').addEventListener('click', () => { document.body.classList.toggle('light'); localStorage.setItem('ultron-theme', document.body.classList.contains('light') ? 'light' : 'dark'); });
  if (localStorage.getItem('ultron-theme') === 'light') document.body.classList.add('light');
  $('.menu-toggle').addEventListener('click', () => $('.rail').classList.toggle('open'));
  $$('[data-action="open-calendar"]').forEach(button => button.addEventListener('click', () => toast('Calendar integrations are deliberately opt-in. Connect one from Settings when ready.')));
  $('[data-action="add-event"]').addEventListener('click', () => toast('Quick event capture is ready to connect to your local calendar.'));
  setupVoice(); setupPalette();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
}
init();
