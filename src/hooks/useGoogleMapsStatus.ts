import { useState, useEffect } from 'react';
import { getGoogleMapsApiKey } from '../lib/maps';

export function useGoogleMapsStatus() {
  const [mapsFailed, setMapsFailed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return Boolean((window as any).__googleMapsAuthFailed) || sessionStorage.getItem('gmp_auth_failed') === 'true';
  });

  const apiKey = getGoogleMapsApiKey();
  const isAvailable = Boolean(apiKey) && !mapsFailed;

  useEffect(() => {
    const handleAuthFailed = () => {
      setMapsFailed(true);
      try {
        sessionStorage.setItem('gmp_auth_failed', 'true');
      } catch {}
    };
    window.addEventListener('google-maps-auth-failed', handleAuthFailed);
    return () => window.removeEventListener('google-maps-auth-failed', handleAuthFailed);
  }, []);

  return { mapsFailed, apiKey, isAvailable };
}

