# V2 DEPLOYMENT CHECKLIST - Phase 6 Complete ✅

## Pre-Deployment Verification (COMPLETED)

### ✅ Configuration Files
- [x] vite.config.js updated with:
  - [x] Conditional base path (dev='/', prod='/v2/')
  - [x] outDir set to public/v2/
  - [x] rollupOptions.input limited to v2 only
  - [x] publicDir set to false
- [x] netlify.toml updated with:
  - [x] publish = "public" (correct root)
  - [x] V2 route redirects BEFORE catch-all
  - [x] `/v2/*` → `/v2/:splat` protection
  - [x] LEGACY catch-all preserved

### ✅ Build Artifacts
- [x] public/v2/index.html exists (867 bytes)
- [x] public/v2/assets/v2-NIeRGeGP.js exists (28.4 KB)
- [x] public/v2/assets/maplibre-mgRGZcVX.js exists (802.3 KB)
- [x] public/v2/assets/pmtiles-Ct03lRXS.js exists (19.3 KB)
- [x] public/v2/assets/v2-core-styles-cK6RNT_b.css exists (3.0 KB)
- [x] All source maps present (*.map files)
- [x] public/index.html unchanged (108.3 KB)

### ✅ Asset Path Verification
- [x] V2 assets use `/v2/assets/...` paths
- [x] LEGACY assets use `/...` paths (root level)
- [x] No asset path collisions
- [x] No 404 errors in build output

### ✅ Local Testing (Verified)
- [x] http://localhost:3000/ loads LEGACY app
  - [x] Console badge: [IDENTITY] LEGACY (red)
  - [x] Page fully functional
  - [x] All assets load (no 404s)
- [x] http://localhost:3000/v2/ loads V2 app
  - [x] Console badge: [V2 APP BOOTED] (green)
  - [x] Map displays correctly
  - [x] Parcels render
  - [x] All V2 assets load (no 404s)
- [x] Route isolation confirmed
  - [x] V2 routes don't interfere with LEGACY
  - [x] LEGACY catch-all doesn't catch /v2/*

### ✅ Build Quality
- [x] npm run build completes without errors
- [x] No critical warnings
- [x] Build time acceptable (7.6s)
- [x] Code minified and optimized
- [x] Source maps generated for debugging

### ✅ Identity Verification
- [x] LEGACY badge in public/index.html (line 482)
- [x] V2 badge in src2/index.ts (line 39)
- [x] Both badges appear in console when loaded
- [x] Console logs clear and descriptive

### ✅ Documentation
- [x] DEPLOYMENT_V2_SUBDIRECTORY.md created
- [x] Architecture clearly documented
- [x] Configuration changes explained
- [x] Troubleshooting guide included
- [x] Test results documented

---

## Ready for Deployment ✅

### Current State
| Component | Status |
|-----------|--------|
| vite.config.js | ✅ Updated |
| netlify.toml | ✅ Updated |
| public/v2/ | ✅ Built |
| public/index.html | ✅ Preserved |
| Local testing | ✅ Passed |
| Build errors | ✅ None |
| Asset paths | ✅ Correct |
| Identity badges | ✅ Present |
| Documentation | ✅ Complete |

### Deployment Steps (When Ready)
```bash
# 1. Push code changes
git add vite.config.js netlify.toml DEPLOYMENT_V2_SUBDIRECTORY.md
git commit -m "Phase 6: Deploy V2 to /v2/ subdirectory"
git push origin main

# 2. Netlify automatically:
#    - Detects changes
#    - Runs: npm run build
#    - Publishes: public/ directory
#    - Applies redirects from netlify.toml

# 3. Verify URLs on production
#    - https://xemgiadat.com/ → LEGACY
#    - https://xemgiadat.com/v2/ → V2
```

### Post-Deployment Tests
```bash
# Test LEGACY
curl -s https://xemgiadat.com/ | grep -q "LEGACY" && echo "✓ LEGACY OK"

# Test V2
curl -s https://xemgiadat.com/v2/ | grep -q "V2 APP" && echo "✓ V2 OK"

# Test redirect
curl -s -L https://xemgiadat.com/v2.html | grep -q "v2-NIeRGeGP" && echo "✓ Redirect OK"

# Test performance
lighthouse https://xemgiadat.com/v2/ --headless
```

---

## Summary

**Phase 6 Mission**: Deploy V2 to `/v2/` subdirectory ✅ **COMPLETE**

**Key Results**:
- ✅ V2 builds to public/v2/ with base=/v2/
- ✅ LEGACY remains at / untouched
- ✅ netlify.toml redirects protect /v2/* routes
- ✅ Asset paths correct for both apps
- ✅ No 404 errors or conflicts
- ✅ Local testing passes all routes
- ✅ Ready for production deployment

**Next Action**: Push to repository to trigger Netlify deployment

---

**Status**: 🟢 **READY FOR PRODUCTION**
**Verified**: January 23, 2026
**Phase**: 6/6 Complete
