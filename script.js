// --- CẤU HÌNH FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyDu9tYpJdMPT7Hvk2_Ug8XHwxRQXoakRfs",
    authDomain: "xemgiadat-dfe15.firebaseapp.com",
    projectId: "xemgiadat-dfe15",
    storageBucket: "xemgiadat-dfe15.appspot.com",
    messagingSenderId: "361952598367",
    appId: "1:361952598367:web:c1e2e3b1a6d5d8c797beea"
};

// --- KHỞI TẠO CÁC DỊCH VỤ ---
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- KHỞI TẠO BẢN ĐỒ VÀ CÁC LỚP ---
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

// --- CÁC HÀM TIỆN ÍCH ---
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

window.likePlace = function(docId) {
    const likedKey = `liked-${docId}`;
    if (localStorage.getItem(likedKey) === 'true') {
        showToast('Bạn đã thích địa điểm này rồi!');
        return;
    }
    const docRef = db.collection('listings').doc(docId);
    docRef.update({ likeCount: firebase.firestore.FieldValue.increment(1) })
    .then(() => {
        showToast('Cảm ơn bạn đã yêu thích!');
        localStorage.setItem(likedKey, 'true');
    }).catch(error => console.error("Lỗi khi cập nhật tim: ", error));
}

// --- LOGIC CHÍNH KHI TẢI TRANG ---
document.addEventListener('DOMContentLoaded', () => {

    // --- LẤY CÁC ĐỐI TƯỢNG DOM ---
    const mapContainer = document.getElementById('map');
    const addLocationBtn = document.getElementById('add-location-btn');
    const listBtn = document.getElementById('list-btn');
    const donateBtn = document.getElementById('donate-btn');
    
    // --- BIẾN TRẠNG THÁI ---
    let currentUser = null;
    let tempMarker = null;
    let selectedCoords = null;
    let isAddMode = false;
    
    let priceMarkers = L.markerClusterGroup({
        iconCreateFunction: function (cluster) {
            const count = cluster.getChildCount();
            let size = ' marker-cluster-';
            if (count < 10) { size += 'small'; } 
            else if (count < 100) { size += 'medium'; } 
            else { size += 'large'; }
            return new L.DivIcon({ html: '<div><span>' + count + '</span></div>', className: 'marker-cluster marker-cluster-yellow' + size, iconSize: new L.Point(40, 40) });
        }
    }).addTo(map);
    const dimensionLayers = L.layerGroup().addTo(map);

    // --- KHỞI TẠO TÍNH NĂNG ---
    const searchControl = L.esri.Geocoding.geosearch({ useMapBounds: true }).addTo(map);
    
    // --- XỬ LÝ SỰ KIỆN CLICK ---
    map.on('click', (e) => {
        if (isAddMode) {
            // Logic thêm địa điểm
        } else {
            if (!e.originalEvent.target.classList.contains('leaflet-interactive')) {
                dimensionLayers.clearLayers();
            }
        }
    });

    parcelLayer.on('click', (evt) => {
        dimensionLayers.clearLayers();
        const layer = evt.layer;
        const props = layer.feature.properties;
        const latlngs = layer.getLatLngs()[0];

        if(latlngs && latlngs.length > 0) {
            drawDimensions(latlngs);
        }

        const popupContent = `
            <div class="thong-tin-dia-chinh" style="min-width: 220px;">
                <h3 class="font-bold text-base mb-2 text-center">Thông tin địa chính</h3>
                <table>
                    <tr><td><strong>Số tờ:</strong></td><td>${props.SoHieuToBanDo ?? 'N/A'}</td></tr>
                    <tr><td><strong>Số thửa:</strong></td><td>${props.SoThua ?? 'N/A'}</td></tr>
                    <tr><td><strong>Loại đất:</strong></td><td>${props.KyHieuMDSD ?? 'N/A'}</td></tr>
                    <tr><td><strong>Diện tích (m²):</strong></td><td>${props.DienTich ? parseFloat(props.DienTich).toFixed(1) : 'N/A'}</td></tr>
                </table>
            </div>`;
        L.popup({ minWidth: 220, maxWidth: 280 })
         .setLatLng(evt.latlng)
         .setContent(popupContent)
         .openOn(map);
    });
    
    function drawDimensions(latlngs) {
        let points = [...latlngs, latlngs[0]];
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            const distance = map.distance(p1, p2);
            if (distance < 0.5) continue;

            const midPoint = L.latLng((p1.lat + p2.lat) / 2, (p1.lng + p2.lng) / 2);
            const dimensionIcon = L.divIcon({
                className: 'dimension-label',
                html: `<b>${distance.toFixed(1)}m</b>`
            });
            L.marker(midPoint, { icon: dimensionIcon }).addTo(dimensionLayers);
        }
    }

    // --- XỬ LÝ XÁC THỰC ---
    auth.onAuthStateChanged((user) => {
        const loginBtn = document.getElementById('login-btn');
        const userProfileWidget = document.getElementById('user-profile-widget');

        if (user) {
            currentUser = user;
            loginBtn.classList.add('hidden');
            userProfileWidget.classList.remove('hidden');

            const userAvatarBtn = document.getElementById('user-avatar-btn');
            const logoutBtn = document.getElementById('logout-btn');

            document.getElementById('user-avatar').src = user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'A'}&background=random`;
            
            userAvatarBtn.onclick = function() {
                userProfileWidget.classList.toggle('is-open');
            };

            logoutBtn.onclick = () => { auth.signOut(); };

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

    // --- XỬ LÝ DỮ LIỆU TỪ FIRESTORE ---
    const listingsCol = db.collection("listings");
    const q = listingsCol.where("status", "==", "approved").orderBy("createdAt", "desc");

    q.onSnapshot((querySnapshot) => {
    // Xóa các ghim và danh sách cũ
    priceMarkers.clearLayers();
    const priceList = document.getElementById('price-list');
    priceList.innerHTML = '';
    document.getElementById('loading-spinner').style.display = 'none';

    if (querySnapshot.empty) {
        priceList.innerHTML = '<p class="text-center text-gray-500 py-4">📭 Không có dữ liệu.</p>';
        return;
    }

    const allMarkers = {}; // Dùng để lưu trữ tất cả marker đã tạo

    // --- VÒNG LẶP 1: TẠO TẤT CẢ GHIM VÀ DANH SÁCH ---
    querySnapshot.forEach((doc) => {
        const item = doc.data();
        if (!item.lat || !item.lng) return;

        const formattedPrice = `${item.priceValue} ${item.priceUnit}`;
        
        const popupContent = `
            <div class="p-2 text-sm leading-5 space-y-2 max-w-[260px]">
                <h3 class="font-bold text-base text-gray-800">${item.name}</h3>
                <p><strong>Giá:</strong> <span class="font-semibold text-red-600">${formattedPrice}</span></p>
                <p><strong>Diện tích:</strong> ${item.area ? item.area + ' m²' : 'N/A'}</p>
                <p><strong>Địa chỉ:</strong> ${item.address || 'N/A'}</p>
                <p><strong>Ghi chú:</strong> ${item.notes || 'N/A'}</p>
                ${(() => {
                    const permalink = `${window.location.origin}?lat=${item.lat}&lng=${item.lng}`;
                    const message = `Chào bạn, tôi quan tâm đến địa điểm '${item.name}' tại XemGiaDat.com. Link: ${permalink}`;
                    const encodedMessage = encodeURIComponent(message);
                    const encodedPermalink = encodeURIComponent(permalink);
                    let contactHTML = '<div class="flex space-x-3 text-xl justify-start pt-1">';
                    if (item.contactPhone) {
                        contactHTML += `<a href="tel:${item.contactPhone}" title="Gọi điện"><i class="fas fa-phone text-red-500 hover:scale-110"></i></a>`;
                        contactHTML += `<a href="https://zalo.me/${item.contactPhone}?text=${encodedMessage}" target="_blank" title="Nhắn tin Zalo"><i class="fas fa-comment-dots text-blue-500 hover:scale-110"></i></a>`;
                        contactHTML += `<a href="https://wa.me/${item.contactPhone}?text=${encodedMessage}" target="_blank" title="Nhắn tin WhatsApp"><i class="fab fa-whatsapp text-green-500 hover:scale-110"></i></a>`;
                    }
                    if (item.contactEmail) {
                        const mailtoLink = `mailto:${item.contactEmail}?subject=${encodeURIComponent(`Hỏi về địa điểm: ${item.name}`)}&body=${encodedMessage}`;
                        contactHTML += `<a href="${mailtoLink}" title="Gửi Email"><i class="fas fa-envelope text-yellow-500 hover:scale-110"></i></a>`;
                    }
                    contactHTML += '</div>';
                    const streetViewHTML = `<div><a href="https://googleusercontent.com/maps.google.com/7%7Bitem.lat%7D,108.23387145996095{item.lat},${item.lng}" target="_blank" class="block mt-2 px-3 py-1 text-center text-sm font-semibold bg-green-100 text-green-800 rounded hover:bg-green-200">👁️ Xem Street View</a></div>`;
                    const likeCount = item.likeCount || 0;
                    let actionsHTML = `<hr class="my-2"><div class="flex items-center justify-between pt-1">`;
                    actionsHTML += `<button onclick="likePlace('${doc.id}')" class="text-red-500 text-lg">❤️ <span id="like-${doc.id}">${likeCount}</span></button>`;
                    actionsHTML += `<a href="https://www.facebook.com/sharer/sharer.php?u=${encodedPermalink}" target="_blank" title="Chia sẻ Facebook"><i class="fas fa-share text-gray-600 hover:text-blue-600"></i></a>`;
                    actionsHTML += `</div>`;
                    return contactHTML + streetViewHTML + actionsHTML;
                })()}
            </div>`;
        
        const marker = L.marker([item.lat, item.lng]).bindPopup(popupContent);
        priceMarkers.addLayer(marker);
        allMarkers[doc.id] = marker;

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

    // --- LOGIC XỬ LÝ LINK CHIA SẺ (CHẠY SAU KHI ĐÃ CÓ DỮ LIỆU) ---
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const lat = urlParams.get('lat');
        const lng = urlParams.get('lng');

        if (lat && lng) {
            const sharedLatLng = L.latLng(parseFloat(lat), parseFloat(lng));
            let minDistance = Infinity;
            let closestDocId = null;

            // Vòng lặp 2: Chỉ để tìm ghim gần nhất
            querySnapshot.forEach(doc => {
                const item = doc.data();
                if (!item.lat || !item.lng) return;
                const itemLatLng = L.latLng(item.lat, item.lng);
                const distance = sharedLatLng.distanceTo(itemLatLng);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestDocId = doc.id;
                }
            });

            if (closestDocId && minDistance < 5) {
                const foundMarker = allMarkers[closestDocId];
                map.setView(sharedLatLng, 19);
                foundMarker.openPopup();
            } else {
                map.setView(sharedLatLng, 19);
                L.marker(sharedLatLng).addTo(map)
                    .bindPopup("<strong>Vị trí được chia sẻ</strong>").openPopup();
            }
        }
    } catch (error) {
        console.error("Lỗi khi xử lý URL được chia sẻ:", error);
    }
});
