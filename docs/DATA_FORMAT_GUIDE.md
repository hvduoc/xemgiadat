# 📊 Milestone 2: Land Price Data Format Guide

**Purpose**: Specify exact data format for Da Nang government land prices  
**Target**: Ministry of Natural Resources & Environment (BTNMT) data integration  
**Created**: 2026-02-04

---

## 🎯 Recommended Format: **Excel (.xlsx)**

### Why Excel?

✅ **Best for Government Data**:
- Standard format for Vietnamese government agencies
- Easy to maintain and update yearly
- Can store formulas and calculations
- Supports annotations and source references
- No special tools needed (Microsoft Excel, LibreOffice)

✅ **Easy Conversion**:
- Can export to JSON/CSV with simple script
- No data loss in conversion
- Version control friendly

✅ **Collaborative**:
- Multiple people can edit
- Change tracking available
- Comments for clarification

---

## 📋 Excel File Structure - REQUIRED FORMAT

### Sheet 1: "Price_Data" (Main Data)

| Mã Xã | Phường/Xã | Huyện | Loại Đất | Đơn Giá VNĐ/m² | Năm | Ghi Chú |
|-------|-----------|-------|---------|-----------------|-----|--------|
| 1030001 | Tân Chính | Thanh Khê | ở | 8500000 | 2026 | Cháy nền đô thị |
| 1030001 | Tân Chính | Thanh Khê | SXKD | 6500000 | 2026 | Khu công nghiệp gần |
| 1030001 | Tân Chính | Thanh Khê | NN | 500000 | 2026 | Vùng ngoại thành |
| 1030002 | Hòa Khánh Bắc | Thanh Khê | ở | 7500000 | 2026 | Gần trung tâm |
| 1030002 | Hòa Khánh Bắc | Thanh Khê | SXKD | 5500000 | 2026 | Khu hỗn hợp |

### Column Definitions

| Column | Type | Required | Format | Example | Notes |
|--------|------|----------|--------|---------|-------|
| **Mã Xã** | Text | ✅ Yes | DDDDDDD (7 digits) | 1030001 | VN Admin Code |
| **Phường/Xã** | Text | ✅ Yes | Vietnamese name | Tân Chính | Full name required |
| **Huyện** | Text | ✅ Yes | District name | Thanh Khê | Must match official |
| **Loại Đất** | Text | ✅ Yes | See approved list | ở | See Section 2 |
| **Đơn Giá VNĐ/m²** | Number | ✅ Yes | Integer, no decimals | 8500000 | Must be > 0 |
| **Năm** | Number | ✅ Yes | 4-digit year | 2026 | Current year |
| **Ghi Chú** | Text | ⭕ Optional | Any text | Context info | Source, reason, etc |

### Sheet 2: "Land_Types" (Reference)

| Kí Hiệu | Loại Đất Tiếng Anh | Định Nghĩa | Emoji |
|--------|------------------|-----------|-------|
| ở | Residential | Đất dành cho sinh sống | 🏠 |
| SXKD | Commercial/Industrial | Sản xuất kinh doanh | 🏭 |
| NN | Agricultural | Nông nghiệp | 🌾 |
| TN | Forestry | Lâm nghiệp | 🌲 |
| ĐT | Transportation | Giao thông | 🛣️ |
| XD | Construction | Xây dựng | 🏗️ |
| Khác | Others | Loại khác | ❓ |

### Sheet 3: "Districts" (Reference)

| Mã Huyện | Huyện/TP | Ghi Chú |
|----------|---------|--------|
| 103 | Thanh Khê | Urban district |
| 102 | Hải Châu | Urban district |
| 101 | Liên Chiểu | Urban district |
| 100 | Cẩm Lệ | Urban district |
| 099 | Ngũ Hành Sơn | Urban district |
| 098 | Sơn Trà | Urban district |
| 097 | Hòa Vang | Rural district |

---

## 🔄 Data Conversion Process

### Step 1: Export Excel to CSV

```
File: danang-prices.xlsx
Export Sheet: "Price_Data"
Format: CSV (Comma-Separated Values)
Encoding: UTF-8
Result: danang-prices.csv
```

### Step 2: Convert CSV to JSON

**Using Node.js Script** (save as `convert-to-json.js`):

```javascript
const fs = require('fs');
const csv = require('csv-parse/sync');

// Read CSV file
const content = fs.readFileSync('danang-prices.csv', 'utf-8');

// Parse CSV
const records = csv.parse(content, {
    columns: true,  // Use header row
    skip_empty_lines: true,
    delimiter: ','
});

// Convert to required JSON format
const result = {};

records.forEach(row => {
    const maXa = row['Mã Xã'].trim();
    const kyHieu = row['Loại Đất'].trim();
    const donGia = parseInt(row['Đơn Giá VNĐ/m²']);
    
    if (!result[maXa]) {
        result[maXa] = {};
    }
    
    result[maXa][kyHieu] = donGia;
});

// Write JSON file
fs.writeFileSync(
    'danang-prices.json',
    JSON.stringify(result, null, 2),
    'utf-8'
);

console.log('✅ Converted:', Object.keys(result).length, 'communes');
```

**Run**:
```bash
npm install csv-parse
node convert-to-json.js
```

**Result**: `danang-prices.json`

### Step 3: Validate JSON Format

**Validation Script** (save as `validate-prices.js`):

