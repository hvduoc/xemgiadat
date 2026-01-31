# V2 Deployment Guide

## Overview

V2 Core App now builds to `public/v2-dist/` to work seamlessly with Netlify's `publish="public"` configuration.

**Build Output Structure**:
```
public/
├── v2-dist/                    # V2 build output (from npm run build)
│   ├── v2.html                # V2 entry point
│   └── assets/
│       ├── v2-*.js           # Main app bundle (15KB)
│       ├── v2-*.css          # App styles (69KB)
│       ├── maplibre-*.js     # MapLibre GL (802KB) - lazy-loaded
│       ├── pmtiles-*.js      # PMTiles protocol (19KB) - lazy-loaded
│       └── version-*.js      # Build version info (1KB)
├── v2.html                    # Source (dev entry)
├── v2-entry.ts               # Bridge to src2
├── index.html                 # Legacy entry (untouched)
├── script.js                  # Legacy runtime (untouched)
└── ...                       # Other legacy assets
```
.
---

## How to Deploy

### Prerequisites
- Netlify publish path: `public/`
- Build command: `npm run build`

### Deployment Steps

1. **Build V2**:
   ```bash
   npm run build
   ```
   This generates `public/v2-dist/` with all v2 assets.

2. **Commit changes**:
   ```bash
   git add public/v2-dist/
   git commit -m "chore: build v2 for production"
   ```

3. **Deploy via Netlify**:
   - **Option A (Auto)**: Push to main → Netlify auto-deploys
   - **Option B (Manual)**: Netlify CLI:
     ```bash
     netlify deploy --prod --dir=public
     ```

4. **Verify**:
   - Visit: `https://yoursite.com/v2-dist/v2.html`
   - Test: Click parcels, use ward filter
   - Check: Console shows no errors, MapLibre loads

---

## Access URLs

### Production
- **V2 (Beta)**: `https://yoursite.com/v2-dist/v2.html`
- **Legacy**: `https://yoursite.com/` (unchanged)

### Local Dev
- **Dev server**: `npm run dev` → http://localhost:3000/v2.html
- **Preview built**: Serve public/ folder:
  ```bash
  npx serve public
  # Visit http://localhost:3000/v2-dist/v2.html
  ```

---

## Rollback Procedure

If V2 has issues in production:

### Immediate Rollback
1. **Remove v2-dist from Netlify**:
   ```bash
   git rm -r public/v2-dist/
   git commit -m "chore: rollback v2"
   git push origin main
   ```
   - Legacy `/` continues working (unaffected)
   - V2 links return 404 (safe)

2. **Alternative - Hide v2-dist via _redirects**:
   Add to `public/_redirects`:
   ```
   /v2-dist/* /offline.html 503
   ```
   - V2 URLs redirect to maintenance page
   - Faster than removing files

### Partial Rollback (keep v2-dist, disable features)
- Edit `public/v2-dist/v2.html` to show "under maintenance" message
- Redeploy without rebuilding

---

## Configuration Details

### Vite Build Config (`vite.config.js`)
```javascript
build: {
  outDir: path.resolve(__dirname, 'public/v2-dist'),
  base: '/v2-dist/',
  rollupOptions: {
    output: {
      manualChunks: {
        'maplibre': ['maplibre-gl'],  // 802KB - cached
        'pmtiles': ['pmtiles']         // 19KB - cached
      }
    }
  }
}
```

### Lazy-Loading Strategy
- MapLibre and PMTiles are **dynamically imported** in `MapService.ts`
- Initial bundle size: ~15KB (main app logic)
- Vendor chunks load on-demand when map initializes
- Improves initial page load time by ~800KB

### CSS Handling
- Tailwind: CDN in v2.html (no build step needed)
- Custom styles: Built into `v2-*.css` (69KB)
- MapLibre CSS: Dynamically injected in TS

---

## Build Outputs Explained

| File | Size | Purpose | Cache Strategy |
|------|------|---------|---------------|
| `v2.html` | 0.9KB | Entry point | No cache (always fresh) |
| `v2-*.js` | 15KB | App logic | Cache with hash |
| `v2-*.css` | 69KB | Styles | Cache with hash |
| `maplibre-*.js` | 802KB | Map library | Cache with hash (rarely changes) |
| `pmtiles-*.js` | 19KB | Tile protocol | Cache with hash |
| `version-*.js` | 1KB | Build info | Cache with hash |

**Total download** (first visit): ~900KB  
**Total download** (cached): ~15KB (only app logic changes)

---

## Netlify Configuration

### Current `netlify.toml`
```toml
[build]
  publish = "public"
  command = "npm run build"

[[headers]]
  for = "/v2-dist/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

### Recommended Headers (optional)
Add to `netlify.toml` for better caching:
```toml
[[headers]]
  for = "/v2-dist/v2.html"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"

[[headers]]
  for = "/v2-dist/assets/*.js"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/v2-dist/assets/*.css"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

---

## Troubleshooting

### Issue: v2-dist folder not created
**Solution**:
```bash
rm -rf public/public  # Remove nested public if exists
npm run build
```

### Issue: Asset paths 404 in production
**Check**:
- `vite.config.js` has `base: '/v2-dist/'`
- Built `v2.html` references `/v2-dist/assets/*.js`

### Issue: MapLibre CSS not loading
**Verify**:
- MapService.ts dynamically injects CSS link
- Check browser console for CSP errors

### Issue: Netlify deploy fails
**Common causes**:
- Build command missing: Set to `npm run build` in Netlify UI
- Publish directory wrong: Should be `public` not `public/v2-dist`

### Issue: 500KB+ vendor chunk warning
**Expected behavior**:
- MapLibre is large (802KB minified)
- Lazy-loading mitigates impact
- Consider:
  - Switching to MapLibre CDN (future)
  - Using lighter map library (future)

---

## Monitoring

### Check Deployment Success
1. Visit `/v2-dist/v2.html`
2. Open DevTools → Network tab
3. Verify:
   - v2.html loads
   - v2-*.js loads (~15KB)
   - maplibre-*.js lazy-loads on map init (~800KB)
   - pmtiles-*.js lazy-loads on map init (~19KB)

### Performance Metrics
- Initial load: < 2s (15KB app + Tailwind CDN)
- Map init: +1-2s (lazy-load vendors)
- Total interactive: < 4s

### Analytics
Add to `v2.html` for tracking (optional):
```html
<script>
  if (window.location.search.includes('debug=1')) {
    console.log('[V2] Version 2.0.0');
    console.log('[V2] Build time:', new Date().toISOString());
  }
</script>
```

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-20 | 2.0.0 | Initial v2 deployment |

---

## Future Improvements

1. **CDN for vendors**: Serve MapLibre from CDN instead of bundling
2. **Service Worker**: Cache v2 assets for offline support
3. **Progressive enhancement**: Detect slow connections, delay map init
4. **Bundle size**: Consider MapLibre custom build (remove unused features)
5. **Asset preload**: Add `<link rel="preload">` for critical chunks

---

## Support

- **Legacy issues**: Continue using existing debug process
- **V2 issues**: Check `/v2-dist/v2.html?debug=1` for version info
- **Rollback**: See "Rollback Procedure" above

---

**Last Updated**: 2026-01-20  
**Owner**: @architect
