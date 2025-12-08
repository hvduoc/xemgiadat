# Pi Network Setup - Quick Start
# Simple PowerShell script for Windows

Write-Host "=== PI NETWORK INTEGRATION SETUP ===" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "Checking Node.js..." -NoNewline
try {
    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        Write-Host " OK ($nodeVersion)" -ForegroundColor Green
    } else {
        throw "Not found"
    }
} catch {
    Write-Host " MISSING" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/"
    exit 1
}

Write-Host "Checking package.json..." -NoNewline
if (Test-Path "package.json") {
    Write-Host " OK" -ForegroundColor Green
} else {
    Write-Host " MISSING" -ForegroundColor Red
    Write-Host "Please run this script in the project directory"
    exit 1
}

# Setup environment
Write-Host ""
Write-Host "Setting up environment..." -ForegroundColor Yellow

if (!(Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "Created .env from template" -ForegroundColor Green
    } else {
        Write-Host "Warning: .env.example not found" -ForegroundColor Yellow
    }
} else {
    Write-Host ".env already exists" -ForegroundColor Green
}

# Install dependencies
Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Yellow
try {
    npm install
    Write-Host "Dependencies installed successfully" -ForegroundColor Green
} catch {
    Write-Host "Warning: npm install failed" -ForegroundColor Yellow
}

# Run security audit
Write-Host ""
Write-Host "Running security audit..." -ForegroundColor Yellow
if (Test-Path "security-audit.js") {
    try {
        node security-audit.js
    } catch {
        Write-Host "Security audit completed with warnings" -ForegroundColor Yellow
    }
} else {
    Write-Host "security-audit.js not found" -ForegroundColor Yellow
}

# Create dev server script
Write-Host ""
Write-Host "Creating development server script..." -ForegroundColor Yellow

$serverScript = @'
Write-Host "Starting development server on port 8000..." -ForegroundColor Green
Write-Host "Open http://localhost:8000 in your browser" -ForegroundColor Cyan
Write-Host "For full testing, use Pi Browser" -ForegroundColor Yellow
Write-Host ""

try {
    if (Get-Command python -ErrorAction SilentlyContinue) {
        python -m http.server 8000
    } elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
        python3 -m http.server 8000
    } else {
        Write-Host "Python not found. Installing http-server..." -ForegroundColor Yellow
        npm install -g http-server
        npx http-server . -p 8000
    }
} catch {
    Write-Host "Error starting server" -ForegroundColor Red
    pause
}
'@

$serverScript | Out-File "start-server.ps1" -Encoding UTF8
Write-Host "Created start-server.ps1" -ForegroundColor Green

# Final instructions
Write-Host ""
Write-Host "=== SETUP COMPLETE ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "1. Sign up at: https://developer.minepi.com/" -ForegroundColor Cyan
Write-Host "2. Get your Pi Network credentials" -ForegroundColor Cyan
Write-Host "3. Update .env file with real credentials" -ForegroundColor Cyan
Write-Host "4. Run: .\start-server.ps1" -ForegroundColor Cyan
Write-Host "5. Test in Pi Browser" -ForegroundColor Cyan
Write-Host ""
Write-Host "Documentation: SETUP_GUIDE_PI_NETWORK.md" -ForegroundColor Yellow
Write-Host ""

Read-Host "Press Enter to continue"