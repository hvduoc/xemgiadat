# Hướng Dẫn Tổ Chức File Cho Data Processing Module

## 📁 Cấu Trúc Thư Mục Đề Xuất

```
xemgiadat/
├── data-processing-module/          # Module xử lý
├── sample-data/                     # Dữ liệu mẫu để test
│   ├── dwg-files/                  # File DWG/DXF
│   │   ├── euro-village-2.dwg      # File DWG gốc
│   │   └── project-layouts/        # Các bản vẽ khác
│   ├── images/                     # Hình ảnh cần xử lý
│   │   ├── euro-village-2.jpg      # Site plan image
│   │   ├── aerial-views/           # Ảnh chụp từ trên cao
│   │   └── scanned-plans/          # Bản vẽ scan
│   └── output/                     # Kết quả xử lý
│       ├── geojson/               # File GeoJSON kết quả
│       ├── processed-images/       # Hình ảnh đã xử lý
│       └── metadata/              # Thông tin metadata
```

## 🚀 Cách Sử Dụng Ngay

### Bước 1: Tạo Thư Mục Sample Data
```bash
# Từ thư mục gốc xemgiadat
mkdir sample-data
mkdir sample-data\dwg-files
mkdir sample-data\images  
mkdir sample-data\output
```

### Bước 2: Copy File Vào Đúng Thư Mục
```bash
# Copy file DWG
copy "euro-village-2.dwg" "sample-data\dwg-files\"

# Copy file hình ảnh  
copy "euro-village-2.jpg" "sample-data\images\"
```

### Bước 3: Xử Lý Với Module
```bash
cd data-processing-module

# Xử lý file DWG
python -c "
from src.xemgiadat_processors import DWGProcessor, Config
config = Config()
processor = DWGProcessor(config) 
result = processor.process_file('../sample-data/dwg-files/euro-village-2.dwg', '../sample-data/output')
print(f'✅ Xử lý DWG: {result[\"success\"]}')
if result['success']:
    print(f'📊 Đã trích xuất: {result[\"geometries_count\"]} đối tượng')
    print(f'💾 Lưu tại: {result[\"output_file\"]}')
"

# Xử lý hình ảnh với tọa độ Euro Village 2 (Đà Nẵng)
python -c "
from src.xemgiadat_processors import ImageProcessor, Config
config = Config()
processor = ImageProcessor(config)

# Tạo geo-reference cho Euro Village 2 (ước tính tọa độ Đà Nẵng)
geo_ref = processor.create_geo_reference(
    bounds=[108.15, 16.00, 108.18, 16.03],  # Tọa độ ước tính
    crs='EPSG:4326'
)

result = processor.process_file('../sample-data/images/euro-village-2.jpg', '../sample-data/output', geo_ref)
print(f'✅ Xử lý Image: {result[\"success\"]}')
if result['success']:
    print(f'🖼️ Hình đã xử lý: {result[\"processed_image\"]}')
    if result['geojson_file']:
        print(f'📍 GeoJSON: {result[\"geojson_file\"]}')
"
```

## 📸 Phân Tích File Hình Ảnh Của Bạn

Từ hình ảnh Euro Village 2 mà bạn gửi, tôi thấy:

### 📋 Thông Tin Dự Án
- **Tên**: Euro Village 2
- **Loại**: Dự án phân lô biệt thự
- **Vị trí**: Có vẻ ở Đà Nẵng (Block B2.17)
- **Layout**: Phân lô theo cụm (blocks) với các tiện ích

### 🎯 Có Thể Xử Lý
```python
# Xử lý chuyên cho Euro Village 2
def process_euro_village_2():
    from src.xemgiadat_processors import ImageProcessor, Config
    
    config = Config()
    processor = ImageProcessor(config)
    
    # Tọa độ ước tính cho Đà Nẵng
    geo_ref = processor.create_geo_reference(
        bounds=[
            108.150, 16.000,  # Góc tây nam
            108.180, 16.030   # Góc đông bắc
        ],
        crs="EPSG:4326"
    )
    
    result = processor.process_file(
        "sample-data/images/euro-village-2.jpg",
        "sample-data/output",
        geo_reference=geo_ref
    )
    
    return result

# Chạy xử lý
result = process_euro_village_2()
```

## 🔧 Script Xử Lý Tự Động

