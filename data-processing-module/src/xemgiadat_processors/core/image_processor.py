"""
Core Image Processor Module
Professional image processing with geo-referencing and feature extraction
"""

import json
import shutil
import subprocess
import sys
from pathlib import Path
from typing import List, Dict, Optional, Tuple
import tempfile

try:
    from PIL import Image, ImageEnhance, ImageFilter
    import numpy as np
except ImportError as e:
    raise ImportError(f"Required library missing: {e}. Install with: pip install Pillow numpy")

try:
    import pyproj
    from pyproj import Transformer
except ImportError as e:
    raise ImportError(f"Required library missing: {e}. Install with: pip install pyproj")

from ..utils.exceptions import ProcessingError, CoordinateTransformError, FileValidationError
from ..utils.logger import get_logger
from ..utils.config import Config

logger = get_logger(__name__)

class ImageProcessor:
    """
    Professional image processor for map/plan processing
    
    Features:
    - Image preprocessing and enhancement
    - Feature extraction and vectorization
    - Geo-referencing and coordinate transformation
    - Standardized GeoJSON output
    - Quality assessment and validation
    """
    
    def __init__(self, config: Optional[Config] = None):
        """
        Initialize image processor
        
        Args:
            config: Configuration object with processing settings
        """
        self.config = config or Config()
        
        # Setup coordinate transformers
        self._setup_transformers()
        
        # Initialize processing statistics
        self.stats = {
            'images_processed': 0,
            'features_extracted': 0,
            'errors_encountered': 0,
            'processing_time': 0
        }
        
        # Supported image formats
        self.supported_formats = {'.jpg', '.jpeg', '.png', '.tif', '.tiff', '.bmp', '.gif'}
        
    def _setup_transformers(self):
        """Setup coordinate transformation objects"""
        try:
            # VN-2000 to WGS84
            self.vn2000_to_wgs84 = Transformer.from_crs(
                self.config.coordinate_systems.source_vn2000, 
                self.config.coordinate_systems.target_wgs84, 
                always_xy=True
            )
            
            # UTM 48N to WGS84  
            self.utm_to_wgs84 = Transformer.from_crs(
                self.config.coordinate_systems.source_utm, 
                self.config.coordinate_systems.target_wgs84, 
                always_xy=True
            )
            
            logger.info("Coordinate transformers initialized successfully")
            
        except Exception as e:
            raise CoordinateTransformError(f"Failed to setup transformers: {e}")
    
    def process_file(self, file_path: str, output_dir: Optional[str] = None, 
                    geo_reference: Optional[Dict] = None) -> Dict[str, any]:
        """
        Process single image file
        
        Args:
            file_path: Path to input image file
            output_dir: Output directory (optional)
            geo_reference: Geo-referencing information (optional)
            
        Returns:
            Dict with processing results and metadata
        """
        file_path = Path(file_path)
        
        if not file_path.exists():
            raise FileValidationError(f"File not found: {file_path}")
            
        if output_dir:
            output_dir = Path(output_dir)
            output_dir.mkdir(parents=True, exist_ok=True)
        else:
            output_dir = file_path.parent / "processed"
            output_dir.mkdir(exist_ok=True)
            
        logger.info(f"Processing image: {file_path}")
        
        try:
            # Validate input file
            self._validate_input_file(file_path)
            
            # Load and preprocess image
            image = self._load_and_preprocess(file_path)
            
            # Extract features (if geo-referenced)
            features = []
            if geo_reference:
                features = self._extract_features(image, geo_reference)
                
            # Create output files
            processed_image_path = output_dir / f"{file_path.stem}_processed.png"
            self._save_processed_image(image, processed_image_path)
            
            # Create GeoJSON if features found
            geojson_path = None
            if features:
                geojson = self._create_geojson(features, file_path.stem)
                geojson_path = output_dir / f"{file_path.stem}_features.geojson"
                self._save_geojson(geojson, geojson_path)
            
            # Generate metadata
            metadata = self._generate_metadata(file_path, processed_image_path, features, geo_reference)
            
            # Save metadata
            metadata_path = output_dir / f"{file_path.stem}_metadata.json"
            self._save_metadata(metadata, metadata_path)
            
            # Update statistics
            self.stats['images_processed'] += 1
            self.stats['features_extracted'] += len(features)
            
            logger.info(f"Successfully processed: {file_path}")
            
            return {
                'success': True,
                'input_file': str(file_path),
                'processed_image': str(processed_image_path),
                'geojson_file': str(geojson_path) if geojson_path else None,
                'metadata_file': str(metadata_path),
                'features_count': len(features),
                'metadata': metadata
            }
            
        except Exception as e:
            self.stats['errors_encountered'] += 1
            logger.error(f"Processing failed for {file_path}: {e}")
            
            return {
                'success': False,
                'input_file': str(file_path),
                'error': str(e)
            }
    
    def process_batch(self, file_paths: List[str], output_dir: Optional[str] = None,
                     geo_references: Optional[List[Dict]] = None) -> Dict[str, any]:
        """
        Process multiple image files in batch
        
        Args:
            file_paths: List of file paths to process
            output_dir: Output directory for all files
            geo_references: List of geo-referencing info for each file
            
        Returns:
            Dict with batch processing results
        """
        logger.info(f"Starting batch processing of {len(file_paths)} images")
        
        results = []
        
        for i, file_path in enumerate(file_paths):
            geo_ref = geo_references[i] if geo_references and i < len(geo_references) else None
            result = self.process_file(file_path, output_dir, geo_ref)
            results.append(result)
            
        successful = len([r for r in results if r['success']])
        failed = len(results) - successful
        
        logger.info(f"Batch processing completed: {successful} successful, {failed} failed")
        
        return {
            'total_images': len(file_paths),
            'successful': successful,
            'failed': failed,
            'results': results,
            'statistics': self.stats.copy()
        }
    
    def _validate_input_file(self, file_path: Path):
        """Validate input image file"""
        if not file_path.exists():
            raise FileValidationError(f"File does not exist: {file_path}")
            
        if file_path.suffix.lower() not in self.supported_formats:
            raise FileValidationError(f"Unsupported image format: {file_path.suffix}")
            
        if file_path.stat().st_size == 0:
            raise FileValidationError(f"File is empty: {file_path}")
            
        if file_path.stat().st_size > self.config.limits.max_file_size:
            raise FileValidationError(f"File too large: {file_path.stat().st_size} bytes")
            
        # Try to open image to validate format
        try:
            with Image.open(file_path) as img:
                img.verify()
        except Exception as e:
            raise FileValidationError(f"Invalid image file: {e}")
    
    def _load_and_preprocess(self, file_path: Path) -> Image.Image:
        """Load and preprocess image"""
        logger.info(f"Loading and preprocessing: {file_path}")
        
        try:
            # Open image
            image = Image.open(file_path)
            
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Apply preprocessing
            image = self._enhance_image(image)
            
            logger.info(f"Image loaded: {image.size[0]}x{image.size[1]}")
            
            return image
            
        except Exception as e:
            raise ProcessingError(f"Failed to load/preprocess image: {e}")
    
    def _enhance_image(self, image: Image.Image) -> Image.Image:
        """Enhance image quality for better feature extraction"""
        try:
            # Enhance contrast
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(1.2)
            
            # Enhance sharpness
            enhancer = ImageEnhance.Sharpness(image)
            image = enhancer.enhance(1.1)
            
            # Apply slight denoising
            image = image.filter(ImageFilter.MedianFilter(size=3))
            
            return image
            
        except Exception as e:
            logger.warning(f"Image enhancement failed: {e}")
            return image
    
    def _extract_features(self, image: Image.Image, geo_reference: Dict) -> List[Dict]:
        """Extract features from geo-referenced image"""
        logger.info("Extracting features from geo-referenced image")
        
        features = []
        
        try:
            # For basic implementation, create a bounding box feature
            # In a full implementation, you would use computer vision
            # to extract actual features from the image
            
            bbox = self._create_image_bbox(image, geo_reference)
            if bbox:
                features.append(bbox)
            
            # Placeholder for advanced feature extraction
            # This would include:
            # - Edge detection for building outlines
            # - Color segmentation for land use
            # - Pattern recognition for infrastructure
            # - Text recognition for labels
            
            logger.info(f"Extracted {len(features)} features")
            
        except Exception as e:
            logger.error(f"Feature extraction failed: {e}")
            
        return features
    
    def _create_image_bbox(self, image: Image.Image, geo_reference: Dict) -> Optional[Dict]:
        """Create bounding box feature from geo-referenced image"""
        try:
            # Extract geo-reference parameters
            bounds = geo_reference.get('bounds')  # [minx, miny, maxx, maxy]
            crs = geo_reference.get('crs', 'EPSG:4326')
            
            if not bounds or len(bounds) != 4:
                logger.warning("Invalid bounds in geo-reference")
                return None
            
            minx, miny, maxx, maxy = bounds
            
            # Transform coordinates if needed
            if crs != 'EPSG:4326':
                # Use appropriate transformer
                transformer = self.vn2000_to_wgs84  # Default
                minx, miny = transformer.transform(minx, miny)
                maxx, maxy = transformer.transform(maxx, maxy)
            
            # Create polygon coordinates
            coordinates = [[
                [minx, miny],  # bottom-left
                [maxx, miny],  # bottom-right
                [maxx, maxy],  # top-right
                [minx, maxy],  # top-left
                [minx, miny]   # close polygon
            ]]
            
            return {
                'type': 'Polygon',
                'coordinates': coordinates,
                'properties': {
                    'feature_type': 'image_bounds',
                    'source': 'geo_reference',
                    'image_width': image.size[0],
                    'image_height': image.size[1],
                    'original_crs': crs,
                    'coordinate_system': 'WGS84'
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to create image bbox: {e}")
            return None
    
    def _save_processed_image(self, image: Image.Image, output_path: Path):
        """Save processed image"""
        try:
            image.save(output_path, format='PNG', optimize=True)
            logger.info(f"Processed image saved: {output_path}")
        except Exception as e:
            logger.error(f"Failed to save processed image: {e}")
    
    def _create_geojson(self, features: List[Dict], name: str) -> Dict:
        """Create standardized GeoJSON FeatureCollection"""
        geojson_features = []
        
        for i, geom in enumerate(features):
            feature = {
                "type": "Feature",
                "geometry": {
                    "type": geom['type'],
                    "coordinates": geom['coordinates']
                },
                "properties": {
                    **geom['properties'],
                    'feature_id': f"feature_{i:04d}"
                }
            }
            geojson_features.append(feature)
        
        return {
            "type": "FeatureCollection",
            "metadata": {
                "name": name,
                "source": "Image processing",
                "coordinate_system": "WGS84 (EPSG:4326)",
                "processor": "XemGiaDat Image Processor v1.0",
                "processed_date": "2025-11-11",
                "feature_count": len(geojson_features),
                "processing_config": {
                    "geometry_tolerance": self.config.quality.geometry_tolerance,
                    "coordinate_precision": self.config.quality.coordinate_precision
                }
            },
            "features": geojson_features
        }
    
    def _save_geojson(self, geojson: Dict, output_file: Path):
        """Save GeoJSON to file"""
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(geojson, f, ensure_ascii=False, indent=2)
        
        logger.info(f"GeoJSON saved to: {output_file}")
    
    def _save_metadata(self, metadata: Dict, output_file: Path):
        """Save metadata to file"""
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)
        
        logger.info(f"Metadata saved to: {output_file}")
    
    def _generate_metadata(self, input_file: Path, output_file: Path, 
                          features: List[Dict], geo_reference: Optional[Dict]) -> Dict:
        """Generate processing metadata"""
        return {
            "processing_summary": {
                "input_file": str(input_file),
                "processed_image": str(output_file),
                "file_size_bytes": input_file.stat().st_size,
                "features_extracted": len(features),
                "geo_referenced": bool(geo_reference),
                "processing_date": "2025-11-11"
            },
            "image_properties": {
                "format": input_file.suffix.lower(),
                "size_bytes": input_file.stat().st_size
            },
            "geo_reference": geo_reference or {},
            "feature_statistics": {
                "total_features": len(features),
                "by_type": self._count_feature_types(features)
            },
            "quality_metrics": {
                "processing_successful": True,
                "coordinate_precision": self.config.quality.coordinate_precision
            }
        }
    
    def _count_feature_types(self, features: List[Dict]) -> Dict[str, int]:
        """Count features by type"""
        counts = {}
        for feature in features:
            feature_type = feature['properties'].get('feature_type', 'unknown')
            counts[feature_type] = counts.get(feature_type, 0) + 1
        return counts
    
    def get_statistics(self) -> Dict[str, any]:
        """Get processing statistics"""
        return self.stats.copy()
    
    def reset_statistics(self):
        """Reset processing statistics"""
        self.stats = {
            'images_processed': 0,
            'features_extracted': 0,
            'errors_encountered': 0,
            'processing_time': 0
        }
    
    def create_geo_reference(self, bounds: List[float], crs: str = "EPSG:4326") -> Dict:
        """
        Create geo-reference configuration
        
        Args:
            bounds: [minx, miny, maxx, maxy] coordinates
            crs: Coordinate reference system
            
        Returns:
            Geo-reference configuration dictionary
        """
        return {
            'bounds': bounds,
            'crs': crs,
            'created_date': "2025-11-11",
            'type': 'manual'
        }
    
    def extract_world_file(self, image_path: Path) -> Optional[Dict]:
        """
        Extract geo-referencing from world file (.tfw, .pgw, etc.)
        
        Args:
            image_path: Path to image file
            
        Returns:
            Geo-reference configuration or None
        """
        world_file_extensions = {
            '.tif': '.tfw',
            '.tiff': '.tfw', 
            '.png': '.pgw',
            '.jpg': '.jgw',
            '.jpeg': '.jgw'
        }
        
        img_ext = image_path.suffix.lower()
        if img_ext in world_file_extensions:
            world_file = image_path.with_suffix(world_file_extensions[img_ext])
            
            if world_file.exists():
                try:
                    with open(world_file, 'r') as f:
                        lines = [line.strip() for line in f.readlines()]
                    
                    if len(lines) >= 6:
                        pixel_x_size = float(lines[0])
                        rotation_y = float(lines[1]) 
                        rotation_x = float(lines[2])
                        pixel_y_size = float(lines[3])
                        x_coord_top_left = float(lines[4])
                        y_coord_top_left = float(lines[5])
                        
                        # Calculate bounds (simplified)
                        with Image.open(image_path) as img:
                            width, height = img.size
                        
                        minx = x_coord_top_left
                        maxx = x_coord_top_left + (width * pixel_x_size)
                        maxy = y_coord_top_left
                        miny = y_coord_top_left + (height * pixel_y_size)
                        
                        return self.create_geo_reference([minx, miny, maxx, maxy], "EPSG:32648")
                        
                except Exception as e:
                    logger.warning(f"Failed to parse world file {world_file}: {e}")
        
        return None