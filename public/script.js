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

// --- GOOGLE DRIVE API CONFIGURATION ---
const GOOGLE_CONFIG = {
    apiKey: "AIzaSyClLHGUQnD062f6KW-SG1R36pNw-7rmdGI",
    clientId: "895990431722-7oeoa9vmib64n88g29omn5p6jgv7uqvn.apps.googleusercontent.com",
    discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
    scope: "https://www.googleapis.com/auth/drive.file"
};

// --- IMGUR API CONFIGURATION ---
const IMGUR_CONFIG = {
    clientId: "546c25a59c58ad7", // Free tier Imgur API
    apiUrl: "https://api.imgur.com/3/image"
};

// Global variables for Google Drive
let isGoogleDriveReady = false;
let googleAuthInstance = null;

// --- SERVICE INITIALIZATION ---
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
const cachedGeojsonByMaXa = {};
const frequentlyUsedXa = ["20194", "20195", "20197", "20198", "20200", "20203", "20206", "20207"]; 
// Cập nhật danh sách các xã/phường có sẵn dữ liệu
// Dựa trên các file .geojson thực tế trong thư mục data/parcels/



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
    console.log('🚀 DOM Content Loaded - Initializing app...');

    // --- MAP AND LAYERS INITIALIZATION ---
    window.map = L.map('map', { center: [16.054456, 108.202167], zoom: 13, zoomControl: false });
    const myAttribution = '© XemGiaDat | 📌 Dữ liệu tham khảo từ Sở TNMT Đà Nẵng. Không có giá trị pháp lý.';
    const googleStreets = L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',{ maxZoom: 20, subdomains:['mt0','mt1','mt2','mt3'], attribution: myAttribution + ' | © Google Maps' });
    const googleSat = L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',{ maxZoom: 20, subdomains:['mt0','mt1','mt2','mt3'], attribution: myAttribution + ' | © Google Satellite' });
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: myAttribution + ' | © OpenStreetMap' });

    // --- KHẮC PHỤC & TỐI ƯU: TÍCH HỢP BẢN ĐỒ PHÂN LÔ TỪ MAPBOX ---

    // 1. Biến toàn cục cho lớp bản đồ và thửa đất được highlight
    let parcelLayer = null;
    let highlightedFeature = null;
    let parcelLabels = L.layerGroup(); // Layer group cho số thửa
    let isLabelsVisible = true; // Biến kiểm soát hiển thị labels

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
    try {
        parcelLayer = L.vectorGrid.protobuf(tileUrl, vectorTileOptions);
        
        // Xử lý lỗi 404 tiles để tránh spam console
        parcelLayer.on('tileerror', function(e) {
            // Chỉ log lỗi nghiêm trọng, bỏ qua 404 (tile không tồn tại)
            if (e.error && !e.error.message?.includes('404')) {
                console.warn('Lỗi tải vector tile:', e.error);
            }
        });
    } catch (err) {
        console.warn('Map layer failed to load (non-fatal):', err);
        // Tạo empty layer group để UI vẫn hoạt động
        parcelLayer = L.layerGroup();
    }
    
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
    const guideBtn = document.getElementById('guide-btn');
    const feedbackBtn = document.getElementById('feedback-btn');
    const feedbackModal = document.getElementById('feedback-modal');
    const closeFeedbackModalBtn = document.getElementById('close-feedback-modal');
    const adminBtn = document.getElementById('admin-btn');
    
    // Initialize portfolio DOM elements
    portfolioBtn = document.getElementById('portfolio-menu-btn'); // Changed from 'portfolio-btn' to 'portfolio-menu-btn'
    portfolioModal = document.getElementById('portfolio-modal');
    closePortfolioModal = document.getElementById('close-portfolio-modal');
    addPortfolioModal = document.getElementById('add-portfolio-modal');
    closeAddPortfolioModal = document.getElementById('close-add-portfolio-modal');
    portfolioForm = document.getElementById('portfolio-form');

    // Debug: Check if elements exist
    console.log('🔍 Button elements check:', {
        feedbackBtn: !!feedbackBtn,
        feedbackModal: !!feedbackModal,
        closeFeedbackModalBtn: !!closeFeedbackModalBtn,
        adminBtn: !!adminBtn,
        contactInfoBtn: !!contactInfoBtn,
        contactInfoModal: !!contactInfoModal
    });

    // === IMMEDIATE EVENT LISTENERS SETUP ===
    // Setup button event listeners immediately after DOM element declarations
    
    // Feedback system - Setup immediately
    if (feedbackBtn && feedbackModal && closeFeedbackModalBtn) {
        console.log('✅ Setting up feedback button listeners...');
        feedbackBtn.addEventListener('click', () => {
            console.log('👆 Feedback button clicked!');
            // Use utility function for consistent modal management
            showModal(feedbackModal);
        });

        closeFeedbackModalBtn.addEventListener('click', () => {
            console.log('❌ Closing feedback modal');
            hideModal(feedbackModal);
        });

        feedbackModal.addEventListener('click', (e) => {
            if (e.target === feedbackModal) {
                hideModal(feedbackModal);
            }
        });
    } else {
        console.error('❌ Feedback elements not found:', {
            feedbackBtn: !!feedbackBtn,
            feedbackModal: !!feedbackModal,
            closeFeedbackModalBtn: !!closeFeedbackModalBtn
        });
    }

    // Guide button
    if (guideBtn) {
        guideBtn.addEventListener('click', () => {
            console.log('📖 Guide button clicked');
            window.open('guide.html', '_blank');
        });
    }

    // Admin button (visible only for admin users after login)
    if (adminBtn) {
        adminBtn.addEventListener('click', () => {
            console.log('⚙️ Admin button clicked');
            window.open('admin.html', '_blank');
        });
    }

    // Contact info modal
    if (contactInfoBtn && contactInfoModal && closeContactModalBtn) {
        contactInfoBtn.addEventListener('click', () => {
            console.log('ℹ️ Contact info button clicked');
            console.log('📱 Contact modal element:', contactInfoModal);
            console.log('📱 Modal classes before:', contactInfoModal.className);

            // Use modal helper to ensure consistent state
            showModal(contactInfoModal);

            console.log('📱 Modal classes after:', contactInfoModal.className);
            setupInfoAccordion();
        });

        closeContactModalBtn.addEventListener('click', () => {
            hideModal(contactInfoModal);
        });

        contactInfoModal.addEventListener('click', (e) => {
            if (e.target === contactInfoModal) {
                hideModal(contactInfoModal);
            }
        });
    }

    // Portfolio modal event listeners
    // Portfolio button event listener - MOVED TO PROFILE MENU
    if (portfolioBtn) {
        console.log('✅ Portfolio button found (now in menu)');
        
        // Add test function to window for debugging
        window.testPortfolioModal = function() {
            console.log('🧪 Testing portfolio modal manually...');
            const modal = document.getElementById('portfolio-modal');
            if (modal) {
                showModal(modal);
            } else {
                console.error('❌ Portfolio modal not found');
            }
        };
        
        // NOTE: Event listener now handled in profile menu section (portfolio-menu-btn)
        
        // Test button accessibility
        console.log('🔍 Portfolio button properties:', {
            id: portfolioBtn.id,
            className: portfolioBtn.className,
            style: portfolioBtn.style.cssText,
            position: portfolioBtn.getBoundingClientRect(),
            visible: portfolioBtn.offsetParent !== null,
            zIndex: window.getComputedStyle(portfolioBtn).zIndex,
            pointerEvents: window.getComputedStyle(portfolioBtn).pointerEvents
        });
    } else {
        console.log('⚠️ Portfolio button not found - using menu item instead');
    }

    if (closePortfolioModal) {
        closePortfolioModal.addEventListener('click', () => {
            hideModal(portfolioModal);
        });
    }

    if (portfolioModal) {
        portfolioModal.addEventListener('click', (e) => {
            if (e.target === portfolioModal) {
                hideModal(portfolioModal);
            }
        });
    }

    // Add portfolio modal event listeners
    if (closeAddPortfolioModal) {
        closeAddPortfolioModal.addEventListener('click', () => {
            hideModal(addPortfolioModal);
            portfolioForm.reset();
            delete portfolioForm.dataset.editingId;
            selectedParcelData = null;
        });
    }

    if (document.getElementById('cancel-portfolio-form')) {
        document.getElementById('cancel-portfolio-form').addEventListener('click', () => {
            hideModal(addPortfolioModal);
            portfolioForm.reset();
            delete portfolioForm.dataset.editingId;
            selectedParcelData = null;
        });
    }

    if (addPortfolioModal) {
        addPortfolioModal.addEventListener('click', (e) => {
            if (e.target === addPortfolioModal) {
                hideModal(addPortfolioModal);
                portfolioForm.reset();
                delete portfolioForm.dataset.editingId;
                selectedParcelData = null;
            }
        });
    }

    // Portfolio form submission
    if (portfolioForm) {
        portfolioForm.addEventListener('submit', handlePortfolioFormSubmit);
    }

    // Portfolio filter change
    if (document.getElementById('portfolio-filter')) {
        document.getElementById('portfolio-filter').addEventListener('change', renderPortfolioList);
    }

    // Add portfolio button in modal
    if (document.getElementById('add-to-portfolio-btn')) {
        document.getElementById('add-to-portfolio-btn').addEventListener('click', () => {
            // Reset form for new item
            portfolioForm.reset();
            delete portfolioForm.dataset.editingId;
            selectedParcelData = null;
            document.getElementById('add-portfolio-title').innerHTML = '<i class="fa-solid fa-plus mr-2 text-indigo-600"></i>Thêm vào Ví BĐS';
            showModal(addPortfolioModal);
        });
    }

    // --- INITIALIZE LISTENERS & SETUP ---
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
            <button onclick="addToPortfolioFromPanel('${soThua}', '${soTo}', '${loaiDat}', ${dienTich}, ${lat}, ${lng})">
                <i class="icon fas fa-briefcase text-indigo-600"></i>
                <span class="text">Thêm vào ví</span>
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

    // Quick function to show parcel info from search results
    async function showParcelFromSearchResult(soThua, soTo, maXa, lat, lng) {
        // Highlight the parcel on map if it's a vector tile
        try {
            // Try to find and highlight the parcel in vector tiles
            await queryAndDisplayParcelByLatLng(lat, lng);
        } catch (error) {
            // If vector tile method fails, show basic info
            const basicProps = {
                'Số thửa': soThua,
                'Số hiệu tờ bản đồ': soTo,
                'Diện tích': 'Đang tải...',
                'Ký hiệu mục đích sử dụng': 'Đang tải...',
                'Địa chỉ': 'Đang tìm địa chỉ...'
            };
            showInfoPanel('Thông tin Thửa đất', basicProps, lat, lng);
            
            // Load detailed info from GeoJSON
            fetchAndDrawDimensions(maXa, soTo, soThua);
        }
    }

    // --- BẮT ĐẦU CODE MỚI: Thêm hàm này vào file script.js ---

    async function queryAndDisplayParcelByLatLng(lat, lng) {
        console.log('🔍 Starting parcel query:', { lat, lng });
        
        // Kiểm tra xem map đã sẵn sàng chưa
        if (!window.map) {
            console.error('❌ Map not available for parcel query');
            return;
        }
        
        // Hiển thị một thông báo cho người dùng biết hệ thống đang xử lý
        const loadingPopup = L.popup()
            .setLatLng([lat, lng])
            .setContent('Đang tìm thông tin thửa đất tại đây...')
            .openOn(window.map);

        const tilesetId = 'hvduoc.danang_parcels_final'; // Lấy từ code của bạn
        const queryUrl = `https://api.mapbox.com/v4/${tilesetId}/tilequery/${lng},${lat}.json?limit=1&access_token=${mapboxAccessToken}`;
        
        console.log('🌐 Making request to:', queryUrl);

        try {
            const response = await fetch(queryUrl);
            const data = await response.json();
            
            console.log('📡 Received response:', data);

            if (!data.features || data.features.length === 0) {
                console.log('⚠️ No parcel found at coordinates');
                loadingPopup.setContent('Không tìm thấy thửa đất nào tại vị trí này.');
                setTimeout(() => window.map.closePopup(loadingPopup), 3000); // Tự đóng sau 3s
                return;
            }

            // Đã tìm thấy thửa đất!
            console.log('✅ Found parcel:', data.features[0]);
            window.map.closePopup(loadingPopup); // Đóng thông báo loading
            const feature = data.features[0];
            const props = feature.properties;

            // 1. Xóa các thông tin cũ và highlight thửa đất mới
            hideInfoPanel();
            highlightedFeature = props.OBJECTID;
            if (parcelLayer && typeof parcelLayer.setFeatureStyle === 'function') {
                parcelLayer.setFeatureStyle(highlightedFeature, {
                    color: '#EF4444', weight: 3, fillColor: '#EF4444', fill: true, fillOpacity: 0.3
                });
            }

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
            setTimeout(() => window.map.closePopup(loadingPopup), 3000);
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
            console.log('🔗 Processing URL parameters:', { lat, lng });
            
            // Đảm bảo map đã được khởi tạo
            if (!window.map) {
                console.error('❌ Map not initialized yet, retrying...');
                setTimeout(() => handleUrlParameters(), 500);
                return;
            }
            
            const targetLatLng = L.latLng(parseFloat(lat), parseFloat(lng));
            console.log('📍 Setting map view to:', targetLatLng);
            
            // Phóng to bản đồ tới vị trí
            window.map.setView(targetLatLng, 19);

            // Đợi một chút để map render xong rồi mới query parcel
            setTimeout(() => {
                console.log('🔍 Querying parcel at coordinates...');
                if (typeof queryAndDisplayParcelByLatLng === 'function') {
                    queryAndDisplayParcelByLatLng(parseFloat(lat), parseFloat(lng));
                } else {
                    console.error('❌ queryAndDisplayParcelByLatLng function not available');
                }
            }, 1000);
        }
    }
    // --- KẾT THÚC THAY ĐỔI ---

    function enterAddMode() {
    exitAllModes();
    isAddMode = true;
    map.getContainer().classList.add('map-add-mode');
    addLocationBtn.classList.add('active-tool');
    const instructionText = document.getElementById('instruction-text');
    instructionText.textContent = 'Nhấp vào bản đồ để chọn vị trí cần thêm.';
    instructionBanner.classList.remove('hidden');
    setTimeout(() => instructionBanner.classList.add('hidden'), 3500);
    }

    function enterQueryMode() {
    exitAllModes();
    isQueryMode = true;
    map.getContainer().classList.add('map-query-mode');
    queryBtn.classList.add('active-tool');
    const instructionText = document.getElementById('instruction-text');
    instructionText.textContent = 'Nhấp vào một thửa đất trên bản đồ để xem thông tin.';
    instructionBanner.classList.remove('hidden');
    setTimeout(() => instructionBanner.classList.add('hidden'), 3500);
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
    // Hiển thị hướng dẫn khi nhấn nút
    const showGuideBtn = document.getElementById('show-guide-btn');
    if (showGuideBtn) {
        showGuideBtn.addEventListener('click', () => {
            const instructionText = document.getElementById('instruction-text');
            instructionText.textContent = 'Hướng dẫn: Nhấn vào bản đồ để chọn vị trí hoặc tra cứu thông tin thửa đất. Sử dụng các nút bên dưới để thao tác nhanh.';
            instructionBanner.classList.remove('hidden');
            setTimeout(() => instructionBanner.classList.add('hidden'), 5000);
        });
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

    // === ENHANCED SEARCH SYSTEM WITH PARCEL DATA ===
    
    // Parse Vietnamese parcel input formats
    function parseParcelQuery(query) {
        const patterns = [
            /(?:thửa|thua)\s*(\d+)[\s,]*(?:tờ|to)\s*(\d+)/i, // "Thửa 123, Tờ 45"
            /(\d+)\/(\d+)/, // "123/45" format
            /^(\d+)$/ // Just number - assume parcel number
        ];
        
        for (const pattern of patterns) {
            const match = query.match(pattern);
            if (match) {
                if (pattern === patterns[2]) { // Just number
                    return { soThua: match[1], soTo: null };
                } else {
                    return { soThua: match[1], soTo: match[2] };
                }
            }
        }
        return null;
    }
    
    // Search parcels in loaded GeoJSON data - WITH DEBUG
    async function searchParcelsInCache(soThua, soTo = null) {
        console.log(`🔍 Tìm kiếm thửa ${soThua}, tờ ${soTo || 'bất kỳ'}`);
        
        const results = [];
        const maxResults = 8;
        
        // Updated areas list to match actual available files
        const availableAreas = ['20194', '20195', '20197', '20198', '20200']; // Start with these
        
        for (const maXa of availableAreas) {
            if (results.length >= maxResults) break;
            
            console.log(`🗂️ Đang kiểm tra khu vực ${maXa}...`);
            
            if (!cachedGeojsonByMaXa[maXa]) {
                try {
                    console.log(`📥 Đang tải ${maXa}.geojson...`);
                    const response = await fetch(`data/parcels/${maXa}.geojson`);
                    
                    if (response.ok) {
                        const geojson = await response.json();
                        cachedGeojsonByMaXa[maXa] = geojson;
                        console.log(`✅ Đã tải ${maXa}.geojson - ${geojson.features?.length || 0} thửa`);
                    } else {
                        console.log(`❌ Lỗi tải ${maXa}.geojson: ${response.status}`);
                        continue;
                    }
                } catch (error) {
                    console.log(`❌ Không thể tải dữ liệu cho khu vực ${maXa}:`, error);
                    continue;
                }
            }
            
            const geojson = cachedGeojsonByMaXa[maXa];
            if (geojson && geojson.features) {
                console.log(`🔎 Tìm kiếm trong ${geojson.features.length} thửa tại ${maXa}`);
                
                const matchedFeatures = geojson.features.filter(feature => {
                    const props = feature.properties;
                    const matchThua = props && props.SoThuTuThua == soThua;
                    const matchTo = !soTo || props.SoHieuToBanDo == soTo;
                    
                    if (matchThua && matchTo) {
                        console.log(`✨ Tìm thấy: Thửa ${props.SoThuTuThua}, Tờ ${props.SoHieuToBanDo}, Xã ${maXa}`);
                    }
                    
                    return matchThua && matchTo;
                });
                
                console.log(`📊 Tìm thấy ${matchedFeatures.length} kết quả tại ${maXa}`);
                
                matchedFeatures.slice(0, maxResults - results.length).forEach(feature => {
                    const props = feature.properties;
                    
                    // Handle different coordinate structures
                    let coords = feature.geometry.coordinates[0];
                    
                    // Skip if no valid coordinates
                    if (!coords || coords.length < 3) {
                        console.log(`⚠️ Thửa ${props.SoThuTuThua} có tọa độ không hợp lệ`);
                        return;
                    }
                    
                    // Fast centroid calculation
                    let centerLng = 0, centerLat = 0;
                    const validCoords = coords.filter(c => Array.isArray(c) && c.length >= 2);
                    
                    for (let i = 0; i < validCoords.length; i++) {
                        centerLng += validCoords[i][0];
                        centerLat += validCoords[i][1];
                    }
                    centerLng /= validCoords.length;
                    centerLat /= validCoords.length;
                    
                    console.log(`📍 Centroid: ${centerLat.toFixed(6)}, ${centerLng.toFixed(6)}`);
                    
                    results.push({
                        soThua: props.SoThuTuThua,
                        soTo: props.SoHieuToBanDo,
                        dienTich: props.DienTich ? Math.round(props.DienTich * 10) / 10 : null,
                        loaiDat: props.KyHieuMucDichSuDung,
                        maXa: maXa,
                        lat: centerLat,
                        lng: centerLng,
                        feature: feature
                    });
                });
            }
            
            if (results.length >= maxResults) break;
        }
        
        console.log(`🎯 Tổng cộng tìm thấy ${results.length} kết quả`);
        return results;
    }

    const performSearch = async (query) => {
        if (!query) {
            searchResultsContainer.innerHTML = '';
            searchResultsContainer.classList.add('hidden');
            return;
        }
        
        searchResultsContainer.innerHTML = '<div class="p-4 text-center text-gray-500"><i class="fas fa-search animate-spin mr-2"></i>Đang tìm kiếm...</div>';
        searchResultsContainer.classList.remove('hidden');
        
        let html = '';
        
        // 1. TÌM KIẾM THỬA ĐẤT (ưu tiên cao nhất)
        const parcelQuery = parseParcelQuery(query);
        if (parcelQuery) {
            const parcelResults = await searchParcelsInCache(parcelQuery.soThua, parcelQuery.soTo);
            if (parcelResults.length > 0) {
                html += '<div class="result-category"><i class="fas fa-map-marked-alt mr-2"></i>Thửa đất</div>';
                parcelResults.forEach(parcel => {
                    const displayText = `Thửa ${parcel.soThua}, Tờ ${parcel.soTo}`;
                    const subText = `${parcel.dienTich ? parcel.dienTich + ' m²' : ''} • ${parcel.loaiDat || 'N/A'}`;
                    html += `<div class="result-item" data-type="parcel" data-lat="${parcel.lat}" data-lng="${parcel.lng}" 
                             data-so-thua="${parcel.soThua}" data-so-to="${parcel.soTo}" data-ma-xa="${parcel.maXa}">
                        <i class="icon fas fa-map-marker-alt text-red-500"></i>
                        <div>
                            <strong>${displayText}</strong>
                            <div class="text-sm text-gray-600">${subText}</div>
                        </div>
                    </div>`;
                });
            }
        }
        
        // 2. TÌM KIẾM TIN ĐĂNG
        const listingResults = localListings.filter(item => 
            item.name.toLowerCase().includes(query.toLowerCase())
        );
        if (listingResults.length > 0) {
            html += '<div class="result-category"><i class="fas fa-tags mr-2"></i>Tin đăng bất động sản</div>';
            listingResults.slice(0, 5).forEach(item => {
                html += `<div class="result-item" data-type="listing" data-id="${item.id}">
                    <i class="icon fa-solid fa-tag text-yellow-500"></i>
                    <div>
                        <strong>${item.name}</strong>
                        <span class="price text-red-600">${item.priceValue} ${item.priceUnit}</span>
                    </div>
                </div>`;
            });
        }
        
        // 3. TÌM KIẾM ĐỊA ĐIỂM (chỉ khi không có kết quả thửa đất và không phải số)
        if (!parcelQuery && html === '') {
            // Chỉ tìm địa điểm khi không phải số thửa đất
            if (!/^\d+/.test(query)) {
                const mapCenter = map.getCenter();
                const endpointUrl = `/.netlify/functions/mapbox-proxy?mode=geocode&query=${encodeURIComponent(query)}&autocomplete=true&proximity=${mapCenter.lng},${mapCenter.lat}`;
                try {
                    const response = await fetch(endpointUrl);
                    if (response.ok) {
                        const data = await response.json();
                        if (data.features && data.features.length > 0) {
                            html += '<div class="result-category"><i class="fas fa-map-pin mr-2"></i>Địa điểm</div>';
                            data.features.slice(0, 3).forEach(feature => {
                                html += `<div class="result-item" data-type="location" data-lat="${feature.center[1]}" data-lng="${feature.center[0]}">
                                    <i class="icon fa-solid fa-map-marker-alt text-blue-500"></i>
                                    <span>${feature.place_name}</span>
                                </div>`;
                            });
                        }
                    }
                } catch (error) { 
                    console.error("Lỗi tìm kiếm địa chỉ Mapbox:", error); 
                }
            }
        }
        
        if (html === '') {
            let helpText = 'Thử tìm: "Thửa 123, Tờ 45" hoặc "123/45"';
            if (parcelQuery) {
                helpText = `Không tìm thấy thửa ${parcelQuery.soThua}${parcelQuery.soTo ? ', tờ ' + parcelQuery.soTo : ''}. Thử các khu vực khác hoặc kiểm tra lại số thửa.`;
            }
            searchResultsContainer.innerHTML = `<div class="p-4 text-center text-gray-500">
                <i class="fas fa-search-minus mr-2"></i>Không tìm thấy kết quả nào.<br>
                <small class="text-xs">${helpText}</small>
            </div>`;
        } else {
            searchResultsContainer.innerHTML = html;
        }
        
        // Show community parcel information
    async function showCommunityParcelInfo(parcelNumber, mapSheet) {
        const key = `${parcelNumber}_${mapSheet}`;
        const contribution = communityContributions.get(key);
        
        if (!contribution) {
            showToast('❌ Không tìm thấy thông tin thửa đất', 'error');
            return;
        }
        
        const official = contribution.officialData;
        const community = contribution.communityData;
        
        // Try to find and highlight the actual parcel
        try {
            const result = await searchParcelsInCache(parcelNumber, mapSheet);
            if (result && result.length > 0) {
                const feature = result[0];
                highlightParcel(feature);
            }
        } catch (error) {
            console.warn('Could not highlight parcel:', error);
        }
        
        // Show enhanced info panel
        const panel = document.getElementById('info-panel');
        const title = document.getElementById('panel-title');
        const content = document.getElementById('panel-content');

        title.innerHTML = `
            Thửa ${parcelNumber}, Tờ ${mapSheet}
            <span class="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Cộng đồng</span>
        `;
        
        content.innerHTML = `
            <div class="space-y-3 text-sm">
                <!-- Official Data -->
                <div class="p-3 bg-gray-50 rounded-lg">
                    <h4 class="font-bold text-gray-800 mb-2">📋 Thông tin chính thức</h4>
                    <div class="space-y-1 text-xs">
                        <div class="flex justify-between">
                            <span class="text-gray-600">Diện tích:</span>
                            <span class="font-medium">${official.area} m²</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Mục đích sử dụng:</span>
                            <span class="font-medium">${getLandUseLabel(official.landUse)}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Khu vực:</span>
                            <span class="font-medium">${official.adminCode}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Community Data -->
                <div class="p-3 bg-green-50 rounded-lg border border-green-200">
                    <h4 class="font-bold text-green-800 mb-2">
                        <i class="fas fa-users mr-1"></i>Thông tin từ cộng đồng
                    </h4>
                    <div class="space-y-2 text-xs">
                        ${community.projectName ? `
                            <div>
                                <span class="text-green-700 font-medium">🏗️ Dự án:</span>
                                <span class="ml-1">${community.projectName}</span>
                            </div>
                        ` : ''}
                        
                        ${community.lotNumber ? `
                            <div>
                                <span class="text-green-700 font-medium">📍 Số lô:</span>
                                <span class="ml-1">${community.lotNumber}</span>
                            </div>
                        ` : ''}
                        
                        ${community.blockCode ? `
                            <div>
                                <span class="text-green-700 font-medium">🏘️ Block:</span>
                                <span class="ml-1">${community.blockCode}</span>
                            </div>
                        ` : ''}
                        
                        ${community.commonName ? `
                            <div>
                                <span class="text-green-700 font-medium">🏷️ Tên gọi:</span>
                                <span class="ml-1">${community.commonName}</span>
                            </div>
                        ` : ''}
                        
                        ${community.marketPrice ? `
                            <div>
                                <span class="text-green-700 font-medium">💰 Giá thị trường:</span>
                                <span class="ml-1 font-bold text-green-800">
                                    ${community.marketPrice} triệu${community.priceUnit === 'per_m2' ? '/m²' : ''}
                                </span>
                            </div>
                        ` : ''}
                        
                        ${community.brokerCode ? `
                            <div>
                                <span class="text-green-700 font-medium">🔖 Mã môi giới:</span>
                                <span class="ml-1">${community.brokerCode}</span>
                            </div>
                        ` : ''}
                        
                        ${community.description ? `
                            <div class="mt-2 pt-2 border-t border-green-200">
                                <span class="text-green-700 font-medium">📝 Mô tả:</span>
                                <p class="mt-1 text-gray-700">${community.description}</p>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <!-- Actions -->
                <div class="flex space-x-2">
                    <button class="flex-1 bg-green-500 text-white py-2 rounded text-xs hover:bg-green-600 transition" 
                            onclick="shareParcelInfo('${parcelNumber}', '${mapSheet}')">
                        <i class="fas fa-share mr-1"></i>Chia sẻ
                    </button>
                    <button class="flex-1 bg-blue-500 text-white py-2 rounded text-xs hover:bg-blue-600 transition" 
                            onclick="openContributionModalForParcel('${parcelNumber}', '${mapSheet}')">
                        <i class="fas fa-edit mr-1"></i>Cập nhật
                    </button>
                </div>
                
                <!-- Contributor info -->
                <div class="pt-2 border-t text-xs text-gray-500">
                    <i class="fas fa-user mr-1"></i>
                    Đóng góp bởi: ${contribution.contributor.userName || 'Người dùng'}
                    <span class="ml-2">
                        <i class="fas fa-clock mr-1"></i>
                        ${new Date(contribution.timestamp).toLocaleDateString('vi-VN')}
                    </span>
                </div>
            </div>
        `;

        // Show panel
        panel.classList.remove('translate-y-full');
        searchResultsContainer.classList.add('hidden');
        searchInput.value = '';
    }

    // Share parcel info
    window.shareParcelInfo = function(parcelNumber, mapSheet) {
        const shareData = {
            title: `Thửa ${parcelNumber}, Tờ ${mapSheet} - XemGiaDat`,
            text: `Thông tin chi tiết thửa ${parcelNumber}, tờ ${mapSheet} với dữ liệu từ cộng đồng`,
            url: window.location.href
        };
        
        if (navigator.share) {
            navigator.share(shareData);
        } else {
            navigator.clipboard.writeText(shareData.url).then(() => {
                showToast('📋 Đã copy link vào clipboard', 'success');
            });
        }
    };

    // Open contribution modal for specific parcel
    window.openContributionModalForParcel = function(parcelNumber, mapSheet) {
        // Pre-fill the contribution form
        document.getElementById('contrib-parcel').value = parcelNumber;
        document.getElementById('contrib-map-sheet').value = mapSheet;
        
        // Auto-search and select the parcel
        searchParcelForContribution().then(() => {
            openContributionModal();
            goToStep2(); // Skip to data entry step
        });
    };

    // Add enhanced search suggestions for community data
        addCommunitySearchSuggestions(originalQuery);
    };

    // Add community-based search suggestions
    function addCommunitySearchSuggestions(query) {
        if (!query || query.length < 3) return;
        
        const suggestions = [];
        
        // Search through community contributions
        for (const [key, contribution] of communityContributions.entries()) {
            const community = contribution.communityData;
            const official = contribution.officialData;
            
            // Check if query matches any community identifiers
            const searchableText = [
                community.projectName,
                community.lotNumber,
                community.commonName,
                community.brokerCode,
                community.blockCode
            ].filter(Boolean).join(' ').toLowerCase();
            
            if (searchableText.includes(query.toLowerCase())) {
                suggestions.push({
                    type: 'community',
                    parcelNumber: official.parcelNumber,
                    mapSheet: official.mapSheet,
                    matchedField: getMostRelevantField(community, query),
                    projectName: community.projectName,
                    lotNumber: community.lotNumber,
                    commonName: community.commonName
                });
            }
        }
        
        // Add suggestions to search results if found
        if (suggestions.length > 0) {
            const existingHtml = searchResultsContainer.innerHTML;
            let suggestionHtml = `
                <div class="border-t border-gray-200 mt-2 pt-2">
                    <div class="result-category">
                        <i class="fas fa-users mr-2 text-green-600"></i>Dữ liệu từ cộng đồng
                    </div>
            `;
            
            suggestions.slice(0, 3).forEach(suggestion => {
                suggestionHtml += `
                    <div class="result-item community-result" data-type="community-parcel" 
                         data-parcel="${suggestion.parcelNumber}" data-mapsheet="${suggestion.mapSheet}">
                        <i class="icon fa-solid fa-map-marker-alt text-green-500"></i>
                        <div class="flex-1">
                            <div class="font-medium">Thửa ${suggestion.parcelNumber}, Tờ ${suggestion.mapSheet}</div>
                            <div class="text-xs text-gray-600">
                                ${suggestion.projectName ? `🏗️ ${suggestion.projectName}` : ''}
                                ${suggestion.lotNumber ? ` • 📍 ${suggestion.lotNumber}` : ''}
                                ${suggestion.commonName ? ` • 🏷️ ${suggestion.commonName}` : ''}
                            </div>
                        </div>
                        <span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Cộng đồng</span>
                    </div>
                `;
            });
            
            suggestionHtml += '</div>';
            
            if (existingHtml.includes('Không tìm thấy kết quả nào')) {
                searchResultsContainer.innerHTML = suggestionHtml;
            } else {
                searchResultsContainer.innerHTML = existingHtml + suggestionHtml;
            }
        }
    }

    // Get most relevant field that matches the query
    function getMostRelevantField(community, query) {
        const fields = [
            { key: 'projectName', label: 'Dự án' },
            { key: 'lotNumber', label: 'Số lô' },
            { key: 'commonName', label: 'Tên thông dụng' },
            { key: 'brokerCode', label: 'Mã môi giới' },
            { key: 'blockCode', label: 'Block/Khu' }
        ];
        
        for (const field of fields) {
            if (community[field.key] && community[field.key].toLowerCase().includes(query.toLowerCase())) {
                return field.label;
            }
        }
        return 'Khác';
    }

    // --- EVENT LISTENERS ---
    userProfileDiv.addEventListener('click', (event) => {
        console.log('👤 User profile clicked, toggling menu');
        event.stopPropagation();
        profileMenu.classList.toggle('hidden');
        
        // Debug menu state
        console.log('📋 Profile menu state:', {
            hidden: profileMenu.classList.contains('hidden'),
            zIndex: window.getComputedStyle(profileMenu).zIndex,
            display: window.getComputedStyle(profileMenu).display,
            pointerEvents: window.getComputedStyle(profileMenu).pointerEvents
        });
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

    // Portfolio menu button handler
    const portfolioMenuBtn = document.getElementById('portfolio-menu-btn');
    console.log('🔍 Portfolio menu button check:', {
        element: portfolioMenuBtn,
        exists: !!portfolioMenuBtn,
        id: portfolioMenuBtn?.id,
        className: portfolioMenuBtn?.className,
        visible: portfolioMenuBtn?.offsetParent !== null,
        zIndex: portfolioMenuBtn ? window.getComputedStyle(portfolioMenuBtn).zIndex : 'N/A',
        pointerEvents: portfolioMenuBtn ? window.getComputedStyle(portfolioMenuBtn).pointerEvents : 'N/A'
    });
    
    if (portfolioMenuBtn) {
        portfolioMenuBtn.addEventListener('click', (e) => {
            console.log('🎯 Portfolio menu item clicked!', {
                event: e,
                target: e.target,
                currentTarget: e.currentTarget,
                timestamp: new Date().toISOString()
            });
            e.preventDefault();
            e.stopPropagation();
            
            // Close the profile menu first
            profileMenu.classList.add('hidden');
            console.log('✅ Profile menu closed');
            
            // Then open portfolio modal
            try {
                showPortfolioModal();
                console.log('✅ Portfolio modal opened');
            } catch (error) {
                console.error('❌ Error opening portfolio modal:', error);
                alert('Có lỗi khi mở ví bất động sản. Vui lòng thử lại.');
            }
        });
        
        // Test click programmatically
        window.testPortfolioMenuClick = function() {
            console.log('🧪 Testing portfolio menu click programmatically...');
            portfolioMenuBtn.click();
        };
        
        console.log('✅ Portfolio menu button event listener added');
    } else {
        console.error('❌ Portfolio menu button not found!');
    }

    document.addEventListener('click', (event) => {
        if (!profileMenu.classList.contains('hidden') && 
            !userProfileDiv.contains(event.target) && 
            !profileMenu.contains(event.target)) {
            profileMenu.classList.add('hidden');
        }
    });

    // Note: Guide, Admin, and Feedback event listeners are now setup earlier in the code
    // Donate button handlers
    donateBtn.addEventListener('click', () => showModal(donateModal));
    closeDonateModalBtn.addEventListener('click', () => hideModal(donateModal));
    donateModal.addEventListener('click', (e) => { if (e.target === donateModal) hideModal(donateModal); });

    // Rating system
    let selectedRating = 0;
    const ratingStars = document.querySelectorAll('.rating-star');
    const ratingText = document.getElementById('rating-text');

    // Initialize rating display
    updateStarDisplay();
    updateRatingText();

    ratingStars.forEach((star, index) => {
        star.addEventListener('click', () => {
            selectedRating = index + 1;
            updateStarDisplay();
            updateRatingText();
        });

        star.addEventListener('mouseenter', () => {
            highlightStars(index + 1);
        });

        star.addEventListener('mouseleave', () => {
            updateStarDisplay();
        });
    });

    function highlightStars(count) {
        ratingStars.forEach((star, index) => {
            if (index < count) {
                star.classList.remove('text-gray-300');
                star.classList.add('text-yellow-400');
                star.textContent = '★'; // Filled star
            } else {
                star.classList.add('text-gray-300');
                star.classList.remove('text-yellow-400');
                star.textContent = '☆'; // Empty star
            }
        });
    }

    function updateStarDisplay() {
        highlightStars(selectedRating);
    }

    function updateRatingText() {
        const messages = [
            'Click để đánh giá website (chưa chọn)',
            '😞 Rất không hài lòng - Hãy cho chúng tôi biết vấn đề!',
            '😐 Không hài lòng - Chúng tôi sẽ cải thiện!', 
            '😊 Bình thường - Có thể làm tốt hơn!',
            '😄 Hài lòng - Cảm ơn bạn!',
            '🤩 Rất hài lòng - Tuyệt vời!'
        ];
        ratingText.textContent = messages[selectedRating];
    }

    // Feedback form submission
    document.getElementById('feedback-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Form validation
        const formData = new FormData(e.target);
        const content = formData.get('content')?.trim();
        const type = formData.get('type');
        
        // Get form elements for UI updates
        const submitButton = e.target.querySelector('button[type="submit"]');
        const submitText = submitButton.querySelector('.submit-text');
        const loadingText = submitButton.querySelector('.loading-text');
        const contentField = e.target.querySelector('textarea[name="content"]');
        
        // Reset previous validation states
        contentField.classList.remove('form-error', 'form-success');
        
        // Validate required fields
        if (!content || content.length < 10) {
            showToast('⚠️ Vui lòng nhập nội dung góp ý (tối thiểu 10 ký tự)', 'warning');
            contentField.classList.add('form-error');
            contentField.focus();
            return;
        }
        
        if (!type) {
            showToast('⚠️ Vui lòng chọn loại góp ý', 'warning');
            return;
        }
        
        if (selectedRating === 0) {
            showToast('⚠️ Vui lòng đánh giá trải nghiệm của bạn', 'warning');
            return;
        }

        // Show loading state
        submitButton.disabled = true;
        submitText.style.display = 'none';
        loadingText.style.display = 'inline';
        contentField.classList.add('form-success');

        const feedbackData = {
            type: type,
            priority: formData.get('priority'),
            content: content,
            email: formData.get('email') || 'anonymous',
            rating: selectedRating,
            timestamp: new Date().toISOString(),
            page: 'main',
            userAgent: navigator.userAgent,
            url: window.location.href,
            status: 'pending'
        };

        try {
            // Store in Firebase (if user is logged in) or localStorage
            if (currentUser) {
                feedbackData.userId = currentUser.uid;
                feedbackData.userName = currentUser.displayName || 'User';
                
                // Save to Firestore
                await db.collection('feedback').add(feedbackData);
                console.log('💾 Feedback saved to Firestore:', feedbackData);
            } else {
                // Save to localStorage for anonymous users
                const localFeedback = JSON.parse(localStorage.getItem('userFeedback') || '[]');
                localFeedback.push(feedbackData);
                localStorage.setItem('userFeedback', JSON.stringify(localFeedback));
                console.log('💾 Feedback saved locally:', feedbackData);
            }

            // Show success message with smooth transition
            showToast('🎉 Cảm ơn bạn đã góp ý! Chúng tôi sẽ xem xét và phản hồi sớm nhất có thể.', 'success', 4000);
            
            // Smooth close modal and reset form
            setTimeout(() => {
                feedbackModal.style.opacity = '0';
                setTimeout(() => {
                    feedbackModal.classList.add('hidden');
                    feedbackModal.style.opacity = '1';
                    e.target.reset();
                    selectedRating = 0;
                    updateStarDisplay();
                    updateRatingText();
                    
                    // Reset submit button
                    submitButton.disabled = false;
                    submitText.style.display = 'inline';
                    loadingText.style.display = 'none';
                    contentField.classList.remove('form-success');
                }, 300);
            }, 1500);

        } catch (error) {
            console.error('❌ Error submitting feedback:', error);
            showToast('❌ Có lỗi xảy ra khi gửi góp ý. Vui lòng thử lại sau.', 'error');
            
            // Reset submit button
            submitButton.disabled = false;
            submitText.style.display = 'inline';
            loadingText.style.display = 'none';
            contentField.classList.remove('form-success');
            contentField.classList.add('form-error');
        }
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
        
        if (type === 'parcel') {
            // Hiển thị thửa đất từ kết quả tìm kiếm
            const lat = parseFloat(item.dataset.lat);
            const lng = parseFloat(item.dataset.lng);
            const soThua = item.dataset.soThua;
            const soTo = item.dataset.soTo;
            const maXa = item.dataset.maXa;
            
            // Zoom đến vị trí thửa đất
            map.setView([lat, lng], 19);
            
            // Hiển thị thông tin nhanh
            showParcelFromSearchResult(soThua, soTo, maXa, lat, lng);
            
        } else if (type === 'community-parcel') {
            // Handle community parcel results
            const parcelNumber = item.dataset.parcel;
            const mapSheet = item.dataset.mapsheet;
            
            showCommunityParcelInfo(parcelNumber, mapSheet);
            
        } else if (type === 'location') {
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

    // Donate handlers already setup earlier - avoid duplicate
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
        const ADMIN_UID = "FEpPWWT1EaTWQ9FOqBxWN5FeEJk1";
        const adminBtn = document.getElementById('admin-btn');
        
        console.log('🔐 Auth state changed:', { 
            userExists: !!user, 
            userUID: user?.uid, 
            isAdmin: user?.uid === ADMIN_UID,
            adminBtnExists: !!adminBtn 
        });
        
        if (user) {
            currentUser = user;
            const userRef = db.collection("users").doc(user.uid);
            const doc = await userRef.get();
            if (!doc.exists) {
                await userRef.set({
                    displayName: user.displayName || "", email: user.email || "", phone: "", contactFacebook: "", createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            // Load user portfolio when logged in
            await loadUserPortfolio();
            
            // Show admin button if user is admin OR if running on localhost for testing
            const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            if (user.uid === ADMIN_UID || isLocalhost) {
                console.log('👑 Showing admin button (admin user or localhost)');
                if (adminBtn) adminBtn.style.display = 'flex';
            } else {
                if (adminBtn) adminBtn.style.display = 'none';
            }
            
            firebaseuiContainer.classList.add('hidden');
            loginBtn.classList.add('hidden');
            userProfileDiv.classList.remove('hidden');
            userProfileDiv.classList.add('flex');
            document.getElementById('user-avatar').src = user.photoURL || 'https://placehold.co/40x40/e2e8f0/64748b?text=A';
            addLocationBtn.disabled = false;
        } else {
            currentUser = null;
            userPortfolio = []; // Clear portfolio when logged out
            if (adminBtn) adminBtn.style.display = 'none';
            loginBtn.classList.remove('hidden');
            userProfileDiv.classList.add('hidden');
            userProfileDiv.classList.remove('flex');
            exitAllModes();
            addLocationBtn.disabled = true;
        }
    });

    loginBtn.addEventListener('click', () => {
        // Verify Firebase Auth is initialized
        if (!auth || !firebase.auth) {
            console.error('❌ Firebase Auth not initialized!');
            alert('Hệ thống đăng nhập chưa sẵn sàng. Vui lòng tải lại trang.');
            return;
        }
        
        // Debug logging for production deployment differences
        console.log('🌐 Environment:', {
            hostname: window.location.hostname,
            protocol: window.location.protocol,
            userAgent: navigator.userAgent,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            platform: navigator.platform,
            authExists: !!auth,
            firebaseExists: !!firebase,
            firebaseuiExists: !!firebaseui
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
        
        // Force popup flow for all devices to avoid page redirect
        const signInFlow = 'popup';
        
        console.log('🔧 Auth config:', { 
            isMobile: window.innerWidth <= 640,
            userAgent: navigator.userAgent,
            signInFlow: signInFlow,
            hostname: window.location.hostname
        });
        
        try {
            ui.start('#firebaseui-widget', { 
                signInFlow: signInFlow,
                signInOptions: [ 
                    {
                        provider: firebase.auth.GoogleAuthProvider.PROVIDER_ID,
                        customParameters: {
                            prompt: 'select_account'
                        }
                    },
                    firebase.auth.EmailAuthProvider.PROVIDER_ID 
                ], 
                callbacks: { 
                    signInSuccessWithAuthResult: () => { 
                        console.log('✅ Sign in success!');
                        firebaseuiContainer.classList.add('hidden');
                        firebaseuiContainer.style.display = 'none';
                        return false; // Prevent redirect
                    },
                    signInFailure: (error) => {
                        console.error('❌ Sign in failed:', error);
                        return Promise.resolve();
                    }
                },
                credentialHelper: firebaseui.auth.CredentialHelper.NONE
            });
            console.log('✅ FirebaseUI started on', window.location.hostname);
        } catch (error) {
            console.error('❌ FirebaseUI error:', error);
            
            // Fallback: Show error message to user
            alert('Không thể khởi tạo đăng nhập. Vui lòng thử lại hoặc liên hệ admin.');
            firebaseuiContainer.classList.add('hidden');
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
                    const currentContent = currentlyActive.nextElementSibling;
                    currentContent.classList.remove('active');
                    currentContent.style.maxHeight = null;
                }
                
                // Mở hoặc đóng mục vừa click
                header.classList.toggle('active');
                content.classList.toggle('active');
                
                if (header.classList.contains('active')) {
                    // Đặt max-height bằng chiều cao thực của nội dung để CSS transition hoạt động
                    content.style.maxHeight = content.scrollHeight + "px";
                } else {
                    content.style.maxHeight = null;
                }
            });
        });
    }

    // Contact info modal handlers - Already setup earlier in immediate event listeners section
    // Note: setupInfoAccordion is called when contact modal opens


    // === KẾT THÚC: LOGIC ĐIỀU KHIỂN AKKORDEON ===

    // Đợi một chút để đảm bảo tất cả component đã load xong
    setTimeout(() => {
        handleUrlParameters();
    }, 1000);

    // === USER ONBOARDING SYSTEM ===
    function checkFirstTimeUser() {
        const hasVisited = localStorage.getItem('hasVisitedBefore');
        if (!hasVisited) {
            // Delay để đảm bảo trang đã load xong
            setTimeout(() => {
                startOnboardingTour();
                localStorage.setItem('hasVisitedBefore', 'true');
            }, 2000);
        }
    }

    function startOnboardingTour() {
        // Tạo overlay cho onboarding
        const overlay = document.createElement('div');
        overlay.id = 'onboarding-overlay';
        overlay.className = 'fixed inset-0 bg-black bg-opacity-70 z-[2000] flex items-center justify-center';
        
        overlay.innerHTML = `
            <div class="bg-white rounded-2xl max-w-md mx-4 p-6 text-center animate-pulse">
                <div class="text-6xl mb-4">👋</div>
                <h2 class="text-2xl font-bold text-gray-800 mb-3">Chào mừng bạn!</h2>
                <p class="text-gray-600 mb-6">Hãy để chúng tôi hướng dẫn bạn sử dụng website một cách hiệu quả nhất</p>
                <div class="flex space-x-3">
                    <button id="start-tour" class="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition">
                        <i class="fas fa-play mr-2"></i>Bắt đầu tour
                    </button>
                    <button id="skip-tour" class="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition">
                        Bỏ qua
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Event listeners cho tour
        document.getElementById('start-tour').addEventListener('click', () => {
            overlay.remove();
            runInteractiveTour();
        });
        
        document.getElementById('skip-tour').addEventListener('click', () => {
            overlay.remove();
        });
    }

    function runInteractiveTour() {
        const tourSteps = [
            {
                target: '#search-bar-container',
                title: '🔍 Tìm kiếm thửa đất',
                content: 'Nhập số thửa theo định dạng "Thửa 123, Tờ 45" hoặc "123/45" để tìm kiếm nhanh',
                position: 'bottom'
            },
            {
                target: '#query-btn', 
                title: '👆 Chế độ xem thông tin',
                content: 'Click vào nút này, sau đó click vào bất kỳ thửa đất nào trên bản đồ để xem thông tin chi tiết',
                position: 'top'
            },
            {
                target: '#add-location-btn',
                title: '📍 Thêm tin đăng',
                content: 'Đăng nhập và thêm thông tin bán/cho thuê để chia sẻ với cộng đồng',
                position: 'top'
            },
            {
                target: '#guide-btn',
                title: '📖 Hướng dẫn chi tiết', 
                content: 'Click để xem hướng dẫn sử dụng đầy đủ với video và ví dụ cụ thể',
                position: 'left'
            },
            {
                target: '#feedback-btn',
                title: '💬 Góp ý & Phản hồi',
                content: 'Chia sẻ ý kiến để giúp chúng tôi cải thiện website tốt hơn',
                position: 'left'
            }
        ];
        
        let currentStep = 0;
        showTourStep(tourSteps[currentStep]);
        
        function showTourStep(step) {
            // Tìm element target
            const target = document.querySelector(step.target);
            if (!target) {
                nextStep();
                return;
            }
            
            // Tạo highlight cho element
            target.classList.add('tour-highlight');
            
            // Tạo tooltip
            const tooltip = document.createElement('div');
            tooltip.className = `tour-tooltip fixed z-[2001] bg-white rounded-lg shadow-2xl p-4 max-w-xs border-2 border-blue-500`;
            tooltip.innerHTML = `
                <div class="text-lg font-bold text-gray-800 mb-2">${step.title}</div>
                <div class="text-gray-600 mb-4">${step.content}</div>
                <div class="flex justify-between items-center">
                    <div class="text-sm text-gray-500">${currentStep + 1}/${tourSteps.length}</div>
                    <div class="space-x-2">
                        ${currentStep > 0 ? '<button id="tour-prev" class="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm">Trước</button>' : ''}
                        <button id="tour-next" class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
                            ${currentStep === tourSteps.length - 1 ? 'Hoàn thành' : 'Tiếp'}
                        </button>
                        <button id="tour-skip" class="px-3 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 text-sm">Bỏ qua</button>
                    </div>
                </div>
            `;
            
            // Vị trí tooltip
            const rect = target.getBoundingClientRect();
            const tooltipRect = { width: 300, height: 150 }; // Ước tính
            
            let left, top;
            switch(step.position) {
                case 'bottom':
                    left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
                    top = rect.bottom + 10;
                    break;
                case 'top':
                    left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
                    top = rect.top - tooltipRect.height - 10;
                    break;
                case 'left':
                    left = rect.left - tooltipRect.width - 10;
                    top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
                    break;
                case 'right':
                    left = rect.right + 10;
                    top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
                    break;
            }
            
            // Đảm bảo tooltip không ra ngoài viewport
            left = Math.max(10, Math.min(left, window.innerWidth - tooltipRect.width - 10));
            top = Math.max(10, Math.min(top, window.innerHeight - tooltipRect.height - 10));
            
            tooltip.style.left = left + 'px';
            tooltip.style.top = top + 'px';
            
            document.body.appendChild(tooltip);
            
            // Event handlers
            const nextBtn = tooltip.querySelector('#tour-next');
            const prevBtn = tooltip.querySelector('#tour-prev');
            const skipBtn = tooltip.querySelector('#tour-skip');
            
            nextBtn?.addEventListener('click', nextStep);
            prevBtn?.addEventListener('click', prevStep);
            skipBtn?.addEventListener('click', endTour);
        }
        
        function nextStep() {
            cleanupCurrentStep();
            currentStep++;
            if (currentStep < tourSteps.length) {
                showTourStep(tourSteps[currentStep]);
            } else {
                endTour();
            }
        }
        
        function prevStep() {
            cleanupCurrentStep();
            currentStep--;
            if (currentStep >= 0) {
                showTourStep(tourSteps[currentStep]);
            }
        }
        
        function cleanupCurrentStep() {
            // Remove highlight
            document.querySelectorAll('.tour-highlight').forEach(el => {
                el.classList.remove('tour-highlight');
            });
            // Remove tooltip
            document.querySelectorAll('.tour-tooltip').forEach(el => {
                el.remove();
            });
        }
        
        function endTour() {
            cleanupCurrentStep();
            
            // Show completion message
            const completionModal = document.createElement('div');
            completionModal.className = 'fixed inset-0 bg-black bg-opacity-50 z-[2000] flex items-center justify-center';
            completionModal.innerHTML = `
                <div class="bg-white rounded-2xl max-w-md mx-4 p-6 text-center">
                    <div class="text-6xl mb-4">🎉</div>
                    <h2 class="text-2xl font-bold text-gray-800 mb-3">Hoàn thành!</h2>
                    <p class="text-gray-600 mb-6">Bạn đã sẵn sàng sử dụng website. Hãy thử tìm kiếm thửa đất đầu tiên!</p>
                    <button id="complete-tour" class="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition">
                        <i class="fas fa-check mr-2"></i>Bắt đầu sử dụng
                    </button>
                </div>
            `;
            
            document.body.appendChild(completionModal);
            
            document.getElementById('complete-tour').addEventListener('click', () => {
                completionModal.remove();
                // Auto-expand search bar để khuyến khích người dùng thử
                if (searchBarContainer && !searchBarContainer.classList.contains('is-expanded')) {
                    searchBarContainer.classList.add('is-expanded');
                    searchBarContainer.querySelector('#search-input').focus();
                }
            });
        }
    }

    // Thêm CSS cho tour highlighting
    const tourCSS = `
        .tour-highlight {
            position: relative;
            z-index: 2000;
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 0 8px rgba(59, 130, 246, 0.2) !important;
            border-radius: 8px;
            animation: pulse-highlight 2s infinite;
        }
        
        @keyframes pulse-highlight {
            0%, 100% { box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 0 8px rgba(59, 130, 246, 0.2); }
            50% { box-shadow: 0 0 0 6px rgba(59, 130, 246, 0.7), 0 0 0 12px rgba(59, 130, 246, 0.3); }
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = tourCSS;
    document.head.appendChild(styleSheet);

    // Start onboarding check
    checkFirstTimeUser();

    // === ENHANCED TOOLTIPS SYSTEM ===
    function createEnhancedTooltips() {
        const tooltipElements = [
            { selector: '#search-bar-container', text: 'Tìm kiếm thửa đất (VD: Thửa 123, Tờ 45)', position: 'bottom' },
            // { selector: '#query-btn', text: 'Click để bật chế độ xem thông tin thửa đất', position: 'top' }, // Đã loại bỏ theo yêu cầu
            { selector: '#add-location-btn', text: 'Thêm tin đăng bán/cho thuê (Cần đăng nhập)', position: 'top' },
            { selector: '#list-btn', text: 'Xem danh sách tất cả tin đăng', position: 'top' },
            { selector: '#login-btn', text: 'Đăng nhập bằng Google hoặc Email', position: 'left' },
            { selector: '#guide-btn', text: 'Hướng dẫn sử dụng chi tiết', position: 'left' },
            { selector: '#feedback-btn', text: 'Gửi góp ý để cải thiện website', position: 'left' },
            { selector: '#donate-btn', text: 'Ủng hộ dự án (Mời cafe)', position: 'left' },
            { selector: '#locate-btn', text: 'Tìm vị trí hiện tại của bạn', position: 'left' }
        ];

        tooltipElements.forEach(item => {
            const element = document.querySelector(item.selector);
            if (element) {
                let tooltip = null;
                
                element.addEventListener('mouseenter', (e) => {
                    // Không hiển thị tooltip khi đang trong tour
                    if (document.querySelector('.tour-tooltip')) return;
                    
                    tooltip = document.createElement('div');
                    tooltip.className = 'enhanced-tooltip fixed z-[1500] bg-gray-800 text-white text-sm px-3 py-2 rounded-lg shadow-lg pointer-events-none';
                    tooltip.textContent = item.text;
                    
                    const rect = element.getBoundingClientRect();
                    let left, top;
                    
                    switch(item.position) {
                        case 'top':
                            left = rect.left + (rect.width / 2);
                            top = rect.top - 10;
                            tooltip.style.transform = 'translateX(-50%) translateY(-100%)';
                            break;
                        case 'bottom':
                            left = rect.left + (rect.width / 2);
                            top = rect.bottom + 10;
                            tooltip.style.transform = 'translateX(-50%)';
                            break;
                        case 'left':
                            left = rect.left - 10;
                            top = rect.top + (rect.height / 2);
                            tooltip.style.transform = 'translateX(-100%) translateY(-50%)';
                            break;
                        case 'right':
                            left = rect.right + 10;
                            top = rect.top + (rect.height / 2);
                            tooltip.style.transform = 'translateY(-50%)';
                            break;
                    }
                    
                    tooltip.style.left = left + 'px';
                    tooltip.style.top = top + 'px';
                    tooltip.style.opacity = '0';
                    tooltip.style.transition = 'opacity 0.2s ease';
                    
                    document.body.appendChild(tooltip);
                    
                    // Fade in
                    setTimeout(() => {
                        tooltip.style.opacity = '1';
                    }, 10);
                });
                
                element.addEventListener('mouseleave', () => {
                    if (tooltip) {
                        tooltip.style.opacity = '0';
                        setTimeout(() => {
                            if (tooltip && tooltip.parentNode) {
                                tooltip.parentNode.removeChild(tooltip);
                            }
                        }, 200);
                    }
                });
            }
        });
    }

    // Initialize enhanced tooltips
    createEnhancedTooltips();

    // === PARCEL LABELS SYSTEM ===
    let currentZoom = map.getZoom();
    

    
    // === TOAST NOTIFICATION SYSTEM ===
    function showToast(message, type = 'info', duration = 3000) {
        // Remove existing toast if any
        const existingToast = document.querySelector('.toast-notification');
        if (existingToast) {
            existingToast.remove();
        }

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast-notification fixed top-4 right-4 max-w-sm rounded-lg shadow-lg p-4 z-50 transform transition-all duration-300 translate-x-full`;
        
        // Set colors based on type
        const typeClasses = {
            success: 'bg-green-600 text-white',
            error: 'bg-red-600 text-white',
            warning: 'bg-yellow-600 text-white',
            info: 'bg-blue-600 text-white'
        };
        
        toast.className += ` ${typeClasses[type] || typeClasses.info}`;
        toast.innerHTML = `
            <div class="flex items-center">
                <span class="flex-1">${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-3 text-white hover:text-gray-200">
                    ✕
                </button>
            </div>
        `;

        document.body.appendChild(toast);

        // Trigger animation
        setTimeout(() => {
            toast.classList.remove('translate-x-full');
        }, 100);

        // Auto remove after duration
        setTimeout(() => {
            if (toast.parentElement) {
                toast.classList.add('translate-x-full');
                setTimeout(() => toast.remove(), 300);
            }
        }, duration);
    }

    // === CHARACTER COUNTER HELPER ===
    function updateCharCounter(textarea) {
        const counter = document.getElementById('char-counter');
        const current = textarea.value.length;
        const max = textarea.maxLength;
        
        counter.textContent = `${current}/${max}`;
        
        // Color coding
        if (current < 10) {
            counter.className = 'text-red-500';
        } else if (current > max * 0.8) {
            counter.className = 'text-yellow-500';
        } else {
            counter.className = 'text-gray-500';
        }
    }

    // Make function globally available
    window.updateCharCounter = updateCharCounter;

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

    // === ADVANCED FILTERING SYSTEM ===
    let filterState = {
        landUse: '',
        areaMin: null,
        areaMax: null,
        district: '',
        mapSheet: null,
        isActive: false
    };

    let filteredResults = [];
    let currentPage = 1;
    const resultsPerPage = 20;

    // Initialize filter system
    function initializeFilters() {
        const toggleBtn = document.getElementById('toggle-filters');
        const filtersPanel = document.getElementById('filters-panel');
        const resetBtn = document.getElementById('reset-filters');
        
        // Toggle panel
        toggleBtn?.addEventListener('click', () => {
            filtersPanel.classList.toggle('hidden');
            const isVisible = !filtersPanel.classList.contains('hidden');
            toggleBtn.querySelector('i').classList.toggle('fa-filter', !isVisible);
            toggleBtn.querySelector('i').classList.toggle('fa-times', isVisible);
        });

        // Reset filters
        resetBtn?.addEventListener('click', resetFilters);

        // Area presets
        document.querySelectorAll('.area-preset').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const min = e.target.dataset.min;
                const max = e.target.dataset.max;
                document.getElementById('area-min').value = min || '';
                document.getElementById('area-max').value = max || '';
                applyFilters();
            });
        });

        // Filter change events
        ['land-use-filter', 'district-filter', 'map-sheet-filter', 'area-min', 'area-max'].forEach(id => {
            const element = document.getElementById(id);
            element?.addEventListener('change', applyFilters);
            element?.addEventListener('input', debounce(applyFilters, 500));
        });

        // Initial count
        updateFilterCount();
    }

    // Apply filters to parcel data
    async function applyFilters() {
        const landUse = document.getElementById('land-use-filter')?.value || '';
        const areaMin = parseFloat(document.getElementById('area-min')?.value) || null;
        const areaMax = parseFloat(document.getElementById('area-max')?.value) || null;
        const district = document.getElementById('district-filter')?.value || '';
        const mapSheet = parseInt(document.getElementById('map-sheet-filter')?.value) || null;

        filterState = { landUse, areaMin, areaMax, district, mapSheet, isActive: true };

        // Show loading
        updateFilterCount('Đang lọc...');

        try {
            // Collect all parcel data from loaded areas
            let allParcels = [];
            
            // Get data from search cache
            for (const [area, data] of Object.entries(searchCache)) {
                if (data?.features) {
                    allParcels = allParcels.concat(data.features);
                }
            }

            // If no cached data, load from available files
            if (allParcels.length === 0) {
                await loadSampleParcelData();
                for (const [area, data] of Object.entries(searchCache)) {
                    if (data?.features) {
                        allParcels = allParcels.concat(data.features);
                    }
                }
            }

            // Apply filters
            filteredResults = allParcels.filter(feature => {
                const props = feature.properties;
                
                // Land use filter
                if (landUse && props.KyHieuMucDichSuDung !== landUse) return false;
                
                // Area filter
                if (areaMin !== null && props.DienTich < areaMin) return false;
                if (areaMax !== null && props.DienTich > areaMax) return false;
                
                // District filter (based on MaXa code)
                if (district && !props.MaXa?.startsWith(district)) return false;
                
                // Map sheet filter
                if (mapSheet !== null && props.SoHieuToBanDo !== mapSheet) return false;
                
                return true;
            });

            currentPage = 1;
            updateFilterCount();
            displayFilteredResults();

        } catch (error) {
            console.error('Filter error:', error);
            updateFilterCount('Lỗi khi lọc dữ liệu');
        }
    }

    // Load sample data for filtering
    async function loadSampleParcelData() {
        const sampleAreas = ['20194', '20195', '20197']; // Load a few areas for demo
        
        for (const area of sampleAreas) {
            if (!searchCache[area]) {
                try {
                    const response = await fetch(`data/parcels/${area}.geojson`);
                    if (response.ok) {
                        const data = await response.json();
                        searchCache[area] = data;
                    }
                } catch (error) {
                    console.warn(`Could not load area ${area}:`, error);
                }
            }
        }
    }

    // Update filter count display
    function updateFilterCount(customText = null) {
        const countElement = document.getElementById('filter-count');
        if (customText) {
            countElement.textContent = customText;
            return;
        }

        const hasFilters = filterState.landUse || filterState.areaMin || filterState.areaMax || filterState.district || filterState.mapSheet;
        
        if (!hasFilters) {
            countElement.textContent = 'Chưa áp dụng bộ lọc';
        } else {
            countElement.textContent = `Tìm thấy ${filteredResults.length} thửa đất`;
        }
    }

    // Display filtered results
    function displayFilteredResults() {
        const resultsContainer = document.getElementById('search-results');
        
        if (filteredResults.length === 0) {
            resultsContainer.innerHTML = '<div class="p-4 text-center text-gray-500">Không tìm thấy thửa đất phù hợp</div>';
            resultsContainer.classList.remove('hidden');
            return;
        }

        // Pagination logic
        const startIndex = (currentPage - 1) * resultsPerPage;
        const endIndex = startIndex + resultsPerPage;
        const pageResults = filteredResults.slice(startIndex, endIndex);
        const totalPages = Math.ceil(filteredResults.length / resultsPerPage);

        let html = `
            <div class="p-3 border-b bg-gray-50">
                <div class="flex justify-between items-center text-sm">
                    <span class="font-medium">${filteredResults.length} kết quả</span>
                    ${totalPages > 1 ? `<span>Trang ${currentPage}/${totalPages}</span>` : ''}
                </div>
            </div>
        `;

        // Results
        pageResults.forEach((feature, index) => {
            const props = feature.properties;
            const globalIndex = startIndex + index;
            
            html += `
                <div class="filter-result-item p-3 border-b hover:bg-blue-50 cursor-pointer" data-index="${globalIndex}">
                    <div class="font-medium text-sm">Thửa ${props.SoThuTuThua}, Tờ ${props.SoHieuToBanDo}</div>
                    <div class="text-xs text-gray-600">
                        📐 ${props.DienTich}m² • 🏷️ ${getLandUseLabel(props.KyHieuMucDichSuDung)}
                    </div>
                    <div class="text-xs text-gray-500">Khu vực: ${props.MaXa}</div>
                </div>
            `;
        });

        // Pagination
        if (totalPages > 1) {
            html += `
                <div class="p-3 border-t bg-gray-50 flex justify-center space-x-2">
                    ${currentPage > 1 ? `<button class="px-3 py-1 text-xs bg-blue-500 text-white rounded" onclick="changePage(${currentPage - 1})">Trước</button>` : ''}
                    ${currentPage < totalPages ? `<button class="px-3 py-1 text-xs bg-blue-500 text-white rounded" onclick="changePage(${currentPage + 1})">Sau</button>` : ''}
                </div>
            `;
        }

        resultsContainer.innerHTML = html;
        resultsContainer.classList.remove('hidden');

        // Add click handlers for results
        document.querySelectorAll('.filter-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                const feature = filteredResults[index];
                highlightParcel(feature);
            });
        });
    }

    // Add parcel to portfolio from search results
    window.addParcelToPortfolio = function(soThua, soTo, dienTich, loaiDat, maXa) {
        console.log('🎯 Adding parcel to portfolio:', { soThua, soTo, dienTich, loaiDat, maXa });
        
        if (!currentUser) {
            alert('Vui lòng đăng nhập để sử dụng chức năng Ví BĐS!');
            
            // Trigger login
            const loginBtn = document.getElementById('login-btn');
            if (loginBtn) {
                loginBtn.click();
            }
            return;
        }

        // Get current coordinates and create location link
        let currentLat, currentLng, locationUrl;
        
        if (window.map && typeof window.map.getCenter === 'function') {
            const center = window.map.getCenter();
            currentLat = center.lat;
            currentLng = center.lng;
            locationUrl = `${window.location.origin}${window.location.pathname}?lat=${currentLat}&lng=${currentLng}`;
        } else {
            console.warn('⚠️ Map not available, using default coordinates');
            currentLat = 16.054456; // Default Da Nang coordinates
            currentLng = 108.202167;
            locationUrl = `${window.location.origin}${window.location.pathname}?lat=${currentLat}&lng=${currentLng}`;
        }

        console.log('🔍 Debug location creation:', {
            mapExists: !!window.map,
            mapGetCenter: typeof window.map?.getCenter,
            currentLat,
            currentLng,
            locationUrl
        });

        // Store parcel data globally for form
        selectedParcelData = {
            soThua: soThua,
            soTo: soTo,
            dienTich: dienTich,
            loaiDat: loaiDat,
            maXa: maXa,
            diaChi: `Thửa ${soThua}, Tờ ${soTo}, ${maXa}`,
            lat: currentLat,
            lng: currentLng,
            locationUrl: locationUrl  // Add location URL for viewing
        };

        console.log('📍 Selected parcel data:', selectedParcelData);

        // Open add portfolio modal with pre-filled data
        const addModal = document.getElementById('add-portfolio-modal');
        const portfolioForm = document.getElementById('portfolio-form');
        
        if (addModal && portfolioForm) {
            // Pre-fill form
            const nameInput = document.getElementById('portfolio-name');
            const areaInput = document.getElementById('portfolio-area');
            
            // Reset form first
            portfolioForm.reset();
            
            // Then set values
            if (nameInput) {
                nameInput.value = `${loaiDat} - Thửa ${soThua}, Tờ ${soTo}`;
            }
            if (areaInput) {
                areaInput.value = dienTich;
            }
            
            delete portfolioForm.dataset.editingId;
            
            // Update modal title
            const titleElement = document.getElementById('add-portfolio-title');
            if (titleElement) {
                titleElement.innerHTML = `
                    <i class="fa-solid fa-plus mr-2 text-indigo-600"></i>
                    Thêm "${loaiDat}" vào Ví BĐS
                `;
            }

            showModal(addModal);
            
            // Focus on name input for editing
            setTimeout(() => {
                if (nameInput) {
                    nameInput.focus();
                    nameInput.select();
                }
            }, 200);
        }
    };

    // Get user-friendly land use label
    function getLandUseLabel(code) {
        const labels = {
            'ODT': 'Đất ở đô thị',
            'DGT': 'Đất giao thông',
            'NTO': 'Đất nông nghiệp',
            'LUP': 'Đất lâm nghiệp',
            'SXD': 'Đất sản xuất',
            'CQT': 'Đất cơ quan'
        };
        return labels[code] || code;
    }

    // Reset all filters
    function resetFilters() {
        document.getElementById('land-use-filter').value = '';
        document.getElementById('area-min').value = '';
        document.getElementById('area-max').value = '';
        document.getElementById('district-filter').value = '';
        document.getElementById('map-sheet-filter').value = '';
        
        filterState = {
            landUse: '',
            areaMin: null,
            areaMax: null,
            district: '',
            mapSheet: null,
            isActive: false
        };
        
        filteredResults = [];
        document.getElementById('search-results').classList.add('hidden');
        updateFilterCount();
    }

    // Pagination helper
    window.changePage = function(page) {
        currentPage = page;
        displayFilteredResults();
    };

    // Debounce helper
    function debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    // Highlight specific parcel from filter results
    function highlightParcel(feature) {
        if (!feature?.geometry?.coordinates) return;

        try {
            // Clear existing highlights
            highlightLayer.clearLayers();

            // Create highlight polygon
            const coords = feature.geometry.coordinates[0];
            const latLngs = coords.map(coord => [coord[1], coord[0]]);
            
            const highlightPolygon = L.polygon(latLngs, {
                color: '#ff0000',
                weight: 3,
                fillColor: '#ff0000',
                fillOpacity: 0.3,
                dashArray: '5, 5'
            });

            highlightLayer.addLayer(highlightPolygon);

            // Zoom to parcel
            const bounds = highlightPolygon.getBounds();
            map.fitBounds(bounds, { padding: [20, 20] });

            // Show parcel info
            const props = feature.properties;
            showParcelInfo(props);

            // Auto-remove highlight after 10 seconds
            setTimeout(() => {
                highlightLayer.clearLayers();
            }, 10000);

        } catch (error) {
            console.error('Error highlighting parcel:', error);
            showToast('❌ Không thể hiển thị thửa đất này', 'error');
        }
    }

    // Show parcel information panel
    function showParcelInfo(props) {
        const panel = document.getElementById('info-panel');
        const title = document.getElementById('panel-title');
        const content = document.getElementById('panel-content');

        title.textContent = `Thửa ${props.SoThuTuThua}, Tờ ${props.SoHieuToBanDo}`;
        
        // Check if community data exists
        const key = `${props.SoThuTuThua}_${props.SoHieuToBanDo}`;
        const communityData = communityContributions.get(key);
        
        let communitySection = '';
        if (communityData) {
            const community = communityData.communityData;
            communitySection = `
                <div class="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <h4 class="font-bold text-green-800 text-sm mb-2">
                        <i class="fas fa-users mr-1"></i>Thông tin từ cộng đồng
                    </h4>
                    ${community.projectName ? `<div class="text-xs text-green-700 mb-1">🏗️ Dự án: ${community.projectName}</div>` : ''}
                    ${community.lotNumber ? `<div class="text-xs text-green-700 mb-1">📍 Số lô: ${community.lotNumber}</div>` : ''}
                    ${community.blockCode ? `<div class="text-xs text-green-700 mb-1">🏢 Block: ${community.blockCode}</div>` : ''}
                    ${community.commonName ? `<div class="text-xs text-green-700 mb-1">🏷️ Tên gọi: ${community.commonName}</div>` : ''}
                    ${community.marketPrice ? `<div class="text-xs text-green-700 mb-1">💰 Giá: ${community.marketPrice} triệu${community.priceUnit === 'per_m2' ? '/m²' : ''}</div>` : ''}
                    ${community.brokerCode ? `<div class="text-xs text-green-700">🔖 Mã: ${community.brokerCode}</div>` : ''}
                </div>
            `;
        }
        
        content.innerHTML = `
            <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                    <span class="text-gray-600">Diện tích:</span>
                    <span class="font-medium">${props.DienTich} m²</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">Mục đích sử dụng:</span>
                    <span class="font-medium">${getLandUseLabel(props.KyHieuMucDichSuDung)}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">Khu vực:</span>
                    <span class="font-medium">${props.MaXa}</span>
                </div>
                ${communitySection}
                <div class="pt-2 border-t space-y-2">
                    <button class="w-full bg-indigo-600 text-white py-2 rounded text-sm hover:bg-indigo-700 transition font-medium" 
                            onclick="addParcelToPortfolio('${props.SoThuTuThua}', '${props.SoHieuToBanDo}', '${props.DienTich}', '${getLandUseLabel(props.KyHieuMucDichSuDung)}', '${props.MaXa}')">
                        <i class="fa-solid fa-briefcase mr-2"></i>Thêm vào Ví BĐS
                    </button>
                    <button class="w-full bg-blue-500 text-white py-2 rounded text-sm hover:bg-blue-600 transition" 
                            onclick="downloadParcelInfo('${props.SoThuTuThua}', '${props.SoHieuToBanDo}')">
                        📄 Tải thông tin chi tiết
                    </button>
                    <button class="w-full bg-green-600 text-white py-2 rounded text-sm hover:bg-green-700 transition" 
                            onclick="openContributionForParcel('${props.SoThuTuThua}', '${props.SoHieuToBanDo}', '${props.DienTich}', '${props.KyHieuMucDichSuDung}', '${props.MaXa}')">
                        <i class="fas fa-plus-circle mr-1"></i>${communityData ? 'Cập nhật' : 'Bổ sung'} thông tin cộng đồng
                    </button>
                </div>
            </div>
        `;

        // Show panel
        panel.classList.remove('translate-y-full');
    }

    // Show portfolio item info when parcel data is not available
    function showPortfolioItemInfo(item) {
        const panel = document.getElementById('info-panel');
        const title = document.getElementById('panel-title');
        const content = document.getElementById('panel-content');

        title.textContent = item.name || 'Bất động sản trong ví';
        
        const formatDate = (timestamp) => {
            if (!timestamp) return 'Không có thông tin';
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return date.toLocaleDateString('vi-VN', { 
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        };

        content.innerHTML = `
            <div class="space-y-3 text-sm">
                <div class="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <h4 class="font-bold text-indigo-800 text-sm mb-2">
                        <i class="fa-solid fa-briefcase mr-1"></i>Thông tin Ví BĐS
                    </h4>
                </div>
                
                <div class="space-y-2">
                    <div class="flex justify-between">
                        <span class="text-gray-600">Tên gọi:</span>
                        <span class="font-medium">${item.name || 'Chưa đặt tên'}</span>
                    </div>
                    
                    ${item.area ? `
                    <div class="flex justify-between">
                        <span class="text-gray-600">Diện tích:</span>
                        <span class="font-medium">${item.area} m²</span>
                    </div>` : ''}
                    
                    ${item.landUse ? `
                    <div class="flex justify-between">
                        <span class="text-gray-600">Mục đích sử dụng:</span>
                        <span class="font-medium">${item.landUse}</span>
                    </div>` : ''}
                    
                    ${item.price ? `
                    <div class="flex justify-between">
                        <span class="text-gray-600">Giá ước tính:</span>
                        <span class="font-medium">${item.price} triệu</span>
                    </div>` : ''}
                    
                    <div class="flex justify-between">
                        <span class="text-gray-600">Vị trí:</span>
                        <span class="font-medium">${item.lat ? `${item.lat.toFixed(6)}, ${item.lng.toFixed(6)}` : 'Chưa xác định'}</span>
                    </div>
                    
                    <div class="flex justify-between">
                        <span class="text-gray-600">Tình trạng:</span>
                        <span class="font-medium">
                            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs ${item.isPrivate ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}">
                                <i class="fas ${item.isPrivate ? 'fa-lock' : 'fa-globe'} mr-1"></i>
                                ${item.isPrivate ? 'Riêng tư' : 'Công khai'}
                            </span>
                        </span>
                    </div>
                    
                    <div class="flex justify-between">
                        <span class="text-gray-600">Ngày lưu:</span>
                        <span class="font-medium">${formatDate(item.createdAt)}</span>
                    </div>
                    
                    ${item.notes ? `
                    <div class="pt-2 border-t">
                        <span class="text-gray-600 block mb-1">Ghi chú:</span>
                        <div class="bg-gray-50 p-2 rounded text-xs">${item.notes}</div>
                    </div>` : ''}
                </div>
                
                <div class="pt-3 border-t space-y-2">
                    <button class="w-full bg-indigo-600 text-white py-2 rounded text-sm hover:bg-indigo-700 transition font-medium" 
                            onclick="editPortfolioItem('${item.id}')">
                        <i class="fas fa-edit mr-2"></i>Chỉnh sửa
                    </button>
                    <button class="w-full bg-red-500 text-white py-2 rounded text-sm hover:bg-red-600 transition" 
                            onclick="deletePortfolioItem('${item.id}')">
                        <i class="fas fa-trash mr-2"></i>Xóa khỏi ví
                    </button>
                    <button class="w-full bg-gray-500 text-white py-2 rounded text-sm hover:bg-gray-600 transition" 
                            onclick="closeInfoPanel()">
                        <i class="fas fa-times mr-2"></i>Đóng
                    </button>
                </div>
            </div>
        `;

        // Show panel
        panel.classList.remove('translate-y-full');
    }

    // Close info panel function
    function closeInfoPanel() {
        const panel = document.getElementById('info-panel');
        panel.classList.add('translate-y-full');
    }
    
    // Make closeInfoPanel available globally
    window.closeInfoPanel = closeInfoPanel;

    // Download parcel info helper
    window.downloadParcelInfo = function(parcelNumber, mapSheet) {
        const info = {
            thu: parcelNumber,
            to: mapSheet,
            timestamp: new Date().toISOString(),
            source: 'xemgiadat'
        };
        
        const blob = new Blob([JSON.stringify(info, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `thua-${parcelNumber}-to-${mapSheet}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        showToast('📄 Đã tải thông tin thửa đất', 'success');
    };

    // Open contribution modal for specific parcel
    window.openContributionForParcel = function(parcelNumber, mapSheet, area, landUse, adminCode) {
        if (!currentUser) {
            showToast('⚠️ Vui lòng đăng nhập để đóng góp thông tin', 'warning');
            return;
        }

        // Set selected parcel data
        selectedParcelForContribution = {
            parcelNumber: parseInt(parcelNumber),
            mapSheet: parseInt(mapSheet),
            area: parseFloat(area),
            landUse: landUse,
            adminCode: adminCode
        };

        // Pre-fill form
        document.getElementById('contrib-parcel').value = parcelNumber;
        document.getElementById('contrib-map-sheet').value = mapSheet;
        document.getElementById('parcel-info-text').textContent = 
            `Thửa ${parcelNumber}, Tờ ${mapSheet} - ${area}m²`;
        document.getElementById('selected-parcel-info').classList.remove('hidden');
        document.getElementById('next-step-1').disabled = false;

        // Check if community data already exists
        const key = `${parcelNumber}_${mapSheet}`;
        const existingData = communityContributions.get(key);
        
        if (existingData) {
            // Pre-fill form with existing data
            const form = document.getElementById('contribution-form');
            const community = existingData.communityData;
            
            form.projectName.value = community.projectName || '';
            form.lotNumber.value = community.lotNumber || '';
            form.blockCode.value = community.blockCode || '';
            form.commonName.value = community.commonName || '';
            form.marketPrice.value = community.marketPrice || '';
            form.priceUnit.value = community.priceUnit || 'total';
            form.brokerCode.value = community.brokerCode || '';
            form.description.value = community.description || '';
            
            showToast('ℹ️ Đã tải thông tin cộng đồng hiện có để chỉnh sửa', 'info');
        }

    // Open modal and go to step 2 directly
    showModal(document.getElementById('contribution-modal'));
        goToStep2();
    };

    // Refresh current parcel info if displayed
    function refreshCurrentParcelInfo() {
        const panel = document.getElementById('info-panel');
        const title = document.getElementById('panel-title');
        
        if (!panel.classList.contains('translate-y-full') && title.textContent) {
            // Panel is open, extract parcel info and refresh
            const match = title.textContent.match(/Thửa (\d+), Tờ (\d+)/);
            if (match) {
                const [, parcelNumber, mapSheet] = match;
                // Simulate props object to refresh display
                const props = {
                    SoThuTuThua: parcelNumber,
                    SoHieuToBanDo: mapSheet,
                    DienTich: selectedParcelForContribution?.area || 'N/A',
                    KyHieuMucDichSuDung: selectedParcelForContribution?.landUse || 'N/A',
                    MaXa: selectedParcelForContribution?.adminCode || 'N/A'
                };
                showParcelInfo(props);
            }
        }
    }

    // Initialize filters when DOM is ready
    initializeFilters();

// === COMMUNITY CONTRIBUTION SYSTEM ===
let selectedParcelForContribution = null;
let communityContributions = new Map(); // Store user contributions

// Anti-spam and rate limiting
let lastContributionTime = 0;
let userContributionCount = 0;
const CONTRIBUTION_COOLDOWN = 60000; // 1 minute between contributions
const MAX_CONTRIBUTIONS_PER_HOUR = 5;
const userContributionTimestamps = [];

    // Check if user can contribute (anti-spam)
    function canUserContribute() {
        const now = Date.now();
        
        // Check cooldown
        if (now - lastContributionTime < CONTRIBUTION_COOLDOWN) {
            const remainingTime = Math.ceil((CONTRIBUTION_COOLDOWN - (now - lastContributionTime)) / 1000);
            showToast(`⏳ Vui lòng đợi ${remainingTime} giây trước khi đóng góp tiếp`, 'warning');
            return false;
        }
        
        // Check hourly limit
        const oneHourAgo = now - (60 * 60 * 1000);
        const recentContributions = userContributionTimestamps.filter(time => time > oneHourAgo);
        
        if (recentContributions.length >= MAX_CONTRIBUTIONS_PER_HOUR) {
            showToast('⚠️ Bạn đã đạt giới hạn 5 đóng góp/giờ. Vui lòng thử lại sau.', 'warning');
            return false;
        }
        
        return true;
    }

    // Record contribution for rate limiting
    function recordContribution() {
        const now = Date.now();
        lastContributionTime = now;
        userContributionTimestamps.push(now);
        userContributionCount++;
        
        // Clean old timestamps
        const oneHourAgo = now - (60 * 60 * 1000);
        const index = userContributionTimestamps.findIndex(time => time > oneHourAgo);
        if (index > 0) {
            userContributionTimestamps.splice(0, index);
        }
    }

// Initialize contribution system
function initializeCommunityContribution() {
    console.log('🚀 Initializing Community Contribution System...');
    
    // Check if contribute button exists (it was removed from UI)
    const contributeBtn = document.getElementById('contribute-btn');
    const contributionModal = document.getElementById('contribution-modal');
    const closeModalBtn = document.getElementById('close-contribution-modal');
    
    console.log('Contribute button:', contributeBtn ? 'Found' : 'Not found (removed from UI)');
    console.log('Contribution modal:', contributionModal);
    
    // Modal controls with debugging
    if (contributeBtn) {
        // Clear any existing listeners
        const newBtn = contributeBtn.cloneNode(true);
        contributeBtn.parentNode.replaceChild(newBtn, contributeBtn);
        
        newBtn.addEventListener('click', function(e) {
            console.log('🔥 Contribute button clicked!');
            e.preventDefault();
            e.stopPropagation();
            openContributionModal();
        });
        console.log('✅ Contribute button listener added');
    }
    
    closeModalBtn?.addEventListener('click', closeContributionModal);
    
    // Step navigation
    document.getElementById('next-step-1')?.addEventListener('click', goToStep2);
    document.getElementById('back-step-2')?.addEventListener('click', goToStep1);
    document.getElementById('search-parcel-btn')?.addEventListener('click', searchParcelForContribution);
    document.getElementById('submit-contribution')?.addEventListener('click', submitContribution);
    
    // Load existing community data
    loadCommunityContributions();
}

// Đảm bảo hàm sẵn sàng ở global scope
window.initializeCommunityContribution = initializeCommunityContribution;

// Export các functions modal để đảm bảo accessible
window.openContributionModal = openContributionModal;
window.closeContributionModal = closeContributionModal;
window.openAnalyticsDashboard = openAnalyticsDashboard;
window.closeAnalyticsDashboard = closeAnalyticsDashboard;

function openContributionModal() {
    console.log('🔥 Opening contribution modal...');
    if (!currentUser) {
        showToast('⚠️ Vui lòng đăng nhập để đóng góp thông tin', 'warning');
        return;
    }
    
    const modal = document.getElementById('contribution-modal');
    showModal(modal);
}

function closeContributionModal() {
    const modal = document.getElementById('contribution-modal');
    hideModal(modal);
    resetContributionForm();
}

function goToStep1() {
    document.getElementById('contribution-step-1').classList.remove('hidden');
    document.getElementById('contribution-step-2').classList.add('hidden');
}

function goToStep2() {
    document.getElementById('contribution-step-1').classList.add('hidden');
    document.getElementById('contribution-step-2').classList.remove('hidden');
}

    function resetContributionForm() {
        selectedParcelForContribution = null;
        document.getElementById('contrib-parcel').value = '';
        document.getElementById('contrib-map-sheet').value = '';
        document.getElementById('selected-parcel-info').classList.add('hidden');
        document.getElementById('next-step-1').disabled = true;
        document.getElementById('contribution-form').reset();
        goToStep1();
    }

    // Search for parcel to contribute to
    async function searchParcelForContribution() {
        const parcelNum = document.getElementById('contrib-parcel').value;
        const mapSheet = document.getElementById('contrib-map-sheet').value;
        
        if (!parcelNum || !mapSheet) {
            showToast('⚠️ Vui lòng nhập số thửa và số tờ', 'warning');
            return;
        }

        try {
            // Search in existing data
            const result = await searchParcel(parcelNum, mapSheet);
            
            if (result) {
                selectedParcelForContribution = {
                    parcelNumber: parcelNum,
                    mapSheet: mapSheet,
                    area: result.DienTich,
                    landUse: result.KyHieuMucDichSuDung,
                    adminCode: result.MaXa,
                    geometry: result.geometry
                };
                
                document.getElementById('parcel-info-text').textContent = 
                    `Thửa ${parcelNum}, Tờ ${mapSheet} - ${result.DienTich}m²`;
                document.getElementById('selected-parcel-info').classList.remove('hidden');
                document.getElementById('next-step-1').disabled = false;
                
                showToast('✅ Đã tìm thấy thửa đất', 'success');
            } else {
                showToast('❌ Không tìm thấy thửa đất này', 'error');
            }
        } catch (error) {
            console.error('Error searching parcel:', error);
            showToast('❌ Lỗi khi tìm kiếm thửa đất', 'error');
        }
    }

    // Submit community contribution
    async function submitContribution() {
        if (!selectedParcelForContribution) {
            showToast('⚠️ Vui lòng chọn thửa đất trước', 'warning');
            return;
        }

        // Check anti-spam rate limiting
        if (!canUserContribute()) {
            return;
        }

        const form = document.getElementById('contribution-form');
        const formData = new FormData(form);
        const submitButton = document.getElementById('submit-contribution');
        const submitText = submitButton.querySelector('.submit-text');
        const submitLoading = submitButton.querySelector('.submit-loading');
        
        // Show loading state
        submitButton.disabled = true;
        submitText.classList.add('hidden');
        submitLoading.classList.remove('hidden');
        
        // Clear any previous messages
        const messageContainer = document.getElementById('contribution-message');
        if (messageContainer) {
            messageContainer.classList.add('hidden');
        }
        
        try {
            // Enhanced validation
            const validationErrors = validateContributionForm(formData);
            if (validationErrors.length > 0) {
                showContributionMessage(`❌ ${validationErrors[0]}`, 'error');
                throw new Error('Validation failed');
            }

            // Content validation (enhanced spam detection)
            const description = formData.get('description')?.trim() || '';
            if (description.length > 500) {
                showContributionMessage('⚠️ Mô tả không được quá 500 ký tự', 'warning');
                throw new Error('Content too long');
            }

            const contributionData = {
                // Link to official parcel
                officialData: {
                    parcelNumber: selectedParcelForContribution.parcelNumber,
                    mapSheet: selectedParcelForContribution.mapSheet,
                area: selectedParcelForContribution.area,
                landUse: selectedParcelForContribution.landUse,
                adminCode: selectedParcelForContribution.adminCode
            },
            
            // Community data
            communityData: {
                projectName: formData.get('projectName') || null,
                lotNumber: formData.get('lotNumber') || null,
                blockCode: formData.get('blockCode') || null,
                commonName: formData.get('commonName') || null,
                marketPrice: parseFloat(formData.get('marketPrice')) || null,
                priceUnit: formData.get('priceUnit') || 'total',
                brokerCode: formData.get('brokerCode') || null,
                description: description || null,
                isVerified: formData.get('isVerified') === 'on'
            },
            
            // Contributor info
            contributor: {
                userId: currentUser.uid,
                userName: currentUser.displayName || 'User',
                email: currentUser.email,
                contributorName: formData.get('contributorName') || null,
                contributorPhone: formData.get('contributorPhone') || null
            },
            
            // Metadata
            timestamp: new Date().toISOString(),
            status: 'pending', // pending, verified, rejected
            source: 'community',
            ipAddress: 'hidden', // For spam tracking
            userAgent: navigator.userAgent.substring(0, 100) // Truncated for privacy
        };

            // Save to Firebase with moderation queue
            const docRef = await db.collection('communityContributions').add(contributionData);
            console.log('✅ Community contribution saved for moderation:', docRef.id);
            
            // Store locally for immediate preview (pending status)
            const key = `${selectedParcelForContribution.parcelNumber}_${selectedParcelForContribution.mapSheet}`;
            contributionData.status = 'pending';
            contributionData.id = docRef.id;
            communityContributions.set(key, contributionData);
            
            // Record for rate limiting
            recordContribution();
            
            showContributionMessage('🎉 Cảm ơn bạn đã đóng góp! Thông tin sẽ được kiểm duyệt và cập nhật trong 24h.', 'success');
            setTimeout(() => {
                closeContributionModal();
            }, 2000);
            
            // Update search system to include community data
            updateSearchWithCommunityData();
            
            // Refresh parcel info if it's currently displayed
            refreshCurrentParcelInfo();
            
        } catch (error) {
            console.error('❌ Error in contribution:', error);
            if (error.message !== 'Validation failed' && error.message !== 'Content too long') {
                showContributionMessage('❌ Có lỗi khi lưu thông tin. Vui lòng thử lại.', 'error');
            }
        } finally {
            // Reset loading state
            submitButton.disabled = false;
            submitText.classList.remove('hidden');
            submitLoading.classList.add('hidden');
        }
    }

    // Load existing community contributions
    async function loadCommunityContributions() {
        try {
            const snapshot = await db.collection('communityContributions')
                .where('status', '==', 'verified')
                .orderBy('timestamp', 'desc')
                .limit(100)
                .get();
            
            snapshot.forEach(doc => {
                const data = doc.data();
                const key = `${data.officialData.parcelNumber}_${data.officialData.mapSheet}`;
                communityContributions.set(key, data);
            });
            
            console.log(`📊 Loaded ${communityContributions.size} community contributions from Firebase`);
            
        } catch (error) {
            console.warn('Could not load community contributions from Firebase, using demo data:', error);
        }
        
        // Add demo community data for testing
        addDemoCommunityData();
        updateSearchWithCommunityData();
    }

    // Add demo community data for testing
    function addDemoCommunityData() {
        const demoData = [
            {
                officialData: { parcelNumber: 55, mapSheet: 1, area: 1078.9, landUse: 'ODT', adminCode: '20194' },
                communityData: {
                    projectName: 'Khu đô thị Vinhomes Dragon Bay',
                    lotNumber: 'Lô 19 B2',
                    blockCode: 'Block B',
                    commonName: 'Lô góc đường Trần Hưng Đạo',
                    marketPrice: 25.5,
                    priceUnit: 'per_m2',
                    brokerCode: 'VH-DB-019',
                    description: 'Lô đất đẹp, hướng Đông Nam, mặt tiền 8m',
                    isVerified: true
                },
                contributor: { userId: 'demo', userName: 'Demo User' },
                timestamp: new Date().toISOString(),
                status: 'verified'
            },
            {
                officialData: { parcelNumber: 20, mapSheet: 1, area: 509, landUse: 'ODT', adminCode: '20194' },
                communityData: {
                    projectName: 'Dự án Sunshine City',
                    lotNumber: 'Plot A-15',
                    blockCode: 'Khu A',
                    commonName: 'Shophouse số 20',
                    marketPrice: 18.2,
                    priceUnit: 'per_m2',
                    brokerCode: 'SC-A15',
                    description: 'Shophouse 3 tầng, vị trí đẹp',
                    isVerified: true
                },
                contributor: { userId: 'demo2', userName: 'Broker Demo' },
                timestamp: new Date().toISOString(),
                status: 'verified'
            },
            {
                officialData: { parcelNumber: 43, mapSheet: 1, area: 380, landUse: 'ODT', adminCode: '20194' },
                communityData: {
                    projectName: 'Green Valley Resort',
                    lotNumber: 'Villa V12',
                    blockCode: 'Phase 2',
                    commonName: 'Biệt thự view sông',
                    marketPrice: 35,
                    priceUnit: 'total',
                    brokerCode: 'GV-V12',
                    description: 'Biệt thự cao cấp view sông Hàn',
                    isVerified: true
                },
                contributor: { userId: 'demo3', userName: 'Real Estate Pro' },
                timestamp: new Date().toISOString(),
                status: 'verified'
            }
        ];
        
        demoData.forEach(item => {
            const key = `${item.officialData.parcelNumber}_${item.officialData.mapSheet}`;
            communityContributions.set(key, item);
        });
        
        console.log(`✨ Added ${demoData.length} demo community contributions`);
    }

    // Enhanced search that includes community data
    function updateSearchWithCommunityData() {
        // Add community search terms to existing search
        const originalSearchFunction = window.searchParcel;
        
        window.searchParcel = async function(searchTerm, alternativeSearch = null) {
            // First try original search
            let result = await originalSearchFunction(searchTerm, alternativeSearch);
            
            if (result) {
                // Enhance with community data if available
                const key = `${result.SoThuTuThua}_${result.SoHieuToBanDo}`;
                const communityData = communityContributions.get(key);
                
                if (communityData) {
                    result.communityData = communityData.communityData;
                    result.hasEnhancedData = true;
                }
                
                return result;
            }
            
            // If no official result, try community search
            for (const [key, contribution] of communityContributions.entries()) {
                const community = contribution.communityData;
                const official = contribution.officialData;
                
                // Check if search term matches community identifiers
                if (
                    (community.lotNumber && community.lotNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
                    (community.projectName && community.projectName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                    (community.commonName && community.commonName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                    (community.brokerCode && community.brokerCode.toLowerCase().includes(searchTerm.toLowerCase()))
                ) {
                    // Return enhanced result
                    return {
                        SoThuTuThua: official.parcelNumber,
                        SoHieuToBanDo: official.mapSheet,
                        DienTich: official.area,
                        KyHieuMucDichSuDung: official.landUse,
                        MaXa: official.adminCode,
                        communityData: community,
                        hasEnhancedData: true,
                        isFromCommunity: true
                    };
                }
            }
            
            return null;
        };
    }

    // Enhanced search result display
    function enhanceSearchResultDisplay(result) {
        if (!result.hasEnhancedData) return result;
        
        const community = result.communityData;
        let enhancedHtml = `
            <div class="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                <div class="text-xs font-bold text-green-800 mb-1">
                    <i class="fas fa-users mr-1"></i>Thông tin từ cộng đồng:
                </div>
        `;
        
        if (community.projectName) {
            enhancedHtml += `<div class="text-xs text-green-700">🏗️ Dự án: ${community.projectName}</div>`;
        }
        
        if (community.lotNumber) {
            enhancedHtml += `<div class="text-xs text-green-700">📍 Số lô: ${community.lotNumber}</div>`;
        }
        
        if (community.commonName) {
            enhancedHtml += `<div class="text-xs text-green-700">🏷️ Tên gọi: ${community.commonName}</div>`;
        }
        
        if (community.marketPrice) {
            const unit = community.priceUnit === 'per_m2' ? '/m²' : ' tổng';
            enhancedHtml += `<div class="text-xs text-green-700">💰 Giá thị trường: ${community.marketPrice} triệu${unit}</div>`;
        }
        
        enhancedHtml += `</div>`;
        
        return { ...result, enhancedHtml };
    }

    // === END COMMUNITY CONTRIBUTION SYSTEM ===

    // === END FILTERING SYSTEM ===

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

// Initialize community contribution system after DOM is loaded
// Moved to end of file to ensure all functions are defined

/*
=== PHASE 2.6: COMMUNITY CONTRIBUTION SYSTEM - COMPLETE ===

✅ FEATURES IMPLEMENTED:
1. DOM initialization timing fix - Contribute button now works
2. Enhanced parcel info integration - Shows existing community data
3. Comprehensive anti-spam protection:
   - Rate limiting: 60s cooldown, 5 contributions/hour
   - Spam pattern detection: repeated chars, URLs, phone numbers, sales content
4. Enhanced form validation:
   - Required field validation
   - Input length limits and formatting
   - Phone number validation (Vietnamese format)
   - Verification checkbox requirement
5. Improved UX:
   - Loading states with spinner
   - Inline success/error messages
   - Auto-close modal after success
   - Real-time character counter

🛡️ ANTI-SPAM MEASURES:
- Rate limiting with localStorage tracking
- Advanced spam pattern detection
- Content validation for all text fields
- Moderation queue in Firebase
- User verification requirement

🔧 TECHNICAL IMPROVEMENTS:
- Proper DOM event handling with delay
- Firebase integration with error handling
- Real-time UI updates
- Responsive form validation
- Loading state management

📱 USER EXPERIENCE:
- Direct contribution from parcel info panels
- Clear validation messages
- Visual feedback for all actions
- Seamless integration with existing search
- Mobile-friendly responsive design
*/

// =============================================================================
// PHASE 3: ADVANCED ANALYTICS & BUSINESS INTELLIGENCE
// =============================================================================

// Analytics variables
let analyticsData = {
    totalParcels: 0,
    avgPrice: 0,
    avgArea: 0,
    communityContributions: 0,
    priceDistribution: {},
    areaDistribution: {},
    districtData: {},
    landUseData: {},
    communityInsights: {}
};

let analyticsCharts = {};

// === GLOBAL UTILITY FUNCTIONS ===

// Universal modal management functions to prevent display conflicts
function showModal(el) { 
    if (el) { 
        el.style.display = 'flex'; 
        el.classList.remove('hidden'); 
    } 
}

function hideModal(el) { 
    if (el) { 
        el.classList.add('hidden'); 
        el.style.display = 'none'; 
    } 
}

// === GLOBAL TOAST NOTIFICATION SYSTEM ===
function showToast(message, type = 'info', duration = 3000) {
    // Remove existing toast if any
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
        existingToast.remove();
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast-notification fixed top-4 right-4 max-w-sm rounded-lg shadow-lg p-4 z-50 transform transition-all duration-300 translate-x-full`;
    
    // Set colors based on type
    const typeClasses = {
        success: 'bg-green-600 text-white',
        error: 'bg-red-600 text-white',
        warning: 'bg-yellow-600 text-white',
        info: 'bg-blue-600 text-white'
    };
    
    toast.className += ` ${typeClasses[type] || typeClasses.info}`;
    toast.innerHTML = `
        <div class="flex items-center">
            <span class="flex-1">${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-3 text-white hover:text-gray-200">
                ✕
            </button>
        </div>
    `;

    document.body.appendChild(toast);

    // Trigger animation
    setTimeout(() => {
        toast.classList.remove('translate-x-full');
    }, 100);

    // Auto remove after duration
    setTimeout(() => {
        if (toast.parentElement) {
            toast.classList.add('translate-x-full');
            setTimeout(() => toast.remove(), 300);
        }
    }, duration);
}

// Initialize Analytics System
function initializeAnalytics() {
    console.log('🚀 Initializing Analytics System...');
    
// Simple analytics button listener
const analyticsBtn = document.getElementById('analytics-btn');
if (analyticsBtn) {
    // Clear any existing listeners
    const newBtn = analyticsBtn.cloneNode(true);
    analyticsBtn.parentNode.replaceChild(newBtn, analyticsBtn);
    
    // Add new listener
    newBtn.addEventListener('click', function(e) {
        console.log('🔥 Analytics button clicked!');
        e.preventDefault();
        e.stopPropagation();
        openAnalyticsDashboard();
    });
    console.log('✅ Analytics button listener added');
}    // Add other event listeners
    document.getElementById('close-analytics')?.addEventListener('click', closeAnalyticsDashboard);
    document.getElementById('refresh-analytics')?.addEventListener('click', refreshAnalyticsData);
    document.getElementById('export-pdf')?.addEventListener('click', exportAnalyticsToPDF);
    document.getElementById('export-excel')?.addEventListener('click', exportAnalyticsToExcel);
    
    // Load initial analytics data
    loadAnalyticsData();
}

// Open Analytics Dashboard
function openAnalyticsDashboard() {
    console.log('📊 Opening Analytics Dashboard...');
    const modal = document.getElementById('analytics-modal');
    console.log('Modal element:', modal);
    
    if (modal) {
        console.log('Modal classes before:', modal.className);
        
        // Use utility function for consistent modal management
        showModal(modal);
        
        console.log('Modal classes after:', modal.className);
        
        // DO NOT close other modals - let them coexist or use proper modal management
        // This was the root cause of the 2-step clicking issue
        
        refreshAnalyticsData();
    } else {
        console.error('❌ Analytics modal not found!');
    }
}

// Close Analytics Dashboard
function closeAnalyticsDashboard() {
    const modal = document.getElementById('analytics-modal');
    if (modal) {
        hideModal(modal);
    }
}

// Load and Process Analytics Data
async function loadAnalyticsData() {
    console.log('📈 Loading analytics data...');
    
    try {
        // Reset analytics data
        analyticsData = {
            totalParcels: 0,
            avgPrice: 0,
            avgArea: 0,
            communityContributions: 0,
            priceDistribution: { 'Dưới 5 tỷ': 0, '5-10 tỷ': 0, '10-20 tỷ': 0, 'Trên 20 tỷ': 0 },
            areaDistribution: { 'Dưới 100m²': 0, '100-200m²': 0, '200-500m²': 0, 'Trên 500m²': 0 },
            districtData: {},
            landUseData: {},
            communityInsights: {}
        };

        // Analyze all loaded parcel data
        if (window.allParcels && window.allParcels.length > 0) {
            analyzeParcelData(window.allParcels);
        }

        // Analyze community contributions
        if (window.communityContributions && window.communityContributions.size > 0) {
            analyzeCommunityData(window.communityContributions);
        }

        console.log('✅ Analytics data loaded:', analyticsData);
        
    } catch (error) {
        console.error('❌ Error loading analytics data:', error);
    }
}

// Analyze Parcel Data
function analyzeParcelData(parcels) {
    console.log('🔍 Analyzing parcel data...', parcels.length, 'parcels');
    
    let totalArea = 0;
    let validAreaCount = 0;
    
    analyticsData.totalParcels = parcels.length;

    parcels.forEach(parcel => {
        // Area analysis
        if (parcel.area && parcel.area > 0) {
            totalArea += parcel.area;
            validAreaCount++;
            
            // Area distribution
            if (parcel.area < 100) {
                analyticsData.areaDistribution['Dưới 100m²']++;
            } else if (parcel.area < 200) {
                analyticsData.areaDistribution['100-200m²']++;
            } else if (parcel.area < 500) {
                analyticsData.areaDistribution['200-500m²']++;
            } else {
                analyticsData.areaDistribution['Trên 500m²']++;
            }
        }

        // District analysis
        if (parcel.adminCode) {
            const district = getDistrictFromAdminCode(parcel.adminCode);
            if (!analyticsData.districtData[district]) {
                analyticsData.districtData[district] = { count: 0, totalArea: 0, avgArea: 0 };
            }
            analyticsData.districtData[district].count++;
            if (parcel.area) {
                analyticsData.districtData[district].totalArea += parcel.area;
                analyticsData.districtData[district].avgArea = analyticsData.districtData[district].totalArea / analyticsData.districtData[district].count;
            }
        }

        // Land use analysis
        if (parcel.landUse) {
            const landUse = getLandUseDescription(parcel.landUse);
            analyticsData.landUseData[landUse] = (analyticsData.landUseData[landUse] || 0) + 1;
        }
    });

    // Calculate averages
    analyticsData.avgArea = validAreaCount > 0 ? (totalArea / validAreaCount).toFixed(1) : 0;
    
    console.log('📊 Parcel analysis complete:', analyticsData);
}

// Analyze Community Data
function analyzeCommunityData(communityData) {
    console.log('👥 Analyzing community data...', communityData.size, 'contributions');
    
    analyticsData.communityContributions = communityData.size;
    
    let totalMarketPrice = 0;
    let validPriceCount = 0;
    
    communityData.forEach(contribution => {
        // Price analysis from community data
        if (contribution.communityData && contribution.communityData.marketPrice) {
            const price = parseFloat(contribution.communityData.marketPrice);
            if (price > 0) {
                totalMarketPrice += price;
                validPriceCount++;
                
                // Price distribution
                if (price < 5000) {
                    analyticsData.priceDistribution['Dưới 5 tỷ']++;
                } else if (price < 10000) {
                    analyticsData.priceDistribution['5-10 tỷ']++;
                } else if (price < 20000) {
                    analyticsData.priceDistribution['10-20 tỷ']++;
                } else {
                    analyticsData.priceDistribution['Trên 20 tỷ']++;
                }
            }
        }
        
        // Project insights
        if (contribution.communityData && contribution.communityData.projectName) {
            const project = contribution.communityData.projectName;
            if (!analyticsData.communityInsights[project]) {
                analyticsData.communityInsights[project] = 0;
            }
            analyticsData.communityInsights[project]++;
        }
    });
    
    // Calculate average market price
    analyticsData.avgPrice = validPriceCount > 0 ? (totalMarketPrice / validPriceCount).toFixed(0) : 0;
    
    console.log('💰 Community analysis complete. Avg price:', analyticsData.avgPrice);
}

// Get district name from admin code
function getDistrictFromAdminCode(adminCode) {
    const districtMap = {
        '20194': 'Liên Chiểu',
        '20195': 'Thanh Khê', 
        '20197': 'Hải Châu',
        '20198': 'Cẩm Lệ',
        '20200': 'Ngũ Hành Sơn',
        '20203': 'Sơn Trà',
        '20206': 'Hoà Vang',
        '20207': 'Hòa Vang'
    };
    return districtMap[adminCode] || 'Khác';
}

// Get land use description
function getLandUseDescription(landUse) {
    const landUseMap = {
        'ODT': 'Đất ở đô thị',
        'ONT': 'Đất ở nông thôn', 
        'LUU': 'Đất lưu thông',
        'SKH': 'Đất sản xuất kinh doanh',
        'CTR': 'Đất công trình',
        'NKH': 'Đất nông nghiệp'
    };
    return landUseMap[landUse] || landUse || 'Khác';
}

// Refresh Analytics Data and Charts
async function refreshAnalyticsData() {
    console.log('🔄 Refreshing analytics data...');
    
    // Show loading indicator
    showToast('🔄 Đang cập nhật dữ liệu phân tích...', 'info');
    
    // Reload data
    await loadAnalyticsData();
    
    // Update UI
    updateAnalyticsUI();
    renderAllCharts();
    
    // Update timestamp
    document.getElementById('last-updated').textContent = new Date().toLocaleString('vi-VN');
    
    showToast('✅ Dữ liệu đã được cập nhật!', 'success');
}

// Update Analytics UI
function updateAnalyticsUI() {
    // Update stats cards
    document.getElementById('total-parcels').textContent = analyticsData.totalParcels.toLocaleString('vi-VN');
    document.getElementById('avg-price').textContent = analyticsData.avgPrice > 0 ? 
        `${parseFloat(analyticsData.avgPrice).toLocaleString('vi-VN')} triệu` : 'N/A';
    document.getElementById('avg-area').textContent = analyticsData.avgArea > 0 ? 
        `${analyticsData.avgArea}m²` : 'N/A';
    document.getElementById('community-contributions').textContent = analyticsData.communityContributions.toLocaleString('vi-VN');
}

// Render All Charts
function renderAllCharts() {
    console.log('📊 Rendering analytics charts...');
    
    try {
        // Destroy all existing charts first
        destroyAllCharts();
        
        renderPriceDistributionChart();
        renderAreaDistributionChart();
        renderDistrictPriceChart();
        renderLandUseChart();
        renderCommunityDataChart();
    } catch (error) {
        console.error('❌ Error rendering charts:', error);
    }
}

// Destroy All Existing Charts
function destroyAllCharts() {
    console.log('🧹 Destroying existing charts...');
    
    Object.keys(analyticsCharts).forEach(key => {
        if (analyticsCharts[key] && typeof analyticsCharts[key].destroy === 'function') {
            try {
                analyticsCharts[key].destroy();
                console.log(`✅ Destroyed chart: ${key}`);
            } catch (error) {
                console.error(`❌ Error destroying chart ${key}:`, error);
            }
        }
    });
    
    // Clear the charts object
    analyticsCharts = {};
}

// Price Distribution Chart
function renderPriceDistributionChart() {
    const ctx = document.getElementById('price-distribution-chart');
    if (!ctx) return;

    // Destroy existing chart
    if (analyticsCharts.priceDistribution) {
        analyticsCharts.priceDistribution.destroy();
    }

    const data = analyticsData.priceDistribution;
    
    analyticsCharts.priceDistribution = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(data),
            datasets: [{
                data: Object.values(data),
                backgroundColor: [
                    '#3B82F6', // Blue
                    '#10B981', // Green
                    '#F59E0B', // Yellow
                    '#EF4444'  // Red
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${context.label}: ${context.parsed} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Area Distribution Chart
function renderAreaDistributionChart() {
    const ctx = document.getElementById('area-distribution-chart');
    if (!ctx) return;

    if (analyticsCharts.areaDistribution) {
        analyticsCharts.areaDistribution.destroy();
    }

    const data = analyticsData.areaDistribution;
    
    analyticsCharts.areaDistribution = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(data),
            datasets: [{
                label: 'Số lượng thửa',
                data: Object.values(data),
                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        font: {
                            size: 11
                        }
                    }
                },
                x: {
                    ticks: {
                        font: {
                            size: 11
                        }
                    }
                }
            }
        }
    });
}

// District Price Chart
function renderDistrictPriceChart() {
    const ctx = document.getElementById('district-price-chart');
    if (!ctx) return;

    if (analyticsCharts.districtPrice) {
        analyticsCharts.districtPrice.destroy();
    }

    const districts = Object.keys(analyticsData.districtData);
    const counts = districts.map(district => analyticsData.districtData[district].count);
    
    analyticsCharts.districtPrice = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: districts,
            datasets: [{
                label: 'Số lượng thửa',
                data: counts,
                backgroundColor: [
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(139, 92, 246, 0.8)',
                    'rgba(236, 72, 153, 0.8)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        font: {
                            size: 11
                        }
                    }
                },
                y: {
                    ticks: {
                        font: {
                            size: 11
                        }
                    }
                }
            }
        }
    });
}

// Land Use Chart
function renderLandUseChart() {
    const ctx = document.getElementById('land-use-chart');
    if (!ctx) return;

    if (analyticsCharts.landUse) {
        analyticsCharts.landUse.destroy();
    }

    const data = analyticsData.landUseData;
    
    analyticsCharts.landUse = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(data),
            datasets: [{
                data: Object.values(data),
                backgroundColor: [
                    '#3B82F6', // Blue
                    '#10B981', // Green
                    '#F59E0B', // Yellow
                    '#EF4444', // Red
                    '#8B5CF6', // Purple
                    '#EC4899'  // Pink
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: {
                            size: 11
                        }
                    }
                }
            }
        }
    });
}

