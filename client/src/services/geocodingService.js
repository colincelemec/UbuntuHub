// ============================================
// Geocoding — from a postal address to GPS coordinates
// Uses Nominatim (OpenStreetMap): free, no API key required, and
// consistent with the Leaflet/OSM maps already used in the project.
//
// Nominatim usage rules respected here:
//  - at most ~1 request per second (the caller debounces)
//  - the search is restricted to Italy (countrycodes=it)
//  - a single request at a time (earlier ones are aborted)
// ============================================

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

// The in-flight request: aborted as soon as a new one starts
let currentController = null;

/**
 * Turns a postal address into coordinates.
 *
 * @param {string} address  Street and number (e.g. "Via Padova 36")
 * @param {string} cityName City name (e.g. "Milano")
 * @returns {Promise<{lat: number, lng: number, displayName: string} | null>}
 *          null when the address could not be found.
 * @throws  {Error} on a network problem (not when simply not found)
 */
export async function geocodeAddress(address, cityName) {
  const street = (address || '').trim();
  if (!street) return null;

  // Abort any previous search still running
  if (currentController) currentController.abort();
  currentController = new AbortController();
  const { signal } = currentController;

  const query = [street, cityName, 'Italia'].filter(Boolean).join(', ');

  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: '1',
    countrycodes: 'it',
    addressdetails: '0',
  });

  const res = await fetch(`${NOMINATIM_URL}?${params}`, {
    signal,
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) throw new Error(`Geocoding failed (${res.status})`);

  const results = await res.json();
  if (!Array.isArray(results) || results.length === 0) return null;

  const { lat, lon, display_name: displayName } = results[0];
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;

  return { lat: latitude, lng: longitude, displayName };
}

/** Aborts the running search (e.g. when the component unmounts) */
export function cancelGeocoding() {
  if (currentController) {
    currentController.abort();
    currentController = null;
  }
}

const geocodingService = { geocodeAddress, cancelGeocoding };
export default geocodingService;
