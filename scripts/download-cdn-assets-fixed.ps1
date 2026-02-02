#!/usr/bin/env pwsh
# Download CDN assets to local lib directory
# Run from project root: .\scripts\download-cdn-assets.ps1

Write-Host "ðŸ“¦ Downloading CDN assets to local lib directory..." -ForegroundColor Cyan

# Create directories
$dirs = @(
    "public/lib/leaflet",
    "public/lib/leaflet/images",
    "public/lib/leaflet.markercluster",
    "public/lib/esri-leaflet",
    "public/lib/esri-leaflet-geocoder"
)

foreach ($dir in $dirs) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    Write-Host "âœ“ Created $dir" -ForegroundColor Green
}

# Download Leaflet
Write-Host "`nðŸ“¥ Downloading Leaflet 1.7.1..." -ForegroundColor Yellow
Invoke-WebRequest -Uri "https://unpkg.com/leaflet@1.7.1/dist/leaflet.js" -OutFile "public/lib/leaflet/leaflet.js"
Invoke-WebRequest -Uri "https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" -OutFile "public/lib/leaflet/leaflet.css"

# Leaflet images
$images = @("marker-icon.png", "marker-icon-2x.png", "marker-shadow.png")
foreach ($img in $images) {
    Invoke-WebRequest -Uri "https://unpkg.com/leaflet@1.7.1/dist/images/$img" -OutFile "public/lib/leaflet/images/$img"
}
Write-Host "âœ… Leaflet downloaded" -ForegroundColor Green

# Download MarkerCluster
Write-Host "`nðŸ“¥ Downloading Leaflet MarkerCluster 1.5.3..." -ForegroundColor Yellow
Invoke-WebRequest -Uri "https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js" -OutFile "public/lib/leaflet.markercluster/leaflet.markercluster.js"
Invoke-WebRequest -Uri "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" -OutFile "public/lib/leaflet.markercluster/MarkerCluster.css"
Invoke-WebRequest -Uri "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css" -OutFile "public/lib/leaflet.markercluster/MarkerCluster.Default.css"
Write-Host "âœ… MarkerCluster downloaded" -ForegroundColor Green

# Download Esri Leaflet
Write-Host "`nðŸ“¥ Downloading Esri Leaflet 3.0.10..." -ForegroundColor Yellow
Invoke-WebRequest -Uri "https://unpkg.com/esri-leaflet@3.0.10/dist/esri-leaflet.js" -OutFile "public/lib/esri-leaflet/esri-leaflet.js"
Write-Host "âœ… Esri Leaflet downloaded" -ForegroundColor Green

# Download Esri Geocoder
Write-Host "`nðŸ“¥ Downloading Esri Geocoder 3.1.4..." -ForegroundColor Yellow
Invoke-WebRequest -Uri "https://unpkg.com/esri-leaflet-geocoder@3.1.4/dist/esri-leaflet-geocoder.js" -OutFile "public/lib/esri-leaflet-geocoder/esri-leaflet-geocoder.js"
Invoke-WebRequest -Uri "https://unpkg.com/esri-leaflet-geocoder@3.1.4/dist/esri-leaflet-geocoder.css" -OutFile "public/lib/esri-leaflet-geocoder/esri-leaflet-geocoder.css"
Write-Host "âœ… Esri Geocoder downloaded" -ForegroundColor Green

# Summary
Write-Host "`nâœ… All assets downloaded successfully!" -ForegroundColor Green
Write-Host "`nðŸ“Š Summary:" -ForegroundColor Cyan
$totalSize = (Get-ChildItem -Recurse public/lib | Measure-Object -Property Length -Sum).Sum
Write-Host "   Total size: $([math]::Round($totalSize / 1KB, 2)) KB" -ForegroundColor White

Write-Host "`nðŸ“ Next steps:" -ForegroundColor Yellow
Write-Host "   1. Update index.html to use /lib/* paths instead of CDN URLs"
Write-Host "   2. Add /lib/* to service worker cache"
Write-Host "   3. Test locally: npm run dev"
Write-Host "   4. Deploy and verify"