// Community Data Chart
function renderCommunityDataChart() {
    const ctx = document.getElementById('community-data-chart');
    if (!ctx) return;

    if (analyticsCharts.communityData) {
        analyticsCharts.communityData.destroy();
    }

    const projects = Object.keys(analyticsData.communityInsights).slice(0, 10); // Top 10
    const counts = projects.map(project => analyticsData.communityInsights[project]);
    
    analyticsCharts.communityData = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: projects.map(p => p.length > 20 ? p.substring(0, 20) + '...' : p),
            datasets: [{
                label: 'Số đóng góp',
                data: counts,
                backgroundColor: 'rgba(139, 92, 246, 0.8)',
                borderColor: 'rgba(139, 92, 246, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        font: {
                            size: 11
                        }
                    }
                },
                x: {
                    ticks: {
                        font: {
                            size: 10
                        },
                        maxRotation: 45
                    }
                }
            }
        }
    });
}

// Export Analytics to PDF
function exportAnalyticsToPDF() {
    showToast('📄 Tính năng xuất PDF đang được phát triển...', 'info');
    // TODO: Implement PDF export using jsPDF
}

// Export Analytics to Excel
function exportAnalyticsToExcel() {
    console.log('📊 Exporting analytics to Excel...');
    
    try {
        // Create CSV data
        let csvContent = "data:text/csv;charset=utf-8,";
        
        // Add summary statistics
        csvContent += "Thống kê tổng quan\n";
        csvContent += `Tổng số thửa,${analyticsData.totalParcels}\n`;
        csvContent += `Giá trung bình (triệu),${analyticsData.avgPrice}\n`;
        csvContent += `Diện tích trung bình (m²),${analyticsData.avgArea}\n`;
        csvContent += `Đóng góp cộng đồng,${analyticsData.communityContributions}\n\n`;
        
        // Add price distribution
        csvContent += "Phân bố giá\n";
        csvContent += "Khoảng giá,Số lượng\n";
        Object.entries(analyticsData.priceDistribution).forEach(([range, count]) => {
            csvContent += `${range},${count}\n`;
        });
        csvContent += "\n";
        
        // Add area distribution
        csvContent += "Phân bố diện tích\n";
        csvContent += "Khoảng diện tích,Số lượng\n";
        Object.entries(analyticsData.areaDistribution).forEach(([range, count]) => {
            csvContent += `${range},${count}\n`;
        });
        csvContent += "\n";
        
        // Add district data
        csvContent += "Dữ liệu theo quận/huyện\n";
        csvContent += "Quận/Huyện,Số lượng,Diện tích TB\n";
        Object.entries(analyticsData.districtData).forEach(([district, data]) => {
            csvContent += `${district},${data.count},${data.avgArea.toFixed(1)}\n`;
        });
        
        // Create and download file
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `analytics-report-${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast('✅ Đã xuất báo cáo Excel thành công!', 'success');
        
    } catch (error) {
        console.error('❌ Error exporting to Excel:', error);
        showToast('❌ Có lỗi khi xuất báo cáo', 'error');
    }
}

// KHẮC PHỤC: Đã xóa dòng }); thừa ở đây

// Show contribution message in modal
function showContributionMessage(message, type) {
    const messageContainer = document.getElementById('contribution-message');
    const messageText = document.getElementById('contribution-message-text');
    
    if (messageContainer && messageText) {
        messageText.textContent = message;
        messageContainer.className = `mt-4 p-4 rounded-lg ${
            type === 'success' ? 'bg-green-100 text-green-800' :
            type === 'error' ? 'bg-red-100 text-red-800' :
            'bg-yellow-100 text-yellow-800'
        }`;
        messageContainer.classList.remove('hidden');
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            messageContainer.classList.add('hidden');
        }, 5000);
    }
}

// Update description counter for community contribution form
function updateDescriptionCounter(textarea) {
    const counter = document.getElementById('desc-counter');
    if (counter) {
        counter.textContent = `${textarea.value.length}/500`;
        
        // Change color based on length
        if (textarea.value.length > 450) {
            counter.className = 'text-red-500 text-xs';
        } else if (textarea.value.length > 300) {
            counter.className = 'text-yellow-500 text-xs';
        } else {
            counter.className = 'text-gray-500 text-xs';
        }
    }
}

// Enhanced validation for contribution form
function validateContributionForm(formData) {
    const errors = [];
    
    // Validate project name
    const projectName = formData.get('projectName')?.trim();
    if (!projectName || projectName.length < 3) {
        errors.push('Tên dự án phải có ít nhất 3 ký tự');
    }
    
    // Validate lot number
    const lotNumber = formData.get('lotNumber')?.trim();
    if (!lotNumber || lotNumber.length < 2) {
        errors.push('Số lô phải có ít nhất 2 ký tự');
    }
    
    // Validate market price if provided
    const marketPrice = formData.get('marketPrice');
    if (marketPrice && (isNaN(marketPrice) || marketPrice < 0 || marketPrice > 10000)) {
        errors.push('Giá thị trường phải từ 0 đến 10,000 triệu');
    }
    
    // Validate phone number if provided
    const phone = formData.get('contributorPhone')?.trim();
    if (phone) {
        const phoneRegex = /^(\+84|0)(3|5|7|8|9)\d{8}$/;
        if (!phoneRegex.test(phone.replace(/[\s\-]/g, ''))) {
            errors.push('Số điện thoại không đúng định dạng Việt Nam');
        }
    }
    
    // Check verification checkbox
    if (!formData.get('isVerified')) {
        errors.push('Bạn cần xác nhận thông tin là chính xác');
    }
    
    // Advanced spam detection for all text fields
    const textFields = ['projectName', 'lotNumber', 'blockCode', 'commonName', 'brokerCode', 'description', 'contributorName'];
    for (const fieldName of textFields) {
        const value = formData.get(fieldName)?.trim();
        if (value && detectAdvancedSpam(value)) {
            errors.push(`Nội dung "${getFieldLabel(fieldName)}" có thể chứa spam hoặc quảng cáo`);
        }
    }
    
    return errors;
}

// Enhanced spam detection
function detectAdvancedSpam(content) {
    const spamPatterns = [
        /(.)\1{3,}/,                           // Repeated characters (3+)
        /(https?:\/\/|www\.|\.com|\.vn|\.net)/i, // URLs or domains
        /(\+84|0)(3|5|7|8|9)\d{8}/,           // Phone patterns
        /(bán gấp|cần bán|liên hệ|zalo|viber|hotline|sale)/i, // Sales spam
        /[A-Z]{4,}/,                          // Excessive caps
        /(giá rẻ|khuyến mãi|ưu đãi|cơ hội|đầu tư|lãi suất)/i, // Promotional
        /(\b\w+\b)(\s+\1){2,}/i               // Repetitive phrases
    ];
    
    return spamPatterns.some(pattern => pattern.test(content));
}

// Get field label for error messages
function getFieldLabel(fieldName) {
    const labels = {
        projectName: 'Tên dự án',
        lotNumber: 'Số lô',
        blockCode: 'Mã block',
        commonName: 'Tên gọi thông dụng',
        brokerCode: 'Mã môi giới',
        description: 'Mô tả',
        contributorName: 'Tên người đóng góp'
    };
    return labels[fieldName] || fieldName;
}

// =============================================================================
// INITIALIZE ALL SYSTEMS
// =============================================================================

// Initialize all systems after DOM is loaded
// === GLOBAL VARIABLES ===
let currentUser = null;
let tempMarker = null;
let selectedCoords = null;
let isAddMode = false;
let isQueryMode = false; // Vẫn giữ để đổi con trỏ chuột
let localListings = [];
let userPortfolio = [];
let selectedParcelData = null; // Lưu dữ liệu thửa đất được chọn để thêm vào ví

// === DOM ELEMENTS ===
let portfolioBtn, portfolioModal, closePortfolioModal, addPortfolioModal, closeAddPortfolioModal, portfolioForm;

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing all systems...');
    
    // Initialize community contribution system
    console.log('👥 Initializing community contribution system...');
    setTimeout(() => {
        try {
            if (typeof window.initializeCommunityContribution === 'function') {
                window.initializeCommunityContribution();
                console.log('✅ Community contribution system initialized');
            } else {
                console.error('❌ initializeCommunityContribution is not available on window');
            }
        } catch (error) {
            console.error('❌ Error initializing community system:', error);
        }
    }, 1000);
    
    // Initialize analytics system
    console.log('📊 Initializing analytics system...');
    setTimeout(() => {
        try {
            initializeAnalytics();
            console.log('✅ Analytics system initialized');
        } catch (error) {
            console.error('❌ Error initializing analytics system:', error);
        }
    }, 1500);
    
    // Final verification after all systems loaded
    setTimeout(() => {
        console.log('🔍 Final system verification...');
        
        // Verify all modal functions are available
        const requiredFunctions = [
            'initializeCommunityContribution',
            'openContributionModal', 
            'closeContributionModal',
            'openAnalyticsDashboard',
            'closeAnalyticsDashboard'
        ];
        
        requiredFunctions.forEach(funcName => {
            if (typeof window[funcName] === 'function') {
                console.log(`✅ ${funcName} is available on window`);
            } else {
                console.warn(`❌ ${funcName} is NOT available on window`);
            }
        });
        
        // Test all modal buttons
        console.log('🧪 Testing modal buttons...');
        const buttons = [
            { id: 'analytics-btn', name: 'Analytics' },
            { id: 'feedback-btn', name: 'Feedback' },
            { id: 'contact-info-btn', name: 'Contact Info' }
        ];
        
        buttons.forEach(button => {
            const btn = document.getElementById(button.id);
            if (btn) {
                console.log(`✅ ${button.name} button found:`, btn);
                console.log(`   - Classes: ${btn.className}`);
                console.log(`   - Style display: ${btn.style.display}`);
                console.log(`   - Visible: ${btn.offsetWidth > 0 && btn.offsetHeight > 0}`);
            } else {
                console.warn(`❌ ${button.name} button NOT found`);
            }
        });
    }, 3000);
});

// === PORTFOLIO MANAGEMENT FUNCTIONS ===

// Function to show modal helper
function showModal(modal) {
    console.log('🔧 showModal called', {
        modal: modal ? modal.id : 'null',
        exists: !!modal
    });
    
    if (modal) {
        console.log('📖 Before showing modal:', {
            id: modal.id,
            classes: modal.className,
            display: modal.style.display,
            hidden: modal.classList.contains('hidden'),
            offsetParent: modal.offsetParent,
            parentElement: modal.parentElement?.tagName
        });
        
        // SOLUTION: Move modal to body root to avoid parent container issues
        if (modal.parentElement !== document.body) {
            console.log('🔄 Moving modal to document.body...');
            document.body.appendChild(modal);
        }
        
        // Force remove hidden class and set visibility
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        modal.style.visibility = 'visible';
        modal.style.opacity = '1';
        modal.style.zIndex = '9999';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        
        // Force re-render
        modal.offsetHeight; // Trigger reflow
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        
        // Check all parent elements for hidden
        let parent = modal.parentElement;
        while (parent && parent !== document.body) {
            console.log(`👀 Parent ${parent.tagName}:`, {
                classes: parent.className,
                display: window.getComputedStyle(parent).display,
                visibility: window.getComputedStyle(parent).visibility
            });
            parent = parent.parentElement;
        }
        
        console.log('✅ After showing modal:', {
            id: modal.id,
            classes: modal.className,
            display: modal.style.display,
            visibility: modal.style.visibility,
            opacity: modal.style.opacity,
            zIndex: modal.style.zIndex,
            computedDisplay: window.getComputedStyle(modal).display,
            computedVisibility: window.getComputedStyle(modal).visibility,
            computedZIndex: window.getComputedStyle(modal).zIndex,
            visible: modal.offsetParent !== null,
            rect: modal.getBoundingClientRect(),
            parentIsBody: modal.parentElement === document.body
        });
        
        // Test: Add click listener to modal background
        const testClick = (e) => {
            console.log('🔥 Modal clicked!', e.target);
        };
        modal.addEventListener('click', testClick, { once: true });
        
    } else {
        console.error('❌ Modal element is null');
    }
}

function hideModal(modal) {
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
        // Restore body scroll
        document.body.style.overflow = 'auto';
    }
}

// Load user portfolio from Firestore
async function loadUserPortfolio() {
    if (!currentUser) {
        userPortfolio = [];
        return;
    }

    try {
        console.log('🔍 Loading portfolio for user:', currentUser.uid);
        
        // Simple query without composite index requirement
        const portfolioSnapshot = await db.collection('portfolios')
            .where('userId', '==', currentUser.uid)
            .get();

        userPortfolio = [];
        portfolioSnapshot.forEach(doc => {
            const data = doc.data();
            console.log('📄 Portfolio data loaded:', { id: doc.id, images: data.images });
            userPortfolio.push({ 
                id: doc.id, 
                ...data,
                createdAt: data.createdAt || firebase.firestore.Timestamp.now()
            });
        });

        // Sort by createdAt on client side (avoid composite index)
        userPortfolio.sort((a, b) => {
            const timeA = a.createdAt?.toDate?.() || new Date(0);
            const timeB = b.createdAt?.toDate?.() || new Date(0);
            return timeB - timeA; // Newest first
        });

        console.log(`📁 Loaded ${userPortfolio.length} items in portfolio`);
    } catch (error) {
        console.error('❌ Error loading portfolio:', error);
        
        // Initialize empty portfolio on error
        userPortfolio = [];
        
        // Show user-friendly message
        if (error.code === 'failed-precondition' || error.message?.includes('index')) {
            console.log('📝 Index not ready yet, showing empty portfolio');
        } else {
            console.error('🚨 Unexpected portfolio error:', error);
        }
        userPortfolio = [];
    }
}

// Add parcel to portfolio from info panel
window.addToPortfolioFromPanel = function(soThua, soTo, loaiDat, dienTich, lat, lng) {
    if (!currentUser) {
        alert('Vui lòng đăng nhập để sử dụng tính năng ví bất động sản!');
        return;
    }

    // Store selected parcel data
    selectedParcelData = {
        soThua: soThua,
        soTo: soTo,
        loaiDat: loaiDat,
        dienTich: dienTich,
        lat: lat,
        lng: lng,
        locationUrl: `${window.location.origin}${window.location.pathname}?lat=${lat}&lng=${lng}` // Add locationUrl
    };

    // Pre-fill form
    document.getElementById('portfolio-name').value = `Thửa ${soThua}, Tờ ${soTo}`;
    document.getElementById('portfolio-area').value = dienTich || '';
    document.getElementById('portfolio-notes').value = `Loại đất: ${loaiDat || 'N/A'}`;

    // Show add portfolio modal
    showModal(addPortfolioModal);
};

// Show portfolio modal
function showPortfolioModal() {
    console.log('🎯 showPortfolioModal called', {
        currentUser: currentUser ? {
            uid: currentUser.uid,
            email: currentUser.email
        } : null,
        portfolioModal: !!portfolioModal
    });
    
    if (!currentUser) {
        console.log('⚠️ User not logged in, showing alert');
        alert('Vui lòng đăng nhập để xem ví bất động sản!');
        
        // Trigger login flow
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            console.log('🔄 Triggering login button click');
            loginBtn.click();
        }
        return;
    }

    console.log('✅ User authenticated, loading portfolio...');
    loadUserPortfolio().then(() => {
        console.log('📊 Portfolio loaded, rendering list...');
        renderPortfolioList();
        showModal(portfolioModal);
        console.log('✅ Portfolio modal shown');
    }).catch(error => {
        console.error('❌ Error loading portfolio:', error);
        alert('Có lỗi khi tải ví bất động sản. Vui lòng thử lại.');
    });
}

// Render portfolio list
function renderPortfolioList() {
    console.log('🎨 Rendering portfolio list...', {
        totalItems: userPortfolio.length,
        currentUser: currentUser ? currentUser.uid : 'null'
    });
    
    const portfolioList = document.getElementById('portfolio-list');
    const portfolioCount = document.getElementById('portfolio-count');
    const portfolioEmpty = document.getElementById('portfolio-empty');
    const filter = document.getElementById('portfolio-filter')?.value || 'all';

    console.log('📋 Portfolio elements:', {
        portfolioList: !!portfolioList,
        portfolioCount: !!portfolioCount,
        portfolioEmpty: !!portfolioEmpty,
        filter: filter
    });

    // Filter portfolio
    let filteredPortfolio = userPortfolio;
    if (filter !== 'all') {
        filteredPortfolio = userPortfolio.filter(item => item.visibility === filter);
    }

    if (portfolioCount) portfolioCount.textContent = filteredPortfolio.length;

    if (filteredPortfolio.length === 0) {
        console.log('📭 No portfolio items to display');
        if (portfolioList) portfolioList.classList.add('hidden');
        if (portfolioEmpty) portfolioEmpty.classList.remove('hidden');
        return;
    }

    console.log(`📊 Displaying ${filteredPortfolio.length} portfolio items`);
    if (portfolioList) portfolioList.classList.remove('hidden');
    if (portfolioEmpty) portfolioEmpty.classList.add('hidden');

    if (portfolioList) {
        portfolioList.innerHTML = filteredPortfolio.map(item => {
            // Get first image as thumbnail
            const thumbnail = item.images && item.images.length > 0 ? item.images[0] : null;
            console.log('🖼️ Portfolio item:', { id: item.id, name: item.name, images: item.images, thumbnail });
            
            return `
            <div class="portfolio-card">
                <div class="portfolio-card-header">
                    ${item.visibility === 'private' 
                        ? '<div class="portfolio-badge-private"><i class="fa-solid fa-lock mr-1"></i>Riêng tư</div>'
                        : '<div class="portfolio-badge-public"><i class="fa-solid fa-globe mr-1"></i>Công khai</div>'
                    }
                </div>
                ${thumbnail ? `
                <div class="portfolio-image">
                    <img src="${thumbnail}" alt="Hình ảnh bất động sản" 
                         onerror="console.error('❌ Image load error:', '${thumbnail}'); this.closest('.portfolio-image').style.display='none'"
                         onload="console.log('✅ Image loaded:', '${thumbnail}')"
                         onclick="viewPortfolioImages('${item.id}')">
                    ${item.images && item.images.length > 1 ? 
                        `<div class="image-count-badge">
                            <i class="fa-solid fa-images mr-1"></i>${item.images.length}
                        </div>` : ''
                    }
                </div>
                ` : `
                <div class="portfolio-no-image">
                    <div style="text-align: center;">
                        <i class="fa-solid fa-image block mb-2"></i>
                        <span>Chưa có hình ảnh</span>
                    </div>
                </div>
                `}
                <div class="portfolio-card-body">
                    <div class="portfolio-price">${item.price ? item.price + ' tỷ VNĐ' : 'Chưa có giá'}</div>
                    <div class="portfolio-name">${item.name}</div>
                    <div class="portfolio-details">
                        ${item.area ? `<div><i class="fa-solid fa-ruler-combined mr-1"></i>${item.area} m²</div>` : ''}
                        ${item.soThua ? `<div><i class="fa-solid fa-map-marker-alt mr-1"></i>Thửa ${item.soThua}, Tờ ${item.soTo}</div>` : ''}
                        ${item.notes ? `<div><i class="fa-solid fa-sticky-note mr-1"></i>${item.notes.substring(0, 50)}${item.notes.length > 50 ? '...' : ''}</div>` : ''}
                        <div><i class="fa-solid fa-calendar mr-1"></i>${formatPortfolioDate(item.createdAt?.toDate())}</div>
                    </div>
                    <div class="portfolio-actions">
                        <button class="portfolio-btn portfolio-btn-primary" onclick="viewPortfolioItem('${item.id}')">
                            <i class="fa-solid fa-eye mr-1"></i>Xem
                        </button>
                        <button class="portfolio-btn portfolio-btn-secondary" onclick="editPortfolioItem('${item.id}')">
                            <i class="fa-solid fa-edit mr-1"></i>Sửa
                        </button>
                        <button class="portfolio-btn portfolio-btn-danger" onclick="deletePortfolioItem('${item.id}')">
                            <i class="fa-solid fa-trash mr-1"></i>Xóa
                        </button>
                    </div>
                </div>
            </div>
        `;
        }).join('');
    }
}

// View portfolio images gallery
window.viewPortfolioImages = function(itemId) {
    const item = userPortfolio.find(p => p.id === itemId);
    if (!item || !item.images || item.images.length === 0) {
        showToast('❌ Không có hình ảnh nào', 'error');
        return;
    }

    // Create image gallery modal
    const galleryModal = document.createElement('div');
    galleryModal.className = 'modal-overlay active';
    galleryModal.innerHTML = `
        <div class="modal-content max-w-4xl">
            <div class="modal-header">
                <h3 class="modal-title">
                    <i class="fa-solid fa-images mr-2"></i>
                    Hình ảnh - ${item.name}
                </h3>
                <button type="button" class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                    <i class="fa-solid fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="image-gallery">
                    ${item.images.map((imageUrl, index) => `
                        <div class="gallery-item">
                            <img src="${imageUrl}" alt="Hình ảnh ${index + 1}" 
                                 onclick="openImageFullscreen('${imageUrl}')"
                                 onerror="this.closest('.gallery-item').style.display='none'">
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(galleryModal);
};

// Open image in fullscreen
window.openImageFullscreen = function(imageUrl) {
    const fullscreenModal = document.createElement('div');
    fullscreenModal.className = 'fullscreen-image-modal';
    fullscreenModal.innerHTML = `
        <div class="fullscreen-overlay" onclick="this.closest('.fullscreen-image-modal').remove()">
            <img src="${imageUrl}" alt="Hình ảnh phóng to">
            <button class="fullscreen-close" onclick="this.closest('.fullscreen-image-modal').remove()">
                <i class="fa-solid fa-times"></i>
            </button>
        </div>
    `;
    
    document.body.appendChild(fullscreenModal);
};

// View portfolio item on map
window.viewPortfolioItem = function(itemId) {
    const item = userPortfolio.find(p => p.id === itemId);
    if (!item) {
        console.error('❌ Portfolio item not found:', itemId);
        return;
    }

    console.log('👀 Viewing portfolio item:', item);

    // Check if we have a saved location URL
    if (item.locationUrl) {
        console.log('🔗 Opening location URL:', item.locationUrl);
        
        // Close portfolio modal
        hideModal(portfolioModal);
        
        // Open the location URL which will trigger coordinate-based search
        window.location.href = item.locationUrl;
        return;
    }

    // Fallback: if no location URL but has coordinates
    if (item.lat && item.lng) {
        console.log('� Creating location URL from coordinates');
        
        // Create location URL from coordinates
        const locationUrl = `${window.location.origin}${window.location.pathname}?lat=${item.lat}&lng=${item.lng}`;
        
        // Close portfolio modal
        hideModal(portfolioModal);
        
        // Open the location URL
        window.location.href = locationUrl;
        return;
    }

    // No location data available
    alert('❌ Không có tọa độ để hiển thị trên bản đồ.\n\nBĐS này có thể được thêm thủ công mà không có vị trí địa lý.');
    showToast('⚠️ Không có tọa độ GPS', 'warning');
};

// Edit portfolio item
window.editPortfolioItem = function(itemId) {
    const item = userPortfolio.find(p => p.id === itemId);
    if (!item) return;

    selectedParcelData = item; // Store for editing
    
    // Ensure locationUrl exists for editing
    if (item.lat && item.lng && !item.locationUrl) {
        selectedParcelData.locationUrl = `${window.location.origin}${window.location.pathname}?lat=${item.lat}&lng=${item.lng}`;
    }
    
    // Pre-fill form
    document.getElementById('portfolio-name').value = item.name || '';
    document.getElementById('portfolio-price').value = item.price || '';
    document.getElementById('portfolio-area').value = item.area || '';
    document.getElementById('portfolio-notes').value = item.notes || '';
    
    // Set visibility
    const visibilityRadio = document.querySelector(`input[name="portfolio-visibility"][value="${item.visibility}"]`);
    if (visibilityRadio) visibilityRadio.checked = true;

    // Display existing images if any
    if (item.images && item.images.length > 0) {
        const imagePreview = document.getElementById('image-preview');
        const imageUploadText = document.querySelector('.image-upload-text');
        
        imagePreview.innerHTML = item.images.map((imageUrl, index) => `
            <div class="image-preview-item" data-existing="true" data-url="${imageUrl}">
                <img src="${imageUrl}" alt="Existing image ${index + 1}" onerror="this.closest('.image-preview-item').remove()">
                <div class="image-preview-overlay">
                    <button type="button" class="image-remove-btn" onclick="removeExistingImage('${imageUrl}', this)">
                        <i class="fa-solid fa-times"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
        if (imageUploadText) {
            imageUploadText.style.display = 'none';
        }
    }

    // Change modal title
    document.getElementById('add-portfolio-title').innerHTML = '<i class="fa-solid fa-edit mr-2 text-indigo-600"></i>Chỉnh sửa BĐS';
    
    // Store item ID for updating
    portfolioForm.dataset.editingId = itemId;
    
    showModal(addPortfolioModal);
};

// Remove existing image
window.removeExistingImage = function(imageUrl, buttonElement) {
    const imageItem = buttonElement.closest('.image-preview-item');
    if (imageItem) {
        imageItem.remove();
        
        // Check if preview is empty and show upload text
        const imagePreview = document.getElementById('image-preview');
        const imageUploadText = document.querySelector('.image-upload-text');
        
        if (imagePreview.children.length === 0 && imageUploadText) {
            imageUploadText.style.display = 'block';
        }
    }
};

// Delete portfolio item
window.deletePortfolioItem = async function(itemId) {
    if (!confirm('Bạn có chắc muốn xóa bất động sản này khỏi ví?')) return;

    try {
        await db.collection('portfolios').doc(itemId).delete();
        await loadUserPortfolio();
        renderPortfolioList();
        showToast('✅ Đã xóa khỏi ví bất động sản', 'success');
    } catch (error) {
        console.error('❌ Error deleting portfolio item:', error);
        showToast('❌ Có lỗi khi xóa khỏi ví', 'error');
    }
};

// Handle portfolio form submission
async function handlePortfolioFormSubmit(e) {
    e.preventDefault();
    
    if (!currentUser) {
        alert('Vui lòng đăng nhập!');
        return;
    }

    // Get form data directly from elements for better reliability
    const nameInput = document.getElementById('portfolio-name');
    const priceInput = document.getElementById('portfolio-price');
    const areaInput = document.getElementById('portfolio-area');
    const notesInput = document.getElementById('portfolio-notes');
    const visibilityInput = document.querySelector('input[name="portfolio-visibility"]:checked');

    console.log('🔍 Form elements check:', {
        nameElement: !!nameInput,
        priceElement: !!priceInput,
        areaElement: !!areaInput,
        notesElement: !!notesInput,
        visibilityElement: !!visibilityInput
    });

    const portfolioData = {
        name: nameInput?.value?.trim() || '',
        price: priceInput?.value ? parseFloat(priceInput.value) : null,
        area: areaInput?.value ? parseFloat(areaInput.value) : null,
        notes: notesInput?.value?.trim() || '',
        visibility: visibilityInput?.value || 'private',
        userId: currentUser.uid,
        userName: currentUser.displayName || 'User',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    console.log('📋 Portfolio data to submit:', portfolioData);

    // Add parcel data if available
    if (selectedParcelData) {
        console.log('🔍 Debug selectedParcelData:', selectedParcelData);
        console.log('🔍 locationUrl value:', selectedParcelData.locationUrl, 'type:', typeof selectedParcelData.locationUrl);
        
        portfolioData.soThua = selectedParcelData.soThua;
        portfolioData.soTo = selectedParcelData.soTo;
        portfolioData.loaiDat = selectedParcelData.loaiDat;
        portfolioData.lat = selectedParcelData.lat;
        portfolioData.lng = selectedParcelData.lng;
        
        // Create locationUrl from coordinates if not exists or invalid
        if (!selectedParcelData.locationUrl || selectedParcelData.locationUrl === 'undefined') {
            if (selectedParcelData.lat && selectedParcelData.lng) {
                selectedParcelData.locationUrl = `${window.location.origin}${window.location.pathname}?lat=${selectedParcelData.lat}&lng=${selectedParcelData.lng}`;
                console.log('🔧 Created locationUrl from coordinates:', selectedParcelData.locationUrl);
            }
        }
        
        // Only add locationUrl if it's valid
        if (selectedParcelData.locationUrl && selectedParcelData.locationUrl !== 'undefined') {
            portfolioData.locationUrl = selectedParcelData.locationUrl;
            console.log('✅ Added locationUrl:', selectedParcelData.locationUrl);
        } else {
            console.log('⚠️ No valid locationUrl, skipping');
        }
        
        console.log('📍 Added parcel data:', selectedParcelData);
    }

    if (!portfolioData.name || portfolioData.name.length === 0) {
        console.error('❌ Validation failed - empty name:', {
            nameValue: portfolioData.name,
            nameLength: portfolioData.name.length,
            inputElement: nameInput,
            inputValue: nameInput?.value
        });
        alert('Vui lòng nhập tên cho bất động sản');
        nameInput?.focus();
        return;
    }

    try {
        const editingId = portfolioForm.dataset.editingId;
        let portfolioId = editingId;
        let portfolioRef;
        
        if (editingId) {
            // Update existing item
            portfolioRef = db.collection('portfolios').doc(editingId);
            
            // Get remaining existing images from the preview
            const existingImageItems = document.querySelectorAll('.image-preview-item[data-existing="true"]');
            const remainingExistingImages = Array.from(existingImageItems).map(item => item.dataset.url);
            
            // Upload new images if any selected
            let newUploadedImages = [];
            if (selectedImages.length > 0) {
                console.log('📤 Uploading new images for existing portfolio...');
                newUploadedImages = await uploadPortfolioImages(editingId, currentUser.uid);
            }
            
            // Combine remaining existing images with new uploaded images
            portfolioData.images = [...remainingExistingImages, ...newUploadedImages];
            
            await portfolioRef.update(portfolioData);
            showToast('✅ Đã cập nhật ví bất động sản', 'success');
        } else {
            // Add new item
            portfolioData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            
            // First create the document to get ID
            portfolioRef = await db.collection('portfolios').add(portfolioData);
            portfolioId = portfolioRef.id;
            
            // Upload images if any selected
            if (selectedImages.length > 0) {
                console.log('📤 Uploading images for new portfolio...');
                const uploadedImages = await uploadPortfolioImages(portfolioId, currentUser.uid);
                
                // Update document with image URLs
                await portfolioRef.update({
                    images: uploadedImages
                });
            }
            
            showToast('✅ Đã thêm vào ví bất động sản', 'success');
        }

        // Reset form and close modal
        portfolioForm.reset();
        delete portfolioForm.dataset.editingId;
        selectedParcelData = null;
        clearAllImages(); // Clear uploaded images
        hideModal(addPortfolioModal);
        
        // Reload portfolio
        await loadUserPortfolio();
        if (!portfolioModal.classList.contains('hidden')) {
            renderPortfolioList();
        }

    } catch (error) {
        console.error('❌ Error saving to portfolio:', error);
        showToast('❌ Có lỗi khi lưu vào ví', 'error');
    }
}

function formatPortfolioDate(date) {
    if (!date) return 'Không rõ';
    return new Intl.DateTimeFormat('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(date);
}

// Alias for compatibility
const formatDate = formatPortfolioDate;

// Debug function to check button status
function debugAnalyticsButton() {
    const btn = document.getElementById('analytics-btn');
    console.log('=== Analytics Button Debug ===');
    console.log('Button element:', btn);
    console.log('Button exists:', !!btn);
    if (btn) {
        console.log('Button onclick:', btn.onclick);
        console.log('Button parent:', btn.parentElement);
        console.log('Button style display:', window.getComputedStyle(btn).display);
        console.log('Button style visibility:', window.getComputedStyle(btn).visibility);
        console.log('Button disabled:', btn.disabled);
        console.log('Button class:', btn.className);
    }
    console.log('=== End Debug ===');
}

// Manual test function
function testAnalyticsButton() {
    console.log('Testing analytics button click...');
    const btn = document.getElementById('analytics-btn');
    if (btn) {
        console.log('Simulating click...');
        
        // Test what element is at the button's position
        const rect = btn.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const elementAtPoint = document.elementFromPoint(centerX, centerY);
        
        console.log('Button position:', {x: centerX, y: centerY});
        console.log('Element at button position:', elementAtPoint);
        console.log('Is element the button?', elementAtPoint === btn);
        console.log('Element ID:', elementAtPoint?.id);
        console.log('Element classes:', elementAtPoint?.className);
        
        btn.click();
        console.log('Button clicked programmatically');
    } else {
        console.error('Button not found for test');
    }
}

// ============================================================================= 
//  PHASE 4: IMAGE UPLOAD SYSTEM
// ============================================================================= 

// Global variables for image handling
let selectedImages = [];
let uploadedImageUrls = [];

// Initialize image upload system
function initializeImageUpload() {
    console.log('🖼️ Initializing image upload system...');
    
    const uploadZone = document.getElementById('image-upload-zone');
    const fileInput = document.getElementById('portfolio-images');
    const selectBtn = document.getElementById('select-images-btn');
    const clearBtn = document.getElementById('clear-images-btn');
    const previewGallery = document.getElementById('image-preview-gallery');
    const previewContainer = document.getElementById('preview-container');
    const imageCount = document.getElementById('image-count');
    
    if (!uploadZone || !fileInput) {
        console.log('⚠️ Image upload elements not found, skipping initialization');
        return;
    }
    
    // Drag and drop handlers
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });
    
    uploadZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
    });
    
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
        handleImageFiles(files);
    });
    
    // Click to select images
    uploadZone.addEventListener('click', () => {
        fileInput.click();
    });
    
    selectBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });
    
    // File input change
    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        handleImageFiles(files);
    });
    
    // Clear all images
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            clearAllImages();
        });
    }
    
    console.log('✅ Image upload system initialized');
}

