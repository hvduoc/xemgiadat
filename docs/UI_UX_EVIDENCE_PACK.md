# UI/UX EVIDENCE PACK — Test Procedures & Templates
**Manual Verification Harness | Copy/Paste Ready**

---

## OVERVIEW

This document provides step-by-step procedures for 5 mandatory tests. Each test has:
- **Objective**: What to verify
- **Steps**: Copy/paste commands or DevTools navigation
- **Expected Result**: What PASS looks like
- **Collection Template**: Fields to fill in for report

---

## TEST A: MAP_BASE (Baseline + Parcels Visible)

**Objective**: Verify map loads with demotiles + parcels render without fallback

**Duration**: 60 minutes (includes multiple reloads)

### Setup
```bash
# Terminal 1: Start dev server
npm run dev
# Waits for: "VITE v5.x.x  ready in X ms"

# Terminal 2: Prepare to collect evidence
# Keep DevTools open throughout
```

### Procedure

**Step 1: Open v2 app in DevTools**
```
1. URL: http://localhost:5173/v2.html?debug=1
2. Open DevTools (F12)
3. Console tab (active)
4. Network tab (keep throttling: "No throttling" / "Fast 3G" for comparison)
```

**Step 2: Verify Map Loads**
```
Console expected output (scroll to find [MapService DEBUG] lines):
  [MapService DEBUG] Starting map initialization...
  [MapService DEBUG] MapLibre GL and PMTiles imported
  [MapService DEBUG] PMTiles protocol registered
  [MapService DEBUG] Using base style URL: https://demotiles.maplibre.org/style.json
  [MapService DEBUG] Map instance created, waiting for style.load...
  [MapService DEBUG] Map styledata event: ...
  [MapService DEBUG] Map style loaded
  [MapService DEBUG] Setting up sources and layers...
  [MapService DEBUG] PMTiles URL: pmtiles://tiles/danang_parcels_final.pmtiles
  [MapService DEBUG] Parcels source added successfully
  [MapService DEBUG] Parcels fill layer added with source-layer: default
```

**Step 3: Network Check**
```
DevTools > Network tab:
1. Filter: "tiles"
2. Look for: "danang_parcels_final.pmtiles" (HEAD request status 200)
   OR: "xray.pmtiles" if fallback used
3. Filter: "demotiles"
4. Look for: "style.json" (status 200)
5. Screenshot entire Network panel
```

**Step 4: Run Debug Verification Command**
```javascript
// Copy into DevTools Console and press Enter
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

**Expected Console Output**:
```
[VERIFY MAP_BASE] style=demotiles source=yes layers=yes/yes/yes rendered=200
```

**Step 5: Visual Inspection**
```
Map canvas should show:
- [ ] Base tiles (gray/blue grid)
- [ ] Parcels overlay (blue-ish polygons)
- [ ] No error messages
- [ ] No black/blank canvas
```

### Collection Template

```markdown
## TEST A: MAP_BASE Results

**Date**: [YYYY-MM-DD]  
**Tester**: [Name]  
**Device**: [Chrome/Firefox/Safari on OS]  
**Viewport**: 1920×1080 desktop

### Evidence

#### Console [VERIFY] Output
```
[Paste complete [VERIFY ...] line here]
```

#### Network Evidence
- demotiles style.json: **[PASS/FAIL]** (status: ___)
- danang_parcels_final.pmtiles: **[PASS/FAIL]** (status: ___)
- Any 404 errors? **[YES/NO]**

#### Visual Check
- Base tiles visible? **[YES/NO]**
- Parcels overlay visible? **[YES/NO]**
- Modal loading issue? **[NONE/DESCRIBE]**

#### Blocker Issues
Any errors preventing map load? 
```
[Paste console errors here if any]
```

**VERDICT**: **[PASS/CONDITIONAL/FAIL]**  
**Notes**: [Any issues for follow-up]
```

---

## TEST B: MAP_FALLBACK (Fallback Safety)

**Objective**: Verify raster fallback doesn't break parcels; only activates when allowed

**Duration**: 45 minutes

### Procedure

**Step 1: Block Basemap in DevTools**
```
1. DevTools > Network tab
2. Request Filtering: Add custom filter
3. Block pattern: "demotiles.maplibre.org"
   - Right-click "demotiles" request → "Block request domain"
