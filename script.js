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

    // --- STATE & GLOBAL VARIABLES ---
    let currentUser = null;
    let tempMarker = null;
    let selectedCoords = null;
    let isAddMode = false;
    let isQueryMode = false;
    let localListings = [];
    let debounceTimer;
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

    // --- SEARCH LOGIC ---      
    // --- HÀM THỰC HIỆN TÌM KIẾM (PHIÊN BẢN NÂNG CẤP DÙNG MAPBOX) ---
    const performSearch = async (query) => {
        if (!query) {
            searchResultsContainer.innerHTML = '';
            searchResultsContainer.classList.add('hidden');
            return;
        }

        searchResultsContainer.innerHTML = '<div class="p-4 text-center text-gray-500">Đang tìm...</div>';
        searchResultsContainer.classList.remove('hidden');

        // Tìm kiếm trong danh sách lô đất (local)
        const listingResults = localListings.filter(item => 
            item.name.toLowerCase().includes(query.toLowerCase())
        );

        let html = '';

        // Hiển thị kết quả tìm lô đất
        if (listingResults.length > 0) {
            html += '<div class="result-category">Tin đăng nổi bật</div>';
            listingResults.slice(0, 5).forEach(item => {
                html += `
                    <div class="result-item" data-type="listing" data-id="${item.id}">
                        <i class="icon fa-solid fa-tag"></i>
                        <div>
                            <strong>${item.name}</strong>
                            <span class="price">${item.priceValue} ${item.priceUnit}</span>
                        </div>
                    </div>
                `;
            });
        }
        
        // Tìm kiếm địa chỉ bằng Mapbox API
        const mapCenter = map.getCenter();
        const endpointUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxAccessToken}&country=VN&language=vi&autocomplete=true&proximity=${mapCenter.lng},${mapCenter.lat}`;

        try {
            const response = await fetch(endpointUrl);
            const data = await response.json();

            if (data.features && data.features.length > 0) {
                html += '<div class="result-category">Địa điểm</div>';
                data.features.forEach(feature => {
                    // Mapbox trả về tọa độ [lng, lat]
                    const lng = feature.center[0];
                    const lat = feature.center[1];
                    html += `
                        <div class="result-item" data-type="location" data-lat="${lat}" data-lng="${lng}">
                            <i class="icon fa-solid fa-map-marker-alt"></i>
                            <span>${feature.place_name}</span>
                        </div>
                    `;
                });
            }
        } catch (error) {
            console.error("Lỗi tìm kiếm địa chỉ Mapbox:", error);
        }

        if (html === '') {
            searchResultsContainer.innerHTML = '<div class="p-4 text-center text-gray-500">Không tìm thấy kết quả.</div>';
        } else {
            searchResultsContainer.innerHTML = html;
        }
    };

    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            performSearch(e.target.value.trim());
        }, 300);
    });
    searchResultsContainer.addEventListener('click', (e) => {
        const item = e.target.closest('.result-item');
        if (!item) return;
        const type = item.dataset.type;
        if (type === 'location') {
            const lat = parseFloat(item.dataset.lat);
            const lng = parseFloat(item.dataset.lng);
            map.setView([lat, lng], 17);
        } else if (type === 'listing') {
            const id = item.dataset.id;
            const listing = localListings.find(l => l.id === id);
            if (listing) {
                map.setView([listing.lat, listing.lng], 18);
                priceMarkers.eachLayer(marker => {
                    if (marker.getLatLng().lat === listing.lat && marker.getLatLng().lng === listing.lng) {
                        marker.openPopup();
                    }
                });
            }
        }
        searchResultsContainer.classList.add('hidden');
        searchInput.value = '';
    });
    map.on('click', () => {
        searchResultsContainer.classList.add('hidden');
    });

    // --- OTHER EVENT LISTENERS ---
    opacitySlider.addEventListener('input', (e) => parcelLayer.setOpacity(e.target.value));
    map.on('overlayadd', e => { if (e.layer === parcelLayer) opacityControl.classList.remove('hidden'); });
    map.on('overlayremove', e => { if (e.layer === parcelLayer) opacityControl.classList.add('hidden'); });
    if (map.hasLayer(parcelLayer)) { opacityControl.classList.remove('hidden'); } else { opacityControl.classList.add('hidden'); }
    
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
        isQueryMode ? exitAllModes() : enterQueryMode();
    });
    listBtn.addEventListener('click', () => listModal.classList.remove('hidden'));
    document.getElementById('close-list-btn').addEventListener('click', () => listModal.classList.add('hidden'));
    document.getElementById('close-modal-btn').addEventListener('click', () => {
        modal.classList.add('hidden');
        exitAllModes();
    });
    // --- THAY THẾ TOÀN BỘ HÀM map.on('click',...) CŨ BẰNG HÀM NÀY ---
    map.on('click', function(e) {
        // Luôn ẩn kết quả tìm kiếm khi click ra bản đồ
        searchResultsContainer.classList.add('hidden');

        // Logic cho chế độ Thêm địa điểm
        if (isAddMode) {
            if (!currentUser) {
                alert("Vui lòng đăng nhập để thêm địa điểm!");
                exitAllModes();
                return;
            }
            selectedCoords = e.latlng;
            tempMarker = L.marker(selectedCoords).addTo(map);
            modal.classList.remove('hidden');
            
            // Tìm địa chỉ tự động (đã bỏ apikey để tương thích nhiều dịch vụ)
            const geocodeService = L.esri.Geocoding.geocodeService(); 
            geocodeService.reverse().latlng(selectedCoords).run(function (error, result) {
                if (error || !result.address) {
                    document.getElementById('address-input').value = 'Không tìm thấy địa chỉ';
                } else {
                    document.getElementById('address-input').value = result.address.Match_addr;
                }
            });
        } 
        // Logic cho chế độ Tra cứu địa chính
        else if (isQueryMode) {
            if (!currentUser) {
                alert("Vui lòng đăng nhập để tra cứu địa chính!");
                exitAllModes();
                return;
            }
            L.popup().setLatLng(e.latlng).setContent('<p>Đang tìm kiếm thông tin thửa đất...</p>').openOn(map);
            
            parcelLayer.identify().on(map).at(e.latlng).run((error, featureCollection) => {
                exitAllModes();
                if (error || featureCollection.features.length === 0) {
                    L.popup().setLatLng(e.latlng).setContent('Không tìm thấy thông tin địa chính tại vị trí này.').openOn(map);
                } else {
                    // Thay thế đoạn mã tạo popupContent cũ bằng đoạn này
                    const props = featureCollection.features[0].properties;
                    const lat = e.latlng.lat.toFixed(6);
                    const lng = e.latlng.lng.toFixed(6);

                    // Chuẩn bị dữ liệu để truyền vào hàm chia sẻ
                    const soTo = props['Số hiệu tờ bản đồ'] ?? 'N/A';
                    const soThua = props['Số thửa'] ?? 'N/A';
                    const diaChi = (props['Địa chỉ'] && props['Địa chỉ'] !== 'Null') ? props['Địa chỉ'] : '';

                    const popupContent = `
                        <div class="w-64 p-1 font-sans">
                            <div class="p-3 bg-white rounded-lg shadow-md">
                                <h3 class="text-base font-bold text-gray-800 text-center mb-3 border-b pb-2">Thông tin Thửa đất</h3>

                                <div class="space-y-2 text-sm text-gray-700">
                                    <div class="flex justify-between"><span>Số tờ:</span><span class="font-semibold">${soTo}</span></div>
                                    <div class="flex justify-between"><span>Số thửa:</span><span class="font-semibold">${soThua}</span></div>
                                    <div class="flex justify-between"><span>Loại đất:</span><span class="font-semibold bg-gray-100 px-2 rounded-full text-blue-600">${props['Ký hiệu mục đích sử dụng'] ?? 'N/A'}</span></div>
                                    <div class="flex justify-between"><span>Diện tích:</span><span class="font-semibold">${props['Diện tích'] ? parseFloat(props['Diện tích']).toFixed(1) : 'N/A'} m²</span></div>
                                    <div class="flex justify-between items-start"><span class="flex-shrink-0 mr-2">Địa chỉ:</span><span class="font-semibold text-right">${diaChi}</span></div>
                                </div>

                                <div class="mt-4 pt-3 border-t grid grid-cols-3 gap-2 text-center text-gray-600">
                                    <div>
                                        <button onclick="toggleLike(this)" class="w-full text-center p-1 rounded-lg hover:bg-gray-100">
                                            <i class="far fa-heart text-xl text-red-500"></i>
                                            <span class="block text-xs mt-1">Thích</span>
                                        </button>
                                    </div>
                                    <div>
                                        <button onclick="copyLocationLink(${lat}, ${lng})" class="w-full text-center p-1 rounded-lg hover:bg-gray-100">
                                            <i class="fas fa-link text-xl text-gray-500"></i>
                                            <span class="block text-xs mt-1">Sao chép</span>
                                        </button>
                                    </div>
                                    <div>
                                        <button onclick="shareOnFacebook(${lat}, ${lng}, '${soTo}', '${soThua}')" class="w-full text-center p-1 rounded-lg hover:bg-gray-100">
                                            <i class="fab fa-facebook-f text-xl text-blue-600"></i>
                                            <span class="block text-xs mt-1">Chia sẻ</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                    L.popup({ minWidth: 250 }).setLatLng(e.latlng).setContent(popupContent).openOn(map);
                }
            });
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
            document.getElementById('user-avatar').src = user.photoURL || 'https://placehold.co/40x40/e2e8f0/64748b?text=A';
            [addLocationBtn, listBtn].forEach(btn => {
                btn.disabled = false;
            });
        } else {
            currentUser = null;
            loginBtn.classList.remove('hidden');
            userProfileDiv.classList.add('hidden');
            userProfileDiv.classList.remove('flex');
            exitAllModes();
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

    // --- FIRESTORE DATA & RENDERING LOGIC ---
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

}); // --- END OF DOMContentLoaded ---