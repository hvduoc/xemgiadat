#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Quick Test - Xử Lý File Ảnh Euro Village 2
Test nhanh với file ảnh có sẵn từ attachments
"""

import sys
from pathlib import Path
import base64

# Add module path
script_dir = Path(__file__).parent
module_path = script_dir / "data-processing-module" / "src"
sys.path.insert(0, str(module_path))

def test_voi_file_anh():
    """Test với file ảnh Euro Village 2 hiện có"""
    print("🖼️ QUICK TEST - XỬ LÝ HÌNH ẢNH EURO VILLAGE 2")
    print("="*60)
    
    try:
        from xemgiadat_processors import ImageProcessor, Config, get_logger
        
        # Setup
        config = Config()
        processor = ImageProcessor(config)
        logger = get_logger("quick_test")
        
        print("✅ Module import thành công!")
        print(f"📍 Hệ tọa độ: {config.coordinate_systems.source_vn2000} → {config.coordinate_systems.target_wgs84}")
        
        # Tạo geo-reference cho Euro Village 2
        # Từ hình ảnh thấy đây là dự án tại Đà Nẵng
        geo_ref = processor.create_geo_reference(
            bounds=[
                108.150, 16.000,  # Tây Nam (Long, Lat)
                108.180, 16.030   # Đông Bắc (Long, Lat)
            ],
            crs="EPSG:4326"
        )
        
        print(f"🗺️ Geo-reference tạo thành công:")
        print(f"   📍 Bounds: {geo_ref['bounds']}")
        print(f"   🌍 CRS: {geo_ref['crs']}")
        print(f"   📅 Created: {geo_ref['created_date']}")
        
        # Kiểm tra file ảnh có sẵn
        possible_images = [
            "sample-data/images/euro-village-2.jpg",
            "euro-village-2.jpg", 
            "Euro-Village-2.jpg",
            "sample-data/images/euro-village-2.png"
        ]
        
        image_file = None
        for img_path in possible_images:
            if Path(img_path).exists():
                image_file = img_path
                break
        
        if image_file:
            print(f"📷 Tìm thấy file: {image_file}")
            size = Path(image_file).stat().st_size
            print(f"📊 Kích thước: {size:,} bytes")
            
            # Xử lý file
            print("\n🚀 Bắt đầu xử lý...")
            result = processor.process_file(
                image_file,
                "sample-data/output",
                geo_reference=geo_ref
            )
            
            # Hiển thị kết quả
            if result['success']:
                print("\n🎉 XỬ LÝ THÀNH CÔNG!")
                print("="*40)
                print(f"✅ File gốc: {result['input_file']}")
                print(f"📸 Hình xử lý: {result['processed_image']}")
                print(f"🎯 Features: {result['features_count']}")
                print(f"📄 Metadata: {result['metadata_file']}")
                
                if result['geojson_file']:
                    print(f"📍 GeoJSON: {result['geojson_file']}")
                
                # Chi tiết metadata
                metadata = result['metadata']
                print(f"\n📊 Chi tiết xử lý:")
                print(f"   🖼️ Format: {metadata['image_properties']['format']}")
                print(f"   💾 Size: {metadata['image_properties']['size_bytes']:,} bytes") 
                print(f"   ✅ Geo-referenced: {metadata['processing_summary']['geo_referenced']}")
                
                print(f"\n🎯 Cách sử dụng kết quả:")
                print(f"   1. Hình ảnh đã xử lý: {result['processed_image']}")
                print(f"      → Chất lượng được cải thiện, sẵn sàng hiển thị")
                print(f"   2. Metadata: {result['metadata_file']}")
                print(f"      → Thông tin chi tiết về quá trình xử lý")
                
                if result['geojson_file']:
                    print(f"   3. GeoJSON: {result['geojson_file']}")
                    print(f"      → Import vào QGIS, Leaflet, Google Maps")
                
            else:
                print(f"\n❌ XỬ LÝ THẤT BẠI: {result['error']}")
                
        else:
            print("❌ Không tìm thấy file ảnh!")
            print("\n💡 Hướng dẫn:")
            print("1. Copy file ảnh Euro Village 2 vào:")
            print("   - sample-data/images/euro-village-2.jpg")
            print("   - Hoặc để cùng thư mục với script này")
            print("\n2. Chạy lại script:")
            print("   python quick_test.py")
            
        return True
        
    except ImportError as e:
        print(f"❌ Lỗi import: {e}")
        print("\n💡 Giải pháp:")
        print("1. cd data-processing-module")
        print("2. pip install -r requirements.txt")
        print("3. Chạy lại: python quick_test.py")
        return False
        
    except Exception as e:
        print(f"❌ Lỗi: {e}")
        return False

def tao_sample_geojson():
    """Tạo sample GeoJSON từ Euro Village 2"""
    print("\n📍 TẠO SAMPLE GEOJSON EURO VILLAGE 2")
    print("="*50)
    
    # Dựa vào hình ảnh, tạo sample data cho các block
    sample_geojson = {
        "type": "FeatureCollection",
        "metadata": {
            "name": "Euro Village 2 - Sample Data",
            "description": "Dữ liệu mẫu từ site plan Euro Village 2",
            "location": "Đà Nẵng, Việt Nam",
            "coordinate_system": "WGS84",
            "created_date": "2025-11-11",
            "data_source": "Site plan image processing"
        },
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "name": "Block B2.17",
                    "type": "residential_block",
                    "description": "Khu biệt thự Block B2.17",
                    "lots_count": 20,
                    "area_sqm": 8500
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [108.165, 16.015],
                        [108.175, 16.015], 
                        [108.175, 16.025],
                        [108.165, 16.025],
                        [108.165, 16.015]
                    ]]
                }
            },
            {
                "type": "Feature", 
                "properties": {
                    "name": "Công Viên Số 1",
                    "type": "park",
                    "description": "Công viên trung tâm dự án",
                    "area_sqm": 2000
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [108.160, 16.008],
                        [108.170, 16.008],
                        [108.170, 16.012], 
                        [108.160, 16.012],
                        [108.160, 16.008]
                    ]]
                }
            },
            {
                "type": "Feature",
                "properties": {
                    "name": "Đường Chính",
                    "type": "main_road", 
                    "description": "Đường giao thông chính dự án",
                    "width_m": 12
                },
                "geometry": {
                    "type": "LineString",
                    "coordinates": [
                        [108.155, 16.005],
                        [108.155, 16.020],
                        [108.170, 16.020],
                        [108.170, 16.030]
                    ]
                }
            }
        ]
    }
    
    # Lưu sample GeoJSON
    import json
    Path("sample-data/output").mkdir(parents=True, exist_ok=True)
    sample_file = Path("sample-data/output/euro_village_2_sample.geojson")
    
    with open(sample_file, 'w', encoding='utf-8') as f:
        json.dump(sample_geojson, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Sample GeoJSON tạo thành công: {sample_file}")
    print(f"📊 Features: {len(sample_geojson['features'])}")
    print("   - 1 Block biệt thự (B2.17)")
    print("   - 1 Công viên")
    print("   - 1 Đường giao thông chính")
    print()
    print("🌐 Có thể sử dụng để:")
    print("   - Test hiển thị trên bản đồ")
    print("   - Import vào QGIS")
    print("   - Demo cho Project Map Integration")
    
    return sample_file

def main():
    """Main function"""
    print("🚀 QUICK TEST - EURO VILLAGE 2")
    print("="*40)
    
    # Tạo thư mục output nếu chưa có
    Path("sample-data/output").mkdir(parents=True, exist_ok=True)
    
    # Test xử lý ảnh
    success = test_voi_file_anh()
    
    # Tạo sample GeoJSON
    tao_sample_geojson()
    
    if success:
        print("\n🎉 QUICK TEST HOÀN TẤT!")
        print("📁 Kiểm tra kết quả tại: sample-data/output/")
    else:
        print("\n⚠️ Cần cài đặt dependencies trước khi chạy test")

if __name__ == "__main__":
    main()