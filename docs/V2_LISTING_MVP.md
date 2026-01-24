# V2 Listing MVP

## Overview
- Flow: chọn thửa trên v2 map → nút "Đăng tin" → điền tiêu đề/giá/mô tả/ảnh → lưu Firestore + ảnh lên Firebase Storage → nhận link `/v2-dist/listing.html?id=<LISTING_ID>` để chia sẻ.
- Legacy `/` không bị thay đổi.

## Firebase Setup
- Sử dụng cấu hình Firebase đã có sẵn trong repo (project `xemgiadat-dfe15`).
- Yêu cầu bật Firestore + Storage (đã có rules mẫu trong `config/`).
- Auth: nếu chưa có đăng nhập, listing vẫn lưu với `user_uid = null` (MVP chấp nhận rủi ro anon).

## Data Model (collection `listings`)
- `parcel_objectid` (number)
- `maxa` (string)
- `title` (string)
- `description` (string)
- `price` (number)
- `currency` ("VND")
- `images` (array<string> URL)
- `area` (number, m2)
- `address` (string)
- `lat`, `lng` (number, centroid)
- `status` ("ACTIVE")
- `user_uid` (string|null)
- `created_at`, `updated_at` (timestamp, serverTimestamp)

## UX Flow
- ParcelPanel: nút **Đăng tin** mở modal form (tiêu đề/giá/mô tả/ảnh).
- Submit: upload ảnh lên Storage `listings/<timestamp>_<filename>`, tạo doc Firestore với fields trên.
- Thành công: hiển thị link `https://<domain>/v2-dist/listing.html?id=<LISTING_ID>` + nút copy, các nút share (Facebook, WhatsApp, Zalo=copy) + Directions + StreetView.

## Listing View Page
- Route: `/v2-dist/listing.html?id=<LISTING_ID>` (multi-page build từ Vite input `public/listing.html`).
- Hiển thị: tiêu đề, giá, trạng thái, thông tin thửa (OBJECTID, MaXa, diện tích, địa chỉ), mô tả, gallery ảnh, liên kết chia sẻ/directions/streetview.
- Copy link & Zalo: dùng clipboard (không phụ thuộc Web Share API).

## Dev & Build
- Dev: `npm run dev` → mở `http://localhost:3000/v2-dist/v2.html` (đăng tin) và `http://localhost:3000/v2-dist/listing.html?id=<id>` (xem tin).
- Build: `npm run build` (đã có postbuild smoke check). Dist output: `public/v2-dist/v2.html`, `public/v2-dist/listing.html`, assets hashed.

## Test Checklist
- Click một thửa → Đăng tin → điền title/price/description → upload 1-2 ảnh → submit thành công.
- Link mở được, hiển thị dữ liệu vừa tạo (title/price/ảnh/địa chỉ/OBJECTID/MaXa/diện tích).
- Nút copy link hoạt động; Facebook/WhatsApp mở đúng dialog; Directions/StreetView mở đúng tọa độ.
- Smoke: `npm run build` pass + verify-v2-build.mjs ok (v2 bundle + maplibre/pmtiles chunks tồn tại).

## Rollback
- Xóa/ẩn listing: xóa doc Firestore (collection `listings`) và file Storage liên quan.
- Code rollback: revert PR, deploy lại → legacy `/` không ảnh hưởng.
