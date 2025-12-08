/**
 * Open Source Geocoding Adapter
 * Drop-in replacement cho Mapbox Geocoding API
 * Providers: Nominatim (OSM) + Photon (fallback)
 */

console.log('🔄 Loading GeocodingAdapter.js...');

class OpenSourceGeocodingAdapter {
    constructor() {
        // API endpoints
        this.nominatimUrl = 'https://nominatim.openstreetmap.org';
        this.photonUrl = 'https://photon.komoot.io/api';
        
        // Cache
        this.cache = new Map();
        this.cacheTimeout = 60 * 60 * 1000; // 1 hour
        
        // Rate limiting (Nominatim: 1 req/sec)
        this.lastRequestTime = 0;
        this.minRequestInterval = 1000;
        
        // User agent (required by Nominatim)
        this.userAgent = 'XemGiaDat/2.0 (Vietnamese Real Estate Platform)';
    }

    /**
     * Rate limiting
     */
    async _rateLimit() {
        const now = Date.now();
        const elapsed = now - this.lastRequestTime;
        
        if (elapsed < this.minRequestInterval) {
            await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - elapsed));
        }
        
        this.lastRequestTime = Date.now();
    }

    /**
     * Forward geocoding (address → coordinates)
     * Mapbox-compatible API
     */
    async forward(query, options = {}) {
        const cacheKey = `fwd:${query}:${JSON.stringify(options)}`;
        
        // Check cache
        const cached = this._getCache(cacheKey);
        if (cached) return cached;

        try {
            // Try Photon first (faster, no rate limit)
            const results = await this._photonSearch(query, options);
            this._setCache(cacheKey, results);
            return results;
        } catch (error) {
            console.warn('⚠️ Photon failed, trying Nominatim:', error.message);
            
            // Fallback to Nominatim
            try {
                const results = await this._nominatimSearch(query, options);
                this._setCache(cacheKey, results);
                return results;
            } catch (nominatimError) {
                console.error('❌ Both geocoding services failed');
                throw nominatimError;
            }
        }
    }

    /**
     * Reverse geocoding (coordinates → address)
     * Mapbox-compatible API
     */
    async reverse(lng, lat, options = {}) {
        const cacheKey = `rev:${lat.toFixed(5)},${lng.toFixed(5)}`;
        
        // Check cache
        const cached = this._getCache(cacheKey);
        if (cached) return cached;

        try {
            const result = await this._photonReverse(lat, lng);
            this._setCache(cacheKey, result);
            return result;
        } catch (error) {
            console.warn('⚠️ Photon reverse failed, trying Nominatim');
            
            const result = await this._nominatimReverse(lat, lng);
            this._setCache(cacheKey, result);
            return result;
        }
    }

    /**
     * Photon search (fast, no rate limit)
     */
    async _photonSearch(query, options = {}) {
        // Normalize query for Photon (doesn't handle Vietnamese well)
        const normalizedQuery = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        
        const params = new URLSearchParams({
            q: normalizedQuery,
            lang: 'en', // Use English for better results
            limit: options.limit || 10
        });

        // Add proximity bias (Đà Nẵng)
        if (options.proximity) {
            params.append('lat', options.proximity.lat || 16.054456);
            params.append('lon', options.proximity.lng || 108.202167);
        }

        const url = `${this.photonUrl}?${params}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Photon error: ${response.status}`);
        }

        const data = await response.json();

        // Convert to Mapbox-compatible format
        return {
            type: 'FeatureCollection',
            features: data.features.map(f => ({
                type: 'Feature',
                place_name: this._formatAddress(f.properties),
                center: f.geometry.coordinates,
                geometry: f.geometry,
                properties: f.properties,
                relevance: f.properties.extent ? 1.0 : 0.8,
                place_type: [f.properties.type || 'place'],
                text: f.properties.name
            }))
        };
    }

    /**
     * Nominatim search (official OSM, rate limited)
     */
    async _nominatimSearch(query, options = {}) {
        await this._rateLimit();

        const params = new URLSearchParams({
            q: query,
            format: 'json',
            addressdetails: 1,
            'accept-language': options.language || 'vi',
            limit: options.limit || 10,
            countrycodes: 'vn'
        });

        const url = `${this.nominatimUrl}/search?${params}`;
        const response = await fetch(url, {
            headers: { 'User-Agent': this.userAgent }
        });

        if (!response.ok) {
            throw new Error(`Nominatim error: ${response.status}`);
        }

        const data = await response.json();

        // Convert to Mapbox-compatible format
        return {
            type: 'FeatureCollection',
            features: data.map(item => ({
                type: 'Feature',
                place_name: item.display_name,
                center: [parseFloat(item.lon), parseFloat(item.lat)],
                geometry: {
                    type: 'Point',
                    coordinates: [parseFloat(item.lon), parseFloat(item.lat)]
                },
                properties: item.address,
                relevance: parseFloat(item.importance || 0.5),
                place_type: [item.type],
                text: item.address.road || item.display_name
            }))
        };
    }

    /**
     * Photon reverse geocoding
     */
    async _photonReverse(lat, lng) {
        const url = `${this.photonUrl}/reverse?lon=${lng}&lat=${lat}&lang=vi`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Photon reverse error: ${response.status}`);
        }

        const data = await response.json();

        if (!data.features || data.features.length === 0) {
            throw new Error('No results from Photon');
        }

        const feature = data.features[0];

        return {
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                place_name: this._formatAddress(feature.properties),
                center: [lng, lat],
                geometry: feature.geometry,
                properties: feature.properties,
                text: feature.properties.name
            }]
        };
    }

    /**
     * Nominatim reverse geocoding
     */
    async _nominatimReverse(lat, lng) {
        await this._rateLimit();

        const params = new URLSearchParams({
            lat: lat,
            lon: lng,
            format: 'json',
            addressdetails: 1,
            'accept-language': 'vi',
            zoom: 18
        });

        const url = `${this.nominatimUrl}/reverse?${params}`;
        const response = await fetch(url, {
            headers: { 'User-Agent': this.userAgent }
        });

        if (!response.ok) {
            throw new Error(`Nominatim reverse error: ${response.status}`);
        }

        const data = await response.json();

        return {
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                place_name: data.display_name,
                center: [lng, lat],
                geometry: {
                    type: 'Point',
                    coordinates: [lng, lat]
                },
                properties: data.address,
                text: data.address.road || data.display_name
            }]
        };
    }

    /**
     * Format Vietnamese address
     */
    _formatAddress(properties) {
        const parts = [];
        
        if (properties.name) parts.push(properties.name);
        if (properties.street) parts.push(properties.street);
        if (properties.district) parts.push(properties.district);
        if (properties.city) parts.push(properties.city);
        else if (properties.state) parts.push(properties.state);
        
        return parts.join(', ') || properties.name || 'Không xác định';
    }

    /**
     * Cache helpers
     */
    _getCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            console.log('🔄 Using cached result');
            return cached.data;
        }
        return null;
    }

    _setCache(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        console.log('🗑️ Geocoding cache cleared');
    }
}

/**
 * GeocodingService - Smart switching giữa Mapbox và Open Source
 */
window.GeocodingService = {
    // Configuration
    useOpenSource: false, // Set to true để dùng open source
    mapboxAccessToken: 'pk.eyJ1IjoiaHZkdW9jIiwiYSI6ImNtZDFwcjVxYTAzOGUybHEzc3ZrNTJmcnIifQ.D5VlPC8c_n1i3kezgqtzwg',
    
    // Adapters
    openSourceAdapter: new OpenSourceGeocodingAdapter(),
    
    /**
     * Forward geocoding with auto-switching
     */
    async forward(query, options = {}) {
        if (this.useOpenSource) {
            console.log('🌍 Using Open Source Geocoding');
            return await this.openSourceAdapter.forward(query, options);
        } else {
            console.log('📦 Using Mapbox Geocoding');
            return await this._mapboxForward(query, options);
        }
    },
    
    /**
     * Reverse geocoding with auto-switching
     */
    async reverse(lng, lat, options = {}) {
        if (this.useOpenSource) {
            console.log('🌍 Using Open Source Reverse Geocoding');
            return await this.openSourceAdapter.reverse(lng, lat, options);
        } else {
            console.log('📦 Using Mapbox Reverse Geocoding');
            return await this._mapboxReverse(lng, lat, options);
        }
    },
    
    /**
     * Mapbox forward geocoding (existing API)
     */
    async _mapboxForward(query, options = {}) {
        const params = new URLSearchParams({
            access_token: this.mapboxAccessToken,
            language: options.language || 'vi',
            limit: options.limit || 10,
            types: options.types || 'address,poi,locality,place'
        });

        if (options.proximity) {
            params.append('proximity', `${options.proximity.lng},${options.proximity.lat}`);
        }

        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Mapbox geocoding error: ${response.status}`);
        }
        
        return await response.json();
    },
    
    /**
     * Mapbox reverse geocoding (existing API)
     */
    async _mapboxReverse(lng, lat, options = {}) {
        const params = new URLSearchParams({
            access_token: this.mapboxAccessToken,
            language: options.language || 'vi',
            limit: options.limit || 1,
            types: options.types || 'address,poi,locality,place'
        });

        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?${params}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Mapbox reverse geocoding error: ${response.status}`);
        }
        
        return await response.json();
    },
    
    /**
     * Switch to open source
     */
    switchToOpenSource: function() {
        this.useOpenSource = true;
        console.log('✅ Switched to Open Source Geocoding');
    },
    
    /**
     * Switch to Mapbox
     */
    switchToMapbox: function() {
        this.useOpenSource = false;
        console.log('✅ Switched to Mapbox Geocoding');
    },
    
    /**
     * Get current configuration
     */
    getConfig: function() {
        return {
            mode: this.useOpenSource ? 'Open Source (Nominatim/Photon)' : 'Mapbox',
            cacheSize: this.openSourceAdapter.cache.size
        };
    }
};

console.log('🎯 GeocodingService ready:', GeocodingService.getConfig());
