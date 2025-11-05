# Google Drive API Integration Guide

## 🎯 **Lợi ích của Google Drive API:**
- **Unlimited storage** với Google Workspace
- **15GB free** với Google Account thường
- **Chia sẻ dễ dàng** với links public
- **Tốc độ tải nhanh** nhờ CDN của Google
- **Chi phí thấp** hơn Firebase Storage

## 🚀 **Cách tích hợp:**

### 1. **Cấu hình Google Cloud Console:**
```bash
1. Truy cập: https://console.cloud.google.com/
2. Tạo project mới hoặc chọn project hiện tại
3. Enable Google Drive API
4. Tạo credentials (API key + OAuth 2.0)
5. Thêm domain vào authorized origins
```

### 2. **Thêm Google Drive SDK:**
```html
<!-- Thêm vào index.html -->
<script src="https://apis.google.com/js/api.js"></script>
<script src="https://accounts.google.com/gsi/client"></script>
```

### 3. **JavaScript Integration:**
```javascript
// Initialize Google Drive API
const GOOGLE_API_KEY = 'your-api-key';
const CLIENT_ID = 'your-client-id';
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

async function initializeGoogleDrive() {
    await gapi.load('auth2', async () => {
        await gapi.auth2.init({
            client_id: CLIENT_ID,
        });
    });
    
    await gapi.load('client', async () => {
        await gapi.client.init({
            apiKey: GOOGLE_API_KEY,
            discoveryDocs: DISCOVERY_DOCS,
        });
    });
}

// Upload image to Google Drive
async function uploadToGoogleDrive(file, filename) {
    const authInstance = gapi.auth2.getAuthInstance();
    
    if (!authInstance.isSignedIn.get()) {
        await authInstance.signIn();
    }
    
    const metadata = {
        name: filename,
        parents: ['your-folder-id'], // Tạo folder riêng cho app
    };
    
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], {
        type: 'application/json'
    }));
    form.append('file', file);
    
    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: new Headers({
            'Authorization': `Bearer ${authInstance.currentUser.get().getAuthResponse().access_token}`
        }),
        body: form
    });
    
    const fileData = await response.json();
    
    // Make file public and get direct link
    await gapi.client.drive.permissions.create({
        fileId: fileData.id,
        resource: {
            role: 'reader',
            type: 'anyone'
        }
    });
    
    return `https://drive.google.com/uc?id=${fileData.id}`;
}
```

### 4. **Portfolio Integration:**
```javascript
// Modify uploadPortfolioImages function
async function uploadPortfolioImages(portfolioId, userId) {
    const uploadedUrls = [];
    
    for (let i = 0; i < selectedImages.length; i++) {
        const imageData = selectedImages[i];
        const compressedFile = await compressImage(imageData.file);
        
        // Use Google Drive instead of Firebase Storage
        const filename = `portfolio_${portfolioId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
        const driveUrl = await uploadToGoogleDrive(compressedFile, filename);
        
        uploadedUrls.push(driveUrl);
    }
    
    return uploadedUrls;
}
```

## 💡 **Hybrid Approach (Khuyến nghị):**
```javascript
// Use both Firebase Storage and Google Drive
const USE_GOOGLE_DRIVE = localStorage.getItem('useGoogleDrive') === 'true';

async function uploadImage(file, path) {
    if (USE_GOOGLE_DRIVE) {
        return await uploadToGoogleDrive(file, path);
    } else {
        return await uploadToFirebaseStorage(file, path);
    }
}
```

## ⚡ **Tối ưu ngay lập tức:**
1. **Giảm kích thước ảnh**: 1200px → 800px (đã implement)
2. **WebP compression**: Tiết kiệm 25-35% dung lượng
3. **Lazy loading**: Chỉ tải ảnh khi cần
4. **CDN**: Sử dụng Google Drive làm CDN miễn phí

## 🎯 **Implementation Priority:**
1. ✅ **Cải thiện compression** (completed)
2. 🔄 **Firebase Storage Rules** (in progress)
3. 📋 **Google Drive API** (next)
4. 🏗️ **Hybrid storage system** (future)