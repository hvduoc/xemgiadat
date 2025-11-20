"""
XemGiaDat Data Processing Module
Professional geospatial data processing toolkit for real estate applications
"""

__version__ = "1.0.0"
__author__ = "XemGiaDat Development Team"
__email__ = "dev@xemgiadat.com"

"""
XemGiaDat Data Processing Module
Professional geospatial data processing toolkit for real estate applications
"""

__version__ = "1.0.0"
__author__ = "XemGiaDat Development Team"
__email__ = "dev@xemgiadat.com"

# Core processors
from .core.dwg_processor import DWGProcessor
from .core.image_processor import ImageProcessor

# Utilities
from .utils.config import Config
from .utils.logger import get_logger
from .utils.exceptions import (
    ProcessingError,
    CoordinateTransformError,
    FileValidationError,
    GeometryError
)

# CLI entry point
from .cli.main import main as cli_main

# Version info
VERSION_INFO = {
    "major": 1,
    "minor": 0,
    "patch": 0,
    "pre_release": None
}

__all__ = [
    "DWGProcessor",
    "ImageProcessor",
    "Config",
    "get_logger",
    "ProcessingError",
    "CoordinateTransformError",
    "FileValidationError",
    "GeometryError",
    "cli_main",
    "__version__",
    "VERSION_INFO"
]