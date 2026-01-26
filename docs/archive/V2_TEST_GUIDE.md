# V2 Test Guide

## Routes
- Open: /v2.html
- Debug mode: /v2.html?debug=1

## Steps
1) Load the map and wait until style loads.
2) Click any parcel polygon.
   - Expected: Right side panel opens with fields:
     - OBJECTID, MaXa, SoThuTuThua, SoHieuToBanDo, DiaChi, DienTich, KyHieuMucDichSuDung, TenChu
   - Map zooms to selected parcel; outline highlights in red.
3) Use ward filter (top-right dropdown).
   - Select a `MaXa` code.
   - Expected: Only parcels in that ward remain visible.
   - Clear selection: choose `-- Chọn Xã/Phường --` to show all parcels.
4) Search bar (top-left) placeholder.
   - Type a query and press Enter.
   - Expected: Console logs the query (future implementation).
5) Responsive check.
   - Reduce window width to mobile size.
   - Expected: Parcel panel becomes full width; controls adapt.

## Data Source
- Vector source: pmtiles:///tiles/danang_parcels_final.pmtiles
- Source-layer: "parcels"

## Layers
- parcels-fill: base polygon fill
- parcels-outline: thin blue outlines
- parcels-highlight: red outline for selected feature (feature-state selected=true)

## Debug Version
- If `/src/version.js` exists, open `/v2.html?debug=1`.
- Expected: Console logs build version and time.

## Non-Interference
- Legacy `/` route continues using `public/script.js` unchanged.

