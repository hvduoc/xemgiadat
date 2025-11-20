#!/usr/bin/env python3
"""
FILE PREPROCESSING TOOLS - XEMGIADAT.COM
Chuẩn hóa DWG/Image files cho Project Map Integration System
Author: Supreme Commander
Date: November 9, 2025
"""

import os
import sys
import json
import shutil
import subprocess
from pathlib import Path
from typing import List, Dict, Tuple, Optional
import argparse

# Required libraries - install with: pip install -r requirements.txt
try:
    from PIL import Image, ImageEnhance
    import fiona
    import geopandas as gpd
    from shapely.geometry import Point, Polygon
    import pyproj
    from pyproj import Transformer
except ImportError as e:
    print(f"❌ Missing required library: {e}")
    print("📋 Install with: pip install -r requirements.txt")
    sys.exit(1)

class DWGProcessor:
    """Process and standardize DWG/DXF files for web integration"""
    
    def __init__(self, input_dir: str, output_dir: str):
        self.input_dir = Path(input_dir)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Coordinate transformers
        self.to_wgs84 = Transformer.from_crs("EPSG:3405", "EPSG:4326", always_xy=True)  # VN-2000 to WGS84
        self.utm_to_wgs84 = Transformer.from_crs("EPSG:32648", "EPSG:4326", always_xy=True)  # UTM 48N to WGS84
        
    def process_dwg_batch(self, files: List[str]) -> Dict[str, str]:
        """Process multiple DWG files in batch"""
        results = {}
        
        for file_path in files:
            try:
                result = self.process_single_dwg(file_path)
                results[file_path] = result
                print(f"✅ Processed: {file_path}")
            except Exception as e:
                results[file_path] = f"❌ Error: {str(e)}"
                print(f"❌ Failed: {file_path} - {e}")
                
        return results
    
    def process_single_dwg(self, file_path: str) -> str:
        """Process single DWG file to standardized GeoJSON"""
        file_path = Path(file_path)
        
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
            
        # Output paths
        temp_dxf = self.output_dir / f"{file_path.stem}_temp.dxf"
        output_geojson = self.output_dir / f"{file_path.stem}_standardized.geojson"
        
        # Step 1: Convert DWG to DXF using ODA File Converter (if available)
        if file_path.suffix.lower() == '.dwg':
            if not self._convert_dwg_to_dxf(file_path, temp_dxf):
                raise Exception("DWG to DXF conversion failed")
            source_file = temp_dxf
        else:
            source_file = file_path
            
        # Step 2: Parse DXF and extract geometries
        geometries = self._extract_geometries_from_dxf(source_file)
        
        # Step 3: Apply coordinate transformation
        transformed_geoms = self._transform_coordinates(geometries)
        
        # Step 4: Validate and clean geometries
        cleaned_geoms = self._validate_and_clean(transformed_geoms)
        
        # Step 5: Generate standardized GeoJSON
        geojson = self._create_geojson(cleaned_geoms, file_path.stem)
        
        # Step 6: Save output
        with open(output_geojson, 'w', encoding='utf-8') as f:
            json.dump(geojson, f, ensure_ascii=False, indent=2)
            
        # Cleanup
        if temp_dxf.exists():
            temp_dxf.unlink()
            
        return str(output_geojson)
    
    def _convert_dwg_to_dxf(self, dwg_path: Path, dxf_path: Path) -> bool:
        """Convert DWG to DXF using available tools"""
        try:
            # Try ODA File Converter first
            oda_converter = shutil.which("ODAFileConverter")
            if oda_converter:
                cmd = [oda_converter, str(dwg_path.parent), str(dxf_path.parent), "ACAD2018", "DXF", "0", "1", str(dwg_path.name)]
                subprocess.run(cmd, check=True, capture_output=True)
                return True
                
            # Try teigha2dwg (Linux)
            teigha = shutil.which("teigha2dwg")
            if teigha:
                cmd = [teigha, str(dwg_path), str(dxf_path)]
                subprocess.run(cmd, check=True, capture_output=True)
                return True
                
            # Try LibreCAD (if available)
            librecad = shutil.which("librecad")
            if librecad:
                print("⚠️ Manual conversion required with LibreCAD")
                return False
                
            print("⚠️ No DWG converter found. Install ODA File Converter or teigha2dwg")
            return False
            
        except subprocess.CalledProcessError as e:
            print(f"❌ Conversion error: {e}")
            return False
    
    def _extract_geometries_from_dxf(self, dxf_path: Path) -> List[Dict]:
        """Extract geometries from DXF file using ezdxf"""
        try:
            import ezdxf
        except ImportError:
            print("📋 Installing ezdxf...")
            subprocess.check_call([sys.executable, "-m", "pip", "install", "ezdxf"])
            import ezdxf
            
        geometries = []
        
        try:
            doc = ezdxf.readfile(str(dxf_path))
            modelspace = doc.modelspace()
            
            for entity in modelspace:
                geom_data = self._entity_to_geometry(entity)
                if geom_data:
                    geometries.append(geom_data)
                    
        except Exception as e:
            print(f"⚠️ DXF parsing error: {e}")
            
        return geometries
    
    def _entity_to_geometry(self, entity) -> Optional[Dict]:
        """Convert DXF entity to standardized geometry"""
        try:
            if entity.dxftype() == 'LINE':
                start = entity.dxf.start
                end = entity.dxf.end
                return {
                    'type': 'LineString',
                    'coordinates': [[start.x, start.y], [end.x, end.y]],
                    'properties': {'layer': entity.dxf.layer, 'type': 'boundary'}
                }
                
            elif entity.dxftype() == 'POLYLINE' or entity.dxftype() == 'LWPOLYLINE':
                points = []
                if hasattr(entity, 'vertices'):
                    points = [[v.dxf.location.x, v.dxf.location.y] for v in entity.vertices]
                elif hasattr(entity, 'get_points'):
                    points = [[p[0], p[1]] for p in entity.get_points()]
                    
                if len(points) > 2:
                    return {
                        'type': 'Polygon' if entity.is_closed else 'LineString',
                        'coordinates': [points] if entity.is_closed else points,
                        'properties': {'layer': entity.dxf.layer, 'type': 'lot' if entity.is_closed else 'boundary'}
                    }
                    
            elif entity.dxftype() == 'CIRCLE':
                center = entity.dxf.center
                radius = entity.dxf.radius
                # Convert circle to polygon approximation
                import math
                points = []
                for i in range(32):  # 32-sided polygon
                    angle = i * 2 * math.pi / 32
                    x = center.x + radius * math.cos(angle)
                    y = center.y + radius * math.sin(angle)
                    points.append([x, y])
                points.append(points[0])  # Close polygon
                
                return {
                    'type': 'Polygon',
                    'coordinates': [points],
                    'properties': {'layer': entity.dxf.layer, 'type': 'lot', 'shape': 'circle'}
                }
                
        except Exception as e:
            print(f"⚠️ Entity conversion error: {e}")
            
        return None
    
    def _transform_coordinates(self, geometries: List[Dict]) -> List[Dict]:
        """Transform coordinates to WGS84"""
        transformed = []
        
        for geom in geometries:
            try:
                if geom['type'] == 'Point':
                    x, y = geom['coordinates']
                    lon, lat = self.to_wgs84.transform(x, y)
                    geom['coordinates'] = [lon, lat]
                    
                elif geom['type'] == 'LineString':
                    coords = []
                    for x, y in geom['coordinates']:
                        lon, lat = self.to_wgs84.transform(x, y)
                        coords.append([lon, lat])
                    geom['coordinates'] = coords
                    
                elif geom['type'] == 'Polygon':
                    rings = []
                    for ring in geom['coordinates']:
                        coords = []
                        for x, y in ring:
                            lon, lat = self.to_wgs84.transform(x, y)
                            coords.append([lon, lat])
                        rings.append(coords)
                    geom['coordinates'] = rings
                    
                transformed.append(geom)
                
            except Exception as e:
                print(f"⚠️ Coordinate transformation error: {e}")
                
        return transformed
    
    def _validate_and_clean(self, geometries: List[Dict]) -> List[Dict]:
        """Validate and clean geometries"""
        cleaned = []
        
        for geom in geometries:
            try:
                # Basic validation
                if geom['type'] == 'Polygon':
                    # Ensure minimum 4 points for polygon
                    if len(geom['coordinates'][0]) < 4:
                        continue
                        
                    # Ensure closed polygon
                    if geom['coordinates'][0][0] != geom['coordinates'][0][-1]:
                        geom['coordinates'][0].append(geom['coordinates'][0][0])
                        
                elif geom['type'] == 'LineString':
                    # Ensure minimum 2 points for line
                    if len(geom['coordinates']) < 2:
                        continue
                        
                # Add unique ID
                geom['properties']['id'] = f"feature_{len(cleaned)}"
                
                cleaned.append(geom)
                
            except Exception as e:
                print(f"⚠️ Geometry validation error: {e}")
                
        return cleaned
    
    def _create_geojson(self, geometries: List[Dict], project_name: str) -> Dict:
        """Create standardized GeoJSON"""
        features = []
        
        for geom in geometries:
            feature = {
                "type": "Feature",
                "geometry": {
                    "type": geom['type'],
                    "coordinates": geom['coordinates']
                },
                "properties": geom['properties']
            }
            features.append(feature)
            
        return {
            "type": "FeatureCollection",
            "metadata": {
                "name": project_name,
                "source": "DWG/DXF conversion",
                "coordinate_system": "WGS84",
                "processed_date": "2025-11-09",
                "total_features": len(features)
            },
            "features": features
        }

