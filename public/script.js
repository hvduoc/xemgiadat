/*
  ⚠️  FROZEN LEGACY - Production v1 Main Runtime (9187 lines)
  
  WARNING: This file contains ALL v1 application logic.
  Do not edit without approval from @architect.
  See: docs/PROJECT_MAP.md and docs/DO_NOT_EDIT.md
  
  - Firebase Auth/Firestore integration
  - Map initialization & rendering
  - PMTiles/GeoJSON data loading
  - All user-facing features
  
  Migration to v2 is in progress (see src2/).
  v2 will replace this file entirely.
  
  Any change requires:
  1. Code review + architecture approval
  2. Staging test
  3. Production backup
  4. Rollback plan
*/

// =============================================================================
// BOOT GUARD — Prevent multiple initializations (P0 FIX: Single source of truth)
// =============================================================================
if (window.__XGD_BOOT__ && window.__XGD_BOOT__.booted) {
    console.warn('[BOOT] script.js loaded twice - skipping duplicate initialization');
    throw new Error('XGD_DUPLICATE_BOOT');
}
window.__XGD_BOOT__ = window.__XGD_BOOT__ || {
    booted: false,
    bootErrors: [],
    bootTime: null,
    version: '20260201c'
};

// =============================================================================
// Leaflet Icon Path Fix — ensure marker icons resolve from local lib path
// =============================================================================
if (window.L && window.L.Icon && window.L.Icon.Default) {
    window.L.Icon.Default.imagePath = '/lib/leaflet/images/';
}

// =============================================================================
// PERFORMANCE OPTIMIZATION & LAZY LOADING SYSTEM
// Enhanced loading strategies for better user experience
// =============================================================================

// Debug mode - set to false in production to disable debug logs
const DEBUG_PARAMS = new URLSearchParams(window.location.search);
const DEBUG_MODE = window.location.hostname === 'localhost' || DEBUG_PARAMS.get('debug') === '1';
const DEBUG_ALL_LISTINGS = DEBUG_MODE && DEBUG_PARAMS.get('allListings') === '1';
const LITE_MODE = DEBUG_PARAMS.get('lite') === '1';

// Log boot mode once
console.log('[BOOT]', LITE_MODE ? 'LITE_MODE' : 'FULL_MODE', '| v' + window.__XGD_BOOT__.version);
if (DEBUG_MODE) {
    console.log('[MODE] Debug enabled', { debug: DEBUG_MODE, allListings: DEBUG_ALL_LISTINGS, lite: LITE_MODE });
}

// =============================================================================
// 🚨 DIAGNOSTIC: LEGACY APP BOOT CONFIRMATION (only in debug mode)
// =============================================================================
if (DEBUG_MODE) {
    console.log('%c[LEGACY APP BOOTED]', 'background: #ff6b6b; color: white; padding: 4px 8px; font-weight: bold;');
    console.log('[LEGACY] File: script.js (9209 lines)');
    console.log('[LEGACY] Stack: Leaflet + Mapbox v4 + Firebase');
    console.log('[LEGACY] Entry: index.html at /');
    console.log('[LEGACY] Frozen: Do not edit without approval');
}

// Debug log wrapper - only logs in DEBUG_MODE
const debugLog = (...args) => { if (DEBUG_MODE) console.log(...args); };
const debugWarn = (...args) => { if (DEBUG_MODE) console.warn(...args); };

// =============================================================================
// P0 FIX: UTILITY FUNCTIONS FOR SAFE BINDING
// =============================================================================

/**
 * bindOnce - Prevents double-binding event handlers
 * Uses data-xgd-bound attribute to track if handler already attached
 * @param {Element} el - DOM element
 * @param {string} event - Event name (e.g., 'click')
 * @param {Function} handler - Event handler function
 * @param {string} handlerName - Unique name for this handler
 * @returns {boolean} - true if bound, false if already bound
 */
function bindOnce(el, event, handler, handlerName) {
    if (!el) {
        if (DEBUG_MODE) console.warn('[BIND] Element not found for', handlerName);
        return false;
    }
    const boundKey = `xgd-bound-${event}-${handlerName}`;
    if (el.dataset[boundKey]) {
        if (DEBUG_MODE) console.log('[BIND] Already bound:', handlerName);
        return false;
    }
    el.addEventListener(event, handler);
    el.dataset[boundKey] = '1';
    if (DEBUG_MODE) console.log('[BIND] Bound:', handlerName);
    return true;
}

/**
 * Check if we're in lite mode - skip heavy modules
 * Lite mode only loads: map + parcels + query + copy link + deep-link zoom
 */
function isLiteMode() {
    return LITE_MODE === true;
}

/**
 * Guard function for non-essential modules - skip in lite mode
 */
function initIfNotLite(moduleName, initFn) {
    if (isLiteMode()) {
        if (DEBUG_MODE) console.log('[LITE] Skipping:', moduleName);
        return false;
    }
    try {
        initFn();
        if (DEBUG_MODE) console.log('[INIT_OK]', moduleName);
        return true;
    } catch (error) {
        console.error('[INIT_ERR]', moduleName, error);
        window.__XGD_BOOT__.bootErrors.push({
            module: moduleName,
            error: error.message,
            time: Date.now()
        });
        return false;
    }
}

// Runtime error instrumentation (debug only)
if (DEBUG_MODE) {
    window.addEventListener('error', (event) => {
        console.error('[RUNTIME_ERROR]', event.message, event.error || event.filename);
    });
    window.addEventListener('unhandledrejection', (event) => {
        console.error('[RUNTIME_ERROR]', event.reason);
    });
}

// Image lazy loading with Intersection Observer
const initLazyLoading = () => {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('loading-skeleton');
                img.setAttribute('data-loaded', 'true');
                observer.unobserve(img);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '50px'
    });

    // Observe all images with data-src
    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
};

// Performance monitoring (simple)
const simplePerformanceMonitor = {
    marks: new Map(),
    
    mark(name) {
        const mark = performance.now();
        this.marks.set(name, mark);
        return mark;
    },
    
    measure(name, startMark) {
        const start = this.marks.get(startMark);
        const end = performance.now();
        const duration = end - start;
        
        console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
        
        // Send to analytics if available
        if (window.gtag) {
            gtag('event', 'performance_timing', {
                event_category: 'Performance',
                event_label: name,
                value: Math.round(duration),
                custom_parameter_duration: duration
            });
        }
        
        return duration;
    }
};

// Initialize performance optimizations
const initPerformanceOptimizations = () => {
    simplePerformanceMonitor.mark('init-start');
    
    // Initialize lazy loading
    if ('IntersectionObserver' in window) {
        initLazyLoading();
    }
    
    simplePerformanceMonitor.measure('Performance optimization complete', 'init-start');
};

// =============================================================================
// FIREBASE CONFIGURATION & CORE FUNCTIONALITY
// =============================================================================

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyDu9tYpJdMPT7Hvk2_Ug8XHwxRQXoakRfs",
    authDomain: "xemgiadat-dfe15.firebaseapp.com",
    projectId: "xemgiadat-dfe15",
    storageBucket: "xemgiadat-dfe15.appspot.com",
    messagingSenderId: "361952598367",
    appId: "1:361952598367:web:c1e2e3b1a6d5d8c797beea",
    measurementId: "G-XT932D9N1N"
};

// --- MAPBOX ACCESS TOKEN ---
const mapboxAccessToken = "pk.eyJ1IjoiaHZkdW9jIiwiYSI6ImNtZDFwcjVxYTAzOGUybHEzc3ZrNTJmcnIifQ.D5VlPC8c_n1i3kezgqtzwg";

// --- GOOGLE DRIVE API CONFIGURATION ---
const GOOGLE_CONFIG = {
    apiKey: "AIzaSyClLHGUQnD062f6KW-SG1R36pNw-7rmdGI",
    clientId: "895990431722-7oeoa9vmib64n88g29omn5p6jgv7uqvn.apps.googleusercontent.com",
    discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
    scope: "https://www.googleapis.com/auth/drive.file",
    // Add hosted domain and redirect URI for better compatibility
    hostedDomain: "xemgiadat.com",
    redirectUri: "https://xemgiadat.com"
};

// --- IMGUR API CONFIGURATION ---
const IMGUR_CONFIG = {
    clientId: "c9a6efb3d7932fd", // Primary Imgur API
    apiUrl: "https://api.imgur.com/3/image",
    // Backup API keys in case primary fails
    backupKeys: [
        "b7e4d8c2f1a9e63", // Backup 1
        "a4f8e2c1d9b6a73", // Backup 2
        "f1a8d4c2e9b7c36"  // Backup 3
    ]
};

// --- GLOBAL TIMEOUT VARIABLES ---
// Declared early to avoid "Cannot access before initialization" errors
let labelLoadTimeout = null;
let zoomToastTimeout = null;

// Global variables for Google Drive
let isGoogleDriveReady = false;
let googleAuthInstance = null;

// --- SERVICE INITIALIZATION ---
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
const cachedGeojsonByMaXa = {};
const frequentlyUsedXa = ["20194", "20195", "20197", "20198", "20200", "20203", "20206", "20207"]; 
// Cập nhật danh sách các xã/phường có sẵn dữ liệu
// Dựa trên các file .geojson thực tế trong thư mục data/parcels/



