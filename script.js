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

// --- MAPBOX ACCESS TOKEN (Dùng cho Geocoding) ---
const mapboxGeocodingToken = "pk.eyJ1IjoiaHZkdW9jIiwiYSI6ImNtZDFwcjVxYTAzOGUybHEzc3ZrNTJmcnIifQ.D5VlPC8c_n1i3kezgqtzwg";

// --- SERVICE INITIALIZATION ---
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

async function getCachedAddress(lat, lng) {
  const key = `addr:${lat.toFixed(5)},${lng.toFixed(5)}`;
  const cached = localStorage.getItem(key);
  if (cached) return cached;

  try {
    const endpointUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxGeocodingToken}&language=vi&limit=1`;
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


// --- APPLICATION LOGIC WRAPPER ---
document.addEventListener('DOMContentLoaded', () => {

    // --- MAP AND LAYERS INITIALIZATION ---
    const map = L.map('map', { center: [16.054456, 108.202167], zoom: 13, zoomControl: false });
    const myAttribution = '© XemGiaDat | Dữ liệu © Sở TNMT Đà Nẵng';
    const googleStreets = L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',{ maxZoom: 20, subdomains:['mt0','mt1','mt2','mt3'], attribution: myAttribution + ' | © Google Maps' });
    const googleSat = L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',{ maxZoom: 20, subdomains:['mt0','mt1','mt2','mt3'], attribution: myAttribution + ' | © Google Satellite' });
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: myAttribution + ' | © OpenStreetMap' });

    // --- ĐOẠN CODE TÍCH HỢP BẢN ĐỒ PHÂN LÔ TỪ MAPBOX ---

    // 1. Thông tin từ tài khoản Mapbox của bạn
    const mapboxVectorTileToken = 'pk.eyJ1IjoiaHZkdW9jIiwiYSI6ImNtZDFwcjVxYTAzOGUybHEzc3ZrNTJmcnIifQ.D5VlPC8c_n1i3kezgqtzwg'; // Public Token của bạn
    const tilesetId = 'hvduoc.danang_parcels_final'; // ID của tileset đã upload thành công

    // Biến để lưu ID của thửa đất đang được highlight
    let highlightedFeature = null;

    // 2. URL để tải vector tiles
    const tileUrl = `https://api.mapbox.com/v4/${tilesetId}/{z}/{x}/{y}.mvt?access_token=${mapboxVectorTileToken}`;

    // 3. Tùy chọn cho lớp vector tiles
    const vectorTileOptions = {
        rendererFactory: L.canvas.tile,
        vectorTileLayerStyles: {
            'danang_full': { // Tên layer bên trong file mbtiles
                color: "#FBBF24",
                weight: 1,
                fillOpacity: 0.1,
                fillColor: "#FBBF24",
                fill: true
            }
        },
        interactive: true,
        getFeatureId: function(feature) {
            return feature.properties.OBJECTID;
        }
    };

    // 4. Tạo lớp bản đồ phân lô và thêm vào bản đồ
    const parcelLayer = L.vectorGrid.protobuf(tileUrl, vectorTileOptions).addTo(map);

    // 5. Gán sự kiện click SAU KHI layer đã được tạo
    parcelLayer.on('click', function(e) {
        L.DomEvent.stop(e); // Ngăn sự kiện click lan xuống bản đồ
        const props = e.layer.properties;
        const latLng = e.latlng;

        // Xóa highlight cũ (nếu có)
        if (highlightedFeature) {
            parcelLayer.resetFeatureStyle(highlightedFeature);
        }

        // Highlight thửa đất mới được chọn
        highlightedFeature = props.OBJECTID;
        parcelLayer.setFeatureStyle(highlightedFeature, {
            color: '#EF4444',
            weight: 3,
            fillColor: '#EF4444',
            fillOpacity: 0.3
        });

        // Chuẩn hóa tên thuộc tính để hàm showInfoPanel có thể đọc được
        const formattedProps = {
            'Số thửa': props.SoThuaTuThua,
            'Số hiệu tờ bản đồ': props.SoHieuToBanDo,
            'Diện tích': props.DienTich,
            'Ký hiệu mục đích sử dụng': props.KyHieuMucDichSuDung,
        };
        
        showInfoPanel('Thông tin Thửa đất', formattedProps, latLng.lat, latLng.lng);
    });

    // --- KẾT THÚC ĐOẠN CODE TÍCH HỢP ---
    
    const baseMaps = { "Ảnh vệ tinh": googleSat, "Bản đồ đường": googleStreets, "OpenStreetMap": osmLayer };
    const overlayMaps = { "🗺️ Bản đồ phân lô": parcelLayer };
    
    googleStreets.addTo(map);
    L.control.layers(baseMaps, overlayMaps, { position: 'bottomright' }).addTo(map);

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

    // --- STATE & GLOBAL VARIABLES ---
    let currentUser = null;
    let tempMarker = null;
    let selectedCoords = null;
    let isAddMode = false;
    // let isQueryMode = false; // Biến này không còn cần thiết
    let localListings = [];
    let debounceTimer;
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
        
        // Địa chỉ sẽ được lấy tự động khi cần, không lấy từ props của thửa đất nữa
        getCachedAddress(lat, lng).then(diaChi => {
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
        });

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

        let adminDeleteButtonHtml = '';
        if (isAdmin) {
            adminDeleteButtonHtml = `<a class="action-button admin-delete-button" onclick="deleteListing('${item.id}')">
                <i class="fas fa-trash-alt"></i>
                <span>Xóa tin</span>
            </a>`;
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
            <div class="price-highlight">${price}</div>
            <div class="info-pills">
                <span class="pill-item"><i class="fas fa-ruler-combined"></i> ${area}</span>
                <span class="pill-item"><i class="fas fa-pen"></i> ${notes}</span>
            </div>
            <div class="address-actions-group">
                <div class="address-text"><i class="fas fa-map-marker-alt"></i> ${fetchedAddress}</div>
                <div class="action-buttons-group">
                    <a class="action-button" onclick="getDirections(${lat}, ${lng})">
                        <i class="fas fa-directions"></i>
                        <span>Chỉ đường</span>
                    </a>
                    <a class="action-button" onclick="openStreetView(${lat}, ${lng})">
                        <i class="fas fa-street-view"></i>
                        <span>Street View</span>
                    </a>
                    <a class="action-button" onclick="copyLocationLink(${lat}, ${lng})">
                        <i class="fas fa-link"></i>
                        <span>Sao chép</span>
                    </a>
                    ${adminDeleteButtonHtml}
                </div>
            </div>
            <div class="poster-card">
                <img src="${userProfile.avatar}" alt="Avatar" class="poster-avatar-small">
                <div class="poster-name">${userProfile.name}</div>
                <div class="poster-contact-buttons">${contactIconsHtml}</div>
            </div>
        `;

        infoPanel.classList.remove('is-collapsed');
        infoPanel.classList.add('is-open');
    }

    function hideInfoPanel() {
        infoPanel.classList.remove('is-open');
        actionToolbar.classList.remove('is-raised', 'is-partially-raised');
        // Cập nhật logic để reset style của thửa đất đã highlight
        if (highlightedFeature) {
            parcelLayer.resetFeatureStyle(highlightedFeature);
            highlightedFeature = null;
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
    
    function handleUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        const lat = urlParams.get('lat');
        const lng = urlParams.get('lng');
        if (lat && lng) {
            const targetLatLng = L.latLng(parseFloat(lat), parseFloat(lng));
            map.setView(targetLatLng, 19);
            // Hiện tại không thể tự động query khi tải trang với vector tiles
        }
    }

    function enterAddMode() {
        exitAllModes();
        isAddMode = true;
        map.getContainer().classList.add('map-add-mode');
        instructionBanner.textContent = 'Nhấp vào bản đồ để chọn vị trí cần thêm.';
        instructionBanner.classList.remove('hidden');
    }

    function exitAllModes() {
        isAddMode = false;
        map.getContainer().classList.remove('map-add-mode');
        instructionBanner.classList.add('hidden');
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
        if (!listingId) return;
        if (confirm('Bạn có chắc chắn muốn xóa vĩnh viễn tin đăng này không?')) {
            try {
                await db.collection('listings').doc(listingId).delete();
                alert('Đã xóa tin đăng thành công!');
                hideInfoPanel();
                // Không cần reload toàn bộ trang
            } catch (error) {
                console.error("Lỗi khi xóa tin đăng: ", error);
                alert('Có lỗi xảy ra khi xóa tin đăng.');
            }
        }
    }

    window.getDirections = function(toLat, toLng) {
        if (!navigator.geolocation) { alert('Trình duyệt của bạn không hỗ trợ định vị.'); return; }
        navigator.geolocation.getCurrentPosition( (position) => {
            const fromLat = position.coords.latitude;
            const fromLng = position.coords.longitude;
            const url = `https://www.google.com/maps/dir/?api=1&origin=${fromLat},${fromLng}&destination=${toLat},${toLng}`;
            window.open(url, '_blank');
        }, () => {
            alert('Không thể lấy được vị trí của bạn. Vui lòng kiểm tra quyền truy cập vị trí của trình duyệt.');
        });
    };

    window.copyLocationLink = function(lat, lng) {
        const url = `${window.location.origin}${window.location.pathname}?lat=${lat}&lng=${lng}`;
        navigator.clipboard.writeText(url).then(() => {
            alert('Đã sao chép liên kết vị trí!');
        }).catch(err => console.error('Lỗi sao chép: ', err));
    }

    window.toggleShareMenu = function() {
        document.getElementById('share-submenu')?.classList.toggle('is-visible');
    };

    window.share = function(platform, lat, lng, soTo, soThua) {
        const url = `${window.location.origin}${window.location.pathname}?lat=${lat}&lng=${lng}`;
        const text = `Khám phá thửa đất (Tờ: ${soTo}, Thửa: ${soThua}) tại Đà Nẵng trên Bản đồ Giá đất Cộng đồng!`;
        let shareUrl = '';

        if (platform === 'facebook') {
            shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`;
        } else if (platform === 'whatsapp') {
            shareUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`;
        }

        if (shareUrl) {
            window.open(shareUrl, '_blank', 'width=600,height=400');
        }
        toggleShareMenu();
    };
    
    // --- SEARCH LOGIC (Chưa thể tìm theo thửa đất với vector tiles) ---
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
        const endpointUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxGeocodingToken}&country=VN&language=vi&autocomplete=true&proximity=${mapCenter.lng},${mapCenter.lat}`;
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

    userProfileDiv.addEventListener('click', (event) => {
        event.stopPropagation();
        profileMenu.classList.toggle('hidden');
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

    document.addEventListener('click', (event) => {
        if (!profileMenu.classList.contains('hidden') && !userProfileDiv.contains(event.target) && !profileMenu.contains(event.target)) {
            profileMenu.classList.add('hidden');
        }
    });   

    contactInfoBtn.addEventListener('click', () => {
        contactInfoModal.classList.remove('hidden');
    });

    closeContactModalBtn.addEventListener('click', () => {
        contactInfoModal.classList.add('hidden');
    });

    contactInfoModal.addEventListener('click', (e) => {
        if (e.target === contactInfoModal) {
            contactInfoModal.classList.add('hidden');
        }
    });
    
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
                showListingInfoPanel(listing);
            }
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
        // Không ẩn panel thông tin khi click ra ngoài bản đồ, chỉ ẩn khi click vào thửa đất khác
        if (isAddMode) {
            if (!currentUser) { alert("Vui lòng đăng nhập để thêm địa điểm!"); exitAllModes(); return; }
            selectedCoords = e.latlng;
            tempMarker = L.marker(selectedCoords).addTo(map);
            modal.classList.remove('hidden');
            getCachedAddress(selectedCoords.lat, selectedCoords.lng).then(address => {
                document.getElementById('address-input').value = address;
            });
        }
    });

    // Cập nhật logic cho thanh trượt
    opacitySlider.addEventListener('input', (e) => {
        parcelLayer.setStyle({
            opacity: e.target.value,
            fillOpacity: e.target.value * 0.15
        });
    });

    map.on('overlayadd', e => {
        if (e.name === '🗺️ Bản đồ phân lô') {
            opacityControl.classList.remove('hidden');
        }
    });

    map.on('overlayremove', e => {
        if (e.name === '🗺️ Bản đồ phân lô') {
            opacityControl.classList.add('hidden');
        }
    });

    if (map.hasLayer(parcelLayer)) {
        opacityControl.classList.remove('hidden');
    } else {
        opacityControl.classList.add('hidden');
    }

    donateBtn.addEventListener('click', () => donateModal.classList.remove('hidden'));
    closeDonateModalBtn.addEventListener('click', () => donateModal.classList.add('hidden'));
    donateModal.addEventListener('click', (e) => { if (e.target === donateModal) donateModal.classList.add('hidden'); });
    copyBtn.addEventListener('click', () => { navigator.clipboard.writeText(accountNumber) });
    
    addLocationBtn.addEventListener('click', () => {
        if (!currentUser) {
            alert("Vui lòng đăng nhập để thêm địa điểm!");
            return;
        }
        prefillUserContact();
        isAddMode ? exitAllModes() : enterAddMode();
    });

    // Nút tra cứu bây giờ chỉ mang tính thông tin, không cần gán sự kiện
    // queryBtn.addEventListener('click', () => { ... });

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
            const docData = { 
                userId: currentUser.uid, 
                userName: currentUser.displayName, 
                userAvatar: currentUser.photoURL, 
                lat: selectedCoords.lat, 
                lng: selectedCoords.lng, 
                priceValue: parseFloat(data.priceValue), 
                area: data.area ? parseFloat(data.area) : null, 
                status: 'approved', // Mặc định duyệt
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                name: data.name, 
                priceUnit: data.priceUnit, 
                notes: data.notes || '', 
                contactName: data.contactName || '', 
                contactEmail: data.contactEmail || '', 
                contactPhone: data.contactPhone || '', 
                contactFacebook: data.contactFacebook || '' 
            };
            await db.collection("listings").add(docData);
            alert('Gửi dữ liệu thành công, cảm ơn bạn đã đóng góp!');
            modal.classList.add('hidden'); form.reset(); exitAllModes();
        } catch (error) { 
            console.error("Lỗi khi thêm dữ liệu: ", error); 
            alert("Đã xảy ra lỗi khi gửi dữ liệu."); 
        } finally { 
            submitBtn.textContent = 'Gửi Dữ Liệu'; 
            submitBtn.disabled = false; 
        }
    });

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
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

    loginBtn.addEventListener('click', () => { 
        if (ui.isPendingRedirect()) return; 
        firebaseuiContainer.classList.remove('hidden'); 
        ui.start('#firebaseui-widget', { 
            signInFlow: 'popup', 
            signInOptions: [ 
                firebase.auth.GoogleAuthProvider.PROVIDER_ID, 
                firebase.auth.EmailAuthProvider.PROVIDER_ID, 
            ], 
            callbacks: { 
                signInSuccessWithAuthResult: function(authResult, redirectUrl) { 
                    firebaseuiContainer.classList.add('hidden'); 
                    return false; 
                } 
            } 
        }); 
    });
    firebaseuiContainer.addEventListener('click', (e) => { if (e.target === firebaseuiContainer) firebaseuiContainer.classList.add('hidden'); });

    const listingsCol = db.collection("listings");
    const q = listingsCol.where("status", "==", "approved").orderBy("createdAt", "desc");
    q.onSnapshot((querySnapshot) => {
        localListings = [];
        priceMarkers.clearLayers();
        const priceList = document.getElementById('price-list');
        priceList.innerHTML = '';
        if (querySnapshot.empty) { 
            priceList.innerHTML = '<p class="text-center text-gray-500 py-4">📭 Không có dữ liệu.</p>'; 
            return; 
        }
        querySnapshot.forEach((doc) => {
            const item = doc.data();
            item.id = doc.id;
            localListings.push(item);
            if (!item.lat || !item.lng) return;
            const marker = L.marker([item.lat, item.lng]);
            marker.on('click', () => {
                showListingInfoPanel(item);
            });
            priceMarkers.addLayer(marker);
            const listItem = document.createElement('div');
            listItem.className = 'p-2 border-b cursor-pointer hover:bg-gray-100';
            const formattedPrice = `${item.priceValue} ${item.priceUnit}`;
            listItem.innerHTML = `<p class="font-semibold">${item.name}</p><p class="text-sm text-red-600">${formattedPrice}</p>`;
            listItem.onclick = () => {
                listModal.classList.add('hidden');
                map.setView([item.lat, item.lng], 18);
                showListingInfoPanel(item);
            };
            priceList.appendChild(listItem);
        });
    });
    
    document.addEventListener('click', function(e) {
        const submenu = document.getElementById('share-submenu');
        const isShareBtn = e.target.closest('#panel-actions button');
        if (submenu && submenu.classList.contains('is-visible') && !isShareBtn) {
            submenu.classList.remove('is-visible');
        }
    });

    handleUrlParameters();

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

}); // --- END OF DOMContentLoaded ---
