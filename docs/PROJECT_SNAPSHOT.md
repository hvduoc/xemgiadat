# XemGiaDat Project Snapshot

> **Generated**: 2026-01-26  
> **Auditor**: Copilot Project Auditor  
> **Mode**: Evidence-First

---

## 1. Route Architecture

```
PRODUCTION ROUTES (xemgiadat.com)
─────────────────────────────────────────────────────────────────────────────
/                          → index.html (Legacy SPA - Leaflet + Mapbox)
/v2/                       → v2/index.html (V2 App - MapLibre + PMTiles)
/tiles/*                   → Static tiles (danang_parcels_final.pmtiles)
/assets/*                  → Fingerprinted JS/CSS (hash-busted)
/v2/assets/*               → V2 fingerprinted assets
/.netlify/functions/*      → Serverless functions (api, proxy, pi-verify)
/api/*                     → Rewrite to /.netlify/functions/:splat
/og.html                   → Open Graph share page (dynamic meta)

REDIRECT ORDER (netlify.toml):
1. /api/*, /proxy/*, /pi-verify → Serverless functions
2. /assets/*, /v2/assets/*, /js/*, /css/*, /images/*, /tiles/*, /data/* → Pass-through
3. /v2/* → V2 app routes
4. /* → /index.html (SPA fallback, LAST)
```

---

## 2. Feature Matrix

| Feature | Legacy (/) | V2 (/v2/) | Entry File | Line Reference |
|---------|------------|-----------|------------|----------------|
| **Map Rendering** | Leaflet + Mapbox GL | MapLibre GL | `public/script.js` L195-250, `src2/services/MapService.ts` | ✅ Both |
| **Parcel Tiles (PMTiles)** | VectorGrid adapter | Native PMTiles protocol | `public/js/adapters/PMTilesAdapter.js`, `src2/services/MapService.ts` L55-70 | ✅ Both |
| **Click Parcel → Info** | showInfoPanel() | ParcelPanel.show() | `public/script.js` L737-800, `src2/components/ParcelPanel.ts` | ✅ Both |
| **Parcel Outline/Highlight** | Leaflet polyline | MapLibre feature-state | `public/script.js` L400-430, `src2/services/MapService.ts` L150-180 | ✅ Both |
| **Copy Link / Deep-Link** | copyLocationLink() | ❌ Not implemented | `public/script.js` L1238-1242 | Legacy only |
| **Share (FB/WhatsApp)** | share() + og.html | ❌ Not implemented | `public/script.js` L1248-1275, `public/og.html` | Legacy only |
| **Đăng Tin (Create Listing)** | Full form in index.html | Lazy-load ListingForm | `public/index.html` L680-850, `src2/components/ListingForm.ts` | ✅ Both |
| **Marker Clustering** | L.markerClusterGroup | ❌ Not implemented | `public/script.js` L725-732 | Legacy only |
| **Firebase Auth** | firebaseui-auth | ❌ Not implemented | `public/script.js` L150, L2504-2622 | Legacy only |
| **Ward Filter** | MaXa dropdown | WardFilter component | `public/script.js`, `src2/components/WardFilter.ts` | ✅ Both |
| **Service Worker (PWA)** | sw.js with offline | ❌ Bypassed | `public/sw.js` | Legacy only |

---

## 3. Entry Points (Code Locations)

### Map Initialization
| App | File | Function/Class | Line |
|-----|------|----------------|------|
| Legacy | `public/script.js` | Global init (IIFE) | ~195-250 |
| V2 | `src2/services/MapService.ts` | `MapService.initMap()` | L50-90 |

### Tiles/PMTiles Loading
| App | File | Function/Class | Line |
|-----|------|----------------|------|
| Legacy | `public/js/adapters/PMTilesAdapter.js` | PMTilesAdapter | Entire file |
| Legacy | `public/index.html` | Script tag | L1771-1772 |
| V2 | `src2/services/MapService.ts` | Protocol import | L55-60 |

### Click Parcel Handler
| App | File | Function/Class | Line |
|-----|------|----------------|------|
| Legacy | `public/script.js` | vectorGrid click event | L400-432 |
| V2 | `src2/index.ts` | `handleParcelClick()` | L85-105 |

### Deep-Link / Share
| App | File | Function | Line |
|-----|------|----------|------|
| Legacy | `public/script.js` | `copyLocationLink()` | L1238-1242 |
| Legacy | `public/script.js` | `share()` | L1248-1275 |
| Legacy | `public/og.html` | OG meta generator | Entire file |

