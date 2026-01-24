# QUICK START: Audit Evidence Collection (Commander Checklist)

**Goal**: Complete all 5 tests + collect evidence → Send to Agent  
**Time**: ~4 hours total  
**Output**: Screenshots + console logs + performance traces  

---

## ⏱️ TIME BREAKDOWN

| Test | Duration | Setup | Evidence | Difficulty |
|------|----------|-------|----------|------------|
| A: MAP_BASE | 60 min | npm run dev | Console [VERIFY] + Network | 🟢 EASY |
| B: MAP_FALLBACK | 45 min | Chrome DevTools block | Console + visual check | 🟢 EASY |
| C: MODAL_MOBILE | 90 min | DevTools device mode (2 sizes) | Screenshots (Computed tab) | 🟡 MEDIUM |
| D: PERF_TRACE | 60 min | Performance tab record | JSON trace files + analysis | 🟡 MEDIUM |
| E: LIGHTHOUSE | 30 min | Lighthouse tab + wait 3 min | JSON audit report | 🟢 EASY |
| **TOTAL** | **~4 hours** | — | **6 files/artifacts** | — |

---

## 🚀 START HERE

### Step 1: Read the Audit Documents (30 min)
1. Open [docs/UI_UX_AUDIT_V2_NO_BS.md](../../docs/UI_UX_AUDIT_V2_NO_BS.md) — Understand what's being tested
2. Read "FINDINGS" section — Understand P0 blockers
3. Skim [docs/UI_UX_EVIDENCE_PACK.md](../../docs/UI_UX_EVIDENCE_PACK.md) — See test procedures

### Step 2: Set Up Environment (10 min)
```bash
# Terminal 1: Start dev server
cd d:\DUAN1\Firebase\xemgiadat
npm run dev
# Wait for: "VITE v5.x.x  ready in X ms"

# Terminal 2: Keep ready for screenshots/logs
# Keep browser + DevTools visible
```

### Step 3: Run Tests in Order (A → B → C → D → E)

---

## TEST A: MAP_BASE (60 min)

**What**: Verify map loads + parcels visible (no fallback)

**Commands** (copy into DevTools Console):
```javascript
// Run after map loads (wait 10s)
(async () => {
  const style = map.getStyle();
  const hasParcelsFill = map.getLayer('parcels-fill');
  const hasParcelSource = map.getSource('parcels-source');
  const mapRendered = map.getTileCover && map.getTileCover([108.2, 16.05, 13]);
  console.log('[VERIFY MAP_BASE] style=' + (style.name || 'unknown') 
    + ' source=' + (hasParcelSource ? 'yes' : 'NO') 
    + ' layers=' + (hasParcelsFill ? 'yes' : 'NO') + '/' + (map.getLayer('parcels-outline') ? 'yes' : 'NO') + '/' + (map.getLayer('parcels-highlight') ? 'yes' : 'NO')
    + ' rendered=' + (mapRendered && mapRendered.length > 0 ? mapRendered.length : 'unknown'));
})();
```

**Expected Output** (copy into form below):
```
[VERIFY MAP_BASE] style=demotiles source=yes layers=yes/yes/yes rendered=200
```

**Checklist**:
- [ ] URL: http://localhost:5173/v2.html?debug=1
- [ ] Map visible (gray/blue tiles + blue parcels)
- [ ] No black canvas or errors
- [ ] Console [VERIFY] line output matches expected format
- [ ] **Screenshot**: Full Console tab with [VERIFY] line visible

**Form to Fill**:
```
TEST A RESULTS:
Date: [TODAY]
Console [VERIFY] output: [PASTE HERE]
Map visible? [YES/NO]
Errors? [NONE/LIST]
Evidence image: [ATTACH SCREENSHOT]
```

---

## TEST B: MAP_FALLBACK (45 min)

**What**: Verify fallback doesn't break parcels; guard blocks in prod

**Steps**:
1. Open DevTools → Network tab
2. Right-click "demotiles" → "Block request domain"
3. Navigate: http://localhost:5173/v2.html?debug=1&rasterFallback=1
4. Check console for fallback activation message

**Command** (copy into Console):
```javascript
(async () => {
  const style = map.getStyle();
  const hasParcelsFill = map.getLayer('parcels-fill');
  const hasOSM = map.getLayer('osm-raster');
  console.log('[VERIFY MAP_FALLBACK] style=' + (style.name || 'unknown') 
    + ' fallback_active=' + (hasOSM ? 'yes' : 'NO')
    + ' parcels_still_there=' + (hasParcelsFill ? 'YES' : 'no'));
})();
```

**Expected Output**:
```
[VERIFY MAP_FALLBACK] style=OSM Raster Fallback fallback_active=yes parcels_still_there=YES
```

