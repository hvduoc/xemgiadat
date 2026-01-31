# 🚀 KẾ HOẠCH TỐI ƯU LIGHTHOUSE - XEM GIÁ ĐẤT

**Ngày phân tích:** 31/01/2026  
**Điểm hiện tại:** Hiệu suất: 54 | Accessibility: 88 | Best Practices: 92 | SEO: 92

---

## 📊 TỔNG QUAN VẤN ĐỀ

### Các chỉ số hiệu suất cần cải thiện:

| Chỉ số | Hiện tại | Mục tiêu | Cải thiện cần |
|--------|----------|----------|---------------|
| FCP (First Contentful Paint) | 6.7s | <1.8s | -4.9s |
| LCP (Largest Contentful Paint) | 8.2s | <2.5s | -5.7s |
| TBT (Total Blocking Time) | 230ms | <200ms | -30ms |
| SI (Speed Index) | 8.3s | <3.4s | -4.9s |
| CLS (Cumulative Layout Shift) | 0 | <0.1 | ✅ Đạt |

---

## ✅ ĐÃ SỬA NGAY (Commit này)

### 1. Accessibility - Viewport Meta (Fix điểm 88→92+)
```diff
- <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no, maximum-scale=1.0">
+ <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
```
**Lý do:** Cho phép người dùng zoom giúp người khiếm thị sử dụng dễ hơn.

### 2. Accessibility - Thêm Landmarks
- Đổi `<div id="map">` → `<main id="map" role="main">`
- Đổi `<div id="action-toolbar">` → `<nav role="navigation">`
- Thêm `aria-label` cho filter button
- Thêm `aria-hidden="true"` cho các icon decorative

### 3. Performance - Preconnect Optimization
```html
<link rel="preconnect" href="https://unpkg.com" crossorigin>
<link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin>
```

### 4. Performance - CSS Loading
```html
<link rel="preload" href="font-awesome.css" as="style" onload="this.rel='stylesheet'">
```

### 5. Cache Headers
- Tăng max-age cho JS từ 3600s → 86400s (1 ngày)
- Thêm cache cho images: max-age=31536000, immutable

---

## 🔧 CẦN THỰC HIỆN TIẾP (Quan trọng)

### P0: Giảm JavaScript không dùng (Tiết kiệm ~545 KiB)

**Vấn đề:** `script.js` có 9344 dòng, rất nhiều code không dùng ngay.

**Giải pháp:**
```javascript
// 1. Code splitting - tách các module
// Tạo các file riêng:
// - map-core.js (khởi tạo bản đồ - critical)
// - firebase-auth.js (lazy load sau khi user click login)
// - portfolio.js (lazy load khi cần)
// - analytics.js (defer)

// 2. Dynamic import
const loadFirebaseAuth = async () => {
  const { initAuth } = await import('./firebase-auth.js');
  initAuth();
};
document.getElementById('login-btn').addEventListener('click', loadFirebaseAuth);
```

### P1: Rút gọn JavaScript (Tiết kiệm ~44 KiB)

**Giải pháp:** Thêm vào `vite.config.js`:
```javascript
build: {
  minify: 'terser',
  terserOptions: {
    compress: {
      drop_console: true, // Bỏ console.log trong production
      drop_debugger: true
    }
  }
}
```

### P2: Giảm CSS không dùng (Tiết kiệm ~18 KiB)

**Giải pháp:**
1. Dùng PurgeCSS để loại bỏ Tailwind CSS không dùng
2. Inline critical CSS, lazy load phần còn lại

```javascript
// vite.config.js - thêm PurgeCSS
import purgecss from 'vite-plugin-purgecss';

export default {
  plugins: [
    purgecss({
      content: ['./public/**/*.html', './src/**/*.js']
    })
  ]
}
```

### P3: Tối ưu hình ảnh (Tiết kiệm ~155 KiB)

**Giải pháp:**
1. Chuyển PNG/JPG → WebP/AVIF
2. Thêm responsive images với srcset
3. Lazy load images below the fold