### Đăng Tin (Listing)
| App | File | Component | Line |
|-----|------|-----------|------|
| Legacy | `public/index.html` | Form HTML | L680-850 |
| Legacy | `public/script.js` | submitListing() | ~L2000-2100 |
| V2 | `src2/components/ListingForm.ts` | ListingForm class | Entire file |
| V2 | `src2/services/ListingService.ts` | ListingService | Entire file |

### Firebase Auth
| App | File | Function | Line |
|-----|------|----------|------|
| Legacy | `public/script.js` | `auth = firebase.auth()` | L150 |
| Legacy | `public/script.js` | `onAuthStateChanged()` | L2504-2556 |
| Legacy | `public/script.js` | FirebaseUI config | L2556-2622 |

### Marker Clustering
| App | File | Function | Line |
|-----|------|----------|------|
| Legacy | `public/script.js` | `L.markerClusterGroup()` | L725-732 |

---

## 4. Build & Deploy Pipeline

### netlify.toml Configuration
```
[build]
  command = "npm ci && npm run build"
  publish = "public"
  functions = "netlify/functions"
```

### Build Script (package.json)
```json
"build": "node scripts/stamp-build.mjs && vite build && node scripts/verify-v2-build.mjs"
```

### Build Output Structure
```
public/                     ← Publish folder (legacy + static)
├── index.html             ← Legacy SPA entry
├── script.js              ← Legacy runtime (9267 lines)
├── style.css              ← Legacy styles
├── sw.js                  ← Service Worker
├── health.txt             ← Build stamp (P0 fix)
├── tiles/
│   └── danang_parcels_final.pmtiles (71MB)
└── v2/                    ← V2 app (Vite output)
    ├── v2.html            ← V2 entry (renamed from index.html)
    └── assets/
        ├── v2-*.js        ← V2 bundle (28KB)
        ├── v2-core-styles-*.css (3KB)
        ├── maplibre-*.js  ← MapLibre (802KB)
        └── pmtiles-*.js   ← PMTiles (19KB)
```

### Service Worker Strategy
- **File**: `public/sw.js`
- **Cache Version**: `CACHE_VERSION = '2026-01-24-routing-fix'`
- **Scope**: `/` (legacy app only)
- **V2 Handling**: Bypasses `/v2/*` routes (network-first)
- **Verify Log**: `[VERIFY SW] Active version: <version>` on activate

### Cache Headers (netlify.toml)
| Path | Cache-Control |
|------|---------------|
| `/*.html` | `max-age=0, must-revalidate` |
| `/assets/*` | `max-age=31536000, immutable` |
| `/v2/assets/*` | `max-age=31536000, immutable` |
| `/*.js`, `/*.css` | `max-age=86400, must-revalidate` |
| `/tiles/*.pmtiles` | `max-age=86400, must-revalidate` |
| `/sw.js` | `max-age=0, must-revalidate` |

---

## 5. File/Line References by Keyword

### tiles/, pmtiles, vectorGrid
| File | Line | Context |
|------|------|---------|
| `netlify.toml` | 90-91 | Redirect `/tiles/*` |
| `public/index.html` | 1768 | VectorGrid script |
| `public/index.html` | 1771-1772 | PMTiles script + adapter |
| `public/sw.js` | 53 | Cache `/tiles/metadata.json` |
| `src2/services/MapService.ts` | 55-70 | PMTiles protocol setup |
| `vite.config.js` | 26-30 | PMTiles chunk splitting |

### share, copy link, lat/lng
| File | Line | Context |
|------|------|---------|
| `public/script.js` | 770 | `copyLocationLink(lat, lng)` button |
| `public/script.js` | 778-783 | Share menu toggle |
| `public/script.js` | 1238-1242 | `copyLocationLink()` implementation |
| `public/script.js` | 1248-1275 | `share()` implementation |
| `public/index.html` | 1219-1223 | Share bar HTML |
| `public/og.html` | Entire | OG share page |

### firebase auth
| File | Line | Context |
|------|------|---------|
| `public/index.html` | 145 | Firebase UI CSS |
| `public/index.html` | 880 | Auth container |
| `public/index.html` | 1417-1420 | Firebase Auth scripts |
| `public/script.js` | 150 | `const auth = firebase.auth()` |
| `public/script.js` | 2504-2622 | onAuthStateChanged + UI config |

