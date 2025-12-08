/**
 * Parcel Query Service - Open Source Implementation
 * Replaces: Mapbox Tilequery API
 * Uses: MapLibre queryRenderedFeatures + Turf.js for spatial operations
 */

import * as turf from '@turf/turf';

class ParcelQueryService {
    constructor(map) {
        this.map = map;
        this.selectedParcelId = null;
    }

    /**
     * Query parcel at a specific point
     * @param {Object} lngLat - {lng, lat} coordinates
     * @returns {Object|null} Parcel properties
     */
    queryAtPoint(lngLat) {
        // Query rendered features at the point
        const point = this.map.project([lngLat.lng, lngLat.lat]);
        
        const features = this.map.queryRenderedFeatures(point, {
            layers: ['parcels-fill']
        });

        if (features.length === 0) {
            console.log('❌ No parcel found at this location');
            return null;
        }

        // If multiple parcels, find the closest one
        if (features.length > 1) {
            return this._findClosestParcel(lngLat, features);
        }

        console.log('✅ Found parcel:', features[0].properties);
        return features[0].properties;
    }

    /**
     * Query parcels within radius
     * @param {Object} center - {lng, lat} center point
     * @param {number} radiusMeters - Search radius in meters
     * @returns {Array} Array of parcel properties with distances
     */
    queryInRadius(center, radiusMeters = 100) {
        // Create bounding box from radius
        const bbox = this._getBBoxFromRadius(center, radiusMeters);
        
        // Query features in bounding box
        const features = this.map.queryRenderedFeatures(
            [
                this.map.project([bbox[0], bbox[1]]),
                this.map.project([bbox[2], bbox[3]])
            ],
            { layers: ['parcels-fill'] }
        );

        if (features.length === 0) {
            console.log('❌ No parcels found in radius');
            return [];
        }

        // Filter by actual distance and calculate
        const centerPoint = turf.point([center.lng, center.lat]);
        
        const parcelsWithDistance = features
            .map(feature => {
                const centroid = turf.centroid(feature);
                const distance = turf.distance(centerPoint, centroid, { units: 'meters' });
                
                return {
                    ...feature.properties,
                    distance: Math.round(distance),
                    coordinates: centroid.geometry.coordinates
                };
            })
            .filter(parcel => parcel.distance <= radiusMeters)
            .sort((a, b) => a.distance - b.distance);

        console.log(`✅ Found ${parcelsWithDistance.length} parcels within ${radiusMeters}m`);
        return parcelsWithDistance;
    }

    /**
     * Query parcels by bounding box
     * @param {Array} bbox - [minLng, minLat, maxLng, maxLat]
     * @returns {Array} Array of parcel properties
     */
    queryInBBox(bbox) {
        const features = this.map.queryRenderedFeatures(
            [
                this.map.project([bbox[0], bbox[1]]),
                this.map.project([bbox[2], bbox[3]])
            ],
            { layers: ['parcels-fill'] }
        );

        console.log(`✅ Found ${features.length} parcels in bounding box`);
        return features.map(f => f.properties);
    }

    /**
     * Query parcel by ID (OBJECTID)
     * @param {number} objectId - Parcel OBJECTID
     * @returns {Object|null} Parcel properties
     */
    queryById(objectId) {
        const features = this.map.queryRenderedFeatures({
            layers: ['parcels-fill'],
            filter: ['==', ['get', 'OBJECTID'], objectId]
        });

        if (features.length === 0) {
            console.log(`❌ Parcel ${objectId} not found`);
            return null;
        }

        console.log(`✅ Found parcel ${objectId}`);
        return features[0].properties;
    }

    /**
     * Query parcels by property filter
     * @param {string} property - Property name
     * @param {any} value - Property value
     * @returns {Array} Matching parcels
     */
    queryByProperty(property, value) {
        const features = this.map.queryRenderedFeatures({
            layers: ['parcels-fill'],
            filter: ['==', ['get', property], value]
        });

        console.log(`✅ Found ${features.length} parcels with ${property}=${value}`);
        return features.map(f => f.properties);
    }

