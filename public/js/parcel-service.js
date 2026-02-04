/**
 * Parcel Service - IIFE Pattern
 * Handles parcel layer rendering, styling, and info panel display
 * Core functionality: L.vectorGrid, PMTiles, parcel interactions
 * 
 * @module ParcelService
 * @version 2.0.0
 * @author XemGiaDat Team
 */

(function() {
    'use strict';
    
    console.log('🗺️ Parcel service loading...');
    
    // ============================================================================
    // PARCEL STYLING CONFIGURATION
    // ============================================================================
    
    /**
     * Default parcel style - optimized for far zoom levels
     */
    const parcelStyle = {
        color: '#9CA3AF',    // Gray-400 border
        weight: 0.3,         // Ultra-thin border
        fill: false,         // No fill at far zoom
        opacity: 0.6         // Semi-transparent
    };
    
    /**
     * Vector tile options with LOD (Level of Detail) optimization
     * Performance: Canvas renderer, aggressive simplification, lazy loading
     */
    const vectorTileOptions = {
        rendererFactory: L.canvas.tile,
        renderer: L.canvas({ padding: 0.1 }),
        interactive: true,
        pane: 'overlayPane',        // z-index 600
        minZoom: 10,
        maxZoom: 20,
        maxNativeZoom: 20,
        cache: false,               // Prevent cache errors
        updateWhenIdle: true,       // Only update after pan/zoom
        updateInterval: 500,        // 500ms delay for smooth scrolling
        updateWhenZooming: false,   // Don't update during zoom
        preloadNextZoom: false,     // Save bandwidth
        keepBuffer: 1,              // Minimal tile buffer
        tolerance: 10,              // Aggressive simplification
        smoothFactor: 0.5,
        getFeatureId: feature => feature.properties.OBJECTID,
        vectorTileLayerStyles: {
            // PMTiles layer name 'default'
            'default': createLODStyleFunction(),
            // Backward compatibility for 'danang_full'
            'danang_full': createLODStyleFunction()
        }
    };
    
    /**
     * Create LOD (Level of Detail) style function
     * TIER 1 (z10-13): DOT rendering for performance
     * TIER 2 (z14-16): Simplified polygons
     * TIER 3 (z17+): Full detail with sharp boundaries
     */
    function createLODStyleFunction() {
        return function(properties, zoom) {
            const objectId = properties.OBJECTID || 0;
            
            // TIER 1 - Extreme far view: DOT rendering (10x faster)
            if (zoom >= 10 && zoom < 14) {
                // Show only 30% of parcels (OBJECTID % 10 < 3)
                if ((objectId % 10) >= 3) return { opacity: 0, fillOpacity: 0, weight: 0 };
                
                // Additional area filter
                const area = properties.area || properties.SHAPE_Area || 0;
                if (area < 500) return { opacity: 0, fillOpacity: 0, weight: 0 };
                
                // Draw dot instead of polygon
                return {
                    radius: 0.5,
                    color: '#CBD5E1',
                    fillColor: '#CBD5E1',
                    fillOpacity: 0.6,
                    weight: 0,
                    opacity: 0
                };
            }
            
            // TIER 2 - Mid-range: Simplified polygons
            if (zoom >= 14 && zoom < 17) {
                // Show 60% of parcels
                if ((objectId % 10) >= 6) return { opacity: 0, fillOpacity: 0, weight: 0 };
                
                return {
                    color: '#94A3B8',      // Slate-400
                    weight: 0.05,
                    fill: false,
                    opacity: 0.8,
                    smoothFactor: 2.0
                };
            }
            
            // TIER 3 - Close-up: Full detail
            if (zoom >= 17) {
                return {
                    color: '#334155',      // Slate-700 (dark for satellite contrast)
                    weight: 0.8,           // Sharp boundaries
                    fill: true,
                    fillColor: '#334155',
                    fillOpacity: 0.1,
                    opacity: 1
                };
            }
            
            // Below zoom 10: hidden
            return { opacity: 0, fillOpacity: 0, weight: 0 };
        };
    }
    
    // ============================================================================
    // PARCEL LAYER CREATION
    // ============================================================================
    
    /**
     * Create parcel layer with retry mechanism
     * Waits for L.vectorGrid.pmtiles to be ready before creating layer
     */
    function createParcelLayer(retryCount = 0) {
        const MAX_RETRIES = 30;
        const RETRY_DELAY = 200; // ms
        
        try {
            // Check dependencies
            const leafletReady = typeof L !== 'undefined' && L.vectorGrid;
            const pmtilesMethodReady = leafletReady && typeof L.vectorGrid.pmtiles === 'function';
            const configReady = typeof VectorTileConfig !== 'undefined' && VectorTileConfig.createVectorLayer;
            
            if (!leafletReady) {
                if (retryCount < MAX_RETRIES) {
                    console.warn(`⏳ [${retryCount + 1}/${MAX_RETRIES}] Waiting for Leaflet.VectorGrid...`);
                    setTimeout(() => createParcelLayer(retryCount + 1), RETRY_DELAY);
                    return;
                }
                throw new Error('Leaflet.VectorGrid not available after max retries');
            }
            
            // Wait for PMTiles method
            if (!pmtilesMethodReady && retryCount < MAX_RETRIES) {
                console.warn(`⏳ [${retryCount + 1}/${MAX_RETRIES}] Waiting for L.vectorGrid.pmtiles()...`);
                setTimeout(() => createParcelLayer(retryCount + 1), RETRY_DELAY);
                return;
            }
            
            // Create the layer
            let layer;
            if (configReady && pmtilesMethodReady) {
                layer = VectorTileConfig.createVectorLayer(vectorTileOptions);
                console.log('✅ Using VectorTileConfig:', VectorTileConfig.getConfig());
            } else if (pmtilesMethodReady) {
                console.log('✅ Using L.vectorGrid.pmtiles directly');
                layer = L.vectorGrid.pmtiles('/tiles/danang_parcels_final.pmtiles', vectorTileOptions);
            } else {
                console.error('❌ PMTiles not available after max retries');
                layer = L.layerGroup(); // Empty layer to prevent crash
            }
            
            // Error handler
            layer.on('tileerror', function(e) {
                if (e.error && !e.error.message?.includes('404')) {
                    console.warn('Lỗi tải vector tile:', e.error);
                }
            });
            
            // Remove skeleton on first tile load
            layer.once('tileload', function() {
                const skelEl = document.getElementById('loading-skeleton');
                if (skelEl) {
                    try {
                        skelEl.remove();
                        console.log('✅ Skeleton removed on first tile load');
                    } catch (e) {
                        console.warn('[Skeleton] Error removing:', e);
                    }
                }
            });
            
            // Add to map
            if (window.map) {
                layer.addTo(window.map);
                console.log('✅ Parcel layer added to map');
                
                // Setup click handlers
                setupParcelClickHandlers(layer);
            }
            
            return layer;
            
        } catch (error) {
            console.error('❌ Error creating parcel layer:', error);
            
            if (retryCount < MAX_RETRIES) {
                console.log(`🔄 Retrying in ${RETRY_DELAY}ms... (${retryCount + 1}/${MAX_RETRIES})`);
                setTimeout(() => createParcelLayer(retryCount + 1), RETRY_DELAY);
            } else {
                console.error('❌ Failed to create parcel layer after max retries');
            }
        }
    }
    
    // ============================================================================
    // PARCEL INTERACTION HANDLERS
    // ============================================================================
    
    /**
     * Setup click handlers for parcel features
     */
    function setupParcelClickHandlers(layer) {
        if (!layer) return;
        
        // Click on parcel feature
        layer.on('click', function(e) {
            if (!e.layer || !e.layer.properties) {
                console.warn('⚠️ Click event without valid properties');
                return;
            }
            
            const props = e.layer.properties;
            const formattedProps = formatParcelProperties(props);
            
            if (window.showInfoPanel) {
                window.showInfoPanel('Thông tin Thửa đất', formattedProps, e.latlng.lat, e.latlng.lng);
            }
        });
        
        console.log('✅ Parcel click handlers setup');
    }
    
    /**
     * Format parcel properties for display
     */
    function formatParcelProperties(props) {
        return {
            'Số thửa': props['Số thửa'] || props.soThua || 'N/A',
            'Số hiệu tờ bản đồ': props['Số hiệu tờ bản đồ'] || props.soTo || 'N/A',
            'Ký hiệu mục đích sử dụng': props['Ký hiệu mục đích sử dụng'] || props.loaiDat || 'N/A',
            'Diện tích': props['Diện tích'] || props.dienTich || 'N/A',
            'Địa chỉ': (props['Địa chỉ'] && props['Địa chỉ'] !== 'Null') ? props['Địa chỉ'] : 'Chưa có'
        };
    }
    
    // ============================================================================
    // INFO PANEL DISPLAY
    // ============================================================================
    
    /**
     * Show info panel with parcel details
     * @param {string} title - Panel title
     * @param {Object} props - Parcel properties
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     */
    function showInfoPanel(title, props, lat, lng) {
        const infoPanel = document.getElementById('info-panel');
        const panelTitle = document.getElementById('panel-title');
        const panelContent = document.getElementById('panel-content');
        const togglePanelBtn = document.getElementById('toggle-panel');
        
        // Null safety check
        if (!infoPanel || !panelTitle || !panelContent) {
            console.error('❌ Info panel elements not found');
            return;
        }
        
        // Remove collapsed state
        infoPanel.classList.remove('is-collapsed');
        
        // Update toggle button
        if (togglePanelBtn) {
            togglePanelBtn.textContent = '−';
            togglePanelBtn.title = 'Thu gọn';
        }
        
        // Extract parcel data
        const soTo = props['Số hiệu tờ bản đồ'] ?? 'N/A';
        const soThua = props['Số thửa'] ?? 'N/A';
        const loaiDat = props['Ký hiệu mục đích sử dụng'] ?? 'N/A';
        const dienTich = props['Diện tích'] ? parseFloat(props['Diện tích']).toFixed(1) : 'N/A';
        const diaChi = (props['Địa chỉ'] && props['Địa chỉ'] !== 'Null') ? props['Địa chỉ'] : 'Chưa có';
        const maXa = props['Mã xã'] ?? null;  // Commune code for price lookup
        
        panelTitle.textContent = title;
        
        // Calculate government land price
        let priceHTML = '';
        let comparisonHTML = '';
        if (window.PriceUtils && dienTich !== 'N/A') {
            try {
                const priceResult = window.PriceUtils.calculateGovernmentPrice({
                    soThua: soThua,
                    loaiDat: loaiDat,
                    dienTich: parseFloat(dienTich),
                    maXa: maXa
                });
                priceHTML = window.PriceUtils.generatePriceHTML(priceResult);
                comparisonHTML = window.PriceUtils.generateComparisonToolHTML();
                
                // Store price result for comparison tool
                window.currentPriceResult = priceResult;
            } catch (error) {
                console.error('❌ Price calculation error:', error);
            }
        }
        
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
        ${priceHTML}
        ${comparisonHTML}
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
        
        requestAnimationFrame(() => {
            infoPanel.classList.add('is-open');
            
            // Setup price comparison listener after panel renders
            if (window.PriceUtils && window.currentPriceResult) {
                setupPriceComparisonListener();
            }
        });
        
        // Raise action toolbar if available
        const actionToolbar = document.getElementById('action-toolbar');
        if (actionToolbar) {
            actionToolbar.classList.add('is-raised');
        }
    }
    
    /**
     * Setup event listener for market price comparison
     * @private
     */
    function setupPriceComparisonListener() {
        const compareBtn = document.getElementById('compare-price-btn');
        const marketInput = document.getElementById('market-price-input');
        const resultContainer = document.getElementById('comparison-result');
        
        if (!compareBtn || !marketInput || !resultContainer) return;
        
        // Compare button click handler
        const handleCompare = () => {
            const marketPrice = parseFloat(marketInput.value);
            const govPrice = window.currentPriceResult?.tongTien;
            
            if (!govPrice || marketPrice <= 0 || isNaN(marketPrice)) {
                resultContainer.innerHTML = '<div class="result-error">❌ Vui lòng nhập giá thị trường hợp lệ</div>';
                resultContainer.classList.remove('hidden');
                return;
            }
            
            // Calculate comparison
            const comparison = window.PriceUtils.compareMarketPrice(govPrice, marketPrice);
            const resultHTML = window.PriceUtils.generateComparisonResultHTML(comparison);
            
            resultContainer.innerHTML = resultHTML;
            resultContainer.classList.remove('hidden');
        };
        
        // Attach event listeners
        compareBtn.addEventListener('click', handleCompare);
        marketInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleCompare();
        });
        
        // Auto-focus market input
        setTimeout(() => marketInput.focus(), 100);
    }
    
    /**
     * Show parcel info from search results
     * @param {string} soThua - Parcel number
     * @param {string} soTo - Map sheet number
     * @param {string} maXa - Area code
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     */
    async function showParcelFromSearchResult(soThua, soTo, maXa, lat, lng) {
        // Try to query parcel from vector tiles
        try {
            await queryAndDisplayParcelByLatLng(lat, lng);
        } catch (error) {
            // Fallback: Show basic info
            const basicProps = {
                'Số thửa': soThua,
                'Số hiệu tờ bản đồ': soTo,
                'Diện tích': 'Đang tải...',
                'Ký hiệu mục đích sử dụng': 'Đang tải...',
                'Địa chỉ': 'Đang tìm địa chỉ...'
            };
            showInfoPanel('Thông tin Thửa đất', basicProps, lat, lng);
            
            // Load detailed info from GeoJSON (if available)
            if (window.fetchAndDrawDimensions) {
                window.fetchAndDrawDimensions(maXa, soTo, soThua);
            }
        }
    }
    
    /**
     * Query parcel by lat/lng coordinates
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     */
    async function queryAndDisplayParcelByLatLng(lat, lng) {
        console.log('🔍 Querying parcel at:', { lat, lng });
        
        if (!window.map) {
            console.error('❌ Map not available for parcel query');
            return;
        }
        
        // Show loading popup
        const loadingPopup = L.popup()
            .setLatLng([lat, lng])
            .setContent('Đang tìm thông tin thửa đất...')
            .openOn(window.map);
        
        // Note: Mapbox Tilequery is deprecated, using PMTiles direct query
        // For now, fly to location and show info from click
        window.map.flyTo({ center: [lng, lat], zoom: 18, duration: 1500 });
        
        setTimeout(() => {
            loadingPopup.remove();
        }, 2000);
    }
    
    // ============================================================================
    // PRICE DATA INTEGRATION (Future Feature)
    // ============================================================================
    
    /**
     * Get and display land price for parcel
     * Integrated with PriceUtils for full price calculation
     * @param {Object} parcelData - Parcel properties
     * @returns {Object} Price calculation result from PriceUtils
     */
    function getLandPrice(parcelData) {
        if (!window.PriceUtils) {
            console.warn('⚠️ PriceUtils not loaded');
            return { status: 'error', message: 'Giá đang được tải...' };
        }
        
        try {
            return window.PriceUtils.calculateGovernmentPrice(parcelData);
        } catch (error) {
            console.error('❌ Price lookup error:', error);
            return { status: 'error', message: 'Lỗi tính giá' };
        }
    }
    
    // ============================================================================
    // PUBLIC API
    // ============================================================================
    
    window.ParcelService = {
        createParcelLayer,
        showInfoPanel,
        showParcelFromSearchResult,
        queryAndDisplayParcelByLatLng,
        formatParcelProperties,
        getLandPrice,
        getVectorTileOptions: () => vectorTileOptions,
        getParcelStyle: () => parcelStyle
    };
    
    // Expose main functions for backwards compatibility
    window.createParcelLayer = createParcelLayer;
    window.showInfoPanel = showInfoPanel;
    window.showParcelFromSearchResult = showParcelFromSearchResult;
    window.queryAndDisplayParcelByLatLng = queryAndDisplayParcelByLatLng;
    
    console.log('✅ Parcel service loaded and exposed to window.ParcelService');
})();
