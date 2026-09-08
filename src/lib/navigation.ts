/**
 * Navigation utility for launching external navigation apps (Google Maps, Waze, Apple Maps, default Geo URI)
 * with destination address coordinates pre-filled.
 */

export type NavigationApp = 'google_maps' | 'waze' | 'apple_maps' | 'default_geo';

export interface NavigationTarget {
  lat: number;
  lng: number;
  address?: string;
  label?: string;
}

const PREFERRED_APP_KEY = 'pharma_preferred_nav_app';

/**
 * Returns the driver's preferred navigation app, if set in localStorage.
 */
export function getPreferredNavigationApp(): NavigationApp | null {
  try {
    const saved = localStorage.getItem(PREFERRED_APP_KEY);
    if (saved && ['google_maps', 'waze', 'apple_maps', 'default_geo'].includes(saved)) {
      return saved as NavigationApp;
    }
  } catch {
    // localStorage unavailable
  }
  return null;
}

/**
 * Stores or clears the preferred navigation app.
 */
export function setPreferredNavigationApp(app: NavigationApp | null): void {
  try {
    if (app) {
      localStorage.setItem(PREFERRED_APP_KEY, app);
    } else {
      localStorage.removeItem(PREFERRED_APP_KEY);
    }
  } catch {
    // localStorage unavailable
  }
}

/**
 * Generates the specific launch URL with coordinates and address pre-filled.
 */
export function getNavigationUrl(app: NavigationApp, target: NavigationTarget): string {
  const { lat, lng, address, label } = target;
  const hasCoords = !isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0);

  switch (app) {
    case 'google_maps': {
      // Official Google Maps Universal Link format
      // https://www.google.com/maps/dir/?api=1&destination=LAT,LNG&travelmode=driving
      if (hasCoords) {
        return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
      }
      return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address || label || '')}&travelmode=driving`;
    }

    case 'waze': {
      // Official Waze deep link / web link
      // https://waze.com/ul?ll=LAT,LNG&navigate=yes
      if (hasCoords) {
        return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
      }
      return `https://waze.com/ul?q=${encodeURIComponent(address || label || '')}&navigate=yes`;
    }

    case 'apple_maps': {
      if (hasCoords) {
        return `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`;
      }
      return `https://maps.apple.com/?daddr=${encodeURIComponent(address || label || '')}&dirflg=d`;
    }

    case 'default_geo':
    default: {
      // Standard Geo URI recognized by Android and mobile OS intent handlers
      if (hasCoords) {
        const queryLabel = encodeURIComponent(label || address || 'Destination');
        return `geo:${lat},${lng}?q=${lat},${lng}(${queryLabel})`;
      }
      return `geo:0,0?q=${encodeURIComponent(address || label || 'Destination')}`;
    }
  }
}

/**
 * Launches the selected navigation app with destination coordinates pre-filled.
 */
export function launchNavigation(app: NavigationApp, target: NavigationTarget): void {
  const url = getNavigationUrl(app, target);
  window.open(url, '_blank', 'noopener,noreferrer');
}
