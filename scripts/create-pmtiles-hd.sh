#!/bin/bash
# =============================================================================
# Script tạo PMTiles HD với zoom cao (10-20) để hiển thị chi tiết tối đa
# Chạy trên WSL (Windows Subsystem for Linux), Linux hoặc Mac
# =============================================================================

set -e

echo "🚀 Bắt đầu tạo PMTiles HD (zoom 10-20)..."
echo ""

# Paths - điều chỉnh nếu cần
GEOJSON_DIR="public/data/parcels"
OUTPUT_MBTILES="danang_parcels_hd.mbtiles"
OUTPUT_PMTILES="public/tiles/danang_parcels_final.pmtiles"
BACKUP_PMTILES="public/tiles/danang_parcels_backup.pmtiles"

# Zoom levels - tăng maxZoom để zoom cận hiển thị rõ
MIN_ZOOM=10
MAX_ZOOM=20

# Kiểm tra tippecanoe
if ! command -v tippecanoe &> /dev/null; then
    echo "❌ tippecanoe chưa được cài đặt!"
    echo ""
    echo "Cài đặt tippecanoe:"
    echo "  Ubuntu/Debian: sudo apt install tippecanoe"
    echo "  Mac: brew install tippecanoe"
    echo "  Build từ source: https://github.com/felt/tippecanoe"
    exit 1
fi

# Kiểm tra pmtiles CLI
if ! command -v pmtiles &> /dev/null; then
    echo "❌ pmtiles CLI chưa được cài đặt!"
    echo ""
    echo "Cài đặt pmtiles:"
    echo "  npm install -g pmtiles"
    echo "  hoặc: go install github.com/protomaps/go-pmtiles/cmd/pmtiles@latest"
    exit 1
fi

# Kiểm tra thư mục GeoJSON
if [ ! -d "$GEOJSON_DIR" ]; then
    echo "❌ Không tìm thấy thư mục: $GEOJSON_DIR"
    exit 1
fi

# Đếm số file GeoJSON
GEOJSON_COUNT=$(ls -1 $GEOJSON_DIR/*.geojson 2>/dev/null | wc -l)
if [ "$GEOJSON_COUNT" -eq 0 ]; then
    echo "❌ Không tìm thấy file GeoJSON trong: $GEOJSON_DIR"
    exit 1
fi

echo "📁 Tìm thấy $GEOJSON_COUNT file GeoJSON"
echo ""

# Backup file cũ nếu có
if [ -f "$OUTPUT_PMTILES" ]; then
    echo "📦 Backup file PMTiles cũ..."
    cp "$OUTPUT_PMTILES" "$BACKUP_PMTILES"
    echo "✅ Đã backup: $BACKUP_PMTILES"
fi

# Bước 1: Tạo MBTiles với zoom cao
echo ""
echo "🔧 Bước 1/2: Tạo MBTiles với zoom ${MIN_ZOOM}-${MAX_ZOOM}..."
echo "   (Có thể mất 5-15 phút tùy vào số lượng features)"
echo ""

tippecanoe -o "$OUTPUT_MBTILES" \
    --drop-densest-as-needed \
    --extend-zooms-if-still-dropping \
    --maximum-zoom=${MAX_ZOOM} \
    --minimum-zoom=${MIN_ZOOM} \
    --layer=default \
    --name="Da Nang Parcels HD" \
    --description="563,092 land parcels in Da Nang, Vietnam (zoom 10-20)" \
    --attribution="© Sở TNMT Đà Nẵng" \
    --force \
    $GEOJSON_DIR/*.geojson

echo ""
echo "✅ MBTiles created: $OUTPUT_MBTILES"

# Bước 2: Convert sang PMTiles
echo ""
echo "🔧 Bước 2/2: Convert MBTiles → PMTiles..."
echo ""

pmtiles convert "$OUTPUT_MBTILES" "$OUTPUT_PMTILES"

echo ""
echo "✅ PMTiles created: $OUTPUT_PMTILES"

# Hiển thị kích thước file
echo ""
echo "📊 Kích thước file:"
ls -lh "$OUTPUT_MBTILES" | awk '{print "   MBTiles: " $5}'
ls -lh "$OUTPUT_PMTILES" | awk '{print "   PMTiles: " $5}'

# Cleanup
echo ""
echo "🧹 Dọn dẹp file tạm..."
rm -f "$OUTPUT_MBTILES"
echo "✅ Đã xóa: $OUTPUT_MBTILES"

echo ""
echo "🎉 HOÀN TẤT!"
echo ""
echo "📝 Kiểm tra file mới:"
echo "   node -e \"const fs=require('fs');const buf=fs.readFileSync('$OUTPUT_PMTILES');const dv=new DataView(buf.buffer.slice(buf.byteOffset,buf.byteOffset+128));console.log('minZoom:',dv.getUint8(100),'maxZoom:',dv.getUint8(101));\""
echo ""
echo "📝 Bước tiếp theo:"
echo "   1. Cập nhật MapService.ts với minzoom=${MIN_ZOOM}, maxzoom=${MAX_ZOOM}"
echo "   2. Refresh trình duyệt (Ctrl+Shift+R)"
echo "   3. Zoom vào bản đồ để kiểm tra"
echo ""
