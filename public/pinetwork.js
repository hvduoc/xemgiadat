/**
 * Pi Network Integration Module for XemGiaDat
 * Professional integration with Pi Browser and Pi Wallet
 * Handles authentication, payments, and user management
 * 
 * @version 1.0.0
 * @author XemGiaDat Development Team
 */

(function () {
    'use strict';
    
    // Configuration - CLIENT SIDE ONLY
    const CONFIG = {
        APP_NAME: 'XemGiaDat',
        APP_ID: 'xemgiadat_app', // Public identifier - safe to expose
        API_BASE: 'https://xemgiadat.com', // Production domain
        STORAGE_KEYS: {
            USER_PROFILE: 'pi_user_profile',
            ACCESS_TOKEN: 'pi_access_token',
            LAST_LOGIN: 'pi_last_login'
        },
        PAYMENT_TYPES: {
            DONATION: 'donation',
            PREMIUM: 'premium_features',
            DATA_ACCESS: 'data_access'
        }
    };

    // State management
    const state = {
        isAuthenticated: false,
        currentUser: null,
        piSDK: null,
        authInProgress: false
    };

    /**
     * Detect if running in Pi Browser environment
     * @returns {boolean}
     */
    function isPiBrowser() {
        try {
            const ua = navigator.userAgent || '';
            const hasPiUserAgent = /PiBrowser/i.test(ua);
            const hasPiSDK = !!(window.Pi || window.pi);
            const hasPiObject = typeof window.Pi === 'object';
            
            return hasPiUserAgent || hasPiSDK || hasPiObject;
        } catch (error) {
            console.warn('Error detecting Pi Browser:', error);
            return false;
        }
    }

    /**
     * Initialize Pi SDK
     * @returns {Promise<boolean>}
     */
    async function initializePiSDK() {
        if (!isPiBrowser()) {
            return false;
        }

        try {
            // Wait for Pi SDK to be available
            if (!window.Pi) {
                await new Promise((resolve, reject) => {
                    let attempts = 0;
                    const checkPi = () => {
                        attempts++;
                        if (window.Pi) {
                            resolve();
                        } else if (attempts > 50) { // 5 seconds timeout
                            reject(new Error('Pi SDK not loaded'));
                        } else {
                            setTimeout(checkPi, 100);
                        }
                    };
                    checkPi();
                });
            }

            state.piSDK = window.Pi;
            console.log('✅ Pi SDK initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Pi SDK initialization failed:', error);
            return false;
        }
    }

    /**
     * Request authentication from Pi Network
     * @returns {Promise<Object>}
     */
    async function piRequestAuth() {
        if (state.authInProgress) {
            throw new Error('Authentication already in progress');
        }

        state.authInProgress = true;

        try {
            if (!state.piSDK) {
                const sdkReady = await initializePiSDK();
                if (!sdkReady) {
                    throw new Error('Pi SDK not available');
                }
            }

            // Pi SDK v2 authentication
            const authResult = await state.piSDK.authenticate([
                'payments',
                'username',
                'wallet_address'
            ], {
                onIncompletePaymentFound: (payment) => {
                    console.log('Incomplete payment found:', payment);
                    handleIncompletePayment(payment);
                }
            });

            // Store authentication data
            if (authResult.accessToken) {
                localStorage.setItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN, authResult.accessToken);
                localStorage.setItem(CONFIG.STORAGE_KEYS.LAST_LOGIN, Date.now().toString());
            }

            state.isAuthenticated = true;
            trackEvent('pi_auth_success', { method: 'pi_browser' });
            
            return authResult;
        } catch (error) {
            console.error('Pi authentication failed:', error);
            trackEvent('pi_auth_failed', { error: error.message });
            throw error;
        } finally {
            state.authInProgress = false;
        }
    }

    /**
     * Handle incomplete payments
     * @param {Object} payment
     */
    async function handleIncompletePayment(payment) {
        try {
            const txid = payment.transaction?.txid;
            if (txid) {
                // Verify with server
                const verified = await verifyPaymentOnServer(txid, payment);
                if (verified) {
                    showNotification('Thanh toán đã được xác nhận!', 'success');
                } else {
                    showNotification('Đang xử lý thanh toán...', 'info');
                }
            }
        } catch (error) {
            console.error('Error handling incomplete payment:', error);
        }
    }

    /**
     * Request Pi payment
     * @param {number} amount - Amount in Pi
     * @param {string} memo - Payment memo
     * @param {string} type - Payment type
     * @returns {Promise<Object>}
     */
    async function piRequestPay(amount, memo = '', type = CONFIG.PAYMENT_TYPES.DONATION) {
        if (!state.isAuthenticated) {
            throw new Error('User not authenticated');
        }

        try {
            if (!state.piSDK) {
                throw new Error('Pi SDK not available');
            }

            // Validate amount
            if (amount <= 0 || amount > 1000) {
                throw new Error('Invalid payment amount');
            }

            // Create payment request
            const paymentData = {
                amount: parseFloat(amount.toFixed(7)), // Pi precision
                memo: memo || `${CONFIG.APP_NAME} - ${type}`,
                metadata: {
                    type: type,
                    timestamp: Date.now(),
                    app_id: CONFIG.APP_ID,
                    user_id: state.currentUser?.uid || 'anonymous'
                }
            };

            console.log('🚀 Initiating Pi payment:', paymentData);

            // Request payment from Pi SDK
            const paymentResult = await state.piSDK.createPayment(paymentData, {
                onReadyForServerApproval: (paymentId) => {
                    console.log('Payment ready for server approval:', paymentId);
                    approvePaymentOnServer(paymentId, paymentData);
                },
                onReadyForServerCompletion: (paymentId, txid) => {
                    console.log('Payment ready for completion:', paymentId, txid);
                    completePaymentOnServer(paymentId, txid);
                },
                onCancel: (paymentId) => {
                    console.log('Payment cancelled:', paymentId);
                    trackEvent('pi_payment_cancelled', { payment_id: paymentId });
                },
                onError: (error, payment) => {
                    console.error('Payment error:', error, payment);
                    trackEvent('pi_payment_error', { error: error.message });
                }
            });

            trackEvent('pi_payment_initiated', {
                amount: amount,
                type: type,
                payment_id: paymentResult.identifier
            });

            return paymentResult;
        } catch (error) {
            console.error('Pi payment failed:', error);
            trackEvent('pi_payment_failed', { error: error.message });
            
            // Fallback to traditional donation modal for non-Pi environments
            if (!isPiBrowser()) {
                openDonationModal();
                return null;
            }
            
            throw error;
        }
    }

    /**
     * Approve payment on server
     * @param {string} paymentId
     * @param {Object} paymentData
     */
    async function approvePaymentOnServer(paymentId, paymentData) {
        try {
            const response = await fetch(`${CONFIG.API_BASE}/.netlify/functions/pi-verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN)}`
                },
                body: JSON.stringify({
                    action: 'approve',
                    paymentId: paymentId,
                    paymentData: paymentData
                })
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'Server approval failed');
            }

            console.log('✅ Payment approved on server:', result);
            return result;
        } catch (error) {
            console.error('❌ Server approval failed:', error);
            throw error;
        }
    }

    /**
     * Complete payment on server
     * @param {string} paymentId
     * @param {string} txid
     */
    async function completePaymentOnServer(paymentId, txid) {
        try {
            const response = await fetch(`${CONFIG.API_BASE}/.netlify/functions/pi-verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN)}`
                },
                body: JSON.stringify({
                    action: 'complete',
                    paymentId: paymentId,
                    txid: txid
                })
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'Server completion failed');
            }

            console.log('✅ Payment completed on server:', result);
            showNotification('Thanh toán thành công! Cảm ơn bạn đã ủng hộ dự án.', 'success');
            
            // Update user interface if needed
            if (result.features) {
                updateUserFeatures(result.features);
            }

            return result;
        } catch (error) {
            console.error('❌ Server completion failed:', error);
            showNotification('Có lỗi xảy ra khi xử lý thanh toán. Vui lòng liên hệ hỗ trợ.', 'error');
            throw error;
        }
    }

    /**
     * Verify payment on server
     * @param {string} txid
     * @param {Object} payment
     */
    async function verifyPaymentOnServer(txid, payment) {
        try {
            const response = await fetch(`${CONFIG.API_BASE}/.netlify/functions/pi-verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'verify',
                    txid: txid,
                    payment: payment
                })
            });

            const result = await response.json();
            return response.ok && result.verified;
        } catch (error) {
            console.error('Payment verification failed:', error);
            return false;
        }
    }
    
    /**
     * Save user profile to local storage
     * @param {Object} profile
     */
    function saveUserProfile(profile) {
        try {
            const enhancedProfile = {
                ...profile,
                lastLogin: Date.now(),
                loginMethod: 'pi_network',
                features: profile.features || []
            };
            localStorage.setItem(CONFIG.STORAGE_KEYS.USER_PROFILE, JSON.stringify(enhancedProfile));
            state.currentUser = enhancedProfile;
        } catch (error) {
            console.warn('Could not save profile to localStorage:', error);
        }
    }

    /**
     * Load user profile from local storage
     * @returns {Object|null}
     */
    function loadUserProfile() {
        try {
            const profileData = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_PROFILE);
            if (profileData) {
                const profile = JSON.parse(profileData);
                state.currentUser = profile;
                state.isAuthenticated = true;
                return profile;
            }
        } catch (error) {
            console.warn('Error loading user profile:', error);
        }
        return null;
    }

    /**
     * Clear user profile and authentication state
     */
    function clearUserProfile() {
        try {
            localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_PROFILE);
            localStorage.removeItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
            localStorage.removeItem(CONFIG.STORAGE_KEYS.LAST_LOGIN);
        } catch (error) {
            console.warn('Error clearing user profile:', error);
        }
        
        state.currentUser = null;
        state.isAuthenticated = false;
    }

    /**
     * Update UI for authenticated user
     * @param {Object|null} user
     */
    function updateUiForUser(user) {
        const loginBtn = document.getElementById('login-btn');
        const userProfile = document.getElementById('user-profile');
        const userAvatar = document.getElementById('user-avatar');

        if (!user) {
            // Show login button, hide profile
            if (loginBtn) {
                loginBtn.classList.remove('hidden');
                loginBtn.style.display = 'flex';
            }
            if (userProfile) {
                userProfile.classList.add('hidden');
                userProfile.style.display = 'none';
            }
            
            // Update toolbar buttons that require authentication
            const addLocationBtn = document.getElementById('add-location-btn');
            if (addLocationBtn) {
                addLocationBtn.disabled = true;
                addLocationBtn.classList.add('opacity-50', 'cursor-not-allowed');
            }
            return;
        }

        // Hide login button, show profile
        if (loginBtn) {
            loginBtn.classList.add('hidden');
            loginBtn.style.display = 'none';
        }
        
        if (userProfile) {
            userProfile.classList.remove('hidden');
            userProfile.style.display = 'flex';
        }

        // Update avatar
        if (userAvatar && user.avatar) {
            userAvatar.src = user.avatar;
            userAvatar.alt = user.displayName || 'Pi User';
        }

        // Enable authenticated features
        const addLocationBtn = document.getElementById('add-location-btn');
        if (addLocationBtn) {
            addLocationBtn.disabled = false;
            addLocationBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }

        // Show welcome message
        showNotification(`Chào mừng ${user.displayName || 'bạn'} trở lại!`, 'success');
    }

    /**
     * Update user features after payment
     * @param {Array} features
     */
    function updateUserFeatures(features) {
        if (state.currentUser) {
            state.currentUser.features = [...(state.currentUser.features || []), ...features];
            saveUserProfile(state.currentUser);
            
            // Show feature unlock notification
            const featureNames = features.join(', ');
            showNotification(`🎉 Tính năng mới đã mở khóa: ${featureNames}`, 'success');
        }
    }

    /**
     * Show notification to user
     * @param {string} message
     * @param {string} type - 'success', 'error', 'info', 'warning'
     */
    function showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-[9999] p-4 rounded-lg shadow-lg max-w-sm transition-all duration-300 transform translate-x-full`;
        
        // Style based on type
        const styles = {
            success: 'bg-green-500 text-white',
            error: 'bg-red-500 text-white',
            warning: 'bg-yellow-500 text-black',
            info: 'bg-blue-500 text-white'
        };
        
        notification.classList.add(...(styles[type] || styles.info).split(' '));
        notification.innerHTML = `
            <div class="flex items-center space-x-2">
                <span class="flex-1">${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="text-current opacity-70 hover:opacity-100">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 10);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.classList.add('translate-x-full');
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }

    function openFirebaseAuthFallback() {
        // Reveal FirebaseUI modal if present
        const el = document.getElementById('firebaseui-auth-container');
        if (el) el.classList.remove('hidden');
    }

    function openDonationModal() {
        const d = document.getElementById('donate-modal');
        if (d) d.classList.remove('hidden');
        else console.log('Open donation flow (no modal found)');
    }

    /**
     * Handle login button click
     */
    async function onLoginClick() {
        try {
            if (isPiBrowser()) {
                showNotification('Đang kết nối với Pi Network...', 'info');
                
                const authResult = await piRequestAuth();
                
                // Extract user information from Pi auth result
                const user = {
                    uid: authResult.user?.uid || `pi_${Date.now()}`,
                    displayName: authResult.user?.username || 'Pi User',
                    email: authResult.user?.email || null,
                    avatar: '/images/pi-user-avatar.png',
                    piData: {
                        accessToken: authResult.accessToken,
                        uid: authResult.user?.uid,
                        username: authResult.user?.username,
                        walletAddress: authResult.user?.wallet_address
                    },
                    features: [],
                    loginMethod: 'pi_network',
                    lastLogin: Date.now()
                };
                
                saveUserProfile(user);
                updateUiForUser(user);
                
                console.log('✅ Pi login successful:', {
                    uid: user.uid,
                    username: user.displayName,
                    features: user.features
                });
                
                trackEvent('pi_login_success', {
                    method: 'pi_network',
                    user_type: 'pi_user'
                });
                
            } else {
                // Not in Pi Browser -> fallback to Firebase
                console.log('Not in Pi Browser, using Firebase fallback');
                openFirebaseAuthFallback();
            }
        } catch (error) {
            console.error('Login failed:', error);
            showNotification(`Đăng nhập thất bại: ${error.message}`, 'error');
            
            // Fallback to Firebase on Pi auth failure
            if (isPiBrowser()) {
                showNotification('Chuyển sang phương thức đăng nhập dự phòng...', 'info');
                setTimeout(openFirebaseAuthFallback, 1000);
            } else {
                openFirebaseAuthFallback();
            }
            
            trackEvent('pi_login_failed', {
                error: error.message,
                fallback_used: true
            });
        }
    }

    /**
     * Handle logout button click
     */
    function onLogoutClick() {
        try {
            // Clear Pi authentication state
            clearUserProfile();
            updateUiForUser(null);
            
            // Also sign out of Firebase if present
            if (window.firebase && window.firebase.auth) {
                try {
                    window.firebase.auth().signOut();
                } catch (error) {
                    console.warn('Firebase signout failed:', error);
                }
            }
            
            showNotification('Đã đăng xuất thành công', 'success');
            
            trackEvent('pi_logout', {
                method: 'pi_network'
            });
            
        } catch (error) {
            console.error('Logout failed:', error);
            showNotification('Có lỗi khi đăng xuất', 'error');
        }
    }

    async function onDonate(amount = 0.01, memo = 'Support XemGiaDat') {
        if (isPiBrowser()) {
            try {
                const resp = await piRequestPay(amount, memo);
                console.log('Pi pay response', resp);
                // TODO: call server to verify payment if Pi provides server-side webhook/signature
            } catch (err) {
                console.error('Payment failed', err);
            }
        } else {
            openDonationModal();
        }
    }

    function attachUiBindings() {
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) loginBtn.addEventListener('click', onLoginClick);

        const logoutMenu = document.getElementById('logout-btn-menu');
        if (logoutMenu) logoutMenu.addEventListener('click', onLogoutClick);

        // If there is a donate or quick donate button, attach sample handler
        const quickDonate = document.getElementById('quick-copy-qr');
        if (quickDonate) quickDonate.addEventListener('click', () => onDonate(0.05, 'Mời cafe'));
    }

    /**
     * Attach UI event bindings
     */
    function attachUiBindings() {
        try {
            // Login button
            const loginBtn = document.getElementById('login-btn');
            if (loginBtn) {
                loginBtn.addEventListener('click', onLoginClick);
                console.log('✅ Login button bound');
            }

            // Logout menu item
            const logoutMenu = document.getElementById('logout-btn-menu');
            if (logoutMenu) {
                logoutMenu.addEventListener('click', onLogoutClick);
                console.log('✅ Logout menu bound');
            }

            // Profile menu - show user info
            const userProfile = document.getElementById('user-profile');
            if (userProfile) {
                userProfile.addEventListener('click', () => {
                    const profileMenu = document.getElementById('profile-menu');
                    if (profileMenu) {
                        profileMenu.classList.toggle('hidden');
                    }
                });
            }

            // Quick donation buttons
            const quickCopyBtn = document.getElementById('quick-copy-qr');
            if (quickCopyBtn) {
                // Remove existing listeners and add Pi payment
                quickCopyBtn.removeEventListener('click', quickCopyBtn._piClickHandler);
                quickCopyBtn._piClickHandler = () => onDonate(0.05, 'Mời cafe ☕');
                quickCopyBtn.addEventListener('click', quickCopyBtn._piClickHandler);
                console.log('✅ Quick donate button bound');
            }

            // Add support for other donation buttons
            const donateButtons = document.querySelectorAll('[data-pi-donate]');
            donateButtons.forEach(button => {
                const amount = parseFloat(button.dataset.piDonate) || 0.01;
                const memo = button.dataset.piMemo || 'Ủng hộ XemGiaDat';
                button.addEventListener('click', () => onDonate(amount, memo));
            });

            console.log('✅ Pi Network UI bindings attached');
        } catch (error) {
            console.error('Error attaching UI bindings:', error);
        }
    }

    /**
     * Initialize Pi Network integration
     */
    async function init() {
        try {
            console.log('Ὠ0 Initializing Pi Network integration...');
            
            // Load existing user profile
            const existingUser = loadUserProfile();
            if (existingUser) {
                updateUiForUser(existingUser);
                console.log('✅ Existing user profile loaded:', existingUser.displayName);
            }

            // Attach UI bindings
            attachUiBindings();

            // Initialize Pi SDK if in Pi Browser
            if (isPiBrowser()) {
                console.log('ἱf Pi Browser detected - initializing Pi SDK...');
                const sdkReady = await initializePiSDK();
                if (sdkReady) {
                    console.log('✅ Pi Network integration active');
                    trackEvent('pi_sdk_initialized', { success: true });
                } else {
                    console.warn('⚠️ Pi SDK initialization failed');
                    trackEvent('pi_sdk_initialized', { success: false });
                }
            } else {
                console.log('ἱ0 Standard browser detected - Pi integration in fallback mode');
                trackEvent('pi_browser_detection', { is_pi_browser: false });
            }

            // Auto-refresh token if needed
            const lastLogin = localStorage.getItem(CONFIG.STORAGE_KEYS.LAST_LOGIN);
            if (lastLogin && existingUser && isPiBrowser()) {
                const timeSinceLogin = Date.now() - parseInt(lastLogin);
                const oneWeek = 7 * 24 * 60 * 60 * 1000;
                
                if (timeSinceLogin > oneWeek) {
                    console.log('ὐ4 Token may be expired, consider re-authentication');
                    // Could trigger re-auth here if needed
                }
            }

            console.log('✅ Pi Network integration initialized successfully');
            
        } catch (error) {
            console.error('❌ Pi Network initialization failed:', error);
            trackEvent('pi_init_failed', { error: error.message });
        }
    }

    /**
     * Initialize Pi Network integration
     */
    async function init() {
        try {
            console.log('🚀 Initializing Pi Network integration...');
            
            // Load existing user profile
            const existingUser = loadUserProfile();
            if (existingUser) {
                updateUiForUser(existingUser);
                console.log('✅ Existing user profile loaded:', existingUser.displayName);
            }

            // Attach UI bindings
            attachUiBindings();

            // Initialize Pi SDK if in Pi Browser
            if (isPiBrowser()) {
                console.log('🌟 Pi Browser detected - initializing Pi SDK...');
                const sdkReady = await initializePiSDK();
                if (sdkReady) {
                    console.log('✅ Pi Network integration active');
                    trackEvent('pi_sdk_initialized', { success: true });
                } else {
                    console.warn('⚠️ Pi SDK initialization failed');
                    trackEvent('pi_sdk_initialized', { success: false });
                }
            } else {
                console.log('🌐 Standard browser detected - Pi integration in fallback mode');
                trackEvent('pi_browser_detection', { is_pi_browser: false });
            }

            // Auto-refresh token if needed
            const lastLogin = localStorage.getItem(CONFIG.STORAGE_KEYS.LAST_LOGIN);
            if (lastLogin && existingUser && isPiBrowser()) {
                const timeSinceLogin = Date.now() - parseInt(lastLogin);
                const oneWeek = 7 * 24 * 60 * 60 * 1000;
                
                if (timeSinceLogin > oneWeek) {
                    console.log('🔄 Token may be expired, consider re-authentication');
                    // Could trigger re-auth here if needed
                }
            }

            console.log('✅ Pi Network integration initialized successfully');
            
        } catch (error) {
            console.error('❌ Pi Network initialization failed:', error);
            trackEvent('pi_init_failed', { error: error.message });
        }
    }

    /**
     * Handle donation/payment request
     * @param {number} amount - Amount in Pi
     * @param {string} memo - Payment memo
     * @param {string} type - Payment type
     */
    async function onDonate(amount = 0.01, memo = 'Support XemGiaDat', type = CONFIG.PAYMENT_TYPES.DONATION) {
        try {
            if (!isPiBrowser()) {
                openDonationModal();
                return;
            }

            if (!state.isAuthenticated) {
                showNotification('Vui lòng đăng nhập trước khi thanh toán', 'warning');
                await onLoginClick();
                return;
            }

            showNotification(`Đang khởi tạo thanh toán ${amount} Pi...`, 'info');
            const paymentResult = await piRequestPay(amount, memo, type);
            
            if (paymentResult) {
                console.log('✅ Payment initiated successfully:', paymentResult);
                showNotification('Thanh toán đang được xử lý...', 'info');
            }
            
        } catch (error) {
            console.error('Donation failed:', error);
            showNotification(`Thanh toán thất bại: ${error.message}`, 'error');
            
            if (error.message.includes('not authenticated') || error.message.includes('SDK not available')) {
                setTimeout(openDonationModal, 1000);
            }
        }
    }

    /**
     * Open Firebase authentication modal
     */
    function openFirebaseAuthFallback() {
        const authContainer = document.getElementById('firebaseui-auth-container');
        if (authContainer) {
            authContainer.classList.remove('hidden');
            authContainer.style.display = 'flex';
        } else {
            console.warn('Firebase auth container not found');
            showNotification('Hệ thống đăng nhập không khả dụng', 'error');
        }
    }

    /**
     * Open traditional donation modal
     */
    function openDonationModal() {
        const donateModal = document.getElementById('donate-modal');
        if (donateModal) {
            donateModal.classList.remove('hidden');
            donateModal.style.display = 'flex';
        } else {
            showNotification('🚀 Ủng hộ dự án qua: MB Bank 6806 8793 979 - HUYNH VAN DUOC', 'info');
        }
    }

    /**
     * Track events for analytics
     */
    function trackEvent(eventName, parameters = {}) {
        try {
            if (typeof window.trackEvent === 'function') {
                window.trackEvent(eventName, { ...parameters, source: 'pi_integration' });
            }
            if (typeof gtag === 'function') {
                gtag('event', eventName, {
                    event_category: 'Pi Network',
                    event_label: parameters.method || 'unknown',
                    custom_parameter_source: 'pi_integration',
                    ...parameters
                });
            }
            console.log('📈 Event tracked:', eventName, parameters);
        } catch (error) {
            console.warn('Event tracking failed:', error);
        }
    }

    /**
     * Attach UI event bindings
     */
    function attachUiBindings() {
        try {
            const loginBtn = document.getElementById('login-btn');
            if (loginBtn) {
                loginBtn.addEventListener('click', onLoginClick);
                console.log('✅ Login button bound');
            }

            const logoutMenu = document.getElementById('logout-btn-menu');
            if (logoutMenu) {
                logoutMenu.addEventListener('click', onLogoutClick);
                console.log('✅ Logout menu bound');
            }

            const userProfile = document.getElementById('user-profile');
            if (userProfile) {
                userProfile.addEventListener('click', () => {
                    const profileMenu = document.getElementById('profile-menu');
                    if (profileMenu) {
                        profileMenu.classList.toggle('hidden');
                    }
                });
            }

            const quickCopyBtn = document.getElementById('quick-copy-qr');
            if (quickCopyBtn) {
                quickCopyBtn.removeEventListener('click', quickCopyBtn._piClickHandler);
                quickCopyBtn._piClickHandler = () => onDonate(0.05, 'Mời cafe ☕');
                quickCopyBtn.addEventListener('click', quickCopyBtn._piClickHandler);
                console.log('✅ Quick donate button bound');
            }

            const donateButtons = document.querySelectorAll('[data-pi-donate]');
            donateButtons.forEach(button => {
                const amount = parseFloat(button.dataset.piDonate) || 0.01;
                const memo = button.dataset.piMemo || 'Ủng hộ XemGiaDat';
                button.addEventListener('click', () => onDonate(amount, memo));
            });

            console.log('✅ Pi Network UI bindings attached');
        } catch (error) {
            console.error('Error attaching UI bindings:', error);
        }
    }
    
    /**
     * Public API for Pi Network integration
     */
    window.PiIntegration = {
        // Core functions
        init,
        isPiBrowser,
        
        // Authentication
        login: onLoginClick,
        logout: onLogoutClick,
        
        // Payments
        donate: onDonate,
        createPayment: piRequestPay,
        
        // User management
        getCurrentUser: () => state.currentUser,
        isAuthenticated: () => state.isAuthenticated,
        
        // Utilities
        showNotification,
        trackEvent,
        
        // Configuration
        getConfig: () => ({ ...CONFIG }),
        
        // Development/debugging
        getState: () => ({ ...state })
    };

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // DOM already loaded, initialize immediately
        init();
    }

    console.log('὎6 Pi Network Integration Module loaded');

})();