// Handle selected image files
function handleImageFiles(files) {
    console.log('📷 Processing', files.length, 'image files');
    
    // Validate file count
    if (selectedImages.length + files.length > 10) {
        alert('Bạn chỉ có thể chọn tối đa 10 ảnh. Vui lòng bỏ bớt một số ảnh.');
        return;
    }
    
    // Validate file sizes and types
    const validFiles = [];
    for (const file of files) {
        if (!file.type.startsWith('image/')) {
            alert(`File "${file.name}" không phải là ảnh. Vui lòng chọn file JPG, PNG, hoặc HEIC.`);
            continue;
        }
        
        if (file.size > 10 * 1024 * 1024) { // 10MB
            alert(`File "${file.name}" quá lớn (${(file.size / 1024 / 1024).toFixed(1)}MB). Vui lòng chọn ảnh nhỏ hơn 10MB.`);
            continue;
        }
        
        validFiles.push(file);
    }
    
    // Add valid files to selection
    validFiles.forEach(file => {
        const imageData = {
            file: file,
            id: Date.now() + Math.random(), // Unique ID
            preview: null,
            uploaded: false,
            url: null
        };
        
        selectedImages.push(imageData);
        createImagePreview(imageData);
    });
    
    updateImageCount();
    showPreviewGallery();
}