    /**
     * Query parcels by Thửa/Tờ (Vietnamese parcel format)
     * @param {string} thuaToBanDo - Format: "123/45" (Thửa/Tờ)
     * @returns {Array} Matching parcels
     */
    queryByThuaToBanDo(thuaToBanDo) {
        const [thua, to] = thuaToBanDo.split('/');
        
        if (!thua || !to) {
            console.error('❌ Invalid format. Use: "123/45"');
            return [];
        }

        const features = this.map.queryRenderedFeatures({
            layers: ['parcels-fill'],
            filter: [
                'all',
                ['==', ['get', 'SoThuTuThua'], thua],
                ['==', ['get', 'SoHieuToBanDo'], to]
            ]
        });

        console.log(`✅ Found ${features.length} parcels matching ${thuaToBanDo}`);
        return features.map(f => f.properties);
    }

    /**
     * Select a parcel (highlight it)
     * @param {number} objectId - Parcel OBJECTID
     */
    selectParcel(objectId) {
        // Deselect previous parcel
        if (this.selectedParcelId !== null) {
            this.map.setFeatureState(
                { source: 'parcels-source', sourceLayer: 'parcels', id: this.selectedParcelId },
                { selected: false }
            );
        }

        // Select new parcel
        this.selectedParcelId = objectId;
        
        if (objectId !== null) {
            this.map.setFeatureState(
                { source: 'parcels-source', sourceLayer: 'parcels', id: objectId },
                { selected: true }
            );
            
            console.log(`✅ Selected parcel ${objectId}`);
        }
    }

    /**
     * Clear selection
     */
    clearSelection() {
        this.selectParcel(null);
        console.log('🗑️ Selection cleared');
    }

    /**
     * Get statistics for visible parcels
     * @returns {Object} Statistics
     */
    getVisibleParcelsStats() {
        const features = this.map.queryRenderedFeatures({
            layers: ['parcels-fill']
        });

        const areas = features.map(f => f.properties.DienTich || 0);
        
        return {
            count: features.length,
            totalArea: areas.reduce((sum, area) => sum + area, 0),
            averageArea: areas.length > 0 ? areas.reduce((sum, area) => sum + area, 0) / areas.length : 0,
            minArea: Math.min(...areas),
            maxArea: Math.max(...areas)
        };
    }

    /**
     * Helper: Find closest parcel from multiple overlapping parcels
     */
    _findClosestParcel(lngLat, features) {
        const point = turf.point([lngLat.lng, lngLat.lat]);
        
        let closestFeature = features[0];
        let minDistance = Infinity;

        features.forEach(feature => {
            const centroid = turf.centroid(feature);
            const distance = turf.distance(point, centroid, { units: 'meters' });

            if (distance < minDistance) {
                minDistance = distance;
                closestFeature = feature;
            }
        });

        console.log(`✅ Found closest parcel (${minDistance.toFixed(2)}m away)`);
        return closestFeature.properties;
    }

    /**
     * Helper: Get bounding box from center and radius
     */
    _getBBoxFromRadius(center, radiusMeters) {
        const point = turf.point([center.lng, center.lat]);
        const radiusKm = radiusMeters / 1000;
        const buffered = turf.buffer(point, radiusKm, { units: 'kilometers' });
        const bbox = turf.bbox(buffered);
        
        return bbox; // [minLng, minLat, maxLng, maxLat]
    }

    /**
     * Calculate area of a parcel geometry
     * @param {Object} feature - GeoJSON feature
     * @returns {number} Area in square meters
     */
    calculateArea(feature) {
        try {
            const area = turf.area(feature);
            return Math.round(area);
        } catch (error) {
            console.error('❌ Error calculating area:', error);
            return 0;
        }
    }

    /**
     * Check if a point is inside a parcel
     * @param {Object} lngLat - {lng, lat}
     * @param {Object} feature - GeoJSON feature
     * @returns {boolean}
     */
    isPointInsideParcel(lngLat, feature) {
        const point = turf.point([lngLat.lng, lngLat.lat]);
        return turf.booleanPointInPolygon(point, feature);
    }
}

export default ParcelQueryService;
