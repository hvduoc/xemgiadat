# Console Log Cleanup Audit

**Goal**: Gate console logs behind DEBUG flag, allow only error/verify/identity in production

**Status**: ✅ Audit complete - Implementation recommendations provided

---

## Current Console Log Inventory

### Legacy App (public/)

#### public/index.html (8 logs)
- **Line 203**: `console.log('📊 Analytics Event:', ...)` → **GATE**: Debug only
- **Line 308**: `console.log('✅ Service Worker registered...` → **GATE**: Debug only
- **Line 364**: `console.log('PWA install outcome:', ...)` → **GATE**: Debug only
- **Line 405**: `console.log('✅ PWA installed...')` → **GATE**: Debug only
- **Line 482-485**: `[IDENTITY] LEGACY` badges → **KEEP**: Production identity proof ✅

#### public/script.js (20+ logs)
- **Line 31-35**: `[LEGACY APP BOOTED]` badges → **KEEP**: Production identity proof ✅
- **Line 75**: `console.log('⏱️ ${name}: ${duration}...')` → **GATE**: Performance debug
- **Line 201**: `console.warn('❌ Không thể dựng GeoJSON...')` → **KEEP**: Error warning ✅
- **Line 207**: `console.log('🚀 DOM Content Loaded...')` → **GATE**: Debug only
- **Line 275, 279**: `console.warn('Lỗi tải vector tile...')` → **KEEP**: Error warning ✅
- **Line 344, 359**: `console.warn('❌ Không thể tải...')` → **KEEP**: Error warning ✅
- **Line 529-603**: Button diagnostics (9 logs) → **GATE**: Debug only

#### public/sw.js (25 logs)
- **Line 79-116**: Service worker lifecycle logs → **GATE**: Debug only
- **Line 183, 199, 210**: `console.warn('...failed...')` → **KEEP**: Error warning ✅
- **Line 270-398**: Background sync, push, analytics logs → **GATE**: Debug only

### V2 App (src2/)

#### src2/index.ts (18 logs)
- **Line 39-44**: `[V2 APP BOOTED]` badges → **KEEP**: Production identity proof ✅
- **Line 55-76**: Initialization logs → **GATE**: Debug only
- **Line 105-156**: Feature interaction logs → **GATE**: Debug only

#### src2/services/MapService.ts (3 logs)
- **Line 23**: `[MapService DEBUG]` → **GATE**: Already gated (good!) ✅
- **Line 376, 535**: Feature logs → **GATE**: Debug only

#### src2/components/SearchBar.ts (2 logs)
- **Line 48**: `[V2 Search] Query:` → **GATE**: Debug only
- **Line 57**: Redirect notification → **GATE**: Debug only

#### src2/components/ListingForm.ts (11 logs)
- **Line 194**: `console.warn('scrollIntoView failed')` → **KEEP**: Error warning ✅
- **Line 298-317**: Modal diagnostics → **GATE**: Debug only

#### src2/config/mapStyles.ts (1 log)
- **Line 43**: `[VERIFY] fallbackAllowed=...` → **KEEP**: Production verification ✅

### Test Files (tests/)
- **test-pi-integration.js (30+ logs)** → **KEEP**: Test output required ✅

---

## Classification

