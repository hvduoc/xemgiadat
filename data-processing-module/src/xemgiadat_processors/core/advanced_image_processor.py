"""
Advanced Image Processor with Computer Vision
Phân tích chi tiết ảnh dự án bất động sản và trích xuất các đối tượng thực tế
"""

import json
from pathlib import Path
from typing import List, Dict, Optional, Tuple
import numpy as np

try:
    from PIL import Image, ImageEnhance, ImageFilter, ImageDraw
    import cv2
    from skimage import segmentation, measure, filters, morphology
    from skimage.feature import corner_harris, corner_subpix, corner_peaks
    from skimage.color import rgb2gray
except ImportError as e:
    print(f"Advanced libraries missing: {e}")
    print("Install with: pip install opencv-python scikit-image")

from ..utils.logger import get_logger
from .image_processor import ImageProcessor

logger = get_logger(__name__)

class AdvancedImageProcessor(ImageProcessor):
    """
    Advanced Image Processor với Computer Vision
    
    Tính năng nâng cao:
    - Phát hiện đường viền tòa nhà, lô đất
    - Phân đoạn màu sắc cho các khu vực khác nhau
    - Nhận diện pattern đường xá, cây xanh
    - Trích xuất text và labels
    - Vector hóa các đối tượng phức tạp
    """
    
    def __init__(self, config=None):
        super().__init__(config)
        
        # Computer Vision parameters
        self.cv_params = {
            # Edge detection
            'canny_low': 50,
            'canny_high': 150,
            'blur_kernel': 5,
            
            # Contour detection
            'min_contour_area': 100,
            'contour_epsilon': 0.02,
            
            # Color segmentation
            'n_segments': 100,
            'compactness': 10,
            
            # Building detection
            'min_building_area': 500,
            'building_aspect_ratio': (0.5, 3.0),
            
            # Road detection
            'road_width_min': 10,
            'road_length_min': 50
        }
    
    def _extract_features(self, image: Image.Image, geo_reference: Dict) -> List[Dict]:
        """
        Trích xuất features nâng cao từ ảnh dự án
        
        Args:
            image: PIL Image object
            geo_reference: Thông tin tọa độ địa lý
            
        Returns:
            List các features được phát hiện
        """
        logger.info("🔍 Bắt đầu phân tích chi tiết ảnh với Computer Vision...")
        
        features = []
        
        try:
            # Convert PIL to numpy array
            img_array = np.array(image)
            
            # 1. PHÁT HIỆN TÒAS NHÀ VÀ CẤU TRÚC
            building_features = self._detect_buildings(img_array, geo_reference)
            features.extend(building_features)
            
            # 2. PHÁT HIỆN ĐƯỜNG XÁ
            road_features = self._detect_roads(img_array, geo_reference)  
            features.extend(road_features)
            
            # 3. PHÂN ĐOẠN KHU VỰC (LÔ ĐẤT)
            plot_features = self._segment_plots(img_array, geo_reference)
            features.extend(plot_features)
            
            # 4. PHÁT HIỆN THẢM XANH/CÔNG VIÊN
            vegetation_features = self._detect_vegetation(img_array, geo_reference)
            features.extend(vegetation_features)
            
            # 5. PHÁT HIỆN CÁC TIỆN ÍCH
            amenity_features = self._detect_amenities(img_array, geo_reference)
            features.extend(amenity_features)
            
            logger.info(f"✅ Phân tích hoàn tất: {len(features)} đối tượng được phát hiện")
            
            # Log chi tiết
            feature_types = {}
            for f in features:
                ftype = f['properties'].get('feature_type', 'unknown')
                feature_types[ftype] = feature_types.get(ftype, 0) + 1
                
            for ftype, count in feature_types.items():
                logger.info(f"   📊 {ftype}: {count} đối tượng")
                
        except Exception as e:
            logger.error(f"❌ Lỗi phân tích ảnh: {e}")
            # Fallback to basic bbox
            bbox = self._create_image_bbox(image, geo_reference)
            if bbox:
                features.append(bbox)
        
        return features
    
    def _detect_buildings(self, img_array: np.ndarray, geo_reference: Dict) -> List[Dict]:
        """Phát hiện các tòa nhà và cấu trúc"""
        logger.info("🏢 Phát hiện tòa nhà và cấu trúc...")
        
        buildings = []
        
        try:
            # Convert to grayscale
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            
            # Apply Gaussian blur
            blurred = cv2.GaussianBlur(gray, (self.cv_params['blur_kernel'], 
                                            self.cv_params['blur_kernel']), 0)
            
            # Edge detection
            edges = cv2.Canny(blurred, 
                             self.cv_params['canny_low'], 
                             self.cv_params['canny_high'])
            
            # Find contours
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            bounds = geo_reference.get('bounds', [108.15, 16.0, 108.18, 16.03])
            img_h, img_w = img_array.shape[:2]
            
            for i, contour in enumerate(contours):
                area = cv2.contourArea(contour)
                
                if area < self.cv_params['min_building_area']:
                    continue
                
                # Approximate contour
                epsilon = self.cv_params['contour_epsilon'] * cv2.arcLength(contour, True)
                approx = cv2.approxPolyDP(contour, epsilon, True)
                
                # Check if it looks like a building (rectangular-ish)
                if len(approx) >= 4:
                    # Convert pixel coordinates to geo coordinates
                    geo_coords = []
                    for point in approx:
                        px, py = point[0]
                        geo_x, geo_y = self._pixel_to_geo(px, py, bounds, img_w, img_h)
                        geo_coords.append([geo_x, geo_y])
                    
                    # Close polygon
                    geo_coords.append(geo_coords[0])
                    
                    # Calculate building properties
                    rect = cv2.minAreaRect(contour)
                    width, height = rect[1]
                    aspect_ratio = max(width, height) / min(width, height) if min(width, height) > 0 else 1
                    
                    # Filter by aspect ratio (buildings shouldn't be too elongated)
                    min_ratio, max_ratio = self.cv_params['building_aspect_ratio']
                    if min_ratio <= aspect_ratio <= max_ratio:
                        building = {
                            'type': 'Polygon',
                            'coordinates': [geo_coords],
                            'properties': {
                                'feature_type': 'building',
                                'building_type': self._classify_building(area, aspect_ratio),
                                'area_pixels': int(area),
                                'area_sqm': int(area * 0.25),  # Approximate scale
                                'aspect_ratio': round(aspect_ratio, 2),
                                'confidence': self._calculate_building_confidence(contour, area),
                                'source': 'edge_detection'
                            }
                        }
                        buildings.append(building)
            
            logger.info(f"   🏢 Phát hiện {len(buildings)} tòa nhà")
            
        except Exception as e:
            logger.error(f"Lỗi phát hiện tòa nhà: {e}")
        
        return buildings
    
    def _detect_roads(self, img_array: np.ndarray, geo_reference: Dict) -> List[Dict]:
        """Phát hiện đường xá và hệ thống giao thông"""
        logger.info("🛣️ Phát hiện đường xá...")
        
        roads = []
        
        try:
            # Convert to grayscale
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            
            # Threshold to find light areas (roads are usually lighter)
            _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            
            # Morphological operations to clean up
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
            cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
            
            # Find contours
            contours, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            bounds = geo_reference.get('bounds', [108.15, 16.0, 108.18, 16.03])
            img_h, img_w = img_array.shape[:2]
            
            for i, contour in enumerate(contours):
                area = cv2.contourArea(contour)
                
                if area < 200:  # Skip very small areas
                    continue
                
                # Check if it's road-like (elongated)
                rect = cv2.minAreaRect(contour)
                width, height = rect[1]
                aspect_ratio = max(width, height) / min(width, height) if min(width, height) > 0 else 1
                
                # Roads are typically elongated
                if aspect_ratio > 3 and min(width, height) > self.cv_params['road_width_min']:
                    # Convert to geo coordinates
                    geo_coords = []
                    approx = cv2.approxPolyDP(contour, 2, True)
                    
                    for point in approx:
                        px, py = point[0]
                        geo_x, geo_y = self._pixel_to_geo(px, py, bounds, img_w, img_h)
                        geo_coords.append([geo_x, geo_y])
                    
                    geo_coords.append(geo_coords[0])  # Close polygon
                    
                    road = {
                        'type': 'Polygon',
                        'coordinates': [geo_coords],
                        'properties': {
                            'feature_type': 'road',
                            'road_type': self._classify_road(width, height, area),
                            'width_meters': round(min(width, height) * 0.5, 1),
                            'area_pixels': int(area),
                            'aspect_ratio': round(aspect_ratio, 2),
                            'source': 'morphological_analysis'
                        }
                    }
                    roads.append(road)
            
            logger.info(f"   🛣️ Phát hiện {len(roads)} đoạn đường")
            
        except Exception as e:
            logger.error(f"Lỗi phát hiện đường: {e}")
        
        return roads
    
    def _segment_plots(self, img_array: np.ndarray, geo_reference: Dict) -> List[Dict]:
        """Phân đoạn các lô đất/khu vực"""
        logger.info("🏞️ Phân đoạn lô đất...")
        
        plots = []
        
        try:
            # Use SLIC superpixel segmentation
            segments = segmentation.slic(img_array, 
                                       n_segments=self.cv_params['n_segments'],
                                       compactness=self.cv_params['compactness'],
                                       start_label=1)
            
            # Find region properties
            regions = measure.regionprops(segments, img_array)
            
            bounds = geo_reference.get('bounds', [108.15, 16.0, 108.18, 16.03])
            img_h, img_w = img_array.shape[:2]
            
            for region in regions:
                if region.area < 300:  # Skip very small regions
                    continue
                
                # Get boundary coordinates
                coords = region.coords
                
                # Create convex hull for cleaner boundaries  
                try:
                    from scipy.spatial import ConvexHull
                    hull = ConvexHull(coords)
                    boundary_coords = coords[hull.vertices]
                except:
                    boundary_coords = coords[::10]  # Sample points if scipy not available
                
                # Convert to geo coordinates
                geo_coords = []
                for y, x in boundary_coords:
                    geo_x, geo_y = self._pixel_to_geo(x, y, bounds, img_w, img_h)
                    geo_coords.append([geo_x, geo_y])
                
                geo_coords.append(geo_coords[0])  # Close polygon
                
                # Analyze region color for classification
                mean_color = region.mean_intensity
                plot_type = self._classify_plot_by_color(mean_color)
                
                plot = {
                    'type': 'Polygon', 
                    'coordinates': [geo_coords],
                    'properties': {
                        'feature_type': 'plot',
                        'plot_type': plot_type,
                        'area_pixels': int(region.area),
                        'area_sqm': int(region.area * 0.25),  # Approximate
                        'mean_intensity': float(mean_color),
                        'eccentricity': float(region.eccentricity),
                        'source': 'superpixel_segmentation'
                    }
                }
                plots.append(plot)
                
                if len(plots) >= 20:  # Limit number of plots
                    break
            
            logger.info(f"   🏞️ Phân đoạn {len(plots)} lô đất")
            
        except Exception as e:
            logger.error(f"Lỗi phân đoạn lô: {e}")
        
        return plots
    
    def _detect_vegetation(self, img_array: np.ndarray, geo_reference: Dict) -> List[Dict]:
        """Phát hiện khu vực cây xanh"""
        logger.info("🌳 Phát hiện thảm xanh...")
        
        vegetation = []
        
        try:
            # Convert to HSV for better green detection
            hsv = cv2.cvtColor(img_array, cv2.COLOR_RGB2HSV)
            
            # Define range for green color
            lower_green = np.array([35, 40, 40])
            upper_green = np.array([85, 255, 255]) 
            
            # Create mask for green areas
            green_mask = cv2.inRange(hsv, lower_green, upper_green)
            
            # Clean up the mask
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
            green_mask = cv2.morphologyEx(green_mask, cv2.MORPH_CLOSE, kernel)
            green_mask = cv2.morphologyEx(green_mask, cv2.MORPH_OPEN, kernel)
            
            # Find contours
            contours, _ = cv2.findContours(green_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            bounds = geo_reference.get('bounds', [108.15, 16.0, 108.18, 16.03])
            img_h, img_w = img_array.shape[:2]
            
            for i, contour in enumerate(contours):
                area = cv2.contourArea(contour)
                
                if area < 150:  # Skip small vegetation patches
                    continue
                
                # Simplify contour
                epsilon = 0.03 * cv2.arcLength(contour, True)
                approx = cv2.approxPolyDP(contour, epsilon, True)
                
                # Convert to geo coordinates
                geo_coords = []
                for point in approx:
                    px, py = point[0]
                    geo_x, geo_y = self._pixel_to_geo(px, py, bounds, img_w, img_h)
                    geo_coords.append([geo_x, geo_y])
                
                geo_coords.append(geo_coords[0])  # Close polygon
                
                vegetation_area = {
                    'type': 'Polygon',
                    'coordinates': [geo_coords],
                    'properties': {
                        'feature_type': 'vegetation',
                        'vegetation_type': self._classify_vegetation(area),
                        'area_pixels': int(area),
                        'area_sqm': int(area * 0.25),
                        'density': self._calculate_vegetation_density(contour, green_mask),
                        'source': 'color_segmentation'
                    }
                }
                vegetation.append(vegetation_area)
                
                if len(vegetation) >= 10:  # Limit vegetation areas
                    break
            
            logger.info(f"   🌳 Phát hiện {len(vegetation)} khu vực cây xanh")
            
        except Exception as e:
            logger.error(f"Lỗi phát hiện thảm xanh: {e}")
        
        return vegetation
    
    def _detect_amenities(self, img_array: np.ndarray, geo_reference: Dict) -> List[Dict]:
        """Phát hiện các tiện ích (hồ bơi, sân chơi, etc.)"""
        logger.info("🏊 Phát hiện tiện ích...")
        
        amenities = []
        
        try:
            # Convert to different color spaces for analysis
            hsv = cv2.cvtColor(img_array, cv2.COLOR_RGB2HSV)
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            
            # Detect blue areas (potentially pools)
            lower_blue = np.array([100, 50, 50])
            upper_blue = np.array([130, 255, 255])
            blue_mask = cv2.inRange(hsv, lower_blue, upper_blue)
            
            # Find blue contours
            contours, _ = cv2.findContours(blue_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            bounds = geo_reference.get('bounds', [108.15, 16.0, 108.18, 16.03])
            img_h, img_w = img_array.shape[:2]
            
            for contour in contours:
                area = cv2.contourArea(contour)
                
                if 100 < area < 5000:  # Pool-sized areas
                    # Check if it's roughly circular/rectangular (pool-like)
                    rect = cv2.minAreaRect(contour)
                    aspect_ratio = max(rect[1]) / min(rect[1]) if min(rect[1]) > 0 else 1
                    
                    if aspect_ratio < 3:  # Not too elongated
                        # Convert to geo coordinates
                        epsilon = 0.02 * cv2.arcLength(contour, True)
                        approx = cv2.approxPolyDP(contour, epsilon, True)
                        
                        geo_coords = []
                        for point in approx:
                            px, py = point[0]
                            geo_x, geo_y = self._pixel_to_geo(px, py, bounds, img_w, img_h)
                            geo_coords.append([geo_x, geo_y])
                        
                        geo_coords.append(geo_coords[0])  # Close polygon
                        
                        amenity = {
                            'type': 'Polygon',
                            'coordinates': [geo_coords],
                            'properties': {
                                'feature_type': 'amenity',
                                'amenity_type': 'pool',
                                'area_pixels': int(area),
                                'area_sqm': int(area * 0.25),
                                'confidence': 0.7,
                                'source': 'color_detection'
                            }
                        }
                        amenities.append(amenity)
            
            logger.info(f"   🏊 Phát hiện {len(amenities)} tiện ích")
            
        except Exception as e:
            logger.error(f"Lỗi phát hiện tiện ích: {e}")
        
        return amenities
    
    def _pixel_to_geo(self, px: float, py: float, bounds: List[float], 
                     img_w: int, img_h: int) -> Tuple[float, float]:
        """Chuyển đổi từ pixel coordinates sang geo coordinates"""
        minx, miny, maxx, maxy = bounds
        
        # Convert pixel to normalized coordinates (0-1)
        norm_x = px / img_w
        norm_y = 1 - (py / img_h)  # Flip Y axis
        
        # Scale to geo bounds
        geo_x = minx + norm_x * (maxx - minx)
        geo_y = miny + norm_y * (maxy - miny)
        
        return round(geo_x, 6), round(geo_y, 6)
    
    def _classify_building(self, area: float, aspect_ratio: float) -> str:
        """Phân loại loại tòa nhà dựa trên diện tích và tỷ lệ"""
        if area > 2000:
            return "large_building"
        elif area > 800:
            return "medium_building"
        elif aspect_ratio > 2:
            return "elongated_building"
        else:
            return "small_building"
    
    def _classify_road(self, width: float, height: float, area: float) -> str:
        """Phân loại loại đường"""
        road_width = min(width, height)
        if road_width > 30:
            return "main_road"
        elif road_width > 15:
            return "secondary_road"
        else:
            return "pathway"
    
    def _classify_plot_by_color(self, mean_intensity: float) -> str:
        """Phân loại lô đất theo màu sắc trung bình"""
        if mean_intensity > 180:
            return "paved_area"
        elif mean_intensity > 120:
            return "developed_plot"
        elif mean_intensity > 80:
            return "partially_developed"
        else:
            return "undeveloped_plot"
    
    def _classify_vegetation(self, area: float) -> str:
        """Phân loại thảm xanh"""
        if area > 1000:
            return "park"
        elif area > 400:
            return "garden"
        else:
            return "landscaping"
    
    def _calculate_building_confidence(self, contour: np.ndarray, area: float) -> float:
        """Tính độ tin cậy của việc phát hiện tòa nhà"""
        # Simple confidence based on area and shape regularity
        perimeter = cv2.arcLength(contour, True)
        if perimeter > 0:
            circularity = 4 * np.pi * area / (perimeter * perimeter)
            return min(0.9, max(0.1, circularity + 0.3))
        return 0.5
    
    def _calculate_vegetation_density(self, contour: np.ndarray, mask: np.ndarray) -> float:
        """Tính mật độ thảm xanh trong khu vực"""
        # Create contour mask
        contour_mask = np.zeros(mask.shape, dtype=np.uint8)
        cv2.fillPoly(contour_mask, [contour], 255)
        
        # Calculate intersection
        intersection = cv2.bitwise_and(mask, contour_mask)
        total_pixels = np.sum(contour_mask > 0)
        green_pixels = np.sum(intersection > 0)
        
        return round(green_pixels / total_pixels if total_pixels > 0 else 0, 2)