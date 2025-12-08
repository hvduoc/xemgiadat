/**
 * XemGiaDat - Open Source Edition
 * Vietnamese Real Estate Platform - 100% Open Source Stack
 * 
 * Stack:
 * - MapLibre GL JS (Map rendering)
 * - PMTiles (Vector tiles)
 * - Nominatim/Photon (Geocoding)
 * - Firebase (Backend - unchanged)
 * - Turf.js (Spatial operations)
 */

import maplibregl from 'maplibre-gl';
import { 
    initMap, 
    addParcelLayer, 
    switchBaseMap, 
    setupParcelInteractions,
    createParcelPopup 
} from './map/MapLibreConfig.js';
import { geocoder } from './services/GeocodingService.js';
import ParcelQueryService from './services/ParcelQueryService.js';

// =============================================================================
// FIREBASE CONFIGURATION (Unchanged)
// =============================================================================

const firebaseConfig = {
    apiKey: "AIzaSyDu9tYpJdMPT7Hvk2_Ug8XHwxRQXoakRfs",
    authDomain: "xemgiadat-dfe15.firebaseapp.com",
    projectId: "xemgiadat-dfe15",
    storageBucket: "xemgiadat-dfe15.appspot.com",
    messagingSenderId: "361952598367",
    appId: "1:361952598367:web:c1e2e3b1a6d5d8c797beea",
    measurementId: "G-XT932D9N1N"
};

// Initialize Firebase
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    window.auth = firebase.auth();
    window.db = firebase.firestore();
    window.storage = firebase.storage();
    console.log('✅ Firebase initialized');
}

// =============================================================================
// MAP INITIALIZATION
// =============================================================================

console.log('🚀 Initializing XemGiaDat Open Source Edition...');

// Initialize map
const map = initMap('map', {
    center: [108.202167, 16.054456], // Đà Nẵng
    zoom: 13
});

// Add parcel layer from PMTiles
// TODO: Replace with your actual PMTiles URL
const PMTILES_URL = 'https://cdn.xemgiadat.com/danang-parcels.pmtiles';
// For testing, you can use a local file: '/tiles/danang-parcels.pmtiles'

addParcelLayer(map, PMTILES_URL);

// Setup hover interactions
setupParcelInteractions(map);

// Initialize parcel query service
let parcelQuery;
map.on('load', () => {
    parcelQuery = new ParcelQueryService(map);
    console.log('✅ Parcel query service initialized');
});

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

const state = {
    currentBaseMap: 'osm',
    selectedParcel: null,
    searchResults: [],
    activePopup: null
};

// =============================================================================
// DOM ELEMENTS
// =============================================================================

const elements = {
    searchInput: document.getElementById('search-input'),
    searchResults: document.getElementById('search-results'),
    searchSpinner: document.getElementById('search-spinner'),
    baseMapToggle: document.getElementById('base-map-toggle'),
    infoPanel: document.getElementById('info-panel'),
    panelContent: document.getElementById('panel-content'),
    closePanelBtn: document.getElementById('close-panel-btn')
};

// =============================================================================
// SEARCH FUNCTIONALITY (Open Source Geocoding)
// =============================================================================

let searchTimeout;

if (elements.searchInput) {
    elements.searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();

        // Clear previous timeout
        clearTimeout(searchTimeout);

        if (query.length < 2) {
            hideSearchResults();
            return;
        }

        // Show spinner
        if (elements.searchSpinner) {
            elements.searchSpinner.classList.remove('hidden');
        }

        // Debounce search (400ms)
        searchTimeout = setTimeout(async () => {
            try {
                // Check if it's a Thửa/Tờ format (e.g., "123/45")
                if (/^\d+\/\d+$/.test(query)) {
                    await searchByThuaToBanDo(query);
                } else {
                    await searchByAddress(query);
                }
            } catch (error) {
                console.error('❌ Search error:', error);
                showSearchError('Lỗi tìm kiếm. Vui lòng thử lại.');
            } finally {
                if (elements.searchSpinner) {
                    elements.searchSpinner.classList.add('hidden');
                }
            }
        }, 400);
    });
}