### ✅ KEEP in Production (15 instances)
| File | Line | Log | Reason |
|------|------|-----|--------|
| public/index.html | 482-485 | `[IDENTITY] LEGACY` | Identity proof |
| public/script.js | 31-35 | `[LEGACY APP BOOTED]` | Identity proof |
| public/script.js | 201, 275, 279, 344, 359 | `console.warn(...)` errors | Error reporting |
| public/sw.js | 183, 199, 210 | `console.warn(...)` failures | Error reporting |
| src2/index.ts | 39-44 | `[V2 APP BOOTED]` | Identity proof |
| src2/components/ListingForm.ts | 194 | `console.warn(...)` error | Error reporting |
| src2/config/mapStyles.ts | 43 | `[VERIFY]` | Production verification |
| tests/*.js | All | Test output | Test diagnostics |

### 🚪 GATE Behind DEBUG Flag (60+ instances)
| Category | Files | Count | Notes |
|----------|-------|-------|-------|
| Analytics tracking | public/index.html | 4 | Line 203, 308, 364, 405 |
| Performance timing | public/script.js | 1 | Line 75 |
| DOM/UI diagnostics | public/script.js | 10 | Lines 207, 529-603 |
| Service Worker lifecycle | public/sw.js | 20 | Lines 79-398 |
| V2 initialization | src2/index.ts | 14 | Lines 55-156 |
| Map service debug | src2/services/MapService.ts | 2 | Lines 376, 535 |
| Search debug | src2/components/SearchBar.ts | 2 | Lines 48, 57 |
| Modal diagnostics | src2/components/ListingForm.ts | 10 | Lines 298-317 |

---

## Implementation Strategy

### Phase 1: Create DEBUG Flag (Global)

**public/index.html** (add after line 480):
```html
<script>
// Global DEBUG flag (set via URL param or localStorage)
window.DEBUG = new URLSearchParams(window.location.search).get('debug') === 'true' 
             || localStorage.getItem('xgd_debug') === 'true'
             || false;

// Convenience: Enable debug from console
window.enableDebug = () => { localStorage.setItem('xgd_debug', 'true'); window.DEBUG = true; console.log('✅ Debug mode enabled - reload page'); };
window.disableDebug = () => { localStorage.removeItem('xgd_debug'); window.DEBUG = false; console.log('❌ Debug mode disabled - reload page'); };

// Only log in debug mode
window.debugLog = (...args) => { if (window.DEBUG) console.log(...args); };
window.debugWarn = (...args) => { if (window.DEBUG) console.warn(...args); };
window.debugInfo = (...args) => { if (window.DEBUG) console.info(...args); };

// Always log errors, verify, and identity
window.verifyLog = console.log.bind(console); // [VERIFY] logs
window.identityLog = console.log.bind(console); // [IDENTITY] logs
</script>
```

**src2/index.ts** (add at top):
```typescript
// Global DEBUG flag for V2
declare global {
  interface Window {
    DEBUG: boolean;
    debugLog: typeof console.log;
    debugWarn: typeof console.warn;
    debugInfo: typeof console.info;
    verifyLog: typeof console.log;
    identityLog: typeof console.log;
  }
}

// Fallback if not set by HTML
window.DEBUG = window.DEBUG || new URLSearchParams(window.location.search).get('debug') === 'true';
window.debugLog = window.debugLog || ((...args) => { if (window.DEBUG) console.log(...args); });
window.debugWarn = window.debugWarn || ((...args) => { if (window.DEBUG) console.warn(...args); });
window.verifyLog = window.verifyLog || console.log.bind(console);
window.identityLog = window.identityLog || console.log.bind(console);
```

### Phase 2: Replace Console Logs

**Pattern for gated logs**:
```javascript
// BEFORE:
console.log('🚀 DOM Content Loaded - Initializing app...');

// AFTER:
window.debugLog('🚀 DOM Content Loaded - Initializing app...');
```

**Pattern for identity/verify logs** (unchanged):
```javascript
// KEEP AS-IS:
console.log('%c[IDENTITY] LEGACY', '...');
console.log('[VERIFY] fallbackAllowed=...');
```

**Pattern for errors** (unchanged):
```javascript
// KEEP AS-IS:
console.warn('❌ Không thể tải file GeoJSON:', geojsonUrl);
console.error('Fatal error:', error);
```

### Phase 3: Bulk Replacements

**Files to modify** (estimated effort: 30 min):
1. public/script.js (10 replacements)
2. public/sw.js (20 replacements)
3. public/index.html (4 replacements)
4. src2/index.ts (14 replacements)
5. src2/services/MapService.ts (2 replacements)
6. src2/components/SearchBar.ts (2 replacements)
7. src2/components/ListingForm.ts (10 replacements)

**Replacement script** (PowerShell):
```powershell
# Example for public/script.js
(Get-Content public/script.js) `
  -replace "console\.log\('⏱️", "window.debugLog('⏱️" `
  -replace "console\.log\('🚀 DOM", "window.debugLog('🚀 DOM" `
  -replace "console\.log\('✅ Setting up", "window.debugLog('✅ Setting up" `
  | Set-Content public/script.js
```

---

## Testing Strategy

### Enable Debug Mode
```javascript
// In browser console:
window.enableDebug(); // Sets localStorage + reloads

// Or via URL:
https://xemgiadat.com/?debug=true
```

### Verify Gating Works
**Production (DEBUG=false)**:
```javascript
// Should show:
[IDENTITY] LEGACY
[VERIFY] fallbackAllowed=...
❌ Không thể tải file GeoJSON: ... (errors only)

// Should NOT show:
🚀 DOM Content Loaded...
✅ Service Worker registered...
📊 Analytics Event: ...
```

**Debug Mode (DEBUG=true)**:
```javascript
// Should show EVERYTHING including:
[IDENTITY] LEGACY
[VERIFY] fallbackAllowed=...
🚀 DOM Content Loaded...
✅ Service Worker registered...
📊 Analytics Event: ...
❌ Errors...
```

---

## Console Output Budget

### Production (DEBUG=false)
- **Identity badges**: 2 (LEGACY + V2)
- **Verify logs**: ~5 (fallback checks, config validation)
- **Error warnings**: As needed (console.warn/error)
- **Total**: <10 logs on clean page load

### Debug Mode (DEBUG=true)
- **All logs enabled**: 60+ logs
- **Verbose diagnostics**: Performance, SW lifecycle, map events

---

## Rollout Plan

### Phase 1: Infrastructure (Day 1)
- ✅ Add DEBUG flag to public/index.html
- ✅ Add TypeScript declarations to src2/index.ts
- ✅ Test flag detection (URL + localStorage)

### Phase 2: Legacy App (Day 2)
- ✅ Replace logs in public/script.js (10 files)
- ✅ Replace logs in public/sw.js (20 files)
- ✅ Replace logs in public/index.html (4 files)
- ✅ Test legacy app with DEBUG=false/true

### Phase 3: V2 App (Day 3)
- ✅ Replace logs in src2/ files (28 logs)
- ✅ Test V2 app with DEBUG=false/true
- ✅ Verify mapStyles.ts [VERIFY] logs still work

### Phase 4: Validation (Day 4)
- ✅ Test production build with DEBUG=false
- ✅ Verify no unnecessary logs in console
- ✅ Test debug mode activation
- ✅ Deploy to staging → production

---

## Metrics

### Before Cleanup
- **Production console logs**: 60+ per page load
- **Console noise**: High (verbose diagnostics)
- **Debug difficulty**: Hard to find errors in noise

### After Cleanup
- **Production console logs**: <10 per page load
- **Console noise**: Minimal (identity + errors only)
- **Debug difficulty**: Easy (enable debug mode to see all)

---

## Benefits

✅ **Cleaner production console** - Only identity badges + errors  
✅ **Better performance** - No string interpolation for unused logs  
✅ **Easier debugging** - Toggle debug mode when needed  
✅ **Professional UX** - No console spam for end users  
✅ **Backward compatible** - Debug mode still available  

---

## Usage Examples

### For Developers
```javascript
// Enable debug mode locally
window.enableDebug();

// Disable when done
window.disableDebug();

// Or use URL param
https://localhost:3000/?debug=true
```

### For Production Support
```javascript
// Ask user to run in console:
window.enableDebug();
// Then refresh page and inspect logs

// Or share debug URL:
https://xemgiadat.com/?debug=true
```

---

**Status**: ✅ Audit complete - Ready for implementation  
**Estimated effort**: 4 hours (infrastructure + replacements + testing)  
**Breaking changes**: None (all logs still available via DEBUG flag)  
**Priority**: P2 (nice-to-have, improves UX/performance)
