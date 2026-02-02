/**
 * Web Worker for Parcel Search
 * Offloads heavy GeoJSON parsing from main thread
 * Expected Performance Gain: -0.4 to -0.6s TBT
 */

let cachedGeojsonByMaXa = {};

// Listen for messages from main thread
self.onmessage = async function(event) {
    const { command, payload } = event.data;
    
    switch(command) {
        case 'SEARCH_PARCEL':
            handleSearchParcel(payload);
            break;
        case 'LOAD_GEOJSON':
            handleLoadGeojson(payload);
            break;
        case 'CLEAR_CACHE':
            cachedGeojsonByMaXa = {};
            self.postMessage({ command: 'CLEAR_CACHE', success: true });
            break;
        default:
            console.warn(`Unknown command: ${command}`);
    }
};

/**
 * Load GeoJSON file into cache
 */
async function handleLoadGeojson(payload) {
    const { maXa } = payload;
    
    if (cachedGeojsonByMaXa[maXa]) {
        self.postMessage({
            command: 'LOAD_GEOJSON',
            maXa,
            success: true,
            cached: true
        });
        return;
    }
    
    try {
        const response = await fetch(`data/parcels/${maXa}.geojson`);
        if (response.ok) {
            const geojson = await response.json();
            cachedGeojsonByMaXa[maXa] = geojson;
            
            self.postMessage({
                command: 'LOAD_GEOJSON',
                maXa,
                success: true,
                featureCount: geojson.features?.length || 0
            });
        } else {
            self.postMessage({
                command: 'LOAD_GEOJSON',
                maXa,
                success: false,
                error: `HTTP ${response.status}`
            });
        }
    } catch(error) {
        self.postMessage({
            command: 'LOAD_GEOJSON',
            maXa,
            success: false,
            error: error.message
        });
    }
}

/**
 * Search parcels in cache
 * Heavy computation done in background thread
 */
async function handleSearchParcel(payload) {
    const { soThua, soTo, areas, taskId } = payload;
    
    const startTime = performance.now();
    const matches = [];
    const maxResults = 12;
    
    try {
        for (const maXa of areas) {
            if (matches.length >= maxResults) break;
            
            // Ensure area is loaded
            if (!cachedGeojsonByMaXa[maXa]) {
                try {
                    const response = await fetch(`data/parcels/${maXa}.geojson`);
                    if (response.ok) {
                        cachedGeojsonByMaXa[maXa] = await response.json();
                    }
                } catch(e) {
                    console.error(`Failed to load ${maXa}:`, e.message);
                    continue;
                }
            }
            
            const geojson = cachedGeojsonByMaXa[maXa];
            if (!geojson || !geojson.features) continue;
            
            // Search features in this area
            for (const feature of geojson.features) {
                if (matches.length >= maxResults) break;
                
                const props = feature.properties;
                if (!props) continue;
                
                const matchThua = props.SoThuTuThua == soThua;
                const matchTo = !soTo || props.SoHieuToBanDo == soTo;
                
                if (matchThua && matchTo) {
                    // Extract coordinates and calculate centroid
                    const coords = feature.geometry?.coordinates?.[0];
                    if (!coords || coords.length < 3) continue;
                    
                    let centerLng = 0, centerLat = 0, validCount = 0;
                    for (const coord of coords) {
                        if (Array.isArray(coord) && coord.length >= 2 && 
                            typeof coord[0] === 'number' && typeof coord[1] === 'number') {
                            centerLng += coord[0];
                            centerLat += coord[1];
                            validCount++;
                        }
                    }
                    
                    if (validCount === 0) continue;
                    
                    centerLng /= validCount;
                    centerLat /= validCount;
                    
                    matches.push({
                        soThua: props.SoThuTuThua,
                        soTo: props.SoHieuToBanDo,
                        dienTich: props.DienTich ? Math.round(props.DienTich * 10) / 10 : null,
                        loaiDat: props.KyHieuMucDichSuDung || 'N/A',
                        maXa: maXa,
                        lat: centerLat,
                        lng: centerLng,
                        quality: 'high'
                    });
                }
            }
        }
        
        const duration = performance.now() - startTime;
        
        self.postMessage({
            command: 'SEARCH_PARCEL',
            taskId,
            success: true,
            results: matches,
            duration
        });
    } catch(error) {
        self.postMessage({
            command: 'SEARCH_PARCEL',
            taskId,
            success: false,
            error: error.message
        });
    }
}
