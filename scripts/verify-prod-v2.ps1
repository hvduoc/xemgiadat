#!/usr/bin/env pwsh
# =============================================================================
# XEMGIADAT V2 PRODUCTION VERIFICATION SCRIPT
# Run after every deploy to detect regression
# Expected runtime: < 5 minutes
# =============================================================================

$ErrorActionPreference = "Stop"
$PROD_URL = "https://xemgiadat.com"
$PASS = 0
$FAIL = 0

function Test-Endpoint {
    param(
        [string]$Url,
        [string]$Description,
        [int]$ExpectedStatus = 200,
        [string]$ExpectedContentType = $null,
        [string]$ExpectedCacheControl = $null,
        [string]$MustContain = $null
    )
    
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -MaximumRedirection 0 -ErrorAction SilentlyContinue
        $status = $response.StatusCode
    } catch {
        if ($_.Exception.Response) {
            $status = [int]$_.Exception.Response.StatusCode
        } else {
            Write-Host "❌ FAIL: $Description - Connection failed" -ForegroundColor Red
            $script:FAIL++
            return
        }
    }
    
    # Check status
    if ($status -ne $ExpectedStatus) {
        Write-Host "❌ FAIL: $Description - Expected $ExpectedStatus, got $status" -ForegroundColor Red
        $script:FAIL++
        return
    }
    
    # Check content type
    if ($ExpectedContentType -and $response.Headers["Content-Type"] -notlike "*$ExpectedContentType*") {
        Write-Host "❌ FAIL: $Description - Wrong Content-Type: $($response.Headers['Content-Type'])" -ForegroundColor Red
        $script:FAIL++
        return
    }
    
    # Check cache control
    if ($ExpectedCacheControl -and $response.Headers["Cache-Control"] -notlike "*$ExpectedCacheControl*") {
        Write-Host "❌ FAIL: $Description - Wrong Cache-Control: $($response.Headers['Cache-Control'])" -ForegroundColor Red
        $script:FAIL++
        return
    }
    
    # Check content contains
    if ($MustContain -and $response.Content -notlike "*$MustContain*") {
        Write-Host "❌ FAIL: $Description - Content missing: $MustContain" -ForegroundColor Red
        $script:FAIL++
        return
    }
    
    Write-Host "✅ PASS: $Description" -ForegroundColor Green
    $script:PASS++
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " XEMGIADAT V2 PRODUCTION VERIFICATION" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ------------------------------------------------------------------------------
# PHASE 1: Core Routes (10 refresh test)
# ------------------------------------------------------------------------------
Write-Host "--- PHASE 1: Core Route Consistency ---" -ForegroundColor Yellow

for ($i = 1; $i -le 10; $i++) {
    $timestamp = Get-Date -Format "HH:mm:ss"
    try {
        $response = Invoke-WebRequest -Uri "$PROD_URL/v2/" -UseBasicParsing
        if ($response.Content -like "*XemGiaDat v2*" -or $response.Content -like "*maplibre*") {
            Write-Host "  [$timestamp] Refresh $i/10: ✅ V2 detected" -ForegroundColor Green
            $PASS++
        } else {
            Write-Host "  [$timestamp] Refresh $i/10: ❌ Got legacy or wrong content" -ForegroundColor Red
            $FAIL++
        }
    } catch {
        Write-Host "  [$timestamp] Refresh $i/10: ❌ Request failed" -ForegroundColor Red
        $FAIL++
    }
    Start-Sleep -Milliseconds 500
}

# ------------------------------------------------------------------------------
# PHASE 2: Endpoint Verification
# ------------------------------------------------------------------------------
Write-Host ""
Write-Host "--- PHASE 2: Endpoint Verification ---" -ForegroundColor Yellow

Test-Endpoint -Url "$PROD_URL/" `
    -Description "Legacy root" `
    -ExpectedStatus 200 `
    -ExpectedContentType "text/html" `
    -MustContain "Xem Giá Đất"

Test-Endpoint -Url "$PROD_URL/v2/" `
    -Description "V2 root" `
    -ExpectedStatus 200 `
    -ExpectedContentType "text/html" `
    -MustContain "XemGiaDat v2"

