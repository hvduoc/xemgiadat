# Deep-Link Share Specification

> **Version**: 1.0  
> **Updated**: 2026-01-26  
> **Status**: Implemented (Legacy App), Planned (V2)

---

## 1. URL Schema

### Primary Deep-Link Format
```
https://xemgiadat.com/?lat={latitude}&lng={longitude}
```

### Examples
```
# Basic location link
https://xemgiadat.com/?lat=16.0540&lng=108.2024

# Location with zoom (future)
https://xemgiadat.com/?lat=16.0540&lng=108.2024&z=19

# V2 app (planned)
https://xemgiadat.com/v2/?lat=16.0540&lng=108.2024
```

### Open Graph Share URL
Used for social media sharing with rich previews:
```
https://xemgiadat.com/og.html?lat={lat}&lng={lng}&soTo={sheet}&soThua={parcel}
```

**Behavior**: `og.html` sets OG meta tags, then redirects to `/?lat=...&lng=...` after 2 seconds.

---

## 2. Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `lat` | float | ✅ | Latitude (WGS84, decimal degrees) |
| `lng` | float | ✅ | Longitude (WGS84, decimal degrees) |
| `z` | int | ⬜ | Zoom level (1-22, default: 19) |
| `soTo` | string | ⬜ | Sheet number (Số hiệu tờ bản đồ) |
| `soThua` | string | ⬜ | Parcel number (Số thửa) |

---

## 3. Behavior Flow

### User Opens Deep-Link
```
1. index.html loads
2. script.js executes
3. handleUrlParameters() called during init
4. Parse lat/lng from URLSearchParams
5. Wait for map initialization (retry if not ready)
6. map.setView([lat, lng], 19)
7. Wait 1000ms for tiles to load
8. queryAndDisplayParcelByLatLng(lat, lng)
9. If parcel found:
   - Highlight parcel on map
   - Show info panel with parcel details
   - Fetch & display address from geocoder
```

### Sequence Diagram
```
User Click Link
      │
      ▼
  index.html
      │
      ▼
  script.js init
      │
      ▼
handleUrlParameters()
      │
      ├── No params → Normal load
      │
      └── lat & lng → 
          │
          ▼
      map.setView()
          │
          ▼ (1000ms delay)
          │
queryAndDisplayParcelByLatLng()
          │
          ▼
      Mapbox Tilequery API
          │
          ▼
  Show Info Panel
```

---

## 4. Code References

### URL Generation

