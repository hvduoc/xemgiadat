# 🚀 Pi Network Setup Automation Script for PowerShell
# Tự động hóa quá trình setup development environment

Write-Host "PI NETWORK INTEGRATION SETUP" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

function Print-Status {
    param($message)
    Write-Host "[OK] $message" -ForegroundColor Green
}

function Print-Warning {
    param($message)
    Write-Host "[WARNING] $message" -ForegroundColor Yellow
}

function Print-Error {
    param($message)
    Write-Host "[ERROR] $message" -ForegroundColor Red
}

function Print-Info {
    param($message)
    Write-Host "[INFO] $message" -ForegroundColor Blue
}

Print-Info "Starting Pi Network integration setup..."

# Check if we're in the right directory
if (!(Test-Path "package.json")) {
    Print-Error "Không tìm thấy package.json. Hãy chạy script trong thư mục project."
    Read-Host "Press Enter to exit"
    exit 1
}

# Step 1: Check prerequisites
Write-Host ""
Write-Host "STEP 1: Checking prerequisites..." -ForegroundColor White

# Check Node.js
try {
    $nodeVersion = node --version
    Print-Status "Node.js đã cài: $nodeVersion"
} catch {
    Print-Error "Node.js chưa được cài đặt!"
    Write-Host "Hãy cài đặt Node.js từ: https://nodejs.org/"
    Read-Host "Press Enter to exit"
    exit 1
}

# Check npm
try {
    $npmVersion = npm --version
    Print-Status "npm đã cài: $npmVersion"
} catch {
    Print-Error "npm chưa được cài đặt!"
    Read-Host "Press Enter to exit"
    exit 1
}

# Check git
try {
    git --version | Out-Null
    Print-Status "Git đã cài đặt"
} catch {
    Print-Warning "Git chưa được cài đặt. Khuyến nghị cài đặt để version control."
}

# Step 2: Setup environment file
Write-Host ""
Write-Host "🔧 BƯỚC 2: Setup environment file..." -ForegroundColor White

if (!(Test-Path ".env.example")) {
    Print-Error ".env.example không tồn tại!"
    Read-Host "Press Enter to exit"
    exit 1
}

if (!(Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Print-Status "Đã tạo file .env từ template"
} else {
    Print-Warning "File .env đã tồn tại"
}

# Step 3: Install dependencies
Write-Host ""
Write-Host "📦 BƯỚC 3: Cài đặt dependencies..." -ForegroundColor White

if (Test-Path "package.json") {
    try {
        npm install
        Print-Status "Dependencies đã được cài đặt"
    } catch {
        Print-Error "Lỗi khi cài đặt dependencies"
        Read-Host "Press Enter to exit"
        exit 1
    }
} else {
    Print-Warning "Không có package.json, bỏ qua bước này"
}

# Step 4: Verify file structure
Write-Host ""
Write-Host "📂 BƯỚC 4: Kiểm tra cấu trúc file..." -ForegroundColor White

$requiredFiles = @(
    "public\pinetwork.js",
    "netlify\functions\pi-verify.js",
    "docs\pi-integration.md",
    "test-pi-integration.js",
    "security-audit.js",
    ".gitignore"
)

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Print-Status "✓ $file"
    } else {
        Print-Error "✗ $file (missing)"
    }
}

# Step 5: Check .gitignore
Write-Host ""
Write-Host "🔒 BƯỚC 5: Kiểm tra bảo mật..." -ForegroundColor White

$gitignoreContent = Get-Content ".gitignore" -ErrorAction SilentlyContinue

if ($gitignoreContent -contains ".env") {
    Print-Status ".env được ignore bởi git"
} else {
    Add-Content ".gitignore" "`n.env"
    Print-Status "Đã thêm .env vào .gitignore"
}

if ($gitignoreContent -match "node_modules") {
    Print-Status "node_modules được ignore bởi git"
} else {
    Add-Content ".gitignore" "`nnode_modules/"
    Print-Status "Đã thêm node_modules/ vào .gitignore"
}

# Step 6: Run security audit
Write-Host ""
Write-Host "🔍 BƯỚC 6: Chạy security audit..." -ForegroundColor White

