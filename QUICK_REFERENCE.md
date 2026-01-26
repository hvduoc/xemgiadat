# QUICK REFERENCE: Production Verification After Deploy

**After Netlify Deploy Completes**, run these tests:

---

## 🔍 VERIFICATION TESTS (5 minutes)

### Test 1: Navigate to LEGACY

```
1. Open https://xemgiadat.com/
2. Press F12 (open DevTools)
3. Go to Console tab
4. Should see: [IDENTITY] LEGACY (red badge)
5. Check: Parcels map loaded, "Đăng tin" button visible
```

**Expected**: Red `[IDENTITY] LEGACY` badge, full app visible

---

### Test 2: Navigate to V2

```
1. Open https://xemgiadat.com/v2/
2. Press F12 (DevTools already open)
3. Go to Console tab
4. Should see: [IDENTITY] V2 (green badge)
5. Check: Map loaded, search bar visible
```

**Expected**: Green `[IDENTITY] V2` badge, MapLibre map visible

---

### Test 3: Verify Service Worker

```
1. Still at https://xemgiadat.com/v2/
2. In Console, look for: [VERIFY SW] Active version: 2026-01-24-routing-fix
3. Should see green badge with version
```

**Expected**: `[VERIFY SW]` with date-based version shown in green

---

### Test 4: Hard Refresh Consistency (5x)

```
1. At https://xemgiadat.com/v2/
2. Hard refresh 5 times: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   Refresh 1: [IDENTITY] V2 ✅
   Refresh 2: [IDENTITY] V2 ✅
   Refresh 3: [IDENTITY] V2 ✅
   Refresh 4: [IDENTITY] V2 ✅
   Refresh 5: [IDENTITY] V2 ✅
```

**Expected**: ALL 5 show V2, never shows LEGACY, consistent every time

**❌ FAIL**: If ANY shows [IDENTITY] LEGACY or 404 errors → routing issue

---

### Test 5: Verify Tiles (Parcels Load)

```
1. At https://xemgiadat.com/v2/ (V2 map)
2. Wait 2 seconds for map to load
3. Check: Yellow/orange parcel outlines visible on map
4. Open DevTools → Network tab
5. Filter for "metadata" or "pmtiles"
6. Should see: Status 200 (not 301/302)
```

**Expected**: Parcels visible on map, network requests are 200

**❌ FAIL**: If NO parcels or 301/302 in network tab → tiles routing broken

---

### Test 6: Incognito Window (Fresh Cache)

```
1. Open NEW Incognito Window (Ctrl+Shift+N)
2. Visit https://xemgiadat.com/v2/
3. Open DevTools
4. Should see: [IDENTITY] V2
5. Map should load with parcels
```

**Expected**: Same behavior as regular window (V2 loads, tiles visible)

**❌ FAIL**: If shows LEGACY in incognito → caching issue or routing issue

---

## 🚨 IF TESTS FAIL

### Symptom: Shows LEGACY When Visiting /v2/

**Diagnosis**:
- Routing issue (redirects not working)
- Or cache not cleared

**Troubleshoot**:
```
1. Hard refresh: Ctrl+Shift+R
2. If still fails: Open DevTools → Application → Clear Storage → Clear All
3. Reload
4. If still fails: Incognito window (fresh cache)
5. If incognito fails: Routing issue (not cache)
```

### Symptom: Tiles Not Loading (No Parcels on Map)

**Diagnosis**:
- Network tab shows 301/302 for `/tiles/metadata.json`
- Or `/tiles/*.pmtiles` returns error

**Troubleshoot**:
```
1. Open DevTools → Network tab
2. Filter for: metadata
3. Check response status code
4. If 301/302: Routing issue (not fixed yet)
5. If 200: Check file exists at https://xemgiadat.com/tiles/metadata.json
```

### Symptom: Hard Refresh Shows Different App Each Time

**Diagnosis**:
- Service Worker cache conflict
- Or redirect order still broken

**Troubleshoot**:
```
1. DevTools → Application → Service Workers
2. Unregister existing SWs
3. Clear all caches (Application → Cache Storage)
4. Hard refresh: Ctrl+Shift+R
5. If still inconsistent: SW not activating (check console for errors)
```

---

## ✅ SUCCESS INDICATORS

All of these should be TRUE:

- [ ] Hard refresh `/v2/` 5x always shows V2 (never LEGACY)
- [ ] Console shows `[IDENTITY] V2` at /v2/
- [ ] Console shows `[IDENTITY] LEGACY` at /
- [ ] Console shows `[VERIFY SW] Active version: 2026-01-24-routing-fix`
- [ ] Parcels visible on V2 map
- [ ] Network tab shows 200 for `/tiles/metadata.json`
- [ ] Network tab shows 206 for `/tiles/*.pmtiles` (range request)
- [ ] Incognito window shows same as regular window
- [ ] Both / and /v2/ load without errors

---

## 📊 MONITORING DASHBOARD

**After Deploy**, monitor for 24+ hours:

| Metric | Target | How to Check |
|--------|--------|--------------|
| V2 loads consistently | 100% | Hard refresh 10x |
| Tiles appear on map | YES | Visit /v2/, wait 2s |
| No 301/302 for tiles | 0 | Network tab, filter "tiles" |
| SW cache version | 2026-01-24-... | Console [VERIFY SW] |
| Both routes work | YES | Visit / and /v2/ |
| No console errors | 0 | DevTools Console |

---

## 🔗 PHASE 0-3 DOCUMENTATION

- [Full Analysis](docs/ROUTE_TRUTH_TABLE.md) - Root cause explanation
- [Routing Fix](docs/NETLIFY_ROUTING_FIX.md) - What changed and why
- [Build Pipeline](docs/PHASE2_BUILD_PIPELINE.md) - Build process fix
- [Cache Strategy](docs/SW_CACHE_STRATEGY.md) - Service Worker fix
- [Cleanup Plan](docs/CLEANUP_PLAN.md) - Phase 4 (only after P0 passes)
- [Executive Summary](NO_BS_EXECUTION_SUMMARY.md) - Full story

---

## 📞 ROLLBACK (If Needed)

If tests fail and everything is broken:

```bash
git revert 2505a37
git push
# Netlify redeploys within 2 minutes
# Everything back to before fix
```

**All changes are reversible via git.**

---

## ✅ READY WHEN

You can proceed to Phase 4 cleanup when:

1. ✅ All 6 tests pass (100% success)
2. ✅ Monitored for 24+ hours with no errors
3. ✅ Users report stable, no intermittent issues
4. ✅ Production metrics show no degradation

**Do NOT proceed to Phase 4 until confident P0 is solid.**

---

**PHASE 0-3 Status**: ✅ COMPLETE - Ready for Netlify Deploy

**TL;DR**: Architecture frozen, documented, and optimized. No code changes.

---

## 📌 For First-Time Contributors

**New to this repo?** Read this in order:

1. **Start here** (2 min): `docs/PROJECT_MAP.md` — Understand architecture
2. **Before editing** (1 min): `docs/DO_NOT_EDIT.md` — Know what's frozen
3. **Development** (5 min): `docs/CORE_MIGRATION_PLAN.md` — See migration path

---

## 🎯 Quick Decisions

### "Can I edit [file]?"

| File | Answer | Reason |
|------|--------|--------|
| `src2/` | ✅ YES | Development code, safe |
| `docs/` | ✅ YES | Documentation, safe |
| `public/script.js` | ⚠️ CAREFUL | Production critical |
| `public/index.html` | ⚠️ CAREFUL | Entry point, high risk |
| `public/sw.js` | ⚠️ CAREFUL | Offline support critical |
| `netlify.toml` | 🔴 NO | Deploy config, frozen |
| `src/` | 🔴 NO | Dead code, being removed |

**Full answer**: See `docs/DO_NOT_EDIT.md`

---

### "What's actually running in production?"

```
✅ ACTIVE NOW:
  public/index.html
  ├─→ public/script.js (ALL v1 logic, 9187 lines)
  ├─→ public/sw.js (offline support)
  └─→ netlify/functions/* (backend APIs)

🔄 DEVELOPMENT (at /v2 route):
  public/v2.html
  ├─→ src2/index.ts (v2 runtime)
  └─→ src2/services/ (MapLibre + PMTiles)

🔴 DEAD (never deployed):
  src/ (orphaned code)
  public/dist/ (unused build output)
```

**Full answer**: See `docs/PROJECT_MAP.md`

---

### "VS Code is slow, help!"

**Already fixed** in this PR:

✅ `.vscode/settings.json` auto-excludes large directories  
✅ Search performance improved  
✅ File watcher optimized  

**Nothing to do** — settings applied automatically!

If still slow:
```bash
# Reload VS Code
Ctrl+Shift+P → Developer: Reload Window

# Check active extensions
# Disable ones you don't use
```

---

## 🔒 Before Making a PR

### Checklist

