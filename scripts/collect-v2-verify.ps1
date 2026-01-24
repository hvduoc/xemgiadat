# collect-v2-verify.ps1
# PHASE 1.5 MANUAL VERIFY HARNESS
# Commander runs this to get instructions for manual testing
# Provides: 3 URLs + console filter tips + copy-paste template

Write-Host "`n" -ForegroundColor Green
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║         PHASE 1.5 MANUAL VERIFICATION HARNESS                 ║" -ForegroundColor Green
Write-Host "║                  Copy-Paste Instructions                       ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# Start dev server check
Write-Host "📋 STEP 0: Ensure Dev Server is Running" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "In Terminal 1, run:" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "Wait for: 'Local: http://localhost:5173/v2.html'" -ForegroundColor White
Write-Host ""

# Test 1: MAP_BASE
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "🧪 TEST 1: MAP_BASE (5 min)" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host ""
Write-Host "1️⃣  Open Browser:" -ForegroundColor White
Write-Host "   http://localhost:5173/v2.html?debug=1" -ForegroundColor Yellow
Write-Host ""
Write-Host "2️⃣  Open DevTools:" -ForegroundColor White
Write-Host "   Press: F12 → Console tab" -ForegroundColor Yellow
Write-Host ""
Write-Host "3️⃣  Filter Console:" -ForegroundColor White
Write-Host "   Type in filter box: [VERIFY]" -ForegroundColor Yellow
Write-Host "   (You should see ONE line starting with [VERIFY])" -ForegroundColor White
Write-Host ""
Write-Host "4️⃣  Copy This Line:" -ForegroundColor White
Write-Host "   Format: [VERIFY] style=demo source=yes layers=yes/yes/yes rendered=200" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Expected: All 'yes' values + rendered > 0" -ForegroundColor Green
Write-Host ""
Write-Host "📝 PASTE YOUR [VERIFY] LINE HERE:" -ForegroundColor Magenta
Write-Host "   TEST 1: [VERIFY] ___________________________________" -ForegroundColor Gray
Write-Host ""

# Test 2: MAP_FALLBACK
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "🧪 TEST 2: MAP_FALLBACK (5 min)" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host ""
Write-Host "1️⃣  Open Same Browser Window:" -ForegroundColor White
Write-Host "   http://localhost:5173/v2.html?debug=1&rasterFallback=1" -ForegroundColor Yellow
Write-Host ""
Write-Host "2️⃣  DevTools → Network Tab:" -ForegroundColor White
Write-Host "   - Find any request to 'demotiles.maplibre.org'" -ForegroundColor Yellow
Write-Host "   - Right-click → 'Block request domain'" -ForegroundColor Yellow
Write-Host ""
Write-Host "3️⃣  Reload Page:" -ForegroundColor White
Write-Host "   Press: Ctrl+R (page reload)" -ForegroundColor Yellow
Write-Host "   Watch: Network tab shows demotiles blocked (red X)" -ForegroundColor White
Write-Host ""
Write-Host "4️⃣  Wait 3-5 seconds, then check Console:" -ForegroundColor White
Write-Host "   Filter: [VERIFY]" -ForegroundColor Yellow
Write-Host "   Copy the [VERIFY] line (should have 'style=rasterFallback')" -ForegroundColor White
Write-Host ""
Write-Host "✅ Expected: 'style=rasterFallback' + all 'yes' + NO duplicate errors" -ForegroundColor Green
Write-Host ""
Write-Host "📝 PASTE YOUR [VERIFY] LINE HERE:" -ForegroundColor Magenta
Write-Host "   TEST 2: [VERIFY] ___________________________________" -ForegroundColor Gray
Write-Host ""

