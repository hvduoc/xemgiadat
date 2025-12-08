/**
 * MapLibre GL JS Configuration - Open Source Map Engine
 * Replaces: Mapbox GL JS
 * Benefits: 100% free, MIT license, WebGL rendering
 */

import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol } from 'pmtiles';

// Enable PMTiles protocol globally
const protocol = new Protocol();
maplibregl.addProtocol('pmtiles', protocol.tile);

/**
 * Initialize MapLibre map with Vietnamese parcel data
 * @param {string} containerId - Map container element ID
 * @param {Object} options - Map initialization options
 * @returns {maplibregl.Map} Map instance
 */
export function initMap(containerId, options = {}) {
    const defaultOptions = {
        container: containerId,
        style: createMapStyle('osm'), // Default to OpenStreetMap
        center: options.center || [108.202167, 16.054456], // Đà Nẵng
        zoom: options.zoom || 13,
        maxZoom: 20,
        minZoom: 10,
        attributionControl: true
    };

    const map = new maplibregl.Map({ ...defaultOptions, ...options });

    // Add navigation controls
    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Add scale control
    map.addControl(new maplibregl.ScaleControl({
        maxWidth: 100,
        unit: 'metric'
    }), 'bottom-left');

    // Add geolocate control
    map.addControl(new maplibregl.GeolocateControl({
        positionOptions: {
            enableHighAccuracy: true
        },
        trackUserLocation: true
    }), 'top-right');

    return map;
}

/**
 * Create map style configuration
 * @param {string} baseMapType - 'osm', 'maptiler-streets', 'maptiler-satellite'
 * @returns {Object} MapLibre style specification
 */
export function createMapStyle(baseMapType = 'osm') {
    const styles = {
        osm: {
            version: 8,
            name: 'OpenStreetMap',
            metadata: {
                'maplibre:version': '8'
            },
            sources: {
                'osm': {
                    type: 'raster',
                    tiles: [
                        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
                        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
                        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
                    ],
                    tileSize: 256,
                    attribution: '© OpenStreetMap contributors',
                    maxzoom: 19
                }
            },
            layers: [
                {
                    id: 'osm-tiles',
                    type: 'raster',
                    source: 'osm',
                    minzoom: 0,
                    maxzoom: 22
                }
            ]
        },
        
        'maptiler-streets': {
            version: 8,
            name: 'MapTiler Streets',
            sources: {
                'maptiler': {
                    type: 'raster',
                    tiles: [
                        'https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=get_your_free_key'
                    ],
                    tileSize: 512,
                    attribution: '© MapTiler © OpenStreetMap contributors',
                    maxzoom: 22
                }
            },
            layers: [
                {
                    id: 'maptiler-tiles',
                    type: 'raster',
                    source: 'maptiler',
                    minzoom: 0,
                    maxzoom: 22
                }
            ]
        },

        'maptiler-satellite': {
            version: 8,
            name: 'MapTiler Satellite',
            sources: {
                'maptiler-sat': {
                    type: 'raster',
                    tiles: [
                        'https://api.maptiler.com/maps/hybrid/{z}/{x}/{y}.jpg?key=get_your_free_key'
                    ],
                    tileSize: 512,
                    attribution: '© MapTiler',
                    maxzoom: 20
                }
            },
            layers: [
                {
                    id: 'satellite-tiles',
                    type: 'raster',
                    source: 'maptiler-sat',
                    minzoom: 0,
                    maxzoom: 22
                }
            ]
        }
    };

    return styles[baseMapType] || styles.osm;
}

/**
 * Add Vietnamese parcel layer from PMTiles
 * @param {maplibregl.Map} map - Map instance
 * @param {string} pmtilesUrl - URL to PMTiles file
 */
