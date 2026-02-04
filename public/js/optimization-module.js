/**
 * Optimization Module - Search & Post Feature Optimization
 * Focuses on: Search speed, Auto-fill forms, Image compression, UI optimization
 * 
 * @module OptimizationModule
 * @version 1.0.0
 * @author XemGiaDat Team
 */

(function() {
    'use strict';
    
    console.log('⚡ Optimization module loading...');
    
    // ============================================================================
    // SEARCH OPTIMIZATION - <100ms TARGET
    // ============================================================================
    
    /**
     * Preload search index on app start for instant results
     * Called from script.js initialization
     */
    function preloadSearchIndexEarly() {
        // Start loading immediately in background
        if (window.SearchModule && window.SearchModule.loadSearchIndex) {
            window.SearchModule.loadSearchIndex()
                .then(() => console.log('✅ Search index preloaded'))
                .catch(e => console.warn('⚠️ Search index preload failed:', e));
        }
    }
    
    /**
     * Enhanced search with FlyTo and auto info-panel
     * Called when user selects a search result
     */
    async function handleSearchResultSelect(result) {
        if (!result || !result.lat || !result.lng) {
            console.error('❌ Invalid search result:', result);
            return;
        }
        
        const { soThua, soTo, lat, lng, dienTich, loaiDat, maXa } = result;
        
        console.log(`🎯 Navigating to: Thửa ${soThua}, Tờ ${soTo}`);
        
        // Step 1: FlyTo parcel location (instant)
        if (window.map) {
            window.map.flyTo({
                center: [lng, lat],
                zoom: 18,
                duration: 800,  // Reduced from 2000ms for snappier feel
                easing: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t  // Easing function
            });
        }
        
        // Step 2: Auto-open info panel after map settles (800ms delay)
        setTimeout(() => {
            // Build parcel properties
            const parcelProps = {
                'Số thửa': soThua,
                'Số hiệu tờ bản đồ': soTo,
                'Ký hiệu mục đích sử dụng': loaiDat || 'N/A',
                'Diện tích': dienTich ? dienTich.toString() : 'N/A',
                'Mã xã': maXa || 'N/A'
            };
            
            // Show info panel with parcel data + price calculation
            if (window.ParcelService && window.ParcelService.showInfoPanel) {
                window.ParcelService.showInfoPanel(
                    `Thửa ${soThua}`,
                    parcelProps,
                    lat,
                    lng
                );
                console.log('✅ Info panel opened with price data');
            }
            
            // Store selected data for post form auto-fill
            window.currentSelectedParcel = {
                soThua: soThua,
                soTo: soTo,
                loaiDat: loaiDat,
                dienTich: dienTich,
                maXa: maXa,
                lat: lat,
                lng: lng
            };
        }, 850);  // Slightly after flyTo completes
    }
    
    // ============================================================================
    // POST FORM AUTO-FILL OPTIMIZATION
    // ============================================================================
    
    /**
     * Auto-fill post form when user selects a parcel
     * Extracts: Số tờ, Số thửa, Diện tích, Phường/Xã
     * User only needs: Giá and Số điện thoại
     */
    function autoFillPostForm(parcelData) {
        const formFields = {
            'portfolio-soThua': parcelData.soThua,      // Số thửa
            'portfolio-soTo': parcelData.soTo,          // Số tờ
            'portfolio-dienTich': parcelData.dienTich,  // Diện tích
            'portfolio-loaiDat': parcelData.loaiDat,    // Loại đất
            'portfolio-maXa': parcelData.maXa           // Mã xã (for commune name)
        };
        
        // Populate fields
        Object.entries(formFields).forEach(([fieldId, value]) => {
            const field = document.getElementById(fieldId);
            if (field && value) {
                field.value = value;
                // Trigger change event for any watchers
                field.dispatchEvent(new Event('change', { bubbles: true }));
                console.log(`✅ Auto-filled ${fieldId}: ${value}`);
            }
        });
        
        // Auto-focus on price input (user starts here)
        const priceInput = document.getElementById('portfolio-price');
        if (priceInput) {
            setTimeout(() => priceInput.focus(), 100);
        }
    }
    
    /**
     * Connect search results to auto-fill
     * Called when user clicks "Đăng tin rao bán" from info panel
     */
    function openPostFormWithAutoFill() {
        if (!window.currentSelectedParcel) {
            console.warn('⚠️ No parcel selected');
            alert('Vui lòng chọn một thửa đất trước');
            return;
        }
        
        // Show post modal
        if (window.showModal && window.addPortfolioModal) {
            window.showModal(window.addPortfolioModal);
        } else {
            const modal = document.getElementById('add-portfolio-modal');
            if (modal) modal.classList.remove('hidden');
        }
        
        // Auto-fill form fields
        autoFillPostForm(window.currentSelectedParcel);
    }
    
    // ============================================================================
    // CLIENT-SIDE IMAGE COMPRESSION
    // ============================================================================
    
    /**
     * Compress image on client side before upload
     * Uses Canvas API for browser-native compression
     * 
     * @param {File} file - Image file
     * @param {number} maxWidth - Max width (default: 1200)
     * @param {number} maxHeight - Max height (default: 1200)
     * @param {number} quality - JPEG quality 0-1 (default: 0.7)
     * @returns {Promise<Blob>} Compressed image blob
     */
    async function compressImage(file, maxWidth = 1200, maxHeight = 1200, quality = 0.7) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const img = new Image();
                
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    // Calculate new dimensions maintaining aspect ratio
                    if (width > height) {
                        if (width > maxWidth) {
                            height = Math.round((height * maxWidth) / width);
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width = Math.round((width * maxHeight) / height);
                            height = maxHeight;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Convert to blob with compression
                    canvas.toBlob(
                        (blob) => {
                            const originalSize = file.size;
                            const compressedSize = blob.size;
                            const saved = ((1 - compressedSize / originalSize) * 100).toFixed(1);
                            
                            console.log(`📸 Image compressed: ${(originalSize/1024).toFixed(0)}KB → ${(compressedSize/1024).toFixed(0)}KB (${saved}% saved)`);
                            resolve(blob);
                        },
                        'image/jpeg',
                        quality
                    );
                };
                
                img.onerror = () => {
                    console.error('❌ Failed to load image');
                    reject(new Error('Image load failed'));
                };
                
                img.src = e.target.result;
            };
            
            reader.onerror = () => {
                console.error('❌ Failed to read file');
                reject(new Error('File read failed'));
            };
            
            reader.readAsDataURL(file);
        });
    }
    
    /**
     * Setup image input with auto-compression
     * Compress before upload to reduce 4G usage
     */
    function setupImageCompressionHandlers() {
        const imageInputs = document.querySelectorAll('input[type="file"][accept*="image"]');
        
        imageInputs.forEach(input => {
            input.addEventListener('change', async (e) => {
                const files = Array.from(e.target.files);
                
                for (const file of files) {
                    if (file.type.startsWith('image/')) {
                        try {
                            console.log(`🔄 Compressing image: ${file.name}...`);
                            const compressedBlob = await compressImage(file, 1200, 1200, 0.7);
                            
                            // Create a new File from compressed blob
                            const compressedFile = new File(
                                [compressedBlob],
                                file.name,
                                { type: 'image/jpeg' }
                            );
                            
                            // Replace in FileList (for upload)
                            // Note: FileList is read-only, so we store compressed version
                            window.compressedImages = window.compressedImages || new Map();
                            window.compressedImages.set(file.name, compressedFile);
                            
                            console.log(`✅ Compression complete for: ${file.name}`);
                        } catch (error) {
                            console.error('⚠️ Compression failed, using original:', error);
                        }
                    }
                }
            });
        });
    }
    
    /**
     * Get compressed image for upload
     * @param {string} fileName - Original file name
     * @returns {File} Compressed file or original
     */
    function getCompressedImage(fileName) {
        if (window.compressedImages && window.compressedImages.has(fileName)) {
            return window.compressedImages.get(fileName);
        }
        return null;
    }
    
    // ============================================================================
    // UTILITY BUTTON OPTIMIZATION
    // ============================================================================
    
    /**
     * Reposition utility buttons to thumb-reach zone
     * Bottom-left area on mobile, more accessible for one-handed use
     */
    function optimizeUtilityButtonPositioning() {
        const buttons = {
            'current-location-btn': document.querySelector('[data-action="current-location"]'),
            'base-layer-btn': document.querySelector('[data-action="base-layer"]'),
            'compass-btn': document.querySelector('[data-action="compass"]')
        };
        
        Object.entries(buttons).forEach(([id, btn]) => {
            if (btn) {
                // Add thumb-reach class
                btn.classList.add('thumb-reach-optimized');
                
                // Ensure minimum touch target (48x48px)
                btn.style.minWidth = '48px';
                btn.style.minHeight = '48px';
                btn.style.padding = '12px';
                
                console.log(`✅ Optimized button positioning: ${id}`);
            }
        });
        
        // Add CSS for thumb-reach positioning
        const style = document.createElement('style');
        style.textContent = `
            .thumb-reach-optimized {
                position: fixed !important;
                z-index: 900 !important;
                bottom: 120px !important;  /* Above search input */
                left: 12px !important;      /* Thumb-reach zone */
                border-radius: 12px !important;
                box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important;
                transition: all 0.2s ease !important;
            }
            
            .thumb-reach-optimized:hover {
                box-shadow: 0 4px 12px rgba(0,0,0,0.2) !important;
            }
            
            .thumb-reach-optimized:active {
                transform: scale(0.95) !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    // ============================================================================
    // ANIMATION LAG REMOVAL
    // ============================================================================
    
    /**
     * Remove unnecessary CSS animations that cause lag
     * Disable heavy transitions on form elements
     */
    function removeAnimationLag() {
        const style = document.createElement('style');
        style.textContent = `
            /* Disable expensive animations for better performance */
            
            /* Form elements - remove fade animations */
            .modal,
            #add-portfolio-modal,
            #portfolio-modal {
                animation: none !important;
                transition: opacity 0.1s ease !important;  /* Reduced from 0.3s */
            }
            
            /* Info panel - faster transitions */
            #info-panel {
                transition: transform 0.2s ease-out !important;  /* Reduced from 0.3s */
            }
            
            /* Search results - no animation */
            #search-results,
            .search-result-item {
                animation: none !important;
                transition: background-color 0.1s ease !important;
            }
            
            /* Map tiles - no transition */
            .mapboxgl-canvas {
                transition: none !important;
            }
            
            /* Buttons - instant feedback */
            button, [role="button"] {
                transition: background-color 0.05s ease, transform 0.05s ease !important;
            }
            
            /* Remove shadows that require repaints */
            .heavy-shadow {
                box-shadow: none !important;
            }
        `;
        document.head.appendChild(style);
        console.log('✅ Animation lag removed');
    }
    
    // ============================================================================
    // HIDE UNFINISHED FEATURES
    // ============================================================================
    
    /**
     * Hide UI elements for features still in development
     * Reduces cognitive load and visual clutter
     */
    function hideUnfinishedFeatures() {
        // Features to hide (add IDs/classes as needed)
        const elementsToHide = [
            // Example: 'advanced-analytics-panel',
            // Example: 'contribution-module',
            // Example: 'community-features'
        ];
        
        elementsToHide.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = 'none';
                console.log(`👁️ Hidden: ${id}`);
            }
        });
        
        // Hide menu items for unfinished features
        const menuItems = document.querySelectorAll('[data-feature-status="beta"], [data-feature-status="upcoming"]');
        menuItems.forEach(item => {
            item.style.display = 'none';
        });
        
        console.log('✅ Unfinished features hidden');
    }
    
    // ============================================================================
    // PERFORMANCE MONITORING
    // ============================================================================
    
    /**
     * Track search performance metrics for analytics
     * Sends data to GA if available
     */
    function trackSearchPerformance(metric, value, additionalData = {}) {
        const timestamp = new Date().toISOString();
        const performanceData = {
            event: 'search_performance',
            metric,
            value,
            timestamp,
            ...additionalData
        };
        
        console.log(`📊 Search Performance [${metric}]:`, value, 'ms');
        
        // Send to Google Analytics if available
        if (typeof gtag !== 'undefined') {
            gtag('event', 'search_performance', {
                event_category: 'performance',
                event_label: metric,
                value: Math.round(value),
                ...additionalData
            });
        }
        
        // Send to Firebase Analytics if available
        if (window.firebase && window.firebase.analytics) {
            try {
                window.firebase.analytics().logEvent('search_performance', performanceData);
            } catch (e) {
                console.warn('Firebase analytics unavailable:', e);
            }
        }
        
        // Store locally for batch reporting
        const metrics = JSON.parse(localStorage.getItem('xgd_search_metrics') || '[]');
        metrics.push(performanceData);
        // Keep last 100 metrics
        if (metrics.length > 100) metrics.shift();
        localStorage.setItem('xgd_search_metrics', JSON.stringify(metrics));
    }
    
    /**
     * Report average search performance periodically
     */
    function reportSearchMetrics() {
        const metrics = JSON.parse(localStorage.getItem('xgd_search_metrics') || '[]');
        if (metrics.length === 0) return;
        
        const lookup = metrics.filter(m => m.metric === 'lookup_time');
        const flyto = metrics.filter(m => m.metric === 'flyto_time');
        
        if (lookup.length > 0) {
            const avg = lookup.reduce((sum, m) => sum + m.value, 0) / lookup.length;
            console.log(`📈 Average Search Lookup: ${avg.toFixed(1)}ms (Target: <100ms) ${avg < 100 ? '✅' : '⚠️'}`);
        }
        
        if (flyto.length > 0) {
            const avg = flyto.reduce((sum, m) => sum + m.value, 0) / flyto.length;
            console.log(`📈 Average FlyTo Time: ${avg.toFixed(0)}ms`);
        }
    }
    
    // Export tracking functions
    window.trackSearchPerformance = trackSearchPerformance;
    window.reportSearchMetrics = reportSearchMetrics;
    
    // ============================================================================
    // INITIALIZATION
    // ============================================================================
    
    /**
     * Initialize all optimizations on app start
     */
    function initializeOptimizations() {
        console.log('🚀 Initializing optimizations...');
        
        // Timing optimizations
        preloadSearchIndexEarly();
        
        // Form optimizations
        setTimeout(() => setupImageCompressionHandlers(), 500);
        
        // UI optimizations (after DOM ready)
        setTimeout(() => {
            removeAnimationLag();
            optimizeUtilityButtonPositioning();
            hideUnfinishedFeatures();
        }, 1000);
        
        // Performance monitoring (report metrics every 5 minutes)
        setInterval(reportSearchMetrics, 5 * 60 * 1000);
        
        console.log('✅ Optimizations initialized');
    }
    
    // ============================================================================
    // PUBLIC API
    // ============================================================================
    
    window.OptimizationModule = {
        // Search optimization
        preloadSearchIndexEarly,
        handleSearchResultSelect,
        
        // Post form optimization
        autoFillPostForm,
        openPostFormWithAutoFill,
        
        // Image compression
        compressImage,
        setupImageCompressionHandlers,
        getCompressedImage,
        
        // UI optimization
        optimizeUtilityButtonPositioning,
        removeAnimationLag,
        hideUnfinishedFeatures,
        
        // Performance monitoring
        trackSearchPerformance,
        reportSearchMetrics,
        
        // Initialization
        initializeOptimizations
    };
    
    // Expose main functions for easy access
    window.handleSearchResultSelect = handleSearchResultSelect;
    window.openPostFormWithAutoFill = openPostFormWithAutoFill;
    window.compressImage = compressImage;
    window.trackSearchPerformance = trackSearchPerformance;
    window.reportSearchMetrics = reportSearchMetrics;
    
    console.log('✅ Optimization module loaded and exposed to window.OptimizationModule');
})();