# Test 3: MODAL_MOBILE
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "🧪 TEST 3: MODAL_MOBILE (5 min)" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host ""
Write-Host "1️⃣  Open New Browser Window:" -ForegroundColor White
Write-Host "   http://localhost:5173/v2.html" -ForegroundColor Yellow
Write-Host ""
Write-Host "2️⃣  Enable Device Toolbar:" -ForegroundColor White
Write-Host "   DevTools → Press Ctrl+Shift+M (or click 📱 icon)" -ForegroundColor Yellow
Write-Host ""
Write-Host "3️⃣  Test Device 1: Pixel 7 (412×915)" -ForegroundColor White
Write-Host "   - Select: 'Pixel 7' from device dropdown" -ForegroundColor Yellow
Write-Host "   - Click any parcel on map (blue/teal area)" -ForegroundColor Yellow
Write-Host "   - Panel opens on right → Click 'Đăng tin' button" -ForegroundColor Yellow
Write-Host "   - Modal opens" -ForegroundColor Yellow
Write-Host "   - Scroll down in modal" -ForegroundColor Yellow
Write-Host "   - CHECK: 'Tạo tin' CTA button visible at bottom?" -ForegroundColor White
Write-Host "   - Focus last text field (triggers virtual keyboard)" -ForegroundColor Yellow
Write-Host "   - CHECK: CTA STILL visible + clickable?" -ForegroundColor White
Write-Host ""
Write-Host "4️⃣  Test Device 2: Custom 360×740" -ForegroundColor White
Write-Host "   - Device Toolbar → Select 'Edit' or '+' button" -ForegroundColor Yellow
Write-Host "   - Set dimensions: 360 × 740" -ForegroundColor Yellow
Write-Host "   - Repeat steps 3 checks" -ForegroundColor Yellow
Write-Host ""
Write-Host "✅ Expected: CTA visible on both devices + clickable + single scroll only" -ForegroundColor Green
Write-Host ""
Write-Host "📝 PASTE RESULTS HERE:" -ForegroundColor Magenta
Write-Host "   TEST 3 (412×915): PASS / FAIL  [note if CTA hidden by keyboard/footer]" -ForegroundColor Gray
Write-Host "   TEST 3 (360×740): PASS / FAIL  [note if CTA hidden]" -ForegroundColor Gray
Write-Host ""

# Summary
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📋 RESULTS TEMPLATE (Copy & Fill)" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "TEST 1: MAP_BASE" -ForegroundColor White
Write-Host "[VERIFY] ___________________________________________________________" -ForegroundColor Yellow
Write-Host ""
Write-Host "TEST 2: MAP_FALLBACK" -ForegroundColor White
Write-Host "[VERIFY] ___________________________________________________________" -ForegroundColor Yellow
Write-Host ""
Write-Host "TEST 3: MODAL_MOBILE" -ForegroundColor White
Write-Host "  Device 412×915: [ PASS / FAIL ]  Issue: _____________________" -ForegroundColor Yellow
Write-Host "  Device 360×740: [ PASS / FAIL ]  Issue: _____________________" -ForegroundColor Yellow
Write-Host ""
Write-Host "OVERALL: [ ✅ ALL PASS / ⚠️  NEEDS HOTFIX ]" -ForegroundColor Magenta
Write-Host ""

# Next steps
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🎯 NEXT STEPS" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Run the 3 tests above (total 15 min)" -ForegroundColor White
Write-Host "2. Copy your results into template above" -ForegroundColor White
Write-Host "3. Paste in next message to Commander" -ForegroundColor White
Write-Host "4. If ALL PASS → Phase 2 approved 🚀" -ForegroundColor Green
Write-Host "5. If FAIL → Hotfix only that test 🔧" -ForegroundColor Yellow
Write-Host ""

# Reference docs
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📚 REFERENCE DOCS" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "Detailed test guide:" -ForegroundColor White
Write-Host "  docs/CHECKLIST_RAPID_VERIFY.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "What was fixed:" -ForegroundColor White
Write-Host "  PHASE_1_5_FINAL_STATUS.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "Technical details:" -ForegroundColor White
Write-Host "  docs/V2_UX_MODAL_FIX_REPORT.md" -ForegroundColor Cyan
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "✅ Ready to test? Start with TEST 1 above! 🚀" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host ""
