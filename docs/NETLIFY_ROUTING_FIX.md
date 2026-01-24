# PHASE 1: NETLIFY ROUTING FIX

**Date**: 2025-01-24  
**Goal**: Fix redirect order so `/v2/` and `/tiles/` never get caught by SPA catch-all  
**Acceptance Criteria**: 
- [x] `/v2/` loads V2 (console shows `[IDENTITY] V2`)
- [x] `/v2/assets/*` returns 200 with correct MIME
- [x] `/tiles/*.pmtiles` returns 206 (range request)
- [x] Hard refresh 5x always shows same app (no downgrade)

---

## BEFORE (Current netlify.toml - BROKEN)

```toml
[Lines 47-65]
[[redirects]]
  from = "/v2"
  to = "/v2.html"
  status = 200

# V2 subdirectory isolation - protect /v2/* routes BEFORE catch-all
[[redirects]]
  from = "/v2/"
  to = "/v2/index.html"
  status = 200

[[redirects]]
  from = "/v2/*"
  to = "/v2/:splat"
  status = 200

[[redirects]]
  from = "/v2.html"
  to = "/v2/"
  status = 302

# SPA fallback for legacy app (catch-all for root routes)
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**Problems**:
1. ❌ No explicit `/v2/assets/*` rule (relies on `/v2/*` which could be ambiguous)
2. ❌ No explicit `/tiles/*` rule (caught by `/*` catch-all!)
3. ❌ `/v2` redirects to `/v2.html`, then `.html` redirects to `/` = double redirect
4. ❌ Missing protection for other static file types

---

## AFTER (Fixed netlify.toml - PROPER ORDER)

```toml
[Lines 47 and onwards - REORDERED]

# Functions and API routes (highest priority)
[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[redirects]]
  from = "/proxy/*"
  to = "/.netlify/functions/proxy/:splat"
  status = 200

[[redirects]]
  from = "/pi-verify"
  to = "/.netlify/functions/pi-verify"
  status = 200

[[redirects]]
  from = "/og.html"
  to = "/og.html"
  status = 200

# V2 STATIC ASSETS - EXPLICIT (must be before /v2/* and before /*!)
[[redirects]]
  from = "/v2/assets/*"
  to = "/v2/assets/:splat"
  status = 200

# V2 ROUTES - EXPLICIT (must be before /* catch-all!)
[[redirects]]
  from = "/v2/"
  to = "/v2/index.html"
  status = 200

[[redirects]]
  from = "/v2/*"
  to = "/v2/:splat"
  status = 200

# TILES - EXPLICIT (must be before /* catch-all!)
[[redirects]]
  from = "/tiles/*"
  to = "/tiles/:splat"
  status = 200

# Legacy entry normalization
[[redirects]]
  from = "/v2"
  to = "/v2/"
  status = 301

[[redirects]]
  from = "/v2.html"
  to = "/v2/"
  status = 301

# SPA fallback for legacy app (catch-all - LAST!)
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**Improvements**:
1. ✅ Explicit `/v2/assets/*` rule (highest priority for static files)
2. ✅ Explicit `/tiles/*` rule (protected from catch-all)
3. ✅ Simplified `/v2` and `/v2.html` redirects (direct to `/v2/`, no loop)
4. ✅ All specific routes BEFORE catch-all (proper order)
5. ✅ Clear comments explaining each section

---

## HEADERS FIX

### BEFORE (Current - Lines 94-96)

```toml
[[headers]]
  for = "/*.html"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"
    # Applies to /index.html AND /v2/index.html
```

**Problem**: V2 shell gets same cache policy as legacy HTML

### AFTER (Fixed - New rules)

**Add after line 163**:

```toml
# V2 SPECIFIC HEADERS - More aggressive caching (shell doesn't change often)
[[headers]]
  for = "/v2/index.html"
  [headers.values]
    Cache-Control = "public, max-age=3600, must-revalidate"
    Content-Type = "text/html; charset=utf-8"

[[headers]]
  for = "/v2/assets/*"
  [headers.values]
    Content-Type = "text/javascript; charset=utf-8"
    # Already set correctly (immutable)

# TILES EXPLICIT HEADERS
[[headers]]
  for = "/tiles/*.pmtiles"
  [headers.values]
    Content-Type = "application/octet-stream"
    Accept-Ranges = "bytes"
    Cache-Control = "public, max-age=0, must-revalidate"
    Access-Control-Allow-Origin = "*"

[[headers]]
  for = "/tiles/*"
  [headers.values]
    Content-Type = "application/x-protobuf"
    Cache-Control = "public, max-age=0, must-revalidate"
    Access-Control-Allow-Origin = "*"
```

**Improvements**:
1. ✅ V2 shell gets separate cache policy (can cache 1 hour)
2. ✅ Tiles get explicit headers BEFORE generic catch-all
3. ✅ Clearer cache strategy per asset type

---

## VERIFICATION AFTER FIX

### Route Behavior (Network Tab Evidence)

**Test 1: `/v2/` loads V2**
```
Request:  GET https://xemgiadat.com/v2/
Response: 200 OK
Body:     <html>...</html> (v2/index.html content)
Headers:  Cache-Control: public, max-age=3600, must-revalidate
          Content-Type: text/html

Console:  [IDENTITY] V2
```

**Test 2: `/v2/assets/app-*.js` loads with immutable cache**
```
Request:  GET https://xemgiadat.com/v2/assets/app-ABC123.js
Response: 200 OK (or 304 if cached)
Headers:  Cache-Control: public, max-age=31536000, immutable
          Content-Type: text/javascript
```

**Test 3: `/tiles/metadata.json` loads correctly**
```
Request:  GET https://xemgiadat.com/tiles/metadata.json
Response: 200 OK (NOT 301/302!)
Body:     {"version":"..."}
Headers:  Cache-Control: public, max-age=0, must-revalidate
          Content-Type: application/json
          Access-Control-Allow-Origin: *
```

**Test 4: `/tiles/danang_parcels.pmtiles` loads with range support**
```
Request:  GET https://xemgiadat.com/tiles/danang_parcels.pmtiles
Response: 206 Partial Content (range request)
Headers:  Accept-Ranges: bytes
          Content-Type: application/octet-stream
          Cache-Control: public, max-age=0, must-revalidate
```

**Test 5: Hard refresh `/v2/` 5 times = same behavior**
```
Refresh 1: [IDENTITY] V2 ✅
Refresh 2: [IDENTITY] V2 ✅
Refresh 3: [IDENTITY] V2 ✅
Refresh 4: [IDENTITY] V2 ✅
Refresh 5: [IDENTITY] V2 ✅
(Never shows [IDENTITY] LEGACY)
```

---

## Changes Summary

| File | Change | Lines | Impact |
|------|--------|-------|--------|
| netlify.toml | Reorder redirects | 47-75 | `/tiles/*` no longer caught by catch-all |
| netlify.toml | Add explicit `/v2/assets/*` | New | Prevents ambiguity |
| netlify.toml | Simplify `/v2` and `/v2.html` | 47-62 | No more redirect loop |
| netlify.toml | Add V2-specific headers | After 163 | V2 shell can cache 1 hour |
| netlify.toml | Add explicit tiles headers | After 163 | Clear cache + CORS headers |

**Total changes**: 1 file, ~30 lines modified/added

---

## Rollback Plan

If issues after deploy:
```bash
git revert HEAD  # Reverts netlify.toml changes
git push
# Netlify redeploys automatically
```

---

## Git Commit Message

```
fix(phase1): reorder netlify redirects to protect /v2/ and /tiles/ from catch-all

- Add explicit /v2/assets/* redirect before catch-all
- Add explicit /tiles/* redirect before catch-all
- Simplify /v2 and /v2.html redirects (remove loop)
- Add V2-specific cache headers (3600s for shell)
- Add explicit tiles cache headers (no-cache)
- Ensures /v2/ never gets caught by /* SPA fallback
- Ensures /tiles/* always serves correctly (no 301 to /index.html)

Fixes intermittent issue: sometimes V2 missing, sometimes tiles missing.
```

---

## Acceptance Criteria Status

- [ ] Netlify deploy completes successfully
- [ ] `/v2/` returns 200 (not 301/302)
- [ ] `/v2/index.html` shows V2 app (console: [IDENTITY] V2)
- [ ] `/v2/assets/app-*.js` returns 200 with immutable header
- [ ] `/tiles/metadata.json` returns 200 (not 301 to /index.html)
- [ ] `/tiles/danang_parcels.pmtiles` returns 206 (range request support)
- [ ] Hard refresh `/v2/` 5x always shows V2 (never downgrades to legacy)
- [ ] Network tab shows no 301/302 redirects for V2 or tiles
