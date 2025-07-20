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

// --- SERVICE INITIALIZATION ---
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- STATE & GLOBAL VARIABLES ---
let isPrimaryServerAvailable = false; 
let esriParcelLayer; 
let parcelLayer; 
let priceMarkers; 

let currentUser = null;
let tempMarker = null;
let selectedCoords = null;
let isAddMode = false;
let isQueryMode = false;
let localListings = [];
let debounceTimer;
let dimensionMarkers; 
let userLocationMarker = null;


// --- HELPER FUNCTIONS ---
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

document.addEventListener('DOMContentLoaded', () => {

    // --- MAP AND LAYERS INITIALIZATION ---
    const map = L.map('map', { center: [16.054456, 108.202167], zoom: 13, zoomControl: false });
    window.map = map; 

    const myAttribution = '© XemGiaDat | Dữ liệu © Sở TNMT Đà Nẵng';
    const googleStreets = L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',{ maxZoom: 20, subdomains:['mt0','mt1','mt2','mt3'], attribution: myAttribution + ' | © Google Maps' });
    const googleSat = L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',{ maxZoom: 20, subdomains:['mt0','mt1','mt2','mt3'], attribution: myAttribution + ' | © Google Satellite' });
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: myAttribution + ' | © OpenStreetMap' });

    const baseMaps = { "Ảnh vệ tinh": googleSat, "Bản đồ đường": googleStreets, "OpenStreetMap": osmLayer };
    
    googleStreets.addTo(map);

    dimensionMarkers = L.layerGroup().addTo(map);
    priceMarkers = L.markerClusterGroup({
        iconCreateFunction: function (cluster) {
            const count = cluster.getChildCount();
            let size = ' marker-cluster-';
            if (count < 10) size += 'small'; else if (count < 100) size += 'medium'; else size += 'large';
            return new L.DivIcon({ html: `<div><span>${count}</span></div>`, className: `marker-cluster marker-cluster-yellow${size}`, iconSize: new L.Point(40, 40) });
        }
    }).addTo(map); 

    const initialOverlayMaps = { "👥 Dữ liệu cộng đồng": priceMarkers };
    const layersControl = L.control.layers(baseMaps, initialOverlayMaps, { position: 'bottomright' }).addTo(map);

       // --- KIẾN TRÚC LAYER MỚI (PRIMARY + FAILOVER) ---
    const esriServerUrl = '/proxy';
    
    // **SỬA LỖI: Yêu cầu hiển thị cả lớp Thửa đất (0) và Nhãn thửa (1)**
    esriParcelLayer = L.esri.dynamicMapLayer({ url: esriServerUrl, layers: [0, 1], useCors: true });

    esriParcelLayer.on('load', function() {
        console.log("✅ Tải thành công lớp bản đồ từ máy chủ Sở TNMT.");
        isPrimaryServerAvailable = true;
        layersControl.addOverlay(esriParcelLayer, "🗺️ Bản đồ địa chính");
        if (map.hasLayer(esriParcelLayer)) {
            document.getElementById('opacity-control').classList.remove('hidden');
        }
    });

    esriParcelLayer.on('error', function(err) {
        console.error("❌ Lỗi khi tải lớp bản đồ từ Sở TNMT. Chuyển sang chế độ dự phòng.", err);
        isPrimaryServerAvailable = false;
        if (map.hasLayer(esriParcelLayer)) {
            map.removeLayer(esriParcelLayer);
        }
        initializeMapboxFallback();
    });

    esriParcelLayer.addTo(map);

    function initializeMapboxFallback() {
        console.log("🔄 Khởi tạo lớp bản đồ dự phòng từ Mapbox...");
        const tilesetId = 'hvduoc.danang_parcels_final';
        const tileUrl = `https://api.mapbox.com/v4/${tilesetId}/{z}/{x}/{y}.mvt?access_token=${mapboxAccessToken}`;
        const parcelStyle = { color: '#6B7280', weight: 1, fill: false };
        const vectorTileOptions = {
        rendererFactory: L.svg.tile,
        interactive: true,
        getFeatureId: f => f.properties.OBJECTID,
        vectorTileLayerStyles: {
            danang_full: { color: '#6B7280', weight: 1, fill: false }
        }
        };

        parcelLayer = L.vectorGrid.protobuf(tileUrl, vectorTileOptions).addTo(map);
        
        layersControl.addOverlay(parcelLayer, "🗺️ Bản đồ địa chính (Dự phòng)");
        
        setupMapboxLayerClick();
    }

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
    const ui = new firebaseui.auth.AuthUI(auth);
    const opacityControl = document.getElementById('opacity-control');
    const opacitySlider = document.getElementById('opacity-slider');
    const donateBtn = document.getElementById('donate-btn');
    const donateModal = document.getElementById('donate-modal');
    const closeDonateModalBtn = document.getElementById('close-donate-modal');
    const copyBtn = document.getElementById('copy-stk-btn');
    const accountNumber = document.getElementById('bank-account-number').textContent;
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
    
    // --- HELPER FUNCTIONS (TIẾP TỤC) ---
    window.openStreetView = (lat, lng) => window.open(`http://googleusercontent.com/maps/google.com/3{lat},${lng}`, '_blank');

    function showInfoPanel(title, props, lat, lng) {
        infoPanel.classList.remove('is-collapsed');
        togglePanelBtn.querySelector('i').classList.replace('fa-chevron-up', 'fa-chevron-down');

        panelTitle.textContent = title;
        const soTo = props['Số hiệu tờ bản đồ'] ?? 'N/A';
        const soThua = props['Số thửa'] ?? 'N/A';
        const loaiDat = props['Ký hiệu mục đích sử dụng'] ?? 'N/A';
        const dienTich = props['Diện tích'] ? parseFloat(props['Diện tích']).toFixed(1) : 'N/A';
        
        panelContent.innerHTML = `
        <div class="info-row">
            <span class="info-label">Thửa số:</span><strong class="info-value">${soThua}</strong>
            <span class="info-label ml-4">Tờ bản đồ:</span><strong class="info-value">${soTo}</strong>
        </div>
        <div class="info-row">
            <span class="info-label">Loại đất:</span><strong class="info-value">${loaiDat}</strong>
            <span class="info-label ml-4">Diện tích:</span><strong class="info-value">${dienTich} m²</strong>
        </div>
        <div id="panel-actions">
            <button onclick="getDirections(${lat}, ${lng})"><i class="icon fas fa-directions text-blue-600"></i><span class="text">Chỉ đường</span></button>
            <button onclick="openStreetView(${lat}, ${lng})"><i class="icon fas fa-street-view text-green-600"></i><span class="text">Street View</span></button>
            <button onclick="copyLocationLink(${lat}, ${lng})"><i class="icon fas fa-link text-gray-500"></i><span class="text">Sao chép</span></button>
            <button onclick="toggleShareMenu()" id="share-btn"><i class="icon fas fa-share-alt text-indigo-600"></i><span class="text">Chia sẻ</span></button>
            <div id="share-submenu">
                <button onclick="share('facebook', ${lat}, ${lng}, '${soTo}', '${soThua}')" title="Facebook"><i class="icon fab fa-facebook-f text-blue-700"></i></button>
                <button onclick="share('whatsapp', ${lat}, ${lng}, '${soTo}', '${soThua}')" title="WhatsApp"><i class="icon fab fa-whatsapp text-green-500"></i></button>
            </div>
        </div>`;

        infoPanel.classList.add('is-open');
        actionToolbar.classList.add('is-raised');
    }
  
    async function showListingInfoPanel(item) {
        const ADMIN_UID = "FEpPWWT1EaTWQ9FOqBxWN5FeEJk1";
        const currentUser = firebase.auth().currentUser;
        const isAdmin = currentUser && currentUser.uid === ADMIN_UID;
        const infoPanel = document.getElementById('info-panel');
        const panelTitle = document.getElementById('panel-title');
        const panelContent = document.getElementById('panel-content');

        let userProfile = { name: item.userName || 'Người dùng ẩn danh', avatar: item.userAvatar || 'https://placehold.co/60x60/e2e8f0/64748b?text=A' };
        let fetchedAddress = 'Đang tải địa chỉ...';
        try { fetchedAddress = await getCachedAddress(item.lat, item.lng); } catch (error) { fetchedAddress = 'Lỗi khi tải địa chỉ.'; }

        const price = `${item.priceValue} ${item.priceUnit}`;
        const area = item.area ? `${item.area} m²` : 'N/A';
        const notes = item.notes || 'Không có';
        const lat = item.lat.toFixed(6);
        const lng = item.lng.toFixed(6);

        let adminDeleteButtonHtml = isAdmin ? `<a class="action-button admin-delete-button" onclick="deleteListing('${item.id}')"><i class="fas fa-trash-alt"></i><span>Xóa tin</span></a>` : '';
        let contactIconsHtml = '';
        if (item.contactPhone) {
            contactIconsHtml += `<a href="tel:${item.contactPhone}" class="contact-button" title="Gọi điện"><i class="fas fa-phone-alt"></i></a>`;
            contactIconsHtml += `<a href="https://wa.me/${item.contactPhone.replace(/[^0-9]/g, '')}" target="_blank" class="contact-button" title="WhatsApp"><i class="fab fa-whatsapp"></i></a>`;
            contactIconsHtml += `<a href="https://zalo.me/${item.contactPhone.replace(/[^0-9]/g, '')}" target="_blank" class="contact-button" title="Zalo"><i class="fas fa-comment-dots"></i></a>`;
        }
        if (item.contactEmail) contactIconsHtml += `<a href="mailto:${item.contactEmail}" class="contact-button" title="Email"><i class="fas fa-envelope"></i></a>`;
        if (item.contactFacebook) {
            const fbLink = item.contactFacebook.startsWith('http') ? item.contactFacebook : `https://facebook.com/${item.contactFacebook}`;
            contactIconsHtml += `<a href="${fbLink}" target="_blank" class="contact-button" title="Facebook"><i class="fab fa-facebook"></i></a>`;
        }

        panelTitle.textContent = item.name;
        panelContent.innerHTML = `
            <div class="price-highlight">${price}</div>
            <div class="info-pills">
                <span class="pill-item"><i class="fas fa-ruler-combined"></i> ${area}</span>
                <span class="pill-item"><i class="fas fa-pen"></i> ${notes}</span>
            </div>
            <div class="address-actions-group">
                <div class="address-text"><i class="fas fa-map-marker-alt"></i> ${fetchedAddress}</div>
                <div class="action-buttons-group">
                    <a class="action-button" onclick="getDirections(${lat}, ${lng})"><i class="fas fa-directions"></i><span>Chỉ đường</span></a>
                    <a class="action-button" onclick="openStreetView(${lat}, ${lng})"><i class="fas fa-street-view"></i><span>Street View</span></a>
                    <a class="action-button" onclick="copyLocationLink(${lat}, ${lng})"><i class="fas fa-link"></i><span>Sao chép</span></a>
                    ${adminDeleteButtonHtml}
                </div>
            </div>
            <div class="poster-card">
                <img src="${userProfile.avatar}" alt="Avatar" class="poster-avatar-small">
                <div class="poster-name">${userProfile.name}</div>
                <div class="poster-contact-buttons">${contactIconsHtml || 'Không có liên hệ'}</div>
            </div>`;

        infoPanel.classList.remove('is-collapsed');
        infoPanel.classList.add('is-open');
    }

    function hideInfoPanel() {
        infoPanel.classList.remove('is-open');
        actionToolbar.classList.remove('is-raised', 'is-partially-raised');
        if (!isPrimaryServerAvailable && parcelLayer && window.highlightedFeature) {
            parcelLayer.resetFeatureStyle(window.highlightedFeature);
            window.highlightedFeature = null;
        }
        dimensionMarkers.clearLayers();
    }

    function drawDimensions(feature) {
        dimensionMarkers.clearLayers();
        if (!feature || !feature.geometry || !feature.geometry.coordinates) return;
    
        const geojsonLayer = L.geoJSON(feature);
        const bounds = geojsonLayer.getBounds();
        if (bounds.getNorthEast().distanceTo(bounds.getSouthWest()) > 5000) return; 

        let coords;
        const geomType = feature.geometry.type;
        if (geomType === 'Polygon') coords = feature.geometry.coordinates[0];
        else if (geomType === 'MultiPolygon') coords = feature.geometry.coordinates[0][0];
        else return;

        if (!Array.isArray(coords) || coords.length < 2) return;

        for (let i = 0; i < coords.length - 1; i++) {
            const p1 = L.latLng(coords[i][1], coords[i][0]);
            const p2 = L.latLng(coords[i+1][1], coords[i+1][0]);
            const distance = p1.distanceTo(p2);
            if (distance < 1) continue;
            const midPoint = L.latLng((p1.lat + p2.lat) / 2, (p1.lng + p2.lng) / 2);
            const displayDistance = distance.toFixed(1) + 'm';
            L.marker(midPoint, {
                icon: L.divIcon({ className: 'dimension-label-container', html: `<div class="dimension-label">${displayDistance}</div>` })
            }).addTo(dimensionMarkers);
        }
    }

    async function loadUserProfile() {
        try {
            const userDoc = await db.collection("users").doc(currentUser.uid).get();
            if (userDoc.exists) {
                const p = userDoc.data();
                document.getElementById('profile-name').value = p.displayName || '';
                document.getElementById('profile-email').value = p.email || '';
                document.getElementById('profile-phone').value = p.phone || '';
                document.getElementById('profile-zalo').value = p.zalo || '';
                document.getElementById('profile-whatsapp').value = p.whatsapp || '';
                document.getElementById('profile-facebook').value = p.contactFacebook || '';
            }
        } catch (error) { console.error("Lỗi tải hồ sơ:", error); }
    }

    function handleUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        const lat = urlParams.get('lat');
        const lng = urlParams.get('lng');
        if (lat && lng) {
            const targetLatLng = L.latLng(parseFloat(lat), parseFloat(lng));
            map.setView(targetLatLng, 19);
        }
    }

    function enterAddMode() {
        exitAllModes();
        isAddMode = true;
        map.getContainer().classList.add('map-add-mode');
        addLocationBtn.classList.add('active-tool');
        instructionBanner.textContent = 'Nhấp vào bản đồ để chọn vị trí cần thêm.';
        instructionBanner.classList.remove('hidden');
    }

    function enterQueryMode() {
        exitAllModes();
        isQueryMode = true;
        map.getContainer().classList.add('map-query-mode');
        queryBtn.classList.add('active-tool');
        instructionBanner.textContent = 'Nhấp vào một thửa đất trên bản đồ để xem thông tin.';
        instructionBanner.classList.remove('hidden');
    }

    function exitAllModes() {
        isAddMode = false; isQueryMode = false;
        map.getContainer().classList.remove('map-add-mode', 'map-query-mode');
        addLocationBtn.classList.remove('active-tool');
        queryBtn.classList.remove('active-tool');
        instructionBanner.classList.add('hidden');
        if (tempMarker) map.removeLayer(tempMarker);
        tempMarker = null;
    }
    
    async function prefillUserContact() {
        if (!currentUser) return;
        try {
            const userDoc = await db.collection("users").doc(currentUser.uid).get();
            if (userDoc.exists) {
                const p = userDoc.data();
                document.getElementById('contact-name').value = p.displayName || '';
                document.getElementById('email').value = p.email || '';
                document.getElementById('phone').value = p.phone || '';
                document.getElementById('facebook').value = p.contactFacebook || '';
            }
        } catch (error) { console.error("Lỗi khi lấy hồ sơ:", error); }
    }

    window.deleteListing = async function(listingId) {
        if (!listingId) return alert('Không tìm thấy ID của tin đăng.');
        if (confirm('Bạn chắc chắn muốn xóa vĩnh viễn tin đăng này không?')) {
            try {
                await db.collection('listings').doc(listingId).delete();
                alert('Đã xóa tin đăng thành công!');
                hideInfoPanel();
            } catch (error) { console.error("Lỗi khi xóa: ", error); alert('Có lỗi xảy ra khi xóa.'); }
        }
    }

    window.getDirections = function(toLat, toLng) {
        if (!navigator.geolocation) return alert('Trình duyệt không hỗ trợ định vị.');
        navigator.geolocation.getCurrentPosition( (pos) => {
            window.open(`http://googleusercontent.com/maps/google.com/4{pos.coords.latitude},${pos.coords.longitude}&destination=${toLat},${toLng}`, '_blank');
        }, () => alert('Không thể lấy vị trí của bạn.'));
    };

    window.copyLocationLink = function(lat, lng) {
        navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?lat=${lat}&lng=${lng}`)
            .then(() => alert('Đã sao chép liên kết vị trí!'));
    };

    window.toggleShareMenu = () => document.getElementById('share-submenu').classList.toggle('is-visible');
    window.share = function(platform, lat, lng, soTo, soThua) {
        const url = `${window.location.origin}${window.location.pathname}?lat=${lat}&lng=${lng}`;
        const text = `Khám phá thửa đất (Thửa: ${soThua}, Tờ: ${soTo}) tại Đà Nẵng!`;
        let shareUrl = '';
        if (platform === 'facebook') shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`;
        else if (platform === 'whatsapp') shareUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`;
        if (shareUrl) window.open(shareUrl, '_blank', 'width=600,height=400');
        toggleShareMenu();
    };

    const performSearch = async (query) => {
        if (!query) {
            searchResultsContainer.innerHTML = '';
            searchResultsContainer.classList.add('hidden');
            return;
        }
        searchResultsContainer.innerHTML = '<div class="p-4 text-center text-gray-500">Đang tìm...</div>';
        searchResultsContainer.classList.remove('hidden');
        const listingResults = localListings.filter(item => item.name.toLowerCase().includes(query.toLowerCase()));
        let html = '';
        if (listingResults.length > 0) {
            html += '<div class="result-category">Tin đăng nổi bật</div>';
            listingResults.slice(0, 5).forEach(item => {
                html += `<div class="result-item" data-type="listing" data-id="${item.id}"><i class="icon fa-solid fa-tag"></i><div><strong>${item.name}</strong><span class="price">${item.priceValue} ${item.priceUnit}</span></div></div>`;
            });
        }
        const mapCenter = map.getCenter();
        const endpointUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxAccessToken}&country=VN&language=vi&autocomplete=true&proximity=${mapCenter.lng},${mapCenter.lat}`;
        try {
            const response = await fetch(endpointUrl);
            const data = await response.json();
            if (data.features?.length > 0) {
                html += '<div class="result-category">Địa điểm</div>';
                data.features.forEach(feature => {
                    html += `<div class="result-item" data-type="location" data-lat="${feature.center[1]}" data-lng="${feature.center[0]}"><i class="icon fa-solid fa-map-marker-alt"></i><span>${feature.place_name}</span></div>`;
                });
            }
        } catch (error) { console.error("Lỗi tìm kiếm Mapbox:", error); }
        searchResultsContainer.innerHTML = html || '<div class="p-4 text-center text-gray-500">Không tìm thấy kết quả.</div>';
    };

    // --- EVENT LISTENERS ---
    userProfileDiv.addEventListener('click', (e) => { e.stopPropagation(); profileMenu.classList.toggle('hidden'); });
    updateProfileBtn.addEventListener('click', (e) => { e.preventDefault(); if (!currentUser) return; loadUserProfile(); document.getElementById('profile-modal').classList.remove('hidden'); profileMenu.classList.add('hidden'); });
    logoutBtnMenu.addEventListener('click', (e) => { e.preventDefault(); auth.signOut(); profileMenu.classList.add('hidden'); });
    document.addEventListener('click', (e) => { if (!profileMenu.classList.contains('hidden') && !userProfileDiv.contains(e.target)) profileMenu.classList.add('hidden'); });
    
    contactInfoBtn.addEventListener('click', () => contactInfoModal.classList.remove('hidden'));
    closeContactModalBtn.addEventListener('click', () => contactInfoModal.classList.add('hidden'));
    contactInfoModal.addEventListener('click', (e) => { if (e.target === contactInfoModal) contactInfoModal.classList.add('hidden'); });

    searchInput.addEventListener('input', (e) => { clearTimeout(debounceTimer); debounceTimer = setTimeout(() => { performSearch(e.target.value.trim()); }, 300); });
    searchResultsContainer.addEventListener('click', (e) => {
        const item = e.target.closest('.result-item');
        if (!item) return;
        hideInfoPanel();
        if (item.dataset.type === 'location') {
            map.setView([parseFloat(item.dataset.lat), parseFloat(item.dataset.lng)], 17);
        } else if (item.dataset.type === 'listing') {
            const listing = localListings.find(l => l.id === item.dataset.id);
            if (listing) { map.setView([listing.lat, listing.lng], 18); showListingInfoPanel(listing); }
        }
        searchResultsContainer.classList.add('hidden');
        searchInput.value = '';
    });

    closePanelBtn.addEventListener('click', hideInfoPanel);
    togglePanelBtn.addEventListener('click', () => {
        const isCollapsed = infoPanel.classList.toggle('is-collapsed');
        togglePanelBtn.querySelector('i').classList.toggle('fa-chevron-down', !isCollapsed);
        togglePanelBtn.querySelector('i').classList.toggle('fa-chevron-up', isCollapsed);
        actionToolbar.classList.toggle('is-partially-raised', isCollapsed);
        actionToolbar.classList.toggle('is-raised', !isCollapsed && infoPanel.classList.contains('is-open'));
    });

    locateBtn.addEventListener('click', () => { if (navigator.geolocation) map.locate({ setView: true, maxZoom: 16 }); });
    map.on('locationfound', function(e) {
        if (userLocationMarker) map.removeLayer(userLocationMarker);
        userLocationMarker = L.marker(e.latlng).addTo(map).bindPopup(`Vị trí của bạn`).openPopup();
    });
    map.on('locationerror', (e) => alert("Không thể lấy vị trí của bạn: " + e.message));

    map.on('click', function(e) {
        searchResultsContainer.classList.add('hidden');
        if (isAddMode) {
            if (!currentUser) return alert("Vui lòng đăng nhập để thêm địa điểm!");
            selectedCoords = e.latlng;
            tempMarker = L.marker(selectedCoords).addTo(map);
            modal.classList.remove('hidden');
            L.esri.Geocoding.geocodeService().reverse().latlng(selectedCoords).run((error, result) => {
                document.getElementById('address-input').value = (error || !result.address) ? 'Không tìm thấy địa chỉ' : result.address.Match_addr;
            });
        } else if (isPrimaryServerAvailable && map.hasLayer(esriParcelLayer)) {
            hideInfoPanel();
            esriParcelLayer.identify().layers('visible:0,1').on(map).at(e.latlng).run(function(error, fc) {
                if (error || fc.features.length === 0) {
                    console.log("Không tìm thấy thửa đất tại vị trí này.");
                    return;
                }
                const feature = fc.features[0];
                const props = feature.properties;
                console.log("Thông tin từ Server:", props); 
                drawDimensions(feature);
                const formattedProps = {
                    'Số thửa': props['SoThua'] || props['Số thửa'] || 'N/A', 
                    'Số hiệu tờ bản đồ': props['SoToBD'] || props['Số tờ bản đồ'] || 'N/A',
                    'Diện tích': props.DienTich ? parseFloat(props.DienTich).toFixed(1) : (props.DTPL ? parseFloat(props.DTPL).toFixed(1) : 'N/A'), 
                    'Ký hiệu mục đích sử dụng': props.LoaiDat || props['Mục đích SD'] || 'N/A',
                };
                showInfoPanel('Thông tin Thửa đất', formattedProps, e.latlng.lat, e.latlng.lng);
            });
        } else {
             hideInfoPanel();
        }
    });

    function setupMapboxLayerClick() {
        if (!parcelLayer) return;
        let highlightedFeature;
        parcelLayer.on('click', function(e) {
            L.DomEvent.stop(e);
            hideInfoPanel();
            const props = e.layer.properties;
            if (!props || !props.OBJECTID) return;
            if (highlightedFeature) parcelLayer.resetFeatureStyle(highlightedFeature);
            highlightedFeature = props.OBJECTID;
            window.highlightedFeature = highlightedFeature;
            parcelLayer.setFeatureStyle(highlightedFeature, { color: '#EF4444', weight: 3, fillColor: '#EF4444', fill: true, fillOpacity: 0.3 });
            const formattedProps = {
                'Số thửa': props.SoThuTuThua, 'Số hiệu tờ bản đồ': props.SoHieuToBanDo,
                'Diện tích': props.DienTich, 'Ký hiệu mục đích sử dụng': props.KyHieuMucDichSuDung,
            };
            showInfoPanel('Thông tin Thửa đất', formattedProps, e.latlng.lat, e.latlng.lng);
        });
    }

    opacitySlider.addEventListener('input', (e) => {
        const newOpacity = parseFloat(e.target.value);
        if (isPrimaryServerAvailable && esriParcelLayer) esriParcelLayer.setOpacity(newOpacity);
        else if (parcelLayer) parcelLayer.setStyle({ fill: true, fillColor: '#6B7280', fillOpacity: newOpacity });
    });
    map.on('overlayadd', e => { if (e.name.includes('Bản đồ địa chính')) opacityControl.classList.remove('hidden'); });
    map.on('overlayremove', e => { if (e.name.includes('Bản đồ địa chính')) opacityControl.classList.add('hidden'); });

    donateBtn.addEventListener('click', () => donateModal.classList.remove('hidden'));
    closeDonateModalBtn.addEventListener('click', () => donateModal.classList.add('hidden'));
    donateModal.addEventListener('click', (e) => { if (e.target === donateModal) donateModal.classList.add('hidden'); });
    copyBtn.addEventListener('click', () => navigator.clipboard.writeText(accountNumber).then(() => alert("Đã sao chép số tài khoản!")));

    addLocationBtn.addEventListener('click', () => { if (!currentUser) { alert("Vui lòng đăng nhập!"); return; } prefillUserContact(); isAddMode ? exitAllModes() : enterAddMode(); });
    queryBtn.addEventListener('click', () => isQueryMode ? exitAllModes() : enterQueryMode());
    listBtn.addEventListener('click', () => listModal.classList.remove('hidden'));
    document.getElementById('close-list-btn').addEventListener('click', () => listModal.classList.add('hidden'));
    document.getElementById('close-modal-btn').addEventListener('click', () => { modal.classList.add('hidden'); exitAllModes(); });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('submit-form-btn');
        if (!currentUser) return alert("Vui lòng đăng nhập.");
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        if (!selectedCoords || !data.name || !data.priceValue) return alert('Vui lòng điền các trường bắt buộc.');
        btn.textContent = 'Đang gửi...'; btn.disabled = true;
        try {
            const docData = { userId: currentUser.uid, userName: currentUser.displayName, userAvatar: currentUser.photoURL, lat: selectedCoords.lat, lng: selectedCoords.lng, priceValue: parseFloat(data.priceValue), area: data.area ? parseFloat(data.area) : null, status: 'approved', createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp(), ...data };
            await db.collection("listings").add(docData);
            alert('Gửi dữ liệu thành công!');
            modal.classList.add('hidden'); form.reset(); exitAllModes();
        } catch (error) { console.error("Lỗi khi thêm dữ liệu: ", error); alert("Đã xảy ra lỗi."); } finally { btn.textContent = 'Gửi Dữ Liệu'; btn.disabled = false; }
    });

    auth.onAuthStateChanged(async (user) => {
        currentUser = user;
        if (user) {
            const userRef = db.collection("users").doc(user.uid);
            const doc = await userRef.get();
            if (!doc.exists) userRef.set({ displayName: user.displayName || "", email: user.email || "", createdAt: firebase.firestore.FieldValue.serverTimestamp() });
            firebaseuiContainer.classList.add('hidden');
            loginBtn.classList.add('hidden');
            userProfileDiv.classList.remove('hidden'); userProfileDiv.classList.add('flex');
            document.getElementById('user-avatar').src = user.photoURL || 'https://placehold.co/40x40/e2e8f0/64748b?text=A';
            addLocationBtn.disabled = false;
        } else {
            loginBtn.classList.remove('hidden');
            userProfileDiv.classList.add('hidden'); userProfileDiv.classList.remove('flex');
            exitAllModes();
            addLocationBtn.disabled = true;
        }
    });

    loginBtn.addEventListener('click', () => {
        if (ui.isPendingRedirect()) return;
        firebaseuiContainer.classList.remove('hidden');
        ui.start('#firebaseui-widget', { signInFlow: 'popup', signInOptions: [ firebase.auth.GoogleAuthProvider.PROVIDER_ID, firebase.auth.EmailAuthProvider.PROVIDER_ID ], callbacks: { signInSuccessWithAuthResult: () => { firebaseuiContainer.classList.add('hidden'); return false; } } });
    });
    firebaseuiContainer.addEventListener('click', (e) => { if (e.target === firebaseuiContainer) firebaseuiContainer.classList.add('hidden'); });

    db.collection("listings").where("status", "==", "approved").orderBy("createdAt", "desc").onSnapshot((querySnapshot) => {
        localListings = []; priceMarkers.clearLayers();
        const priceList = document.getElementById('price-list');
        priceList.innerHTML = '';
        if (querySnapshot.empty) {
            priceList.innerHTML = '<p class="text-center text-gray-500 py-4">Không có dữ liệu.</p>';
            return;
        }
        querySnapshot.forEach((doc) => {
            const item = { ...doc.data(), id: doc.id };
            localListings.push(item);
            if (!item.lat || !item.lng) return;
            L.marker([item.lat, item.lng]).on('click', () => showListingInfoPanel(item)).addTo(priceMarkers);
            const listItem = document.createElement('div');
            listItem.className = 'p-2 border-b cursor-pointer hover:bg-gray-100';
            listItem.innerHTML = `<p class="font-semibold">${item.name}</p><p class="text-sm text-red-600">${item.priceValue} ${item.priceUnit}</p>`;
            listItem.onclick = () => { listModal.classList.add('hidden'); map.setView([item.lat, item.lng], 18); showListingInfoPanel(item); };
            priceList.appendChild(listItem);
        });
    });

    document.getElementById('profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUser) return;
        const updatedProfile = {
            displayName: document.getElementById('profile-name').value.trim(), email: document.getElementById('profile-email').value.trim(),
            phone: document.getElementById('profile-phone').value.trim(), zalo: document.getElementById('profile-zalo').value.trim(),
            whatsapp: document.getElementById('profile-whatsapp').value.trim(), contactFacebook: document.getElementById('profile-facebook').value.trim(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        try {
            await db.collection("users").doc(currentUser.uid).update(updatedProfile);
            alert("Hồ sơ đã được cập nhật.");
            document.getElementById('profile-modal').classList.add('hidden');
        } catch (error) { console.error("Lỗi cập nhật hồ sơ:", error); alert("Có lỗi xảy ra."); }
    });

    document.getElementById('close-profile-btn').addEventListener('click', () => document.getElementById('profile-modal').classList.add('hidden'));

    handleUrlParameters();
});