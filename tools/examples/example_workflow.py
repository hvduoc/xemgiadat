#!/usr/bin/env python3
"""
EXAMPLE: Batch process project files from Dự án ABC
Demonstrates complete workflow from raw files to web-ready data
"""

import os
import sys
import json
from pathlib import Path

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))
from preprocess import DWGProcessor, ImageProcessor, DataHarmonizer

def example_complete_workflow():
    """Complete workflow example"""
    
    print("🎯 EXAMPLE: Complete Project Processing Workflow")
    print("=" * 55)
    
    # Setup paths
    base_dir = Path(__file__).parent
    input_dir = base_dir / "sample_data"
    output_dir = base_dir / "processed_output"
    
    # Create directories
    input_dir.mkdir(exist_ok=True)
    output_dir.mkdir(exist_ok=True)
    
    print(f"📁 Input directory: {input_dir}")
    print(f"📁 Output directory: {output_dir}")
    
    # Step 1: Process DWG files
    print("\n🔧 STEP 1: Processing DWG files...")
    print("-" * 30)
    
    dwg_processor = DWGProcessor(input_dir / "dwg", output_dir / "geojson")
    
    # Sample DWG files (you would place real files here)
    sample_dwg_files = [
        "du_an_abc_phan_lo.dwg",
        "du_an_abc_infrastructure.dwg"
    ]
    
    print("Sample DWG files to process:")
    for file in sample_dwg_files:
        print(f"  📐 {file}")
        
    # Note: This would process real files if they existed
    print("⚠️ Place your DWG files in sample_data/dwg/ to process")
    
    # Step 2: Process image files
    print("\n🖼️ STEP 2: Processing image files...")
    print("-" * 35)
    
    image_processor = ImageProcessor(input_dir / "images", output_dir / "optimized")
    
    sample_image_files = [
        "du_an_abc_masterplan.jpg",
        "du_an_abc_phase1.png"
    ]
    
    print("Sample image files to process:")
    for file in sample_image_files:
        print(f"  🖼️ {file}")
        
    print("⚠️ Place your image files in sample_data/images/ to process")
    
    # Step 3: Create sample metadata
    print("\n📊 STEP 3: Creating sample metadata...")
    print("-" * 35)
    
    sample_metadata = {
        "project_info": {
            "name": "Dự án ABC - Khu đô thị mới",
            "location": "Quận Liên Chiểu, Đà Nẵng",
            "area": "50 hectares",
            "total_lots": 250,
            "developer": "Công ty ABC Real Estate"
        },
        "coordinate_system": {
            "source": "VN-2000 Zone 104",
            "target": "WGS84",
            "transformation_accuracy": "±2 meters"
        },
        "data_sources": {
            "dwg_files": sample_dwg_files,
            "image_files": sample_image_files,
            "tnmt_reference": "So_TNMT_DaNang_2025.geojson"
        },
        "processing_settings": {
            "geometry_simplification": 0.001,
            "image_quality": 90,
            "coordinate_precision": 6
        }
    }
    
    metadata_file = output_dir / "project_metadata.json"
    with open(metadata_file, 'w', encoding='utf-8') as f:
        json.dump(sample_metadata, f, ensure_ascii=False, indent=2)
        
    print(f"✅ Sample metadata created: {metadata_file}")
    
    # Step 4: Create sample geo-reference template
    print("\n📍 STEP 4: Creating geo-reference template...")
    print("-" * 40)
    
    georef_template = {
        "image_files": {
            "du_an_abc_masterplan.jpg": {
                "corners": {
                    "top_left": {"lat": 16.0544, "lng": 108.1500},
                    "top_right": {"lat": 16.0544, "lng": 108.1600},
                    "bottom_left": {"lat": 16.0500, "lng": 108.1500},
                    "bottom_right": {"lat": 16.0500, "lng": 108.1600}
                },
                "notes": "Coordinates from GPS survey points",
                "accuracy": "±5 meters"
            }
        },
        "instructions": {
            "step1": "Open image in GIS software",
            "step2": "Identify known reference points",
            "step3": "Record coordinates for 4 corners",
            "step4": "Update this template with actual coordinates",
            "step5": "Run geo-referencing process"
        }
    }
    
    georef_file = output_dir / "georef_template.json"
    with open(georef_file, 'w', encoding='utf-8') as f:
        json.dump(georef_template, f, ensure_ascii=False, indent=2)
        
    print(f"✅ Geo-reference template created: {georef_file}")
    
    # Step 5: Data harmonization example
    print("\n🤝 STEP 5: Data harmonization setup...")
    print("-" * 35)
    
    harmonization_config = {
        "conflict_resolution_rules": {
            "lot_number": {
                "priority": "project_data",
                "reason": "Developer numbering is authoritative for sales"
            },
            "block_number": {
                "priority": "project_data", 
                "reason": "Project-specific block organization"
            },
            "land_area": {
                "priority": "tnmt_official",
                "reason": "Legal area from official survey"
            },
            "land_use_type": {
                "priority": "tnmt_official",
                "reason": "Official zoning classification"
            },
            "legal_status": {
                "priority": "tnmt_official",
                "reason": "Government records are definitive"
            }
        },
        "matching_criteria": {
            "geometric_overlap": {
                "minimum_threshold": 0.7,
                "preferred_threshold": 0.9
            },
            "attribute_similarity": {
                "area_tolerance": 0.1,
                "location_tolerance": 10
            }
        },
        "quality_requirements": {
            "minimum_confidence": 0.8,
            "manual_review_threshold": 0.6,
            "auto_accept_threshold": 0.95
        }
    }
    
    harmonization_file = output_dir / "harmonization_config.json"
    with open(harmonization_file, 'w', encoding='utf-8') as f:
        json.dump(harmonization_config, f, ensure_ascii=False, indent=2)
        
    print(f"✅ Harmonization config created: {harmonization_file}")
    
    # Summary
    print("\n🎯 WORKFLOW SUMMARY")
    print("=" * 20)
    print(f"📁 Output directory: {output_dir}")
    print("📋 Files created:")
    print(f"  📊 {metadata_file.name}")
    print(f"  📍 {georef_file.name}")
    print(f"  🤝 {harmonization_file.name}")
    
    print("\n🚀 NEXT STEPS:")
    print("1. Copy your DWG files to sample_data/dwg/")
    print("2. Copy your image files to sample_data/images/")
    print("3. Update geo-reference coordinates in template")
    print("4. Run actual processing commands:")
    print("   python preprocess.py dwg sample_data/dwg/ processed_output/ --batch")
    print("   python preprocess.py image sample_data/images/ processed_output/ --batch")

