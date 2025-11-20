"""
Test DXF File Processing
Kiểm tra file DXF từ conversion
"""

import sys
from pathlib import Path
import json

def test_dxf_processing():
    """Test DXF file processing"""
    print("🔧 TESTING DXF FILE PROCESSING")
    print("="*50)
    
    dxf_file = Path("sample-data/dwg-files/Cap dien ho ga.dxf")
    
    if not dxf_file.exists():
        print("❌ File DXF không tìm thấy!")
        print("💡 Đảm bảo đã copy file vào: sample-data/dwg-files/")
        return False
    
    file_size_mb = dxf_file.stat().st_size / 1024 / 1024
    print(f"📁 File found: {dxf_file.name}")
    print(f"📊 Size: {file_size_mb:.1f} MB")
    
    # Install ezdxf if needed
    try:
        import ezdxf
        print("✅ ezdxf library available")
    except ImportError:
        print("📦 Installing ezdxf...")
        import subprocess
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'ezdxf'])
        import ezdxf
        print("✅ ezdxf installed")
    
    try:
        print("\n🔍 Loading DXF with encoding detection...")
        
        # Try different encodings
        doc = None
        encodings = ['cp1252', 'utf-8', 'latin1', 'ascii']
        
        for encoding in encodings:
            try:
                print(f"   Trying {encoding}...")
                doc = ezdxf.readfile(dxf_file, encoding=encoding, errors='ignore')
                print(f"   ✅ Success with {encoding}")
                break
            except Exception as e:
                print(f"   ❌ Failed with {encoding}: {e}")
                continue
        
        if doc is None:
            print("❌ Could not load DXF with any encoding")
            return False
        
        # Get model space
        msp = doc.modelspace()
        total_entities = len(list(msp))
        
        print(f"\n📊 DXF ANALYSIS:")
        print(f"   Total entities: {total_entities}")
        
        # Count entity types
        entity_counts = {}
        layer_counts = {}
        
        for entity in msp:
            entity_type = entity.dxftype()
            layer = getattr(entity.dxf, 'layer', 'DEFAULT')
            
            entity_counts[entity_type] = entity_counts.get(entity_type, 0) + 1
            layer_counts[layer] = layer_counts.get(layer, 0) + 1
        
        print(f"   Entity types: {len(entity_counts)}")
        print(f"   Layers: {len(layer_counts)}")
        
        print(f"\n🏗️ TOP ENTITY TYPES:")
        sorted_entities = sorted(entity_counts.items(), key=lambda x: x[1], reverse=True)
        for i, (entity_type, count) in enumerate(sorted_entities[:8]):
            print(f"   {i+1}. {entity_type}: {count}")
        
        print(f"\n📐 TOP LAYERS:")
        sorted_layers = sorted(layer_counts.items(), key=lambda x: x[1], reverse=True)
        for i, (layer, count) in enumerate(sorted_layers[:8]):
            print(f"   {i+1}. {layer}: {count}")
        
        # Process sample entities
        print(f"\n🔧 PROCESSING SAMPLE ENTITIES:")
        features = []
        processed_count = 0
        target_count = 20  # Process first 20 entities
        
        for entity in msp:
            if processed_count >= target_count:
                break
            
            entity_type = entity.dxftype()
            layer = getattr(entity.dxf, 'layer', 'DEFAULT')
            
            try:
                feature = None
                
                if entity_type == 'LINE':
                    start = entity.dxf.start
                    end = entity.dxf.end
                    
                    feature = {
                        'type': 'LineString',
                        'coordinates': [[start.x, start.y], [end.x, end.y]],
                        'properties': {
                            'entity_type': 'line',
                            'layer': layer,
                            'length': round(start.distance(end), 2)
                        }
                    }
                    
                elif entity_type == 'CIRCLE':
                    center = entity.dxf.center
                    radius = entity.dxf.radius
                    
                    feature = {
                        'type': 'Point',
                        'coordinates': [center.x, center.y],
                        'properties': {
                            'entity_type': 'circle',
                            'layer': layer,
                            'radius': round(radius, 2),
                            'area': round(3.14159 * radius * radius, 2)
                        }
                    }
                    
                elif entity_type == 'LWPOLYLINE':
                    try:
                        points = list(entity.get_points())
                        coordinates = [[p[0], p[1]] for p in points[:20]]  # Limit points
                        
                        if len(coordinates) >= 2:
                            feature = {
                                'type': 'LineString',
                                'coordinates': coordinates,
                                'properties': {
                                    'entity_type': 'polyline',
                                    'layer': layer,
                                    'vertex_count': len(coordinates),
                                    'is_closed': entity.is_closed
                                }
                            }
                    except Exception as e:
                        print(f"     ⚠️ LWPOLYLINE error: {e}")
                        
                elif entity_type == 'TEXT':
                    insert_point = entity.dxf.insert
                    text_value = getattr(entity.dxf, 'text', '')
                    
                    feature = {
                        'type': 'Point',
                        'coordinates': [insert_point.x, insert_point.y],
                        'properties': {
                            'entity_type': 'text',
                            'layer': layer,
                            'text': text_value[:50],  # Limit text length
                            'height': getattr(entity.dxf, 'height', 0)
                        }
                    }
                
                if feature:
                    features.append(feature)
                    print(f"   ✅ {entity_type} on {layer}")
                    processed_count += 1
                else:
                    print(f"   ⚠️ Skipped {entity_type}")
                    
            except Exception as e:
                print(f"   ❌ Error processing {entity_type}: {str(e)[:50]}")
        
        success_rate = (len(features) / processed_count * 100) if processed_count > 0 else 0
        
        print(f"\n🎯 PROCESSING RESULTS:")
        print(f"   Attempted: {processed_count}")
        print(f"   Successful: {len(features)}")
        print(f"   Success rate: {success_rate:.1f}%")
        
        if len(features) > 0:
            # Save sample result
            output_dir = Path("sample-data/output")
            output_dir.mkdir(parents=True, exist_ok=True)
            
            geojson = {
                "type": "FeatureCollection",
                "metadata": {
                    "source": "DXF processing test",
                    "source_file": str(dxf_file),
                    "total_entities": total_entities,
                    "processed_entities": len(features),
                    "success_rate": f"{success_rate:.1f}%",
                    "entity_summary": dict(list(sorted_entities)[:5]),
                    "layer_summary": dict(list(sorted_layers)[:5]),
                    "coordinate_system": "CAD coordinates (need transformation)",
                    "processing_date": "2025-11-11"
                },
                "features": [
                    {
                        "type": "Feature", 
                        "geometry": {
                            "type": feature['type'],
                            "coordinates": feature['coordinates']
                        },
                        "properties": feature['properties']
                    } for feature in features
                ]
            }
            
            output_file = output_dir / "cap_dien_ho_ga_test.geojson"
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(geojson, f, ensure_ascii=False, indent=2)
            
            output_size_kb = output_file.stat().st_size / 1024
            
            print(f"\n💾 TEST RESULTS SAVED:")
            print(f"   📄 File: {output_file}")
            print(f"   📊 Size: {output_size_kb:.1f} KB")
            print(f"   🎯 Features: {len(features)}")
            
            # Summary
            print(f"\n📋 LAYER ANALYSIS:")
            layer_features = {}
            for feature in features:
                layer = feature['properties']['layer']
                layer_features[layer] = layer_features.get(layer, 0) + 1
            
            for layer, count in sorted(layer_features.items(), key=lambda x: x[1], reverse=True):
                print(f"   {layer}: {count} features")
            
            return True
        else:
            print("❌ No features successfully processed")
            return False
            
    except Exception as e:
        print(f"❌ Critical error: {e}")
        return False

if __name__ == "__main__":
    print("🏗️ EURO VILLAGE DXF PROCESSING TEST")
    print("="*50)
    
    success = test_dxf_processing()
    
    if success:
        print(f"\n🎉 DXF PROCESSING TEST PASSED!")
        print("✅ File được đọc và xử lý thành công")
        print("📁 Kết quả: sample-data/output/cap_dien_ho_ga_test.geojson")
        print()
        print("🚀 NEXT STEPS:")
        print("1. Review kết quả trong GeoJSON file")
        print("2. Cải thiện coordinate transformation")
        print("3. Optimize layer filtering")
        print("4. Scale up to full processing")
    else:
        print(f"\n❌ TEST FAILED")
        print("⚠️ Cần điều chỉnh processing logic")
    
    input("\nPress Enter to exit...")