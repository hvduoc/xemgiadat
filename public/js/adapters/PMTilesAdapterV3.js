/**
 * PMTiles Adapter for Leaflet.VectorGrid
 * Tích hợp PMTiles vào code Leaflet hiện tại KHÔNG PHÁ VỠ
 * API tương thích 100% với L.vectorGrid.protobuf()
 * 
 * VERSION: 3.3.0 - Performance Optimized
 * BUILD: 2026-01-29T00:00:00Z
 * 
 * OPTIMIZATIONS:
 * - Removed excessive console.log (production mode)
 * - Added LRU tile cache
 * - Request deduplication
 * - Feature limit per tile
 */

console.log('🔄 Loading PMTilesAdapterV3.js v3.3.0 (performance optimized)...');

(function() {
    'use strict';

    // Production mode - disable verbose logging
    const DEBUG = false;
    const log = DEBUG ? console.log.bind(console) : () => {};

    // Configuration constants
    const CONFIG = {
        pmtilesUrl: '/tiles/danang_parcels_final.pmtiles',
        mapboxTilesetId: 'hvduoc.danang_parcels_final',
        mapboxAccessToken: 'pk.eyJ1IjoiaHZkdW9jIiwiYSI6ImNtZDFwcjVxYTAzOGUybHEzc3ZrNTJmcnIifQ.D5VlPC8c_n1i3kezgqtzwg',
        maxRetries: 50,
        retryInterval: 100,
        tileCacheSize: 150  // Max tiles to keep in memory
    };

    let initRetryCount = 0;

    // ============================================
    // LRU TILE CACHE - Keep parsed tiles in memory
    // ============================================
    class TileCache {
        constructor(maxSize = 150) {
            this.cache = new Map();
            this.maxSize = maxSize;
        }

        get(key) {
            if (!this.cache.has(key)) return null;
            const value = this.cache.get(key);
            this.cache.delete(key);
            this.cache.set(key, value);
            return value;
        }

        set(key, value) {
            if (this.cache.size >= this.maxSize) {
                const firstKey = this.cache.keys().next().value;
                this.cache.delete(firstKey);
            }
            this.cache.set(key, value);
        }

        has(key) { return this.cache.has(key); }
        clear() { this.cache.clear(); }
        get size() { return this.cache.size; }
    }

    const tileCache = new TileCache(CONFIG.tileCacheSize);

    /**
     * Initialize adapter when dependencies are ready
     */
    function init() {
        if (typeof L === 'undefined' || !L.vectorGrid || !L.VectorGrid) {
            setTimeout(init, 100);
            return;
        }

        if (typeof Pbf === 'undefined' || typeof VectorTile === 'undefined') {
            if (initRetryCount < CONFIG.maxRetries) {
                initRetryCount++;
                setTimeout(init, CONFIG.retryInterval);
                return;
            }
        }

        const pmtilesLib = typeof pmtiles !== 'undefined' ? pmtiles : null;
        const isPMTilesAvailable = pmtilesLib && pmtilesLib.PMTiles;

        log('🔍 PMTiles check:', { available: isPMTilesAvailable, retries: initRetryCount });

        if (!isPMTilesAvailable && initRetryCount < CONFIG.maxRetries) {
            initRetryCount++;
            setTimeout(init, CONFIG.retryInterval);
            return;
        }

        L.vectorGrid.isPMTilesSupported = function() {
            return isPMTilesAvailable;
        };

        if (isPMTilesAvailable) {
            setupPMTilesVectorGrid(pmtilesLib);
            console.log('✅ PMTiles support enabled (v3.3.0 optimized)');
        }

        setupVectorTileConfig();
        console.log('✅ PMTilesAdapter initialization complete');
    }

    /**
     * Setup L.VectorGrid.PMTiles - PERFORMANCE OPTIMIZED
     */
    function setupPMTilesVectorGrid(pmtilesLib) {
        L.VectorGrid.PMTiles = L.VectorGrid.extend({
            options: {
                pmtilesUrl: null,
                rendererFactory: L.svg.tile,
                vectorTileLayerStyles: {},
                interactive: false,
                getFeatureId: undefined
            },

            initialize: function(pmtilesUrl, options) {
                this._pmtilesUrl = pmtilesUrl;
                this._pmtilesSource = new pmtilesLib.PMTiles(pmtilesUrl);
                this._pendingRequests = new Map();
                L.VectorGrid.prototype.initialize.call(this, options);
                log('🗺️ PMTiles initialized:', pmtilesUrl);
            },

            /**
             * OPTIMIZED _getVectorTilePromise
             * - LRU tile cache
             * - Request deduplication
             * - Minimal logging
             */
            _getVectorTilePromise: function(coords) {
                const self = this;
                const z = coords.z;
                const x = coords.x;
                const y = coords.y;
                const cacheKey = `${z}/${x}/${y}`;

                // 1. Check LRU cache first
                const cached = tileCache.get(cacheKey);
                if (cached) {
                    return Promise.resolve(cached);
                }

                // 2. Deduplicate in-flight requests
                if (this._pendingRequests.has(cacheKey)) {
                    return this._pendingRequests.get(cacheKey);
                }

                // 3. Fetch from PMTiles
                const promise = this._pmtilesSource.getZxy(z, x, y).then(function(result) {
                    self._pendingRequests.delete(cacheKey);

                    if (!result || !result.data) {
                        return { layers: [] };
                    }

                    try {
                        if (typeof Pbf === 'undefined' || typeof VectorTile === 'undefined') {
                            throw new Error('Pbf/VectorTile not loaded');
                        }

                        const pbf = new Pbf(result.data);
                        const vectorTile = new VectorTile(pbf);

                        // Process layers
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

                        // Cache result
                        tileCache.set(cacheKey, vectorTile);
                        return vectorTile;
                    } catch (error) {
                        console.error(`❌ Tile error ${cacheKey}:`, error.message);
                        return { layers: [] };
                    }
                }).catch(function(error) {
                    self._pendingRequests.delete(cacheKey);
                    console.error(`❌ Fetch error ${cacheKey}:`, error.message);
                    return { layers: [] };
                });

                this._pendingRequests.set(cacheKey, promise);
                return promise;
            },

            onRemove: function(map) {
                this._pmtilesSource = null;
                this._pendingRequests.clear();
                return L.VectorGrid.prototype.onRemove.call(this, map);
            }
        });

        L.vectorGrid.pmtiles = function(pmtilesUrl, options) {
            return new L.VectorGrid.PMTiles(pmtilesUrl, options);
        };

        L.vectorGrid.preloadPMTiles = async function(pmtilesUrl) {
            try {
                const source = new pmtilesLib.PMTiles(pmtilesUrl);
                const header = await source.getHeader();
                return {
                    bounds: [[header.minLat, header.minLon], [header.maxLat, header.maxLon]],
                    minZoom: header.minZoom,
                    maxZoom: header.maxZoom,
                    center: [header.centerLat, header.centerLon]
                };
            } catch (error) {
                console.error('❌ PMTiles metadata error:', error);
                return null;
            }
        };

        // Expose cache for debugging
        L.vectorGrid.getTileCache = () => ({ size: tileCache.size, maxSize: tileCache.maxSize });
        L.vectorGrid.clearTileCache = () => { tileCache.clear(); console.log('🗑️ Cache cleared'); };

        log('✅ L.VectorGrid.PMTiles created');
    }

    /**
     * Setup VectorTileConfig
     */
    function setupVectorTileConfig() {
        window.VectorTileConfig = {
            useOpenSource: true,
            pmtilesUrl: CONFIG.pmtilesUrl,
            mapboxTilesetId: CONFIG.mapboxTilesetId,
            mapboxAccessToken: CONFIG.mapboxAccessToken,
            
            createVectorLayer: function(options) {
                const hasPMTilesMethod = L.vectorGrid && typeof L.vectorGrid.pmtiles === 'function';
                const canUsePMTiles = this.useOpenSource && hasPMTilesMethod;

                if (canUsePMTiles) {
                    log('🌍 Using PMTiles:', this.pmtilesUrl);
                    return L.vectorGrid.pmtiles(this.pmtilesUrl, options);
                } else {
                    console.warn('⚠️ PMTiles not available');
                    const url = `https://api.mapbox.com/v4/${this.mapboxTilesetId}/{z}/{x}/{y}.mvt?access_token=${this.mapboxAccessToken}`;
                    return L.vectorGrid.protobuf(url, options);
                }
            },
            
            switchToOpenSource: function(pmtilesUrl) {
                this.useOpenSource = true;
                if (pmtilesUrl) this.pmtilesUrl = pmtilesUrl;
            },
            
            switchToMapbox: function() {
                this.useOpenSource = false;
            },
            
            getConfig: function() {
                const isPMTilesSupported = L.vectorGrid?.isPMTilesSupported?.() || false;
                return {
                    mode: this.useOpenSource ? 'Open Source (PMTiles)' : 'Mapbox',
                    pmtilesUrl: this.pmtilesUrl,
                    pmtilesSupported: isPMTilesSupported,
                    willUsePMTiles: this.useOpenSource && isPMTilesSupported
                };
            }
        };

        log('🎯 VectorTileConfig ready');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
