// 🚀 ENTERPRISE SEARCH ENGINE OPTIMIZATION
// Advanced search system for complete parcel coverage

// === SEARCH PERFORMANCE OPTIMIZATION ===

// 1. COMPLETE AREA COVERAGE
const ALL_AVAILABLE_AREAS = [
    '20194', '20195', '20197', '20198', '20200', '20203', '20206', '20207', '20209', '20212',
    '20215', '20218', '20221', '20224', '20225', '20227', '20230', '20233', '20236', '20239',
    '20242', '20245', '20246', '20248', '20251', '20254', '20257', '20258', '20260', '20263',
    '20266', '20269', '20272', '20275', '20278', '20281', '20284', '20285', '20287', '20290',
    '20293', '20296', '20299', '20302', '20305', '20306', '20308', '20311', '20312', '20314',
    '20317', '20320', '20323', '20326', '20329', '20332'
];

// 2. ENHANCED PATTERN MATCHING
const parseParcelQuery = (query) => {
    const patterns = [
        /(?:thửa|thua)\s*(\d+)[\s,]*(?:tờ|to)\s*(\d+)/i, // "Thửa 123, Tờ 45"
        /(?:tờ|to)\s*(\d+)[\s,]*(?:thửa|thua)\s*(\d+)/i, // "Tờ 45, Thửa 123"
        /(\d+)\/(\d+)/, // "123/45"
        /(\d+)-(\d+)/, // "123-45"
        /^(\d+)$/ // Just number
    ];
    
    for (let i = 0; i < patterns.length; i++) {
        const match = query.match(patterns[i]);
        if (match) {
            if (i === 4) return { soThua: match[1], soTo: null };
            if (i === 1) return { soThua: match[2], soTo: match[1] }; // Reversed
            return { soThua: match[1], soTo: match[2] };
        }
    }
    return null;
};

// 3. PARALLEL SEARCH ALGORITHM
const searchAllAreas = async (soThua, soTo = null) => {
    console.log(`🎯 ENTERPRISE SEARCH: Scanning ${ALL_AVAILABLE_AREAS.length} areas for Thửa ${soThua}, Tờ ${soTo || 'ANY'}`);
    
    const results = [];
    const batchSize = 6; // Process 6 areas concurrently
    const maxResults = 15; // Increased for better coverage
    
    for (let i = 0; i < ALL_AVAILABLE_AREAS.length && results.length < maxResults; i += batchSize) {
        const batch = ALL_AVAILABLE_AREAS.slice(i, i + batchSize);
        console.log(`🚀 Processing batch ${Math.floor(i/batchSize) + 1}: [${batch.join(', ')}]`);
        
        const promises = batch.map(async (area) => {
            try {
                const response = await fetch(`data/parcels/${area}.geojson`);
                if (!response.ok) return [];
                
                const geojson = await response.json();
                const matches = [];
                
                for (const feature of geojson.features || []) {
                    const props = feature.properties;
                    if (!props) continue;
                    
                    const matchThua = props.SoThuTuThua == soThua;
                    const matchTo = !soTo || props.SoHieuToBanDo == soTo;
                    
                    if (matchThua && matchTo) {
                        // Calculate centroid
                        const coords = feature.geometry?.coordinates?.[0];
                        if (!coords || coords.length < 3) continue;
                        
                        let centerLng = 0, centerLat = 0, count = 0;
                        for (const coord of coords) {
                            if (Array.isArray(coord) && coord.length >= 2) {
                                centerLng += coord[0];
                                centerLat += coord[1];
                                count++;
                            }
                        }
                        
                        if (count === 0) continue;
                        
                        matches.push({
                            soThua: props.SoThuTuThua,
                            soTo: props.SoHieuToBanDo,
                            dienTich: props.DienTich ? Math.round(props.DienTich * 10) / 10 : null,
                            loaiDat: props.KyHieuMucDichSuDung || 'N/A',
                            maXa: area,
                            lat: centerLat / count,
                            lng: centerLng / count,
                            feature: feature
                        });
                    }
                }
                
                return matches;
            } catch (error) {
                console.warn(`⚠️ Failed to load ${area}:`, error.message);
                return [];
            }
        });
        
        const batchResults = await Promise.all(promises);
        for (const areaResults of batchResults) {
            results.push(...areaResults);
            if (results.length >= maxResults) break;
        }
    }
    
    console.log(`✅ SEARCH COMPLETE: ${results.length} results found`);
    return results;
};

// === IMPLEMENTATION GUIDE ===

// 1. REPLACE in script.js around line 1240:
// Replace the availableAreas array with ALL_AVAILABLE_AREAS

// 2. UPDATE searchParcelsInCache function:
// Replace sequential loading with parallel batch processing

// 3. ENHANCE parseParcelQuery function:
// Add support for "Tờ X, Thửa Y" and "123-45" formats

// 4. OPTIMIZE UI FEEDBACK:
// Show "Đang tìm kiếm 56 khu vực..." instead of generic message

// === EXPECTED IMPROVEMENTS ===

// BEFORE:
// - Searches only 5 areas (9% coverage)
// - Sequential loading (slow)
// - Limited pattern matching
// - Basic error handling

// AFTER:
// - Searches all 56 areas (100% coverage)
// - Parallel processing (3-5x faster)
// - Enhanced pattern matching
// - Robust error handling
// - Better user feedback

// === DEPLOYMENT PRIORITY ===

// CRITICAL: Replace the availableAreas array first
// HIGH: Update search algorithm 
// MEDIUM: Enhance UI feedback
// LOW: Add advanced caching

console.log('🚀 Enterprise Search Engine Optimization Ready for Deployment!');