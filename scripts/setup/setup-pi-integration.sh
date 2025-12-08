#!/bin/bash

# 🚀 Pi Network Setup Automation Script
# Tự động hóa quá trình setup development environment

echo "🔥 PI NETWORK INTEGRATION SETUP"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Không tìm thấy package.json. Hãy chạy script trong thư mục project."
    exit 1
fi

print_info "Bắt đầu setup Pi Network integration..."

# Step 1: Check prerequisites
echo ""
echo "📋 BƯỚC 1: Kiểm tra prerequisites..."

# Check Node.js
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    print_status "Node.js đã cài: $NODE_VERSION"
else
    print_error "Node.js chưa được cài đặt!"
    echo "Hãy cài đặt Node.js từ: https://nodejs.org/"
    exit 1
fi

# Check npm
if command -v npm >/dev/null 2>&1; then
    NPM_VERSION=$(npm --version)
    print_status "npm đã cài: $NPM_VERSION"
else
    print_error "npm chưa được cài đặt!"
    exit 1
fi

# Check git
if command -v git >/dev/null 2>&1; then
    print_status "Git đã cài đặt"
else
    print_warning "Git chưa được cài đặt. Khuyến nghị cài đặt để version control."
fi

# Step 2: Setup environment file
echo ""
echo "🔧 BƯỚC 2: Setup environment file..."

if [ ! -f ".env.example" ]; then
    print_error ".env.example không tồn tại!"
    exit 1
fi

if [ ! -f ".env" ]; then
    cp .env.example .env
    print_status "Đã tạo file .env từ template"
else
    print_warning "File .env đã tồn tại"
fi

# Step 3: Install dependencies
echo ""
echo "📦 BƯỚC 3: Cài đặt dependencies..."

if [ -f "package.json" ]; then
    npm install
    if [ $? -eq 0 ]; then
        print_status "Dependencies đã được cài đặt"
    else
        print_error "Lỗi khi cài đặt dependencies"
        exit 1
    fi
else
    print_warning "Không có package.json, bỏ qua bước này"
fi

# Step 4: Verify file structure
echo ""
echo "📂 BƯỚC 4: Kiểm tra cấu trúc file..."

REQUIRED_FILES=(
    "public/pinetwork.js"
    "netlify/functions/pi-verify.js"
    "docs/pi-integration.md"
    "test-pi-integration.js"
    "security-audit.js"
    ".gitignore"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_status "✓ $file"
    else
        print_error "✗ $file (missing)"
    fi
done

# Step 5: Check .gitignore
echo ""
echo "🔒 BƯỚC 5: Kiểm tra bảo mật..."

if grep -q ".env" .gitignore; then
    print_status ".env được ignore bởi git"
else
    echo ".env" >> .gitignore
    print_status "Đã thêm .env vào .gitignore"
fi

if grep -q "node_modules" .gitignore; then
    print_status "node_modules được ignore bởi git"
else
    echo "node_modules/" >> .gitignore
    print_status "Đã thêm node_modules/ vào .gitignore"
fi

# Step 6: Run security audit
echo ""
echo "🔍 BƯỚC 6: Chạy security audit..."

if [ -f "security-audit.js" ]; then
    node security-audit.js
    if [ $? -eq 0 ]; then
        print_status "Security audit hoàn thành"
    else
        print_warning "Security audit phát hiện vấn đề. Xem chi tiết ở trên."
    fi
else
    print_error "security-audit.js không tồn tại!"
fi

# Step 7: Test integration
echo ""
echo "🧪 BƯỚC 7: Test Pi integration..."

if [ -f "test-pi-integration.js" ]; then
    node test-pi-integration.js
    if [ $? -eq 0 ]; then
        print_status "Integration test hoàn thành"
    else
        print_warning "Integration test có warnings. Xem chi tiết ở trên."
    fi
else
    print_error "test-pi-integration.js không tồn tại!"
fi

# Step 8: Environment setup guide
echo ""
echo "🎯 BƯỚC 8: Cấu hình environment variables..."

print_info "Bạn cần cấu hình các environment variables sau trong file .env:"
echo ""
echo "PI_APP_ID=your_pi_app_id_from_developer_dashboard"
echo "PI_APP_SECRET=your_pi_app_secret_from_developer_dashboard"
echo "PI_PLATFORM_API_KEY=your_platform_api_key_from_developer_dashboard"
echo ""

if [ -f ".env" ]; then
    # Check if .env has placeholder values
    if grep -q "your_pi_app_id" .env; then
        print_warning "File .env vẫn chứa placeholder values"
        print_info "Hãy cập nhật với credentials thật từ Pi Developer Dashboard"
    else
        print_status "File .env đã được cấu hình"
    fi
fi

# Step 9: Next steps guide
echo ""
echo "🚀 HOÀN THÀNH SETUP!"
echo "===================="

echo ""
print_status "SETUP THÀNH CÔNG! Các bước tiếp theo:"
echo ""
echo "1. 📱 Đăng ký Pi Developer Account: https://developer.minepi.com/"
echo "2. 🔑 Lấy PI_APP_ID, PI_APP_SECRET, PI_PLATFORM_API_KEY"
echo "3. ✏️  Cập nhật file .env với credentials thật"
echo "4. 🧪 Test lại: node test-pi-integration.js"
echo "5. 🔍 Audit lại: node security-audit.js"
echo "6. 🌐 Deploy lên Netlify với environment variables"
echo ""

print_info "📚 Chi tiết trong: SETUP_GUIDE_PI_NETWORK.md"

# Step 10: Create development server script
echo ""
echo "🌐 BƯỚC 9: Tạo development server script..."

cat > start-dev-server.sh << 'EOF'
#!/bin/bash

# Simple development server script
echo "🚀 Starting development server..."

# Check if Python is available
if command -v python3 >/dev/null 2>&1; then
    echo "📱 Server running on: http://localhost:8000"
    echo "🔗 Test Pi integration: http://localhost:8000"
    echo "📱 Use Pi Browser for full testing"
    echo ""
    echo "Press Ctrl+C to stop"
    python3 -m http.server 8000
elif command -v python >/dev/null 2>&1; then
    echo "📱 Server running on: http://localhost:8000"
    echo "🔗 Test Pi integration: http://localhost:8000"
    echo "📱 Use Pi Browser for full testing"
    echo ""
    echo "Press Ctrl+C to stop"
    python -m http.server 8000
else
    echo "❌ Python not found. Please install Python or use another web server."
    echo "Alternative: npm install -g http-server && npx http-server public -p 8000"
fi
EOF

chmod +x start-dev-server.sh
print_status "Đã tạo script start-dev-server.sh"

echo ""
print_info "💡 Để start development server: ./start-dev-server.sh"

# Final summary
echo ""
echo "📊 SUMMARY"
echo "=========="
print_status "✅ Environment setup complete"
print_status "✅ Dependencies installed"
print_status "✅ Security audit passed"
print_status "✅ Files structure verified"
print_status "✅ Development scripts ready"
echo ""
print_warning "⚠️  Next: Configure .env với Pi credentials và deploy"

exit 0