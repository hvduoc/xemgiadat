// --- CẤU HÌNH & KHỞI TẠO TOÀN CỤC ---
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

const parcelLayer = L.esri.featureLayer({
    url: 'https://gisportal.danang.gov.vn/server/rest/services/DiaChinh/DaNangLand_DiaChinh/MapServer/0',
    style: () => ({ color: '#0078A8', weight: 1.5, fillOpacity: 0.1 })
});

const baseMaps = { "Ảnh vệ tinh": googleSat, "Bản đồ đường": googleStreets };
const overlayMaps = { "🗺️ Bản đồ Địa chính": parcelLayer };
googleSat.addTo(map);
parcelLayer.addTo(map);
L.control.layers(baseMaps, overlayMaps, { position: 'topright' }).addTo(map);

// --- HÀM TIỆN ÍCH ---
function showToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.className = 'toast-notification';
    document.body.appendChild(toast);
    setTimeout(() => { toast.classList.add('show'); }, 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => { if (document.body.contains(toast)) document.body.removeChild(toast); }, 500);
    }, 3000);
}

// --- LOGIC CHÍNH CỦA ỨNG DỤNG ---
document.addEventListener('DOMContentLoaded', () => {

    // --- LẤY CÁC ĐỐI TƯỢNG DOM ---
    const listBtn = document.getElementById('list-btn');
    const addLocationBtn = document.getElementById('add-location-btn');
    const donateBtn = document.getElementById('donate-btn');
    const listModal = document.getElementById('price-list-modal');
    const closeListBtn = document.getElementById('close-list-btn');
    const donateModal = document.getElementById('donate-modal');
    const closeDonateModalBtn = document.getElementById('close-donate-modal');
    const copyBtn = document.getElementById('copy-stk-btn');
    const loadingSpinner = document.getElementById('loading-spinner');
    const loginBtn = document.getElementById('login-btn');
    const userProfileWidget = document.getElementById('user-profile-widget');

    // --- BIẾN TRẠNG THÁI ---
    let currentUser = null;
    const dimensionLayers = L.layerGroup().addTo(map);
    const priceMarkers = L.markerClusterGroup({
        iconCreateFunction: function (cluster) {
            const count = cluster.getChildCount();
            let size = ' marker-cluster-';
            if (count < 10) { size += 'small'; } 
            else if (count < 100) { size += 'medium'; } 
            else { size += 'large'; }
            return new L.DivIcon({ html: '<div><span>' + count + '</span></div>', className: 'marker-cluster marker-cluster-yellow' + size, iconSize: new L.Point(40, 40) });
        }
    }).addTo(map);

    // --- KHỞI TẠO TÍNH NĂNG ---
    L.esri.Geocoding.geosearch({ useMapBounds: true }).addTo(map);

    // --- CÁC SỰ KIỆN CLICK ---
    map.on('click', (e) => {
        if (!e.originalEvent.target.classList.contains('leaflet-interactive')) {
            dimensionLayers.clearLayers();
        }
    });

    parcelLayer.on('click', (evt) => {
        dimensionLayers.clearLayers();
        const props = evt.layer.feature.properties;
        const latlngs = evt.layer.getLatLngs()[0];
        if (latlngs && latlngs.length > 0) {
            drawDimensions(latlngs);
        }

        const popupContent = `
            <div class="thong-tin-dia-chinh" style="min-width: 220px;">
                <h3 class="font-bold text-base mb-2 text-center">Thông tin địa chính</h3>
                <table>
                    <tr><td><strong>Số tờ:</strong></td><td>${props.SoHieuToBanDo ?? 'N/A'}</td></tr>
                    <tr><td><strong>Số thửa:</strong></td><td>${props.SoThua ?? 'N/A'}</td></tr>
                    <tr><td><strong>Loại đất:</strong></td><td>${props.KyHieuMDSD ?? 'N/A'}</td></tr>
                    <tr><td><strong>Diện tích (m²):</strong></td><td>${props.DienTich ? parseFloat(props.DienTich).toFixed(1) + ' m²' : 'N/A'}</td></tr>
                </table>
            </div>`;
        L.popup({ minWidth: 220, maxWidth: 280 }).setLatLng(evt.latlng).setContent(popupContent).openOn(map);
    });
    
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
                btn.disabled = false;
                btn.classList.remove('opacity-50', 'cursor-not-allowed');
            });
        } else {
            currentUser = null;
            loginBtn.classList.remove('hidden');
            userProfileWidget.classList.add('hidden');
            userProfileWidget.classList.remove('is-open');
            [addLocationBtn, listBtn].forEach(btn => {
                btn.disabled = true;
                btn.classList.add('opacity-50', 'cursor-not-allowed');
            });
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