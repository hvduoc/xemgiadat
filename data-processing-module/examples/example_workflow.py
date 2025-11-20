#!/usr/bin/env python3
"""
XemGiaDat Data Processing Example
Comprehensive workflow example showing all module capabilities
"""

import json
import sys
from pathlib import Path

# Add the module to Python path for testing
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from xemgiadat_processors import (
    DWGProcessor, 
    ImageProcessor, 
    Config, 
    get_logger
)

def main():
    """Run comprehensive processing example"""
    
    # Setup logging
    logger = get_logger(__name__)
    logger.info("Starting XemGiaDat data processing example")
    
    try:
        # 1. Create and configure processors
        config = create_sample_config()
        
        dwg_processor = DWGProcessor(config)
        image_processor = ImageProcessor(config) 
        
        # 2. Process DWG files
        print("\n=== DWG Processing Example ===")
        process_dwg_example(dwg_processor)
        
        # 3. Process Images
        print("\n=== Image Processing Example ===")
        process_image_example(image_processor)
        
        # 4. Batch processing
        print("\n=== Batch Processing Example ===")
        batch_processing_example(dwg_processor, image_processor)
        
        # 5. Configuration management
        print("\n=== Configuration Management ===")
        configuration_example(config)
        
        print("\n✓ All examples completed successfully!")
        return 0
        
    except Exception as e:
        logger.error(f"Example execution failed: {e}")
        print(f"\n✗ Example failed: {e}")
        return 1

def create_sample_config():
    """Create sample configuration"""
    config = Config()
    
    # Customize settings for Vietnam
    config.coordinate_systems.source_vn2000 = "EPSG:3405"  # VN-2000 / UTM 48N
    config.coordinate_systems.source_utm = "EPSG:32648"    # WGS 84 / UTM 48N
    config.coordinate_systems.target_wgs84 = "EPSG:4326"   # WGS 84
    
    # Quality settings for real estate data
    config.quality.geometry_tolerance = 0.01  # 1cm tolerance
    config.quality.coordinate_precision = 6   # 6 decimal places (~0.1m precision)
    config.quality.min_area = 0.5            # 0.5 sqm minimum area
    config.quality.max_vertices = 5000       # Reasonable polygon complexity
    
    # Processing limits
    config.limits.max_file_size = 50 * 1024 * 1024  # 50MB max file size
    config.limits.max_features = 10000              # 10K features max
    config.limits.timeout_seconds = 180             # 3 minutes timeout
    
    return config

def process_dwg_example(processor):
    """Example DWG processing workflow"""
    print("1. DWG File Processing")
    
    # Example: Process hypothetical DWG file
    sample_dwg = Path("examples/sample_project.dwg")
    
    print(f"   - Would process: {sample_dwg}")
    print("   - Extract parcels, buildings, infrastructure")
    print("   - Transform VN-2000 coordinates to WGS84")
    print("   - Generate standardized GeoJSON output")
    print("   - Validate geometry topology")
    
    # Show what the result would look like
    mock_result = {
        'success': True,
        'input_file': str(sample_dwg),
        'output_file': 'examples/sample_project_processed.geojson',
        'geometries_count': 145,
        'metadata': {
            'coordinate_system': 'WGS84',
            'feature_types': {
                'Polygon': 120,  # Building parcels
                'LineString': 25  # Roads, utilities
            },
            'quality_metrics': {
                'topology_errors': 0,
                'validation_passed': True
            }
        }
    }
    
    print(f"   ✓ Mock result: {mock_result['geometries_count']} features extracted")
    
    # Show statistics
    stats = processor.get_statistics()
    print(f"   📊 Processor stats: {stats}")

def process_image_example(processor):
    """Example image processing workflow"""
    print("2. Image File Processing")
    
    # Example: Process site plan image
    sample_image = Path("examples/site_plan.png")
    
    print(f"   - Would process: {sample_image}")
    print("   - Enhance image quality (contrast, sharpness)")
    print("   - Apply geo-referencing using bounds or world file")
    print("   - Extract features using computer vision")
    print("   - Generate geo-located output")
    
    # Create sample geo-reference
    geo_reference = processor.create_geo_reference(
        bounds=[108.2020, 16.0540, 108.2040, 16.0560],  # Da Nang coordinates
        crs="EPSG:4326"
    )
    
    print(f"   - Geo-reference: {geo_reference}")
    
    # Show what the result would look like
    mock_result = {
        'success': True,
        'input_file': str(sample_image),
        'processed_image': 'examples/site_plan_processed.png',
        'geojson_file': 'examples/site_plan_features.geojson',
        'features_count': 12,
        'metadata': {
            'image_properties': {
                'format': '.png',
                'size_bytes': 2456789
            },
            'feature_types': {
                'image_bounds': 1,
                'buildings': 8,
                'roads': 3
            }
        }
    }
    
    print(f"   ✓ Mock result: {mock_result['features_count']} features extracted")
    
    # Show statistics
    stats = processor.get_statistics()
    print(f"   📊 Processor stats: {stats}")

