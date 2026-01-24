import 'maplibre-gl/dist/maplibre-gl.css';
import './styles/index.css';
import { MapService } from './services/MapService';
import { ParcelPanel } from './components/ParcelPanel';
import { SearchBar } from './components/SearchBar';
import { WardFilter } from './components/WardFilter';
import type { ParcelFeature, SelectedParcel } from './types';

/**
 * Core App v2 - MapLibre + PMTiles
 * New map core running at /v2
 * Features: Map view, parcel click, ward filter
 */
class CoreApp {
  private mapService: MapService;
  private parcelPanel: ParcelPanel;
  private searchBar: SearchBar;
  private wardFilter: WardFilter;
  private selectedParcel: SelectedParcel | null = null;
  private currentFilter: string | null = null;

  constructor() {
    this.mapService = new MapService();
    this.parcelPanel = new ParcelPanel();
    this.searchBar = new SearchBar((query) => this.handleSearch(query));
    this.wardFilter = new WardFilter((maXa) => this.handleWardFilter(maXa));
  }

  /**
   * Initialize the app
   */
  public async init() {
    console.log('[CoreApp v2] Initializing...');

    // Get map container
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
      console.error('[CoreApp v2] Map container not found!');
      return;
    }

    // Initialize map
    const map = await this.mapService.initMap(mapContainer);
    console.log('[CoreApp v2] Map initialized with PMTiles protocol');

    // Setup click handler
    map.on('click', 'parcels-fill', (e) => this.handleParcelClick(e));

    // Log version
    console.log('[CoreApp v2] Version 2.0.0 - MapLibre + PMTiles');
    console.log('[CoreApp v2] Core ready at /v2');

    // Check for debug mode
    if (this.getQueryParam('debug') === '1') {
      console.log('[CoreApp v2] Debug mode enabled');
      this.logDebugInfo();
      // Try to import version info from src/version.js if available
      try {
        const mod = await import('../src/version.js');
        if (mod && mod.BUILD_VERSION) {
          console.log('[CoreApp v2] Build Version:', mod.BUILD_VERSION.getFullVersion());
          console.log('[CoreApp v2] Build Time:', mod.BUILD_VERSION.getTimestamp());
        }
      } catch (e) {
        console.warn('[CoreApp v2] Version module not found or failed to load:', e);
      }
    }
  }

  /**
   * Handle parcel click - show details panel
   */
  private handleParcelClick(e: maplibregl.MapMouseEvent) {
    const features = this.mapService.queryFeatures(e.lngLat);
    if (!features.length) return;

    const feature = features[0];
    if (!feature.id || !feature.properties) return;

    // Deselect previous
    if (this.selectedParcel) {
      this.mapService.setFeatureSelected(
        this.selectedParcel.feature.id,
        false
      );
    }

    // Select new
    this.selectedParcel = {
      feature: feature as any,
      lngLat: [e.lngLat.lng, e.lngLat.lat],
    };

    this.mapService.setFeatureSelected(feature.id as number, true);
    this.mapService.flyToFeature(
      feature.geometry.coordinates[0] as number[][]
    );
    this.parcelPanel.show(feature.properties);

    console.log('[CoreApp v2] Parcel selected:', feature.properties.OBJECTID);
  }

  /**
   * Handle search query (placeholder for future implementation)
   */
  private handleSearch(query: string) {
    console.log('[CoreApp v2] Search query:', query);
    // TODO: Implement search by OBJECTID, MaXa+SoThuTuThua, or DiaChi
  }

  /**
   * Handle ward filter change
   */
  private handleWardFilter(maXa: string | null) {
    this.currentFilter = maXa;
    this.mapService.filterByMaXa(maXa);
    this.parcelPanel.hide();
    console.log('[CoreApp v2] Ward filter applied:', maXa || 'all');
  }

  /**
   * Get query parameter from URL
   */
  private getQueryParam(key: string): string | null {
    const params = new URLSearchParams(window.location.search);
    return params.get(key);
  }

  /**
   * Log debug info to console
   */
  private logDebugInfo() {
    const buildInfo = {
      version: '2.0.0',
      core: 'MapLibre + PMTiles',
      entry: '/v2.html',
      timestamp: new Date().toISOString(),
      features: ['map-view', 'parcel-click', 'ward-filter'],
    };
    console.table(buildInfo);
  }
}

// Initialize when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const app = new CoreApp();
    app.init();
  });
} else {
  const app = new CoreApp();
  app.init();
}
