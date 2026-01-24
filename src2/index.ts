import "./styles/core";  // Core CSS entry - ensures dedicated chunk
import { MapService } from "./services/MapService";
import { ParcelPanel } from "./components/ParcelPanel";
import { SearchBar } from "./components/SearchBar";
import { WardFilter } from "./components/WardFilter";
import { RuntimeBanner } from "./components/RuntimeBanner";
import type { ParcelFeature, SelectedParcel } from "./types";
import type { ListingForm } from "./components/ListingForm";
import type { ListingService } from "./services/ListingService";

/**
 * Core App v2 - MapLibre + PMTiles + Listing MVP
 */
class CoreApp {
  private mapService: MapService;
  private parcelPanel: ParcelPanel;
  private searchBar: SearchBar;
  private wardFilter: WardFilter;
  private listingForm: ListingForm | null = null;
  private listingService: ListingService | null = null;
  private selectedParcel: SelectedParcel | null = null;
  private currentFilter: string | null = null;

  constructor() {
    this.mapService = new MapService();
    this.parcelPanel = new ParcelPanel();
    this.searchBar = new SearchBar((query) => this.handleSearch(query));
    this.wardFilter = new WardFilter((maXa) => this.handleWardFilter(maXa));
    this.parcelPanel.setCreateListingHandler(() => this.openListingForm());
    
    // Runtime banner: show mode + path
    new RuntimeBanner('V2', window.location.pathname);
  }

  /**
   * Initialize the app
   */
  public async init() {
    console.log('%c[V2 APP BOOTED]', 'background: #51cf66; color: white; padding: 4px 8px; font-weight: bold;');
    console.log('[V2] File: src2/index.ts (TypeScript)');
    console.log('[V2] Stack: MapLibre + PMTiles + Vite');
    console.log('[V2] Entry: v2.html at /v2.html (dev) or /v2-dist/v2.html (prod)');
    console.log('[V2] Modern: TypeScript + lazy-load architecture');
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
    map.on("click", "parcels-fill", (e: any) => this.handleParcelClick(e));

    // Log version
    console.log('[CoreApp v2] Version 2.0.0 - MapLibre + PMTiles + Listing');
    console.log('[CoreApp v2] Core ready at /v2-dist/v2.html');

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
   * Handle parcel click
   */
  private handleParcelClick(e: maplibregl.MapMouseEvent) {
    const features = this.mapService.queryFeatures(e.lngLat);
    if (!features.length) return;

    const feature = features[0];
    if (!feature.id || !feature.properties) return;
    if (this.selectedParcel) {
      this.mapService.setFeatureSelected(this.selectedParcel.feature.id, false);
    }

    const ring = feature.geometry.coordinates[0] as number[][];
    this.selectedParcel = {
      feature: feature as any,
      lngLat: [e.lngLat.lng, e.lngLat.lat],
      centroid: this.getPolygonCentroid(ring),
    };

    this.mapService.setFeatureSelected(feature.id as number, true);
    this.mapService.flyToFeature(ring);
    this.parcelPanel.show(feature.properties);

    console.log('[CoreApp v2] Parcel selected:', feature.properties.OBJECTID);
  }

  private async openListingForm() {
    if (!this.selectedParcel) return;
    
    // Lazy-load ListingService + ListingForm on first use
    if (!this.listingService || !this.listingForm) {
      console.log('[CoreApp v2] Lazy-loading ListingService + ListingForm...');
      
      // Show loading indicator
      const loadingToast = this.showLoadingToast('Đang tải tính năng Đăng tin...');
      
      try {
        performance.mark('listing-load-start');
        const [{ ListingService }, { ListingForm }] = await Promise.all([
          import('./services/ListingService'),
          import('./components/ListingForm')
        ]);
        performance.mark('listing-load-end');
        performance.measure('listing-load', 'listing-load-start', 'listing-load-end');
        
        this.listingService = new ListingService();
        this.listingForm = new ListingForm(this.listingService);
        console.log('[CoreApp v2] ListingService + ListingForm ready');
        
        this.hideLoadingToast(loadingToast);
      } catch (err) {
        console.error('[CoreApp v2] Failed to load listing modules:', err);
        this.hideLoadingToast(loadingToast);
        alert('⚠️ Không thể tải tính năng Đăng tin.\n\nVui lòng kiểm tra kết nối và thử lại.');
        return;
      }
    }
    
    performance.mark('modal-open-start');
    this.listingForm.open(this.selectedParcel.feature as ParcelFeature, this.selectedParcel.centroid);
    performance.mark('modal-open-end');
    performance.measure('modal-open', 'modal-open-start', 'modal-open-end');
  }

  /** Handle search (placeholder) */
  private handleSearch(query: string) {
    console.log('[CoreApp v2] Search query:', query);
  }

  /** Handle ward filter change */
  private handleWardFilter(maXa: string | null) {
    this.currentFilter = maXa;
    this.mapService.filterByMaXa(maXa);
    this.parcelPanel.hide();
    console.log('[CoreApp v2] Ward filter applied:', maXa || 'none');
  }

  /** Get query parameter */
  private getQueryParam(key: string): string | null {
    const params = new URLSearchParams(window.location.search);
    return params.get(key);
  }

  /** Log debug info */
  private logDebugInfo() {
    const buildInfo = {
      version: '2.0.0',
      core: 'MapLibre + PMTiles',
      entry: '/v2-dist/v2.html',
      timestamp: new Date().toISOString(),
      features: ['map-view', 'parcel-click', 'ward-filter', 'listing-create'],
    };
    console.table(buildInfo);
  }

  /** Show loading toast */
  private showLoadingToast(message: string): HTMLElement {
    const toast = document.createElement('div');
    toast.className = 'fixed top-20 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium shadow-lg flex items-center gap-2';
    toast.innerHTML = `
      <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span>${message}</span>
    `;
    document.body.appendChild(toast);
    return toast;
  }

  private hideLoadingToast(toast: HTMLElement) {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }

  /** Compute centroid of polygon ring */
  private getPolygonCentroid(ring: number[][]): [number, number] {
    if (!ring || !ring.length) return [0, 0];

    let area = 0;
    let cx = 0;
    let cy = 0;
    for (let i = 0, len = ring.length; i < len - 1; i++) {
      const [x1, y1] = ring[i];
      const [x2, y2] = ring[i + 1];
      const cross = x1 * y2 - x2 * y1;
      area += cross;
      cx += (x1 + x2) * cross;
      cy += (y1 + y2) * cross;
    }

    if (area === 0) {
      const avg = ring.reduce(
        (acc, coord) => [acc[0] + coord[0], acc[1] + coord[1]],
        [0, 0]
      );
      return [avg[0] / ring.length, avg[1] / ring.length];
    }

    area *= 0.5;
    return [cx / (6 * area), cy / (6 * area)];
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const app = new CoreApp();
    app.init();
  });
} else {
  const app = new CoreApp();
  app.init();
}
