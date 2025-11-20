"""
Command Line Interface for XemGiaDat Data Processing
"""

import argparse
import json
import sys
from pathlib import Path
from typing import List, Optional

from ..core.dwg_processor import DWGProcessor
from ..core.image_processor import ImageProcessor
from ..utils.config import Config
from ..utils.logger import get_logger, setup_file_logging
from ..utils.exceptions import ProcessingError

logger = get_logger(__name__)

def main():
    """Main CLI entry point"""
    parser = create_parser()
    args = parser.parse_args()
    
    # Setup logging
    if args.log_file:
        setup_file_logging(Path(args.log_file), args.log_level)
    
    # Load configuration
    config = None
    if args.config:
        config = Config(Path(args.config))
    else:
        config = Config()
    
    if args.validate_config:
        if config.validate():
            print("✓ Configuration is valid")
            return 0
        else:
            print("✗ Configuration is invalid")
            return 1
    
    # Execute command
    try:
        if args.command == 'process-dwg':
            return process_dwg_command(args, config)
        elif args.command == 'process-image':
            return process_image_command(args, config)
        elif args.command == 'batch-process':
            return batch_process_command(args, config)
        elif args.command == 'config':
            return config_command(args, config)
        else:
            parser.print_help()
            return 1
            
    except Exception as e:
        logger.error(f"Command execution failed: {e}")
        return 1

