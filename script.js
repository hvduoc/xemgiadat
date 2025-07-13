// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
    [cite_start]apiKey: "AIzaSyDu9tYpJdMPT7Hvk2_Ug8XHwxRQXoakRfs", // [cite: 34]
    [cite_start]authDomain: "xemgiadat-dfe15.firebaseapp.com", // [cite: 34]
    [cite_start]projectId: "xemgiadat-dfe15", // [cite: 34]
    [cite_start]storageBucket: "xemgiadat-dfe15.appspot.com", // [cite: 34]
    [cite_start]messagingSenderId: "361952598367", // [cite: 34]
    [cite_start]appId: "1:361952598367:web:c1e2e3b1a6d5d8c797beea", // [cite: 34]
    [cite_start]measurementId: "G-XT932D9N1N" // [cite: 34]
};

// --- SERVICE INITIALIZATION ---
firebase.initializeApp(firebaseConfig); [cite_start]// [cite: 35]
const auth = firebase.auth(); [cite_start]// [cite: 35]
const db = firebase.firestore(); [cite_start]// [cite: 35]

// --- MAP AND LAYERS INITIALIZATION ---
const map = L.map('map', { center: [16.054456, 108.202167], zoom: 13, zoomControl: false }); [cite_start]// [cite: 36]
const myAttribution = '© XemGiaDat | Dữ liệu © Sở TNMT Đà Nẵng'; [cite_start]// [cite: 37]

[cite_start]const googleStreets = L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',{ // [cite: 38]
    [cite_start]maxZoom: 20, // [cite: 38]
    [cite_start]subdomains:['mt0','mt1','mt2','mt3'], // [cite: 38]
    attribution: myAttribution + ' | [cite_start]© Google Maps' // [cite: 38]
});
[cite_start]const googleSat = L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',{ // [cite: 39]
    [cite_start]maxZoom: 20, // [cite: 39]
    [cite_start]subdomains:['mt0','mt1','mt2','mt3'], // [cite: 39]
    attribution: myAttribution + ' | [cite_start]© Google Satellite' // [cite: 39]
});
[cite_start]const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { // [cite: 40]
    [cite_start]maxZoom: 19, // [cite: 40]
    attribution: myAttribution + ' | [cite_start]© OpenStreetMap' // [cite: 40]
});
[cite_start]const parcelLayer = L.esri.dynamicMapLayer({ // [cite: 41]
    [cite_start]url: 'https://gisportal.danang.gov.vn/server/rest/services/DiaChinh/DaNangLand_DiaChinh/MapServer', // [cite: 41]
    [cite_start]opacity: 0.7, // [cite: 41]
    [cite_start]useCors: false // [cite: 41]
});

[cite_start]const baseMaps = { // [cite: 42]
    [cite_start]"Ảnh vệ tinh": googleSat, // [cite: 42]
    [cite_start]"Bản đồ đường": googleStreets, // [cite: 42]
    [cite_start]"OpenStreetMap": osmLayer // [cite: 42]
};
[cite_start]const overlayMaps = { // [cite: 43]
    [cite_start]"🗺️ Bản đồ phân lô": parcelLayer // [cite: 43]
};

L.control.zoom({ position: 'topright' }).addTo(map); [cite_start]// [cite: 44]
googleStreets.addTo(map); [cite_start]// [cite: 44]
parcelLayer.addTo(map); [cite_start]// [cite: 45]
L.control.layers(baseMaps, overlayMaps, { position: 'topright' }).addTo(map); [cite_start]// [cite: 45]