class ImageProcessor:
    """Process and standardize image maps for geo-referencing"""
    
    def __init__(self, input_dir: str, output_dir: str):
        self.input_dir = Path(input_dir)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
    def process_image_batch(self, files: List[str]) -> Dict[str, str]:
        """Process multiple image files in batch"""
        results = {}
        
        for file_path in files:
            try:
                result = self.process_single_image(file_path)
                results[file_path] = result
                print(f"✅ Processed: {file_path}")
            except Exception as e:
                results[file_path] = f"❌ Error: {str(e)}"
                print(f"❌ Failed: {file_path} - {e}")
                
        return results
    
    def process_single_image(self, file_path: str) -> str:
        """Process single image file to web-optimized format"""
        file_path = Path(file_path)
        
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
            
        # Output paths
        output_image = self.output_dir / f"{file_path.stem}_optimized.jpg"
        output_metadata = self.output_dir / f"{file_path.stem}_metadata.json"
        
        # Process image
        with Image.open(file_path) as img:
            # Get original dimensions
            original_size = img.size
            
            # Optimize image
            optimized_img = self._optimize_image(img)
            
            # Save optimized image
            optimized_img.save(output_image, 'JPEG', quality=90, optimize=True)
            
            # Generate metadata
            metadata = {
                "original_file": str(file_path),
                "original_size": original_size,
                "optimized_size": optimized_img.size,
                "format": "JPEG",
                "quality": 90,
                "coordinate_system": "WGS84",
                "geo_reference": {
                    "status": "pending",
                    "corners": {
                        "top_left": {"lat": None, "lng": None},
                        "top_right": {"lat": None, "lng": None},
                        "bottom_left": {"lat": None, "lng": None},
                        "bottom_right": {"lat": None, "lng": None}
                    }
                },
                "processed_date": "2025-11-09"
            }
            
            # Save metadata
            with open(output_metadata, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, ensure_ascii=False, indent=2)
                
        return str(output_image)
    
    def _optimize_image(self, img: Image.Image) -> Image.Image:
        """Optimize image for web display"""
        # Convert to RGB if necessary
        if img.mode != 'RGB':
            img = img.convert('RGB')
            
        # Resize if too large (max 4K)
        max_size = (3840, 2160)
        if img.size[0] > max_size[0] or img.size[1] > max_size[1]:
            img.thumbnail(max_size, Image.Resampling.LANCZOS)
            
        # Ensure minimum size (1920x1080)
        min_size = (1920, 1080)
        if img.size[0] < min_size[0] or img.size[1] < min_size[1]:
            # Scale up maintaining aspect ratio
            scale = max(min_size[0]/img.size[0], min_size[1]/img.size[1])
            new_size = (int(img.size[0] * scale), int(img.size[1] * scale))
            img = img.resize(new_size, Image.Resampling.LANCZOS)
            
        # Enhance image quality
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(1.1)  # Slight contrast boost
        
        enhancer = ImageEnhance.Sharpness(img)
        img = enhancer.enhance(1.05)  # Slight sharpness boost
        
        return img

