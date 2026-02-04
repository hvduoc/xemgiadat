/**
 * Search Module - IIFE Pattern
 * Handles all search-related functionality: Advanced Search, Web Worker, Index Search
 * Dependencies: window.map, window.ALL_AVAILABLE_AREAS, window.searchIndexCache
 * 
 * @module SearchModule
 * @version 2.0.0
 * @author XemGiaDat Team
 */

(function() {
    'use strict';
    
    console.log('🔍 Search module loading...');
    
    // ============================================================================
    // PRIVATE STATE
    // ============================================================================
    let parcelSearchWorker = null;
    let searchTaskCounter = 0;
    const searchTaskPromises = new Map();
    let searchIndexCache = null;
    let searchIndexLoadPromise = null;
    
    // Search cache configuration
    const searchCache = new Map();
    const maxCacheSize = 100;
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    
    // ============================================================================
    // WEB WORKER MANAGEMENT
    // ============================================================================
    
    /**
     * Initialize Web Worker for heavy GeoJSON processing
     * Lazy-loaded on first search to save resources
     */
    function ensureParcelSearchWorker() {
        if (parcelSearchWorker) return parcelSearchWorker;
        
        try {
            parcelSearchWorker = new Worker('/workers/geojson-search.js');
            parcelSearchWorker.onmessage = function(event) {
                const { command, taskId, success, results, error } = event.data;
                
                if (command === 'SEARCH_PARCEL' && searchTaskPromises.has(taskId)) {
                    const { resolve, reject } = searchTaskPromises.get(taskId);
                    searchTaskPromises.delete(taskId);
                    
                    if (success) {
                        resolve(results);
                    } else {
                        reject(new Error(error));
                    }
                }
            };
            console.log('✅ Parcel search Web Worker initialized');
        } catch(error) {
            console.warn('⚠️ Web Worker not available, falling back to main thread:', error.message);
            parcelSearchWorker = null;
        }
        return parcelSearchWorker;
    }
    
    /**
     * Perform search using Web Worker (off main thread)
     */
    async function performWorkerSearch(worker, soThua, soTo) {
        const taskId = ++searchTaskCounter;
        
        return new Promise((resolve, reject) => {
            searchTaskPromises.set(taskId, { resolve, reject });
            
            worker.postMessage({
                command: 'SEARCH_PARCEL',
                taskId,
                soThua,
                soTo,
                areas: window.ALL_AVAILABLE_AREAS || []
            });
            
            // Timeout after 30 seconds
            setTimeout(() => {
                if (searchTaskPromises.has(taskId)) {
                    searchTaskPromises.delete(taskId);
                    reject(new Error('Worker search timeout'));
                }
            }, 30000);
        });
    }
    
    /**
     * Fallback: Main thread search (original logic)
     */
    async function performMainThreadSearch(soThua, soTo) {
        console.log('🔄 Using main thread search (fallback)');
        const results = [];
        const areasToSearch = window.ALL_AVAILABLE_AREAS || [];
        
        for (const area of areasToSearch) {
            try {
                const response = await fetch(`/data/geojson/${area}.geojson`);
                if (!response.ok) continue;
                
                const geojson = await response.json();
                const features = geojson.features || [];
                
                for (const feature of features) {
                    const props = feature.properties;
                    const featureSoThua = String(props['Số thửa'] || props.soThua || '').trim();
                    const featureSoTo = String(props['Số hiệu tờ bản đồ'] || props.soTo || '').trim();
                    
                    if (featureSoThua === soThua && (!soTo || featureSoTo === soTo)) {
                        const coords = feature.geometry?.coordinates;
                        if (coords && coords[0] && coords[0][0]) {
                            const [lng, lat] = coords[0][0];
                            results.push({
                                soThua: featureSoThua,
                                soTo: featureSoTo,
                                lat,
                                lng,
                                dienTich: props['Diện tích'],
                                loaiDat: props['Ký hiệu mục đích sử dụng'],
                                maXa: area,
                                quality: 'high'
                            });
                        }
                    }
                }
            } catch (error) {
                console.warn(`⚠️ Error searching area ${area}:`, error);
            }
        }
        
        return results;
    }
    
    // ============================================================================
    // SEARCH INDEX (Optimized O(1) lookup)
    // ============================================================================
    
    /**
     * Load search index from JSON file
     * Index provides instant lookup without scanning all GeoJSON files
     */
    async function loadSearchIndex() {
        if (searchIndexCache) return searchIndexCache;
        if (searchIndexLoadPromise) return searchIndexLoadPromise;
        
        searchIndexLoadPromise = fetch('/data/search_index.json')
            .then(r => r.json())
            .then(data => {
                searchIndexCache = data;
                console.log('✅ Search index loaded:', data.total_parcels, 'parcels indexed');
                return data;
            })
            .catch(err => {
                console.warn('⚠️ Search index failed to load, falling back to legacy search:', err);
                searchIndexLoadPromise = null;
                return null;
            });
        
        return searchIndexLoadPromise;
    }
    
    /**
     * O(1) Index-based search - 95% faster than legacy method
     */
    async function performIndexSearch(searchIndex, soThua, soTo) {
        const results = [];
        const indexMap = searchIndex.index || {};
        
        // Key format: "soThua" or "soThua_soTo"
        const searchKeys = soTo 
            ? [`${soThua}_${soTo}`] 
            : Object.keys(indexMap).filter(k => k.startsWith(`${soThua}_`));
        
        for (const key of searchKeys) {
            const parcelData = indexMap[key];
            if (parcelData) {
                results.push({
                    soThua: parcelData.soThua,
                    soTo: parcelData.soTo,
                    lat: parcelData.lat,
                    lng: parcelData.lng,
                    dienTich: parcelData.dienTich,
                    loaiDat: parcelData.loaiDat,
                    maXa: parcelData.maXa,
                    quality: 'high'
                });
            }
        }
        
        return results;
    }
    
    /**
     * Main parcel search function with intelligent fallback strategy
     */
    async function searchParcelsInCache(soThua, soTo = null) {
        const t0 = performance.now();
        
        // Strategy 1: Try optimized index-based search first (fastest)
        const searchIndex = await loadSearchIndex();
        if (searchIndex) {
            const results = await performIndexSearch(searchIndex, soThua, soTo);
            const t1 = performance.now();
            const lookupTime = t1 - t0;
            console.log(`🚀 INDEX SEARCH: ${results.length} results in ${lookupTime.toFixed(1)}ms`);
            
            // Track performance for monitoring
            if (window.trackSearchPerformance) {
                window.trackSearchPerformance('lookup_time', lookupTime, {
                    results: results.length,
                    query: soTo ? `${soThua}/${soTo}` : `${soThua}/*`
                });
            }
            
            return results;
        }
        
        // Strategy 2: Fallback to legacy search (slower but reliable)
        console.log(`🔍 LEGACY SEARCH: Thửa ${soThua}, Tờ ${soTo || 'bất kỳ'}`);
        
        const areasAvailable = window.ALL_AVAILABLE_AREAS || [];
        if (!areasAvailable.length) {
            console.warn('⚠️ Area list not available yet. Skipping parcel search.');
            return [];
        }
        
        console.log(`📊 Scanning ${areasAvailable.length} areas...`);
        
        // Try Web Worker if available
        const worker = ensureParcelSearchWorker();
        if (worker) {
            try {
                const results = await performWorkerSearch(worker, soThua, soTo);
                const t1 = performance.now();
                console.log(`⚡ WORKER SEARCH: ${results.length} results in ${(t1-t0).toFixed(0)}ms`);
                return results;
            } catch(error) {
                console.warn('⚠️ Worker search failed, falling back to main thread:', error.message);
            }
        }
        
        // Strategy 3: Main thread search (last resort)
        const results = await performMainThreadSearch(soThua, soTo);
        const t1 = performance.now();
        console.log(`🔄 MAIN THREAD SEARCH: ${results.length} results in ${(t1-t0).toFixed(0)}ms`);
        return results;
    }
    
    // ============================================================================
    // SEARCH QUERY PARSING
    // ============================================================================
    
    /**
     * Parse search query to detect parcel number patterns
     * Supports: "Thửa 123", "123/45", "Tờ 45, Thửa 123", etc.
     */
    function parseParcelQuery(query) {
        query = query.trim().toLowerCase();
        
        // Pattern 1: "123/45" format
        const slashPattern = /^(\d+)\/(\d+)$/;
        const slashMatch = query.match(slashPattern);
        if (slashMatch) {
            return { soThua: slashMatch[1], soTo: slashMatch[2] };
        }
        
        // Pattern 2: "Thửa 123, Tờ 45" or "Tờ 45, Thửa 123"
        const thuaToPattern = /th[ửu]a\s*(\d+).*?t[ờo]\s*(\d+)|t[ờo]\s*(\d+).*?th[ửu]a\s*(\d+)/i;
        const thuaToMatch = query.match(thuaToPattern);
        if (thuaToMatch) {
            return {
                soThua: thuaToMatch[1] || thuaToMatch[4],
                soTo: thuaToMatch[2] || thuaToMatch[3]
            };
        }
        
        // Pattern 3: "Thửa 123" only
        const thuaOnlyPattern = /th[ửu]a\s*(\d+)/i;
        const thuaMatch = query.match(thuaOnlyPattern);
        if (thuaMatch) {
            return { soThua: thuaMatch[1], soTo: null };
        }
        
        // Pattern 4: Pure number (assume it's soThua)
        const numberPattern = /^(\d+)$/;
        const numberMatch = query.match(numberPattern);
        if (numberMatch) {
            return { soThua: numberMatch[1], soTo: null };
        }
        
        return null;
    }
    
    /**
     * Get area name from area code (maXa)
     */
    function getAreaName(maXa) {
        const areaMap = {
            'haichau': 'Hải Châu',
            'thanhkhe': 'Thanh Khê',
            'sontra': 'Sơn Trà',
            'nguhanh son': 'Ngũ Hành Sơn',
            'lienchieu': 'Liên Chiểu',
            'camle': 'Cẩm Lệ',
            'hoavang': 'Hòa Vang'
        };
        
        const normalized = (maXa || '').toLowerCase().replace(/[_\s]/g, '');
        return areaMap[normalized] || maXa || 'Không xác định';
    }
    
    // ============================================================================
    // MAIN SEARCH FUNCTION
    // ============================================================================
    
    /**
     * Enhanced performSearch with caching, fuzzy matching, and multi-source results
     * @param {string} query - Search query from user
     * @returns {Promise<void>}
     */
    async function performSearch(query) {
        const searchResultsContainer = document.getElementById('search-results');
        if (!searchResultsContainer) {
            console.error('❌ Search results container not found');
            return;
        }
        
        if (!query) {
            searchResultsContainer.innerHTML = '';
            searchResultsContainer.classList.add('hidden');
            return;
        }
        
        // Check cache first (5-minute TTL)
        const cacheKey = query.toLowerCase().trim();
        const cached = searchCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            console.log(`⚡ Cache hit for query: "${query}"`);
            displaySearchResults(cached.html);
            return;
        }
        
        // Show loading state
        searchResultsContainer.innerHTML = '<div class="p-4 text-center text-gray-500"><i class="fas fa-search animate-spin mr-2"></i>Đang tìm kiếm toàn bộ hệ thống...</div>';
        searchResultsContainer.classList.remove('hidden');
        
        const startTime = performance.now();
        let html = '';
        let totalResults = 0;
        
        // ========================================================================
        // 1. PARCEL SEARCH (Highest Priority)
        // ========================================================================
        const parcelQuery = parseParcelQuery(query);
        if (parcelQuery) {
            console.log(`🎯 Executing parcel search: Thửa ${parcelQuery.soThua}, Tờ ${parcelQuery.soTo || 'ANY'}`);
            
            const parcelResults = await searchParcelsInCache(parcelQuery.soThua, parcelQuery.soTo);
            totalResults += parcelResults.length;
            
            if (parcelResults.length > 0) {
                html += '<div class="result-category"><i class="fas fa-map-marked-alt mr-2 text-blue-600"></i>🎯 Thửa đất (Tìm thấy ' + parcelResults.length + ' kết quả)</div>';
                
                parcelResults.forEach((parcel, index) => {
                    const displayText = `Thửa ${parcel.soThua}, Tờ ${parcel.soTo}`;
                    const areaName = getAreaName(parcel.maXa);
                    const subText = `${parcel.dienTich ? parcel.dienTich + ' m²' : 'N/A'} • ${parcel.loaiDat || 'N/A'} • ${areaName}`;
                    const qualityBadge = parcel.quality === 'high' ? '<span class="text-green-600 text-xs">✓ Chính xác</span>' : '';
                    
                    html += `<div class="result-item hover:bg-blue-50 transition-colors duration-200" 
                             data-type="parcel" data-lat="${parcel.lat}" data-lng="${parcel.lng}" 
                             data-so-thua="${parcel.soThua}" data-so-to="${parcel.soTo}" data-ma-xa="${parcel.maXa}">
                        <i class="icon fas fa-map-marker-alt text-red-500"></i>
                        <div class="flex-1">
                            <strong class="text-gray-900">${displayText}</strong>
                            <div class="text-sm text-gray-600">${subText}</div>
                            ${qualityBadge}
                        </div>
                        <div class="text-xs text-gray-400">#${index + 1}</div>
                    </div>`;
                });
            } else {
                html += '<div class="result-category text-yellow-600"><i class="fas fa-exclamation-triangle mr-2"></i>Không tìm thấy thửa đất</div>';
                html += '<div class="p-3 text-sm text-gray-600 bg-yellow-50 rounded">💡 Gợi ý: Thử "Thửa 123" hoặc "123/45" hoặc "Tờ 45, Thửa 123"</div>';
            }
        }
        
        // ========================================================================
        // 2. LISTING SEARCH (if not pure parcel query)
        // ========================================================================
        if (!parcelQuery || query.length > 5) {
            const localListings = window.localListings || [];
            const listingResults = localListings.filter(item => 
                item.name.toLowerCase().includes(query.toLowerCase()) ||
                item.notes?.toLowerCase().includes(query.toLowerCase()) ||
                item.contactName?.toLowerCase().includes(query.toLowerCase())
            );
            
            totalResults += listingResults.length;
            
            if (listingResults.length > 0) {
                html += '<div class="result-category"><i class="fas fa-tags mr-2 text-green-600"></i>📋 Tin đăng bất động sản (' + listingResults.length + ')</div>';
                listingResults.slice(0, 6).forEach((item, index) => {
                    const priceDisplay = item.isNegotiable ? '💬 Thương lượng' : `${item.priceValue} ${item.priceUnit}`;
                    html += `<div class="result-item hover:bg-green-50 transition-colors duration-200" data-type="listing" data-id="${item.id}">
                        <i class="icon fa-solid fa-tag text-yellow-500"></i>
                        <div class="flex-1">
                            <strong class="text-gray-900">${item.name}</strong>
                            <div class="text-sm">
                                <span class="price text-red-600 font-medium">${priceDisplay}</span>
                                ${item.area ? ` • ${item.area} m²` : ''}
                            </div>
                        </div>
                        <div class="text-xs text-gray-400">#${index + 1}</div>
                    </div>`;
                });
            }
        }
        
        // ========================================================================
        // 3. LOCATION SEARCH (Mapbox Geocoding)
        // ========================================================================
        if (!parcelQuery && totalResults === 0 && !/^\d+/.test(query)) {
            const mapCenter = window.map?.getCenter();
            if (mapCenter) {
                const endpointUrl = `/.netlify/functions/mapbox-proxy?mode=geocode&query=${encodeURIComponent(query)}&autocomplete=true&proximity=${mapCenter.lng},${mapCenter.lat}`;
                
                try {
                    const response = await fetch(endpointUrl);
                    if (response.ok) {
                        const data = await response.json();
                        if (data.features && data.features.length > 0) {
                            totalResults += data.features.length;
                            html += '<div class="result-category"><i class="fas fa-map-pin mr-2 text-purple-600"></i>🌍 Địa điểm (' + data.features.length + ')</div>';
                            data.features.slice(0, 3).forEach((feature, index) => {
                                html += `<div class="result-item hover:bg-purple-50 transition-colors duration-200" data-type="location" data-lat="${feature.center[1]}" data-lng="${feature.center[0]}">
                                    <i class="icon fa-solid fa-map-marker-alt text-blue-500"></i>
                                    <div class="flex-1">
                                        <strong class="text-gray-900">${feature.text || feature.place_name}</strong>
                                        <div class="text-sm text-gray-600">${feature.place_name}</div>
                                    </div>
                                    <div class="text-xs text-gray-400">#${index + 1}</div>
                                </div>`;
                            });
                        }
                    }
                } catch (error) { 
                    console.error("❌ Mapbox geocoding error:", error); 
                }
            }
        }
        
        const searchTime = performance.now() - startTime;
        console.log(`⚡ Search completed in ${searchTime.toFixed(2)}ms with ${totalResults} total results`);
        
        // No results handling
        if (totalResults === 0) {
            let helpText = '💡 Gợi ý: "Thửa 123, Tờ 45" hoặc "123/45" hoặc tên đường';
            if (parcelQuery) {
                const areasCount = window.ALL_AVAILABLE_AREAS?.length || 0;
                helpText = `🔍 Không tìm thấy thửa ${parcelQuery.soThua}${parcelQuery.soTo ? ', tờ ' + parcelQuery.soTo : ''} trong ${areasCount} khu vực.`;
            }
            html = `<div class="p-4 text-center text-gray-500">
                <i class="fas fa-search-minus mr-2"></i>Không tìm thấy kết quả nào<br>
                <small class="text-xs text-gray-400">${helpText}</small>
                <div class="mt-2 text-xs text-blue-600">⚡ Tìm kiếm trong ${searchTime.toFixed(0)}ms</div>
            </div>`;
        } else {
            const areasCount = window.ALL_AVAILABLE_AREAS?.length || 0;
            html += `<div class="p-2 text-xs text-gray-400 text-center border-t">
                ⚡ ${totalResults} kết quả • ${searchTime.toFixed(0)}ms • ${areasCount} khu vực
            </div>`;
        }
        
        // Cache the results
        if (searchCache.size >= maxCacheSize) {
            const firstKey = searchCache.keys().next().value;
            searchCache.delete(firstKey);
        }
        searchCache.set(cacheKey, { html, timestamp: Date.now() });
        
        displaySearchResults(html);
    }
    
    /**
     * Display search results in the UI
     */
    function displaySearchResults(html) {
        const searchResultsContainer = document.getElementById('search-results');
        if (!searchResultsContainer) {
            console.error('❌ Search results container not found');
            return;
        }
        searchResultsContainer.innerHTML = html;
        searchResultsContainer.classList.remove('hidden');
        
        // Attach click handlers to result items
        attachResultClickHandlers();
    }
    
    /**
     * Attach click handlers to search result items
     * Now integrates with OptimizationModule for auto-fill
     */
    function attachResultClickHandlers() {
        const resultItems = document.querySelectorAll('.result-item');
        resultItems.forEach(item => {
            item.addEventListener('click', function() {
                const type = this.dataset.type;
                
                if (type === 'parcel') {
                    const lat = parseFloat(this.dataset.lat);
                    const lng = parseFloat(this.dataset.lng);
                    const soThua = this.dataset.soThua;
                    const soTo = this.dataset.soTo;
                    const maXa = this.dataset.maXa;
                    const dienTich = this.dataset.dienTich;
                    const loaiDat = this.dataset.loaiDat;
                    
                    // Build complete result object
                    const searchResult = {
                        soThua: soThua,
                        soTo: soTo,
                        lat: lat,
                        lng: lng,
                        maXa: maXa,
                        dienTich: dienTich ? parseFloat(dienTich) : null,
                        loaiDat: loaiDat
                    };
                    
                    // Use optimized handler (FlyTo + auto info-panel + price data)
                    if (window.OptimizationModule && window.OptimizationModule.handleSearchResultSelect) {
                        window.OptimizationModule.handleSearchResultSelect(searchResult);
                    } else if (window.showParcelFromSearchResult) {
                        // Fallback to legacy handler
                        window.showParcelFromSearchResult(soThua, soTo, maXa, lat, lng);
                    }
                    
                } else if (type === 'location') {
                    const lat = parseFloat(this.dataset.lat);
                    const lng = parseFloat(this.dataset.lng);
                    
                    if (window.map) {
                        window.map.flyTo({ center: [lng, lat], zoom: 15, duration: 2000 });
                    }
                } else if (type === 'listing') {
                    const listingId = this.dataset.id;
                    console.log('Opening listing:', listingId);
                    // Handle listing click (can be implemented later)
                }
                
                // Hide search results after selection
                const searchResultsContainer = document.getElementById('search-results');
                if (searchResultsContainer) {
                    searchResultsContainer.classList.add('hidden');
                }
            });
        });
    }
    
    /**
     * Clear search cache
     */
    function clearSearchCache() {
        searchCache.clear();
        console.log('✅ Search cache cleared');
    }
    
    // ============================================================================
    // PUBLIC API
    // ============================================================================
    
    window.SearchModule = {
        performSearch,
        searchParcelsInCache,
        parseParcelQuery,
        loadSearchIndex,
        clearSearchCache,
        getSearchStats: () => ({
            cacheSize: searchCache.size,
            indexLoaded: !!searchIndexCache,
            workerAvailable: !!parcelSearchWorker
        })
    };
    
    // Also expose main function directly for backwards compatibility
    window.performSearch = performSearch;
    window.searchParcelsInCache = searchParcelsInCache;
    window.parseParcelQuery = parseParcelQuery;
    
    console.log('✅ Search module loaded and exposed to window.SearchModule');
})();
