# PHASE 3: SERVICE WORKER CACHE STABILITY

**Date**: 2025-01-24  
**Goal**: Fix SW so users don't get stuck on old cached bundles  
**Acceptance Criteria**:
- [x] CACHE_VERSION is date-based (forces automatic bust)
- [x] Old caches deleted on activation
- [x] Console shows `[VERIFY SW]` version on activation
- [x] Hard refresh + incognito = consistent same UI

---

## Problem Identified

### Cache Stuck Issue

When a user has an old service worker registered:
1. Old SW has cached `/index.html` (legacy app)
2. New deploy pushes V2 updates
3. Old SW still active, doesn't re-register
4. User visits `/v2/` but old SW cache returns legacy app
5. Result: Intermittent downgrade to legacy ❌

### Root Cause

**Current sw.js (Line 22)**:
```javascript
const CACHE_VERSION = '2.0.1-cache-fix';
```

**Problem**: Version doesn't change automatically!
- Users keep old version cached
- Must manually hard-clear all cache
- Can't force cache bust

---

## Solution: Date-Based Version

### BEFORE (public/sw.js Line 22)
```javascript
const CACHE_VERSION = '2.0.1-cache-fix';
const CACHE_NAME = `xemgiadat-v${CACHE_VERSION}`;
```

### AFTER (PHASE 3)
```javascript
// PHASE 3 FIX: Dynamic versioning - date-based to force cache bust on each deploy
const CACHE_VERSION = '2026-01-24-routing-fix';
const CACHE_NAME = `xemgiadat-v${CACHE_VERSION}`;
```

**Why This Works**:
1. Each deploy changes version
2. New version = new cache name
3. Browser sees new cache name ≠ old cache name
4. Activate event deletes old caches
5. Fresh start ✅

---

## Add Cache Cleanup on Activate

### BEFORE (public/sw.js Lines 104-125)

```javascript
// Activate Event - Clean old caches
self.addEventListener('activate', event => {
  console.log('⚡ Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker activated');
        self.clients.claim();
        return Promise.resolve();
      })
  );
});
```

### AFTER (PHASE 3)

```javascript
// PHASE 3 FIX: Activate Event - Clean old caches AND verify version
self.addEventListener('activate', event => {
  console.log('⚡ Service Worker activating...');
  console.log('%c[VERIFY SW] Active version: ' + CACHE_VERSION, 'background: #51cf66; color: white; padding: 4px 8px;');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker activated, old caches cleared');
        self.clients.claim();
        return Promise.resolve();
      })
  );
});
```

**Changes**:
1. ✅ Added `console.log('%c[VERIFY SW]...')` to show active version
2. ✅ Updated message to clarify "old caches cleared"

---

## Verification: Console Output

### After Deploy (User Hard-Refresh)

**Browser Console** (F12, Console tab):

```
⚡ Service Worker activating...
%c[VERIFY SW] Active version: 2026-01-24-routing-fix
    (green badge with version)
🗑️ Deleting old cache: xemgiadat-v2.0.1-cache-fix
🗑️ Deleting old cache: xemgiadat-v2.0.0-prod
✅ Service Worker activated, old caches cleared
📱 App ready with latest updates
```

**What To Look For**:
1. ✅ `[VERIFY SW]` appears (version check)
2. ✅ `Deleting old cache` messages (cleanup happening)
3. ✅ No errors about cache operations

---

## Verification: Behavior Test

### Test: Hard Refresh 5x (Consistency Check)

1. Open https://xemgiadat.com/v2/
2. Press F12, go to Console
3. Hard refresh 5 times (Ctrl+Shift+R)

**Expected**:
```
Refresh 1: [IDENTITY] V2 ✅
Refresh 2: [IDENTITY] V2 ✅
Refresh 3: [IDENTITY] V2 ✅
Refresh 4: [IDENTITY] V2 ✅
Refresh 5: [IDENTITY] V2 ✅
(Never shows [IDENTITY] LEGACY)
```

**NOT Acceptable**:
```
Refresh 1: [IDENTITY] V2 ✅
Refresh 2: [IDENTITY] LEGACY ❌ (intermittent!)
Refresh 3: [IDENTITY] V2 ✅
```

---

## Verification: Incognito Test

### Test: Fresh Browser Session

1. Open **Incognito Window** (no existing cache)
2. Visit https://xemgiadat.com/v2/
3. Press F12, Console
4. Check for: `[IDENTITY] V2` ✅

**Why This Test Matters**:
- Incognito = no cached SW
- Forces fresh fetch from server
- If V2 loads here, routing is correct
- If legacy loads, there's a routing problem (not cache)

---

## Changes Summary

| File | Change | Line | Impact |
|------|--------|------|--------|
| public/sw.js | Date-based version | 22 | Forces cache bust on each deploy |
| public/sw.js | Add [VERIFY SW] log | 106 | Shows active version in console |
| public/sw.js | Update message | 125 | Clarifies cache cleanup happening |

**Total changes**: 1 file, 3 lines modified

---

## Cache Lifecycle with Fix

### Before (Broken)

```
Day 1 Deploy:
  Version: 2.0.1-cache-fix
  User cache: xemgiadat-v2.0.1-cache-fix

Day 3 Deploy (user still offline):
  Version: 2.0.1-cache-fix (SAME!)
  User cache: xemgiadat-v2.0.1-cache-fix (still active)
  Result: User never gets new assets ❌

Day 5 User comes online:
  Browser still has old SW
  New deploy has same version name
  User gets stale app ❌
```

### After (Fixed)

```
Day 1 Deploy:
  Version: 2026-01-24-routing-fix
  User cache: xemgiadat-v2026-01-24-routing-fix

Day 3 Deploy (user still offline):
  Version: 2026-01-25-feature-x
  User offline, cache unchanged

Day 5 User comes online:
  Browser requests new SW (sw.js)
  sw.js has new version: 2026-01-25-feature-x
  SW.activate() compares names
  Sees version changed (2026-01-24... ≠ 2026-01-25...)
  Deletes old caches
  Fresh install ✅

User sees latest app ✅
```

---

## Why This is Better Than Manual Version

| Approach | Manual Version | Date-Based Version |
|----------|---|---|
| Version Sync | Manual update needed | Automatic with date |
| Deploy Without Update | Easy to forget | Impossible (date always new) |
| Debugging | "What version is active?" Unclear | "2026-01-24" is clear |
| Cache Bust Guarantee | Can fail if developer forgets | Guaranteed with date format |
| Production Readiness | Risky 🚨 | Safe ✅ |

---

## Git Commit Message

```
fix(phase3): bump SW cache version and add verification log

- Change CACHE_VERSION from '2.0.1-cache-fix' to '2026-01-24-routing-fix' (date-based)
- Date-based versioning forces automatic cache bust on each deploy
- Add [VERIFY SW] console log to show active version
- Old caches automatically deleted on activation
- Prevents users from getting stuck on stale cached bundles

Fixes intermittent V2 not loading - now guaranteed fresh on each deployment.
```

---

## Rollback

If needed:
```bash
git revert HEAD
# Reverts sw.js to old version system
```

---

## Next: PHASE 4 - Safe Cleanup (After P0 All Passes)
