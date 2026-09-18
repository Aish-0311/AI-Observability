import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initializeTelemetry } from './telemetry';
import '@/styles/tokens.scss';
import '@/styles/bootstrap.scss';

async function bootstrap() {
  initializeTelemetry();

  if (import.meta.env.DEV && !import.meta.env.VITE_USE_BACKEND) {
    const { worker } = await import('./mocks/browser');
    await worker.start({
      onUnhandledRequest: 'warn',
      serviceWorker: { url: '/mockServiceWorker.js' },
    });
  } else if ('serviceWorker' in navigator) {
    // Running against the real backend — make sure a previously registered
    // MSW mock service worker is removed so it doesn't intercept /api calls.
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(r => r.unregister()));
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

bootstrap();
