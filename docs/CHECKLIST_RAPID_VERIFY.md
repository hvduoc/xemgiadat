# 🚀 RAPID VERIFY CHECKLIST — Phase 1.5
**Estimated Time**: 15 minutes total (3 tests × ~5 min each)  
**Target**: Confirm V2 map + modal work before Phase 2  
**Output**: Copy-paste one [VERIFY] console line per map test + screenshots

---

## TEST 1: MAP_BASE (5 min) — Normal Load

### Steps
1. **Start dev server**: `npm run dev` → wait for "Local: http://localhost:5173/v2.html"
2. **Open URL**: `http://localhost:5173/v2.html?debug=1` (DEV) or `/v2.html?debug=1` (PROD)
3. **Wait**: 2-3 seconds for map to render
4. **DevTools → Console**: Look for line starting with `[VERIFY]`

### Expected [VERIFY] Format (Copy This)
```
[VERIFY] style=demo source=yes layers=yes/yes/yes rendered=200
```
Where:
- `style=demo` = normal demotiles basemap
- `source=yes` = PMTiles parcels source loaded
- `layers=yes/yes/yes` = fill/outline/highlight layers present
- `rendered=200` = ~100-300 parcels visible in viewport

### Expected UI
- ✅ Map is **colored** (not blank or gray)
- ✅ **Parcels visible** as blue/indigo overlay
- ✅ **No errors** in console (no red X marks)
- ✅ **No duplicate layer errors** ("Layer already exists")

### Pass Criteria
- [ ] Console shows [VERIFY] line
- [ ] All values show `yes` for layers
- [ ] `rendered > 0`
- [ ] Map is colored, parcels visible
- [ ] No red errors in console

### Paste [VERIFY] Line Here
```
[REPLACE THIS WITH CONSOLE OUTPUT]
```

### If FAIL
- Blank map? → Check Network tab for 404s on `.json` or `.pmtiles`
- No [VERIFY] line? → Map may have crashed; check console for errors
- `rendered=0`? → Zoom out/in; if still 0, check PMTiles file at `/public/tiles/danang_parcels_final.pmtiles`  
❌ Screenshot console error  
❌ Report to commander

---

## TEST 2: MAP_FALLBACK (5 min)

### Steps
1. **Open URL**:
   ```
   http://localhost:3000/v2.html?debug=1&rasterFallback=1
   ```
---

## TEST 2: MAP_FALLBACK (5 min) — Simulate CDN Outage

### Steps
1. **Open DevTools** (F12) → **Network tab**
2. **Add filter**: Type `demotiles` in the filter field (to show only demotiles requests)
3. **Reload page**: Hit Ctrl+R
4. **Right-click first demotiles request** → Select **"Block request domain"** (or check "Throttle")
5. **Reload again**: Ctrl+R
6. **Watch**: Network tab should show demotiles requests blocked (red cross)
7. **Console**: Wait ~3 seconds, look for [VERIFY] line with `style=rasterFallback`

### Expected [VERIFY] Format
```
[VERIFY] style=rasterFallback source=yes layers=yes/yes/yes rendered=180
```
Where:
- `style=rasterFallback` = fallback to OSM raster tiles
- `source=yes` = parcels still loaded
- `layers=yes/yes/yes` = all 3 parcel layers intact (CRITICAL: no duplicates)
- `rendered=180` = parcels rendering on fallback

### Expected UI
- ✅ Map eventually shows **OSM raster** (lighter, simpler than demo style)
- ✅ **Parcels still visible** as overlay (blue/indigo)
- ✅ **No flickering** between blank and colored
- ✅ **NO errors** "Layer already exists" in red

### Pass Criteria
- [ ] Console shows [VERIFY] line with `style=rasterFallback`
- [ ] All `yes` in layers field (NO duplicate layer errors)
- [ ] `rendered > 0` (parcels still rendering)
- [ ] Map displays OSM + parcels
- [ ] No red errors in console (CRITICAL)

### Paste [VERIFY] Line Here
```
[REPLACE THIS WITH CONSOLE OUTPUT]
```

### If FAIL
- Duplicate layer errors? → Idempotency check broken; need hotfix in MapService.ts L120-150
- Parcels missing? → setupSources() not re-called on fallback
- Map still blank? → Fallback raster URL broken; check config/mapStyles.ts

---

## TEST 3: MODAL_MOBILE (5 min) — CTA Visibility on Mobile

