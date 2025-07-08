
// --- PHẦN 1: KHỞI TẠO TOÀN CỤC ---
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

const map = L.map('map', { center: [16.054456, 108.202167], zoom: 13, zoomControl: false });
const myAttribution = '© XemGiaDat.com | Dữ liệu © Sở TNMT Đà Nẵng';
const googleSat = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',{ maxZoom: 20, subdomains:['mt0','mt1','mt2','mt3'], attribution: myAttribution });
const googleStreets = L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',{ maxZoom: 20, subdomains:['mt0','mt1','mt2','mt3'], attribution: myAttribution });

// ✅ QUAY LẠI DÙNG dynamicMapLayer CHO ỔN ĐỊNH
const parcelLayer = L.esri.dynamicMapLayer({
    url: 'https://gisportal.danang.gov.vn/server/rest/services/DiaChinh/DaNangLand_DiaChinh/MapServer',
    opacity: 0.7,
    useCors: false
});

const baseMaps = { "Ảnh vệ tinh": googleSat, "Bản đồ đường": googleStreets };
const overlayMaps = { "🗺️ Bản đồ Địa chính": parcelLayer };
googleSat.addTo(map);
parcelLayer.addTo(map);
L.control.layers(baseMaps, overlayMaps, { position: 'topright' }).addTo(map);