```html
<picture>
  <source srcset="image.avif" type="image/avif">
  <source srcset="image.webp" type="image/webp">
  <img src="image.jpg" alt="..." loading="lazy" decoding="async">
</picture>
```

### P4: Cải thiện LCP Element

**Phát hiện:** LCP element có thể là bản đồ hoặc loading skeleton.

**Giải pháp:**
```html
<!-- Ưu tiên render skeleton/map -->
<link rel="preload" href="/images/map-placeholder.webp" as="image" fetchpriority="high">

<!-- Inline critical map styles -->
<style>
  #map { 
    background: #f0f0f0;
    min-height: 100vh;
  }
</style>
```

### P5: Giảm Long Tasks (17 tasks)

**Giải pháp:**
```javascript
// Chia nhỏ công việc với requestIdleCallback
function processInChunks(items, processItem) {
  let index = 0;
  
  function doChunk(deadline) {
    while (index < items.length && deadline.timeRemaining() > 0) {
      processItem(items[index]);
      index++;
    }
    
    if (index < items.length) {
      requestIdleCallback(doChunk);
    }
  }
  
  requestIdleCallback(doChunk);
}
```

---

## 🔴 SEO - Sửa robots.txt

**Lỗi:** Dòng có `Content-Signal: search=yes,ai-train=no` không hợp lệ.

**Nguyên nhân đã xác định:** ⚠️ **Cloudflare AI Content Protection** đang tự động inject phần header vào robots.txt với directive không chuẩn.

**Giải pháp:**
1. **Tắt tính năng Cloudflare Content Signals:**
   - Đăng nhập Cloudflare Dashboard → Website → Settings → Scrapers
   - Tắt "Content Credentials" hoặc điều chỉnh cài đặt
   
2. **Hoặc chấp nhận:** Lỗi này chỉ ảnh hưởng SEO score trong Lighthouse, không ảnh hưởng thực tế đến Google indexing vì Google bỏ qua directives không hợp lệ.

**Lưu ý:** File robots.txt local không có lỗi. Cloudflare prepend nội dung khi serve.

---

## 📋 CHECKLIST TRIỂN KHAI

### Ngắn hạn (1-2 ngày):
- [x] Fix viewport meta
- [x] Thêm landmarks (main, nav với role)
- [x] Optimize preconnect
- [x] Update cache headers
- [x] Minify console.log trong production (vite.config.js updated)
- [x] Kiểm tra robots.txt trên production → Cloudflare inject (xem giải pháp ở trên)

### Trung hạn (1-2 tuần):
- [ ] Code splitting script.js
- [ ] Implement lazy loading cho Firebase
- [x] Chuyển images sang WebP → Tạo script `npm run optimize-images` (cần cài sharp)
- [ ] Thêm critical CSS inline
- [ ] PurgeCSS cho Tailwind

### Hình ảnh cần tối ưu (phát hiện):
| File | Kích thước | Cần làm |
|------|-----------|---------|
| thumbnail.png | 796 KB | → ~100 KB WebP |
| your-avatar.png | 295 KB | → ~50 KB WebP |
| qr-code.png | 265 KB | → ~30 KB WebP |
| logo.png | 88 KB | → ~15 KB WebP |

**Chạy:** `npm install sharp --save-dev && npm run optimize-images`

### Dài hạn (1 tháng):
- [ ] Migrate hoàn toàn sang V2 (Vite bundle)
- [ ] Service Worker caching strategy
- [ ] Edge functions cho API

---

## 🎯 MỤC TIÊU SAU TỐI ƯU

| Chỉ số | Mục tiêu |
|--------|----------|
| Performance Score | 75+ |
| FCP | <2.5s |
| LCP | <4.0s |
| TBT | <150ms |
| Accessibility | 95+ |
| SEO | 100 |

---

## 📚 THAM KHẢO

- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse Performance](https://developer.chrome.com/docs/lighthouse/performance/)
- [PageSpeed Insights](https://pagespeed.web.dev/)