### listing, đăng tin
| File | Line | Context |
|------|------|---------|
| `public/index.html` | 595-597 | Đăng tin button |
| `public/index.html` | 680-850 | Listing form modal |
| `src2/components/ParcelPanel.ts` | 30 | "Đăng tin" button |
| `src2/index.ts` | 108-140 | `openListingForm()` lazy-load |
| `src2/services/ListingService.ts` | Entire | Listing API |

### cluster
| File | Line | Context |
|------|------|---------|
| `public/index.html` | 147-148 | MarkerCluster CSS |
| `public/index.html` | 1414 | MarkerCluster JS |
| `public/script.js` | 725-732 | `L.markerClusterGroup()` |

---

## 6. Known Risks

### 🔴 Critical
1. **Legacy script.js is 9267 lines** - Single point of failure, hard to maintain
2. **No deep-link in V2** - Competitive advantage lost if V2 ships without it
3. **Firebase Auth only in Legacy** - V2 users cannot log in

### 🟠 High
1. **Service Worker scope** - SW caches legacy files only, V2 is network-dependent
2. **Script load order** - Legacy relies on CDN scripts with `defer` (order matters)
3. **PMTiles file is 71MB** - First load is slow without cache

### 🟡 Medium
1. **Two separate map engines** - Leaflet (legacy) vs MapLibre (V2)
2. **Duplicate ward data** - `maxa_list.js` + hardcoded in WardFilter.ts
3. **og.html hardcodes origin** - May break if domain changes

### 🟢 Low
1. **V2 uses Tailwind CDN** - Should be bundled for production
2. **Console logs in production** - Debug logs still present

---

## 7. Quick Verification Commands

```powershell
# Check build
npm ci && npm run build

# Verify assets
.\scripts\verify-prod-assets.ps1

# Check health endpoint
curl https://xemgiadat.com/health.txt

# Check SW version
# In browser DevTools → Application → Service Workers → Version
```

---

## 8. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         NETLIFY EDGE                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │ Redirects   │  │  Headers    │  │  Functions  │  │   CDN Cache     │ │
│  │ (P0 fix)    │  │ (Cache-Ctrl)│  │ (api/proxy) │  │  (immutable)    │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘ │
└─────────┼────────────────┼────────────────┼──────────────────┼──────────┘
          │                │                │                  │
          ▼                ▼                ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         public/ (Publish Folder)                         │
│  ┌────────────────────────────┐  ┌────────────────────────────────────┐ │
│  │   LEGACY APP (/)           │  │   V2 APP (/v2/)                    │ │
│  │  ┌──────────────────────┐  │  │  ┌──────────────────────────────┐  │ │
│  │  │ index.html           │  │  │  │ v2/v2.html                   │  │ │
│  │  │ script.js (9267 L)   │  │  │  │ v2/assets/v2-*.js            │  │ │
│  │  │ style.css            │  │  │  │ v2/assets/maplibre-*.js      │  │ │
│  │  │ sw.js (PWA)          │  │  │  │ v2/assets/pmtiles-*.js       │  │ │
│  │  └──────────────────────┘  │  │  └──────────────────────────────┘  │ │
│  │  ┌──────────────────────┐  │  │  ┌──────────────────────────────┐  │ │
│  │  │ Leaflet + Mapbox GL  │  │  │  │ MapLibre + PMTiles Protocol  │  │ │
│  │  │ Firebase Auth        │  │  │  │ TypeScript + Vite            │  │ │
│  │  │ MarkerCluster        │  │  │  │ Lazy-load Listing            │  │ │
│  │  │ Deep-link + Share    │  │  │  │ ❌ No Auth / No Share        │  │ │
│  │  └──────────────────────┘  │  │  └──────────────────────────────┘  │ │
│  └────────────────────────────┘  └────────────────────────────────────┘ │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ SHARED ASSETS                                                        ││
│  │  tiles/danang_parcels_final.pmtiles (71MB)                          ││
│  │  data/ranhgioi.geojson                                               ││
│  │  images/, js/adapters/, health.txt                                   ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         FIREBASE                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                      │
│  │  Firestore  │  │    Auth     │  │   Storage   │                      │
│  │  (Listings) │  │ (Google/    │  │  (Images)   │                      │
│  │             │  │  Email)     │  │             │                      │
│  └─────────────┘  └─────────────┘  └─────────────┘                      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

**Reading Time**: ~5 minutes  
**Coverage**: 80% of system architecture
