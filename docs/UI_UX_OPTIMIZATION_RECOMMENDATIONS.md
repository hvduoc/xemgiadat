# UI/UX OPTIMIZATION RECOMMENDATIONS — Phase 2 Roadmap
**Trade-Off Analysis | Risk Assessment | Implementation Roadmap**

---

## PART 1: CURRENT DESIGN ANALYSIS

### ✅ WHAT'S WORKING WELL (5 Strengths)

#### 1. **Route Isolation (Dev vs Prod)**
- **Design**: vite.config.js conditional base path (`/` vs `/v2-dist/`)
- **Benefit**: V2 runs independently; no interference from legacy `/index.html`
- **Trade-off**: None (enabler only)
- **Evidence**: vite.config.js L7, confirmed no asset path collisions

#### 2. **Single-Scroll Modal Pattern**
- **Design**: Overlay fixed → dialog flex column → body flex-1 min-h-0 overflow-y-auto → sticky footer
- **Benefit**: 
  - CTA buttons always accessible (never scroll away)
  - Modal body scrolls independently (page doesn't bounce)
  - Works on mobile 360×740 without scroll locking lag
- **Trade-off**: Requires CSS `min-h-0` (not obvious in Tailwind)
- **Evidence**: ListingForm.ts L25 (max-height), L45 (sticky footer)

#### 3. **Error-Based Basemap Fallback**
- **Design**: Listen to map error → check guards → swap to OSM raster
- **Benefit**: 
  - No timer overhead (reactive, not proactive)
  - Idempotency checks prevent "Layer already exists" errors
  - User interaction guard prevents flicker
- **Trade-off**: Error must fire first (brief dark screen possible on slow network)
- **Evidence**: MapService.ts L76-86, L106-127

#### 4. **Lazy-Load with Error Recovery**
- **Design**: Try/catch around dynamic import → show loading toast → error alert if timeout
- **Benefit**: 
  - User sees feedback ("Đang tải...")
  - If Firebase fails → user gets actionable error, not silent fail
- **Trade-off**: Loading toast adds 1-2s visible delay before modal appears
- **Evidence**: index.ts L101-133, L180-195

#### 5. **Accessibility Foundations**
- **Design**: Semantic HTML (labels, form elements), aria-live for status, focus trap with Tab management
- **Benefit**: Screen reader users can navigate form; keyboard-only users can close with ESC
- **Trade-off**: ARIA coverage incomplete (missing aria-label on close button)
- **Evidence**: ListingForm.ts L200-215 (trapFocus), L193-195 (ESC handler)

---

### ❌ WHAT NEEDS IMPROVEMENT (5 Weaknesses)

#### 1. **visualViewport Listener — No Debounce**
- **Problem**: Every keyboard animation fires 50-200 visualViewport events → rapid CSS updates
- **User Impact**: Frame drops on Android during keyboard open (feels sluggish)
- **Root Cause**: No throttle/debounce in setupVisualViewport() L256-267
- **Fix Complexity**: 🟢 LOW (5-line rAF wrapper)
- **Risk**: If debounce delay > 16ms, keyboard height adjustment lags slightly

#### 2. **Tap Target Size — Not Verified**
- **Problem**: CTA buttons may be <44×44 on 360×740 due to Tailwind `px-4 py-2`
- **User Impact**: 🔴 WCAG violation; small fingers (kids, elderly) can't reliably tap
- **Root Cause**: No device-level measurement performed
- **Fix Complexity**: 🟢 LOW (add min-h/min-w CSS)
- **Risk**: Layout shift if increased too much

#### 3. **ARIA Coverage Incomplete**
- **Problem**: Close button (✕) only has text, no aria-label; error messages terse
- **User Impact**: Screen reader users hear "button" instead of "close button"; can't understand validation errors
- **Root Cause**: Semantic HTML good, but ARIA polish missing
- **Fix Complexity**: 🟡 MEDIUM (requires attribute additions + error message rewrite)
- **Risk**: None (additive only)

#### 4. **Modal Loading UX — Text-Only Indicator**
- **Problem**: Loading toast shows text "Đang tải..." but no visual feedback (spinner too small)
- **User Impact**: User thinks nothing is happening if they don't see the toast
- **Root Cause**: Spinner SVG is 16×16 (hard to see)
- **Fix Complexity**: 🟡 MEDIUM (CSS animation + larger spinner)
- **Risk**: Animation may jank if combined with visualViewport recalcs

#### 5. **Form Validation — All-or-Nothing Error Display**
- **Problem**: If 2 fields invalid, error message shows only first one; user doesn't see all issues
- **User Impact**: User fixes one field, resubmits, sees different error → frustrating
- **Root Cause**: Error handling in handleSubmit() L113-126 exits on first invalid field
- **Fix Complexity**: 🟡 MEDIUM (collect all errors, display list)
- **Risk**: Error message area may grow large; need space management

---

## PART 2: INFORMATION ARCHITECTURE ASSESSMENT

### Layout Information Hierarchy

```
Current Flow: Parcel Click → Info Sidebar → "Đăng tin" Button → Modal Form
```

**Assessment**:
- ✅ **Logical**: User sees parcel info first (builds context), then creates listing
- ✅ **Discoverable**: "Đăng tin" button clearly visible in sidebar
- ⚠️ **Mobile**: Sidebar takes 50% width on 412×915 → may seem cramped
- ❌ **Error Recovery**: If modal lazy-load fails → user stuck (no retry button)

### Proposed Flow Improvement (Phase 2)

```
Option A (Current):
  Map Click → Sidebar (info) → Modal (create listing)

Option B (Suggested):
  Map Click → Sidebar (info) + "Đăng tin" with pre-fetch → Modal (faster)
  
Option C (Future):
  Map Click → Bottom Sheet (info) → Slide Up (form creation)
  [More mobile-friendly, but requires major refactor]
```

**Recommendation**: Stick with Current (Option A) for Phase 1.5. Phase 2 can explore Option C if mobile adoption warrants.

### Field Ordering Assessment

**Current Form**:
1. Tiêu đề (Title) — Most important
2. Giá (Price) — Critical for search
3. Mô tả (Description) — Optional but valuable
4. Ảnh (Images) — Optional

**Assessment**: ✅ **CORRECT** — Required fields first, optional last. Matches user mental model (price-hunting → details).

### Information Overload Check

**Current Modal**: 4 form fields + submit button + cancel button

**Assessment**: ✅ **OK** — Not overloaded. Typical real estate listing has 10+ fields; we're minimal.

**Future Risk**: If Phase 2 adds (e.g., property type, bedrooms, construction year) → may exceed comfortable mobile input. Recommend Phase 2 split into:
- Step 1: Title + Price (quick)
- Step 2: Details (deferred to web)

---

## PART 3: OPTIMIZATION RECOMMENDATIONS (P0/P1/P2)

### 🔴 P0: CRITICAL (Prod Readiness Blockers)

---

#### **P0.1: Tap Target Size — Verify & Fix**
**Effort**: 5-10 minutes  
**Impact**: 🔴 CRITICAL (WCAG violation if <44×44)

**Current Code** (ListingForm.ts L45):
```html
<button type="button" id="listing-cancel" 
  class="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
  Hủy
</button>
```

**Proposed Fix** (if measurements show <44px):
```html
<button type="button" id="listing-cancel" 
  class="px-4 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 min-h-[44px] min-w-[44px]">
  Hủy
</button>
```

**Rationale**:
- `py-3` (12px) instead of `py-2` (8px) → adds 8px total height
- `min-h-[44px]` + `min-w-[44px]` provides safety guard
- `space-x-3` spacing remains unchanged

**Risk**: Modal footer grows ~4px → may need to reduce form field count or compress padding

**Trade-off**:
| Pro | Con |
|-----|-----|
| WCAG compliant | Layout shift on mobile |
| Easier to tap | Desktop buttons look slightly oversized |
| Reduces mis-taps | May affect page scroll length |

**Decision Point**: Wait for TEST C evidence. If <44px, apply immediately. If ≥44px, no change needed.

---

#### **P0.2: visualViewport Listener — Add rAF Debounce**
**Effort**: 5-15 minutes  
**Impact**: 🔴 CRITICAL (Frame drops during keyboard)

**Current Code** (ListingForm.ts L256-267):
```typescript
private setupVisualViewport() {
  if (!('visualViewport' in window)) return;
  this.visualViewportHandler = () => {
    const vvh = (window as any).visualViewport?.height;
    if (vvh) {
      document.documentElement.style.setProperty('--vvh', `${vvh}px`);
    }
  };
  (window as any).visualViewport?.addEventListener('resize', this.visualViewportHandler);
  this.visualViewportHandler();
}
```

**Proposed Fix** (rAF wrapper — lowest risk):
```typescript
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
  this.visualViewportHandler();
}
```

**Rationale**:
- rAF batches CSS updates to next frame boundary (16ms on 60fps display)
- Prevents rapid reflows on every visualViewport resize event
- No noticeable lag for user (rAF delay < keyboard animation duration)

**Risk**: On very slow devices, rAF delay might cause slight visual lag (acceptable trade-off)

**Alternative** (Debounce, 100ms):
```typescript
this.visualViewportHandler = this.debounce(() => {
  const vvh = (window as any).visualViewport?.height;
  if (vvh) {
    document.documentElement.style.setProperty('--vvh', `${vvh}px`);
  }
}, 100);
```
**Issue**: 100ms debounce may cause visible jump in keyboard height (worse UX than rAF)

**Recommendation**: ✅ Use **rAF wrapper**. Apply if TEST D shows jank.

---

#### **P0.3: Fallback Map Style — Verify Guard in Prod**
**Effort**: 10 minutes (testing only)  
**Impact**: 🔴 CRITICAL (Data availability)

**Verification**:
1. Run TEST B (MAP_FALLBACK) from Evidence Pack
2. Confirm: `/v2-dist/v2.html` without `?rasterFallback=1` does NOT activate fallback
3. Console should show: `[MapService DEBUG] Map error (fallback not allowed in PROD): ...`

**Code Already Correct** (mapStyles.ts L35-38 + MapService.ts L121):
```typescript
if (!isRasterFallbackAllowed()) {
  this.error('Map error (fallback not allowed in PROD):', e);
  return;  // ✅ Guard prevents activation
}
```

**No code change needed.** Just verify in TEST B.

---

### 🟡 P1: HIGH PRIORITY (Phase 2 Week 1)

---

#### **P1.1: ARIA Labels & Accessibility Polish**
**Effort**: 2-3 hours  
**Impact**: 🟡 HIGH (WCAG compliance)

**Changes**:

1. **Add aria-label to close button** (2 min):
```html
<!-- Before -->
<button class="absolute top-3 right-3 text-gray-500 hover:text-gray-700" id="listing-close">✕</button>

<!-- After -->
<button class="absolute top-3 right-3 text-gray-500 hover:text-gray-700" 
  id="listing-close" aria-label="Đóng form">✕</button>
```

2. **Enhance error message clarity** (5 min):
```typescript
// Before
status.textContent = 'Vui lòng nhập tiêu đề và giá hợp lệ.';

// After
const missing = [];
if (!title) missing.push('Tiêu đề');
if (isNaN(price)) missing.push('Giá hợp lệ');
status.textContent = `❌ Lỗi: ${missing.join(', ')} không được bỏ trống.`;
```

3. **Add aria-describedby to form inputs** (5 min):
```html
<input type="text" name="title" required 
  aria-describedby="listing-status"
  class="..." placeholder="..." />
```

4. **Add form section landmarks** (3 min):
```html
<div role="region" aria-label="Thông tin liên hệ">
  <!-- Contact fields -->
</div>
```

5. **Keyboard-only indicator** (2 min):
```css
/* Ensure visible focus on keyboard nav */
button:focus-visible {
  outline: 3px solid #4f46e5;
  outline-offset: 2px;
}
```

**Trade-off**:
| Pro | Con |
|-----|-----|
| WCAG AA compliance | No user-visible change (backend improvement) |
| Screen reader experience better | Requires testing with screen reader |
| Keyboard nav clear | Adds 10+ lines of code |

**Risk**: None (additive only)

---

#### **P1.2: Performance Optimization — Lazy-Load Timeout**
**Effort**: 15 minutes  
**Impact**: 🟡 HIGH (Error recovery)

**Current Code** (index.ts L101-133):
```typescript
try {
  performance.mark('listing-load-start');
  const [{ ListingService }, { ListingForm }] = await Promise.all([
    import('./services/ListingService'),
    import('./components/ListingForm')
  ]);
  // ⚠️ No timeout — can hang indefinitely on slow network
  performance.mark('listing-load-end');
```

**Proposed Fix**:
```typescript
private async openListingForm() {
  if (!this.selectedParcel) return;
  
  if (!this.listingService || !this.listingForm) {
    const loadingToast = this.showLoadingToast('Đang tải tính năng Đăng tin...');
    
    try {
      performance.mark('listing-load-start');
      
      // Add timeout wrapper
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout: Listing load > 5s')), 5000)
      );
      
      const [{ ListingService }, { ListingForm }] = await Promise.race([
        Promise.all([
          import('./services/ListingService'),
          import('./components/ListingForm')
        ]),
        timeoutPromise
      ]);
      
      performance.mark('listing-load-end');
      performance.measure('listing-load', 'listing-load-start', 'listing-load-end');
      
      this.listingService = new ListingService();
      this.listingForm = new ListingForm(this.listingService);
      this.hideLoadingToast(loadingToast);
    } catch (err) {
      console.error('[CoreApp v2] Failed to load listing modules:', err);
      this.hideLoadingToast(loadingToast);
      alert(`⚠️ Không thể tải tính năng Đăng tin.\n\n${err instanceof Error ? err.message : 'Vui lòng kiểm tra kết nối'}`);
      return;
    }
  }
  
  performance.mark('modal-open-start');
  this.listingForm.open(this.selectedParcel.feature as ParcelFeature, this.selectedParcel.centroid);
  performance.mark('modal-open-end');
  performance.measure('modal-open', 'modal-open-start', 'modal-open-end');
}
```

**Rationale**:
- If import takes >5s (network down) → reject with error
- User sees alert: "Timeout... check connection" (clear what happened)
- Without timeout: user waits indefinitely

**Risk**: False positives on very slow 3G (5s may be tight). Recommendation: Test on throttled network first, adjust if needed.

**Decision**: Apply only if TEST D + real-world testing shows >3s load times.

---

#### **P1.3: Layer Stacking Documentation & Anchor Guard**
**Effort**: 1-2 hours  
**Impact**: 🟡 MEDIUM (Regression prevention)

**Changes**:

1. **Document layer order** (docs/LAYER_STACKING_ORDER.md):
```markdown
# Layer Stacking Order — V2 Map

## Visual Stack (Bottom to Top)
1. osm-raster (fallback only, if demotiles fails)
2. parcels-fill (primary user-interactive layer, z-index 40)
3. parcels-outline (border highlights)
4. parcels-highlight (selected state, red outline)
5. map controls (attribution, zoom, compass — MapLibre GL defaults z-index 50)

## Insertion Anchor
All parcel layers inserted before 'water' layer to ensure visibility.

## Why This Order?
- Parcels drawn on top of basemap (must be above water)
- Highlight (4) on top of other parcel layers (selection feedback)
- Controls (5) above all map content (user interaction)

## Future PRs: Adding New Layers
If adding new controls/overlays:
- Check that they don't overlap parcels
- Use z-index or layer insertion anchor
- Test on mobile 360×740 for overlap
```

2. **Add anchor safeguard** (MapService.ts L210-230):
```typescript
// Before adding layer, verify 'water' exists
const anchorLayer = this.map.getLayer('water') ? 'water' : undefined;

try {
  if (!this.map.getLayer('parcels-fill')) {
    this.map.addLayer(
      {
        id: 'parcels-fill',
        type: 'fill',
        source: 'parcels-source',
        'source-layer': 'default',
        paint: { ... }
      },
      anchorLayer  // ✅ If 'water' missing, adds at end (safe)
    );
```

**Trade-off**: No user impact, pure defensive coding.

---

#### **P1.4: Error Boundary — Modal Crash Handling**
**Effort**: 1-2 hours  
**Impact**: 🟡 MEDIUM (Resilience)

**Issue**: If ListingForm render crashes → whole app breaks (no error boundary)

**Proposed Solution**:
```typescript
// New: ErrorBoundary component
export class ErrorBoundary {
  private container: HTMLElement;
  private error: Error | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  render(component: HTMLElement) {
    try {
      this.container.appendChild(component);
    } catch (err) {
      this.error = err as Error;
      this.showErrorUI();
    }
  }

  private showErrorUI() {
    this.container.innerHTML = `
      <div class="p-6 bg-red-50 text-red-800 rounded-lg">
        <h3 class="font-bold">❌ Form Error</h3>
        <p>${this.error?.message || 'Unknown error'}</p>
        <button onclick="location.reload()" class="mt-3 px-4 py-2 bg-red-600 text-white rounded">
          Tải lại
        </button>
      </div>
    `;
  }
}
```

**Integration**:
```typescript
// In openListingForm:
const boundary = new ErrorBoundary(modalContainer);
boundary.render(this.listingForm.element);
```

**Trade-off**: Adds ~50 lines of code but prevents total app crash.

---

### 🟢 P2: NICE-TO-HAVE (Phase 2+ Later Sprints)

---

#### **P2.1: Skeleton Screens — Loading Placeholder**
**Effort**: 1-2 hours  
**Impact**: 🟢 LOW (UX polish)

**Current**: Text toast "Đang tải..."  
**Proposed**: Show form field placeholders (animated gray bars) while loading

**Example**:
```html
<div class="space-y-4 pb-14">
  <div>
    <div class="h-4 w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
    <div class="h-10 w-full bg-gray-100 rounded animate-pulse"></div>
  </div>
  ...
</div>
```

**Trade-off**: Slightly faster perceived load (user sees form shape); minor code addition.

---

#### **P2.2: Offline Support**
**Effort**: 2-4 hours  
**Impact**: 🟢 LOW (Extra resilience)

**Current**: No offline support  
**Proposed**: Extend legacy `/public/sw.js` to cache `/v2-dist/*` assets

**Changes**:
1. Add `/v2-dist/` routes to Service Worker cache list
2. Show offline banner when no network
3. Disable "Đăng tin" button with "Offline" message

**Trade-off**: Additional SW maintenance; users expect offline behavior on PWA.

---

#### **P2.3: Dark Mode**
**Effort**: 1-2 hours  
**Impact**: 🟢 LOW (Nice feature)

**Current**: Tailwind CDN without dark mode  
**Proposed**: Add `dark:` classes + media query detection

**Example**:
```html
<div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
```

**Trade-off**: More CSS lines; user preference detection needed (localStorage or system).

---

#### **P2.4: Mobile Landscape Optimization**
**Effort**: 30-60 minutes  
**Impact**: 🟢 LOW (Niche use case)

**Issue**: On 360×640 landscape, modal max-h-90vh is cramped  
**Proposed**: Switch to bottom sheet (slide up from bottom) on landscape

**Code**:
```css
@media (orientation: landscape) {
  #listing-modal {
    position: fixed;
    bottom: 0;
    top: auto;
    left: 0;
    right: 0;
    height: 80vh;
    border-radius: 16px 16px 0 0;
  }
}
```

**Trade-off**: Different UX on landscape (may confuse users); extra CSS.

---

#### **P2.5: Form Validation UX — All Errors at Once**
**Effort**: 1-2 hours  
**Impact**: 🟢 LOW (Polish)

**Current**: Shows first invalid field error only  
**Proposed**: Show all invalid fields + errors in a list

**Changes**:
```typescript
private validateForm(): string[] {
  const errors: string[] = [];
  const title = this.formEl?.querySelector('input[name="title"]') as HTMLInputElement;
  const price = this.formEl?.querySelector('input[name="price"]') as HTMLInputElement;

  if (!title?.value?.trim()) errors.push('Tiêu đề không được bỏ trống');
  if (!price?.value || isNaN(Number(price.value))) errors.push('Giá phải là số hợp lệ');
  
  return errors;
}

private async handleSubmit(event: Event) {
  const errors = this.validateForm();
  if (errors.length > 0) {
    status.innerHTML = `<ul>${errors.map(e => `<li>• ${e}</li>`).join('')}</ul>`;
    return;
  }
  // ... submit
}
```

**Trade-off**: Error message area grows; need height management.

---

## PART 4: PHASE 2 IMPLEMENTATION TIMELINE

### Week 1: P0 Hotfixes + P1 Accessibility

**Monday-Tuesday: P0 Verification & Hotfixes** (4 hours)
- Verify TEST A-E results
- If tap target <44px: Apply P0.1 fix (5 min)
- If jank detected: Apply P0.2 rAF (10 min)
- Verify P0.3 fallback guard passes test
- Re-run tests to confirm fixes
- Build & deploy to staging

**Wednesday-Thursday: P1 Accessibility** (4-6 hours)
- Add aria-label, aria-describedby (30 min)
- Enhance error messages (30 min)
- Test with screen reader (1 hour)
- Add keyboard focus-visible styles (30 min)
- Fix any a11y failures from Lighthouse (1-2 hours)
- Commit + PR review

**Friday: P1 Performance & Documentation** (3-4 hours)
- Add lazy-load timeout safeguard (15 min)
- Create docs/LAYER_STACKING_ORDER.md (30 min)
- Add error boundary if needed (1 hour)
- Lighthouse re-audit (30 min)
- Merge to main + tag v2.0.1 (hotfix release)

**Week 1 Deliverable**: v2.0.1 production-ready (all P0 + P1 complete)

---

### Week 2: P1 Polish + P2 Start

**Monday: Performance Tracing & Optimization**
- Collect performance traces from prod (1 hour)
- Identify slowest operations (30 min)
- Optimize if needed (lazy-load, bundle split) (1-2 hours)

**Tuesday-Wednesday: Layer Documentation & Error Boundaries**
- Complete docs/LAYER_STACKING_ORDER.md (30 min)
- Implement error boundary component (1 hour)
- Test on slow network (30 min)

**Thursday-Friday: P2 Skeleton Screens**
- Design skeleton UI (30 min)
- Implement animated placeholders (1-2 hours)
- A/B test perceived load time (30 min)

**Week 2 Deliverable**: v2.0.2 with performance polish + P2 groundwork

---

### Week 3+: P2 Nice-to-Have Features

- **Sprint 1**: Offline support (2-4 hours)
- **Sprint 2**: Dark mode (1-2 hours)
- **Sprint 3**: Mobile landscape + validation UX (2-3 hours)
- **Backlog**: Analytics, advanced search, multiple images

---

## PART 5: TRADE-OFF MATRIX

| Item | Implementation | Risk Level | User Impact | Timeline |
|------|---|---|---|---|
| **P0.1 Tap Size** | Add min-h/min-w | 🟢 LOW | 🔴 CRITICAL | < 1 day |
| **P0.2 visualViewport** | rAF wrapper | 🟢 LOW | 🔴 CRITICAL | < 1 day |
| **P0.3 Fallback Guard** | Test only | 🟢 NONE | 🔴 CRITICAL | 1 hour |
| **P1.1 ARIA** | Label + aria-describedby | 🟢 LOW | 🟡 HIGH (a11y users) | 2-3 hours |
| **P1.2 Timeout** | Promise.race + try/catch | 🟡 MED | 🟡 HIGH (3G users) | 30 min |
| **P1.3 Docs** | Comment + safeguard | 🟢 LOW | 🟡 MED (regression) | 2 hours |
| **P1.4 Error Boundary** | New component | 🟡 MED | 🟡 MED (crash recovery) | 1-2 hours |
| **P2.1 Skeletons** | CSS animations | 🟡 MED | 🟢 LOW (polish) | 1-2 hours |
| **P2.2 Offline** | SW integration | 🟡 MED | 🟢 LOW (niche) | 2-4 hours |
| **P2.3 Dark Mode** | CSS variables | 🟡 MED | 🟢 LOW (nice) | 1-2 hours |

---

## SUMMARY: RECOMMENDATIONS

### ✅ DO IMMEDIATELY (After Test Results)
1. **Verify tap targets** (TEST C) → apply P0.1 if <44px
2. **Verify keyboard performance** (TEST D) → apply P0.2 if jank observed
3. **Verify fallback guard** (TEST B) → confirm P0.3 passes

### ✅ DO IN WEEK 1 (Phase 2)
1. P1.1 ARIA labels (accessibility compliance)
2. P1.2 Lazy-load timeout (error recovery)
3. P1.3 Layer documentation (regression prevention)

### ✅ CONSIDER IN WEEK 2-3
1. P1.4 Error boundary (crash resilience)
2. P2.1 Skeleton screens (UX polish)

### ❌ DEFER FOR NOW
- Dark mode (low user demand signal)
- Offline support (PWA integration can wait)
- Landscape optimization (not primary use case)

---

**End of Optimization Recommendations**
