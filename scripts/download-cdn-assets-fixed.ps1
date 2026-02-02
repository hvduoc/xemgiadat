#!/usr/bin/env pwsh
# Download CDN assets to local lib directory (robust + HTML validation)
# Run from project root: .\scripts\download-cdn-assets-fixed.ps1

Write-Host "`n📦 Downloading CDN assets to local lib directory..." -ForegroundColor Cyan

$ErrorActionPreference = "Stop"

function Ensure-Dir($path) {
    if (-not (Test-Path $path)) {
        New-Item -ItemType Directory -Force -Path $path | Out-Null
        Write-Host "✅ Created $path" -ForegroundColor Green
    }
}

function Test-NotHtml($filePath) {
    if (-not (Test-Path $filePath)) { return $false }
    $bytes = [System.IO.File]::ReadAllBytes($filePath)
    if ($bytes.Length -lt 8) { return $false }
    $head = [System.Text.Encoding]::UTF8.GetString($bytes, 0, [Math]::Min(256, $bytes.Length))
    if ($head -match '<!DOCTYPE html' -or $head -match '<html' -or $head -match '<head' -or $head -match '<title') {
        return $false
    }
    return $true
}

function Download-File($url, $outFile) {
    $tmp = "$outFile.tmp"
    $retries = 3
    for ($i = 1; $i -le $retries; $i++) {
        try {
            Write-Host "⬇️  $url" -ForegroundColor Yellow
            & curl.exe -L --retry 3 --retry-delay 2 --connect-timeout 10 --max-time 60 -o $tmp $url | Out-Null
            if (-not (Test-NotHtml $tmp)) {
                throw "Downloaded file appears to be HTML (invalid)"
            }
            Move-Item -Force $tmp $outFile
            $sizeKb = [math]::Round((Get-Item $outFile).Length / 1KB, 2)
            Write-Host "   ✅ Saved $outFile ($sizeKb KB)" -ForegroundColor Green
            return
        } catch {
            if (Test-Path $tmp) { Remove-Item $tmp -Force -ErrorAction SilentlyContinue }
            if ($i -eq $retries) {
                throw "❌ Failed to download $url after $retries attempts. Error: $($_.Exception.Message)"
            }
            Write-Host "   ⚠️  Retry $i/$retries..." -ForegroundColor Yellow
            Start-Sleep -Seconds 2
        }
    }
}

# Create directories
$dirs = @(
    "public/lib/leaflet",
    "public/lib/leaflet/images",
    "public/lib/leaflet.markercluster",
    "public/lib/esri-leaflet",
    "public/lib/esri-leaflet-geocoder"
)

foreach ($dir in $dirs) { Ensure-Dir $dir }

# Preferred CDN: Cloudflare (stable)
$downloads = @(
    # Leaflet Core 1.7.1
    @{ Url = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/leaflet.js"; Out = "public/lib/leaflet/leaflet.js" },
    @{ Url = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/leaflet.css"; Out = "public/lib/leaflet/leaflet.css" },
    @{ Url = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png"; Out = "public/lib/leaflet/images/marker-icon.png" },
    @{ Url = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png"; Out = "public/lib/leaflet/images/marker-icon-2x.png" },
    @{ Url = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png"; Out = "public/lib/leaflet/images/marker-shadow.png" },

    # MarkerCluster 1.5.3
    @{ Url = "https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/leaflet.markercluster.js"; Out = "public/lib/leaflet.markercluster/leaflet.markercluster.js" },
    @{ Url = "https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/MarkerCluster.css"; Out = "public/lib/leaflet.markercluster/MarkerCluster.css" },
    @{ Url = "https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/MarkerCluster.Default.css"; Out = "public/lib/leaflet.markercluster/MarkerCluster.Default.css" },

    # Esri Leaflet 3.0.10
    @{ Url = "https://cdnjs.cloudflare.com/ajax/libs/esri-leaflet/3.0.10/esri-leaflet.js"; Out = "public/lib/esri-leaflet/esri-leaflet.js" },

    # Esri Leaflet Geocoder 3.1.4
    @{ Url = "https://cdnjs.cloudflare.com/ajax/libs/esri-leaflet-geocoder/3.1.4/esri-leaflet-geocoder.js"; Out = "public/lib/esri-leaflet-geocoder/esri-leaflet-geocoder.js" },
    @{ Url = "https://cdnjs.cloudflare.com/ajax/libs/esri-leaflet-geocoder/3.1.4/esri-leaflet-geocoder.css"; Out = "public/lib/esri-leaflet-geocoder/esri-leaflet-geocoder.css" }
)

Write-Host "`n📥 Downloading assets..." -ForegroundColor Cyan
foreach ($item in $downloads) {
    Download-File $item.Url $item.Out
}

# Summary
Write-Host "`n✅ All assets downloaded successfully!" -ForegroundColor Green
Write-Host "`n📊 Summary:" -ForegroundColor Cyan
$totalSize = (Get-ChildItem -Recurse public/lib | Measure-Object -Property Length -Sum).Sum
Write-Host "   Total size: $([math]::Round($totalSize / 1KB, 2)) KB" -ForegroundColor White