/**
 * Search by address using open source geocoding
 */
async function searchByAddress(query) {
    console.log('🔍 Searching address:', query);

    const results = await geocoder.search(query, {
        limit: 10,
        proximity: {
            lat: map.getCenter().lat,
            lng: map.getCenter().lng
        },
        language: 'vi'
    });

    state.searchResults = results;
    renderSearchResults(results);
}

/**
 * Search by Thửa/Tờ format
 */
async function searchByThuaToBanDo(thuaToBanDo) {
    console.log('🔍 Searching Thửa/Tờ:', thuaToBanDo);

    if (!parcelQuery) {
        console.warn('⚠️ Parcel query service not ready');
        return;
    }

    const parcels = parcelQuery.queryByThuaToBanDo(thuaToBanDo);

    if (parcels.length === 0) {
        showSearchError(`Không tìm thấy thửa ${thuaToBanDo}`);
        return;
    }

    // Convert to search result format
    const results = parcels.map(p => ({
        place_name: `Thửa ${p.SoThuTuThua} - Tờ ${p.SoHieuToBanDo}`,
        text: `${p.SoThuTuThua}/${p.SoHieuToBanDo}`,
        properties: p,
        isParcel: true
    }));

    state.searchResults = results;
    renderSearchResults(results);
}

/**
 * Render search results
 */
function renderSearchResults(results) {
    if (!elements.searchResults) return;

    elements.searchResults.innerHTML = '';

    if (results.length === 0) {
        hideSearchResults();
        return;
    }

    elements.searchResults.classList.remove('hidden');

    results.forEach(result => {
        const li = document.createElement('li');
        li.className = 'px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-none transition-colors';
        
        li.innerHTML = `
            <div class="flex justify-between items-center">
                <div class="flex-1">
                    <div class="font-medium text-gray-800">${result.text || result.place_name}</div>
                    ${result.properties && result.properties.DienTich ? 
                        `<div class="text-xs text-gray-500 mt-1">Diện tích: ${result.properties.DienTich} m²</div>` : 
                        ''}
                </div>
                <i class="fa-solid fa-location-arrow text-gray-300 ml-2"></i>
            </div>
        `;

        li.onclick = () => selectSearchResult(result);
        elements.searchResults.appendChild(li);
    });
}

/**
 * Select search result and fly to location
 */
function selectSearchResult(result) {
    hideSearchResults();

    if (result.isParcel) {
        // Parcel result
        const parcel = result.properties;
        
        // Fly to parcel (you'll need to get coordinates from the parcel)
        // For now, just open info panel
        openParcelInfoPanel(parcel);
        
    } else {
        // Address result
        map.flyTo({
            center: result.center,
            zoom: 17,
            essential: true
        });

        // Show popup
        if (state.activePopup) {
            state.activePopup.remove();
        }

        state.activePopup = new maplibregl.Popup()
            .setLngLat(result.center)
            .setHTML(`<div class="font-bold p-2">${result.place_name}</div>`)
            .addTo(map);
    }

    // Update search input
    if (elements.searchInput) {
        elements.searchInput.value = result.text || result.place_name;
    }
}

/**
 * Hide search results
 */
function hideSearchResults() {
    if (elements.searchResults) {
        elements.searchResults.classList.add('hidden');
    }
}

/**
 * Show search error
 */
function showSearchError(message) {
    if (!elements.searchResults) return;

    elements.searchResults.innerHTML = `
        <li class="px-4 py-3 text-red-600 text-sm">
            <i class="fa-solid fa-exclamation-circle mr-2"></i>${message}
        </li>
    `;
    elements.searchResults.classList.remove('hidden');
}

// =============================================================================
// BASE MAP TOGGLE
// =============================================================================

if (elements.baseMapToggle) {
    elements.baseMapToggle.addEventListener('click', () => {
        // Cycle through: osm → maptiler-streets → maptiler-satellite → osm
        const mapTypes = ['osm', 'maptiler-streets', 'maptiler-satellite'];
        const currentIndex = mapTypes.indexOf(state.currentBaseMap);
        const nextIndex = (currentIndex + 1) % mapTypes.length;
        
        state.currentBaseMap = mapTypes[nextIndex];
        switchBaseMap(map, state.currentBaseMap);

        console.log(`🗺️ Switched to ${state.currentBaseMap}`);
    });
}

