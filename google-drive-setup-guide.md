# 🚀 Google Drive API Setup Guide - Chi Tiết Từng Bước

## 📋 **Bước 1: Tạo Google Cloud Project**

### 1.1 Truy cập Google Cloud Console
```
👉 Vào: https://console.cloud.google.com/
👉 Đăng nhập bằng tài khoản Google One 2TB của bạn
```

### 1.2 Tạo Project Mới
```
1. Click "Select a project" → "New Project"
2. Project name: "xemgiadat-drive-storage" 
3. Location: No organization
4. Click "Create"
5. Đợi project được tạo (1-2 phút)
```

## 📋 **Bước 2: Enable Google Drive API**

### 2.1 Enable APIs
```
1. Vào "APIs & Services" → "Library"
2. Search "Google Drive API"
3. Click "Google Drive API" → "Enable"
4. Search "Google Picker API" 
5. Click "Google Picker API" → "Enable"
```

### 2.2 Create Credentials
```
1. Vào "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "API Key"
3. Copy API Key → Lưu vào notepad
4. Click "Create Credentials" → "OAuth 2.0 Client IDs"
5. Application type: "Web application"
6. Name: "xemgiadat-web-client"
7. Authorized JavaScript origins:
   - https://xemgiadat.com
   - http://localhost:8080
   - https://localhost:8080
8. Authorized redirect URIs: (để trống)
9. Click "Create"
10. Copy Client ID → Lưu vào notepad
```

## 📋 **Bước 3: Cấu hình Domain**

### 3.1 OAuth Consent Screen
```
1. Vào "APIs & Services" → "OAuth consent screen"
2. User Type: "External" → "Create"
3. App information:
   - App name: "Xem Giá Đất - Portfolio Manager"
   - User support email: [email của bạn]
   - Developer contact: [email của bạn]
4. Scopes: Add "auth/drive.file"
5. Test users: Add email của bạn
6. Click "Save and Continue"
```

## 📋 **Bước 4: Implementation Code**

### 4.1 Thêm vào index.html (trước thẻ </head>)
```html
<!-- Google Drive API -->
<script src="https://apis.google.com/js/api.js"></script>
<script src="https://accounts.google.com/gsi/client"></script>
```

### 4.2 Thêm config vào script.js
```javascript
// Google Drive API Configuration
const GOOGLE_CONFIG = {
    apiKey: 'YOUR_API_KEY_HERE',
    clientId: 'YOUR_CLIENT_ID_HERE',
    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
    scope: 'https://www.googleapis.com/auth/drive.file'
};

// Portfolio folder ID (sẽ tạo tự động)
let PORTFOLIO_FOLDER_ID = null;
```

### 4.3 Initialize Google Drive
```javascript
// Initialize Google Drive API
async function initializeGoogleDrive() {
    try {
        console.log('🔄 Initializing Google Drive API...');
        
        await new Promise((resolve) => {
            gapi.load('auth2:client', resolve);
        });
        
        await gapi.client.init({
            apiKey: GOOGLE_CONFIG.apiKey,
            clientId: GOOGLE_CONFIG.clientId,
            discoveryDocs: GOOGLE_CONFIG.discoveryDocs,
            scope: GOOGLE_CONFIG.scope
        });
        
        console.log('✅ Google Drive API initialized');
        return true;
    } catch (error) {
        console.error('❌ Google Drive API initialization failed:', error);
        return false;
    }
}
```

## 📋 **Bước 5: Test Connection**

### 5.1 Test trong Console
```javascript
// Test trong browser console
initializeGoogleDrive().then(success => {
    if (success) {
        console.log('✅ Google Drive ready!');
    } else {
        console.log('❌ Failed to initialize');
    }
});
```

## 📋 **Bước 6: Tạo Folder Structure**

### 6.1 Auto-create Portfolio Folder
```javascript
async function createPortfolioFolder() {
    try {
        const authInstance = gapi.auth2.getAuthInstance();
        if (!authInstance.isSignedIn.get()) {
            await authInstance.signIn();
        }
        
        const folderMetadata = {
            name: 'xemgiadat-portfolios',
            mimeType: 'application/vnd.google-apps.folder'
        };
        
        const response = await gapi.client.drive.files.create({
            resource: folderMetadata
        });
        
        PORTFOLIO_FOLDER_ID = response.result.id;
        localStorage.setItem('portfolioFolderId', PORTFOLIO_FOLDER_ID);
        
        console.log('✅ Portfolio folder created:', PORTFOLIO_FOLDER_ID);
        return PORTFOLIO_FOLDER_ID;
    } catch (error) {
        console.error('❌ Failed to create folder:', error);
        return null;
    }
}
```

## 🎯 **Bước 7: Implementation Roadmap**

### Phase 1: Basic Setup ✅
- [x] Google Cloud Project
- [x] Enable APIs
- [x] Create Credentials
- [ ] Test Connection

### Phase 2: Core Functions
- [ ] Initialize API
- [ ] Create Folder Structure  
- [ ] Upload Function
- [ ] Get Public URLs

### Phase 3: Integration
- [ ] Replace Firebase Storage
- [ ] Update Portfolio Form
- [ ] Error Handling
- [ ] Fallback System

## 📝 **Credentials Template**

Tạo file `google-drive-config.js`:
```javascript
// Thay thế bằng credentials thực tế
const GOOGLE_DRIVE_CONFIG = {
    apiKey: 'AIza...', // API Key từ Google Cloud Console
    clientId: '123...apps.googleusercontent.com', // OAuth Client ID
    
    // Folder structure
    rootFolderName: 'xemgiadat-portfolios',
    subFolders: {
        portfolios: 'portfolio-images',
        avatars: 'user-avatars',
        listings: 'listing-images'
    }
};
```

## ⚡ **Quick Start Checklist**

- [ ] 1. Tạo Google Cloud Project
- [ ] 2. Enable Google Drive API
- [ ] 3. Tạo API Key + OAuth Client ID
- [ ] 4. Cấu hình OAuth Consent Screen
- [ ] 5. Thêm domains vào Authorized Origins
- [ ] 6. Copy credentials vào config
- [ ] 7. Test connection
- [ ] 8. Tạo folder structure
- [ ] 9. Implement upload function
- [ ] 10. Test end-to-end

## 🔧 **Troubleshooting Common Issues**

### Issue 1: "Invalid API Key"
```
Solution: Check API key trong Google Cloud Console
Verify: APIs & Services → Credentials
```

### Issue 2: "Unauthorized domain"  
```
Solution: Add domain vào Authorized JavaScript origins
Include: https://xemgiadat.com và http://localhost:8080
```

### Issue 3: "Auth required"
```
Solution: User chưa sign in Google
Call: gapi.auth2.getAuthInstance().signIn()
```

Bạn sẵn sàng bắt đầu setup không? Tôi sẽ hướng dẫn từng bước chi tiết! 🚀