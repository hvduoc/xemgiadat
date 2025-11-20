# 🏗️ HƯỚNG DẪN THIẾT LẬP XỬ LÝ FILE DWG

## Lỗi hiện tại
```
No DWG conversion tool available. Install ODA File Converter or teigha2dwg
```

## Giải pháp 1: ODA File Converter (KHUYẾN NGHỊ)

### Tải về:
- Website: https://www.opendesign.com/guestfiles/oda_file_converter
- Size: ~100MB
- Miễn phí cho sử dụng cá nhân

### Cài đặt:
1. Tải file installer cho Windows
2. Chạy setup.exe với quyền Administrator
3. Cài vào thư mục mặc định: `C:\Program Files\ODA\`

### Sau khi cài:
```powershell
# Test xem đã cài thành công chưa
"C:\Program Files\ODA\OdaFileConverter.exe" --help
```

## Giải pháp 2: FreeCAD (Opensource)

### Tải về:
- Website: https://www.freecad.org/downloads.php
- Size: ~400MB
- Hoàn toàn miễn phí

### Cài đặt:
1. Tải FreeCAD installer
2. Cài đặt với full components
3. Thêm Python path trong script

## Giải pháp 3: Chuyển đổi thủ công

### Nếu có AutoCAD:
1. Mở file `Cap dien ho ga.dwg` trong AutoCAD
2. Export as → DXF format
3. Lưu vào cùng thư mục `sample-data/dwg-files/Cap dien ho ga.dxf`
4. Chạy lại script

### Nếu có QGIS:
1. Cài plugin "Another DXF Importer"
2. Import DWG → Export as DXF

## Kiểm tra sau khi cài

Chạy lại script:
```powershell
.\process-data.bat
```

Script sẽ tự động detect tool đã cài và xử lý file DWG.

## Lưu ý quan trọng

- File DWG của bạn: `Cap dien ho ga.dwg` (29MB)
- Có thể chứa dữ liệu về hệ thống điện/hạ tầng
- Sau khi chuyển đổi sẽ có thể extract geometry thành GeoJSON

## Support

Cần hỗ trợ? Contact dev@xemgiadat.com