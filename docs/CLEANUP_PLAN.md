# PHASE 4: SAFE CLEANUP PLAN

**Date**: 2025-01-24  
**Status**: P1 - ONLY Execute After All P0 Tests Pass  
**Acceptance Criteria**: Must be reversible with git

---

## ⚠️ PRE-CLEANUP VERIFICATION

**STOP** - Before running cleanup, verify:

1. ✅ Production Deploy Complete (all P0 phases deployed)
2. ✅ Monitor shows NO intermittent errors (24+ hours)
3. ✅ Hard refresh `/v2/` 10x = always V2
4. ✅ Tiles loading correctly (network tab shows 200s, not 301s)
5. ✅ Service worker shows `[VERIFY SW]` version in console
6. ✅ Both `/` and `/v2/` load without errors
7. ✅ No error logs in monitoring

**If any P0 verification fails, DO NOT proceed to Phase 4.**

---

## Cleanup Candidates

### Category 1: Orphaned Build Artifacts

| Path | Size | Purpose | Confidence | Action |
|------|------|---------|-----------|--------|
| `public/v2-dist/` | 5.3 MB | Pre-Phase-6 V2 build | ✅ 100% | DELETE |
| `dist/` (if exists) | TBD | Vite build cache | ✅ 90% | DELETE |
| `.vite/` | TBD | Vite temp files | ✅ 100% | DELETE (gitignored anyway) |

### Category 2: Temporary Logs

| Path | Size | Purpose | Confidence | Action |
|------|------|---------|-----------|--------|
| `logs/dwg_processing.log` | 170 B | DXF processing | ✅ 100% | DELETE |
| `dev-server.log` | 2.3 KB | Old dev server output | ✅ 100% | DELETE |
| `*.log` (catch-all) | TBD | Various temp logs | ✅ 80% | REVIEW |

### Category 3: Duplicate Documentation

**Search Results**: Many duplicate/outdated docs found in Phase 1 cleanup

| Path | Size | Purpose | Status | Action |
|------|------|---------|--------|--------|
| `PHASE_1_5_*.md` | TBD | Old phase docs | 🔴 Outdated | DELETE |
| `PR*.md` | TBD | Old PR docs | 🔴 Outdated | DELETE |
| `V2_DEPLOYMENT_READY.md` | TBD | Superseded by new docs | 🔴 Outdated | DELETE |
| `ROOT_CAUSE_INVESTIGATION.md` | TBD | Superseded by ROUTE_TRUTH_TABLE.md | 🔴 Outdated | DELETE |

### Category 4: Legacy Code (DO NOT REMOVE)

| Path | Purpose | Status | Action |
|------|---------|--------|--------|
| `public/script.js` (9,209 lines) | LEGACY app core | 🟢 Active | **KEEP** |
| `public/index.html` | LEGACY entry | 🟢 Active | **KEEP** |
| `public/sw.js` | Service worker | 🟢 Active | **KEEP** |
| `src/` | LEGACY source | 🟢 Active | **KEEP** |
| `public/js/adapters/` | Active adapters | 🟢 Active | **KEEP** |

---

## Cleanup Steps (Reversible)

### Step 1: Verify Nothing Referenced (Search All)

Before deleting anything, search repo for references:

```bash
# Example: Search for v2-dist references
git grep -i "v2-dist" -- '*.js' '*.html' '*.md' '*.ts'

# If found: STOP, don't delete
# If not found: Safe to delete
```

### Step 2: Git rm (Reversible)

All deletions via `git rm` (so they can be reverted):

```bash
git rm -r public/v2-dist/
git rm logs/dwg_processing.log
git rm dev-server.log
git rm PHASE_1_5_*.md
git rm ROOT_CAUSE_INVESTIGATION.md
# etc.
```

### Step 3: Commit (Reversible)

```bash
git commit -m "cleanup(p1): remove orphaned artifacts and old docs

- Delete public/v2-dist/ (orphaned Phase-6 artifact, 5.3 MB)
- Delete old logs (dwg_processing.log, dev-server.log)
- Delete outdated Phase 1-5 docs (replaced by current docs)
- Search verified: no active references to deleted files
- Size saved: ~5.5 MB

Reversible: git revert <commit-hash> to restore all files
"
```

### Step 4: Local Testing

After commit, test locally:

```bash
npm run dev      # Dev mode works?
npm run build    # Build succeeds?
npm run preview  # Preview works?
```

**Must Pass**:
- ✅ No build errors
- ✅ No missing imports
- ✅ Dev server starts
- ✅ Both `/` and `/v2/` load

### Step 5: Smoke Tests

After local testing passes:

```
1. Visit http://localhost:3000/ (LEGACY)
   - Check: Parcels load, "Đăng tin" modal works, scroll OK
   
2. Visit http://localhost:3000/v2/ (V2)
   - Check: Map loads, parcels visible, MapLibre works
   
3. Open DevTools, Console:
   - Check: [IDENTITY] LEGACY or [IDENTITY] V2 appears
   - Check: No critical errors
```

### Step 6: Push

Once all local tests pass:

```bash
git push origin main
# Netlify auto-deploys
```

---

## Rollback Plan

If any issue after cleanup deploy:

```bash
# Immediately revert cleanup commit
git revert <cleanup-commit-hash>
git push origin main

# Netlify will re-deploy with old files restored
# Takes 1-2 minutes
```

**No data loss** - all deleted files restored from git history.

---

## What NOT to Delete

