import { DEFAULT_STYLE_URL, FALLBACK_RASTER_STYLE, isRasterFallbackAllowed } from '../config/mapStyles';

/**
 * MapLibre service - initialization & configuration
 * Lazy-loads maplibre-gl and pmtiles on demand
 */
export class MapService {
  private map: any = null;
  private debug: boolean = false;
  private workingSourceLayer: string = 'default';  // Track which source-layer works
  private fallbackActive: boolean = false;
  private styleLoaded: boolean = false;
  private userInteracted: boolean = false;
  private basemapBadge: HTMLElement | null = null;

  constructor() {
    // Enable debug if ?debug=1 in URL
    this.debug = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1';
  }

  private log(...args: any[]) {
    if (this.debug) {
      console.log('[MapService DEBUG]', ...args);
    }
  }

  private error(...args: any[]) {
    if (this.debug) {
      console.error('[MapService DEBUG]', ...args);
    }
  }

  /**
   * Initialize map with PMTiles protocol (lazy-loaded)
   */
  public async initMap(container: HTMLElement): Promise<any> {
    performance.mark('map-init-start');
    this.log('Starting map initialization...');
    
    // Lazy-load maplibre-gl and pmtiles
    performance.mark('map-libs-load-start');
    const maplibregl = await import('maplibre-gl');
    const { Protocol } = await import('pmtiles');
    performance.mark('map-libs-load-end');
    performance.measure('map-libs-load', 'map-libs-load-start', 'map-libs-load-end');
    
    this.log('MapLibre GL and PMTiles imported');

    // Dynamically import MapLibre CSS if not already loaded
    if (!document.querySelector('link[href*="maplibre-gl"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.css';
      document.head.appendChild(link);
      this.log('MapLibre CSS loaded');
    }

    // Register PMTiles protocol
    const protocol = new Protocol();
    maplibregl.default.addProtocol('pmtiles', protocol.tile);
    this.log('PMTiles protocol registered');

    // Initialize map
    const baseStyleUrl = this.getBaseStyleUrl();
    this.log('Using base style URL:', baseStyleUrl);
    this.map = new maplibregl.default.Map({
      container,
      style: baseStyleUrl,
      center: [108.202167, 16.054456],
      zoom: 13,
      maxZoom: 20,
      minZoom: 10,
      hash: true,
    });

    this.log('Map instance created, waiting for style.load...');

    // Add error handlers
    this.map.on('error', (e: any) => {
      this.error('Map error:', e);
    });

    // Track user interaction (disable fallback after interaction to avoid flicker)
    const trackInteraction = () => {
      if (this.userInteracted) return;
      this.userInteracted = true;
      this.log('User interacted once; disabling auto-fallback');
      this.map.off('move', trackInteraction);
      this.map.off('zoom', trackInteraction);
      this.map.off('click', trackInteraction);
    };
    this.map.on('move', trackInteraction);
    this.map.on('zoom', trackInteraction);
    this.map.on('click', trackInteraction);

    // Health-check logs (debug mode): styledata + sprite/glyphs
    if (this.debug) {
      this.map.on('styledata', (e: any) => {
        this.log('Map styledata event:', e?.dataType || 'unknown');
        try {
          const s = this.map.getStyle();
          if (s) {
            this.log('Style sprite:', (s as any).sprite || 'none');
            this.log('Style glyphs:', (s as any).glyphs || 'none');
          }
        } catch (_) {}
      });
    }

    this.map.on('sourcedata', (e: any) => {
      if (e.sourceId === 'parcels-source') {
        this.log('Parcels source data event:', {
          isSourceLoaded: e.isSourceLoaded,
          sourceDataType: e.sourceDataType,
        });
      }
    });

    // Error-based fallback (only if allowed + no interaction yet + style not loaded)
    this.map.on('error', (e: any) => {
      // Absolute guard: never fallback after user interaction or if already active
      if (this.fallbackActive || this.userInteracted) {
        this.error('Map error (fallback blocked - interaction/already active):', e);
        return;
      }
      
      // Check if fallback is allowed (DEV or flag)
      if (!isRasterFallbackAllowed(this.debug)) {
        this.error('Map error (fallback not allowed in PROD):', e);
        return;
      }
      
      const errorStr = String(e?.error?.message || e?.message || '');
      const isFatalStyleError = 
        errorStr.includes('style') ||
        errorStr.includes('sprite') ||
        errorStr.includes('glyph') ||
        e?.error?.status >= 400;
      
      if (isFatalStyleError && !this.styleLoaded) {
        this.error('Fatal style error detected, applying raster fallback:', errorStr);
        this.applyFallbackStyle(`Style error: ${errorStr}`);
      } else {
        this.error('Map error (non-fatal):', e);
      }
    });

    // Wait for map to load
    return new Promise((resolve) => {
      if (this.map!.isStyleLoaded()) {
        this.styleLoaded = true;
        this.showBasemapBadge(false);
        this.setupSources();
        resolve(this.map!);
      } else {
        this.map!.on('style.load', () => {
          performance.mark('map-style-loaded');
          performance.measure('map-style-load', 'map-init-start', 'map-style-loaded');
          this.log('Map style loaded');
          this.styleLoaded = true;
          this.showBasemapBadge(false);
          this.setupSources();
          performance.mark('map-init-end');
          performance.measure('map-init-total', 'map-init-start', 'map-init-end');
          resolve(this.map!);
        });
      }
    });
  }

  /**
   * Setup vector sources & layers
   */
  private setupSources() {
    if (!this.map) return;

    this.log('Setting up sources and layers...');

    // Idempotency check: if parcels already added, skip
    if (this.map.getSource('parcels-source')) {
      this.log('Parcels source already exists, skipping setup');
      return;
    }

    // PMTiles URL: absolute path from domain root (works in both dev base: '/' and prod base: '/v2-dist/')
    const pmtilesUrl = 'pmtiles://tiles/danang_parcels_final.pmtiles';
    this.log('PMTiles URL:', pmtilesUrl);
    
    // Debug: verify URL accessibility via HEAD request
    if (this.debug) {
      fetch(new Request('http://localhost:3000/tiles/danang_parcels_final.pmtiles', { method: 'HEAD' }))
        .then(r => this.log('HEAD /tiles/danang_parcels_final.pmtiles:', r.status))
        .catch(e => this.error('HEAD request failed:', e.message));
    }

    try {
      // Add PMTiles source
      this.map.addSource('parcels-source', {
        type: 'vector',
        url: pmtilesUrl,
      } as any);
      this.log('Parcels source added successfully');
    } catch (err) {
      this.error('Failed to add parcels source:', err);
    }

    try {
      // Add fill layer (skip if already exists)
      if (!this.map.getLayer('parcels-fill')) {
        this.map.addLayer(
          {
            id: 'parcels-fill',
            type: 'fill',
            source: 'parcels-source',
            'source-layer': 'default',  // Try 'default' as common PMTiles layer name
            paint: {
              'fill-color': '#6366f1',
              'fill-opacity': [
                'case',
                ['boolean', ['feature-state', 'selected'], false],
                0.8,
                0.5,
              ],
            },
          },
          'water'
        );
        this.workingSourceLayer = 'default';
        this.log('Parcels fill layer added with source-layer: default');
      } else {
        this.log('Parcels fill layer already exists, skipping');
        this.workingSourceLayer = 'default';
      }
    } catch (err) {
      this.error('Failed to add parcels fill layer with default:', err);
      // Try with 'parcels' source-layer as fallback
      try {
        this.map.addLayer(
          {
            id: 'parcels-fill',
            type: 'fill',
            source: 'parcels-source',
            'source-layer': 'parcels',
            paint: {
              'fill-color': '#6366f1',
              'fill-opacity': [
                'case',
                ['boolean', ['feature-state', 'selected'], false],
                0.8,
                0.5,
              ],
            },
          },
          'water'
        );
        this.workingSourceLayer = 'parcels';
        this.log('Parcels fill layer added with source-layer: parcels (fallback)');
      } catch (err2) {
        this.error('Failed to add parcels fill layer (both attempts):', err2);
      }
    }

    try {
      // Add outline layer - use same source-layer as fill (skip if exists)
      if (!this.map.getLayer('parcels-outline')) {
        this.map.addLayer({
          id: 'parcels-outline',
          type: 'line',
          source: 'parcels-source',
          'source-layer': this.workingSourceLayer,
          paint: {
            'line-color': '#4f46e5',
            'line-width': 1,
          },
        });
        this.log(`Parcels outline layer added with source-layer: ${this.workingSourceLayer}`);
      } else {
        this.log('Parcels outline layer already exists, skipping');
      }
    } catch (err) {
      this.error('Failed to add parcels outline layer:', err);
    }

    try {
      // Add highlight layer for selected features (skip if exists)
      if (!this.map.getLayer('parcels-highlight')) {
        this.map.addLayer({
          id: 'parcels-highlight',
          type: 'line',
          source: 'parcels-source',
          'source-layer': this.workingSourceLayer,
          filter: ['==', ['feature-state', 'selected'], true],
          paint: {
            'line-color': '#ff6b6b',
            'line-width': 3,
          },
        });
        this.log('Parcels highlight layer added');
      } else {
        this.log('Parcels highlight layer already exists, skipping');
      }
    } catch (err) {
      this.error('Failed to add parcels highlight layer:', err);
    }

    // Cursor change on hover
    this.map.on('mouseenter', 'parcels-fill', () => {
      this.map!.getCanvas().style.cursor = 'pointer';
    });
    this.map.on('mouseleave', 'parcels-fill', () => {
      this.map!.getCanvas().style.cursor = '';
    });

    // Fit initial view to Đà Nẵng extent (only once, before user interaction)
    this.fitInitialView();

    // Diagnostic info after setup
    this.logDiagnostics();
    performance.mark('parcels-setup-end');
    performance.measure('parcels-setup', 'parcels-setup-start', 'parcels-setup-end');
  }

  /**
   * Log diagnostics about map state
   */
  private logDiagnostics() {
    if (!this.debug || !this.map) return;

    this.log('=== MAP DIAGNOSTICS ===');
    try {
      const s = this.map.getStyle();
      if (s) {
        this.log('Active style:', (s as any).name || 'unnamed');
        this.log('Active sprite URL:', (s as any).sprite || 'none');
        this.log('Active glyphs URL:', (s as any).glyphs || 'none');
      }
    } catch (_) {}
    
    // Check if source exists
    const source = this.map.getSource('parcels-source');
    this.log('Parcels source exists:', !!source);

    // List all layers
    const style = this.map.getStyle();
    const allLayers = style.layers || [];
    const parcelLayers = allLayers.filter((l: any) => l.id.includes('parcels'));
    this.log('Parcel layers:', parcelLayers.map((l: any) => l.id));

    // Check current filter
    if (this.map.getFilter('parcels-fill')) {
      this.log('Parcels-fill filter:', this.map.getFilter('parcels-fill'));
    } else {
      this.log('Parcels-fill filter: none (showing all)');
    }

    // Test query
    setTimeout(() => {
      try {
        const features = this.map.queryRenderedFeatures({
          layers: ['parcels-fill'],
        });
        this.log('Rendered features in viewport:', features.length);
        
        // ONE-LINE SUMMARY for copy-paste verification
        const style = this.map.getStyle() as any;
        const styleName = style?.name || 'unknown';
        const srcExists = !!this.map.getSource('parcels-source') ? 'yes' : 'no';
        const fillLayer = this.map.getLayer('parcels-fill') ? 'yes' : 'no';
        const outlineLayer = this.map.getLayer('parcels-outline') ? 'yes' : 'no';
        const highlightLayer = this.map.getLayer('parcels-highlight') ? 'yes' : 'no';
        const parcelLayers = `${fillLayer}/${outlineLayer}/${highlightLayer}`;
        const rendered = features.length;
        const styleLoaded = this.map.isStyleLoaded() ? 'yes' : 'no';
        const tilesLoaded = typeof (this.map as any).areTilesLoaded === 'function' && (this.map as any).areTilesLoaded() ? 'yes' : 'no';
        
        console.log(
          `[VERIFY MAP] style=${styleName} styleLoaded=${styleLoaded} tilesLoaded=${tilesLoaded} source=${srcExists} layers=${parcelLayers} rendered=${rendered}`
        );
        
        if (features.length === 0) {
          this.error('WARNING: No parcels visible in viewport! Troubleshooting:');
          this.error('  1. Check if PMTiles file exists at /tiles/danang_parcels_final.pmtiles');
          this.error('  2. Check if source-layer name "parcels" matches PMTiles content');
          this.error('  3. Check if layer filter is blocking all features');
          this.error('  4. Check browser Network tab for 404 errors');
        }
      } catch (err) {
        this.error('Query error:', err);
      }
    }, 1000);

    this.log('=== END DIAGNOSTICS ===');
  }

  /** Resolve base style URL (DEV/PROD safe, supports overrides) */
  private getBaseStyleUrl(): string {
    try {
      const params = new URLSearchParams(window.location.search);
      const override = params.get('style') || (import.meta as any)?.env?.VITE_MAP_STYLE;
      if (override) return override;
    } catch (_) {}
    return DEFAULT_STYLE_URL;
  }

  /** Apply fallback raster style with reason logging */
  private applyFallbackStyle(reason: string) {
    if (this.fallbackActive) return;
    this.fallbackActive = true;
    this.log('Applying fallback raster style. Reason:', reason);
    try {
      this.map!.setStyle(FALLBACK_RASTER_STYLE);
      this.showBasemapBadge(true);
      // Re-add parcels after style swap
      this.map!.once('style.load', () => {
        this.styleLoaded = true;
        this.setupSources();
      });
    } catch (err) {
      this.error('Failed to apply fallback style:', err);
    }
  }

  /** Fit initial viewport to Đà Nẵng extent (only if user has not interacted) */
  private fitInitialView() {
    if (!this.map || this.userInteracted) return;
    const danangBounds: [[number, number], [number, number]] = [[108.05, 15.95], [108.32, 16.15]];
    try {
      this.map.fitBounds(danangBounds, { padding: 40, maxZoom: 16, animate: false });
      this.log('Fit to Đà Nẵng bounds');
    } catch (err) {
      this.error('fitBounds failed:', err);
    }
  }

  /** Show basemap badge (dev/debug only) */
  private showBasemapBadge(isFallback: boolean) {
    if (!this.debug && !(import.meta as any)?.env?.DEV) return;
    
    if (!this.basemapBadge) {
      this.basemapBadge = document.createElement('div');
      this.basemapBadge.className = 'fixed bottom-2 right-2 z-[9998] px-2 py-1 rounded text-xs font-mono bg-black/70 text-white pointer-events-none select-none';
      document.body.appendChild(this.basemapBadge);
    }
    
    this.basemapBadge.textContent = isFallback ? 'Basemap: Raster Fallback' : 'Basemap: DemoStyle';
    this.basemapBadge.style.display = 'block';
  }

  /**
   * Get map instance
   */
  public getMap(): any {
    return this.map;
  }

  /**
   * Query rendered features at point
   */
  public queryFeatures(point: any): any[] {
    if (!this.map) return [];
    return this.map.queryRenderedFeatures(point, {
      layers: ['parcels-fill'],
    });
  }

  /**
   * Set feature selection state
   */
  public setFeatureSelected(id: number, selected: boolean) {
    if (!this.map) return;
    this.map.setFeatureState(
      { source: 'parcels-source', 'source-layer': this.workingSourceLayer, id },
      { selected }
    );
  }

  /**
   * Fly to feature
   */
  public flyToFeature(coordinates: number[][]) {
    if (!this.map) return;

    const bounds = coordinates.reduce(
      (acc, coord) => {
        return [
          [Math.min(acc[0][0], coord[0]), Math.min(acc[0][1], coord[1])],
          [Math.max(acc[1][0], coord[0]), Math.max(acc[1][1], coord[1])],
        ];
      },
      [
        [180, 90],
        [-180, -90],
      ]
    );

    this.map.fitBounds(bounds as any, {
      padding: 50,
      duration: 1000,
    });
  }

  /**
   * Filter features by MaXa (ward code)
   */
  public filterByMaXa(maXa: string | null) {
    if (!this.map) return;

    this.log('Filtering by MaXa:', maXa || 'none (show all)');

    if (!maXa) {
      // Remove filter if null/empty
      this.map.setFilter('parcels-fill', null);
      this.map.setFilter('parcels-outline', null);
      this.map.setFilter('parcels-highlight', ['==', ['feature-state', 'selected'], true]);
      this.log('Filter cleared - showing all parcels');
    } else {
      // Filter by exact MaXa match
      const filter = ['==', ['get', 'MaXa'], maXa];
      this.map.setFilter('parcels-fill', filter);
      this.map.setFilter('parcels-outline', filter);
      this.map.setFilter('parcels-highlight', ['all', filter, ['==', ['feature-state', 'selected'], true]]);
      this.log('Filter set to:', filter);

      // Diagnostic: count features after filter
      if (this.debug) {
        setTimeout(() => {
          const filtered = this.map.queryRenderedFeatures({
            layers: ['parcels-fill'],
          });
          this.log(`Rendered features after filter (${maXa}):`, filtered.length);
        }, 500);
      }
    }

    console.log(`[MapService] Filter by MaXa: ${maXa || 'none'}`);
  }

  /**
   * Get all unique MaXa codes from source
   */
  public async getUniqueMaXaCodes(): Promise<string[]> {
    // Return hardcoded 56 ward codes (Đà Nẵng)
    // In future, query from PMTiles data
    return [
      '490001', '490002', '490003', '490004', '490005',
      '490101', '490102', '490103', '490104', '490105',
      '490106', '490107', '490108', '490109', '490110',
      '490111', '490112', '490201', '490202', '490203',
      '490204', '490205', '490206', '490207', '490208',
      '490209', '490210', '490211', '490212', '490213',
      '490214', '490215', '490216', '490301', '490302',
      '490303', '490304', '490305', '490306', '490307',
      '490308', '490309', '490310', '490311', '490312',
      '490313', '490314', '490315', '490316', '490317',
      '490318', '490319', '490320', '490321', '490401',
      '490402', '490403', '490404', '490405', '490406'
    ];
  }
}