// =============================================================================
// PARCEL CLICK INTERACTIONS
// =============================================================================

map.on('click', 'parcels-fill', (e) => {
    if (e.features.length === 0) return;

    const feature = e.features[0];
    const properties = feature.properties;

    console.log('🎯 Clicked parcel:', properties);

    // Show popup
    if (state.activePopup) {
        state.activePopup.remove();
    }

    state.activePopup = new maplibregl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(createParcelPopup(properties))
        .addTo(map);

    // Open info panel
    openParcelInfoPanel(properties);

    // Select parcel
    if (parcelQuery && properties.OBJECTID) {
        parcelQuery.selectParcel(properties.OBJECTID);
        state.selectedParcel = properties;
    }
});

// =============================================================================
// INFO PANEL
// =============================================================================

/**
 * Open parcel information panel
 */
function openParcelInfoPanel(properties) {
    if (!elements.infoPanel || !elements.panelContent) return;

    elements.panelContent.innerHTML = `
        <div class="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100 shadow-sm">
            <div class="grid grid-cols-2 gap-4">
                <div class="bg-white p-4 rounded-lg shadow-sm">
                    <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Số tờ</label>
                    <div class="text-2xl font-bold text-gray-900 mt-1">${properties.SoHieuToBanDo || '?'}</div>
                </div>
                <div class="bg-white p-4 rounded-lg shadow-sm">
                    <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Số thửa</label>
                    <div class="text-2xl font-bold text-gray-900 mt-1">${properties.SoThuTuThua || '?'}</div>
                </div>
            </div>
        </div>

        <div class="space-y-3 mt-6">
            <div class="flex justify-between items-center border-b border-gray-100 pb-3">
                <span class="text-gray-600 font-medium">Diện tích</span>
                <span class="font-bold text-lg text-blue-600">${properties.DienTich || 0} m²</span>
            </div>
            <div class="flex justify-between items-center border-b border-gray-100 pb-3">
                <span class="text-gray-600 font-medium">Loại đất</span>
                <span class="font-semibold">${properties.KyHieuMucDichSuDung || 'ODT'}</span>
            </div>
            <div class="flex justify-between items-center border-b border-gray-100 pb-3">
                <span class="text-gray-600 font-medium">Mã xã</span>
                <span class="font-semibold">${properties.MaXa || '---'}</span>
            </div>
            <div class="flex justify-between items-center border-b border-gray-100 pb-3">
                <span class="text-gray-600 font-medium">OBJECTID</span>
                <span class="font-mono text-sm text-gray-500">${properties.OBJECTID || '---'}</span>
            </div>
        </div>

        <div class="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div class="flex items-start">
                <i class="fa-solid fa-info-circle text-yellow-600 mt-1 mr-3"></i>
                <div class="text-sm text-yellow-800">
                    <strong>Open Source Edition</strong><br>
                    Dữ liệu từ PMTiles - 100% mã nguồn mở
                </div>
            </div>
        </div>
    `;

    elements.infoPanel.classList.add('open');
}

/**
 * Close info panel
 */
if (elements.closePanelBtn) {
    elements.closePanelBtn.addEventListener('click', () => {
        if (elements.infoPanel) {
            elements.infoPanel.classList.remove('open');
        }

        // Clear selection
        if (parcelQuery) {
            parcelQuery.clearSelection();
        }
        state.selectedParcel = null;
    });
}

// =============================================================================
// GLOBAL EXPORTS
// =============================================================================

window.xemGiaDat = {
    map,
    geocoder,
    parcelQuery,
    state,
    // Expose for debugging
    searchByAddress,
    searchByThuaToBanDo,
    openParcelInfoPanel
};

console.log('✅ XemGiaDat Open Source Edition initialized!');
console.log('💡 Use window.xemGiaDat to access API');
