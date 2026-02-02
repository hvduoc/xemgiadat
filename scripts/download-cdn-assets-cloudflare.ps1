# ========================================
# Cloudflare CDN Assets Download Script
# ========================================
# This script downloads all Leaflet libraries from Cloudflare CDN
# Use this if unpkg.com or other CDNs are failing
# ========================================

Write-Host "`n🔄 Downloading Leaflet Assets from Cloudflare CDN..." -ForegroundColor Cyan

$publicDir = Join-Path $PSScriptRoot ".." "public"
$libDir = Join-Path $publicDir "lib"

# Create lib directory structure
@('leaflet', 'leaflet.markercluster', 'esri-leaflet', 'esri-leaflet-geocoder') | ForEach-Object {
    $dir = Join-Path $libDir $_
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "✅ Created directory: $_" -ForegroundColor Green
    }
}

# Download URLs from Cloudflare CDN (more reliable than unpkg)
$downloads = @(
    # Leaflet Core 1.7.1
    @{
        Url = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/leaflet.js"
        Output = Join-Path $libDir "leaflet\leaflet.js"
    },
    @{
        Url = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/leaflet.css"
        Output = Join-Path $libDir "leaflet\leaflet.css"
    },
    @{
        Url = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png"
        Output = Join-Path $libDir "leaflet\images\marker-icon.png"
    },
    @{
        Url = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png"
        Output = Join-Path $libDir "leaflet\images\marker-icon-2x.png"
    },
    @{
        Url = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png"
        Output = Join-Path $libDir "leaflet\images\marker-shadow.png"
    },
    
    # Leaflet MarkerCluster 1.5.3
    @{
        Url = "https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/leaflet.markercluster.js"
        Output = Join-Path $libDir "leaflet.markercluster\leaflet.markercluster.js"
    },
    @{
        Url = "https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/MarkerCluster.css"
        Output = Join-Path $libDir "leaflet.markercluster\MarkerCluster.css"
    },
    @{
        Url = "https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/MarkerCluster.Default.css"
        Output = Join-Path $libDir "leaflet.markercluster\MarkerCluster.Default.css"
    },
    
    # Esri Leaflet 3.0.10
    @{
        Url = "https://cdnjs.cloudflare.com/ajax/libs/esri-leaflet/3.0.10/esri-leaflet.js"
        Output = Join-Path $libDir "esri-leaflet\esri-leaflet.js"
    },
    
    # Esri Leaflet Geocoder 3.1.4
    @{
        Url = "https://cdnjs.cloudflare.com/ajax/libs/esri-leaflet-geocoder/3.1.4/esri-leaflet-geocoder.js"
        Output = Join-Path $libDir "esri-leaflet-geocoder\esri-leaflet-geocoder.js"
    },
    @{
        Url = "https://cdnjs.cloudflare.com/ajax/libs/esri-leaflet-geocoder/3.1.4/esri-leaflet-geocoder.css"
        Output = Join-Path $libDir "esri-leaflet-geocoder\esri-leaflet-geocoder.css"
    }
)

# Create images directory for marker icons
$imagesDir = Join-Path $libDir "leaflet\images"
if (-not (Test-Path $imagesDir)) {
    New-Item -ItemType Directory -Path $imagesDir -Force | Out-Null
}

# Download all files with retry logic
$successCount = 0
$failCount = 0

foreach ($item in $downloads) {
    $filename = Split-Path $item.Output -Leaf
    Write-Host "⬇️  Downloading $filename..." -ForegroundColor Yellow
    
    $retryCount = 0
    $maxRetries = 3
    $success = $false
    
    while (-not $success -and $retryCount -lt $maxRetries) {
        try {
            # Use Invoke-WebRequest with proper error handling
            $response = Invoke-WebRequest -Uri $item.Url -UseBasicParsing -TimeoutSec 30
            
            # Save to file
            [System.IO.File]::WriteAllBytes($item.Output, $response.Content)
            
            # Verify file was created and has content
            if ((Test-Path $item.Output) -and (Get-Item $item.Output).Length -gt 0) {
                $fileSize = [math]::Round((Get-Item $item.Output).Length / 1KB, 2)
                Write-Host "   ✅ Downloaded successfully ($fileSize KB)" -ForegroundColor Green
                $successCount++
                $success = $true
            } else {
                throw "File is empty or not created"
            }
        }
        catch {
            $retryCount++
            if ($retryCount -lt $maxRetries) {
                Write-Host "   ⚠️  Attempt $retryCount failed, retrying..." -ForegroundColor Yellow
                Start-Sleep -Seconds 2
            } else {
                Write-Host "   ❌ Failed after $maxRetries attempts: $_" -ForegroundColor Red
                $failCount++
            }
        }
    }
}

# Summary
Write-Host "`n📊 Download Summary:" -ForegroundColor Cyan
Write-Host "   ✅ Success: $successCount files" -ForegroundColor Green
Write-Host "   ❌ Failed: $failCount files" -ForegroundColor Red

if ($failCount -eq 0) {
    Write-Host "`n🎉 All assets downloaded successfully from Cloudflare CDN!" -ForegroundColor Green
    
    # Calculate total size
    $totalSize = (Get-ChildItem -Path $libDir -Recurse -File | Measure-Object -Property Length -Sum).Sum
    $totalSizeMB = [math]::Round($totalSize / 1MB, 2)
    Write-Host "📦 Total size: $totalSizeMB MB" -ForegroundColor Cyan
} else {
    Write-Host "`n⚠️  Some downloads failed. Please check errors above." -ForegroundColor Yellow
    exit 1
}