**Checklist**:
- [ ] Fallback activates (map shows OSM raster tiles)
- [ ] Parcels layer still visible on top
- [ ] Click parcel → highlight red + opens modal
- [ ] Console [VERIFY] line shows fallback active + parcels present
- [ ] **Screenshot**: Fallback map with red parcel highlight

**Form to Fill**:
```
TEST B RESULTS:
Fallback activated? [YES/NO]
Parcels visible after fallback? [YES/NO]
Parcel click works? [YES/NO]
Console [VERIFY] output: [PASTE HERE]
Evidence image: [ATTACH]
```

---

## TEST C: MODAL_MOBILE (90 min) 🔴 **CRITICAL**

**What**: Measure CTA button size (must be ≥44×44); test keyboard support

### C.1: 412×915 (Android Standard)

**Setup**:
1. DevTools → Toggle device toolbar (Ctrl+Shift+M)
2. Device: "Pixel 5" or Responsive → 412×915
3. Navigate: http://localhost:5173/v2.html?debug=1

**Test**:
1. Click parcel (blue area)
2. Click "Đăng tin" button in sidebar
3. Modal appears (wait for lazy-load, ~1-2s)
4. Right-click "Đăng tin" button (footer) → Inspect
5. Click "Computed" tab in DevTools
6. **Record width and height** (exact pixels)
7. Type in "Tiêu đề" field → keyboard opens
8. Verify: Page doesn't scroll up, footer visible
9. Close modal

**Measurements to Capture**:
- [ ] Screenshot of Computed tab showing width/height
- [ ] Is width ≥ 44px? **[YES/NO]**
- [ ] Is height ≥ 44px? **[YES/NO]**
- [ ] Keyboard blocks CTA buttons? **[YES/NO]**
- [ ] Single-scroll working? **[YES/NO]**

**Form to Fill**:
```
TEST C.1 (412×915):
Width measured: ___ px ✅/❌
Height measured: ___ px ✅/❌
Keyboard support OK? [YES/NO]
Screenshot: [ATTACH Computed tab]
```

### C.2: 360×740 (iPhone SE) 🔴 **HIGHEST PRIORITY**

**Repeat all steps from C.1 with:**
- Device: "iPhone SE" or Responsive → 360×740

**CRITICAL MEASUREMENTS**:
- [ ] Is width ≥ 44px? **[YES/NO]** ← **IF NO = FAIL = HOTFIX NEEDED**
- [ ] Is height ≥ 44px? **[YES/NO]** ← **IF NO = FAIL = HOTFIX NEEDED**
- [ ] Can access CTA when keyboard open? **[YES/NO]**
- [ ] Does form scroll smoothly? **[YES/NO]**

**Form to Fill**:
```
TEST C.2 (360×740) 🔴 CRITICAL:
Width measured: ___ px ✅/❌
Height measured: ___ px ✅/❌
Keyboard blocks buttons? [YES/NO]
Safe-area padding correct? [YES/NO]
Screenshot: [ATTACH Computed tab]
VERDICT: [PASS/FAIL]
```

---

## TEST D: PERF_TRACE (60 min) 🔴 **IMPORTANT**

**What**: Check for jank during keyboard animation; measure visualViewport events

**Setup**:
1. DevTools > Performance tab
2. Device: 412×915 (Pixel 6)
3. URL: http://localhost:5173/v2.html?debug=1

**Recording Session**:
1. Open modal
2. Click "Record" (red circle in Performance tab)
3. Tap input field (keyboard opens)
4. **Watch animation for ~1 second**
5. Close keyboard
6. Click "Stop"
7. Analyze trace:
   - Look for red bars (>50ms tasks)
   - Count visualViewport "resize" events
   - Any frame drops?

**What to Look For**:
- Frame rate dips below 60fps? (Watch timeline for drops)
- visualViewport event spam? (Scroll through events, count resize events)
- Longest task duration? (Longest red bar = longest task)

**Export Trace**:
1. DevTools ⋮ menu > Export → Save as "keyboard-test.json"
2. **Keep this file** to send to Agent

**Form to Fill**:
```
TEST D RESULTS:
Device: 412×915
visualViewport events during keyboard: ~___ events in 1 sec
Long tasks > 50ms detected? [YES/NO]
Worst frame drop observed? [Rate: 60fps/30fps/unknown]
Trace file attached? [YES filename: ___]

Analysis:
Should rAF debounce be applied? [YES/NO/MAYBE]
```

---

## TEST E: LIGHTHOUSE (30 min)

**What**: Accessibility + Performance scores

**Run Audit**:
1. DevTools > Lighthouse tab (or ⋮ > More tools > Lighthouse)
2. Device: **Mobile**
3. Throttling: **Simulated Slow 4G**
4. Categories: Accessibility + Performance + Best Practices
5. Click "Analyze page load"
6. Wait 2-3 minutes ☕

