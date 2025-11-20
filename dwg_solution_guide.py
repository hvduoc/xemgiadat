"""
QUICK DWG SOLUTION - Euro Village Professional Processing
Giải pháp nhanh cho production DWG processing
"""

import sys
from pathlib import Path
import json
import subprocess
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_dwg_converters():
    """Check available DWG conversion tools"""
    print("🔍 KIỂM TRA CÁC TOOL CHUYỂN ĐỔI DWG:")
    print("="*50)
    
    tools = []
    
    # Check ODA File Converter
    oda_paths = [
        r"C:\Program Files\ODA\OdaFileConverter.exe",
        r"C:\Program Files (x86)\ODA\OdaFileConverter.exe"
    ]
    
    for path in oda_paths:
        if Path(path).exists():
            tools.append(("ODA File Converter", path))
            print(f"✅ ODA File Converter: {path}")
            break
    else:
        print("❌ ODA File Converter: Chưa cài đặt")
        print("   📥 Download: https://www.opendesign.com/guestfiles/oda_file_converter")
    
    # Check FreeCAD
    freecad_paths = [
        r"C:\Program Files\FreeCAD 0.21\bin\FreeCAD.exe",
        r"C:\Program Files\FreeCAD\bin\FreeCAD.exe",
        r"C:\Users\{}\AppData\Local\Programs\FreeCAD\bin\FreeCAD.exe".format(Path.home().name)
    ]
    
    for path in freecad_paths:
        if Path(path).exists():
            tools.append(("FreeCAD", path))
            print(f"✅ FreeCAD: {path}")
            break
    else:
        print("❌ FreeCAD: Chưa cài đặt")
        print("   📥 Download: https://www.freecad.org/downloads.php")
    
    # Check LibreDWG
    try:
        result = subprocess.run(['dwg2dxf', '--version'], capture_output=True, text=True)
        tools.append(("LibreDWG", "dwg2dxf"))
        print("✅ LibreDWG: Available")
    except FileNotFoundError:
        print("❌ LibreDWG: Chưa cài đặt")
        print("   📦 Install: choco install libredwg")
    
    return tools

def manual_dwg_conversion_guide():
    """Hướng dẫn chuyển đổi DWG thủ công"""
    print("\n🛠️  HƯỚNG DẪN CHUYỂN ĐỔI DWG THỦ CÔNG:")
    print("="*50)
    print()
    
    print("📋 OPTION 1: Sử dụng AutoCAD/BricsCAD (Nếu có)")
    print("   1. Mở file: sample-data/dwg-files/Cap dien ho ga.dwg")
    print("   2. Command: DXFOUT")
    print("   3. Save as: sample-data/dwg-files/Cap dien ho ga.dxf")
    print("   4. Format: AutoCAD 2018 DXF")
    print()
    
    print("📋 OPTION 2: Online Converter (CloudConvert)")
    print("   1. Visit: https://cloudconvert.com/dwg-to-dxf")
    print("   2. Upload: sample-data/dwg-files/Cap dien ho ga.dwg")
    print("   3. Convert to DXF format") 
    print("   4. Download và save vào: sample-data/dwg-files/")
    print()
    
    print("📋 OPTION 3: QGIS (Miễn phí)")
    print("   1. Download QGIS: https://qgis.org/")
    print("   2. Install plugin: 'Another DXF Importer'")
    print("   3. Import DWG → Export as DXF")
    print("   4. Save vào sample-data/dwg-files/")
    print()
    
    print("📋 OPTION 4: LibreCAD (Miễn phí)")
    print("   1. Download: https://librecad.org/")
    print("   2. Open DWG file")
    print("   3. File → Export → DXF format")
    print("   4. Save vào sample-data/dwg-files/")

def check_for_dxf():
    """Kiểm tra xem đã có file DXF chưa"""
    dwg_dir = Path("sample-data/dwg-files")
    dxf_files = list(dwg_dir.glob("*.dxf"))
    
    print(f"\n🔍 KIỂM TRA FILE DXF:")
    print("="*30)
    
    if dxf_files:
        print(f"✅ Tìm thấy {len(dxf_files)} file DXF:")
        for dxf in dxf_files:
            size_mb = dxf.stat().st_size / 1024 / 1024
            print(f"   📄 {dxf.name} ({size_mb:.1f} MB)")
        return True
    else:
        print("❌ Chưa có file DXF")
        print("💡 Cần chuyển đổi DWG → DXF trước")
        return False

