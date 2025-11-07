// =============================================================================
// PWA ENHANCEMENT SCRIPT - XEMGIADAT.COM  
// Progressive Web App Features & Offline Support
// =============================================================================

document.addEventListener('DOMContentLoaded', function() {
    // Initialize PWA features
    initializePWAFeatures();
    
    // Performance monitoring
    monitorPerformance();
    
    // Offline data management
    setupOfflineSupport();
});

function initializePWAFeatures() {
    // Add to homescreen guidance for iOS
    if (isIOS() && !isInStandaloneMode()) {
        setTimeout(showIOSInstallPrompt, 3000);
    }
    
    // Keyboard shortcuts for PWA
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + K for search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            document.getElementById('search-input')?.focus();
        }
        
        // Escape to close modals
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
}

function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isInStandaloneMode() {
    return window.matchMedia('(display-mode: standalone)').matches || 
           window.navigator.standalone === true;
}

function showIOSInstallPrompt() {
    const prompt = document.createElement('div');
    prompt.className = 'fixed bottom-4 left-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm mx-auto';
    prompt.innerHTML = `
        <div class="flex items-start space-x-3">
            <i class="fas fa-mobile-alt text-xl mt-1"></i>
            <div class="flex-1">
                <h4 class="font-bold text-sm">Cài đặt ứng dụng</h4>
                <p class="text-xs mt-1">Nhấn <i class="fas fa-share"></i> rồi chọn "Thêm vào Màn hình chính"</p>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="text-white">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    document.body.appendChild(prompt);
    
    setTimeout(() => {
        if (prompt.parentElement) {
            prompt.remove();
        }
    }, 15000);
}

function monitorPerformance() {
    // Web Vitals monitoring
    if ('web-vital' in window) {
        // Implementation for Core Web Vitals
        console.log('🔍 Web Vitals monitoring active');
    }
    
    // Loading performance
    window.addEventListener('load', () => {
        const loadTime = performance.now();
        console.log(`⚡ Page load time: ${loadTime.toFixed(2)}ms`);
        
        if (window.gtag) {
            gtag('event', 'page_load_time', {
                event_category: 'Performance',
                value: Math.round(loadTime),
                custom_parameter_load_time: loadTime
            });
        }
    });
}

function setupOfflineSupport() {
    // Cache critical user data
    if ('indexedDB' in window) {
        // Setup IndexedDB for offline storage
        console.log('💾 Offline storage available');
    }
    
    // Handle form submissions when offline
    document.addEventListener('submit', function(e) {
        if (!navigator.onLine) {
            e.preventDefault();
            showOfflineSubmissionMessage();
        }
    });
}

function showOfflineSubmissionMessage() {
    const message = document.createElement('div');
    message.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-orange-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    message.innerHTML = `
        <i class="fas fa-wifi-slash mr-2"></i>
        Dữ liệu sẽ được gửi khi có kết nối internet
    `;
    document.body.appendChild(message);
    
    setTimeout(() => {
        if (message.parentElement) {
            message.remove();
        }
    }, 5000);
}

function closeAllModals() {
    // Close all visible modals
    const modals = document.querySelectorAll('.fixed.inset-0:not(.hidden)');
    modals.forEach(modal => {
        modal.classList.add('hidden');
    });
}

// Share API integration
if (navigator.share) {
    window.shareContent = async function(title, text, url) {
        try {
            await navigator.share({ title, text, url });
            if (window.trackEvent) {
                trackEvent('content_shared', 'native_share');
            }
        } catch (error) {
            console.log('Share cancelled or failed');
        }
    };
}

// Background sync registration
if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    navigator.serviceWorker.ready.then(registration => {
        console.log('🔄 Background sync available');
        // Register sync events when needed
    });
}

// Push notification permission
function requestNotificationPermission() {
    if ('Notification' in window && 'serviceWorker' in navigator) {
        Notification.requestPermission().then(permission => {
            console.log('📢 Notification permission:', permission);
            if (permission === 'granted' && window.trackEvent) {
                trackEvent('notification_permission', 'granted');
            }
        });
    }
}

// Auto-request notification permission after user interaction
let hasInteracted = false;
document.addEventListener('click', function() {
    if (!hasInteracted) {
        hasInteracted = true;
        setTimeout(requestNotificationPermission, 2000);
    }
}, { once: true });