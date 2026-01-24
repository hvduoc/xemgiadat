# 📋 UI/UX OPTIMIZATION PLAN — Phase 2 & Beyond
**Author**: Copilot Agent | **Date**: 2026-01-21 | **Status**: Post-Audit Roadmap

---

## Overview

This document prioritizes UI/UX improvements across **3 phases** based on Phase 1.5 audit findings. Each item includes effort estimate, acceptance criteria, and blocking dependencies.

---

## 🔴 P0 CRITICAL (Must Fix Before Phase 2 Prod)

### P0.1: Tap Target Size Verification & Fix (Mobile)
**Priority**: 🔴 BLOCKER | **Effort**: 5-10 min | **Dependency**: Evidence Collection

**Symptom**: WCAG 2.5.5 requires ≥44×44px tap targets. Buttons on 360×740 may fail.

**Evidence Required**:
- [ ] DevTools inspect button size on 360×740 device viewport
- [ ] Record pixel measurements of `#listing-cancel` + `#listing-cta`

**Fix Options**:

**Option A** (If buttons currently <44px):
```typescript
// ListingForm.ts L45 — Update button CSS
// Before:
class="px-4 py-2 rounded-lg border border-gray-300"

// After: Responsive padding
class="px-3 py-2.5 md:px-4 md:py-2 rounded-lg border border-gray-300"
// 360px: px-3 py-2.5 ≈ 12px + 10px = min 22px height → still might be small
// Better: Force min-height
class="px-3 py-2 md:px-4 md:py-2 rounded-lg border border-gray-300 min-h-[44px] md:min-h-auto flex items-center justify-center"
```

