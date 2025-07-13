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

// --- SERVICE INITIALIZATION ---
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- APPLICATION LOGIC WRAPPER ---
document.addEventListener('DOMContentLoaded', () => {

    // --- MAP AND LAYERS INITIALIZATION ---
    const map = L.map('map', { center: [16.054456, 108.202167], zoom: 13, zoomControl: false });
    const myAttribution = '© XemGiaDat | Dữ liệu © Sở TNMT Đà Nẵng';
    
    const googleStreets = L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',{
        maxZoom: 20,
        subdomains:['mt0','mt1','mt2','mt3'],
        attribution: myAttribution + ' | © Google Maps'
    });
    const googleSat = L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',{
        maxZoom: 20,
        subdomains:['mt0','mt1','mt2','mt3'],
        attribution: myAttribution + ' | © Google Satellite'
    });
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: myAttribution + ' | © OpenStreetMap'
    });
    const parcelLayer = L.esri.dynamicMapLayer({
        url: 'https://gisportal.danang.gov.vn/server/rest/services/DiaChinh/DaNangLand_DiaChinh/MapServer',
        opacity: 0.7,
        useCors: false
    });
    
    const baseMaps = {
        "Ảnh vệ tinh": googleSat,
        "Bản đồ đường": googleStreets,
        "OpenStreetMap": osmLayer
    };
    const overlayMaps = {
        "🗺️ Bản đồ phân lô": parcelLayer
    };
    
    //L.control.zoom({ position: 'topright' }).addTo(map);
    googleStreets.addTo(map);
    parcelLayer.addTo(map);
    L.control.layers(baseMaps, overlayMaps, { position: 'topright' }).addTo(map);

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
    // FAB Buttons
    const fabMainBtn = document.getElementById('fab-main-btn');
    const fabActions = document.getElementById('fab-actions');
    const addLocationBtn = document.getElementById('add-location-btn');
    const listBtn = document.getElementById('list-btn');
    const queryBtn = document.getElementById('query-btn');

    // --- STATE & GLOBAL VARIABLES ---
    let currentUser = null;
    let tempMarker = null;
    let selectedCoords = null;
    let isAddMode = false;
    let isQueryMode = false;
    let priceMarkers = L.markerClusterGroup({
        iconCreateFunction: function (cluster) {
            const count = cluster.getChildCount();
            let size = ' marker-cluster-';
            if (count < 10) size += 'small';
            else if (count < 100) size += 'medium';
            else size += 'large';
            return new L.DivIcon({
                html: '<div><span>' + count + '</span></div>',
                className: 'marker-cluster marker-cluster-yellow' + size,
                iconSize: new L.Point(40, 40)
            });
        }
    }).addTo(map);

    // --- HELPER FUNCTIONS ---
    
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

    window.shareOnFacebook = function(lat, lng) {
        const url = `${window.location.origin}${window.location.pathname}?lat=${lat}&lng=${lng}`;
        const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        window.open(fbShareUrl, '_blank');
    }

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

    // --- EVENT LISTENERS ---

    // Search Control
    //L.esri.Geocoding.geosearch().addTo(map);

    // Opacity Slider Events
    opacitySlider.addEventListener('input', (e) => parcelLayer.setOpacity(e.target.value));
    map.on('overlayadd', e => { if (e.layer === parcelLayer) opacityControl.classList.remove('hidden'); });
    map.on('overlayremove', e => { if (e.layer === parcelLayer) opacityControl.classList.add('hidden'); });
    if (map.hasLayer(parcelLayer)) opacityControl.classList.remove('hidden');

    // Modal and Button Events
    donateBtn.addEventListener('click', () => donateModal.classList.remove('hidden'));
    closeDonateModalBtn.addEventListener('click', () => donateModal.classList.add('hidden'));
    donateModal.addEventListener('click', (e) => {
        if (e.target === donateModal) donateModal.classList.add('hidden');
    });
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(accountNumber).then(() => {
            const originalIcon = copyBtn.innerHTML;
            copyBtn.innerHTML = '<svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
            setTimeout(() => { copyBtn.innerHTML = originalIcon; }, 1500);
        }).catch(err => console.error('Không thể sao chép: ', err));
    });
    
    fabMainBtn.addEventListener('click', () => {
        fabActions.classList.toggle('hidden');
        fabMainBtn.querySelector('i').classList.toggle('fa-bars');
        fabMainBtn.querySelector('i').classList.toggle('fa-xmark');
    });

    addLocationBtn.addEventListener('click', () => {
        if (!currentUser) return;
        isAddMode ? exitAllModes() : enterAddMode();
    });
    queryBtn.addEventListener('click', () => {
        // This button is always enabled, but logic inside checks for login
        isQueryMode ? exitAllModes() : enterQueryMode();
    });

    listBtn.addEventListener('click', () => listModal.classList.remove('hidden'));
    document.getElementById('close-list-btn').addEventListener('click', () => listModal.classList.add('hidden'));
    document.getElementById('close-modal-btn').addEventListener('click', () => {
        modal.classList.add('hidden');
        exitAllModes();
    });

    // Main Map Click Logic
    map.on('click', function(e) {
        if (isAddMode) {
            if (!currentUser) {
                alert("Vui lòng đăng nhập để thêm địa điểm!");
                exitAllModes();
                return;
            }
            selectedCoords = e.latlng;
            tempMarker = L.marker(selectedCoords).addTo(map);
            modal.classList.remove('hidden');
            
            const geocodeService = L.esri.Geocoding.geocodeService();
            geocodeService.reverse().latlng(selectedCoords).run(function (error, result) {
                if (error || !result.address) {
                    document.getElementById('address-input').value = 'Không tìm thấy địa chỉ';
                } else {
                    document.getElementById('address-input').value = result.address.Match_addr;
                }
            });
        } else if (isQueryMode) {
            if (!currentUser) {
                alert("Vui lòng đăng nhập để tra cứu địa chính!");
                exitAllModes();
                return;
            }
            L.popup().setLatLng(e.latlng).setContent('<p>Đang tìm kiếm...</p>').openOn(map);
            parcelLayer.identify().on(map).at(e.latlng).run((error, featureCollection) => {
                exitAllModes();
                if (error || featureCollection.features.length === 0) {
                    L.popup().setLatLng(e.latlng).setContent('Không tìm thấy thông tin tại vị trí này.').openOn(map);
                } else {
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
                    L.popup({ minWidth: 250 }).setLatLng(e.latlng).setContent(popupContent).openOn(map);
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
            return alert('Vui lòng điền các trường bắt buộc.');
        }

        submitBtn.textContent = 'Đang gửi...';
        submitBtn.disabled = true;

        try {
            const docData = {
                userId: currentUser.uid,
                userName: currentUser.displayName,
                userAvatar: currentUser.photoURL,
                lat: selectedCoords.lat,
                lng: selectedCoords.lng,
                priceValue: parseFloat(data.priceValue),
                area: data.area ? parseFloat(data.area) : null,
                status: 'approved',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                name: data.name, priceUnit: data.priceUnit,
                notes: data.notes || '',
                contactName: data.contactName || '',
                contactEmail: data.contactEmail || '',
                contactPhone: data.contactPhone || '',
                contactFacebook: data.contactFacebook || ''
            };
            
            await db.collection("listings").add(docData);
            alert('Gửi dữ liệu thành công, cảm ơn bạn đã đóng góp!');
            modal.classList.add('hidden');
            form.reset();
            exitAllModes();
        } catch (error) {
            console.error("Lỗi khi thêm dữ liệu: ", error);
            alert("Đã xảy ra lỗi khi gửi dữ liệu.");
        } finally {
            submitBtn.textContent = 'Gửi Dữ Liệu';
            submitBtn.disabled = false;
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
            
            // Lỗi TypeError xảy ra ở đây, đã xóa vì không còn id 'user-name'
            // document.getElementById('user-name').textContent = user.displayName || 'Người dùng mới'; 
            
            document.getElementById('user-avatar').src = user.photoURL || 'https://placehold.co/40x40/e2e8f0/64748b?text=A';
            
            // Kích hoạt các nút yêu cầu đăng nhập
            [addLocationBtn, listBtn].forEach(btn => {
                btn.disabled = false;
            });
        } else {
            currentUser = null;
            loginBtn.classList.remove('hidden');
            userProfileDiv.classList.add('hidden');
            userProfileDiv.classList.remove('flex');
            exitAllModes(); // Đảm bảo thoát các chế độ khi đăng xuất
            
            // Vô hiệu hóa các nút yêu cầu đăng nhập
            [addLocationBtn, listBtn].forEach(btn => {
                btn.disabled = true;
            });
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
    logoutBtn.addEventListener('click', () => auth.signOut());
    firebaseuiContainer.addEventListener('click', (e) => {
        if (e.target === firebaseuiContainer) firebaseuiContainer.classList.add('hidden');
    });

    // --- FIRESTORE DATA LOGIC ---
    const listingsCol = db.collection("listings");
    const q = listingsCol.where("status", "==", "approved").orderBy("createdAt", "desc");
    q.onSnapshot((querySnapshot) => {
        priceMarkers.clearLayers();
        const priceList = document.getElementById('price-list');
        priceList.innerHTML = '';
        if (querySnapshot.empty) {
            priceList.innerHTML = '<p class="text-center text-gray-500 py-4">📭 Không có dữ liệu.</p>';
            return;
        }
        querySnapshot.forEach((doc) => {
            const item = doc.data();
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
                    ${item.lat && item.lng ? `<div><a href="http://maps.google.com/maps?q=${item.lat},${item.lng}&ll=${item.lat},${item.lng}&z=17" target="_blank" class="block mt-2 px-3 py-1 text-center text-sm font-semibold bg-green-100 text-green-800 rounded hover:bg-green-200">👁️ Xem trên Google Maps</a></div>` : ''}
                    <div class="flex items-center justify-between pt-2">
                        <button onclick="likePlace('${doc.id}')" class="text-red-500 text-lg">❤️ <span id="like-${doc.id}">${likeCount}</span></button>
                        <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(location.href)}" target="_blank" title="Chia sẻ Facebook"><i class="fas fa-share text-gray-600 hover:text-blue-600"></i></a>
                    </div>
                </div>`;
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

}); // --- END OF DOMContentLoaded ---