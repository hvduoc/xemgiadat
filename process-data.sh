#!/bin/bash
# ================================================================
# XEMGIADAT DATA PROCESSING - ONE CLICK SETUP & PROCESSING  
# Tự động cài đặt và xử lý dữ liệu DWG/Image cho Linux/Mac
# ================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_info() {
    echo -e "${BLUE}🔍 $1${NC}"
}

echo ""
echo "================================================================"
echo "🇻🇳 XEMGIADAT DATA PROCESSING - ONE CLICK SOLUTION"
echo "================================================================"
echo "🚀 Tự động setup và xử lý file DWG/Image"
echo "⏱️  Estimated time: 2-5 phút"
echo ""

# Check Python
print_info "Kiểm tra Python installation..."
if ! command -v python3 &> /dev/null; then
    if ! command -v python &> /dev/null; then
        print_error "Python không được tìm thấy!"
        echo "💡 Cài đặt Python:"
        echo "   Ubuntu/Debian: sudo apt install python3 python3-pip"
        echo "   CentOS/RHEL: sudo yum install python3 python3-pip"
        echo "   macOS: brew install python3"
        exit 1
    else
        PYTHON_CMD="python"
    fi
else
    PYTHON_CMD="python3"
fi

$PYTHON_CMD --version
print_status "Python OK"

# Check pip
print_info "Kiểm tra pip..."
if ! command -v pip3 &> /dev/null; then
    if ! command -v pip &> /dev/null; then
        print_error "pip không được tìm thấy!"
        echo "💡 Cài đặt pip:"
        echo "   Ubuntu/Debian: sudo apt install python3-pip"
        echo "   CentOS/RHEL: sudo yum install python3-pip"
        exit 1
    else
        PIP_CMD="pip"
    fi
else
    PIP_CMD="pip3"
fi

$PIP_CMD --version
print_status "pip OK"

# Create directories
print_info "Tạo cấu trúc thư mục..."
mkdir -p sample-data/{dwg-files,images,output}
print_status "Thư mục OK"

# Check input files
print_info "Kiểm tra file đầu vào..."
found_files=0

if ls sample-data/dwg-files/*.dwg 1> /dev/null 2>&1; then
    print_status "Tìm thấy file DWG"
    ((found_files++))
fi

if ls sample-data/dwg-files/*.dxf 1> /dev/null 2>&1; then
    print_status "Tìm thấy file DXF"
    ((found_files++))
fi

if ls sample-data/images/*.jpg 1> /dev/null 2>&1; then
    print_status "Tìm thấy file JPG" 
    ((found_files++))
fi

if ls sample-data/images/*.png 1> /dev/null 2>&1; then
    print_status "Tìm thấy file PNG"
    ((found_files++))
fi

if [ $found_files -eq 0 ]; then
    echo ""
    print_warning "KHÔNG TÌM THẤY FILE ĐỂ XỬ LÝ!"
    echo ""
    echo "📋 Hướng dẫn:"
    echo "   1. Copy file DWG/DXF vào: sample-data/dwg-files/"
    echo "   2. Copy file ảnh vào: sample-data/images/"
    echo "   3. Chạy lại script này"
    echo ""
    echo "💾 File được hỗ trợ:"
    echo "   - DWG, DXF (AutoCAD files)"
    echo "   - JPG, PNG, TIF (Image files)"
    echo ""
    echo "💻 Command copy:"
    echo "   cp your-file.dwg sample-data/dwg-files/"
    echo "   cp your-image.jpg sample-data/images/"
    echo ""
    exit 1
fi

print_status "Tìm thấy file để xử lý"

# Install dependencies
echo ""
print_info "Cài đặt Python dependencies..."
cd data-processing-module

if [ -f "requirements.txt" ]; then
    $PIP_CMD install -r requirements.txt --quiet --disable-pip-version-check --user
    print_status "Dependencies installed"
else
    print_error "Không tìm thấy requirements.txt!"
    exit 1
fi

cd ..

# Run processing
echo ""
echo "🚀 BẮT ĐẦU XỬ LÝ DỮ LIỆU..."
echo "================================================================"

if $PYTHON_CMD process_euro_village.py; then
    echo ""
    echo "================================================================"
    echo "🎉 XỬ LÝ HOÀN TẤT!"
    echo "================================================================"
    echo ""
    echo "📂 Kết quả tại: sample-data/output/"
    echo "📄 Báo cáo: sample-data/output/euro_village_2_report.json"
    echo ""
    echo "🌐 Có thể sử dụng:"
    echo "   • Upload lên XemGiaDat.com"
    echo "   • Import vào QGIS"
    echo "   • Hiển thị trên web map"
    echo ""
    echo "🔧 Commands hữu ích:"
    echo "   • Mở thư mục: open sample-data/output (macOS) | nautilus sample-data/output (Linux)"
    echo "   • Xem báo cáo: cat sample-data/output/euro_village_2_report.json"
    echo ""
else
    echo ""
    print_error "XỬ LÝ THẤT BẠI!"
    echo "🔧 Thử troubleshooting:"
    echo "   1. Kiểm tra Python version >= 3.8: $PYTHON_CMD --version"
    echo "   2. Chạy test: $PYTHON_CMD quick_test.py"
    echo "   3. Xem log lỗi chi tiết ở trên"
    echo ""
fi

echo "📞 Cần hỗ trợ? Email: dev@xemgiadat.com"
echo ""