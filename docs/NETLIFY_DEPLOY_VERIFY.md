# Netlify Deploy Verification Checklist

Use after `npm run build` → deploy `dist/` to Netlify (publish dir: `dist`).

## Tests (10 minutes)
1) **Legacy modal CTA (desktop)**
   - Open `/`
   - Click "Đăng tin" → modal opens
   - Scroll long form → CTA buttons remain visible

2) **Legacy CTA size (mobile 360×740)**
   - Device emulation 360×740 or iPhone 12 Pro
   - Open `/` → open modal
   - Inspect submit/cancel buttons → width/height ≥ 44px

3) **V2 basemap + parcels**
   - Open `/v2.html`
   - Verify basemap visible (OSM/demo) and parcels overlay
   - Console should show `[VERIFY MAP] ... styleLoaded=yes tilesLoaded=yes ...`

4) **V2 "Đăng tin" bridge**
   - On `/v2.html` click "📢 Đăng tin (Chế độ đầy đủ)"
   - Should navigate to `/?mode=post` (legacy full app)

5) **Network 404 check**
   - Open DevTools → Network
   - Reload `/` and `/v2.html`
   - Confirm no 404 for `assets/*`, `/v2.html`, `/tiles/*.pmtiles`

6) **Console errors**
   - Check console on `/` and `/v2.html`
   - No fatal errors (Service Worker warnings acceptable but note them)

## GO / NO-GO
- ✅ **GO** if tests 1–5 pass
- 🟡 **Conditional** if only analytics/sw/icon warnings
- 🔴 **NO-GO** if any asset/tiles/route 404 or modal CTA still blocked

## Notes
- Tailwind CDN warning on V2 is expected (P1 to inline build later)
- sw.js syntax errors are non-blocking for core app; log if seen