def process_existing_dxf():
    """Xử lý các file DXF đã có"""
    print(f"\n🚀 PROCESSING EXISTING DXF FILES:")
    print("="*40)
    
    # Install ezdxf if needed
    try:
        import ezdxf
        print("✅ ezdxf library available")
    except ImportError:
        print("📦 Installing ezdxf...")
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'ezdxf'])
        import ezdxf
    
    # Run DXF processing
    try:
        exec(open('process_dwg_professional.py').read())
        return True
    except Exception as e:
        print(f"❌ Processing error: {e}")
        return False

def create_sample_dxf():
    """Tạo file DXF sample để demo"""
    print("\n🎨 CREATING SAMPLE DXF FOR DEMO:")
    print("="*35)
    
    try:
        import ezdxf
        from ezdxf.math import Vec3
        
        # Create new DXF document
        doc = ezdxf.new('R2010')
        msp = doc.modelspace()
        
        # Add sample Euro Village geometry
        print("📐 Tạo geometry sample...")
        
        # Sample building (rectangle)
        building = [(0, 0), (20, 0), (20, 15), (0, 15), (0, 0)]
        msp.add_lwpolyline(building, close=True, dxfattribs={'layer': 'BUILDINGS'})
        
        # Sample road (polyline)
        road = [(25, 0), (25, 30), (45, 30)]
        msp.add_lwpolyline(road, dxfattribs={'layer': 'ROADS'})
        
        # Sample utilities
        msp.add_circle(Vec3(10, 10, 0), 2, dxfattribs={'layer': 'UTILITIES'})
        msp.add_circle(Vec3(35, 15, 0), 1.5, dxfattribs={'layer': 'UTILITIES'})
        
        # Add text
        msp.add_text('EURO VILLAGE 2', height=2, dxfattribs={'layer': 'TEXT'}).set_pos(Vec3(5, 20, 0))
        
        # Save sample DXF
        output_path = Path("sample-data/dwg-files/euro_village_sample.dxf")
        doc.saveas(output_path)
        
        print(f"✅ Created sample DXF: {output_path.name}")
        print("🎯 Bây giờ có thể test processing workflow!")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creating sample: {e}")
        return False

def main():
    """Main function"""
    print("🏗️ EURO VILLAGE DWG PROCESSING SOLUTION")
    print("="*50)
    print("🎯 Production-ready DWG processing cho bất động sản")
    print()
    
    # Check available tools
    available_tools = check_dwg_converters()
    
    # Check for existing DXF
    has_dxf = check_for_dxf()
    
    if has_dxf:
        # Process existing DXF files
        print("\n🚀 XỬ LÝ FILE DXF ĐÃ CÓ...")
        success = process_existing_dxf()
        
        if success:
            print("\n✅ PROCESSING COMPLETED!")
            print("📁 Check results in: sample-data/output/")
        else:
            print("\n❌ Processing failed")
            
    elif not available_tools:
        # No conversion tools available
        print("\n⚠️  KHÔNG CÓ TOOL CHUYỂN ĐỔI NÀO!")
        print()
        manual_dwg_conversion_guide()
        
        print(f"\n🎨 DEMO MODE:")
        print("="*15)
        create_sample = input("Tạo file DXF sample để demo? (y/N): ").lower()
        
        if create_sample in ['y', 'yes']:
            if create_sample_dxf():
                print("\n🚀 Chạy processing với sample data...")
                process_existing_dxf()
                
    else:
        # Has tools but no DXF yet
        print(f"\n✅ CÓ {len(available_tools)} TOOL AVAILABLE!")
        print("💡 Hãy sử dụng tool để convert DWG → DXF")
        print("🔄 Hoặc chạy lại process-dwg-professional.bat")
    
    print(f"\n📞 Support: dev@xemgiadat.com")

if __name__ == "__main__":
    main()