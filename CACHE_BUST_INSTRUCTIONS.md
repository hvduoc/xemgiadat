# 🔄 HOTFIX CACHE BUST - INSTRUCTIONS

**Commit**: `26f7ee0` - Cache bust pushed  
**Status**: ✅ Pushed to GitHub, Netlify auto-deploy triggered  
**Expected Deploy Time**: 2-3 minutes

---

## ⚡ WHAT JUST HAPPENED

1. The hotfixes were already in `script.js` (local file is correct)
2. Netlify was serving a cached version from earlier deploy
3. Updated script.js cache-bust version: `v=20260204_PHASE3` → `v=20260204_HOTFIX_1`
4. Pushed to GitHub to trigger Netlify redeploy
5. Netlify will now rebuild and deploy the latest version

---

## 🔍 HOW TO VERIFY THE FIX

### Option 1: Wait for Netlify Deployment (Recommended)
1. Wait **3-5 minutes** for Netlify to rebuild and deploy
2. Go to https://xemgiadat.netlify.app/
3. **Hard refresh**: `Ctrl+Shift+R` (not just `F5`)
4. Open console: `F12` → Console tab
5. Check for errors (should see none)

### Option 2: Immediate Verification (Manual Cache Clear)

**Chrome/Edge:**
1. Open DevTools: `F12`
2. Right-click refresh button → "Empty cache and hard reload"
3. Wait for page to fully load

**Firefox:**
1. Open DevTools: `F12`
2. Network tab
3. Right-click → Disable cache (or use Ctrl+Shift+R)

**Safari:**
1. Develop menu → Empty Caches
2. Command+Shift+R

---

## ✅ EXPECTED RESULTS AFTER CACHE BUST

### Console Should Show (NO ERRORS):
```
✅ [BOOT] FULL_MODE | v20260201c
✅ [__XGD_bootApp] Bootstrap started at...
✅ [INIT_OK] portfolio-init
✅ [UserBehaviorTracker] Map interactions ready
```

### Console Should NOT Show:
```
❌ ReferenceError: __XGD_guardedInit is not defined
❌ TypeError: window.map.on is not a function
```

---

## 📊 DEPLOYMENT STATUS

**Previous Deploy**:
```
Commit: 908a4fe
Status: ✅ Built, but serving cached old version
```

**Current Deploy**:
```
Commit: 26f7ee0  
Script Version: v=20260204_HOTFIX_1 (was v=20260204_PHASE3)
Status: ⏳ Netlify rebuilding...
Expected: 2-3 minutes
```

---

## 🔧 WHY THIS CACHE BUST IS NEEDED

The browser and CDN cache HTTP requests based on URL. By changing:
- `script.js?v=20260204_PHASE3` → `script.js?v=20260204_HOTFIX_1`

The URL changed, so caches will:
1. See it as a "new" resource
2. Fetch from Netlify servers (not cache)
3. Get the latest version with hotfixes

---

## 📞 IF ERRORS STILL PERSIST

1. **Check Netlify deploy status**:
   - Visit: https://app.netlify.com/sites/xemgiadat/deploys
   - Should show new deploy with commit `26f7ee0`

2. **Force browser cache clear**:
   - Chrome: `Ctrl+Shift+Delete` → Cache → All time → Clear
   - Then hard refresh: `Ctrl+Shift+R`

3. **Report remaining errors**:
   - Screenshot of console errors
   - Include error message
   - Email: hvduoc@xemgiadat.com

---

## 🎯 NEXT MONITORING

After successful deploy:
- ✅ All three errors should be gone
- ✅ Map should load and render
- ✅ Search should work
- ✅ Form should populate
- ✅ No console errors

---

**Status**: 🔄 Deploying...  
**ETA**: 09:30 UTC  
**Last Updated**: 09:26 UTC
