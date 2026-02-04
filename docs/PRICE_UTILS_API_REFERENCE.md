# 🔌 Price Utils API Reference

**Module**: `window.PriceUtils`  
**File**: `public/js/price-utils.js`  
**Version**: 1.0.0  
**Status**: ✅ Production Ready

---

## 📖 Quick Reference

### Most Used Functions

```javascript
// Calculate government price
const result = window.PriceUtils.calculateGovernmentPrice({
    soThua: 'Thửa 123',
    loaiDat: 'ở',
    dienTich: 1500,
    maXa: '1030001'
});
console.log(result.tongTien); // 12750000

// Compare with market price
const comparison = window.PriceUtils.compareMarketPrice(
    12750000,  // government price
    14000000   // market price
);
console.log(comparison.assessment); // "📈 Cao hơn 9.8%..."

// Format for display
console.log(window.PriceUtils.formatCurrency(12750000)); 
// "12,750,000 VNĐ"
```

---

## 🔍 Complete API Reference

### 1. `calculateGovernmentPrice(parcelData)`

Calculate government land price for a parcel.

**Parameters**:
```javascript
{
    soThua: string,          // Parcel number (e.g., 'Thửa 123')
    loaiDat: string,         // Land type (e.g., 'ở', 'SXKD', 'NN')
    dienTich: number,        // Parcel area in m²
    maXa?: string            // Commune code (optional, uses default if missing)
}
```

**Returns**:
```javascript
{
    tongTien: number,        // Total calculated price (VND)
    donGia: number,          // Unit price (VND/m²)
    dienTich: number,        // Parcel area (m²)
    loaiDat: string,         // Land type
    maXa: string,            // Commune code
    status: 'success'|'error'|'warning',
    message: string          // Status message
}
```

**Example**:
```javascript
const result = window.PriceUtils.calculateGovernmentPrice({
    soThua: 'Thửa 456',
    loaiDat: 'ở',
    dienTich: 2000,
    maXa: '1030001'
});

console.log(result);
// {
//     tongTien: 17000000,
//     donGia: 8500000,
//     dienTich: 2000,
//     loaiDat: 'ở',
//     maXa: '1030001',
//     status: 'success',
//     message: '✅ Giá tính toán từ dữ liệu chính thức'
// }
```

**Error Cases**:
```javascript
// Invalid area
window.PriceUtils.calculateGovernmentPrice({
    dienTich: 0,
    loaiDat: 'ở'
});
// Returns: { status: 'error', message: '❌ Diện tích không hợp lệ' }

// Missing commune (uses default fallback price)
window.PriceUtils.calculateGovernmentPrice({
    soThua: 'Thửa 999',
    loaiDat: 'ở',
    dienTich: 1000,
    maXa: 'UNKNOWN'  // Not in database
});
// Returns: calculated with fallback price (5M/m²)
```

---

### 2. `compareMarketPrice(governmentPrice, marketPrice)`

Calculate variance between government and market prices.

**Parameters**:
```javascript
governmentPrice: number   // Government price (VND)
marketPrice: number       // Market price entered by user (VND)
```

**Returns**:
```javascript
{
    variance: number,           // Absolute difference (VND)
    variancePercent: string,    // Percentage difference (e.g., "9.8")
    ratio: string,              // Market/Gov ratio (e.g., "1.10")
    status: 'higher'|'lower'|'equal'|'error',
    assessment: string          // Human-readable assessment
}
```

**Status Determination**:
- `'higher'`: Market price > Gov price + 5%
- `'lower'`: Market price < Gov price - 5%
- `'equal'`: Within ±5% range
- `'error'`: Invalid inputs

**Example 1: Higher price**:
```javascript
const result = window.PriceUtils.compareMarketPrice(
    10000000,  // government
    12000000   // market (20% higher)
);

console.log(result);
// {
//     variance: 2000000,
//     variancePercent: '20.0',
//     ratio: '1.20',
//     status: 'higher',
//     assessment: '📈 Cao hơn 20.0% (Thị trường: 12,000,000 VNĐ)'
// }
```

