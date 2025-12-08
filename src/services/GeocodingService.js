/**
 * Open Source Geocoding Service
 * Replaces: Mapbox Geocoding API
 * Providers: Nominatim (OpenStreetMap) + Photon (fast alternative)
 */

class OpenSourceGeocoder {
    constructor() {
        // Nominatim - Official OSM geocoder
        this.nominatimUrl = 'https://nominatim.openstreetmap.org';
        
        // Photon - Fast ElasticSearch-based geocoder
        this.photonUrl = 'https://photon.komoot.io/api';
        
        // Cache to reduce API calls
        this.cache = new Map();
        this.cacheTimeout = 1000 * 60 * 60; // 1 hour
        
        // Rate limiting (Nominatim: max 1 req/sec)
        this.lastRequestTime = 0;
        this.minRequestInterval = 1000; // 1 second
    }

    /**
     * Rate limiting for Nominatim
     */
    async _rateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        
        if (timeSinceLastRequest < this.minRequestInterval) {
            const waitTime = this.minRequestInterval - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        this.lastRequestTime = Date.now();
    }

    /**
     * Search for addresses/places (Forward geocoding)
     * @param {string} query - Search query
     * @param {Object} options - Search options
     * @returns {Promise<Array>} Search results
     */
    async search(query, options = {}) {
        const cacheKey = `search:${query}:${JSON.stringify(options)}`;
        
        // Check cache
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                console.log('🔄 Using cached geocoding result');
                return cached.data;
            }
        }

        try {
            // Try Photon first (faster, no rate limit)
            const results = await this._photonSearch(query, options);
            
            // Cache results
            this.cache.set(cacheKey, {
                data: results,
                timestamp: Date.now()
            });
            
            return results;
        } catch (error) {
            console.warn('⚠️ Photon failed, falling back to Nominatim:', error.message);
            
            try {
                const results = await this._nominatimSearch(query, options);
                
                this.cache.set(cacheKey, {
                    data: results,
                    timestamp: Date.now()
                });
                
                return results;
            } catch (nominatimError) {
                console.error('❌ Both geocoding services failed:', nominatimError);
                throw nominatimError;
            }
        }
    }

    /**
     * Photon search (Fast, no rate limit)
     */
    async _photonSearch(query, options = {}) {
        const params = new URLSearchParams({
            q: query,
            lang: options.language || 'vi',
            limit: options.limit || 10
        });

        // Add proximity bias (Đà Nẵng center)
        if (options.proximity) {
            params.append('lat', options.proximity.lat || 16.054456);
            params.append('lon', options.proximity.lng || 108.202167);
        }

        // Limit to Vietnam
        if (options.countryCode !== false) {
            params.append('osm_tag', 'place');
        }

        const url = `${this.photonUrl}?${params}`;
        console.log('🔍 Photon geocoding:', query);

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'XemGiaDat/2.0 (Vietnamese Real Estate Platform)'
            }
        });

        if (!response.ok) {
            throw new Error(`Photon API error: ${response.status}`);
        }

        const data = await response.json();

        return data.features.map(feature => ({
            place_name: this._formatVietnameseName(feature.properties),
            center: feature.geometry.coordinates,
            properties: feature.properties,
            relevance: feature.properties.extent ? 1.0 : 0.8,
            place_type: [feature.properties.type || 'place'],
            text: feature.properties.name,
            address: this._extractAddress(feature.properties)
        }));
    }

    /**
     * Nominatim search (Official OSM, rate limited)
     */
    async _nominatimSearch(query, options = {}) {
        await this._rateLimit();

        const params = new URLSearchParams({
            q: query,
            format: 'json',
            addressdetails: 1,
            'accept-language': options.language || 'vi',
            limit: options.limit || 10,
            countrycodes: options.countryCode !== false ? 'vn' : ''
        });

        // Add proximity bias
        if (options.proximity) {
            params.append('viewbox', this._createViewBox(options.proximity));
            params.append('bounded', '0'); // Not strictly bounded
        }

        const url = `${this.nominatimUrl}/search?${params}`;
        console.log('🔍 Nominatim geocoding:', query);

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'XemGiaDat/2.0 (Vietnamese Real Estate Platform)'
            }
        });

        if (!response.ok) {
            throw new Error(`Nominatim API error: ${response.status}`);
        }

        const data = await response.json();

        return data.map(item => ({
            place_name: item.display_name,
            center: [parseFloat(item.lon), parseFloat(item.lat)],
            properties: item.address,
            relevance: parseFloat(item.importance || 0.5),
            place_type: [item.type],
            text: item.address.road || item.address.hamlet || item.address.suburb || item.display_name,
            address: item.address,
            bbox: item.boundingbox ? [
                parseFloat(item.boundingbox[2]),
                parseFloat(item.boundingbox[0]),
                parseFloat(item.boundingbox[3]),
                parseFloat(item.boundingbox[1])
            ] : null
        }));
    }

    /**
     * Reverse geocoding (coordinates to address)
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @returns {Promise<Object>} Address information
     */
    async reverse(lat, lng) {
        const cacheKey = `reverse:${lat.toFixed(5)},${lng.toFixed(5)}`;

        // Check cache
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                console.log('🔄 Using cached reverse geocoding result');
                return cached.data;
            }
        }

        try {
            // Try Photon reverse
            const result = await this._photonReverse(lat, lng);
            
            this.cache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });
            
            return result;
        } catch (error) {
            console.warn('⚠️ Photon reverse failed, using Nominatim:', error.message);
            
            const result = await this._nominatimReverse(lat, lng);
            
            this.cache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });
            
            return result;
        }
    }

    /**
     * Photon reverse geocoding
     */
    async _photonReverse(lat, lng) {
        const url = `${this.photonUrl}/reverse?lon=${lng}&lat=${lat}&lang=vi`;
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'XemGiaDat/2.0'
            }
        });

        if (!response.ok) {
            throw new Error(`Photon reverse error: ${response.status}`);
        }

        const data = await response.json();

        if (!data.features || data.features.length === 0) {
            throw new Error('No results from Photon reverse');
        }

        const feature = data.features[0];

        return {
            place_name: this._formatVietnameseName(feature.properties),
            properties: feature.properties,
            address: this._extractAddress(feature.properties)
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
            headers: {
                'User-Agent': 'XemGiaDat/2.0'
            }
        });

        if (!response.ok) {
            throw new Error(`Nominatim reverse error: ${response.status}`);
        }

        const data = await response.json();

        return {
            place_name: data.display_name,
            properties: data.address,
            address: data.address
        };
    }

    /**
     * Helper: Format Vietnamese place name
     */
    _formatVietnameseName(properties) {
        const parts = [];
        
        if (properties.name) parts.push(properties.name);
        if (properties.street) parts.push(properties.street);
        if (properties.district) parts.push(properties.district);
        if (properties.city) parts.push(properties.city);
        else if (properties.state) parts.push(properties.state);
        
        return parts.join(', ') || properties.name || 'Không xác định';
    }

    /**
     * Helper: Extract structured address
     */
    _extractAddress(properties) {
        return {
            street: properties.street || properties.road,
            district: properties.district || properties.county,
            city: properties.city || properties.state,
            postcode: properties.postcode,
            country: properties.country || 'Việt Nam'
        };
    }

    /**
     * Helper: Create viewbox for proximity bias
     */
    _createViewBox(proximity, radiusKm = 50) {
        const lat = proximity.lat || 16.054456;
        const lng = proximity.lng || 108.202167;
        
        // Rough conversion: 1 degree ≈ 111km
        const delta = radiusKm / 111;
        
        return `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        console.log('🗑️ Geocoding cache cleared');
    }
}

// Export singleton instance
export const geocoder = new OpenSourceGeocoder();

export default OpenSourceGeocoder;
