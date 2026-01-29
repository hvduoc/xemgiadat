# =============================================================================
# Script tạo PMTiles HD với zoom cao (10-20) - Windows PowerShell
# Yêu cầu: tippecanoe (via WSL) hoặc Docker
# =============================================================================

$ErrorActionPreference = "Stop"

Write-Host "🚀 Bắt đầu tạo PMTiles HD (zoom 10-20)..." -ForegroundColor Cyan
Write-Host ""

# Paths
$GEOJSON_DIR = "public/data/parcels"
$OUTPUT_MBTILES = "danang_parcels_hd.mbtiles"
$OUTPUT_PMTILES = "public/tiles/danang_parcels_final.pmtiles"
$BACKUP_PMTILES = "public/tiles/danang_parcels_backup.pmtiles"

# Zoom levels
$MIN_ZOOM = 10
$MAX_ZOOM = 20

# Kiểm tra thư mục GeoJSON
if (-not (Test-Path $GEOJSON_DIR)) {
    Write-Host "❌ Không tìm thấy thư mục: $GEOJSON_DIR" -ForegroundColor Red
    exit 1
}

$geojsonFiles = Get-ChildItem "$GEOJSON_DIR/*.geojson"
$count = $geojsonFiles.Count
Write-Host "📁 Tìm thấy $count file GeoJSON" -ForegroundColor Green

# Backup file cũ
if (Test-Path $OUTPUT_PMTILES) {
    Write-Host "📦 Backup file PMTiles cũ..." -ForegroundColor Yellow
    Copy-Item $OUTPUT_PMTILES $BACKUP_PMTILES -Force
    Write-Host "✅ Đã backup: $BACKUP_PMTILES" -ForegroundColor Green
}

Write-Host ""
Write-Host "🔧 Chọn phương thức tạo tiles:" -ForegroundColor Cyan
Write-Host "   1. WSL (khuyên dùng nếu đã cài tippecanoe trong WSL)"
Write-Host "   2. Docker (cần Docker Desktop)"
Write-Host ""

$choice = Read-Host "Nhập lựa chọn (1 hoặc 2)"

if ($choice -eq "1") {
    # WSL method
    Write-Host ""
    Write-Host "🔧 Tạo MBTiles qua WSL..." -ForegroundColor Cyan
    
    # Convert Windows path to WSL path
    $wslGeoJsonDir = "/mnt/" + ($GEOJSON_DIR -replace ":", "" -replace "\\", "/").ToLower()
    $wslOutputMbtiles = "/mnt/" + ($OUTPUT_MBTILES -replace ":", "" -replace "\\", "/").ToLower()
    $wslOutputPmtiles = "/mnt/" + ($OUTPUT_PMTILES -replace ":", "" -replace "\\", "/").ToLower()
    
    # Get current directory in WSL format
    $currentDir = (Get-Location).Path
    $wslCurrentDir = "/mnt/" + ($currentDir -replace ":", "" -replace "\\", "/").ToLower()
    
    $tippecanoeCmd = @"
cd $wslCurrentDir && tippecanoe -o $OUTPUT_MBTILES --drop-densest-as-needed --extend-zooms-if-still-dropping --maximum-zoom=$MAX_ZOOM --minimum-zoom=$MIN_ZOOM --layer=default --name='Da Nang Parcels HD' --force $GEOJSON_DIR/*.geojson
"@
    
    Write-Host "Chạy lệnh: wsl $tippecanoeCmd" -ForegroundColor Gray
    wsl bash -c $tippecanoeCmd
    
    if (-not (Test-Path $OUTPUT_MBTILES)) {
        Write-Host "❌ Không tạo được MBTiles" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ MBTiles created: $OUTPUT_MBTILES" -ForegroundColor Green
    
    # Convert to PMTiles
    Write-Host ""
    Write-Host "🔧 Convert MBTiles → PMTiles..." -ForegroundColor Cyan
    
    $pmtilesCmd = "cd $wslCurrentDir && pmtiles convert $OUTPUT_MBTILES $OUTPUT_PMTILES"
    wsl bash -c $pmtilesCmd
    
} elseif ($choice -eq "2") {
    # Docker method
    Write-Host ""
    Write-Host "🔧 Tạo MBTiles qua Docker..." -ForegroundColor Cyan
    
    $dockerCmd = @"
docker run -v ${PWD}:/data --rm ghcr.io/felt/tippecanoe:latest tippecanoe -o /data/$OUTPUT_MBTILES --drop-densest-as-needed --extend-zooms-if-still-dropping --maximum-zoom=$MAX_ZOOM --minimum-zoom=$MIN_ZOOM --layer=default --name='Da Nang Parcels HD' --force /data/$GEOJSON_DIR/*.geojson
"@
    
    Invoke-Expression $dockerCmd
    
    if (-not (Test-Path $OUTPUT_MBTILES)) {
        Write-Host "❌ Không tạo được MBTiles" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ MBTiles created: $OUTPUT_MBTILES" -ForegroundColor Green
    
    # Convert to PMTiles using npm
    Write-Host ""
    Write-Host "🔧 Convert MBTiles → PMTiles..." -ForegroundColor Cyan
    npx --yes @protomaps/go-pmtiles convert $OUTPUT_MBTILES $OUTPUT_PMTILES
    
} else {
    Write-Host "❌ Lựa chọn không hợp lệ" -ForegroundColor Red
    exit 1
}

# Verify output
if (Test-Path $OUTPUT_PMTILES) {
    $size = (Get-Item $OUTPUT_PMTILES).Length / 1MB
    Write-Host ""
    Write-Host "✅ PMTiles created: $OUTPUT_PMTILES ($([math]::Round($size, 2)) MB)" -ForegroundColor Green
    
    # Cleanup
    if (Test-Path $OUTPUT_MBTILES) {
        Remove-Item $OUTPUT_MBTILES -Force
        Write-Host "🧹 Đã xóa file tạm: $OUTPUT_MBTILES" -ForegroundColor Gray
    }
    
    # Verify zoom levels
    Write-Host ""
    Write-Host "📊 Kiểm tra zoom levels:" -ForegroundColor Cyan
    node -e "const fs=require('fs');const buf=fs.readFileSync('$OUTPUT_PMTILES',{start:0,end:200});const dv=new DataView(buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength));console.log('  minZoom:', dv.getUint8(100));console.log('  maxZoom:', dv.getUint8(101));"
    
    Write-Host ""
    Write-Host "🎉 HOÀN TẤT!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Bước tiếp theo:" -ForegroundColor Yellow
    Write-Host "   1. Cập nhật MapService.ts: minzoom=$MIN_ZOOM, maxzoom=$MAX_ZOOM"
    Write-Host "   2. npm run dev"
    Write-Host "   3. Refresh trình duyệt (Ctrl+Shift+R)"
} else {
    Write-Host "❌ Không tạo được PMTiles" -ForegroundColor Red
    exit 1
}
