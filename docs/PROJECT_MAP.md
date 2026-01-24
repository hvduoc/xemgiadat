# PROJECT MAP — XemGiaDat Architecture Overview

**Last Updated**: January 19, 2026  
**Status**: Migration in progress (v1 → v2)  
**Stability**: 🟢 Production v1 stable | 🟡 v2 development

---

## 🎯 Executive Summary (10 Minute Overview)

| Aspect | Status | Location |
|--------|--------|----------|
| **Production Entry** | ✅ ACTIVE | `public/index.html` |
| **Main Runtime** | ✅ ACTIVE | `public/script.js` (9187 lines) |
| **Build Tool** | ⚠️ NOT DEPLOYED | Vite → dist/ (ignored by deploy) |
| **Future Core** | 🔄 DEVELOPMENT | `src2/` + `public/v2.html` |
| **Legacy Code** | ❌ ORPHANED | `src/` (never deployed) |

**Deploy Reality**: Production serves raw `public/` files → `public/index.html` → `public/script.js`  
**Why**: `netlify.toml` publishes from `public/`, not Vite's `dist/` output

---

## 📊 Core Runtime Files (Top 20 - What Actually Runs)

### Production v1 (Currently Deployed)

| Rank | File | Size | Lines | Purpose | Stability |
|------|------|------|-------|---------|-----------|
| 1 | public/script.js | 374 KB | 9,187 | **MAIN RUNTIME** - All v1 logic here | 🟢 STABLE |
| 2 | public/index.html | 68 KB | 1,731 | Entry point & page structure | 🟢 STABLE |
| 3 | public/admin.js | 87 KB | ? | Admin panel functions | 🟡 PARTIAL |
| 4 | public/sw.js | 11 KB | 350 | Service Worker & offline | 🟢 STABLE |
| 5 | public/pwa-enhancements.js | 5.7 KB | ~200 | PWA caching logic | 🟢 STABLE |
| 6 | public/pinetwork.js | 35 KB | ~1200 | Pi Network integration | 🟡 OPTIONAL |
| 7 | public/manifest.json | <1 KB | 50 | PWA manifest | 🟢 STABLE |
| 8 | public/style.css | ~30 KB | ~1000 | Main v1 styles | 🟢 STABLE |
| 9 | public/critical-inline.css | <1 KB | ~100 | Inline critical CSS | 🟢 STABLE |
| 10 | public/js/adapters/PMTilesAdapter.js | 8.5 KB | 335 | Vector tiles loading | 🟢 STABLE |

### Backend Functions (Netlify)

| Rank | File | Size | Purpose | Status |
|------|------|------|---------|--------|
| 11 | netlify/functions/mapbox-proxy.js | 4.6 KB | Reverse proxy for maps | 🟢 ACTIVE |
| 12 | netlify/functions/pi-verify.js | 8.6 KB | Pi Network verification | 🟢 ACTIVE |

### Development v2 (Not Yet Production)

| Rank | File | Size | Purpose | Status |
|------|------|------|---------|--------|
| 13 | public/v2.html | 26 lines | v2 entry point | 🔄 DEVELOPMENT |
| 14 | src2/index.ts | ~50 lines | v2 runtime entry | 🔄 DEVELOPMENT |
| 15 | src2/services/MapService.ts | 161 lines | MapLibre wrapper | 🔄 DEVELOPMENT |
| 16 | src2/components/ParcelPanel.ts | ~100 lines | Parcel details panel | 🔄 DEVELOPMENT |
| 17 | src2/components/SearchBar.ts | ~80 lines | Search component | 🔄 DEVELOPMENT |

### Orphaned (Never Deployed)

| Rank | File | Size | Purpose | Status |
|------|------|------|---------|--------|
| 18 | src/main.js | <1 KB | Dead entrypoint | 🔴 DEAD |
| 19 | src/map/MapLibreConfig.js | ~10 KB | Dead map library | 🔴 DEAD |
| 20 | src/services/GeocodingService.js | ~5 KB | Dead service | 🔴 DEAD |

---

## 🗂️ Architecture Tree