async function getCachedAddress(lat, lng) {
  const key = `addr:${lat.toFixed(5)},${lng.toFixed(5)}`;
  const cached = localStorage.getItem(key);
  if (cached) return cached;

  try {
    const endpointUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxAccessToken}&language=vi&limit=1`;
    const response = await fetch(endpointUrl);
    const data = await response.json();
    const result = data.features?.[0]?.place_name || 'Không xác định';
    localStorage.setItem(key, result);
    return result;
  } catch (err) {
    console.error('Lỗi khi lấy địa chỉ:', err);
    return 'Không xác định';
  }
}

    function extractLatLngsFromVectorLayer(layer, map) {
        try {
            const rings = layer._rings?.[0];
            if (!Array.isArray(rings)) return null;

            const coords = rings.map(pt => {
                const latlng = map.layerPointToLatLng(pt);
                return [latlng.lng, latlng.lat];
            });

            // Đảm bảo polygon đóng kín
            if (coords.length > 0 && (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1])) {
                coords.push(coords[0]);
            }

            return {
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [coords]
                }
            };
        } catch (err) {
            console.warn("❌ Không thể dựng GeoJSON từ layer:", err);
            return null;
        }
    }

// =============================================================================
// CENTRALIZED BOOT FUNCTION — All initialization happens here (ONCE)
// =============================================================================

// Helper: Guard secondary DOMContentLoaded handlers (skip if lite mode or already processed)
function __XGD_guardedInit(initName, fn) {
    // Skip if already booted (prevents secondary listener race conditions)
    if (window.__XGD_BOOT__ && window.__XGD_BOOT__.booted) {
        if (DEBUG_MODE) console.log('[SKIP]', initName, '(secondary listener after boot)');
        return;
    }
    
    if (LITE_MODE) {
        if (DEBUG_MODE) console.log('[SKIP]', initName, '(lite mode)');
        return;
    }
    try {
        fn();
        if (DEBUG_MODE) console.log('[INIT_OK]', initName);
    } catch (error) {
        console.error('[INIT_ERR]', initName, error);
        window.__XGD_BOOT__.bootErrors.push({
            phase: 'post-boot',
            name: initName,
            error: error.message,
            time: Date.now()
        });
    }
}

// =============================================================================
// P0 FIX: SINGLE BOOT ENTRY POINT — All map init happens HERE only
// =============================================================================
function __XGD_bootApp() {
    if (window.__XGD_BOOT__.booted) {
        console.warn('[BOOT] Already booted, skipping duplicate init');
        return false;
    }

    window.__XGD_BOOT__.booted = true;
    window.__XGD_BOOT__.bootTime = performance.now();
    
    try {
        // Initialize performance monitoring
        simplePerformanceMonitor.mark('app-init-start');
        
        // Initialize performance optimizations (lazy loading etc)
        initPerformanceOptimizations();

        // P0 FIX: Map initialization happens ONLY HERE
        // Check if Leaflet is available
        if (typeof L === 'undefined') {
            throw new Error('Leaflet not loaded - check script order in index.html');
        }
        
        // --- MAP AND LAYERS INITIALIZATION ---
        // FIXED: maxZoom = 20 to match PMTiles data, ensures click/query works at all zoom levels
        window.map = L.map('map', { 
            center: [16.054456, 108.202167], 
            zoom: 13, 
            zoomControl: false,           // Ẩn zoom control mặc định
            attributionControl: false,    // Ẩn attribution control mặc định
            maxZoom: 20,                  // Match PMTiles maxNativeZoom
            zoomSnap: 0.5,                // Smoother zoom steps on mobile
            wheelDebounceTime: 100,       // Reduce wheel jitter for touchpads/mouse
            tap: true,                    // Better touch handling for iOS
            touchZoom: 'center',          // Zoom to center on pinch (better UX)
            bounceAtZoomLimits: true      // Visual feedback when hitting zoom limit
        });

        // 🚀 PERFORMANCE: Hide loading skeleton as soon as map reports load
        window.map.once('load', () => {
            if (window.hideLoadingSkeleton) window.hideLoadingSkeleton();
            window.__XGD_MAP_READY__ = true;
            window.dispatchEvent(new Event('xgd:map-ready'));
        });
        
        console.log('[BOOT] Map initialized successfully');
        return true;
        
    } catch (error) {
        console.error('[BOOT_ERR] Fatal error during boot:', error);
        window.__XGD_BOOT__.bootErrors.push({
            time: Date.now(),
            error: error.message,
            stack: error.stack
        });
        // Don't throw - let page degrade gracefully
        return false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Defer heavy map boot until after first paint
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            // P0 FIX: Single entry point - boot returns false if already booted
            if (!__XGD_bootApp()) {
                console.warn('[BOOT] Skipping duplicate DOMContentLoaded handler');
                return;
            }
            
            if (DEBUG_MODE) console.log('[BOOT] Continuing with layer setup...');
            
            const myAttribution = '© XemGiaDat | 📌 Dữ liệu tham khảo từ Sở TNMT Đà Nẵng. Không có giá trị pháp lý.';
    const googleStreets = L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',{ maxZoom: 20, subdomains:['mt0','mt1','mt2','mt3'], attribution: myAttribution + ' | © Google Maps' });
    const googleSat = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',{ maxZoom: 20, subdomains:['mt0','mt1','mt2','mt3'], attribution: myAttribution + ' | © Google Satellite' });
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: myAttribution + ' | © OpenStreetMap' });

    // --- KHẮC PHỤC & TỐI ƯU: TÍCH HỢP BẢN ĐỒ PHÂN LÔ TỪ MAPBOX ---

    // 1. Biến toàn cục cho lớp bản đồ và thửa đất được highlight
    let parcelLayer = null;
    let highlightedFeature = null;
    let parcelLabels = L.layerGroup(); // Layer group cho số thửa
    let isLabelsVisible = true; // Biến kiểm soát hiển thị labels

    // 2. URL để tải vector tiles - P0 FIX: Use VectorTileConfig for PMTiles/Mapbox switching
    // Legacy Mapbox tileset deleted - now using local PMTiles
    const tilesetId = 'hvduoc.danang_parcels_final'; // Keep for reference
    // tileUrl is now handled by VectorTileConfig.createVectorLayer()

    
   // 3. Style mặc định cho các thửa đất - tối ưu cho zoom xa
    const parcelStyle = {
        color: '#9CA3AF', // Viền màu xám nhạt hơn (Tailwind gray-400) để mờ mờ
        weight: 0.3,     // Nét viền rất mỏng khi zoom xa
        fill: false,     // TẮT đổ màu nền, chỉ giữ lại viền
        opacity: 0.6     // Độ trong suốt để nhìn mờ mờ đẹp hơn
    };

    // 4. Tùy chọn cho lớp vector tiles - PERFORMANCE OPTIMIZED
    // PMTiles có data từ zoom 10-20 (sau khi chạy create-pmtiles-hd.sh)
    // FIXED: maxZoom = 20 to match PMTiles data, prevents click issues at over-zoom
    const vectorTileOptions = {
        rendererFactory: L.canvas.tile, // Canvas nhanh hơn SVG rất nhiều
        interactive: true,
        minZoom: 10,
        maxZoom: 20,                  // CHANGED: Match maxNativeZoom to fix click issues
        maxNativeZoom: 20,    // PMTiles có max zoom 20
        cache: true,          // PMTiles caching enabled
        updateWhenIdle: true, // CHỈ update khi pan/zoom xong - GIẢM LAG
        updateWhenZooming: false, // KHÔNG update liên tục khi zoom
        keepBuffer: 2,        // Giữ ít tiles hơn để giảm memory
        tolerance: 3,         // Simplify geometry - QUAN TRỌNG cho performance
        getFeatureId: feature => feature.properties.OBJECTID,
        vectorTileLayerStyles: {
            // PMTiles mới dùng layer name 'default'
            'default': function(properties, zoom) {
                if (zoom >= 17) {
                    return {
                        color: '#6B7280', // Gray-500 - rõ hơn ở zoom cận
                        weight: 1,
                        fill: false,
                        opacity: 0.8
                    };
                } else if (zoom >= 15) {
                    return {
                        color: '#9CA3AF', // Gray-400
                        weight: 0.8,
                        fill: false,
                        opacity: 0.7
                    };
                } else if (zoom >= 13) {
                    return {
                        color: '#9CA3AF', // Gray-400
                        weight: 0.6,
                        fill: false,
                        opacity: 0.6
                    };
                } else {
                    return {
                        color: '#D1D5DB', // Gray-300 - nhạt hơn ở zoom xa
                        weight: 0.4,
                        fill: false,
                        opacity: 0.5
                    };
                }
            },
            // Giữ danang_full cho backward compatibility
            'danang_full': function(properties, zoom) {
                if (zoom >= 17) {
                    return {
                        color: '#6B7280',
                        weight: 1,
                        fill: false,
                        opacity: 0.8
                    };
                } else if (zoom >= 15) {
                    return {
                        color: '#9CA3AF',
                        weight: 0.8,
                        fill: false,
                        opacity: 0.7
                    };
                } else if (zoom >= 13) {
                    return {
                        color: '#9CA3AF',
                        weight: 0.6,
                        fill: false,
                        opacity: 0.6
                    };
                } else {
                    return {
                        color: '#D1D5DB',
                        weight: 0.4,
                        fill: false,
                        opacity: 0.5
                    };
                }
            }
        }
    };

    // 5. Tạo lớp bản đồ phân lô với RETRY mechanism để xử lý race condition
    // P0 FIX: Wait for VectorTileConfig/PMTilesAdapter to be ready before creating layer
    function createParcelLayer(retryCount = 0) {
        const MAX_RETRIES = 30; // Increased for PMTiles init time
        const RETRY_DELAY = 200; // ms
        
        try {
            // Check if dependencies are ready
            const leafletReady = typeof L !== 'undefined' && L.vectorGrid;
            // CRITICAL: Check for L.vectorGrid.pmtiles FUNCTION specifically
            const pmtilesMethodReady = leafletReady && typeof L.vectorGrid.pmtiles === 'function';
            const configReady = typeof VectorTileConfig !== 'undefined' && VectorTileConfig.createVectorLayer;
            
            if (!leafletReady) {
                if (retryCount < MAX_RETRIES) {
                    console.warn(`⏳ [${retryCount + 1}/${MAX_RETRIES}] Waiting for Leaflet.VectorGrid...`);
                    setTimeout(() => createParcelLayer(retryCount + 1), RETRY_DELAY);
                    return;
                }
                throw new Error('Leaflet.VectorGrid not available after max retries');
            }
            
            // P0 FIX: Wait for pmtiles method to be available before proceeding
            // This prevents falling back to Mapbox when PMTiles is just slow to init
            if (!pmtilesMethodReady && retryCount < MAX_RETRIES) {
                console.warn(`⏳ [${retryCount + 1}/${MAX_RETRIES}] Waiting for L.vectorGrid.pmtiles()...`);
                setTimeout(() => createParcelLayer(retryCount + 1), RETRY_DELAY);
                return;
            }
            
            // Create the layer
            let layer;
            if (configReady && pmtilesMethodReady) {
                layer = VectorTileConfig.createVectorLayer(vectorTileOptions);
                console.log('✅ Using VectorTileConfig:', VectorTileConfig.getConfig());
            } else if (pmtilesMethodReady) {
                console.log('✅ Using L.vectorGrid.pmtiles directly');
                layer = L.vectorGrid.pmtiles('/tiles/danang_parcels_final.pmtiles', vectorTileOptions);
            } else {
                // Last resort: This should NOT happen in production
                console.error('❌ PMTiles not available after max retries - tiles will not load');
                console.error('❌ Check that pmtiles.js and PMTilesAdapter.js are loading correctly');
                layer = L.layerGroup(); // Empty layer to prevent crash
            }
            
            // Add error handler
            layer.on('tileerror', function(e) {
                if (e.error && !e.error.message?.includes('404')) {
                    console.warn('Lỗi tải vector tile:', e.error);
                }
            });
            
            // Assign to parcelLayer and add to map
            parcelLayer = layer;
            if (map && !map.hasLayer(parcelLayer)) {
                parcelLayer.addTo(map);
                console.log('✅ Parcel layer added to map');
                
                // Add to layer control if available
                if (window._layerControl) {
                    window._layerControl.addOverlay(parcelLayer, "🗺️ Bản đồ phân lô");
                }
            }
            
        } catch (err) {
            console.warn('Map layer failed to load (non-fatal):', err);
            parcelLayer = L.layerGroup();
        }
    }
    
    // Start the layer creation with retry
    createParcelLayer();
    
    // 6. System để hiển thị số thửa từ vector tiles
    let tileLabels = new Map(); // Store labels by tile coordinates
    const MIN_LABEL_ZOOM = 16;
    
    // Event listener khi vector tile được load - setup after layer is ready
    function setupParcelLayerEvents() {
        if (!parcelLayer || typeof parcelLayer.on !== 'function') {
            // Retry if parcelLayer not ready yet
            setTimeout(setupParcelLayerEvents, 300);
            return;
        }
        
        parcelLayer.on('loading', function(e) {
            // Clear labels when new tiles are loading
            if (map.getZoom() < MIN_LABEL_ZOOM) {
                parcelLabels.clearLayers();
            }
        });
        console.log('✅ Parcel layer events attached');
    }
    setupParcelLayerEvents();
    
    // Function to create label from vector feature
    function createLabelFromVectorFeature(layer, properties) {
        if (!properties.SoThuTuThua || map.getZoom() < MIN_LABEL_ZOOM) return null;
        
        try {
            // Get centroid of the layer
            const bounds = layer.getBounds();
            const center = bounds.getCenter();
            
            const label = L.marker(center, {
                icon: L.divIcon({
                    className: 'parcel-number-label',
                    html: properties.SoThuTuThua,
                    iconSize: [null, null],
                    iconAnchor: [10, 6] // Center the label
                }),
                interactive: false,
                pane: 'overlayPane'
            });
            
            return label;
        } catch (error) {
            return null;
        }
    }
    
    // Function to update labels - now using optimized version
    function updateParcelLabels() {
        // Redirect to optimized version
        updateParcelLabelsOptimized();
    }
    
    // Old heavy loading function removed for performance optimization
    
    // Add labels when tiles are loaded - moved to setupParcelLayerEvents
    function setupParcelLayerAddEvent() {
        if (!parcelLayer || typeof parcelLayer.on !== 'function') {
            setTimeout(setupParcelLayerAddEvent, 300);
            return;
        }
        parcelLayer.on('add', function(e) {
            if (map.getZoom() >= MIN_LABEL_ZOOM) {
                setTimeout(updateParcelLabels, 200);
            }
        });
    }
    setupParcelLayerAddEvent();
    
        async function fetchAndDrawDimensions(maXa, soTo, soThua) {
        dimensionMarkers.clearLayers(); // Xóa nhãn cũ nếu có

        const geojsonUrl = `data/parcels/${maXa}.geojson`;

        try {
            const response = await fetch(geojsonUrl);
            if (!response.ok) {
                console.warn("❌ Không thể tải file GeoJSON:", geojsonUrl);
                return;
            }

            const geojson = await response.json();

            const feature = geojson.features.find(f => {
                const props = f.properties || {};
                return (
                    props.SoHieuToBanDo == soTo &&
                    props.SoThuTuThua == soThua
                );
            });

            if (!feature) {
                console.warn(`❌ Không tìm thấy thửa ${soTo}/${soThua} trong xã ${maXa}`);
                return;
            }

            drawDimensions(feature);
        } catch (err) {
            console.error("❌ Lỗi khi truy cập GeoJSON:", err);
        }
    }
    
    // --- BẠN HÃY THAY THẾ TOÀN BỘ KHỐI parcelLayer.on('click',...) BẰNG PHIÊN BẢN ĐÃ SỬA LỖI NÀY ---

    parcelLayer.on('click', async function(e) { // Giữ nguyên "async"
        if (!isQueryMode) return; 

        const props = e.layer.properties;
        if (!props || !props.OBJECTID) return;

        // --- Logic cũ của bạn để highlight và lấy thông tin thửa đất ---
        L.DomEvent.stop(e);
        hideInfoPanel();
        highlightedFeature = props.OBJECTID;
        parcelLayer.setFeatureStyle(highlightedFeature, {
            color: '#EF4444',
            weight: 3,
            fillColor: '#EF4444',
            fill: true,
            fillOpacity: 0.3
        });
        // --- Kết thúc logic cũ ---

        // ⭐️⭐️⭐️ BƯỚC SỬA LỖI: GỌI LẠI HÀM VẼ KÍCH THƯỚC ⭐️⭐️⭐️
        const maXa = props.MaXa;
        const soTo = props.SoHieuToBanDo;
        const soThua = props.SoThuTuThua;
        if (maXa && soTo && soThua) {
            fetchAndDrawDimensions(maXa, soTo, soThua);
        }
        // ⭐️⭐️⭐️ KẾT THÚC SỬA LỖI ⭐️⭐️⭐️


        // --- Các bước lấy địa chỉ và hiển thị thông tin vẫn giữ nguyên như cũ ---
        
        // 1. Chuẩn bị các thông tin có sẵn
        const formattedProps = {
            'Số thửa': props.SoThuTuThua,
            'Số hiệu tờ bản đồ': props.SoHieuToBanDo,
            'Diện tích': props.DienTich,
            'Ký hiệu mục đích sử dụng': props.KyHieuMucDichSuDung,
            'Địa chỉ': '<i class="text-gray-400">Đang tìm địa chỉ...</i>' // Thêm địa chỉ với trạng thái chờ
        };

        // 2. Gọi hàm hiển thị ngay lập tức với trạng thái chờ
        showInfoPanel('Thông tin Thửa đất', formattedProps, e.latlng.lat, e.latlng.lng);

        // 3. Lấy địa chỉ từ Mapbox một cách bất đồng bộ
        try {
            const geocodingUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${e.latlng.lng},${e.latlng.lat}.json?access_token=${mapboxAccessToken}&language=vi&types=address,poi,locality,place`;
            const response = await fetch(geocodingUrl);
            const data = await response.json();

            let finalAddress = "Không xác định";
            if (data.features && data.features.length > 0) {
                finalAddress = data.features[0].place_name_vi || data.features[0].place_name;
            }

            // 4. Cập nhật lại thông tin địa chỉ và gọi lại hàm hiển thị
            formattedProps['Địa chỉ'] = finalAddress;
            showInfoPanel('Thông tin Thửa đất', formattedProps, e.latlng.lat, e.latlng.lng);

        } catch (error) {
            console.error("Lỗi khi lấy địa chỉ từ Mapbox:", error);
            formattedProps['Địa chỉ'] = "Lỗi khi tìm địa chỉ";
            showInfoPanel('Thông tin Thửa đất', formattedProps, e.latlng.lat, e.latlng.lng);
        }
    });

    // FALLBACK: Query features khi click không hit được layer (zoom cao)
    // Sử dụng L.VectorGrid internal method để tìm features
    function queryFeaturesAtPoint(latlng, callback) {
        if (!parcelLayer || !parcelLayer._vectorTiles) {
            callback(null);
            return;
        }
        
        const point = map.latLngToContainerPoint(latlng);
        const features = [];
        
        // Iterate through all loaded tiles
        for (const key in parcelLayer._vectorTiles) {
            const tile = parcelLayer._vectorTiles[key];
            if (!tile || !tile._features) continue;
            
            // Check each feature in the tile
            for (const featureKey in tile._features) {
                const feature = tile._features[featureKey];
                if (!feature || !feature.feature) continue;
                
                // Check if point is inside feature bounds
                try {
                    const featureBounds = feature.getBounds ? feature.getBounds() : null;
                    if (featureBounds && featureBounds.contains(latlng)) {
                        features.push(feature.feature);
                    }
                } catch (e) {
                    // Ignore errors for individual features
                }
            }
        }
        
        callback(features.length > 0 ? features[0] : null);
    }


    // --- KẾT THÚC KHẮC PHỤC ---

    // IMPORTANT: Add base map FIRST - this must work regardless of parcel layer status
    // CHANGED: Default to OpenStreetMap (lighter, faster for mobile users)
    osmLayer.addTo(map);
    console.log('✅ Base map (OpenStreetMap) added - optimized for mobile');
    
    // Add parcel labels layer (empty initially, will be populated when tiles load)
    parcelLabels.addTo(map);
    
    // Base maps for custom layer control
    const baseMaps = { "Ảnh vệ tinh": googleSat, "Bản đồ đường": googleStreets, "OpenStreetMap": osmLayer };
    
    // Overlay maps for custom layer control
    const overlayMaps = { 
        "🏷️ Số thửa": parcelLabels 
    };
    
    // Store maps globally for custom layer panel
    window._baseMaps = baseMaps;
    window._overlayMaps = overlayMaps;
    window._currentBaseLayer = 'OpenStreetMap';
    
    // Add parcel layer to overlay maps when ready
    if (parcelLayer && typeof parcelLayer.addTo === 'function') {
        window._overlayMaps["🗺️ Bản đồ phân lô"] = parcelLayer;
        console.log('✅ Parcel layer added to overlay maps');
    }
    
    // Tối ưu: Performance-focused event handling
    let zoomTimeout = null;
    let moveTimeout = null;
    
    map.on('zoomstart', function() {
        // Tạm ẩn labels khi đang zoom để tăng performance
        if (isLabelsVisible) {
            parcelLabels.clearLayers();
        }
    });
    
    map.on('zoomend', function() {
        clearTimeout(zoomTimeout);
        zoomTimeout = setTimeout(() => {
            const currentZoom = map.getZoom();
            
            // Show toast when user hits max zoom limit
            if (currentZoom >= 20) {
                showZoomLimitToast();
            }
            
            if (currentZoom < 12) {
                // Zoom quá xa - giảm opacity và tắt interaction
                if (map.hasLayer(parcelLayer)) {
                    parcelLayer.setOpacity(0.1);
                    parcelLayer.options.interactive = false;
                }
            } else {
                // Zoom đủ gần - bật lại
                parcelLayer.setOpacity(1);
                parcelLayer.options.interactive = true;
            }
        }, 100); // Debounce zoom events
    });
    
    // Toast notification for zoom limit (mobile-friendly)
    let zoomToastTimeout = null;
    function showZoomLimitToast() {
        // Prevent spam - only show once every 3 seconds
        if (document.getElementById('zoom-limit-toast')) return;
        
        const toast = document.createElement('div');
        toast.id = 'zoom-limit-toast';
        toast.className = 'fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-[9999] animate-fade-in';
        toast.innerHTML = '📍 Đã phóng to tối đa. Click vào thửa đất để tra cứu!';
        toast.style.cssText = 'animation: fadeInUp 0.3s ease-out; max-width: 90vw; text-align: center;';
        document.body.appendChild(toast);
        
        clearTimeout(zoomToastTimeout);
        zoomToastTimeout = setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease-out forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    map.on('movestart', function() {
        // Clear labels khi đang di chuyển để tăng performance
        clearTimeout(labelLoadTimeout);
    });


    // --- DOM ELEMENT SELECTION ---
    const modal = document.getElementById('form-modal');
    const listModal = document.getElementById('price-list-modal');
    const form = document.getElementById('location-form');
    const instructionBanner = document.getElementById('instruction-banner');
    const authContainer = document.getElementById('auth-container');
    const loginBtn = document.getElementById('login-btn');
    const userProfileDiv = document.getElementById('user-profile');
    const profileMenu = document.getElementById('profile-menu');
    const updateProfileBtn = document.getElementById('update-profile-btn');
    const logoutBtnMenu = document.getElementById('logout-btn-menu');
    const firebaseuiContainer = document.getElementById('firebaseui-auth-container');
    
    // 🔧 FIX: LAZY-LOAD FirebaseUI only on login click (TBT OPTIMIZATION)
    // FirebaseUI may not be loaded yet due to defer script loading race condition
    let ui = null;
    let firebaseUIInitialized = false;
    
    function ensureFirebaseUiCss() {
        const existing = document.querySelector('link[href*="firebase-ui-auth.css"]');
        if (existing) return;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://www.gstatic.com/firebasejs/ui/4.8.1/firebase-ui-auth.css';
        document.head.appendChild(link);
        console.log('✅ FirebaseUI CSS injected');
    }
    
    function initFirebaseUI() {
        if (firebaseUIInitialized) return ui; // Already initialized
        
        if (typeof firebaseui === 'undefined' || !firebaseui.auth) {
            console.warn('⚠️ FirebaseUI not yet loaded');
            return null;
        }
        
        try {
            ensureFirebaseUiCss();
            ui = new firebaseui.auth.AuthUI(auth);
            firebaseUIInitialized = true;
            console.log('✅ FirebaseUI initialized on-demand (lazy load)');
            return ui;
        } catch (err) {
            console.error('❌ Failed to initialize FirebaseUI:', err);
            return null;
        }
    }
    
    // 🚀 LAZY LOAD: Initialize FirebaseUI only when login button is clicked
    // This prevents 50KB FirebaseUI parsing on non-authenticated users
    if (loginBtn) {
        loginBtn.addEventListener('click', function(e) {
            if (!firebaseUIInitialized) {
                console.log('🔄 Initializing FirebaseUI on first login click...');
                const uiInstance = initFirebaseUI();
                if (uiInstance) {
                    // Show FirebaseUI container
                    if (firebaseuiContainer) {
                        firebaseuiContainer.classList.remove('hidden');
                    }
                    // Start auth flow
                    uiInstance.start('#firebaseui-auth-container', {
                        signInOptions: [
                            firebase.auth.EmailAuthProvider.PROVIDER_ID,
                            {
                                provider: firebase.auth.GoogleAuthProvider.PROVIDER_ID,
                                scopes: ['profile', 'email']
                            }
                        ],
                        signInFlow: 'popup',
                        callbacks: {
                            signInSuccessWithAuthResult: function(authResult, redirectUrl) {
                                console.log('✅ Sign in successful');
                                return false;
                            }
                        }
                    });
                } else {
                    console.warn('⚠️ FirebaseUI library not ready yet');
                }
            }
        });
    }
    
    const opacityControl = document.getElementById('opacity-control');
    const opacitySlider = document.getElementById('opacity-slider');
    const addLocationBtn = document.getElementById('add-location-btn');
    const listBtn = document.getElementById('list-btn');
    const queryBtn = document.getElementById('query-btn');
    const searchInput = document.getElementById('search-input');
    const searchResultsContainer = document.getElementById('search-results');
    const infoPanel = document.getElementById('info-panel');
    const panelTitle = document.getElementById('panel-title');
    const panelContent = document.getElementById('panel-content');
    const closePanelBtn = document.getElementById('close-panel-btn');
    const togglePanelBtn = document.getElementById('toggle-panel-btn');
    const locateBtn = document.getElementById('locate-btn');
    const actionToolbar = document.getElementById('action-toolbar');
    const contactInfoBtn = document.getElementById('contact-info-btn');
    const contactInfoModal = document.getElementById('contact-info-modal');
    const closeContactModalBtn = document.getElementById('close-contact-modal');
    const guideBtn = document.getElementById('guide-btn');
    const feedbackBtn = document.getElementById('feedback-btn');
    const feedbackModal = document.getElementById('feedback-modal');
    const closeFeedbackModalBtn = document.getElementById('close-feedback-modal');
    const adminBtn = document.getElementById('admin-btn');
    
    // Initialize portfolio DOM elements
    portfolioBtn = document.getElementById('portfolio-menu-btn'); // Changed from 'portfolio-btn' to 'portfolio-menu-btn'
    portfolioModal = document.getElementById('portfolio-modal');
    closePortfolioModal = document.getElementById('close-portfolio-modal');
    addPortfolioModal = document.getElementById('add-portfolio-modal');
    closeAddPortfolioModal = document.getElementById('close-add-portfolio-modal');
    portfolioForm = document.getElementById('portfolio-form');

    // Debug: Check if critical elements exist (non-essential elements removed)
    if (typeof DEBUG_MODE !== 'undefined' && DEBUG_MODE) {
        console.log('🔍 Button elements check:', {
            contactInfoBtn: !!contactInfoBtn,
            contactInfoModal: !!contactInfoModal,
            locateBtn: !!locateBtn,
            loginBtn: !!loginBtn
        });

        const bindTargets = [
            { id: 'login-btn', el: loginBtn, handler: 'auth-login' },
            { id: 'query-btn', el: queryBtn, handler: 'enterQueryMode' },
            { id: 'add-location-btn', el: addLocationBtn, handler: 'enterAddMode' },
            { id: 'list-btn', el: listBtn, handler: 'toggleListModal' },
            { id: 'locate-btn', el: locateBtn, handler: 'locateUser' },
            { id: 'contact-info-btn', el: contactInfoBtn, handler: 'openContactModal' }
        ];

        bindTargets.forEach((t) => {
            if (t.el) {
                console.log('[BIND_OK]', t.id, t.handler);
            } else {
                console.warn('[BIND_MISSING]', t.id, t.handler);
            }
        });
    }

    // === IMMEDIATE EVENT LISTENERS SETUP ===
    // Setup button event listeners immediately after DOM element declarations
    
    // Feedback system - Setup immediately
    if (feedbackBtn && feedbackModal && closeFeedbackModalBtn) {
        console.log('✅ Setting up feedback button listeners...');
        feedbackBtn.addEventListener('click', () => {
            console.log('👆 Feedback button clicked!');
            // Use utility function for consistent modal management
            showModal(feedbackModal);
        });

        closeFeedbackModalBtn.addEventListener('click', () => {
            console.log('❌ Closing feedback modal');
            hideModal(feedbackModal);
        });

        feedbackModal.addEventListener('click', (e) => {
            if (e.target === feedbackModal) {
                hideModal(feedbackModal);
            }
        });
    } else {
        // Feedback button removed from UI - feedback is now accessed via Contact modal
        if (typeof DEBUG_MODE !== 'undefined' && DEBUG_MODE) {
            console.log('ℹ️ Feedback accessed via Contact modal (feedback-btn removed)');
        }
    }

    // Enhanced guide button with visual feedback
    if (guideBtn) {
        guideBtn.addEventListener('mousedown', function() {
            guideBtn.classList.add('pressed');
        });
        
        guideBtn.addEventListener('mouseup', function() {
            setTimeout(() => guideBtn.classList.remove('pressed'), 100);
        });
        
        guideBtn.addEventListener('mouseleave', function() {
            guideBtn.classList.remove('pressed');
        });
        
        guideBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('📖 Guide button clicked');
            window.open('guide.html', '_blank');
        });
    }

    // Admin button (visible only for admin users after login)
    if (adminBtn) {
        adminBtn.addEventListener('click', () => {
            console.log('⚙️ Admin button clicked');
            window.open('admin.html', '_blank');
        });
    }

    // Contact info modal
    if (contactInfoBtn && contactInfoModal && closeContactModalBtn) {
        contactInfoBtn.addEventListener('click', () => {
            console.log('ℹ️ Contact info button clicked');
            console.log('📱 Contact modal element:', contactInfoModal);
            console.log('📱 Modal classes before:', contactInfoModal.className);

            // Use modal helper to ensure consistent state
            showModal(contactInfoModal);

            console.log('📱 Modal classes after:', contactInfoModal.className);
            setupInfoAccordion();
        });

        closeContactModalBtn.addEventListener('click', () => {
            hideModal(contactInfoModal);
        });

        contactInfoModal.addEventListener('click', (e) => {
            if (e.target === contactInfoModal) {
                hideModal(contactInfoModal);
            }
        });
        
        // Open feedback from contact modal button
        const openFeedbackFromContact = document.getElementById('open-feedback-from-contact');
        if (openFeedbackFromContact && feedbackModal) {
            openFeedbackFromContact.addEventListener('click', () => {
                hideModal(contactInfoModal);
                setTimeout(() => showModal(feedbackModal), 200);
            });
        }
    }

    // Portfolio modal event listeners
    // Portfolio button event listener - MOVED TO PROFILE MENU
    if (portfolioBtn) {
        console.log('✅ Portfolio button found (now in menu)');
        
        // Add test function to window for debugging
        window.testPortfolioModal = function() {
            console.log('🧪 Testing portfolio modal manually...');
            const modal = document.getElementById('portfolio-modal');
            if (modal) {
                showModal(modal);
            } else {
                console.error('❌ Portfolio modal not found');
            }
        };
        
        // NOTE: Event listener now handled in profile menu section (portfolio-menu-btn)
        
        // Test button accessibility (debug only)
        if (typeof DEBUG_MODE !== 'undefined' && DEBUG_MODE) {
            console.log('🔍 Portfolio button properties:', {
                id: portfolioBtn.id,
                className: portfolioBtn.className,
                visible: portfolioBtn.offsetParent !== null
            });
        }
    } else {
        if (typeof DEBUG_MODE !== 'undefined' && DEBUG_MODE) {
            console.log('⚠️ Portfolio button not found - using menu item instead');
        }
    }

    if (closePortfolioModal) {
        closePortfolioModal.addEventListener('click', () => {
            hideModal(portfolioModal);
        });
    }

    if (portfolioModal) {
        portfolioModal.addEventListener('click', (e) => {
            if (e.target === portfolioModal) {
                hideModal(portfolioModal);
            }
        });
    }

    // Add portfolio modal event listeners
    if (closeAddPortfolioModal) {
        closeAddPortfolioModal.addEventListener('click', () => {
            hideModal(addPortfolioModal);
            portfolioForm.reset();
            delete portfolioForm.dataset.editingId;
            selectedParcelData = null;
        });
    }

    if (document.getElementById('cancel-portfolio-form')) {
        document.getElementById('cancel-portfolio-form').addEventListener('click', () => {
            hideModal(addPortfolioModal);
            portfolioForm.reset();
            delete portfolioForm.dataset.editingId;
            selectedParcelData = null;
        });
    }

    if (addPortfolioModal) {
        addPortfolioModal.addEventListener('click', (e) => {
            if (e.target === addPortfolioModal) {
                hideModal(addPortfolioModal);
                portfolioForm.reset();
                delete portfolioForm.dataset.editingId;
                selectedParcelData = null;
            }
        });
    }

    // Portfolio form submission
    if (portfolioForm) {
        portfolioForm.addEventListener('submit', handlePortfolioFormSubmit);
    }

    // Portfolio filter change
    if (document.getElementById('portfolio-filter')) {
        document.getElementById('portfolio-filter').addEventListener('change', renderPortfolioList);
    }

    // Add portfolio button in modal
    if (document.getElementById('add-to-portfolio-btn')) {
        document.getElementById('add-to-portfolio-btn').addEventListener('click', () => {
            // Reset form for new item
            portfolioForm.reset();
            delete portfolioForm.dataset.editingId;
            selectedParcelData = null;
            document.getElementById('add-portfolio-title').innerHTML = '<i class="fa-solid fa-plus mr-2 text-indigo-600"></i>Thêm vào Ví BĐS';
            showModal(addPortfolioModal);
        });
    }

    // --- INITIALIZE LISTENERS & SETUP ---
    let debounceTimer;
    let dimensionMarkers = L.layerGroup().addTo(map); // Thêm vào map để dễ quản lý
    let userLocationMarker = null;
    let priceMarkers = L.markerClusterGroup({
        iconCreateFunction: function (cluster) {
            const count = cluster.getChildCount();
            let size = ' marker-cluster-';
            if (count < 10) size += 'small'; else if (count < 100) size += 'medium'; else size += 'large';
            return new L.DivIcon({ html: `<div><span>${count}</span></div>`, className: `marker-cluster marker-cluster-yellow${size}`, iconSize: new L.Point(40, 40) });
        }
    }).addTo(map);

    // --- HELPER FUNCTIONS ---
    window.openStreetView = (lat, lng) => window.open(`http://maps.google.com/?q=&layer=c&cbll=${lat},${lng}`, '_blank');

    function showInfoPanel(title, props, lat, lng) {
        
        infoPanel.classList.remove('is-collapsed');
        togglePanelBtn.querySelector('i').classList.replace('fa-chevron-up', 'fa-chevron-down');

        panelTitle.textContent = title;
        const soTo = props['Số hiệu tờ bản đồ'] ?? 'N/A';
        const soThua = props['Số thửa'] ?? 'N/A';
        const loaiDat = props['Ký hiệu mục đích sử dụng'] ?? 'N/A';
        const dienTich = props['Diện tích'] ? parseFloat(props['Diện tích']).toFixed(1) : 'N/A';
        const diaChi = (props['Địa chỉ'] && props['Địa chỉ'] !== 'Null') ? props['Địa chỉ'] : 'Chưa có';

        panelContent.innerHTML = `
        <div class="info-row">
            <span class="info-label">Thửa số:</span><strong class="info-value">${soThua}</strong>
            <span class="info-label ml-4">Tờ bản đồ:</span><strong class="info-value">${soTo}</strong>
        </div>
        <div class="info-row">
            <span class="info-label">Loại đất:</span><strong class="info-value">${loaiDat}</strong>
            <span class="info-label ml-4">Diện tích:</span><strong class="info-value">${dienTich} m²</strong>
        </div>
        <div class="info-row">
            <span class="info-label">Địa chỉ:</span><span class="info-value text-left flex-1">${diaChi}</span>
        </div>
        <div id="panel-actions">
            <button onclick="getDirections(${lat}, ${lng})">
                <i class="icon fas fa-directions text-blue-600"></i>
                <span class="text">Chỉ đường</span>
            </button>
            <button onclick="openStreetView(${lat}, ${lng})">
                <i class="icon fas fa-street-view text-green-600"></i>
                <span class="text">Street View</span>
            </button>
            <button onclick="copyLocationLink(${lat}, ${lng})">
                <i class="icon fas fa-link text-gray-500"></i>
                <span class="text">Sao chép</span>
            </button>
            <button onclick="addToPortfolioFromPanel('${soThua}', '${soTo}', '${loaiDat}', ${dienTich}, ${lat}, ${lng})">
                <i class="icon fas fa-briefcase text-indigo-600"></i>
                <span class="text">Thêm vào ví</span>
            </button>
            <button onclick="toggleShareMenu()" id="share-btn">
                <i class="icon fas fa-share-alt text-indigo-600"></i>
                <span class="text">Chia sẻ</span>
            </button>
            <div id="share-submenu">
            <button onclick="share('facebook', ${lat}, ${lng}, '${soTo}', '${soThua}')" title="Facebook">
                <i class="icon fab fa-facebook-f text-blue-700"></i>
            </button>
            <button onclick="share('whatsapp', ${lat}, ${lng}, '${soTo}', '${soThua}')" title="WhatsApp">
                <i class="icon fab fa-whatsapp text-green-500"></i>
            </button>
            </div>
        </div>`;

        infoPanel.classList.add('is-open');
        actionToolbar.classList.add('is-raised');
    }

    // Quick function to show parcel info from search results
    async function showParcelFromSearchResult(soThua, soTo, maXa, lat, lng) {
        // Highlight the parcel on map if it's a vector tile
        try {
            // Try to find and highlight the parcel in vector tiles
            await queryAndDisplayParcelByLatLng(lat, lng);
        } catch (error) {
            // If vector tile method fails, show basic info
            const basicProps = {
                'Số thửa': soThua,
                'Số hiệu tờ bản đồ': soTo,
                'Diện tích': 'Đang tải...',
                'Ký hiệu mục đích sử dụng': 'Đang tải...',
                'Địa chỉ': 'Đang tìm địa chỉ...'
            };
            showInfoPanel('Thông tin Thửa đất', basicProps, lat, lng);
            
            // Load detailed info from GeoJSON
            fetchAndDrawDimensions(maXa, soTo, soThua);
        }
    }

    // --- BẮT ĐẦU CODE MỚI: Thêm hàm này vào file script.js ---

    async function queryAndDisplayParcelByLatLng(lat, lng) {
        console.log('🔍 Starting parcel query:', { lat, lng });
        
        // Kiểm tra xem map đã sẵn sàng chưa
        if (!window.map) {
            console.error('❌ Map not available for parcel query');
            return;
        }
        
        // Hiển thị một thông báo cho người dùng biết hệ thống đang xử lý
        const loadingPopup = L.popup()
            .setLatLng([lat, lng])
            .setContent('Đang tìm thông tin thửa đất tại đây...')
            .openOn(window.map);

        const tilesetId = 'hvduoc.danang_parcels_final'; // Lấy từ code của bạn
        const queryUrl = `https://api.mapbox.com/v4/${tilesetId}/tilequery/${lng},${lat}.json?limit=1&access_token=${mapboxAccessToken}`;
        
        console.log('🌐 Making request to:', queryUrl);

        try {
            const response = await fetch(queryUrl);
            const data = await response.json();
            
            console.log('📡 Received response:', data);

            if (!data.features || data.features.length === 0) {
                console.log('⚠️ No parcel found at coordinates');
                loadingPopup.setContent('Không tìm thấy thửa đất nào tại vị trí này.');
                setTimeout(() => window.map.closePopup(loadingPopup), 3000); // Tự đóng sau 3s
                return;
            }

            // Đã tìm thấy thửa đất!
            console.log('✅ Found parcel:', data.features[0]);
            window.map.closePopup(loadingPopup); // Đóng thông báo loading
            const feature = data.features[0];
            const props = feature.properties;

            // 1. Xóa các thông tin cũ và highlight thửa đất mới
            hideInfoPanel();
            highlightedFeature = props.OBJECTID;
            if (parcelLayer && typeof parcelLayer.setFeatureStyle === 'function') {
                parcelLayer.setFeatureStyle(highlightedFeature, {
                    color: '#EF4444', weight: 3, fillColor: '#EF4444', fill: true, fillOpacity: 0.3
                });
            }

            // 2. Vẽ kích thước thửa đất
            if (props.MaXa && props.SoHieuToBanDo && props.SoThuTuThua) {
                fetchAndDrawDimensions(props.MaXa, props.SoHieuToBanDo, props.SoThuTuThua);
            }

            // 3. Hiển thị bảng thông tin (sao chép logic từ hàm on.click)
            const formattedProps = {
                'Số thửa': props.SoThuTuThua,
                'Số hiệu tờ bản đồ': props.SoHieuToBanDo,
                'Diện tích': props.DienTich,
                'Ký hiệu mục đích sử dụng': props.KyHieuMucDichSuDung,
                'Địa chỉ': '<i class="text-gray-400">Đang tìm địa chỉ...</i>'
            };
            showInfoPanel('Thông tin Thửa đất', formattedProps, lat, lng);

            // 4. Lấy địa chỉ và cập nhật lại bảng thông tin
            const finalAddress = await getCachedAddress(lat, lng); // Dùng lại hàm getCachedAddress bạn đã có
            formattedProps['Địa chỉ'] = finalAddress;
            showInfoPanel('Thông tin Thửa đất', formattedProps, lat, lng);

        } catch (error) {
            console.error("Lỗi khi truy vấn thửa đất từ tọa độ:", error);
            loadingPopup.setContent('Đã xảy ra lỗi. Vui lòng thử lại.');
            setTimeout(() => window.map.closePopup(loadingPopup), 3000);
        }
    }
    // --- KẾT THÚC CODE MỚI ---
  
    async function showListingInfoPanel(item) {
        const ADMIN_UID = "FEpPWWT1EaTWQ9FOqBxWN5FeEJk1";
        const currentUser = firebase.auth().currentUser;
        const isAdmin = currentUser && currentUser.uid === ADMIN_UID;
        const infoPanel = document.getElementById('info-panel');
        const panelTitle = document.getElementById('panel-title');
        const panelContent = document.getElementById('panel-content');

        let userProfile = {
            name: item.userName || 'Người dùng ẩn danh',
            avatar: item.userAvatar || 'https://placehold.co/60x60/e2e8f0/64748b?text=A',
        };
        
        let fetchedAddress = 'Đang tải địa chỉ...';
        try {
            fetchedAddress = await getCachedAddress(item.lat, item.lng);
        } catch (error) { fetchedAddress = 'Lỗi khi tải địa chỉ.'; }

        const price = `${item.priceValue} ${item.priceUnit}`;
        const area = item.area ? `${item.area} m²` : 'N/A';
        const notes = item.notes || 'Không có';
        const lat = item.lat.toFixed(6);
        const lng = item.lng.toFixed(6);
        
        // Transaction type labels
        const transactionTypeLabels = {
            'ban-dat': '🟢 Bán Đất',
            'ban-nha': '🏘️ Bán Nhà',
            'ban-can-ho': '🏢 Bán Căn Hộ',
            'ban-biet-thu': '🏡 Bán Biệt Thự',
            'ban-kho-xuong': '🏭 Bán Kho/Xưởng',
            'cho-thue-dat': '🟡 Cho Thuê Đất',
            'cho-thue-nha': '🏠 Cho Thuê Nhà',
            'cho-thue-can-ho': '🏢 Cho Thuê Căn Hộ',
            'cho-thue-phong-tro': '🚪 Cho Thuê Phòng',
            'cho-thue-mat-bang': '🏪 Cho Thuê Mặt Bằng',
            'cho-thue-van-phong': '💼 Cho Thuê Văn Phòng',
            'sang-nhuong': '🔄 Sang Nhượng',
            'can-mua': '🔍 Cần Mua',
            'can-thue': '🔍 Cần Thuê'
        };
        const transactionType = item.transactionType ? transactionTypeLabels[item.transactionType] || item.transactionType : '';
        const propertyType = item.propertyType || '';
        const legalStatus = item.legalStatus || '';

        let adminDeleteButtonHtml = '';
        if (isAdmin) {
            adminDeleteButtonHtml = `<a class="action-button admin-delete-button" onclick="deleteListing('${item.id}')"><i class="fas fa-trash-alt"></i><span>Xóa tin</span></a>`;
        }

        let contactIconsHtml = '';
        if (item.contactPhone) {
            contactIconsHtml += `<a href="tel:${item.contactPhone}" class="contact-button" title="Gọi điện"><i class="fas fa-phone-alt"></i></a>`;
            contactIconsHtml += `<a href="https://wa.me/${item.contactPhone.replace(/[^0-9]/g, '')}" target="_blank" class="contact-button" title="WhatsApp"><i class="fab fa-whatsapp"></i></a>`;
            contactIconsHtml += `<a href="https://zalo.me/${item.contactPhone.replace(/[^0-9]/g, '')}" target="_blank" class="contact-button" title="Zalo"><i class="fas fa-comment-dots"></i></a>`;
        }
        if (item.contactEmail) {
            contactIconsHtml += `<a href="mailto:${item.contactEmail}" class="contact-button" title="Email"><i class="fas fa-envelope"></i></a>`;
        }
        if (item.contactFacebook) {
            const fbLink = item.contactFacebook.startsWith('http') ? item.contactFacebook : `https://facebook.com/${item.contactFacebook}`;
            contactIconsHtml += `<a href="${fbLink}" target="_blank" class="contact-button" title="Xem trang Facebook của người đăng"><i class="fab fa-facebook"></i></a>`;
        }

        panelTitle.textContent = item.name;
        panelContent.innerHTML = `
            ${transactionType ? `<div class="transaction-type-badge">${transactionType}</div>` : ''}
            <div class="price-highlight">${price}</div>
            <div class="info-pills">
                <span class="pill-item"><i class="fas fa-ruler-combined"></i> ${area}</span>
                ${propertyType ? `<span class="pill-item"><i class="fas fa-home"></i> ${propertyType}</span>` : ''}
                ${legalStatus ? `<span class="pill-item"><i class="fas fa-file-contract"></i> ${legalStatus}</span>` : ''}
            </div>
            ${notes !== 'Không có' ? `<div class="property-description"><i class="fas fa-align-left"></i> ${notes}</div>` : ''}
            <div class="address-actions-group">
                <div class="address-text"><i class="fas fa-map-marker-alt"></i> ${fetchedAddress}</div>
                <div class="action-buttons-group">
                    <a class="action-button" onclick="getDirections(${lat}, ${lng})"><i class="fas fa-directions"></i><span>Chỉ đường</span></a>
                    <a class="action-button" onclick="openStreetView(${lat}, ${lng})"><i class="fas fa-street-view"></i><span>Street View</span></a>
                    <a class="action-button" onclick="copyLocationLink(${lat}, ${lng})"><i class="fas fa-link"></i><span>Sao chép</span></a>
                    <a class="action-button" onclick="share('facebook', ${lat}, ${lng}, '${item.name.replace(/'/g,"\\'")}')"><i class="fab fa-facebook"></i><span>Chia sẻ</span></a>
                    ${adminDeleteButtonHtml}
                </div>
            </div>
            <div class="poster-card">
                <img src="${userProfile.avatar}" alt="Avatar" class="poster-avatar-small">
                <div class="poster-name">${userProfile.name}</div>
                <div class="poster-contact-buttons">${contactIconsHtml}</div>
            </div>`;

        infoPanel.classList.remove('is-collapsed');
        infoPanel.classList.add('is-open');
    }

    function hideInfoPanel() {
        infoPanel.classList.remove('is-open');
        actionToolbar.classList.remove('is-raised', 'is-partially-raised');
        if (highlightedFeature) {
            parcelLayer.resetFeatureStyle(highlightedFeature);
            highlightedFeature = null;
        }
        dimensionMarkers.clearLayers();
    }

    function vectorTileFeatureToGeoJSON(layer) {
        try {
            const latlngs = layer.getLatLngs?.();
            if (!latlngs || latlngs.length === 0) return null;

            const coords = latlngs[0].map(p => [p.lng, p.lat]);
            coords.push(coords[0]); // Đảm bảo khép kín vòng

            return {
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [coords]
                }
            };
        } catch (err) {
            console.warn("⚠ Không thể tạo GeoJSON từ layer:", err);
            return null;
        }
    }

    // Thay thế hàm drawDimensions cũ bằng phiên bản mới này
    
    function drawDimensions(feature) {
        dimensionMarkers.clearLayers();

        if (!feature?.geometry?.coordinates) {
            console.warn("❌ Không có geometry hợp lệ để vẽ.");
            return;
        }

        let coords = feature.geometry.type === 'Polygon'
            ? feature.geometry.coordinates?.[0]
            : feature.geometry.coordinates?.[0]?.[0];

        if (!Array.isArray(coords) || coords.length < 2) {
            console.warn("❌ Không đủ tọa độ để vẽ kích thước.");
            return;
        }

        const MIN_DISPLAY_DIST = 2; // m

        let shortGroup = [];
        let totalShortDist = 0;

        function drawLabel(points, dist) {
            const flat = points.flat();
            const midIdx = Math.floor(flat.length / 2);
            const mid = flat.length % 2 === 0
                ? [
                    (flat[midIdx - 1][0] + flat[midIdx][0]) / 2,
                    (flat[midIdx - 1][1] + flat[midIdx][1]) / 2
                ]
                : flat[midIdx];
            const latlng = L.latLng(mid[1], mid[0]);

            const marker = L.marker(latlng, {
                icon: L.divIcon({
                    className: 'dimension-label-container',
                    html: `<div class="dimension-label">${Math.round(dist)}</div>`
                })
            });
            dimensionMarkers.addLayer(marker);
        }

        for (let i = 0; i < coords.length - 1; i++) {
            const p1 = coords[i];
            const p2 = coords[i + 1];
            const pt1 = L.latLng(p1[1], p1[0]);
            const pt2 = L.latLng(p2[1], p2[0]);
            const dist = pt1.distanceTo(pt2);

            if (dist < MIN_DISPLAY_DIST) {
                // Gom nhóm các cạnh nhỏ liên tiếp
                shortGroup.push([p1, p2]);
                totalShortDist += dist;
            } else {
                // Trước khi xử lý cạnh dài, vẽ nhóm ngắn nếu có
                if (shortGroup.length > 0 && totalShortDist >= MIN_DISPLAY_DIST) {
                    drawLabel(shortGroup, totalShortDist);
                }
                shortGroup = [];
                totalShortDist = 0;

                // Vẽ cạnh dài
                drawLabel([[p1, p2]], dist);
            }
        }

        // Vẽ nhóm ngắn cuối nếu còn
        if (shortGroup.length > 0 && totalShortDist >= MIN_DISPLAY_DIST) {
            drawLabel(shortGroup, totalShortDist);
        }
    }

    async function loadUserProfile() {
        try {
            const userDoc = await db.collection("users").doc(currentUser.uid).get();
            if (userDoc.exists) {
                const profile = userDoc.data();
                document.getElementById('profile-name').value = profile.displayName || '';
                document.getElementById('profile-email').value = profile.email || '';
                document.getElementById('profile-phone').value = profile.phone || '';
                document.getElementById('profile-zalo').value = profile.zalo || '';
                document.getElementById('profile-whatsapp').value = profile.whatsapp || '';
                document.getElementById('profile-facebook').value = profile.contactFacebook || '';
            }
        } catch (error) {
            console.error("Lỗi tải hồ sơ:", error);
        }
    }

    // KHẮC PHỤC: Xóa hàm performCadastralQuery vì không còn cần thiết.

    // --- BẮT ĐẦU THAY ĐỔI: Thay thế toàn bộ hàm handleUrlParameters ---
    function handleUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        const lat = urlParams.get('lat');
        const lng = urlParams.get('lng');
        
        if (lat && lng) {
            console.log('🔗 Processing URL parameters:', { lat, lng });
            
            // Đảm bảo map đã được khởi tạo
            if (!window.map) {
                console.error('❌ Map not initialized yet, retrying...');
                setTimeout(() => handleUrlParameters(), 500);
                return;
            }
            
            const targetLatLng = L.latLng(parseFloat(lat), parseFloat(lng));
            console.log('📍 Setting map view to:', targetLatLng);
            
            // Phóng to bản đồ tới vị trí
            window.map.setView(targetLatLng, 19);

            // Đợi một chút để map render xong rồi mới query parcel
            setTimeout(() => {
                console.log('🔍 Querying parcel at coordinates...');
                if (typeof queryAndDisplayParcelByLatLng === 'function') {
                    queryAndDisplayParcelByLatLng(parseFloat(lat), parseFloat(lng));
                } else {
                    console.error('❌ queryAndDisplayParcelByLatLng function not available');
                }
            }, 1000);
        }
    }
    // --- KẾT THÚC THAY ĐỔI ---

    function enterAddMode() {
    exitAllModes();
    isAddMode = true;
    map.getContainer().classList.add('map-add-mode');
    addLocationBtn.classList.add('active-tool');
    const instructionText = document.getElementById('instruction-text');
    if (instructionText) {
        instructionText.textContent = 'Nhấp vào bản đồ để chọn vị trí cần thêm.';
    }
    if (instructionBanner) {
        instructionBanner.classList.remove('hidden');
        setTimeout(() => instructionBanner.classList.add('hidden'), 3500);
    }
    }

    function enterQueryMode() {
    exitAllModes();
    isQueryMode = true;
    map.getContainer().classList.add('map-query-mode');
    queryBtn.classList.add('active-tool');
    const instructionText = document.getElementById('instruction-text');
    if (instructionText) {
        instructionText.textContent = 'Nhấp vào một thửa đất trên bản đồ để xem thông tin.';
    }
    if (instructionBanner) {
        instructionBanner.classList.remove('hidden');
        setTimeout(() => instructionBanner.classList.add('hidden'), 3500);
    }
    }

    function clearAllToolbarStates() {
        // Clear all active states from toolbar buttons
        const toolbarButtons = document.querySelectorAll('.toolbar-btn-compact');
        toolbarButtons.forEach(btn => {
            btn.classList.remove('active-tool', 'pressed');
        });
    }
    
    function exitAllModes() {
        isAddMode = false;
        isQueryMode = false;
        map.getContainer().classList.remove('map-add-mode', 'map-query-mode');
        addLocationBtn.classList.remove('active-tool');
        queryBtn.classList.remove('active-tool');
        if (instructionBanner) instructionBanner.classList.add('hidden');
        if (tempMarker) {
            map.removeLayer(tempMarker);
            tempMarker = null;
        }
    }
    
    async function prefillUserContact() {
        if (!currentUser) return;
        try {
            const userDoc = await db.collection("users").doc(currentUser.uid).get();
            if (userDoc.exists) {
                const profile = userDoc.data();
                document.getElementById('contact-name').value = profile.displayName || '';
                document.getElementById('email').value = profile.email || '';
                document.getElementById('phone').value = profile.phone || '';
                document.getElementById('facebook').value = profile.contactFacebook || '';
            }
        } catch (error) {
            console.error("Lỗi khi lấy hồ sơ người dùng:", error);
        }
    }

    window.deleteListing = async function(listingId) {
        if (!listingId) {
            alert('Không tìm thấy ID của tin đăng.');
            return;
        }
        if (confirm('Bạn có chắc chắn muốn xóa vĩnh viễn tin đăng này không?')) {
            try {
                await db.collection('listings').doc(listingId).delete();
                alert('Đã xóa tin đăng thành công!');
                hideInfoPanel();
                // không cần reload, onSnapshot sẽ tự cập nhật
            } catch (error) {
                console.error("Lỗi khi xóa tin đăng: ", error);
                alert('Có lỗi xảy ra khi xóa tin đăng.');
            }
        }
    }

    window.getDirections = function(toLat, toLng) {
        if (!navigator.geolocation) return alert('Trình duyệt của bạn không hỗ trợ định vị.');
        alert('Đang lấy vị trí của bạn để chỉ đường...');
        navigator.geolocation.getCurrentPosition( (position) => {
            const fromLat = position.coords.latitude;
            const fromLng = position.coords.longitude;
            window.open(`https://maps.google.com/maps?saddr=${fromLat},${fromLng}&daddr=${toLat},${toLng}`, '_blank');
        }, () => {
            alert('Không thể lấy được vị trí của bạn. Vui lòng kiểm tra quyền truy cập vị trí của trình duyệt.');
        });
    };

    window.copyLocationLink = function(lat, lng) {
        const url = `${window.location.origin}${window.location.pathname}?lat=${lat}&lng=${lng}`;
        navigator.clipboard.writeText(url).then(() => {
            alert('Đã sao chép liên kết vị trí!');
        }).catch(err => console.error('Lỗi sao chép: ', err));
    };

    window.toggleShareMenu = function() {
        document.getElementById('share-submenu').classList.toggle('is-visible');
    };

    window.share = function(platform, lat, lng, titleOrSoTo, soThua) {
        const indexUrl = `${window.location.origin}${window.location.pathname}?lat=${lat}&lng=${lng}`;
        // og.html is a small page that sets Open Graph meta for a specific lat/lng then redirects.
        const ogUrl = `${window.location.origin}/og.html?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}${titleOrSoTo ? `&soTo=${encodeURIComponent(titleOrSoTo)}` : ''}${soThua ? `&soThua=${encodeURIComponent(soThua)}` : ''}`;
        // Support two call styles:
        // share(platform, lat, lng, title)  OR  share(platform, lat, lng, soTo, soThua)
        let text = 'Khám phá vị trí trên Bản đồ Giá đất Cộng đồng!';
        if (soThua) {
            text = `Khám phá thửa đất (Thửa: ${soThua}, Tờ: ${titleOrSoTo}) tại Đà Nẵng trên Bản đồ Giá đất Cộng đồng!`;
        } else if (titleOrSoTo) {
            text = `${titleOrSoTo} — Xem chi tiết tại ${window.location.hostname}`;
        }

        let shareUrl = '';
        if (platform === 'facebook') {
            // Use indexUrl so the shared post includes the coordinate link (index page with lat/lng)
            shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(indexUrl)}&quote=${encodeURIComponent(text)}`;
        } else if (platform === 'whatsapp') {
            shareUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + indexUrl)}`;
        }
        if (shareUrl) window.open(shareUrl, '_blank', 'width=600,height=400');
        toggleShareMenu();
    };

    // === ENHANCED SEARCH SYSTEM WITH FULL COVERAGE ===
    
    // Prioritized search order - common areas first for better UX
    const PRIORITY_AREAS = ['20194', '20195', '20197', '20198', '20200', '20203', '20206', '20207'];
    
    // Complete list of all available areas for comprehensive search (lazy-loaded)
    let ALL_AVAILABLE_AREAS = [];
    let maxaListLoadPromise = null;
    
    async function ensureMaxaListLoaded() {
        if (ALL_AVAILABLE_AREAS.length) return ALL_AVAILABLE_AREAS;
        if (!maxaListLoadPromise) {
            maxaListLoadPromise = fetch('/data/maxa_list.json', { cache: 'force-cache' })
                .then(response => (response.ok ? response.json() : []))
                .catch(() => [])
                .then(list => {
                    if (Array.isArray(list)) {
                        ALL_AVAILABLE_AREAS = list.map(String);
                    } else {
                        ALL_AVAILABLE_AREAS = [];
                    }
                    if (!ALL_AVAILABLE_AREAS.length) {
                        ALL_AVAILABLE_AREAS = [...PRIORITY_AREAS];
                    }
                    return ALL_AVAILABLE_AREAS;
                });
        }
        return maxaListLoadPromise;
    }
    
    // Parse Vietnamese parcel input formats with enhanced pattern matching
    function parseParcelQuery(query) {
        const patterns = [
            /(?:thửa|thua)\s*(\d+)[\s,]*(?:tờ|to)\s*(\d+)/i, // "Thửa 123, Tờ 45"
            /(?:tờ|to)\s*(\d+)[\s,]*(?:thửa|thua)\s*(\d+)/i, // "Tờ 45, Thửa 123"
            /(\d+)\/(\d+)/, // "123/45" format
            /(\d+)-(\d+)/, // "123-45" format
            /^(\d+)$/ // Just number - assume parcel number
        ];
        
        for (let i = 0; i < patterns.length; i++) {
            const pattern = patterns[i];
            const match = query.match(pattern);
            if (match) {
                if (i === 4) { // Just number
                    return { soThua: match[1], soTo: null };
                } else if (i === 1) { // Reversed order "Tờ X, Thửa Y"
                    return { soThua: match[2], soTo: match[1] };
                } else {
                    return { soThua: match[1], soTo: match[2] };
                }
            }
        }
        return null;
    }
    
    // Advanced parallel search with smart loading strategy
    // Now optimized with Web Worker for heavy GeoJSON processing
    let parcelSearchWorker = null;
    let searchTaskCounter = 0;
    const searchTaskPromises = new Map();
    
    // Initialize Web Worker (lazy loaded on first search)
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
    
    async function searchParcelsInCache(soThua, soTo = null) {
        await ensureMaxaListLoaded();
        console.log(`🔍 ENTERPRISE SEARCH: Thửa ${soThua}, Tờ ${soTo || 'bất kỳ'}`);
        console.log(`📊 Scanning ${ALL_AVAILABLE_AREAS.length} areas for comprehensive results...`);
        if (!ALL_AVAILABLE_AREAS.length) {
            console.warn('⚠️ Maxa list not available yet. Skipping parcel search.');
            return [];
        }
        
        // Try to use Web Worker if available, fall back to main thread
        const worker = ensureParcelSearchWorker();
        
        if (worker) {
            // Use Web Worker for heavy processing
            try {
                return await performWorkerSearch(worker, soThua, soTo);
            } catch(error) {
                console.warn('⚠️ Worker search failed, falling back to main thread:', error.message);
                // Fall through to main thread search
            }
        }
        
        // Fallback: Main thread search (original logic)
        return await performMainThreadSearch(soThua, soTo);
    }
    
    // Helper: Web Worker search
    async function performWorkerSearch(worker, soThua, soTo) {
        const taskId = ++searchTaskCounter;
        const searchOrder = [...PRIORITY_AREAS, ...ALL_AVAILABLE_AREAS.filter(area => !PRIORITY_AREAS.includes(area))];
        
        return new Promise((resolve, reject) => {
            searchTaskPromises.set(taskId, { resolve, reject });
            
            worker.postMessage({
                command: 'SEARCH_PARCEL',
                taskId,
                payload: {
                    soThua,
                    soTo,
                    areas: searchOrder
                }
            });
            
            // Timeout after 10 seconds
            setTimeout(() => {
                if (searchTaskPromises.has(taskId)) {
                    searchTaskPromises.delete(taskId);
                    reject(new Error('Worker search timeout'));
                }
            }, 10000);
        });
    }
    
    // Helper: Main thread search (fallback)
    async function performMainThreadSearch(soThua, soTo) {
        const results = [];
        const maxResults = 12;
        const maxConcurrent = 6;
        
        const searchOrder = [...PRIORITY_AREAS, ...ALL_AVAILABLE_AREAS.filter(area => !PRIORITY_AREAS.includes(area))];
        
        const searchArea = async (maXa) => {
            if (!cachedGeojsonByMaXa[maXa]) {
                try {
                    const response = await fetch(`data/parcels/${maXa}.geojson`);
                    if (response.ok) {
                        const geojson = await response.json();
                        cachedGeojsonByMaXa[maXa] = geojson;
                    } else {
                        return [];
                    }
                } catch (error) {
                    return [];
                }
            }
            
            const geojson = cachedGeojsonByMaXa[maXa];
            if (!geojson || !geojson.features) return [];
            
            const matches = [];
            for (const feature of geojson.features) {
                const props = feature.properties;
                if (!props) continue;
                
                const matchThua = props.SoThuTuThua == soThua;
                const matchTo = !soTo || props.SoHieuToBanDo == soTo;
                
                if (matchThua && matchTo) {
                    let coords = feature.geometry?.coordinates?.[0];
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
                        feature: feature,
                        area: maXa,
                        quality: 'high'
                    });
                }
            }
            return matches;
        };
        
        for (let i = 0; i < searchOrder.length && results.length < maxResults; i += maxConcurrent) {
            const batch = searchOrder.slice(i, i + maxConcurrent);
            
            try {
                const batchPromises = batch.map(area => searchArea(area));
                const batchResults = await Promise.all(batchPromises);
                
                for (const areaResults of batchResults) {
                    results.push(...areaResults);
                    if (results.length >= maxResults) break;
                }
            } catch (error) {
                console.error('Batch processing error:', error);
            }
        }
        
        console.log(`🎯 SEARCH COMPLETE: ${results.length} results found`);
        return results.slice(0, maxResults);
    }

// Global search performance cache
const searchCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const maxCacheSize = 100;