export function addParcelLayer(map, pmtilesUrl) {
    map.on('load', () => {
        // Add PMTiles source
        map.addSource('parcels-source', {
            type: 'vector',
            url: `pmtiles://${pmtilesUrl}`,
            promoteId: 'OBJECTID' // Use OBJECTID for feature state
        });

        // Add fill layer for parcels
        map.addLayer({
            id: 'parcels-fill',
            type: 'fill',
            source: 'parcels-source',
            'source-layer': 'parcels', // Layer name trong PMTiles
            paint: {
                'fill-color': [
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    '#FFD700', // Gold color on hover
                    ['boolean', ['feature-state', 'selected'], false],
                    '#FF6B6B', // Red color when selected
                    '#4FC3F7' // Default blue color
                ],
                'fill-opacity': [
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    0.8,
                    ['boolean', ['feature-state', 'selected'], false],
                    0.7,
                    0.4
                ]
            }
        });

        // Add outline layer
        map.addLayer({
            id: 'parcels-outline',
            type: 'line',
            source: 'parcels-source',
            'source-layer': 'parcels',
            paint: {
                'line-color': [
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    '#FFA500', // Orange outline on hover
                    ['boolean', ['feature-state', 'selected'], false],
                    '#E63946', // Dark red when selected
                    '#0277BD' // Default blue outline
                ],
                'line-width': [
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    2,
                    ['boolean', ['feature-state', 'selected'], false],
                    2.5,
                    1
                ]
            }
        });

        // Add label layer (conditional on zoom)
        map.addLayer({
            id: 'parcels-labels',
            type: 'symbol',
            source: 'parcels-source',
            'source-layer': 'parcels',
            minzoom: 16, // Only show labels when zoomed in
            layout: {
                'text-field': [
                    'concat',
                    ['get', 'SoThuTuThua'],
                    '/',
                    ['get', 'SoHieuToBanDo']
                ],
                'text-font': ['Open Sans Regular'],
                'text-size': 11,
                'text-anchor': 'center',
                'text-offset': [0, 0],
                'text-allow-overlap': false
            },
            paint: {
                'text-color': '#1A1A1A',
                'text-halo-color': '#FFFFFF',
                'text-halo-width': 1.5,
                'text-halo-blur': 0.5
            }
        });

        console.log('✅ Parcel layers added successfully');
    });
}

/**
 * Switch base map style
 * @param {maplibregl.Map} map - Map instance
 * @param {string} styleType - 'osm', 'maptiler-streets', 'maptiler-satellite'
 */
export function switchBaseMap(map, styleType) {
    const newStyle = createMapStyle(styleType);
    
    // Preserve parcel layers when switching style
    const parcelSourceData = map.getSource('parcels-source');
    
    map.once('styledata', () => {
        if (parcelSourceData) {
            // Re-add parcel layers after style change
            const pmtilesUrl = parcelSourceData._data.url.replace('pmtiles://', '');
            addParcelLayer(map, pmtilesUrl);
        }
    });

    map.setStyle(newStyle);
}

/**
 * Setup interactive hover effects for parcels
 * @param {maplibregl.Map} map - Map instance
 */
export function setupParcelInteractions(map) {
    let hoveredStateId = null;

    // Mouse enter
    map.on('mouseenter', 'parcels-fill', (e) => {
        map.getCanvas().style.cursor = 'pointer';

        if (e.features.length > 0) {
            if (hoveredStateId !== null) {
                map.setFeatureState(
                    { source: 'parcels-source', sourceLayer: 'parcels', id: hoveredStateId },
                    { hover: false }
                );
            }

            hoveredStateId = e.features[0].id;
            
            map.setFeatureState(
                { source: 'parcels-source', sourceLayer: 'parcels', id: hoveredStateId },
                { hover: true }
            );
        }
    });

    // Mouse leave
    map.on('mouseleave', 'parcels-fill', () => {
        map.getCanvas().style.cursor = '';

        if (hoveredStateId !== null) {
            map.setFeatureState(
                { source: 'parcels-source', sourceLayer: 'parcels', id: hoveredStateId },
                { hover: false }
            );
        }
        
        hoveredStateId = null;
    });

    console.log('✅ Parcel interactions setup complete');
}

/**
 * Create a popup for parcel information
 * @param {Object} properties - Feature properties
 * @returns {string} HTML content for popup
 */
export function createParcelPopup(properties) {
    return `
        <div style="font-family: system-ui, -apple-system, sans-serif; padding: 8px;">
            <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1A1A1A;">
                Thửa ${properties.SoThuTuThua || '?'} - Tờ ${properties.SoHieuToBanDo || '?'}
            </h3>
            <div style="font-size: 12px; color: #555;">
                <div style="margin: 4px 0;">
                    <strong>Diện tích:</strong> ${properties.DienTich || 0} m²
                </div>
                <div style="margin: 4px 0;">
                    <strong>Loại đất:</strong> ${properties.KyHieuMucDichSuDung || 'ODT'}
                </div>
                <div style="margin: 4px 0;">
                    <strong>Mã xã:</strong> ${properties.MaXa || '---'}
                </div>
            </div>
        </div>
    `;
}

export default {
    initMap,
    createMapStyle,
    addParcelLayer,
    switchBaseMap,
    setupParcelInteractions,
    createParcelPopup
};