4. Close DevTools or keep open for monitoring
```

**Step 2: Open with Fallback Flag (Dev Mode)**
```
URL: http://localhost:5173/v2.html?debug=1&rasterFallback=1
Expected: Fallback allowed because:
  - vite.config.js: base: '/' (dev mode)
  - ?rasterFallback=1 flag set
```

**Step 3: Check Console for Fallback**
```
Expected output (within 5 seconds):
  [MapService DEBUG] Map error detected, applying raster fallback: ...
  [MapService DEBUG] Fallback style applied (OSM raster tiles)

OR

  [MapService DEBUG] Map error (fallback not allowed in PROD): ...
  [If this shows, fallback guard is working correctly]
```

**Step 4: Verify Fallback Doesn't Break Parcels**
```javascript
// Copy into DevTools Console
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

**Step 5: Click Parcel & Open Modal**
```
1. On the fallback map, click a parcel polygon (blue area)
2. Parcel should highlight red
3. Right sidebar shows parcel info
4. "Đăng tin" button opens modal (may take 1-2s to lazy-load)
5. Modal form should appear without errors
```

**Step 6: Unblock & Test Prod Behavior**
```
1. Unblock demotiles.maplibre.org in DevTools
2. Open: http://localhost:5173/v2-dist/v2.html (built prod version)
3. Note: This uses vite.config.js base: '/v2-dist/' in prod
4. Block demotiles again
5. Reload → should NOT fallback (guard should prevent it)

Expected: [MapService DEBUG] Map error (fallback not allowed in PROD): ...
```

### Collection Template

```markdown
## TEST B: MAP_FALLBACK Results

**Date**: [YYYY-MM-DD]  
**Tester**: [Name]  
**Build**: [dev / prod]

### Evidence

#### Fallback Trigger (Dev Mode)
- Blocked demotiles? **[YES/NO]**
- Fallback activated? **[YES/NO]**
- Console [VERIFY] output:
```
[Paste [VERIFY MAP_FALLBACK] line]
```

#### Parcels Visible After Fallback
- Parcels layer still present? **[YES/NO]**
- Parcel click works? **[YES/NO]**
- Modal opens? **[YES/NO]**

#### Prod Mode Guard Check
- URL used: `/v2-dist/v2.html` or fallback allowed flag removed
- Fallback blocked (guard working)? **[YES/NO]**
- Console shows "fallback not allowed"? **[YES/NO]**

**VERDICT**: **[PASS/FAIL]**  
**Notes**: [Describe any layer issues if parcels disappeared]
```

---

## TEST C: MODAL_MOBILE (Tap Targets + Keyboard)

**Objective**: Verify CTA buttons are ≥44×44; keyboard support works; single-scroll

**Duration**: 90 minutes (includes multiple device sizes)

### Setup
```
DevTools: Toggle device toolbar (Ctrl+Shift+M or Cmd+Shift+M)
```

### Procedure A: 412×915 (Pixel 6 / Standard Android)

**Step 1: Set Viewport**
```
1. DevTools > Toggle device toolbar
2. Device: "Pixel 5" or "Responsive" → 412×915
3. URL: http://localhost:5173/v2.html?debug=1
4. Wait for map to load (may take 10s on mobile sim)
```

**Step 2: Click Parcel to Open Modal**
```
1. Click any blue parcel polygon on map
2. Red highlight appears
3. Parcel info shows in sidebar
4. "Đăng tin" button appears in sidebar
5. Click "Đăng tin" button
6. Modal should slide up / appear (lazy-loads ListingForm ~1-2s)
```

**Step 3: Measure CTA Button Size**
```
1. Modal now visible with form
2. Scroll down to see footer buttons ("Hủy" & "Đăng tin")
3. Right-click on "Đăng tin" button → "Inspect"
4. DevTools Elements panel shows button HTML
5. Click "Computed" tab
6. Find "width" and "height" fields
7. Record exact pixel values:
   - Width: ___ px
   - Height: ___ px
8. Screenshot the Computed tab showing W/H
```

**PASS Criteria**: Width ≥ 44px AND Height ≥ 44px

**Step 4: Test Keyboard Support**
```
1. Tap "Tiêu đề" input field
2. On-screen keyboard appears (in emulator it simulates)
3. Virtual keyboard opens
4. Modal should NOT scroll away completely
5. Footer buttons should remain visible/accessible
6. Type some text: "Test Listing"
```