class DataHarmonizer:
    """Harmonize TNMT and Project data for conflict resolution"""
    
    def __init__(self, tnmt_data_path: str, project_data_path: str, output_dir: str):
        self.tnmt_data_path = Path(tnmt_data_path)
        self.project_data_path = Path(project_data_path)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
    def create_mapping_table(self) -> str:
        """Create mapping table between TNMT and Project data"""
        mapping_file = self.output_dir / "tnmt_project_mapping.json"
        
        # Load data
        tnmt_features = self._load_geojson(self.tnmt_data_path)
        project_features = self._load_geojson(self.project_data_path)
        
        # Create mappings
        mappings = []
        
        for proj_feature in project_features:
            matches = self._find_matching_tnmt_features(proj_feature, tnmt_features)
            
            for match in matches:
                mapping = {
                    "project_id": proj_feature['properties'].get('id'),
                    "tnmt_id": match['tnmt_feature']['properties'].get('id'),
                    "confidence": match['confidence'],
                    "overlap_area": match['overlap_area'],
                    "conflict_resolution": self._resolve_conflicts(proj_feature, match['tnmt_feature']),
                    "status": "pending_review" if match['confidence'] < 0.8 else "auto_matched"
                }
                mappings.append(mapping)
                
        # Save mapping table
        mapping_data = {
            "metadata": {
                "created_date": "2025-11-09",
                "tnmt_source": str(self.tnmt_data_path),
                "project_source": str(self.project_data_path),
                "total_mappings": len(mappings)
            },
            "mappings": mappings
        }
        
        with open(mapping_file, 'w', encoding='utf-8') as f:
            json.dump(mapping_data, f, ensure_ascii=False, indent=2)
            
        print(f"✅ Created mapping table: {mapping_file}")
        return str(mapping_file)
    
    def _load_geojson(self, file_path: Path) -> List[Dict]:
        """Load GeoJSON features"""
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data.get('features', [])
    
    def _find_matching_tnmt_features(self, project_feature: Dict, tnmt_features: List[Dict]) -> List[Dict]:
        """Find TNMT features that match project feature"""
        matches = []
        
        proj_geom = self._feature_to_shapely(project_feature)
        if not proj_geom:
            return matches
            
        for tnmt_feature in tnmt_features:
            tnmt_geom = self._feature_to_shapely(tnmt_feature)
            if not tnmt_geom:
                continue
                
            # Calculate overlap
            try:
                intersection = proj_geom.intersection(tnmt_geom)
                overlap_area = intersection.area
                
                if overlap_area > 0:
                    confidence = overlap_area / proj_geom.area
                    
                    matches.append({
                        'tnmt_feature': tnmt_feature,
                        'confidence': confidence,
                        'overlap_area': overlap_area
                    })
                    
            except Exception as e:
                print(f"⚠️ Geometry intersection error: {e}")
                
        # Sort by confidence
        matches.sort(key=lambda x: x['confidence'], reverse=True)
        return matches[:3]  # Top 3 matches
    
    def _feature_to_shapely(self, feature: Dict):
        """Convert GeoJSON feature to Shapely geometry"""
        try:
            from shapely.geometry import shape
            return shape(feature['geometry'])
        except Exception as e:
            print(f"⚠️ Shapely conversion error: {e}")
            return None
    
    def _resolve_conflicts(self, project_feature: Dict, tnmt_feature: Dict) -> Dict:
        """Resolve conflicts between project and TNMT data"""
        resolution_rules = {
            'lot_number': 'project_wins',
            'block_number': 'project_wins',
            'area': 'tnmt_official',
            'legal_status': 'tnmt_official',
            'land_use': 'tnmt_official',
            'owner_info': 'tnmt_official'
        }
        
        conflicts = {}
        project_props = project_feature['properties']
        tnmt_props = tnmt_feature['properties']
        
        for field, rule in resolution_rules.items():
            proj_value = project_props.get(field)
            tnmt_value = tnmt_props.get(field)
            
            if proj_value and tnmt_value and proj_value != tnmt_value:
                conflicts[field] = {
                    'project_value': proj_value,
                    'tnmt_value': tnmt_value,
                    'resolution_rule': rule,
                    'final_value': proj_value if rule == 'project_wins' else tnmt_value
                }
                
        return conflicts

