import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App.tsx';
import { AuthProvider } from './components/AuthProvider';
import { CartProvider } from './components/CartProvider';
import './index.css';
import './lib/i18n';

(window as any).gm_authFailure = function() {
  console.warn("Google Maps JS API Authentication or Billing Error detected. Switching map components to fallback view.");
  (window as any).__googleMapsAuthFailed = true;
  try {
    sessionStorage.setItem('gmp_auth_failed', 'true');
  } catch {}
  window.dispatchEvent(new Event('google-maps-auth-failed'));
};

const originalConsoleError = console.error;
console.error = (...args) => {
  const firstArg = args[0];
  const firstStr = typeof firstArg === 'string' ? firstArg : (firstArg?.message || '');
  if (
    firstStr.includes('[vite]') || 
    firstStr.includes('Refresh Token') || 
    firstStr.includes('WebSocket') || 
    firstStr.includes('invalid_grant') ||
    firstStr.includes('BillingNotEnabledMapError') ||
    firstStr.includes('Google Maps JavaScript API error') ||
    firstStr.includes('Error with geolocation') ||
    firstStr.includes('Error getting user location') ||
    firstStr.includes('Script error')
  ) {
    return;
  }
  originalConsoleError(...args);
};

// Global window.onerror handler to catch and suppress cross-origin "Script error."
window.onerror = function (message, source, lineno, colno, error) {
  const msgStr = typeof message === 'string' ? message : '';
  const srcStr = typeof source === 'string' ? source : '';
  if (
    !msgStr ||
    msgStr === 'Script error.' ||
    msgStr.includes('Script error') ||
    srcStr.includes('maps.googleapis.com') ||
    msgStr.includes('BillingNotEnabledMapError') ||
    msgStr.includes('Google Maps') ||
    msgStr.includes('ResizeObserver')
  ) {
    if (srcStr.includes('maps.googleapis.com') || msgStr.includes('Google Maps') || msgStr.includes('BillingNotEnabledMapError')) {
      (window as any).__googleMapsAuthFailed = true;
      try { sessionStorage.setItem('gmp_auth_failed', 'true'); } catch {}
      window.dispatchEvent(new Event('google-maps-auth-failed'));
    }
    return true; // Prevents firing the default browser error handler
  }
  return false;
};

// Capture-phase error listener for window
window.addEventListener('error', (e) => {
  const msg = e.message || '';
  const filename = e.filename || '';
  if (
    !msg ||
    msg === 'Script error.' ||
    msg.includes('Script error') ||
    filename.includes('maps.googleapis.com') ||
    msg.includes('BillingNotEnabledMapError') ||
    msg.includes('Google Maps') ||
    msg.includes('[vite]') ||
    msg.includes('Refresh Token') ||
    msg.includes('Invalid Refresh Token') ||
    msg.includes('ResizeObserver loop')
  ) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation?.();
    if (filename.includes('maps.googleapis.com') || msg.includes('Google Maps') || msg.includes('BillingNotEnabledMapError')) {
      (window as any).__googleMapsAuthFailed = true;
      try { sessionStorage.setItem('gmp_auth_failed', 'true'); } catch {}
      window.dispatchEvent(new Event('google-maps-auth-failed'));
    }
  }
}, true);

window.addEventListener('unhandledrejection', (e) => {
  const reason = e.reason;
  const reasonMsg = typeof reason === 'string' ? reason : (reason?.message || '');
  if (
    !reasonMsg ||
    reasonMsg.includes('[vite]') ||
    reasonMsg.includes('Refresh Token') ||
    reasonMsg.includes('Invalid Refresh Token') ||
    reasonMsg.includes('Script error') ||
    reasonMsg.includes('Google Maps') ||
    reasonMsg.includes('BillingNotEnabledMapError') ||
    reasonMsg.includes('Failed to fetch')
  ) {
    e.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <CartProvider>
        <Toaster position="top-center" />
        <App />
      </CartProvider>
    </AuthProvider>
  </StrictMode>,
);