// Create image preview
function createImagePreview(imageData) {
    const previewContainer = document.getElementById('preview-container');
    
    // Create preview element
    const previewDiv = document.createElement('div');
    previewDiv.className = 'image-preview';
    previewDiv.dataset.imageId = imageData.id;
    
    // Create loading state
    previewDiv.innerHTML = `
        <div class="image-loading">
            <div class="loading-spinner"></div>
        </div>
    `;
    
    previewContainer.appendChild(previewDiv);
    
    // Load image preview
    const reader = new FileReader();
    reader.onload = (e) => {
        imageData.preview = e.target.result;
        previewDiv.innerHTML = `
            <img src="${e.target.result}" alt="Preview">
            <div class="image-overlay">
                <button type="button" class="remove-btn" onclick="removeImage('${imageData.id}')">
                    <i class="fa-solid fa-times"></i>
                </button>
            </div>
        `;
    };
    
    reader.readAsDataURL(imageData.file);
}

// Remove image from selection
window.removeImage = function(imageId) {
    console.log('🗑️ Removing image:', imageId);
    
    // Remove from array
    selectedImages = selectedImages.filter(img => img.id != imageId);
    
    // Remove preview element
    const previewElement = document.querySelector(`[data-image-id="${imageId}"]`);
    if (previewElement) {
        previewElement.remove();
    }
    
    updateImageCount();
    
    // Hide gallery if no images
    if (selectedImages.length === 0) {
        hidePreviewGallery();
    }
};