### Setup
1. **Open DevTools** (F12)
2. **Toggle Device Mode**: Ctrl+Shift+M
3. **Select Device**: Pixel 7 Pro (412×915) or custom 360×740

### Steps — Pixel 7 (412×915)
1. **Navigate to**: `/v2.html` (or dev URL)
2. **Wait** for map to load
3. **Click any parcel** (teal/blue area on map)
4. **Panel opens** on right → Click **"Đăng tin"** button
5. **Modal opens** with form
6. **Scroll down** in modal (single scroll)
7. **Check**: CTA button "Tạo tin" visible at **bottom** ✅
8. **Focus a text field** (e.g., Tiêu đề, Mô tả)
9. **Simulate keyboard**: Type something (browser will shrink viewport)
10. **Check**: CTA button STILL visible + clickable ✅

### Steps — Small Android (360×740)
1. **Custom device**: Set 360×740
2. **Repeat all steps above**
3. **Same checks apply**

### Pass Criteria (BOTH DEVICES)
- [ ] Modal opens without console errors
- [ ] CTA visible at bottom after scroll
- [ ] CTA still visible with keyboard open
- [ ] Only modal scrolls (no double-scroll)
- [ ] Input focus auto-scrolls into view
- [ ] No red errors in console

### Paste Screenshots Here
```
[Device 412×915]: [ATTACH SCREENSHOT]
[Device 412×915 + keyboard]: [ATTACH SCREENSHOT]
[Device 360×740]: [ATTACH SCREENSHOT]
```

### If FAIL
- CTA cut off? → CSS fix: Adjust `max-height` or `padding-bottom` in ListingForm.ts
- Double scroll? → Body scroll lock not working; check L142-153 in ListingForm.ts
- Keyboard doesn't scroll? → visualViewport listener failed; check L87-96
   - Should be none

---

## 📋 RESULTS TEMPLATE (Copy & Fill)

```
=== PHASE 1.5 MANUAL VERIFICATION RESULTS ===

TEST 1: MAP_BASE
Status: [ PASS / FAIL ]
[VERIFY] Line: [PASTE HERE]
Issues: [NONE / LIST]

TEST 2: MAP_FALLBACK
Status: [ PASS / FAIL ]
[VERIFY] Line: [PASTE HERE]
Issues: [NONE / LIST]

TEST 3: MODAL_MOBILE
Status: [ PASS / FAIL ]
Screenshots: [FILE1, FILE2, FILE3]
Issues: [NONE / LIST]

OVERALL: [ ✅ ALL PASS / ⚠️ NEEDS HOTFIX ]
Next Step: [ Proceed Phase 2 / Apply hotfix on {TEST_NAME} ]
```

---

## 🔧 Known Quirks & Debug Tips

**visualViewport Not Available**
- Some browsers don't support `visualViewport`
- Fallback to `100dvh` works (CTA still visible, just not optimized)

**OSM Fallback Attribution**
- Shows "© OpenStreetMap contributors" — this is correct

**First Load Slow**
- Modal lazy-loads 463KB Firebase (~500ms on 4G)
- Subsequent opens are instant

**Badge Auto-Hides**
- "Basemap" badge disappears after 5 seconds (by design)

**Force Hard Refresh**
- Windows/Linux: Ctrl+Shift+R
- Mac: Cmd+Shift+R
- Or DevTools → Network tab → check "Disable cache"

---

## 🚨 If Test FAILS

| Issue | Fix File | Action |
|-------|----------|--------|
| CTA cut off | `src2/components/ListingForm.ts` L23 | Increase `max-h` or `padding-bottom` |
| No [VERIFY] line | `src2/services/MapService.ts` L319 | Check map initialized; reload page |
| Duplicate layer errors | `src2/services/MapService.ts` L120-150 | Verify `getLayer()` before `addLayer()` |
| Parcels missing after fallback | `src2/services/MapService.ts` L76 | Ensure `setupSources()` called on style.load |
| Double scroll | `src2/components/ListingForm.ts` L142 | Verify `body.overflow = 'hidden'` on open |

---

## ✅ Timeline

- **Test 1**: 5 min (normal map)
- **Test 2**: 5 min (fallback)
- **Test 3**: 5 min (mobile modal)
- **Total**: 15 min ⏱️

---

**Ready?** Run TEST 1 now! 🚀
