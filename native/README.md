# Ultron native companion

The web application remains the private local-first core. This folder records the required, permission-based native expansion path rather than pretending that a website can control a phone or accounts.

## Android and iOS: Capacitor

After installing the required Android/iOS toolchains, install the dependencies and add only the platforms you will actively build:

```powershell
npm install
npx cap add android
npx cap sync
npx cap open android
```

For iOS, run `npx cap add ios` on macOS with Xcode installed. Capacitor's current setup documentation lists Android, iOS, and web as supported targets and details the platform prerequisites. [Capacitor environment setup](https://capacitorjs.com/docs/getting-started/environment-setup)

Native plugins should be added in this order:

1. Local notifications and share-to-Ultron.
2. Secure storage/keychain for OAuth tokens and encryption keys.
3. Background tasks for reminders—within each platform's battery/privacy rules.
4. A push-to-talk surface and a user-controlled wake-word engine.
5. Optional on-device LLM capability on supported devices.

Every call, message, email, calendar write, device setting change, or screen-time action must require a visible authorization record from Ultron's consent queue. Never store passwords or financial information in web storage.

## Desktop: Tauri

Use a Tauri wrapper when desktop-only native access is needed (e.g., system tray, encrypted SQLite, local Ollama bridge). On Windows it requires the C++ build tools and WebView2; it also requires a Rust toolchain. [Tauri prerequisites](https://tauri.app/start/prerequisites/)

## On-device AI

Ultron's web UI can use an Ollama-compatible `localhost` gateway. Capacitor also documents an experimental local LLM option that uses Apple Intelligence on supported iOS hardware and Gemini Nano on compatible Android devices. It does not bundle a model, and availability depends on the device and operating system. [Capacitor local LLM API](https://next.capacitorjs.com/docs/apis/local-llm)

## Encrypted multi-device sync

The current app supports AES-GCM encrypted backup export/import for intentional device transfer. Automatic sync needs a separate server/relay design with all of the following before implementation:

- Per-device public keys and device verification.
- Client-side encryption before upload; server stores ciphertext only.
- Versioning/conflict resolution and revocation for lost devices.
- Recovery flow that does not weaken the encryption model.

Do not connect a cloud store until those design requirements and the user's chosen provider are agreed.
