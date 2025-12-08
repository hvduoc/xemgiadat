/**
 * PMTiles Adapter for Leaflet.VectorGrid
 * Tích hợp PMTiles vào code Leaflet hiện tại KHÔNG PHÁ VỠ
 * API tương thích 100% với L.vectorGrid.protobuf()
 */

console.log('🔄 Loading PMTilesAdapter.js...');

(function() {
    'use strict';

    // Wait for dependencies
    function init() {
        // Check if Leaflet is loaded
        if (typeof L === 'undefined' || !L.vectorGrid) {
            console.warn('⚠️ Leaflet not loaded yet. Retrying...');
            setTimeout(init, 100);
            return;
        }

        // Check if PMTiles library is loaded
        if (typeof pmtiles === 'undefined') {
            console.warn('⚠️ PMTiles library not loaded. Using Mapbox fallback.');
            // Create dummy functions to prevent errors
            if (typeof L !== 'undefined' && L.vectorGrid) {
                L.vectorGrid.isPMTilesSupported = () => false;
            }
            return;
        }

        console.log('✅ PMTiles library loaded:', typeof pmtiles);

    /**
     * Create Leaflet VectorGrid layer from PMTiles
     * Drop-in replacement cho L.vectorGrid.protobuf()
     */
    L.vectorGrid.pmtiles = function(pmtilesUrl, options) {
        // Validate URL
        if (!pmtilesUrl || !pmtilesUrl.endsWith('.pmtiles')) {
            console.warn('⚠️ Invalid PMTiles URL, falling back to protobuf');
            return L.vectorGrid.protobuf(pmtilesUrl, options);
        }

        console.log('🗺️ Loading PMTiles:', pmtilesUrl);

        // Create PMTiles source
        const pmtilesSource = new pmtiles.PMTiles(pmtilesUrl);
        
        // Create custom tile loader
        async function loadTile(coords, callback) {
            const { z, x, y } = coords;
            
            try {
                const tile = await pmtilesSource.getZxy(z, x, y);
                
                if (!tile || !tile.data) {
                    callback(null, null);
                    return;
                }

                // Convert ArrayBuffer to Blob URL for Leaflet
                const blob = new Blob([tile.data], { 
                    type: 'application/vnd.mapbox-vector-tile' 
                });
                const blobUrl = URL.createObjectURL(blob);
                
                // Load via fetch to get ArrayBuffer
                const response = await fetch(blobUrl);
                const arrayBuffer = await response.arrayBuffer();
                
                callback(null, arrayBuffer);
                
                // Cleanup
                URL.revokeObjectURL(blobUrl);
            } catch (error) {
                console.warn(`Tile ${z}/${x}/${y} error:`, error.message);
                callback(error, null);
            }
        }

        // Patch options to use custom tile loader
        const customOptions = {
            ...options,
            _pmtilesSource: pmtilesSource,
            _pmtilesUrl: pmtilesUrl,
            // Create fake URL template for Leaflet
            url: pmtilesUrl.replace('.pmtiles', '/{z}/{x}/{y}.mvt')
        };

        // Create VectorGrid with custom fetcher
        const originalFetch = options.fetch || window.fetch;
        customOptions.fetch = async function(url, fetchOptions) {
            // Check if this is a tile request
            const tileMatch = url.match(/\/(\d+)\/(\d+)\/(\d+)\.mvt/);
            if (tileMatch) {
                const [, z, x, y] = tileMatch;
                
                return new Promise((resolve, reject) => {
                    loadTile({ z: +z, x: +x, y: +y }, (error, data) => {
                        if (error) {
                            reject(error);
                        } else {
                            // Create fake Response object
                            resolve(new Response(data, {
                                status: 200,
                                headers: { 'Content-Type': 'application/vnd.mapbox-vector-tile' }
                            }));
                        }
                    });
                });
            }
            
            // Fallback to original fetch
            return originalFetch(url, fetchOptions);
        };

        const layer = L.vectorGrid.protobuf(customOptions.url, customOptions);

        // Store PMTiles source for cleanup
        layer._pmtilesSource = pmtilesSource;

        // Override remove to cleanup
        const originalRemove = layer.remove;
        layer.remove = function() {
            if (this._pmtilesSource) {
                this._pmtilesSource = null;
            }
            return originalRemove.call(this);
        };

        console.log('✅ PMTiles layer created successfully');
        return layer;
    };

    /**
     * Check if PMTiles is supported
     */
    L.vectorGrid.isPMTilesSupported = function() {
        return typeof pmtiles !== 'undefined';
    };

    /**
     * Preload PMTiles metadata
     */
    L.vectorGrid.preloadPMTiles = async function(pmtilesUrl) {
        try {
            const source = new pmtiles.PMTiles(pmtilesUrl);
            const header = await source.getHeader();
            
            console.log('📊 PMTiles metadata:', {
                minZoom: header.minZoom,
                maxZoom: header.maxZoom,
                bounds: [header.minLon, header.minLat, header.maxLon, header.maxLat]
            });

            return {
                bounds: [[header.minLat, header.minLon], [header.maxLat, header.maxLon]],
                minZoom: header.minZoom,
                maxZoom: header.maxZoom,
                center: [header.centerLat, header.centerLon]
            };
        } catch (error) {
            console.error('❌ Failed to load PMTiles metadata:', error);
            return null;
        }
    };

    console.log('✅ PMTiles Adapter loaded');

    /**
     * VectorTileConfig - Smart switching giữa Mapbox và PMTiles
     */
    window.VectorTileConfig = {
        // Configuration
        useOpenSource: false, // Set to true để dùng PMTiles
        pmtilesUrl: '/tiles/danang_parcels.pmtiles',
        mapboxTilesetId: 'hvduoc.danang_parcels_final',
        mapboxAccessToken: 'pk.eyJ1IjoiaHZkdW9jIiwiYSI6ImNtZDFwcjVxYTAzOGUybHEzc3ZrNTJmcnIifQ.D5VlPC8c_n1i3kezgqtzwg',
        
        /**
         * Create vector layer - tự động chọn source
         */
        createVectorLayer: function(options) {
            if (this.useOpenSource && L.vectorGrid && L.vectorGrid.isPMTilesSupported && L.vectorGrid.isPMTilesSupported()) {
                console.log('🌍 Using Open Source PMTiles');
                return L.vectorGrid.pmtiles(this.pmtilesUrl, options);
            } else {
                console.log('📦 Using Mapbox Vector Tiles');
                const url = `https://api.mapbox.com/v4/${this.mapboxTilesetId}/{z}/{x}/{y}.mvt?access_token=${this.mapboxAccessToken}`;
                return L.vectorGrid.protobuf(url, options);
            }
        },
        
        /**
         * Switch to open source
         */
        switchToOpenSource: function(pmtilesUrl) {
            this.useOpenSource = true;
            if (pmtilesUrl) this.pmtilesUrl = pmtilesUrl;
            console.log('✅ Switched to Open Source mode');
            console.log('🔄 Reload page to apply changes');
        },
        
        /**
         * Switch to Mapbox
         */
        switchToMapbox: function() {
            this.useOpenSource = false;
            console.log('✅ Switched to Mapbox mode');
            console.log('🔄 Reload page to apply changes');
        },
        
        /**
         * Get current configuration
         */
        getConfig: function() {
            return {
                mode: this.useOpenSource ? 'Open Source (PMTiles)' : 'Mapbox',
                pmtilesUrl: this.pmtilesUrl,
                pmtilesSupported: typeof L !== 'undefined' && L.vectorGrid && L.vectorGrid.isPMTilesSupported ? L.vectorGrid.isPMTilesSupported() : false
            };
        }
    };

    console.log('🎯 VectorTileConfig ready:', VectorTileConfig.getConfig());
    }

    // Start initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
