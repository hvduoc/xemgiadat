# P0 VERIFICATION — Copy/Paste Commands
**Dev server:** http://localhost:3000/v2.html?debug=1  
**Build:** ✅ PASS (artifacts OK, no errors)

---

## ✅ P0.1: TAP TARGET SIZE (360×740)

### Steps:
1. **DevTools**: F12 → Toggle device toolbar (Ctrl+Shift+M)
2. **Device**: Responsive → 360×740
3. **Open modal**: Click parcel (blue area) → Click "Đăng tin" button
4. **Measure CTAs**:
   - Right-click "Hủy" button → Inspect
   - DevTools Computed tab → Note width/height
   - Right-click "Đăng tin" button → Inspect  
   - DevTools Computed tab → Note width/height

### Expected Result:
- **Width**: ≥ 44px (both buttons)
- **Height**: ≥ 44px (both buttons)
- **Code fix applied**: `min-h-[44px] min-w-[44px]` added to both footer CTAs

### Evidence Required:
- Screenshot of Computed tab showing W/H for "Hủy" button
- Screenshot of Computed tab showing W/H for "Đăng tin" button

---

## ✅ P0.2: KEYBOARD JANK (visualViewport)

### Steps:
1. **DevTools**: F12 → Performance tab
2. **Device**: 412×915 or 360×740
3. **Record**:
   - Click Record (red circle)
   - Open modal → Tap input field (keyboard opens)
   - Wait 1 second
   - Stop recording
4. **Analyze**:
   - Look for red bars (Long Tasks > 50ms)
   - Count visualViewport resize events
   - Check frame rate drops (timeline graph)

### Expected Result:
- **Long tasks**: < 50ms (or minimal count)
- **visualViewport events**: Batched via rAF (not spamming every frame)
- **Frame rate**: Stable ~60fps during keyboard animation
- **Code fix applied**: rAF debounce wrapper added to resize handler

### Evidence Required:
- Performance trace exported as JSON
- Screenshot of timeline showing longest task duration
- Note: Any tasks >50ms? (Yes/No + count)

---

## ✅ P0.3: PROD FALLBACK GUARD

### Steps:
1. **Build prod**: `npm run build` (already done ✅)
2. **Preview**: 
   ```powershell
   npm run preview
   # Opens at http://localhost:4173
   ```
3. **Open URL**: http://localhost:4173/v2-dist/v2.html?debug=1
4. **Block basemap**:
   - DevTools → Network tab
   - Right-click any `demotiles.maplibre.org` request
   - "Block request domain"
5. **Reload page**
6. **Check console**:
   - Look for: `[VERIFY] fallbackAllowed=false reason=prod-no-flag`
   - Map should show error (NOT switch to OSM raster)

### Expected Result:
- **Console log**: `[VERIFY] fallbackAllowed=false reason=prod-no-flag`
- **Map behavior**: Does NOT automatically switch to raster tiles
- **Fallback activation**: Only works if you add `?rasterFallback=1` to URL
- **Code fix applied**: Debug log added + guard enforced at call site

### Evidence Required:
- Screenshot of Console showing `[VERIFY] fallbackAllowed=false`
- Confirmation that map does NOT show OSM raster (without flag)

---

## 🔍 QUICK VERIFICATION COMMANDS (DevTools Console)

### After map loads (wait 10 seconds):

```javascript
// TEST: Map baseline
(async () => {
  const style = map.getStyle();
  const hasParcelsFill = map.getLayer('parcels-fill');
  const hasParcelSource = map.getSource('parcels-source');
  console.log('[VERIFY MAP_BASE] style=' + (style.name || 'unknown') 
    + ' source=' + (hasParcelSource ? 'yes' : 'NO') 
    + ' layers=' + (hasParcelsFill ? 'yes' : 'NO'));
})();
```

**Expected**: `[VERIFY MAP_BASE] style=demotiles source=yes layers=yes`

---

### After blocking demotiles (prod build + preview):

```javascript
// TEST: Fallback guard
(async () => {
  const style = map.getStyle();
  const hasOSM = map.getLayer('osm-raster');
  console.log('[VERIFY FALLBACK_GUARD] style=' + (style.name || 'unknown') 
    + ' rasterActive=' + (hasOSM ? 'YES' : 'no'));
})();
```

**Expected (prod, no flag)**: `[VERIFY FALLBACK_GUARD] style=demotiles rasterActive=no`  
**Expected (with ?rasterFallback=1)**: `[VERIFY FALLBACK_GUARD] style=OSM Raster Fallback rasterActive=YES`

---

## 📋 EVIDENCE CHECKLIST

- [ ] **P0.1**: Screenshot of Computed W/H for both CTA buttons (360×740)
- [ ] **P0.2**: Performance trace JSON + note on long tasks
- [ ] **P0.3**: Console screenshot showing `[VERIFY] fallbackAllowed=false`

---

## 🚦 GO/NO-GO DECISION

| Test | Status | Evidence | Verdict |
|------|--------|----------|---------|
| P0.1 Tap targets | ⏳ PENDING | W/H screenshots needed | ⏳ |
| P0.2 Keyboard jank | ⏳ PENDING | Perf trace needed | ⏳ |
| P0.3 Fallback guard | ⏳ PENDING | Console log needed | ⏳ |

**Current build**: ✅ PASS (no errors)  
**Code changes**: ✅ Applied (min-h/min-w + rAF + debug log)  
**Production ready**: ⏳ Awaiting 3 evidence items

---

## 🔗 NEXT STEPS

1. Complete P0.1-P0.3 verification (copy commands above)
2. Collect evidence (screenshots + traces)
3. Report results:
   - If all PASS → Production approved ✅
   - If any FAIL → Report issue → Apply secondary hotfix

**Dev server**: http://localhost:3000/v2.html?debug=1  
**Preview server**: Run `npm run preview` → http://localhost:4173/v2-dist/v2.html?debug=1