**Example 2: Lower price**:
```javascript
const result = window.PriceUtils.compareMarketPrice(
    10000000,  // government
    8000000    // market (20% lower)
);

console.log(result);
// {
//     variance: -2000000,
//     variancePercent: '-20.0',
//     ratio: '0.80',
//     status: 'lower',
//     assessment: '📉 Thấp hơn 20.0% (Thị trường: 8,000,000 VNĐ)'
// }
```

**Example 3: Similar price**:
```javascript
const result = window.PriceUtils.compareMarketPrice(
    10000000,  // government
    10200000   // market (2% higher - within range)
);

console.log(result);
// {
//     variance: 200000,
//     variancePercent: '2.0',
//     ratio: '1.02',
//     status: 'equal',
//     assessment: '➡️ Gần bằng nhau (2.0%)'
// }
```

---

### 3. `formatCurrency(value)`

Format number to Vietnamese Dong currency display.

**Parameters**:
```javascript
value: number   // Amount in VND
```

**Returns**:
```javascript
string          // Formatted display (e.g., "12,750,000 VNĐ")
```

**Examples**:
```javascript
window.PriceUtils.formatCurrency(12750000);
// "12,750,000 VNĐ"

window.PriceUtils.formatCurrency(0);
// "0 VNĐ"

window.PriceUtils.formatCurrency(null);
// "N/A"

window.PriceUtils.formatCurrency('invalid');
// "N/A"
```

---

### 4. `formatUnitPrice(price)`

Format price per square meter display.

**Parameters**:
```javascript
price: number   // Price per m² (VND/m²)
```

**Returns**:
```javascript
string          // Formatted display (e.g., "8.5M VNĐ/m²")
```

**Format Rules**:
- ≥ 1,000,000 → Display in millions (e.g., "8.5M")
- ≥ 1,000 → Display in thousands (e.g., "500k")
- < 1,000 → Display as-is (e.g., "350")

**Examples**:
```javascript
window.PriceUtils.formatUnitPrice(8500000);
// "8.5M VNĐ/m²"

window.PriceUtils.formatUnitPrice(500000);
// "0.5M VNĐ/m²"

window.PriceUtils.formatUnitPrice(2000);
// "2k VNĐ/m²"

window.PriceUtils.formatUnitPrice(350);
// "350 VNĐ/m²"
```

---

### 5. `getUnitPrice(maXa, kyHieu, fallbackPrice)`

Get unit price for specific land type in a commune.

**Parameters**:
```javascript
maXa: string,           // Commune code (e.g., '1030001')
kyHieu: string,         // Land type (e.g., 'ở', 'SXKD')
fallbackPrice?: number  // Default if not found (default: 5000000)
```

**Returns**:
```javascript
number                  // Unit price in VND/m²
```

**Examples**:
```javascript
window.PriceUtils.getUnitPrice('1030001', 'ở');
// 8500000

window.PriceUtils.getUnitPrice('1030001', 'SXKD');
// 6500000

// With fallback
window.PriceUtils.getUnitPrice('UNKNOWN', 'ở', 7000000);
// 7000000 (fallback used)

// Default fallback (5M)
window.PriceUtils.getUnitPrice('UNKNOWN', 'ở');
// 5000000
```

---

### 6. `generatePriceHTML(priceResult)`

Generate HTML for displaying government price.

**Parameters**:
```javascript
priceResult: object   // Result from calculateGovernmentPrice()
```

**Returns**:
```javascript
string   // HTML string (ready to insert in DOM)
```

**Output Example**:
```html
<div class="price-row success">
    <div class="price-header">
        <span class="price-label">💰 Giá Nhà nước dự kiến:</span>
        <strong class="price-value-main">12,750,000 VNĐ</strong>
    </div>
    <div class="price-details">
        <span class="price-detail-item">
            <span class="detail-label">Đơn giá:</span>
            <span class="detail-value">8.5M VNĐ/m²</span>
        </span>
        <span class="price-detail-item">
            <span class="detail-label">Diện tích:</span>
            <span class="detail-value">1500.0 m²</span>
        </span>
    </div>
</div>
```