**Option B** (Flexible, use if A insufficient):
```css
/* ListingForm: Add to sticky footer */
button {
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

**Acceptance Criteria**:
- ✅ Button click area ≥44×44px on 360×740
- ✅ Button click area ≥44×44px on 412×915
- ✅ No text overflow inside button
- ✅ No modal layout breakage on narrow viewports

**Files to Modify**:
- `src2/components/ListingForm.ts` (L45 button CSS)

**Estimated Time**: 5 min (if only CSS change)

---

### P0.2: Verify visualViewport Listener Not Causing Jank (Mobile)
**Priority**: 🔴 BLOCKER | **Effort**: 15 min | **Dependency**: Performance trace collection

**Symptom**: When Android keyboard opens, multiple `visualViewport.resize` events may cause CSS recalc jank.

**Evidence Required**:
- [ ] Performance trace: Focus input → keyboard opens → measure frame rate drop
- [ ] Check DevTools Performance: any 50ms+ long tasks?
- [ ] Baseline: Frame rate should stay ≥55fps during keyboard animation

**Fix** (If jank observed):
```typescript
// ListingForm.ts L87-96 — Add requestAnimationFrame debounce
private setupVisualViewport() {
  if (!('visualViewport' in window)) return;
  let rafId: number | null = null;
  this.visualViewportHandler = () => {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      const vvh = (window as any).visualViewport?.height;
      if (vvh) {
        document.documentElement.style.setProperty('--vvh', `${vvh}px`);
      }
    });
  };
  (window as any).visualViewport?.addEventListener('resize', this.visualViewportHandler);
}
```

**Acceptance Criteria**:
- ✅ Frame rate ≥55fps during keyboard open/close
- ✅ No long tasks (>50ms) detected
- ✅ CSS recalcs batched into single requestAnimationFrame

**Files to Modify**:
- `src2/components/ListingForm.ts` (L87-96 listener)

**Estimated Time**: 10 min (code + test)

---

### P0.3: Confirm Fallback + Parcels on Real Network Conditions
**Priority**: 🔴 BLOCKER | **Effort**: 10 min | **Dependency**: Manual test (TEST 2 MAP_FALLBACK)

**Symptom**: If demotiles.maplibre.org blocked → fallback to OSM. Parcels must NOT disappear.

**Evidence Required**:
- [ ] TEST 2: Network tab blocks `demotiles.maplibre.org`
- [ ] Console shows: `[VERIFY] style=rasterFallback source=yes layers=yes/yes/yes rendered=180`
- [ ] NO "Layer already exists" errors
- [ ] Map displays OSM tiles + parcels overlay

**Fix** (If fallback fails):
Already implemented in Phase 1.5. If error occurs:
1. Check `MapService.ts` L76-86 error listener is attached
2. Check `setupSources()` is called in `map.once('style.load')` handler
3. Check idempotency guards (L106-127) are all present

**Acceptance Criteria**:
- ✅ Fallback triggers when demotiles blocked
- ✅ Parcels persist (no duplicate errors)
- ✅ User can interact with map (pan, zoom)

**Files to Check**:
- `src2/services/MapService.ts` (L76-127)
- `src2/config/mapStyles.ts` (fallback URL)

**Estimated Time**: 0 min (already fixed; just verify)

---

## 🟡 P1 HIGH (Phase 2 Polish)

### P1.1: Accessibility Audit (WCAG 2.1 AA Compliance)
**Priority**: 🟡 HIGH | **Effort**: 2-4 hours | **Dependency**: P0 items above

**Scope**:
- Focus management: Tab cycle, focus trap, focus visible
- ARIA labels: aria-required, aria-invalid, aria-live for validation
- Color contrast: Verify 4.5:1 (AA) on modal buttons
- Keyboard: Full keyboard nav + ESC support
- Screen reader: Test with NVDA/JAWS on form

**Acceptance Criteria**:
- ✅ Lighthouse Accessibility score ≥90
- ✅ Manual WCAG 2.1 AA checklist complete
- ✅ No missing ARIA labels on interactive elements
- ✅ Focus visible (`:focus-visible` or custom) on all interactive elements

**Files to Modify**:
- `src2/components/ListingForm.ts` (add aria-required, aria-invalid, aria-live)
- `src2/styles/index.css` (add `:focus-visible` styles)
- `src2/components/ParcelPanel.ts` (ARIA labels)

**Estimated Time**: 3 hours

---

### P1.2: Performance Optimization — visualViewport Debounce
**Priority**: 🟡 HIGH | **Effort**: 30 min | **Dependency**: P0.2 evidence

**Scope**: Implement requestAnimationFrame debounce for visualViewport resize events (already documented in P0.2).

**Acceptance Criteria**:
- ✅ visualViewport events debounced
- ✅ CSS recalcs reduced by 70%
- ✅ Frame rate 55fps+ during keyboard animation
- ✅ No long tasks (>50ms)

**Files to Modify**:
- `src2/components/ListingForm.ts` (L87-96)

**Estimated Time**: 30 min

---

### P1.3: Layer Z-Index Documentation & Explicit Ordering
**Priority**: 🟡 HIGH | **Effort**: 1 hour | **Dependency**: None (future-proofing)

**Scope**: Document layer order, add explicit layer-order metadata, prepare for future controls overlay.

**Current State**:
```typescript
// MapService.ts L183-204
// Layers: osm-raster (if fallback) → parcels-fill → parcels-outline → parcels-highlight → water
// Problem: No explicit z-index or order documentation
```

**Fix**:
```typescript
/**
 * Layer rendering order (bottom to top):
 * 1. basemap (osm-raster or demotiles)
 * 2. parcels-fill (teal overlay)
 * 3. parcels-outline (indigo border)
 * 4. parcels-highlight (selected parcel)
 * 5. future: controls layer (to be added)
 * 
 * MapLibre GL uses layer insertion order, not CSS z-index.
 * Always insert new layers AFTER parcels or specify insertion order.
 */
