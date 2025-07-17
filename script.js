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

// --- APPLICATION LOGIC WRAPPER ---
document.addEventListener('DOMContentLoaded', () => {

    // --- MAP AND LAYERS INITIALIZATION ---
    const map = L.map('map', { center: [16.054456, 108.202167], zoom: 13, zoomControl: false });
    const myAttribution = '© XemGiaDat | Dữ liệu © Sở TNMT Đà Nẵng';
    
    const googleStreets = L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',{ maxZoom: 20, subdomains:['mt0','mt1','mt2','mt3'], attribution: myAttribution + ' | © Google Maps' });
    const googleSat = L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',{ maxZoom: 20, subdomains:['mt0','mt1','mt2','mt3'], attribution: myAttribution + ' | © Google Satellite' });
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: myAttribution + ' | © OpenStreetMap' });
    const parcelLayer = L.esri.dynamicMapLayer({ url: 'https://gisportal.danang.gov.vn/server/rest/services/DiaChinh/DaNangLand_DiaChinh/MapServer', opacity: 0.7, useCors: false });
    
    const baseMaps = { "Ảnh vệ tinh": googleSat, "Bản đồ đường": googleStreets, "OpenStreetMap": osmLayer };
    const overlayMaps = { "🗺️ Bản đồ phân lô": parcelLayer };
    
    googleStreets.addTo(map);
    parcelLayer.addTo(map);
    L.control.layers(baseMaps, overlayMaps, { position: 'bottomright' }).addTo(map);

    // --- DOM ELEMENT SELECTION ---
    const modal = document.getElementById('form-modal');
    const listModal = document.getElementById('price-list-modal');
    const form = document.getElementById('location-form');
    const instructionBanner = document.getElementById('instruction-banner');
    const authContainer = document.getElementById('auth-container');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userProfileDiv = document.getElementById('user-profile');
    userProfileDiv.addEventListener('click', () => {
        if (!currentUser) return;
        loadUserProfile(); // Nạp dữ liệu từ Firestore vào form
        document.getElementById('profile-modal').classList.remove('hidden');
    });

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

    // --- STATE & GLOBAL VARIABLES ---
    let currentUser = null;
    let tempMarker = null;
    let selectedCoords = null;
    let isAddMode = false;
    let isQueryMode = false;
    let localListings = [];
    let debounceTimer;
    let highlightedParcel = null; 
    let dimensionMarkers = L.layerGroup();
    let userLocationMarker = null;
    let priceMarkers = L.markerClusterGroup({
        iconCreateFunction: function (cluster) {
            const count = cluster.getChildCount();
            let size = ' marker-cluster-';
            if (count < 10) size += 'small'; else if (count < 100) size += 'medium'; else size += 'large';
            return new L.DivIcon({ html: '<div><span>' + count + '</span></div>', className: 'marker-cluster marker-cluster-yellow' + size, iconSize: new L.Point(40, 40) });
        }
    }).addTo(map);

    // --- HELPER FUNCTIONS ---
    
    window.openStreetView = function(lat, lng) {
        const url = `https://www.google.com/maps?q=&layer=c&cbll=${lat},${lng}`;
        window.open(url, '_blank');
    };
   
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
            <span class="info-label">Tờ:</span><strong class="info-value">${soTo}</strong>
            <span class="info-label ml-4">Thửa:</span><strong class="info-value">${soThua}</strong>
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
        </div>
        `;


        infoPanel.classList.add('is-open');
        actionToolbar.classList.add('is-raised');
    }
    
    function hideInfoPanel() {
        infoPanel.classList.remove('is-open');
        actionToolbar.classList.remove('is-raised', 'is-partially-raised');
        if (highlightedParcel) map.removeLayer(highlightedParcel);
        dimensionMarkers.clearLayers();
        highlightedParcel = null;
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

    
    async function performCadastralQuery(latlng) {
        hideInfoPanel();
        const loadingPopup = L.popup().setLatLng(latlng).setContent('<p>Đang tìm kiếm thông tin...</p>').openOn(map);

        try {
            const parcelIdentify = parcelLayer.identify().on(map).at(latlng);
            const featureCollection = await new Promise((resolve, reject) => {
                parcelIdentify.run((error, fc) => error ? reject(error) : resolve(fc));
            });

            if (!featureCollection || featureCollection.features.length === 0) {
                loadingPopup.setContent('Không tìm thấy thông tin địa chính tại vị trí này.');
                return;
            }

            map.closePopup(loadingPopup);
            const feature = featureCollection.features[0];
            const props = feature.properties;
            
            // --- NÂNG CẤP QUAN TRỌNG: TÌM ĐỊA CHỈ TỪ TÂM THỬA ĐẤT ---

            // 1. Tạo một lớp GeoJSON tạm thời để lấy tâm (centroid)
            const tempLayer = L.geoJSON(feature.geometry);
            const parcelCenter = tempLayer.getBounds().getCenter();
            
            // 2. Dùng tọa độ của TÂM để hỏi Mapbox
            const centerLat = parcelCenter.lat.toFixed(6);
            const centerLng = parcelCenter.lng.toFixed(6);
            
            const endpointUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${centerLng},${centerLat}.json?access_token=${mapboxAccessToken}&language=vi&limit=1`;
            const mapboxResponse = await fetch(endpointUrl);
            const mapboxData = await mapboxResponse.json();
            
            // 3. Gán địa chỉ cuối cùng vào props để hiển thị
            if (mapboxData.features && mapboxData.features.length > 0) {
                props['Địa chỉ'] = mapboxData.features[0].place_name;
            } else {
                // Nếu không tìm được, dùng tạm địa chỉ gốc (nếu có)
                props['Địa chỉ'] = (props['Địa chỉ'] && props['Địa chỉ'] !== 'Null') ? props['Địa chỉ'] : 'Chưa xác định';
            }
            // --- KẾT THÚC NÂNG CẤP ---

            if (highlightedParcel) map.removeLayer(highlightedParcel);
            const outlineStyle = { color: '#4A5568', weight: 5, opacity: 0.7 };
            const fillStyle = { color: '#FFD700', weight: 3, opacity: 1 };
            highlightedParcel = L.layerGroup([
                L.geoJSON(feature.geometry, { style: outlineStyle }),
                L.geoJSON(feature.geometry, { style: fillStyle })
            ]).addTo(map);

            dimensionMarkers.clearLayers();
            const coords = feature.geometry.coordinates[0];
            if (coords.length > 2) {
                for (let i = 0; i < coords.length - 1; i++) {
                    const p1 = coords[i], p2 = coords[i+1];
                    const point1 = L.latLng(p1[1], p1[0]), point2 = L.latLng(p2[1], p2[0]);
                    const distance = point1.distanceTo(point2);
                    const midPoint = L.latLng((point1.lat + point2.lat) / 2, (point1.lng + point2.lng) / 2);
                    const angle = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) * 180 / Math.PI;
                    const displayDistance = Math.round(distance * 10) / 10;
                    const dimensionLabel = L.marker(midPoint, { icon: L.divIcon({ className: 'dimension-label-container', html: `<div class="dimension-label" style="transform: rotate(${angle}deg);">${displayDistance}</div>` }) });
                    dimensionMarkers.addLayer(dimensionLabel);
                }
                dimensionMarkers.addTo(map);
            }

            // Hiển thị panel với tọa độ của điểm click ban đầu
            showInfoPanel('Thông tin Thửa đất', props, latlng.lat.toFixed(6), latlng.lng.toFixed(6));

        } catch (error) {
            console.error("Lỗi khi tra cứu địa chính:", error);
            if(loadingPopup) map.closePopup(loadingPopup);
            L.popup().setLatLng(latlng).setContent('Có lỗi xảy ra khi tra cứu.').openOn(map);
        }
    }
    
    function handleUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        const lat = urlParams.get('lat');
        const lng = urlParams.get('lng');
        if (lat && lng) {
            const targetLatLng = L.latLng(parseFloat(lat), parseFloat(lng));
            map.setView(targetLatLng, 19);
            setTimeout(() => { performCadastralQuery(targetLatLng); }, 1000); 
        }
    }

    function enterAddMode() {
        exitAllModes();
        isAddMode = true;
        map.getContainer().classList.add('map-add-mode');
        queryBtn.classList.remove('active-tool');
        instructionBanner.textContent = 'Nhấp vào bản đồ để chọn vị trí cần thêm.';
        instructionBanner.classList.remove('hidden');
    }
    function enterQueryMode() {
        exitAllModes();
        isQueryMode = true;
        map.getContainer().classList.add('map-query-mode');
        queryBtn.classList.add('active-tool');
        instructionBanner.textContent = 'Nhấp vào vị trí trên bản đồ để tra cứu thông tin thửa đất.';
        instructionBanner.classList.remove('hidden');
    }
    function exitAllModes() {
        isAddMode = false;
        isQueryMode = false;
        map.getContainer().classList.remove('map-add-mode', 'map-query-mode');
        queryBtn.classList.remove('active-tool');
        instructionBanner.classList.add('hidden');
        if (tempMarker) {
            map.removeLayer(tempMarker);
            tempMarker = null;
        }
    }
    // Định nghĩa hàm prefillUserContact
    async function prefillUserContact() {
    if (!currentUser) return;

    try {
        const userDoc = await db.collection("users").doc(currentUser.uid).get();
        if (userDoc.exists) {
        const profile = userDoc.data();
        document.getElementById('contact-name').value = profile.displayName || '';
        document.getElementById('email').value = profile.email || '';
        document.getElementById('phone').value = profile.phone || '';   
        document.getElementById('zalo').value = profile.zalo || '';
        document.getElementById('whatsapp').value = profile.whatsapp || '';                 
        document.getElementById('facebook').value = profile.contactFacebook || '';
        }
    } catch (error) {
        console.error("Lỗi khi lấy hồ sơ người dùng:", error);
    }
    }
    
    window.getDirections = function(toLat, toLng) {
        if (!navigator.geolocation) { alert('Trình duyệt của bạn không hỗ trợ định vị.'); return; }
        alert('Đang lấy vị trí của bạn để chỉ đường...');
        navigator.geolocation.getCurrentPosition( (position) => {
            const fromLat = position.coords.latitude;
            const fromLng = position.coords.longitude;
            const url = `https://www.google.com/maps/dir/?api=1&origin=${fromLat},${fromLng}&destination=${toLat},${toLng}`;
            window.open(url, '_blank');
        }, () => {
            alert('Không thể lấy được vị trí của bạn. Vui lòng kiểm tra quyền truy cập vị trí của trình duyệt.');
        });
    };
    window.likePlace = function(id) {
        const el = document.getElementById(`like-${id}`);
        let count = parseInt(localStorage.getItem(`like-${id}`) || 0, 10);
        count++;
        localStorage.setItem(`like-${id}`, count);
        if (el) el.textContent = count;
    };
    window.copyLink = function() {
        navigator.clipboard.writeText(window.location.href).then(() => {
            alert('Đã sao chép liên kết!');
        });
    }
    window.copyLocationLink = function(lat, lng) {
        const url = `${window.location.origin}${window.location.pathname}?lat=${lat}&lng=${lng}`;
        navigator.clipboard.writeText(url).then(() => {
            alert('Đã sao chép liên kết vị trí!');
        }).catch(err => console.error('Lỗi sao chép: ', err));
    }
    window.toggleShareMenu = function() {
        const submenu = document.getElementById('share-submenu');
        if (submenu) {
            submenu.classList.toggle('is-visible');
        }
    };

    // Xóa hàm shareOnFacebook cũ và thay bằng hàm này
    window.share = function(platform, lat, lng, soTo, soThua) {
        const url = `${window.location.origin}${window.location.pathname}?lat=${lat}&lng=${lng}`;
        const text = `Khám phá thửa đất (Tờ: ${soTo}, Thửa: ${soThua}) tại Đà Nẵng trên Bản đồ Giá đất Cộng đồng!`;
        let shareUrl = '';

        if (platform === 'facebook') {
            shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`;
        } else if (platform === 'whatsapp') {
            shareUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`;
        } else if (platform === 'zalo') {
            alert("Để chia sẻ qua Zalo, vui lòng sao chép liên kết và dán vào Zalo.");
            navigator.clipboard.writeText(url);
            toggleShareMenu(); // Đóng menu sau khi thông báo
            return; 
        }

        if (shareUrl) {
            window.open(shareUrl, '_blank', 'width=600,height=400');
        }
        toggleShareMenu(); // Tự động đóng menu sau khi bấm
    };
    window.toggleLike = function(button) {
        const icon = button.querySelector('i');
        if (icon.classList.contains('far')) {
            icon.classList.remove('far');
            icon.classList.add('fas', 'text-red-500');
        } else {
            icon.classList.remove('fas', 'text-red-500');
            icon.classList.add('far');
        }
    }
    
    // --- SEARCH LOGIC ---
    const searchByParcelNumber = async (soTo, soThua) => {
        searchResultsContainer.innerHTML = '<div class="p-4 text-center text-gray-500">Đang tìm thửa đất...</div>';
        searchResultsContainer.classList.remove('hidden');

        let html = '';
        try {
            const response = await fetch(`/.netlify/functions/getParcelInfo?soTo=${soTo}&soThua=${soThua}`);
            const data = await response.json();

            if (data.features && data.features.length > 0) {
                html += `<div class="result-category">Kết quả cho Tờ: ${soTo} / Thửa: ${soThua}</div>`;
                data.features.forEach(feature => {
                    const diaChi = feature.properties.DiaChiThuaDat || `Thửa đất ${soThua}, tờ bản đồ ${soTo}`;
                    const geometry = JSON.stringify(feature.geometry);
                    html += `<div class="result-item" data-type="parcel" data-geometry='${geometry}'><i class="icon fa-solid fa-draw-polygon"></i><span>${diaChi}</span></div>`;
                });
            }
        } catch (error) {
            console.error("Lỗi truy vấn thửa đất:", error);
        }

        searchResultsContainer.innerHTML = html === '' ? '<div class="p-4 text-center text-gray-500">Không tìm thấy thửa đất với số tờ/số thửa này.</div>' : html;
    };

    const performSearch = async (query) => {
        // Tạm thời bỏ tính năng tìm theo Tờ/Thửa vì server không hỗ trợ
        // const parcelRegex = /^\s*(\d+)\s*\/\s*(\d+)\s*$/;
        // const match = query.match(parcelRegex);
        if (match) {
            searchByParcelNumber(match[1], match[2]);
            return;
        }
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
            if (data.features && data.features.length > 0) {
                html += '<div class="result-category">Địa điểm</div>';
                data.features.forEach(feature => {
                    html += `<div class="result-item" data-type="location" data-lat="${feature.center[1]}" data-lng="${feature.center[0]}"><i class="icon fa-solid fa-map-marker-alt"></i><span>${feature.place_name}</span></div>`;
                });
            }
        } catch (error) { console.error("Lỗi tìm kiếm địa chỉ Mapbox:", error); }
        searchResultsContainer.innerHTML = html === '' ? '<div class="p-4 text-center text-gray-500">Không tìm thấy kết quả.</div>' : html;
    };

    // --- EVENT LISTENERS ---
    searchInput.addEventListener('input', (e) => { clearTimeout(debounceTimer); debounceTimer = setTimeout(() => { performSearch(e.target.value.trim()); }, 300); });
    searchResultsContainer.addEventListener('click', (e) => {
        const item = e.target.closest('.result-item');
        if (!item) return;
        hideInfoPanel();
        const type = item.dataset.type;
        if (type === 'location') {
            map.setView([parseFloat(item.dataset.lat), parseFloat(item.dataset.lng)], 17);
        } else if (type === 'listing') {
            const listing = localListings.find(l => l.id === item.dataset.id);
            if (listing) {
                map.setView([listing.lat, listing.lng], 18);
                priceMarkers.eachLayer(marker => { if (marker.getLatLng().lat === listing.lat && marker.getLatLng().lng === listing.lng) marker.openPopup(); });
            }
        } else if (type === 'parcel') {
            const geometry = JSON.parse(item.dataset.geometry);
            const outlineStyle = { color: '#4A5568', weight: 5, opacity: 0.7 };
            const fillStyle = { color: '#FFD700', weight: 3, opacity: 1 };
            const outlineLayer = L.geoJSON(geometry, { style: outlineStyle });
            const fillLayer = L.geoJSON(geometry, { style: fillStyle });
            highlightedParcel = L.layerGroup([outlineLayer, fillLayer]).addTo(map);
            map.fitBounds(L.geoJSON(geometry).getBounds());
            // Gọi truy vấn thông tin địa chính (giống như click)
            const bounds = L.geoJSON(geometry).getBounds();
            const center = bounds.getCenter();
            performCadastralQuery(center);

        }
        searchResultsContainer.classList.add('hidden');
        searchInput.value = '';
    });
    closePanelBtn.addEventListener('click', hideInfoPanel);
    togglePanelBtn.addEventListener('click', () => {
        const isCollapsed = infoPanel.classList.toggle('is-collapsed');
        const icon = togglePanelBtn.querySelector('i');
        icon.classList.toggle('fa-chevron-down');
        icon.classList.toggle('fa-chevron-up');

        if (isCollapsed) {
            actionToolbar.classList.remove('is-raised');
            actionToolbar.classList.add('is-partially-raised');
        } else {
            actionToolbar.classList.remove('is-partially-raised');
            actionToolbar.classList.add('is-raised');
        }
    });


    locateBtn.addEventListener('click', () => {
        if (!navigator.geolocation) { return alert('Trình duyệt của bạn không hỗ trợ định vị.'); }
        map.locate({ setView: true, maxZoom: 16 });
    });
    map.on('locationfound', function(e) {
        if (userLocationMarker) { map.removeLayer(userLocationMarker); }
        const radius = e.accuracy / 2;
        userLocationMarker = L.marker(e.latlng).addTo(map).bindPopup(`Vị trí của bạn (trong bán kính ${radius.toFixed(0)}m)`).openPopup();
    });
    map.on('locationerror', function(e) { alert("Không thể lấy vị trí của bạn: " + e.message); });
    map.on('click', function(e) {
        searchResultsContainer.classList.add('hidden');
        hideInfoPanel();
        if (isAddMode) {
            if (!currentUser) { alert("Vui lòng đăng nhập để thêm địa điểm!"); exitAllModes(); return; }
            selectedCoords = e.latlng;
            tempMarker = L.marker(selectedCoords).addTo(map);
            modal.classList.remove('hidden');
            const geocodeService = L.esri.Geocoding.geocodeService();
            geocodeService.reverse().latlng(selectedCoords).run(function (error, result) { if (error || !result.address) { document.getElementById('address-input').value = 'Không tìm thấy địa chỉ'; } else { document.getElementById('address-input').value = result.address.Match_addr; } });
        } 
        else if (isQueryMode) {
            performCadastralQuery(e.latlng);
        }
    });

    opacitySlider.addEventListener('input', (e) => parcelLayer.setOpacity(e.target.value));
    map.on('overlayadd', e => { if (e.layer === parcelLayer) opacityControl.classList.remove('hidden'); });
    map.on('overlayremove', e => { if (e.layer === parcelLayer) opacityControl.classList.add('hidden'); });
    if (map.hasLayer(parcelLayer)) { opacityControl.classList.remove('hidden'); } else { opacityControl.classList.add('hidden'); }
    donateBtn.addEventListener('click', () => donateModal.classList.remove('hidden'));
    closeDonateModalBtn.addEventListener('click', () => donateModal.classList.add('hidden'));
    donateModal.addEventListener('click', (e) => { if (e.target === donateModal) donateModal.classList.add('hidden'); });
    copyBtn.addEventListener('click', () => { navigator.clipboard.writeText(accountNumber).then(() => { const originalIcon = copyBtn.innerHTML; copyBtn.innerHTML = '<svg ...></svg>'; setTimeout(() => { copyBtn.innerHTML = originalIcon; }, 1500); }).catch(err => console.error('Lỗi sao chép: ', err)); });
    
    addLocationBtn.addEventListener('click', () => {
    if (!currentUser) {
        alert("Vui lòng đăng nhập để thêm địa điểm!");
        return;
    }

    // Gọi hàm điền thông tin liên hệ từ hồ sơ
    prefillUserContact();

    // Bật chế độ thêm địa điểm
    isAddMode ? exitAllModes() : enterAddMode();
    });

    queryBtn.addEventListener('click', () => { isQueryMode ? exitAllModes() : enterQueryMode(); });
    listBtn.addEventListener('click', () => listModal.classList.remove('hidden'));
    document.getElementById('close-list-btn').addEventListener('click', () => listModal.classList.add('hidden'));
    document.getElementById('close-modal-btn').addEventListener('click', () => { modal.classList.add('hidden'); exitAllModes(); });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('submit-form-btn');
        if (!currentUser) return alert("Vui lòng đăng nhập.");
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        if (!selectedCoords || !data.name || !data.priceValue) { return alert('Vui lòng điền các trường bắt buộc.'); }
        submitBtn.textContent = 'Đang gửi...'; submitBtn.disabled = true;
        try {
            const docData = { userId: currentUser.uid, userName: currentUser.displayName, userAvatar: currentUser.photoURL, lat: selectedCoords.lat, lng: selectedCoords.lng, priceValue: parseFloat(data.priceValue), area: data.area ? parseFloat(data.area) : null, status: 'pending', createdAt: firebase.firestore.FieldValue.serverTimestamp(), name: data.name, priceUnit: data.priceUnit, notes: data.notes || '', contactName: data.contactName || '', contactEmail: data.contactEmail || '', contactPhone: data.contactPhone || '', contactFacebook: data.contactFacebook || '' };
            // Lấy tổng số tin đã đăng để sinh mã BĐS tự động
            const snapshot = await db.collection("listings")
                         .where("status", "==", "approved")
                         .get();

            const listingCount = snapshot.size + 1;
            const paddedNumber = String(listingCount).padStart(5, '0');
            const propertyCode = `BDS-${paddedNumber}`;

            // Gán vào docData
            docData.propertyCode = propertyCode;
            docData.status = 'approved'; // mặc định còn bán
            docData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();

            await db.collection("listings").add(docData);
            alert('Gửi dữ liệu thành công, cảm ơn bạn đã đóng góp!');
            modal.classList.add('hidden'); form.reset(); exitAllModes();
        } catch (error) { console.error("Lỗi khi thêm dữ liệu: ", error); alert("Đã xảy ra lỗi khi gửi dữ liệu."); } finally { submitBtn.textContent = 'Gửi Dữ Liệu'; submitBtn.disabled = false; }
    });

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;

            // 🔹 Tạo hồ sơ Firestore nếu chưa có
            const userRef = db.collection("users").doc(user.uid);
            const doc = await userRef.get();

            if (!doc.exists) {
                await userRef.set({
                    displayName: user.displayName || "",
                    email: user.email || "",
                    phone: "",
                    contactFacebook: "",
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log("✅ Hồ sơ người dùng đã được tạo.");
            } else {
                console.log("📝 Hồ sơ đã có:", doc.data());
            }

            firebaseuiContainer.classList.add('hidden');
            loginBtn.classList.add('hidden');
            userProfileDiv.classList.remove('hidden');
            userProfileDiv.classList.add('flex');
            document.getElementById('user-avatar').src = user.photoURL || 'https://placehold.co/40x40/e2e8f0/64748b?text=A';
            addLocationBtn.disabled = false;

        } else {
            currentUser = null;
            loginBtn.classList.remove('hidden');
            userProfileDiv.classList.add('hidden');
            userProfileDiv.classList.remove('flex');
            exitAllModes();
            addLocationBtn.disabled = true;
        }
    });

    loginBtn.addEventListener('click', () => { if (ui.isPendingRedirect()) return; firebaseuiContainer.classList.remove('hidden'); ui.start('#firebaseui-widget', { signInFlow: 'popup', signInOptions: [ firebase.auth.GoogleAuthProvider.PROVIDER_ID, firebase.auth.EmailAuthProvider.PROVIDER_ID, ], callbacks: { signInSuccessWithAuthResult: function(authResult, redirectUrl) { firebaseuiContainer.classList.add('hidden'); return false; } } }); });
    logoutBtn.addEventListener('click', () => auth.signOut());
    firebaseuiContainer.addEventListener('click', (e) => { if (e.target === firebaseuiContainer) firebaseuiContainer.classList.add('hidden'); });

    const listingsCol = db.collection("listings");
    const q = listingsCol.where("status", "==", "approved").orderBy("createdAt", "desc");
    q.onSnapshot((querySnapshot) => {
        localListings = [];
        priceMarkers.clearLayers();
        const priceList = document.getElementById('price-list');
        priceList.innerHTML = '';
        if (querySnapshot.empty) { priceList.innerHTML = '<p class="text-center text-gray-500 py-4">📭 Không có dữ liệu.</p>'; return; }
        querySnapshot.forEach((doc) => {
            const item = doc.data();
            item.id = doc.id;
            localListings.push(item);
            if (!item.lat || !item.lng) return;
            const likeCount = localStorage.getItem(`like-${doc.id}`) || 0;
            const formattedPrice = `${item.priceValue} ${item.priceUnit}`;
            const popupContent = `<div class="p-2 text-sm leading-5 space-y-2 max-w-[260px]"><h3 class="font-bold text-base text-gray-800">${item.name}</h3><p><strong>Giá:</strong> <span class="font-semibold text-red-600">${formattedPrice}</span></p><p><strong>Diện tích:</strong> ${item.area ? item.area + ' m²' : 'N/A'}</p><p><strong>Ghi chú:</strong> ${item.notes || 'N/A'}</p><div class="flex space-x-3 text-xl justify-start pt-1 text-blue-600">${item.contactPhone ? `<a href="tel:${item.contactPhone}" title="Gọi"><i class="fas fa-phone text-red-500 hover:scale-110"></i></a>` : ''}${item.contactPhone ? `<a href="https://zalo.me/${item.contactPhone}" title="Zalo" target="_blank"><i class="fas fa-comment-dots text-blue-500 hover:scale-110"></i></a>` : ''}${item.contactEmail ? `<a href="mailto:${item.contactEmail}" title="Email"><i class="fas fa-envelope text-yellow-500 hover:scale-110"></i></a>` : ''}${item.contactFacebook ? `<a href="${item.contactFacebook.startsWith('http') ? item.contactFacebook : 'https://facebook.com/' + item.contactFacebook}" title="Facebook" target="_blank"><i class="fab fa-facebook text-blue-700 hover:scale-110"></i></a>` : ''}
            </div><div class="grid grid-cols-2 gap-2 mt-2">${item.lat && item.lng ? `<div><a href="https://www.google.com/maps?q=&layer=c&cbll=${item.lat},${item.lng}" target="_blank" class="block px-3 py-1 text-center text-sm font-semibold bg-green-100 text-green-800 rounded hover:bg-green-200">Street View</a></div>` : ''}${item.lat && item.lng ? `<div><a href="javascript:void(0)" onclick="getDirections(${item.lat}, ${item.lng})" class="block px-3 py-1 text-center text-sm font-semibold bg-blue-100 text-blue-800 rounded hover:bg-blue-200">Chỉ đường</a></div>` : ''}</div><div class="flex items-center justify-between pt-2"><button onclick="likePlace('${doc.id}')" class="text-red-500 text-lg">❤️ <span id="like-${doc.id}">${likeCount}</span></button><a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(location.href)}" target="_blank" title="Chia sẻ Facebook"><i class="fas fa-share text-gray-600 hover:text-blue-600"></i></a></div></div>`;
            const marker = L.marker([item.lat, item.lng]).bindPopup(popupContent);
            priceMarkers.addLayer(marker);
            const listItem = document.createElement('div');
            listItem.className = 'p-2 border-b cursor-pointer hover:bg-gray-100';
            listItem.innerHTML = `<p class="font-semibold">${item.name}</p><p class="text-sm text-red-600">${formattedPrice}</p>`;
            listItem.onclick = () => { listModal.classList.add('hidden'); map.setView([item.lat, item.lng], 18); marker.openPopup(); };
            priceList.appendChild(listItem);
        });
    });
    
    // Đóng submenu chia sẻ khi click ra ngoài
    document.addEventListener('click', function(e) {
        const submenu = document.getElementById('share-submenu');
        const isShareBtn = e.target.closest('#panel-actions button');
        if (submenu && submenu.classList.contains('is-visible') && !isShareBtn) {
            submenu.classList.remove('is-visible');
        }
    });

    handleUrlParameters();

    // 1. Xử lý lưu hồ sơ khi submit form
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

    // 2. Xử lý nút Hủy trong modal
    document.getElementById('close-profile-btn').addEventListener('click', () => {
    document.getElementById('profile-modal').classList.add('hidden');
    });


}); // --- END OF DOMContentLoaded ---