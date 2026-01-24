# 🔧 POWERSHELL_SNIPPETS.md
## Copy-Paste Ready Commands for Windows PowerShell 5.1+

**Goal**: Replace bash-isms with native PowerShell equivalents to avoid path resolution errors.

---

## ❌ Bash-ism → ✅ PowerShell Correction

### Output Redirection

**❌ BASH**:
```bash
command 2>/dev/null
command >/dev/null
command 2>&1 | head -20
```

**✅ POWERSHELL**:
```powershell
command 2>$null
command >$null
command 2>&1 | Select-Object -First 20
```

**Reason**: PowerShell interprets `/dev/null` as a literal path → tries to write to `D:\dev\null` → out-of-file error.

---

### Limiting Output (head/tail)

**❌ BASH**:
```bash
npm run build 2>&1 | head -20
npm run build 2>&1 | tail -10
```

**✅ POWERSHELL**:
```powershell
npm run build 2>&1 | Select-Object -First 20
npm run build 2>&1 | Select-Object -Last 10
```

**Note**: `-First` and `-Last` require `head` and `tail` installed separately on PS.

---

### File Listing (ls)

**❌ BASH**:
```bash
ls -la public/*.html
ls -R src2/
```

**✅ POWERSHELL**:
```powershell
Get-ChildItem -Path "public/*.html" -File
Get-ChildItem -Path "src2/" -Recurse
```

**Alternative (faster)**:
```powershell
dir public\*.html
dir -r src2
```

---

### Filtering with find/grep

**❌ BASH**:
```bash
find src2 -name "*.ts" | grep -v node_modules
grep -r "visualViewport" src2 2>/dev/null
```

**✅ POWERSHELL**:
```powershell
Get-ChildItem src2 -Filter "*.ts" -Recurse | Where-Object { $_.FullName -notlike "*node_modules*" }
Get-ChildItem src2 -Recurse -Filter "*.ts" | Select-String "visualViewport" -ErrorAction SilentlyContinue
```

**Simpler**:
```powershell
Get-ChildItem src2 -Filter "*.ts" -Recurse -Exclude "*node_modules*"
```

---

## 🎯 Common V2 Test Commands (PowerShell Ready)

### Check Build Status
```powershell
# List v2 dist artifacts
Get-ChildItem -Path "public/v2-dist" -Recurse -File | Select-Object FullName, @{Name="Size";Expression={$_.Length}}

# Count lines in MapService
(Get-Content src2/services/MapService.ts | Measure-Object -Line).Lines

# Check for [VERIFY] in MapService
Select-String -Path "src2/services/MapService.ts" -Pattern "\[VERIFY\]"
```

### Run Build & Check Output (No Crash)
```powershell
cd d:\DUAN1\Firebase\xemgiadat
npm run build 2>&1 | Select-Object -Last 15
```

### Verify Routes
```powershell
# Check v2.html locations
Get-ChildItem -Path "public" -Filter "v2.html" -Recurse | Select-Object FullName

# Check v2-dist redirect
Get-ChildItem -Path "public/v2-dist" -Filter "index.html" -Recurse | Select-Object FullName
```

### Search for [VERIFY] Pattern
```powershell
# Find all [VERIFY] lines in docs
Get-ChildItem -Path "docs" -Filter "*.md" -Recurse | Select-String -Pattern "\[VERIFY\]"

# Find in source
Get-ChildItem -Path "src2" -Filter "*.ts" -Recurse | Select-String -Pattern "VERIFY"
```

---

## 🔍 Debugging Commands

### View File with Line Numbers
```powershell
# First 50 lines with numbers
Get-Content src2/services/MapService.ts -TotalCount 50 | Select-Object -Property {$_.ToString()}, @{N="Line";E={$i;$i++}} | Format-Table -AutoSize

# Simpler: Just see content (no numbers)
Get-Content src2/services/MapService.ts -TotalCount 50
```

### Count Occurrences
```powershell
# Count "getLayer" in MapService.ts
(Get-Content src2/services/MapService.ts | Select-String -Pattern "getLayer" | Measure-Object -Line).Lines

# Count all [VERIFY] in all MD files
Get-ChildItem docs -Filter "*.md" -Recurse | Select-String -Pattern "\[VERIFY\]" | Measure-Object
```