### Active Legacy Code
- ❌ `public/script.js` (9,209 lines - LEGACY core)
- ❌ `public/index.html` (LEGACY entry)
- ❌ `public/sw.js` (Service worker)
- ❌ `public/admin.js`, `public/admin.html`
- ❌ Any `public/*.html` pages (all are active legacy pages)

### Active V2 Code
- ❌ `public/v2/` (V2 app)
- ❌ `public/v2.html` (V2 source)
- ❌ `src2/` (V2 TypeScript source)
- ❌ `public/listing.html`, `public/listing-entry.ts`

### Data
- ❌ `public/data/` (GeoJSON reference data)
- ❌ `public/tiles/` (71.7 MB PMTiles - CRITICAL)

### Configuration
- ❌ `netlify.toml` (deployment config - just fixed!)
- ❌ `vite.config.js` (build config)
- ❌ `package.json`, `package-lock.json`
- ❌ `.gitignore`, `.gitattributes`

### Documentation (Current Phase)
- ❌ `docs/ROUTE_TRUTH_TABLE.md` (Phase 0 evidence)
- ❌ `docs/NETLIFY_ROUTING_FIX.md` (Phase 1 docs)
- ❌ `docs/PHASE2_BUILD_PIPELINE.md` (Phase 2 docs)
- ❌ `docs/SW_CACHE_STRATEGY.md` (Phase 3 docs)
- ❌ `README.md` (project readme)
- ❌ `SECURITY.md` (security policy)

---

## Files to DELETE (First Pass)

### Confirmed Safe to Delete

```
public/v2-dist/                    (orphaned, 5.3 MB)
logs/dwg_processing.log            (170 B, dead)
dev-server.log                     (2.3 KB, dead)

PHASE_1_5_DELIVERY.md              (outdated)
PHASE_1_5_FINAL_STATUS.md          (outdated)
PHASE_1_5_FREEZE_DELIVERY.md       (outdated)
PHASE_1_5_FREEZE_SUMMARY.md        (outdated)
PHASE_1_5_INDEX.md                 (outdated)
PHASE_1_5_START_HERE.md            (outdated)

PR_IMPLEMENTATION_COMPLETE.md      (outdated, 2024 era)
PR_SUMMARY_V2_DEPLOY.md            (superseded)
V2_DEPLOYMENT_READY.md             (superseded)
ROOT_CAUSE_INVESTIGATION.md        (replaced by ROUTE_TRUTH_TABLE.md)

DEPLOYMENT_V2_SUBDIRECTORY.md      (outdated notes)
CACHING_FIX_PR.md                  (old PR notes)
```

**Size Saved**: ~5.5 MB + documentation cleanup

### Search Verification Needed

Before deleting any of these, run:

```bash
# For each file/folder to delete:
git grep -l "v2-dist\|dwg_processing\|PHASE_1_5" -- '*.js' '*.ts' '*.html' '*.md'

# If any matches: DO NOT DELETE (file is referenced)
# If empty result: Safe to delete
```

---

## Git Commands (Copy-Paste Safe)

### Search for References (DO FIRST)

```bash
# Search entire repo for any references to deletion candidates
git grep -r "v2-dist\|dwg_processing\|PHASE_1_5\|PR_IMPLEMENTATION"
```

### Delete Confirmed Safe Files

```bash
# Orphaned artifacts
git rm -r public/v2-dist/
git rm logs/dwg_processing.log
git rm dev-server.log

# Outdated docs (one per line for clarity)
git rm PHASE_1_5_DELIVERY.md
git rm PHASE_1_5_FINAL_STATUS.md
git rm PHASE_1_5_FREEZE_DELIVERY.md
git rm PHASE_1_5_FREEZE_SUMMARY.md
git rm PHASE_1_5_INDEX.md
git rm PHASE_1_5_START_HERE.md
git rm PR_IMPLEMENTATION_COMPLETE.md
git rm PR_SUMMARY_V2_DEPLOY.md
git rm V2_DEPLOYMENT_READY.md
git rm ROOT_CAUSE_INVESTIGATION.md
git rm DEPLOYMENT_V2_SUBDIRECTORY.md
git rm CACHING_FIX_PR.md
```

### Test Locally

```bash
npm ci && npm run build
npm run preview
```

### Commit

```bash
git commit -m "cleanup(p1): remove orphaned artifacts (5.5MB saved)"
```

### Push

```bash
git push origin main
```

---

## Monitoring After Cleanup Deploy

After cleanup push, monitor:

1. **Build Log**
   - Check for errors
   - Build time should be same

2. **Deployed Site**
   - Both `/` and `/v2/` load
   - Tiles load
   - No 404s for expected files

3. **Size**
   - Deploy should be ~5.5 MB smaller
   - If not, check what was deployed

---

## Summary

| Phase | Status | Impact | Next |
|-------|--------|--------|------|
| P0 Routing | ✅ DONE | Fixed intermittent issues | P1 Cleanup |
| P0 Build | ✅ DONE | Guaranteed fresh artifacts | P1 Cleanup |
| P0 SW Cache | ✅ DONE | No stale bundle stuck | P1 Cleanup |
| **P1 Cleanup** | 📋 PLANNED | Save 5.5 MB | Production ready |

---

## Important Notes

✅ **WAIT FOR P0 PRODUCTION VERIFICATION** (24+ hours)  
✅ **All cleanup is reversible** (git revert)  
✅ **Search every deletion** (ensure no references)  
✅ **Test locally first** (npm run build)  
✅ **Commit message links to this plan**

---

**Status**: Ready to execute after P0 all-clear from production monitoring.