**Usage in parcel-service.js**:
```javascript
const priceResult = window.PriceUtils.calculateGovernmentPrice(parcelData);
const priceHTML = window.PriceUtils.generatePriceHTML(priceResult);
panelContent.innerHTML += priceHTML;
```

---

### 7. `generateComparisonToolHTML()`

Generate HTML for market price comparison tool input.

**Parameters**: None

**Returns**:
```javascript
string   // HTML string with input field and button
```

**Output Example**:
```html
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
    <div id="comparison-result" class="comparison-result hidden"></div>
</div>
```

---

### 8. `generateComparisonResultHTML(comparisonResult)`

Generate HTML for displaying comparison result.

**Parameters**:
```javascript
comparisonResult: object   // Result from compareMarketPrice()
```

**Returns**:
```javascript
string   // HTML string with result display
```

**Output Examples**:

*Higher Market Price*:
```html
<div class="result-higher">
    <div class="result-assessment">
        📈 Cao hơn 9.8% (Thị trường: 14,000,000 VNĐ)
    </div>
    <div class="result-details">
        <div class="result-item">
            <span>Chênh lệch:</span>
            <strong>1,250,000 VNĐ</strong>
        </div>
        <div class="result-item">
            <span>Tỷ lệ:</span>
            <strong>9.8%</strong>
        </div>
    </div>
</div>
```

*Lower Market Price*:
```html
<div class="result-lower">
    <div class="result-assessment">
        📉 Thấp hơn 15.0% (Thị trường: 10,000,000 VNĐ)
    </div>
    ...
</div>
```

---

### 9. `loadCustomPriceData(customData)`

Load custom price data (e.g., from JSON file or API).

**Parameters**:
```javascript
customData: object   // Price data in format:
                     // { 'MaXa': { 'KyHieu': donGia } }
```

**Returns**:
```javascript
boolean   // true if loaded, false if invalid
```

**Example**:
```javascript
const customPrices = {
    '1030001': {
        'ở': 8500000,
        'SXKD': 6500000,
        'NN': 500000
    },
    '1030002': {
        'ở': 7500000,
        'SXKD': 5500000
    }
};

const success = window.PriceUtils.loadCustomPriceData(customPrices);
console.log(success); // true

// Now these prices are used in calculations
```

**Loading from JSON File**:
```javascript
fetch('/data/danang-prices.json')
    .then(r => r.json())
    .then(data => {
        window.PriceUtils.loadCustomPriceData(data);
        console.log('✅ Price data loaded');
    })
    .catch(e => console.error('Failed to load:', e));
```

---

### 10. `getAvailablePriceData()`

Get list of available communes and land types.

**Parameters**: None

**Returns**:
```javascript
{
    communes: string[],      // Array of Mã Xã
    landTypes: string[],     // Array of land type codes
    data: object             // Full price data
}
```

**Example**:
```javascript
const available = window.PriceUtils.getAvailablePriceData();

console.log(available.communes);
// ['1030001', '1030002', '1030003', '1020001', ...]

console.log(available.landTypes);
// ['ở', 'SXKD', 'NN', 'TN', 'ĐT', 'XD', 'Khác']

console.log(available.data['1030001']);
// { ở: 8500000, SXKD: 6500000, NN: 500000, ... }
```

---

### 11. `resetPriceData()`

Reset price data to defaults from module.

**Parameters**: None

**Returns**: void

**Example**:
```javascript
window.PriceUtils.resetPriceData();
console.log('✅ Price data reset to defaults');
```

---

### 12. Data Access Functions

#### `governmentLandPrices()`
Get internal government price data object.

```javascript
const allPrices = window.PriceUtils.governmentLandPrices();
console.log(allPrices['1030001']);
```

#### `landTypeNames()`
Get land type display names with emojis.