// Clear all images
function clearAllImages() {
    console.log('🧹 Clearing all images');
    
    selectedImages = [];
    uploadedImageUrls = [];
    
    const previewContainer = document.getElementById('preview-container');
    if (previewContainer) {
        previewContainer.innerHTML = '';
    }
    
    hidePreviewGallery();
    updateImageCount();
    
    // Reset file input
    const fileInput = document.getElementById('portfolio-images');
    if (fileInput) {
        fileInput.value = '';
    }
}

// Update image count display
function updateImageCount() {
    const imageCount = document.getElementById('image-count');
    const count = selectedImages.length;
    if (imageCount) {
        imageCount.textContent = `${count} ảnh được chọn`;
    }
}

// Show preview gallery
function showPreviewGallery() {
    const previewGallery = document.getElementById('image-preview-gallery');
    if (previewGallery) {
        previewGallery.classList.remove('hidden');
    }
}

// Hide preview gallery
function hidePreviewGallery() {
    const previewGallery = document.getElementById('image-preview-gallery');
    if (previewGallery) {
        previewGallery.classList.add('hidden');
    }
}

// Upload images with Google Drive → Imgur fallback (Firebase Storage temporarily disabled)
async function uploadPortfolioImages(portfolioId, userId) {
    console.log('📤 Starting image upload for portfolio:', portfolioId);
    console.log('🔄 Using Google Drive → Imgur fallback (Firebase Storage disabled)');
    
    if (selectedImages.length === 0) {
        console.log('📷 No images to upload');
        return [];
    }
    
    const uploadedUrls = [];
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const uploadProgress = document.getElementById('upload-progress');
    
    // Show progress
    if (uploadProgress) {
        uploadProgress.classList.remove('hidden');
    }
    
    try {
        // Prepare files array
        const files = selectedImages.map(imageData => imageData.file);
        
        // Update progress for authentication
        if (progressText) {
            progressText.textContent = 'Đang kết nối Google Drive...';
        }
        
        // Primary: Upload to Google Drive
        const uploadedFiles = await uploadPortfolioImagesToGoogleDrive(portfolioId, files);
        
        // Convert to the expected format
        for (let i = 0; i < uploadedFiles.length; i++) {
            const progress = ((i + 1) / uploadedFiles.length) * 100;
            
            // Update progress
            if (progressBar) {
                progressBar.style.width = `${progress}%`;
            }
            if (progressText) {
                progressText.textContent = `Đã tải ${i + 1}/${uploadedFiles.length} ảnh lên Google Drive`;
            }
            
            const file = uploadedFiles[i];
            uploadedUrls.push({
                url: file.webContentLink, // Direct download link
                viewUrl: file.webViewLink, // View link
                name: file.name,
                id: file.id,
                storage: 'googledrive' // Mark as Google Drive storage
            });
        }
        
        console.log('✅ All images uploaded to Google Drive successfully');
        
        // Hide progress after delay
        setTimeout(() => {
            if (uploadProgress) {
                uploadProgress.classList.add('hidden');
            }
        }, 2000);
        
        // Return array of URLs for Firestore (extract URLs from objects)
        return uploadedUrls.map(item => item.url);
        
    } catch (error) {
        console.error('⚠️ Google Drive upload failed, trying Imgur fallback:', error);
        console.log('🔄 Firebase Storage is temporarily disabled, using Imgur instead');
        
        // Show Imgur fallback message
        if (progressText) {
            progressText.textContent = 'Google Drive chưa sẵn sàng, đang chuyển sang Imgur...';
        }
        
        try {
            // Fallback to Imgur (skip Firebase Storage)
            const files = selectedImages.map(imageData => imageData.file);
            const uploadedFiles = await uploadPortfolioImagesToImgur(portfolioId, files);
            
            const imgurUrls = [];
            for (let i = 0; i < uploadedFiles.length; i++) {
                const progress = ((i + 1) / uploadedFiles.length) * 100;
                
                // Update progress
                if (progressBar) {
                    progressBar.style.width = `${progress}%`;
                }
                if (progressText) {
                    progressText.textContent = `Đã tải ${i + 1}/${uploadedFiles.length} ảnh lên Imgur`;
                }
                
                const file = uploadedFiles[i];
                imgurUrls.push(file.webContentLink);
            }
            
            console.log('✅ Imgur fallback successful!');
            
            if (progressText) {
                progressText.textContent = '✅ Hoàn thành tải ảnh lên Imgur!';
            }
            
            // Hide progress after delay
            setTimeout(() => {
                if (uploadProgress) {
                    uploadProgress.classList.add('hidden');
                }
            }, 2000);
            
            return imgurUrls;
            
        } catch (imgurError) {
            console.error('❌ Both Google Drive and Imgur failed:', imgurError);
            
            // Show final error
            if (progressText) {
                progressText.textContent = '❌ Lỗi tải ảnh. Vui lòng thử lại sau.';
                progressText.className += ' text-red-600';
            }
                
                // Hide progress after delay
                setTimeout(() => {
                    if (uploadProgress) {
                        uploadProgress.classList.add('hidden');
                    }
                }, 3000);
                
                throw new Error('All storage options failed');
            }
        }
    }