**Step 5: Scroll Through Form**
```
1. In modal, scroll down through form fields
2. Verify:
   - [ ] Page doesn't scroll (only modal body scrolls) — SINGLE-SCROLL
   - [ ] Footer with buttons stays visible as you scroll
   - [ ] No "bouncy" scrolling
   - [ ] Keyboard doesn't cover input field
```

**Step 6: Keyboard Open/Close Performance**
```
1. DevTools > Performance > Record
2. Tap input field (keyboard opens) → wait 2s
3. Close keyboard (click outside or back) → wait 2s
4. Stop recording
5. Check Performance trace:
   - Look for "resize" events in visualViewport
   - Count how many times bar shoots up (indicates reflow)
   - Any red bars (>50ms long task)? Note the count.
6. Screenshot timeline showing worst frame drop
```

**Step 7: Modal Close**
```
1. Click "Hủy" button or ✕ close button
2. Modal should close smoothly
3. Map visible again
4. No console errors
```

### Collection Template for 412×915

```markdown
## TEST C.1: MODAL_MOBILE (412×915 Pixel 6)

**Date**: [YYYY-MM-DD]  
**Tester**: [Name]  

### CTA Button Measurements
- Button ID: #listing-submit
- **Computed Width**: ___ px ✅/❌
- **Computed Height**: ___ px ✅/❌
- Screenshot attached? **[YES/NO]**
- WCAG 44×44 compliant? **[PASS/FAIL]**

### Keyboard Support
- Keyboard appears when input focused? **[YES/NO]**
- Modal doesn't collapse behind keyboard? **[YES/NO]**
- CTA buttons still accessible? **[YES/NO]**

### Single-Scroll Behavior
- Only modal body scrolls (not page)? **[YES/NO]**
- Footer visible after scrolling down? **[YES/NO]**
- Smooth scrolling (no jank)? **[YES/SLIGHT_LAG/JANK]**

### Performance: Keyboard Open/Close
- Long tasks > 50ms detected? **[NONE/FEW/___ COUNT]**
- Frame drops observed? **[NONE/SLIGHT/VISIBLE]**
- Performance trace screenshot? **[YES/NO]**
- visualViewport event spam estimated: ___ events/sec

**VERDICT for 412×915**: **[PASS/CONDITIONAL/FAIL]**
```

### Procedure B: 360×740 (iPhone SE / Small Android)

**Repeat steps 1-7 with:**
```
Device: "iPhone SE" or Responsive → 360×740
```

### Collection Template for 360×740

```markdown
## TEST C.2: MODAL_MOBILE (360×740 iPhone SE)

**⚠️ CRITICAL BLOCKER**: This size is the most constrained

### CTA Button Measurements
- **Computed Width**: ___ px ✅/❌
- **Computed Height**: ___ px ✅/❌
- WCAG 44×44 compliant? **[PASS/FAIL]** 🔴 **IF FAIL, MUST HOTFIX**
- Screenshot: [Attach Computed tab]

### Safe-Area Padding
- Buttons avoid notch/keyboard inset? **[YES/NO]**
- `safe-area-inset-bottom` calculated correctly? **[YES/NO]**
- Footer overlaps keyboard? **[YES/NO]** 🔴 **IF YES, FAIL**

### Form Scrollability
- Can scroll to all fields? **[YES/NO]**
- Can access "Price" field without cutting off? **[YES/NO]**
- Sticky footer blocks field view? **[YES/NO]**

### Performance: Keyboard Animation
- Noticeable frame drop during keyboard open? **[NONE/SLIGHT/SEVERE]**
- Modal height recalculates smoothly? **[YES/LAG/JUMPS]**

**VERDICT for 360×740**: **[PASS/CONDITIONAL/FAIL]** 🔴 **HIGHEST PRIORITY**
```

---

## TEST D: PERF_TRACE (Performance Metrics)

**Objective**: Measure real performance: visualViewport events, long tasks, lazy-load timing

**Duration**: 60 minutes (includes multiple recording sessions)

### Procedure

