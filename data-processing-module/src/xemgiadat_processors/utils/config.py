"""
Configuration management for data processing
"""

import os
from pathlib import Path
from typing import Dict, Any, Optional
import json

class CoordinateSystems:
    """Coordinate system configuration"""
    
    def __init__(self):
        self.source_vn2000 = "EPSG:3405"  # VN-2000 / UTM zone 48N
        self.source_utm = "EPSG:32648"    # WGS 84 / UTM zone 48N
        self.target_wgs84 = "EPSG:4326"   # WGS 84

class QualitySettings:
    """Quality control settings"""
    
    def __init__(self):
        self.geometry_tolerance = 0.001  # meters
        self.coordinate_precision = 6    # decimal places
        self.min_area = 1.0             # minimum polygon area
        self.max_vertices = 10000       # maximum vertices per feature

class LimitsSettings:
    """Processing limits"""
    
    def __init__(self):
        self.max_file_size = 100 * 1024 * 1024  # 100MB
        self.max_features = 50000               # maximum features per file
        self.timeout_seconds = 300              # 5 minutes

class Config:
    """
    Main configuration class for data processing
    
    Provides centralized configuration management with defaults
    and environment variable overrides
    """
    
    def __init__(self, config_file: Optional[Path] = None):
        """
        Initialize configuration
        
        Args:
            config_file: Optional path to JSON config file
        """
        # Initialize sub-configurations
        self.coordinate_systems = CoordinateSystems()
        self.quality = QualitySettings()
        self.limits = LimitsSettings()
        
        # Processing settings
        self.processing = {
            'parallel_workers': min(4, os.cpu_count() or 1),
            'chunk_size': 1000,
            'memory_limit_mb': 512,
            'temp_dir': Path.cwd() / 'temp',
            'output_format': 'geojson'
        }
        
        # Tool paths
        self.tools = {
            'oda_converter': self._find_oda_converter(),
            'teigha2dwg': self._find_teigha(),
            'python_executable': self._find_python()
        }
        
        # Load from config file if provided
        if config_file and config_file.exists():
            self._load_from_file(config_file)
            
        # Override with environment variables
        self._load_from_env()
    
    def _find_oda_converter(self) -> Optional[str]:
        """Find ODA File Converter executable"""
        import shutil
        return shutil.which("ODAFileConverter")
    
    def _find_teigha(self) -> Optional[str]:
        """Find Teigha DWG converter"""
        import shutil
        return shutil.which("teigha2dwg")
    
    def _find_python(self) -> str:
        """Find Python executable"""
        import sys
        return sys.executable
    
    def _load_from_file(self, config_file: Path):
        """Load configuration from JSON file"""
        try:
            with open(config_file, 'r', encoding='utf-8') as f:
                config_data = json.load(f)
                
            # Update processing settings
            if 'processing' in config_data:
                self.processing.update(config_data['processing'])
                
            # Update coordinate systems
            if 'coordinate_systems' in config_data:
                cs_data = config_data['coordinate_systems']
                if 'source_vn2000' in cs_data:
                    self.coordinate_systems.source_vn2000 = cs_data['source_vn2000']
                if 'source_utm' in cs_data:
                    self.coordinate_systems.source_utm = cs_data['source_utm']
                if 'target_wgs84' in cs_data:
                    self.coordinate_systems.target_wgs84 = cs_data['target_wgs84']
                    
            # Update quality settings
            if 'quality' in config_data:
                q_data = config_data['quality']
                if 'geometry_tolerance' in q_data:
                    self.quality.geometry_tolerance = q_data['geometry_tolerance']
                if 'coordinate_precision' in q_data:
                    self.quality.coordinate_precision = q_data['coordinate_precision']
                if 'min_area' in q_data:
                    self.quality.min_area = q_data['min_area']
                if 'max_vertices' in q_data:
                    self.quality.max_vertices = q_data['max_vertices']
                    
            # Update limits
            if 'limits' in config_data:
                l_data = config_data['limits']
                if 'max_file_size' in l_data:
                    self.limits.max_file_size = l_data['max_file_size']
                if 'max_features' in l_data:
                    self.limits.max_features = l_data['max_features']
                if 'timeout_seconds' in l_data:
                    self.limits.timeout_seconds = l_data['timeout_seconds']
                    
        except Exception as e:
            print(f"Warning: Could not load config file {config_file}: {e}")
    
    def _load_from_env(self):
        """Load configuration from environment variables"""
        # Coordinate systems
        if os.getenv('XGD_SOURCE_VN2000'):
            self.coordinate_systems.source_vn2000 = os.getenv('XGD_SOURCE_VN2000')
        if os.getenv('XGD_SOURCE_UTM'):
            self.coordinate_systems.source_utm = os.getenv('XGD_SOURCE_UTM')
        if os.getenv('XGD_TARGET_WGS84'):
            self.coordinate_systems.target_wgs84 = os.getenv('XGD_TARGET_WGS84')
            
        # Processing settings
        if os.getenv('XGD_PARALLEL_WORKERS'):
            self.processing['parallel_workers'] = int(os.getenv('XGD_PARALLEL_WORKERS'))
        if os.getenv('XGD_MEMORY_LIMIT_MB'):
            self.processing['memory_limit_mb'] = int(os.getenv('XGD_MEMORY_LIMIT_MB'))
        if os.getenv('XGD_TEMP_DIR'):
            self.processing['temp_dir'] = Path(os.getenv('XGD_TEMP_DIR'))
            
        # Quality settings
        if os.getenv('XGD_GEOMETRY_TOLERANCE'):
            self.quality.geometry_tolerance = float(os.getenv('XGD_GEOMETRY_TOLERANCE'))
        if os.getenv('XGD_COORDINATE_PRECISION'):
            self.quality.coordinate_precision = int(os.getenv('XGD_COORDINATE_PRECISION'))
            
        # Limits
        if os.getenv('XGD_MAX_FILE_SIZE'):
            self.limits.max_file_size = int(os.getenv('XGD_MAX_FILE_SIZE'))
        if os.getenv('XGD_MAX_FEATURES'):
            self.limits.max_features = int(os.getenv('XGD_MAX_FEATURES'))
        if os.getenv('XGD_TIMEOUT_SECONDS'):
            self.limits.timeout_seconds = int(os.getenv('XGD_TIMEOUT_SECONDS'))
    
    def to_dict(self) -> Dict[str, Any]:
        """Export configuration as dictionary"""
        return {
            'coordinate_systems': {
                'source_vn2000': self.coordinate_systems.source_vn2000,
                'source_utm': self.coordinate_systems.source_utm,
                'target_wgs84': self.coordinate_systems.target_wgs84
            },
            'quality': {
                'geometry_tolerance': self.quality.geometry_tolerance,
                'coordinate_precision': self.quality.coordinate_precision,
                'min_area': self.quality.min_area,
                'max_vertices': self.quality.max_vertices
            },
            'limits': {
                'max_file_size': self.limits.max_file_size,
                'max_features': self.limits.max_features,
                'timeout_seconds': self.limits.timeout_seconds
            },
            'processing': self.processing.copy(),
            'tools': self.tools.copy()
        }
    
    def save_to_file(self, config_file: Path):
        """Save configuration to JSON file"""
        config_file.parent.mkdir(parents=True, exist_ok=True)
        
        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump(self.to_dict(), f, ensure_ascii=False, indent=2)
    
    def validate(self) -> bool:
        """Validate configuration settings"""
        try:
            # Check coordinate systems
            if not self.coordinate_systems.source_vn2000.startswith('EPSG:'):
                return False
            if not self.coordinate_systems.target_wgs84.startswith('EPSG:'):
                return False
                
            # Check limits
            if self.limits.max_file_size <= 0:
                return False
            if self.limits.max_features <= 0:
                return False
            if self.limits.timeout_seconds <= 0:
                return False
                
            # Check quality settings
            if self.quality.geometry_tolerance <= 0:
                return False
            if self.quality.coordinate_precision < 0:
                return False
                
            # Check processing settings
            if self.processing['parallel_workers'] <= 0:
                return False
            if self.processing['memory_limit_mb'] <= 0:
                return False
                
            return True
            
        except Exception:
            return False