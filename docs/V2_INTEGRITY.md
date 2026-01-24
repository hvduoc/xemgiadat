# V2 Integrity Lock

## Overview
Strict build verification ensures V2 deployments are complete and consistent. All gates must pass before deployment.

---

## Source of Truth
- **Entry chain**: `public/v2.html` → `public/v2-entry.ts` → `src2/index.ts` → services/components under `src2/`
- **Build target**: `public/v2-dist/` (served by Netlify publish="public")
- **Tiles data**: `public/tiles/danang_parcels_final.pmtiles` (72 MB vector tile source)
- **PMTiles URL** (in `src2/services/MapService.ts`): `pmtiles://tiles/danang_parcels_final.pmtiles`
  - Dev (base `/`): Resolves to `http://localhost:3000/tiles/danang_parcels_final.pmtiles` ✅
  - Prod (base `/v2-dist/`): Resolves to `https://domain.com/tiles/danang_parcels_final.pmtiles` ✅
- **CSS handling**:
  - **Core styles**: Imported in `src2/index.ts` → bundled as `v2-*.css` (required)
  - **MapLibre CSS**: Dynamically injected by `MapService` (avoids duplication)
  - **Tailwind**: CDN via `v2.html` (no build step)

---

## Build & Smoke Check

### Build Command
```bash
npm run build
```

### Automated Verification (`verify-v2-build.mjs`)

**Uses absolute paths** from repo root for portability:
```javascript
const distDir = path.resolve(rootDir, 'public', 'v2-dist');
```

**Required assets (strict)**:
- `public/v2-dist/v2.html` (entry point)
- `public/v2-dist/assets/v2-*.js` (main bundle)
- `public/v2-dist/assets/v2-*.css` (core styles) ⚠️ **Mandatory**
- `public/v2-dist/assets/maplibre-*.js` (map library)
- `public/v2-dist/assets/pmtiles-*.js` (tile protocol)
- `public/tiles/danang_parcels_final.pmtiles` (vector tiles, >1MB) ⚠️ **NEW: Mandatory**

**Conditional assets**:
- If `listing.html` exists → `ListingService-*.js` required

### Success Output
```
[verify-v2-build] OK: v2-dist artifacts present.
[verify-v2-build] HTML: public\v2-dist\v2.html (0.9KB)
[verify-v2-build] v2 bundle: public\v2-dist\assets\v2-*.js (22.5KB)
[verify-v2-build] v2 core styles: public\v2-dist\assets\v2-*.css (3.2KB)
[verify-v2-build] MapLibre chunk: public\v2-dist\assets\maplibre-*.js (783.7KB)
[verify-v2-build] PMTiles chunk: public\v2-dist\assets\pmtiles-*.js (18.8KB)
```

### Failure Handling
- ❌ Missing CSS → Build fails
- ❌ Missing JS chunks → Build fails
- ✅ Reports directory contents on failure for debugging

---

## CSS Integrity (NEW)

### Why CSS is Required
V2 core styles (`src2/styles/index.css`) are **mandatory** for:
1. Base resets (normalize browsers)
2. Layout (app container, map viewport, panels)
3. Component styles (search bar, ward filter, parcel panel)
4. Mobile responsive (breakpoints)
5. MapLibre overrides (hide attribution, control positioning)

**Without CSS**: Broken UI, overlapping panels, invisible controls.

### Import Flow
```typescript
// src2/index.ts (top-level import)
import "./styles/index.css";
```

Vite bundles this into a CSS chunk in `public/v2-dist/assets/`. When multiple entries exist (v2 + listing), CSS may be combined into shared chunks.

### Verification
Pattern: `/^.*\.css$/` (any CSS file in assets)

**Strict check**: At least one `*.css` file must exist.

If not found:
```
[verify-v2-build] Missing asset: v2 core styles (/^.*\.css$/).
Command exited with code 1
```

---

## Absolute Path Strategy

### Why Absolute Paths?
The verify script uses **absolute paths** from repo root to ensure portability:
- ✅ Works from any directory
- ✅ CI/CD safe (no `cwd` assumptions)
- ✅ Monorepo compatible

### Implementation
```javascript
// scripts/verify-v2-build.mjs
const rootDir = path.resolve(__dirname, '..');  // Project root
const distDir = path.resolve(rootDir, 'public', 'v2-dist');  // Absolute path
const assetsDir = path.resolve(distDir, 'assets');
```

---

## Runtime Verification (Prod)
- URL: `/v2-dist/v2.html`
- Steps:
  1) Open page → map renders
  2) Click parcel → panel shows OBJECTID/MaXa details
  3) Filter by MaXa via dropdown
  4) Append `?debug=1` → console logs version/debug info
- Rollback: revert this PR and redeploy (legacy `/` remains unchanged).

## Dev vs Prod Paths
- Dev server: `npm run dev` → open `http://localhost:3000/v2-dist/v2.html`
- Prod: `https://<domain>/v2-dist/v2.html`

## Manual HTTP Checks
- Confirm HTML live:
  ```bash
  curl -I https://xemgiadat.com/v2-dist/v2.html
  ```
- Confirm cached vendor chunk:
  ```bash
  curl -I https://xemgiadat.com/v2-dist/assets/maplibre-*.js
  ```