Test-Endpoint -Url "$PROD_URL/v2/index.html" `
    -Description "V2 index.html direct" `
    -ExpectedStatus 200 `
    -ExpectedContentType "text/html"

Test-Endpoint -Url "$PROD_URL/tiles/metadata.json" `
    -Description "Tiles metadata" `
    -ExpectedStatus 200 `
    -ExpectedContentType "application/json"

Test-Endpoint -Url "$PROD_URL/health.txt" `
    -Description "Health check" `
    -ExpectedStatus 200 `
    -ExpectedContentType "text/plain"

Test-Endpoint -Url "$PROD_URL/sw.js" `
    -Description "Service Worker" `
    -ExpectedStatus 200 `
    -ExpectedContentType "javascript" `
    -MustContain "CACHE_VERSION"

# ------------------------------------------------------------------------------
# PHASE 3: V2 Assets (fingerprinted)
# ------------------------------------------------------------------------------
Write-Host ""
Write-Host "--- PHASE 3: V2 Assets Check ---" -ForegroundColor Yellow

# Get V2 HTML and extract asset URLs
try {
    $v2Html = (Invoke-WebRequest -Uri "$PROD_URL/v2/" -UseBasicParsing).Content
    
    # Extract JS asset
    if ($v2Html -match 'src="/v2/assets/(v2-[^"]+\.js)"') {
        $jsAsset = $matches[1]
        Test-Endpoint -Url "$PROD_URL/v2/assets/$jsAsset" `
            -Description "V2 JS bundle" `
            -ExpectedStatus 200 `
            -ExpectedContentType "javascript" `
            -ExpectedCacheControl "immutable"
    } else {
        Write-Host "❌ FAIL: Could not find V2 JS asset in HTML" -ForegroundColor Red
        $FAIL++
    }
    
    # Extract CSS asset
    if ($v2Html -match 'href="/v2/assets/(v2-[^"]+\.css)"') {
        $cssAsset = $matches[1]
        Test-Endpoint -Url "$PROD_URL/v2/assets/$cssAsset" `
            -Description "V2 CSS bundle" `
            -ExpectedStatus 200 `
            -ExpectedContentType "text/css" `
            -ExpectedCacheControl "immutable"
    } else {
        Write-Host "❌ FAIL: Could not find V2 CSS asset in HTML" -ForegroundColor Red
        $FAIL++
    }
} catch {
    Write-Host "❌ FAIL: Could not fetch V2 HTML for asset extraction" -ForegroundColor Red
    $FAIL++
}

# ------------------------------------------------------------------------------
# PHASE 4: Tiles (PMTiles range request)
# ------------------------------------------------------------------------------
Write-Host ""
Write-Host "--- PHASE 4: PMTiles Verification ---" -ForegroundColor Yellow

try {
    $headers = @{ "Range" = "bytes=0-511" }
    $response = Invoke-WebRequest -Uri "$PROD_URL/tiles/danang_parcels_final.pmtiles" -Headers $headers -UseBasicParsing
    if ($response.StatusCode -eq 206 -or $response.StatusCode -eq 200) {
        Write-Host "✅ PASS: PMTiles range request supported" -ForegroundColor Green
        $PASS++
    } else {
        Write-Host "❌ FAIL: PMTiles range request failed (status $($response.StatusCode))" -ForegroundColor Red
        $FAIL++
    }
} catch {
    Write-Host "❌ FAIL: PMTiles request failed" -ForegroundColor Red
    $FAIL++
}

# ------------------------------------------------------------------------------
# SUMMARY
# ------------------------------------------------------------------------------
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " VERIFICATION COMPLETE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  PASSED: $PASS" -ForegroundColor Green
Write-Host "  FAILED: $FAIL" -ForegroundColor $(if ($FAIL -gt 0) { "Red" } else { "Green" })
Write-Host ""

if ($FAIL -gt 0) {
    Write-Host "❌ VERIFICATION FAILED - DO NOT PROCEED" -ForegroundColor Red
    exit 1
} else {
    Write-Host "✅ ALL CHECKS PASSED - PRODUCTION STABLE" -ForegroundColor Green
    exit 0
}