**Copy Location Link** — [script.js#L1238-L1242](../public/script.js#L1238-L1242)
```javascript
window.copyLocationLink = function(lat, lng) {
    const url = `${window.location.origin}${window.location.pathname}?lat=${lat}&lng=${lng}`;
    navigator.clipboard.writeText(url).then(() => {
        alert('Đã sao chép liên kết vị trí!');
    }).catch(err => console.error('Lỗi sao chép: ', err));
};
```

**Social Share** — [script.js#L1248-L1275](../public/script.js#L1248-L1275)
```javascript
window.share = function(platform, lat, lng, titleOrSoTo, soThua) {
    const indexUrl = `${window.location.origin}${window.location.pathname}?lat=${lat}&lng=${lng}`;
    const ogUrl = `${window.location.origin}/og.html?lat=...&lng=...&soTo=...&soThua=...`;
    // ...
};
```

### URL Parsing

**Handle URL Parameters** — [script.js#L1113-L1145](../public/script.js#L1113-L1145)
```javascript
function handleUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const lat = urlParams.get('lat');
    const lng = urlParams.get('lng');
    
    if (lat && lng) {
        // Wait for map init, then setView + queryParcel
    }
}
```

### Parcel Query

**Query Parcel by Coordinates** — [script.js#L820-L895](../public/script.js#L820-L895)
```javascript
async function queryAndDisplayParcelByLatLng(lat, lng) {
    const tilesetId = 'hvduoc.danang_parcels_final';
    const queryUrl = `https://api.mapbox.com/v4/${tilesetId}/tilequery/${lng},${lat}.json?limit=1&access_token=${mapboxAccessToken}`;
    // ... fetch, highlight, show panel
}
```

### Open Graph Page

**og.html** — [og.html](../public/og.html)
- Reads `lat`, `lng`, `soTo`, `soThua` from query params
- Calls Mapbox geocoder via proxy for address
- Sets OG meta tags dynamically
- Redirects to `/?lat=...&lng=...` after 2s

---

## 5. Social Share Integration

### Facebook Share
```javascript
// Generated URL:
https://www.facebook.com/sharer/sharer.php?u={indexUrl}&quote={text}

// Example:
https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fxemgiadat.com%2F%3Flat%3D16.054%26lng%3D108.202&quote=Kh%C3%A1m%20ph%C3%A1%20v%E1%BB%8B%20tr%C3%AD...
```

### WhatsApp Share
```javascript
// Generated URL:
https://wa.me/?text={text + indexUrl}

// Example:
https://wa.me/?text=Kh%C3%A1m%20ph%C3%A1%20v%E1%BB%8B%20tr%C3%AD%20tr%C3%AAn%20B%E1%BA%A3n%20%C4%91%E1%BB%93%20Gi%C3%A1%20%C4%91%E1%BA%A5t!%20https%3A%2F%2Fxemgiadat.com%2F%3Flat%3D16.054%26lng%3D108.202
```

### Share Text Templates
```javascript
// Default
"Khám phá vị trí trên Bản đồ Giá đất Cộng đồng!"

// With parcel info
"Khám phá thửa đất (Thửa: ${soThua}, Tờ: ${soTo}) tại Đà Nẵng trên Bản đồ Giá đất Cộng đồng!"

// With custom title
"${title} — Xem chi tiết tại xemgiadat.com"
```

---

## 6. V2 Integration Plan

### Proposed V2 Deep-Link Handling

**Location**: `src2/services/DeepLinkService.ts` (to be created)

```typescript
// Proposed structure
interface DeepLinkParams {
  lat?: number;
  lng?: number;
  z?: number;
  pid?: string;  // parcel ID for direct lookup
}

class DeepLinkService {
  parseUrl(): DeepLinkParams;
  generateShareUrl(lat: number, lng: number, options?: ShareOptions): string;
  handleDeepLink(params: DeepLinkParams): Promise<void>;
}
```

### V2 Route Pattern
```
/v2/?lat={lat}&lng={lng}&z={zoom}
/v2/?pid={parcelObjectId}
```

---

## 7. Edge Cases & Error Handling

| Scenario | Behavior |
|----------|----------|
| Invalid lat/lng | Silent fail, normal page load |
| Map not ready | Retry after 500ms (max 3 retries) |
| No parcel at coords | Show popup "Không tìm thấy thửa đất", auto-close 3s |
| Network error | Show error popup, auto-close 3s |
| Missing og.html params | Use defaults, still redirect |

---

## 8. Testing Checklist

### Manual Tests
- [ ] Open `/?lat=16.054&lng=108.202` → Map zooms to location
- [ ] Wait 1s → Parcel info panel appears
- [ ] Share → Facebook dialog opens with correct URL
- [ ] Share → WhatsApp opens with text + URL
- [ ] Copy link → Clipboard contains correct URL
- [ ] Open `og.html?lat=...&lng=...` → Redirects to index with params

### Automated Tests (verify-prod.ps1)
```powershell
# Deep-link parameter handling
curl "https://xemgiadat.com/?lat=16.05&lng=108.20" -I
# Expected: 200 OK, Content-Type: text/html

# OG share page
curl "https://xemgiadat.com/og.html?lat=16.05&lng=108.20" -I
# Expected: 200 OK
```

---

## 9. Future Enhancements

### Phase 1 (Current)
- ✅ lat/lng deep-link
- ✅ Social sharing (Facebook, WhatsApp)
- ✅ Copy link to clipboard
- ✅ Open Graph meta generation

### Phase 2 (Planned)
- [ ] Zoom level in URL (`z` param)
- [ ] Parcel ID direct link (`pid` param)
- [ ] Native share API (Web Share API)
- [ ] QR code generation

### Phase 3 (V2)
- [ ] TypeScript DeepLinkService
- [ ] Unit tests for URL parsing
- [ ] E2E tests for deep-link flow
- [ ] Analytics tracking for share events

---

## 10. Related Files

| File | Purpose |
|------|---------|
| [public/script.js](../public/script.js) | Main app logic, deep-link handling |
| [public/og.html](../public/og.html) | Open Graph meta generator |
| [netlify/functions/mapbox-proxy.js](../netlify/functions/mapbox-proxy.js) | Geocoder proxy for og.html |
| [scripts/verify-prod.ps1](../scripts/verify-prod.ps1) | Tests deep-link endpoints |

---

**Maintained by**: xemgiadat team  
**Last verified**: 2026-01-26
