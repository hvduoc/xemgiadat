"""
Enhanced Euro Village Processing Script
Kịch bản xử lý nâng cao với Computer Vision
"""

import os
import sys
from pathlib import Path

# Add module to path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir / "data-processing-module" / "src"))

def test_advanced_processing():
    """Test script để thử nghiệm advanced processing"""
    
    print("="*70)
    print("🔬 KIỂM TRA ADVANCED IMAGE PROCESSING")
    print("="*70)
    
    try:
        # Import advanced modules
        import cv2
        import numpy as np
        from skimage import segmentation
        print("✅ OpenCV và scikit-image đã sẵn sàng")
        
        # Test load image
        from PIL import Image
        sample_image = "sample-data/images/Euro-village-2.jpg"
        
        if Path(sample_image).exists():
            print(f"✅ Tìm thấy ảnh test: {sample_image}")
            
            # Test image loading
            img = Image.open(sample_image)
            img_array = np.array(img)
            print(f"✅ Ảnh đã load: {img_array.shape}")
            
            # Test computer vision
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            edges = cv2.Canny(gray, 50, 150)
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            print(f"✅ Phát hiện {len(contours)} contours")
            
            # Test segmentation
            segments = segmentation.slic(img_array, n_segments=50, compactness=10)
            print(f"✅ Phân đoạn thành {len(np.unique(segments))} regions")
            
            print("\n🎯 COMPUTER VISION READY - Có thể xử lý chi tiết!")
            return True
            
        else:
            print(f"❌ Không tìm thấy ảnh: {sample_image}")
            return False
            
    except ImportError as e:
        print(f"❌ Missing library: {e}")
        print("Cài đặt bằng: pip install opencv-python scikit-image")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def run_advanced_euro_village():
    """Chạy xử lý nâng cao Euro Village"""
    
    print("\n" + "="*70)
    print("🚀 EURO VILLAGE 2 - ADVANCED PROCESSING")
    print("="*70)
    
    try:
        from xemgiadat_processors import Config, get_logger
        from xemgiadat_processors.core.advanced_image_processor import AdvancedImageProcessor
        
        # Setup
        config = Config()
        logger = get_logger("advanced_euro_village")
        
        # Tạo processor nâng cao
        processor = AdvancedImageProcessor(config)
        
        # Đặt geo-reference cho Euro Village 2 (Đà Nẵng)
        geo_ref = {
            'bounds': [108.15, 16.0, 108.18, 16.03],  # Tọa độ Đà Nẵng
            'crs': 'EPSG:4326',
            'type': 'manual'
        }
        
        # Xử lý ảnh
        image_file = "sample-data/images/Euro-village-2.jpg"
        
        if Path(image_file).exists():
            print(f"📷 Xử lý ảnh: {image_file}")
            
            result = processor.process_file(
                file_path=image_file,
                output_dir="sample-data/output",
                geo_reference=geo_ref
            )
            
            if result['success']:
                print(f"✅ Thành công! Phát hiện {result['features_count']} đối tượng")
                print(f"📁 Kết quả tại: {result['geojson_file']}")
                
                # Hiển thị thống kê chi tiết
                if result['metadata']:
                    stats = result['metadata'].get('feature_statistics', {})
                    by_type = stats.get('by_type', {})
                    
                    print(f"\n📊 CHI TIẾT CÁC ĐỐI TƯỢNG:")
                    for obj_type, count in by_type.items():
                        print(f"   🏗️ {obj_type}: {count}")
                
                return True
            else:
                print(f"❌ Lỗi: {result['error']}")
                return False
        else:
            print(f"❌ Không tìm thấy file: {image_file}")
            return False
            
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Đảm bảo đã cài đặt: pip install opencv-python scikit-image")
        return False
    except Exception as e:
        print(f"❌ Processing error: {e}")
        return False

if __name__ == "__main__":
    print("🔥 EURO VILLAGE ADVANCED PROCESSING")
    print("Phân tích chi tiết với Computer Vision")
    
    # Test libraries
    if test_advanced_processing():
        print("\n" + "🚀"*20)
        
        # Run advanced processing
        success = run_advanced_euro_village()
        
        if success:
            print("\n✅ HOÀN TẤT! Kiểm tra thư mục sample-data/output/")
            print("📂 Mở Explorer: explorer sample-data\\output")
        else:
            print("\n❌ Có lỗi xảy ra trong quá trình xử lý")
    else:
        print("\n❌ Chưa thể sử dụng advanced processing")
        print("Hãy cài đặt thêm libraries cần thiết")