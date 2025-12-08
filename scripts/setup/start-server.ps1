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
