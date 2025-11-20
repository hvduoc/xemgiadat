@echo off
REM WINDOWS SETUP SCRIPT - FILE PREPROCESSING TOOLS
REM Run as Administrator for best results

echo 🚀 SETTING UP FILE PREPROCESSING TOOLS (WINDOWS)
echo ================================================

REM Check Python version
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Python not found. Install Python 3.8+ from python.org
    pause
    exit /b 1
)

echo ✅ Python found
python --version

REM Create virtual environment
echo 📦 Creating virtual environment...
python -m venv venv
call venv\Scripts\activate.bat

REM Install requirements
echo 📚 Installing Python packages...
python -m pip install --upgrade pip
pip install -r requirements.txt

REM Check for ODA File Converter
echo 🔧 Checking for ODA File Converter...
where ODAFileConverter >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✅ ODA File Converter found
) else (
    echo ⚠️ ODA File Converter not found
    echo Download from: https://www.opendesign.com/guestfiles
    echo Required for DWG to DXF conversion
)

REM Check for GDAL
echo 🗺️ Checking for GDAL...
where gdal-config >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✅ GDAL found
) else (
    echo ⚠️ GDAL not found. Install options:
    echo 1. OSGeo4W: https://trac.osgeo.org/osgeo4w/
    echo 2. Conda: conda install -c conda-forge gdal
    echo 3. Pip: pip install gdal (may need VS Build Tools)
)

REM Create directory structure
echo 📁 Creating directory structure...
mkdir input\dwg 2>nul
mkdir input\images 2>nul
mkdir output\geojson 2>nul
mkdir output\optimized 2>nul
mkdir output\mappings 2>nul
mkdir temp 2>nul

echo.
echo 🎯 SETUP COMPLETE!
echo ==================
echo.
echo 📋 USAGE EXAMPLES:
echo.
echo 1. Process single DWG file:
echo    python preprocess.py dwg input\dwg\project1.dwg output\
echo.
echo 2. Batch process all DWG files:
echo    python preprocess.py dwg input\dwg\ output\ --batch
echo.
echo 3. Optimize image files:
echo    python preprocess.py image input\images\ output\ --batch
echo.
echo 4. Create TNMT-Project mapping:
echo    python preprocess.py harmonize tnmt_data.geojson output\ project_data.geojson
echo.
echo 🔧 NEXT STEPS:
echo.
echo 1. Copy your DWG files to input\dwg\
echo 2. Copy your image files to input\images\
echo 3. Run preprocessing commands above
echo 4. Check output\ directory for results
echo.
echo 📞 NEED HELP? Check README.md or contact support
echo.
pause