**Step 1: Record Map Load (Baseline)**
```
1. DevTools > Performance tab
2. Click "Record" (red circle)
3. Wait 3 seconds for map to load
4. Click "Stop"
5. Save recording as "map-load.json" (DevTools > ⋮ menu > Export > JSON)
6. Analyze:
   - Main thread time: ___ ms
   - Scripting time: ___ ms
   - Rendering time: ___ ms
   - Painting time: ___ ms
7. Note any tasks > 50ms (red bars)
```

**Step 2: Record Parcel Click → Modal Open**
```
1. Navigate to: http://localhost:5173/v2.html?debug=1
2. Wait for map to fully load (all tiles rendered)
3. Performance > Record
4. Click a parcel → wait for modal to appear fully
5. Stop recording (should be 2-4 seconds)
6. Save as "modal-open.json"
7. Analyze:
   - Duration from click to modal visible: ___ ms
   - visualViewport resize events: count (⚠️ look for rapid spikes)
   - Longest task in timeline: ___ ms (exceeds 50ms? Mark red)
```

**Step 3: Record Keyboard Open (Mobile) — visualViewport Stress Test**
```
1. Device: 412×915 (Pixel 6 emulator)
2. Open modal (already on screen)
3. DevTools > Performance > Record
4. Tap input field (keyboard opens)
5. **Let animation complete** (usually 300-500ms)
6. Stop recording
7. Analyze:
   - visualViewport "resize" events fired: count ___
   - Frequency: ___ events/sec (typical: 30-60 on fast animation)
   - Reflow events (layout recalculation): ___ count
   - Frame rate drops below 60fps? **[YES/NO]** → Check timeline for dips
   - Longest layout task: ___ ms
```

### Evidence Collection Template

```markdown
## TEST D: PERF_TRACE Results

### Session 1: Map Load Baseline
- **Total time**: ___ ms
- **Scripting**: ___ ms
- **Rendering**: ___ ms
- **Long tasks (>50ms)**: ___ count
- **Top offender**: [Copy stack trace of slowest task]
- Trace file: `map-load.json` [Attach]

### Session 2: Modal Open (Click Parcel)
- **Total time (click to modal visible)**: ___ ms
- **Lazy-load (ListingService + ListingForm) duration**: ___ ms
  - Check for `performance.measure('listing-load')` in DevTools
- **Long tasks (>50ms)**: ___ count
- **Modal render time**: ___ ms
- Trace file: `modal-open.json` [Attach]

### Session 3: Keyboard Open/Close (visualViewport Stress)
- **Device**: 412×915
- **visualViewport events during keyboard animation**: ___ count
- **Duration of animation**: ~500ms
- **Event frequency**: ___ events/sec
- **Frame drops detected**: **[NONE/MINOR/SEVERE]**
  - If severe: List any frames < 30fps: [Count]
- **Longest layout task**: ___ ms ⚠️ **If > 100ms, investigate**
- Trace file: `keyboard-open.json` [Attach]

### Summary Analysis
- Is visualViewport spam a performance issue? **[NO/MAYBE/YES]** 🔴 **If YES, hotfix needed**
- Is lazy-load timeout risk (>3s)? **[NO/MAYBE/YES]**
- Any Firebase service initialization lag? **[Notes]**

**RECOMMENDATION**: 
```
[If visualViewport > 60 events/sec] → Add rAF debounce
[If lazy-load > 2s on Fast 3G] → Add timeout safeguard
[If long tasks > 100ms] → Investigate root cause
```
```

---

## TEST E: LIGHTHOUSE (Mobile Audit)

**Objective**: Accessibility, Performance, and Best Practices scores

**Duration**: 30 minutes (audit runs 2-3 min per test)

### Procedure

**Step 1: Run Lighthouse Audit**
```
1. DevTools > Lighthouse tab (or ⋮ menu > More tools > Lighthouse)
2. Config:
   - Device: **Mobile**
   - Throttling: **Simulated Slow 4G**
   - Clear storage: **Checked**
3. Category selection: **Accessibility** + **Performance** + **Best Practices**
4. Click "Analyze page load"
5. Wait 2-3 minutes
```

**Step 2: Record Scores**
```
Performance: ___ /100
Accessibility: ___ /100
Best Practices: ___ /100
SEO: ___ /100 (optional)
```

