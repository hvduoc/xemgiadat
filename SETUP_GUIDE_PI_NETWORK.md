# 🚀 Hướng Dẫn Setup Chi Tiết Pi Network Integration

## 📋 Tổng Quan

Hướng dẫn này sẽ giúp bạn setup hoàn chỉnh tích hợp Pi Network cho dự án **XemGiaDat** từ A-Z với bảo mật tối đa.

---

## 🎯 BƯỚC 1: Đăng Ký Pi Developer Account

### 1.1 Tạo Tài Khoản Developer

```bash
# Truy cập Pi Developer Portal
https://developer.minepi.com/
```

**Thực hiện:**
1. 🔐 Đăng nhập bằng Pi Network account
2. 📝 Điền thông tin developer profile
3. ✅ Xác minh email và số điện thoại
4. 🔄 Enable 2FA (bắt buộc cho bảo mật)

### 1.2 Tạo Ứng Dụng Mới

**Trong Pi Developer Dashboard:**

```
App Name: XemGiaDat - Xem Giá Đất Vietnam
App Type: Web Application  
Category: Utilities
Description: Vietnamese Real Estate Price Visualization Platform
Website URL: https://your-netlify-domain.netlify.app
Webhook URL: https://your-netlify-domain.netlify.app/.netlify/functions/pi-verify
```

**Nhận thông tin quan trọng:**
- ✅ `PI_APP_ID` (public, safe to expose)
- 🔒 `PI_APP_SECRET` (private, never expose)
- 🔐 `PI_PLATFORM_API_KEY` (critical, never expose)

---

## 🔧 BƯỚC 2: Setup Local Development

### 2.1 Chuẩn Bị Environment

```bash
# Di chuyển đến thư mục project
cd D:\DUAN1\Firebase\xemgiadat

# Tạo file environment từ template
cp .env.example .env

# Cài đặt dependencies nếu chưa có
npm install
```

### 2.2 Cấu Hình Environment Variables

**Mở file `.env` và điền thông tin:**

```env
# Pi Network Configuration
PI_APP_ID=your_actual_app_id_from_pi_developer_dashboard
PI_APP_SECRET=your_actual_secret_from_pi_developer_dashboard  
PI_PLATFORM_API_KEY=your_actual_platform_api_key

# Firebase Configuration (đã có)
FIREBASE_API_KEY=your_existing_firebase_key
FIREBASE_AUTH_DOMAIN=your_existing_auth_domain
# ... các config Firebase hiện tại

# Analytics (optional)
GA_MEASUREMENT_ID=your_ga4_measurement_id
```

**⚠️ QUAN TRỌNG:**
- ❌ **KHÔNG ĐƯỢC** commit file `.env` vào Git
- ✅ File `.env` đã được thêm vào `.gitignore`
- 🔒 Chỉ sử dụng cho local development

### 2.3 Test Local Setup

```bash
# Chạy security audit
node security-audit.js

# Test Pi integration 
node test-pi-integration.js

# Khởi động local server
npm run dev
# hoặc
python -m http.server 8000
```

**Expected Output:**
```
🔐 Security Score: 100/100 ✅
🚀 Pi Browser Detection: Working
💰 Payment Flow: Configured
🔗 Webhook Endpoint: Ready
```

---

## 🌐 BƯỚC 3: Setup Production (Netlify)

### 3.1 Deploy Code Base

```bash
# Push code lên repository (đảm bảo .env không được commit)
git add .
git commit -m "✅ Pi Network integration with security hardening"
git push origin main
```

### 3.2 Cấu Hình Netlify Environment

**Trong Netlify Dashboard:**

1. 🏗️ **Site Settings** → **Environment Variables**
2. 🔐 **Add Environment Variables**:

