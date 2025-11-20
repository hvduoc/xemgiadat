# FILE PREPROCESSING TOOLS - XEMGIADAT.COM

Chuẩn hóa và xử lý DWG/Image files cho Project Map Integration System

## 🎯 Tính năng chính

### 📐 DWG/DXF Processing
- **Coordinate Transformation**: VN-2000, UTM → WGS84
- **Geometry Extraction**: Lines, Polylines, Circles → GeoJSON
- **Data Validation**: Topology check, geometry cleanup
- **Web Optimization**: File size reduction, format standardization

### 🖼️ Image Processing  
- **Format Optimization**: PNG/JPEG → Web-optimized JPEG
- **Size Standardization**: 1920x1080 minimum, 4K maximum
- **Quality Enhancement**: Contrast, sharpness optimization
- **Metadata Generation**: Geo-reference preparation

### 🤝 Data Harmonization
- **TNMT-Project Mapping**: Automatic feature matching
- **Conflict Resolution**: Rule-based data prioritization
- **Quality Scoring**: Confidence and completeness metrics
- **Batch Processing**: Multiple files simultaneously

## 🚀 Quick Start

### Windows
```bash
# Run setup (as Administrator)
setup.bat

# Process DWG files
python preprocess.py dwg input\dwg\ output\ --batch

# Process images
python preprocess.py image input\images\ output\ --batch
```

### Linux/macOS
```bash
# Run setup
chmod +x setup.sh && ./setup.sh

# Process DWG files
python preprocess.py dwg input/dwg/ output/ --batch

# Process images  
python preprocess.py image input/images/ output/ --batch
```

## 📋 Yêu cầu hệ thống

### Python Dependencies
```bash
pip install -r requirements.txt
```

### System Tools
- **Windows**: ODA File Converter
- **Linux**: teigha2dwg, GDAL
- **macOS**: GDAL (via Homebrew)

## 🔧 Usage Examples

### 1. Single DWG File
```bash
python preprocess.py dwg project1.dwg output/
```

### 2. Batch DWG Processing
```bash
python preprocess.py dwg input/dwg/ output/ --batch
```

### 3. Image Optimization
```bash
python preprocess.py image map.jpg output/
```

### 4. TNMT-Project Harmonization
```bash
python preprocess.py harmonize tnmt.geojson output/ project.geojson
```

## 📊 Output Files

### DWG Processing
```
output/
├── project1_standardized.geojson    # Converted geometry
├── project1_metadata.json          # Processing metadata
└── validation_report.json          # Quality checks
```

### Image Processing
```
output/
├── map_optimized.jpg               # Web-optimized image
├── map_metadata.json              # Image metadata  
└── georef_template.json           # Geo-reference template
```

### Data Harmonization
```
output/
├── tnmt_project_mapping.json      # Feature mappings
├── conflict_resolution.json       # Data conflicts
└── quality_report.json           # Data quality metrics
```

## 🎯 Configuration

### Coordinate Systems
```python
# Vietnam coordinate systems
VN2000_ZONE = "EPSG:3405"  # VN-2000 / 3-degree Gauss-Kruger zone 104
UTM_ZONE = "EPSG:32648"    # WGS 84 / UTM zone 48N
OUTPUT_CRS = "EPSG:4326"   # WGS84 Geographic
```

### Processing Settings
```python
# Image optimization
MAX_SIZE = (3840, 2160)    # 4K maximum
MIN_SIZE = (1920, 1080)    # HD minimum
JPEG_QUALITY = 90          # High quality

# Geometry validation
MIN_AREA = 1.0             # Square meters
MAX_VERTICES = 1000        # Per polygon
SIMPLIFY_TOLERANCE = 0.001 # Degrees
```

## 🚨 Troubleshooting

### DWG Conversion Issues
```bash
# Install ODA File Converter (Windows)
# Download: https://www.opendesign.com/guestfiles

# Install teigha2dwg (Linux)
sudo apt-get install teigha-tools

# Check file permissions
chmod 755 input/dwg/*.dwg
```

### Coordinate Transformation Errors
```python
# Verify EPSG codes
import pyproj
crs = pyproj.CRS.from_epsg(3405)
print(crs.to_wkt())

# Check coordinate ranges
# VN-2000: X: 500000-900000, Y: 1000000-2500000
# WGS84: Lon: 102-110°, Lat: 8-24°
```

### Memory Issues
```bash
# Process in smaller batches
python preprocess.py dwg input/batch1/ output/ --batch
python preprocess.py dwg input/batch2/ output/ --batch

# Monitor memory usage
htop  # Linux
taskmgr  # Windows
```

## 📈 Performance Optimization

### Batch Processing
- **Small files** (<10MB): 50-100 files per batch
- **Large files** (>10MB): 10-20 files per batch  
- **Memory limit**: Monitor RAM usage < 8GB

### Parallel Processing
```python
# Enable multiprocessing for large batches
from multiprocessing import Pool

with Pool(processes=4) as pool:
    results = pool.map(process_file, file_list)
```

## 🔒 Data Quality Standards

### DWG Files
- ✅ Coordinate system documented
- ✅ Layer organization standard
- ✅ Geometry topology valid
- ✅ File size optimized (<50MB)

### Image Files
- ✅ Resolution 1920x1080 minimum
- ✅ Geo-reference coordinates documented
- ✅ Quality enhancement applied
- ✅ Web format optimized

### Harmonized Data
- ✅ Feature matching >80% confidence
- ✅ Conflict resolution rules applied
- ✅ Quality scores documented
- ✅ Metadata completeness >90%

## 📞 Support

### Documentation
- **API Reference**: See docstrings in preprocess.py
- **Examples**: Check examples/ directory
- **FAQ**: Common issues and solutions

### Contact
- **Technical Issues**: GitHub Issues
- **Data Problems**: Contact GIS team
- **Integration Support**: Development team

---

*Created by Supreme Commander for XemGiaDat.com Project Map Integration*
*Last updated: November 9, 2025*