// Clear all selected images
function clearAllImages() {
    selectedImages = [];
    imagePreview.innerHTML = '';
    imageUploadText.style.display = 'block';
    imageProgress.style.display = 'none';
    
    // Reset image count
    updateImageCount();
}

// Update image count display
function updateImageCount() {
    const imageCountText = document.querySelector('.image-count-text');
    if (imageCountText) {
        if (selectedImages.length > 0) {
            imageCountText.textContent = `${selectedImages.length} ảnh đã chọn`;
            imageCountText.style.display = 'block';
        } else {
            imageCountText.style.display = 'none';
        }
    }
}

// Enhanced image compression with better quality and WebP support
function compressImage(file, maxWidth = 800, quality = 0.8) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
            // Calculate new dimensions maintaining aspect ratio
            let { width, height } = img;
            
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }
            
            // Set canvas size
            canvas.width = width;
            canvas.height = height;
            
            // Enable better image smoothing
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            // Draw and compress
            ctx.drawImage(img, 0, 0, width, height);
            
            // Try WebP first (better compression), fallback to JPEG
            canvas.toBlob((webpBlob) => {
                if (webpBlob && webpBlob.size < file.size) {
                    console.log(`🗜️ WebP compression: ${file.size} → ${webpBlob.size} bytes (${Math.round((1 - webpBlob.size/file.size) * 100)}% reduction)`);
                    resolve(webpBlob);
                } else {
                    // Fallback to JPEG
                    canvas.toBlob((jpegBlob) => {
                        if (jpegBlob && jpegBlob.size < file.size) {
                            console.log(`🗜️ JPEG compression: ${file.size} → ${jpegBlob.size} bytes (${Math.round((1 - jpegBlob.size/file.size) * 100)}% reduction)`);
                            resolve(jpegBlob);
                        } else {
                            console.log('⚠️ Compression not beneficial, using original');
                            resolve(file);
                        }
                    }, 'image/jpeg', quality);
                }
            }, 'image/webp', quality);
        };
        
        img.onerror = () => {
            console.error('❌ Image compression failed, using original');
            resolve(file);
        };
        
        img.src = URL.createObjectURL(file);
    });
}

