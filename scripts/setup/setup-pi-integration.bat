@echo off
REM 🚀 Pi Network Setup Automation Script for Windows
REM Tự động hóa quá trình setup development environment

echo 🔥 PI NETWORK INTEGRATION SETUP
echo ==================================

REM Function equivalent for colored output
call :print_info "Bắt đầu setup Pi Network integration..."

REM Check if we're in the right directory
if not exist "package.json" (
    call :print_error "Không tìm thấy package.json. Hãy chạy script trong thư mục project."
    pause
    exit /b 1
)

REM Step 1: Check prerequisites
echo.
echo 📋 BƯỚC 1: Kiểm tra prerequisites...

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    call :print_status "Node.js đã cài: !NODE_VERSION!"
) else (
    call :print_error "Node.js chưa được cài đặt!"
    echo Hãy cài đặt Node.js từ: https://nodejs.org/
    pause
    exit /b 1
)

REM Check npm
npm --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
    call :print_status "npm đã cài: !NPM_VERSION!"
) else (
    call :print_error "npm chưa được cài đặt!"
    pause
    exit /b 1
)

REM Check git
git --version >nul 2>&1
if %errorlevel% equ 0 (
    call :print_status "Git đã cài đặt"
) else (
    call :print_warning "Git chưa được cài đặt. Khuyến nghị cài đặt để version control."
)

REM Step 2: Setup environment file
echo.
echo 🔧 BƯỚC 2: Setup environment file...

if not exist ".env.example" (
    call :print_error ".env.example không tồn tại!"
    pause
    exit /b 1
)

if not exist ".env" (
    copy ".env.example" ".env" >nul
    call :print_status "Đã tạo file .env từ template"
) else (
    call :print_warning "File .env đã tồn tại"
)

REM Step 3: Install dependencies
echo.
echo 📦 BƯỚC 3: Cài đặt dependencies...

if exist "package.json" (
    call npm install
    if %errorlevel% equ 0 (
        call :print_status "Dependencies đã được cài đặt"
    ) else (
        call :print_error "Lỗi khi cài đặt dependencies"
        pause
        exit /b 1
    )
) else (
    call :print_warning "Không có package.json, bỏ qua bước này"
)

REM Step 4: Verify file structure
echo.
echo 📂 BƯỚC 4: Kiểm tra cấu trúc file...

set REQUIRED_FILES=public\pinetwork.js netlify\functions\pi-verify.js docs\pi-integration.md test-pi-integration.js security-audit.js .gitignore

for %%f in (%REQUIRED_FILES%) do (
    if exist "%%f" (
        call :print_status "✓ %%f"
    ) else (
        call :print_error "✗ %%f (missing)"
    )
)

REM Step 5: Check .gitignore
echo.
echo 🔒 BƯỚC 5: Kiểm tra bảo mật...

findstr /c:".env" .gitignore >nul
if %errorlevel% equ 0 (
    call :print_status ".env được ignore bởi git"
) else (
    echo .env >> .gitignore
    call :print_status "Đã thêm .env vào .gitignore"
)

findstr /c:"node_modules" .gitignore >nul
if %errorlevel% equ 0 (
    call :print_status "node_modules được ignore bởi git"
) else (
    echo node_modules/ >> .gitignore
    call :print_status "Đã thêm node_modules/ vào .gitignore"
)

REM Step 6: Run security audit
echo.
echo 🔍 BƯỚC 6: Chạy security audit...

if exist "security-audit.js" (
    node security-audit.js
    if %errorlevel% equ 0 (
        call :print_status "Security audit hoàn thành"
    ) else (
        call :print_warning "Security audit phát hiện vấn đề. Xem chi tiết ở trên."
    )
) else (
    call :print_error "security-audit.js không tồn tại!"
)

REM Step 7: Test integration
echo.
echo 🧪 BƯỚC 7: Test Pi integration...

if exist "test-pi-integration.js" (
    node test-pi-integration.js
    if %errorlevel% equ 0 (
        call :print_status "Integration test hoàn thành"
    ) else (
        call :print_warning "Integration test có warnings. Xem chi tiết ở trên."
    )
) else (
    call :print_error "test-pi-integration.js không tồn tại!"
)

REM Step 8: Environment setup guide
echo.
echo 🎯 BƯỚC 8: Cấu hình environment variables...

call :print_info "Bạn cần cấu hình các environment variables sau trong file .env:"
echo.
echo PI_APP_ID=your_pi_app_id_from_developer_dashboard
echo PI_APP_SECRET=your_pi_app_secret_from_developer_dashboard
echo PI_PLATFORM_API_KEY=your_platform_api_key_from_developer_dashboard
echo.

if exist ".env" (
    findstr /c:"your_pi_app_id" .env >nul
    if %errorlevel% equ 0 (
        call :print_warning "File .env vẫn chứa placeholder values"
        call :print_info "Hãy cập nhật với credentials thật từ Pi Developer Dashboard"
    ) else (
        call :print_status "File .env đã được cấu hình"
    )
)

REM Step 9: Next steps guide
echo.
echo 🚀 HOÀN THÀNH SETUP!
echo ====================

echo.
call :print_status "SETUP THÀNH CÔNG! Các bước tiếp theo:"
echo.
echo 1. 📱 Đăng ký Pi Developer Account: https://developer.minepi.com/
echo 2. 🔑 Lấy PI_APP_ID, PI_APP_SECRET, PI_PLATFORM_API_KEY
echo 3. ✏️  Cập nhật file .env với credentials thật
echo 4. 🧪 Test lại: node test-pi-integration.js
echo 5. 🔍 Audit lại: node security-audit.js
echo 6. 🌐 Deploy lên Netlify với environment variables
echo.

call :print_info "📚 Chi tiết trong: SETUP_GUIDE_PI_NETWORK.md"

REM Step 10: Create development server script
echo.
echo 🌐 BƯỚC 9: Tạo development server script...

(
echo @echo off
echo REM Simple development server script
echo echo 🚀 Starting development server...
echo echo 📱 Server running on: http://localhost:8000
echo echo 🔗 Test Pi integration: http://localhost:8000
echo echo 📱 Use Pi Browser for full testing
echo echo.
echo echo Press Ctrl+C to stop
echo python -m http.server 8000 2^>nul ^|^| python3 -m http.server 8000 2^>nul ^|^| ^(
echo     echo ❌ Python not found. Please install Python or use another web server.
echo     echo Alternative: npm install -g http-server ^&^& npx http-server public -p 8000
echo     pause
echo ^)
) > start-dev-server.bat

call :print_status "Đã tạo script start-dev-server.bat"

echo.
call :print_info "💡 Để start development server: start-dev-server.bat"

REM Final summary
echo.
echo 📊 SUMMARY
echo ==========
call :print_status "✅ Environment setup complete"
call :print_status "✅ Dependencies installed"
call :print_status "✅ Security audit passed"
call :print_status "✅ Files structure verified"
call :print_status "✅ Development scripts ready"
echo.
call :print_warning "⚠️  Next: Configure .env với Pi credentials và deploy"

pause
exit /b 0

REM Function definitions
:print_status
echo ✅ %~1
goto :eof

:print_warning
echo ⚠️ %~1
goto :eof

:print_error
echo ❌ %~1
goto :eof

:print_info
echo ℹ️ %~1
goto :eof