def create_parser() -> argparse.ArgumentParser:
    """Create CLI argument parser"""
    parser = argparse.ArgumentParser(
        description='XemGiaDat Data Processing Tools',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Process single DWG file
  xgd-process process-dwg input.dwg --output ./processed
  
  # Process image with geo-reference
  xgd-process process-image plan.png --geo-ref bounds.json --output ./geo
  
  # Batch process multiple files
  xgd-process batch-process --input-dir ./raw --output-dir ./processed --file-types dwg,png
  
  # Generate configuration file
  xgd-process config --generate --output config.json
        """
    )
    
    # Global options
    parser.add_argument('--config', '-c', type=str,
                       help='Path to configuration file')
    parser.add_argument('--log-file', type=str,
                       help='Path to log file')
    parser.add_argument('--log-level', choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'],
                       default='INFO', help='Logging level')
    parser.add_argument('--validate-config', action='store_true',
                       help='Validate configuration and exit')
    
    # Subcommands
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # DWG processing
    dwg_parser = subparsers.add_parser('process-dwg', help='Process DWG/DXF files')
    dwg_parser.add_argument('input_file', type=str, help='Input DWG/DXF file')
    dwg_parser.add_argument('--output', '-o', type=str, help='Output directory')
    dwg_parser.add_argument('--coordinate-system', choices=['vn2000', 'utm'], 
                           default='vn2000', help='Source coordinate system')
    
    # Image processing
    img_parser = subparsers.add_parser('process-image', help='Process image files')
    img_parser.add_argument('input_file', type=str, help='Input image file')
    img_parser.add_argument('--output', '-o', type=str, help='Output directory')
    img_parser.add_argument('--geo-ref', type=str, help='Geo-reference file (JSON)')
    img_parser.add_argument('--bounds', nargs=4, type=float, metavar=('MINX', 'MINY', 'MAXX', 'MAXY'),
                           help='Bounding box coordinates')
    img_parser.add_argument('--crs', default='EPSG:4326', help='Coordinate reference system')
    
    # Batch processing
    batch_parser = subparsers.add_parser('batch-process', help='Process multiple files')
    batch_parser.add_argument('--input-dir', '-i', type=str, required=True,
                             help='Input directory')
    batch_parser.add_argument('--output-dir', '-o', type=str, required=True,
                             help='Output directory')
    batch_parser.add_argument('--file-types', type=str, default='dwg,dxf,png,jpg,tif',
                             help='Comma-separated file extensions to process')
    batch_parser.add_argument('--recursive', '-r', action='store_true',
                             help='Process files recursively')
    batch_parser.add_argument('--parallel', '-p', type=int, default=1,
                             help='Number of parallel processes')
    
    # Configuration
    config_parser = subparsers.add_parser('config', help='Configuration management')
    config_parser.add_argument('--generate', action='store_true',
                              help='Generate default configuration')
    config_parser.add_argument('--output', '-o', type=str, default='config.json',
                              help='Output file for configuration')
    config_parser.add_argument('--show', action='store_true',
                              help='Show current configuration')
    
    return parser

def process_dwg_command(args, config: Config) -> int:
    """Handle DWG processing command"""
    logger.info(f"Processing DWG file: {args.input_file}")
    
    try:
        processor = DWGProcessor(config)
        result = processor.process_file(args.input_file, args.output)
        
        if result['success']:
            print(f"✓ Successfully processed: {result['input_file']}")
            print(f"  Output: {result['output_file']}")
            print(f"  Features: {result['geometries_count']}")
            return 0
        else:
            print(f"✗ Processing failed: {result['error']}")
            return 1
            
    except Exception as e:
        logger.error(f"DWG processing failed: {e}")
        return 1

def process_image_command(args, config: Config) -> int:
    """Handle image processing command"""
    logger.info(f"Processing image file: {args.input_file}")
    
    try:
        processor = ImageProcessor(config)
        
        # Prepare geo-reference
        geo_reference = None
        if args.geo_ref:
            with open(args.geo_ref, 'r') as f:
                geo_reference = json.load(f)
        elif args.bounds:
            geo_reference = processor.create_geo_reference(args.bounds, args.crs)
        else:
            # Try to extract from world file
            geo_reference = processor.extract_world_file(Path(args.input_file))
        
        result = processor.process_file(args.input_file, args.output, geo_reference)
        
        if result['success']:
            print(f"✓ Successfully processed: {result['input_file']}")
            print(f"  Processed image: {result['processed_image']}")
            if result['geojson_file']:
                print(f"  GeoJSON: {result['geojson_file']}")
                print(f"  Features: {result['features_count']}")
            print(f"  Metadata: {result['metadata_file']}")
            return 0
        else:
            print(f"✗ Processing failed: {result['error']}")
            return 1
            
    except Exception as e:
        logger.error(f"Image processing failed: {e}")
        return 1

def batch_process_command(args, config: Config) -> int:
    """Handle batch processing command"""
    logger.info(f"Batch processing: {args.input_dir}")
    
    try:
        input_dir = Path(args.input_dir)
        output_dir = Path(args.output_dir)
        
        if not input_dir.exists():
            print(f"✗ Input directory does not exist: {input_dir}")
            return 1
        
        # Collect files to process
        file_types = [ext.strip().lower() for ext in args.file_types.split(',')]
        files_to_process = []
        
        if args.recursive:
            pattern = f"**/*"
        else:
            pattern = "*"
        
        for file_path in input_dir.glob(pattern):
            if file_path.is_file() and any(file_path.suffix.lower().lstrip('.') == ext.lstrip('.') 
                                          for ext in file_types):
                files_to_process.append(str(file_path))
        
        if not files_to_process:
            print(f"✗ No files found to process in: {input_dir}")
            return 1
        
        print(f"Found {len(files_to_process)} files to process")
        
        # Separate files by type
        dwg_files = [f for f in files_to_process if Path(f).suffix.lower() in ['.dwg', '.dxf']]
        image_files = [f for f in files_to_process if Path(f).suffix.lower() in ['.png', '.jpg', '.jpeg', '.tif', '.tiff']]
        
        total_success = 0
        total_failed = 0
        
        # Process DWG files
        if dwg_files:
            print(f"\nProcessing {len(dwg_files)} DWG/DXF files...")
            processor = DWGProcessor(config)
            result = processor.process_batch(dwg_files, str(output_dir))
            total_success += result['successful']
            total_failed += result['failed']
            print(f"DWG/DXF: {result['successful']} successful, {result['failed']} failed")
        
        # Process image files
        if image_files:
            print(f"\nProcessing {len(image_files)} image files...")
            processor = ImageProcessor(config)
            result = processor.process_batch(image_files, str(output_dir))
            total_success += result['successful']
            total_failed += result['failed']
            print(f"Images: {result['successful']} successful, {result['failed']} failed")
        
        print(f"\nBatch processing completed:")
        print(f"  Total files: {len(files_to_process)}")
        print(f"  Successful: {total_success}")
        print(f"  Failed: {total_failed}")
        
        return 0 if total_failed == 0 else 1
        
    except Exception as e:
        logger.error(f"Batch processing failed: {e}")
        return 1

def config_command(args, config: Config) -> int:
    """Handle configuration command"""
    try:
        if args.generate:
            config.save_to_file(Path(args.output))
            print(f"✓ Configuration saved to: {args.output}")
            return 0
        elif args.show:
            config_dict = config.to_dict()
            print(json.dumps(config_dict, indent=2))
            return 0
        else:
            print("Use --generate to create config or --show to display current config")
            return 1
            
    except Exception as e:
        logger.error(f"Configuration command failed: {e}")
        return 1

if __name__ == '__main__':
    sys.exit(main())