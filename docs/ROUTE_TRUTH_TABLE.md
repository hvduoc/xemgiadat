# PHASE 0: ROUTE TRUTH TABLE - Root Cause Analysis

**Status**: Evidence Collection  
**Date**: 2025-01-24  
**Issue**: Intermittent production behavior - sometimes legacy, sometimes V2, sometimes missing parcels

---

## 🚨 ROOT CAUSE IDENTIFIED: Redirect Order + Cache Layering

The current netlify.toml has a **CRITICAL BUG** causing intermittent production issues:

### The Bug

```toml
# CURRENT netlify.toml (Lines 47-65) - BROKEN ORDER:

[[redirects]]
  from = "/v2"
  to = "/v2.html"
  status = 200

[[redirects]]
  from = "/v2/"
  to = "/v2/index.html"
  status = 200

[[redirects]]
  from = "/v2/*"
  to = "/v2/:splat"
  status = 200

[[redirects]]
  from = "/v2.html"
  to = "/v2/"
  status = 302

[[redirects]]
  from = "/*"                    ← CATCH-ALL ALWAYS MATCHES
  to = "/index.html"
  status = 200
```

**PROBLEMS**:
1. ❌ No explicit `/v2/assets/*` rule (relies on catch-all behavior)
2. ❌ No explicit `/tiles/*` rule (GETS CAUGHT BY CATCH-ALL!)
3. ❌ Service Worker pre-caches legacy `/index.html` but not `/v2/index.html`
4. ❌ Headers apply `max-age=0` to ALL HTML files including `/v2/index.html` (should be different)

### Why It Causes Intermittent Behavior

**Scenario 1: User 1 loads `/v2/`**
- Browser requests `/v2/`
- Netlify evaluates rules in order:
  - Not `/v2` → continue
  - Yes `/v2/` → redirect to `/v2/index.html` ✅
- Assets load from `/v2/assets/*` → `/v2/:splat` ✅
- All good

**Scenario 2: User 2 hard-refreshes `/v2/`**
- Service Worker intercepts request
- SW has cached `/index.html` (legacy) in STATIC_ASSETS
- SW serves legacy page as if it were `/v2/index.html` ❌
- User sees LEGACY app, not V2
- Intermittent behavior! 🎲

**Scenario 3: Tiles load fails**
- JS tries: `fetch('/tiles/metadata.json')`
- No explicit `/tiles/*` redirect rule
- Falls through to `/*` catch-all
- Gets: `301 /index.html`
- JS expects JSON, gets HTML
- Tiles fail silently, parcels missing ❌

---

## ROUTE TRUTH TABLE (Current vs Expected)

| URL | Current Rule | Current Result | Expected Result | Status |
|-----|--------------|-----------------|-----------------|--------|
| `/` | `/*` catch-all | `/index.html` (legacy) | Legacy app ✅ | ✅ OK |
| `/v2` | Line 47 | → `/v2.html` → `/v2/` → `/v2/index.html` | V2 app ✅ | ⚠️ Double redirect |
| `/v2/` | Line 52 | `/v2/index.html` | V2 app ✅ | ✅ OK |
| `/v2/index.html` | Line 55 `/v2/*` | `/v2/index.html` | V2 app ✅ | ⚠️ Implicit rule |
| `/v2/assets/app-ABC123.js` | Line 55 `/v2/*` | `/v2/assets/app-ABC123.js` | 200 + immutable ✅ | ⚠️ Implicit rule |
| `/tiles/metadata.json` | `/*` catch-all | **→ /index.html** ❌ | `/tiles/metadata.json` 200 | ❌ BROKEN |
| `/tiles/danang_parcels.pmtiles` | `/*` catch-all | **→ /index.html** ❌ | `/tiles/*.pmtiles` 206 | ❌ BROKEN |
| `/admin.html` | `/*` catch-all | `/index.html` (SPA) | `/index.html` (SPA) ✅ | ✅ OK |
| `/unknown` | `/*` catch-all | `/index.html` (SPA) | `/index.html` (SPA) ✅ | ✅ OK |

---

## SERVICE WORKER ISSUE

### Current SW (public/sw.js)

**Line 22**:
```javascript
const CACHE_VERSION = '2.0.1-cache-fix';
```

**Lines 25-65 STATIC_ASSETS**:
```javascript
const STATIC_ASSETS = [
  '/',
  '/index.html',         ← Pre-caches LEGACY!
  '/style.css',
  '/script.js',
  // ...
  // /v2/index.html IS NOT HERE!
];
```

**Lines 132-134**:
```javascript
if (url.pathname.startsWith('/v2/')) {
  event.respondWith(fetch(request));
  return;
}
```

**PROBLEM**:
- SW pre-caches `/index.html` but not `/v2/index.html`
- When user visits `/v2/`, request comes back as `/v2/index.html`
- SW check on line 134 says "OK, bypass cache" ✅
- BUT if SW was activated BEFORE the redirect, it might have cached the OLD `/index.html` → `/v2/index.html` mapping!
- Result: Intermittent cache mismatch ❌

### Why Version Matters