def main():
    """Main CLI interface"""
    parser = argparse.ArgumentParser(description="File Preprocessing Tools for XemGiaDat.com")
    parser.add_argument('action', choices=['dwg', 'image', 'harmonize'], help='Processing action')
    parser.add_argument('input', help='Input file or directory')
    parser.add_argument('output', help='Output directory')
    parser.add_argument('--batch', action='store_true', help='Process all files in directory')
    
    args = parser.parse_args()
    
    if args.action == 'dwg':
        processor = DWGProcessor(args.input, args.output)
        
        if args.batch:
            files = list(Path(args.input).glob('*.dwg')) + list(Path(args.input).glob('*.dxf'))
            results = processor.process_dwg_batch([str(f) for f in files])
        else:
            results = {args.input: processor.process_single_dwg(args.input)}
            
    elif args.action == 'image':
        processor = ImageProcessor(args.input, args.output)
        
        if args.batch:
            files = list(Path(args.input).glob('*.jpg')) + list(Path(args.input).glob('*.png'))
            results = processor.process_image_batch([str(f) for f in files])
        else:
            results = {args.input: processor.process_single_image(args.input)}
            
    elif args.action == 'harmonize':
        # Expects input to be TNMT file, output to be directory
        # Project file should be specified via additional argument
        if len(sys.argv) < 5:
            print("❌ Harmonize requires: python preprocess.py harmonize <tnmt_file> <output_dir> <project_file>")
            sys.exit(1)
            
        project_file = sys.argv[4]
        harmonizer = DataHarmonizer(args.input, project_file, args.output)
        mapping_file = harmonizer.create_mapping_table()
        results = {args.input: mapping_file}
    
    # Print results
    print("\n📊 PROCESSING RESULTS:")
    print("=" * 50)
    for file_path, result in results.items():
        print(f"{file_path} → {result}")
    
    print(f"\n✅ Processing complete! Output saved to: {args.output}")

if __name__ == "__main__":
    main()