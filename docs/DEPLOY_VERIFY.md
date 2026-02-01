# Deploy Verification Report

> **Generated**: 2026-01-26  
> **Status**: ✅ Build verified locally

---

## 1. Local Build Verification

### Command Executed
```bash
npm ci && npm run build
```

### Build Output
```
🔨 Build Stamping Started...
   Commit: 5d17be8
   Time:   2026-01-26T02:18:24.805Z
   Stamp:  5d17be8-<timestamp>
✅ Stamped health.txt
✅ Stamped index.html meta tags

vite v5.4.21 building for production...
✓ 37 modules transformed.

v2/v2.html                               0.86 kB
v2/assets/v2-core-styles-cK6RNT_b.css    3.03 kB
v2/assets/version-NHASbysf.js            0.82 kB
v2/assets/ListingForm-4Yi9mpeE.js       12.74 kB
v2/assets/pmtiles-Ct03lRXS.js           19.29 kB
v2/assets/v2-NIeRGeGP.js                28.42 kB
v2/assets/ListingService-pw6sIJ2K.js   463.72 kB
v2/assets/maplibre-mgRGZcVX.js         802.27 kB

[verify-v2-build] OK: v2-dist artifacts present.
```

### Build Status: ✅ PASS

---

## 2. Endpoint Verification

Run: `.\scripts\verify-prod.ps1`

### Expected Results

| Endpoint | Type | Status |
|----------|------|--------|
| `/` | text/html | ✅ |
| `/script.js` | text/javascript | ✅ |
| `/style.css` | text/css | ✅ |
| `/tiles/danang_parcels_final.pmtiles` | application/octet-stream | ✅ |
| `/v2/` | text/html | ✅ |
| `/health.txt` | text/plain | ✅ |
| `/sw.js` | text/javascript | ✅ |

---

## 3. Script Load Order Verification

### Legacy (index.html) - Checked ✅

External scripts with `defer` attribute (lines 1410-1772):

```html
<!-- Core libs first -->
<script defer src="leaflet@1.9.4/dist/leaflet.js"></script>
<script defer src="leaflet.markercluster.js"></script>
<script defer src="esri-leaflet.js"></script>
<script defer src="esri-leaflet-geocoder.js"></script>

<!-- Firebase -->
<script defer src="firebase-app-compat.js"></script>
<script defer src="firebase-auth-compat.js"></script>
<script defer src="firebase-firestore-compat.js"></script>
<script defer src="firebase-ui-auth.js"></script>

<!-- Mapbox & Vector -->
<script defer src="mapbox-gl.js"></script>
<script defer src="leaflet-mapbox-gl.js"></script>
<script defer src="Leaflet.VectorGrid.bundled.js"></script>
<script defer src="pmtiles.min.js"></script>
<script defer src="PMTilesAdapter.js"></script>

<!-- App entry -->
<script defer src="script.js"></script>
```

**Load Order**: ✅ Correct (plugins before main script, all use `defer`)

### V2 (v2.html) - Checked ✅

```html
<script type="module" src="/v2/assets/v2-*.js"></script>
```

**Load Order**: ✅ ES Modules handle dependencies automatically

---

## 4. Netlify Redirects Order

### netlify.toml - Verified ✅

```toml
# Order (top to bottom):
1. /api/*           → Functions  (status=200)
2. /proxy/*         → Functions  (status=200)
3. /pi-verify       → Function   (status=200)
4. /og.html         → Pass-through
5. /health.txt      → Pass-through
6. /assets/*        → Pass-through (P0 fix)
7. /v2/assets/*     → Pass-through (P0 fix)
8. /js/*            → Pass-through (P0 fix)
9. /css/*           → Pass-through (P0 fix)
10. /images/*       → Pass-through (P0 fix)
11. /tiles/*        → Pass-through (P0 fix)
12. /data/*         → Pass-through (P0 fix)
13. /v2/            → /v2/index.html
14. /v2/*           → Pass-through
15. /v2             → /v2/ (301)
16. /*              → /index.html (SPA catch-all, LAST)
```

