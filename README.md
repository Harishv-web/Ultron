# ULTRON

Ultron is a private, local-first personal command center. This repository contains a refined progressive web app designed to be the UI foundation for a personal AI assistant on desktop and mobile.

## Run locally

The app is dependency-free. Serve the folder locally (service workers and microphone permissions require `localhost` or HTTPS):

```powershell
node server.js
```

Then visit `http://localhost:4173` in a Chromium-based browser and use its **Install app** option to add it as a desktop app. The service worker caches the app shell after the first visit, so the interface remains available offline.

### Mobile

For a temporary browser preview on a phone, host this folder on an HTTPS URL and open that URL on the phone; Chrome and Safari then offer **Install app** / **Add to Home Screen**. A native release needs the Capacitor wrapper described below—browser-only code cannot reliably support background wake words, phone calls, device locking, or other operating-system controls.

## What works now

- Responsive command center with desktop and mobile navigation.
- Local browser memory for messages, habits, and theme preference.
- Voice-to-text when the browser supports Web Speech and microphone permission is granted.
- File selection feedback, command palette (`Ctrl/Cmd + K`), focus dashboard, mission, memory, and privacy modules.
- Offline shell caching after the first visit.

## Production integration roadmap

The UI never silently takes control of a device or account. Those functions should be connected only after explicit approvals and per-service OAuth/device permissions:

1. **Local AI:** Run Ollama or another local model, then add a small local API adapter to pass chat/file prompts to it. A capable local model needs a modern laptop/desktop; quality and speed depend on the hardware.
2. **Voice:** For reliable wake-word/offline transcription, add an on-device wake-word engine and speech-to-text model. Browser speech recognition is a convenience fallback, not an offline guarantee.
3. **Desktop/mobile packaging:** Wrap this PWA with Tauri for Windows/macOS/Linux and Capacitor for Android/iOS. Native capabilities—calling, locking a phone, notifications, screen-time data, and background wake words—need platform-specific permissions, store policies, and user confirmation.
4. **Accounts and calendar:** Use OAuth for Google Calendar, email, and messaging providers. Do not store passwords, account numbers, or secret keys in browser storage; use the platform keychain / encrypted vault.
5. **Private data:** Replace localStorage with encrypted SQLite or IndexedDB, add device-local backups and an encrypted export, and design memory review/delete controls before storing personal history.

## Safety and privacy note

Some requested abilities (phone locking, placing calls, sending messages, accessing mail/social apps, monitoring activity, and calendar changes) are sensitive and cannot be safely or reliably performed by a web page alone. The recommended design is permission-based, confirmation-gated native integrations—never unbounded control or continuous surveillance.