def example_single_file_processing():
    """Example: Process single file with detailed logging"""
    
    print("\n🔍 EXAMPLE: Single File Processing with Detailed Logging")
    print("=" * 60)
    
    # This would process a real file if it existed
    sample_file = "sample_project_layout.dwg"
    
    print(f"📐 Processing file: {sample_file}")
    print("📋 Processing steps:")
    print("  1. ✅ File validation")
    print("  2. ✅ Coordinate system detection")
    print("  3. ✅ DWG → DXF conversion")
    print("  4. ✅ Geometry extraction")
    print("  5. ✅ Coordinate transformation (VN-2000 → WGS84)")
    print("  6. ✅ Topology validation")
    print("  7. ✅ GeoJSON generation")
    print("  8. ✅ Quality assessment")
    
    # Sample output structure
    sample_output = {
        "processing_log": {
            "input_file": sample_file,
            "file_size": "15.2 MB",
            "coordinate_system": "VN-2000 Zone 104",
            "entities_found": {
                "lines": 1250,
                "polylines": 180,
                "circles": 25,
                "text": 340
            },
            "geometries_extracted": {
                "lot_boundaries": 85,
                "road_centerlines": 15,
                "utility_lines": 45,
                "annotation_points": 120
            },
            "coordinate_transformation": {
                "source_bounds": {
                    "x_min": 652340.15,
                    "y_min": 1774562.88,
                    "x_max": 653890.42,
                    "y_max": 1775890.33
                },
                "target_bounds": {
                    "lng_min": 108.1456,
                    "lat_min": 16.0489,
                    "lng_max": 108.1598,
                    "lat_max": 16.0608
                }
            },
            "quality_metrics": {
                "topology_valid": True,
                "geometry_errors": 0,
                "coordinate_precision": 6,
                "file_size_reduction": "78%"
            },
            "processing_time": "45.3 seconds",
            "output_file": "sample_project_layout_standardized.geojson"
        }
    }
    
    print("\n📊 Sample processing results:")
    print(json.dumps(sample_output, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    print("🎯 FILE PREPROCESSING EXAMPLES")
    print("=" * 35)
    
    example_complete_workflow()
    example_single_file_processing()
    
    print("\n✅ Examples completed!")
    print("📖 See README.md for more detailed documentation")