```
XemGiaDat/
│
├─ 🟢 PRODUCTION v1 (ACTIVE — Serving Now)
│  ├─ public/index.html           [Entry, 1731 lines]
│  ├─ public/script.js            [MAIN RUNTIME, 9187 lines, 374 KB]
│  │  ├─ Firebase Auth & Firestore (embedded)
│  │  ├─ Map initialization (unknown lib)
│  │  ├─ Geocoding (Mapbox API)
│  │  └─ PMTiles/GeoJSON loading
│  ├─ public/sw.js               [Service Worker, 350 lines]
│  ├─ public/pwa-enhancements.js [PWA caching]
│  ├─ public/admin.js            [Admin functions]
│  └─ netlify/functions/         [Backend APIs]
│     ├─ mapbox-proxy.js
│     └─ pi-verify.js
│
├─ 🟡 DEVELOPMENT v2 (Isolated Route: /v2)
│  ├─ public/v2.html             [v2 Entry]
│  ├─ src2/
│  │  ├─ index.ts                [v2 Runtime]
│  │  ├─ services/MapService.ts  [MapLibre explicit]
│  │  ├─ components/
│  │  │  ├─ ParcelPanel.ts
│  │  │  └─ SearchBar.ts
│  │  └─ styles/index.css
│  └─ ⚠️ ONLY runs: Vite dev server (NOT in production)
│
├─ 🔴 ORPHANED (DEAD — Never Deployed)
│  ├─ src/main.js                [Not referenced]
│  ├─ src/map/MapLibreConfig.js  [Not built]
│  └─ src/services/              [Not used]
│
├─ 📊 DATA LAYER
│  ├─ public/data/
│  │  ├─ parcels/                [56 × geojson, 400+ MB, GIT TRACKED]
│  │  ├─ ranhgioi.geojson        [Ward boundaries, 9.87 MB]
│  │  └─ metadata.json           [Tile metadata]
│  ├─ public/tiles/
│  │  ├─ danang_parcels_final.pmtiles  [71.7 MB, PRIMARY]
│  │  └─ danang_parcels.pmtiles        [71.7 MB, DUPLICATE ⚠️]
│  └─ public/css/tailwind-production.css
│
├─ 🔧 CONFIG (What Actually Matters)
│  ├─ netlify.toml               [DEPLOY CONFIG: publish=public/]
│  ├─ vite.config.js             [BUILD CONFIG: outDir=dist/ (UNUSED)]
│  ├─ package.json               [Dependencies]
│  └─ .gitignore                 [Ignore rules]
│
└─ 🚀 BUILD OUTPUT (Not Deployed)
   └─ public/dist/               [Vite builds here but ignored]
      └─ (never served)
```

---

## 🔄 Current Data Flow

### User Request → Production

```
Browser request
    ↓
Netlify routing
    ↓
netlify.toml: publish = "public/"
    ↓
Serve public/index.html
    ↓
Load public/script.js (9187 lines - ALL LOGIC)
    ↓
public/script.js initializes:
    ├─ Firebase Auth + Firestore
    ├─ Map rendering (lib unknown)
    ├─ PMTiles: public/js/adapters/PMTilesAdapter.js
    ├─ Load: public/tiles/danang_parcels_final.pmtiles
    └─ Fallback: public/data/parcels/*.geojson
    ↓
Backend APIs: netlify/functions/
    ├─ /api/* → mapbox-proxy.js
    └─ /pi-verify → pi-verify.js
    ↓
External Services:
    ├─ Firebase (Auth, Firestore)
    ├─ Mapbox (Geocoding)
    └─ Pi Network (if enabled)
```

### v2 Development Route (NOT Production)

```
User: /v2 route
    ↓
netlify.toml redirect: /v2 → /v2.html
    ↓
Load public/v2.html (26 lines)
    ↓
Load src2/index.ts via Vite dev server
    ↓
src2 runtime (MapLibre + PMTiles explicit)
    ↓
⚠️ ONLY works in development!
```

---

## ⚠️ Critical Understanding

