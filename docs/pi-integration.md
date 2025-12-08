# Pi Network Integration Guide
## XemGiaDat - Professional Web3 Integration

### 🚀 Tổng quan

Dự án XemGiaDat đã được tích hợp chuyên nghiệp với hệ sinh thái Pi Network, cho phép người dùng:
- Đăng nhập bằng tài khoản Pi Network
- Thanh toán bằng Pi coin để mở khóa tính năng premium
- Trải nghiệm Web3 native trong Pi Browser
- Fallback tự động về Firebase Auth cho browser thông thường

### 🏗️ Kiến trúc hệ thống

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Pi Browser    │    │   XemGiaDat      │    │  Pi Platform    │
│                 │    │   Frontend       │    │     API         │
│ ┌─────────────┐ │    │ ┌──────────────┐ │    │ ┌─────────────┐ │
│ │ Pi SDK      │◄┼────┼─► pinetwork.js │ │    │ │ Payment     │ │
│ │ Integration │ │    │ │              │ │    │ │ Verification│ │
│ └─────────────┘ │    │ └──────────────┘ │    │ └─────────────┘ │
└─────────────────┘    │ ┌──────────────┐ │    └─────────────────┘
                       │ │ Netlify      │ │              ▲
┌─────────────────┐    │ │ Functions    │ │              │
│ Standard Browser│    │ │ (pi-verify)  │◄┼──────────────┘
│                 │    │ └──────────────┘ │
│ ┌─────────────┐ │    │ ┌──────────────┐ │    ┌─────────────────┐
│ │ Firebase    │◄┼────┼─► Fallback     │ │    │   Firebase      │
│ │ Auth        │ │    │ │ Auth System  │ │    │   Backend       │
│ └─────────────┘ │    │ └──────────────┘ │    └─────────────────┘
└─────────────────┘    └──────────────────┘
```

## 📋 Cấu hình ban đầu

### 1. Đăng ký Pi Developer Account

1. Truy cập [Pi Developer Portal](https://develop.pi/)
2. Tạo tài khoản và xác thực
3. Tạo ứng dụng mới với thông tin:
   - **App Name**: XemGiaDat
   - **Description**: Nền tảng thông tin bất động sản Đà Nẵng
   - **Category**: Real Estate / Tools
   - **Website**: https://xemgiadat.com

### 2. Lấy Pi App Credentials

Sau khi tạo app thành công, bạn sẽ nhận được:
- `PI_APP_ID`: Unique app identifier
- `PI_APP_SECRET`: Secret key for server verification
- `PI_PLATFORM_API_KEY`: API key for Pi Platform calls

### 3. Cấu hình Environment Variables

#### Netlify Environment Variables
```bash
PI_APP_ID=your_pi_app_id
PI_APP_SECRET=your_pi_app_secret
PI_PLATFORM_API_KEY=your_platform_api_key
NODE_ENV=production
```

#### Local Development (.env)
```bash
PI_APP_ID=your_pi_app_id_sandbox
PI_APP_SECRET=your_pi_app_secret_sandbox
PI_PLATFORM_API_KEY=your_platform_api_key_sandbox
NODE_ENV=development
```

## 🔧 Triển khai

### 1. Cài đặt Dependencies

```bash
# Không cần cài thêm package vì đã sử dụng vanilla JavaScript
# Pi SDK sẽ tự động load trong Pi Browser
```

### 2. Deploy lên Netlify

1. **Cấu hình Netlify Functions**:
   ```toml
   # netlify.toml
   [build]
     functions = "netlify/functions"
     publish = "public"

   [functions]
     node_bundler = "nft"

   [[redirects]]
     from = "/.netlify/functions/*"
     to = "/.netlify/functions/:splat"
     status = 200
   ```

2. **Deploy**:
   ```bash
   # Via Netlify CLI
   npm install -g netlify-cli
   netlify login
   netlify deploy --prod

   # Hoặc connect Git repository với Netlify
   ```

### 3. Cấu hình Pi App Settings

Trong Pi Developer Portal:
- **Sandbox URL**: `https://your-app.netlify.app`
- **Production URL**: `https://xemgiadat.com`
- **Allowed Origins**: `https://xemgiadat.com, https://your-app.netlify.app`

