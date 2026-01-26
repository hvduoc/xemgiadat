# PowerShell Production Verification Script
# Usage: .\scripts\verify-prod.ps1
# 
# Verifies: Endpoints, Content-Types, Redirects, Service Worker

$ErrorActionPreference = "Continue"
$BaseUrl = "https://xemgiadat.com"

Write-Host "`n" -NoNewline
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          XEMGIADAT PRODUCTION VERIFICATION                   ║" -ForegroundColor Cyan
Write-Host "║          Build Sheriff - Evidence-Based Check                ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host "`nTarget: $BaseUrl" -ForegroundColor Yellow
Write-Host "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n" -ForegroundColor Gray

$results = @()
$passed = 0
$failed = 0

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [string]$ExpectedType,
        [int]$ExpectedStatus = 200
    )
    
    Write-Host "[$Name]" -ForegroundColor White -NoNewline
    Write-Host " $Url" -ForegroundColor Gray
    
    try {
        $response = Invoke-WebRequest -Uri $Url -Method GET -UseBasicParsing -TimeoutSec 15 -MaximumRedirection 0 -ErrorAction SilentlyContinue
        $status = $response.StatusCode
        $contentType = $response.Headers["Content-Type"]
        $cacheControl = $response.Headers["Cache-Control"]
        
        $typeMatch = $contentType -match $ExpectedType
        $statusMatch = $status -eq $ExpectedStatus
        $isHtmlWhenShouldntBe = ($contentType -match "text/html") -and -not ($ExpectedType -match "text/html")
        
        if ($statusMatch -and $typeMatch -and -not $isHtmlWhenShouldntBe) {
            Write-Host "  ✅ PASS" -ForegroundColor Green
            Write-Host "     Status: $status | Type: $contentType" -ForegroundColor DarkGray
            Write-Host "     Cache: $cacheControl" -ForegroundColor DarkGray
            $script:passed++
            return @{ Name = $Name; Status = "PASS"; Code = $status; Type = $contentType; Cache = $cacheControl }
        } else {
            Write-Host "  ❌ FAIL" -ForegroundColor Red
            Write-Host "     Status: $status (expected $ExpectedStatus)" -ForegroundColor Red
            Write-Host "     Type: $contentType (expected $ExpectedType)" -ForegroundColor Red
            if ($isHtmlWhenShouldntBe) {
                Write-Host "     ⚠️  P0 BUG: Asset served as HTML!" -ForegroundColor Yellow
            }
            $script:failed++
            return @{ Name = $Name; Status = "FAIL"; Code = $status; Type = $contentType; Cache = $cacheControl }
        }
    }
    catch {
        # Handle redirects
        if ($_.Exception.Response.StatusCode -eq 301 -or $_.Exception.Response.StatusCode -eq 302) {
            $redirectStatus = [int]$_.Exception.Response.StatusCode
            if ($ExpectedStatus -eq 301 -or $ExpectedStatus -eq 302) {
                Write-Host "  ✅ PASS (Redirect $redirectStatus)" -ForegroundColor Green
                $script:passed++
                return @{ Name = $Name; Status = "PASS"; Code = $redirectStatus; Type = "redirect"; Cache = "" }
            }
        }
        Write-Host "  ❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
        $script:failed++
        return @{ Name = $Name; Status = "ERROR"; Code = 0; Type = "N/A"; Cache = "" }
    }
}

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host "1. CORE ENDPOINTS" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor DarkGray

$results += Test-Endpoint -Name "Homepage (Legacy SPA)" -Url "$BaseUrl/" -ExpectedType "text/html"
$results += Test-Endpoint -Name "Health Check" -Url "$BaseUrl/health.txt" -ExpectedType "text/plain"
$results += Test-Endpoint -Name "V2 App" -Url "$BaseUrl/v2/" -ExpectedType "text/html"

Write-Host "`n═══════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host "2. JAVASCRIPT ASSETS" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor DarkGray

$results += Test-Endpoint -Name "Legacy script.js" -Url "$BaseUrl/script.js" -ExpectedType "text/javascript|application/javascript"
$results += Test-Endpoint -Name "Legacy maxa_list.js" -Url "$BaseUrl/maxa_list.js" -ExpectedType "text/javascript|application/javascript"
$results += Test-Endpoint -Name "PMTiles Adapter" -Url "$BaseUrl/js/adapters/PMTilesAdapter.js" -ExpectedType "text/javascript|application/javascript"

