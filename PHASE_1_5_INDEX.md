# 📌 PHASE_1_5_INDEX.md
## Quick Reference — All Phase 1.5 Documents

**Status**: 🔒 FREEZE | 🧪 MANUAL VERIFY READY

---

## 📋 For Commander (Execute Tests Now)

**START HERE**:
1. **Run** [scripts/collect-v2-verify.ps1](scripts/collect-v2-verify.ps1)
   ```powershell
   .\scripts\collect-v2-verify.ps1
   ```
   → Prints formatted test instructions (1 min)

2. **Execute** 3 manual tests (15 min):
   - TEST 1: MAP_BASE (5 min) — Copy 1 [VERIFY] line
   - TEST 2: MAP_FALLBACK (5 min) — Copy 1 [VERIFY] line
   - TEST 3: MODAL_MOBILE (5 min) — Report 2 device results

3. **Report** results in next message:
   ```
   TEST 1: [VERIFY] style=demo source=yes layers=yes/yes/yes rendered=200
   TEST 2: [VERIFY] style=rasterFallback source=yes layers=yes/yes/yes rendered=180
   TEST 3 (412×915): PASS
   TEST 3 (360×740): PASS
   ```

4. **Receive** decision (Phase 2 approved or hotfix request)

---

## 📚 Documentation Map

### Immediate (Commander)
| File | Purpose | Time | Action |
|------|---------|------|--------|
| **[scripts/collect-v2-verify.ps1](scripts/collect-v2-verify.ps1)** | Test instructions | 1 min | RUN THIS FIRST |
| **[PHASE_1_5_START_HERE.md](PHASE_1_5_START_HERE.md)** | Quick links + routes | 3 min | Read after script |

### Reference (Commander/Agent)
| File | Purpose | Time | When to Use |
|------|---------|------|------------|
| **[PHASE_1_5_DELIVERY.md](PHASE_1_5_DELIVERY.md)** | Overview + build status | 5 min | Background context |
| **[PHASE_1_5_FINAL_STATUS.md](PHASE_1_5_FINAL_STATUS.md)** | Detailed technical report | 10 min | Deep-dive reference |
| **[docs/CHECKLIST_RAPID_VERIFY.md](docs/CHECKLIST_RAPID_VERIFY.md)** | Manual test guide (detailed) | 15 min | Backup if script unclear |

### Agent Reference (Copilot)
| File | Purpose | When to Use |
|------|---------|------------|
| **[docs/POWERSHELL_SNIPPETS.md](docs/POWERSHELL_SNIPPETS.md)** | PowerShell command reference | Before running terminal commands |
| **[PHASE_1_5_FREEZE_SUMMARY.md](PHASE_1_5_FREEZE_SUMMARY.md)** | What changed + freeze rules | Understanding phase scope |
| **[PHASE_1_5_FREEZE_DELIVERY.md](PHASE_1_5_FREEZE_DELIVERY.md)** | Complete delivery report (A+B+C) | Final verification checklist |

---

## 🎯 Quick Decision Tree

### If You're Commander
```
1. Have 15 minutes? 
   YES → Run .\scripts\collect-v2-verify.ps1
   NO → Read PHASE_1_5_START_HERE.md first
   
2. What's broken?
   Nothing → Report ALL PASS
   Test 1 → Check [VERIFY] format in docs/CHECKLIST_RAPID_VERIFY.md
   Test 2 → Check for "duplicate layer" errors in docs/V2_UX_MODAL_FIX_REPORT.md
   Test 3 → Check mobile CSS in docs/UX_MODAL_QA.md
```

### If You're Agent (Copilot)
```
1. Running terminal command?
   → Check docs/POWERSHELL_SNIPPETS.md first
   → Replace bash with PowerShell
   
2. Commander reports FAIL?
   → Open PHASE_1_5_FREEZE_SUMMARY.md (freeze rules)
   → Only hotfix specific line, re-test
   → Do NOT add features
   
3. All tests PASS?
   → Update PHASE_1_5_FREEZE_DELIVERY.md
   → Await Phase 2 commands
```

---

## 📊 File Status

### New Files (Phase 1.5)
- ✅ **scripts/collect-v2-verify.ps1** — Interactive test harness (150 lines)
- ✅ **docs/POWERSHELL_SNIPPETS.md** — Command reference (200 lines)
- ✅ **PHASE_1_5_FREEZE_SUMMARY.md** — What changed (250 lines)
- ✅ **PHASE_1_5_FREEZE_DELIVERY.md** — Complete report (400 lines)
- ✅ **PHASE_1_5_INDEX.md** — This file

### Updated Files (Phase 1.5)
- ✅ **PHASE_1_5_START_HERE.md** — Added routes + script ref
- ✅ **package.json** — Fixed bash-ism (1 line)
- ✅ **docs/SECURITY_AUDIT_20260120.md** — Fixed bash-ism (1 line)
- ✅ **PR7_SECURITY_POSTURE.md** — Fixed bash-ism (1 line)

### Unchanged (FROZEN)
- 🔒 All code files (src2/, public/)
- 🔒 Build config
- 🔒 Routes (no new entries)

---

## 🚀 Phase 1.5 Timeline

```
NOW:     Commander runs .\scripts\collect-v2-verify.ps1
↓
5 min:   Read test instructions on screen
↓
20 min:  Execute 3 tests (15 min tests + 5 min setup)
↓
22 min:  Report results (2 [VERIFY] lines + TEST 3 status)
↓
22+ min: Await decision
         ✅ ALL PASS → Phase 2 approved
         ⚠️  FAIL → Hotfix + re-test
```

---

## 📞 Key Contacts (Conceptual)

| Role | Action |
|------|--------|
| **Commander (Human)** | Run tests, report results |
| **Agent (Copilot)** | Fix code if needed, await instructions |
| **Build System** | npm run build — LOCKED until tests pass |

---

## ✅ Checklist Before Tests

- [x] Dev server ready (`npm run dev` works)
- [x] Chrome/Edge/Firefox available
- [x] DevTools accessible (F12 key works)
- [x] 15 minutes available for tests
- [x] Can copy-paste [VERIFY] console lines
- [x] Can take device screenshots (optional for TEST 3)

---

## 🛣️ Routes (FROZEN Confirmation)

**Dev Entry**: `http://localhost:5173/v2.html` ✅  
**Prod Entry**: `{domain}/v2-dist/v2.html` ✅  
**No new routes until Phase 1.5 PASS** 🔒

---

## 📋 Results Template (Copy-Paste Ready)

```
TEST 1: [VERIFY] _____________________________________________________

TEST 2: [VERIFY] _____________________________________________________

TEST 3 (412×915): [ PASS / FAIL ] Issue: ____________________________

TEST 3 (360×740): [ PASS / FAIL ] Issue: ____________________________

OVERALL: [ ✅ ALL PASS / ⚠️ NEEDS HOTFIX ]
```

---

**Next**: Run `.\scripts\collect-v2-verify.ps1` → Follow instructions → Report results! 🚀
