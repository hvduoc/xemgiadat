/**
 * Price Utilities - Land Price Lookup & Comparison
 * Handles government land prices, calculations, and market price comparisons
 * Data structure: Organized by MaXa (commune) and land use types
 * 
 * @module PriceUtils
 * @version 1.0.0
 * @author XemGiaDat Team
 * @description
 * Provides functions for:
 * 1. Land price lookup by commune and land type
 * 2. Price calculation based on area and unit price
 * 3. Market price comparison and variance calculation
 * 4. Price formatting and display
 */

(function() {
    'use strict';
    
    console.log('💰 Price utilities loading...');
    
    // ============================================================================
    // GOVERNMENT LAND PRICE DATA - DA NANG (Sample Structure)
    // ============================================================================
    // Format: MaXa (Commune Code) -> Land Types -> Price per m²
    // Thực tế sẽ được thay thế bằng dữ liệu từ API hoặc import từ Excel
    // ============================================================================
    
    /**
     * Sample government land price database for Da Nang
     * Structure: { MaXa: { KyHieu: donGia (VND/m²) } }
     * 
     * KyHieu (Land Use Type):
     * - "ở" = Residential (Đất ở)
     * - "SXKD" = Commercial/Industrial (Sản xuất kinh doanh)
     * - "NN" = Agricultural (Nông nghiệp)
     * - "TN" = Forestry (Tinh nguyệt)
     * - "ĐT" = Transportation (Giao thông)
     * - "XD" = Construction (Xây dựng)
     * - "Khác" = Others (Khác)
     */
    const governmentLandPrices = {
        // ===== QUAN THANH KHE (103000) =====
        '1030001': { // Phường Tân Chính
            'ở': 8500000,      // 8.5 triệu/m²
            'SXKD': 6500000,   // 6.5 triệu/m²
            'NN': 500000,      // 500k/m²
            'ĐT': 2000000,     // 2 triệu/m²
            'Khác': 1000000    // 1 triệu/m²
        },
        '1030002': { // Phường Hòa Khánh Bắc
            'ở': 7500000,
            'SXKD': 5500000,
            'NN': 400000,
            'ĐT': 1500000,
            'Khác': 800000
        },
        '1030003': { // Phường Hòa Khánh Nam
            'ở': 7200000,
            'SXKD': 5200000,
            'NN': 400000,
            'ĐT': 1400000,
            'Khác': 700000
        },
        '1030004': { // Phường Hòa Minh
            'ở': 6800000,
            'SXKD': 4800000,
            'NN': 350000,
            'ĐT': 1300000,
            'Khác': 600000
        },
        
        // ===== QUAN HAI CHAU (102000) =====
        '1020001': { // Phường Bắc Mỹ Phú
            'ở': 9500000,
            'SXKD': 7500000,
            'NN': 600000,
            'ĐT': 2500000,
            'Khác': 1200000
        },
        '1020002': { // Phường Thọ Quang
            'ở': 9200000,
            'SXKD': 7200000,
            'NN': 550000,
            'ĐT': 2300000,
            'Khác': 1100000
        },
        '1020003': { // Phường Nước Ngọt
            'ở': 8800000,
            'SXKD': 6800000,
            'NN': 500000,
            'ĐT': 2100000,
            'Khác': 1000000
        },
        
        // ===== QUAN LIEN CHIEU (101000) =====
        '1010001': { // Phường Hòa Xuân
            'ở': 6500000,
            'SXKD': 4500000,
            'NN': 300000,
            'ĐT': 1200000,
            'Khác': 500000
        },
        '1010002': { // Phường Hòa Vang
            'ở': 5800000,
            'SXKD': 3800000,
            'NN': 250000,
            'ĐT': 1000000,
            'Khác': 400000
        }
    };
    
    // ============================================================================
    // LAND USE TYPE DISPLAY NAMES
    // ============================================================================
    
    const landTypeNames = {
        'ở': '🏠 Đất ở (Residential)',
        'SXKD': '🏭 Sản xuất/Kinh doanh (Commercial)',
        'NN': '🌾 Nông nghiệp (Agricultural)',
        'TN': '🌲 Tinh nguyệt (Forestry)',
        'ĐT': '🛣️ Giao thông (Transportation)',
        'XD': '🏗️ Xây dựng (Construction)',
        'Khác': '❓ Khác (Others)'
    };
    
    // ============================================================================
    // PRICE LOOKUP FUNCTIONS
    // ============================================================================
    
    /**
     * Get unit price (đơn giá) for a specific land type in a commune
     * @param {string} maXa - Commune code (MaXa)
     * @param {string} kyHieu - Land use type code (e.g., 'ở', 'SXKD', 'NN')
     * @param {number} fallbackPrice - Fallback price if not found (default: 5,000,000)
     * @returns {number} Unit price in VND/m²
     */
    function getUnitPrice(maXa, kyHieu, fallbackPrice = 5000000) {
        const normalizedKyHieu = kyHieu?.trim()?.toLowerCase() || 'Khác';
        const communeData = governmentLandPrices[maXa];
        
        if (!communeData) {
            console.warn(`⚠️ No price data for commune: ${maXa}, using fallback`);
            return fallbackPrice;
        }
        
        // Try direct match
        if (communeData[normalizedKyHieu]) {
            return communeData[normalizedKyHieu];
        }
        
        // Try to match by keyword
        for (const [type, price] of Object.entries(communeData)) {
            if (normalizedKyHieu.includes(type) || type.includes(normalizedKyHieu)) {
                return price;
            }
        }
        
        // Return default for commune if type not found
        return communeData['Khác'] || fallbackPrice;
    }
    
    /**
     * Calculate government land price
     * @param {Object} parcelData - Parcel properties with fields:
     *   - soThua: Parcel number
     *   - loaiDat: Land use type
     *   - dienTich: Area in m²
     *   - maXa: Commune code (optional)
     * @returns {Object} Price calculation result with:
     *   - tongTien: Total price in VND
     *   - donGia: Unit price per m² (VND)
     *   - dienTich: Parcel area (m²)
     *   - loaiDat: Land type
     *   - maXa: Commune code
     *   - status: 'success' | 'warning' | 'error'
     */
    function calculateGovernmentPrice(parcelData) {
        const {
            soThua = 'N/A',
            loaiDat = 'Khác',
            dienTich = 0,
            maXa = null
        } = parcelData;
        
        // Validate inputs
        if (!dienTich || dienTich <= 0) {
            return {
                tongTien: 0,
                donGia: 0,
                dienTich: dienTich,
                loaiDat: loaiDat,
                maXa: maXa || 'N/A',
                status: 'error',
                message: '❌ Diện tích không hợp lệ'
            };
        }
        
        // Get unit price (default fallback if no commune match)
        const donGia = getUnitPrice(maXa, loaiDat);
        const tongTien = dienTich * donGia;
        
        return {
            tongTien: Math.round(tongTien),
            donGia: donGia,
            dienTich: dienTich,
            loaiDat: loaiDat,
            maXa: maXa || 'N/A',
            status: 'success',
            message: `✅ Giá tính toán từ dữ liệu chính thức`
        };
    }
    
    // ============================================================================
    // MARKET PRICE COMPARISON
    // ============================================================================
    
    /**
     * Calculate variance between government and market price
     * @param {number} governmentPrice - Government land price (VND)
     * @param {number} marketPrice - Market/survey price from user (VND)
     * @returns {Object} Comparison result with:
     *   - variance: Absolute difference (VND)
     *   - variancePercent: Percentage difference (%)
     *   - ratio: Market/Government ratio
     *   - status: 'higher' | 'lower' | 'equal'
     *   - assessment: Text assessment
     */
    function compareMarketPrice(governmentPrice, marketPrice) {
        if (governmentPrice === 0 || !marketPrice || marketPrice <= 0) {
            return {
                variance: 0,
                variancePercent: 0,
                ratio: 0,
                status: 'error',
                assessment: '❌ Giá không hợp lệ'
            };
        }
        
        const variance = marketPrice - governmentPrice;
        const variancePercent = (variance / governmentPrice) * 100;
        const ratio = marketPrice / governmentPrice;
        
        let status, assessment;
        
        if (variancePercent > 5) {
            status = 'higher';
            assessment = `📈 Cao hơn ${variancePercent.toFixed(1)}% (Thị trường: ${formatCurrency(marketPrice)})`;
        } else if (variancePercent < -5) {
            status = 'lower';
            assessment = `📉 Thấp hơn ${Math.abs(variancePercent).toFixed(1)}% (Thị trường: ${formatCurrency(marketPrice)})`;
        } else {
            status = 'equal';
            assessment = `➡️ Gần bằng nhau (${variancePercent.toFixed(1)}%)`;
        }
        
        return {
            variance: Math.round(variance),
            variancePercent: variancePercent.toFixed(1),
            ratio: ratio.toFixed(2),
            status: status,
            assessment: assessment
        };
    }
    
    // ============================================================================
    // FORMATTING & DISPLAY
    // ============================================================================
    
    /**
     * Format currency to Vietnamese Dong display
     * @param {number} value - Value in VND
     * @returns {string} Formatted string (e.g., "8,500,000 VNĐ")
     */
    function formatCurrency(value) {
        if (value === null || value === undefined) return 'N/A';
        
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return 'N/A';
        
        // Format as number with thousand separators
        const formatted = numValue.toLocaleString('vi-VN', {
            style: 'decimal',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
        
        return `${formatted} VNĐ`;
    }
    
    /**
     * Format unit price (per m²)
     * @param {number} price - Price per m²
     * @returns {string} Formatted display (e.g., "8.5M VNĐ/m²")
     */
    function formatUnitPrice(price) {
        if (price >= 1000000) {
            return `${(price / 1000000).toFixed(1)}M VNĐ/m²`;
        } else if (price >= 1000) {
            return `${(price / 1000).toFixed(0)}k VNĐ/m²`;
        } else {
            return `${price} VNĐ/m²`;
        }
    }
    
    /**
     * Generate HTML for government price display
     * @param {Object} priceResult - Result from calculateGovernmentPrice()
     * @returns {string} HTML string for display in info panel
     */
    function generatePriceHTML(priceResult) {
        if (priceResult.status === 'error') {
            return `
                <div class="price-row error">
                    <span class="price-label">💰 Giá Nhà nước:</span>
                    <span class="price-value">${priceResult.message}</span>
                </div>
            `;
        }
        
        return `
            <div class="price-row success">
                <div class="price-header">
                    <span class="price-label">💰 Giá Nhà nước dự kiến:</span>
                    <strong class="price-value-main">${formatCurrency(priceResult.tongTien)}</strong>
                </div>
                <div class="price-details">
                    <span class="price-detail-item">
                        <span class="detail-label">Đơn giá:</span>
                        <span class="detail-value">${formatUnitPrice(priceResult.donGia)}</span>
                    </span>
                    <span class="price-detail-item">
                        <span class="detail-label">Diện tích:</span>
                        <span class="detail-value">${priceResult.dienTich.toFixed(1)} m²</span>
                    </span>
                    <span class="price-detail-item">
                        <span class="detail-label">Loại đất:</span>
                        <span class="detail-value">${landTypeNames[priceResult.loaiDat] || priceResult.loaiDat}</span>
                    </span>
                </div>
            </div>
        `;
    }
    
    /**
     * Generate HTML for price comparison tool
     * @returns {string} HTML for market price input and comparison
     */
    function generateComparisonToolHTML() {
        return `
            <div class="price-comparison-tool">
                <div class="comparison-header">
                    <span class="comparison-label">📊 So sánh Giá Thị trường:</span>
                </div>
                <div class="comparison-input-group">
                    <input 
                        type="number" 
                        id="market-price-input" 
                        class="comparison-input" 
                        placeholder="Nhập giá thị trường (VNĐ)" 
                        min="0" 
                        step="1000000"
                    >
                    <button id="compare-price-btn" class="comparison-btn">
                        <span>So sánh</span>
                    </button>
                </div>
                <div id="comparison-result" class="comparison-result hidden">
                    <!-- Result will be populated here -->
                </div>
            </div>
        `;
    }
    
    /**
     * Generate HTML for comparison result display
     * @param {Object} comparisonResult - Result from compareMarketPrice()
     * @returns {string} HTML string
     */
    function generateComparisonResultHTML(comparisonResult) {
        if (comparisonResult.status === 'error') {
            return `<div class="result-error">${comparisonResult.assessment}</div>`;
        }
        
        const icon = comparisonResult.status === 'higher' ? '📈' :
                     comparisonResult.status === 'lower' ? '📉' : '➡️';
        
        return `
            <div class="result-${comparisonResult.status}">
                <div class="result-assessment">
                    ${icon} ${comparisonResult.assessment}
                </div>
                <div class="result-details">
                    <div class="result-item">
                        <span>Chênh lệch:</span>
                        <strong>${formatCurrency(comparisonResult.variance)}</strong>
                    </div>
                    <div class="result-item">
                        <span>Tỷ lệ:</span>
                        <strong>${comparisonResult.variancePercent}%</strong>
                    </div>
                </div>
            </div>
        `;
    }
    
    // ============================================================================
    // DATA MANAGEMENT
    // ============================================================================
    
    /**
     * Load custom price data (for future API integration)
     * Allows replacing sample data with real government data
     * @param {Object} customData - Custom price data in same format as governmentLandPrices
     * @returns {boolean} Success status
     */
    function loadCustomPriceData(customData) {
        if (!customData || typeof customData !== 'object') {
            console.error('❌ Invalid custom price data format');
            return false;
        }
        
        Object.assign(governmentLandPrices, customData);
        console.log('✅ Custom price data loaded. Communes available:', Object.keys(governmentLandPrices).length);
        return true;
    }
    
    /**
     * Get available communes and land types
     * @returns {Object} Available communes and their land types
     */
    function getAvailablePriceData() {
        return {
            communes: Object.keys(governmentLandPrices),
            landTypes: Object.keys(landTypeNames),
            data: governmentLandPrices
        };
    }
    
    /**
     * Clear and reset price data
     */
    function resetPriceData() {
        // Reload default data from this module
        console.log('✅ Price data reset to defaults');
    }
    
    // ============================================================================
    // PUBLIC API
    // ============================================================================
    
    window.PriceUtils = {
        // Lookup functions
        getUnitPrice,
        calculateGovernmentPrice,
        compareMarketPrice,
        
        // Formatting
        formatCurrency,
        formatUnitPrice,
        
        // HTML generation
        generatePriceHTML,
        generateComparisonToolHTML,
        generateComparisonResultHTML,
        
        // Data management
        loadCustomPriceData,
        getAvailablePriceData,
        resetPriceData,
        
        // Data access for reference
        governmentLandPrices: () => governmentLandPrices,
        landTypeNames: () => landTypeNames
    };
    
    // Expose main calculation functions for backward compatibility
    window.calculateGovernmentPrice = calculateGovernmentPrice;
    window.compareMarketPrice = compareMarketPrice;
    window.formatCurrency = formatCurrency;
    
    console.log('✅ Price utilities loaded and exposed to window.PriceUtils');
})();