// --- WAIT FOR DOM TO LOAD ---
[cite_start]document.addEventListener('DOMContentLoaded', () => { // [cite: 46]

    // --- DOM ELEMENT SELECTION ---
    const mapContainer = document.getElementById('map');
    const modal = document.getElementById('form-modal');
    const listModal = document.getElementById('price-list-modal');
    const addLocationBtn = document.getElementById('add-location-btn');
    const listBtn = document.getElementById('list-btn');
    const queryBtn = document.getElementById('query-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const closeListBtn = document.getElementById('close-list-btn');
    const form = document.getElementById('location-form');
    const instructionBanner = document.getElementById('instruction-banner');
    const authContainer = document.getElementById('auth-container');
    const loginBtn = document.getElementById('login-btn'); [cite_start]// [cite: 48]
    const logoutBtn = document.getElementById('logout-btn');
    const userProfileDiv = document.getElementById('user-profile');
    const firebaseuiContainer = document.getElementById('firebaseui-auth-container');
    const ui = new firebaseui.auth.AuthUI(auth); [cite_start]// [cite: 49]
    const opacityControl = document.getElementById('opacity-control');
    const opacitySlider = document.getElementById('opacity-slider');
    const donateBtn = document.getElementById('donate-btn');
    const donateModal = document.getElementById('donate-modal'); [cite_start]// [cite: 51]
    const closeDonateModalBtn = document.getElementById('close-donate-modal');
    const copyBtn = document.getElementById('copy-stk-btn');
    const accountNumber = document.getElementById('bank-account-number').textContent;

    // --- STATE & GLOBAL VARIABLES ---
    let currentUser = null; [cite_start]// [cite: 57]
    let tempMarker = null; [cite_start]// [cite: 58]
    let selectedCoords = null; [cite_start]// [cite: 58]
    let isAddMode = false; [cite_start]// [cite: 58]
    let isQueryMode = false; [cite_start]// [cite: 58]
    [cite_start]let priceMarkers = L.markerClusterGroup({ // [cite: 59]
        iconCreateFunction: function (cluster) {
            const count = cluster.getChildCount();
            let size = ' marker-cluster-';
            if (count < 10) {
                size += 'small';
            } else if (count < 100) {
                size += 'medium'; [cite_start]// [cite: 60]
            } else {
                size += 'large'; [cite_start]// [cite: 60]
            }
            return new L.DivIcon({
                [cite_start]html: '<div><span>' + count + '</span></div>', // [cite: 61]
                [cite_start]className: 'marker-cluster marker-cluster-yellow' + size, // [cite: 61]
                [cite_start]iconSize: new L.Point(40, 40) // [cite: 61]
            });
        }
    }).addTo(map);

    // --- INITIALIZE CONTROLS ---
    L.esri.Geocoding.geosearch().addTo(map); [cite_start]// [cite: 47]

    // --- EVENT LISTENERS ---

    // Opacity Slider Events
    opacitySlider.addEventListener('input', (e) => parcelLayer.setOpacity(e.target.value)); [cite_start]// [cite: 62]
    map.on('overlayadd', e => { if (e.layer === parcelLayer) opacityControl.classList.remove('hidden'); }); [cite_start]// [cite: 63]
    map.on('overlayremove', e => { if (e.layer === parcelLayer) opacityControl.classList.add('hidden'); }); [cite_start]// [cite: 63]
    if (map.hasLayer(parcelLayer)) opacityControl.classList.remove('hidden'); [cite_start]// [cite: 64]

    // Modal and Button Events
    donateBtn.addEventListener('click', () => donateModal.classList.remove('hidden')); [cite_start]// [cite: 52]
    closeDonateModalBtn.addEventListener('click', () => donateModal.classList.add('hidden')); [cite_start]// [cite: 52]
    [cite_start]donateModal.addEventListener('click', (e) => { // [cite: 53]
        if (e.target === donateModal) donateModal.classList.add('hidden'); [cite_start]// [cite: 53]
    });
    [cite_start]copyBtn.addEventListener('click', () => { // [cite: 55]
        [cite_start]navigator.clipboard.writeText(accountNumber).then(() => { // [cite: 55]
            const originalIcon = copyBtn.innerHTML;
            copyBtn.innerHTML = '<svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
            setTimeout(() => { copyBtn.innerHTML = originalIcon; }, 1500); [cite_start]// [cite: 56]
        }).catch(err => console.error('Không thể sao chép: ', err)); [cite_start]// [cite: 56]
    });
    [cite_start]addLocationBtn.addEventListener('click', () => { // [cite: 74]
        if (!currentUser) {
            instructionBanner.textContent = 'Vui lòng đăng nhập để thêm địa điểm!';
            instructionBanner.classList.remove('hidden');
            setTimeout(() => instructionBanner.classList.add('hidden'), 3000);
            return;
        }
        isAddMode ? exitAllModes() : enterAddMode(); [cite_start]// [cite: 74]
    });
    [cite_start]queryBtn.addEventListener('click', () => { // [cite: 75]
        if (!currentUser) {
            instructionBanner.textContent = 'Vui lòng đăng nhập để tra cứu!';
            instructionBanner.classList.remove('hidden');
            setTimeout(() => instructionBanner.classList.add('hidden'), 3000);
            return;
        }
        isQueryMode ? exitAllModes() : enterQueryMode(); [cite_start]// [cite: 75]
    });
    listBtn.addEventListener('click', () => listModal.classList.remove('hidden')); [cite_start]// [cite: 76]
    closeListBtn.addEventListener('click', () => listModal.classList.add('hidden')); [cite_start]// [cite: 76]
    [cite_start]closeModalBtn.addEventListener('click', () => { // [cite: 76]
        modal.classList.add('hidden');
        exitAllModes();
    });

    // Main Map Click Logic
    map.on('click', function(e) {
        if (isAddMode) {
            selectedCoords = e.latlng;
            tempMarker = L.marker(selectedCoords).addTo(map);
            modal.classList.remove('hidden');
            
            [cite_start]const geocodeService = L.esri.Geocoding.geocodeService(); // [cite: 78]
            [cite_start]geocodeService.reverse().latlng(selectedCoords).run(function (error, result) { // [cite: 78]
                if (error) {
                    console.error("Lỗi khi tìm địa chỉ:", error);
                    document.getElementById('address-input').value = 'Không tìm thấy địa chỉ'; [cite_start]// [cite: 79]
                    return;
                }
                if (result && result.address) {
                    document.getElementById('address-input').value = result.address.Match_addr; [cite_start]// [cite: 80]
                } else {
                    document.getElementById('address-input').value = 'Không tìm thấy địa chỉ'; [cite_start]// [cite: 82]
                }
            });
        } else if (isQueryMode) {
            L.popup().setLatLng(e.latlng).setContent('<p>Đang tìm kiếm...</p>').openOn(map); [cite_start]// [cite: 84]
            [cite_start]parcelLayer.identify().on(map).at(e.latlng).run((error, featureCollection) => { // [cite: 84]
                exitAllModes();
                if (error) {
                    console.error(error);
                    return L.popup().setLatLng(e.latlng).setContent('Có lỗi xảy ra khi tra cứu.').openOn(map); [cite_start]// [cite: 85]
                }
                if (featureCollection.features.length > 0) {
                    const props = featureCollection.features[0].properties;
                    const lat = e.latlng.lat.toFixed(6);
                    const lng = e.latlng.lng.toFixed(6);
                    const popupContent = `
                        <div class="thong-tin-dia-chinh">
                            <h3 class="font-bold text-base mb-2 text-center">Thông tin địa chính</h3>
                            <table>
                                <tr><td><strong>Số tờ:</strong></td><td>${props['Số hiệu tờ bản đồ'] ?? 'N/A'}</td></tr>
                                <tr><td><strong>Số thửa:</strong></td><td>${props['Số thửa'] ?? 'N/A'}</td></tr>
                                <tr><td><strong>Loại đất:</strong></td><td>${props['Ký hiệu mục đích sử dụng'] ?? 'N/A'}</td></tr>
                                <tr><td><strong>Diện tích:</strong></td><td>${props['Diện tích'] ? parseFloat(props['Diện tích']).toFixed(1) + ' m²' : 'N/A'}</td></tr>
                                <tr><td><strong>Địa chỉ:</strong></td><td>${props['Địa chỉ'] && props['Địa chỉ'] !== 'Null' ? props['Địa chỉ'] : 'N/A'}</td></tr>
                            </table>
                            <hr class="my-2">
                            <div class="actions">
                                <button onclick="toggleLike(this)" title="Yêu thích"><i class="far fa-heart"></i></button>
                                <button onclick="shareOnFacebook(${lat}, ${lng})" title="Chia sẻ Facebook"><i class="fas fa-share-alt"></i></button>
                                <button onclick="copyLocationLink(${lat}, ${lng})" title="Sao chép liên kết"><i class="fas fa-link"></i></button>
                            </div>
                        </div>
                    `;
                    L.popup({ minWidth: 250 }).setLatLng(e.latlng).setContent(popupContent).openOn(map); [cite_start]// [cite: 94]
                } else {
                    L.popup().setLatLng(e.latlng).setContent('Không tìm thấy thông tin tại vị trí này.').openOn(map); [cite_start]// [cite: 96]
                }
            });
        }
    });

    // Form Submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('submit-form-btn');
        if (!currentUser) return alert("Vui lòng đăng nhập.");

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        if (!selectedCoords || !data.name || !data.priceValue) {
            [cite_start]return alert('Vui lòng điền các trường bắt buộc.'); // [cite: 121]
        }

        submitBtn.textContent = 'Đang gửi...';
        submitBtn.disabled = true;

        try {
            const docData = {
                [cite_start]userId: currentUser.uid, // [cite: 122]
                [cite_start]userName: currentUser.displayName, // [cite: 122]
                [cite_start]userAvatar: currentUser.photoURL, // [cite: 122]
                [cite_start]lat: selectedCoords.lat, // [cite: 122]
                [cite_start]lng: selectedCoords.lng, // [cite: 122]
                [cite_start]priceValue: parseFloat(data.priceValue), // [cite: 122]
                [cite_start]area: data.area ? parseFloat(data.area) : null, // [cite: 122]
                [cite_start]status: 'pending', // [cite: 123]
                [cite_start]createdAt: firebase.firestore.FieldValue.serverTimestamp(), // [cite: 123]
                [cite_start]name: data.name, // [cite: 123]
                [cite_start]priceUnit: data.priceUnit, // [cite: 123]
                notes: data.notes || [cite_start]'', // [cite: 124]
                contactName: data.contactName || [cite_start]'', // [cite: 125]
                contactEmail: data.contactEmail || [cite_start]'', // [cite: 126]
                contactPhone: data.contactPhone || [cite_start]'', // [cite: 127]
                contactFacebook: data.contactFacebook || [cite_start]'' // [cite: 128]
            };
            
            await db.collection("listings").add(docData); [cite_start]// [cite: 129]
            alert('Gửi dữ liệu thành công, cảm ơn bạn đã đóng góp!'); [cite_start]// [cite: 129]
            modal.classList.add('hidden');
            form.reset();
            exitAllModes(); [cite_start]// [cite: 130]
        } catch (error) {
            console.error("Lỗi khi thêm dữ liệu: ", error); [cite_start]// [cite: 131]
            alert("Đã xảy ra lỗi khi gửi dữ liệu."); [cite_start]// [cite: 131]
        } finally {
            submitBtn.textContent = 'Gửi Dữ Liệu'; [cite_start]// [cite: 132]
            submitBtn.disabled = false; [cite_start]// [cite: 132]
        }
    });

    // --- FIREBASE AUTHENTICATION LOGIC ---
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            firebaseuiContainer.classList.add('hidden');
            loginBtn.classList.add('hidden');
            userProfileDiv.classList.remove('hidden');
            userProfileDiv.classList.add('flex');
            [cite_start]document.getElementById('user-name').textContent = user.displayName || 'Người dùng mới'; // [cite: 98]
            document.getElementById('user-avatar').src = user.photoURL || 'https://placehold.co/32x32/e2e8f0/64748b?text=A'; [cite_start]// [cite: 98]
            [addLocationBtn, listBtn, queryBtn].forEach(btn => {
                btn.disabled = false;
                btn.classList.remove('opacity-50', 'cursor-not-allowed');
            });
        } else {
            currentUser = null; [cite_start]// [cite: 99]
            loginBtn.classList.remove('hidden'); [cite_start]// [cite: 99]
            userProfileDiv.classList.add('hidden'); [cite_start]// [cite: 99]
            userProfileDiv.classList.remove('flex'); [cite_start]// [cite: 99]
            exitAllModes(); [cite_start]// [cite: 100]
            [addLocationBtn, listBtn, queryBtn].forEach(btn => {
                btn.disabled = true;
                btn.classList.add('opacity-50', 'cursor-not-allowed');
            }); [cite_start]// [cite: 100]
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
            [cite_start]], // [cite: 102]
            callbacks: {
                signInSuccessWithAuthResult: function(authResult, redirectUrl) {
                    firebaseuiContainer.classList.add('hidden');
                    return false;
                }
            [cite_start]} // [cite: 103]
        });
    });
    logoutBtn.addEventListener('click', () => auth.signOut()); [cite_start]// [cite: 104]
    [cite_start]firebaseuiContainer.addEventListener('click', (e) => { // [cite: 104]
        if (e.target === firebaseuiContainer) firebaseuiContainer.classList.add('hidden');
    });

    // --- FIRESTORE DATA LOGIC ---
    const listingsCol = db.collection("listings"); [cite_start]// [cite: 106]
    const q = listingsCol.where("status", "==", "approved").orderBy("createdAt", "desc"); [cite_start]// [cite: 106]
    [cite_start]q.onSnapshot((querySnapshot) => { // [cite: 107]
        priceMarkers.clearLayers();
        const priceList = document.getElementById('price-list');
        priceList.innerHTML = '';
        if (querySnapshot.empty) {
            priceList.innerHTML = '<p class="text-center text-gray-500 py-4">📭 Không có dữ liệu.</p>';
            return;
        }
        querySnapshot.forEach((doc) => {
            [cite_start]const item = doc.data(); // [cite: 108]
            if (!item.lat || !item.lng) return;
            const likeCount = localStorage.getItem(`like-${doc.id}`) || 0;
            const formattedPrice = `${item.priceValue} ${item.priceUnit}`;
            const popupContent = `
                <div class="p-2 text-sm leading-5 space-y-2 max-w-[260px]">
                    <h3 class="font-bold text-base text-gray-800">${item.name}</h3>
                    <p><strong>Giá:</strong> <span class="font-semibold text-red-600">${formattedPrice}</span></p>
                    <p><strong>Diện tích:</strong> ${item.area ? item.area + ' m²' : 'N/A'}</p>
                    <p><strong>Ghi chú:</strong> ${item.notes || 'N/A'}</p>
                    <div class="flex space-x-3 text-xl justify-start pt-1 text-blue-600">
                        ${item.contactPhone ? `<a href="tel:${item.contactPhone}" title="Gọi"><i class="fas fa-phone text-red-500 hover:scale-110"></i></a>` : ''}
                        ${item.contactPhone ? `<a href="https://zalo.me/${item.contactPhone}" title="Zalo" target="_blank"><i class="fas fa-comment-dots text-blue-500 hover:scale-110"></i></a>` : ''}
                        ${item.contactEmail ? `<a href="mailto:${item.contactEmail}" title="Email"><i class="fas fa-envelope text-yellow-500 hover:scale-110"></i></a>` : ''}
                        ${item.contactFacebook ? `<a href="${item.contactFacebook}" title="Facebook" target="_blank"><i class="fab fa-facebook text-blue-700 hover:scale-110"></i></a>` : ''}
                    </div>
                    ${item.lat && item.lng ? `<div><a href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${item.lat},${item.lng}" target="_blank" class="block mt-2 px-3 py-1 text-center text-sm font-semibold bg-green-100 text-green-800 rounded hover:bg-green-200">👁️ Xem Street View</a></div>` : ''}
                    <div class="flex items-center justify-between pt-2">
                        <button onclick="likePlace('${doc.id}')" class="text-red-500 text-lg">❤️ <span id="like-${doc.id}">${likeCount}</span></button>
                        <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(location.href)}" target="_blank" title="Chia sẻ Facebook"><i class="fas fa-share text-gray-600 hover:text-blue-600"></i></a>
                    </div>
                </div>`;
            const marker = L.marker([item.lat, item.lng]).bindPopup(popupContent); [cite_start]// [cite: 118]
            priceMarkers.addLayer(marker);
            const listItem = document.createElement('div');
            listItem.className = 'p-2 border-b cursor-pointer hover:bg-gray-100'; [cite_start]// [cite: 119]
            listItem.innerHTML = `<p class="font-semibold">${item.name}</p><p class="text-sm text-red-600">${formattedPrice}</p>`; [cite_start]// [cite: 119]
            listItem.onclick = () => {
                listModal.classList.add('hidden');
                map.setView([item.lat, item.lng], 18); [cite_start]// [cite: 120]
                marker.openPopup();
            };
            priceList.appendChild(listItem);
        });
    });
}); // End of DOMContentLoaded

// --- GLOBAL HELPER FUNCTIONS ---

// Map Mode Management
function enterAddMode() {
    exitAllModes();
    isAddMode = true; [cite_start]// [cite: 67]
    document.getElementById('map').classList.add('map-add-mode'); [cite_start]// [cite: 68]
    const addLocationBtn = document.getElementById('add-location-btn');
    addLocationBtn.classList.add('bg-green-500'); [cite_start]// [cite: 68]
    addLocationBtn.classList.remove('bg-blue-600'); [cite_start]// [cite: 68]
    const instructionBanner = document.getElementById('instruction-banner');
    instructionBanner.textContent = 'Nhấp vào bản đồ để chọn vị trí cần thêm.'; [cite_start]// [cite: 68]
    instructionBanner.classList.remove('hidden'); [cite_start]// [cite: 68]
}

function enterQueryMode() {
    exitAllModes();
    isQueryMode = true;
    document.getElementById('map').classList.add('map-query-mode'); [cite_start]// [cite: 69]
    const queryBtn = document.getElementById('query-btn');
    queryBtn.classList.add('bg-green-500'); [cite_start]// [cite: 69]
    queryBtn.classList.remove('bg-purple-600'); [cite_start]// [cite: 70]
    const instructionBanner = document.getElementById('instruction-banner');
    instructionBanner.textContent = 'Nhấp vào vị trí trên bản đồ để tra cứu thông tin thửa đất.'; [cite_start]// [cite: 70]
    instructionBanner.classList.remove('hidden'); [cite_start]// [cite: 70]
}

function exitAllModes() {
    isAddMode = false; [cite_start]// [cite: 72]
    isQueryMode = false; [cite_start]// [cite: 72]
    document.getElementById('map').classList.remove('map-add-mode', 'map-query-mode'); [cite_start]// [cite: 72]
    document.getElementById('add-location-btn').classList.remove('bg-green-500');
    document.getElementById('add-location-btn').classList.add('bg-blue-600');
    document.getElementById('query-btn').classList.remove('bg-green-500');
    document.getElementById('query-btn').classList.add('bg-purple-600');
    document.getElementById('instruction-banner').classList.add('hidden');
    if (tempMarker) {
        map.removeLayer(tempMarker);
        tempMarker = null; [cite_start]// [cite: 73]
    }
}

// Window-scoped functions for popups and inline HTML
window.likePlace = function(id) {
    const el = document.getElementById(`like-${id}`);
    let count = parseInt(localStorage.getItem(`like-${id}`) || 0, 10); [cite_start]// [cite: 65]
    count++; [cite_start]// [cite: 65]
    localStorage.setItem(`like-${id}`, count); [cite_start]// [cite: 65]
    if (el) el.textContent = count;
};

function copyLink() {
    [cite_start]navigator.clipboard.writeText(window.location.href).then(() => { // [cite: 135]
      alert('Đã sao chép liên kết!'); [cite_start]// [cite: 135]
    });
}

window.copyLocationLink = function(lat, lng) {
    const url = `${window.location.origin}${window.location.pathname}?lat=${lat}&lng=${lng}`; [cite_start]// [cite: 137]
    [cite_start]navigator.clipboard.writeText(url).then(() => { // [cite: 137]
        alert('Đã sao chép liên kết vị trí!');
    }).catch(err => console.error('Lỗi sao chép: ', err)); [cite_start]// [cite: 138]
}

window.shareOnFacebook = function(lat, lng) {
    const url = `${window.location.origin}${window.location.pathname}?lat=${lat}&lng=${lng}`; [cite_start]// [cite: 139]
    const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`; [cite_start]// [cite: 139]
    window.open(fbShareUrl, '_blank');
}

window.toggleLike = function(button) {
    const icon = button.querySelector('i');
    [cite_start]if (icon.classList.contains('far')) { // [cite: 140]
        icon.classList.remove('far'); [cite_start]// [cite: 141]
        icon.classList.add('fas', 'text-red-500'); [cite_start]// [cite: 141]
    } else {
        icon.classList.remove('fas', 'text-red-500'); [cite_start]// [cite: 142]
        icon.classList.add('far'); [cite_start]// [cite: 142]
    }
}