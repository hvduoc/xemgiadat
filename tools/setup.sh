#!/bin/bash
# QUICK SETUP SCRIPT - FILE PREPROCESSING TOOLS
# Run: chmod +x setup.sh && ./setup.sh

echo "🚀 SETTING UP FILE PREPROCESSING TOOLS"
echo "======================================"

# Check Python version
python_version=$(python3 --version 2>&1 | grep -o '[0-9]\+\.[0-9]\+')
if [[ $(echo "$python_version >= 3.8" | bc -l) -eq 1 ]]; then
    echo "✅ Python $python_version detected"
else
    echo "❌ Python 3.8+ required. Current: $python_version"
    exit 1
fi

# Create virtual environment
echo "📦 Creating virtual environment..."
python3 -m venv venv
source venv/bin/activate

# Install requirements
echo "📚 Installing Python packages..."
pip install --upgrade pip
pip install -r requirements.txt

# Check for system tools
echo "🔧 Checking system tools..."

# Check for GDAL
if command -v gdal-config &> /dev/null; then
    echo "✅ GDAL found: $(gdal-config --version)"
else
    echo "⚠️ GDAL not found. Install with:"
    echo "   Ubuntu: sudo apt-get install gdal-bin python3-gdal"
    echo "   macOS: brew install gdal"
    echo "   Windows: Use OSGeo4W or conda"
fi

# Check for ODA File Converter (Windows)
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    if command -v ODAFileConverter &> /dev/null; then
        echo "✅ ODA File Converter found"
    else
        echo "⚠️ ODA File Converter not found. Download from:"
        echo "   https://www.opendesign.com/guestfiles"
    fi
fi

# Check for teigha2dwg (Linux)
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    if command -v teigha2dwg &> /dev/null; then
        echo "✅ teigha2dwg found"
    else
        echo "⚠️ teigha2dwg not found. Install Teigha tools"
    fi
fi

# Create sample directory structure
echo "📁 Creating directory structure..."
mkdir -p {input/{dwg,images},output/{geojson,optimized,mappings},temp}

echo ""
echo "🎯 SETUP COMPLETE!"
echo "=================="
echo ""
echo "📋 USAGE EXAMPLES:"
echo ""
echo "1. Process single DWG file:"
echo "   python preprocess.py dwg input/dwg/project1.dwg output/"
echo ""
echo "2. Batch process all DWG files:"
echo "   python preprocess.py dwg input/dwg/ output/ --batch"
echo ""
echo "3. Optimize image files:"
echo "   python preprocess.py image input/images/ output/ --batch"
echo ""
echo "4. Create TNMT-Project mapping:"
echo "   python preprocess.py harmonize tnmt_data.geojson output/ project_data.geojson"
echo ""
echo "🔧 TROUBLESHOOTING:"
echo ""
echo "- DWG conversion issues: Install ODA File Converter"
echo "- Coordinate transformation errors: Check EPSG codes"
echo "- Memory issues with large files: Process in smaller batches"
echo ""
echo "📞 SUPPORT: Check documentation or contact development team"