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

// --- MAPBOX ACCESS TOKEN ---
const mapboxAccessToken = "pk.eyJ1IjoiaHZkdW9jIiwiYSI6ImNtZDFwcjVxYTAzOGUybHEzc3ZrNTJmcnIifQ.D5VlPC8c_n1i3kezgqtzwg";

// --- SERVICE INITIALIZATION ---
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const cachedGeojsonByMaXa = {};
const frequentlyUsedXa = ["20540", "20491", "20472"]; 
// Ví dụ: Hòa Xuân, Sơn Trà, Ngũ Hành Sơn
// Bạn có thể tra MaXa từ tên xã/phường thực tế nếu cần (nó là mã hành chính, 5 số)



async function getCachedAddress(lat, lng) {
  const key = `addr:${lat.toFixed(5)},${lng.toFixed(5)}`;
  const cached = localStorage.getItem(key);
  if (cached) return cached;

  try {
    const endpointUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxAccessToken}&language=vi&limit=1`;
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

    function extractLatLngsFromVectorLayer(layer, map) {
        try {
            const rings = layer._rings?.[0];
            if (!Array.isArray(rings)) return null;

            const coords = rings.map(pt => {
                const latlng = map.layerPointToLatLng(pt);
                return [latlng.lng, latlng.lat];
            });

            // Đảm bảo polygon đóng kín
            if (coords.length > 0 && (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1])) {
                coords.push(coords[0]);
            }

            return {
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [coords]
                }
            };
        } catch (err) {
            console.warn("❌ Không thể dựng GeoJSON từ layer:", err);
            return null;
        }
    }

document.addEventListener('DOMContentLoaded', () => {

    // --- MAP AND LAYERS INITIALIZATION ---
    const map = L.map('map', { center: [16.054456, 108.202167], zoom: 13, zoomControl: false });
    const myAttribution = '© XemGiaDat | 📌 Dữ liệu tham khảo từ Sở TNMT Đà Nẵng. Không có giá trị pháp lý.';
    const googleStreets = L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',{ maxZoom: 20, subdomains:['mt0','mt1','mt2','mt3'], attribution: myAttribution + ' | © Google Maps' });
    const googleSat = L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',{ maxZoom: 20, subdomains:['mt0','mt1','mt2','mt3'], attribution: myAttribution + ' | © Google Satellite' });
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: myAttribution + ' | © OpenStreetMap' });

    // --- KHẮC PHỤC & TỐI ƯU: TÍCH HỢP BẢN ĐỒ PHÂN LÔ TỪ MAPBOX ---

    // 1. Biến toàn cục cho lớp bản đồ và thửa đất được highlight
    let parcelLayer = null;
    let highlightedFeature = null;
    let parcelLabels = L.layerGroup(); // Layer group cho số thửa

    // 2. URL để tải vector tiles
    const tilesetId = 'hvduoc.danang_parcels_final';
    const tileUrl = `https://api.mapbox.com/v4/${tilesetId}/{z}/{x}/{y}.mvt?access_token=${mapboxAccessToken}`;

    
   // 3. Style mặc định cho các thửa đất - tối ưu cho zoom xa
    const parcelStyle = {
        color: '#9CA3AF', // Viền màu xám nhạt hơn (Tailwind gray-400) để mờ mờ
        weight: 0.3,     // Nét viền rất mỏng khi zoom xa
        fill: false,     // TẮT đổ màu nền, chỉ giữ lại viền
        opacity: 0.6     // Độ trong suốt để nhìn mờ mờ đẹp hơn
    };

    // 4. Tùy chọn cho lớp vector tiles - tối ưu performance
    const vectorTileOptions = {
        rendererFactory: L.canvas.tile,
        interactive: true,
        minZoom: 10, // Không load tiles khi zoom quá xa
        maxZoom: 20, // Giới hạn zoom tối đa
        updateWhenIdle: true, // Chỉ update khi map dừng di chuyển
        updateWhenZooming: false, // Không update trong lúc zoom
        keepBuffer: 1, // Giảm buffer để tiết kiệm memory
        getFeatureId: feature => feature.properties.OBJECTID,
        vectorTileLayerStyles: {
            'danang_full': function(properties, zoom) {
                return {
                    color: zoom >= 16 ? '#6B7280' : '#9CA3AF',
                    weight: zoom >= 18 ? 1.2 : zoom >= 16 ? 0.8 : zoom >= 14 ? 0.4 : 0.2,
                    fill: false,
                    opacity: zoom >= 16 ? 0.8 : zoom >= 14 ? 0.5 : 0.3,
                    // Tối ưu rendering
                    smoothFactor: zoom >= 16 ? 1.0 : 0.5 // Giảm smoothing khi zoom xa
                };
            }
        }
    };

    // 5. Tạo lớp bản đồ phân lô MỘT LẦN DUY NHẤT với error handling
    parcelLayer = L.vectorGrid.protobuf(tileUrl, vectorTileOptions);
    
    // Xử lý lỗi 404 tiles để tránh spam console
    parcelLayer.on('tileerror', function(e) {
        // Chỉ log lỗi nghiêm trọng, bỏ qua 404 (tile không tồn tại)
        if (e.error && !e.error.message?.includes('404')) {
            console.warn('Lỗi tải vector tile:', e.error);
        }
    });
    
    // 6. System để hiển thị số thửa từ vector tiles
    let tileLabels = new Map(); // Store labels by tile coordinates
    const MIN_LABEL_ZOOM = 16;
    
    // Event listener khi vector tile được load
    parcelLayer.on('loading', function(e) {
        // Clear labels when new tiles are loading
        if (map.getZoom() < MIN_LABEL_ZOOM) {
            parcelLabels.clearLayers();
        }
    });
    
    // Function to create label from vector feature
    function createLabelFromVectorFeature(layer, properties) {
        if (!properties.SoThuTuThua || map.getZoom() < MIN_LABEL_ZOOM) return null;
        
        try {
            // Get centroid of the layer
            const bounds = layer.getBounds();
            const center = bounds.getCenter();
            
            const label = L.marker(center, {
                icon: L.divIcon({
                    className: 'parcel-number-label',
                    html: properties.SoThuTuThua,
                    iconSize: [null, null],
                    iconAnchor: [10, 6] // Center the label
                }),
                interactive: false,
                pane: 'overlayPane'
            });
            
            return label;
        } catch (error) {
            return null;
        }
    }
    
    // Function to update labels - now using optimized version
    function updateParcelLabels() {
        // Redirect to optimized version
        updateParcelLabelsOptimized();
    }
    
    // Old heavy loading function removed for performance optimization
    
    // Add labels when tiles are loaded
    parcelLayer.on('add', function(e) {
        if (map.getZoom() >= MIN_LABEL_ZOOM) {
            setTimeout(updateParcelLabels, 200);
        }
    });
        async function fetchAndDrawDimensions(maXa, soTo, soThua) {
        dimensionMarkers.clearLayers(); // Xóa nhãn cũ nếu có

        const geojsonUrl = `data/parcels/${maXa}.geojson`;

        try {
            const response = await fetch(geojsonUrl);
            if (!response.ok) {
                console.warn("❌ Không thể tải file GeoJSON:", geojsonUrl);
                return;
            }

            const geojson = await response.json();

            const feature = geojson.features.find(f => {
                const props = f.properties || {};
                return (
                    props.SoHieuToBanDo == soTo &&
                    props.SoThuTuThua == soThua
                );
            });

            if (!feature) {
                console.warn(`❌ Không tìm thấy thửa ${soTo}/${soThua} trong xã ${maXa}`);
                return;
            }

            drawDimensions(feature);
        } catch (err) {
            console.error("❌ Lỗi khi truy cập GeoJSON:", err);
        }
    }
    
    // --- BẠN HÃY THAY THẾ TOÀN BỘ KHỐI parcelLayer.on('click',...) BẰNG PHIÊN BẢN ĐÃ SỬA LỖI NÀY ---

    parcelLayer.on('click', async function(e) { // Giữ nguyên "async"
        if (!isQueryMode) return; 

        const props = e.layer.properties;
        if (!props || !props.OBJECTID) return;

        // --- Logic cũ của bạn để highlight và lấy thông tin thửa đất ---
        L.DomEvent.stop(e);
        hideInfoPanel();
        highlightedFeature = props.OBJECTID;
        parcelLayer.setFeatureStyle(highlightedFeature, {
            color: '#EF4444',
            weight: 3,
            fillColor: '#EF4444',
            fill: true,
            fillOpacity: 0.3
        });
        // --- Kết thúc logic cũ ---

        // ⭐️⭐️⭐️ BƯỚC SỬA LỖI: GỌI LẠI HÀM VẼ KÍCH THƯỚC ⭐️⭐️⭐️
        const maXa = props.MaXa;
        const soTo = props.SoHieuToBanDo;
        const soThua = props.SoThuTuThua;
        if (maXa && soTo && soThua) {
            fetchAndDrawDimensions(maXa, soTo, soThua);
        }
        // ⭐️⭐️⭐️ KẾT THÚC SỬA LỖI ⭐️⭐️⭐️


        // --- Các bước lấy địa chỉ và hiển thị thông tin vẫn giữ nguyên như cũ ---
        
        // 1. Chuẩn bị các thông tin có sẵn
        const formattedProps = {
            'Số thửa': props.SoThuTuThua,
            'Số hiệu tờ bản đồ': props.SoHieuToBanDo,
            'Diện tích': props.DienTich,
            'Ký hiệu mục đích sử dụng': props.KyHieuMucDichSuDung,
            'Địa chỉ': '<i class="text-gray-400">Đang tìm địa chỉ...</i>' // Thêm địa chỉ với trạng thái chờ
        };

        // 2. Gọi hàm hiển thị ngay lập tức với trạng thái chờ
        showInfoPanel('Thông tin Thửa đất', formattedProps, e.latlng.lat, e.latlng.lng);

        // 3. Lấy địa chỉ từ Mapbox một cách bất đồng bộ
        try {
            const geocodingUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${e.latlng.lng},${e.latlng.lat}.json?access_token=${mapboxAccessToken}&language=vi&types=address,poi,locality,place`;
            const response = await fetch(geocodingUrl);
            const data = await response.json();

            let finalAddress = "Không xác định";
            if (data.features && data.features.length > 0) {
                finalAddress = data.features[0].place_name_vi || data.features[0].place_name;
            }

            // 4. Cập nhật lại thông tin địa chỉ và gọi lại hàm hiển thị
            formattedProps['Địa chỉ'] = finalAddress;
            showInfoPanel('Thông tin Thửa đất', formattedProps, e.latlng.lat, e.latlng.lng);

        } catch (error) {
            console.error("Lỗi khi lấy địa chỉ từ Mapbox:", error);
            formattedProps['Địa chỉ'] = "Lỗi khi tìm địa chỉ";
            showInfoPanel('Thông tin Thửa đất', formattedProps, e.latlng.lat, e.latlng.lng);
        }
    });


    // --- KẾT THÚC KHẮC PHỤC ---

    const baseMaps = { "Ảnh vệ tinh": googleSat, "Bản đồ đường": googleStreets, "OpenStreetMap": osmLayer };
    const overlayMaps = { 
        "🗺️ Bản đồ phân lô": parcelLayer,
        "🏷️ Số thửa": parcelLabels 
    };
    googleStreets.addTo(map);
    parcelLayer.addTo(map); // Thêm lớp phân lô vào bản đồ
    parcelLabels.addTo(map); // Thêm lớp số thửa vào bản đồ
    L.control.layers(baseMaps, overlayMaps, { position: 'bottomright' }).addTo(map);
    
    // Tối ưu: Performance-focused event handling
    let zoomTimeout = null;
    let moveTimeout = null;
    
    map.on('zoomstart', function() {
        // Tạm ẩn labels khi đang zoom để tăng performance
        if (isLabelsVisible) {
            parcelLabels.clearLayers();
        }
    });
    
    map.on('zoomend', function() {
        clearTimeout(zoomTimeout);
        zoomTimeout = setTimeout(() => {
            const currentZoom = map.getZoom();
            if (currentZoom < 12) {
                // Zoom quá xa - giảm opacity và tắt interaction
                if (map.hasLayer(parcelLayer)) {
                    parcelLayer.setOpacity(0.1);
                    parcelLayer.options.interactive = false;
                }
            } else {
                // Zoom đủ gần - bật lại
                parcelLayer.setOpacity(1);
                parcelLayer.options.interactive = true;
            }
        }, 100); // Debounce zoom events
    });
    
    map.on('movestart', function() {
        // Clear labels khi đang di chuyển để tăng performance
        clearTimeout(labelLoadTimeout);
    });


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
    let isQueryMode = false; // Vẫn giữ để đổi con trỏ chuột
    let localListings = [];
    let debounceTimer;
    let dimensionMarkers = L.layerGroup().addTo(map); // Thêm vào map để dễ quản lý
    let userLocationMarker = null;
    let priceMarkers = L.markerClusterGroup({
        iconCreateFunction: function (cluster) {
            const count = cluster.getChildCount();
            let size = ' marker-cluster-';
            if (count < 10) size += 'small'; else if (count < 100) size += 'medium'; else size += 'large';
            return new L.DivIcon({ html: `<div><span>${count}</span></div>`, className: `marker-cluster marker-cluster-yellow${size}`, iconSize: new L.Point(40, 40) });
        }
    }).addTo(map);

    // --- HELPER FUNCTIONS ---
    window.openStreetView = (lat, lng) => window.open(`http://maps.google.com/?q=&layer=c&cbll=${lat},${lng}`, '_blank');

    function showInfoPanel(title, props, lat, lng) {
        
        infoPanel.classList.remove('is-collapsed');
        togglePanelBtn.querySelector('i').classList.replace('fa-chevron-up', 'fa-chevron-down');

        panelTitle.textContent = title;
        const soTo = props['Số hiệu tờ bản đồ'] ?? 'N/A';
        const soThua = props['Số thửa'] ?? 'N/A';
        const loaiDat = props['Ký hiệu mục đích sử dụng'] ?? 'N/A';
        const dienTich = props['Diện tích'] ? parseFloat(props['Diện tích']).toFixed(1) : 'N/A';
        const diaChi = (props['Địa chỉ'] && props['Địa chỉ'] !== 'Null') ? props['Địa chỉ'] : 'Chưa có';

        panelContent.innerHTML = `
        <div class="info-row">
            <span class="info-label">Thửa số:</span><strong class="info-value">${soThua}</strong>
            <span class="info-label ml-4">Tờ bản đồ:</span><strong class="info-value">${soTo}</strong>
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
        </div>`;

        infoPanel.classList.add('is-open');
        actionToolbar.classList.add('is-raised');
    }

    // --- BẮT ĐẦU CODE MỚI: Thêm hàm này vào file script.js ---

    async function queryAndDisplayParcelByLatLng(lat, lng) {
        // Hiển thị một thông báo cho người dùng biết hệ thống đang xử lý
        const loadingPopup = L.popup()
            .setLatLng([lat, lng])
            .setContent('Đang tìm thông tin thửa đất tại đây...')
            .openOn(map);

        const tilesetId = 'hvduoc.danang_parcels_final'; // Lấy từ code của bạn
        const queryUrl = `https://api.mapbox.com/v4/${tilesetId}/tilequery/${lng},${lat}.json?limit=1&access_token=${mapboxAccessToken}`;

        try {
            const response = await fetch(queryUrl);
            const data = await response.json();

            if (!data.features || data.features.length === 0) {
                loadingPopup.setContent('Không tìm thấy thửa đất nào tại vị trí này.');
                setTimeout(() => map.closePopup(loadingPopup), 3000); // Tự đóng sau 3s
                return;
            }

            // Đã tìm thấy thửa đất!
            map.closePopup(loadingPopup); // Đóng thông báo loading
            const feature = data.features[0];
            const props = feature.properties;

            // 1. Xóa các thông tin cũ và highlight thửa đất mới
            hideInfoPanel();
            highlightedFeature = props.OBJECTID;
            parcelLayer.setFeatureStyle(highlightedFeature, {
                color: '#EF4444', weight: 3, fillColor: '#EF4444', fill: true, fillOpacity: 0.3
            });

            // 2. Vẽ kích thước thửa đất
            if (props.MaXa && props.SoHieuToBanDo && props.SoThuTuThua) {
                fetchAndDrawDimensions(props.MaXa, props.SoHieuToBanDo, props.SoThuTuThua);
            }

            // 3. Hiển thị bảng thông tin (sao chép logic từ hàm on.click)
            const formattedProps = {
                'Số thửa': props.SoThuTuThua,
                'Số hiệu tờ bản đồ': props.SoHieuToBanDo,
                'Diện tích': props.DienTich,
                'Ký hiệu mục đích sử dụng': props.KyHieuMucDichSuDung,
                'Địa chỉ': '<i class="text-gray-400">Đang tìm địa chỉ...</i>'
            };
            showInfoPanel('Thông tin Thửa đất', formattedProps, lat, lng);

            // 4. Lấy địa chỉ và cập nhật lại bảng thông tin
            const finalAddress = await getCachedAddress(lat, lng); // Dùng lại hàm getCachedAddress bạn đã có
            formattedProps['Địa chỉ'] = finalAddress;
            showInfoPanel('Thông tin Thửa đất', formattedProps, lat, lng);

        } catch (error) {
            console.error("Lỗi khi truy vấn thửa đất từ tọa độ:", error);
            loadingPopup.setContent('Đã xảy ra lỗi. Vui lòng thử lại.');
            setTimeout(() => map.closePopup(loadingPopup), 3000);
        }
    }
    // --- KẾT THÚC CODE MỚI ---
  
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
            adminDeleteButtonHtml = `<a class="action-button admin-delete-button" onclick="deleteListing('${item.id}')"><i class="fas fa-trash-alt"></i><span>Xóa tin</span></a>`;
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
                    <a class="action-button" onclick="getDirections(${lat}, ${lng})"><i class="fas fa-directions"></i><span>Chỉ đường</span></a>
                    <a class="action-button" onclick="openStreetView(${lat}, ${lng})"><i class="fas fa-street-view"></i><span>Street View</span></a>
                    <a class="action-button" onclick="copyLocationLink(${lat}, ${lng})"><i class="fas fa-link"></i><span>Sao chép</span></a>
                    <a class="action-button" onclick="share('facebook', ${lat}, ${lng}, '${item.name.replace(/'/g,"\\'")}')"><i class="fab fa-facebook"></i><span>Chia sẻ</span></a>
                    ${adminDeleteButtonHtml}
                </div>
            </div>
            <div class="poster-card">
                <img src="${userProfile.avatar}" alt="Avatar" class="poster-avatar-small">
                <div class="poster-name">${userProfile.name}</div>
                <div class="poster-contact-buttons">${contactIconsHtml}</div>
            </div>`;

        infoPanel.classList.remove('is-collapsed');
        infoPanel.classList.add('is-open');
    }

    function hideInfoPanel() {
        infoPanel.classList.remove('is-open');
        actionToolbar.classList.remove('is-raised', 'is-partially-raised');
        if (highlightedFeature) {
            parcelLayer.resetFeatureStyle(highlightedFeature);
            highlightedFeature = null;
        }
        dimensionMarkers.clearLayers();
    }

    function vectorTileFeatureToGeoJSON(layer) {
        try {
            const latlngs = layer.getLatLngs?.();
            if (!latlngs || latlngs.length === 0) return null;

            const coords = latlngs[0].map(p => [p.lng, p.lat]);
            coords.push(coords[0]); // Đảm bảo khép kín vòng

            return {
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [coords]
                }
            };
        } catch (err) {
            console.warn("⚠ Không thể tạo GeoJSON từ layer:", err);
            return null;
        }
    }

    // Thay thế hàm drawDimensions cũ bằng phiên bản mới này
    
    function drawDimensions(feature) {
        dimensionMarkers.clearLayers();

        if (!feature?.geometry?.coordinates) {
            console.warn("❌ Không có geometry hợp lệ để vẽ.");
            return;
        }

        let coords = feature.geometry.type === 'Polygon'
            ? feature.geometry.coordinates?.[0]
            : feature.geometry.coordinates?.[0]?.[0];

        if (!Array.isArray(coords) || coords.length < 2) {
            console.warn("❌ Không đủ tọa độ để vẽ kích thước.");
            return;
        }

        const MIN_DISPLAY_DIST = 2; // m

        let shortGroup = [];
        let totalShortDist = 0;

        function drawLabel(points, dist) {
            const flat = points.flat();
            const midIdx = Math.floor(flat.length / 2);
            const mid = flat.length % 2 === 0
                ? [
                    (flat[midIdx - 1][0] + flat[midIdx][0]) / 2,
                    (flat[midIdx - 1][1] + flat[midIdx][1]) / 2
                ]
                : flat[midIdx];
            const latlng = L.latLng(mid[1], mid[0]);

            const marker = L.marker(latlng, {
                icon: L.divIcon({
                    className: 'dimension-label-container',
                    html: `<div class="dimension-label">${Math.round(dist)}</div>`
                })
            });
            dimensionMarkers.addLayer(marker);
        }

        for (let i = 0; i < coords.length - 1; i++) {
            const p1 = coords[i];
            const p2 = coords[i + 1];
            const pt1 = L.latLng(p1[1], p1[0]);
            const pt2 = L.latLng(p2[1], p2[0]);
            const dist = pt1.distanceTo(pt2);

            if (dist < MIN_DISPLAY_DIST) {
                // Gom nhóm các cạnh nhỏ liên tiếp
                shortGroup.push([p1, p2]);
                totalShortDist += dist;
            } else {
                // Trước khi xử lý cạnh dài, vẽ nhóm ngắn nếu có
                if (shortGroup.length > 0 && totalShortDist >= MIN_DISPLAY_DIST) {
                    drawLabel(shortGroup, totalShortDist);
                }
                shortGroup = [];
                totalShortDist = 0;

                // Vẽ cạnh dài
                drawLabel([[p1, p2]], dist);
            }
        }

        // Vẽ nhóm ngắn cuối nếu còn
        if (shortGroup.length > 0 && totalShortDist >= MIN_DISPLAY_DIST) {
            drawLabel(shortGroup, totalShortDist);
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

    // KHẮC PHỤC: Xóa hàm performCadastralQuery vì không còn cần thiết.

    // --- BẮT ĐẦU THAY ĐỔI: Thay thế toàn bộ hàm handleUrlParameters ---
    function handleUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        const lat = urlParams.get('lat');
        const lng = urlParams.get('lng');
        
        if (lat && lng) {
            const targetLatLng = L.latLng(parseFloat(lat), parseFloat(lng));
            
            // Phóng to bản đồ tới vị trí
            map.setView(targetLatLng, 19);

            // Gọi hàm mới để tìm và hiển thị thông tin thửa đất
            queryAndDisplayParcelByLatLng(parseFloat(lat), parseFloat(lng));
        }
    }
    // --- KẾT THÚC THAY ĐỔI ---

    function enterAddMode() {
        exitAllModes();
        isAddMode = true;
        map.getContainer().classList.add('map-add-mode');
        addLocationBtn.classList.add('active-tool');
        instructionBanner.textContent = 'Nhấp vào bản đồ để chọn vị trí cần thêm.';
        instructionBanner.classList.remove('hidden');
    }

    function enterQueryMode() {
        exitAllModes();
        isQueryMode = true;
        map.getContainer().classList.add('map-query-mode');
        queryBtn.classList.add('active-tool');
        instructionBanner.textContent = 'Nhấp vào một thửa đất trên bản đồ để xem thông tin.';
        instructionBanner.classList.remove('hidden');
    }

    function exitAllModes() {
        isAddMode = false;
        isQueryMode = false;
        map.getContainer().classList.remove('map-add-mode', 'map-query-mode');
        addLocationBtn.classList.remove('active-tool');
        queryBtn.classList.remove('active-tool');
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
        if (!listingId) {
            alert('Không tìm thấy ID của tin đăng.');
            return;
        }
        if (confirm('Bạn có chắc chắn muốn xóa vĩnh viễn tin đăng này không?')) {
            try {
                await db.collection('listings').doc(listingId).delete();
                alert('Đã xóa tin đăng thành công!');
                hideInfoPanel();
                // không cần reload, onSnapshot sẽ tự cập nhật
            } catch (error) {
                console.error("Lỗi khi xóa tin đăng: ", error);
                alert('Có lỗi xảy ra khi xóa tin đăng.');
            }
        }
    }

    window.getDirections = function(toLat, toLng) {
        if (!navigator.geolocation) return alert('Trình duyệt của bạn không hỗ trợ định vị.');
        alert('Đang lấy vị trí của bạn để chỉ đường...');
        navigator.geolocation.getCurrentPosition( (position) => {
            const fromLat = position.coords.latitude;
            const fromLng = position.coords.longitude;
            window.open(`https://maps.google.com/maps?saddr=${fromLat},${fromLng}&daddr=${toLat},${toLng}`, '_blank');
        }, () => {
            alert('Không thể lấy được vị trí của bạn. Vui lòng kiểm tra quyền truy cập vị trí của trình duyệt.');
        });
    };

    window.copyLocationLink = function(lat, lng) {
        const url = `${window.location.origin}${window.location.pathname}?lat=${lat}&lng=${lng}`;
        navigator.clipboard.writeText(url).then(() => {
            alert('Đã sao chép liên kết vị trí!');
        }).catch(err => console.error('Lỗi sao chép: ', err));
    };

    window.toggleShareMenu = function() {
        document.getElementById('share-submenu').classList.toggle('is-visible');
    };

    window.share = function(platform, lat, lng, titleOrSoTo, soThua) {
        const indexUrl = `${window.location.origin}${window.location.pathname}?lat=${lat}&lng=${lng}`;
        // og.html is a small page that sets Open Graph meta for a specific lat/lng then redirects.
        const ogUrl = `${window.location.origin}/og.html?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}${titleOrSoTo ? `&soTo=${encodeURIComponent(titleOrSoTo)}` : ''}${soThua ? `&soThua=${encodeURIComponent(soThua)}` : ''}`;
        // Support two call styles:
        // share(platform, lat, lng, title)  OR  share(platform, lat, lng, soTo, soThua)
        let text = 'Khám phá vị trí trên Bản đồ Giá đất Cộng đồng!';
        if (soThua) {
            text = `Khám phá thửa đất (Thửa: ${soThua}, Tờ: ${titleOrSoTo}) tại Đà Nẵng trên Bản đồ Giá đất Cộng đồng!`;
        } else if (titleOrSoTo) {
            text = `${titleOrSoTo} — Xem chi tiết tại ${window.location.hostname}`;
        }

        let shareUrl = '';
        if (platform === 'facebook') {
            // Use indexUrl so the shared post includes the coordinate link (index page with lat/lng)
            shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(indexUrl)}&quote=${encodeURIComponent(text)}`;
        } else if (platform === 'whatsapp') {
            shareUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + indexUrl)}`;
        }
        if (shareUrl) window.open(shareUrl, '_blank', 'width=600,height=400');
        toggleShareMenu();
    };

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
        const endpointUrl = `/.netlify/functions/mapbox-proxy?mode=geocode&query=${encodeURIComponent(query)}&autocomplete=true&proximity=${mapCenter.lng},${mapCenter.lat}`;
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
        if (!profileMenu.classList.contains('hidden') && !userProfileDiv.contains(event.target)) {
            profileMenu.classList.add('hidden');
        }
    });

    contactInfoBtn.addEventListener('click', () => contactInfoModal.classList.remove('hidden'));
    closeContactModalBtn.addEventListener('click', () => contactInfoModal.classList.add('hidden'));
    contactInfoModal.addEventListener('click', (e) => {
        if (e.target === contactInfoModal) contactInfoModal.classList.add('hidden');
    });

    searchInput.addEventListener('input', (e) => { 
        clearTimeout(debounceTimer); 
        const query = e.target.value.trim();
        if (query.length < 2) {
            // Clear results immediately for short queries
            searchResultsContainer.innerHTML = '';
            searchResultsContainer.classList.add('hidden');
            return;
        }
        debounceTimer = setTimeout(() => { performSearch(query); }, 400); // Slightly longer delay for better performance
    });
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
        if (!navigator.geolocation) return alert('Trình duyệt của bạn không hỗ trợ định vị.');
        map.locate({ setView: true, maxZoom: 16 });
    });
    map.on('locationfound', function(e) {
        if (userLocationMarker) map.removeLayer(userLocationMarker);
        const radius = e.accuracy / 2;
        userLocationMarker = L.marker(e.latlng).addTo(map).bindPopup(`Vị trí của bạn (trong bán kính ${radius.toFixed(0)}m)`).openPopup();
    });
    map.on('locationerror', (e) => alert("Không thể lấy vị trí của bạn: " + e.message));

    map.on('click', function(e) {
        searchResultsContainer.classList.add('hidden');
        hideInfoPanel();
        if (isAddMode) {
            if (!currentUser) {
                alert("Vui lòng đăng nhập để thêm địa điểm!");
                exitAllModes();
                return;
            }
            selectedCoords = e.latlng;
            tempMarker = L.marker(selectedCoords).addTo(map);
            modal.classList.remove('hidden');
            L.esri.Geocoding.geocodeService().reverse().latlng(selectedCoords).run((error, result) => {
                document.getElementById('address-input').value = (error || !result.address) ? 'Không tìm thấy địa chỉ' : result.address.Match_addr;
            });
        }
    });

    // KHẮC PHỤC: Logic thanh trượt độ trong suốt
    opacitySlider.addEventListener('input', (e) => {
        const newOpacity = parseFloat(e.target.value);
        // Tạo một style mới chỉ với thuộc tính fillOpacity
        const newStyle = { fillOpacity: newOpacity };
        // Áp dụng style mới cho lớp bản đồ phân lô
        parcelLayer.setStyle(newStyle);
    });

    map.on('overlayadd', e => {
        if (e.name === '🗺️ Bản đồ phân lô') opacityControl.classList.remove('hidden');
    });
    map.on('overlayremove', e => {
        if (e.name === '🗺️ Bản đồ phân lô') opacityControl.classList.add('hidden');
    });

    if (map.hasLayer(parcelLayer)) opacityControl.classList.remove('hidden');
    else opacityControl.classList.add('hidden');

    donateBtn.addEventListener('click', () => donateModal.classList.remove('hidden'));
    closeDonateModalBtn.addEventListener('click', () => donateModal.classList.add('hidden'));
    donateModal.addEventListener('click', (e) => { if (e.target === donateModal) donateModal.classList.add('hidden'); });
    copyBtn.addEventListener('click', () => navigator.clipboard.writeText(accountNumber).then(() => alert("Đã sao chép số tài khoản!")));

    addLocationBtn.addEventListener('click', () => {
        if (!currentUser) {
            alert("Vui lòng đăng nhập để thêm địa điểm!");
            return;
        }
        prefillUserContact();
        isAddMode ? exitAllModes() : enterAddMode();
    });

    queryBtn.addEventListener('click', () => isQueryMode ? exitAllModes() : enterQueryMode());
    listBtn.addEventListener('click', () => listModal.classList.remove('hidden'));
    document.getElementById('close-list-btn').addEventListener('click', () => listModal.classList.add('hidden'));
    document.getElementById('close-modal-btn').addEventListener('click', () => { modal.classList.add('hidden'); exitAllModes(); });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('submit-form-btn');
        if (!currentUser) return alert("Vui lòng đăng nhập.");
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        if (!selectedCoords || !data.name || !data.priceValue) return alert('Vui lòng điền các trường bắt buộc.');
        submitBtn.textContent = 'Đang gửi...'; submitBtn.disabled = true;
        try {
            const docData = { userId: currentUser.uid, userName: currentUser.displayName, userAvatar: currentUser.photoURL, lat: selectedCoords.lat, lng: selectedCoords.lng, priceValue: parseFloat(data.priceValue), area: data.area ? parseFloat(data.area) : null, status: 'approved', createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp(), name: data.name, priceUnit: data.priceUnit, notes: data.notes || '', contactName: data.contactName || '', contactEmail: data.contactEmail || '', contactPhone: data.contactPhone || '', contactFacebook: data.contactFacebook || '' };
            await db.collection("listings").add(docData);
            alert('Gửi dữ liệu thành công, cảm ơn bạn đã đóng góp!');
            modal.classList.add('hidden'); form.reset(); exitAllModes();
        } catch (error) { console.error("Lỗi khi thêm dữ liệu: ", error); alert("Đã xảy ra lỗi khi gửi dữ liệu."); } finally { submitBtn.textContent = 'Gửi Dữ Liệu'; submitBtn.disabled = false; }
    });

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            const userRef = db.collection("users").doc(user.uid);
            const doc = await userRef.get();
            if (!doc.exists) {
                await userRef.set({
                    displayName: user.displayName || "", email: user.email || "", phone: "", contactFacebook: "", createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp()
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
        // Debug logging for production deployment differences
        console.log('🌐 Environment:', {
            hostname: window.location.hostname,
            protocol: window.location.protocol,
            userAgent: navigator.userAgent,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            platform: navigator.platform
        });
        
        // Show the FirebaseUI container
        firebaseuiContainer.classList.remove('hidden');
        firebaseuiContainer.style.display = 'flex';
        firebaseuiContainer.style.visibility = 'visible';
        
        // Log container status after changes
        console.log('📱 Container after show:', {
            classes: firebaseuiContainer.className,
            style: firebaseuiContainer.style.cssText,
            computedDisplay: window.getComputedStyle(firebaseuiContainer).display,
            rect: firebaseuiContainer.getBoundingClientRect()
        });
        
        // Detect mobile and use appropriate sign-in flow
        const isMobile = window.innerWidth <= 640 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const signInFlow = isMobile ? 'redirect' : 'popup';
        
        console.log('🔧 Auth config:', { isMobile, signInFlow });
        
        try {
            ui.start('#firebaseui-widget', { 
                signInFlow: signInFlow,
                signInOptions: [ 
                    firebase.auth.GoogleAuthProvider.PROVIDER_ID, 
                    firebase.auth.EmailAuthProvider.PROVIDER_ID 
                ], 
                callbacks: { 
                    signInSuccessWithAuthResult: () => { 
                        firebaseuiContainer.classList.add('hidden'); 
                        return false; 
                    } 
                } 
            });
            console.log('✅ FirebaseUI started on', window.location.hostname);
        } catch (error) {
            console.error('❌ FirebaseUI error:', error);
        }
    });    // Debug button removed - login functionality now works properly
    firebaseuiContainer.addEventListener('click', (e) => { if (e.target === firebaseuiContainer) firebaseuiContainer.classList.add('hidden'); });

    db.collection("listings").where("status", "==", "approved").orderBy("createdAt", "desc").onSnapshot((querySnapshot) => {
        localListings = [];
        priceMarkers.clearLayers();
        const priceList = document.getElementById('price-list');
        priceList.innerHTML = '';
        if (querySnapshot.empty) {
            priceList.innerHTML = '<p class="text-center text-gray-500 py-4">📭 Không có dữ liệu.</p>';
            return;
        }
        querySnapshot.forEach((doc) => {
            const item = { ...doc.data(), id: doc.id };
            localListings.push(item);
            if (!item.lat || !item.lng) return;

            const marker = L.marker([item.lat, item.lng]);
            marker.on('click', () => showListingInfoPanel(item));
            priceMarkers.addLayer(marker);

            const listItem = document.createElement('div');
            listItem.className = 'p-2 border-b cursor-pointer hover:bg-gray-100';
            listItem.innerHTML = `<p class="font-semibold">${item.name}</p><p class="text-sm text-red-600">${item.priceValue} ${item.priceUnit}</p>`;
            listItem.onclick = () => {
                listModal.classList.add('hidden');
                map.setView([item.lat, item.lng], 18);
                showListingInfoPanel(item);
            };
            priceList.appendChild(listItem);
        });
    });
    
    // Đặt đoạn code này bên trong sự kiện 'DOMContentLoaded'

    const searchBarContainer = document.getElementById('search-bar-container');        

    if (searchBarContainer) {
        // Mở rộng khi nhấp vào
        searchBarContainer.addEventListener('click', (event) => {
            if (!searchBarContainer.classList.contains('is-expanded')) {
                event.stopPropagation(); // Ngăn sự kiện click lan ra ngoài
                searchBarContainer.classList.add('is-expanded');
                searchInput.focus(); // Tự động trỏ vào ô input
            }
        });

        // Thu gọn khi nhấp ra ngoài
        document.addEventListener('click', (event) => {
            // Nếu click không nằm trong widget tìm kiếm VÀ ô tìm kiếm đang mở
            if (!event.target.closest('#search-widget-container') && searchBarContainer.classList.contains('is-expanded')) {
                searchInput.value = ''; // Xóa nội dung tìm kiếm
                searchResultsContainer.classList.add('hidden'); // Ẩn kết quả
                searchBarContainer.classList.remove('is-expanded');
            }
        });
    }

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
  
    // === BẮT ĐẦU: LOGIC ĐIỀU KHIỂN AKKORDEON ===

    function setupInfoAccordion() {
        const accordionHeaders = document.querySelectorAll('#info-accordion .accordion-header');

        accordionHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const content = header.nextElementSibling;
                const currentlyActive = document.querySelector('#info-accordion .accordion-header.active');

                // Đóng mục đang mở nếu nó không phải là mục vừa được click
                if (currentlyActive && currentlyActive !== header) {
                    currentlyActive.classList.remove('active');
                    currentlyActive.nextElementSibling.style.maxHeight = null;
                }
                
                // Mở hoặc đóng mục vừa click
                header.classList.toggle('active');
                
                if (header.classList.contains('active')) {
                    // Đặt max-height bằng chiều cao thực của nội dung để CSS transition hoạt động
                    content.style.maxHeight = content.scrollHeight + "px";
                } else {
                    content.style.maxHeight = null;
                }
            });
        });
    }

    // Gọi hàm này khi modal được mở ra, ví dụ:
    // trong sự kiện click của nút #contact-info-btn
    document.getElementById('contact-info-btn').addEventListener('click', () => {
        document.getElementById('contact-info-modal').classList.remove('hidden');
        // Khởi tạo accordion mỗi khi modal được mở
        setupInfoAccordion();
    });

    // Bạn cũng cần đảm bảo nút đóng hoạt động
    document.getElementById('close-contact-modal').addEventListener('click', () => {
        document.getElementById('contact-info-modal').classList.add('hidden');
    });


    // === KẾT THÚC: LOGIC ĐIỀU KHIỂN AKKORDEON ===

    handleUrlParameters();

    // === PARCEL LABELS SYSTEM ===
    let isLabelsVisible = true;
    let currentZoom = map.getZoom();
    

    
    // === PERFORMANCE OPTIMIZED LABEL SYSTEM ===
    let labelCache = new Map(); // Cache loaded labels by area
    let labelLoadTimeout = null;
    const MAX_CACHE_SIZE = 3; // Giới hạn cache để tiết kiệm memory
    
    // Memory management function
    function cleanupLabelCache() {
        if (labelCache.size > MAX_CACHE_SIZE) {
            const firstKey = labelCache.keys().next().value;
            labelCache.delete(firstKey);
        }
    }
    
    // Optimized update function with requestAnimationFrame
    function debouncedUpdateLabels() {
        clearTimeout(labelLoadTimeout);
        labelLoadTimeout = setTimeout(() => {
            if (isLabelsVisible && map.getZoom() >= MIN_LABEL_ZOOM) {
                // Use requestAnimationFrame for smooth updates
                requestAnimationFrame(() => {
                    updateParcelLabelsOptimized();
                });
            }
        }, 300); // Reduced delay to 300ms for better responsiveness
    }
    
    // Optimized label update - load only 1 relevant area
    async function updateParcelLabelsOptimized() {
        parcelLabels.clearLayers();
        
        if (map.getZoom() < MIN_LABEL_ZOOM) return;
        
        try {
            const center = map.getCenter();
            
            // Find the most relevant area based on map center
            // This is a simplified approach - load only ONE area closest to center
            const targetArea = findClosestArea(center);
            
            if (targetArea && !labelCache.has(targetArea)) {
                // Load and cache only one area at a time
                const labels = await loadSingleAreaLabels(targetArea);
                labelCache.set(targetArea, labels);
                cleanupLabelCache(); // Manage memory usage
            }
            
            // Display cached labels for current area
            const cachedLabels = labelCache.get(targetArea);
            if (cachedLabels) {
                const bounds = map.getBounds();
                cachedLabels.forEach(label => {
                    if (bounds.contains(label.getLatLng())) {
                        parcelLabels.addLayer(label);
                    }
                });
            }
            
        } catch (error) {
            console.log('Label loading error:', error.message);
        }
    }
    
    // Find closest area to map center (simplified)
    function findClosestArea(center) {
        // Sample a few key areas around Đà Nẵng center
        const keyAreas = ['20194', '20195', '20197'];
        return keyAreas[0]; // For now, just use first area to minimize load
    }
    
    // Load single area efficiently
    async function loadSingleAreaLabels(maXa) {
        try {
            const response = await fetch(`data/parcels/${maXa}.geojson`);
            if (!response.ok) return [];
            
            const geojson = await response.json();
            const labels = [];
            
            // Process only first 20 features to reduce computation
            const features = geojson.features.slice(0, 20);
            
            features.forEach(feature => {
                const props = feature.properties;
                if (props?.SoThuTuThua && feature.geometry?.coordinates) {
                    const coords = feature.geometry.coordinates[0];
                    if (coords && coords.length > 3) {
                        // Fast centroid calculation
                        const centerLng = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
                        const centerLat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
                        
                        const label = L.marker([centerLat, centerLng], {
                            icon: L.divIcon({
                                className: 'parcel-number-label',
                                html: props.SoThuTuThua,
                                iconSize: [null, null],
                                iconAnchor: [10, 6]
                            }),
                            interactive: false
                        });
                        
                        labels.push(label);
                    }
                }
            });
            
            return labels;
        } catch (error) {
            return [];
        }
    }
    
    // Update labels with optimized event handling
    map.on('zoomend', debouncedUpdateLabels);
    map.on('moveend', () => {
        clearTimeout(moveTimeout);
        moveTimeout = setTimeout(debouncedUpdateLabels, 200); // Separate timeout for move events
    });
    
    // Performance monitoring (remove in production if needed)
    if (window.location.hostname === 'localhost') {
        let performanceTimer = Date.now();
        map.on('zoomstart movestart', () => { performanceTimer = Date.now(); });
        map.on('zoomend moveend', () => {
            const elapsed = Date.now() - performanceTimer;
            if (elapsed > 100) console.log(`⚠️ Map operation took ${elapsed}ms`);
        });
    }
    
    // Handle layer toggle
    map.on('overlayadd', (e) => {
        if (e.name === '🏷️ Số thửa') {
            isLabelsVisible = true;
            debouncedUpdateLabels();
        }
    });
    
    map.on('overlayremove', (e) => {
        if (e.name === '🏷️ Số thửa') {
            isLabelsVisible = false;
            parcelLabels.clearLayers();
            clearTimeout(labelLoadTimeout);
        }
    });
});
// KHẮC PHỤC: Đã xóa dòng }); thừa ở đây