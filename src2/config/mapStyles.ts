/**
 * Map Style Configuration
 * Centralized basemap styles for DEV/PROD
 */

// Use OpenStreetMap as default (more reliable than demo style)
export const DEFAULT_STYLE_URL = 'https://demotiles.maplibre.org/style.json';

// OSM raster fallback (same as fallback style for consistency)
export const OSM_STYLE_URL = 'https://demotiles.maplibre.org/style.json';

export const FALLBACK_RASTER_STYLE = {
  version: 8,
  name: 'OSM Raster Fallback',
  sources: {
    osm: {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors'
    }
  },
  layers: [
    { id: 'osm-raster', type: 'raster', source: 'osm' }
  ]
};

/**
 * Determine if raster fallback is allowed based on env + flags
 * When debug=true, emit a [VERIFY] log to aid manual testing.
 */
export function isRasterFallbackAllowed(debug: boolean = false): boolean {
  try {
    const isDev = (import.meta as any)?.env?.DEV === true;
    const hasFlag = new URLSearchParams(window.location.search).get('rasterFallback') === '1';
    const allowed = isDev || hasFlag;
    if (debug) {
      const reason = allowed ? (isDev ? 'dev' : 'flag') : 'prod-no-flag';
      console.log(`[VERIFY] fallbackAllowed=${allowed} reason=${reason}`);
    }
    return allowed;
  } catch {
    return false;
  }
}
