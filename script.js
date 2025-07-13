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
    const firebaseuiContainer = document.getElementById('firebaseui-auth-container');
    const ui = new firebaseui.auth.AuthUI(auth);
    const opacityControl = document.getElementById('opacity-control');
    const opacitySlider = document.getElementById('opacity-slider');
    const donateBtn = document.getElementById('donate-btn');
    const donateModal = document.getElementById('donate-modal');
    const closeDonateModalBtn = document.getElementById('close-donate-modal');
    const copyBtn = document.getElementById('copy-stk-btn');
    const accountNumber = document.getElementById('bank-account-number').textContent;
    const fabMainBtn = document.getElementById('fab-main-btn');
    const fabActions = document.getElementById('fab-actions');
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
    let priceMarkers = L.markerClusterGroup({
        iconCreateFunction: function (cluster) {
            const count = cluster.getChildCount();
            let size = ' marker-cluster-';
            if (count < 10) size += 'small'; else if (count < 100) size += 'medium'; else size += 'large';
            return new L.DivIcon({ html: '<div><span>' + count + '</span></div>', className: 'marker-cluster marker-cluster-yellow' + size, iconSize: new L.Point(40, 40) });
        }
    }).addTo(map);

    // --- HELPER FUNCTIONS ---
    function showInfoPanel(title, props, lat, lng) {
        infoPanel.classList.remove('is-collapsed');
        const icon = togglePanelBtn.querySelector('i');
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');

        panelTitle.textContent = title;
        const soTo = props['Số hiệu tờ bản đồ'] ?? 'N/A';
        const soThua = props['Số thửa'] ?? 'N/A';
        const loaiDat = props['Ký hiệu mục đích sử dụng'] ?? 'N/A';
        const dienTich = props['Diện tích'] ? parseFloat(props['Diện tích']).toFixed(1) : 'N/A';
        const diaChi = (props['Địa chỉ'] && props['Địa chỉ'] !== 'Null') ? props['Địa chỉ'] : 'Chưa có';

        panelContent.innerHTML = `
            <div class="info-row">
                <span class="text-gray-500">Tờ:</span><strong class="text-gray-800 ml-1 mr-3">${soTo}</strong>
                <span class="text-gray-500">Thửa:</span><strong class="text-gray-800 ml-1 mr-3">${soThua}</strong>
                <span class="text-gray-500">Loại:</span><strong class="text-gray-800 ml-1 mr-3">${loaiDat}</strong>
                <span class="text-gray-500">DT:</span><strong class="text-gray-800 ml-1">${dienTich} m²</strong>
            </div>
             <div class="info-row pt-1">
                <span class="text-gray-500 mr-2">Địa chỉ:</span>
                <span class="font-semibold text-gray-800 text-left">${diaChi}</span>
            </div>
            <div id="panel-actions">
                <button onclick="toggleLike(this)"><i class="icon far fa-heart text-red-500"></i><span class="text">Thích</span></button>
                <button onclick="copyLocationLink(${lat}, ${lng})"><i class="icon fas fa-link text-gray-500"></i><span class="text">Sao chép</span></button>
                <button onclick="shareOnFacebook(${lat}, ${lng}, '${soTo}', '${soThua}')"><i class="icon fab fa-facebook-f text-blue-600"></i><span class="text">Chia sẻ</span></button>
            </div>
        `;
        
        infoPanel.classList.add('is-open');
    }
    
    function hideInfoPanel() {
        infoPanel.classList.remove('is-open');
        if (highlightedParcel) map.removeLayer(highlightedParcel);
        dimensionMarkers.clearLayers();
        highlightedParcel = null;
    }

    function performCadastralQuery(latlng) {
        hideInfoPanel();
        L.popup().setLatLng(latlng).setContent('<p>Đang tìm kiếm thông tin thửa đất...</p>').openOn(map);
        parcelLayer.identify().on(map).at(latlng).run((error, featureCollection) => {
            map.closePopup();
            if (error || featureCollection.features.length === 0) {
                L.popup().setLatLng(latlng).setContent('Không tìm thấy thông tin địa chính tại vị trí này.').openOn(map);
            } else {
                const feature = featureCollection.features[0];
                const props = feature.properties;
                const lat = latlng.lat.toFixed(6), lng = latlng.lng.toFixed(6);
                
                const outlineStyle = { color: '#4A5568', weight: 5, opacity: 0.7 };
                const fillStyle = { color: '#FFD700', weight: 3, opacity: 1 };
                const outlineLayer = L.geoJSON(feature.geometry, { style: outlineStyle });
                const fillLayer = L.geoJSON(feature.geometry, { style: fillStyle });
                highlightedParcel = L.layerGroup([outlineLayer, fillLayer]).addTo(map);

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
                showInfoPanel('Thông tin Thửa đất', props, lat, lng);
            }
        });
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
        instructionBanner.textContent = 'Nhấp vào bản đồ để chọn vị trí cần thêm.';
        instructionBanner.classList.remove('hidden');
    }
    function enterQueryMode() {
        exitAllModes();
        isQueryMode = true;
        map.getContainer().classList.add('map-query-mode');
        instructionBanner.textContent = 'Nhấp vào vị trí trên bản đồ để tra cứu thông tin thửa đất.';
        instructionBanner.classList.remove('hidden');
    }
    function exitAllModes() {
        isAddMode = false;
        isQueryMode = false;
        map.getContainer().classList.remove('map-add-mode', 'map-query-mode');
        instructionBanner.classList.add('hidden');
        if (tempMarker) {
            map.removeLayer(tempMarker);
            tempMarker = null;
        }
    }
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
    window.shareOnFacebook = function(lat, lng, soTo, soThua) {
        const url = `${window.location.origin}${window.location.pathname}?lat=${lat}&lng=${lng}`;
        const quoteText = `Khám phá thông tin một thửa đất thú vị tại Đà Nẵng! (Số tờ: ${soTo}, Số thửa: ${soThua}). Cùng xem trên Bản đồ Giá đất Cộng đồng!`;
        const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(quoteText)}`;
        window.open(fbShareUrl, '_blank', 'width=600,height=400');
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
        const query = L.esri.query({
            url: 'https://gisportal.danang.gov.vn/server/rest/services/DiaChinh/DaNangLand_DiaChinh/MapServer/35'
        });
        const whereClause = `[Số hiệu tờ bản đồ] = ${soTo} AND [Số thửa] = ${soThua}`;
        query.where(whereClause);
        let html = '';
        try {
            const response = await new Promise((resolve, reject) => {
                query.run((error, featureCollection) => error ? reject(error) : resolve(featureCollection));
            });
            if (response.features.length > 0) {
                html += `<div class="result-category">Kết quả cho Tờ: ${soTo} / Thửa: ${soThua}</div>`;
                response.features.forEach(feature => {
                    const diaChi = feature.properties.DiaChiThuaDat || `Thửa đất ${soThua}, tờ bản đồ ${soTo}`;
                    const geometry = JSON.stringify(feature.geometry);
                    html += `<div class="result-item" data-type="parcel" data-geometry='${geometry}'><i class="icon fa-solid fa-draw-polygon"></i><span>${diaChi}</span></div>`;
                });
            }
        } catch (error) { console.error("Lỗi truy vấn thửa đất:", error); }
        searchResultsContainer.innerHTML = html === '' ? '<div class="p-4 text-center text-gray-500">Không tìm thấy thửa đất với số tờ/số thửa này.</div>' : html;
    };

    const performSearch = async (query) => {
        const parcelRegex = /^\s*(\d+)\s*\/\s*(\d+)\s*$/;
        const match = query.match(parcelRegex);
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
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => { performSearch(e.target.value.trim()); }, 300);
    });

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
                priceMarkers.eachLayer(marker => {
                    if (marker.getLatLng().lat === listing.lat && marker.getLatLng().lng === listing.lng) marker.openPopup();
                });
            }
        } else if (type === 'parcel') {
            const geometry = JSON.parse(item.dataset.geometry);
            const outlineStyle = { color: '#4A5568', weight: 5, opacity: 0.7 };
            const fillStyle = { color: '#FFD700', weight: 3, opacity: 1 };
            const outlineLayer = L.geoJSON(geometry, { style: outlineStyle });
            const fillLayer = L.geoJSON(geometry, { style: fillStyle });
            highlightedParcel = L.layerGroup([outlineLayer, fillLayer]).addTo(map);
            map.fitBounds(L.geoJSON(geometry).getBounds());
        }
        searchResultsContainer.classList.add('hidden');
        searchInput.value = '';
    });
    
    closePanelBtn.addEventListener('click', hideInfoPanel);
    
    togglePanelBtn.addEventListener('click', () => {
        infoPanel.classList.toggle('is-collapsed');
        const icon = togglePanelBtn.querySelector('i');
        icon.classList.toggle('fa-chevron-down');
        icon.classList.toggle('fa-chevron-up');
    });

    map.on('click', function(e) {
        searchResultsContainer.classList.add('hidden');
        hideInfoPanel();
        if (isAddMode) {
            if (!currentUser) { alert("Vui lòng đăng nhập để thêm địa điểm!"); exitAllModes(); return; }
            selectedCoords = e.latlng;
            tempMarker = L.marker(selectedCoords).addTo(map);
            modal.classList.remove('hidden');
            const geocodeService = L.esri.Geocoding.geocodeService();
            geocodeService.reverse().latlng(selectedCoords).run(function (error, result) {
                if (error || !result.address) { document.getElementById('address-input').value = 'Không tìm thấy địa chỉ';
                } else { document.getElementById('address-input').value = result.address.Match_addr; }
            });
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
    copyBtn.addEventListener('click', () => { navigator.clipboard.writeText(accountNumber).then(() => { const originalIcon = copyBtn.innerHTML; copyBtn.innerHTML = '<svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>'; setTimeout(() => { copyBtn.innerHTML = originalIcon; }, 1500); }).catch(err => console.error('Không thể sao chép: ', err)); });
    
    fabMainBtn.addEventListener('click', () => {
        fabActions.classList.toggle('hidden');
        fabMainBtn.querySelector('i').classList.toggle('fa-bars');
        fabMainBtn.querySelector('i').classList.toggle('fa-xmark');
    });
    addLocationBtn.addEventListener('click', () => { if (!currentUser) { alert("Vui lòng đăng nhập để thêm địa điểm!"); return; } isAddMode ? exitAllModes() : enterAddMode(); });
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
            await db.collection("listings").add(docData);
            alert('Gửi dữ liệu thành công, cảm ơn bạn đã đóng góp!');
            modal.classList.add('hidden'); form.reset(); exitAllModes();
        } catch (error) { console.error("Lỗi khi thêm dữ liệu: ", error); alert("Đã xảy ra lỗi khi gửi dữ liệu."); } finally { submitBtn.textContent = 'Gửi Dữ Liệu'; submitBtn.disabled = false; }
    });

    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            firebaseuiContainer.classList.add('hidden');
            loginBtn.classList.add('hidden');
            userProfileDiv.classList.remove('hidden');
            userProfileDiv.classList.add('flex');
            document.getElementById('user-avatar').src = user.photoURL || 'https://placehold.co/40x40/e2e8f0/64748b?text=A';
            [addLocationBtn, listBtn].forEach(btn => { btn.disabled = false; });
        } else {
            currentUser = null;
            loginBtn.classList.remove('hidden');
            userProfileDiv.classList.add('hidden');
            userProfileDiv.classList.remove('flex');
            exitAllModes();
            [addLocationBtn, listBtn].forEach(btn => { btn.disabled = true; });
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
            const googleMapsUrl = `https://www.google.com/maps?q=${item.lat},${item.lng}`;
            const popupContent = `<div class="p-2 text-sm leading-5 space-y-2 max-w-[260px]"><h3 class="font-bold text-base text-gray-800">${item.name}</h3><p><strong>Giá:</strong> <span class="font-semibold text-red-600">${formattedPrice}</span></p><p><strong>Diện tích:</strong> ${item.area ? item.area + ' m²' : 'N/A'}</p><p><strong>Ghi chú:</strong> ${item.notes || 'N/A'}</p><div class="flex space-x-3 text-xl justify-start pt-1 text-blue-600">${item.contactPhone ? `<a href="tel:${item.contactPhone}" title="Gọi"><i class="fas fa-phone text-red-500 hover:scale-110"></i></a>` : ''}${item.contactPhone ? `<a href="https://zalo.me/${item.contactPhone}" title="Zalo" target="_blank"><i class="fas fa-comment-dots text-blue-500 hover:scale-110"></i></a>` : ''}${item.contactEmail ? `<a href="mailto:${item.contactEmail}" title="Email"><i class="fas fa-envelope text-yellow-500 hover:scale-110"></i></a>` : ''}${item.contactFacebook ? `<a href="${item.contactFacebook}" title="Facebook" target="_blank"><i class="fab fa-facebook text-blue-700 hover:scale-110"></i></a>` : ''}</div>${item.lat && item.lng ? `<div><a href="${googleMapsUrl}" target="_blank" class="block mt-2 px-3 py-1 text-center text-sm font-semibold bg-green-100 text-green-800 rounded hover:bg-green-200">👁️ Xem trên Google Maps</a></div>` : ''}<div class="flex items-center justify-between pt-2"><button onclick="likePlace('${doc.id}')" class="text-red-500 text-lg">❤️ <span id="like-${doc.id}">${likeCount}</span></button><a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(location.href)}" target="_blank" title="Chia sẻ Facebook"><i class="fas fa-share text-gray-600 hover:text-blue-600"></i></a></div></div>`;
            const marker = L.marker([item.lat, item.lng]).bindPopup(popupContent);
            priceMarkers.addLayer(marker);
            const listItem = document.createElement('div');
            listItem.className = 'p-2 border-b cursor-pointer hover:bg-gray-100';
            listItem.innerHTML = `<p class="font-semibold">${item.name}</p><p class="text-sm text-red-600">${formattedPrice}</p>`;
            listItem.onclick = () => {
                listModal.classList.add('hidden');
                map.setView([item.lat, item.lng], 18);
                marker.openPopup();
            };
            priceList.appendChild(listItem);
        });
    });
    
    handleUrlParameters();

}); // --- END OF DOMContentLoaded ---