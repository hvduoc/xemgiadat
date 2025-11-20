# 🚀 Hướng Dẫn Xử Lý File DWG/Image - Euro Village 2

## 📁 Cấu Trúc Đã Tạo Sẵn

```
xemgiadat/
├── 📦 data-processing-module/           # Module xử lý chính
├── 📂 sample-data/                      # Thư mục dữ liệu
│   ├── dwg-files/                       # ← Copy file .dwg vào đây
│   ├── images/                          # ← Copy file .jpg vào đây  
│   └── output/                          # → Kết quả xử lý
│       └── euro_village_2_sample.geojson  # Sample đã có sẵn
├── 🐍 process_euro_village.py          # Script xử lý tự động
├── 🐍 quick_test.py                    # Test nhanh
└── 📋 INSTRUCTIONS_FILE_PROCESSING.md  # Hướng dẫn chi tiết
```

## ⚡ Cách Xử Lý File Ngay

### Bước 1: Copy File
```bash
# Copy file DWG của bạn vào:
copy "euro-village-2.dwg" "sample-data\dwg-files\"

# Copy file ảnh của bạn vào:
copy "euro-village-2.jpg" "sample-data\images\"
```

### Bước 2: Cài Đặt Dependencies (1 lần duy nhất)
```bash
cd data-processing-module
pip install -r requirements.txt
```

### Bước 3: Chạy Xử Lý
```bash
# Quay lại thư mục gốc
cd ..

# Xử lý tự động tất cả file
python process_euro_village.py

# Hoặc test nhanh
python quick_test.py
```

## 📊 Kết Quả Mong Đợi

Sau khi chạy thành công, bạn sẽ có:

### 📄 File DWG → GeoJSON
- `euro-village-2_processed.geojson`: Dữ liệu vector (lô đất, đường, tiện ích)
- Tọa độ được chuyển đổi từ VN-2000 sang WGS84
- Sẵn sàng hiển thị trên web map

### 🖼️ File Image → Enhanced + GeoJSON  
- `euro-village-2_processed.png`: Hình ảnh chất lượng cao
- `euro-village-2_features.geojson`: Bounding box có tọa độ
- `euro-village-2_metadata.json`: Thông tin chi tiết

### 📈 Báo Cáo
- `euro_village_2_report.json`: Thống kê tổng hợp
- Số lượng đối tượng được xử lý
- Chất lượng và thời gian xử lý

## 🔧 Nếu Gặp Lỗi

### Lỗi Dependencies
```bash
❌ No module named 'pyproj'
✅ Giải pháp: cd data-processing-module && pip install -r requirements.txt
```

### Lỗi Không Tìm Thấy File
```bash
❌ File not found
✅ Giải pháp: 
   1. Kiểm tra file đã copy đúng thư mục chưa
   2. Tên file có đúng không (euro-village-2.dwg, euro-village-2.jpg)
```

### Lỗi DWG Conversion
```bash
❌ DWG conversion failed
✅ Giải pháp:
   1. Cài ODA File Converter (Windows)
   2. Hoặc convert DWG→DXF trước khi xử lý
```

## 🎯 Sử Dụng Kết Quả

### 🌐 Hiển thị trên Web Map
```javascript
// Load GeoJSON vào Leaflet
fetch('sample-data/output/euro-village-2_processed.geojson')
  .then(response => response.json())
  .then(data => {
    L.geoJSON(data).addTo(map);
  });
```

### 🗺️ Import vào QGIS
1. Mở QGIS
2. Layer → Add Layer → Add Vector Layer  
3. Chọn file `.geojson` trong `sample-data/output/`
4. Dữ liệu sẽ hiển thị với tọa độ đúng

### 📊 Tích Hợp vào XemGiaDat
- File GeoJSON có thể upload trực tiếp qua Project Map Integration
- Hình ảnh enhanced dùng làm overlay
- Metadata dùng cho thông tin dự án

## 🆘 Hỗ Trợ

- **Documentation**: `INSTRUCTIONS_FILE_PROCESSING.md`
- **Hướng dẫn module**: `data-processing-module/HUONG_DAN_SU_DUNG.md`
- **Demo tương tác**: `data-processing-module/demo.py`
- **Email**: dev@xemgiadat.com

---

*Được tối ưu cho dữ liệu bất động sản Việt Nam* 🇻🇳