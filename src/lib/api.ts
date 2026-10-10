// Single source of truth for where the Ultron backend lives.
//
// This was previously typed as `http://localhost:4000` directly into 19
// different fetch() calls. That works in a desktop browser dev session,
// because "localhost" there really does mean your own machine. It breaks
// the moment the app runs anywhere else:
//   - Inside the Capacitor Android app, "localhost" means the PHONE, not
//     your dev machine — there is no server on port 4000 on the phone.
//   - If the frontend and backend are ever deployed separately, they're
//     no longer on the same host at all.
//
// Fix: set VITE_API_URL in your .env file (see .env.example) for whichever
// environment you're building for. Vite only exposes env vars prefixed
// with VITE_ to client code, and only reads them from a real .env file.
const rawApiUrl = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:4000';

// Strip any trailing slash so callers can safely do `${API_BASE_URL}/api/...`
// without ending up with a double slash.
export const API_BASE_URL = rawApiUrl.replace(/\/+$/, '');
