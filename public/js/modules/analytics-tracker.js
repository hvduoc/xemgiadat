/**
 * Analytics & Behavior Tracker Module - Lazy Loaded
 * Only loads after map initialization
 * Reduces TBT by ~200-400ms
 */

let analyticsInitialized = false;

export async function initAnalytics() {
    if (analyticsInitialized) return;
    
    console.log('📊 Loading Analytics module...');
    const t0 = performance.now();
    
    try {
        // Initialize analytics tracking
        setupAnalyticsTracking();
        
        analyticsInitialized = true;
        const t1 = performance.now();
        console.log(`✅ Analytics initialized in ${(t1-t0).toFixed(0)}ms`);
    } catch (error) {
        console.error('❌ Analytics init failed:', error);
    }
}

function setupAnalyticsTracking() {
    // Track user interactions
    if (window.gtag) {
        // Map interactions
        window.addEventListener('xgd:parcel-click', (e) => {
            gtag('event', 'parcel_click', {
                event_category: 'engagement',
                event_label: e.detail?.soThua || 'unknown'
            });
        });
        
        // Search events
        window.addEventListener('xgd:search', (e) => {
            gtag('event', 'search', {
                event_category: 'engagement',
                search_term: e.detail?.query || 'unknown'
            });
        });
        
        // Listing submissions
        window.addEventListener('xgd:listing-submit', (e) => {
            gtag('event', 'listing_submitted', {
                event_category: 'conversion',
                event_label: e.detail?.type || 'unknown'
            });
        });
    }
}

export function trackEvent(eventName, eventData = {}) {
    if (!analyticsInitialized) {
        console.warn('⚠️ Analytics not initialized yet');
        return;
    }
    
    if (window.gtag) {
        gtag('event', eventName, eventData);
    }
}

export function trackPageView(path) {
    if (window.gtag) {
        gtag('config', 'G-XXXXXXXXXX', {
            page_path: path
        });
    }
}

export function trackPerformance(metricName, value) {
    if (window.gtag) {
        gtag('event', 'performance_timing', {
            event_category: 'performance',
            event_label: metricName,
            value: Math.round(value)
        });
    }
}