// === GOOGLE DRIVE API FUNCTIONS ===

// Initialize Google Drive API
async function initializeGoogleDrive() {
    console.log('🔧 Initializing Google Drive API...');
    
    try {
        // Load Google APIs
        if (typeof gapi === 'undefined') {
            console.log('📦 Loading Google API script...');
            await loadGoogleAPIScript();
        }
        
        await new Promise((resolve, reject) => {
            gapi.load('auth2:client', resolve);
        });
        
        await gapi.client.init({
            apiKey: GOOGLE_CONFIG.apiKey,
            clientId: GOOGLE_CONFIG.clientId,
            discoveryDocs: GOOGLE_CONFIG.discoveryDocs,
            scope: GOOGLE_CONFIG.scope
        });
        
        googleAuthInstance = gapi.auth2.getAuthInstance();
        isGoogleDriveReady = true;
        
        console.log('✅ Google Drive API initialized successfully');
        return true;
    } catch (error) {
        console.error('❌ Failed to initialize Google Drive API:', error);
        isGoogleDriveReady = false;
        return false;
    }
}

// Load Google API script dynamically
function loadGoogleAPIScript() {
    return new Promise((resolve, reject) => {
        if (document.querySelector('script[src*="apis.google.com"]')) {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Authenticate with Google Drive
async function authenticateGoogleDrive() {
    console.log('🔐 Authenticating with Google Drive...');
    
    if (!isGoogleDriveReady) {
        const initialized = await initializeGoogleDrive();
        if (!initialized) {
            throw new Error('Google Drive API not ready');
        }
    }
    
    if (!googleAuthInstance.isSignedIn.get()) {
        await googleAuthInstance.signIn();
    }
    
    console.log('✅ Google Drive authentication successful');
    return true;
}

// Create portfolio folder in Google Drive
async function createPortfolioFolder(portfolioId) {
    console.log('📁 Creating portfolio folder:', portfolioId);
    
    try {
        const response = await gapi.client.drive.files.create({
            resource: {
                name: `Portfolio_${portfolioId}`,
                mimeType: 'application/vnd.google-apps.folder',
                parents: ['root'] // Store in root folder
            }
        });
        
        const folderId = response.result.id;
        console.log('✅ Portfolio folder created:', folderId);
        return folderId;
    } catch (error) {
        console.error('❌ Failed to create portfolio folder:', error);
        throw error;
    }
}

// Upload file to Google Drive
async function uploadToGoogleDrive(file, fileName, folderId) {
    console.log('📤 Uploading to Google Drive:', fileName);
    
    const fileMetadata = {
        name: fileName,
        parents: [folderId]
    };
    
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(fileMetadata)], {type: 'application/json'}));
    form.append('file', file);
    
    const accessToken = gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token;
    
    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`
        },
        body: form
    });
    
    if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('✅ File uploaded to Google Drive:', result.id);
    
    // Make file publicly viewable
    await gapi.client.drive.permissions.create({
        fileId: result.id,
        resource: {
            role: 'reader',
            type: 'anyone'
        }
    });
    
    return {
        id: result.id,
        name: result.name,
        webViewLink: `https://drive.google.com/file/d/${result.id}/view`,
        webContentLink: `https://drive.google.com/uc?id=${result.id}`
    };
}