// Enhanced search with caching and fuzzy matching
const performSearch = async (query) => {
    if (!query) {
        searchResultsContainer.innerHTML = '';
        searchResultsContainer.classList.add('hidden');
        return;
    }
    
    // Check cache first
    const cacheKey = query.toLowerCase().trim();
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log(`⚡ Cache hit for query: "${query}"`);
        displaySearchResults(cached.html);
        return;
    }
    
    await ensureMaxaListLoaded();
    searchResultsContainer.innerHTML = '<div class="p-4 text-center text-gray-500"><i class="fas fa-search animate-spin mr-2"></i>Đang tìm kiếm toàn bộ hệ thống...</div>';
    searchResultsContainer.classList.remove('hidden');
    
    const startTime = performance.now();
    let html = '';
    let totalResults = 0;
    
    // 1. ENHANCED PARCEL SEARCH (highest priority)
    const parcelQuery = parseParcelQuery(query);
    if (parcelQuery) {
        console.log(`🎯 Executing enterprise parcel search for: Thửa ${parcelQuery.soThua}, Tờ ${parcelQuery.soTo || 'ANY'}`);
        
        const parcelResults = await searchParcelsInCache(parcelQuery.soThua, parcelQuery.soTo);
        totalResults += parcelResults.length;
        
        if (parcelResults.length > 0) {
            html += '<div class="result-category"><i class="fas fa-map-marked-alt mr-2 text-blue-600"></i>🎯 Thửa đất (Tìm thấy ' + parcelResults.length + ' kết quả)</div>';
            
            parcelResults.forEach((parcel, index) => {
                const displayText = `Thửa ${parcel.soThua}, Tờ ${parcel.soTo}`;
                const areaName = getAreaName(parcel.maXa); // We'll add this helper
                const subText = `${parcel.dienTich ? parcel.dienTich + ' m²' : 'N/A'} • ${parcel.loaiDat} • ${areaName}`;
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
    
    // 2. LISTING SEARCH (if not pure parcel query)
    if (!parcelQuery || query.length > 5) {
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
    
    // 3. LOCATION SEARCH (only when not pure parcel query and no exact matches)
    if (!parcelQuery && totalResults === 0 && !/^\d+/.test(query)) {
        const mapCenter = map.getCenter();
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
    
    const searchTime = performance.now() - startTime;
    console.log(`⚡ Search completed in ${searchTime.toFixed(2)}ms with ${totalResults} total results`);
    
    // Performance summary
    if (totalResults === 0) {
        let helpText = '💡 Gợi ý: "Thửa 123, Tờ 45" hoặc "123/45" hoặc tên đường';
        if (parcelQuery) {
            helpText = `🔍 Không tìm thấy thửa ${parcelQuery.soThua}${parcelQuery.soTo ? ', tờ ' + parcelQuery.soTo : ''} trong ${ALL_AVAILABLE_AREAS.length} khu vực. Vui lòng kiểm tra lại số thửa.`;
        }
        html = `<div class="p-4 text-center text-gray-500">
            <i class="fas fa-search-minus mr-2"></i>Không tìm thấy kết quả nào<br>
            <small class="text-xs text-gray-400">${helpText}</small>
            <div class="mt-2 text-xs text-blue-600">⚡ Đã tìm kiếm ${ALL_AVAILABLE_AREAS.length} khu vực trong ${searchTime.toFixed(0)}ms</div>
        </div>`;
    } else {
        html += `<div class="p-2 text-xs text-gray-400 text-center border-t">
            ⚡ ${totalResults} kết quả • ${searchTime.toFixed(0)}ms • ${ALL_AVAILABLE_AREAS.length} khu vực
        </div>`;
    }
    
    // Cache the results
    if (searchCache.size >= maxCacheSize) {
        const firstKey = searchCache.keys().next().value;
        searchCache.delete(firstKey);
    }
    searchCache.set(cacheKey, { html, timestamp: Date.now() });
    
    displaySearchResults(html);
};

// Helper function to display search results
function displaySearchResults(html) {
    searchResultsContainer.innerHTML = html;
    searchResultsContainer.classList.remove('hidden');
}

// Helper function to get area name from code
function getAreaName(maXa) {
    const areaNames = {
        '20194': 'Hải Châu 1',
        '20195': 'Hải Châu 2', 
        '20197': 'Thạch Thang',
        '20198': 'Phước Ninh',
        '20200': 'Hòa Thuận Tây',
        '20203': 'Hòa Thuận Đông',
        '20206': 'Nam Dương',
        '20207': 'Bình Hiên',
        // Add more area mappings as needed
    };
    return areaNames[maXa] || `Khu vực ${maXa}`;
}

// Show community parcel information
async function showCommunityParcelInfo(parcelNumber, mapSheet) {
        const key = `${parcelNumber}_${mapSheet}`;
        const contribution = communityContributions.get(key);
        
        if (!contribution) {
            showToast('❌ Không tìm thấy thông tin thửa đất', 'error');
            return;
        }
        
        const official = contribution.officialData;
        const community = contribution.communityData;
        
        // Try to find and highlight the actual parcel
        try {
            const result = await searchParcelsInCache(parcelNumber, mapSheet);
            if (result && result.length > 0) {
                const feature = result[0];
                highlightParcel(feature);
            }
        } catch (error) {
            console.warn('Could not highlight parcel:', error);
        }
        
        // Show enhanced info panel
        const panel = document.getElementById('info-panel');
        const title = document.getElementById('panel-title');
        const content = document.getElementById('panel-content');

        title.innerHTML = `
            Thửa ${parcelNumber}, Tờ ${mapSheet}
            <span class="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Cộng đồng</span>
        `;
        
        content.innerHTML = `
            <div class="space-y-3 text-sm">
                <!-- Official Data -->
                <div class="p-3 bg-gray-50 rounded-lg">
                    <h4 class="font-bold text-gray-800 mb-2">📋 Thông tin chính thức</h4>
                    <div class="space-y-1 text-xs">
                        <div class="flex justify-between">
                            <span class="text-gray-600">Diện tích:</span>
                            <span class="font-medium">${official.area} m²</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Mục đích sử dụng:</span>
                            <span class="font-medium">${getLandUseLabel(official.landUse)}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Khu vực:</span>
                            <span class="font-medium">${official.adminCode}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Community Data -->
                <div class="p-3 bg-green-50 rounded-lg border border-green-200">
                    <h4 class="font-bold text-green-800 mb-2">
                        <i class="fas fa-users mr-1"></i>Thông tin từ cộng đồng
                    </h4>
                    <div class="space-y-2 text-xs">
                        ${community.projectName ? `
                            <div>
                                <span class="text-green-700 font-medium">🏗️ Dự án:</span>
                                <span class="ml-1">${community.projectName}</span>
                            </div>
                        ` : ''}
                        
                        ${community.lotNumber ? `
                            <div>
                                <span class="text-green-700 font-medium">📍 Số lô:</span>
                                <span class="ml-1">${community.lotNumber}</span>
                            </div>
                        ` : ''}
                        
                        ${community.blockCode ? `
                            <div>
                                <span class="text-green-700 font-medium">🏘️ Block:</span>
                                <span class="ml-1">${community.blockCode}</span>
                            </div>
                        ` : ''}
                        
                        ${community.commonName ? `
                            <div>
                                <span class="text-green-700 font-medium">🏷️ Tên gọi:</span>
                                <span class="ml-1">${community.commonName}</span>
                            </div>
                        ` : ''}
                        
                        ${community.marketPrice ? `
                            <div>
                                <span class="text-green-700 font-medium">💰 Giá thị trường:</span>
                                <span class="ml-1 font-bold text-green-800">
                                    ${community.marketPrice} triệu${community.priceUnit === 'per_m2' ? '/m²' : ''}
                                </span>
                            </div>
                        ` : ''}
                        
                        ${community.brokerCode ? `
                            <div>
                                <span class="text-green-700 font-medium">🔖 Mã môi giới:</span>
                                <span class="ml-1">${community.brokerCode}</span>
                            </div>
                        ` : ''}
                        
                        ${community.description ? `
                            <div class="mt-2 pt-2 border-t border-green-200">
                                <span class="text-green-700 font-medium">📝 Mô tả:</span>
                                <p class="mt-1 text-gray-700">${community.description}</p>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <!-- Actions -->
                <div class="flex space-x-2">
                    <button class="flex-1 bg-green-500 text-white py-2 rounded text-xs hover:bg-green-600 transition" 
                            onclick="shareParcelInfo('${parcelNumber}', '${mapSheet}')">
                        <i class="fas fa-share mr-1"></i>Chia sẻ
                    </button>
                    <button class="flex-1 bg-blue-500 text-white py-2 rounded text-xs hover:bg-blue-600 transition" 
                            onclick="openContributionModalForParcel('${parcelNumber}', '${mapSheet}')">
                        <i class="fas fa-edit mr-1"></i>Cập nhật
                    </button>
                </div>
                
                <!-- Contributor info -->
                <div class="pt-2 border-t text-xs text-gray-500">
                    <i class="fas fa-user mr-1"></i>
                    Đóng góp bởi: ${contribution.contributor.userName || 'Người dùng'}
                    <span class="ml-2">
                        <i class="fas fa-clock mr-1"></i>
                        ${new Date(contribution.timestamp).toLocaleDateString('vi-VN')}
                    </span>
                </div>
            </div>
        `;

        // Show panel
        panel.classList.remove('translate-y-full');
        searchResultsContainer.classList.add('hidden');
        searchInput.value = '';
    }

    // Share parcel info
    window.shareParcelInfo = function(parcelNumber, mapSheet) {
        const shareData = {
            title: `Thửa ${parcelNumber}, Tờ ${mapSheet} - XemGiaDat`,
            text: `Thông tin chi tiết thửa ${parcelNumber}, tờ ${mapSheet} với dữ liệu từ cộng đồng`,
            url: window.location.href
        };
        
        if (navigator.share) {
            navigator.share(shareData);
        } else {
            navigator.clipboard.writeText(shareData.url).then(() => {
                showToast('📋 Đã copy link vào clipboard', 'success');
            });
        }
    };

    // Open contribution modal for specific parcel
    window.openContributionModalForParcel = function(parcelNumber, mapSheet) {
        // Pre-fill the contribution form
        document.getElementById('contrib-parcel').value = parcelNumber;
        document.getElementById('contrib-map-sheet').value = mapSheet;
        
        // Auto-search and select the parcel
        searchParcelForContribution().then(() => {
            openContributionModal();
            goToStep2(); // Skip to data entry step
        });
    };

    // Add community-based search suggestions
    function addCommunitySearchSuggestions(query) {
        if (!query || query.length < 3) return;
        
        const suggestions = [];
        
        // Search through community contributions
        for (const [key, contribution] of communityContributions.entries()) {
            const community = contribution.communityData;
            const official = contribution.officialData;
            
            // Check if query matches any community identifiers
            const searchableText = [
                community.projectName,
                community.lotNumber,
                community.commonName,
                community.brokerCode,
                community.blockCode
            ].filter(Boolean).join(' ').toLowerCase();
            
            if (searchableText.includes(query.toLowerCase())) {
                suggestions.push({
                    type: 'community',
                    parcelNumber: official.parcelNumber,
                    mapSheet: official.mapSheet,
                    matchedField: getMostRelevantField(community, query),
                    projectName: community.projectName,
                    lotNumber: community.lotNumber,
                    commonName: community.commonName
                });
            }
        }
        
        // Add suggestions to search results if found
        if (suggestions.length > 0) {
            const existingHtml = searchResultsContainer.innerHTML;
            let suggestionHtml = `
                <div class="border-t border-gray-200 mt-2 pt-2">
                    <div class="result-category">
                        <i class="fas fa-users mr-2 text-green-600"></i>Dữ liệu từ cộng đồng
                    </div>
            `;
            
            suggestions.slice(0, 3).forEach(suggestion => {
                suggestionHtml += `
                    <div class="result-item community-result" data-type="community-parcel" 
                         data-parcel="${suggestion.parcelNumber}" data-mapsheet="${suggestion.mapSheet}">
                        <i class="icon fa-solid fa-map-marker-alt text-green-500"></i>
                        <div class="flex-1">
                            <div class="font-medium">Thửa ${suggestion.parcelNumber}, Tờ ${suggestion.mapSheet}</div>
                            <div class="text-xs text-gray-600">
                                ${suggestion.projectName ? `🏗️ ${suggestion.projectName}` : ''}
                                ${suggestion.lotNumber ? ` • 📍 ${suggestion.lotNumber}` : ''}
                                ${suggestion.commonName ? ` • 🏷️ ${suggestion.commonName}` : ''}
                            </div>
                        </div>
                        <span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Cộng đồng</span>
                    </div>
                `;
            });
            
            suggestionHtml += '</div>';
            
            if (existingHtml.includes('Không tìm thấy kết quả nào')) {
                searchResultsContainer.innerHTML = suggestionHtml;
            } else {
                searchResultsContainer.innerHTML = existingHtml + suggestionHtml;
            }
        }
    }

    // Get most relevant field that matches the query
    function getMostRelevantField(community, query) {
        const fields = [
            { key: 'projectName', label: 'Dự án' },
            { key: 'lotNumber', label: 'Số lô' },
            { key: 'commonName', label: 'Tên thông dụng' },
            { key: 'brokerCode', label: 'Mã môi giới' },
            { key: 'blockCode', label: 'Block/Khu' }
        ];
        
        for (const field of fields) {
            if (community[field.key] && community[field.key].toLowerCase().includes(query.toLowerCase())) {
                return field.label;
            }
        }
        return 'Khác';
    }

    // --- EVENT LISTENERS ---
    userProfileDiv.addEventListener('click', (event) => {
        console.log('👤 User profile clicked, toggling menu');
        event.stopPropagation();
        profileMenu.classList.toggle('hidden');
        
        // Debug menu state
        console.log('📋 Profile menu state:', {
            hidden: profileMenu.classList.contains('hidden'),
            zIndex: window.getComputedStyle(profileMenu).zIndex,
            display: window.getComputedStyle(profileMenu).display,
            pointerEvents: window.getComputedStyle(profileMenu).pointerEvents
        });
    });

    updateProfileBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!currentUser) return;
        loadUserProfile();
        document.getElementById('profile-modal').classList.remove('hidden');
        profileMenu.classList.add('hidden');
    });

    logoutBtnMenu.addEventListener('click', (e) => {
        e.preventDefault();
        auth.signOut();
        profileMenu.classList.add('hidden');
    });

    // Portfolio menu button handler
    const portfolioMenuBtn = document.getElementById('portfolio-menu-btn');
    if (typeof DEBUG_MODE !== 'undefined' && DEBUG_MODE) {
        console.log('🔍 Portfolio menu button check:', {
            exists: !!portfolioMenuBtn,
            visible: portfolioMenuBtn?.offsetParent !== null
        });
    }
    
    if (portfolioMenuBtn) {
        portfolioMenuBtn.addEventListener('click', (e) => {
            if (typeof DEBUG_MODE !== 'undefined' && DEBUG_MODE) {
                console.log('🎯 Portfolio menu item clicked!');
            }
            e.preventDefault();
            e.stopPropagation();
            
            // Close the profile menu first
            profileMenu.classList.add('hidden');
            if (typeof DEBUG_MODE !== 'undefined' && DEBUG_MODE) {
                console.log('✅ Profile menu closed');
            }
            
            // Then open portfolio modal
            try {
                showPortfolioModal();
            } catch (error) {
                console.error('❌ Error opening portfolio modal:', error);
                alert('Có lỗi khi mở ví bất động sản. Vui lòng thử lại.');
            }
        });
        
        // Test click programmatically (debug only)
        if (typeof DEBUG_MODE !== 'undefined' && DEBUG_MODE) {
            window.testPortfolioMenuClick = function() {
                console.log('🧪 Testing portfolio menu click programmatically...');
                portfolioMenuBtn.click();
            };
            console.log('✅ Portfolio menu button event listener added');
        }
    } else {
        if (typeof DEBUG_MODE !== 'undefined' && DEBUG_MODE) {
            console.error('❌ Portfolio menu button not found!');
        }
    }

    document.addEventListener('click', (event) => {
        if (!profileMenu.classList.contains('hidden') && 
            !userProfileDiv.contains(event.target) && 
            !profileMenu.contains(event.target)) {
            profileMenu.classList.add('hidden');
        }
    });

    // Rating system
    let selectedRating = 0;
    const ratingStars = document.querySelectorAll('.rating-star');
    const ratingText = document.getElementById('rating-text');

    // Initialize rating display
    updateStarDisplay();
    updateRatingText();

    ratingStars.forEach((star, index) => {
        star.addEventListener('click', () => {
            selectedRating = index + 1;
            updateStarDisplay();
            updateRatingText();
        });

        star.addEventListener('mouseenter', () => {
            highlightStars(index + 1);
        });

        star.addEventListener('mouseleave', () => {
            updateStarDisplay();
        });
    });

    function highlightStars(count) {
        ratingStars.forEach((star, index) => {
            if (index < count) {
                star.classList.remove('text-gray-300');
                star.classList.add('text-yellow-400');
                star.textContent = '★'; // Filled star
            } else {
                star.classList.add('text-gray-300');
                star.classList.remove('text-yellow-400');
                star.textContent = '☆'; // Empty star
            }
        });
    }

    function updateStarDisplay() {
        highlightStars(selectedRating);
    }

    function updateRatingText() {
        const messages = [
            'Click để đánh giá website (chưa chọn)',
            '😞 Rất không hài lòng - Hãy cho chúng tôi biết vấn đề!',
            '😐 Không hài lòng - Chúng tôi sẽ cải thiện!', 
            '😊 Bình thường - Có thể làm tốt hơn!',
            '😄 Hài lòng - Cảm ơn bạn!',
            '🤩 Rất hài lòng - Tuyệt vời!'
        ];
        ratingText.textContent = messages[selectedRating];
    }

    // Feedback form submission
    document.getElementById('feedback-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Form validation
        const formData = new FormData(e.target);
        const content = formData.get('content')?.trim();
        const type = formData.get('type');
        
        // Get form elements for UI updates
        const submitButton = e.target.querySelector('button[type="submit"]');
        const submitText = submitButton.querySelector('.submit-text');
        const loadingText = submitButton.querySelector('.loading-text');
        const contentField = e.target.querySelector('textarea[name="content"]');
        
        // Reset previous validation states
        contentField.classList.remove('form-error', 'form-success');
        
        // Validate required fields
        if (!content || content.length < 10) {
            showToast('⚠️ Vui lòng nhập nội dung góp ý (tối thiểu 10 ký tự)', 'warning');
            contentField.classList.add('form-error');
            contentField.focus();
            return;
        }
        
        if (!type) {
            showToast('⚠️ Vui lòng chọn loại góp ý', 'warning');
            return;
        }
        
        if (selectedRating === 0) {
            showToast('⚠️ Vui lòng đánh giá trải nghiệm của bạn', 'warning');
            return;
        }

        // Show loading state
        submitButton.disabled = true;
        submitText.style.display = 'none';
        loadingText.style.display = 'inline';
        contentField.classList.add('form-success');

        const feedbackData = {
            type: type,
            priority: formData.get('priority'),
            content: content,
            email: formData.get('email') || 'anonymous',
            rating: selectedRating,
            timestamp: new Date().toISOString(),
            page: 'main',
            userAgent: navigator.userAgent,
            url: window.location.href,
            status: 'pending'
        };

        try {
            // Store in Firebase (if user is logged in) or localStorage
            if (currentUser) {
                feedbackData.userId = currentUser.uid;
                feedbackData.userName = currentUser.displayName || 'User';
                
                // Save to Firestore
                await db.collection('feedback').add(feedbackData);
                console.log('💾 Feedback saved to Firestore:', feedbackData);
            } else {
                // Save to localStorage for anonymous users
                const localFeedback = JSON.parse(localStorage.getItem('userFeedback') || '[]');
                localFeedback.push(feedbackData);
                localStorage.setItem('userFeedback', JSON.stringify(localFeedback));
                console.log('💾 Feedback saved locally:', feedbackData);
            }

            // Show success message with smooth transition
            showToast('🎉 Cảm ơn bạn đã góp ý! Chúng tôi sẽ xem xét và phản hồi sớm nhất có thể.', 'success', 4000);
            
            // Smooth close modal and reset form
            setTimeout(() => {
                feedbackModal.style.opacity = '0';
                setTimeout(() => {
                    feedbackModal.classList.add('hidden');
                    feedbackModal.style.opacity = '1';
                    e.target.reset();
                    selectedRating = 0;
                    updateStarDisplay();
                    updateRatingText();
                    
                    // Reset submit button
                    submitButton.disabled = false;
                    submitText.style.display = 'inline';
                    loadingText.style.display = 'none';
                    contentField.classList.remove('form-success');
                }, 300);
            }, 1500);

        } catch (error) {
            console.error('❌ Error submitting feedback:', error);
            showToast('❌ Có lỗi xảy ra khi gửi góp ý. Vui lòng thử lại sau.', 'error');
            
            // Reset submit button
            submitButton.disabled = false;
            submitText.style.display = 'inline';
            loadingText.style.display = 'none';
            contentField.classList.remove('form-success');
            contentField.classList.add('form-error');
        }
    });

    searchInput.addEventListener('input', (e) => { 
        clearTimeout(debounceTimer); 
        const query = e.target.value.trim();
        if (query.length < 2) {
            // Clear results immediately for short queries
            searchResultsContainer.innerHTML = '';
            searchResultsContainer.classList.add('hidden');
            return;
        }
        debounceTimer = setTimeout(() => { performSearch(query); }, 400); // Slightly longer delay for better performance
    });
    searchResultsContainer.addEventListener('click', (e) => {
        const item = e.target.closest('.result-item');
        if (!item) return;
        hideInfoPanel();
        const type = item.dataset.type;
        
        if (type === 'parcel') {
            // Hiển thị thửa đất từ kết quả tìm kiếm
            const lat = parseFloat(item.dataset.lat);
            const lng = parseFloat(item.dataset.lng);
            const soThua = item.dataset.soThua;
            const soTo = item.dataset.soTo;
            const maXa = item.dataset.maXa;
            
            // Zoom đến vị trí thửa đất
            map.setView([lat, lng], 19);
            
            // Hiển thị thông tin nhanh
            showParcelFromSearchResult(soThua, soTo, maXa, lat, lng);
            
        } else if (type === 'community-parcel') {
            // Handle community parcel results
            const parcelNumber = item.dataset.parcel;
            const mapSheet = item.dataset.mapsheet;
            
            showCommunityParcelInfo(parcelNumber, mapSheet);
            
        } else if (type === 'location') {
            map.setView([parseFloat(item.dataset.lat), parseFloat(item.dataset.lng)], 17);
        } else if (type === 'listing') {
            const listing = localListings.find(l => l.id === item.dataset.id);
            if (listing) {
                map.setView([listing.lat, listing.lng], 18);
                showListingInfoPanel(listing);
            }
        }
        
        searchResultsContainer.classList.add('hidden');
        searchInput.value = '';
    });

    if (closePanelBtn) {
        closePanelBtn.addEventListener('click', hideInfoPanel);
    }
    if (togglePanelBtn && infoPanel && actionToolbar) {
        togglePanelBtn.addEventListener('click', () => {
            const isCollapsed = infoPanel.classList.toggle('is-collapsed');
            const icon = togglePanelBtn.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-chevron-down');
                icon.classList.toggle('fa-chevron-up');
            }
            if (isCollapsed) {
                actionToolbar.classList.remove('is-raised');
                actionToolbar.classList.add('is-partially-raised');
            } else {
                actionToolbar.classList.remove('is-partially-raised');
                actionToolbar.classList.add('is-raised');
            }
        });
    }

    if (locateBtn) {
        locateBtn.addEventListener('click', () => {
            if (!navigator.geolocation) return alert('Trình duyệt của bạn không hỗ trợ định vị.');
            map.locate({ setView: true, maxZoom: 16 });
        });
    }
    map.on('locationfound', function(e) {
        if (userLocationMarker) map.removeLayer(userLocationMarker);
        const radius = e.accuracy / 2;
        userLocationMarker = L.marker(e.latlng).addTo(map).bindPopup(`Vị trí của bạn (trong bán kính ${radius.toFixed(0)}m)`).openPopup();
    });
    map.on('locationerror', (e) => alert("Không thể lấy vị trí của bạn: " + e.message));

    map.on('click', function(e) {
        if (searchResultsContainer) searchResultsContainer.classList.add('hidden');
        hideInfoPanel();
        if (isAddMode) {
            if (!currentUser) {
                alert("Vui lòng đăng nhập để thêm địa điểm!");
                exitAllModes();
                return;
            }
            selectedCoords = e.latlng;
            tempMarker = L.marker(selectedCoords).addTo(map);
            modal.classList.remove('hidden');
            L.esri.Geocoding.geocodeService().reverse().latlng(selectedCoords).run((error, result) => {
                document.getElementById('address-input').value = (error || !result.address) ? 'Không tìm thấy địa chỉ' : result.address.Match_addr;
            });
        }
        
        // FALLBACK: Nếu đang ở chế độ tra cứu và zoom cao, thử query trực tiếp
        if (isQueryMode && map.getZoom() >= 17) {
            if (parcelLayer && typeof parcelLayer.fire === 'function') {
                queryFeaturesAtPoint(e.latlng, function(feature) {
                    if (feature && feature.properties) {
                        console.log('📍 Fallback query found feature:', feature.properties);
                        // Trigger parcelLayer click event manually
                        parcelLayer.fire('click', {
                            latlng: e.latlng,
                            layer: { properties: feature.properties }
                        });
                    }
                });
            } else if (typeof queryAndDisplayParcelByLatLng === 'function') {
                queryAndDisplayParcelByLatLng(e.latlng.lat, e.latlng.lng);
            } else {
                console.warn('❌ Parcel query unavailable - parcel layer not ready');
            }
        }
    });

    // KHẮC PHỤC: Logic thanh trượt độ trong suốt
    if (opacitySlider) {
        opacitySlider.addEventListener('input', (e) => {
            const newOpacity = parseFloat(e.target.value);
            // Tạo một style mới chỉ với thuộc tính fillOpacity
            const newStyle = { fillOpacity: newOpacity };
            // Áp dụng style mới cho lớp bản đồ phân lô
            parcelLayer.setStyle(newStyle);
        });
    }

    map.on('overlayadd', e => {
        if (e.name === '🗺️ Bản đồ phân lô' && opacityControl) opacityControl.classList.remove('hidden');
    });
    map.on('overlayremove', e => {
        if (e.name === '🗺️ Bản đồ phân lô' && opacityControl) opacityControl.classList.add('hidden');
    });

    if (opacityControl) {
        if (map.hasLayer(parcelLayer)) opacityControl.classList.remove('hidden');
        else opacityControl.classList.add('hidden');
    }

    // Donate handlers already setup earlier - avoid duplicate
    // Note: copyBtn functionality is now handled in setupCopyFunctionality() function

    // Enhanced add-location button with visual feedback
    addLocationBtn.addEventListener('mousedown', function() {
        if (!addLocationBtn.disabled) {
            addLocationBtn.classList.add('pressed');
        }
    });
    
    addLocationBtn.addEventListener('mouseup', function() {
        setTimeout(() => addLocationBtn.classList.remove('pressed'), 100);
    });
    
    addLocationBtn.addEventListener('mouseleave', function() {
        addLocationBtn.classList.remove('pressed');
    });
    
    addLocationBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!currentUser) {
            alert("Vui lòng đăng nhập để thêm địa điểm!");
            return;
        }
        prefillUserContact();
        isAddMode ? exitAllModes() : enterAddMode();
    });

    // Enhanced query button with visual feedback
    queryBtn.addEventListener('mousedown', function() {
        queryBtn.classList.add('pressed');
    });
    
    queryBtn.addEventListener('mouseup', function() {
        setTimeout(() => queryBtn.classList.remove('pressed'), 100);
    });
    
    queryBtn.addEventListener('mouseleave', function() {
        queryBtn.classList.remove('pressed');
    });
    
    queryBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        isQueryMode ? exitAllModes() : enterQueryMode();
    });
    // Enhanced list button with visual feedback
    listBtn.addEventListener('mousedown', function() {
        listBtn.classList.add('pressed');
    });
    
    listBtn.addEventListener('mouseup', function() {
        setTimeout(() => listBtn.classList.remove('pressed'), 100);
    });
    
    listBtn.addEventListener('mouseleave', function() {
        listBtn.classList.remove('pressed');
    });
    
    listBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('👆 List button clicked!');
        console.log('📋 listModal element:', listModal);
        console.log('📋 Current visibility:', listModal ? listModal.classList.contains('hidden') : 'N/A');
        
        // Toggle active state
        const isActive = listBtn.classList.contains('active-tool');
        clearAllToolbarStates();
        
        if (!isActive) {
            listBtn.classList.add('active-tool');
            if (listModal) {
                listModal.classList.remove('hidden');
                console.log('✅ List modal opened');
            } else {
                console.error('❌ listModal element not found!');
            }
        } else {
            if (listModal) {
                listModal.classList.add('hidden');
                console.log('✅ List modal closed');
            }
        }
    });
    
    document.getElementById('close-list-btn').addEventListener('click', function() {
        listModal.classList.add('hidden');
        listBtn.classList.remove('active-tool');
    });
    document.getElementById('close-modal-btn').addEventListener('click', () => { modal.classList.add('hidden'); exitAllModes(); });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('submit-form-btn');
        
        // 🔧 ENHANCED DEBUGGING SYSTEM
        console.log('🔍 ĐĂNG TIN DEBUG - Starting submission process...');
        console.log('📊 Current State:', {
            currentUser: currentUser ? {
                uid: currentUser.uid,
                email: currentUser.email,
                displayName: currentUser.displayName
            } : null,
            authUser: auth.currentUser ? {
                uid: auth.currentUser.uid,
                email: auth.currentUser.email
            } : null,
            selectedCoords: selectedCoords,
            dbConnection: !!db,
            formElement: !!form
        });
        
        // Check authentication
        if (!currentUser) {
            console.error('❌ ĐĂNG TIN ERROR: User not logged in');
            return alert("⚠️ Vui lòng đăng nhập trước khi đăng tin!\n\nClick nút 'Đăng nhập' ở góc phải màn hình.");
        }
        
        if (!auth.currentUser) {
            console.error('❌ ĐĂNG TIN ERROR: Auth user missing');
            return alert("⚠️ Phiên đăng nhập hết hạn!\n\nVui lòng đăng nhập lại.");
        }
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        console.log('📝 Form Data:', data);
        console.log('📍 Selected Coordinates:', selectedCoords);
        
        // Enhanced validation with specific error messages
        if (!data.transactionType || data.transactionType === '') {
            console.error('❌ ĐĂNG TIN ERROR: Missing transaction type');
            return alert("⚠️ Vui lòng chọn loại giao dịch!\n\nVí dụ: Bán Đất, Cho Thuê Nhà, v.v.");
        }
        
        if (!selectedCoords) {
            console.error('❌ ĐĂNG TIN ERROR: No coordinates selected');
            return alert("⚠️ Vui lòng click vào bản đồ để chọn vị trí!\n\nBước 1: Click vào vị trí trên bản đồ\nBước 2: Điền thông tin form\nBước 3: Nhấn 'Đăng Tin'");
        }
        
        if (!data.name || data.name.trim() === '') {
            console.error('❌ ĐĂNG TIN ERROR: Missing property name');
            return alert("⚠️ Vui lòng nhập tiêu đề tin đăng!\n\nVí dụ: 'Bán nhà mặt tiền đường Lê Duẩn' hoặc 'Cho thuê căn hộ 2PN gần biển'");
        }
        
        if (!data.area || data.area.trim() === '' || parseFloat(data.area) <= 0) {
            console.error('❌ ĐĂNG TIN ERROR: Missing or invalid area');
            return alert("⚠️ Vui lòng nhập diện tích hợp lệ!\n\nVí dụ: 100 (cho 100m²)");
        }
        
        if (!data.contactName || data.contactName.trim() === '') {
            console.error('❌ ĐĂNG TIN ERROR: Missing contact name');
            return alert("⚠️ Vui lòng nhập tên người liên hệ!");
        }
        
        if (!data.contactPhone || data.contactPhone.trim() === '') {
            console.error('❌ ĐĂNG TIN ERROR: Missing contact phone');
            return alert("⚠️ Vui lòng nhập số điện thoại liên hệ!");
        }
        
        // Enhanced validation with specific error messages  
        
        // Enhanced price validation with negotiation support
        const isNegotiable = document.getElementById('price-negotiable')?.checked || false;
        if (!isNegotiable && (!data.priceValue || data.priceValue.trim() === '')) {
            console.error('❌ ĐĂNG TIN ERROR: Missing price value');
            return alert("⚠️ Vui lòng nhập giá bất động sản hoặc chọn 'Thương lượng'!\n\nVí dụ: 5000000 (cho 5 triệu VNĐ)");
        }
        
        console.log('✅ All validations passed, proceeding with submission...');
        
        submitBtn.textContent = 'Đang gửi...'; 
        submitBtn.disabled = true;
        
        try {
            const docData = { 
                userId: currentUser.uid, // CRITICAL: Add userId for Firestore rules
                userName: currentUser.displayName || 'Người dùng', 
                userAvatar: currentUser.photoURL || '', 
                lat: selectedCoords.lat, 
                lng: selectedCoords.lng,
                
                // Transaction details
                transactionType: data.transactionType || 'ban-dat', // Loại giao dịch
                propertyType: data.propertyType || '', // Loại hình BDS
                legalStatus: data.legalStatus || '', // Pháp lý
                
                // Price info
                priceValue: isNegotiable ? null : parseFloat(data.priceValue), 
                priceUnit: isNegotiable ? 'thương lượng' : (data.priceUnit || 'VNĐ'),
                isNegotiable: isNegotiable,
                
                // Property info
                area: data.area ? parseFloat(data.area) : null,
                name: data.name.trim(), // Tiêu đề tin
                notes: data.notes || '', // Mô tả chi tiết
                
                // Contact info
                contactName: data.contactName || currentUser.displayName || '', 
                contactEmail: data.contactEmail || currentUser.email || '', 
                contactPhone: data.contactPhone || '', 
                contactFacebook: data.contactFacebook || '',
                
                // Metadata
                status: 'approved', 
                createdAt: firebase.firestore.FieldValue.serverTimestamp(), 
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            console.log('📤 Sending data to Firebase:', docData);
            
            // Use v8 syntax for Firebase
            const docRef = await db.collection("listings").add(docData);
            console.log('✅ ĐĂNG TIN SUCCESS: Document written with ID:', docRef.id);
            
            // Get transaction type label for success message
            const transactionTypeLabels = {
                'ban-dat': 'Bán Đất',
                'ban-nha': 'Bán Nhà',
                'ban-can-ho': 'Bán Căn Hộ',
                'ban-biet-thu': 'Bán Biệt Thự',
                'ban-kho-xuong': 'Bán Kho/Xưởng',
                'cho-thue-dat': 'Cho Thuê Đất',
                'cho-thue-nha': 'Cho Thuê Nhà',
                'cho-thue-can-ho': 'Cho Thuê Căn Hộ',
                'cho-thue-phong-tro': 'Cho Thuê Phòng Trọ',
                'cho-thue-mat-bang': 'Cho Thuê Mặt Bằng',
                'cho-thue-van-phong': 'Cho Thuê Văn Phòng',
                'sang-nhuong': 'Sang Nhượng',
                'can-mua': 'Cần Mua',
                'can-thue': 'Cần Thuê'
            };
            const typeLabel = transactionTypeLabels[data.transactionType] || 'Bất động sản';
            
            alert(`🎉 Đăng tin thành công!\n\n✅ Tin "${typeLabel}" của bạn đã được đăng\n📍 Vị trí: ${data.name}\n📱 Liên hệ: ${data.contactPhone}\n\nTin đăng sẽ hiển thị trên bản đồ ngay bây giờ!`);
            modal.classList.add('hidden'); 
            form.reset(); 
            exitAllModes();
            
            // Track success event
            if (typeof gtag !== 'undefined') {
                gtag('event', 'listing_submitted', {
                    event_category: 'user_engagement',
                    event_label: data.transactionType,
                    value: 1
                });
            }
            
        } catch (error) { 
            console.error("❌ ĐĂNG TIN DETAILED ERROR:", {
                code: error.code,
                message: error.message,
                stack: error.stack,
                fullError: error
            }); 
            
            let errorMessage = "Đã xảy ra lỗi khi gửi dữ liệu:\n\n";
            
            if (error.code === 'permission-denied') {
                errorMessage += "🔒 Lỗi quyền truy cập: Tài khoản chưa được cấp quyền đăng tin.\n\nVui lòng liên hệ admin để được hỗ trợ.";
            } else if (error.code === 'network-request-failed') {
                errorMessage += "🌐 Lỗi kết nối mạng: Vui lòng kiểm tra internet và thử lại.";
            } else if (error.code === 'unavailable') {
                errorMessage += "🔧 Hệ thống đang bảo trì: Vui lòng thử lại sau ít phút.";
            } else {
                errorMessage += `⚠️ Mã lỗi: ${error.code || 'unknown'}\n💬 Chi tiết: ${error.message || 'Lỗi không xác định'}`;
            }
            
            errorMessage += "\n\n📞 Nếu vấn đề vẫn tiếp tục, vui lòng chụp màn hình Console (F12) và gửi cho admin.";
            
            alert(errorMessage);
        } finally { 
            submitBtn.textContent = 'Gửi Dữ Liệu'; 
            submitBtn.disabled = false; 
        }
    });

    auth.onAuthStateChanged(async (user) => {
        const ADMIN_UID = "FEpPWWT1EaTWQ9FOqBxWN5FeEJk1";
        const adminBtn = document.getElementById('admin-btn');
        
        console.log('🔐 Auth state changed:', { 
            userExists: !!user, 
            userUID: user?.uid, 
            isAdmin: user?.uid === ADMIN_UID,
            adminBtnExists: !!adminBtn 
        });
        
        if (user) {
            currentUser = user;
            const userRef = db.collection("users").doc(user.uid);
            const doc = await userRef.get();
            if (!doc.exists) {
                await userRef.set({
                    displayName: user.displayName || "", email: user.email || "", phone: "", contactFacebook: "", createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            // Load user portfolio when logged in
            await loadUserPortfolio();
            
            // Show admin button if user is admin OR if running on localhost for testing
            const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            if (user.uid === ADMIN_UID || isLocalhost) {
                console.log('👑 Showing admin button (admin user or localhost)');
                // Dynamically inject admin button if not exists
                let adminBtn = document.getElementById('admin-btn');
                if (!adminBtn) {
                    const sidebar = document.getElementById('right-sidebar');
                    if (sidebar) {
                        adminBtn = document.createElement('button');
                        adminBtn.id = 'admin-btn';
                        adminBtn.title = 'Quản trị hệ thống';
                        adminBtn.className = 'bg-red-600 text-white w-12 h-12 rounded-full shadow-lg flex items-center justify-center hover:bg-red-700 transition active:scale-95';
                        adminBtn.setAttribute('aria-label', 'Trang quản trị');
                        adminBtn.innerHTML = '<i class="fa-solid fa-cog text-xl"></i>';
                        adminBtn.addEventListener('click', () => window.location.href = '/admin.html');
                        sidebar.appendChild(adminBtn);
                        console.log('✅ Admin button injected');
                    }
                } else {
                    adminBtn.style.display = 'flex';
                }
            }
            
            firebaseuiContainer.classList.add('hidden');
            loginBtn.classList.add('hidden');
            userProfileDiv.classList.remove('hidden');
            userProfileDiv.classList.add('flex');
            document.getElementById('user-avatar').src = user.photoURL || 'https://placehold.co/40x40/e2e8f0/64748b?text=A';
            addLocationBtn.disabled = false;
        } else {
            currentUser = null;
            userPortfolio = []; // Clear portfolio when logged out
            if (adminBtn) adminBtn.style.display = 'none';
            loginBtn.classList.remove('hidden');
            userProfileDiv.classList.add('hidden');
            userProfileDiv.classList.remove('flex');
            exitAllModes();
            addLocationBtn.disabled = true;
        }
    });

    loginBtn.addEventListener('click', () => {
        if (!firebaseuiContainer) {
            alert('Hệ thống đăng nhập chưa sẵn sàng. Vui lòng tải lại trang.');
            return;
        }
        ensureFirebaseUiCss();
        // Verify Firebase Auth is initialized
        if (!auth || !firebase.auth) {
            console.error('❌ Firebase Auth not initialized!');
            alert('Hệ thống đăng nhập chưa sẵn sàng. Vui lòng tải lại trang.');
            return;
        }
        
        // 🔧 FIX: Ensure FirebaseUI is initialized before using
        if (!ui) {
            initFirebaseUI();
            if (!ui) {
                console.error('❌ FirebaseUI not available!');
                alert('Hệ thống đăng nhập chưa sẵn sàng. Vui lòng tải lại trang.');
                return;
            }
        }
        
        // Debug logging for production deployment differences
        console.log('🌐 Environment:', {
            hostname: window.location.hostname,
            protocol: window.location.protocol,
            userAgent: navigator.userAgent,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            platform: navigator.platform,
            authExists: !!auth,
            firebaseExists: !!firebase,
            firebaseuiExists: !!firebaseui
        });
        
        // Show the FirebaseUI container
        firebaseuiContainer.classList.remove('hidden');
        firebaseuiContainer.style.display = 'flex';
        firebaseuiContainer.style.visibility = 'visible';
        
        // Log container status after changes
        console.log('📱 Container after show:', {
            classes: firebaseuiContainer.className,
            style: firebaseuiContainer.style.cssText,
            computedDisplay: window.getComputedStyle(firebaseuiContainer).display,
            rect: firebaseuiContainer.getBoundingClientRect()
        });
        
        // Force popup flow for all devices to avoid page redirect
        const signInFlow = 'popup';
        
        console.log('🔧 Auth config:', { 
            isMobile: window.innerWidth <= 640,
            userAgent: navigator.userAgent,
            signInFlow: signInFlow,
            hostname: window.location.hostname
        });
        
        try {
            ui.start('#firebaseui-widget', { 
                signInFlow: signInFlow,
                signInOptions: [ 
                    {
                        provider: firebase.auth.GoogleAuthProvider.PROVIDER_ID,
                        customParameters: {
                            prompt: 'select_account'
                        }
                    },
                    firebase.auth.EmailAuthProvider.PROVIDER_ID 
                ], 
                callbacks: { 
                    signInSuccessWithAuthResult: () => { 
                        console.log('✅ Sign in success!');
                        firebaseuiContainer.classList.add('hidden');
                        firebaseuiContainer.style.display = 'none';
                        return false; // Prevent redirect
                    },
                    signInFailure: (error) => {
                        console.error('❌ Sign in failed:', error);
                        return Promise.resolve();
                    }
                },
                credentialHelper: firebaseui.auth.CredentialHelper.NONE
            });
            console.log('✅ FirebaseUI started on', window.location.hostname);
        } catch (error) {
            console.error('❌ FirebaseUI error:', error);
            
            // Fallback: Show error message to user
            alert('Không thể khởi tạo đăng nhập. Vui lòng thử lại hoặc liên hệ admin.');
            firebaseuiContainer.classList.add('hidden');
        }
    });    // Debug button removed - login functionality now works properly
    firebaseuiContainer.addEventListener('click', (e) => { if (e.target === firebaseuiContainer) firebaseuiContainer.classList.add('hidden'); });

    // Load listings from Firestore
    if (DEBUG_MODE) {
        console.log('📋 Loading listings from Firestore...');
    }

    const ADMIN_UID = "FEpPWWT1EaTWQ9FOqBxWN5FeEJk1";
    const isAdminForDiagnostics = firebase.auth().currentUser && firebase.auth().currentUser.uid === ADMIN_UID;
    const useAllListings = DEBUG_ALL_LISTINGS && isAdminForDiagnostics;

    if (DEBUG_MODE) {
        console.log('[LISTINGS_QUERY]', {
            mode: useAllListings ? 'ALL_STATUSES' : 'APPROVED_ONLY',
            debug: DEBUG_MODE,
            admin: isAdminForDiagnostics
        });
    }

    const listingsQuery = useAllListings
        ? db.collection("listings").orderBy("createdAt", "desc")
        : db.collection("listings").where("status", "==", "approved").orderBy("createdAt", "desc");

    listingsQuery.onSnapshot((querySnapshot) => {
        if (DEBUG_MODE) {
            console.log('📋 Listings snapshot received:', querySnapshot.size, 'documents');
        }

        const statusCounts = {};
        localListings = [];
        priceMarkers.clearLayers();
        const priceList = document.getElementById('price-list');
        priceList.innerHTML = '';

        if (querySnapshot.empty) {
            if (DEBUG_MODE) {
                console.log('📋 No listings found for current query');
            }
            priceList.innerHTML = '<p class="text-center text-gray-500 py-4">📭 Không có dữ liệu.</p>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const item = { ...doc.data(), id: doc.id };
            statusCounts[item.status || 'unknown'] = (statusCounts[item.status || 'unknown'] || 0) + 1;
            localListings.push(item);
            if (!item.lat || !item.lng) return;

            const marker = L.marker([item.lat, item.lng]);
            marker.on('click', () => showListingInfoPanel(item));
            priceMarkers.addLayer(marker);

            const listItem = document.createElement('div');
            listItem.className = 'p-2 border-b cursor-pointer hover:bg-gray-100';
            listItem.innerHTML = `<p class="font-semibold">${item.name}</p><p class="text-sm text-red-600">${item.priceValue} ${item.priceUnit}</p>`;
            listItem.onclick = () => {
                listModal.classList.add('hidden');
                map.setView([item.lat, item.lng], 18);
                showListingInfoPanel(item);
            };
            priceList.appendChild(listItem);
        });

        if (DEBUG_MODE) {
            console.log('[LISTINGS_STATUS_COUNTS]', statusCounts);
        }
    }, (error) => {
        console.error('❌ Firestore listings error:', error);
        console.error('📋 Error code:', error.code);
        console.error('📋 Error message:', error.message);
    });
    
    // Đặt đoạn code này bên trong sự kiện 'DOMContentLoaded'

    const searchBarContainer = document.getElementById('search-bar-container');        

    if (searchBarContainer) {
        // Mở rộng khi nhấp vào
        searchBarContainer.addEventListener('click', (event) => {
            if (!searchBarContainer.classList.contains('is-expanded')) {
                event.stopPropagation(); // Ngăn sự kiện click lan ra ngoài
                searchBarContainer.classList.add('is-expanded');
                searchInput.focus(); // Tự động trỏ vào ô input
            }
        });

        // Thu gọn khi nhấp ra ngoài
        document.addEventListener('click', (event) => {
            // Nếu click không nằm trong widget tìm kiếm VÀ ô tìm kiếm đang mở
            if (!event.target.closest('#search-widget-container') && searchBarContainer.classList.contains('is-expanded')) {
                searchInput.value = ''; // Xóa nội dung tìm kiếm
                searchResultsContainer.classList.add('hidden'); // Ẩn kết quả
                searchBarContainer.classList.remove('is-expanded');
            }
        });
    }

    document.getElementById('profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUser) return;
        const updatedProfile = {
            displayName: document.getElementById('profile-name').value.trim(),
            email: document.getElementById('profile-email').value.trim(),
            phone: document.getElementById('profile-phone').value.trim(),
            zalo: document.getElementById('profile-zalo').value.trim(),
            whatsapp: document.getElementById('profile-whatsapp').value.trim(),
            contactFacebook: document.getElementById('profile-facebook').value.trim(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        try {
            await db.collection("users").doc(currentUser.uid).update(updatedProfile);
            alert("✅ Hồ sơ đã được cập nhật.");
            document.getElementById('profile-modal').classList.add('hidden');
        } catch (error) {
            console.error("❌ Lỗi khi cập nhật hồ sơ:", error);
            alert("Có lỗi xảy ra khi cập nhật hồ sơ.");
        }
    });

    document.getElementById('close-profile-btn').addEventListener('click', () => {
        document.getElementById('profile-modal').classList.add('hidden');
    });
  
    // === BẮT ĐẦU: LOGIC ĐIỀU KHIỂN AKKORDEON ===

    function setupInfoAccordion() {
        const accordionHeaders = document.querySelectorAll('#info-accordion .accordion-header');

        accordionHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const content = header.nextElementSibling;
                const currentlyActive = document.querySelector('#info-accordion .accordion-header.active');

                // Đóng mục đang mở nếu nó không phải là mục vừa được click
                if (currentlyActive && currentlyActive !== header) {
                    currentlyActive.classList.remove('active');
                    const currentContent = currentlyActive.nextElementSibling;
                    currentContent.classList.remove('active');
                    currentContent.style.maxHeight = null;
                }
                
                // Mở hoặc đóng mục vừa click
                header.classList.toggle('active');
                content.classList.toggle('active');
                
                if (header.classList.contains('active')) {
                    // Đặt max-height bằng chiều cao thực của nội dung để CSS transition hoạt động
                    content.style.maxHeight = content.scrollHeight + "px";
                } else {
                    content.style.maxHeight = null;
                }
            });
        });
    }

    // Contact info modal handlers - Already setup earlier in immediate event listeners section
    // Note: setupInfoAccordion is called when contact modal opens


    // === KẾT THÚC: LOGIC ĐIỀU KHIỂN AKKORDEON ===

    // Đợi một chút để đảm bảo tất cả component đã load xong
    setTimeout(() => {
        handleUrlParameters();
    }, 1000);

    // === USER ONBOARDING SYSTEM ===
    // DISABLED: Auto tour causes iOS white screen issues
    // Tour can be triggered manually via guide.html page
    function checkFirstTimeUser() {
        const hasVisited = localStorage.getItem('hasVisitedBefore');
        if (!hasVisited) {
            // Mark as visited but DON'T auto-start tour (causes iOS issues)
            localStorage.setItem('hasVisitedBefore', 'true');
            console.log('📖 First time user - tour disabled, use guide.html instead');
        }
    }

    function startOnboardingTour() {
        // Tạo overlay cho onboarding
        const overlay = document.createElement('div');
        overlay.id = 'onboarding-overlay';
        overlay.className = 'fixed inset-0 bg-black bg-opacity-70 z-[2000] flex items-center justify-center';
        
        overlay.innerHTML = `
            <div class="bg-white rounded-2xl max-w-md mx-4 p-6 text-center animate-pulse">
                <div class="text-6xl mb-4">👋</div>
                <h2 class="text-2xl font-bold text-gray-800 mb-3">Chào mừng bạn!</h2>
                <p class="text-gray-600 mb-6">Hãy để chúng tôi hướng dẫn bạn sử dụng website một cách hiệu quả nhất</p>
                <div class="flex space-x-3">
                    <button id="start-tour" class="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition">
                        <i class="fas fa-play mr-2"></i>Bắt đầu tour
                    </button>
                    <button id="skip-tour" class="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition">
                        Bỏ qua
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Event listeners cho tour
        document.getElementById('start-tour').addEventListener('click', () => {
            overlay.remove();
            runInteractiveTour();
        });
        
        document.getElementById('skip-tour').addEventListener('click', () => {
            overlay.remove();
        });
    }

    function runInteractiveTour() {
        const tourSteps = [
            {
                target: '#search-bar-container',
                title: '🔍 Tìm kiếm thửa đất',
                content: 'Nhập số thửa theo định dạng "Thửa 123, Tờ 45" hoặc "123/45" để tìm kiếm nhanh',
                position: 'bottom'
            },
            {
                target: '#query-btn', 
                title: '👆 Chế độ xem thông tin',
                content: 'Click vào nút này, sau đó click vào bất kỳ thửa đất nào trên bản đồ để xem thông tin chi tiết',
                position: 'top'
            },
            {
                target: '#add-location-btn',
                title: '📍 Thêm tin đăng',
                content: 'Đăng nhập và thêm thông tin bán/cho thuê để chia sẻ với cộng đồng',
                position: 'top'
            },
            {
                target: '#guide-btn',
                title: '📖 Hướng dẫn chi tiết', 
                content: 'Click để xem hướng dẫn sử dụng đầy đủ với video và ví dụ cụ thể',
                position: 'left'
            },
            {
                target: '#contact-info-btn',
                title: '💬 Hỗ trợ & Góp ý',
                content: 'Liên hệ hỗ trợ và gửi góp ý để cải thiện website',
                position: 'left'
            }
        ];
        
        let currentStep = 0;
        showTourStep(tourSteps[currentStep]);
        
        function showTourStep(step) {
            // Tìm element target
            const target = document.querySelector(step.target);
            if (!target) {
                nextStep();
                return;
            }
            
            // Tạo highlight cho element
            target.classList.add('tour-highlight');
            
            // Tạo tooltip
            const tooltip = document.createElement('div');
            tooltip.className = `tour-tooltip fixed z-[2001] bg-white rounded-lg shadow-2xl p-4 max-w-xs border-2 border-blue-500`;
            tooltip.innerHTML = `
                <div class="text-lg font-bold text-gray-800 mb-2">${step.title}</div>
                <div class="text-gray-600 mb-4">${step.content}</div>
                <div class="flex justify-between items-center">
                    <div class="text-sm text-gray-500">${currentStep + 1}/${tourSteps.length}</div>
                    <div class="space-x-2">
                        ${currentStep > 0 ? '<button id="tour-prev" class="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm">Trước</button>' : ''}
                        <button id="tour-next" class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
                            ${currentStep === tourSteps.length - 1 ? 'Hoàn thành' : 'Tiếp'}
                        </button>
                        <button id="tour-skip" class="px-3 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 text-sm">Bỏ qua</button>
                    </div>
                </div>
            `;
            
            // Vị trí tooltip
            const rect = target.getBoundingClientRect();
            const tooltipRect = { width: 300, height: 150 }; // Ước tính
            
            let left, top;
            switch(step.position) {
                case 'bottom':
                    left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
                    top = rect.bottom + 10;
                    break;
                case 'top':
                    left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
                    top = rect.top - tooltipRect.height - 10;
                    break;
                case 'left':
                    left = rect.left - tooltipRect.width - 10;
                    top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
                    break;
                case 'right':
                    left = rect.right + 10;
                    top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
                    break;
            }
            
            // Đảm bảo tooltip không ra ngoài viewport
            left = Math.max(10, Math.min(left, window.innerWidth - tooltipRect.width - 10));
            top = Math.max(10, Math.min(top, window.innerHeight - tooltipRect.height - 10));
            
            tooltip.style.left = left + 'px';
            tooltip.style.top = top + 'px';
            
            document.body.appendChild(tooltip);
            
            // Event handlers
            const nextBtn = tooltip.querySelector('#tour-next');
            const prevBtn = tooltip.querySelector('#tour-prev');
            const skipBtn = tooltip.querySelector('#tour-skip');
            
            nextBtn?.addEventListener('click', nextStep);
            prevBtn?.addEventListener('click', prevStep);
            skipBtn?.addEventListener('click', endTour);
        }
        
        function nextStep() {
            cleanupCurrentStep();
            currentStep++;
            if (currentStep < tourSteps.length) {
                showTourStep(tourSteps[currentStep]);
            } else {
                endTour();
            }
        }
        
        function prevStep() {
            cleanupCurrentStep();
            currentStep--;
            if (currentStep >= 0) {
                showTourStep(tourSteps[currentStep]);
            }
        }
        
        function cleanupCurrentStep() {
            // Remove highlight
            document.querySelectorAll('.tour-highlight').forEach(el => {
                el.classList.remove('tour-highlight');
            });
            // Remove tooltip
            document.querySelectorAll('.tour-tooltip').forEach(el => {
                el.remove();
            });
        }
        
        function endTour() {
            cleanupCurrentStep();
            
            // Show completion message
            const completionModal = document.createElement('div');
            completionModal.className = 'fixed inset-0 bg-black bg-opacity-50 z-[2000] flex items-center justify-center';
            completionModal.innerHTML = `
                <div class="bg-white rounded-2xl max-w-md mx-4 p-6 text-center">
                    <div class="text-6xl mb-4">🎉</div>
                    <h2 class="text-2xl font-bold text-gray-800 mb-3">Hoàn thành!</h2>
                    <p class="text-gray-600 mb-6">Bạn đã sẵn sàng sử dụng website. Hãy thử tìm kiếm thửa đất đầu tiên!</p>
                    <button id="complete-tour" class="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition">
                        <i class="fas fa-check mr-2"></i>Bắt đầu sử dụng
                    </button>
                </div>
            `;
            
            document.body.appendChild(completionModal);
            
            document.getElementById('complete-tour').addEventListener('click', () => {
                completionModal.remove();
                // Auto-expand search bar để khuyến khích người dùng thử
                if (searchBarContainer && !searchBarContainer.classList.contains('is-expanded')) {
                    searchBarContainer.classList.add('is-expanded');
                    searchBarContainer.querySelector('#search-input').focus();
                }
            });
        }
    }

    // Thêm CSS cho tour highlighting
    const tourCSS = `
        .tour-highlight {
            position: relative;
            z-index: 2000;
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 0 8px rgba(59, 130, 246, 0.2) !important;
            border-radius: 8px;
            animation: pulse-highlight 2s infinite;
        }
        
        @keyframes pulse-highlight {
            0%, 100% { box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 0 8px rgba(59, 130, 246, 0.2); }
            50% { box-shadow: 0 0 0 6px rgba(59, 130, 246, 0.7), 0 0 0 12px rgba(59, 130, 246, 0.3); }
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = tourCSS;
    document.head.appendChild(styleSheet);

    // Start onboarding check
    checkFirstTimeUser();

    // === ENHANCED TOOLTIPS SYSTEM ===
    function createEnhancedTooltips() {
        const tooltipElements = [
            { selector: '#search-bar-container', text: 'Tìm kiếm thửa đất (VD: Thửa 123, Tờ 45)', position: 'bottom' },
            { selector: '#add-location-btn', text: 'Thêm tin đăng bán/cho thuê (Cần đăng nhập)', position: 'top' },
            { selector: '#list-btn', text: 'Xem danh sách tất cả tin đăng', position: 'top' },
            { selector: '#login-btn', text: 'Đăng nhập bằng Google hoặc Email', position: 'left' },
            { selector: '#guide-btn', text: 'Hướng dẫn sử dụng chi tiết', position: 'left' },
            { selector: '#contact-info-btn', text: 'Hỗ trợ & Gửi góp ý', position: 'left' },
            { selector: '#locate-btn', text: 'Tìm vị trí hiện tại của bạn', position: 'left' }
        ];

        tooltipElements.forEach(item => {
            const element = document.querySelector(item.selector);
            if (element) {
                let tooltip = null;
                
                element.addEventListener('mouseenter', (e) => {
                    // Không hiển thị tooltip khi đang trong tour
                    if (document.querySelector('.tour-tooltip')) return;
                    
                    tooltip = document.createElement('div');
                    tooltip.className = 'enhanced-tooltip fixed z-[1500] bg-gray-800 text-white text-sm px-3 py-2 rounded-lg shadow-lg pointer-events-none';
                    tooltip.textContent = item.text;
                    
                    const rect = element.getBoundingClientRect();
                    let left, top;
                    
                    switch(item.position) {
                        case 'top':
                            left = rect.left + (rect.width / 2);
                            top = rect.top - 10;
                            tooltip.style.transform = 'translateX(-50%) translateY(-100%)';
                            break;
                        case 'bottom':
                            left = rect.left + (rect.width / 2);
                            top = rect.bottom + 10;
                            tooltip.style.transform = 'translateX(-50%)';
                            break;
                        case 'left':
                            left = rect.left - 10;
                            top = rect.top + (rect.height / 2);
                            tooltip.style.transform = 'translateX(-100%) translateY(-50%)';
                            break;
                        case 'right':
                            left = rect.right + 10;
                            top = rect.top + (rect.height / 2);
                            tooltip.style.transform = 'translateY(-50%)';
                            break;
                    }
                    
                    tooltip.style.left = left + 'px';
                    tooltip.style.top = top + 'px';
                    tooltip.style.opacity = '0';
                    tooltip.style.transition = 'opacity 0.2s ease';
                    
                    document.body.appendChild(tooltip);
                    
                    // Fade in
                    setTimeout(() => {
                        tooltip.style.opacity = '1';
                    }, 10);
                });
                
                element.addEventListener('mouseleave', () => {
                    if (tooltip) {
                        tooltip.style.opacity = '0';
                        setTimeout(() => {
                            if (tooltip && tooltip.parentNode) {
                                tooltip.parentNode.removeChild(tooltip);
                            }
                        }, 200);
                    }
                });
            }
        });
    }

    // Initialize enhanced tooltips
    createEnhancedTooltips();

    // === PARCEL LABELS SYSTEM ===
    let currentZoom = map.getZoom();
    

    
    // === TOAST NOTIFICATION SYSTEM ===
    function showToast(message, type = 'info', duration = 3000) {
        // Remove existing toast if any
        const existingToast = document.querySelector('.toast-notification');
        if (existingToast) {
            existingToast.remove();
        }

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast-notification fixed top-4 right-4 max-w-sm rounded-lg shadow-lg p-4 z-50 transform transition-all duration-300 translate-x-full`;
        
        // Set colors based on type
        const typeClasses = {
            success: 'bg-green-600 text-white',
            error: 'bg-red-600 text-white',
            warning: 'bg-yellow-600 text-white',
            info: 'bg-blue-600 text-white'
        };
        
        toast.className += ` ${typeClasses[type] || typeClasses.info}`;
        toast.innerHTML = `
            <div class="flex items-center">
                <span class="flex-1">${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-3 text-white hover:text-gray-200">
                    ✕
                </button>
            </div>
        `;

        document.body.appendChild(toast);

        // Trigger animation
        setTimeout(() => {
            toast.classList.remove('translate-x-full');
        }, 100);

        // Auto remove after duration
        setTimeout(() => {
            if (toast.parentElement) {
                toast.classList.add('translate-x-full');
                setTimeout(() => toast.remove(), 300);
            }
        }, duration);
    }

    // === CHARACTER COUNTER HELPER ===
    function updateCharCounter(textarea) {
        const counter = document.getElementById('char-counter');
        const current = textarea.value.length;
        const max = textarea.maxLength;
        
        counter.textContent = `${current}/${max}`;
        
        // Color coding
        if (current < 10) {
            counter.className = 'text-red-500';
        } else if (current > max * 0.8) {
            counter.className = 'text-yellow-500';
        } else {
            counter.className = 'text-gray-500';
        }
    }

    // Make function globally available
    window.updateCharCounter = updateCharCounter;

    // === PERFORMANCE OPTIMIZED LABEL SYSTEM ===
    let labelCache = new Map(); // Cache loaded labels by area
    // labelLoadTimeout is declared globally at the top of the file
    const MAX_CACHE_SIZE = 3; // Giới hạn cache để tiết kiệm memory
    
    // Memory management function
    function cleanupLabelCache() {
        if (labelCache.size > MAX_CACHE_SIZE) {
            const firstKey = labelCache.keys().next().value;
            labelCache.delete(firstKey);
        }
    }
    
    // Optimized update function with requestAnimationFrame
    function debouncedUpdateLabels() {
        clearTimeout(labelLoadTimeout);
        labelLoadTimeout = setTimeout(() => {
            if (isLabelsVisible && map.getZoom() >= MIN_LABEL_ZOOM) {
                // Use requestAnimationFrame for smooth updates
                requestAnimationFrame(() => {
                    updateParcelLabelsOptimized();
                });
            }
        }, 300); // Reduced delay to 300ms for better responsiveness
    }
    
    // Optimized label update - load only 1 relevant area
    // Optimized: Use cached objects to reduce GC pressure
    async function updateParcelLabelsOptimized() {
        parcelLabels.clearLayers();
        
        if (map.getZoom() < MIN_LABEL_ZOOM) return;
        
        try {
            const center = map.getCenter();
            
            // Find the most relevant area based on map center
            // This is a simplified approach - load only ONE area closest to center
            const targetArea = findClosestArea(center);
            
            if (targetArea && !labelCache.has(targetArea)) {
                // Load and cache only one area at a time
                const labels = await loadSingleAreaLabels(targetArea);
                labelCache.set(targetArea, labels);
                cleanupLabelCache(); // Manage memory usage
            }
            
            // Display cached labels for current area
            // Optimized: Use requestIdleCallback to avoid blocking during interactions
            const cachedLabels = labelCache.get(targetArea);
            if (cachedLabels) {
                const bounds = map.getBounds();
                // Defer label addition to avoid blocking
                if (typeof requestIdleCallback !== 'undefined') {
                    requestIdleCallback(() => {
                        cachedLabels.forEach(label => {
                            if (bounds.contains(label.getLatLng())) {
                                parcelLabels.addLayer(label);
                            }
                        });
                    }, { timeout: 1000 });
                } else {
                    // Fallback for browsers without requestIdleCallback
                    cachedLabels.forEach(label => {
                        if (bounds.contains(label.getLatLng())) {
                            parcelLabels.addLayer(label);
                        }
                    });
                }
            }
            
        } catch (error) {
            console.log('Label loading error:', error.message);
        }
    }
    
    // Find closest area to map center (simplified)
    function findClosestArea(center) {
        // Sample a few key areas around Đà Nẵng center
        const keyAreas = ['20194', '20195', '20197'];
        return keyAreas[0]; // For now, just use first area to minimize load
    }
    
    // Load single area efficiently
    // Optimized: Avoid reduce() to minimize GC pressure
    async function loadSingleAreaLabels(maXa) {
        try {
            const response = await fetch(`data/parcels/${maXa}.geojson`);
            if (!response.ok) return [];
            
            const geojson = await response.json();
            const labels = [];
            
            // Process only first 20 features to reduce computation
            const features = geojson.features.slice(0, 20);
            
            // Reuse coordinate accumulators to reduce object allocation
            let sumLng = 0, sumLat = 0;
            
            features.forEach(feature => {
                const props = feature.properties;
                if (props?.SoThuTuThua && feature.geometry?.coordinates) {
                    const coords = feature.geometry.coordinates[0];
                    if (coords && coords.length > 3) {
                        // Optimized: Use simple loop instead of reduce() to avoid intermediate objects
                        sumLng = 0;
                        sumLat = 0;
                        let coordCount = 0;
                        
                        for (let i = 0; i < coords.length; i++) {
                            const coord = coords[i];
                            if (Array.isArray(coord) && coord.length >= 2) {
                                sumLng += coord[0];
                                sumLat += coord[1];
                                coordCount++;
                            }
                        }
                        
                        if (coordCount > 0) {
                            const centerLng = sumLng / coordCount;
                            const centerLat = sumLat / coordCount;
                            
                            const label = L.marker([centerLat, centerLng], {
                                icon: L.divIcon({
                                    className: 'parcel-number-label',
                                    html: props.SoThuTuThua,
                                    iconSize: [null, null],
                                    iconAnchor: [10, 6]
                                }),
                                interactive: false
                            });
                            
                            labels.push(label);
                        }
                    }
                }
            });
            
            return labels;
        } catch (error) {
            return [];
        }
    }
    
    // Update labels with optimized event handling
    map.on('zoomend', debouncedUpdateLabels);
    map.on('moveend', () => {
        clearTimeout(moveTimeout);
        moveTimeout = setTimeout(debouncedUpdateLabels, 200); // Separate timeout for move events
    });
    
    // Performance monitoring (remove in production if needed)
    if (window.location.hostname === 'localhost') {
        let performanceTimer = Date.now();
        map.on('zoomstart movestart', () => { performanceTimer = Date.now(); });
        map.on('zoomend moveend', () => {
            const elapsed = Date.now() - performanceTimer;
            if (elapsed > 100) console.log(`⚠️ Map operation took ${elapsed}ms`);
        });
    }
    
    // Handle layer toggle
    map.on('overlayadd', (e) => {
        if (e.name === '🏷️ Số thửa') {
            isLabelsVisible = true;
            debouncedUpdateLabels();
        }
    });

    map.on('overlayremove', (e) => {
        if (e.name === '🏷️ Số thửa') {
            isLabelsVisible = false;
            parcelLabels.clearLayers();
            clearTimeout(labelLoadTimeout);
        }
    });

    // === ADVANCED FILTERING SYSTEM ===
    let filterState = {
        landUse: '',
        areaMin: null,
        areaMax: null,
        district: '',
        mapSheet: null,
        isActive: false
    };

    let filteredResults = [];
    let currentPage = 1;
    const resultsPerPage = 20;

    // Initialize filter system
    function initializeFilters() {
        const toggleBtn = document.getElementById('toggle-filters');
        const filtersPanel = document.getElementById('filters-panel');
        const resetBtn = document.getElementById('reset-filters');
        
        // Toggle panel
        toggleBtn?.addEventListener('click', () => {
            filtersPanel.classList.toggle('hidden');
            const isVisible = !filtersPanel.classList.contains('hidden');
            toggleBtn.querySelector('i').classList.toggle('fa-filter', !isVisible);
            toggleBtn.querySelector('i').classList.toggle('fa-times', isVisible);
        });

        // Reset filters
        resetBtn?.addEventListener('click', resetFilters);

        // Area presets
        document.querySelectorAll('.area-preset').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const min = e.target.dataset.min;
                const max = e.target.dataset.max;
                document.getElementById('area-min').value = min || '';
                document.getElementById('area-max').value = max || '';
                applyFilters();
            });
        });

        // Filter change events
        ['land-use-filter', 'district-filter', 'map-sheet-filter', 'area-min', 'area-max'].forEach(id => {
            const element = document.getElementById(id);
            element?.addEventListener('change', applyFilters);
            element?.addEventListener('input', debounce(applyFilters, 500));
        });

        // Initial count
        updateFilterCount();
    }

    // Apply filters to parcel data
    async function applyFilters() {
        const landUse = document.getElementById('land-use-filter')?.value || '';
        const areaMin = parseFloat(document.getElementById('area-min')?.value) || null;
        const areaMax = parseFloat(document.getElementById('area-max')?.value) || null;
        const district = document.getElementById('district-filter')?.value || '';
        const mapSheet = parseInt(document.getElementById('map-sheet-filter')?.value) || null;

        filterState = { landUse, areaMin, areaMax, district, mapSheet, isActive: true };

        // Show loading
        updateFilterCount('Đang lọc...');

        try {
            // Collect all parcel data from loaded areas
            let allParcels = [];
            
            // Get data from search cache
            for (const [area, data] of Object.entries(searchCache)) {
                if (data?.features) {
                    allParcels = allParcels.concat(data.features);
                }
            }

            // If no cached data, load from available files
            if (allParcels.length === 0) {
                await loadSampleParcelData();
                for (const [area, data] of Object.entries(searchCache)) {
                    if (data?.features) {
                        allParcels = allParcels.concat(data.features);
                    }
                }
            }

            // Apply filters
            filteredResults = allParcels.filter(feature => {
                const props = feature.properties;
                
                // Land use filter
                if (landUse && props.KyHieuMucDichSuDung !== landUse) return false;
                
                // Area filter
                if (areaMin !== null && props.DienTich < areaMin) return false;
                if (areaMax !== null && props.DienTich > areaMax) return false;
                
                // District filter (based on MaXa code)
                if (district && !props.MaXa?.startsWith(district)) return false;
                
                // Map sheet filter
                if (mapSheet !== null && props.SoHieuToBanDo !== mapSheet) return false;
                
                return true;
            });

            currentPage = 1;
            updateFilterCount();
            displayFilteredResults();

        } catch (error) {
            console.error('Filter error:', error);
            updateFilterCount('Lỗi khi lọc dữ liệu');
        }
    }

    // Load sample data for filtering
    async function loadSampleParcelData() {
        const sampleAreas = ['20194', '20195', '20197']; // Load a few areas for demo
        
        for (const area of sampleAreas) {
            if (!searchCache[area]) {
                try {
                    const response = await fetch(`data/parcels/${area}.geojson`);
                    if (response.ok) {
                        const data = await response.json();
                        searchCache[area] = data;
                    }
                } catch (error) {
                    console.warn(`Could not load area ${area}:`, error);
                }
            }
        }
    }

    // Update filter count display
    function updateFilterCount(customText = null) {
        const countElement = document.getElementById('filter-count');
        if (customText) {
            countElement.textContent = customText;
            return;
        }

        const hasFilters = filterState.landUse || filterState.areaMin || filterState.areaMax || filterState.district || filterState.mapSheet;
        
        if (!hasFilters) {
            countElement.textContent = 'Chưa áp dụng bộ lọc';
        } else {
            countElement.textContent = `Tìm thấy ${filteredResults.length} thửa đất`;
        }
    }

    // Display filtered results
    function displayFilteredResults() {
        const resultsContainer = document.getElementById('search-results');
        
        if (filteredResults.length === 0) {
            resultsContainer.innerHTML = '<div class="p-4 text-center text-gray-500">Không tìm thấy thửa đất phù hợp</div>';
            resultsContainer.classList.remove('hidden');
            return;
        }

        // Pagination logic
        const startIndex = (currentPage - 1) * resultsPerPage;
        const endIndex = startIndex + resultsPerPage;
        const pageResults = filteredResults.slice(startIndex, endIndex);
        const totalPages = Math.ceil(filteredResults.length / resultsPerPage);

        let html = `
            <div class="p-3 border-b bg-gray-50">
                <div class="flex justify-between items-center text-sm">
                    <span class="font-medium">${filteredResults.length} kết quả</span>
                    ${totalPages > 1 ? `<span>Trang ${currentPage}/${totalPages}</span>` : ''}
                </div>
            </div>
        `;

        // Results
        pageResults.forEach((feature, index) => {
            const props = feature.properties;
            const globalIndex = startIndex + index;
            
            html += `
                <div class="filter-result-item p-3 border-b hover:bg-blue-50 cursor-pointer" data-index="${globalIndex}">
                    <div class="font-medium text-sm">Thửa ${props.SoThuTuThua}, Tờ ${props.SoHieuToBanDo}</div>
                    <div class="text-xs text-gray-600">
                        📐 ${props.DienTich}m² • 🏷️ ${getLandUseLabel(props.KyHieuMucDichSuDung)}
                    </div>
                    <div class="text-xs text-gray-500">Khu vực: ${props.MaXa}</div>
                </div>
            `;
        });

        // Pagination
        if (totalPages > 1) {
            html += `
                <div class="p-3 border-t bg-gray-50 flex justify-center space-x-2">
                    ${currentPage > 1 ? `<button class="px-3 py-1 text-xs bg-blue-500 text-white rounded" onclick="changePage(${currentPage - 1})">Trước</button>` : ''}
                    ${currentPage < totalPages ? `<button class="px-3 py-1 text-xs bg-blue-500 text-white rounded" onclick="changePage(${currentPage + 1})">Sau</button>` : ''}
                </div>
            `;
        }

        resultsContainer.innerHTML = html;
        resultsContainer.classList.remove('hidden');

        // Add click handlers for results
        document.querySelectorAll('.filter-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                const feature = filteredResults[index];
                highlightParcel(feature);
            });
        });
    }

    // Add parcel to portfolio from search results
    window.addParcelToPortfolio = function(soThua, soTo, dienTich, loaiDat, maXa) {
        console.log('🎯 Adding parcel to portfolio:', { soThua, soTo, dienTich, loaiDat, maXa });
        
        if (!currentUser) {
            alert('Vui lòng đăng nhập để sử dụng chức năng Ví BĐS!');
            
            // Trigger login
            const loginBtn = document.getElementById('login-btn');
            if (loginBtn) {
                loginBtn.click();
            }
            return;
        }

        // Get current coordinates and create location link
        let currentLat, currentLng, locationUrl;
        
        if (window.map && typeof window.map.getCenter === 'function') {
            const center = window.map.getCenter();
            currentLat = center.lat;
            currentLng = center.lng;
            locationUrl = `${window.location.origin}${window.location.pathname}?lat=${currentLat}&lng=${currentLng}`;
        } else {
            console.warn('⚠️ Map not available, using default coordinates');
            currentLat = 16.054456; // Default Da Nang coordinates
            currentLng = 108.202167;
            locationUrl = `${window.location.origin}${window.location.pathname}?lat=${currentLat}&lng=${currentLng}`;
        }

        console.log('🔍 Debug location creation:', {
            mapExists: !!window.map,
            mapGetCenter: typeof window.map?.getCenter,
            currentLat,
            currentLng,
            locationUrl
        });

        // Store parcel data globally for form
        selectedParcelData = {
            soThua: soThua,
            soTo: soTo,
            dienTich: dienTich,
            loaiDat: loaiDat,
            maXa: maXa,
            diaChi: `Thửa ${soThua}, Tờ ${soTo}, ${maXa}`,
            lat: currentLat,
            lng: currentLng,
            locationUrl: locationUrl  // Add location URL for viewing
        };

        console.log('📍 Selected parcel data:', selectedParcelData);

        // Open add portfolio modal with pre-filled data
        const addModal = document.getElementById('add-portfolio-modal');
        const portfolioForm = document.getElementById('portfolio-form');
        
        if (addModal && portfolioForm) {
            // Pre-fill form
            const nameInput = document.getElementById('portfolio-name');
            const areaInput = document.getElementById('portfolio-area');
            
            // Reset form first
            portfolioForm.reset();
            
            // Then set values
            if (nameInput) {
                nameInput.value = `${loaiDat} - Thửa ${soThua}, Tờ ${soTo}`;
            }
            if (areaInput) {
                areaInput.value = dienTich;
            }
            
            delete portfolioForm.dataset.editingId;
            
            // Update modal title
            const titleElement = document.getElementById('add-portfolio-title');
            if (titleElement) {
                titleElement.innerHTML = `
                    <i class="fa-solid fa-plus mr-2 text-indigo-600"></i>
                    Thêm "${loaiDat}" vào Ví BĐS
                `;
            }

            showModal(addModal);
            
            // Focus on name input for editing
            setTimeout(() => {
                if (nameInput) {
                    nameInput.focus();
                    nameInput.select();
                }
            }, 200);
        }
    };

    // Get user-friendly land use label
    function getLandUseLabel(code) {
        const labels = {
            'ODT': 'Đất ở đô thị',
            'DGT': 'Đất giao thông',
            'NTO': 'Đất nông nghiệp',
            'LUP': 'Đất lâm nghiệp',
            'SXD': 'Đất sản xuất',
            'CQT': 'Đất cơ quan'
        };
        return labels[code] || code;
    }

    // Reset all filters
    function resetFilters() {
        document.getElementById('land-use-filter').value = '';
        document.getElementById('area-min').value = '';
        document.getElementById('area-max').value = '';
        document.getElementById('district-filter').value = '';
        document.getElementById('map-sheet-filter').value = '';
        
        filterState = {
            landUse: '',
            areaMin: null,
            areaMax: null,
            district: '',
            mapSheet: null,
            isActive: false
        };
        
        filteredResults = [];
        document.getElementById('search-results').classList.add('hidden');
        updateFilterCount();
    }

    // Pagination helper
    window.changePage = function(page) {
        currentPage = page;
        displayFilteredResults();
    };

    // Debounce helper
    function debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    // Highlight specific parcel from filter results
    function highlightParcel(feature) {
        if (!feature?.geometry?.coordinates) return;

        try {
            // Clear existing highlights
            highlightLayer.clearLayers();

            // Create highlight polygon
            const coords = feature.geometry.coordinates[0];
            const latLngs = coords.map(coord => [coord[1], coord[0]]);
            
            const highlightPolygon = L.polygon(latLngs, {
                color: '#ff0000',
                weight: 3,
                fillColor: '#ff0000',
                fillOpacity: 0.3,
                dashArray: '5, 5'
            });

            highlightLayer.addLayer(highlightPolygon);

            // Zoom to parcel
            const bounds = highlightPolygon.getBounds();
            map.fitBounds(bounds, { padding: [20, 20] });

            // Show parcel info
            const props = feature.properties;
            showParcelInfo(props);

            // Auto-remove highlight after 10 seconds
            setTimeout(() => {
                highlightLayer.clearLayers();
            }, 10000);

        } catch (error) {
            console.error('Error highlighting parcel:', error);
            showToast('❌ Không thể hiển thị thửa đất này', 'error');
        }
    }

    // Show parcel information panel
    function showParcelInfo(props) {
        const panel = document.getElementById('info-panel');
        const title = document.getElementById('panel-title');
        const content = document.getElementById('panel-content');

        title.textContent = `Thửa ${props.SoThuTuThua}, Tờ ${props.SoHieuToBanDo}`;
        
        // Check if community data exists
        const key = `${props.SoThuTuThua}_${props.SoHieuToBanDo}`;
        const communityData = communityContributions.get(key);
        
        let communitySection = '';
        if (communityData) {
            const community = communityData.communityData;
            communitySection = `
                <div class="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <h4 class="font-bold text-green-800 text-sm mb-2">
                        <i class="fas fa-users mr-1"></i>Thông tin từ cộng đồng
                    </h4>
                    ${community.projectName ? `<div class="text-xs text-green-700 mb-1">🏗️ Dự án: ${community.projectName}</div>` : ''}
                    ${community.lotNumber ? `<div class="text-xs text-green-700 mb-1">📍 Số lô: ${community.lotNumber}</div>` : ''}
                    ${community.blockCode ? `<div class="text-xs text-green-700 mb-1">🏢 Block: ${community.blockCode}</div>` : ''}
                    ${community.commonName ? `<div class="text-xs text-green-700 mb-1">🏷️ Tên gọi: ${community.commonName}</div>` : ''}
                    ${community.marketPrice ? `<div class="text-xs text-green-700 mb-1">💰 Giá: ${community.marketPrice} triệu${community.priceUnit === 'per_m2' ? '/m²' : ''}</div>` : ''}
                    ${community.brokerCode ? `<div class="text-xs text-green-700">🔖 Mã: ${community.brokerCode}</div>` : ''}
                </div>
            `;
        }
        
        content.innerHTML = `
            <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                    <span class="text-gray-600">Diện tích:</span>
                    <span class="font-medium">${props.DienTich} m²</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">Mục đích sử dụng:</span>
                    <span class="font-medium">${getLandUseLabel(props.KyHieuMucDichSuDung)}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">Khu vực:</span>
                    <span class="font-medium">${props.MaXa}</span>
                </div>
                ${communitySection}
                <div class="pt-2 border-t space-y-2">
                    <button class="w-full bg-indigo-600 text-white py-2 rounded text-sm hover:bg-indigo-700 transition font-medium" 
                            onclick="addParcelToPortfolio('${props.SoThuTuThua}', '${props.SoHieuToBanDo}', '${props.DienTich}', '${getLandUseLabel(props.KyHieuMucDichSuDung)}', '${props.MaXa}')">
                        <i class="fa-solid fa-briefcase mr-2"></i>Thêm vào Ví BĐS
                    </button>
                    <button class="w-full bg-blue-500 text-white py-2 rounded text-sm hover:bg-blue-600 transition" 
                            onclick="downloadParcelInfo('${props.SoThuTuThua}', '${props.SoHieuToBanDo}')">
                        📄 Tải thông tin chi tiết
                    </button>
                    <button class="w-full bg-green-600 text-white py-2 rounded text-sm hover:bg-green-700 transition" 
                            onclick="openContributionForParcel('${props.SoThuTuThua}', '${props.SoHieuToBanDo}', '${props.DienTich}', '${props.KyHieuMucDichSuDung}', '${props.MaXa}')">
                        <i class="fas fa-plus-circle mr-1"></i>${communityData ? 'Cập nhật' : 'Bổ sung'} thông tin cộng đồng
                    </button>
                </div>
            </div>
        `;

        // Show panel
        panel.classList.remove('translate-y-full');
    }

    // Show portfolio item info when parcel data is not available
    function showPortfolioItemInfo(item) {
        const panel = document.getElementById('info-panel');
        const title = document.getElementById('panel-title');
        const content = document.getElementById('panel-content');

        title.textContent = item.name || 'Bất động sản trong ví';
        
        const formatDate = (timestamp) => {
            if (!timestamp) return 'Không có thông tin';
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return date.toLocaleDateString('vi-VN', { 
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        };

        content.innerHTML = `
            <div class="space-y-3 text-sm">
                <div class="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <h4 class="font-bold text-indigo-800 text-sm mb-2">
                        <i class="fa-solid fa-briefcase mr-1"></i>Thông tin Ví BĐS
                    </h4>
                </div>
                
                <div class="space-y-2">
                    <div class="flex justify-between">
                        <span class="text-gray-600">Tên gọi:</span>
                        <span class="font-medium">${item.name || 'Chưa đặt tên'}</span>
                    </div>
                    
                    ${item.area ? `
                    <div class="flex justify-between">
                        <span class="text-gray-600">Diện tích:</span>
                        <span class="font-medium">${item.area} m²</span>
                    </div>` : ''}
                    
                    ${item.landUse ? `
                    <div class="flex justify-between">
                        <span class="text-gray-600">Mục đích sử dụng:</span>
                        <span class="font-medium">${item.landUse}</span>
                    </div>` : ''}
                    
                    ${item.price ? `
                    <div class="flex justify-between">
                        <span class="text-gray-600">Giá ước tính:</span>
                        <span class="font-medium">${item.price} triệu</span>
                    </div>` : ''}
                    
                    <div class="flex justify-between">
                        <span class="text-gray-600">Vị trí:</span>
                        <span class="font-medium">${item.lat ? `${item.lat.toFixed(6)}, ${item.lng.toFixed(6)}` : 'Chưa xác định'}</span>
                    </div>
                    
                    <div class="flex justify-between">
                        <span class="text-gray-600">Tình trạng:</span>
                        <span class="font-medium">
                            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs ${item.isPrivate ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}">
                                <i class="fas ${item.isPrivate ? 'fa-lock' : 'fa-globe'} mr-1"></i>
                                ${item.isPrivate ? 'Riêng tư' : 'Công khai'}
                            </span>
                        </span>
                    </div>
                    
                    <div class="flex justify-between">
                        <span class="text-gray-600">Ngày lưu:</span>
                        <span class="font-medium">${formatDate(item.createdAt)}</span>
                    </div>
                    
                    ${item.notes ? `
                    <div class="pt-2 border-t">
                        <span class="text-gray-600 block mb-1">Ghi chú:</span>
                        <div class="bg-gray-50 p-2 rounded text-xs">${item.notes}</div>
                    </div>` : ''}
                </div>
                
                <div class="pt-3 border-t space-y-2">
                    <button class="w-full bg-indigo-600 text-white py-2 rounded text-sm hover:bg-indigo-700 transition font-medium" 
                            onclick="editPortfolioItem('${item.id}')">
                        <i class="fas fa-edit mr-2"></i>Chỉnh sửa
                    </button>
                    <button class="w-full bg-red-500 text-white py-2 rounded text-sm hover:bg-red-600 transition" 
                            onclick="deletePortfolioItem('${item.id}')">
                        <i class="fas fa-trash mr-2"></i>Xóa khỏi ví
                    </button>
                    <button class="w-full bg-gray-500 text-white py-2 rounded text-sm hover:bg-gray-600 transition" 
                            onclick="closeInfoPanel()">
                        <i class="fas fa-times mr-2"></i>Đóng
                    </button>
                </div>
            </div>
        `;

        // Show panel
        panel.classList.remove('translate-y-full');
    }

    // Close info panel function
    function closeInfoPanel() {
        const panel = document.getElementById('info-panel');
        panel.classList.add('translate-y-full');
    }
    
    // Make closeInfoPanel available globally
    window.closeInfoPanel = closeInfoPanel;

    // Download parcel info helper
    window.downloadParcelInfo = function(parcelNumber, mapSheet) {
        const info = {
            thu: parcelNumber,
            to: mapSheet,
            timestamp: new Date().toISOString(),
            source: 'xemgiadat'
        };
        
        const blob = new Blob([JSON.stringify(info, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `thua-${parcelNumber}-to-${mapSheet}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        showToast('📄 Đã tải thông tin thửa đất', 'success');
    };

    // Open contribution modal for specific parcel
    window.openContributionForParcel = function(parcelNumber, mapSheet, area, landUse, adminCode) {
        if (!currentUser) {
            showToast('⚠️ Vui lòng đăng nhập để đóng góp thông tin', 'warning');
            return;
        }

        // Set selected parcel data
        selectedParcelForContribution = {
            parcelNumber: parseInt(parcelNumber),
            mapSheet: parseInt(mapSheet),
            area: parseFloat(area),
            landUse: landUse,
            adminCode: adminCode
        };

        // Pre-fill form
        document.getElementById('contrib-parcel').value = parcelNumber;
        document.getElementById('contrib-map-sheet').value = mapSheet;
        document.getElementById('parcel-info-text').textContent = 
            `Thửa ${parcelNumber}, Tờ ${mapSheet} - ${area}m²`;
        document.getElementById('selected-parcel-info').classList.remove('hidden');
        document.getElementById('next-step-1').disabled = false;

        // Check if community data already exists
        const key = `${parcelNumber}_${mapSheet}`;
        const existingData = communityContributions.get(key);
        
        if (existingData) {
            // Pre-fill form with existing data
            const form = document.getElementById('contribution-form');
            const community = existingData.communityData;
            
            form.projectName.value = community.projectName || '';
            form.lotNumber.value = community.lotNumber || '';
            form.blockCode.value = community.blockCode || '';
            form.commonName.value = community.commonName || '';
            form.marketPrice.value = community.marketPrice || '';
            form.priceUnit.value = community.priceUnit || 'total';
            form.brokerCode.value = community.brokerCode || '';
            form.description.value = community.description || '';
            
            showToast('ℹ️ Đã tải thông tin cộng đồng hiện có để chỉnh sửa', 'info');
        }

    // Open modal and go to step 2 directly
    showModal(document.getElementById('contribution-modal'));
        goToStep2();
    };

    // Refresh current parcel info if displayed
    function refreshCurrentParcelInfo() {
        const panel = document.getElementById('info-panel');
        const title = document.getElementById('panel-title');
        
        if (!panel.classList.contains('translate-y-full') && title.textContent) {
            // Panel is open, extract parcel info and refresh
            const match = title.textContent.match(/Thửa (\d+), Tờ (\d+)/);
            if (match) {
                const [, parcelNumber, mapSheet] = match;
                // Simulate props object to refresh display
                const props = {
                    SoThuTuThua: parcelNumber,
                    SoHieuToBanDo: mapSheet,
                    DienTich: selectedParcelForContribution?.area || 'N/A',
                    KyHieuMucDichSuDung: selectedParcelForContribution?.landUse || 'N/A',
                    MaXa: selectedParcelForContribution?.adminCode || 'N/A'
                };
                showParcelInfo(props);
            }
        }
    }

    // Initialize filters when DOM is ready
    initializeFilters();

// === COMMUNITY CONTRIBUTION SYSTEM ===
let selectedParcelForContribution = null;
let communityContributions = new Map(); // Store user contributions

// Anti-spam and rate limiting
let lastContributionTime = 0;
let userContributionCount = 0;
const CONTRIBUTION_COOLDOWN = 60000; // 1 minute between contributions
const MAX_CONTRIBUTIONS_PER_HOUR = 5;
const userContributionTimestamps = [];

    // Check if user can contribute (anti-spam)
    function canUserContribute() {
        const now = Date.now();
        
        // Check cooldown
        if (now - lastContributionTime < CONTRIBUTION_COOLDOWN) {
            const remainingTime = Math.ceil((CONTRIBUTION_COOLDOWN - (now - lastContributionTime)) / 1000);
            showToast(`⏳ Vui lòng đợi ${remainingTime} giây trước khi đóng góp tiếp`, 'warning');
            return false;
        }
        
        // Check hourly limit
        const oneHourAgo = now - (60 * 60 * 1000);
        const recentContributions = userContributionTimestamps.filter(time => time > oneHourAgo);
        
        if (recentContributions.length >= MAX_CONTRIBUTIONS_PER_HOUR) {
            showToast('⚠️ Bạn đã đạt giới hạn 5 đóng góp/giờ. Vui lòng thử lại sau.', 'warning');
            return false;
        }
        
        return true;
    }

    // Record contribution for rate limiting
    function recordContribution() {
        const now = Date.now();
        lastContributionTime = now;
        userContributionTimestamps.push(now);
        userContributionCount++;
        
        // Clean old timestamps
        const oneHourAgo = now - (60 * 60 * 1000);
        const index = userContributionTimestamps.findIndex(time => time > oneHourAgo);
        if (index > 0) {
            userContributionTimestamps.splice(0, index);
        }
    }

// Initialize contribution system
function initializeCommunityContribution() {
    console.log('🚀 Initializing Community Contribution System...');
    
    // Check if contribute button exists (it was removed from UI)
    const contributeBtn = document.getElementById('contribute-btn');
    const contributionModal = document.getElementById('contribution-modal');
    const closeModalBtn = document.getElementById('close-contribution-modal');
    
    console.log('Contribute button:', contributeBtn ? 'Found' : 'Not found (removed from UI)');
    console.log('Contribution modal:', contributionModal);
    
    // Modal controls with debugging
    if (contributeBtn) {
        // Clear any existing listeners
        const newBtn = contributeBtn.cloneNode(true);
        contributeBtn.parentNode.replaceChild(newBtn, contributeBtn);
        
        newBtn.addEventListener('click', function(e) {
            console.log('🔥 Contribute button clicked!');
            e.preventDefault();
            e.stopPropagation();
            openContributionModal();
        });
        console.log('✅ Contribute button listener added');
    }
    
    closeModalBtn?.addEventListener('click', closeContributionModal);
    
    // Step navigation
    document.getElementById('next-step-1')?.addEventListener('click', goToStep2);
    document.getElementById('back-step-2')?.addEventListener('click', goToStep1);
    document.getElementById('search-parcel-btn')?.addEventListener('click', searchParcelForContribution);
    document.getElementById('submit-contribution')?.addEventListener('click', submitContribution);
    
    // Load existing community data
    loadCommunityContributions();
}

// Đảm bảo hàm sẵn sàng ở global scope
window.initializeCommunityContribution = initializeCommunityContribution;

// Export các functions modal để đảm bảo accessible
window.openContributionModal = openContributionModal;
window.closeContributionModal = closeContributionModal;
// Analytics dashboard removed - placeholder for compatibility
window.openAnalyticsDashboard = function() { console.log('Analytics dashboard feature removed'); };
window.closeAnalyticsDashboard = function() { console.log('Analytics dashboard feature removed'); };

function openContributionModal() {
    console.log('🔥 Opening contribution modal...');
    if (!currentUser) {
        showToast('⚠️ Vui lòng đăng nhập để đóng góp thông tin', 'warning');
        return;
    }
    
    const modal = document.getElementById('contribution-modal');
    showModal(modal);
}

function closeContributionModal() {
    const modal = document.getElementById('contribution-modal');
    hideModal(modal);
    resetContributionForm();
}

function goToStep1() {
    document.getElementById('contribution-step-1').classList.remove('hidden');
    document.getElementById('contribution-step-2').classList.add('hidden');
}

function goToStep2() {
    document.getElementById('contribution-step-1').classList.add('hidden');
    document.getElementById('contribution-step-2').classList.remove('hidden');
}

    function resetContributionForm() {
        selectedParcelForContribution = null;
        document.getElementById('contrib-parcel').value = '';
        document.getElementById('contrib-map-sheet').value = '';
        document.getElementById('selected-parcel-info').classList.add('hidden');
        document.getElementById('next-step-1').disabled = true;
        document.getElementById('contribution-form').reset();
        goToStep1();
    }

    // Search for parcel to contribute to
    async function searchParcelForContribution() {
        const parcelNum = document.getElementById('contrib-parcel').value;
        const mapSheet = document.getElementById('contrib-map-sheet').value;
        
        if (!parcelNum || !mapSheet) {
            showToast('⚠️ Vui lòng nhập số thửa và số tờ', 'warning');
            return;
        }

        try {
            // Search in existing data
            const result = await searchParcel(parcelNum, mapSheet);
            
            if (result) {
                selectedParcelForContribution = {
                    parcelNumber: parcelNum,
                    mapSheet: mapSheet,
                    area: result.DienTich,
                    landUse: result.KyHieuMucDichSuDung,
                    adminCode: result.MaXa,
                    geometry: result.geometry
                };
                
                document.getElementById('parcel-info-text').textContent = 
                    `Thửa ${parcelNum}, Tờ ${mapSheet} - ${result.DienTich}m²`;
                document.getElementById('selected-parcel-info').classList.remove('hidden');
                document.getElementById('next-step-1').disabled = false;
                
                showToast('✅ Đã tìm thấy thửa đất', 'success');
            } else {
                showToast('❌ Không tìm thấy thửa đất này', 'error');
            }
        } catch (error) {
            console.error('Error searching parcel:', error);
            showToast('❌ Lỗi khi tìm kiếm thửa đất', 'error');
        }
    }

    // Submit community contribution
    async function submitContribution() {
        if (!selectedParcelForContribution) {
            showToast('⚠️ Vui lòng chọn thửa đất trước', 'warning');
            return;
        }

        // Check anti-spam rate limiting
        if (!canUserContribute()) {
            return;
        }

        const form = document.getElementById('contribution-form');
        const formData = new FormData(form);
        const submitButton = document.getElementById('submit-contribution');
        const submitText = submitButton.querySelector('.submit-text');
        const submitLoading = submitButton.querySelector('.submit-loading');
        
        // Show loading state
        submitButton.disabled = true;
        submitText.classList.add('hidden');
        submitLoading.classList.remove('hidden');
        
        // Clear any previous messages
        const messageContainer = document.getElementById('contribution-message');
        if (messageContainer) {
            messageContainer.classList.add('hidden');
        }
        
        try {
            // Enhanced validation
            const validationErrors = validateContributionForm(formData);
            if (validationErrors.length > 0) {
                showContributionMessage(`❌ ${validationErrors[0]}`, 'error');
                throw new Error('Validation failed');
            }

            // Content validation (enhanced spam detection)
            const description = formData.get('description')?.trim() || '';
            if (description.length > 500) {
                showContributionMessage('⚠️ Mô tả không được quá 500 ký tự', 'warning');
                throw new Error('Content too long');
            }

            const contributionData = {
                // Link to official parcel
                officialData: {
                    parcelNumber: selectedParcelForContribution.parcelNumber,
                    mapSheet: selectedParcelForContribution.mapSheet,
                area: selectedParcelForContribution.area,
                landUse: selectedParcelForContribution.landUse,
                adminCode: selectedParcelForContribution.adminCode
            },
            
            // Community data
            communityData: {
                projectName: formData.get('projectName') || null,
                lotNumber: formData.get('lotNumber') || null,
                blockCode: formData.get('blockCode') || null,
                commonName: formData.get('commonName') || null,
                marketPrice: parseFloat(formData.get('marketPrice')) || null,
                priceUnit: formData.get('priceUnit') || 'total',
                brokerCode: formData.get('brokerCode') || null,
                description: description || null,
                isVerified: formData.get('isVerified') === 'on'
            },
            
            // Contributor info
            contributor: {
                userId: currentUser.uid,
                userName: currentUser.displayName || 'User',
                email: currentUser.email,
                contributorName: formData.get('contributorName') || null,
                contributorPhone: formData.get('contributorPhone') || null
            },
            
            // Metadata
            timestamp: new Date().toISOString(),
            status: 'pending', // pending, verified, rejected
            source: 'community',
            ipAddress: 'hidden', // For spam tracking
            userAgent: navigator.userAgent.substring(0, 100) // Truncated for privacy
        };

            // Save to Firebase with moderation queue
            const docRef = await db.collection('communityContributions').add(contributionData);
            console.log('✅ Community contribution saved for moderation:', docRef.id);
            
            // Store locally for immediate preview (pending status)
            const key = `${selectedParcelForContribution.parcelNumber}_${selectedParcelForContribution.mapSheet}`;
            contributionData.status = 'pending';
            contributionData.id = docRef.id;
            communityContributions.set(key, contributionData);
            
            // Record for rate limiting
            recordContribution();
            
            showContributionMessage('🎉 Cảm ơn bạn đã đóng góp! Thông tin sẽ được kiểm duyệt và cập nhật trong 24h.', 'success');
            setTimeout(() => {
                closeContributionModal();
            }, 2000);
            
            // Update search system to include community data
            updateSearchWithCommunityData();
            
            // Refresh parcel info if it's currently displayed
            refreshCurrentParcelInfo();
            
        } catch (error) {
            console.error('❌ Error in contribution:', error);
            if (error.message !== 'Validation failed' && error.message !== 'Content too long') {
                showContributionMessage('❌ Có lỗi khi lưu thông tin. Vui lòng thử lại.', 'error');
            }
        } finally {
            // Reset loading state
            submitButton.disabled = false;
            submitText.classList.remove('hidden');
            submitLoading.classList.add('hidden');
        }
    }

    // Load existing community contributions
    async function loadCommunityContributions() {
        try {
            const snapshot = await db.collection('communityContributions')
                .where('status', '==', 'verified')
                .orderBy('timestamp', 'desc')
                .limit(100)
                .get();
            
            snapshot.forEach(doc => {
                const data = doc.data();
                const key = `${data.officialData.parcelNumber}_${data.officialData.mapSheet}`;
                communityContributions.set(key, data);
            });
            
            console.log(`📊 Loaded ${communityContributions.size} community contributions from Firebase`);
            
        } catch (error) {
            console.warn('Could not load community contributions from Firebase, using demo data:', error);
        }
        
        // Add demo community data for testing
        addDemoCommunityData();
        updateSearchWithCommunityData();
    }

    // Add demo community data for testing
    function addDemoCommunityData() {
        const demoData = [
            {
                officialData: { parcelNumber: 55, mapSheet: 1, area: 1078.9, landUse: 'ODT', adminCode: '20194' },
                communityData: {
                    projectName: 'Khu đô thị Vinhomes Dragon Bay',
                    lotNumber: 'Lô 19 B2',
                    blockCode: 'Block B',
                    commonName: 'Lô góc đường Trần Hưng Đạo',
                    marketPrice: 25.5,
                    priceUnit: 'per_m2',
                    brokerCode: 'VH-DB-019',
                    description: 'Lô đất đẹp, hướng Đông Nam, mặt tiền 8m',
                    isVerified: true
                },
                contributor: { userId: 'demo', userName: 'Demo User' },
                timestamp: new Date().toISOString(),
                status: 'verified'
            },
            {
                officialData: { parcelNumber: 20, mapSheet: 1, area: 509, landUse: 'ODT', adminCode: '20194' },
                communityData: {
                    projectName: 'Dự án Sunshine City',
                    lotNumber: 'Plot A-15',
                    blockCode: 'Khu A',
                    commonName: 'Shophouse số 20',
                    marketPrice: 18.2,
                    priceUnit: 'per_m2',
                    brokerCode: 'SC-A15',
                    description: 'Shophouse 3 tầng, vị trí đẹp',
                    isVerified: true
                },
                contributor: { userId: 'demo2', userName: 'Broker Demo' },
                timestamp: new Date().toISOString(),
                status: 'verified'
            },
            {
                officialData: { parcelNumber: 43, mapSheet: 1, area: 380, landUse: 'ODT', adminCode: '20194' },
                communityData: {
                    projectName: 'Green Valley Resort',
                    lotNumber: 'Villa V12',
                    blockCode: 'Phase 2',
                    commonName: 'Biệt thự view sông',
                    marketPrice: 35,
                    priceUnit: 'total',
                    brokerCode: 'GV-V12',
                    description: 'Biệt thự cao cấp view sông Hàn',
                    isVerified: true
                },
                contributor: { userId: 'demo3', userName: 'Real Estate Pro' },
                timestamp: new Date().toISOString(),
                status: 'verified'
            }
        ];
        
        demoData.forEach(item => {
            const key = `${item.officialData.parcelNumber}_${item.officialData.mapSheet}`;
            communityContributions.set(key, item);
        });
        
        console.log(`✨ Added ${demoData.length} demo community contributions`);
    }

    // Enhanced search that includes community data
    function updateSearchWithCommunityData() {
        // Add community search terms to existing search
        const originalSearchFunction = window.searchParcel;
        
        window.searchParcel = async function(searchTerm, alternativeSearch = null) {
            // First try original search
            let result = await originalSearchFunction(searchTerm, alternativeSearch);
            
            if (result) {
                // Enhance with community data if available
                const key = `${result.SoThuTuThua}_${result.SoHieuToBanDo}`;
                const communityData = communityContributions.get(key);
                
                if (communityData) {
                    result.communityData = communityData.communityData;
                    result.hasEnhancedData = true;
                }
                
                return result;
            }
            
            // If no official result, try community search
            for (const [key, contribution] of communityContributions.entries()) {
                const community = contribution.communityData;
                const official = contribution.officialData;
                
                // Check if search term matches community identifiers
                if (
                    (community.lotNumber && community.lotNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
                    (community.projectName && community.projectName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                    (community.commonName && community.commonName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                    (community.brokerCode && community.brokerCode.toLowerCase().includes(searchTerm.toLowerCase()))
                ) {
                    // Return enhanced result
                    return {
                        SoThuTuThua: official.parcelNumber,
                        SoHieuToBanDo: official.mapSheet,
                        DienTich: official.area,
                        KyHieuMucDichSuDung: official.landUse,
                        MaXa: official.adminCode,
                        communityData: community,
                        hasEnhancedData: true,
                        isFromCommunity: true
                    };
                }
            }
            
            return null;
        };
    }

    // Enhanced search result display
    function enhanceSearchResultDisplay(result) {
        if (!result.hasEnhancedData) return result;
        
        const community = result.communityData;
        let enhancedHtml = `
            <div class="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                <div class="text-xs font-bold text-green-800 mb-1">
                    <i class="fas fa-users mr-1"></i>Thông tin từ cộng đồng:
                </div>
        `;
        
        if (community.projectName) {
            enhancedHtml += `<div class="text-xs text-green-700">🏗️ Dự án: ${community.projectName}</div>`;
        }
        
        if (community.lotNumber) {
            enhancedHtml += `<div class="text-xs text-green-700">📍 Số lô: ${community.lotNumber}</div>`;
        }
        
        if (community.commonName) {
            enhancedHtml += `<div class="text-xs text-green-700">🏷️ Tên gọi: ${community.commonName}</div>`;
        }
        
        if (community.marketPrice) {
            const unit = community.priceUnit === 'per_m2' ? '/m²' : ' tổng';
            enhancedHtml += `<div class="text-xs text-green-700">💰 Giá thị trường: ${community.marketPrice} triệu${unit}</div>`;
        }
        
        enhancedHtml += `</div>`;
        
        return { ...result, enhancedHtml };
    }

    // === END COMMUNITY CONTRIBUTION SYSTEM ===

    // === END FILTERING SYSTEM ===

    // Handle layer toggle
    map.on('overlayadd', (e) => {
        if (e.name === '🏷️ Số thửa') {
            isLabelsVisible = true;
            debouncedUpdateLabels();
        }
    });
    
    map.on('overlayremove', (e) => {
        if (e.name === '🏷️ Số thửa') {
            isLabelsVisible = false;
            parcelLabels.clearLayers();
            clearTimeout(labelLoadTimeout);
        }
    });
        });
    });
});

// Initialize community contribution system after DOM is loaded
// Moved to end of file to ensure all functions are defined

/*
=== PHASE 2.6: COMMUNITY CONTRIBUTION SYSTEM - COMPLETE ===

✅ FEATURES IMPLEMENTED:
1. DOM initialization timing fix - Contribute button now works
2. Enhanced parcel info integration - Shows existing community data
3. Comprehensive anti-spam protection:
   - Rate limiting: 60s cooldown, 5 contributions/hour
   - Spam pattern detection: repeated chars, URLs, phone numbers, sales content
4. Enhanced form validation:
   - Required field validation
   - Input length limits and formatting
   - Phone number validation (Vietnamese format)
   - Verification checkbox requirement
5. Improved UX:
   - Loading states with spinner
   - Inline success/error messages
   - Auto-close modal after success
   - Real-time character counter

🛡️ ANTI-SPAM MEASURES:
- Rate limiting with localStorage tracking
- Advanced spam pattern detection
- Content validation for all text fields
- Moderation queue in Firebase
- User verification requirement

🔧 TECHNICAL IMPROVEMENTS:
- Proper DOM event handling with delay
- Firebase integration with error handling
- Real-time UI updates
- Responsive form validation
- Loading state management

📱 USER EXPERIENCE:
- Direct contribution from parcel info panels
- Clear validation messages
- Visual feedback for all actions
- Seamless integration with existing search
- Mobile-friendly responsive design
*/

// =============================================================================
// PHASE 3: ADVANCED ANALYTICS & BUSINESS INTELLIGENCE
// =============================================================================

// Analytics variables
let analyticsData = {
    totalParcels: 0,
    avgPrice: 0,
    avgArea: 0,
    communityContributions: 0,
    priceDistribution: {},
    areaDistribution: {},
    districtData: {},
    landUseData: {},
    communityInsights: {}
};

// === GLOBAL UTILITY FUNCTIONS ===

// Universal modal management functions to prevent display conflicts
function showModal(el) { 
    if (el) { 
        el.style.display = 'flex'; 
        el.classList.remove('hidden'); 
    } 
}

function hideModal(el) { 
    if (el) { 
        el.classList.add('hidden'); 
        el.style.display = 'none'; 
    } 
}

// [VERIFY MODAL] Debug helper for mobile testing (call: window.verifyDangTinModal())
window.verifyDangTinModal = function() {
    const modal = document.getElementById('form-modal');
    const scrollContainer = document.querySelector('[data-listing-scroll]');
    const footer = document.querySelector('#form-modal .flex-none.border-t');
    const ctaButton = document.getElementById('submit-form-btn');
    
    if (!modal || !scrollContainer || !footer || !ctaButton) {
        console.log('[VERIFY MODAL] ❌ Elements not found');
        return;
    }
    
    const footerRect = footer.getBoundingClientRect();
    const ctaRect = ctaButton.getBoundingClientRect();
    const scrollRect = scrollContainer.getBoundingClientRect();
    const viewportH = window.innerHeight || window.visualViewport?.height || 0;
    
    const footerVisible = footerRect.bottom <= viewportH + 100;  // Small margin
    const ctaMin44 = ctaRect.height >= 44 && ctaRect.width >= 44;
    const scrollHeight = scrollContainer.scrollHeight;
    const scrollClient = scrollContainer.clientHeight;
    const isScrolling = scrollHeight > scrollClient;
    
    const report = {
        viewport: `${window.innerWidth}×${viewportH}`,
        footerY: `${footerRect.top.toFixed(0)}-${footerRect.bottom.toFixed(0)}`,
        footerVisible: footerVisible ? '✅ yes' : '❌ no',
        ctaSize: `${ctaRect.width.toFixed(0)}×${ctaRect.height.toFixed(0)}px`,
        ctaMin44: ctaMin44 ? '✅ yes' : '❌ no',
        scrollable: isScrolling ? `yes (${scrollHeight} vs ${scrollClient})` : 'no',
        scrollTop: `${scrollContainer.scrollTop}`,
    };
    
    console.log(`[VERIFY MODAL] ${JSON.stringify(report)}`);  // One-liner for copy-paste
    console.table(report);  // Pretty table
    
    // Update debug div if visible
    const debugDiv = document.getElementById('modal-debug');
    if (debugDiv) {
        debugDiv.style.display = 'block';
        document.getElementById('debug-viewport').textContent = report.viewport;
        document.getElementById('debug-scroll').textContent = `${scrollHeight}/${scrollClient}`;
        document.getElementById('debug-footer-vis').textContent = report.footerVisible;
        document.getElementById('debug-cta-size').textContent = report.ctaSize + (ctaMin44 ? ' ✅' : ' ❌');
    }
    
    return report;
};

// NOTE: showToast already defined at line ~3353 - removed duplicate here

// Load and Process Analytics Data
async function loadAnalyticsData() {
    console.log('📈 Loading analytics data...');
    
    try {
        // Reset analytics data
        analyticsData = {
            totalParcels: 0,
            avgPrice: 0,
            avgArea: 0,
            communityContributions: 0,
            priceDistribution: { 'Dưới 5 tỷ': 0, '5-10 tỷ': 0, '10-20 tỷ': 0, 'Trên 20 tỷ': 0 },
            areaDistribution: { 'Dưới 100m²': 0, '100-200m²': 0, '200-500m²': 0, 'Trên 500m²': 0 },
            districtData: {},
            landUseData: {},
            communityInsights: {}
        };

        // Analyze all loaded parcel data
        if (window.allParcels && window.allParcels.length > 0) {
            analyzeParcelData(window.allParcels);
        }

        // Analyze community contributions
        if (window.communityContributions && window.communityContributions.size > 0) {
            analyzeCommunityData(window.communityContributions);
        }

        console.log('✅ Analytics data loaded:', analyticsData);
        
    } catch (error) {
        console.error('❌ Error loading analytics data:', error);
    }
}

// Analyze Parcel Data
function analyzeParcelData(parcels) {
    console.log('🔍 Analyzing parcel data...', parcels.length, 'parcels');
    
    let totalArea = 0;
    let validAreaCount = 0;
    
    analyticsData.totalParcels = parcels.length;

    parcels.forEach(parcel => {
        // Area analysis
        if (parcel.area && parcel.area > 0) {
            totalArea += parcel.area;
            validAreaCount++;
            
            // Area distribution
            if (parcel.area < 100) {
                analyticsData.areaDistribution['Dưới 100m²']++;
            } else if (parcel.area < 200) {
                analyticsData.areaDistribution['100-200m²']++;
            } else if (parcel.area < 500) {
                analyticsData.areaDistribution['200-500m²']++;
            } else {
                analyticsData.areaDistribution['Trên 500m²']++;
            }
        }

        // District analysis
        if (parcel.adminCode) {
            const district = getDistrictFromAdminCode(parcel.adminCode);
            if (!analyticsData.districtData[district]) {
                analyticsData.districtData[district] = { count: 0, totalArea: 0, avgArea: 0 };
            }
            analyticsData.districtData[district].count++;
            if (parcel.area) {
                analyticsData.districtData[district].totalArea += parcel.area;
                analyticsData.districtData[district].avgArea = analyticsData.districtData[district].totalArea / analyticsData.districtData[district].count;
            }
        }

        // Land use analysis
        if (parcel.landUse) {
            const landUse = getLandUseDescription(parcel.landUse);
            analyticsData.landUseData[landUse] = (analyticsData.landUseData[landUse] || 0) + 1;
        }
    });

    // Calculate averages
    analyticsData.avgArea = validAreaCount > 0 ? (totalArea / validAreaCount).toFixed(1) : 0;
    
    console.log('📊 Parcel analysis complete:', analyticsData);
}

// Analyze Community Data
function analyzeCommunityData(communityData) {
    console.log('👥 Analyzing community data...', communityData.size, 'contributions');
    
    analyticsData.communityContributions = communityData.size;
    
    let totalMarketPrice = 0;
    let validPriceCount = 0;
    
    communityData.forEach(contribution => {
        // Price analysis from community data
        if (contribution.communityData && contribution.communityData.marketPrice) {
            const price = parseFloat(contribution.communityData.marketPrice);
            if (price > 0) {
                totalMarketPrice += price;
                validPriceCount++;
                
                // Price distribution
                if (price < 5000) {
                    analyticsData.priceDistribution['Dưới 5 tỷ']++;
                } else if (price < 10000) {
                    analyticsData.priceDistribution['5-10 tỷ']++;
                } else if (price < 20000) {
                    analyticsData.priceDistribution['10-20 tỷ']++;
                } else {
                    analyticsData.priceDistribution['Trên 20 tỷ']++;
                }
            }
        }
        
        // Project insights
        if (contribution.communityData && contribution.communityData.projectName) {
            const project = contribution.communityData.projectName;
            if (!analyticsData.communityInsights[project]) {
                analyticsData.communityInsights[project] = 0;
            }
            analyticsData.communityInsights[project]++;
        }
    });
    
    // Calculate average market price
    analyticsData.avgPrice = validPriceCount > 0 ? (totalMarketPrice / validPriceCount).toFixed(0) : 0;
    
    console.log('💰 Community analysis complete. Avg price:', analyticsData.avgPrice);
}

// Get district name from admin code
function getDistrictFromAdminCode(adminCode) {
    const districtMap = {
        '20194': 'Liên Chiểu',
        '20195': 'Thanh Khê', 
        '20197': 'Hải Châu',
        '20198': 'Cẩm Lệ',
        '20200': 'Ngũ Hành Sơn',
        '20203': 'Sơn Trà',
        '20206': 'Hoà Vang',
        '20207': 'Hòa Vang'
    };
    return districtMap[adminCode] || 'Khác';
}

// Get land use description
function getLandUseDescription(landUse) {
    const landUseMap = {
        'ODT': 'Đất ở đô thị',
        'ONT': 'Đất ở nông thôn', 
        'LUU': 'Đất lưu thông',
        'SKH': 'Đất sản xuất kinh doanh',
        'CTR': 'Đất công trình',
        'NKH': 'Đất nông nghiệp'
    };
    return landUseMap[landUse] || landUse || 'Khác';
}

// Refresh Analytics Data and Charts
async function refreshAnalyticsData() {
    console.log('🔄 Refreshing analytics data...');
    
    // Show loading indicator
    showToast('🔄 Đang cập nhật dữ liệu phân tích...', 'info');
    
    // Reload data
    await loadAnalyticsData();
    
    // Update UI
    updateAnalyticsUI();
    renderAllCharts();
    
    // Update timestamp
    document.getElementById('last-updated').textContent = new Date().toLocaleString('vi-VN');
    
    showToast('✅ Dữ liệu đã được cập nhật!', 'success');
}

// Update Analytics UI
function updateAnalyticsUI() {
    // Update stats cards
    document.getElementById('total-parcels').textContent = analyticsData.totalParcels.toLocaleString('vi-VN');
    document.getElementById('avg-price').textContent = analyticsData.avgPrice > 0 ? 
        `${parseFloat(analyticsData.avgPrice).toLocaleString('vi-VN')} triệu` : 'N/A';
    document.getElementById('avg-area').textContent = analyticsData.avgArea > 0 ? 
        `${analyticsData.avgArea}m²` : 'N/A';
    document.getElementById('community-contributions').textContent = analyticsData.communityContributions.toLocaleString('vi-VN');
}

// Render All Charts
function renderAllCharts() {
    console.log('📊 Rendering analytics charts...');
    
    try {
        // Destroy all existing charts first
        destroyAllCharts();
        
        renderPriceDistributionChart();
        renderAreaDistributionChart();
        renderDistrictPriceChart();
        renderLandUseChart();
        renderCommunityDataChart();
    } catch (error) {
        console.error('❌ Error rendering charts:', error);
    }
}

// Destroy All Existing Charts
function destroyAllCharts() {
    console.log('🧹 Destroying existing charts...');
    
    Object.keys(analyticsCharts).forEach(key => {
        if (analyticsCharts[key] && typeof analyticsCharts[key].destroy === 'function') {
            try {
                analyticsCharts[key].destroy();
                console.log(`✅ Destroyed chart: ${key}`);
            } catch (error) {
                console.error(`❌ Error destroying chart ${key}:`, error);
            }
        }
    });
    
    // Clear the charts object
    analyticsCharts = {};
}

// Price Distribution Chart
function renderPriceDistributionChart() {
    const ctx = document.getElementById('price-distribution-chart');
    if (!ctx) return;

    // Destroy existing chart
    if (analyticsCharts.priceDistribution) {
        analyticsCharts.priceDistribution.destroy();
    }

    const data = analyticsData.priceDistribution;
    
    analyticsCharts.priceDistribution = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(data),
            datasets: [{
                data: Object.values(data),
                backgroundColor: [
                    '#3B82F6', // Blue
                    '#10B981', // Green
                    '#F59E0B', // Yellow
                    '#EF4444'  // Red
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${context.label}: ${context.parsed} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Area Distribution Chart
function renderAreaDistributionChart() {
    const ctx = document.getElementById('area-distribution-chart');
    if (!ctx) return;

    if (analyticsCharts.areaDistribution) {
        analyticsCharts.areaDistribution.destroy();
    }

    const data = analyticsData.areaDistribution;
    
    analyticsCharts.areaDistribution = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(data),
            datasets: [{
                label: 'Số lượng thửa',
                data: Object.values(data),
                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        font: {
                            size: 11
                        }
                    }
                },
                x: {
                    ticks: {
                        font: {
                            size: 11
                        }
                    }
                }
            }
        }
    });
}

// District Price Chart
function renderDistrictPriceChart() {
    const ctx = document.getElementById('district-price-chart');
    if (!ctx) return;

    if (analyticsCharts.districtPrice) {
        analyticsCharts.districtPrice.destroy();
    }

    const districts = Object.keys(analyticsData.districtData);
    const counts = districts.map(district => analyticsData.districtData[district].count);
    
    analyticsCharts.districtPrice = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: districts,
            datasets: [{
                label: 'Số lượng thửa',
                data: counts,
                backgroundColor: [
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(139, 92, 246, 0.8)',
                    'rgba(236, 72, 153, 0.8)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        font: {
                            size: 11
                        }
                    }
                },
                y: {
                    ticks: {
                        font: {
                            size: 11
                        }
                    }
                }
            }
        }
    });
}

// Land Use Chart
function renderLandUseChart() {
    const ctx = document.getElementById('land-use-chart');
    if (!ctx) return;

    if (analyticsCharts.landUse) {
        analyticsCharts.landUse.destroy();
    }

    const data = analyticsData.landUseData;
    
    analyticsCharts.landUse = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(data),
            datasets: [{
                data: Object.values(data),
                backgroundColor: [
                    '#3B82F6', // Blue
                    '#10B981', // Green
                    '#F59E0B', // Yellow
                    '#EF4444', // Red
                    '#8B5CF6', // Purple
                    '#EC4899'  // Pink
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: {
                            size: 11
                        }
                    }
                }
            }
        }
    });
}

// Community Data Chart
function renderCommunityDataChart() {
    const ctx = document.getElementById('community-data-chart');
    if (!ctx) return;

    if (analyticsCharts.communityData) {
        analyticsCharts.communityData.destroy();
    }

    const projects = Object.keys(analyticsData.communityInsights).slice(0, 10); // Top 10
    const counts = projects.map(project => analyticsData.communityInsights[project]);
    
    analyticsCharts.communityData = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: projects.map(p => p.length > 20 ? p.substring(0, 20) + '...' : p),
            datasets: [{
                label: 'Số đóng góp',
                data: counts,
                backgroundColor: 'rgba(139, 92, 246, 0.8)',
                borderColor: 'rgba(139, 92, 246, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        font: {
                            size: 11
                        }
                    }
                },
                x: {
                    ticks: {
                        font: {
                            size: 10
                        },
                        maxRotation: 45
                    }
                }
            }
        }
    });
}

// Export Analytics to PDF
function exportAnalyticsToPDF() {
    showToast('📄 Tính năng xuất PDF đang được phát triển...', 'info');
    // TODO: Implement PDF export using jsPDF
}

// Export Analytics to Excel
function exportAnalyticsToExcel() {
    console.log('📊 Exporting analytics to Excel...');
    
    try {
        // Create CSV data
        let csvContent = "data:text/csv;charset=utf-8,";
        
        // Add summary statistics
        csvContent += "Thống kê tổng quan\n";
        csvContent += `Tổng số thửa,${analyticsData.totalParcels}\n`;
        csvContent += `Giá trung bình (triệu),${analyticsData.avgPrice}\n`;
        csvContent += `Diện tích trung bình (m²),${analyticsData.avgArea}\n`;
        csvContent += `Đóng góp cộng đồng,${analyticsData.communityContributions}\n\n`;
        
        // Add price distribution
        csvContent += "Phân bố giá\n";
        csvContent += "Khoảng giá,Số lượng\n";
        Object.entries(analyticsData.priceDistribution).forEach(([range, count]) => {
            csvContent += `${range},${count}\n`;
        });
        csvContent += "\n";
        
        // Add area distribution
        csvContent += "Phân bố diện tích\n";
        csvContent += "Khoảng diện tích,Số lượng\n";
        Object.entries(analyticsData.areaDistribution).forEach(([range, count]) => {
            csvContent += `${range},${count}\n`;
        });
        csvContent += "\n";
        
        // Add district data
        csvContent += "Dữ liệu theo quận/huyện\n";
        csvContent += "Quận/Huyện,Số lượng,Diện tích TB\n";
        Object.entries(analyticsData.districtData).forEach(([district, data]) => {
            csvContent += `${district},${data.count},${data.avgArea.toFixed(1)}\n`;
        });
        
        // Create and download file
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `analytics-report-${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast('✅ Đã xuất báo cáo Excel thành công!', 'success');
        
    } catch (error) {
        console.error('❌ Error exporting to Excel:', error);
        showToast('❌ Có lỗi khi xuất báo cáo', 'error');
    }
}

// KHẮC PHỤC: Đã xóa dòng }); thừa ở đây

// Show contribution message in modal
function showContributionMessage(message, type) {
    const messageContainer = document.getElementById('contribution-message');
    const messageText = document.getElementById('contribution-message-text');
    
    if (messageContainer && messageText) {
        messageText.textContent = message;
        messageContainer.className = `mt-4 p-4 rounded-lg ${
            type === 'success' ? 'bg-green-100 text-green-800' :
            type === 'error' ? 'bg-red-100 text-red-800' :
            'bg-yellow-100 text-yellow-800'
        }`;
        messageContainer.classList.remove('hidden');
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            messageContainer.classList.add('hidden');
        }, 5000);
    }
}

// Update description counter for community contribution form
function updateDescriptionCounter(textarea) {
    const counter = document.getElementById('desc-counter');
    if (counter) {
        counter.textContent = `${textarea.value.length}/500`;
        
        // Change color based on length
        if (textarea.value.length > 450) {
            counter.className = 'text-red-500 text-xs';
        } else if (textarea.value.length > 300) {
            counter.className = 'text-yellow-500 text-xs';
        } else {
            counter.className = 'text-gray-500 text-xs';
        }
    }
}

// Enhanced validation for contribution form
function validateContributionForm(formData) {
    const errors = [];
    
    // Validate project name
    const projectName = formData.get('projectName')?.trim();
    if (!projectName || projectName.length < 3) {
        errors.push('Tên dự án phải có ít nhất 3 ký tự');
    }
    
    // Validate lot number
    const lotNumber = formData.get('lotNumber')?.trim();
    if (!lotNumber || lotNumber.length < 2) {
        errors.push('Số lô phải có ít nhất 2 ký tự');
    }
    
    // Validate market price if provided
    const marketPrice = formData.get('marketPrice');
    if (marketPrice && (isNaN(marketPrice) || marketPrice < 0 || marketPrice > 10000)) {
        errors.push('Giá thị trường phải từ 0 đến 10,000 triệu');
    }
    
    // Validate phone number if provided
    const phone = formData.get('contributorPhone')?.trim();
    if (phone) {
        const phoneRegex = /^(\+84|0)(3|5|7|8|9)\d{8}$/;
        if (!phoneRegex.test(phone.replace(/[\s\-]/g, ''))) {
            errors.push('Số điện thoại không đúng định dạng Việt Nam');
        }
    }
    
    // Check verification checkbox
    if (!formData.get('isVerified')) {
        errors.push('Bạn cần xác nhận thông tin là chính xác');
    }
    
    // Advanced spam detection for all text fields
    const textFields = ['projectName', 'lotNumber', 'blockCode', 'commonName', 'brokerCode', 'description', 'contributorName'];
    for (const fieldName of textFields) {
        const value = formData.get(fieldName)?.trim();
        if (value && detectAdvancedSpam(value)) {
            errors.push(`Nội dung "${getFieldLabel(fieldName)}" có thể chứa spam hoặc quảng cáo`);
        }
    }
    
    return errors;
}

// Enhanced spam detection
function detectAdvancedSpam(content) {
    const spamPatterns = [
        /(.)\1{3,}/,                           // Repeated characters (3+)
        /(https?:\/\/|www\.|\.com|\.vn|\.net)/i, // URLs or domains
        /(\+84|0)(3|5|7|8|9)\d{8}/,           // Phone patterns
        /(bán gấp|cần bán|liên hệ|zalo|viber|hotline|sale)/i, // Sales spam
        /[A-Z]{4,}/,                          // Excessive caps
        /(giá rẻ|khuyến mãi|ưu đãi|cơ hội|đầu tư|lãi suất)/i, // Promotional
        /(\b\w+\b)(\s+\1){2,}/i               // Repetitive phrases
    ];
    
    return spamPatterns.some(pattern => pattern.test(content));
}

// Get field label for error messages
function getFieldLabel(fieldName) {
    const labels = {
        projectName: 'Tên dự án',
        lotNumber: 'Số lô',
        blockCode: 'Mã block',
        commonName: 'Tên gọi thông dụng',
        brokerCode: 'Mã môi giới',
        description: 'Mô tả',
        contributorName: 'Tên người đóng góp'
    };
    return labels[fieldName] || fieldName;
}

// =============================================================================
// INITIALIZE ALL SYSTEMS
// =============================================================================

// Initialize all systems after DOM is loaded
// === GLOBAL VARIABLES ===
let currentUser = null;
let tempMarker = null;
let selectedCoords = null;
let isAddMode = false;
let isQueryMode = false; // Vẫn giữ để đổi con trỏ chuột
let localListings = [];
let userPortfolio = [];
let selectedParcelData = null; // Lưu dữ liệu thửa đất được chọn để thêm vào ví

// === DOM ELEMENTS ===
let portfolioBtn, portfolioModal, closePortfolioModal, addPortfolioModal, closeAddPortfolioModal, portfolioForm;

document.addEventListener('DOMContentLoaded', function() {
    __XGD_guardedInit('portfolio-init', function() {
        // Note: Most initialization happens in the main DOMContentLoaded handler
        // This secondary handler is for non-critical systems that can load after main app
        if (typeof DEBUG_MODE !== 'undefined' && DEBUG_MODE) {
            console.log('[INIT_OK] portfolio-init (non-critical systems ready)');
        }
    });
});

// === PORTFOLIO MANAGEMENT FUNCTIONS ===

// Note: showModal/hideModal already defined above in GLOBAL UTILITY FUNCTIONS section

// Load user portfolio from Firestore
async function loadUserPortfolio() {
    if (!currentUser) {
        userPortfolio = [];
        return;
    }

    try {
        console.log('🔍 Loading portfolio for user:', currentUser.uid);
        
        // Simple query without composite index requirement
        const portfolioSnapshot = await db.collection('portfolios')
            .where('userId', '==', currentUser.uid)
            .get();

        userPortfolio = [];
        portfolioSnapshot.forEach(doc => {
            const data = doc.data();
            console.log('📄 Portfolio data loaded:', { id: doc.id, images: data.images });
            userPortfolio.push({ 
                id: doc.id, 
                ...data,
                createdAt: data.createdAt || firebase.firestore.Timestamp.now()
            });
        });

        // Sort by createdAt on client side (avoid composite index)
        userPortfolio.sort((a, b) => {
            const timeA = a.createdAt?.toDate?.() || new Date(0);
            const timeB = b.createdAt?.toDate?.() || new Date(0);
            return timeB - timeA; // Newest first
        });

        console.log(`📁 Loaded ${userPortfolio.length} items in portfolio`);
    } catch (error) {
        console.error('❌ Error loading portfolio:', error);
        
        // Initialize empty portfolio on error
        userPortfolio = [];
        
        // Show user-friendly message
        if (error.code === 'failed-precondition' || error.message?.includes('index')) {
            console.log('📝 Index not ready yet, showing empty portfolio');
        } else {
            console.error('🚨 Unexpected portfolio error:', error);
        }
        userPortfolio = [];
    }
}

// Add parcel to portfolio from info panel
window.addToPortfolioFromPanel = function(soThua, soTo, loaiDat, dienTich, lat, lng) {
    if (!currentUser) {
        alert('Vui lòng đăng nhập để sử dụng tính năng ví bất động sản!');
        return;
    }

    // Store selected parcel data
    selectedParcelData = {
        soThua: soThua,
        soTo: soTo,
        loaiDat: loaiDat,
        dienTich: dienTich,
        lat: lat,
        lng: lng,
        locationUrl: `${window.location.origin}${window.location.pathname}?lat=${lat}&lng=${lng}` // Add locationUrl
    };

    // Pre-fill form
    document.getElementById('portfolio-name').value = `Thửa ${soThua}, Tờ ${soTo}`;
    document.getElementById('portfolio-area').value = dienTich || '';
    document.getElementById('portfolio-notes').value = `Loại đất: ${loaiDat || 'N/A'}`;

    // Show add portfolio modal
    showModal(addPortfolioModal);
};

// Show portfolio modal
function showPortfolioModal() {
    console.log('🎯 showPortfolioModal called', {
        currentUser: currentUser ? {
            uid: currentUser.uid,
            email: currentUser.email
        } : null,
        portfolioModal: !!portfolioModal
    });
    
    if (!currentUser) {
        console.log('⚠️ User not logged in, showing alert');
        alert('Vui lòng đăng nhập để xem ví bất động sản!');
        
        // Trigger login flow
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            console.log('🔄 Triggering login button click');
            loginBtn.click();
        }
        return;
    }

    console.log('✅ User authenticated, loading portfolio...');
    loadUserPortfolio().then(() => {
        console.log('📊 Portfolio loaded, rendering list...');
        renderPortfolioList();
        showModal(portfolioModal);
        console.log('✅ Portfolio modal shown');
    }).catch(error => {
        console.error('❌ Error loading portfolio:', error);
        alert('Có lỗi khi tải ví bất động sản. Vui lòng thử lại.');
    });
}

// Render portfolio list
function renderPortfolioList() {
    console.log('🎨 Rendering portfolio list...', {
        totalItems: userPortfolio.length,
        currentUser: currentUser ? currentUser.uid : 'null'
    });
    
    const portfolioList = document.getElementById('portfolio-list');
    const portfolioCount = document.getElementById('portfolio-count');
    const portfolioEmpty = document.getElementById('portfolio-empty');
    const filter = document.getElementById('portfolio-filter')?.value || 'all';

    console.log('📋 Portfolio elements:', {
        portfolioList: !!portfolioList,
        portfolioCount: !!portfolioCount,
        portfolioEmpty: !!portfolioEmpty,
        filter: filter
    });

    // Filter portfolio
    let filteredPortfolio = userPortfolio;
    if (filter !== 'all') {
        filteredPortfolio = userPortfolio.filter(item => item.visibility === filter);
    }

    if (portfolioCount) portfolioCount.textContent = filteredPortfolio.length;

    if (filteredPortfolio.length === 0) {
        console.log('📭 No portfolio items to display');
        if (portfolioList) portfolioList.classList.add('hidden');
        if (portfolioEmpty) portfolioEmpty.classList.remove('hidden');
        return;
    }

    console.log(`📊 Displaying ${filteredPortfolio.length} portfolio items`);
    if (portfolioList) portfolioList.classList.remove('hidden');
    if (portfolioEmpty) portfolioEmpty.classList.add('hidden');

    if (portfolioList) {
        portfolioList.innerHTML = filteredPortfolio.map(item => {
            // Get first image as thumbnail
            const thumbnail = item.images && item.images.length > 0 ? item.images[0] : null;
            console.log('🖼️ Portfolio item:', { id: item.id, name: item.name, images: item.images, thumbnail });
            
            return `
            <div class="portfolio-card">
                <div class="portfolio-card-header">
                    ${item.visibility === 'private' 
                        ? '<div class="portfolio-badge-private"><i class="fa-solid fa-lock mr-1"></i>Riêng tư</div>'
                        : '<div class="portfolio-badge-public"><i class="fa-solid fa-globe mr-1"></i>Công khai</div>'
                    }
                </div>
                ${thumbnail ? `
                <div class="portfolio-image">
                    <img src="${thumbnail}" alt="Hình ảnh bất động sản" 
                         onerror="console.error('❌ Image load error:', '${thumbnail}'); this.closest('.portfolio-image').style.display='none'"
                         onload="console.log('✅ Image loaded:', '${thumbnail}')"
                         onclick="viewPortfolioImages('${item.id}')">
                    ${item.images && item.images.length > 1 ? 
                        `<div class="image-count-badge">
                            <i class="fa-solid fa-images mr-1"></i>${item.images.length}
                        </div>` : ''
                    }
                </div>
                ` : `
                <div class="portfolio-no-image">
                    <div style="text-align: center;">
                        <i class="fa-solid fa-image block mb-2"></i>
                        <span>Chưa có hình ảnh</span>
                    </div>
                </div>
                `}
                <div class="portfolio-card-body">
                    <div class="portfolio-price">${item.price ? item.price + ' tỷ VNĐ' : 'Chưa có giá'}</div>
                    <div class="portfolio-name">${item.name}</div>
                    <div class="portfolio-details">
                        ${item.area ? `<div><i class="fa-solid fa-ruler-combined mr-1"></i>${item.area} m²</div>` : ''}
                        ${item.soThua ? `<div><i class="fa-solid fa-map-marker-alt mr-1"></i>Thửa ${item.soThua}, Tờ ${item.soTo}</div>` : ''}
                        ${item.notes ? `<div><i class="fa-solid fa-sticky-note mr-1"></i>${item.notes.substring(0, 50)}${item.notes.length > 50 ? '...' : ''}</div>` : ''}
                        <div><i class="fa-solid fa-calendar mr-1"></i>${formatPortfolioDate(item.createdAt?.toDate())}</div>
                    </div>
                    <div class="portfolio-actions">
                        <button class="portfolio-btn portfolio-btn-primary" onclick="viewPortfolioItem('${item.id}')">
                            <i class="fa-solid fa-eye mr-1"></i>Xem
                        </button>
                        <button class="portfolio-btn portfolio-btn-secondary" onclick="editPortfolioItem('${item.id}')">
                            <i class="fa-solid fa-edit mr-1"></i>Sửa
                        </button>
                        <button class="portfolio-btn portfolio-btn-danger" onclick="deletePortfolioItem('${item.id}')">
                            <i class="fa-solid fa-trash mr-1"></i>Xóa
                        </button>
                    </div>
                </div>
            </div>
        `;
        }).join('');
    }
}

// View portfolio images gallery
window.viewPortfolioImages = function(itemId) {
    const item = userPortfolio.find(p => p.id === itemId);
    if (!item || !item.images || item.images.length === 0) {
        showToast('❌ Không có hình ảnh nào', 'error');
        return;
    }

    // Create image gallery modal
    const galleryModal = document.createElement('div');
    galleryModal.className = 'modal-overlay active';
    galleryModal.innerHTML = `
        <div class="modal-content max-w-4xl">
            <div class="modal-header">
                <h3 class="modal-title">
                    <i class="fa-solid fa-images mr-2"></i>
                    Hình ảnh - ${item.name}
                </h3>
                <button type="button" class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                    <i class="fa-solid fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="image-gallery">
                    ${item.images.map((imageUrl, index) => `
                        <div class="gallery-item">
                            <img src="${imageUrl}" alt="Hình ảnh ${index + 1}" 
                                 onclick="openImageFullscreen('${imageUrl}')"
                                 onerror="this.closest('.gallery-item').style.display='none'">
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(galleryModal);
};

// Open image in fullscreen
window.openImageFullscreen = function(imageUrl) {
    const fullscreenModal = document.createElement('div');
    fullscreenModal.className = 'fullscreen-image-modal';
    fullscreenModal.innerHTML = `
        <div class="fullscreen-overlay" onclick="this.closest('.fullscreen-image-modal').remove()">
            <img src="${imageUrl}" alt="Hình ảnh phóng to">
            <button class="fullscreen-close" onclick="this.closest('.fullscreen-image-modal').remove()">
                <i class="fa-solid fa-times"></i>
            </button>
        </div>
    `;
    
    document.body.appendChild(fullscreenModal);
};

// View portfolio item on map
window.viewPortfolioItem = function(itemId) {
    const item = userPortfolio.find(p => p.id === itemId);
    if (!item) {
        console.error('❌ Portfolio item not found:', itemId);
        return;
    }

    console.log('👀 Viewing portfolio item:', item);

    // Check if we have a saved location URL
    if (item.locationUrl) {
        console.log('🔗 Opening location URL:', item.locationUrl);
        
        // Close portfolio modal
        hideModal(portfolioModal);
        
        // Open the location URL which will trigger coordinate-based search
        window.location.href = item.locationUrl;
        return;
    }

    // Fallback: if no location URL but has coordinates
    if (item.lat && item.lng) {
        console.log('� Creating location URL from coordinates');
        
        // Create location URL from coordinates
        const locationUrl = `${window.location.origin}${window.location.pathname}?lat=${item.lat}&lng=${item.lng}`;
        
        // Close portfolio modal
        hideModal(portfolioModal);
        
        // Open the location URL
        window.location.href = locationUrl;
        return;
    }

    // No location data available
    alert('❌ Không có tọa độ để hiển thị trên bản đồ.\n\nBĐS này có thể được thêm thủ công mà không có vị trí địa lý.');
    showToast('⚠️ Không có tọa độ GPS', 'warning');
};

// Edit portfolio item
window.editPortfolioItem = function(itemId) {
    const item = userPortfolio.find(p => p.id === itemId);
    if (!item) return;

    selectedParcelData = item; // Store for editing
    
    // Ensure locationUrl exists for editing
    if (item.lat && item.lng && !item.locationUrl) {
        selectedParcelData.locationUrl = `${window.location.origin}${window.location.pathname}?lat=${item.lat}&lng=${item.lng}`;
    }
    
    // Pre-fill form
    document.getElementById('portfolio-name').value = item.name || '';
    document.getElementById('portfolio-price').value = item.price || '';
    document.getElementById('portfolio-area').value = item.area || '';
    document.getElementById('portfolio-notes').value = item.notes || '';
    
    // Set visibility
    const visibilityRadio = document.querySelector(`input[name="portfolio-visibility"][value="${item.visibility}"]`);
    if (visibilityRadio) visibilityRadio.checked = true;

    // Display existing images if any
    if (item.images && item.images.length > 0) {
        const imagePreview = document.getElementById('image-preview');
        const imageUploadText = document.querySelector('.image-upload-text');
        
        imagePreview.innerHTML = item.images.map((imageUrl, index) => `
            <div class="image-preview-item" data-existing="true" data-url="${imageUrl}">
                <img src="${imageUrl}" alt="Existing image ${index + 1}" onerror="this.closest('.image-preview-item').remove()">
                <div class="image-preview-overlay">
                    <button type="button" class="image-remove-btn" onclick="removeExistingImage('${imageUrl}', this)">
                        <i class="fa-solid fa-times"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
        if (imageUploadText) {
            imageUploadText.style.display = 'none';
        }
    }

    // Change modal title
    document.getElementById('add-portfolio-title').innerHTML = '<i class="fa-solid fa-edit mr-2 text-indigo-600"></i>Chỉnh sửa BĐS';
    
    // Store item ID for updating
    portfolioForm.dataset.editingId = itemId;
    
    showModal(addPortfolioModal);
};

// Remove existing image
window.removeExistingImage = function(imageUrl, buttonElement) {
    const imageItem = buttonElement.closest('.image-preview-item');
    if (imageItem) {
        imageItem.remove();
        
        // Check if preview is empty and show upload text
        const imagePreview = document.getElementById('image-preview');
        const imageUploadText = document.querySelector('.image-upload-text');
        
        if (imagePreview.children.length === 0 && imageUploadText) {
            imageUploadText.style.display = 'block';
        }
    }
};

// Delete portfolio item
window.deletePortfolioItem = async function(itemId) {
    if (!confirm('Bạn có chắc muốn xóa bất động sản này khỏi ví?')) return;

    try {
        await db.collection('portfolios').doc(itemId).delete();
        await loadUserPortfolio();
        renderPortfolioList();
        showToast('✅ Đã xóa khỏi ví bất động sản', 'success');
    } catch (error) {
        console.error('❌ Error deleting portfolio item:', error);
        showToast('❌ Có lỗi khi xóa khỏi ví', 'error');
    }
};

// Handle portfolio form submission
async function handlePortfolioFormSubmit(e) {
    e.preventDefault();
    
    if (!currentUser) {
        alert('Vui lòng đăng nhập!');
        return;
    }

    // Get form data directly from elements for better reliability
    const nameInput = document.getElementById('portfolio-name');
    const priceInput = document.getElementById('portfolio-price');
    const areaInput = document.getElementById('portfolio-area');
    const notesInput = document.getElementById('portfolio-notes');
    const visibilityInput = document.querySelector('input[name="portfolio-visibility"]:checked');

    console.log('🔍 Form elements check:', {
        nameElement: !!nameInput,
        priceElement: !!priceInput,
        areaElement: !!areaInput,
        notesElement: !!notesInput,
        visibilityElement: !!visibilityInput
    });

    const portfolioData = {
        name: nameInput?.value?.trim() || '',
        price: priceInput?.value ? parseFloat(priceInput.value) : null,
        area: areaInput?.value ? parseFloat(areaInput.value) : null,
        notes: notesInput?.value?.trim() || '',
        visibility: visibilityInput?.value || 'private',
        userId: currentUser.uid,
        userName: currentUser.displayName || 'User',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    console.log('📋 Portfolio data to submit:', portfolioData);

    // Add parcel data if available
    if (selectedParcelData) {
        console.log('🔍 Debug selectedParcelData:', selectedParcelData);
        console.log('🔍 locationUrl value:', selectedParcelData.locationUrl, 'type:', typeof selectedParcelData.locationUrl);
        
        portfolioData.soThua = selectedParcelData.soThua;
        portfolioData.soTo = selectedParcelData.soTo;
        portfolioData.loaiDat = selectedParcelData.loaiDat;
        portfolioData.lat = selectedParcelData.lat;
        portfolioData.lng = selectedParcelData.lng;
        
        // Create locationUrl from coordinates if not exists or invalid
        if (!selectedParcelData.locationUrl || selectedParcelData.locationUrl === 'undefined') {
            if (selectedParcelData.lat && selectedParcelData.lng) {
                selectedParcelData.locationUrl = `${window.location.origin}${window.location.pathname}?lat=${selectedParcelData.lat}&lng=${selectedParcelData.lng}`;
                console.log('🔧 Created locationUrl from coordinates:', selectedParcelData.locationUrl);
            }
        }
        
        // Only add locationUrl if it's valid
        if (selectedParcelData.locationUrl && selectedParcelData.locationUrl !== 'undefined') {
            portfolioData.locationUrl = selectedParcelData.locationUrl;
            console.log('✅ Added locationUrl:', selectedParcelData.locationUrl);
        } else {
            console.log('⚠️ No valid locationUrl, skipping');
        }
        
        console.log('📍 Added parcel data:', selectedParcelData);
    }

    if (!portfolioData.name || portfolioData.name.length === 0) {
        console.error('❌ Validation failed - empty name:', {
            nameValue: portfolioData.name,
            nameLength: portfolioData.name.length,
            inputElement: nameInput,
            inputValue: nameInput?.value
        });
        alert('Vui lòng nhập tên cho bất động sản');
        nameInput?.focus();
        return;
    }

    try {
        const editingId = portfolioForm.dataset.editingId;
        let portfolioId = editingId;
        let portfolioRef;
        
        if (editingId) {
            // Update existing item
            portfolioRef = db.collection('portfolios').doc(editingId);
            
            // Get remaining existing images from the preview
            const existingImageItems = document.querySelectorAll('.image-preview-item[data-existing="true"]');
            const remainingExistingImages = Array.from(existingImageItems).map(item => item.dataset.url);
            
            // Upload new images if any selected
            let newUploadedImages = [];
            if (selectedImages.length > 0) {
                console.log('📤 Uploading new images for existing portfolio...');
                newUploadedImages = await uploadPortfolioImages(editingId, currentUser.uid);
            }
            
            // Combine remaining existing images with new uploaded images
            portfolioData.images = [...remainingExistingImages, ...newUploadedImages];
            
            await portfolioRef.update(portfolioData);
            showToast('✅ Đã cập nhật ví bất động sản', 'success');
        } else {
            // Add new item
            portfolioData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            
            // First create the document to get ID
            portfolioRef = await db.collection('portfolios').add(portfolioData);
            portfolioId = portfolioRef.id;
            
            // Upload images if any selected
            if (selectedImages.length > 0) {
                console.log('📤 Uploading images for new portfolio...');
                const uploadedImages = await uploadPortfolioImages(portfolioId, currentUser.uid);
                
                // Update document with image URLs
                await portfolioRef.update({
                    images: uploadedImages
                });
            }
            
            showToast('✅ Đã thêm vào ví bất động sản', 'success');
        }

        // Reset form and close modal
        portfolioForm.reset();
        delete portfolioForm.dataset.editingId;
        selectedParcelData = null;
        clearAllImages(); // Clear uploaded images
        hideModal(addPortfolioModal);
        
        // Reload portfolio
        await loadUserPortfolio();
        if (!portfolioModal.classList.contains('hidden')) {
            renderPortfolioList();
        }

    } catch (error) {
        console.error('❌ Error saving to portfolio:', error);
        showToast('❌ Có lỗi khi lưu vào ví', 'error');
    }
}

function formatPortfolioDate(date) {
    if (!date) return 'Không rõ';
    return new Intl.DateTimeFormat('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(date);
}

// Alias for compatibility
const formatDate = formatPortfolioDate;

// Debug functions - only available in DEBUG_MODE (localhost or ?debug=true)
if (typeof DEBUG_MODE !== 'undefined' && DEBUG_MODE) {
    window.debugAnalyticsButton = function() {
        const btn = document.getElementById('analytics-btn');
        console.log('=== Analytics Button Debug ===');
        console.log('Button element:', btn);
        console.log('Button exists:', !!btn);
        if (btn) {
            console.log('Button onclick:', btn.onclick);
            console.log('Button parent:', btn.parentElement);
            console.log('Button style display:', window.getComputedStyle(btn).display);
            console.log('Button style visibility:', window.getComputedStyle(btn).visibility);
            console.log('Button disabled:', btn.disabled);
            console.log('Button class:', btn.className);
        }
        console.log('=== End Debug ===');
    };
    
    window.testAnalyticsButton = function() {
        console.log('Testing analytics button click...');
        const btn = document.getElementById('analytics-btn');
        if (btn) {
            btn.click();
            console.log('Button clicked programmatically');
        } else {
            console.error('Button not found for test');
        }
    };
}

// ============================================================================= 
//  PHASE 4: IMAGE UPLOAD SYSTEM
// ============================================================================= 

// Global variables for image handling
let selectedImages = [];
let uploadedImageUrls = [];

// Initialize image upload system
function initializeImageUpload() {
    console.log('🖼️ Initializing image upload system...');
    
    const uploadZone = document.getElementById('image-upload-zone');
    const fileInput = document.getElementById('portfolio-images');
    const selectBtn = document.getElementById('select-images-btn');
    const clearBtn = document.getElementById('clear-images-btn');
    const previewGallery = document.getElementById('image-preview-gallery');
    const previewContainer = document.getElementById('preview-container');
    const imageCount = document.getElementById('image-count');
    
    if (!uploadZone || !fileInput) {
        console.log('⚠️ Image upload elements not found, skipping initialization');
        return;
    }
    
    // Drag and drop handlers
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });
    
    uploadZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
    });
    
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
        handleImageFiles(files);
    });
    
    // Click to select images
    uploadZone.addEventListener('click', () => {
        fileInput.click();
    });
    
    selectBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });
    
    // File input change
    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        handleImageFiles(files);
    });
    
    // Clear all images
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            clearAllImages();
        });
    }
    
    console.log('✅ Image upload system initialized');
}

// Handle selected image files
function handleImageFiles(files) {
    console.log('📷 Processing', files.length, 'image files');
    
    // Validate file count
    if (selectedImages.length + files.length > 10) {
        alert('Bạn chỉ có thể chọn tối đa 10 ảnh. Vui lòng bỏ bớt một số ảnh.');
        return;
    }
    
    // Validate file sizes and types
    const validFiles = [];
    for (const file of files) {
        if (!file.type.startsWith('image/')) {
            alert(`File "${file.name}" không phải là ảnh. Vui lòng chọn file JPG, PNG, hoặc HEIC.`);
            continue;
        }
        
        if (file.size > 10 * 1024 * 1024) { // 10MB
            alert(`File "${file.name}" quá lớn (${(file.size / 1024 / 1024).toFixed(1)}MB). Vui lòng chọn ảnh nhỏ hơn 10MB.`);
            continue;
        }
        
        validFiles.push(file);
    }
    
    // Add valid files to selection
    validFiles.forEach(file => {
        const imageData = {
            file: file,
            id: Date.now() + Math.random(), // Unique ID
            preview: null,
            uploaded: false,
            url: null
        };
        
        selectedImages.push(imageData);
        createImagePreview(imageData);
    });
    
    updateImageCount();
    showPreviewGallery();
}

// Create image preview
function createImagePreview(imageData) {
    const previewContainer = document.getElementById('preview-container');
    
    // Create preview element
    const previewDiv = document.createElement('div');
    previewDiv.className = 'image-preview';
    previewDiv.dataset.imageId = imageData.id;
    
    // Create loading state
    previewDiv.innerHTML = `
        <div class="image-loading">
            <div class="loading-spinner"></div>
        </div>
    `;
    
    previewContainer.appendChild(previewDiv);
    
    // Load image preview
    const reader = new FileReader();
    reader.onload = (e) => {
        imageData.preview = e.target.result;
        previewDiv.innerHTML = `
            <img src="${e.target.result}" alt="Preview">
            <div class="image-overlay">
                <button type="button" class="remove-btn" onclick="removeImage('${imageData.id}')">
                    <i class="fa-solid fa-times"></i>
                </button>
            </div>
        `;
    };
    
    reader.readAsDataURL(imageData.file);
}

// Remove image from selection
window.removeImage = function(imageId) {
    console.log('🗑️ Removing image:', imageId);
    
    // Remove from array
    selectedImages = selectedImages.filter(img => img.id != imageId);
    
    // Remove preview element
    const previewElement = document.querySelector(`[data-image-id="${imageId}"]`);
    if (previewElement) {
        previewElement.remove();
    }
    
    updateImageCount();
    
    // Hide gallery if no images
    if (selectedImages.length === 0) {
        hidePreviewGallery();
    }
};

// Clear all images
function clearAllImages() {
    console.log('🧹 Clearing all images');
    
    selectedImages = [];
    uploadedImageUrls = [];
    
    const previewContainer = document.getElementById('preview-container');
    if (previewContainer) {
        previewContainer.innerHTML = '';
    }
    
    hidePreviewGallery();
    updateImageCount();
    
    // Reset file input
    const fileInput = document.getElementById('portfolio-images');
    if (fileInput) {
        fileInput.value = '';
    }
}

// Update image count display
function updateImageCount() {
    const imageCount = document.getElementById('image-count');
    const count = selectedImages.length;
    if (imageCount) {
        imageCount.textContent = `${count} ảnh được chọn`;
    }
}

// Show preview gallery
function showPreviewGallery() {
    const previewGallery = document.getElementById('image-preview-gallery');
    if (previewGallery) {
        previewGallery.classList.remove('hidden');
    }
}

// Hide preview gallery
function hidePreviewGallery() {
    const previewGallery = document.getElementById('image-preview-gallery');
    if (previewGallery) {
        previewGallery.classList.add('hidden');
    }
}

// Upload images with Google Drive → Imgur fallback (Firebase Storage temporarily disabled)
async function uploadPortfolioImages(portfolioId, userId) {
    console.log('📤 Starting image upload for portfolio:', portfolioId);
    console.log('🔄 Using Google Drive → Imgur fallback (Firebase Storage disabled)');
    
    if (selectedImages.length === 0) {
        console.log('📷 No images to upload');
        return [];
    }
    
    const uploadedUrls = [];
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const uploadProgress = document.getElementById('upload-progress');
    
    // Show progress
    if (uploadProgress) {
        uploadProgress.classList.remove('hidden');
    }
    
    try {
        // Prepare files array
        const files = selectedImages.map(imageData => imageData.file);
        
        // Update progress for authentication
        if (progressText) {
            progressText.textContent = 'Đang kết nối Google Drive...';
        }
        
        // Primary: Upload to Google Drive
        const uploadedFiles = await uploadPortfolioImagesToGoogleDrive(portfolioId, files);
        
        // Convert to the expected format
        for (let i = 0; i < uploadedFiles.length; i++) {
            const progress = ((i + 1) / uploadedFiles.length) * 100;
            
            // Update progress
            if (progressBar) {
                progressBar.style.width = `${progress}%`;
            }
            if (progressText) {
                progressText.textContent = `Đã tải ${i + 1}/${uploadedFiles.length} ảnh lên Google Drive`;
            }
            
            const file = uploadedFiles[i];
            uploadedUrls.push({
                url: file.webContentLink, // Direct download link
                viewUrl: file.webViewLink, // View link
                name: file.name,
                id: file.id,
                storage: 'googledrive' // Mark as Google Drive storage
            });
        }
        
        console.log('✅ All images uploaded to Google Drive successfully');
        
        // Hide progress after delay
        setTimeout(() => {
            if (uploadProgress) {
                uploadProgress.classList.add('hidden');
            }
        }, 2000);
        
        // Return array of URLs for Firestore (extract URLs from objects)
        return uploadedUrls.map(item => item.url);
        
    } catch (error) {
        console.error('⚠️ Google Drive upload failed, trying Imgur fallback:', error);
        
        // Show Imgur fallback message
        if (progressText) {
            progressText.textContent = 'Google Drive chưa sẵn sàng, đang chuyển sang Imgur...';
        }
        
        try {
            // Direct fallback to Imgur (skip Firebase Storage due to billing requirements)
            const files = selectedImages.map(imageData => imageData.file);
            const uploadedFiles = await uploadPortfolioImagesToImgur(portfolioId, files);
            
            const imgurUrls = [];
            for (let i = 0; i < uploadedFiles.length; i++) {
                const progress = ((i + 1) / uploadedFiles.length) * 100;
                
                // Update progress
                if (progressBar) {
                    progressBar.style.width = `${progress}%`;
                }
                if (progressText) {
                    progressText.textContent = `Đã tải ${i + 1}/${uploadedFiles.length} ảnh lên Imgur`;
                }
                
                const file = uploadedFiles[i];
                imgurUrls.push(file.webContentLink);
            }
                
                console.log('✅ Imgur fallback successful!');
                
                if (progressText) {
                    progressText.textContent = '✅ Hoàn thành tải ảnh lên Imgur!';
                }
                
                // Hide progress after delay
                setTimeout(() => {
                    if (uploadProgress) {
                        uploadProgress.classList.add('hidden');
                    }
                }, 2000);
                
                return imgurUrls;
                
            } catch (imgurError) {
                console.error('❌ Google Drive and Imgur failed, using Base64 fallback:', imgurError);
                
                // Final fallback: save as base64 in Firestore (not ideal but works)
                console.log('🔄 Trying final fallback: base64 storage in Firestore');
                
                if (progressText) {
                    progressText.textContent = 'Lưu ảnh dưới dạng mã hóa...';
                }
                
                const base64Urls = [];
                for (let i = 0; i < selectedImages.length; i++) {
                    const imageData = selectedImages[i];
                    // Compress and convert to base64
                    const compressedBase64 = await compressImageToBase64(imageData.file, 0.6, 800);
                    base64Urls.push(compressedBase64);
                    
                    const progress = ((i + 1) / selectedImages.length) * 100;
                    if (progressBar) {
                        progressBar.style.width = `${progress}%`;
                    }
                    if (progressText) {
                        progressText.textContent = `Đã xử lý ${i + 1}/${selectedImages.length} ảnh`;
                    }
                }
                
                // Hide progress after delay
                setTimeout(() => {
                    if (uploadProgress) {
                        uploadProgress.classList.add('hidden');
                    }
                }, 2000);
                
                console.log('✅ Base64 fallback successful');
                return base64Urls;
            }
        }
    }

// Helper function to compress image to base64
async function compressImageToBase64(file, quality = 0.6, maxWidth = 800) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = function() {
            // Calculate new dimensions
            let { width, height } = this;
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Draw and compress
            ctx.drawImage(this, 0, 0, width, height);
            const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
            resolve(compressedBase64);
        };
        
        img.src = URL.createObjectURL(file);
    });
}

// Note: clearAllImages and updateImageCount are already defined above (line ~6230-6260)

// Enhanced image compression with better quality and WebP support
function compressImage(file, maxWidth = 800, quality = 0.8) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
            // Calculate new dimensions maintaining aspect ratio
            let { width, height } = img;
            
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }
            
            // Set canvas size
            canvas.width = width;
            canvas.height = height;
            
            // Enable better image smoothing
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            // Draw and compress
            ctx.drawImage(img, 0, 0, width, height);
            
            // Try WebP first (better compression), fallback to JPEG
            canvas.toBlob((webpBlob) => {
                if (webpBlob && webpBlob.size < file.size) {
                    console.log(`🗜️ WebP compression: ${file.size} → ${webpBlob.size} bytes (${Math.round((1 - webpBlob.size/file.size) * 100)}% reduction)`);
                    resolve(webpBlob);
                } else {
                    // Fallback to JPEG
                    canvas.toBlob((jpegBlob) => {
                        if (jpegBlob && jpegBlob.size < file.size) {
                            console.log(`🗜️ JPEG compression: ${file.size} → ${jpegBlob.size} bytes (${Math.round((1 - jpegBlob.size/file.size) * 100)}% reduction)`);
                            resolve(jpegBlob);
                        } else {
                            console.log('⚠️ Compression not beneficial, using original');
                            resolve(file);
                        }
                    }, 'image/jpeg', quality);
                }
            }, 'image/webp', quality);
        };
        
        img.onerror = () => {
            console.error('❌ Image compression failed, using original');
            resolve(file);
        };
        
        img.src = URL.createObjectURL(file);
    });
}

// === GOOGLE DRIVE API FUNCTIONS ===

// Initialize Google Drive API with improved error handling
async function initializeGoogleDrive() {
    console.log('🔧 Initializing Google Drive API...');
    
    try {
        // Check if running on correct domain
        const currentDomain = window.location.hostname;
        console.log('🌐 Current domain:', currentDomain);
        
        // Use different config based on domain
        let initConfig = { ...GOOGLE_CONFIG };
        
        // Remove domain restrictions for localhost or if having issues
        if (currentDomain === 'localhost' || currentDomain === '127.0.0.1') {
            console.log('🏠 Running on localhost, removing domain restrictions');
            delete initConfig.hostedDomain;
            delete initConfig.redirectUri;
        } else if (currentDomain === 'xemgiadat.com') {
            console.log('🌐 Running on production domain');
            // Keep domain restrictions but add fallback
            initConfig.cookie_policy = 'none';
        }
        
        // Load Google APIs with timeout
        if (typeof gapi === 'undefined') {
            console.log('📦 Loading Google API script...');
            await Promise.race([
                loadGoogleAPIScript(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Script load timeout')), 10000))
            ]);
        }
        
        console.log('📚 Loading Google API components...');
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('API load timeout')), 15000);
            gapi.load('auth2:client', () => {
                clearTimeout(timeout);
                resolve();
            });
        });
        
        console.log('🔑 Initializing Google client with config:', initConfig);
        await gapi.client.init(initConfig);
        
        googleAuthInstance = gapi.auth2.getAuthInstance();
        
        // Check if user is already signed in
        if (googleAuthInstance.isSignedIn.get()) {
            console.log('👤 User already signed in to Google Drive');
        } else {
            console.log('👤 User not signed in to Google Drive');
        }
        
        isGoogleDriveReady = true;
        console.log('✅ Google Drive API initialized successfully');
        return true;
        
    } catch (error) {
        console.error('❌ Failed to initialize Google Drive API:', error);
        isGoogleDriveReady = false;
        
        // Detailed error logging
        if (error.error === 'idpiframe_initialization_failed') {
            console.error('🚨 Domain authorization issue. Need to add domain to Google Console.');
            console.error('📋 Current domain needs to be added to authorized domains.');
            console.error('🔗 Go to: https://console.cloud.google.com/apis/credentials');
            console.error('🔧 Add https://xemgiadat.com to Authorized JavaScript origins');
        }
        
        return false;
    }
}

// Load Google API script dynamically with better error handling
function loadGoogleAPIScript() {
    return new Promise((resolve, reject) => {
        // Check if script already exists
        if (document.querySelector('script[src*="apis.google.com"]')) {
            console.log('📦 Google API script already loaded');
            resolve();
            return;
        }
        
        console.log('📦 Creating Google API script element...');
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.async = true;
        script.defer = true;
        
        script.onload = () => {
            console.log('✅ Google API script loaded successfully');
            resolve();
        };
        
        script.onerror = (error) => {
            console.error('❌ Failed to load Google API script:', error);
            reject(new Error('Failed to load Google API script'));
        };
        
        document.head.appendChild(script);
        console.log('📦 Google API script added to document head');
    });
}

// Authenticate with Google Drive with retry mechanism
async function authenticateGoogleDrive() {
    console.log('🔐 Authenticating with Google Drive...');
    
    try {
        // Ensure API is initialized
        if (!isGoogleDriveReady) {
            console.log('🔧 Google Drive API not ready, initializing...');
            const initialized = await initializeGoogleDrive();
            if (!initialized) {
                throw new Error('Google Drive API initialization failed');
            }
        }
        
        // Check current auth status
        if (!googleAuthInstance) {
            throw new Error('Google Auth instance not available');
        }
        
        console.log('📋 Current auth status:', googleAuthInstance.isSignedIn.get());
        
        // Sign in if not already signed in
        if (!googleAuthInstance.isSignedIn.get()) {
            console.log('🔑 Signing in to Google Drive...');
            
            try {
                const user = await googleAuthInstance.signIn({
                    prompt: 'select_account' // Always show account picker
                });
                console.log('✅ Sign in successful:', user.getBasicProfile().getName());
            } catch (authError) {
                console.error('❌ Sign in failed:', authError);
                
                // Handle specific auth errors
                if (authError.error === 'popup_blocked_by_browser') {
                    throw new Error('Popup blocked. Please allow popups for this site.');
                } else if (authError.error === 'access_denied') {
                    throw new Error('Access denied. Please grant permissions to Google Drive.');
                } else {
                    throw new Error(`Authentication failed: ${authError.error || authError.message}`);
                }
            }
        } else {
            console.log('✅ Already signed in to Google Drive');
        }
        
        // Verify we have the necessary scopes
        const currentUser = googleAuthInstance.currentUser.get();
        const authResponse = currentUser.getAuthResponse();
        console.log('🔍 Auth scopes granted:', authResponse.scope);
        
        // Check if we have Drive file scope
        if (!authResponse.scope.includes('drive.file')) {
            console.warn('⚠️ Drive file scope not granted, requesting additional permissions...');
            await googleAuthInstance.signIn({
                scope: GOOGLE_CONFIG.scope
            });
        }
        
        console.log('✅ Google Drive authentication successful');
        return true;
        
    } catch (error) {
        console.error('❌ Google Drive authentication failed:', error);
        throw error;
    }
}

// Create portfolio folder in Google Drive
async function createPortfolioFolder(portfolioId) {
    console.log('📁 Creating portfolio folder:', portfolioId);
    
    try {
        const response = await gapi.client.drive.files.create({
            resource: {
                name: `Portfolio_${portfolioId}`,
                mimeType: 'application/vnd.google-apps.folder',
                parents: ['root'] // Store in root folder
            }
        });
        
        const folderId = response.result.id;
        console.log('✅ Portfolio folder created:', folderId);
        return folderId;
    } catch (error) {
        console.error('❌ Failed to create portfolio folder:', error);
        throw error;
    }
}

// Upload file to Google Drive
async function uploadToGoogleDrive(file, fileName, folderId) {
    console.log('📤 Uploading to Google Drive:', fileName);
    
    const fileMetadata = {
        name: fileName,
        parents: [folderId]
    };
    
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(fileMetadata)], {type: 'application/json'}));
    form.append('file', file);
    
    const accessToken = gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token;
    
    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`
        },
        body: form
    });
    
    if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('✅ File uploaded to Google Drive:', result.id);
    
    // Make file publicly viewable
    await gapi.client.drive.permissions.create({
        fileId: result.id,
        resource: {
            role: 'reader',
            type: 'anyone'
        }
    });
    
    return {
        id: result.id,
        name: result.name,
        webViewLink: `https://drive.google.com/file/d/${result.id}/view`,
        webContentLink: `https://drive.google.com/uc?id=${result.id}`
    };
}

// === GOOGLE DRIVE TEST & DEBUG FUNCTIONS (only in DEBUG_MODE) ===
if (typeof DEBUG_MODE !== 'undefined' && DEBUG_MODE) {
    // Test Google Drive connectivity
    window.testGoogleDriveConnection = async function() {
        console.log('🧪 Testing Google Drive connection...');
        try {
            const initialized = await initializeGoogleDrive();
            if (!initialized) throw new Error('Failed to initialize');
            await authenticateGoogleDrive();
            const response = await gapi.client.drive.about.get({ fields: 'user,storageQuota' });
            alert('✅ Google Drive test successful!');
            return true;
        } catch (error) {
            console.error('❌ Google Drive test failed:', error);
            alert(`❌ Google Drive test failed:\n${error.message}`);
            return false;
        }
    };
    
    window.debugGoogleDriveStatus = function() {
        console.log('🔍 Google Drive Status:', {
            apiReady: isGoogleDriveReady,
            gapiAvailable: typeof gapi !== 'undefined',
            authInstance: !!googleAuthInstance,
            domain: window.location.hostname
        });
    };
}

// Upload portfolio images to Google Drive
async function uploadPortfolioImagesToGoogleDrive(portfolioId, files) {
    if (DEBUG_MODE) console.log('📤 Starting Google Drive upload for portfolio:', portfolioId);
    
    try {
        // Authenticate first
        await authenticateGoogleDrive();
        
        // Create portfolio folder
        const folderId = await createPortfolioFolder(portfolioId);
        
        const uploadedFiles = [];
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fileName = `image_${Date.now()}_${Math.random().toString(36).substring(7)}.${file.type.split('/')[1]}`;
            
            try {
                const result = await uploadToGoogleDrive(file, fileName, folderId);
                uploadedFiles.push(result);
                console.log(`✅ Uploaded ${i + 1}/${files.length}: ${fileName}`);
            } catch (error) {
                console.error(`❌ Failed to upload ${fileName}:`, error);
                throw error;
            }
        }
        
        console.log('✅ All files uploaded to Google Drive successfully');
        return uploadedFiles;
        
    } catch (error) {
        console.error('❌ Google Drive upload failed:', error);
        throw error;
    }
}

