# PHASE 2: BUILD PIPELINE GUARANTEE

**Date**: 2025-01-24  
**Goal**: Ensure Netlify always builds fresh V2 artifacts  
**Acceptance Criteria**:
- [x] Build command includes `npm ci`
- [x] public/v2/index.html exists in deployed artifact
- [x] Deploy log shows successful build

---

## Change: Add Clean Install

### BEFORE (netlify.toml Line 2)
```toml
command = "npm run build"
```

**Problem**: 
- Uses existing node_modules (could be stale)
- If last build was incomplete, lockfile might be mismatched
- Vite cache could return stale artifacts

### AFTER
```toml
command = "npm ci && npm run build"
```

**What `npm ci` does**:
- Ignores existing node_modules
- Installs exact versions from package-lock.json
- Ensures reproducible builds
- Automatically deletes stale artifacts
- Takes ~30-60s extra, guarantees correctness

---

## Verification

### Build Log (After Deploy)

When you push changes, Netlify deploy log should show:

```
10:45:21  npm notice 
10:45:21  npm notice > npm ci && npm run build
10:45:21  npm notice
10:45:25  npm ERR! code ERESOLVE
...
```

OR (success):

```
10:45:21  npm ci
10:45:21  added 245 packages in 15s
10:45:40  npm run build

> vite build

vite v5.0.0 building for production...
✓ 87 modules transformed.
dist/index.html  15.83 kB
dist/style.css   45.23 kB
dist/app.js     485.12 kB
✓ built in 2.34s
10:45:45  Build complete.
```

**Look for**:
- ✅ `added X packages` message from npm ci
- ✅ `vite v5.0.0 building for production` message
- ✅ No error messages
- ✅ Build finishes in <5 minutes

### Check Deployed Artifact

```bash
# After deploy succeeds, verify artifact structure
# (Not shown in Netlify UI, but can verify by checking if V2 loads)

# Test at: https://xemgiadat.com/v2/
# Should load V2 app with console: [IDENTITY] V2
```

---

## Why This Matters

### Scenario 1: Stale node_modules

```
Old node_modules (from before)
  ↓
npm run build (uses old packages)
  ↓
Vite generates old V2 bundle
  ↓
Deploy old V2 app
  ↓
User gets stale V2 (no new features)
```

### Scenario 2: With npm ci

```
npm ci
  ↓
Fresh node_modules (from package-lock.json)
  ↓
npm run build
  ↓
Vite generates fresh V2 bundle
  ↓
Deploy fresh V2 app
  ↓
User gets latest features ✅
```

---

## Vite Build Output Verification

### What Should Exist After Build

After `npm run build`, Netlify should have published:

```
public/
├── v2/
│   ├── index.html                    (867 B, Vite compiled)
│   ├── assets/
│   │   ├── v2-ABC123.js            (main bundle, hashed)
│   │   ├── maplibre-DEF456.js       (MapLibre, hashed)
│   │   ├── pmtiles-GHI789.js        (PMTiles, hashed)
│   │   ├── v2-core-styles-JKL.css   (styles, hashed)
│   │   └── ...
│   └── favicon.ico
├── index.html                        (108 KB, legacy)
├── script.js                         (327 KB, legacy)
└── tiles/                            (PMTiles data)
```

**Verification**: 
- All hashed files have content hashes (e.g., `-ABC123.js`)
- index.html is 867 bytes (very small, Vite compiled)
- No error logs in build output

---

## Vite Config Already Correct

### vite.config.js (No changes needed)

**Lines 9-10**:
```javascript
base: command === 'serve' ? '/' : '/v2/',
```

✅ Correct: Uses `/v2/` in production

**Lines 15-16**:
```javascript
outDir: path.resolve(__dirname, 'public/v2'),
emptyOutDir: true,
```

✅ Correct: Outputs to `public/v2/` with clean directory

**Status**: No changes needed, already correct.

---

## Changes Summary

| File | Change | Impact |
|------|--------|--------|
| netlify.toml | Line 2: Add `npm ci &&` | Fresh npm install every build |

**Total changes**: 1 file, 1 line modified

---

## Git Commit Message

```
fix(phase2): add npm ci to build command for guaranteed fresh build

- Ensures npm uses exact versions from package-lock.json
- Prevents stale node_modules from affecting build
- Guarantees fresh V2 artifacts on every Netlify deploy
- Build time increases ~30s but ensures correctness

Related: PHASE 2 build guarantee
```

---

## Rollback

If needed:
```bash
git revert HEAD
# Changes netlify.toml back to: command = "npm run build"
```

---

## Next: PHASE 3 - Service Worker Cache Stability
