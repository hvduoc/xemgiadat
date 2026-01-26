# PowerShell script to verify production assets are served correctly
# Usage: .\scripts\verify-prod-assets.ps1
# 
# P0 FIX VERIFICATION: Ensures static assets are NOT rewritten to HTML

$ErrorActionPreference = "Continue"
$BaseUrl = "https://xemgiadat.com"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "P0 Production Asset Verification" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
Write-Host "Target: $BaseUrl" -ForegroundColor Yellow
Write-Host "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss UTC')`n" -ForegroundColor Gray

# Test endpoints
$tests = @(
    @{ Url = "/"; ExpectedType = "text/html"; Name = "Homepage (SPA root)" },
    @{ Url = "/health.txt"; ExpectedType = "text/plain"; Name = "Health check" },
    @{ Url = "/script.js"; ExpectedType = "text/javascript|application/javascript"; Name = "Legacy script.js" },
    @{ Url = "/style.css"; ExpectedType = "text/css"; Name = "Legacy style.css" },
    @{ Url = "/manifest.json"; ExpectedType = "application/.*json"; Name = "PWA Manifest" },
    @{ Url = "/robots.txt"; ExpectedType = "text/plain"; Name = "Robots.txt" },
    @{ Url = "/v2/"; ExpectedType = "text/html"; Name = "V2 App" },
    @{ Url = "/tiles/metadata.json"; ExpectedType = "application/json"; Name = "Tiles metadata" }
)

$passed = 0
$failed = 0
$results = @()

foreach ($test in $tests) {
    $fullUrl = "$BaseUrl$($test.Url)"
    Write-Host "Testing: $($test.Name)" -ForegroundColor White
    Write-Host "  URL: $fullUrl" -ForegroundColor Gray
    
    try {
        $response = Invoke-WebRequest -Uri $fullUrl -Method GET -UseBasicParsing -TimeoutSec 10
        $status = $response.StatusCode
        $contentType = $response.Headers["Content-Type"]
        $cacheControl = $response.Headers["Cache-Control"]
        $contentLength = $response.Headers["Content-Length"]
        
        # Check if content type matches expected
        $typeMatch = $contentType -match $test.ExpectedType
        
        # Check for HTML being served instead of expected type (the P0 bug)
        $isHtmlWhenShouldntBe = ($contentType -match "text/html") -and -not ($test.ExpectedType -match "text/html")
        
        if ($status -eq 200 -and $typeMatch -and -not $isHtmlWhenShouldntBe) {
            Write-Host "  ✅ PASS" -ForegroundColor Green
            Write-Host "     Status: $status" -ForegroundColor Gray
            Write-Host "     Content-Type: $contentType" -ForegroundColor Gray
            Write-Host "     Cache-Control: $cacheControl" -ForegroundColor Gray
            $passed++
            $results += @{ Test = $test.Name; Status = "PASS"; Code = $status; Type = $contentType }
        } else {
            Write-Host "  ❌ FAIL" -ForegroundColor Red
            Write-Host "     Status: $status" -ForegroundColor Red
            Write-Host "     Content-Type: $contentType (expected: $($test.ExpectedType))" -ForegroundColor Red
            if ($isHtmlWhenShouldntBe) {
                Write-Host "     ⚠️  P0 BUG: Asset being served as HTML!" -ForegroundColor Yellow
            }
            $failed++
            $results += @{ Test = $test.Name; Status = "FAIL"; Code = $status; Type = $contentType }
        }
    }
    catch {
        Write-Host "  ❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
        $failed++
        $results += @{ Test = $test.Name; Status = "ERROR"; Code = 0; Type = "N/A" }
    }
    
    Write-Host ""
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })
Write-Host "Total:  $($tests.Count)" -ForegroundColor White

# Check health.txt content
Write-Host "`n----------------------------------------" -ForegroundColor Gray
Write-Host "Health Check Content:" -ForegroundColor Yellow
try {
    $healthContent = (Invoke-WebRequest -Uri "$BaseUrl/health.txt" -UseBasicParsing -TimeoutSec 5).Content
    Write-Host $healthContent -ForegroundColor Gray
}
catch {
    Write-Host "Could not fetch health.txt: $($_.Exception.Message)" -ForegroundColor Red
}

# Exit code
if ($failed -gt 0) {
    Write-Host "`n❌ VERIFICATION FAILED - P0 issues detected!" -ForegroundColor Red
    exit 1
} else {
    Write-Host "`n✅ VERIFICATION PASSED - All assets serving correctly!" -ForegroundColor Green
    exit 0
}