// --- PHẦN 2: LOGIC CHÍNH CỦA ỨNG DỤNG ---
document.addEventListener('DOMContentLoaded', () => {

    // --- LẤY CÁC ĐỐI TƯỢNG DOM & KHAI BÁO BIẾN ---
    const listBtn = document.getElementById('list-btn');
    const addLocationBtn = document.getElementById('add-location-btn');
    const donateBtn = document.getElementById('donate-btn');
    const listModal = document.getElementById('price-list-modal');
    const closeListBtn = document.getElementById('close-list-btn');
    const opacityControl = document.getElementById('opacity-control');
    const opacitySlider = document.getElementById('opacity-slider');
    let currentUser = null;
    const dimensionLayers = L.layerGroup().addTo(map);

    // --- KHỞI TẠO TÍNH NĂNG ---
    L.esri.Geocoding.geosearch({ useMapBounds: true }).addTo(map);

    // ✅ KHÔI PHỤC LOGIC CHO THANH TRƯỢT ĐỘ MỜ
    opacitySlider.addEventListener('input', (e) => parcelLayer.setOpacity(e.target.value));
    map.on('overlayadd', e => { if (e.layer === parcelLayer) opacityControl.classList.remove('hidden'); });
    map.on('overlayremove', e => { if (e.layer === parcelLayer) opacityControl.classList.add('hidden'); });
    if (map.hasLayer(parcelLayer)) opacityControl.classList.remove('hidden');

    // --- SỰ KIỆN CLICK ---
    map.on('click', (e) => {
        // Luôn xóa các đường kích thước cũ khi nhấn ra ngoài
        dimensionLayers.clearLayers();

        // Gửi yêu cầu tra cứu đến máy chủ GIS
        parcelLayer.identify()
            .on(map)
            .at(e.latlng)
            .run((error, featureCollection) => {
                if (error || !featureCollection.features.length) {
                    return; // Không làm gì nếu không tìm thấy thửa đất
                }
                const feature = featureCollection.features[0];
                const props = feature.properties;
                
                // Lấy dữ liệu hình học và vẽ kích thước
                const geometry = L.geoJSON(feature.geometry);
                const latlngs = geometry.getLayers()[0].getLatLngs()[0];
                if (latlngs && latlngs.length > 0) {
                    drawDimensions(latlngs);
                }

                // Hiển thị popup thông tin
                const popupContent = `
                    <div class="thong-tin-dia-chinh" style="min-width: 220px;">
                        <h3 class="font-bold text-base mb-2 text-center">Thông tin địa chính</h3>
                        <table>
                            <tr><td><strong>Số tờ:</strong></td><td>${props['Số hiệu tờ bản đồ'] ?? 'N/A'}</td></tr>
                            <tr><td><strong>Số thửa:</strong></td><td>${props['Số thửa'] ?? 'N/A'}</td></tr>
                            <tr><td><strong>Loại đất:</strong></td><td>${props['Ký hiệu mục đích sử dụng'] ?? 'N/A'}</td></tr>
                            <tr><td><strong>Diện tích (m²):</strong></td><td>${props['Diện tích'] ? parseFloat(props['Diện tích']).toFixed(1) + ' m²' : 'N/A'}</td></tr>
                        </table>
                    </div>`;
                L.popup({ minWidth: 220, maxWidth: 280 }).setLatLng(e.latlng).setContent(popupContent).openOn(map);
            });
    });
    
    // Hàm vẽ kích thước (giữ nguyên)
    function drawDimensions(latlngs) {
        let points = [...latlngs, latlngs[0]];
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            const distance = map.distance(p1, p2);
            if (distance < 0.5) continue;
            const midPoint = L.latLng((p1.lat + p2.lat) / 2, (p1.lng + p2.lng) / 2);
            L.marker(midPoint, { icon: L.divIcon({ className: 'dimension-label', html: `<b>${distance.toFixed(1)}m</b>` }) }).addTo(dimensionLayers);
        }
    }

    // --- XỬ LÝ XÁC THỰC ---
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            loginBtn.classList.add('hidden');
            userProfileWidget.classList.remove('hidden');

            const userAvatarBtn = document.getElementById('user-avatar-btn');
            const logoutBtn = document.getElementById('logout-btn');
            document.getElementById('user-avatar').src = user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'A'}&background=random`;
            userAvatarBtn.onclick = () => userProfileWidget.classList.toggle('is-open');
            logoutBtn.onclick = () => auth.signOut();
            
            [addLocationBtn, listBtn].forEach(btn => {
                if(btn) {
                    btn.disabled = false;
                    btn.classList.remove('opacity-50', 'cursor-not-allowed');
                }
            });
        } else {
            currentUser = null;
            loginBtn.classList.remove('hidden');
            userProfileWidget.classList.add('hidden');
            userProfileWidget.classList.remove('is-open');
            [addLocationBtn, listBtn].forEach(btn => {
                if(btn) {
                    btn.disabled = true;
                    btn.classList.add('opacity-50', 'cursor-not-allowed');
                }
            });
        }
    });

    // --- XỬ LÝ DỮ LIỆU GHIM GIÁ ĐẤT ---
    const listingsCol = db.collection("listings");
    const q = listingsCol.where("status", "==", "approved").orderBy("createdAt", "desc");

    q.onSnapshot((querySnapshot) => {
        priceMarkers.clearLayers();
        const priceList = document.getElementById('price-list');
        priceList.innerHTML = '';
        if(loadingSpinner) loadingSpinner.style.display = 'none';

        if (querySnapshot.empty) {
            priceList.innerHTML = '<p class="text-center text-gray-500 py-4">📭 Không có dữ liệu.</p>';
            return;
        }

        const allMarkers = {};
        querySnapshot.forEach((doc) => {
            const item = doc.data();
            if (!item.lat || !item.lng) return;

            const formattedPrice = `${item.priceValue} ${item.priceUnit}`;
            const popupContent = `...`; // Nội dung popup giá đất
            
            const marker = L.marker([item.lat, item.lng], { icon: blueIcon }).bindPopup(popupContent);
            priceMarkers.addLayer(marker);
            allMarkers[doc.id] = marker;

            const listItem = document.createElement('div');
            listItem.className = 'p-2 border-b cursor-pointer hover:bg-gray-100';
            listItem.innerHTML = `<p class="font-semibold">${item.name}</p><p class="text-sm text-red-600">${formattedPrice}</p>`;
            listItem.onclick = () => {
                map.setView([item.lat, item.lng], 18);
                marker.openPopup();
            };
            priceList.appendChild(listItem);
        });

        // Xử lý link chia sẻ
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const lat = urlParams.get('lat');
            const lng = urlParams.get('lng');

            if (lat && lng) {
                // ... logic xử lý link chia sẻ
            }
        } catch (error) {
            console.error("Lỗi URL:", error);
        }
    });
    
    // --- CÁC SỰ KIỆN KHÁC ---
    listBtn.addEventListener('click', () => listModal.classList.remove('hidden'));
    closeListBtn.addEventListener('click', () => listModal.classList.add('hidden'));
    donateBtn.addEventListener('click', () => donateModal.classList.remove('hidden'));
    closeDonateModalBtn.addEventListener('click', () => donateModal.classList.add('hidden'));
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText("68068793979").then(() => showToast('Đã sao chép STK!'));
    });
});