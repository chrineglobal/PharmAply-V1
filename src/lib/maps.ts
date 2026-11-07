/**
 * Centralized Google Maps API key resolver
 * Supports AI Studio Secrets (GOOGLE_MAPS_PLATFORM_KEY),
 * Vite env vars (VITE_GOOGLE_MAPS_API_KEY, VITE_GOOGLE_MAPS_PLATFORM_KEY),
 * and runtime globals.
 */
export function getGoogleMapsApiKey(): string {
  try {
    if (typeof window !== 'undefined') {
      if ((window as any).__googleMapsAuthFailed || sessionStorage.getItem('gmp_auth_failed') === 'true') {
        return '';
      }
    }

    const candidateKeys = [
      (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY,
      (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY,
      process.env.GOOGLE_MAPS_PLATFORM_KEY,
      (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY
    ];

    for (const key of candidateKeys) {
      if (
        key &&
        typeof key === 'string' &&
        key !== 'YOUR_GOOGLE_MAPS_API_KEY' &&
        key !== 'YOUR_KEY_HERE' &&
        key !== 'YOUR_API_KEY' &&
        key.startsWith('AIza') &&
        key.length >= 30
      ) {
        return key;
      }
    }

    return '';
  } catch {
    return '';
  }
}

export function hasValidGoogleMapsKey(): boolean {
  return Boolean(getGoogleMapsApiKey());
}
