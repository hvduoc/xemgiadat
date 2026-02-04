// auth-service.js — Firebase Auth module (lazy loaded)

(function () {
    const AuthService = {
        _ui: null,
        _uiInitialized: false,
        _firebaseUiLoading: null,

        async ensureFirebaseUiScript() {
            if (window.firebaseui && window.firebaseui.auth) return;
            if (this._firebaseUiLoading) return this._firebaseUiLoading;

            this._firebaseUiLoading = new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://www.gstatic.com/firebasejs/ui/4.8.1/firebase-ui-auth.js';
                script.async = true;
                script.onload = () => resolve();
                script.onerror = () => reject(new Error('Failed to load FirebaseUI script'));
                document.head.appendChild(script);
            });

            return this._firebaseUiLoading;
        },

        ensureFirebaseUiCss() {
            const existing = document.querySelector('link[href*="firebase-ui-auth.css"]');
            if (existing) return;
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://www.gstatic.com/firebasejs/ui/4.8.1/firebase-ui-auth.css';
            document.head.appendChild(link);
        },

        initFirebaseUI() {
            if (this._uiInitialized) return this._ui;
            if (!window.firebaseui || !window.firebaseui.auth) return null;

            try {
                this.ensureFirebaseUiCss();
                this._ui = new firebaseui.auth.AuthUI(window.auth);
                this._uiInitialized = true;
                return this._ui;
            } catch (err) {
                console.error('❌ Failed to initialize FirebaseUI:', err);
                return null;
            }
        },

        async initAuthStateHandlers(options = {}) {
            const {
                loginBtn,
                userProfileDiv,
                firebaseuiContainer,
                addLocationBtn,
                loadUserPortfolio,
                exitAllModes
            } = options;

            if (!window.auth) {
                console.warn('⚠️ Auth not ready');
                return;
            }

            window.auth.onAuthStateChanged(async (user) => {
                const ADMIN_UID = "FEpPWWT1EaTWQ9FOqBxWN5FeEJk1";
                const adminBtn = document.getElementById('admin-btn');

                if (user) {
                    window.currentUser = user;
                    const userRef = window.db.collection("users").doc(user.uid);
                    const doc = await userRef.get();
                    if (!doc.exists) {
                        await userRef.set({
                            displayName: user.displayName || "",
                            email: user.email || "",
                            phone: "",
                            contactFacebook: "",
                            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    }

                    if (loadUserPortfolio) await loadUserPortfolio();

                    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                    if (user.uid === ADMIN_UID || isLocalhost) {
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
                            }
                        } else {
                            adminBtn.style.display = 'flex';
                        }
                    }

                    if (firebaseuiContainer) firebaseuiContainer.classList.add('hidden');
                    if (loginBtn) loginBtn.classList.add('hidden');
                    if (userProfileDiv) {
                        userProfileDiv.classList.remove('hidden');
                        userProfileDiv.classList.add('flex');
                    }
                    const avatar = document.getElementById('user-avatar');
                    if (avatar) avatar.src = user.photoURL || 'https://placehold.co/40x40/e2e8f0/64748b?text=A';
                    if (addLocationBtn) addLocationBtn.disabled = false;
                } else {
                    window.currentUser = null;
                    window.userPortfolio = [];
                    if (adminBtn) adminBtn.style.display = 'none';
                    if (loginBtn) loginBtn.classList.remove('hidden');
                    if (userProfileDiv) {
                        userProfileDiv.classList.add('hidden');
                        userProfileDiv.classList.remove('flex');
                    }
                    if (exitAllModes) exitAllModes();
                    if (addLocationBtn) addLocationBtn.disabled = true;
                }
            });
        },

        async showLoginUI(firebaseuiContainer) {
            if (!window.auth) {
                console.error('❌ Firebase Auth not initialized');
                alert('Hệ thống đăng nhập chưa sẵn sàng. Vui lòng tải lại trang.');
                return;
            }

            await this.ensureFirebaseUiScript();

            const ui = this.initFirebaseUI();
            if (!ui) {
                console.warn('⚠️ FirebaseUI not ready');
                return;
            }

            if (firebaseuiContainer) {
                firebaseuiContainer.classList.remove('hidden');
                firebaseuiContainer.style.display = 'flex';
                firebaseuiContainer.style.visibility = 'visible';
            }

            ui.start('#firebaseui-auth-container', {
                signInOptions: [
                    firebase.auth.EmailAuthProvider.PROVIDER_ID,
                    {
                        provider: firebase.auth.GoogleAuthProvider.PROVIDER_ID,
                        scopes: ['profile', 'email']
                    }
                ],
                signInFlow: 'popup',
                callbacks: {
                    signInSuccessWithAuthResult: function () {
                        return false;
                    }
                }
            });
        }
    };

    window.AuthService = AuthService;
})();