### What is Production RIGHT NOW?

- ✅ **Entry**: `public/index.html`
- ✅ **Runtime**: `public/script.js` (entire v1 logic in 9187 lines)
- ✅ **Deploy**: From `public/` folder (via netlify.toml)
- ❌ **NOT**: Vite build output (dist/ is ignored)
- ❌ **NOT**: TypeScript (served as raw JS)

### Why is Vite Build Not Deployed?

```
vite.config.js: outDir = "dist/"
netlify.toml: publish = "public/"

RESULT: dist/ builds but never deployed
```

**Implication**: No tree-shaking, no code-splitting, no optimization

### Why is src/ Dead?

```
vite.config.js: 
  rollupOptions {
    input: {
      main: 'public/index.html',    ← uses public/
      v2: 'public/v2.html'          ← uses public/
    }
  }

src/main.js is not referenced
RESULT: src/ never built
```

---

## 🎯 Migration Strategy (v1 → v2)

### Phase 1: Preparation (Now)
- [x] Audit architecture (see PROJECT_FORENSICS_REPORT.md)
- [x] Create this map document
- [ ] Freeze legacy code with "FROZEN LEGACY" headers
- [ ] Document what each v1 file does

### Phase 2: v2 Development (Soon)
- [ ] Build complete v2 in src2/ (MapLibre + PMTiles explicit)
- [ ] Mirror v1 features in v2
- [ ] Test v2 thoroughly at `/v2` route
- [ ] Performance benchmarks (v1 vs v2)

### Phase 3: Cutover (Future)
- [ ] Switch Netlify redirect: / → /v2.html (with fallback)
- [ ] Monitor production v2 for 1 week
- [ ] Archive src/ and public/script.js

### Phase 4: Cleanup (After cutover)
- [ ] Delete src/ and public/dist/
- [ ] Remove Vite from build (or properly configure)
- [ ] Migrate public/data to CDN or Git LFS

---

## 📋 File Edit Guidelines

### ✅ SAFE to Edit

- `src2/` (development, not deployed)
- `docs/` (documentation)
- `.vscode/` (settings, doesn't affect build)
- `.gitignore` (git rules)
- `package.json` (dependencies, carefully)

### ⚠️ FROZEN — Avoid Unless Necessary

**Following files serve production traffic. Frozen with "FROZEN LEGACY" header:**

- `public/index.html` (entry point)
- `public/script.js` (9187 lines - ALL LOGIC)
- `public/sw.js` (service worker)
- `public/pwa-enhancements.js` (PWA caching)
- `netlify/functions/*` (backend APIs)

**Why frozen?**
- Direct production traffic
- High risk of breaking live site
- Any change requires full testing
- Migration path is v2, not patch v1

### 🔴 DELETE (Planned)

- `src/` (orphaned, never deployed)
- `public/dist/` (unused build output)
- Duplicate PMTiles: `public/tiles/danang_parcels.pmtiles`

---

## 🚨 Risks & Rollback

### Risk 1: Editing public/script.js

**Impact**: Breaks production immediately (9187 lines changed)  
**Detection**: Users report blank map or 404 errors  
**Rollback**: `git revert <commit-hash>` → redeploy

### Risk 2: Editing netlify.toml

**Impact**: Breaks deployment routing  
**Rollback**: Revert netlify.toml → trigger redeploy

### Risk 3: Deleting data files

**Impact**: Map data unavailable (parcel geometries gone)  
**Rollback**: Restore from backup + redeploy

---

## 📞 Contact & Questions

- **Architecture Questions**: See PROJECT_FORENSICS_REPORT.md
- **Migration Questions**: See CORE_MIGRATION_PLAN.md
- **Do Not Edit**: See DO_NOT_EDIT.md
- **Report Issues**: Create issue with label `frozen-legacy`

---

## Version History

| Date | Status | Notes |
|------|--------|-------|
| 2026-01-19 | Created | Initial project map |
| TBD | v2 ready | When v2 reaches feature parity |
| TBD | Cutover | Production → v2 route |
| TBD | Archived | v1 becomes reference |