// === IMGUR API FUNCTIONS ===

// Upload single file to Imgur
async function uploadToImgur(file, fileName) {
    console.log('📤 Uploading to Imgur:', fileName);
    
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async function() {
            try {
                const base64Data = reader.result.split(',')[1]; // Remove data:image/...;base64,
                
                let response;
                let currentClientId = IMGUR_CONFIG.clientId;
                let attempts = 0;
                const maxAttempts = 1 + IMGUR_CONFIG.backupKeys.length;
                
                while (attempts < maxAttempts) {
                    try {
                        console.log(`🔄 Imgur attempt ${attempts + 1} with client ID: ${currentClientId.substring(0, 8)}...`);
                        
                        // Method 1: Try FormData first (preferred for HTTP/2)
                        const formData = new FormData();
                        formData.append('image', base64Data);
                        formData.append('type', 'base64');
                        formData.append('title', fileName);
                        formData.append('description', 'Uploaded from XemGiaDat Portfolio');
                        
                        response = await fetch(IMGUR_CONFIG.apiUrl, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Client-ID ${currentClientId}`
                                // Don't set Content-Type for FormData - browser will set it automatically
                            },
                            body: formData
                        });
                        
                        if (response.ok) {
                            break; // Success, exit retry loop
                        } else if (attempts < maxAttempts - 1) {
                            // Try next backup key
                            currentClientId = IMGUR_CONFIG.backupKeys[attempts];
                            attempts++;
                            continue;
                        } else {
                            // Last attempt failed, will handle error below
                            break;
                        }
                        
                    } catch (formDataError) {
                        console.warn(`⚠️ FormData method failed on attempt ${attempts + 1}, trying JSON fallback:`, formDataError.message);
                        
                        // Method 2: Fallback to JSON if FormData fails
                        try {
                            response = await fetch(IMGUR_CONFIG.apiUrl, {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Client-ID ${currentClientId}`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    image: base64Data,
                                    type: 'base64',
                                    title: fileName,
                                    description: 'Uploaded from XemGiaDat Portfolio'
                                })
                            });
                            
                            if (response.ok) {
                                break; // Success
                            }
                        } catch (jsonError) {
                            console.warn(`⚠️ JSON method also failed on attempt ${attempts + 1}:`, jsonError.message);
                        }
                        
                        // Try next key if available
                        if (attempts < maxAttempts - 1) {
                            currentClientId = IMGUR_CONFIG.backupKeys[attempts];
                            attempts++;
                        } else {
                            break;
                        }
                    }
                }
                
                const result = await response.json();
                console.log('📡 Imgur API response:', result);
                
                if (!response.ok) {
                    console.error('❌ Imgur HTTP error:', response.status, response.statusText);
                    console.error('❌ Imgur error details:', result);
                    throw new Error(`Imgur upload failed: ${response.status} - ${result.data?.error || response.statusText}`);
                }
                
                if (!result.success) {
                    console.error('❌ Imgur API error:', result.data?.error);
                    throw new Error(`Imgur API error: ${result.data?.error || 'Unknown error'}`);
                }
                
                console.log('✅ File uploaded to Imgur successfully:', result.data.id);
                
                resolve({
                    id: result.data.id,
                    name: fileName,
                    webViewLink: result.data.link,
                    webContentLink: result.data.link, // Same as view link for Imgur
                    deleteHash: result.data.deletehash // For future deletion if needed
                });
                
            } catch (error) {
                console.error('❌ Imgur upload error:', error);
                reject(error);
            }
        };
        
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

