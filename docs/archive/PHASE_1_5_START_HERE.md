# 🎯 PHASE 1.5 MANUAL VERIFICATION — START HERE

## 📍 Quick Links

| Document | Purpose | Time |
|----------|---------|------|
| **[PHASE_1_5_DELIVERY.md](PHASE_1_5_DELIVERY.md)** | Overview + build status | 5 min read |
| **[PHASE_1_5_FINAL_STATUS.md](PHASE_1_5_FINAL_STATUS.md)** | Detailed technical status | 10 min read |
| **[docs/CHECKLIST_RAPID_VERIFY.md](docs/CHECKLIST_RAPID_VERIFY.md)** | ⭐ **Your Manual Tests** (DO THIS) | 15 min test |
| **[docs/POWERSHELL_SNIPPETS.md](docs/POWERSHELL_SNIPPETS.md)** | PowerShell commands (ref only) | As needed |
| **scripts/collect-v2-verify.ps1** | Run for test instructions | 1 min |

---

## 🛣️ V2 Route Verification (FROZEN)

**Development**:
- Entry: `http://localhost:5173/v2.html` ✅
- File: [public/v2.html](public/v2.html)
- Vite dev server serves from root, maps to `/v2.html`

**Production**:
- Entry: `{domain}/v2-dist/v2.html` ✅
- Files: 
  - [public/v2-dist/v2.html](public/v2-dist/v2.html) (HTML wrapper)
  - [public/v2-dist/index.html](public/v2-dist/index.html) (redirect to v2.html)
- Built bundles: [public/v2-dist/assets/v2-*.js](public/v2-dist/assets/v2-core-styles-cK6RNT_b.css) etc.

**Routes Frozen**: No new v2.html files or redirects until Phase 2 approved.

---

## 🚀 What You Need To Do

### Step 1: Run Test Instructions (1 min)
```powershell
# In PowerShell:
.\scripts\collect-v2-verify.ps1
```
Prints formatted test instructions → copy to follow.

### Step 2: Read Overview (5 min)
Open [PHASE_1_5_DELIVERY.md](PHASE_1_5_DELIVERY.md) for quick summary.

### Step 3: Execute Tests (15 min)
Follow [docs/CHECKLIST_RAPID_VERIFY.md](docs/CHECKLIST_RAPID_VERIFY.md):
- **TEST 1**: Normal map load (5 min)
- **TEST 2**: Fallback map load (5 min)  
- **TEST 3**: Mobile modal (5 min)

### Step 4: Report Results
Copy results template from test checklist:
- ✅ ALL PASS → Proceed to Phase 2 🚀
- ⚠️ FAIL → Apply hotfix + re-test 🔧

---

## ✅ What Was Completed (Phase 1)

**Code**: 7 fixes across 4 files ✓  
**Build**: npm run build PASS ✓  
**Docs**: 4 comprehensive guides ✓  
**Safety**: Idempotency + error handling + guards ✓  

---

## 📊 The [VERIFY] Format (Tests 1 & 2)

Every map test shows ONE console line:
```
[VERIFY] style=demo source=yes layers=yes/yes/yes rendered=200
```

**Just copy-paste this line** into your results template!

**Fields**:
- `style`: `demo` (normal) or `rasterFallback` (OSM)
- `source`: `yes` (parcels loaded) or `no`
- `layers`: Three `/`-separated values (fill/outline/highlight, each `yes` or `no`)
- `rendered`: Number of parcels in viewport (should be >0)

---



## 🎓 Context

| Phase | What | Status |
|-------|------|--------|
| Phase 1 | Code fixes | ✅ DONE |
| **Phase 1.5** | **Manual tests** | **⏳ YOUR TURN** |
| Phase 2 | UI polish | ⏱️ After Phase 1.5 |

---

## 🏃 Quick Start

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Open browser
# http://localhost:5173/v2.html?debug=1
```

Then follow [docs/CHECKLIST_RAPID_VERIFY.md](docs/CHECKLIST_RAPID_VERIFY.md)!

---

**Ready?** Open [docs/CHECKLIST_RAPID_VERIFY.md](docs/CHECKLIST_RAPID_VERIFY.md) and run TEST 1 👉
