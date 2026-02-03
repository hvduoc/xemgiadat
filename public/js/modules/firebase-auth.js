/**
 * Firebase Auth Module - Lazy Loaded
 * Only loads when user clicks login button
 * Reduces initial bundle size by ~50KB
 */

let authInitialized = false;
let authInitPromise = null;

export async function initFirebaseAuth() {
    if (authInitialized) return;
    if (authInitPromise) return authInitPromise;
    
    console.log('🔐 Loading Firebase Auth module...');
    const t0 = performance.now();
    
    authInitPromise = (async () => {
        try {
            // Firebase Auth is already loaded by index.html
            if (!window.firebase || !window.firebase.auth) {
                throw new Error('Firebase SDK not available');
            }
            
            const auth = window.firebase.auth();
            const db = window.firebase.firestore();
            
            // Setup auth state listener
            auth.onAuthStateChanged(async (user) => {
                await handleAuthStateChanged(user, auth, db);
            });
            
            authInitialized = true;
            const t1 = performance.now();
            console.log(`✅ Firebase Auth initialized in ${(t1-t0).toFixed(0)}ms`);
            
            return { auth, db };
        } catch (error) {
            console.error('❌ Firebase Auth init failed:', error);
            authInitPromise = null;
            throw error;
        }
    })();
    
    return authInitPromise;
}

async function handleAuthStateChanged(user, auth, db) {
    const ADMIN_UID = "FEpPWWT1EaTWQ9FOqBxWN5FeEJk1";
    const adminBtn = document.getElementById('admin-btn');
    
    console.log('🔐 Auth state changed:', { 
        userExists: !!user, 
        userUID: user?.uid, 
        isAdmin: user?.uid === ADMIN_UID,
        adminBtnExists: !!adminBtn 
    });
    
    if (user) {
        window.currentUser = user;
        const userRef = db.collection("users").doc(user.uid);
        const doc = await userRef.get();
        if (!doc.exists) {
            await userRef.set({
                displayName: user.displayName || "", 
                email: user.email || "", 
                phone: "", 
                contactFacebook: "", 
                createdAt: window.firebase.firestore.FieldValue.serverTimestamp(), 
                updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        // Load user portfolio when logged in
        if (window.loadUserPortfolio) {
            await window.loadUserPortfolio();
        }
        
        // Show admin button if user is admin OR if running on localhost for testing
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (user.uid === ADMIN_UID || isLocalhost) {
            console.log('👑 Showing admin button (admin user or localhost)');
            // Dynamically inject admin button if not exists
            let adminBtn = document.getElementById('admin-btn');
            if (!adminBtn) {
                const sidebar = document.getElementById('right-sidebar');
                if (sidebar) {
                    adminBtn = document.createElement('button');
                    adminBtn.id = 'admin-btn';
                    adminBtn.title = 'Quản trị hệ thống';
                    adminBtn.className = 'bg-red-600 text-white w-12 h-12 rounded-full shadow-lg flex items-center justify-center hover:bg-red-700 transition active:scale-95';
                    adminBtn.setAttribute('aria-label', 'Trang quản trị');
                    adminBtn.innerHTML = '<i class="fa-solid fa-cog text-xl"></i>';
                    adminBtn.addEventListener('click', () => window.location.href = '/admin.html');
                    sidebar.appendChild(adminBtn);
                    console.log('✅ Admin button injected');
                }
            } else {
                adminBtn.style.display = 'flex';
            }
        }
        
        const firebaseuiContainer = document.getElementById('firebaseui-auth-container');
        const loginBtn = document.getElementById('login-btn');
        const userProfileDiv = document.getElementById('user-profile');
        const addLocationBtn = document.getElementById('add-location-btn');
        
        if (firebaseuiContainer) firebaseuiContainer.classList.add('hidden');
        if (loginBtn) loginBtn.classList.add('hidden');
        if (userProfileDiv) {
            userProfileDiv.classList.remove('hidden');
            userProfileDiv.classList.add('flex');
        }
        const userAvatar = document.getElementById('user-avatar');
        if (userAvatar) {
            userAvatar.src = user.photoURL || 'https://placehold.co/40x40/e2e8f0/64748b?text=A';
        }
        if (addLocationBtn) addLocationBtn.disabled = false;
    } else {
        window.currentUser = null;
        window.userPortfolio = []; // Clear portfolio when logged out
        if (adminBtn) adminBtn.style.display = 'none';
        
        const loginBtn = document.getElementById('login-btn');
        const userProfileDiv = document.getElementById('user-profile');
        const addLocationBtn = document.getElementById('add-location-btn');
        
        if (loginBtn) loginBtn.classList.remove('hidden');
        if (userProfileDiv) {
            userProfileDiv.classList.add('hidden');
            userProfileDiv.classList.remove('flex');
        }
        if (window.exitAllModes) window.exitAllModes();
        if (addLocationBtn) addLocationBtn.disabled = true;
    }
}

export async function showLoginUI() {
    const { auth } = await initFirebaseAuth();
    const firebaseuiContainer = document.getElementById('firebaseui-auth-container');
    
    if (!firebaseuiContainer) {
        alert('Hệ thống đăng nhập chưa sẵn sàng. Vui lòng tải lại trang.');
        return;
    }
    
    // Ensure FirebaseUI CSS is loaded
    if (window.ensureFirebaseUiCss) {
        window.ensureFirebaseUiCss();
    }
    
    // Verify Firebase Auth is initialized
    if (!auth || !window.firebase.auth) {
        console.error('❌ Firebase Auth not initialized!');
        alert('Hệ thống đăng nhập chưa sẵn sàng. Vui lòng tải lại trang.');
        return;
    }
    
    // Initialize FirebaseUI if not already done
    if (!window.ui && window.initFirebaseUI) {
        window.initFirebaseUI();
    }
    
    if (!window.ui) {
        console.error('❌ FirebaseUI not available!');
        alert('Hệ thống đăng nhập chưa sẵn sàng. Vui lòng tải lại trang.');
        return;
    }
    
    // Debug logging for production deployment differences
    console.log('🌐 Environment:', {
        hostname: window.location.hostname,
        protocol: window.location.protocol,
        userAgent: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        platform: navigator.platform,
        authExists: !!auth,
        firebaseExists: !!window.firebase,
        firebaseuiExists: !!window.firebaseui
    });
    
    // Show the FirebaseUI container
    firebaseuiContainer.classList.remove('hidden');
    firebaseuiContainer.style.display = 'flex';
    firebaseuiContainer.style.visibility = 'visible';
    
    console.log('✅ Login UI shown');
}
