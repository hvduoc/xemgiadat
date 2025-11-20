#!/usr/bin/env python3
"""
Simple test script to verify module structure
"""

import sys
from pathlib import Path

# Add the module to Python path
module_path = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(module_path))

def test_imports():
    """Test that all modules can be imported"""
    print("Testing module imports...")
    
    try:
        # Test utility imports
        from xemgiadat_processors.utils import Config, get_logger
        print("✓ Utils imported successfully")
        
        # Test core imports
        from xemgiadat_processors.core import DWGProcessor, ImageProcessor
        print("✓ Core processors imported successfully")
        
        # Test CLI import
        from xemgiadat_processors.cli import main as cli_main
        print("✓ CLI imported successfully")
        
        # Test main module import
        from xemgiadat_processors import __version__, DWGProcessor, ImageProcessor, Config
        print(f"✓ Main module imported successfully (v{__version__})")
        
        return True
        
    except ImportError as e:
        print(f"✗ Import failed: {e}")
        return False

def test_basic_functionality():
    """Test basic functionality"""
    print("\nTesting basic functionality...")
    
    try:
        from xemgiadat_processors import Config, get_logger, DWGProcessor, ImageProcessor
        
        # Test logger
        logger = get_logger("test")
        logger.info("Logger test")
        print("✓ Logger working")
        
        # Test config
        config = Config()
        is_valid = config.validate()
        print(f"✓ Config created and validated: {is_valid}")
        
        # Test processors
        dwg_proc = DWGProcessor(config)
        img_proc = ImageProcessor(config)
        print("✓ Processors created successfully")
        
        # Test statistics
        stats = dwg_proc.get_statistics()
        print(f"✓ Statistics available: {stats}")
        
        return True
        
    except Exception as e:
        print(f"✗ Functionality test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("XemGiaDat Data Processing Module - Structure Test")
    print("=" * 50)
    
    # Test imports
    import_ok = test_imports()
    
    # Test functionality
    func_ok = test_basic_functionality()
    
    # Summary
    print("\nTest Summary:")
    print(f"Imports: {'✓ PASS' if import_ok else '✗ FAIL'}")
    print(f"Functionality: {'✓ PASS' if func_ok else '✗ FAIL'}")
    
    if import_ok and func_ok:
        print("\n🎉 Module structure is working correctly!")
        return 0
    else:
        print("\n❌ Module has issues that need to be fixed")
        return 1

if __name__ == "__main__":
    sys.exit(main())