**Step 3: Analyze Accessibility Issues**
```
Lighthouse report > Accessibility section
Look for:
- [ ] Color contrast issues (text color vs background)
- [ ] Missing labels on form inputs
- [ ] Form field not labeling properly
- [ ] Missing ARIA attributes
- [ ] Focus order incorrect
- [ ] Buttons/tap targets too small

Record all issues (copy from report):
```
Issue 1: [Description]
Issue 2: [Description]
...
```

**Step 4: Analyze Performance Issues**
```
Lighthouse report > Performance section
Look for:
- Largest Contentful Paint (LCP): ___ ms
- First Contentful Paint (FCP): ___ ms
- Cumulative Layout Shift (CLS): ___
- Time to Interactive (TTI): ___ ms
- First Input Delay (FID): ___ ms

Target benchmarks:
- LCP: < 2500ms ✅
- FCP: < 1800ms ✅
- CLS: < 0.1 ✅
- TTI: < 3500ms ✅
```

### Collection Template

```markdown
## TEST E: LIGHTHOUSE Results

**Date**: [YYYY-MM-DD]  
**Tester**: [Name]  
**Device Preset**: Mobile  
**Throttling**: Simulated Slow 4G

### Scores
- **Performance**: ___ /100 [TARGET: ≥80]
- **Accessibility**: ___ /100 [TARGET: ≥90] 🔴 **Must be ≥80 for WCAG AA**
- **Best Practices**: ___ /100 [TARGET: ≥80]
- **SEO**: ___ /100 [TARGET: ≥90]

### Performance Metrics
- LCP (Largest Contentful Paint): ___ ms [Target: <2500ms]
- FCP (First Contentful Paint): ___ ms [Target: <1800ms]
- CLS (Cumulative Layout Shift): ___ [Target: <0.1]
- TTI (Time to Interactive): ___ ms [Target: <3500ms]
- FID (First Input Delay): ___ ms [Target: <100ms]

### Accessibility Failures (P0 Issues)
```
[Copy from Lighthouse report all items with Impact: Serious]
```

**Example**:
- Buttons and links need a minimum size of 48×48px
- Link text is not descriptive
- Image elements do not have [alt] attributes
- Form field [name] is not labeled
- [aria-label] attribute is not provided

### Performance Opportunities
[List top 3 performance suggestions from Lighthouse]

### Blockers
- Any a11y score < 80? **[YES/NO]** 🔴 **If YES, must fix for prod**
- Any critical performance failures? **[LIST]**

**VERDICT**: **[PASS/FAIL]**  
**Audit JSON report**: [Attach Lighthouse export]
```

---

## SUMMARY: All Tests Evidence Matrix

| Test | Expected | Status | Evidence | Notes |
|------|----------|--------|----------|-------|
| A: MAP_BASE | [VERIFY ...] line + tiles 200 | ✅/❌ | Console + Network | Baseline functionality |
| B: MAP_FALLBACK | Fallback safe, parcels visible | ✅/❌ | Console + visual check | Prod guard verified? |
| C.1: MODAL 412×915 | CTA ≥44×44, keyboard OK | ✅/❌ | Screenshot Computed tab | Standard Android size |
| C.2: MODAL 360×740 | CTA ≥44×44, no overlap | ✅/⚠️/❌ | Screenshot Computed tab | 🔴 **CRITICAL BLOCKER** |
| D: PERF_TRACE | No jank, <60 vvh events/sec | ⏳ | Performance trace JSON | Decision: rAF debounce? |
| E: LIGHTHOUSE | A11y ≥80, Perf ≥80 | ✅/⚠️/❌ | Lighthouse JSON | Accessibility compliance |

---

## INSTRUCTIONS FOR COMMANDER

1. **Complete all 5 tests** in order (A → E)
2. **Fill in templates** with exact measurements (pixels, event counts, etc.)
3. **Attach evidence**:
   - Screenshots of Computed tabs (tap target size)
   - Performance trace JSONs
   - Lighthouse audit JSON
   - Console [VERIFY] lines (copy exact text)
4. **Mark PASS/FAIL/CONDITIONAL** for each
5. **Submit results** to Agent with evidence files

Once all results collected:
- ✅ If all **PASS**: Proceed to Phase 2 (P1/P2 items)
- ⚠️ If **CONDITIONAL** (minor issues): Discuss mitigations
- 🔴 If any **FAIL**: Agent proposes targeted hotfix (minimal code change)

---

**End of Evidence Pack**