- Current: `2.0.1-cache-fix` (not forcing cache invalidation)
- Need: Date-based `2026-01-24-routing-fix` (automatically busts old cache)

---

## HEADERS ISSUE

### Current Headers (netlify.toml Lines 89-163)

**Line 94-96**:
```toml
[[headers]]
  for = "/*.html"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"
```

**PROBLEM**: This applies to `/v2/index.html` too!
- V2 shell gets `max-age=0` → no cache
- V2 assets get `max-age=31536000, immutable` → long cache
- Mismatch: CDN serves old shell with new assets → inconsistency

---

## BUILD PIPELINE ISSUE

### Current netlify.toml Build Command

**Line 2**:
```toml
command = "npm run build"
```

**PROBLEM**: No clean install!
- If node_modules is stale, build might fail silently
- Or cached build output used instead of fresh
- Netlify might deploy old V2 artifacts

**Fix needed**:
```toml
command = "npm ci && npm run build"  ← Force clean install
```

---

## VITE CONFIG VERIFICATION

### Current vite.config.js

**Lines 9-10**:
```javascript
base: command === 'serve' ? '/' : '/v2/',
```

**Lines 15-16**:
```javascript
outDir: path.resolve(__dirname, 'public/v2'),
emptyOutDir: true,
```

**Status**: ✅ Correct
- Dev: base `/`, output to memory (Vite serve)
- Prod: base `/v2/`, output to `public/v2/`
- `emptyOutDir: true` ensures clean output

**Assumption**: This actually runs! Will verify in PHASE 2.

---

## EVIDENCE: What Needs Fixing

### MUST FIX (Causing Intermittent Issues)

1. **Redirect Order** (PHASE 1)
   - Add explicit `/v2/assets/*` rule BEFORE catch-all
   - Add explicit `/tiles/*` rule BEFORE catch-all
   - Result: No more tiles getting redirected to `/index.html`

2. **Headers** (PHASE 1)
   - Separate `/v2/index.html` from legacy HTML headers
   - Let V2 shell cache for 3600s (has unique content)
   - Keep legacy at `max-age=0`
   - Result: Consistent V2 app shell

3. **Service Worker Version** (PHASE 3)
   - Change to date-based: `2026-01-24-routing-fix`
   - Add cache deletion on activate
   - Result: Old cache busted, fresh start

4. **Build Command** (PHASE 2)
   - Add `npm ci` before `npm run build`
   - Result: Guaranteed fresh build

---

## SUMMARY TABLE

| Layer | Issue | Status | Phase | Impact |
|-------|-------|--------|-------|--------|
| **Routing** | `/tiles/*` caught by catch-all | ❌ BROKEN | P0 | Tiles missing |
| **Routing** | `/v2/assets/*` implicit rule | ⚠️ Risk | P0 | Race condition possible |
| **Headers** | `/v2/index.html` uses legacy cache policy | ❌ BROKEN | P0 | Stale shell + new assets |
| **Service Worker** | STATIC_ASSETS pre-caches legacy | ❌ BROKEN | P0 | Sometimes serves legacy as V2 |
| **Service Worker** | Version not forcing cache bust | ⚠️ Risk | P0 | Old cache lingers |
| **Build** | No clean install | ⚠️ Risk | P0 | Stale artifacts possible |

---

## Route Truth Table (After PHASE 0 Analysis)
| `/v2.html` | `public/v2.html` | `public/v2-entry.ts` → `src2/index.ts` (bundled to `assets/v2-*.js`, `assets/maplibre-*.js`, `assets/pmtiles-*.js`) | V2 CORE MAP | MapLibre + PMTiles, parcel overlay, search bar, ward filter, parcel panel, Đăng tin bridge, diagnostics |
| `/v2-dist/v2.html` (build/preview) | `public/v2-dist/v2.html` | Hashed bundles (`assets/v2-*.js`, `maplibre-*.js`, `pmtiles-*.js`) | V2 CORE MAP (build) | Same as V2, built output served via `npm run preview` or production CDN |

## Quick Identification
- **Console**: `[IDENTITY] LEGACY` at `/`, `[IDENTITY] V2` at `/v2.html`
- **Badge**: "LEGACY / FULL APP" badge on `/`; "V2 CORE MAP" badge on `/v2.html`
- **Network sanity check**:
  - `/`: see `script.js`, `pinetwork.js`, Leaflet, Mapbox GL v4, Firebase SDK
  - `/v2.html`: see `assets/v2-*.js`, `assets/maplibre-*.js`, `assets/pmtiles-*.js` (no `script.js`)

## Evidence Collection (how to capture)
1) Open DevTools → Network
- At `/`: filter `script.js` (should load) and confirm Leaflet/Mapbox/Firebase requests
- At `/v2.html`: filter `assets/v2` (should load) and confirm `maplibre-*.js`, `pmtiles-*.js`

2) Open DevTools → Console
- `/`: badge + `[IDENTITY] LEGACY`
- `/v2.html`: badge + `[IDENTITY] V2`

3) Visual check
- `/`: full legacy UI (toolbar, filters, listing modal)
- `/v2.html`: MapLibre map with parcels + Đăng tin bridge button