```python
# file: process_euro_village.py
import os
from pathlib import Path
import sys

# Add module path
sys.path.append('data-processing-module/src')

from xemgiadat_processors import DWGProcessor, ImageProcessor, Config, get_logger

def setup_directories():
    """Tạo thư mục cần thiết"""
    dirs = [
        'sample-data/dwg-files',
        'sample-data/images', 
        'sample-data/output/geojson',
        'sample-data/output/processed-images',
        'sample-data/output/metadata'
    ]
    
    for dir_path in dirs:
        Path(dir_path).mkdir(parents=True, exist_ok=True)
    
    print("✅ Đã tạo cấu trúc thư mục")

def process_euro_village_project():
    """Xử lý toàn bộ dự án Euro Village 2"""
    
    logger = get_logger("euro_village")
    logger.info("Bắt đầu xử lý dự án Euro Village 2")
    
    # Cấu hình cho Đà Nẵng
    config = Config()
    config.coordinate_systems.source_vn2000 = "EPSG:3405"  # VN-2000 Zone 48N
    
    # Khởi tạo processors
    dwg_processor = DWGProcessor(config)
    img_processor = ImageProcessor(config)
    
    results = {}
    
    # 1. Xử lý file DWG (nếu có)
    dwg_file = Path("sample-data/dwg-files/euro-village-2.dwg")
    if dwg_file.exists():
        print("🏗️ Xử lý file DWG...")
        dwg_result = dwg_processor.process_file(
            str(dwg_file), 
            "sample-data/output"
        )
        results['dwg'] = dwg_result
        
        if dwg_result['success']:
            print(f"   ✅ DWG: {dwg_result['geometries_count']} đối tượng")
        else:
            print(f"   ❌ DWG: {dwg_result['error']}")
    else:
        print("⚠️ Không tìm thấy file DWG")
    
    # 2. Xử lý hình ảnh
    img_file = Path("sample-data/images/euro-village-2.jpg")
    if img_file.exists():
        print("🖼️ Xử lý hình ảnh...")
        
        # Tạo geo-reference cho Euro Village 2
        geo_ref = img_processor.create_geo_reference(
            bounds=[108.150, 16.000, 108.180, 16.030],
            crs="EPSG:4326"
        )
        
        img_result = img_processor.process_file(
            str(img_file),
            "sample-data/output", 
            geo_reference=geo_ref
        )
        results['image'] = img_result
        
        if img_result['success']:
            print(f"   ✅ Image: {img_result['features_count']} features")
            print(f"   📷 Processed: {img_result['processed_image']}")
        else:
            print(f"   ❌ Image: {img_result['error']}")
    else:
        print("⚠️ Không tìm thấy file hình ảnh")
    
    # 3. Tạo báo cáo
    print("\n📊 Báo cáo xử lý Euro Village 2:")
    total_objects = 0
    
    if 'dwg' in results and results['dwg']['success']:
        total_objects += results['dwg']['geometries_count']
        print(f"   🏗️ DWG: {results['dwg']['geometries_count']} đối tượng hình học")
        
    if 'image' in results and results['image']['success']:
        total_objects += results['image']['features_count']
        print(f"   🖼️ Image: {results['image']['features_count']} features")
    
    print(f"   🎯 Tổng cộng: {total_objects} đối tượng được xử lý")
    print(f"   📁 Kết quả lưu tại: sample-data/output/")
    
    return results

if __name__ == "__main__":
    setup_directories()
    results = process_euro_village_project()
```

## 📝 Hướng Dẫn Sử Dụng Ngay

### Option 1: Sử Dụng Script Tự Động
```bash
# Tạo file script
# Copy code trên vào process_euro_village.py

# Chạy script
python process_euro_village.py
```

### Option 2: Sử Dụng CLI
```bash
cd data-processing-module

# Xử lý DWG
python -m xemgiadat_processors.cli.main process-dwg \
  "../sample-data/dwg-files/euro-village-2.dwg" \
  --output "../sample-data/output"

# Xử lý Image với tọa độ
python -m xemgiadat_processors.cli.main process-image \
  "../sample-data/images/euro-village-2.jpg" \
  --bounds 108.150 16.000 108.180 16.030 \
  --output "../sample-data/output"
```

### Option 3: Sử Dụng Python Interactive
```python
# Trong Python shell
exec(open('data-processing-module/demo.py').read())

# Sau đó chạy các function xử lý file thật
```

## 🎯 Kết Quả Mong Đợi

Sau khi xử lý, bạn sẽ có:

### 📄 File DWG → GeoJSON
- Các lô đất (polygons)
- Đường giao thông (linestrings) 
- Các tiện ích (points)
- Metadata đầy đủ

### 🖼️ Image → Enhanced + GeoJSON
- Hình ảnh đã cải thiện chất lượng
- Bounding box geo-referenced
- Metadata xử lý

### 📊 Báo Cáo
- Thống kê số lượng đối tượng
- Chất lượng xử lý
- Thời gian processing

Bạn chỉ cần copy file vào thư mục `sample-data` và chạy script là được! 🚀