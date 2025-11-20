@echo off
REM ================================================================
REM XEMGIADAT DATA PROCESSING - ONE CLICK SETUP & PROCESSING
REM Tự động cài đặt và xử lý dữ liệu DWG/Image
REM ================================================================

echo.
echo ================================================================
echo 🇻🇳 XEMGIADAT DATA PROCESSING - ONE CLICK SOLUTION
echo ================================================================
echo 🚀 Tự động setup và xử lý file DWG/Image
echo ⏱️  Estimated time: 2-5 phút
echo.

REM Kiểm tra Python
echo 🔍 Kiểm tra Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python không được tìm thấy!
    echo 💡 Vui lòng cài Python từ: https://python.org/downloads/
    pause
    exit /b 1
)
echo ✅ Python OK

REM Kiểm tra pip
echo 🔍 Kiểm tra pip...
pip --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ pip không được tìm thấy!
    pause
    exit /b 1
)
echo ✅ pip OK

REM Tạo thư mục nếu chưa có
echo 📁 Tạo cấu trúc thư mục...
if not exist "sample-data" mkdir sample-data
if not exist "sample-data\dwg-files" mkdir sample-data\dwg-files
if not exist "sample-data\images" mkdir sample-data\images
if not exist "sample-data\output" mkdir sample-data\output
echo ✅ Thư mục OK

REM Kiểm tra file input
echo 🔍 Kiểm tra file đầu vào...
set "found_files=0"

if exist "sample-data\dwg-files\*.dwg" (
    echo ✅ Tìm thấy file DWG
    set /a found_files+=1
)
if exist "sample-data\dwg-files\*.dxf" (
    echo ✅ Tìm thấy file DXF  
    set /a found_files+=1
)
if exist "sample-data\images\*.jpg" (
    echo ✅ Tìm thấy file JPG
    set /a found_files+=1
)
if exist "sample-data\images\*.png" (
    echo ✅ Tìm thấy file PNG
    set /a found_files+=1
)

if %found_files% equ 0 (
    echo.
    echo ⚠️  KHÔNG TÌM THẤY FILE ĐỂ XỬ LÝ!
    echo.
    echo 📋 Hướng dẫn:
    echo    1. Copy file DWG/DXF vào: sample-data\dwg-files\
    echo    2. Copy file ảnh vào: sample-data\images\  
    echo    3. Chạy lại script này
    echo.
    echo 💾 File được hỗ trợ:
    echo    - DWG, DXF ^(AutoCAD files^)
    echo    - JPG, PNG, TIF ^(Image files^)
    echo.
    pause
    exit /b 1
)

echo ✅ Tìm thấy file để xử lý

REM Cài đặt dependencies
echo.
echo 🔧 Cài đặt Python dependencies...
pip install --upgrade opencv-python scikit-image scipy pillow numpy pyproj --quiet --disable-pip-version-check
if %errorlevel% neq 0 (
    echo ❌ Lỗi cài đặt dependencies!
    echo 💡 Thử chạy thủ công: pip install opencv-python scikit-image scipy
    pause
    exit /b 1
)
echo ✅ Advanced CV Dependencies installed

REM Cài thêm module dependencies
cd data-processing-module
pip install -r requirements.txt --quiet --disable-pip-version-check
cd ..

REM Chạy xử lý
echo.
echo � BẮT ĐẦU XỬ LÝ NÂNG CAO VỚI COMPUTER VISION...
python test_advanced_processing.py
echo ================================================================

python process_euro_village.py

if %errorlevel% equ 0 (
    echo.
    echo ================================================================
    echo 🎉 XỬ LÝ HOÀN TẤT!
    echo ================================================================
    echo.
    echo 📂 Kết quả tại: sample-data\output\
    echo 📄 Báo cáo: sample-data\output\euro_village_2_report.json
    echo.
    echo 🌐 Có thể sử dụng:
    echo    • Upload lên XemGiaDat.com
    echo    • Import vào QGIS  
    echo    • Hiển thị trên web map
    echo.
    echo 🔧 Commands hữu ích:
    echo    • Mở thư mục kết quả: explorer sample-data\output
    echo    • Xem báo cáo: notepad sample-data\output\euro_village_2_report.json
    echo.
) else (
    echo.
    echo ❌ XỬ LÝ THẤT BẠI!
    echo 🔧 Thử troubleshooting:
    echo    1. Kiểm tra Python version ^>= 3.8
    echo    2. Chạy: python quick_test.py
    echo    3. Xem log lỗi chi tiết ở trên
    echo.
)

echo 📞 Cần hỗ trợ? Email: dev@xemgiadat.com
echo.
pause