```
Name: PI_APP_ID
Value: [your_actual_app_id]
Scope: All

Name: PI_APP_SECRET  
Value: [your_actual_secret]
Scope: All (Functions only)

Name: PI_PLATFORM_API_KEY
Value: [your_actual_platform_key] 
Scope: All (Functions only)
```

**Screenshot hướng dẫn:**
```
Netlify Dashboard → Site Settings → Environment Variables → Add Variable
┌─────────────────────────────────┐
│ Name: PI_APP_ID                 │
│ Value: ●●●●●●●●●●●●●●●●●●●●     │ 
│ Scope: ☑ All deployments       │
│ [Save] [Cancel]                 │
└─────────────────────────────────┘
```

### 3.3 Cấu Hình Build Settings

**File `netlify.toml` (đã có):**
```toml
[build]
  command = "echo 'Static site ready'"
  publish = "public"

[functions]
  directory = "netlify/functions"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Strict-Transport-Security = "max-age=31536000; includeSubDomains"
```

### 3.4 Test Production Deploy

```bash
# Trigger deployment
git push origin main

# Check deployment logs
# Netlify Dashboard → Deploys → [Latest Deploy] → Function Logs
```

**Verify checklist:**
- ✅ Site deploys successfully
- ✅ Functions are deployed  
- ✅ Environment variables are set
- ✅ No secrets in build logs
- ✅ Security headers active

---

## 🔐 BƯỚC 4: Cấu Hình Pi Developer Portal

### 4.1 Update App Settings

**Trong Pi Developer Dashboard:**

```
App URL: https://your-site-name.netlify.app
Webhook URL: https://your-site-name.netlify.app/.netlify/functions/pi-verify

Scopes (Permissions):
☑ payments
☑ username  
☑ wallet_address

Payment Settings:
☑ Enable Payments
☑ Sandbox Mode (for testing)
```

### 4.2 Setup Webhook Verification

**Test webhook endpoint:**
```bash
curl -X POST https://your-site-name.netlify.app/.netlify/functions/pi-verify \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Invalid request signature"
}
```
*Đây là response mong đợi (không có signature)*

---

## 🧪 BƯỚC 5: Testing & Validation

### 5.1 Test Trong Pi Browser

```bash
# Truy cập từ Pi Browser trên mobile
https://your-site-name.netlify.app

# Test authentication flow
1. Click "Đăng Nhập Với Pi"
2. Authorize trong Pi app
3. Verify user data hiển thị

# Test payment flow  
1. Select premium feature
2. Create payment
3. Approve trong Pi Wallet
4. Verify unlock feature
```

### 5.2 Test Trong Regular Browser

```bash
# Truy cập từ Chrome/Firefox
https://your-site-name.netlify.app

# Should show:
"⚠️ Ứng dụng này tối ưu cho Pi Browser"
[Download Pi Browser] button
+ Firebase Auth fallback
```

### 5.3 Automated Testing

```bash
# Run test suite
node test-pi-integration.js

# Run security audit
node security-audit.js

# Performance test
npm run lighthouse-test
```

---

## ⚡ BƯỚC 6: Go Live Production

### 6.1 Disable Sandbox Mode

**Pi Developer Dashboard:**
```
Payment Settings:
☐ Sandbox Mode  ← Uncheck this
☑ Production Mode ← Enable this
```

### 6.2 Update Domain Configuration

```bash
# Custom domain (optional)
# Netlify → Domain Settings → Add Custom Domain
xemgiadat.com → CNAME → your-site-name.netlify.app

# SSL Certificate (automatic)
# Force HTTPS redirect
```

### 6.3 Marketing Integration

**Update marketing materials:**
```html
<!-- Add Pi Network badge -->
<img src="https://raw.githubusercontent.com/pi-apps/pi-platform-docs/master/images/pi-badge.png" 
     alt="Available on Pi Network" />

<!-- SEO meta tags -->
<meta property="og:title" content="XemGiaDat - Pi Network Integration" />
<meta property="og:description" content="Xem giá đất toàn quốc với thanh toán Pi Network" />
```

