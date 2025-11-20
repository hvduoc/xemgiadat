"""
Logging configuration for data processing
"""

import logging
import sys
from pathlib import Path
from typing import Optional

def get_logger(name: str, log_level: str = "INFO") -> logging.Logger:
    """
    Create configured logger instance
    
    Args:
        name: Logger name (usually __name__)
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    
    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)
    
    # Avoid duplicate handlers
    if logger.handlers:
        return logger
    
    # Set log level
    logger.setLevel(getattr(logging, log_level.upper()))
    
    # Create formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    return logger

def setup_file_logging(log_file: Optional[Path] = None, log_level: str = "INFO"):
    """
    Setup file logging for all loggers
    
    Args:
        log_file: Path to log file (optional)
        log_level: Logging level
    """
    if log_file:
        log_file = Path(log_file)
        log_file.parent.mkdir(parents=True, exist_ok=True)
        
        # File handler
        file_handler = logging.FileHandler(log_file)
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        file_handler.setFormatter(formatter)
        
        # Add to root logger
        root_logger = logging.getLogger()
        root_logger.addHandler(file_handler)
        root_logger.setLevel(getattr(logging, log_level.upper()))