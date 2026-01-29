#!/bin/bash
# =============================================================================
# Script tạo PMTiles TỐI ƯU - Giảm lag, tăng hiệu suất
# Chiến lược: 
#   - Zoom 10-14: Simplify geometry, drop features dày đặc
#   - Zoom 15-16: Giữ tất cả features với detail vừa phải  
#   - Zoom 17-20: Overzoom từ zoom 16 (không tạo tiles mới)
# =============================================================================

set -e

echo "🚀 Bắt đầu tạo PMTiles TỐI ƯU..."
echo ""

# Paths
GEOJSON_DIR="public/data/parcels"
OUTPUT_MBTILES="danang_parcels_optimized.mbtiles"
OUTPUT_PMTILES="public/tiles/danang_parcels_final.pmtiles"
BACKUP_PMTILES="public/tiles/danang_parcels_backup_$(date +%Y%m%d_%H%M%S).pmtiles"

# Zoom levels - CHỈ TẠO TILES ĐẾN ZOOM 16, còn lại dùng overzoom
MIN_ZOOM=10
MAX_ZOOM=16  # Overzoom sẽ handle zoom 17-20

# Kiểm tra tools
for cmd in tippecanoe pmtiles; do
    if ! command -v $cmd &> /dev/null; then
        echo "❌ $cmd chưa được cài đặt!"
        exit 1
    fi
done

# Kiểm tra data
if [ ! -d "$GEOJSON_DIR" ]; then
    echo "❌ Không tìm thấy: $GEOJSON_DIR"
    exit 1
fi

GEOJSON_COUNT=$(ls -1 $GEOJSON_DIR/*.geojson 2>/dev/null | wc -l)
echo "📁 Tìm thấy $GEOJSON_COUNT file GeoJSON"

# Backup
if [ -f "$OUTPUT_PMTILES" ]; then
    echo "📦 Backup: $BACKUP_PMTILES"
    cp "$OUTPUT_PMTILES" "$BACKUP_PMTILES"
fi

echo ""
echo "🔧 Bước 1/2: Tạo MBTiles tối ưu (zoom ${MIN_ZOOM}-${MAX_ZOOM})..."
echo "   ⚡ Sử dụng overzoom cho zoom 17-20 để giảm file size"
echo ""

# Tùy chọn tối ưu:
# --coalesce-densest-as-needed: Gộp features ở zoom thấp
# --simplification=10: Đơn giản hóa geometry
# --detect-shared-borders: Tối ưu borders chung
# --no-tile-compression: Tắt compression (PMTiles sẽ compress sau)
# --hilbert: Sắp xếp theo Hilbert curve để tối ưu cache

tippecanoe -o "$OUTPUT_MBTILES" \
    --coalesce-densest-as-needed \
    --extend-zooms-if-still-dropping \
    --maximum-zoom=${MAX_ZOOM} \
    --minimum-zoom=${MIN_ZOOM} \
    --simplification=10 \
    --detect-shared-borders \
    --hilbert \
    --layer=default \
    --name="Da Nang Parcels Optimized" \
    --description="563,092 land parcels - Optimized for performance" \
    --attribution="© Sở TNMT Đà Nẵng" \
    --force \
    $GEOJSON_DIR/*.geojson

echo ""
echo "✅ MBTiles created: $OUTPUT_MBTILES"

# Bước 2: Convert sang PMTiles
echo ""
echo "🔧 Bước 2/2: Convert MBTiles → PMTiles..."
pmtiles convert "$OUTPUT_MBTILES" "$OUTPUT_PMTILES"

echo ""
echo "✅ PMTiles created: $OUTPUT_PMTILES"

# Stats
echo ""
echo "📊 Kết quả:"
ls -lh "$OUTPUT_PMTILES" | awk '{print "   File size: " $5}'

# Kiểm tra zoom levels
echo ""
echo "📊 Zoom levels trong file:"
node -e "
const fs = require('fs');
const buf = fs.readFileSync('$OUTPUT_PMTILES', {start: 0, end: 200});
const dv = new DataView(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
console.log('   minZoom:', dv.getUint8(100));
console.log('   maxZoom:', dv.getUint8(101));
console.log('   (Overzoom 17-20 sẽ được MapLibre xử lý)');
"

# Cleanup
rm -f "$OUTPUT_MBTILES"

echo ""
echo "🎉 HOÀN TẤT!"
echo ""
echo "📝 Cập nhật MapService.ts:"
echo "   source: { minzoom: 10, maxzoom: 16 }"
echo "   layer:  { minzoom: 10, maxzoom: 22 }  // Cho phép overzoom"
echo ""