def batch_processing_example(dwg_processor, image_processor):
    """Example batch processing workflow"""
    print("3. Batch Processing")
    
    # Simulate batch processing multiple files
    sample_files = [
        "project_a/parcels.dwg",
        "project_a/buildings.dwg", 
        "project_b/site_plan.png",
        "project_b/aerial_view.jpg",
        "project_c/cadastral.dxf"
    ]
    
    print(f"   - Would process {len(sample_files)} files:")
    for file_path in sample_files:
        print(f"     • {file_path}")
    
    # Separate by file type
    dwg_files = [f for f in sample_files if f.endswith(('.dwg', '.dxf'))]
    image_files = [f for f in sample_files if f.endswith(('.png', '.jpg', '.jpeg', '.tif'))]
    
    print(f"\n   - DWG/DXF files: {len(dwg_files)}")
    print(f"   - Image files: {len(image_files)}")
    
    # Show what batch results would look like
    mock_batch_result = {
        'total_files': len(sample_files),
        'successful': len(sample_files) - 1,  # One file fails
        'failed': 1,
        'processing_time': 45.6,  # seconds
        'total_features': 347,
        'file_results': {
            'dwg_successful': len(dwg_files),
            'image_successful': len(image_files) - 1
        }
    }
    
    print(f"   ✓ Mock batch result:")
    print(f"     - Total: {mock_batch_result['total_files']} files")
    print(f"     - Success: {mock_batch_result['successful']} files") 
    print(f"     - Failed: {mock_batch_result['failed']} files")
    print(f"     - Features: {mock_batch_result['total_features']} extracted")
    print(f"     - Time: {mock_batch_result['processing_time']:.1f} seconds")

def configuration_example(config):
    """Example configuration management"""
    print("4. Configuration Management")
    
    # Show current configuration
    print("   - Current coordinate systems:")
    print(f"     • Source VN-2000: {config.coordinate_systems.source_vn2000}")
    print(f"     • Source UTM: {config.coordinate_systems.source_utm}")
    print(f"     • Target WGS84: {config.coordinate_systems.target_wgs84}")
    
    print("   - Quality settings:")
    print(f"     • Geometry tolerance: {config.quality.geometry_tolerance}m")
    print(f"     • Coordinate precision: {config.quality.coordinate_precision} decimals")
    print(f"     • Minimum area: {config.quality.min_area} sqm")
    
    print("   - Processing limits:")
    print(f"     • Max file size: {config.limits.max_file_size / (1024*1024):.0f}MB")
    print(f"     • Max features: {config.limits.max_features:,}")
    print(f"     • Timeout: {config.limits.timeout_seconds}s")
    
    # Validate configuration
    is_valid = config.validate()
    print(f"   ✓ Configuration valid: {is_valid}")
    
    # Export configuration
    config_dict = config.to_dict()
    print(f"   - Configuration has {len(config_dict)} main sections")
    
    # Save example configuration
    output_path = Path("examples/example_config.json")
    output_path.parent.mkdir(exist_ok=True)
    
    try:
        config.save_to_file(output_path)
        print(f"   ✓ Saved configuration to: {output_path}")
    except Exception as e:
        print(f"   ⚠ Could not save config (demo mode): {e}")

def demonstrate_cli_usage():
    """Show CLI usage examples"""
    print("\n=== CLI Usage Examples ===")
    print("The module provides a command-line interface:")
    print()
    print("# Process single DWG file")
    print("xgd-process process-dwg project.dwg --output ./processed")
    print()
    print("# Process image with geo-reference") 
    print("xgd-process process-image plan.png --bounds 108.20 16.05 108.21 16.06")
    print()
    print("# Batch process directory")
    print("xgd-process batch-process --input-dir ./raw --output-dir ./geo --recursive")
    print()
    print("# Generate configuration file")
    print("xgd-process config --generate --output config.json")
    print()
    print("# Validate configuration")
    print("xgd-process --config config.json --validate-config")

if __name__ == "__main__":
    result = main()
    
    # Show CLI examples
    demonstrate_cli_usage()
    
    sys.exit(result)