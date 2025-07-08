// ✅ THAY THẾ TOÀN BỘ SCRIPT CŨ BẰNG SCRIPT NÀY

// --- PHẦN 1: KHỞI TẠO TOÀN CỤC (CHẠY NGAY LẬP TỨC) ---

// Cấu hình Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDu9tYpJdMPT7Hvk2_Ug8XHwxRQXoakRfs",
    authDomain: "xemgiadat-dfe15.firebaseapp.com",
    projectId: "xemgiadat-dfe15",
    storageBucket: "xemgiadat-dfe15.appspot.com",
    messagingSenderId: "361952598367",
    appId: "1:361952598367:web:c1e2e3b1a6d5d8c797beea"
};

// Khởi tạo các dịch vụ
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Khởi tạo bản đồ và các lớp
const map = L.map('map', { center: [16.054456, 108.202167], zoom: 13, zoomControl: false });
const myAttribution = '© XemGiaDat.com | Dữ liệu © Sở TNMT Đà Nẵng';
const googleSat = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',{ maxZoom: 20, subdomains:['mt0','mt1','mt2','mt3'], attribution: myAttribution });
const googleStreets = L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',{ maxZoom: 20, subdomains:['mt0','mt1','mt2','mt3'], attribution: myAttribution });
const parcelLayer = L.esri.featureLayer({
    url: 'https://gisportal.danang.gov.vn/server/rest/services/DiaChinh/DaNangLand_DiaChinh/MapServer/0',
    style: () => ({ color: '#0078A8', weight: 1.5, fillOpacity: 0.1 })
});
const baseMaps = { "Ảnh vệ tinh": googleSat, "Bản đồ đường": googleStreets };
const overlayMaps = { "🗺️ Bản đồ Địa chính": parcelLayer };
googleSat.addTo(map);
parcelLayer.addTo(map);
L.control.layers(baseMaps, overlayMaps, { position: 'topright' }).addTo(map);

// --- PHẦN 2: LOGIC CHÍNH (CHẠY SAU KHI TRANG ĐÃ TẢI XONG) ---

document.addEventListener('DOMContentLoaded', () => {

    // --- LẤY CÁC ĐỐI TƯỢNG DOM ---
    const mapContainer = document.getElementById('map');
    const addLocationBtn = document.getElementById('add-location-btn');
    const listBtn = document.getElementById('list-btn');
    const donateBtn = document.getElementById('donate-btn');
    const listModal = document.getElementById('price-list-modal');
    const closeListBtn = document.getElementById('close-list-btn');
    const donateModal = document.getElementById('donate-modal');
    const closeDonateModalBtn = document.getElementById('close-donate-modal');
    const copyBtn = document.getElementById('copy-stk-btn');
    const loadingSpinner = document.getElementById('loading-spinner');
    
    // --- BIẾN TRẠNG THÁI ---
    let currentUser = null;
    let isAddMode = false;
    let priceMarkers = L.markerClusterGroup({/* ... cấu hình cluster ... */}).addTo(map);
    const dimensionLayers = L.layerGroup().addTo(map);

    // --- KHỞI TẠO TÍNH NĂNG ---
    const searchControl = L.esri.Geocoding.geosearch({ useMapBounds: true }).addTo(map);

    // --- CÁC HÀM QUẢN LÝ ---
    function exitAllModes() { /* ... giữ nguyên hàm này ... */ }
    function drawDimensions(latlngs) { /* ... giữ nguyên hàm này ... */ }
    
    // --- CÁC SỰ KIỆN CLICK ---
    map.on('click', (e) => {
        if (isAddMode) { /* ... logic thêm điểm ... */ } 
        else if (!e.originalEvent.target.classList.contains('leaflet-interactive')) {
            dimensionLayers.clearLayers();
        }
    });

    parcelLayer.on('click', (evt) => {
        dimensionLayers.clearLayers();
        const props = evt.layer.feature.properties;
        const latlngs = evt.layer.getLatLngs()[0];
        if (latlngs && latlngs.length > 0) drawDimensions(latlngs);
        const popupContent = `...`; // Nội dung popup địa chính
        L.popup({ minWidth: 220, maxWidth: 280 }).setLatLng(evt.latlng).setContent(popupContent).openOn(map);
    });
    
    listBtn.addEventListener('click', () => listModal.classList.remove('hidden'));
    closeListBtn.addEventListener('click', () => listModal.classList.add('hidden'));
    donateBtn.addEventListener('click', () => donateModal.classList.remove('hidden'));
    closeDonateModalBtn.addEventListener('click', () => donateModal.classList.add('hidden'));
    copyBtn.addEventListener('click', () => { /* ... logic sao chép ... */ });

    // --- XỬ LÝ DỮ LIỆU TỪ FIRESTORE ---
    const listingsCol = db.collection("listings");
    const q = listingsCol.where("status", "==", "approved").orderBy("createdAt", "desc");

    q.onSnapshot((querySnapshot) => {
        priceMarkers.clearLayers();
        const priceList = document.getElementById('price-list');
        priceList.innerHTML = '';
        if(loadingSpinner) loadingSpinner.style.display = 'none';

        if (querySnapshot.empty) {
            priceList.innerHTML = '<p>...</p>';
            return;
        }

        const allMarkers = {};
        querySnapshot.forEach((doc) => {
            // ... logic tạo marker và popup cho ghim giá đất ...
            // ... gán allMarkers[doc.id] = marker; ...
        });

        // Xử lý link chia sẻ
        try {
            // ... logic xử lý link chia sẻ của bạn ...
        } catch (error) {
            console.error("Lỗi URL:", error);
        }
    });

    // --- XỬ LÝ XÁC THỰC ---
    auth.onAuthStateChanged((user) => {
        const loginBtn = document.getElementById('login-btn');
        const userProfileWidget = document.getElementById('user-profile-widget');
        
        if (user) {
            currentUser = user;
            loginBtn.classList.add('hidden');
            userProfileWidget.classList.remove('hidden');
            // ... logic cập nhật avatar và sự kiện click logout/widget ...
            [addLocationBtn, listBtn].forEach(btn => btn.disabled = false);
        } else {
            currentUser = null;
            loginBtn.classList.remove('hidden');
            userProfileWidget.classList.add('hidden');
            // ... logic khóa nút ...
        }
    });
});