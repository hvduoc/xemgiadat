
    // --- CẤU HÌNH FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyDu9tYpJdMPT7Hvk2_Ug8XHwxRQXoakRfs",
    authDomain: "xemgiadat-dfe15.firebaseapp.com",
    projectId: "xemgiadat-dfe15",
    storageBucket: "xemgiadat-dfe15.appspot.com",
    messagingSenderId: "361952598367",
    appId: "1:361952598367:web:c1e2e3b1a6d5d8c797beea",
    measurementId: "G-XT932D9N1N"
};

// --- KHỞI TẠO CÁC DỊCH VỤ ---
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- KHỞI TẠO BẢN ĐỒ VÀ CÁC LỚP ---
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

// Lớp bản đồ phân lô (Dùng cho cả hiển thị và tra cứu)
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

// Thêm các lớp và điều khiển vào bản đồ
// L.control.zoom({ position: 'topright' }).addTo(map); Tạm thời vô hiệu hóa nút Zoom thủ công
googleStreets.addTo(map); // Mặc định là bản đồ vệ tinh
parcelLayer.addTo(map); // Bật sẵn lớp phân lô
L.control.layers(baseMaps, overlayMaps, { position: 'topright' }).addTo(map);


// --- TOÀN BỘ LOGIC CỦA ỨNG DỤNG SẼ NẰM TRONG DOMCONTENTLOADED ---
document.addEventListener('DOMContentLoaded', () => {

    // --- Lấy các đối tượng DOM ---
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
    // Thêm dòng này vào trong sự kiện DOMContentLoaded
    // ✅ Code mới đã được nâng cấp
    const searchControl = L.esri.Geocoding.geosearch({
        useMapBounds: true // Gợi ý tìm kiếm trong khung hình bản đồ hiện tại
    }).addTo(map);

    // Auth UI
    const authContainer = document.getElementById('auth-container');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userProfileDiv = document.getElementById('user-profile');
    const firebaseuiContainer = document.getElementById('firebaseui-auth-container');
    const ui = new firebaseui.auth.AuthUI(auth);

    // Opacity Slider
    const opacityControl = document.getElementById('opacity-control');
    const opacitySlider = document.getElementById('opacity-slider');

    // Dán đoạn mã này vào bên trong sự kiện DOMContentLoaded

    // Dán vào bên trong sự kiện DOMContentLoaded

    // --- BỘ ĐIỀU KHIỂN CHÍNH (BẮT BUỘC PHẢI CÓ) ---
    const donateBtn = document.getElementById('donate-btn');
    const donateModal = document.getElementById('donate-modal');
    const closeDonateModalBtn = document.getElementById('close-donate-modal');
   // --- BẮT ĐẦU CODE MỚI: XỬ LÝ LINK CHIA SẺ SAU KHI DỮ LIỆU ĐÃ TẢI ---
    
    // --- KẾT THÚC CODE MỚI ---
    donateBtn.addEventListener('click', () => {
        donateModal.classList.remove('hidden');
    });

    closeDonateModalBtn.addEventListener('click', () => {
        donateModal.classList.add('hidden');
    });

    donateModal.addEventListener('click', (e) => {
        if (e.target === donateModal) {
            donateModal.classList.add('hidden');
        }
    });


    // --- TÍNH NĂNG PHỤ: NÚT SAO CHÉP ---
    const copyBtn = document.getElementById('copy-stk-btn');
    const accountNumber = document.getElementById('bank-account-number').textContent;

    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(accountNumber).then(() => {
            const originalIcon = copyBtn.innerHTML;
            copyBtn.innerHTML = '<svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
            setTimeout(() => {
                copyBtn.innerHTML = originalIcon;
            }, 1500);
        }).catch(err => {
            console.error('Không thể sao chép: ', err);
        });
    });


    // --- BIẾN TRẠNG THÁI VÀ BIẾN TOÀN CỤC ---
    let currentUser = null;
    let tempMarker = null;
    let selectedCoords = null;
    let isAddMode = false;
    let isQueryMode = false;
    let priceMarkers = L.markerClusterGroup({
        iconCreateFunction: function (cluster) {
            const count = cluster.getChildCount();
            let size = ' marker-cluster-';
            if (count < 10) {
                size += 'small';
            } else if (count < 100) {
                size += 'medium';
            } else {
                size += 'large';
            }
            // Thêm class 'marker-cluster-yellow' để áp dụng màu mới
            return new L.DivIcon({
                html: '<div><span>' + count + '</span></div>',
                className: 'marker-cluster marker-cluster-yellow' + size,
                iconSize: new L.Point(40, 40)
            });
        }
    }).addTo(map);

    // --- CHỨC NĂNG PHỤ: BỘ LỌC ĐỘ MỜ ---
    opacitySlider.addEventListener('input', (e) => parcelLayer.setOpacity(e.target.value));
    map.on('overlayadd', e => { if (e.layer === parcelLayer) opacityControl.classList.remove('hidden'); });
    map.on('overlayremove', e => { if (e.layer === parcelLayer) opacityControl.classList.add('hidden'); });
    if (map.hasLayer(parcelLayer)) opacityControl.classList.remove('hidden');

    // --- CHỨC NĂNG PHỤ: LIKE (Gắn vào window để HTML có thể gọi) ---    
    window.likePlace = function(docId) {
        const likedKey = `liked-${docId}`;

        // 1. Kiểm tra trong localStorage xem người này đã tim bài này chưa
        if (localStorage.getItem(likedKey) === 'true') {
            showToast('Bạn đã thích địa điểm này rồi!');
            return;
        }

        // 2. Nếu chưa, tiến hành cập nhật trên Firestore
        const docRef = db.collection('listings').doc(docId);

        docRef.update({
            likeCount: firebase.firestore.FieldValue.increment(1)
        })
        .then(() => {
            showToast('Cảm ơn bạn đã yêu thích!');
            // 3. Đánh dấu là đã tim trong localStorage để không cho tim lại
            localStorage.setItem(likedKey, 'true');
        })
        .catch(error => {
            console.error("Lỗi khi cập nhật tim: ", error);
            showToast('Có lỗi xảy ra, vui lòng thử lại.');
        });
    }
    
    // --- QUẢN LÝ CÁC CHẾ ĐỘ CỦA BẢN ĐỒ ---
    function enterAddMode() {
        exitAllModes(); // Luôn thoát các chế độ khác trước khi vào chế độ mới
        isAddMode = true;
        mapContainer.classList.add('map-add-mode');
        addLocationBtn.classList.add('bg-green-500');
        addLocationBtn.classList.remove('bg-blue-600');
        instructionBanner.textContent = 'Nhấp vào bản đồ để chọn vị trí cần thêm.';
        instructionBanner.classList.remove('hidden');
    }

    function enterQueryMode() {
        exitAllModes();
        isQueryMode = true;
        mapContainer.classList.add('map-query-mode');
        queryBtn.classList.add('bg-green-500');
        queryBtn.classList.remove('bg-purple-600');
        instructionBanner.textContent = 'Nhấp vào vị trí trên bản đồ để tra cứu thông tin thửa đất.';
        instructionBanner.classList.remove('hidden');
    }

    function exitAllModes() {
        isAddMode = false;
        isQueryMode = false;
        
        mapContainer.classList.remove('map-add-mode', 'map-query-mode');
        addLocationBtn.classList.remove('bg-green-500');
        addLocationBtn.classList.add('bg-blue-600');
        queryBtn.classList.remove('bg-green-500');
        queryBtn.classList.add('bg-purple-600');
        
        instructionBanner.classList.add('hidden');
        if (tempMarker) {
            map.removeLayer(tempMarker);
            tempMarker = null;
        }
    }

    // --- SỰ KIỆN CLICK CÁC NÚT CHỨC NĂNG ---
    addLocationBtn.addEventListener('click', () => {
        if (!currentUser) {
            instructionBanner.textContent = 'Vui lòng đăng nhập để thêm địa điểm!';
            instructionBanner.classList.remove('hidden');
            setTimeout(() => instructionBanner.classList.add('hidden'), 3000);
            return;
        }
        isAddMode ? exitAllModes() : enterAddMode();
    });

    queryBtn.addEventListener('click', () => {       
        isQueryMode ? exitAllModes() : enterQueryMode();
    });

    listBtn.addEventListener('click', () => listModal.classList.remove('hidden'));
    closeListBtn.addEventListener('click', () => listModal.classList.add('hidden'));
    closeModalBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        exitAllModes();
    });

    // --- SỰ KIỆN CLICK CHÍNH TRÊN BẢN ĐỒ ---
    // Thay thế toàn bộ hàm map.on('click',...) của bạn bằng đoạn này

    map.on('click', function(e) {
        // 1. Nếu ở chế độ THÊM ĐỊA ĐIỂM
        if (isAddMode) {
            selectedCoords = e.latlng;
            tempMarker = L.marker(selectedCoords).addTo(map);
            modal.classList.remove('hidden');

            // Bắt đầu code reverse geocoding
            const geocodeService = L.esri.Geocoding.geocodeService();
            geocodeService.reverse().latlng(selectedCoords).run(function (error, result) {
                if (error) {
                    console.error("Lỗi khi tìm địa chỉ:", error);
                    document.getElementById('address-input').value = 'Không tìm thấy địa chỉ';
                    return;
                }
                if (result && result.address) {
                    const address = result.address.Match_addr;
                    document.getElementById('address-input').value = address;
                } else {
                    document.getElementById('address-input').value = 'Không tìm thấy địa chỉ';
                }
            });
            // Kết thúc code reverse geocoding

        } 
        // 2. Nếu ở chế độ TRA CỨU
        else if (isQueryMode) {
            L.popup().setLatLng(e.latlng).setContent('<p>Đang tìm kiếm...</p>').openOn(map);
            parcelLayer.identify().on(map).at(e.latlng).run((error, featureCollection) => {
                exitAllModes();
                if (error) {
                    console.error(error);
                    return L.popup().setLatLng(e.latlng).setContent('Có lỗi xảy ra khi tra cứu.').openOn(map);
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
                                    <tr><td><strong>Diện tích:</strong></td><td>${props['Diện tích'] ? parseFloat(props['Diện tích']).toFixed(1) : 'N/A'}</td></tr>
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
                    L.popup({ minWidth: 180, maxWidth: 250  }).setLatLng(e.latlng).setContent(popupContent).openOn(map);
                } else {
                    L.popup().setLatLng(e.latlng).setContent('Không tìm thấy thông tin tại vị trí này.').openOn(map);
                }
            });
        }
    }); // Dấu ngoặc đóng đúng của hàm map.on('click')

    // --- LOGIC XÁC THỰC FIREBASE ---  

    // ✅ HÀM AUTHENTICATION ĐÃ SỬA LỖI
    // Thay thế toàn bộ hàm auth.onAuthStateChanged cũ bằng hàm này

    // ✅ HÀM AUTHENTICATION ĐÃ SỬA LỖI
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
                this.parentElement.classList.toggle('is-open');
            };

            logoutBtn.onclick = () => {
                auth.signOut();
            };

            // Mở khóa các nút yêu cầu đăng nhập
            [addLocationBtn, listBtn].forEach(btn => {
                btn.disabled = false;
                btn.classList.remove('opacity-50', 'cursor-not-allowed');
            });
        } else {
            currentUser = null;
            loginBtn.classList.remove('hidden');
            userProfileWidget.classList.add('hidden');
            userProfileWidget.classList.remove('is-open');

            exitAllModes();

            // Khóa các nút yêu cầu đăng nhập
            [addLocationBtn, listBtn].forEach(btn => {
                btn.disabled = true;
                btn.classList.add('opacity-50', 'cursor-not-allowed');
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

    // --- LOGIC DỮ LIỆU (FIRESTORE) ---    
    const listingsCol = db.collection("listings");
    const q = listingsCol.where("status", "==", "approved").orderBy("createdAt", "desc");

    // ✅ THAY THẾ TOÀN BỘ HÀM q.onSnapshot CŨ BẰNG HÀM NÀY

    q.onSnapshot((querySnapshot) => {
        priceMarkers.clearLayers();
        const priceList = document.getElementById('price-list');
        priceList.innerHTML = '';
        // Giả sử bạn đã có hàm showToast và yellowIcon được định nghĩa ở nơi khác
        // document.getElementById('loading-spinner').style.display = 'none';

        if (querySnapshot.empty) {
            priceList.innerHTML = '<p class="text-center text-gray-500 py-4">📭 Không có dữ liệu.</p>';
            return;
        }

        const allMarkers = {}; // Dùng để lưu trữ tất cả marker đã tạo

        querySnapshot.forEach((doc) => {
            const item = doc.data();
            if (!item.lat || !item.lng) return;

            const formattedPrice = `${item.priceValue} ${item.priceUnit}`;
            
            // Code tạo popupContent của bạn giữ nguyên ở đây
            const popupContent = `
                <div class="p-2 text-sm leading-5 space-y-2 max-w-[260px]">
                    <h3 class="font-bold text-base text-gray-800">${item.name}</h3>
                    <p><strong>Giá:</strong> <span class="font-semibold text-red-600">${formattedPrice}</span></p>
                    <p><strong>Diện tích:</strong> ${item.area ? item.area + ' m²' : 'N/A'}</p>
                    <p><strong>Ghi chú:</strong> ${item.notes || 'N/A'}</p>
                    ${// Thay thế toàn bộ khối IIFE cũ trong popupContent
                (() => {
                    // 1. Tạo permalink và tin nhắn mặc định
                    const permalink = `${window.location.origin}?lat=${item.lat}&lng=${item.lng}`;
                    const message = `Chào bạn, tôi quan tâm đến địa điểm '${item.name}' tại XemGiaDat.com. Link: ${permalink}`;
                    const encodedMessage = encodeURIComponent(message);
                    const encodedPermalink = encodeURIComponent(permalink);

                    // 2. Tạo HTML cho các nút liên hệ
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
                    if (item.contactFacebook) {
                        contactHTML += `<a href="${item.contactFacebook}" target="_blank" title="Facebook"><i class="fab fa-facebook text-blue-700 hover:scale-110"></i></a>`;
                    }
                    contactHTML += '</div>';

                    // 3. Tạo HTML cho nút Street View
                    const streetViewLink = `https://www.google.com/maps?q&layer=c&cbll=${item.lat},${item.lng}`;
                    const streetViewHTML = `<div><a href="${streetViewLink}" target="_blank" class="block mt-2 px-3 py-1 text-center text-sm font-semibold bg-green-100 text-green-800 rounded hover:bg-green-200">👁️ Xem Street View</a></div>`;

                    // 4. Tạo HTML cho các nút hành động (Like, Share)
                    const likeCount = item.likeCount || 0;
                    let actionsHTML = `<hr class="my-2"><div class="flex items-center justify-between pt-1">`;
                    actionsHTML += `<button onclick="likePlace('${doc.id}')" class="text-red-500 text-lg">❤️ <span id="like-${doc.id}">${likeCount}</span></button>`;
                    actionsHTML += `<a href="https://www.facebook.com/sharer/sharer.php?u=${encodedPermalink}" target="_blank" title="Chia sẻ Facebook"><i class="fas fa-share text-gray-600 hover:text-blue-600"></i></a>`;
                    actionsHTML += `</div>`;

                    // 5. Trả về toàn bộ chuỗi HTML được tạo ra
                    return contactHTML + streetViewHTML + actionsHTML;
                })()}
                </div>`;
            
            const marker = L.marker([item.lat, item.lng]).bindPopup(popupContent);
            priceMarkers.addLayer(marker);
            allMarkers[doc.id] = marker; // Lưu lại marker với key là ID của document

            // Tạo danh sách bên trái
            const listItem = document.createElement('div');
            listItem.className = 'p-2 border-b cursor-pointer hover:bg-gray-100';
            listItem.innerHTML = `<p class="font-semibold">${item.name}</p><p class="text-sm text-red-600">${formattedPrice}</p>`;
            listItem.onclick = () => {
                // listModal.classList.add('hidden');
                map.setView([item.lat, item.lng], 18);
                marker.openPopup();
            };
            priceList.appendChild(listItem);
        });

        // --- BẮT ĐẦU CODE MỚI: XỬ LÝ LINK CHIA SẺ SAU KHI DỮ LIỆU ĐÃ TẢI ---
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const lat = urlParams.get('lat');
            const lng = urlParams.get('lng');

            if (lat && lng) {
                const sharedLatLng = L.latLng(parseFloat(lat), parseFloat(lng));
                let minDistance = Infinity;
                let closestDocId = null;

                // 1. Tìm điểm ghim gần nhất với vị trí được chia sẻ
                querySnapshot.forEach(doc => {
                    const item = doc.data();
                    const itemLatLng = L.latLng(item.lat, item.lng);
                    const distance = sharedLatLng.distanceTo(itemLatLng);
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestDocId = doc.id;
                    }
                });

                // 2. Nếu điểm gần nhất ở trong phạm vi 5 mét, coi như trùng khớp
                if (closestDocId && minDistance < 5) {
                    const foundMarker = allMarkers[closestDocId];
                    map.setView(sharedLatLng, 19);
                    foundMarker.openPopup(); // Mở popup của chính ghim đó
                } else {
                    // Nếu không, chỉ zoom và hiển thị ghim chung chung
                    map.setView(sharedLatLng, 19);
                    L.marker(sharedLatLng).addTo(map)
                        .bindPopup("<strong>Vị trí được chia sẻ</strong>").openPopup();
                }
            }
        } catch (error) {
            console.error("Lỗi khi xử lý URL được chia sẻ:", error);
        }
        // --- KẾT THÚC CODE MỚI ---
    });

    // --- SỰ KIỆN SUBMIT FORM THÊM ĐỊA ĐIỂM ---
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
                status: 'approved', // Dữ liệu mới nên ở trạng thái chờ duyệt
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                name: data.name,
                priceUnit: data.priceUnit,
                notes: data.notes || '',
                contactName: data.contactName || '',
                contactEmail: data.contactEmail || '',
                contactPhone: data.contactPhone || '',
                contactFacebook: data.contactFacebook || ''
            };
            
            await listingsCol.add(docData);
            
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
});

