# Hướng Dẫn Sử Dụng Module Xử Lý Dữ Liệu XemGiaDat

## 📋 Mục Lục
1. [Cài Đặt và Thiết Lập](#cài-đặt-và-thiết-lập)
2. [Hướng Dẫn Nhanh](#hướng-dẫn-nhanh)
3. [Xử Lý File DWG/DXF](#xử-lý-file-dwgdxf)
4. [Xử Lý Hình Ảnh](#xử-lý-hình-ảnh)
5. [Xử Lý Hàng Loạt](#xử-lý-hàng-loạt)
6. [Sử Dụng Command Line](#sử-dụng-command-line)
7. [Cấu Hình Nâng Cao](#cấu-hình-nâng-cao)
8. [Ví Dụ Thực Tế](#ví-dụ-thực-tế)
9. [Xử Lý Lỗi](#xử-lý-lỗi)

## 🛠️ Cài Đặt và Thiết Lập

### Yêu Cầu Hệ Thống
- **Python**: 3.8 trở lên
- **Hệ điều hành**: Windows 10/11, macOS, hoặc Linux
- **RAM**: Tối thiểu 4GB (khuyến nghị 8GB+)
- **Ổ cứng**: 500MB cho module + dung lượng cho dữ liệu

### Bước 1: Cài Đặt Dependencies
```bash
# Di chuyển vào thư mục module
cd data-processing-module

# Cài đặt các thư viện cần thiết
pip install -r requirements.txt

# Hoặc cài đặt module như package
pip install -e .
```

### Bước 2: Cài Đặt Công Cụ Bổ Sung (Tùy Chọn)
```bash
# Cho xử lý DWG nâng cao
pip install ezdxf

# Cho xử lý hình ảnh nâng cao  
pip install opencv-python scikit-image

# Cho machine learning (tương lai)
pip install tensorflow-cpu
```

### Bước 3: Kiểm Tra Cài Đặt
```bash
# Chạy test kiểm tra
python tests/test_structure.py

# Kiểm tra CLI
python -m xemgiadat_processors.cli.main --help
```

## 🚀 Hướng Dẫn Nhanh

### Import Module
```python
from xemgiadat_processors import (
    DWGProcessor,     # Xử lý file DWG/DXF
    ImageProcessor,   # Xử lý hình ảnh
    Config,          # Cấu hình
    get_logger       # Logging
)
```

### Tạo Cấu Hình Cho Việt Nam
```python
# Tạo cấu hình cho Đà Nẵng
config = Config()
config.coordinate_systems.source_vn2000 = "EPSG:3405"  # VN-2000 UTM zone 48N
config.coordinate_systems.target_wgs84 = "EPSG:4326"   # WGS84 (Google Maps)

# Cài đặt chất lượng cho dữ liệu bất động sản
config.quality.geometry_tolerance = 0.01  # 1cm độ chính xác
config.quality.coordinate_precision = 6   # 6 số thập phân (~10cm)
config.quality.min_area = 1.0            # Diện tích tối thiểu 1m²
```

### Xử Lý Cơ Bản
```python
# Xử lý file DWG
dwg_processor = DWGProcessor(config)
result = dwg_processor.process_file("bản_vẽ_dự_án.dwg", "./output")

if result['success']:
    print(f"✅ Xử lý thành công: {result['geometries_count']} đối tượng")
    print(f"📄 File kết quả: {result['output_file']}")
else:
    print(f"❌ Lỗi xử lý: {result['error']}")
```

## 📐 Xử Lý File DWG/DXF

### Xử Lý File Đơn
```python
from xemgiadat_processors import DWGProcessor, Config

# Tạo processor với cấu hình Việt Nam
config = Config()
processor = DWGProcessor(config)

# Xử lý file DWG từ dự án bất động sản
result = processor.process_file(
    file_path="du_an/ban_ve_tong_the.dwg",
    output_dir="./ket_qua"
)

# Kiểm tra kết quả
if result['success']:
    print(f"🎉 Đã xử lý {result['geometries_count']} đối tượng hình học")
    print(f"📍 Tọa độ đã chuyển đổi từ VN-2000 sang WGS84")
    print(f"💾 Lưu tại: {result['output_file']}")
    
    # Thông tin metadata
    metadata = result['metadata']
    print(f"📊 Thống kê:")
    print(f"   - Polygon: {metadata['geometry_statistics']['by_type'].get('Polygon', 0)}")
    print(f"   - LineString: {metadata['geometry_statistics']['by_type'].get('LineString', 0)}")
    print(f"   - Point: {metadata['geometry_statistics']['by_type'].get('Point', 0)}")
```

### Xử Lý Với Các Loại Hình Học
```python
# Cấu hình cho từng loại đối tượng
result = processor.process_file("cadastral.dwg")

# Kết quả sẽ chứa:
# - Polygon: Thửa đất, công trình xây dựng
# - LineString: Đường giao thông, ranh giới
# - Point: Điểm khống chế, cột mốc

# Lọc theo loại đối tượng
def filter_by_layer(result_file, layer_name):
    import json
    with open(result_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    filtered_features = []
    for feature in data['features']:
        if feature['properties'].get('layer', '').lower() == layer_name.lower():
            filtered_features.append(feature)
    
    print(f"🔍 Tìm thấy {len(filtered_features)} đối tượng ở layer '{layer_name}'")
    return filtered_features

# Ví dụ lọc layer "thua_dat"
parcels = filter_by_layer(result['output_file'], "thua_dat")
```

### Xử Lý File DXF
```python
# Module hỗ trợ cả DWG và DXF
dxf_result = processor.process_file("ban_do_quy_hoach.dxf")

# DXF thường xử lý nhanh hơn vì không cần chuyển đổi
print(f"⚡ Xử lý DXF: {dxf_result['geometries_count']} đối tượng")
```

## 🖼️ Xử Lý Hình Ảnh

### Xử Lý Hình Ảnh Có Tọa Độ
```python
from xemgiadat_processors import ImageProcessor

# Tạo processor hình ảnh
img_processor = ImageProcessor(config)

# Tạo geo-reference cho dự án tại Đà Nẵng
geo_reference = img_processor.create_geo_reference(
    bounds=[
        108.2020, 16.0540,  # Góc tây nam (longitude, latitude)
        108.2040, 16.0560   # Góc đông bắc (longitude, latitude)
    ],
    crs="EPSG:4326"  # WGS84
)

# Xử lý hình ảnh site plan
result = img_processor.process_file(
    file_path="site_plan_du_an.png",
    output_dir="./output",
    geo_reference=geo_reference
)

print(f"🖼️ Đã xử lý hình ảnh: {result['processed_image']}")
if result['geojson_file']:
    print(f"📍 Đã tạo GeoJSON: {result['geojson_file']}")
```

### Xử Lý Với World File
```python
# Nếu có file .pgw, .tfw, .jgw đi kèm
# Module sẽ tự động đọc geo-reference

result = img_processor.process_file(
    file_path="ban_do_dia_chinh.tif",  # File có .tfw đi kèm
    output_dir="./geo_output"
    # Không cần geo_reference, sẽ tự động đọc từ world file
)

if result['success']:
    print("🗺️ Đã sử dụng world file để geo-reference")
```

### Cải Thiện Chất Lượng Hình Ảnh
```python
# Xử lý hình ảnh scan chất lượng thấp
result = img_processor.process_file(
    "ban_ve_scan.jpg",
    output_dir="./enhanced"
)

# Module sẽ tự động:
# - Tăng độ tương phản
# - Tăng độ sắc nét
# - Giảm nhiễu
# - Tối ưu cho web

print(f"✨ Hình ảnh đã được cải thiện: {result['processed_image']}")
```

## 📦 Xử Lý Hàng Loạt

### Xử Lý Nhiều File DWG
```python
# Danh sách file cần xử lý
dwg_files = [
    "du_an_a/ban_ve_tong_the.dwg",
    "du_an_a/chi_tiet_lô_đất.dwg", 
    "du_an_b/quy_hoach_1_500.dwg",
    "du_an_c/ha_tang_ky_thuat.dxf"
]

# Xử lý hàng loạt
batch_result = processor.process_batch(
    file_paths=dwg_files,
    output_dir="./batch_output"
)

# Thống kê kết quả
print(f"📊 Kết quả xử lý hàng loạt:")
print(f"   ✅ Thành công: {batch_result['successful']}/{batch_result['total_files']}")
print(f"   ❌ Thất bại: {batch_result['failed']}")
print(f"   🔢 Tổng đối tượng: {batch_result['statistics']['geometries_extracted']}")

# Xem chi tiết từng file
for result in batch_result['results']:
    if result['success']:
        print(f"   ✅ {result['input_file']}: {result['geometries_count']} đối tượng")
    else:
        print(f"   ❌ {result['input_file']}: {result['error']}")
```

### Xử Lý Thư Mục Tự Động
```python
import os
from pathlib import Path

def process_directory(input_dir, output_dir, file_extensions=['.dwg', '.dxf']):
    """Xử lý tất cả file trong thư mục"""
    
    input_path = Path(input_dir)
    files_to_process = []
    
    # Tìm tất cả file cần xử lý
    for ext in file_extensions:
        files_to_process.extend(input_path.glob(f"**/*{ext}"))
    
    print(f"🔍 Tìm thấy {len(files_to_process)} file để xử lý")
    
    # Xử lý hàng loạt
    file_paths = [str(f) for f in files_to_process]
    result = processor.process_batch(file_paths, output_dir)
    
    return result

# Sử dụng
result = process_directory(
    input_dir="./du_an_bat_dong_san",
    output_dir="./ket_qua_xu_ly",
    file_extensions=['.dwg', '.dxf', '.png', '.jpg', '.tif']
)
```

## 💻 Sử Dụng Command Line

### Xử Lý File Đơn
```bash
# Xử lý file DWG
xgd-process process-dwg "du_an.dwg" --output ./ket_qua

# Xử lý hình ảnh với tọa độ Đà Nẵng
xgd-process process-image "site_plan.png" \
  --bounds 108.2020 16.0540 108.2040 16.0560 \
  --crs EPSG:4326 \
  --output ./geo_output
```

### Xử Lý Hàng Loạt
```bash
# Xử lý tất cả file trong thư mục
xgd-process batch-process \
  --input-dir "./du_an_raw" \
  --output-dir "./du_an_processed" \
  --file-types "dwg,dxf,png,jpg,tif" \
  --recursive

# Xử lý song song (4 luồng)
xgd-process batch-process \
  --input-dir "./large_dataset" \
  --output-dir "./processed" \
  --parallel 4 \
  --recursive
```

### Quản Lý Cấu Hình
```bash
# Tạo file cấu hình mẫu
xgd-process config --generate --output config_danang.json

# Kiểm tra cấu hình
xgd-process --config config_danang.json --validate-config

# Sử dụng cấu hình tùy chỉnh
xgd-process process-dwg "project.dwg" \
  --config config_danang.json \
  --output ./output
```

## ⚙️ Cấu Hình Nâng Cao

### Cấu Hình Cho Các Vùng Việt Nam
```python
# Cấu hình cho các múi giờ khác nhau
configs = {
    'ho_chi_minh': {
        'source_vn2000': 'EPSG:3404',  # VN-2000 Zone 47N
        'description': 'TP.HCM và miền Nam'
    },
    'da_nang': {
        'source_vn2000': 'EPSG:3405',  # VN-2000 Zone 48N  
        'description': 'Đà Nẵng và miền Trung'
    },
    'ha_noi': {
        'source_vn2000': 'EPSG:3406',  # VN-2000 Zone 49N
        'description': 'Hà Nội và miền Bắc'
    }
}

# Tạo cấu hình cho Đà Nẵng
config = Config()
config.coordinate_systems.source_vn2000 = configs['da_nang']['source_vn2000']
print(f"📍 Sử dụng cấu hình: {configs['da_nang']['description']}")
```

### Cấu Hình Chất Lượng
```python
# Cấu hình cho dữ liệu địa chính (độ chính xác cao)
config.quality.geometry_tolerance = 0.001   # 1mm
config.quality.coordinate_precision = 8     # 8 số thập phân
config.quality.min_area = 0.1              # 0.1m² tối thiểu

# Cấu hình cho quy hoạch (độ chính xác trung bình)
config.quality.geometry_tolerance = 0.01    # 1cm
config.quality.coordinate_precision = 6     # 6 số thập phân 
config.quality.min_area = 1.0              # 1m² tối thiểu

# Cấu hình cho dữ liệu khảo sát (độ chính xác thấp)
config.quality.geometry_tolerance = 0.1     # 10cm
config.quality.coordinate_precision = 4     # 4 số thập phân
config.quality.min_area = 10.0             # 10m² tối thiểu
```

### Giới Hạn Xử Lý
```python
# Cho dữ liệu lớn
config.limits.max_file_size = 200 * 1024 * 1024  # 200MB
config.limits.max_features = 100000              # 100K đối tượng
config.limits.timeout_seconds = 1200             # 20 phút

# Cho xử lý nhanh
config.limits.max_file_size = 50 * 1024 * 1024   # 50MB
config.limits.max_features = 10000               # 10K đối tượng
config.limits.timeout_seconds = 300              # 5 phút
```

## 🏠 Ví Dụ Thực Tế

### Xử Lý Dữ Liệu Địa Chính
```python
def xu_ly_dia_chinh_da_nang():
    """Ví dụ xử lý dữ liệu địa chính Đà Nẵng"""
    
    # Cấu hình cho Đà Nẵng
    config = Config()
    config.coordinate_systems.source_vn2000 = "EPSG:3405"  # VN-2000 Zone 48N
    config.quality.geometry_tolerance = 0.001              # Độ chính xác cao
    
    processor = DWGProcessor(config)
    
    # Xử lý bản đồ địa chính
    result = processor.process_file(
        "BanDoDiaChinhDaNang_2024.dwg",
        "./dia_chinh_processed"
    )
    
    if result['success']:
        print(f"✅ Đã xử lý {result['geometries_count']} thửa đất")
        
        # Tải kết quả để phân tích
        import json
        with open(result['output_file'], 'r', encoding='utf-8') as f:
            geojson = json.load(f)
        
        # Thống kê theo layer
        layers = {}
        for feature in geojson['features']:
            layer = feature['properties'].get('layer', 'unknown')
            layers[layer] = layers.get(layer, 0) + 1
        
        print("📊 Thống kê theo layer:")
        for layer, count in layers.items():
            print(f"   {layer}: {count} đối tượng")
    
    return result
```

### Xử Lý Dự Án Bất Động Sản
```python
def xu_ly_du_an_bat_dong_san():
    """Ví dụ xử lý dự án bất động sản hoàn chỉnh"""
    
    config = Config()
    dwg_processor = DWGProcessor(config)
    img_processor = ImageProcessor(config)
    
    # 1. Xử lý bản vẽ tổng thể (DWG)
    print("🏗️ Bước 1: Xử lý bản vẽ tổng thể...")
    dwg_result = dwg_processor.process_file(
        "du_an_abc/ban_ve_tong_the.dwg",
        "./output"
    )
    
    # 2. Xử lý hình ảnh site plan
    print("🖼️ Bước 2: Xử lý site plan...")
    geo_ref = img_processor.create_geo_reference(
        bounds=[108.2020, 16.0540, 108.2040, 16.0560],
        crs="EPSG:4326"
    )
    
    img_result = img_processor.process_file(
        "du_an_abc/site_plan.png",
        "./output",
        geo_reference=geo_ref
    )
    
    # 3. Xử lý hàng loạt detail drawings
    print("📐 Bước 3: Xử lý chi tiết...")
    detail_files = [
        "du_an_abc/chi_tiet_lot_1_20.dwg",
        "du_an_abc/chi_tiet_lot_21_40.dwg",
        "du_an_abc/ha_tang_ky_thuat.dxf"
    ]
    
    batch_result = dwg_processor.process_batch(detail_files, "./output")
    
    # 4. Tạo báo cáo
    print("📊 Bước 4: Tạo báo cáo...")
    total_features = 0
    if dwg_result['success']:
        total_features += dwg_result['geometries_count']
    if img_result['success']:
        total_features += img_result['features_count']
    
    total_features += sum([
        r['geometries_count'] for r in batch_result['results'] 
        if r['success']
    ])
    
    print(f"🎉 Hoàn thành xử lý dự án!")
    print(f"   📊 Tổng cộng: {total_features} đối tượng hình học")
    print(f"   ✅ File thành công: {len([r for r in batch_result['results'] if r['success']]) + (1 if dwg_result['success'] else 0) + (1 if img_result['success'] else 0)}")
    
    return {
        'dwg_result': dwg_result,
        'img_result': img_result, 
        'batch_result': batch_result,
        'total_features': total_features
    }
```

### Tích Hợp Với Web Map
```python
def tao_web_map_data():
    """Tạo dữ liệu cho web map"""
    
    result = xu_ly_du_an_bat_dong_san()
    
    # Gộp tất cả GeoJSON
    import json
    from pathlib import Path
    
    all_features = []
    
    # Thu thập tất cả features
    output_dir = Path("./output")
    for geojson_file in output_dir.glob("*.geojson"):
        with open(geojson_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            all_features.extend(data['features'])
    
    # Tạo GeoJSON tổng hợp
    combined_geojson = {
        "type": "FeatureCollection",
        "metadata": {
            "name": "Dự án bất động sản ABC",
            "description": "Dữ liệu đã xử lý và chuẩn hóa", 
            "coordinate_system": "WGS84",
            "total_features": len(all_features),
            "created_date": "2025-11-11"
        },
        "features": all_features
    }
    
    # Lưu file cho web
    with open("./web_assets/du_an_abc.geojson", 'w', encoding='utf-8') as f:
        json.dump(combined_geojson, f, ensure_ascii=False, indent=2)
    
    print(f"🌐 Đã tạo dữ liệu web map: {len(all_features)} features")
    return combined_geojson
```

## 🚨 Xử Lý Lỗi

### Lỗi Thường Gặp và Cách Khắc Phục

#### 1. Lỗi Import Dependencies
```bash
# Lỗi: ModuleNotFoundError: No module named 'pyproj'
pip install pyproj

# Lỗi: No module named 'ezdxf'  
pip install ezdxf

# Lỗi toàn bộ dependencies
pip install -r requirements.txt
```

#### 2. Lỗi Chuyển Đổi DWG
```python
# Kiểm tra công cụ chuyển đổi
import shutil

oda_converter = shutil.which("ODAFileConverter")
if not oda_converter:
    print("❌ Cần cài đặt ODA File Converter")
    print("📥 Tải từ: https://www.opendesign.com/guestfiles/oda_file_converter")
else:
    print("✅ ODA File Converter có sẵn")
```

#### 3. Lỗi Tọa Độ
```python
# Kiểm tra EPSG code
try:
    from pyproj import CRS
    
    # Kiểm tra VN-2000 Đà Nẵng
    vn2000_crs = CRS.from_epsg(3405)
    print(f"✅ VN-2000 Zone 48N: {vn2000_crs.name}")
    
    # Kiểm tra WGS84
    wgs84_crs = CRS.from_epsg(4326)  
    print(f"✅ WGS84: {wgs84_crs.name}")
    
except Exception as e:
    print(f"❌ Lỗi hệ tọa độ: {e}")
```

#### 4. Xử Lý File Lớn
```python
# Cấu hình cho file lớn
config = Config()
config.limits.max_file_size = 500 * 1024 * 1024  # 500MB
config.limits.timeout_seconds = 1800              # 30 phút
config.processing['chunk_size'] = 1000             # Xử lý 1000 đối tượng/lần

# Theo dõi tiến trình
import logging
logging.basicConfig(level=logging.INFO)

result = processor.process_file("large_file.dwg", "./output")
```

#### 5. Debug Chi Tiết
```python
# Bật logging chi tiết
from xemgiadat_processors.utils import get_logger, setup_file_logging

setup_file_logging("debug.log", "DEBUG")
logger = get_logger(__name__)

# Xử lý với debug
logger.info("Bắt đầu xử lý file...")
result = processor.process_file("problem_file.dwg")

# Kiểm tra log
with open("debug.log", "r", encoding="utf-8") as f:
    print(f.read())
```

### Kiểm Tra Chất Lượng Kết Quả
```python
def kiem_tra_chat_luong(geojson_file):
    """Kiểm tra chất lượng dữ liệu đầu ra"""
    import json
    
    with open(geojson_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print("🔍 Kiểm tra chất lượng dữ liệu:")
    
    # 1. Số lượng features
    features = data.get('features', [])
    print(f"   📊 Tổng features: {len(features)}")
    
    # 2. Kiểm tra geometry types
    geom_types = {}
    for feature in features:
        geom_type = feature['geometry']['type']
        geom_types[geom_type] = geom_types.get(geom_type, 0) + 1
    
    print("   📐 Loại hình học:")
    for geom_type, count in geom_types.items():
        print(f"      {geom_type}: {count}")
    
    # 3. Kiểm tra tọa độ
    total_coords = 0
    for feature in features:
        coords = feature['geometry']['coordinates']
        if feature['geometry']['type'] == 'Point':
            total_coords += 1
        elif feature['geometry']['type'] == 'LineString':
            total_coords += len(coords)
        elif feature['geometry']['type'] == 'Polygon':
            total_coords += len(coords[0])
    
    print(f"   📍 Tổng điểm tọa độ: {total_coords}")
    
    # 4. Kiểm tra properties
    prop_keys = set()
    for feature in features:
        prop_keys.update(feature['properties'].keys())
    
    print(f"   🏷️ Thuộc tính: {list(prop_keys)}")
    
    return {
        'total_features': len(features),
        'geometry_types': geom_types,
        'total_coordinates': total_coords,
        'property_keys': list(prop_keys)
    }
```

## 📞 Hỗ Trợ Kỹ Thuật

### Liên Hệ
- **Email kỹ thuật**: dev@xemgiadat.com
- **Documentation**: Xem thư mục `docs/`
- **Ví dụ**: Xem thư mục `examples/`

### Báo Cáo Lỗi
Khi báo cáo lỗi, vui lòng cung cấp:
1. **Thông tin hệ thống**: OS, Python version
2. **File input**: Loại file, kích thước
3. **Thông báo lỗi**: Full error message
4. **Cấu hình**: Config settings sử dụng
5. **Log files**: Debug log nếu có

### Đề Xuất Tính Năng
Chúng tôi luôn hoan nghênh đề xuất:
- Hỗ trợ format file mới
- Cải thiện hiệu suất xử lý
- Tích hợp với hệ thống khác
- Tối ưu cho dữ liệu Việt Nam

---

*Hướng dẫn sử dụng Module Xử Lý Dữ Liệu XemGiaDat*  
*Phiên bản 1.0.0 - 11 tháng 11, 2025*