// NOTE: Firebase Storage function removed due to billing requirements
// Fallback system now uses: Google Drive → Imgur (multiple keys) → Base64 compression

// Upload portfolio images to Imgur
async function uploadPortfolioImagesToImgur(portfolioId, files) {
    console.log('📤 Starting Imgur upload for portfolio:', portfolioId);
    
    try {
        const uploadedFiles = [];
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fileName = `portfolio_${portfolioId}_${Date.now()}_${Math.random().toString(36).substring(7)}.${file.type.split('/')[1]}`;
            
            try {
                const result = await uploadToImgur(file, fileName);
                uploadedFiles.push(result);
                console.log(`✅ Uploaded ${i + 1}/${files.length} to Imgur: ${fileName}`);
            } catch (error) {
                console.error(`❌ Failed to upload ${fileName} to Imgur:`, error);
                throw error;
            }
        }
        
        console.log('✅ All files uploaded to Imgur successfully');
        return uploadedFiles;
        
    } catch (error) {
        console.error('❌ Imgur upload failed:', error);
        throw error;
    }
}

// Note: Second uploadPortfolioImagesToImgur removed (duplicate)

// Initialize image upload when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.__XGD_BOOT__ && window.__XGD_BOOT__.booted) {
            if (DEBUG_MODE) console.log('[SKIP] initializeImageUpload (secondary listener)');
            return;
        }
        setTimeout(initializeImageUpload, 1000);
    });
} else {
    setTimeout(initializeImageUpload, 1000);
}

