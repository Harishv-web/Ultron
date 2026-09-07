import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

const PWA_VERSION = '2026.09.07.3';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      });

      const notifyUpdate = () => {
        window.dispatchEvent(new CustomEvent('pwa-update-ready', {
          detail: { registration, version: PWA_VERSION },
        }));
      };

      if (registration.waiting) {
        notifyUpdate();
      }

      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
            notifyUpdate();
          }
        });
      });
    } catch {
      // Service worker registration is optional and should not block the app.
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
