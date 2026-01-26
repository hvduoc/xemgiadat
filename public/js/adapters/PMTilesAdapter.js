/**
 * PMTiles Adapter for Leaflet.VectorGrid
 * Tích hợp PMTiles vào code Leaflet hiện tại KHÔNG PHÁ VỠ
 * API tương thích 100% với L.vectorGrid.protobuf()
 * 
 * VERSION: 3.0.0 - Proper VectorGrid extension with _getVectorTilePromise override
 * 
 * FIX: Previous versions tried to use custom fetch option which VectorGrid ignores.
 * This version properly extends L.VectorGrid and overrides _getVectorTilePromise
 * to load tiles directly from PMTiles archive.
 */

console.log('🔄 Loading PMTilesAdapter.js v3.0.0...');

(function() {
    'use strict';

    // Configuration constants
    const CONFIG = {
        pmtilesUrl: '/tiles/danang_parcels_final.pmtiles',
        mapboxTilesetId: 'hvduoc.danang_parcels_final',
        mapboxAccessToken: 'pk.eyJ1IjoiaHZkdW9jIiwiYSI6ImNtZDFwcjVxYTAzOGUybHEzc3ZrNTJmcnIifQ.D5VlPC8c_n1i3kezgqtzwg',
        maxRetries: 50, // Max 5 seconds wait for pmtiles
        retryInterval: 100 // Check every 100ms
    };

    let initRetryCount = 0;

    /**
     * Initialize adapter when dependencies are ready
     */
    function init() {
        // Check if Leaflet VectorGrid is loaded
        if (typeof L === 'undefined' || !L.vectorGrid || !L.VectorGrid) {
            console.warn('⚠️ Leaflet VectorGrid not loaded yet. Retrying in 100ms...');
            setTimeout(init, 100);
            return;
        }

        // Check for required dependencies: Pbf and VectorTile (from VectorGrid bundled)
        if (typeof Pbf === 'undefined' || typeof VectorTile === 'undefined') {
            console.warn('⚠️ Pbf or VectorTile not loaded yet. Retrying in 100ms...');
            if (initRetryCount < CONFIG.maxRetries) {
                initRetryCount++;
                setTimeout(init, CONFIG.retryInterval);
                return;
            }
        }

        // Check if PMTiles library is available
        const pmtilesLib = typeof pmtiles !== 'undefined' ? pmtiles : null;
        const isPMTilesAvailable = pmtilesLib && pmtilesLib.PMTiles;

        console.log('🔍 PMTiles library check:', {
            pmtilesGlobal: typeof pmtiles,
            hasPMTilesClass: isPMTilesAvailable,
            hasPbf: typeof Pbf !== 'undefined',
            hasVectorTile: typeof VectorTile !== 'undefined',
            retryCount: initRetryCount
        });

        // If PMTiles not ready yet, retry a few times (CDN might be slow)
        if (!isPMTilesAvailable && initRetryCount < CONFIG.maxRetries) {
            initRetryCount++;
            setTimeout(init, CONFIG.retryInterval);
            return;
        }

        // Always set isPMTilesSupported function
        L.vectorGrid.isPMTilesSupported = function() {
            return isPMTilesAvailable;
        };

        // Only create PMTiles layer class if library is available
        if (isPMTilesAvailable) {
            setupPMTilesVectorGrid(pmtilesLib);
            console.log('✅ PMTiles support enabled');
        } else {
            console.warn('⚠️ PMTiles library not found after ' + initRetryCount + ' retries. Only Mapbox fallback available.');
        }

        // Always setup VectorTileConfig (with or without PMTiles)
        setupVectorTileConfig();

        console.log('✅ PMTilesAdapter initialization complete');
    }

    /**
     * Setup L.VectorGrid.PMTiles - PROPER extension of VectorGrid
     * This is the correct approach: override _getVectorTilePromise
     */
    function setupPMTilesVectorGrid(pmtilesLib) {
        /**
         * L.VectorGrid.PMTiles - Load vector tiles from PMTiles archive
         * Extends L.VectorGrid and implements _getVectorTilePromise
         */
        L.VectorGrid.PMTiles = L.VectorGrid.extend({
            options: {
                // PMTiles-specific options
                pmtilesUrl: null,
                // Inherited from VectorGrid
                rendererFactory: L.svg.tile,
                vectorTileLayerStyles: {},
                interactive: false,
                getFeatureId: undefined
            },

            /**
             * Initialize PMTiles layer
             * @param {string} pmtilesUrl - URL to .pmtiles file
             * @param {object} options - Layer options
             */
            initialize: function(pmtilesUrl, options) {
                // Store PMTiles URL
                this._pmtilesUrl = pmtilesUrl;
                
                // Create PMTiles source
                this._pmtilesSource = new pmtilesLib.PMTiles(pmtilesUrl);
                
                // Call parent initialize
                L.VectorGrid.prototype.initialize.call(this, options);
                
                console.log('🗺️ L.VectorGrid.PMTiles initialized:', pmtilesUrl);
            },

            /**
             * Override _getVectorTilePromise to load from PMTiles
             * This is the KEY method that VectorGrid calls to get tile data
             * 
             * @param {object} coords - {x, y, z} tile coordinates
             * @returns {Promise} Promise resolving to VectorTile object
             */
            _getVectorTilePromise: function(coords) {
                const self = this;
                const z = coords.z;
                const x = coords.x;
                const y = coords.y;

                return this._pmtilesSource.getZxy(z, x, y).then(function(result) {
                    if (!result || !result.data) {
                        // No tile data at this location - return empty layers
                        console.debug(`📭 No tile at ${z}/${x}/${y}`);
                        return { layers: [] };
                    }

                    // Parse the protobuf data using Pbf and VectorTile
                    try {
                        const pbf = new Pbf(result.data);
                        const vectorTile = new VectorTile(pbf);

                        // Normalize feature getters into actual instanced features
                        // (Same as VectorGrid.Protobuf does)
                        for (const layerName in vectorTile.layers) {
                            const layer = vectorTile.layers[layerName];
                            const feats = [];
                            
                            for (let i = 0; i < layer.length; i++) {
                                const feat = layer.feature(i);
                                feat.geometry = feat.loadGeometry();
                                feats.push(feat);
                            }
                            
                            layer.features = feats;
                        }

                        console.debug(`✅ Tile ${z}/${x}/${y} loaded: ${Object.keys(vectorTile.layers).length} layers`);
                        return vectorTile;
                    } catch (error) {
                        console.warn(`❌ Error parsing tile ${z}/${x}/${y}:`, error);
                        return { layers: [] };
                    }
                }).catch(function(error) {
                    console.warn(`❌ Error fetching tile ${z}/${x}/${y}:`, error);
                    return { layers: [] };
                });
            },

            /**
             * Cleanup on remove
             */
            onRemove: function(map) {
                this._pmtilesSource = null;
                return L.VectorGrid.prototype.onRemove.call(this, map);
            }
        });

        /**
         * Factory method - drop-in replacement for L.vectorGrid.protobuf()
         */
        L.vectorGrid.pmtiles = function(pmtilesUrl, options) {
            return new L.VectorGrid.PMTiles(pmtilesUrl, options);
        };

        /**
         * Preload PMTiles metadata - useful for getting bounds/zoom info
         */
        L.vectorGrid.preloadPMTiles = async function(pmtilesUrl) {
            try {
                const source = new pmtilesLib.PMTiles(pmtilesUrl);
                const header = await source.getHeader();
                
                console.log('📊 PMTiles metadata:', {
                    minZoom: header.minZoom,
                    maxZoom: header.maxZoom,
                    bounds: [header.minLon, header.minLat, header.maxLon, header.maxLat],
                    tileType: header.tileType
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

        console.log('✅ L.VectorGrid.PMTiles class created');
        console.log('✅ L.vectorGrid.pmtiles() factory method ready');
    }

    /**
     * Setup VectorTileConfig - ALWAYS runs regardless of PMTiles availability
     */
    function setupVectorTileConfig() {
        window.VectorTileConfig = {
            // Configuration
            useOpenSource: true, // P0 FIX: Default to PMTiles (Mapbox tileset deleted)
            pmtilesUrl: CONFIG.pmtilesUrl,
            mapboxTilesetId: CONFIG.mapboxTilesetId,
            mapboxAccessToken: CONFIG.mapboxAccessToken,
            
            /**
             * Create vector layer - auto-select source based on availability
             * CRITICAL: Check pmtiles at call time, not at config time
             */
            createVectorLayer: function(options) {
                // Check PMTiles availability at CALL TIME (not at config time)
                const hasPMTilesLib = typeof pmtiles !== 'undefined' && pmtiles.PMTiles;
                const hasPMTilesMethod = L.vectorGrid && typeof L.vectorGrid.pmtiles === 'function';
                const isPMTilesSupported = L.vectorGrid && 
                    L.vectorGrid.isPMTilesSupported && 
                    L.vectorGrid.isPMTilesSupported();
                
                const canUsePMTiles = this.useOpenSource && hasPMTilesMethod;

                // Debug logging
                console.log('🔍 VectorTileConfig.createVectorLayer check:', {
                    useOpenSource: this.useOpenSource,
                    hasPMTilesLib: hasPMTilesLib,
                    hasPMTilesMethod: hasPMTilesMethod,
                    isPMTilesSupported: isPMTilesSupported,
                    canUsePMTiles: canUsePMTiles,
                    pmtilesUrl: this.pmtilesUrl
                });

                if (canUsePMTiles) {
                    console.log('🌍 Using Open Source PMTiles:', this.pmtilesUrl);
                    return L.vectorGrid.pmtiles(this.pmtilesUrl, options);
                } else {
                    // FALLBACK WARNING - this shouldn't happen in production
                    console.warn('📦 FALLBACK: Using Mapbox Vector Tiles - PMTiles not available!');
                    console.warn('📦 This will likely fail since Mapbox tileset was deleted');
                    const url = `https://api.mapbox.com/v4/${this.mapboxTilesetId}/{z}/{x}/{y}.mvt?access_token=${this.mapboxAccessToken}`;
                    return L.vectorGrid.protobuf(url, options);
                }
            },
            
            /**
             * Switch to open source mode
             */
            switchToOpenSource: function(pmtilesUrl) {
                this.useOpenSource = true;
                if (pmtilesUrl) this.pmtilesUrl = pmtilesUrl;
                console.log('✅ Switched to Open Source mode');
                console.log('🔄 Reload page to apply changes');
            },
            
            /**
             * Switch to Mapbox mode
             */
            switchToMapbox: function() {
                this.useOpenSource = false;
                console.log('✅ Switched to Mapbox mode');
                console.log('🔄 Reload page to apply changes');
            },
            
            /**
             * Get current configuration status
             */
            getConfig: function() {
                const isPMTilesSupported = L.vectorGrid && 
                    L.vectorGrid.isPMTilesSupported && 
                    L.vectorGrid.isPMTilesSupported();
                    
                return {
                    mode: this.useOpenSource ? 'Open Source (PMTiles)' : 'Mapbox',
                    pmtilesUrl: this.pmtilesUrl,
                    pmtilesSupported: isPMTilesSupported,
                    willUsePMTiles: this.useOpenSource && isPMTilesSupported
                };
            }
        };

        console.log('🎯 VectorTileConfig ready:', window.VectorTileConfig.getConfig());
    }

    // Start initialization when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // DOM already loaded, init immediately
        init();
    }
})();