// Debug function to test image upload services
window.testImageUploadServices = async function() {
    console.log('🧪 Testing 3-tier upload system (Google Drive → Imgur → Base64)...');
    
    // Create a test image (1x1 pixel red PNG)
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'red';
    ctx.fillRect(0, 0, 1, 1);
    
    canvas.toBlob(async (blob) => {
        const testFile = new File([blob], 'test_image.png', { type: 'image/png' });
        
        console.log('📦 Created test file:', testFile.name, testFile.size, 'bytes');
        
        // Test Imgur (primary fallback after Google Drive)
        try {
            console.log('🔄 Testing Imgur upload...');
            const imgurResult = await uploadToImgur(testFile, 'test_imgur_' + Date.now() + '.png');
            console.log('✅ Imgur test successful:', imgurResult);
        } catch (error) {
            console.error('❌ Imgur test failed:', error);
        }
        
        // Test Google Drive if available
        try {
            console.log('🔄 Testing Google Drive upload...');
            await authenticateGoogleDrive();
            const driveResult = await uploadToGoogleDrive(testFile, 'test_drive_' + Date.now() + '.png');
            console.log('✅ Google Drive test successful:', driveResult);
        } catch (error) {
            console.error('❌ Google Drive test failed:', error);
        }
        
        // Test Base64 compression (final fallback)
        try {
            console.log('🔄 Testing Base64 compression...');
            const base64Result = await compressImageToBase64(testFile, 0.6, 800);
            console.log('✅ Base64 compression successful. Size:', Math.round(base64Result.length / 1024), 'KB');
        } catch (error) {
            console.error('❌ Base64 test failed:', error);
        }
    }, 'image/png');
};