## 🧪 Testing

### 1. Test trong Pi Browser

1. **Download Pi Browser** (chỉ có trên mobile):
   - Android: Pi Browser app từ Pi Network
   - iOS: Pi Browser app từ Pi Network

2. **Test Flow**:
   ```javascript
   // Mở developer tools trong Pi Browser
   console.log('Pi SDK Available:', !!window.Pi);
   console.log('Pi Integration Status:', PiIntegration.getState());
   
   // Test authentication
   await PiIntegration.login();
   
   // Test payment
   await PiIntegration.donate(0.01, 'Test payment');
   ```

### 2. Test Local Development

```bash
# Start local server
npm install -g serve
serve ./public -l 5000

# Start Netlify Dev (for functions)
npm install -g netlify-cli
netlify dev
```

### 3. Test Fallback Mode

Trong browser thông thường, hệ thống sẽ tự động fallback về Firebase Auth.

## 🎯 Tính năng Premium

### Payment Tiers

| Amount (Pi) | Features Unlocked |
|-------------|-------------------|
| 0.01+ | Premium Search |
| 0.05+ | Advanced Analytics |
| 0.10+ | Data Export |
| 0.50+ | API Access |

### Feature Implementation

```javascript
// Kiểm tra user features
const user = PiIntegration.getCurrentUser();
if (user.features.includes('premium_search')) {
    // Enable premium search features
}

// Unlock features after payment
PiIntegration.donate(0.05, 'Unlock Analytics');
```

## 🔒 Bảo mật

### 1. Server-side Verification

- Tất cả payments đều được verify trên server
- Sử dụng HMAC signature verification
- Rate limiting và validation

### 2. Client-side Security

- Không store sensitive data trong localStorage
- Auto token refresh
- Secure payment flow

### 3. Production Checklist

- [ ] Pi App ID/Secret configured
- [ ] Netlify environment variables set
- [ ] HTTPS enabled
- [ ] CORS properly configured
- [ ] Error handling and logging
- [ ] Rate limiting implemented

## 🚨 Troubleshooting

### Common Issues

1. **Pi SDK not loading**:
   ```javascript
   // Check Pi Browser environment
   console.log('User Agent:', navigator.userAgent);
   console.log('Pi Available:', !!window.Pi);
   ```

2. **Payment fails**:
   ```javascript
   // Check authentication state
   console.log('Auth State:', PiIntegration.isAuthenticated());
   console.log('Current User:', PiIntegration.getCurrentUser());
   ```

3. **Server verification fails**:
   - Check environment variables
   - Verify Pi Platform API connectivity
   - Review server logs in Netlify Functions

### Debug Commands

```javascript
// Get integration status
PiIntegration.getState();

// Get configuration
PiIntegration.getConfig();

// Test notification system
PiIntegration.showNotification('Test message', 'success');

// Manual payment test
PiIntegration.createPayment(0.01, 'Test payment');
```

## 📈 Analytics & Monitoring

### Events được track:

- `pi_sdk_initialized`
- `pi_login_success`/`pi_login_failed`
- `pi_payment_initiated`/`pi_payment_completed`
- `pi_browser_detection`

### Google Analytics 4 Integration

Events tự động gửi tới GA4 với custom parameters for Pi Network tracking.

## 🔄 Future Enhancements

### Phase 1 (Hiện tại)
- ✅ Pi Browser detection
- ✅ Authentication flow
- ✅ Payment processing
- ✅ Server verification
- ✅ Feature unlocking

### Phase 2 (Kế hoạch)
- [ ] Pi Wallet integration
- [ ] Smart contract deployment
- [ ] Advanced payment features
- [ ] Multi-currency support
- [ ] Social features

### Phase 3 (Tương lai)
- [ ] Pi Marketplace integration
- [ ] NFT features for land certificates
- [ ] DAO governance
- [ ] Cross-chain bridges

## 📞 Support

Để được hỗ trợ kỹ thuật:
- Email: hotro.xemgiadat@gmail.com
- Pi Network: @xemgiadat
- Documentation: https://docs.xemgiadat.com/pi-integration

---

**© 2025 XemGiaDat - Professional Pi Network Integration**