**Record Scores**:
- Performance: ___ /100
- Accessibility: ___ /100
- Best Practices: ___ /100

**Export Report**:
1. Lighthouse report > ⋮ menu > Export as JSON
2. Save as "lighthouse-audit.json"

**Check for A11y Failures**:
- Any issues marked "Serious"? List them.
- Color contrast OK? (Indigo-600 text on white should be fine)
- Form labels present? (Should be)

**Form to Fill**:
```
TEST E RESULTS:
Performance: ___ /100 (target: ≥80)
Accessibility: ___ /100 (target: ≥90)
Best Practices: ___ /100 (target: ≥80)

A11y Serious Issues:
[LIST ANY]

Audit JSON attached? [YES]
```

---

## 📋 FINAL CHECKLIST — Ready to Submit?

Before sending evidence to Agent, verify:

**Test A**:
- [ ] Console [VERIFY MAP_BASE] line captured
- [ ] Network tab screenshot (demotiles + pmtiles 200 status)

**Test B**:
- [ ] Console [VERIFY MAP_FALLBACK] line captured
- [ ] Visual: Fallback map + parcels visible screenshot

**Test C.1**:
- [ ] Computed tab screenshot (412×915, W/H pixels)
- [ ] Form to fill completed

**Test C.2** 🔴:
- [ ] Computed tab screenshot (360×740, W/H pixels) ← **CRITICAL**
- [ ] Form to fill completed
- [ ] **IF <44px = MUST REPORT IMMEDIATELY**

**Test D**:
- [ ] Performance trace JSON file saved ("keyboard-test.json")
- [ ] Long tasks noted (if any)
- [ ] Form analysis filled

**Test E**:
- [ ] Lighthouse audit JSON saved
- [ ] Scores recorded
- [ ] A11y issues listed (if any)

---

## 📤 HOW TO SUBMIT RESULTS

1. **Create folder**: `evidence-results/` in project root
2. **Copy files**:
   - `evidence-results/screenshot-412-computed.png` (C.1)
   - `evidence-results/screenshot-360-computed.png` (C.2) 🔴
   - `evidence-results/keyboard-perf-trace.json` (D)
   - `evidence-results/lighthouse-audit.json` (E)
3. **Fill in this form** (copy into text editor):

```markdown
# UI/UX AUDIT EVIDENCE SUBMISSION

## Tester Info
- Name: [YOUR NAME]
- Date: [DATE]
- Device Used: [Chrome on Windows/Mac]

## TEST A: MAP_BASE
- [ ] PASS
- Console [VERIFY] line: [PASTE EXACT TEXT]
- Screenshot: [Screenshot file path]

## TEST B: MAP_FALLBACK
- [ ] PASS
- Console [VERIFY] line: [PASTE EXACT TEXT]
- Screenshot: [Screenshot file path]

## TEST C.1: MODAL 412×915
- [ ] PASS / [ ] FAIL
- Button Width: ___ px
- Button Height: ___ px
- Screenshot: [Screenshot file path]

## TEST C.2: MODAL 360×740 🔴 CRITICAL
- [ ] PASS / [ ] FAIL
- Button Width: ___ px ✅/❌
- Button Height: ___ px ✅/❌
- Screenshot: [Screenshot file path]
- **BLOCKER**: IF FAIL, report immediately

## TEST D: PERF_TRACE
- [ ] Jank observed? [YES/NO]
- visualViewport events: ~___ /sec
- Long tasks: [NONE/___]
- Trace file: [keyboard-perf-trace.json]

## TEST E: LIGHTHOUSE
- Performance: ___ /100
- Accessibility: ___ /100
- Best Practices: ___ /100
- Audit file: [lighthouse-audit.json]

## OVERALL VERDICT
- [ ] All tests PASS → Ready for Phase 2
- [ ] Some issues found → Needs hotfix
- [ ] Blockers found → Deep investigation needed

## Notes/Issues
[Any observations]
```

4. **Send to Agent**: Copy form + attach evidence files

---

## 🔴 CRITICAL: If TEST C.2 FAILS (Tap Targets <44px)

**DO THIS IMMEDIATELY**:
1. Note exact measurements (W × H pixels)
2. Screenshot the Computed tab
3. Notify Agent with subject: "🔴 BLOCKER: Tap target <44px on 360×740"
4. Include screenshot + measurement

**Agent will respond with hotfix** within 1 day.

---

## 💾 SAVE YOUR WORK

Keep all artifacts:
- Screenshots (right-click → Save image)
- Console logs (right-click Console area → Save as)
- Performance traces (DevTools Export)
- Lighthouse reports (Export JSON)

---

**YOU'RE READY!** Start with TEST A and follow the checklist. 🚀

If stuck, refer back to [docs/UI_UX_EVIDENCE_PACK.md](../../docs/UI_UX_EVIDENCE_PACK.md) for detailed procedures.