// Enhanced debug function for Google Drive status
window.debugGoogleDriveStatusEnhanced = function() {
    console.log('🔍 Google Drive Enhanced Debug Status:');
    console.log('🌐 Current domain:', window.location.hostname);
    console.log('🔑 API Key configured:', !!GOOGLE_CONFIG.apiKey);
    console.log('🆔 Client ID configured:', !!GOOGLE_CONFIG.clientId);
    console.log('⚡ Google API loaded:', typeof gapi !== 'undefined');
    console.log('🔐 Google Drive ready:', isGoogleDriveReady);
    console.log('👤 Auth instance:', !!googleAuthInstance);
    
    if (typeof gapi !== 'undefined' && gapi.client) {
        console.log('📚 GAPI client loaded:', !!gapi.client);
        console.log('💿 Drive API loaded:', !!gapi.client.drive);
    }
    
    console.log('📋 Current GOOGLE_CONFIG:', GOOGLE_CONFIG);
    
    // Test domain authorization
    if (window.location.hostname === 'xemgiadat.com') {
        console.log('🌍 Running on production domain - requires Google Console authorization');
        console.log('🔗 Add this domain to: https://console.cloud.google.com/apis/credentials');
        console.log('📝 Add to Authorized JavaScript origins: https://xemgiadat.com');
        console.log('📝 Add to Authorized redirect URIs: https://xemgiadat.com');
    } else {
        console.log('🏠 Running on development domain:', window.location.hostname);
    }
};

// ============================================================================
// 📱 MOBILE UX ENHANCEMENTS - Phase 1 Implementation
// ============================================================================

// Mobile-specific optimizations
function initializeMobileOptimizations() {
    console.log('📱 Initializing mobile optimizations...');
    
    // Check if mobile device
    const isMobile = window.innerWidth <= 480 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        console.log('📱 Mobile device detected, applying optimizations...');
        
        // 1. Enhanced touch handling for portfolio modals
        enhanceTouchHandling();
        
        // 2. Optimize image upload for mobile
        optimizeImageUploadMobile();
        
        // 3. Add mobile-specific event listeners
        addMobileEventListeners();
        
        // 4. Improve modal scroll behavior
        fixModalScrolling();
        
        // 5. Add haptic feedback simulation
        addHapticFeedback();
    }
}

// Enhanced touch handling
function enhanceTouchHandling() {
    // Prevent zoom on double tap for buttons
    document.addEventListener('touchend', function(e) {
        if (e.target.matches('button, .btn, input[type="submit"], input[type="button"]')) {
            e.preventDefault();
            e.target.click();
        }
    });
    
    // Improve modal close on outside tap
    document.addEventListener('touchstart', function(e) {
        const modals = ['#portfolio-modal', '#add-portfolio-modal'];
        modals.forEach(modalId => {
            const modal = document.querySelector(modalId);
            if (modal && !modal.classList.contains('hidden')) {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                    document.body.style.overflow = 'auto';
                }
            }
        });
    });
}

// Mobile image upload optimization
function optimizeImageUploadMobile() {
    const uploadZone = document.getElementById('image-upload-zone');
    if (uploadZone) {
        // Add visual feedback for touch
        uploadZone.addEventListener('touchstart', function() {
            this.style.transform = 'scale(0.98)';
        });
        
        uploadZone.addEventListener('touchend', function() {
            this.style.transform = 'scale(1)';
        });
        
        // Improve file selector for mobile
        const selectBtn = document.getElementById('select-images-btn');
        if (selectBtn) {
            selectBtn.addEventListener('touchstart', function() {
                this.style.transform = 'scale(0.95)';
            });
            
            selectBtn.addEventListener('touchend', function() {
                this.style.transform = 'scale(1)';
            });
        }
    }
}

// Mobile-specific event listeners
function addMobileEventListeners() {
    // Orientation change handling
    window.addEventListener('orientationchange', function() {
        setTimeout(() => {
            // Recalculate modal heights after orientation change
            const modals = document.querySelectorAll('#portfolio-modal, #add-portfolio-modal');
            modals.forEach(modal => {
                if (!modal.classList.contains('hidden')) {
                    modal.style.height = '100vh';
                }
            });
        }, 500);
    });
    
    // Keyboard handling for mobile
    window.addEventListener('resize', function() {
        // Detect virtual keyboard open/close
        const currentHeight = window.innerHeight;
        const isKeyboardOpen = currentHeight < window.screen.height * 0.75;
        
        if (isKeyboardOpen) {
            document.body.classList.add('keyboard-open');
        } else {
            document.body.classList.remove('keyboard-open');
        }
    });
}

// Fix modal scrolling issues on mobile
function fixModalScrolling() {
    const modals = document.querySelectorAll('#portfolio-modal, #add-portfolio-modal');
    
    modals.forEach(modal => {
        modal.addEventListener('scroll', function(e) {
            e.stopPropagation();
        });
        
        // Prevent body scroll when modal is open
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.attributeName === 'class') {
                    if (modal.classList.contains('hidden')) {
                        document.body.style.overflow = 'auto';
                        document.body.style.position = 'static';
                    } else {
                        document.body.style.overflow = 'hidden';
                        document.body.style.position = 'fixed';
                        document.body.style.width = '100%';
                    }
                }
            });
        });
        
        observer.observe(modal, { attributes: true });
    });
}

// Add haptic feedback simulation
function addHapticFeedback() {
    // Add CSS for mobile enhancements
    if (!document.getElementById('mobile-enhancement-styles')) {
        const style = document.createElement('style');
        style.id = 'mobile-enhancement-styles';
        style.textContent = `
            @keyframes ripple {
                to {
                    transform: scale(2);
                    opacity: 0;
                }
            }
            
            .keyboard-open {
                padding-bottom: 0 !important;
            }
            
            body.keyboard-open #add-portfolio-modal .bg-white {
                height: auto !important;
                max-height: calc(100vh - 50px) !important;
            }
            
            /* Smooth transitions for touch feedback */
            button, .btn {
                transition: transform 0.1s ease;
            }
            
            button:active, .btn:active {
                transform: scale(0.95);
            }
        `;
        document.head.appendChild(style);
    }
}

// Initialize mobile optimizations when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (window.__XGD_BOOT__ && window.__XGD_BOOT__.booted) {
        if (DEBUG_MODE) console.log('[SKIP] initializeMobileOptimizations (secondary listener)');
        return;
    }
    initializeMobileOptimizations();
});

// ============================================================================
// 🚀 PHASE 2: FOUNDATION STRENGTHENING - Core Features Enhancement
// ============================================================================

// Advanced Search Management
class AdvancedSearchManager {
    constructor() {
        this.searchHistory = this.loadSearchHistory();
        this.searchSuggestions = [];
        this.searchCache = new Map();
        this.debounceTimer = null;
        this.init();
    }
    
    init() {
        console.log('🔍 Initializing Advanced Search Manager...');
        // this.setupSearchHistory(); // Method not implemented yet
        this.setupAutoComplete();
        this.setupSearchAnalytics();
        this.setupFuzzySearch();
    }
    
    // Search History Management
    loadSearchHistory() {
        try {
            const history = localStorage.getItem('xemgiadat_search_history');
            return history ? JSON.parse(history) : [];
        } catch (error) {
            console.error('Error loading search history:', error);
            return [];
        }
    }
    
    saveSearchHistory() {
        try {
            // Keep only last 50 searches
            const recentHistory = this.searchHistory.slice(-50);
            localStorage.setItem('xemgiadat_search_history', JSON.stringify(recentHistory));
        } catch (error) {
            console.error('Error saving search history:', error);
        }
    }
    
    addToSearchHistory(query, results) {
        if (!query || query.length < 2) return;
        
        const searchEntry = {
            query: query.trim(),
            timestamp: Date.now(),
            resultsCount: results ? results.length : 0,
            type: this.detectSearchType(query)
        };
        
        // Remove duplicates
        this.searchHistory = this.searchHistory.filter(item => item.query !== searchEntry.query);
        this.searchHistory.push(searchEntry);
        this.saveSearchHistory();
    }
    
    detectSearchType(query) {
        if (/^\d+\/\d+$/.test(query)) return 'parcel'; // Format: 123/45
        if (/^\d+$/.test(query)) return 'number';
        if (/đất|land|property/i.test(query)) return 'category';
        return 'general';
    }
    
    // Auto-complete functionality
    setupAutoComplete() {
        const searchInput = document.getElementById('search-input');
        if (!searchInput) return;
        
        searchInput.addEventListener('input', (e) => {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => {
                this.handleSearchInput(e.target.value);
            }, 300);
        });
        
        searchInput.addEventListener('focus', () => {
            this.showSearchSuggestions();
        });
    }
    
    handleSearchInput(query) {
        if (query.length < 2) {
            this.hideSearchSuggestions();
            return;
        }
        
        const suggestions = this.generateSuggestions(query);
        this.displaySuggestions(suggestions);
    }
    
    generateSuggestions(query) {
        const suggestions = [];
        
        // Add from search history
        const historySuggestions = this.searchHistory
            .filter(item => item.query.toLowerCase().includes(query.toLowerCase()))
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 3)
            .map(item => ({
                text: item.query,
                type: 'history',
                icon: 'fa-history',
                resultsCount: item.resultsCount
            }));
        
        suggestions.push(...historySuggestions);
        
        // Add smart suggestions based on query type
        if (/^\d+$/.test(query)) {
            suggestions.push({
                text: `Thửa ${query}`,
                type: 'parcel',
                icon: 'fa-map-marker-alt',
                action: () => this.searchByParcel(query)
            });
        }
        
        // Add location suggestions
        const locationSuggestions = this.getLocationSuggestions(query);
        suggestions.push(...locationSuggestions);
        
        return suggestions.slice(0, 8); // Limit to 8 suggestions
    }
    
    getLocationSuggestions(query) {
        const locations = [
            'Hải Châu', 'Thanh Khê', 'Sơn Trà', 'Ngũ Hành Sơn', 
            'Liên Chiểu', 'Cẩm Lệ', 'Hòa Vang'
        ];
        
        return locations
            .filter(location => location.toLowerCase().includes(query.toLowerCase()))
            .map(location => ({
                text: `Quận/Huyện ${location}`,
                type: 'location',
                icon: 'fa-map',
                action: () => this.searchByLocation(location)
            }));
    }
    
    displaySuggestions(suggestions) {
        let suggestionsContainer = document.getElementById('search-suggestions');
        
        if (!suggestionsContainer) {
            suggestionsContainer = document.createElement('div');
            suggestionsContainer.id = 'search-suggestions';
            suggestionsContainer.className = 'search-suggestions';
            
            const searchContainer = document.getElementById('search-widget-container');
            if (searchContainer) {
                searchContainer.appendChild(suggestionsContainer);
            }
        }
        
        if (suggestions.length === 0) {
            suggestionsContainer.style.display = 'none';
            return;
        }
        
        suggestionsContainer.innerHTML = suggestions.map((suggestion, index) => `
            <div class="suggestion-item" data-index="${index}">
                <i class="fas ${suggestion.icon} suggestion-icon"></i>
                <span class="suggestion-text">${suggestion.text}</span>
                ${suggestion.type === 'history' ? 
                    `<span class="suggestion-count">${suggestion.resultsCount} kết quả</span>` : 
                    `<span class="suggestion-type">${suggestion.type}</span>`
                }
            </div>
        `).join('');
        
        suggestionsContainer.style.display = 'block';
        
        // Add click handlers
        suggestionsContainer.querySelectorAll('.suggestion-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                const suggestion = suggestions[index];
                if (suggestion.action) {
                    suggestion.action();
                } else {
                    this.performSearch(suggestion.text);
                }
                this.hideSearchSuggestions();
            });
        });
    }
    
    hideSearchSuggestions() {
        const suggestionsContainer = document.getElementById('search-suggestions');
        if (suggestionsContainer) {
            suggestionsContainer.style.display = 'none';
        }
    }
    
    showSearchSuggestions() {
        const searchInput = document.getElementById('search-input');
        if (searchInput && searchInput.value.length >= 2) {
            this.handleSearchInput(searchInput.value);
        }
    }
    
    // Search Analytics
    setupSearchAnalytics() {
        this.searchAnalytics = {
            totalSearches: 0,
            successfulSearches: 0,
            topQueries: new Map(),
            searchTimes: []
        };
        
        this.loadSearchAnalytics();
    }
    
    loadSearchAnalytics() {
        try {
            const analytics = localStorage.getItem('xemgiadat_search_analytics');
            if (analytics) {
                Object.assign(this.searchAnalytics, JSON.parse(analytics));
                this.searchAnalytics.topQueries = new Map(this.searchAnalytics.topQueries);
            }
        } catch (error) {
            console.error('Error loading search analytics:', error);
        }
    }
    
    saveSearchAnalytics() {
        try {
            const analyticsToSave = {
                ...this.searchAnalytics,
                topQueries: Array.from(this.searchAnalytics.topQueries.entries())
            };
            localStorage.setItem('xemgiadat_search_analytics', JSON.stringify(analyticsToSave));
        } catch (error) {
            console.error('Error saving search analytics:', error);
        }
    }
    
    trackSearchPerformance(query, resultsCount, searchTime) {
        this.searchAnalytics.totalSearches++;
        
        if (resultsCount > 0) {
            this.searchAnalytics.successfulSearches++;
        }
        
        // Track top queries
        const currentCount = this.searchAnalytics.topQueries.get(query) || 0;
        this.searchAnalytics.topQueries.set(query, currentCount + 1);
        
        // Track search times
        this.searchAnalytics.searchTimes.push(searchTime);
        if (this.searchAnalytics.searchTimes.length > 100) {
            this.searchAnalytics.searchTimes = this.searchAnalytics.searchTimes.slice(-100);
        }
        
        this.saveSearchAnalytics();
        
        // Log analytics for monitoring
        console.log('🔍 Search Analytics:', {
            query,
            resultsCount,
            searchTime,
            successRate: (this.searchAnalytics.successfulSearches / this.searchAnalytics.totalSearches * 100).toFixed(1) + '%'
        });
    }
    
    // Fuzzy Search Implementation
    setupFuzzySearch() {
        this.fuzzySearchThreshold = 0.7; // Similarity threshold
    }
    
    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }
    
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }
    
    // Search execution methods
    performSearch(query) {
        const startTime = performance.now();
        const searchInput = document.getElementById('search-input');
        
        if (searchInput) {
            searchInput.value = query;
        }
        
        // Trigger existing search functionality
        // This will integrate with existing search implementation
        if (typeof window.performSearch === 'function') {
            window.performSearch(query).then(results => {
                const endTime = performance.now();
                const searchTime = endTime - startTime;
                
                this.addToSearchHistory(query, results);
                this.trackSearchPerformance(query, results.length, searchTime);
            });
        }
    }
    
    searchByParcel(parcelNumber) {
        this.performSearch(`Thửa ${parcelNumber}`);
    }
    
    searchByLocation(location) {
        this.performSearch(location);
    }
    
    // Public API
    getSearchStats() {
        const successRate = this.searchAnalytics.totalSearches > 0 
            ? (this.searchAnalytics.successfulSearches / this.searchAnalytics.totalSearches * 100).toFixed(1)
            : 0;
            
        const avgSearchTime = this.searchAnalytics.searchTimes.length > 0
            ? (this.searchAnalytics.searchTimes.reduce((a, b) => a + b, 0) / this.searchAnalytics.searchTimes.length).toFixed(2)
            : 0;
            
        return {
            totalSearches: this.searchAnalytics.totalSearches,
            successRate: successRate + '%',
            avgSearchTime: avgSearchTime + 'ms',
            topQueries: Array.from(this.searchAnalytics.topQueries.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
        };
    }
    
    clearSearchHistory() {
        this.searchHistory = [];
        this.saveSearchHistory();
        console.log('🗑️ Search history cleared');
    }
}

// Initialize Advanced Search Manager
let advancedSearchManager;
document.addEventListener('DOMContentLoaded', function() {
    if (window.__XGD_BOOT__ && window.__XGD_BOOT__.booted) {
        if (DEBUG_MODE) console.log('[SKIP] AdvancedSearchManager init (secondary listener)');
        return;
    }
    advancedSearchManager = new AdvancedSearchManager();
    
    // Make it available globally for debugging
    window.searchManager = advancedSearchManager;
});

// Add CSS for search suggestions
document.addEventListener('DOMContentLoaded', function() {
    if (window.__XGD_BOOT__ && window.__XGD_BOOT__.booted) {
        if (DEBUG_MODE) console.log('[SKIP] search-suggestions-styles (secondary listener)');
        return;
    }
    if (!document.getElementById('search-suggestions-styles')) {
        const style = document.createElement('style');
        style.id = 'search-suggestions-styles';
        style.textContent = `
            .search-suggestions {
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: white;
                border-radius: 16px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
                border: 1px solid rgba(0, 0, 0, 0.05);
                backdrop-filter: blur(10px);
                margin-top: 8px;
                z-index: 1001;
                max-height: 300px;
                overflow-y: auto;
            }
            
            .suggestion-item {
                display: flex;
                align-items: center;
                padding: 12px 16px;
                cursor: pointer;
                border-bottom: 1px solid #f3f4f6;
                transition: all 0.2s ease;
            }
            
            .suggestion-item:hover {
                background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
                transform: translateX(4px);
            }
            
            .suggestion-item:last-child {
                border-bottom: none;
                border-radius: 0 0 16px 16px;
            }
            
            .suggestion-icon {
                margin-right: 12px;
                color: #6366f1;
                font-size: 16px;
                width: 20px;
                text-align: center;
            }
            
            .suggestion-text {
                flex: 1;
                font-size: 14px;
                color: #1f2937;
                font-weight: 500;
            }
            
            .suggestion-count {
                font-size: 12px;
                color: #6b7280;
                background: #f3f4f6;
                padding: 2px 8px;
                border-radius: 12px;
            }
            
            .suggestion-type {
                font-size: 11px;
                color: #6366f1;
                background: #eef2ff;
                padding: 2px 6px;
                border-radius: 8px;
                text-transform: uppercase;
                font-weight: 600;
            }
            
            @media (max-width: 480px) {
                .search-suggestions {
                    margin-top: 6px;
                    border-radius: 12px;
                    max-height: 250px;
                }
                
                .suggestion-item {
                    padding: 10px 14px;
                }
                
                .suggestion-icon {
                    margin-right: 10px;
                    font-size: 14px;
                }
                
                .suggestion-text {
                    font-size: 13px;
                }
            }
        `;
        document.head.appendChild(style);
    }
});

// ============================================================================
// 📊 PERFORMANCE MONITORING & CORE WEB VITALS - Phase 2
// ============================================================================

class PerformanceMonitor {
    constructor() {
        this.metrics = {
            FCP: null,  // First Contentful Paint
            LCP: null,  // Largest Contentful Paint
            FID: null,  // First Input Delay
            CLS: null,  // Cumulative Layout Shift
            TTFB: null, // Time to First Byte
            TTI: null   // Time to Interactive
        };
        
        this.init();
    }
    
    init() {
        console.log('📊 Initializing Performance Monitor...');
        this.setupWebVitals();
        this.setupResourceTiming();
        this.setupUserTiming();
        this.setupErrorTracking();
        this.startPerformanceObserver();
    }
    
