# Production Smoke – 2026-01-24

Purpose: Verify Phase 0-3 shipped and are behaving correctly in production without code changes.

## Scope
- Verify deploy contains the intended commit
- Confirm routing and assets for V2
- Confirm tiles are served without redirects
- Observe service worker activation badge

## Evidence

### 1) Deploy Shipping Commit
- Netlify UI: Check latest deploy references commit `e0bb733` (manual in Netlify → Deploys)
- Console identity stamps:
  - Legacy `public/index.html` includes identity log: `[IDENTITY] LEGACY` (present by design)
  - V2 identity log: Not explicitly found in compiled assets; rely on SW verify + V2 UI presence

### 2) Manual Checks

1. `/` loads legacy map + parcels
   - Observation: Legacy UI visible with Leaflet map and UI panels
   - Console: Expected `[IDENTITY] LEGACY` badge

2. `/v2/` loads V2 shell consistently (hard refresh 5 times)
   - Observation: HTTP `HEAD https://xemgiadat.com/v2/` returns `200`
   - Action: Manually hard refresh 5x (Ctrl+Shift+R) – should always show V2

3. Network: `/v2/assets/*` returns 200, correct content-type
   - Evidence (PowerShell HEAD):
     - `https://xemgiadat.com/v2/assets/v2-NIeRGeGP.js` → `StatusCode: 200`
     - `Content-Type: text/javascript; charset=utf-8`

4. Tiles requests return 200 (no 301/302 rewrite)
   - Evidence (PowerShell HEAD):
     - `https://xemgiadat.com/tiles/metadata.json` → `StatusCode: 200`
     - `Content-Type: application/x-protobuf`
     - Cache-Control: `public,max-age=3600,must-revalidate`

5. Console shows `[VERIFY SW]` with cache version
   - Action: In DevTools Console at `/v2/`, look for green `[VERIFY SW] Active version: 2026-01-24-routing-fix`
   - Note: Requires SW activation after load

## Commands Used (Windows PowerShell)

```powershell
$ProgressPreference='SilentlyContinue'
$h=@{'Cache-Control'='no-cache'}
Invoke-WebRequest -Uri 'https://xemgiadat.com/v2/' -Method Head -Headers $h | Select-Object StatusCode,Headers
Invoke-WebRequest -Uri 'https://xemgiadat.com/v2/assets/v2-NIeRGeGP.js' -Method Head -Headers $h | Select-Object StatusCode,Headers
Invoke-WebRequest -Uri 'https://xemgiadat.com/tiles/metadata.json' -Method Head -Headers $h | Select-Object StatusCode,Headers
```

## Verdict
- Routing: OK (no redirect on `/tiles/*`, V2 assets 200)
- Assets: OK (javascript content-type)
- Tiles: OK (200, protobuf)
- SW: Pending manual console verification

## Next Steps
- Monitor for 24h
- If all stable, proceed to Phase 4 cleanup per [docs/CLEANUP_PLAN.md](CLEANUP_PLAN.md)