---

## 📊 BƯỚC 7: Monitoring & Analytics

### 7.1 Setup Analytics Dashboard

```javascript
// Google Analytics 4 Events (đã tích hợp)
- pi_auth_success
- pi_auth_error  
- pi_payment_created
- pi_payment_completed
- pi_feature_unlocked
```

### 7.2 Error Monitoring

```bash
# Netlify Functions Logs
https://app.netlify.com/sites/your-site/functions

# Pi Developer Analytics  
https://developer.minepi.com/analytics
```

### 7.3 Security Monitoring

```bash
# Daily security audit
node security-audit.js

# Monitor unusual API calls
# Check Pi Developer Dashboard regularly
```

---

## 🚨 BƯỚC 8: Security Checklist

### 8.1 Pre-Launch Checklist

```
Environment Security:
☑ .env file not committed to git
☑ Secrets only in Netlify environment  
☑ No hardcoded credentials in code
☑ .gitignore configured properly

Pi Network Security:
☑ 2FA enabled on Pi Developer account
☑ Webhook signature verification active
☑ Rate limiting implemented
☑ HTTPS enforced

Application Security:  
☑ CSP headers configured
☑ XSS protection enabled
☑ CORS properly configured
☑ Input validation implemented
```

### 8.2 Post-Launch Monitoring

```bash
# Weekly security audit
node security-audit.js

# Monitor Pi Developer Dashboard
- Unusual API usage patterns
- Failed authentication attempts  
- Suspicious payment activities

# Rotate credentials quarterly
- Generate new PI_APP_SECRET
- Update environment variables
- Test all functionalities
```

---

## 🎯 BƯỚC 9: Troubleshooting Common Issues

### 9.1 Authentication Issues

**Problem:** "Pi authentication failed"
```bash
# Check:
1. PI_APP_ID correct in environment
2. App approved in Pi Developer Portal
3. Correct scopes configured
4. User has Pi Browser installed
```

**Solution:**
```javascript
// Debug in browser console
console.log('Pi Browser detected:', window.Pi !== undefined);
console.log('App ID configured:', PI_APP_ID);
```

### 9.2 Payment Issues

**Problem:** "Payment verification failed"
```bash
# Check:
1. PI_APP_SECRET correct in Netlify
2. PI_PLATFORM_API_KEY valid
3. Webhook signature verification
4. Network connectivity
```

**Solution:**
```bash
# Test webhook manually
curl -X POST https://your-site.netlify.app/.netlify/functions/pi-verify \
  -H "Content-Type: application/json" \
  -H "X-Pi-Signature: test" \
  -d '{"identifier": "test", "user_uid": "test"}'
```

### 9.3 Environment Variable Issues

**Problem:** "Environment variables not found"
```bash
# Check Netlify Dashboard:
1. Site Settings → Environment Variables
2. Verify all 3 Pi variables exist
3. Check spelling and spaces
4. Redeploy after adding variables
```

---

## ✅ HOÀN THÀNH

🎉 **Congratulations!** Bạn đã setup thành công Pi Network integration với:

- 🔐 **Enterprise-grade security**
- 💰 **Complete payment system** 
- 📱 **Mobile-optimized experience**
- 🚀 **Production-ready deployment**
- 📊 **Analytics & monitoring**

### 🔗 Quick Links

```
Production Site: https://your-site-name.netlify.app
Pi Developer Dashboard: https://developer.minepi.com
Netlify Dashboard: https://app.netlify.com
Analytics: Google Analytics 4
Monitoring: security-audit.js
```

### 📞 Support

Nếu gặp vấn đề, check:
1. 📋 Security audit report: `node security-audit.js`
2. 🧪 Integration test: `node test-pi-integration.js`  
3. 📊 Netlify function logs
4. 📱 Pi Developer Portal analytics

**Happy coding! 🚀**