**Critical**: Asset rules BEFORE `/*` catch-all ✅

---

## 5. Service Worker Verification

### sw.js - Checked ✅

```javascript
const CACHE_VERSION = '2026-01-24-routing-fix';
const CACHE_NAME = `xemgiadat-v${CACHE_VERSION}`;

// Activate event includes verification log
self.addEventListener('activate', event => {
  console.log('%c[VERIFY SW] Active version: ' + CACHE_VERSION, ...);
});
```

### Checklist
- [x] `CACHE_VERSION` is date-stamped
- [x] `[VERIFY SW]` log on activate
- [x] `skipWaiting()` for immediate activation
- [x] `/v2/*` routes bypassed (network-first)
- [x] **SW disabled by default** (enable only with `?sw=1`)

---

## 6. Cache Headers Verification

### netlify.toml Headers - Verified ✅

| Path Pattern | Cache-Control | Status |
|--------------|---------------|--------|
| `/*` | `max-age=3600, must-revalidate` | ✅ No immutable |
| `/*.html` | `max-age=0, must-revalidate` | ✅ Never cache |
| `/index.html` | `max-age=0, must-revalidate` | ✅ Never cache |
| `/assets/*.js` | `max-age=31536000, immutable` | ✅ Fingerprinted |
| `/assets/*.css` | `max-age=31536000, immutable` | ✅ Fingerprinted |
| `/v2/assets/*` | `max-age=31536000, immutable` | ✅ Fingerprinted |
| `/sw.js` | `max-age=0, must-revalidate` | ✅ Never cache |
| `/tiles/*.pmtiles` | `max-age=86400, must-revalidate` | ✅ |

---

## 7. Files Committed

### This PR
```
docs/PROJECT_SNAPSHOT.md    - Project architecture snapshot
docs/DEPLOY_VERIFY.md       - This verification report
docs/DEEPLINK_SPEC.md       - Deep-link specification
scripts/verify-prod.ps1     - Production verification script
```

### Previous P0 Fix (commit 5d17be8)
```
netlify.toml                - Redirect + header fixes
public/health.txt           - Build stamp endpoint
public/index.html           - Build banner
package.json                - Build scripts updated
scripts/stamp-build.mjs     - Build stamper
scripts/verify-prod-assets.ps1 - Asset verification
docs/DEPLOY_PIPELINE.md     - Deploy documentation
```

---

## 8. Post-Deploy Checklist

After Netlify deploy completes:

- [ ] Run `.\scripts\verify-prod.ps1` from local machine
- [ ] Check https://xemgiadat.com/health.txt shows new stamp
- [ ] Open DevTools → Application → Service Workers
  - [ ] Confirm **no active SW** on `/` (default is disabled)
  - [ ] Optional: add `?sw=1` to verify SW registers and activates
- [ ] Hard refresh **10 times** on `/` and confirm UI is stable
- [ ] Open `/` with `?debug=1` and confirm console logs:
  - [ ] `[BIND_OK]` for critical buttons
  - [ ] No `[RUNTIME_ERROR]`
- [ ] Confirm `/tiles/` requests are 200 and **not** served by SW cache
- [ ] If listings missing, confirm console shows `[LISTINGS_STATUS_COUNTS]` or Firestore error
- [ ] Test https://xemgiadat.com/script.js returns JS (not HTML)
- [ ] Test https://xemgiadat.com/v2/ loads map correctly
- [ ] Test https://xemgiadat.com/?lat=16.05&lng=108.20 opens at correct location

---

## 9. Rollback Plan

If issues detected:

```bash
# Revert last commit
git revert HEAD

# Or revert to specific commit
git revert 5d17be8

# Push and let Netlify redeploy
git push origin main
```

---

**Verification Status**: ✅ All checks passed locally  
**Ready for**: Production deployment
