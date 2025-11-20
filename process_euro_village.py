#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script Xử Lý Dự Án Euro Village 2
Xử lý tự động file DWG và hình ảnh cho dự án bất động sản
"""

import os
import sys
from pathlib import Path
import json

# Add module path
script_dir = Path(__file__).parent
module_path = script_dir / "data-processing-module" / "src"
sys.path.insert(0, str(module_path))

def kiem_tra_file():
    """Kiểm tra file input có tồn tại không"""
    print("🔍 Kiểm tra file đầu vào...")
    
    files_to_check = [
        "sample-data/dwg-files/euro-village-2.dwg",
        "sample-data/images/euro-village-2.jpg",
        "sample-data/images/euro-village-2.png",  # Alternative formats
        "sample-data/images/euro-village-2.jpeg"
    ]
    
    found_files = []
    for file_path in files_to_check:
        if Path(file_path).exists():
            found_files.append(file_path)
            size = Path(file_path).stat().st_size
            print(f"   ✅ {file_path} ({size:,} bytes)")
        else:
            print(f"   ❌ {file_path} (không tìm thấy)")
    
    return found_files

def tao_thu_muc():
    """Tạo cấu trúc thư mục cần thiết"""
    print("📁 Tạo cấu trúc thư mục...")
    
    dirs = [
        'sample-data/dwg-files',
        'sample-data/images', 
        'sample-data/output/geojson',
        'sample-data/output/processed-images',
        'sample-data/output/metadata'
    ]
    
    for dir_path in dirs:
        Path(dir_path).mkdir(parents=True, exist_ok=True)
        print(f"   📂 {dir_path}")
    
    print("✅ Cấu trúc thư mục đã sẵn sàng")

def xu_ly_euro_village_2():
    """Xử lý dự án Euro Village 2"""
    print("\n" + "="*60)
    print("🏠 XỬ LÝ DỰ ÁN EURO VILLAGE 2")
    print("="*60)
    
    try:
        from xemgiadat_processors import DWGProcessor, ImageProcessor, Config, get_logger
        
        # Setup logger
        logger = get_logger("euro_village")
        
        # Cấu hình cho Đà Nẵng
        config = Config()
        config.coordinate_systems.source_vn2000 = "EPSG:3405"  # VN-2000 Zone 48N
        config.coordinate_systems.target_wgs84 = "EPSG:4326"   # WGS84
        
        print(f"📍 Hệ tọa độ: {config.coordinate_systems.source_vn2000} → {config.coordinate_systems.target_wgs84}")
        
        # Khởi tạo processors
        dwg_processor = DWGProcessor(config)
        
        # 🚀 SỬ DỤNG ADVANCED PROCESSOR CHO KẾT QUẢ TỐT HƠN
        try:
            import sys
            sys.path.append('data-processing-module/src')
            from xemgiadat_processors.core.advanced_image_processor import AdvancedImageProcessor
            img_processor = AdvancedImageProcessor(config)
            print("✅ Sử dụng Advanced Image Processor với Computer Vision")
        except ImportError as e:
            print(f"⚠️  Advanced libraries chưa cài ({e}), sử dụng basic processor")
            img_processor = ImageProcessor(config)
        
        results = {}
        total_objects = 0
        
        # 1. Xử lý file DWG
        dwg_files = list(Path("sample-data/dwg-files").glob("*.dwg")) + \
                   list(Path("sample-data/dwg-files").glob("*.dxf"))
        
        if dwg_files:
            print(f"\n🏗️ Xử lý {len(dwg_files)} file DWG/DXF...")
            for dwg_file in dwg_files:
                print(f"   📐 Xử lý: {dwg_file.name}")
                try:
                    dwg_result = dwg_processor.process_file(
                        str(dwg_file), 
                        "sample-data/output"
                    )
                    results[f'dwg_{dwg_file.stem}'] = dwg_result
                    
                    if dwg_result['success']:
                        print(f"      ✅ {dwg_result['geometries_count']} đối tượng hình học")
                        print(f"      📄 GeoJSON: {Path(dwg_result['output_file']).name}")
                        total_objects += dwg_result['geometries_count']
                    else:
                        print(f"      ❌ Lỗi: {dwg_result['error']}")
                        
                except Exception as e:
                    print(f"      ❌ Exception: {e}")
        else:
            print("⚠️ Không tìm thấy file DWG/DXF")
        
        # 2. Xử lý hình ảnh
        image_files = []
        for ext in ['*.jpg', '*.jpeg', '*.png', '*.tif', '*.tiff']:
            image_files.extend(list(Path("sample-data/images").glob(ext)))
        
        if image_files:
            print(f"\n🖼️ Xử lý {len(image_files)} file hình ảnh...")
            
            # Tạo geo-reference cho Euro Village 2 (tọa độ ước tính Đà Nẵng)
            geo_ref = img_processor.create_geo_reference(
                bounds=[
                    108.150, 16.000,  # Góc tây nam 
                    108.180, 16.030   # Góc đông bắc
                ],
                crs="EPSG:4326"
            )
            
            print(f"   🗺️ Geo-reference: {geo_ref['bounds']} ({geo_ref['crs']})")
            
            for img_file in image_files:
                print(f"   🖼️ Xử lý: {img_file.name}")
                try:
                    img_result = img_processor.process_file(
                        str(img_file),
                        "sample-data/output",
                        geo_reference=geo_ref
                    )
                    results[f'image_{img_file.stem}'] = img_result
                    
                    if img_result['success']:
                        features = img_result['features_count']
                        print(f"      ✅ {features} features")
                        print(f"      📷 Enhanced: {Path(img_result['processed_image']).name}")
                        if img_result['geojson_file']:
                            print(f"      📍 GeoJSON: {Path(img_result['geojson_file']).name}")
                        total_objects += features
                    else:
                        print(f"      ❌ Lỗi: {img_result['error']}")
                        
                except Exception as e:
                    print(f"      ❌ Exception: {e}")
        else:
            print("⚠️ Không tìm thấy file hình ảnh")
        
        # 3. Tạo báo cáo tổng kết
        print(f"\n📊 BÁO CÁO TỔNG KẾT EURO VILLAGE 2:")
        print("="*50)
        
        successful_files = len([r for r in results.values() if r.get('success', False)])
        total_files = len(results)
        
        print(f"📈 Thống kê xử lý:")
        print(f"   ✅ Files thành công: {successful_files}/{total_files}")
        print(f"   🎯 Tổng đối tượng: {total_objects}")
        print(f"   📁 Thư mục kết quả: sample-data/output/")
        
        print(f"\n📋 Chi tiết từng file:")
        for key, result in results.items():
            status = "✅" if result.get('success', False) else "❌"
            if result.get('success', False):
                count = result.get('geometries_count', result.get('features_count', 0))
                print(f"   {status} {key}: {count} objects")
            else:
                print(f"   {status} {key}: {result.get('error', 'Unknown error')}")
        
        # 4. Lưu báo cáo JSON
        report = {
            'project_name': 'Euro Village 2',
            'processing_date': '2025-11-11',
            'total_files': total_files,
            'successful_files': successful_files,
            'total_objects': total_objects,
            'coordinate_system': f"{config.coordinate_systems.source_vn2000} → {config.coordinate_systems.target_wgs84}",
            'results': results
        }
        
        report_file = Path("sample-data/output/euro_village_2_report.json")
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        
        print(f"\n💾 Báo cáo đã lưu: {report_file}")
        
        # 5. Hướng dẫn sử dụng kết quả
        print(f"\n🎯 CÁCH SỬ DỤNG KẾT QUẢ:")
        print("="*40)
        print("📄 Các file GeoJSON có thể:")
        print("   1. Tải lên XemGiaDat.com qua Project Map Integration")
        print("   2. Sử dụng trong QGIS, ArcGIS")
        print("   3. Hiển thị trên Leaflet, Google Maps")
        print("   4. Import vào cơ sở dữ liệu PostGIS")
        
        print("\n🖼️ Hình ảnh đã xử lý:")
        print("   - Chất lượng được cải thiện")
        print("   - Có thông tin geo-reference")
        print("   - Sẵn sàng hiển thị trên web")
        
        return results
        
    except ImportError as e:
        print(f"❌ Lỗi import module: {e}")
        print("💡 Giải pháp:")
        print("   1. cd data-processing-module")
        print("   2. pip install -r requirements.txt")
        return None
        
    except Exception as e:
        print(f"❌ Lỗi không mong đợi: {e}")
        return None

def huong_dan_copy_file():
    """Hướng dẫn copy file vào đúng vị trí"""
    print("\n📋 HƯỚNG DẪN COPY FILE:")
    print("="*40)
    print("1. File DWG/DXF → copy vào: sample-data/dwg-files/")
    print("   Ví dụ: euro-village-2.dwg")
    print()
    print("2. File hình ảnh → copy vào: sample-data/images/")
    print("   Ví dụ: euro-village-2.jpg, site-plan.png")
    print()
    print("3. Chạy lại script này để xử lý")
    print()
    print("💻 Command copy (Windows):")
    print('   copy "euro-village-2.dwg" "sample-data\\dwg-files\\"')
    print('   copy "euro-village-2.jpg" "sample-data\\images\\"')
    print()
    print("🐧 Command copy (Linux/Mac):")
    print('   cp "euro-village-2.dwg" "sample-data/dwg-files/"')
    print('   cp "euro-village-2.jpg" "sample-data/images/"')

def main():
    """Main function"""
    print("🏠 EURO VILLAGE 2 - DATA PROCESSING")
    print("="*50)
    print("🇻🇳 Module Xử Lý Dữ Liệu XemGiaDat")
    print("📍 Chuyên xử lý dữ liệu bất động sản Việt Nam")
    print()
    
    # Tạo thư mục
    tao_thu_muc()
    
    # Kiểm tra file
    found_files = kiem_tra_file()
    
    if not found_files:
        print("\n⚠️ Không tìm thấy file để xử lý!")
        huong_dan_copy_file()
        return
    
    print(f"\n✅ Tìm thấy {len(found_files)} file để xử lý")
    
    # Xử lý files
    results = xu_ly_euro_village_2()
    
    if results:
        print("\n🎉 Xử lý hoàn tất! Kiểm tra thư mục sample-data/output/ để xem kết quả")
    else:
        print("\n❌ Xử lý thất bại. Vui lòng kiểm tra lại cài đặt module")

if __name__ == "__main__":
    main()