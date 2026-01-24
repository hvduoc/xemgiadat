# DO_NOT_EDIT — Critical Production Files

**Status**: 🟢 FROZEN LEGACY  
**Last Modified**: January 19, 2026  
**Reason**: Direct production traffic, high risk of breakage

---

## 🚨 FROZEN FILES (Do Not Edit Without Approval)

The following files serve live production traffic. **Any change requires:**
1. ✅ Peer review (minimum 1 approval)
2. ✅ Staging test (verify on staging environment)
3. ✅ Production backup (git commit before merge)
4. ✅ Rollback plan documented

### Tier 1: Critical (Highest Risk)

| File | Lines | Role | Status | Risk |
|------|-------|------|--------|------|
| `public/script.js` | 9,187 | **Main Runtime** | 🔴 FROZEN | 🔴 CRITICAL |
| `public/index.html` | 1,731 | **Entry Point** | 🔴 FROZEN | 🔴 CRITICAL |
| `netlify.toml` | 142 | **Deploy Config** | 🔴 FROZEN | 🔴 CRITICAL |

**Why Frozen**: All v1 logic lives here. One typo = entire site breaks.

---

### Tier 2: Important (Medium Risk)

| File | Role | Status | Risk |
|------|------|--------|------|
| `public/sw.js` | Service Worker & offline | 🟡 CAREFUL | 🟡 MEDIUM |
| `public/pwa-enhancements.js` | PWA caching | 🟡 CAREFUL | 🟡 MEDIUM |
| `netlify/functions/*.js` | Backend APIs | 🟡 CAREFUL | 🟡 MEDIUM |
| `package.json` | Dependencies | 🟡 CAREFUL | 🟡 MEDIUM |

**Why Careful**: Changes can break offline support, APIs, or builds.

---

## ✅ SAFE TO EDIT

| Category | Files | Why Safe |
|----------|-------|----------|
| **Development** | `src2/**` | Not deployed yet |
| **Documentation** | `docs/**` | No code impact |
| **Configuration** | `.vscode/`, `.gitignore` | Dev environment only |
| **Testing** | `tests/` | Isolated test files |
| **Orphaned** | `src/` (after cleanup) | Never deployed |

---

## 📋 If You Need to Edit a FROZEN File

### Scenario: Bug in public/script.js

**Step 1: Get Approval**
```
Message on Slack/PR:
"Need to fix bug in public/script.js line 4521 (geocoding crash).
Approval from @architect required before merge."
```

**Step 2: Create PR with:**
- ✅ Clear description of change
- ✅ Line numbers + reason
- ✅ Before/after behavior
- ✅ Test results

**Step 3: Testing**
```bash
# 1. Build locally
npm run build

# 2. Test locally
npm run dev

# 3. Check staging
# Deploy to staging → verify fix works
# Revert on staging if issues found
```

**Step 4: Merge**
- Require minimum 1 approval from architect
- Merge to main
- Trigger production deploy
- Monitor for 30 minutes

**Step 5: Rollback Plan**
```bash
# If production breaks:
git revert <commit-hash>
git push
# Trigger redeploy
```

---

## 🔴 DO NOT TOUCH (Unless You're The Architect)

| Thing | Reason |
|-------|--------|
| Change `netlify.toml` publish dir | Breaks all deploys |
| Delete `public/tiles/danang_parcels_final.pmtiles` | Map data gone |
| Format/rewrite `public/script.js` | Risk of hidden bugs |
| Rename `public/index.html` → something else | Routing breaks |
| Change `firebase` config in public/script.js | Auth/DB broken |

---

## 🟢 MIGRATION STRATEGY (Don't Try Fixes Here)

Instead of fixing v1 bugs:
1. Document the bug in issue
2. Add fix to v2 in `src2/`
3. Test v2 thoroughly
4. Cut over to v2 when ready

**Why?** v1 is on life support. v2 is the future.

See: [CORE_MIGRATION_PLAN.md](CORE_MIGRATION_PLAN.md)

---

## 📞 Questions?

- **What can I edit?**: See [PROJECT_MAP.md](PROJECT_MAP.md#-file-edit-guidelines)
- **How do I add features?**: Implement in `src2/`, test at `/v2`
- **Bug in production?**: Create issue, label `production-bug`
- **Need emergency fix?**: Contact @architect in Slack

---

## Approval Checklist

Before merging ANY change to frozen files:

- [ ] Change has clear business reason
- [ ] Code reviewed by 1+ team member
- [ ] Tested on local/staging (not just local)
- [ ] No unrelated changes mixed in
- [ ] Rollback plan documented
- [ ] Architecture approved
- [ ] No formatting/line-ending changes (code-only)

---

**Last Updated**: 2026-01-19  
**Next Review**: 2026-02-19
