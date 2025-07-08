// ✅ SCRIPT.JS PHIÊN BẢN CUỐI CÙNG - ĐÃ SỬA LỖI

// --- PHẦN 1: KHỞI TẠO FIREBASE (CÓ THỂ CHẠY NGAY) ---
const firebaseConfig = {
    apiKey: "AIzaSyDu9tYpJdMPT7Hvk2_Ug8XHwxRQXoakRfs",
    authDomain: "xemgiadat-dfe15.firebaseapp.com",
    projectId: "xemgiadat-dfe15",
    storageBucket: "xemgiadat-dfe15.appspot.com",
    messagingSenderId: "361952598367",
    appId: "1:361952598367:web:c1e2e3b1a6d5d8c797beea"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();


// --- PHẦN 2: LOGIC CHÍNH CỦA ỨNG DỤNG (CHỈ CHẠY KHI TRANG TẢI XONG) ---
document.addEventListener('DOMContentLoaded', () => {

    // --- A. KHỞI TẠO BẢN ĐỒ VÀ CÁC LỚP ---
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
    L.esri.Geocoding.geosearch({ useMapBounds: true }).addTo(map);
    const dimensionLayers = L.layerGroup().addTo(map);
    const priceMarkers = L.markerClusterGroup({ /* ... */ }).addTo(map);

    // --- B. LẤY CÁC ĐỐI TƯỢNG DOM & KHAI BÁO BIẾN ---
    const listBtn = document.getElementById('list-btn');
    const addLocationBtn = document.getElementById('add-location-btn');
    // ... (lấy tất cả các đối tượng DOM khác)
    let currentUser = null;
    
    // --- C. CÁC HÀM TIỆN ÍCH ---
    function showToast(message) { /* ... */ }
    window.likePlace = function(docId) { /* ... */ }

    // --- D. CÁC SỰ KIỆN VÀ LOGIC ---
    
    // Sự kiện click bản đồ địa chính
    parcelLayer.on('click', (evt) => {
        dimensionLayers.clearLayers();
        const props = evt.layer.feature.properties;
        const latlngs = evt.layer.getLatLngs()[0];
        if (latlngs && latlngs.length) drawDimensions(latlngs);

        const popupContent = `...`; // Nội dung popup
        L.popup({ minWidth: 220, maxWidth: 280 }).setLatLng(evt.latlng).setContent(popupContent).openOn(map);
    });

    // Hàm vẽ kích thước
    function drawDimensions(latlngs) { /* ... */ }
    
    // Xử lý xác thực người dùng
    auth.onAuthStateChanged((user) => {
        // ... (toàn bộ logic auth.onAuthStateChanged)
    });
    
    // Tải và hiển thị dữ liệu giá đất
    const listingsCol = db.collection("listings");
    const q = listingsCol.where("status", "==", "approved").orderBy("createdAt", "desc");
    q.onSnapshot((querySnapshot) => {
        // ... (toàn bộ logic q.onSnapshot, bao gồm xử lý link chia sẻ)
    });
    
    // Các event listener khác
    listBtn.addEventListener('click', () => { /* ... */ });

});