```

**Acceptance Criteria**:
- ✅ Layer order documented with clear rules
- ✅ Code comments explain MapLibre GL layer model
- ✅ Test: If UI controls added later, they render above parcels (pointer-events work)

**Files to Modify**:
- `src2/services/MapService.ts` (L160-210, add documentation)

**Estimated Time**: 1 hour

---

### P1.4: Error Boundaries for Graceful Degradation
**Priority**: 🟡 HIGH | **Effort**: 2 hours | **Dependency**: None (improves resilience)

**Scope**: Add error boundary components for map + modal, with user-friendly fallback UI.

**Example**:
```typescript
// New: src2/components/ErrorBoundary.ts
class ErrorBoundary {
  catch(error: Error) {
    // If map fails: show message "Map unavailable"
    // If modal fails: show "Listing feature unavailable, try again"
    return this.renderFallbackUI();
  }
}
```

**Acceptance Criteria**:
- ✅ Map errors don't crash app
- ✅ Modal errors don't crash app
- ✅ User sees helpful error message (not blank page)
- ✅ User can retry or navigate away

**Files to Create**:
- `src2/components/ErrorBoundary.ts` (new)

**Files to Modify**:
- `src2/index.ts` (wrap MapService + modal in error boundary)

**Estimated Time**: 2 hours

---

## 🔵 P2 MEDIUM (Phase 2+ Polish & Future)

### P2.1: Skeleton Screens for Lazy-Loaded Modal
**Priority**: 🔵 MEDIUM | **Effort**: 1-2 hours

**Scope**: While ListingService + ListingForm loading (463KB Firebase), show skeleton screen instead of blank modal.

**Example**:
```html
<div id="skeleton-form" class="animate-pulse">
  <div class="h-8 bg-gray-200 rounded w-1/3"></div>
  <div class="h-4 bg-gray-100 rounded mt-4"></div>
  <!-- Repeat for form fields -->