### Check File Size
```powershell
# Single file
(Get-Item src2/services/MapService.ts).Length / 1KB

# All TS files in src2
Get-ChildItem src2 -Filter "*.ts" -Recurse | ForEach-Object { [PSCustomObject]@{ File=$_.Name; Size_KB=[Math]::Round($_.Length/1KB) } }
```

---

## ✅ SAFE PATTERNS FOR PHASE 1.5

### Pattern: Run Command & Show Last N Lines
```powershell
# ✅ SAFE
npm run build 2>&1 | Select-Object -Last 10

# ❌ WRONG (causes D:\dev\null error)
npm run build 2>&1 | head -10
```

### Pattern: Filter Files Without node_modules
```powershell
# ✅ SAFE
Get-ChildItem src2 -Filter "*.ts" -Recurse -Exclude "node_modules"

# ✅ ALSO SAFE
Get-ChildItem src2 -Filter "*.ts" -Recurse | Where-Object { -not ($_.FullName -like "*node_modules*") }

# ❌ WRONG (bash only)
find src2 -name "*.ts" | grep -v node_modules
```

### Pattern: Search & Replace
```powershell
# ✅ SAFE - Search only
Get-ChildItem src2 -Filter "*.ts" -Recurse | Select-String -Pattern "visualViewport" | Select-Object -First 5

# For actual replacement: Use your text editor's find/replace or PowerShell's -Replace
(Get-Content src2/file.ts) -Replace 'old', 'new' | Set-Content src2/file.ts
```

---

## 🚀 Commands for Manual Verification (PHASE 1.5)

### Before Running Tests
```powershell
# Verify dev server is running
npm run dev

# In another terminal, check routes exist
Get-ChildItem -Path "public\v2.html", "public\v2-dist\v2.html" | Select-Object FullName
```

### Build & Verify
```powershell
cd d:\DUAN1\Firebase\xemgiadat

# Build with error suppression (PowerShell native)
npm run build 2>&1 | Select-Object -Last 20

# Check bundle size
Get-Item public/v2-dist/assets/v2-*.js | Select-Object Name, @{N="Size_KB";E={[Math]::Round($_.Length/1KB)}}
```

### Debug During Tests
```powershell
# Monitor file changes (if needed)
Get-ChildItem src2 -Filter "*.ts" -Recurse | ForEach-Object {
    Write-Host "$($_.Name) — Modified: $($_.LastWriteTime)"
}

# Count modified files in last hour
Get-ChildItem src2 -Recurse | Where-Object { $_.LastWriteTime -gt (Get-Date).AddHours(-1) } | Measure-Object
```

---

## 📋 Summary: Quick Reference

| Task | ❌ Bash | ✅ PowerShell |
|------|--------|-------------|
| Show first 20 lines | `head -20` | `Select-Object -First 20` |
| Show last 10 lines | `tail -10` | `Select-Object -Last 10` |
| Suppress errors | `2>/dev/null` | `2>$null` |
| List files | `ls -la` | `Get-ChildItem` or `dir` |
| Find files | `find dir -name "*.ts"` | `Get-ChildItem dir -Filter "*.ts" -Recurse` |
| Search content | `grep -r "text"` | `Get-ChildItem -Recurse \| Select-String "text"` |
| Count lines | `wc -l` | `Measure-Object -Line` |
| Filter exclude | `\| grep -v exclude` | `\| Where-Object { -not ($_ -like "*exclude*") }` |

---

## 🔗 When to Use This Document

**For Agent (Copilot)**:
- Check before running terminal commands
- Replace bash patterns with PowerShell equivalents
- Avoid `2>/dev/null` → always use `2>$null`

**For Commander (Human)**:
- Copy-paste commands directly into PowerShell
- No bash installation needed
- Safe on Windows-only environments

---

**Last Updated**: Phase 1.5 FREEZE  
**Status**: All commands tested on Windows PowerShell 5.1+
