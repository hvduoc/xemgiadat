/**
 * Portfolio Module - IIFE Pattern
 * Handles all portfolio-related functionality
 * Lazy-loaded after user authentication
 * 
 * Dependencies: window.auth, window.db, window.storage, window.firebase
 * Global Variables: currentUser, userPortfolio, selectedParcelData, selectedImages
 */

(function() {
    'use strict';
    
    console.log('📁 Portfolio module loading...');
    
    // Reference to global Firebase services
    const getAuth = () => window.auth;
    const getDb = () => window.db;
    const getStorage = () => window.storage;
    const getFirebase = () => window.firebase;
    
    // DOM elements (will be initialized in init())
    let portfolioBtn = null;
    let portfolioModal = null;
    let closePortfolioModal = null;
    let addPortfolioModal = null;
    let closeAddPortfolioModal = null;
    let portfolioForm = null;
    
    /**
     * Initialize Portfolio Module
     * Sets up DOM references and event listeners
     */
    function init() {
        console.log('🚀 Initializing Portfolio Module...');
        
        // Initialize DOM elements
        portfolioBtn = document.getElementById('portfolio-menu-btn');
        portfolioModal = document.getElementById('portfolio-modal');
        closePortfolioModal = document.getElementById('close-portfolio-modal');
        addPortfolioModal = document.getElementById('add-portfolio-modal');
        closeAddPortfolioModal = document.getElementById('close-add-portfolio-modal');
        portfolioForm = document.getElementById('portfolio-form');
        
        // Validate critical elements
        if (!portfolioModal || !addPortfolioModal) {
            console.error('❌ Critical portfolio DOM elements missing');
            return false;
        }
        
        // Setup event listeners
        setupEventListeners();
        
        console.log('✅ Portfolio Module initialized');
        return true;
    }
    
    /**
     * Setup all event listeners for portfolio UI
     */
    function setupEventListeners() {
        // Portfolio button click (in profile menu)
        if (portfolioBtn) {
            portfolioBtn.addEventListener('click', async () => {
                try {
                    await loadUserPortfolio();
                    showPortfolioModal();
                } catch (error) {
                    console.error('❌ Error opening portfolio:', error);
                    if (window.showToast) {
                        window.showToast('❌ Không thể tải ví bất động sản', 'error');
                    }
                }
            });
        }
        
        // Close modal buttons
        if (closePortfolioModal) {
            closePortfolioModal.addEventListener('click', () => {
                if (window.hideModal) window.hideModal(portfolioModal);
            });
        }
        
        if (closeAddPortfolioModal) {
            closeAddPortfolioModal.addEventListener('click', () => {
                if (window.hideModal) window.hideModal(addPortfolioModal);
                resetPortfolioForm();
            });
        }
        
        // Form submission
        if (portfolioForm) {
            portfolioForm.addEventListener('submit', handlePortfolioFormSubmit);
        }
    }
    
    /**
     * Load user's portfolio from Firestore
     * @returns {Promise<void>}
     */
    async function loadUserPortfolio() {
        if (!window.currentUser) {
            console.log('⚠️ No user logged in, skipping portfolio load');
            window.userPortfolio = [];
            return;
        }
        
        try {
            const db = getDb();
            const snapshot = await db.collection('portfolios')
                .where('userId', '==', window.currentUser.uid)
                .get();
            
            // Sort by createdAt on client side
            window.userPortfolio = snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate()
                }))
                .sort((a, b) => {
                    if (!a.createdAt) return 1;
                    if (!b.createdAt) return -1;
                    return b.createdAt - a.createdAt;
                });
            
            console.log('✅ Loaded portfolio:', window.userPortfolio.length, 'items');
        } catch (error) {
            console.error('❌ Error loading portfolio:', error);
            
            // Specific error handling for Firestore index issues
            if (error.code === 'failed-precondition' || error.message?.includes('index')) {
                console.error('❌ Firestore index required. Check console for index creation link.');
            }
            
            window.userPortfolio = [];
            throw error;
        }
    }
    
    /**
     * Show portfolio modal and render list
     */
    function showPortfolioModal() {
        if (window.showModal) {
            window.showModal(portfolioModal);
        } else {
            portfolioModal?.classList.remove('hidden');
        }
        renderPortfolioList();
    }
    
    /**
     * Render portfolio items in the modal
     */
    function renderPortfolioList() {
        const container = document.getElementById('portfolio-list');
        if (!container) {
            console.error('❌ Portfolio list container not found');
            return;
        }
        
        if (!window.userPortfolio || window.userPortfolio.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-folder-open text-6xl text-gray-400 mb-4"></i>
                    <p class="text-gray-600 mb-2">Ví của bạn đang trống</p>
                    <p class="text-sm text-gray-500">Nhấp vào thửa đất trên bản đồ và chọn "Thêm vào ví"</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = window.userPortfolio.map(item => {
            const imageThumbnails = item.images && item.images.length > 0 
                ? `
                    <div class="portfolio-images">
                        <img src="${item.images[0]}" alt="${item.name}" 
                             onerror="this.src='/images/placeholder.png'"
                             onclick="window.PortfolioManager.viewPortfolioImages('${item.id}')">
                        ${item.images.length > 1 ? `
                            <div class="image-count">
                                <i class="fa-solid fa-images"></i> ${item.images.length}
                            </div>
                        ` : ''}
                    </div>
                `
                : '<div class="portfolio-no-image"><i class="fa-solid fa-image text-gray-400"></i></div>';
            
            const locationInfo = item.soThua && item.soTo 
                ? `<p class="text-sm text-gray-600"><i class="fa-solid fa-map-marker-alt mr-1"></i> Thửa ${item.soThua}, Tờ ${item.soTo}</p>`
                : '';
            
            const priceInfo = item.price 
                ? `<p class="text-lg font-bold text-blue-600">${formatCurrency(item.price)}</p>`
                : '';
            
            const areaInfo = item.area 
                ? `<p class="text-sm text-gray-600"><i class="fa-solid fa-ruler-combined mr-1"></i> ${item.area} m²</p>`
                : '';
            
            return `
                <div class="portfolio-item" data-portfolio-id="${item.id}">
                    ${imageThumbnails}
                    <div class="portfolio-info">
                        <h4 class="font-semibold text-gray-800 mb-1">${item.name}</h4>
                        ${locationInfo}
                        ${priceInfo}
                        ${areaInfo}
                        ${item.notes ? `<p class="text-sm text-gray-500 mt-2">${item.notes}</p>` : ''}
                        <div class="portfolio-actions mt-3">
                            <button onclick="window.PortfolioManager.viewPortfolioItem('${item.id}')" 
                                    class="btn-secondary btn-sm">
                                <i class="fa-solid fa-map-marker-alt mr-1"></i> Xem trên bản đồ
                            </button>
                            <button onclick="window.PortfolioManager.editPortfolioItem('${item.id}')" 
                                    class="btn-secondary btn-sm">
                                <i class="fa-solid fa-edit mr-1"></i> Sửa
                            </button>
                            <button onclick="window.PortfolioManager.deletePortfolioItem('${item.id}')" 
                                    class="btn-danger btn-sm">
                                <i class="fa-solid fa-trash mr-1"></i> Xóa
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    /**
     * View portfolio item images in gallery
     * @param {string} itemId - Portfolio item ID
     */
    function viewPortfolioImages(itemId) {
        const item = window.userPortfolio?.find(p => p.id === itemId);
        if (!item || !item.images || item.images.length === 0) {
            console.log('⚠️ No images found for portfolio item:', itemId);
            return;
        }
        
        // Create or get image modal
        let imageModal = document.getElementById('portfolio-image-modal');
        if (!imageModal) {
            imageModal = document.createElement('div');
            imageModal.id = 'portfolio-image-modal';
            imageModal.className = 'modal hidden';
            document.body.appendChild(imageModal);
        }
        
        // Render image gallery
        imageModal.innerHTML = `
            <div class="modal-content image-gallery-modal">
                <div class="modal-header">
                    <h3><i class="fa-solid fa-images mr-2"></i>${item.name} - Thư viện ảnh</h3>
                    <button id="close-image-modal" class="close-btn">
                        <i class="fa-solid fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="image-gallery">
                        ${item.images.map((imageUrl, index) => `
                            <div class="gallery-item" onclick="window.PortfolioManager.openImageFullscreen('${imageUrl}')">
                                <img src="${imageUrl}" alt="Ảnh ${index + 1}" 
                                     onerror="this.src='/images/placeholder.png'">
                                <div class="image-overlay">
                                    <i class="fa-solid fa-search-plus text-2xl"></i>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        // Show modal
        if (window.showModal) {
            window.showModal(imageModal);
        } else {
            imageModal.classList.remove('hidden');
        }
        
        // Close button handler
        document.getElementById('close-image-modal')?.addEventListener('click', () => {
            if (window.hideModal) {
                window.hideModal(imageModal);
            } else {
                imageModal.classList.add('hidden');
            }
        });
    }
    
    /**
     * Open image in fullscreen viewer
     * @param {string} imageUrl - Image URL to display
     */
    function openImageFullscreen(imageUrl) {
        let fullscreenModal = document.getElementById('fullscreen-image-modal');
        if (!fullscreenModal) {
            fullscreenModal = document.createElement('div');
            fullscreenModal.id = 'fullscreen-image-modal';
            fullscreenModal.className = 'modal hidden';
            document.body.appendChild(fullscreenModal);
        }
        
        fullscreenModal.innerHTML = `
            <div class="modal-content fullscreen-image">
                <button id="close-fullscreen-image" class="close-btn">
                    <i class="fa-solid fa-times"></i>
                </button>
                <img src="${imageUrl}" alt="Fullscreen image" 
                     onerror="this.src='/images/placeholder.png'">
            </div>
        `;
        
        if (window.showModal) {
            window.showModal(fullscreenModal);
        } else {
            fullscreenModal.classList.remove('hidden');
        }
        
        // Close handlers
        const closeBtn = document.getElementById('close-fullscreen-image');
        const closeHandler = () => {
            if (window.hideModal) {
                window.hideModal(fullscreenModal);
            } else {
                fullscreenModal.classList.add('hidden');
            }
        };
        
        closeBtn?.addEventListener('click', closeHandler);
        fullscreenModal.addEventListener('click', (e) => {
            if (e.target === fullscreenModal) closeHandler();
        });
    }
    
    /**
     * View portfolio item on map
     * @param {string} itemId - Portfolio item ID
     */
    function viewPortfolioItem(itemId) {
        const item = window.userPortfolio?.find(p => p.id === itemId);
        if (!item) {
            console.error('❌ Portfolio item not found:', itemId);
            return;
        }
        
        // Close portfolio modal
        if (window.hideModal && portfolioModal) {
            window.hideModal(portfolioModal);
        }
        
        // Fly to location on map
        if (item.lat && item.lng && window.map) {
            window.map.flyTo({
                center: [item.lng, item.lat],
                zoom: 18,
                duration: 2000
            });
            
            // Show parcel info if possible
            if (window.showParcelInfo) {
                setTimeout(() => {
                    window.showParcelInfo({
                        soThua: item.soThua,
                        soTo: item.soTo,
                        loaiDat: item.loaiDat,
                        lat: item.lat,
                        lng: item.lng
                    });
                }, 2000);
            }
        } else if (item.locationUrl) {
            // Fallback to locationUrl if coordinates not available
            window.location.href = item.locationUrl;
        } else {
            if (window.showToast) {
                window.showToast('⚠️ Không có tọa độ cho thửa đất này', 'warning');
            }
        }
    }
    
    /**
     * Edit portfolio item
     * @param {string} itemId - Portfolio item ID
     */
    function editPortfolioItem(itemId) {
        const item = window.userPortfolio?.find(p => p.id === itemId);
        if (!item) {
            console.error('❌ Portfolio item not found:', itemId);
            return;
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
            
            if (imagePreview) {
                imagePreview.innerHTML = item.images.map((imageUrl, index) => `
                    <div class="image-preview-item" data-existing="true" data-url="${imageUrl}">
                        <img src="${imageUrl}" alt="Existing image ${index + 1}" 
                             onerror="this.closest('.image-preview-item').remove()">
                        <div class="image-preview-overlay">
                            <button type="button" class="image-remove-btn" 
                                    onclick="window.PortfolioManager.removeExistingImage('${imageUrl}', this)">
                                <i class="fa-solid fa-times"></i>
                            </button>
                        </div>
                    </div>
                `).join('');
            }
            
            if (imageUploadText) {
                imageUploadText.style.display = 'none';
            }
        }
        
        // Change modal title
        const modalTitle = document.getElementById('add-portfolio-title');
        if (modalTitle) {
            modalTitle.innerHTML = '<i class="fa-solid fa-edit mr-2 text-indigo-600"></i>Chỉnh sửa BĐS';
        }
        
        // Store item ID for updating
        portfolioForm.dataset.editingId = itemId;
        
        // Show add/edit modal
        if (window.showModal) {
            window.showModal(addPortfolioModal);
        } else {
            addPortfolioModal?.classList.remove('hidden');
        }
    }
    
    /**
     * Remove existing image from edit form
     * @param {string} imageUrl - Image URL to remove
     * @param {HTMLElement} buttonElement - Button that triggered removal
     */
    function removeExistingImage(imageUrl, buttonElement) {
        const imageItem = buttonElement.closest('.image-preview-item');
        if (imageItem) {
            imageItem.remove();
            
            // Check if preview is empty and show upload text
            const imagePreview = document.getElementById('image-preview');
            const imageUploadText = document.querySelector('.image-upload-text');
            
            if (imagePreview?.children.length === 0 && imageUploadText) {
                imageUploadText.style.display = 'block';
            }
        }
    }
    
    /**
     * Delete portfolio item
     * @param {string} itemId - Portfolio item ID
     */
    async function deletePortfolioItem(itemId) {
        if (!confirm('Bạn có chắc muốn xóa bất động sản này khỏi ví?')) return;
        
        try {
            const db = getDb();
            await db.collection('portfolios').doc(itemId).delete();
            
            await loadUserPortfolio();
            renderPortfolioList();
            
            if (window.showToast) {
                window.showToast('✅ Đã xóa khỏi ví bất động sản', 'success');
            }
        } catch (error) {
            console.error('❌ Error deleting portfolio item:', error);
            if (window.showToast) {
                window.showToast('❌ Có lỗi khi xóa khỏi ví', 'error');
            }
        }
    }
    
    /**
     * Add to portfolio from info panel
     * Auto-fills form with selected parcel data
     * @param {Object} parcelData - Parcel data from map
     */
    function addToPortfolioFromPanel(parcelData) {
        if (!window.currentUser) {
            alert('Vui lòng đăng nhập để sử dụng ví bất động sản!');
            return;
        }
        
        // Store selected parcel data globally for auto-fill
        window.selectedParcelData = parcelData;
        window.currentSelectedParcel = {
            soThua: parcelData.soThua,
            soTo: parcelData.soTo,
            loaiDat: parcelData.loaiDat,
            dienTich: parcelData.dienTich,
            maXa: parcelData.maXa,
            lat: parcelData.lat,
            lng: parcelData.lng
        };
        
        // Reset form
        resetPortfolioForm();
        
        // Change modal title to "Add"
        const modalTitle = document.getElementById('add-portfolio-title');
        if (modalTitle) {
            modalTitle.innerHTML = '<i class="fa-solid fa-plus mr-2 text-green-600"></i>Đăng tin rao bán';
        }
        
        // Show modal
        if (window.showModal) {
            window.showModal(addPortfolioModal);
        } else {
            addPortfolioModal?.classList.remove('hidden');
        }
        
        // Auto-fill form fields using OptimizationModule
        if (window.OptimizationModule && window.OptimizationModule.autoFillPostForm) {
            setTimeout(() => {
                window.OptimizationModule.autoFillPostForm(window.currentSelectedParcel);
                console.log('✅ Post form auto-filled from selected parcel');
            }, 100);
        }
    }
    
    /**
     * Handle portfolio form submission
     * @param {Event} e - Form submit event
     */
    async function handlePortfolioFormSubmit(e) {
        e.preventDefault();
        
        if (!window.currentUser) {
            alert('Vui lòng đăng nhập!');
            return;
        }
        
        // Get form data
        const nameInput = document.getElementById('portfolio-name');
        const priceInput = document.getElementById('portfolio-price');
        const areaInput = document.getElementById('portfolio-area');
        const notesInput = document.getElementById('portfolio-notes');
        const visibilityInput = document.querySelector('input[name="portfolio-visibility"]:checked');
        
        const portfolioData = {
            name: nameInput?.value?.trim() || '',
            price: priceInput?.value ? parseFloat(priceInput.value) : null,
            area: areaInput?.value ? parseFloat(areaInput.value) : null,
            notes: notesInput?.value?.trim() || '',
            visibility: visibilityInput?.value || 'private',
            userId: window.currentUser.uid,
            userName: window.currentUser.displayName || 'User',
            updatedAt: getFirebase().firestore.FieldValue.serverTimestamp()
        };
        
        // Add parcel data if available
        if (window.selectedParcelData) {
            portfolioData.soThua = window.selectedParcelData.soThua;
            portfolioData.soTo = window.selectedParcelData.soTo;
            portfolioData.loaiDat = window.selectedParcelData.loaiDat;
            portfolioData.lat = window.selectedParcelData.lat;
            portfolioData.lng = window.selectedParcelData.lng;
            
            // Create locationUrl from coordinates if not exists
            if (!window.selectedParcelData.locationUrl || window.selectedParcelData.locationUrl === 'undefined') {
                if (window.selectedParcelData.lat && window.selectedParcelData.lng) {
                    window.selectedParcelData.locationUrl = `${window.location.origin}${window.location.pathname}?lat=${window.selectedParcelData.lat}&lng=${window.selectedParcelData.lng}`;
                }
            }
            
            // Only add locationUrl if valid
            if (window.selectedParcelData.locationUrl && window.selectedParcelData.locationUrl !== 'undefined') {
                portfolioData.locationUrl = window.selectedParcelData.locationUrl;
            }
        }
        
        // Validate name
        if (!portfolioData.name || portfolioData.name.length === 0) {
            alert('Vui lòng nhập tên cho bất động sản');
            nameInput?.focus();
            return;
        }
        
        try {
            const db = getDb();
            const editingId = portfolioForm.dataset.editingId;
            let portfolioId = editingId;
            let portfolioRef;
            
            if (editingId) {
                // Update existing item
                portfolioRef = db.collection('portfolios').doc(editingId);
                
                // Get remaining existing images
                const existingImageItems = document.querySelectorAll('.image-preview-item[data-existing="true"]');
                const remainingExistingImages = Array.from(existingImageItems).map(item => item.dataset.url);
                
                // Upload new images if any
                let newUploadedImages = [];
                if (window.selectedImages && window.selectedImages.length > 0) {
                    console.log('📤 Uploading new images for existing portfolio...');
                    if (window.uploadPortfolioImages) {
                        newUploadedImages = await window.uploadPortfolioImages(editingId, window.currentUser.uid);
                    }
                }
                
                // Combine images
                portfolioData.images = [...remainingExistingImages, ...newUploadedImages];
                
                await portfolioRef.update(portfolioData);
                if (window.showToast) {
                    window.showToast('✅ Đã cập nhật ví bất động sản', 'success');
                }
            } else {
                // Add new item
                portfolioData.createdAt = getFirebase().firestore.FieldValue.serverTimestamp();
                
                // Create document first
                portfolioRef = await db.collection('portfolios').add(portfolioData);
                portfolioId = portfolioRef.id;
                
                // Upload images if any
                if (window.selectedImages && window.selectedImages.length > 0) {
                    console.log('📤 Uploading images for new portfolio...');
                    if (window.uploadPortfolioImages) {
                        const uploadedImages = await window.uploadPortfolioImages(portfolioId, window.currentUser.uid);
                        await portfolioRef.update({ images: uploadedImages });
                    }
                }
                
                if (window.showToast) {
                    window.showToast('✅ Đã thêm vào ví bất động sản', 'success');
                }
            }
            
            // Reset and close
            resetPortfolioForm();
            window.selectedParcelData = null;
            
            // Clear images (if global function exists)
            if (window.clearAllImages) {
                window.clearAllImages();
            }
            
            if (window.hideModal) {
                window.hideModal(addPortfolioModal);
            }
            
            // Reload portfolio
            await loadUserPortfolio();
            if (!portfolioModal.classList.contains('hidden')) {
                renderPortfolioList();
            }
            
        } catch (error) {
            console.error('❌ Error saving to portfolio:', error);
            if (window.showToast) {
                window.showToast('❌ Có lỗi khi lưu vào ví', 'error');
            }
        }
    }
    
    /**
     * Reset portfolio form to initial state
     */
    function resetPortfolioForm() {
        if (portfolioForm) {
            portfolioForm.reset();
            delete portfolioForm.dataset.editingId;
        }
        
        // Clear image preview
        const imagePreview = document.getElementById('image-preview');
        if (imagePreview) {
            imagePreview.innerHTML = '';
        }
        
        // Show upload text
        const imageUploadText = document.querySelector('.image-upload-text');
        if (imageUploadText) {
            imageUploadText.style.display = 'block';
        }
    }
    
    /**
     * Format currency for display
     * @param {number} amount - Amount in VND
     * @returns {string} Formatted currency string
     */
    function formatCurrency(amount) {
        if (!amount) return 'Chưa xác định';
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    }
    
    /**
     * Format date for display
     * @param {Date} date - Date object
     * @returns {string} Formatted date string
     */
    function formatPortfolioDate(date) {
        if (!date) return 'Không rõ';
        return new Intl.DateTimeFormat('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(date);
    }
    
    // Expose PortfolioManager to window
    window.PortfolioManager = {
        init,
        loadUserPortfolio,
        showPortfolioModal,
        renderPortfolioList,
        viewPortfolioImages,
        openImageFullscreen,
        viewPortfolioItem,
        editPortfolioItem,
        removeExistingImage,
        deletePortfolioItem,
        addToPortfolioFromPanel,
        formatCurrency,
        formatPortfolioDate
    };
    
    // Also expose individual functions for HTML onclick compatibility
    window.addToPortfolioFromPanel = addToPortfolioFromPanel;
    window.viewPortfolioImages = viewPortfolioImages;
    window.openImageFullscreen = openImageFullscreen;
    window.viewPortfolioItem = viewPortfolioItem;
    window.editPortfolioItem = editPortfolioItem;
    window.removeExistingImage = removeExistingImage;
    window.deletePortfolioItem = deletePortfolioItem;
    
    console.log('✅ Portfolio module loaded and exposed to window.PortfolioManager');
})();
