# QUICK REFERENCE — After This PR Merges

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