```javascript
const typeNames = window.PriceUtils.landTypeNames();
console.log(typeNames['ở']);      // "🏠 Đất ở (Residential)"
console.log(typeNames['SXKD']);   // "🏭 Sản xuất/Kinh doanh (Commercial)"
```

---

## 🎯 Common Use Cases

### Use Case 1: Display Price in Info Panel

```javascript
// When showing parcel info
const parcelData = {
    soThua: 'Thửa 123',
    loaiDat: 'ở',
    dienTich: 1500,
    maXa: '1030001'
};

// Calculate and display
const priceResult = window.PriceUtils.calculateGovernmentPrice(parcelData);
const priceHTML = window.PriceUtils.generatePriceHTML(priceResult);

document.getElementById('panel-content').innerHTML += priceHTML;

// Store for later comparison
window.currentPriceResult = priceResult;
```

### Use Case 2: Handle Market Price Comparison

```javascript
// User enters market price and clicks button
function handleCompareButton() {
    const marketPrice = parseFloat(
        document.getElementById('market-price-input').value
    );
    
    if (!marketPrice || marketPrice <= 0) {
        alert('Vui lòng nhập giá hợp lệ');
        return;
    }
    
    // Calculate comparison
    const govPrice = window.currentPriceResult.tongTien;
    const comparison = window.PriceUtils.compareMarketPrice(
        govPrice,
        marketPrice
    );
    
    // Display result
    const resultHTML = window.PriceUtils.generateComparisonResultHTML(comparison);
    document.getElementById('comparison-result').innerHTML = resultHTML;
    document.getElementById('comparison-result').classList.remove('hidden');
}
```

### Use Case 3: Bulk Price Calculation

```javascript
// Calculate prices for multiple parcels
const parcels = [
    { soThua: 'T1', loaiDat: 'ở', dienTich: 1000, maXa: '1030001' },
    { soThua: 'T2', loaiDat: 'SXKD', dienTich: 2000, maXa: '1030001' },
    { soThua: 'T3', loaiDat: 'NN', dienTich: 5000, maXa: '1030002' }
];

const results = parcels.map(parcel => {
    return window.PriceUtils.calculateGovernmentPrice(parcel);
});

// Display results
results.forEach((result, index) => {
    console.log(`Parcel ${index + 1}: ${window.PriceUtils.formatCurrency(result.tongTien)}`);
});
```

### Use Case 4: Load Custom Data on App Start

```javascript
// In script.js after app initialization
async function initializeApp() {
    try {
        // Load custom price data
        const response = await fetch('/data/danang-prices.json');
        const priceData = await response.json();
        window.PriceUtils.loadCustomPriceData(priceData);
        console.log('✅ Price database loaded');
    } catch (error) {
        console.warn('Using default price data:', error);
    }
    
    // Continue with app initialization
    initializeMap();
}
```

---

## ⚠️ Error Handling

All functions include error handling:

```javascript
try {
    const result = window.PriceUtils.calculateGovernmentPrice(parcelData);
    if (result.status === 'error') {
        console.error('Price calculation error:', result.message);
    }
} catch (error) {
    console.error('Unexpected error:', error);
}
```

---

## 📊 Data Validation

**Supported Land Type Codes**:
- ✅ `'ở'` - Residential
- ✅ `'SXKD'` - Commercial/Industrial
- ✅ `'NN'` - Agricultural
- ✅ `'TN'` - Forestry
- ✅ `'ĐT'` - Transportation
- ✅ `'XD'` - Construction
- ✅ `'Khác'` - Others

**Price Validation**:
- Must be number > 0
- Unit price typical range: 100,000 - 50,000,000 VND/m²
- Fallback: 5,000,000 VND/m² if not found

**Area Validation**:
- Must be number > 0
- Typical range: 10 - 500,000 m²

---

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-04 | Initial release - Milestone 2 |

---

*API Reference v1.0*  
*Generated: 2026-02-04*  
*For: XemGiaDat Milestone 2 - Government Price Integration*
