#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Demo Module Xử Lý Dữ Liệu XemGiaDat
Script demo nhanh để kiểm tra tính năng
"""

import sys
import os
from pathlib import Path

# Thêm module path
script_dir = Path(__file__).parent
module_path = script_dir / "src"
sys.path.insert(0, str(module_path))

def demo_co_ban():
    """Demo các tính năng cơ bản"""
    print("=" * 60)
    print("🇻🇳 DEMO MODULE XỬ LÝ DỮ LIỆU XEMGIADAT")
    print("=" * 60)
    
    try:
        # Import và test
        from xemgiadat_processors import DWGProcessor, ImageProcessor, Config, get_logger
        print("✅ Import module thành công!")
        
        # Tạo cấu hình cho Việt Nam
        print("\n📍 Cấu hình cho Đà Nẵng:")
        config = Config()
        config.coordinate_systems.source_vn2000 = "EPSG:3405"  # VN-2000 Zone 48N
        config.coordinate_systems.target_wgs84 = "EPSG:4326"   # WGS84
        
        print(f"   🗺️  Hệ tọa độ nguồn: {config.coordinate_systems.source_vn2000}")
        print(f"   🌍 Hệ tọa độ đích: {config.coordinate_systems.target_wgs84}")
        print(f"   📐 Dung sai hình học: {config.quality.geometry_tolerance}m")
        print(f"   🎯 Độ chính xác: {config.quality.coordinate_precision} số thập phân")
        
        # Test logger
        logger = get_logger("demo")
        logger.info("Logger hoạt động bình thường")
        print("✅ System logging OK!")
        
        # Test processors
        print("\n🔧 Khởi tạo processors:")
        dwg_processor = DWGProcessor(config)
        img_processor = ImageProcessor(config)
        print("✅ DWG Processor sẵn sàng")
        print("✅ Image Processor sẵn sàng")
        
        # Test statistics
        stats = dwg_processor.get_statistics()
        print(f"\n📊 Thống kê ban đầu: {stats}")
        
        return True
        
    except ImportError as e:
        print(f"❌ Lỗi import: {e}")
        print("💡 Giải pháp:")
        print("   1. cd data-processing-module")
        print("   2. pip install -r requirements.txt")
        return False
        
    except Exception as e:
        print(f"❌ Lỗi khác: {e}")
        return False

def demo_xu_ly_dwg():
    """Demo xử lý file DWG giả lập"""
    print("\n" + "=" * 60)
    print("📐 DEMO XỬ LÝ FILE DWG/DXF")
    print("=" * 60)
    
    try:
        from xemgiadat_processors import DWGProcessor, Config
        
        config = Config()
        processor = DWGProcessor(config)
        
        print("🏗️ Mô phỏng xử lý file DWG dự án bất động sản:")
        print("   📁 File: 'du_an_danang_phan_lo.dwg'")
        print("   📍 Vị trí: Đà Nẵng, Việt Nam")
        print("   📏 Tọa độ: VN-2000 Zone 48N → WGS84")
        
        # Mock result
        mock_result = {
            'success': True,
            'input_file': 'du_an_danang_phan_lo.dwg',
            'output_file': 'du_an_danang_phan_lo_processed.geojson',
            'geometries_count': 156,
            'metadata': {
                'coordinate_system': 'WGS84',
                'feature_types': {
                    'Polygon': 120,    # Lô đất
                    'LineString': 30,  # Đường giao thông
                    'Point': 6         # Điểm khống chế
                },
                'processing_time': '12.3 seconds',
                'quality_score': 0.98
            }
        }
        
        print(f"\n🎉 Kết quả xử lý (mô phỏng):")
        print(f"   ✅ Trạng thái: {'Thành công' if mock_result['success'] else 'Thất bại'}")
        print(f"   📊 Tổng đối tượng: {mock_result['geometries_count']}")
        print(f"   🏠 Polygon (lô đất): {mock_result['metadata']['feature_types']['Polygon']}")
        print(f"   🛣️  LineString (đường): {mock_result['metadata']['feature_types']['LineString']}")
        print(f"   📍 Point (điểm khống chế): {mock_result['metadata']['feature_types']['Point']}")
        print(f"   ⏱️  Thời gian: {mock_result['metadata']['processing_time']}")
        print(f"   🎯 Điểm chất lượng: {mock_result['metadata']['quality_score']*100:.1f}%")
        
        return True
        
    except Exception as e:
        print(f"❌ Lỗi demo DWG: {e}")
        return False

def demo_xu_ly_image():
    """Demo xử lý hình ảnh"""
    print("\n" + "=" * 60)
    print("🖼️ DEMO XỬ LÝ HÌNH ẢNH")
    print("=" * 60)
    
    try:
        from xemgiadat_processors import ImageProcessor, Config
        
        config = Config()
        processor = ImageProcessor(config)
        
        print("📷 Mô phỏng xử lý site plan:")
        print("   📁 File: 'site_plan_resort_danang.png'")
        print("   📍 Tọa độ: 108.2020°E, 16.0540°N (Đà Nẵng)")
        print("   🗺️  Geo-reference: Tự động từ world file")
        
        # Tạo geo-reference demo
        geo_ref = processor.create_geo_reference(
            bounds=[108.2020, 16.0540, 108.2040, 16.0560],
            crs="EPSG:4326"
        )
        
        print(f"\n🗺️ Thông tin geo-reference:")
        print(f"   📍 Bounds: {geo_ref['bounds']}")
        print(f"   🌍 CRS: {geo_ref['crs']}")
        print(f"   📅 Ngày tạo: {geo_ref['created_date']}")
        
        # Mock result
        mock_result = {
            'success': True,
            'processed_image': 'site_plan_resort_danang_processed.png',
            'geojson_file': 'site_plan_resort_danang_features.geojson',
            'features_count': 8,
            'metadata': {
                'image_properties': {
                    'format': '.png',
                    'size_bytes': 2456789,
                    'dimensions': '2048x1536'
                },
                'enhancements': ['contrast +20%', 'sharpness +15%', 'noise reduction'],
                'feature_types': {
                    'image_bounds': 1,
                    'buildings': 5,
                    'roads': 2
                }
            }
        }
        
        print(f"\n🎉 Kết quả xử lý (mô phỏng):")
        print(f"   ✅ Hình ảnh xử lý: {mock_result['processed_image']}")
        print(f"   📊 Features trích xuất: {mock_result['features_count']}")
        print(f"   📐 Kích thước: {mock_result['metadata']['image_properties']['dimensions']}")
        print(f"   💾 Dung lượng: {mock_result['metadata']['image_properties']['size_bytes']:,} bytes")
        print(f"   ✨ Cải thiện: {', '.join(mock_result['metadata']['enhancements'])}")
        
        return True
        
    except Exception as e:
        print(f"❌ Lỗi demo Image: {e}")
        return False

def demo_command_line():
    """Demo command line interface"""
    print("\n" + "=" * 60)
    print("💻 DEMO COMMAND LINE INTERFACE")
    print("=" * 60)
    
    print("🖥️ Các lệnh CLI có thể sử dụng:")
    print()
    
    commands = [
        {
            'title': '1. Xử lý file DWG đơn',
            'command': 'python -m xemgiadat_processors.cli.main process-dwg du_an.dwg --output ./ket_qua',
            'description': 'Xử lý file DWG và xuất ra GeoJSON'
        },
        {
            'title': '2. Xử lý hình ảnh với tọa độ',
            'command': 'python -m xemgiadat_processors.cli.main process-image site_plan.png --bounds 108.20 16.05 108.21 16.06',
            'description': 'Xử lý ảnh với geo-reference tọa độ Đà Nẵng'
        },
        {
            'title': '3. Xử lý hàng loạt',
            'command': 'python -m xemgiadat_processors.cli.main batch-process --input-dir ./raw --output-dir ./processed --recursive',
            'description': 'Xử lý tất cả file trong thư mục'
        },
        {
            'title': '4. Tạo file cấu hình',
            'command': 'python -m xemgiadat_processors.cli.main config --generate --output config_danang.json',
            'description': 'Tạo file cấu hình mẫu cho Đà Nẵng'
        }
    ]
    
    for cmd in commands:
        print(f"🔸 {cmd['title']}:")
        print(f"   💡 {cmd['description']}")
        print(f"   ⌨️  {cmd['command']}")
        print()
    
    print("📝 Lưu ý: Thay đổi đường dẫn file theo môi trường thực tế của bạn")

def demo_ket_luan():
    """Kết luận demo"""
    print("\n" + "=" * 60)
    print("🎯 KẾT LUẬN & HƯỚNG DẪN TIẾP THEO")
    print("=" * 60)
    
    print("✅ Module xử lý dữ liệu XemGiaDat đã sẵn sàng!")
    print()
    print("📚 Tài liệu chi tiết:")
    print("   📖 HUONG_DAN_SU_DUNG.md - Hướng dẫn đầy đủ")
    print("   📋 README.md - Tài liệu tổng quan")
    print("   🏗️ ARCHITECTURE_MIGRATION_COMPLETE.md - Kiến trúc hệ thống")
    print()
    print("🚀 Các bước tiếp theo:")
    print("   1️⃣ Cài đặt dependencies: pip install -r requirements.txt")
    print("   2️⃣ Test với file thực: python examples/example_workflow.py")
    print("   3️⃣ Tích hợp vào project chính của bạn")
    print("   4️⃣ Tùy chỉnh cấu hình cho region cụ thể")
    print()
    print("🆘 Hỗ trợ:")
    print("   📧 Email: dev@xemgiadat.com")
    print("   📁 Examples: Xem thư mục examples/")
    print("   🐛 Báo lỗi: GitHub issues")
    print()
    print("🇻🇳 Được tối ưu cho dữ liệu bất động sản Việt Nam!")

def main():
    """Chạy demo hoàn chỉnh"""
    
    print("🚀 Khởi động demo...")
    
    # Test cơ bản
    if not demo_co_ban():
        print("\n❌ Demo dừng do lỗi import. Vui lòng cài đặt dependencies trước.")
        return
    
    # Demo các tính năng
    demo_xu_ly_dwg()
    demo_xu_ly_image() 
    demo_command_line()
    demo_ket_luan()
    
    print("\n🎉 Demo hoàn tất! Cảm ơn bạn đã sử dụng XemGiaDat Data Processing Module!")

if __name__ == "__main__":
    main()