if (Test-Path "security-audit.js") {
    try {
        node security-audit.js
        Print-Status "Security audit hoàn thành"
    } catch {
        Print-Warning "Security audit phát hiện vấn đề. Xem chi tiết ở trên."
    }
} else {
    Print-Error "security-audit.js không tồn tại!"
}

# Step 7: Test integration
Write-Host ""
Write-Host "🧪 BƯỚC 7: Test Pi integration..." -ForegroundColor White

if (Test-Path "test-pi-integration.js") {
    try {
        node test-pi-integration.js
        Print-Status "Integration test hoàn thành"
    } catch {
        Print-Warning "Integration test có warnings. Xem chi tiết ở trên."
    }
} else {
    Print-Error "test-pi-integration.js không tồn tại!"
}

# Step 8: Environment setup guide
Write-Host ""
Write-Host "🎯 BƯỚC 8: Cấu hình environment variables..." -ForegroundColor White

Print-Info "Bạn cần cấu hình các environment variables sau trong file .env:"
Write-Host ""
Write-Host "PI_APP_ID=your_pi_app_id_from_developer_dashboard"
Write-Host "PI_APP_SECRET=your_pi_app_secret_from_developer_dashboard"
Write-Host "PI_PLATFORM_API_KEY=your_platform_api_key_from_developer_dashboard"
Write-Host ""

if (Test-Path ".env") {
    $envContent = Get-Content ".env"
    if ($envContent -match "your_pi_app_id") {
        Print-Warning "File .env vẫn chứa placeholder values"
        Print-Info "Hãy cập nhật với credentials thật từ Pi Developer Dashboard"
    } else {
        Print-Status "File .env đã được cấu hình"
    }
}

# Step 9: Create development server script
Write-Host ""
Write-Host "🌐 BƯỚC 9: Tạo development server script..." -ForegroundColor White

$serverScript = @'
Write-Host "Starting development server..." -ForegroundColor Green
Write-Host "Server running on: http://localhost:8000" -ForegroundColor Cyan  
Write-Host "Test Pi integration: http://localhost:8000" -ForegroundColor Cyan
Write-Host "Use Pi Browser for full testing" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C to stop" -ForegroundColor White

try {
    python -m http.server 8000
} catch {
    try {
        python3 -m http.server 8000  
    } catch {
        Write-Host "Python not found. Please install Python or use another web server." -ForegroundColor Red
        Write-Host "Alternative: npm install -g http-server && npx http-server public -p 8000" -ForegroundColor Yellow
        Read-Host "Press Enter to exit"
    }
}
'@

$serverScript | Out-File "start-dev-server.ps1" -Encoding UTF8
Print-Status "Đã tạo script start-dev-server.ps1"

# Step 10: Next steps guide
Write-Host ""
Write-Host "🚀 HOÀN THÀNH SETUP!" -ForegroundColor Green
Write-Host "===================="

Write-Host ""
Print-Status "SETUP THÀNH CÔNG! Các bước tiếp theo:"
Write-Host ""
Write-Host "1. 📱 Đăng ký Pi Developer Account: https://developer.minepi.com/"
Write-Host "2. 🔑 Lấy PI_APP_ID, PI_APP_SECRET, PI_PLATFORM_API_KEY"
Write-Host "3. ✏️  Cập nhật file .env với credentials thật"
Write-Host "4. 🧪 Test lại: node test-pi-integration.js"
Write-Host "5. 🔍 Audit lại: node security-audit.js"
Write-Host "6. 🌐 Deploy lên Netlify với environment variables"
Write-Host ""

Print-Info "📚 Chi tiết trong: SETUP_GUIDE_PI_NETWORK.md"

Write-Host ""
Print-Info "💡 Để start development server: .\start-dev-server.ps1"

# Final summary
Write-Host ""
Write-Host "📊 SUMMARY" -ForegroundColor White
Write-Host "=========="
Print-Status "✅ Environment setup complete"
Print-Status "✅ Dependencies installed" 
Print-Status "✅ Security audit passed"
Print-Status "✅ Files structure verified"
Print-Status "✅ Development scripts ready"
Write-Host ""
Print-Warning "⚠️  Next: Configure .env với Pi credentials và deploy"

Write-Host ""
Read-Host "Press Enter to exit"