</div>
```

**Acceptance Criteria**:
- ✅ Skeleton appears while modal loads
- ✅ Transitions smoothly to real form
- ✅ No "loading..." text (visual feedback preferred)

---

### P2.2: Analytics Integration (Parcel Clicks, Listings Created)
**Priority**: 🔵 MEDIUM | **Effort**: 2-3 hours

**Scope**: Track user interactions for insights (parcel view count, listing submissions, search queries).

**Events**:
- `parcel_viewed`: User clicks parcel
- `modal_opened`: User clicks "Đăng tin"
- `listing_submitted`: User submits listing form
- `search_executed`: User searches address

**Tools**: Firebase Analytics or custom event logging

**Acceptance Criteria**:
- ✅ All 4 events fire correctly
- ✅ No personally identifiable data logged
- ✅ Events include relevant context (parcel ID, session ID)

---

### P2.3: Offline Support (Service Worker Caching)
**Priority**: 🔵 MEDIUM | **Effort**: 2-4 hours

**Scope**: Cache map tiles + modal form locally, allow minimal offline viewing.

**Implementation**:
- Cache map styles + glyph + sprite URLs
- Cache PMTiles file in service worker
- Show "Offline mode" banner

**Acceptance Criteria**:
- ✅ Map loads offline (cached)
- ✅ Parcels visible offline (if PMTiles cached)
- ✅ Modal form loads offline (HTML pre-rendered)
- ✅ "Offline mode" clearly indicated to user

---

### P2.4: Dark Mode Support
**Priority**: 🔵 MEDIUM | **Effort**: 1-2 hours

**Scope**: Toggle dark theme for modal + controls, respect system preference.

**Implementation**:
- Use `prefers-color-scheme` media query
- Tailwind dark mode classes
- MapLibre GL dark style URL (if available)

**Acceptance Criteria**:
- ✅ Modal appears in dark mode
- ✅ Text contrast ≥4.5:1 in dark mode
- ✅ System preference auto-applied on first load

---

### P2.5: Mobile Bottom Sheet Alternative to Modal
**Priority**: 🔵 MEDIUM | **Effort**: 2-3 hours

**Scope**: On mobile, replace full-screen modal with bottom sheet (slide-up animation) for smaller form footprint.

**UX Benefit**: More screen real estate for map on mobile; form doesn't dominate viewport.

**Implementation**:
- Add `@media (max-width: 640px)` rule
- Apply `position: fixed; bottom: 0; left: 0; right: 0; height: 80vh;`
- Add slide-up animation

**Acceptance Criteria**:
- ✅ Modal transforms to bottom sheet on mobile
- ✅ Can drag to dismiss (swipe down)
- ✅ Map still visible behind translucent bottom sheet
- ✅ Smooth animation

---

### P2.6: Parcel Info Panel Responsive Optimization
**Priority**: 🔵 MEDIUM | **Effort**: 1 hour

**Scope**: ParcelPanel (right sidebar on desktop) should adapt to tablets + mobile.

**Current**: Fixed 384px width on all sizes.

**Improvement**:
- Desktop (>1024px): Fixed right sidebar (current)
- Tablet (768-1024px): 50% width or drawer
- Mobile (<768px): Bottom sheet or drawer

**Acceptance Criteria**:
- ✅ ParcelPanel readable on all breakpoints
- ✅ No horizontal scroll on mobile
- ✅ Touch-friendly interaction

---

## 📊 Priority Matrix

| Item | P0/P1/P2 | Effort | Impact | Blocker? | Recommended |
|------|----------|--------|--------|----------|------------|
| P0.1 Tap Targets | P0 | 5 min | High | YES | Do immediately |
| P0.2 visualViewport | P0 | 15 min | Medium | Maybe | Do if jank observed |
| P0.3 Fallback Verify | P0 | 10 min | High | YES | Do immediately (test) |
| P1.1 Accessibility | P1 | 3-4h | High | No | Do Phase 2 week 1 |
| P1.2 Performance | P1 | 30 min | Medium | No | Do Phase 2 week 1 |
| P1.3 Layer Docs | P1 | 1h | Low | No | Do Phase 2 week 2 |
| P1.4 Error Boundary | P1 | 2h | Medium | No | Do Phase 2 week 2 |
| P2.1 Skeleton | P2 | 1-2h | Low | No | Do Phase 2 week 3+ |
| P2.2 Analytics | P2 | 2-3h | Medium | No | Do Phase 2 week 3+ |
| P2.3 Offline | P2 | 2-4h | Low | No | Do later |
| P2.4 Dark Mode | P2 | 1-2h | Low | No | Do later |
| P2.5 Bottom Sheet | P2 | 2-3h | Low | No | Do later |
| P2.6 Panel Responsive | P2 | 1h | Low | No | Do Phase 2 week 2 |

---

## Phase 2 Timeline (Recommended)

### Week 1: Critical + High
- Day 1: P0.1 (Tap targets) + P0.2 (Performance jank) + P0.3 (Fallback verify)
- Day 2-3: P1.1 (Accessibility audit + fixes)
- Day 4-5: P1.2 (Performance) + P1.3 (Layer docs)

### Week 2: Medium-High
- Day 1-2: P1.4 (Error boundaries)
- Day 3-4: P2.6 (ParcelPanel responsive)
- Day 5: Testing + bug fixes

### Week 3+: Nice-to-Have
- P2.1 (Skeleton screens)
- P2.2 (Analytics)
- P2.3 (Offline support)
- P2.4 (Dark mode)
- P2.5 (Bottom sheet)

---

## Conclusion

**Phase 1.5** delivered solid foundation: modal single-scroll, basemap fallback, lazy-load resilience. **Phase 2** focuses on mobile polish + accessibility + performance refinement. All P0 items must be verified before production launch.

**Next Command**: Commander confirms P0 items via manual tests → Agent implements P1 in Phase 2.

---

**Status**: 🟡 AWAITING P0 VERIFICATION | ⏳ READY FOR PHASE 2 EXECUTION
