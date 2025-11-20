"""
Custom exceptions for data processing operations
"""

class ProcessingError(Exception):
    """Base exception for processing errors"""
    pass

class CoordinateTransformError(ProcessingError):
    """Exception for coordinate transformation errors"""
    pass

class FileValidationError(ProcessingError):
    """Exception for file validation errors"""
    pass

class GeometryError(ProcessingError):
    """Exception for geometry processing errors"""
    pass

class ConfigurationError(ProcessingError):
    """Exception for configuration errors"""
    pass

class DataQualityError(ProcessingError):
    """Exception for data quality issues"""
    pass