- [ ] I read `docs/PROJECT_MAP.md` (understand architecture)
- [ ] I checked `docs/DO_NOT_EDIT.md` (avoid frozen files)
- [ ] My changes are in `src2/` or `docs/` (safe zones)
- [ ] No edits to `public/script.js` or `public/index.html` (unless approved)
- [ ] My code doesn't break existing tests

### If You Need to Edit Frozen Files

Get approval first:
```
Message: "I need to fix [bug] in [frozen_file].
Approval from @architect required before merge.
See docs/DO_NOT_EDIT.md for process."
```

---

## 📊 Architecture At a Glance

```
         Browser
            ↓
    [netlify.toml routes]
            ↓
    ┌───────┴────────┐
    ↓                ↓
 /   (root)        /v2
    ↓                ↓
[v1 PRODUCTION]  [v2 DEVELOPMENT]
    ↓                ↓
index.html       v2.html
script.js        index.ts (vite dev)
(9187 lines)     (50 lines)
    ↓                ↓
Firebase         MapLibre
Mapbox API       PMTiles
GeoJSON          TypeScript
```

**Full diagram**: See `docs/PROJECT_MAP.md`

---

## 🚀 Next Steps (For Architect)

**Phase 2 of migration** (when ready):

1. Develop v2 features in `src2/`
2. Test at `/v2` route
3. When stable: Begin Phase 3 (staging tests)
4. After 7 days: Cut over to v2 (Phase 4)
5. After stable: Clean up v1 (Phase 5)

**Timeline**: ~10-15 weeks  
**Details**: See `docs/CORE_MIGRATION_PLAN.md`

---

## 📚 Key Files This PR Created

| File | Size | Purpose |
|------|------|---------|
| docs/PROJECT_MAP.md | 10 KB | Architecture overview |
| docs/DO_NOT_EDIT.md | 4 KB | Governance + frozen files |
| docs/CORE_MIGRATION_PLAN.md | 9 KB | v1→v2 migration roadmap |
| .vscode/settings.json | 5 KB | Performance optimization |

---

## ❓ Frequently Asked Questions

### Q: Can I delete src/?
**A**: Not yet. Phase 5 (cleanup) of migration plan.  
**When**: After v2 is stable in production (7+ days).

### Q: Can I use Vite to build?
**A**: Currently unused (Netlify publishes raw `public/`).  
**After PR**: Still unused (no change).  
**Future**: Phase 3+ of migration plan.

### Q: Is the code slowing down VS Code?
**A**: Not with this PR.  
**Why**: `.vscode/settings.json` excludes large directories.  
**Action**: None needed (auto-applied).

### Q: When can I edit public/script.js?
**A**: Only with architect approval.  
**Why**: 9187 lines, ALL v1 logic, direct production traffic.  
**Better**: Fix bugs in v2 (`src2/`), cut over later.

### Q: Where's the old code?
**A**: 
- **v1** (active): `public/` folder
- **v2** (dev): `src2/` folder
- **Dead**: `src/` folder (scheduled for deletion)

---

## 🎯 What Changed In This PR?

### New Files
- `docs/PROJECT_MAP.md` — Architecture docs
- `docs/DO_NOT_EDIT.md` — Governance docs
- `docs/CORE_MIGRATION_PLAN.md` — Migration roadmap
- `.vscode/settings.json` — VS Code optimization

### Modified Files
- `public/index.html` — Comment header only (code unchanged)
- `public/script.js` — Comment header only (code unchanged)
- `public/sw.js` — Comment header only (code unchanged)
- `.gitignore` — Allow `.vscode/settings.json` tracking

### No Changes
- ❌ No code logic changes
- ❌ No runtime behavior changes
- ❌ No deploy config changes
- ❌ No build pipeline changes

---

## ✅ Safe to Merge?

**Yes**, this PR:
- ✅ Only adds documentation
- ✅ Only adds comments to frozen files
- ✅ Only adds VS Code optimization
- ✅ ZERO production risk
- ✅ ZERO code logic changes

**Rollback**: One `git revert`, done.

---

## 📞 Need Help?

- **Architecture questions**: `docs/PROJECT_MAP.md`
- **Frozen files**: `docs/DO_NOT_EDIT.md`
- **Migration plan**: `docs/CORE_MIGRATION_PLAN.md`
- **VS Code slow**: See "Quick Decisions" above
- **Contact**: @architect (Slack)

---

**Welcome to XemGiaDat!** 🗺️  
You now know the architecture. Happy coding! 🚀
