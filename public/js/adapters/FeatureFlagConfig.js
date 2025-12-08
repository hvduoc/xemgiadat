/**
 * Feature Flag Configuration
 * Quản lý chuyển đổi giữa Mapbox và Open Source
 */

console.log('🔄 Loading FeatureFlagConfig.js...');

window.OpenSourceConfig = {
    // Feature flags
    flags: {
        useOpenSourceTiles: false,
        useOpenSourceGeocoding: false,
        enableBetaFeatures: false
    },
    
    /**
     * Enable all open source features
     */
    enableAll: function() {
        this.flags.useOpenSourceTiles = true;
        this.flags.useOpenSourceGeocoding = true;
        
        // Apply to adapters
        if (window.VectorTileConfig) {
            window.VectorTileConfig.useOpenSource = true;
        }
        if (window.GeocodingService) {
            window.GeocodingService.useOpenSource = true;
        }
        
        console.log('✅ All Open Source features enabled');
        this._showNotification('Đã bật chế độ Open Source 100%', 'success');
    },
    
    /**
     * Disable all open source features (fallback to Mapbox)
     */
    disableAll: function() {
        this.flags.useOpenSourceTiles = false;
        this.flags.useOpenSourceGeocoding = false;
        
        // Apply to adapters
        if (window.VectorTileConfig) {
            window.VectorTileConfig.useOpenSource = false;
        }
        if (window.GeocodingService) {
            window.GeocodingService.useOpenSource = false;
        }
        
        console.log('✅ Switched back to Mapbox');
        this._showNotification('Đã chuyển về Mapbox (fallback)', 'info');
    },
    
    /**
     * Enable only tiles (keep Mapbox geocoding)
     */
    enableTilesOnly: function() {
        this.flags.useOpenSourceTiles = true;
        this.flags.useOpenSourceGeocoding = false;
        
        if (window.VectorTileConfig) {
            window.VectorTileConfig.useOpenSource = true;
        }
        if (window.GeocodingService) {
            window.GeocodingService.useOpenSource = false;
        }
        
        console.log('✅ PMTiles enabled, Mapbox geocoding retained');
        this._showNotification('Bản đồ: Open Source | Tìm kiếm: Mapbox', 'info');
    },
    
    /**
     * Enable only geocoding (keep Mapbox tiles)
     */
    enableGeocodingOnly: function() {
        this.flags.useOpenSourceTiles = false;
        this.flags.useOpenSourceGeocoding = true;
        
        if (window.VectorTileConfig) {
            window.VectorTileConfig.useOpenSource = false;
        }
        if (window.GeocodingService) {
            window.GeocodingService.useOpenSource = true;
        }
        
        console.log('✅ Open Source geocoding enabled, Mapbox tiles retained');
        this._showNotification('Bản đồ: Mapbox | Tìm kiếm: Open Source', 'info');
    },
    
    /**
     * Get current status
     */
    getStatus: function() {
        return {
            tiles: this.flags.useOpenSourceTiles ? 'PMTiles' : 'Mapbox',
            geocoding: this.flags.useOpenSourceGeocoding ? 'Nominatim/Photon' : 'Mapbox',
            mode: this._getMode(),
            ready: this._checkReadiness()
        };
    },
    
    /**
     * Check if open source components are ready
     */
    _checkReadiness: function() {
        return {
            pmtiles: typeof pmtiles !== 'undefined',
            vectorTileConfig: typeof VectorTileConfig !== 'undefined',
            geocodingService: typeof GeocodingService !== 'undefined',
            leafletVectorGrid: typeof L !== 'undefined' && L.vectorGrid
        };
    },
    
    /**
     * Get current mode description
     */
    _getMode: function() {
        const tiles = this.flags.useOpenSourceTiles;
        const geocoding = this.flags.useOpenSourceGeocoding;
        
        if (tiles && geocoding) return '100% Open Source';
        if (!tiles && !geocoding) return '100% Mapbox';
        if (tiles) return 'Hybrid (Open Source Tiles)';
        if (geocoding) return 'Hybrid (Open Source Geocoding)';
        
        return 'Unknown';
    },
    
    /**
     * Show notification to user
     */
    _showNotification: function(message, type = 'info') {
        // Try to use existing notification system
        if (typeof showToast === 'function') {
            showToast(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    },
    
    /**
     * Load configuration from localStorage
     */
    loadFromStorage: function() {
        try {
            const saved = localStorage.getItem('openSourceConfig');
            if (saved) {
                const config = JSON.parse(saved);
                this.flags = { ...this.flags, ...config };
                
                // Apply settings
                if (this.flags.useOpenSourceTiles || this.flags.useOpenSourceGeocoding) {
                    if (this.flags.useOpenSourceTiles && this.flags.useOpenSourceGeocoding) {
                        this.enableAll();
                    } else if (this.flags.useOpenSourceTiles) {
                        this.enableTilesOnly();
                    } else {
                        this.enableGeocodingOnly();
                    }
                }
                
                console.log('✅ Loaded config from localStorage:', this.flags);
            }
        } catch (error) {
            console.warn('⚠️ Failed to load config from localStorage:', error);
        }
    },
    
    /**
     * Save configuration to localStorage
     */
    saveToStorage: function() {
        try {
            localStorage.setItem('openSourceConfig', JSON.stringify(this.flags));
            console.log('✅ Config saved to localStorage');
        } catch (error) {
            console.warn('⚠️ Failed to save config to localStorage:', error);
        }
    },
    
    /**
     * Test open source components
     */
    test: async function() {
        console.log('🧪 Testing Open Source Components...\n');
        
        const readiness = this._checkReadiness();
        console.log('📊 Readiness Check:', readiness);
        
        // Test PMTiles
        if (readiness.pmtiles && readiness.vectorTileConfig) {
            try {
                const metadata = await L.vectorGrid.preloadPMTiles(VectorTileConfig.pmtilesUrl);
                console.log('✅ PMTiles test passed:', metadata);
            } catch (error) {
                console.error('❌ PMTiles test failed:', error);
            }
        }
        
        // Test Geocoding
        if (readiness.geocodingService) {
            try {
                const result = await GeocodingService.openSourceAdapter.forward('Đà Nẵng', { limit: 1 });
                console.log('✅ Geocoding test passed:', result.features[0].place_name);
            } catch (error) {
                console.error('❌ Geocoding test failed:', error);
            }
        }
        
        return readiness;
    }
};

// Auto-load configuration on page load
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        OpenSourceConfig.loadFromStorage();
        console.log('🎯 OpenSourceConfig ready:', OpenSourceConfig.getStatus());
    });
}

console.log('✅ Feature Flag Configuration loaded');