Write-Host "`n═══════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host "3. CSS ASSETS" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor DarkGray

$results += Test-Endpoint -Name "Legacy style.css" -Url "$BaseUrl/style.css" -ExpectedType "text/css"

Write-Host "`n═══════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host "4. TILES & DATA" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor DarkGray

$results += Test-Endpoint -Name "Tiles Metadata" -Url "$BaseUrl/tiles/metadata.json" -ExpectedType "application/json"
$results += Test-Endpoint -Name "PMTiles File" -Url "$BaseUrl/tiles/danang_parcels_final.pmtiles" -ExpectedType "application/octet-stream|application/x-protobuf"

Write-Host "`n═══════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host "5. PWA & MANIFEST" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor DarkGray

$results += Test-Endpoint -Name "Service Worker" -Url "$BaseUrl/sw.js" -ExpectedType "text/javascript|application/javascript"
$results += Test-Endpoint -Name "Manifest" -Url "$BaseUrl/manifest.json" -ExpectedType "application/.*json"
$results += Test-Endpoint -Name "Robots.txt" -Url "$BaseUrl/robots.txt" -ExpectedType "text/plain"

Write-Host "`n═══════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host "6. SHARE & DEEP-LINK" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor DarkGray

$results += Test-Endpoint -Name "OG Share Page" -Url "$BaseUrl/og.html" -ExpectedType "text/html"
# Test deep-link parameter handling (should return same HTML)
$results += Test-Endpoint -Name "Deep-link with coords" -Url "$BaseUrl/?lat=16.05&lng=108.20" -ExpectedType "text/html"

Write-Host "`n═══════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host "7. REDIRECTS" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor DarkGray

$results += Test-Endpoint -Name "/v2 → /v2/ redirect" -Url "$BaseUrl/v2" -ExpectedType "redirect" -ExpectedStatus 301

# ═══════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════

Write-Host "`n"
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                        SUMMARY                               ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

Write-Host "  Passed: $passed" -ForegroundColor Green
Write-Host "  Failed: $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })
Write-Host "  Total:  $($results.Count)" -ForegroundColor White

# ═══════════════════════════════════════════════════════════════
# HEALTH CHECK CONTENT
# ═══════════════════════════════════════════════════════════════

Write-Host "`n─────────────────────────────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host "BUILD STAMP (health.txt):" -ForegroundColor Yellow
try {
    $healthContent = (Invoke-WebRequest -Uri "$BaseUrl/health.txt" -UseBasicParsing -TimeoutSec 5).Content
    Write-Host $healthContent -ForegroundColor DarkGray
}
catch {
    Write-Host "  Could not fetch health.txt" -ForegroundColor Red
}

# ═══════════════════════════════════════════════════════════════
# SERVICE WORKER CHECK
# ═══════════════════════════════════════════════════════════════

Write-Host "`n─────────────────────────────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host "SERVICE WORKER VERSION:" -ForegroundColor Yellow
try {
    $swContent = (Invoke-WebRequest -Uri "$BaseUrl/sw.js" -UseBasicParsing -TimeoutSec 5).Content
    if ($swContent -match "CACHE_VERSION\s*=\s*['""]([^'""]+)['""]") {
        Write-Host "  CACHE_VERSION = '$($Matches[1])'" -ForegroundColor DarkGray
    }
    if ($swContent -match "\[VERIFY SW\]") {
        Write-Host "  ✅ [VERIFY SW] log present" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  [VERIFY SW] log missing" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "  Could not fetch sw.js" -ForegroundColor Red
}

# ═══════════════════════════════════════════════════════════════
# FINAL RESULT
# ═══════════════════════════════════════════════════════════════

Write-Host "`n"
if ($failed -gt 0) {
    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Red
    Write-Host "║  ❌ VERIFICATION FAILED - Issues detected!                   ║" -ForegroundColor Red
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Red
    exit 1
} else {
    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║  ✅ VERIFICATION PASSED - All checks OK!                     ║" -ForegroundColor Green
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    exit 0
}