    setupWebVitals() {
        // Web Vitals implementation
        if ('PerformanceObserver' in window) {
            // Largest Contentful Paint (LCP)
            new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.metrics.LCP = entry.startTime;
                    this.reportMetric('LCP', entry.startTime);
                }
            }).observe({ type: 'largest-contentful-paint', buffered: true });
            
            // First Input Delay (FID)
            new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.metrics.FID = entry.processingStart - entry.startTime;
                    this.reportMetric('FID', this.metrics.FID);
                }
            }).observe({ type: 'first-input', buffered: true });
            
            // Cumulative Layout Shift (CLS)
            let clsValue = 0;
            new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (!entry.hadRecentInput) {
                        clsValue += entry.value;
                    }
                }
                this.metrics.CLS = clsValue;
                this.reportMetric('CLS', clsValue);
            }).observe({ type: 'layout-shift', buffered: true });
        }
        
        // Navigation Timing for additional metrics
        if ('performance' in window && 'getEntriesByType' in performance) {
            const navEntries = performance.getEntriesByType('navigation');
            if (navEntries.length > 0) {
                const nav = navEntries[0];
                
                // Time to First Byte
                this.metrics.TTFB = nav.responseStart - nav.requestStart;
                this.reportMetric('TTFB', this.metrics.TTFB);
                
                // First Contentful Paint (if available)
                const paintEntries = performance.getEntriesByType('paint');
                for (const entry of paintEntries) {
                    if (entry.name === 'first-contentful-paint') {
                        this.metrics.FCP = entry.startTime;
                        this.reportMetric('FCP', entry.startTime);
                    }
                }
            }
        }
    }
    
    setupResourceTiming() {
        // DISABLED: Resource timing observer causes significant TBT increase
        // due to processing all buffered resources on page load
        // Only enable in debug mode if needed
        if (window.location.search.includes('debug=perf')) {
            if ('PerformanceObserver' in window) {
                new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        // Track slow resources
                        if (entry.duration > 3000) { // Only very slow resources (3s+)
                            console.warn('🐌 Slow resource:', {
                                name: entry.name,
                                duration: entry.duration
                            });
                        }
                    }
                }).observe({ type: 'resource', buffered: false }); // Don't process buffered
            }
        }
    }
    
    setupUserTiming() {
        // Custom timing marks for app-specific metrics
        this.markTime('app_start');
        
        // Mark when critical features are ready
        document.addEventListener('DOMContentLoaded', () => {
            if (window.__XGD_BOOT__ && window.__XGD_BOOT__.booted) {
                if (DEBUG_MODE) console.log('[SKIP] PerformanceMonitor markTime (secondary listener)');
                return;
            }
            this.markTime('dom_ready');
        });
        
        window.addEventListener('load', () => {
            this.markTime('page_load_complete');
            this.calculateCustomMetrics();
        });
    }
    
    markTime(name) {
        if ('performance' in window && 'mark' in performance) {
            performance.mark(name);
        }
    }
    
    measureTime(measureName, startMark, endMark) {
        if ('performance' in window && 'measure' in performance) {
            try {
                performance.measure(measureName, startMark, endMark);
                const measures = performance.getEntriesByName(measureName);
                if (measures.length > 0) {
                    return measures[measures.length - 1].duration;
                }
            } catch (error) {
                console.warn('Error measuring time:', error);
            }
        }
        return null;
    }
    
    calculateCustomMetrics() {
        // App loading time
        const appLoadTime = this.measureTime('app_load_time', 'app_start', 'page_load_complete');
        if (appLoadTime) {
            this.reportMetric('App_Load_Time', appLoadTime);
        }
        
        // DOM ready time
        const domReadyTime = this.measureTime('dom_ready_time', 'app_start', 'dom_ready');
        if (domReadyTime) {
            this.reportMetric('DOM_Ready_Time', domReadyTime);
        }
    }
    
    setupErrorTracking() {
        // JavaScript errors
        window.addEventListener('error', (event) => {
            this.reportError({
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error
            });
        });
        
        // Unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.reportError({
                message: 'Unhandled Promise Rejection',
                reason: event.reason,
                type: 'promise_rejection'
            });
        });
        
        // Resource loading errors
        document.addEventListener('error', (event) => {
            if (event.target !== window) {
                this.reportError({
                    message: 'Resource loading error',
                    source: event.target.src || event.target.href,
                    tagName: event.target.tagName,
                    type: 'resource_error'
                });
            }
        }, true);
    }
    
    startPerformanceObserver() {
        // DISABLED in production: Long task observer itself causes overhead
        // Enable only in debug mode: ?debug=perf
        if (!window.location.search.includes('debug=perf')) {
            return;
        }
        
        // Monitor long tasks (> 50ms)
        if ('PerformanceObserver' in window) {
            try {
                new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.duration > 100) { // Increased threshold
                            console.warn('🔥 Long task detected:', {
                                duration: entry.duration,
                                startTime: entry.startTime
                            });
                            
                            this.reportMetric('Long_Task', entry.duration);
                        }
                    }
                }).observe({ type: 'longtask', buffered: false }); // Don't process buffered
            } catch (error) {
                console.log('Long task observer not supported');
            }
        }
    }
    
    reportMetric(name, value) {
        console.log(`📊 Performance Metric - ${name}:`, value);
        
        // Report to Google Analytics
        if (window.trackPerformance) {
            window.trackPerformance(name, Math.round(value));
        }
        
        // Store locally for dashboard
        this.storeMetric(name, value);
        
        // Real-time performance alerts
        this.checkPerformanceThresholds(name, value);
    }
    
    storeMetric(name, value) {
        try {
            const stored = localStorage.getItem('xemgiadat_performance_metrics') || '{}';
            const metrics = JSON.parse(stored);
            
            if (!metrics[name]) {
                metrics[name] = [];
            }
            
            metrics[name].push({
                value: value,
                timestamp: Date.now()
            });
            
            // Keep only last 50 measurements per metric
            if (metrics[name].length > 50) {
                metrics[name] = metrics[name].slice(-50);
            }
            
            localStorage.setItem('xemgiadat_performance_metrics', JSON.stringify(metrics));
        } catch (error) {
            console.error('Error storing metric:', error);
        }
    }
    
    checkPerformanceThresholds(name, value) {
        const thresholds = {
            'LCP': { good: 2500, poor: 4000 },
            'FID': { good: 100, poor: 300 },
            'CLS': { good: 0.1, poor: 0.25 },
            'FCP': { good: 1800, poor: 3000 },
            'TTFB': { good: 800, poor: 1800 }
        };
        
        const threshold = thresholds[name];
        if (threshold) {
            let status = 'good';
            if (value > threshold.poor) {
                status = 'poor';
            } else if (value > threshold.good) {
                status = 'needs-improvement';
            }
            
            console.log(`📊 ${name} Status:`, status, `(${value})`);
            
            // Alert for poor performance
            if (status === 'poor') {
                this.showPerformanceAlert(name, value, threshold);
            }
        }
    }
    
    showPerformanceAlert(metric, value, threshold) {
        console.warn(`🚨 Performance Alert: ${metric} is ${value}, exceeding threshold of ${threshold.poor}`);
        
        // Could trigger user notification in development
        if (window.location.hostname === 'localhost') {
            const alert = document.createElement('div');
            alert.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                background: #fee2e2;
                color: #dc2626;
                padding: 10px;
                border-radius: 8px;
                font-size: 12px;
                z-index: 10000;
                max-width: 300px;
            `;
            alert.textContent = `Performance Alert: ${metric} is slow (${Math.round(value)}ms)`;
            document.body.appendChild(alert);
            
            setTimeout(() => alert.remove(), 5000);
        }
    }
    
    reportError(errorData) {
        // 🚀 P0: Filter Resource loading errors to reduce noise
        if (errorData && errorData.message && errorData.message.includes('Resource loading')) {
            console.debug('[ErrorTracker] Filtered Resource loading error');
            return; // Skip reporting resource errors
        }
        
        console.error('📛 Error tracked:', errorData);
        
        // Report to Google Analytics
        if (window.trackError) {
            window.trackError(errorData, 'performance_monitor');
        }
        
        // Store error for analysis
        try {
            const stored = localStorage.getItem('xemgiadat_error_log') || '[]';
            let errors = JSON.parse(stored);

            // 🚀 P0: Clear error log when it grows beyond 20 items
            if (errors.length >= 20) {
                localStorage.removeItem('xemgiadat_error_log');
                errors = [];
            }
            
            // 🚀 P0: Filter duplicate errors (same message within last 5 items)
            const lastErrors = errors.slice(-3);
            const isDuplicate = lastErrors.some(err => 
                err && err.message === errorData.message && 
                (Date.now() - err.timestamp) < 5000
            );
            
            if (isDuplicate) {
                console.debug('[ErrorTracker] Duplicate filtered (same message <5s)');
                return; // Skip duplicate errors
            }
            
            errors.push({
                ...errorData,
                timestamp: Date.now(),
                userAgent: navigator.userAgent,
                url: window.location.href
            });
            
            // Keep only last 20 errors
            if (errors.length > 20) {
                errors.splice(0, errors.length - 20);
            }
            
            localStorage.setItem('xemgiadat_error_log', JSON.stringify(errors));
        } catch (error) {
            console.error('Error storing error log:', error);
        }
    }
    
    // Public API for performance dashboard
    getPerformanceReport() {
        try {
            const stored = localStorage.getItem('xemgiadat_performance_metrics') || '{}';
            const metrics = JSON.parse(stored);
            
            const report = {};
            for (const [name, values] of Object.entries(metrics)) {
                if (values.length > 0) {
                    const recent = values.slice(-10);
                    const avg = recent.reduce((sum, item) => sum + item.value, 0) / recent.length;
                    const min = Math.min(...recent.map(item => item.value));
                    const max = Math.max(...recent.map(item => item.value));
                    
                    report[name] = {
                        average: Math.round(avg),
                        min: Math.round(min),
                        max: Math.round(max),
                        samples: recent.length,
                        latest: Math.round(recent[recent.length - 1].value)
                    };
                }
            }
            
            return report;
        } catch (error) {
            console.error('Error generating performance report:', error);
            return {};
        }
    }
    
    getErrorReport() {
        try {
            const stored = localStorage.getItem('xemgiadat_error_log') || '[]';
            const errors = JSON.parse(stored);
            
            return {
                totalErrors: errors.length,
                recentErrors: errors.slice(-10),
                errorTypes: this.groupErrorsByType(errors)
            };
        } catch (error) {
            console.error('Error generating error report:', error);
            return { totalErrors: 0, recentErrors: [], errorTypes: {} };
        }
    }
    
    groupErrorsByType(errors) {
        const grouped = {};
        errors.forEach(error => {
            const type = error.type || 'javascript_error';
            grouped[type] = (grouped[type] || 0) + 1;
        });
        return grouped;
    }
}

// Initialize Performance Monitor - DEFERRED to reduce TBT
let advancedPerformanceMonitor;
document.addEventListener('DOMContentLoaded', function() {
    if (window.__XGD_BOOT__ && window.__XGD_BOOT__.booted) {
        if (DEBUG_MODE) console.log('[SKIP] advancedPerformanceMonitor init (secondary listener)');
        return;
    }
    // Defer by 2 seconds to allow page to become interactive first
    setTimeout(() => {
        advancedPerformanceMonitor = new PerformanceMonitor();
        
        // Make it available globally for debugging
        window.advancedPerformanceMonitor = advancedPerformanceMonitor;
        
        // Add dashboard command
        window.getPerformanceReport = () => performanceMonitor.getPerformanceReport();
        window.getErrorReport = () => performanceMonitor.getErrorReport();
    }, 2000);
});

// ============================================================================
// 👤 USER BEHAVIOR TRACKING - Phase 2
// ============================================================================

class UserBehaviorTracker {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.startTime = Date.now();
        this.interactions = [];
        this.pageViews = [];
        this.scrollDepth = 0;
        this.maxScrollDepth = 0;
        this.isActive = true;
        this.lastActivity = Date.now();
        this.heatmapData = [];
        this.sampleRate = 0.2; // Reduce sampling to 20% for performance
        this.lastMapMoveTracked = 0;
        
        this.init();
    }
    
    init() {
        console.log('👤 Initializing User Behavior Tracker...');
        this.setupScrollTracking();
        this.setupClickTracking();
        this.setupTimeOnPage();
        this.setupVisibilityTracking();
        this.setupFormInteractions();
        this.setupSearchBehavior();
        this.setupMapInteractions();
        this.setupHeatmapTracking();
        this.setupPerformanceCorrelation();
    }
    
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    setupScrollTracking() {
        let ticking = false;
        let scrollTimeout;
        
        window.addEventListener('scroll', () => {
            this.lastActivity = Date.now();
            
            if (!ticking) {
                requestAnimationFrame(() => {
                    this.updateScrollDepth();
                    ticking = false;
                });
                ticking = true;
            }
            
            // Track scroll pauses
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                this.trackScrollPause();
            }, 1000);
        });
    }
    
    updateScrollDepth() {
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        this.scrollDepth = Math.round((scrollTop + windowHeight) / documentHeight * 100);
        this.maxScrollDepth = Math.max(this.maxScrollDepth, this.scrollDepth);
        
        // Track milestone scroll depths
        const milestones = [25, 50, 75, 90, 100];
        milestones.forEach(milestone => {
            if (this.scrollDepth >= milestone && !this.hasTrackedScrollMilestone(milestone)) {
                this.trackEvent('scroll_milestone', {
                    depth: milestone,
                    timeOnPage: Date.now() - this.startTime
                });
            }
        });
    }
    
    hasTrackedScrollMilestone(milestone) {
        return this.interactions.some(interaction => 
            interaction.type === 'scroll_milestone' && 
            interaction.data.depth === milestone
        );
    }
    
    trackScrollPause() {
        const currentDepth = this.scrollDepth;
        this.trackEvent('scroll_pause', {
            depth: currentDepth,
            timestamp: Date.now()
        });
    }
    
    setupClickTracking() {
        document.addEventListener('click', (event) => {
            this.lastActivity = Date.now();
            
            const element = event.target;
            const elementInfo = this.getElementInfo(element);
            
            this.trackEvent('click', {
                element: elementInfo,
                coordinates: {
                    x: event.clientX,
                    y: event.clientY,
                    pageX: event.pageX,
                    pageY: event.pageY
                },
                timestamp: Date.now()
            });
            
            // Track specific UI element interactions
            if (element.closest('.portfolio-card')) {
                this.trackPortfolioInteraction(element, 'click');
            } else if (element.closest('#map')) {
                this.trackMapClick(event);
            } else if (element.closest('.search-container')) {
                this.trackSearchInteraction(element, 'click');
            }
        });
        
        // Track right clicks (context menu)
        document.addEventListener('contextmenu', (event) => {
            this.trackEvent('right_click', {
                element: this.getElementInfo(event.target),
                coordinates: { x: event.clientX, y: event.clientY }
            });
        });
    }
    
    getElementInfo(element) {
        return {
            tagName: element.tagName,
            id: element.id || null,
            className: element.className || null,
            text: element.textContent ? element.textContent.substring(0, 50) : null,
            href: element.href || null,
            type: element.type || null
        };
    }
    
    setupTimeOnPage() {
        // Track time on page in intervals
        setInterval(() => {
            if (this.isActive) {
                this.trackEvent('time_checkpoint', {
                    timeOnPage: Date.now() - this.startTime,
                    scrollDepth: this.scrollDepth
                });
            }
        }, 30000); // Every 30 seconds
        
        // Track page unload
        window.addEventListener('beforeunload', () => {
            this.trackSessionEnd();
        });
        
        // Track page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.trackEvent('page_hidden', { 
                    timeOnPage: Date.now() - this.startTime 
                });
            } else {
                this.trackEvent('page_visible', { 
                    timeOnPage: Date.now() - this.startTime 
                });
            }
        });
    }
    
    setupVisibilityTracking() {
        // Intersection Observer for element visibility
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.trackEvent('element_visible', {
                            element: this.getElementInfo(entry.target),
                            visibilityRatio: entry.intersectionRatio
                        });
                    }
                });
            }, { threshold: [0.5, 1.0] });
            
            // Observe key elements
            document.querySelectorAll('.portfolio-card, .search-result, .map-popup').forEach(el => {
                observer.observe(el);
            });
        }
    }
    
    setupFormInteractions() {
        // Track form field interactions
        document.addEventListener('focus', (event) => {
            if (event.target.matches('input, textarea, select')) {
                this.trackEvent('form_field_focus', {
                    field: this.getElementInfo(event.target),
                    timestamp: Date.now()
                });
            }
        }, true);
        
        document.addEventListener('blur', (event) => {
            if (event.target.matches('input, textarea, select')) {
                this.trackEvent('form_field_blur', {
                    field: this.getElementInfo(event.target),
                    value: event.target.value ? 'has_value' : 'empty',
                    timestamp: Date.now()
                });
            }
        }, true);
        
        // Track form submissions
        document.addEventListener('submit', (event) => {
            this.trackEvent('form_submit', {
                form: this.getElementInfo(event.target),
                timestamp: Date.now()
            });
        });
    }
    
    setupSearchBehavior() {
        // Track search queries and results
        const originalSearch = window.searchProperties;
        if (originalSearch) {
            window.searchProperties = (...args) => {
                const query = args[0];
                this.trackEvent('search_query', {
                    query: query,
                    queryLength: query.length,
                    timestamp: Date.now()
                });
                
                // Call original function and track results
                const result = originalSearch.apply(this, args);
                
                // Track search results (assuming it returns a promise or array)
                if (result && typeof result.then === 'function') {
                    result.then(results => {
                        this.trackEvent('search_results', {
                            query: query,
                            resultCount: results ? results.length : 0,
                            timestamp: Date.now()
                        });
                    });
                } else if (Array.isArray(result)) {
                    this.trackEvent('search_results', {
                        query: query,
                        resultCount: result.length,
                        timestamp: Date.now()
                    });
                }
                
                return result;
            };
        }
    }
    
    setupMapInteractions() {
        // Track map interactions if Leaflet map exists
        if (window.map) {
            window.map.on('zoomend', () => {
                this.trackEvent('map_zoom', {
                    zoom: window.map.getZoom(),
                    timestamp: Date.now()
                });
            });
            
            window.map.on('moveend', () => {
                const now = Date.now();
                if (now - this.lastMapMoveTracked < 1000) return;
                this.lastMapMoveTracked = now;
                const center = window.map.getCenter();
                this.trackEvent('map_move', {
                    center: { lat: center.lat, lng: center.lng },
                    zoom: window.map.getZoom(),
                    timestamp: Date.now()
                });
            });
            
            window.map.on('click', (event) => {
                this.trackEvent('map_click', {
                    coordinates: { lat: event.latlng.lat, lng: event.latlng.lng },
                    timestamp: Date.now()
                });
            });
        }
    }
    
    setupHeatmapTracking() {
        // Track mouse movements for heatmap (throttled)
        let mouseTrackingTimeout;
        document.addEventListener('mousemove', (event) => {
            clearTimeout(mouseTrackingTimeout);
            mouseTrackingTimeout = setTimeout(() => {
                this.heatmapData.push({
                    x: event.clientX,
                    y: event.clientY,
                    timestamp: Date.now()
                });
                
                // Keep only recent data (last 1000 points)
                if (this.heatmapData.length > 1000) {
                    this.heatmapData = this.heatmapData.slice(-1000);
                }
            }, 100); // Throttle to 10 times per second
        });
    }
    
    setupPerformanceCorrelation() {
        // Correlate user behavior with performance metrics
        if (window.advancedPerformanceMonitor) {
            // Track user actions during performance issues
            const originalReportMetric = window.advancedPerformanceMonitor.reportMetric;
            window.advancedPerformanceMonitor.reportMetric = (name, value) => {
                originalReportMetric.call(window.advancedPerformanceMonitor, name, value);
                
                // If performance is poor, log recent user actions
                const thresholds = {
                    'LCP': 4000,
                    'FID': 300,
                    'Long_Task': 100
                };
                
                if (thresholds[name] && value > thresholds[name]) {
                    this.trackEvent('performance_impact', {
                        metric: name,
                        value: value,
                        recentActions: this.getRecentActions(5000) // Last 5 seconds
                    });
                }
            };
        }
    }
    
    trackEvent(type, data) {
        if (Math.random() > this.sampleRate) {
            return;
        }
        const event = {
            type: type,
            data: data,
            timestamp: Date.now(),
            sessionId: this.sessionId,
            url: window.location.href,
            userAgent: navigator.userAgent,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            }
        };
        
        this.interactions.push(event);
        
        // Send to analytics
        if (window.trackUserBehavior) {
            window.trackUserBehavior(type, data);
        }
        
        console.log('👤 User Event:', type, data);
        
        // Keep only recent interactions (last 500)
        if (this.interactions.length > 500) {
            this.interactions = this.interactions.slice(-500);
        }
        
        // Store in localStorage for analysis
        this.storeInteraction(event);
    }
    
    trackPortfolioInteraction(element, action) {
        const portfolioCard = element.closest('.portfolio-card');
        if (portfolioCard) {
            this.trackEvent('portfolio_interaction', {
                action: action,
                portfolioId: portfolioCard.dataset.id || null,
                timestamp: Date.now()
            });
        }
    }
    
    trackMapClick(event) {
        this.trackEvent('map_interaction', {
            action: 'click',
            coordinates: { x: event.clientX, y: event.clientY },
            timestamp: Date.now()
        });
    }
    
    trackSearchInteraction(element, action) {
        this.trackEvent('search_interaction', {
            action: action,
            element: this.getElementInfo(element),
            timestamp: Date.now()
        });
    }
    
    getRecentActions(timeWindow) {
        const cutoff = Date.now() - timeWindow;
        return this.interactions
            .filter(interaction => interaction.timestamp > cutoff)
            .map(interaction => ({
                type: interaction.type,
                timestamp: interaction.timestamp
            }));
    }
    
    storeInteraction(event) {
        try {
            const stored = localStorage.getItem('xemgiadat_user_behavior') || '[]';
            const behaviors = JSON.parse(stored);
            
            behaviors.push(event);
            
            // Keep only last 1000 interactions
            if (behaviors.length > 1000) {
                behaviors.splice(0, behaviors.length - 1000);
            }
            
            localStorage.setItem('xemgiadat_user_behavior', JSON.stringify(behaviors));
        } catch (error) {
            console.error('Error storing user behavior:', error);
        }
    }
    
    trackSessionEnd() {
        const sessionData = {
            sessionId: this.sessionId,
            duration: Date.now() - this.startTime,
            maxScrollDepth: this.maxScrollDepth,
            totalInteractions: this.interactions.length,
            pageViews: this.pageViews.length,
            endReason: 'page_unload'
        };
        
        this.trackEvent('session_end', sessionData);
        
        // Send session summary to analytics
        if (window.trackSessionSummary) {
            window.trackSessionSummary(sessionData);
        }
    }
    
    // Public API for behavior analytics
    getBehaviorSummary() {
        const now = Date.now();
        const sessionDuration = now - this.startTime;
        
        return {
            sessionId: this.sessionId,
            sessionDuration: sessionDuration,
            maxScrollDepth: this.maxScrollDepth,
            totalInteractions: this.interactions.length,
            interactionTypes: this.groupInteractionsByType(),
            averageTimePerInteraction: sessionDuration / this.interactions.length,
            isActiveSession: this.isActive,
            lastActivity: this.lastActivity,
            heatmapPoints: this.heatmapData.length
        };
    }
    
    groupInteractionsByType() {
        const grouped = {};
        this.interactions.forEach(interaction => {
            grouped[interaction.type] = (grouped[interaction.type] || 0) + 1;
        });
        return grouped;
    }
    
    getHeatmapData() {
        return this.heatmapData.map(point => ({
            x: point.x,
            y: point.y,
            intensity: 1
        }));
    }
    
    getEngagementScore() {
        const factors = {
            timeOnSite: Math.min((Date.now() - this.startTime) / 60000, 10), // Max 10 minutes
            scrollDepth: this.maxScrollDepth / 100,
            interactions: Math.min(this.interactions.length / 50, 1), // Max 50 interactions
            uniqueInteractionTypes: Object.keys(this.groupInteractionsByType()).length / 10
        };
        
        const score = (factors.timeOnSite * 0.3 + 
                      factors.scrollDepth * 0.2 + 
                      factors.interactions * 0.3 + 
                      factors.uniqueInteractionTypes * 0.2) * 100;
        
        return Math.round(Math.min(score, 100));
    }
}

// Initialize User Behavior Tracker - DEFERRED to reduce TBT
let userBehaviorTracker;
document.addEventListener('DOMContentLoaded', function() {
    if (window.__XGD_BOOT__ && window.__XGD_BOOT__.booted) {
        if (DEBUG_MODE) console.log('[SKIP] userBehaviorTracker init (secondary listener)');
        return;
    }
    // Defer tracker initialization to after page becomes interactive
    // This significantly reduces Total Blocking Time (TBT)
    setTimeout(() => {
        userBehaviorTracker = new UserBehaviorTracker();
        
        // Make it available globally for debugging
        window.userBehaviorTracker = userBehaviorTracker;
        
        // Add dashboard commands
        window.getBehaviorSummary = () => userBehaviorTracker.getBehaviorSummary();
        window.getHeatmapData = () => userBehaviorTracker.getHeatmapData();
        window.getEngagementScore = () => userBehaviorTracker.getEngagementScore();
    }, 3000); // Defer by 3 seconds
    
    // Newsletter form functionality
    const newsletterForm = document.getElementById('newsletterForm');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const emailInput = document.getElementById('emailInput');
            const email = emailInput.value.trim();
            
            if (email) {
                // Store newsletter subscription
                let newsletters = JSON.parse(localStorage.getItem('newsletters') || '[]');
                
                if (!newsletters.includes(email)) {
                    newsletters.push(email);
                    localStorage.setItem('newsletters', JSON.stringify(newsletters));
                    
                    // Show success message
                    const button = this.querySelector('button[type="submit"]');
                    const originalText = button.innerHTML;
                    
                    button.innerHTML = '<i class="fas fa-check mr-2"></i>Đã Đăng Ký!';
                    button.style.backgroundColor = '#10b981';
                    
                    setTimeout(() => {
                        button.innerHTML = originalText;
                        button.style.backgroundColor = '';
                        emailInput.value = '';
                    }, 3000);
                    
                    // Track newsletter signup
                    if (userBehaviorTracker) {
                        userBehaviorTracker.trackInteraction('newsletter_signup', 'lead_generation', {
                            email: email.substring(0, 3) + '***', // Privacy-safe logging
                            location: 'homepage'
                        });
                    }
                    
                    // Analytics event
                    if (typeof gtag !== 'undefined') {
                        gtag('event', 'newsletter_signup', {
                            event_category: 'engagement',
                            event_label: 'homepage'
                        });
                    }
                    
                    // Show additional thank you message
                    const thankYouDiv = document.createElement('div');
                    thankYouDiv.className = 'mt-4 p-3 bg-green-100 border border-green-300 rounded-lg text-green-800 text-sm';
                    thankYouDiv.innerHTML = '<i class="fas fa-check-circle mr-2"></i>Cảm ơn bạn! Chúng tôi sẽ gửi báo cáo thị trường mới nhất trong vòng 24h.';
                    this.appendChild(thankYouDiv);
                    
                    setTimeout(() => {
                        if (thankYouDiv.parentNode) {
                            thankYouDiv.parentNode.removeChild(thankYouDiv);
                        }
                    }, 5000);
                    
                } else {
                    alert('Email này đã được đăng ký trước đó!');
                }
            }
        });
    }
    
    // Track CTA button clicks
    const ctaButtons = document.querySelectorAll('a[href^="tel:"], a[href^="mailto:"], a[href*="chat"], a[href*="zalo"]');
    ctaButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            let actionType = 'cta_click';
            
            if (href.startsWith('tel:')) {
                actionType = 'phone_call';
            } else if (href.startsWith('mailto:')) {
                actionType = 'email_click';
            } else if (href.includes('chat') || href.includes('zalo')) {
                actionType = 'chat_click';
            }
            
            if (userBehaviorTracker) {
                userBehaviorTracker.trackInteraction(actionType, 'lead_generation', {
                    button_text: this.textContent.trim(),
                    href: href
                });
            }
        });
    });
});

// =============================================================================
// 🚀 BETA SIGNUP FUNCTIONALITY - REAL IMPLEMENTATION
// =============================================================================

// Beta signup form management
const initBetaSignup = () => {
    const betaBtn = document.getElementById('beta-signup-btn');
    const betaModal = document.getElementById('beta-signup-modal');
    const betaClose = document.getElementById('beta-signup-close');
    const betaForm = document.getElementById('beta-signup-form');
    const submitBtn = document.getElementById('beta-submit-btn');
    const successMessage = document.getElementById('beta-success-message');

    // Open modal
    betaBtn?.addEventListener('click', () => {
        betaModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        // Analytics tracking
        if (typeof gtag !== 'undefined') {
            gtag('event', 'beta_signup_modal_open', {
                event_category: 'beta_engagement',
                event_label: 'modal_opened'
            });
        }
    });

    // Close modal
    const closeModal = () => {
        betaModal.classList.add('hidden');
        document.body.style.overflow = '';
        betaForm.reset();
        successMessage.classList.add('hidden');
        betaForm.classList.remove('hidden');
    };

    betaClose?.addEventListener('click', closeModal);
    betaModal?.addEventListener('click', (e) => {
        if (e.target === betaModal) closeModal();
    });

    // Handle form submission
    betaForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            name: document.getElementById('beta-name').value,
            email: document.getElementById('beta-email').value,
            phone: document.getElementById('beta-phone').value,
            userType: document.getElementById('beta-type').value,
            expectations: document.getElementById('beta-expectations').value,
            timestamp: new Date().toISOString(),
            source: 'website_modal'
        };

        // Validate required fields
        if (!formData.name || !formData.email || !formData.userType) {
            alert('Vui lòng điền đầy đủ thông tin bắt buộc!');
            return;
        }

        // Show loading state
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Đang xử lý...';

        try {
            // Save to Firebase Firestore
            if (typeof db !== 'undefined') {
                await db.collection('betaSignups').add(formData);
                
                // Analytics tracking
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'beta_signup_success', {
                        event_category: 'beta_engagement',
                        event_label: formData.userType,
                        value: 1
                    });
                }

                // Show success message
                betaForm.classList.add('hidden');
                successMessage.classList.remove('hidden');
                
                // Auto close after 3 seconds
                setTimeout(() => {
                    closeModal();
                }, 3000);

                console.log('✅ Beta signup saved successfully');
            } else {
                // Fallback: Save to localStorage for testing
                const existingSignups = JSON.parse(localStorage.getItem('betaSignups') || '[]');
                existingSignups.push(formData);
                localStorage.setItem('betaSignups', JSON.stringify(existingSignups));
                
                console.log('📝 Beta signup saved to localStorage (Firebase not available)');
                
                // Show success message
                betaForm.classList.add('hidden');
                successMessage.classList.remove('hidden');
                
                setTimeout(() => {
                    closeModal();
                }, 3000);
            }
        } catch (error) {
            console.error('❌ Beta signup error:', error);
            alert('Có lỗi xảy ra. Vui lòng thử lại sau!');
        } finally {
            // Reset button state
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-rocket mr-2"></i>Đăng ký Beta Testing';
        }
    });
};

// Admin function to view beta signups
const viewBetaSignups = async () => {
    try {
        if (typeof db !== 'undefined') {
            const snapshot = await db.collection('betaSignups').orderBy('timestamp', 'desc').get();
            const signups = [];
            snapshot.forEach(doc => {
                signups.push({ id: doc.id, ...doc.data() });
            });
            console.table(signups);
            return signups;
        } else {
            // Fallback: Read from localStorage
            const signups = JSON.parse(localStorage.getItem('betaSignups') || '[]');
            console.table(signups);
            return signups;
        }
    } catch (error) {
        console.error('❌ Error fetching beta signups:', error);
        return [];
    }
};

// Initialize beta signup when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        if (window.__XGD_BOOT__ && window.__XGD_BOOT__.booted) {
            if (DEBUG_MODE) console.log('[SKIP] initBetaSignup (secondary listener)');
            return;
        }
        initBetaSignup();
    });
} else {
    initBetaSignup();
}

// Export for admin access
window.viewBetaSignups = viewBetaSignups;

// =============================================================================
// 🔧 DEBUGGING HELPER FUNCTIONS FOR ĐĂNG TIN (only in DEBUG_MODE)
// =============================================================================
if (typeof DEBUG_MODE !== 'undefined' && DEBUG_MODE) {
    // Debug function for checking đăng tin system
    window.debugDangTin = function() {
        console.log('🔍 ĐĂNG TIN SYSTEM DEBUG REPORT:');
    console.log('=====================================');
    
    console.log('🔐 AUTHENTICATION STATUS:');
    console.log('├── currentUser:', currentUser ? {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName,
        photoURL: currentUser.photoURL
    } : '❌ NULL');
    console.log('├── auth.currentUser:', auth.currentUser ? {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email
    } : '❌ NULL');
    console.log('└── Login status:', currentUser && auth.currentUser ? '✅ LOGGED IN' : '❌ NOT LOGGED IN');
    
    console.log('\n🔥 FIREBASE CONNECTION:');
    console.log('├── Firebase app:', !!firebase.app() ? '✅ Connected' : '❌ Not connected');
    console.log('├── Firestore db:', !!db ? '✅ Available' : '❌ Not available');
    console.log('├── Auth service:', !!auth ? '✅ Available' : '❌ Not available');
    console.log('└── Firebase config:', !!firebase.app().options ? '✅ Configured' : '❌ Not configured');
    
    console.log('\n📝 FORM ELEMENTS:');
    const form = document.getElementById('location-form');
    const submitBtn = document.getElementById('submit-form-btn');
    const addLocationBtn = document.getElementById('add-location-btn');
    console.log('├── location-form:', !!form ? '✅ Found' : '❌ Missing');
    console.log('├── submit-form-btn:', !!submitBtn ? '✅ Found' : '❌ Missing');
    console.log('├── add-location-btn:', !!addLocationBtn ? '✅ Found' : '❌ Missing');
    console.log('└── selectedCoords:', selectedCoords || '❌ No coordinates selected');
    
    console.log('\n🌐 NETWORK & PERMISSIONS:');
    console.log('├── Online status:', navigator.onLine ? '✅ Online' : '❌ Offline');
    console.log('├── Local storage:', typeof Storage !== 'undefined' ? '✅ Available' : '❌ Not available');
    console.log('└── Console errors:', 'Check above for any red error messages');
    
    console.log('\n🧪 TESTING WRITE PERMISSION:');
    if (db && currentUser) {
        db.collection('test').add({
            testMessage: 'Debug test from debugDangTin()',
            timestamp: new Date(),
            userId: currentUser.uid
        }).then(docRef => {
            console.log('✅ Write permission test SUCCESS! Doc ID:', docRef.id);
            // Clean up test document
            docRef.delete();
        }).catch(error => {
            console.error('❌ Write permission test FAILED:', error);
        });
    } else {
        console.log('❌ Cannot test write permission - missing db or user');
    }
    
    console.log('\n📋 RECOMMENDATIONS:');
    if (!currentUser) {
        console.log('🔴 CRITICAL: Please login first!');
        console.log('   → Click "Đăng nhập" button in top-right corner');
    }
    if (!selectedCoords) {
        console.log('🟡 WARNING: No map location selected');
        console.log('   → Click on the map to select a location first');
    }
    if (currentUser && db) {
        console.log('🟢 READY: All systems operational for posting!');
    }
    
    console.log('\n=====================================');
    return {
        authenticated: !!currentUser && !!auth.currentUser,
        firebase: !!db && !!auth,
        formReady: !!form && !!submitBtn,
        locationSelected: !!selectedCoords,
        overall: !!currentUser && !!db && !!form && !!selectedCoords
    };
};

// Quick test function for posting
window.testDangTin = function() {
    console.log('🧪 TESTING ĐĂNG TIN FUNCTIONALITY...');
    
    if (!currentUser) {
        console.error('❌ Cannot test - please login first!');
        return false;
    }
    
    if (!db) {
        console.error('❌ Cannot test - Firebase not connected!');
        return false;
    }
    
    const testData = {
        userId: currentUser.uid,
        userName: currentUser.displayName || 'Test User',
        userAvatar: currentUser.photoURL || '',
        lat: 16.047079,
        lng: 108.206230,
        priceValue: 1000000,
        area: 100,
        status: 'approved',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        name: 'TEST PROPERTY - ' + new Date().toLocaleTimeString(),
        priceUnit: 'VNĐ',
        notes: 'Test listing created by debugger',
        contactName: 'Test Contact',
        contactEmail: 'test@example.com',
        contactPhone: '0123456789',
        contactFacebook: ''
    };
    
    console.log('📤 Attempting to post test listing...');
    
    return db.collection("listings").add(testData)
        .then(docRef => {
            console.log('✅ TEST SUCCESS! Document written with ID:', docRef.id);
            console.log('🎉 Đăng tin functionality is working properly!');
            
            // Clean up test document after 5 seconds
            setTimeout(() => {
                docRef.delete().then(() => {
                    console.log('🧹 Test document cleaned up');
                });
            }, 5000);
            
            return true;
        })
        .catch(error => {
            console.error('❌ TEST FAILED:', error);
            return false;
        });
    };

    // Console helper instructions (only in debug mode)
    console.log('🔧 ĐĂNG TIN DEBUG HELPERS LOADED!');
    console.log('📋 Commands: debugDangTin(), testDangTin(), viewBetaSignups()');
} // End DEBUG_MODE block


// showCopyError uses the global showToast defined above
function showCopyError(button) {
    showToast('Không thể sao chép. Vui lòng copy thủ công!', 'error', 3000);
}

// =============================================================================
// 📱 MOBILE UX ENHANCEMENTS - Bottom Sheet & Haptic Feedback
// =============================================================================

/**
 * Haptic Feedback - Simple vibration for touch interactions
 * Works on most modern mobile browsers
 */
function triggerHaptic(duration = 10) {
    if (navigator.vibrate) {
        navigator.vibrate(duration);
    }
}

/**
 * Bottom Sheet Swipe Gesture Handler
 * Allows users to drag info panel up/down
 */
(function initBottomSheet() {
    const panel = document.getElementById('info-panel');
    if (!panel) return;
    
    const dragHandle = panel.querySelector('.drag-handle');
    if (!dragHandle) return;
    
    let startY = 0;
    let currentY = 0;
    let isDragging = false;
    let panelHeight = 0;
    
    dragHandle.addEventListener('touchstart', (e) => {
        isDragging = true;
        startY = e.touches[0].clientY;
        panelHeight = panel.offsetHeight;
        panel.style.transition = 'none';
        triggerHaptic(5);
    }, { passive: true });
    
    dragHandle.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        
        currentY = e.touches[0].clientY;
        const deltaY = currentY - startY;
        
        // Only allow dragging down (positive deltaY)
        if (deltaY > 0) {
            const newTransform = `translateY(${deltaY}px)`;
            panel.style.transform = newTransform;
        }
    }, { passive: true });
    
    dragHandle.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        
        isDragging = false;
        panel.style.transition = '';
        
        const deltaY = currentY - startY;
        
        // If dragged down more than 100px, close panel
        if (deltaY > 100) {
            hideInfoPanel();
            triggerHaptic(15);
        } else {
            // Snap back to original position
            panel.style.transform = 'translateY(0)';
        }
    });
})();

/**
 * Map Controls Group - Zoom & Locate buttons
 */
(function initMapControls() {
    // Zoom in
    const zoomInBtn = document.getElementById('zoom-in-btn');
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            map.zoomIn();
            triggerHaptic(10);
        });
    }
    
    // Zoom out
    const zoomOutBtn = document.getElementById('zoom-out-btn');
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            map.zoomOut();
            triggerHaptic(10);
        });
    }
    
    // Locate button in control group
    const locateControlBtn = document.getElementById('locate-control-btn');
    if (locateControlBtn) {
        locateControlBtn.addEventListener('click', () => {
            triggerHaptic(15);
            // Use existing locate function
            if (typeof locateUser === 'function') {
                locateUser();
            } else {
                // Fallback: try to get current position
                if (navigator.geolocation) {
                    locateControlBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            const { latitude, longitude } = position.coords;
                            map.setView([latitude, longitude], 17);
                            L.marker([latitude, longitude])
                                .addTo(map)
                                .bindPopup('Vị trí của bạn')
                                .openPopup();
                            locateControlBtn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i>';
                            showToast('✅ Đã tìm thấy vị trí của bạn', 'success', 2000);
                        },
                        (error) => {
                            locateControlBtn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i>';
                            showToast('❌ Không thể xác định vị trí', 'error', 3000);
                        }
                    );
                }
            }
        });
    }
    
    // Layers button - Toggle custom layer panel
    const layersBtn = document.getElementById('layers-btn');
    const layerPanel = document.getElementById('layer-panel');
    const closeLayerPanel = document.getElementById('close-layer-panel');
    
    if (layersBtn && layerPanel) {
        layersBtn.addEventListener('click', () => {
            triggerHaptic(10);
            layerPanel.classList.toggle('hidden');
            layersBtn.classList.toggle('active');
            
            // Initialize layer panel if not done yet
            if (!window._layerPanelInitialized) {
                initLayerPanel();
                window._layerPanelInitialized = true;
            }
        });
        
        if (closeLayerPanel) {
            closeLayerPanel.addEventListener('click', () => {
                layerPanel.classList.add('hidden');
                layersBtn.classList.remove('active');
                triggerHaptic(10);
            });
        }
    }
})();

/**
 * Initialize Custom Layer Panel
 */
function initLayerPanel() {
    const baseLayersList = document.getElementById('base-layers-list');
    const overlayLayersList = document.getElementById('overlay-layers-list');
    
    if (!baseLayersList || !overlayLayersList) return;
    
    // Populate base maps
    if (window._baseMaps) {
        baseLayersList.innerHTML = '';
        Object.keys(window._baseMaps).forEach(name => {
            const layer = window._baseMaps[name];
            const isActive = window._currentBaseLayer === name;
            
            const item = document.createElement('div');
            item.className = `layer-item ${isActive ? 'active' : ''}`;
            item.innerHTML = `
                <input type="radio" name="base-layer" value="${name}" ${isActive ? 'checked' : ''} id="base-${name}">
                <label for="base-${name}">${name}</label>
            `;
            
            item.addEventListener('click', () => {
                // Remove old base layer
                Object.values(window._baseMaps).forEach(l => {
                    if (map.hasLayer(l)) map.removeLayer(l);
                });
                
                // Add new base layer
                layer.addTo(map);
                window._currentBaseLayer = name;
                
                // Update UI
                document.querySelectorAll('.layer-item input[name="base-layer"]').forEach(input => {
                    input.parentElement.classList.toggle('active', input.value === name);
                });
                
                triggerHaptic(10);
            });
            
            baseLayersList.appendChild(item);
        });
    }
    
    // Populate overlay maps
    if (window._overlayMaps) {
        overlayLayersList.innerHTML = '';
        Object.keys(window._overlayMaps).forEach(name => {
            const layer = window._overlayMaps[name];
            const isActive = map.hasLayer(layer);
            
            const item = document.createElement('div');
            item.className = `layer-item ${isActive ? 'active' : ''}`;
            item.innerHTML = `
                <input type="checkbox" value="${name}" ${isActive ? 'checked' : ''} id="overlay-${name}">
                <label for="overlay-${name}">${name}</label>
            `;
            
            item.addEventListener('click', () => {
                const checkbox = item.querySelector('input');
                const isChecked = !checkbox.checked;
                checkbox.checked = isChecked;
                
                if (isChecked) {
                    if (!map.hasLayer(layer)) layer.addTo(map);
                    item.classList.add('active');
                } else {
                    if (map.hasLayer(layer)) map.removeLayer(layer);
                    item.classList.remove('active');
                }
                
                triggerHaptic(10);
            });
            
            overlayLayersList.appendChild(item);
        });
    }
}

/**
 * Add haptic feedback to all toolbar buttons
 */
(function addHapticToToolbar() {
    const toolbarButtons = document.querySelectorAll('#action-toolbar button, .toolbar-btn-compact');
    toolbarButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            triggerHaptic(10);
        });
    });
})();

/**
 * Keyboard Visibility Handler
 * Adjust map view when keyboard appears on mobile
 */
(function handleKeyboardVisibility() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;
    
    // Store original map center
    let originalCenter = null;
    
    searchInput.addEventListener('focus', () => {
        // Save current center
        originalCenter = map.getCenter();
        
        // On small screens, pan map up slightly
        if (window.innerHeight < 700) {
            setTimeout(() => {
                const currentCenter = map.getCenter();
                map.panBy([0, -100]); // Pan up 100px
            }, 300);
        }
    });
    
    searchInput.addEventListener('blur', () => {
        // Restore original center when keyboard closes
        if (originalCenter) {
            setTimeout(() => {
                map.panTo(originalCenter);
                originalCenter = null;
            }, 100);
        }
    });
})();

console.log('✅ Mobile UX enhancements loaded: Bottom sheet swipe, Haptic feedback, Control group');