```javascript
const fs = require('fs');

const prices = JSON.parse(fs.readFileSync('danang-prices.json'));

console.log('📊 Validation Report');
console.log('═══════════════════');

let communeCount = 0;
let typeCount = 0;
let errors = [];

Object.entries(prices).forEach(([maXa, types]) => {
    communeCount++;
    
    Object.entries(types).forEach(([kyHieu, donGia]) => {
        typeCount++;
        
        // Validate Mã Xã format (7 digits)
        if (!/^\d{7}$/.test(maXa)) {
            errors.push(`❌ Invalid Mã Xã: ${maXa}`);
        }
        
        // Validate price is number > 0
        if (typeof donGia !== 'number' || donGia <= 0) {
            errors.push(`❌ Invalid price for ${maXa} ${kyHieu}: ${donGia}`);
        }
    });
});

console.log(`✅ Communes: ${communeCount}`);
console.log(`✅ Total prices: ${typeCount}`);

if (errors.length > 0) {
    console.log('\n⚠️ Errors found:');
    errors.forEach(e => console.log('   ' + e));
} else {
    console.log('\n✅ All validations passed!');
}
```

**Run**:
```bash
node validate-prices.js
```

---

## 📦 Complete JSON Output Format

**File**: `danang-prices.json`

```json
{
  "1030001": {
    "ở": 8500000,
    "SXKD": 6500000,
    "NN": 500000,
    "ĐT": 2000000,
    "Khác": 1000000
  },
  "1030002": {
    "ở": 7500000,
    "SXKD": 5500000,
    "NN": 400000,
    "ĐT": 1500000,
    "Khác": 800000
  },
  "1030003": {
    "ở": 7200000,
    "SXKD": 5200000,
    "NN": 400000,
    "ĐT": 1400000,
    "Khác": 700000
  },
  "1030004": {
    "ở": 6800000,
    "SXKD": 4800000,
    "NN": 350000,
    "ĐT": 1300000,
    "Khác": 600000
  },
  "1020001": {
    "ở": 9500000,
    "SXKD": 7500000,
    "NN": 600000,
    "ĐT": 2500000,
    "Khác": 1200000
  }
}
```

---

## 🔗 Integration into XemGiaDat

### Step 1: Place JSON File

```
Project Structure:
public/
├── data/
│   └── danang-prices.json  ← NEW
├── js/
│   ├── price-utils.js
│   └── ...
```

### Step 2: Load in Application

**Option A: Load on App Startup** (in `script.js`):

```javascript
// Load custom price data after app initializes
window.addEventListener('load', async () => {
    try {
        const response = await fetch('/data/danang-prices.json');
        const priceData = await response.json();
        window.PriceUtils.loadCustomPriceData(priceData);
        console.log('✅ Price data loaded from JSON');
    } catch (error) {
        console.warn('⚠️ Failed to load price data:', error);
        // Falls back to sample data in price-utils.js
    }
});
```

**Option B: Load from Firebase Storage** (Recommended):

```javascript
// In firebase config
async function loadPricesFromFirebase() {
    const file = await firebase.storage()
        .ref('data/danang-prices.json')
        .getBytes(1024 * 1024); // 1MB max
    
    const json = JSON.parse(new TextDecoder().decode(file));
    window.PriceUtils.loadCustomPriceData(json);
}
```

### Step 3: Test Integration

```javascript
// In browser console:
console.log(window.PriceUtils.getAvailablePriceData());

// Should show all communes from JSON
// If data loaded: { communes: [1030001, 1030002, ...], ...}
```

---

## 📋 Complete Excel Template

### Download Template

**File**: `danang-prices-template.xlsx`

**Pre-populated with**:
- All Da Nang communes (Mã Xã)
- All 7 land types
- 2026 as default year
- Sample prices (can be replaced)
- Validation formulas

**Usage**:
1. Download template
2. Replace prices with official data
3. Add notes/references
4. Export to CSV
5. Convert to JSON
6. Load into system

---

## ✅ Data Validation Checklist

Before submission, ensure:

- [ ] All communes have Mã Xã (7 digits)
- [ ] All Mã Xã valid (lookup table available)
- [ ] All prices > 0
- [ ] No missing values in required columns
- [ ] Land types match approved list
- [ ] Year is current year (2026)
- [ ] No duplicate Mã Xã + Loại Đất combinations
- [ ] Prices reasonable (within 5-20M/m² range for Da Nang)
- [ ] CSV exported with UTF-8 encoding
- [ ] JSON validates successfully
- [ ] No extra whitespace in strings

---

## 🔄 Recommended Update Schedule

**Price Update Frequency**:
- **Quarterly**: Review for major changes
- **Semi-Annual**: Update if new rates announced
- **Annual**: Major review (usually Q1 each year)

**Update Process**:
1. Receive updated prices from BTNMT
2. Update Excel file
3. Export to CSV
4. Convert to JSON
5. Test with conversion scripts
6. Validate data
7. Deploy to system

---

## 📞 Data Sources

**Official Vietnamese Government Prices**:
1. **Ministry of Natural Resources & Environment** (Bộ Tài nguyên Môi trường)
   - Website: btnmt.gov.vn
   - Decree 96/2021/NĐ-CP (Land prices)

2. **Da Nang City Department of Natural Resources** (Sở TN&MT TP Đà Nẵng)
   - Contact: Phòng Quản lý đất đai

3. **District Land Offices** (Phòng Tài nguyên & Môi trường)
   - Local authority source
   - Most accurate for specific areas

---

## 🎯 Format Summary

| Aspect | Recommendation |
|--------|-----------------|
| **File Format** | Excel (.xlsx) |
| **Export Format** | CSV (UTF-8) |
| **JSON Format** | Structure provided above |
| **Data Organization** | By Mã Xã + Loại Đất |
| **Price Units** | VNĐ/m² (whole numbers) |
| **Update Frequency** | Annually (Q1) |
| **Version Control** | Git for JSON files |
| **Backup** | Store original Excel in archive |

---

*Data Format Specification v1.0*  
*For XemGiaDat Milestone 2*  
*Updated: 2026-02-04*
