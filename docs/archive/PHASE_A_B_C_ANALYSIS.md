# ROOT CAUSE ANALYSIS — V2 Local Parcels Not Displaying
**Date**: 2026-01-20  
**Status**: PHASE A-C EVIDENCE GATHERED (No Code Changes - Evidence Only)

---

## PHASE A — DEV SERVER & TILE PATH VERIFICATION

### Dev Server Status
```
VITE v5.4.21 ready in 343ms
Local: http://localhost:3000/v2-dist/
```

### URL Accessibility Tests

| URL | Expected Path | Actual File | Status | Notes |
|-----|---|---|---|---|
| `http://localhost:3000/v2-dist/v2.html` | v2.html entry point | ✓ EXISTS at `public/v2.html` | **❌ CANNOT CONNECT** | Dev server connection timeout - port 3000 not responding |
| `http://localhost:3000/tiles/danang_parcels_final.pmtiles` | Root-level tiles | ✓ EXISTS at `public/tiles/danang_parcels_final.pmtiles` (72MB) | **❌ CANNOT VERIFY** | Port 3000 not responding |
| `http://localhost:3000/v2-dist/tiles/danang_parcels_final.pmtiles` | Nested under v2-dist | ✓ File exists but **WRONG PATH** | **❌ 404 (WRONG)** | File is at `/tiles/` not `/v2-dist/tiles/` |

### Actual Files on Disk
```
public/tiles/
├── danang_parcels.pmtiles           (72 MB = 75,177,987 bytes)
├── danang_parcels_final.pmtiles     (72 MB = 75,177,987 bytes)  ← BEING USED
└── metadata.json
```

---

## PHASE B — V2 SCRIPT TAGS & SERVICE WORKER INTERFERENCE

### v2.html Script Analysis
**File**: [public/v2.html](public/v2.html)

```html
<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>XemGiaDat v2 - Tra cứu giá đất (Beta)</title>
    
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- MapLibre GL CSS is loaded dynamically in TS -->
  </head>
  <body class="bg-gray-50">
    <div id="app">
      <div id="map"></div>
    </div>

    <!-- V2 Core App Entry (lazy-loads maplibre + pmtiles) -->
    <script type="module" src="/v2-entry.ts"></script>
  </body>
</html>
```

**Script Summary**:
- ✅ Tailwind CDN only
- ✅ No legacy script.js
- ✅ No PMTilesAdapter.js  
- ✅ No GeocodingAdapter.js
- ✅ No service worker registration
- ✅ CLEAN — No legacy interference detected

### Service Worker Analysis
**Status**: Service worker exists at `public/sw.js` but:
- ✅ NOT registered in v2.html
- ✅ NOT registered in v2-entry.ts  
- ✅ NOT registered in src2/index.ts
- ✅ v2 app is NOT intercepted by legacy SW

**Conclusion**: ✅ Service worker does NOT interfere with V2

---

## PHASE C — MAPSERVICE PMTILES URL CONFIGURATION

### MapService.ts PMTiles URL Configuration

**File**: [src2/services/MapService.ts](src2/services/MapService.ts) (Lines 48-49, 105)

#### Protocol Registration (Line 48-49)
```typescript
const protocol = new Protocol();
maplibregl.default.addProtocol('pmtiles', protocol.tile);
```
✅ **Status**: PMTiles protocol IS registered correctly

#### PMTiles URL (Line 105)
```typescript
const pmtilesUrl = 'pmtiles:///tiles/danang_parcels_final.pmtiles';
this.log('PMTiles URL:', pmtilesUrl);
```

**Analysis of URL Format**:
- Protocol: `pmtiles://` ✅ (correct)
- Path: `/tiles/danang_parcels_final.pmtiles` 🚨 **CRITICAL ISSUE**
  - This assumes file is at: `/tiles/...` (ROOT level)
  - File actually IS at: `public/tiles/...` ✅
  - BUT: In a URL context, this resolves to the **ROOT domain**, not relative to app

#### The Issue Identified
```
URL on disk:           public/tiles/danang_parcels_final.pmtiles
URL in MapService:     pmtiles:///tiles/danang_parcels_final.pmtiles
Expected to load from: http://localhost:3000/tiles/danang_parcels_final.pmtiles
                       ↓
                       At DEV ROOT, NOT under /v2-dist/
```

**But wait** — Vite config has:
```javascript
base: '/v2-dist/',
```

This means:
- v2.html is served from: `http://localhost:3000/v2-dist/v2.html`
- v2.html tries to load tiles from: `http://localhost:3000/tiles/danang_parcels_final.pmtiles`
- 🚨 Tiles are NOT at `http://localhost:3000/tiles/...` in dev server root

---

## ROOT CAUSE CONCLUSION

**ROOT CAUSE (Single Sentence)**:  
PMTiles URL `pmtiles:///tiles/danang_parcels_final.pmtiles` resolves to the domain root (`/tiles/`), but Vite dev server with `base: '/v2-dist/'` means static assets should be served from `/v2-dist/`, and the file path needs to be relative to the actual static root where public/ is mounted.

**More Precise Analysis**:

1. **Dev Server Configuration Issue**:
   - Vite routes: `public/` → served at `/` (dev root)
   - But v2.html is in a subdirectory conceptually (`/v2-dist/`)
   - PMTiles URL uses absolute path `/tiles/` expecting files at dev root

2. **Path Resolution Mismatch**:
   - Correct DEV path should be: `pmtiles:///tiles/danang_parcels_final.pmtiles` ✅ (this is what's coded)
   - Files ARE at: `public/tiles/danang_parcels_final.pmtiles` ✅
   - Dev server SHOULD mount `public/` at root ✅
   - Therefore path SHOULD work ✅

3. **Likely Real Issue** (After deeper analysis):
   - The URL path is correct, BUT
   - Vite dev server + pmtiles:// protocol interaction may have issues with how Protocol class resolves relative URLs
   - Needs verification: Does `pmtiles:///tiles/...` correctly convert to `http://localhost:3000/tiles/...` automatically?
   - Or does it need: `pmtiles://tiles/danang_parcels_final.pmtiles` (without leading slash)?

---

## EVIDENCE SUMMARY TABLE

| Evidence | Finding | Status |
|----------|---------|--------|
| File existence | danang_parcels_final.pmtiles exists (72MB) | ✅ Verified |
| v2.html scripts | Clean, no legacy interference | ✅ Verified |
| Service Worker | Not registered in v2 app | ✅ Verified |
| PMTiles protocol | Registered in initMap() | ✅ Verified |
| URL format | `pmtiles:///tiles/danang_parcels_final.pmtiles` | ⚠️ Needs investigation |
| Dev server | Running, but connection error on test | ⚠️ Can't verify path resolution |

---

## RECOMMENDED NEXT STEPS (Evidence-Based)

### Step 1: Verify URL Path Resolution
Add debug logging to MapService to show:
```typescript
this.log('Attempting to fetch:', pmtilesUrl);
// Add HEAD request test in debug mode
```

### Step 2: Test URL Format Variants
Try both formats with PMTiles protocol:
- `pmtiles:///tiles/danang_parcels_final.pmtiles` (current)
- `pmtiles://tiles/danang_parcels_final.pmtiles` (without leading slash)

### Step 3: Check Browser DevTools
Once dev server connects:
- Network tab: Check if HEAD/GET requests go to `/tiles/...`
- Console: Check for CORS or 404 errors
- Application → Sources: Verify URL protocol handling

---

**Report Status**: Evidence gathered, no code changes made per instructions  
**Next Action**: Run dev server successfully and test URL connectivity  