// Upload portfolio images to Google Drive
async function uploadPortfolioImagesToGoogleDrive(portfolioId, files) {
    console.log('📤 Starting Google Drive upload for portfolio:', portfolioId);
    
    try {
        // Authenticate first
        await authenticateGoogleDrive();
        
        // Create portfolio folder
        const folderId = await createPortfolioFolder(portfolioId);
        
        const uploadedFiles = [];
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fileName = `image_${Date.now()}_${Math.random().toString(36).substring(7)}.${file.type.split('/')[1]}`;
            
            try {
                const result = await uploadToGoogleDrive(file, fileName, folderId);
                uploadedFiles.push(result);
                console.log(`✅ Uploaded ${i + 1}/${files.length}: ${fileName}`);
            } catch (error) {
                console.error(`❌ Failed to upload ${fileName}:`, error);
                throw error;
            }
        }
        
        console.log('✅ All files uploaded to Google Drive successfully');
        return uploadedFiles;
        
    } catch (error) {
        console.error('❌ Google Drive upload failed:', error);
        throw error;
    }
}

// === IMGUR API FUNCTIONS ===

// Upload single file to Imgur
async function uploadToImgur(file, fileName) {
    console.log('📤 Uploading to Imgur:', fileName);
    
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async function() {
            try {
                const base64Data = reader.result.split(',')[1]; // Remove data:image/...;base64,
                
                const formData = new FormData();
                formData.append('image', base64Data);
                formData.append('type', 'base64');
                formData.append('title', fileName);
                
                const response = await fetch(IMGUR_CONFIG.apiUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Client-ID ${IMGUR_CONFIG.clientId}`
                    },
                    body: formData
                });
                
                if (!response.ok) {
                    throw new Error(`Imgur upload failed: ${response.statusText}`);
                }
                
                const result = await response.json();
                
                if (!result.success) {
                    throw new Error(`Imgur API error: ${result.data?.error || 'Unknown error'}`);
                }
                
                console.log('✅ File uploaded to Imgur:', result.data.id);
                
                resolve({
                    id: result.data.id,
                    name: fileName,
                    webViewLink: result.data.link,
                    webContentLink: result.data.link, // Same as view link for Imgur
                    deleteHash: result.data.deletehash // For future deletion if needed
                });
                
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

// Upload portfolio images to Imgur
async function uploadPortfolioImagesToImgur(portfolioId, files) {
    console.log('📤 Starting Imgur upload for portfolio:', portfolioId);
    
    try {
        const uploadedFiles = [];
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fileName = `portfolio_${portfolioId}_${Date.now()}_${Math.random().toString(36).substring(7)}.${file.type.split('/')[1]}`;
            
            try {
                const result = await uploadToImgur(file, fileName);
                uploadedFiles.push(result);
                console.log(`✅ Uploaded ${i + 1}/${files.length} to Imgur: ${fileName}`);
            } catch (error) {
                console.error(`❌ Failed to upload ${fileName} to Imgur:`, error);
                throw error;
            }
        }
        
        console.log('✅ All files uploaded to Imgur successfully');
        return uploadedFiles;
        
    } catch (error) {
        console.error('❌ Imgur upload failed:', error);
        throw error;
    }
}

// Upload portfolio images to Imgur
async function uploadPortfolioImagesToImgur(portfolioId, files) {
    console.log('📤 Starting Imgur upload for portfolio:', portfolioId);
    
    try {
        const uploadedFiles = [];
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const timestamp = Date.now();
            const extension = file.name.split('.').pop() || 'jpg';
            const fileName = `portfolio_${portfolioId}_${timestamp}_${Math.random().toString(36).substring(7)}.${extension}`;
            
            try {
                const result = await uploadToImgur(file, fileName);
                uploadedFiles.push(result);
                console.log(`✅ Uploaded ${i + 1}/${files.length}: ${fileName}`);
            } catch (error) {
                console.error(`❌ Failed to upload ${fileName}:`, error);
                throw error;
            }
        }
        
        console.log('✅ All files uploaded to Imgur successfully');
        return uploadedFiles;
        
    } catch (error) {
        console.error('❌ Imgur upload failed:', error);
        throw error;
    }
}

// Initialize image upload when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initializeImageUpload, 1000);
    });
} else {
    setTimeout(initializeImageUpload, 1000);
}