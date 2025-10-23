Hướng dẫn cấu hình Mapbox proxy cho Netlify

File này mô tả cách hoạt động của Netlify Function proxy và cách cấu hình để không lộ Mapbox token trên client.

1) Mục đích
- Giữ Mapbox access token an toàn (không để trực tiếp trong `public/script.js`).
- Proxy mọi request nhạy cảm (geocoding, tilequery, tile, ảnh tĩnh) qua server (Netlify Function) để token nằm trong biến môi trường server.

2) File liên quan
- `netlify/functions/mapbox-proxy.js`: function proxy đã được thêm vào repo.
- `public/script.js`: client đã cập nhật để gọi proxy thay vì gọi trực tiếp api.mapbox.com.

3) Cách cấu hình trên Netlify
- Vào Site settings -> Build & deploy -> Environment -> Environment variables.
- Thêm biến môi trường: `MAPBOX_TOKEN` = (giá trị token Mapbox của bạn).

4) Hạn chế token trên Mapbox (bắt buộc khuyến nghị)
- Trên Mapbox dashboard, tạo token chỉ dùng cho production.
- Ở phần "Allowed URLs" hoặc "URL restrictions" nhập:
   - `https://xemgiadat.com/*`
   - `https://www.xemgiadat.com/*`
- Giới hạn scope token chỉ cho các API cần thiết (tiles, tilequery, geocoding, static).

5) Endpoint proxy (sau khi deploy)
- Base: `/.netlify/functions/mapbox-proxy`
- Một số ví dụ:
   - Reverse geocode: `/.netlify/functions/mapbox-proxy?mode=geocode&lat=16.06&lng=108.20`
   - TileQuery: `/.netlify/functions/mapbox-proxy?mode=tilequery&lat=16.06&lng=108.20&limit=1`
   - Tile (vector tile): `/.netlify/functions/mapbox-proxy?mode=tiles&z=12&x=818&y=465`
   - Ảnh tĩnh (OG): `/.netlify/functions/mapbox-proxy?mode=static&lat=16.06&lng=108.20&width=800&height=600&zoom=18`

6) Phát triển local
- Cách 1: Dùng Netlify CLI (`netlify dev`) — netlify dev sẽ load biến môi trường từ Netlify site nếu bạn đã cấu hình.
- Cách 2: Thiết lập biến môi trường thủ công trong shell khi chạy dev:
   - Windows PowerShell:
      ```powershell
      $env:MAPBOX_TOKEN = 'pk.<token-cua-ban>'
      $env:NETLIFY_DEV = 'true'
      # sau đó chạy netlify dev
      ```
- Khi `NETLIFY_DEV=true`, proxy chấp nhận origin localhost để tiện phát triển.

7) Ghi chú về hiệu năng
- Client đã thay đổi để chỉ tải vector tiles phân lô khi zoom >= 14. Điều này giảm đáng kể chi phí vẽ/parse khi mở bản đồ ở vùng rộng.

8) Khuyến nghị tiếp theo
- Thêm caching (ví dụ Cache-Control hoặc cache phía server) cho tilequery/geocoding để giảm số request tới Mapbox.
- Nếu vẫn còn lag: cân nhắc parse vector tiles trong WebWorker hoặc chuyển sang Mapbox GL JS / MapLibre cho rendering WebGL.

Nếu cần mình có thể thêm hướng dẫn chi tiết hơn (ví dụ: snippet thiết lập Netlify CLI hoặc hàm caching trong proxy).
