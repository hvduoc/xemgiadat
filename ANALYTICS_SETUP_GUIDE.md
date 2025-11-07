# 📊 GOOGLE ANALYTICS 4 & CONVERSION TRACKING SETUP

## 🎯 OVERVIEW
Comprehensive setup guide cho advanced analytics và conversion tracking cho Xem Giá Đất platform.

## 1. 🔧 GOOGLE ANALYTICS 4 CONFIGURATION

### 📋 Property Setup
```javascript
// GA4 Configuration
gtag('config', 'GA_MEASUREMENT_ID', {
  custom_map: {
    'district': 'district_name',
    'property_type': 'property_category',
    'price_range': 'price_segment'
  },
  // Enhanced ecommerce for lead tracking
  send_page_view: true,
  anonymize_ip: true
});
```

### 🎯 Custom Events Setup
```javascript
// Lead Generation Events
function trackNewsletterSignup(email) {
  gtag('event', 'newsletter_signup', {
    event_category: 'lead_generation',
    event_label: 'homepage_newsletter',
    value: 1,
    custom_parameters: {
      user_type: 'prospect',
      source: 'website'
    }
  });
}

function trackPropertyInquiry(propertyId, district) {
  gtag('event', 'property_inquiry', {
    event_category: 'lead_generation', 
    event_label: 'property_detail',
    value: 5,
    custom_parameters: {
      property_id: propertyId,
      district: district,
      inquiry_type: 'price_check'
    }
  });
}

function trackPhoneCall() {
  gtag('event', 'phone_call_click', {
    event_category: 'lead_generation',
    event_label: 'contact_cta',
    value: 10
  });
}

function trackReportDownload(reportType) {
  gtag('event', 'report_download', {
    event_category: 'content_engagement',
    event_label: reportType,
    value: 3
  });
}
```

### 📈 Conversion Goals
1. **Newsletter Signup** (Value: 1 point)
2. **Property Inquiry** (Value: 5 points)  
3. **Phone Call Click** (Value: 10 points)
4. **Report Download** (Value: 3 points)
5. **Contact Form Submit** (Value: 8 points)

## 2. 📱 FACEBOOK PIXEL INTEGRATION

### 🎯 Base Pixel Code
```html
<!-- Facebook Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', 'YOUR_PIXEL_ID');
fbq('track', 'PageView');
</script>
```

### 📊 Custom Conversion Events
```javascript
// Lead Events
function fbTrackLead(leadType, value = 0) {
  fbq('track', 'Lead', {
    content_name: leadType,
    content_category: 'real_estate',
    value: value,
    currency: 'VND'
  });
}

// Property View Events  
function fbTrackPropertyView(propertyValue) {
  fbq('track', 'ViewContent', {
    content_type: 'property',
    content_ids: [propertyId],
    value: propertyValue,
    currency: 'VND'
  });
}

// Newsletter Signup
function fbTrackNewsletterSignup() {
  fbq('track', 'CompleteRegistration', {
    content_name: 'newsletter_signup',
    status: 'completed'
  });
}
```

## 3. 🔍 GOOGLE SEARCH CONSOLE SETUP

### 🌐 Property Verification
- **Domain Property**: xemgiadat.com (preferred)
- **URL Prefix**: https://xemgiadat.com
- **Verification Method**: HTML tag in <head>

### 📋 Sitemap Submission
```xml
Submit these sitemaps:
- https://xemgiadat.com/sitemap.xml (main)
- https://xemgiadat.com/blog-sitemap.xml (blog)
- https://xemgiadat.com/news-sitemap.xml (news)
```

### 🎯 Search Performance Monitoring
```javascript
// Track search queries performance
const searchQueries = [
  'giá đất đà nẵng',
  'bản đồ giá đất',
  'bất động sản đà nẵng',
  'đầu tư bds đà nẵng',
  'thị trường bds đà nẵng'
];
```

## 4. 🌡️ HOTJAR HEATMAPS & SESSION RECORDINGS

### 📊 Heatmap Setup
```javascript
// Hotjar Tracking Code
(function(h,o,t,j,a,r){
    h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
    h._hjSettings={hjid:YOUR_SITE_ID,hjsv:6};
    a=o.getElementsByTagName('head')[0];
    r=o.createElement('script');r.async=1;
    r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
    a.appendChild(r);
})(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
```

### 🎯 Custom Triggers
```javascript
// Track specific interactions
hj('event', 'property_search');
hj('event', 'map_interaction');  
hj('event', 'filter_usage');
hj('event', 'portfolio_access');
```

## 5. ⚡ PERFORMANCE MONITORING

### 📈 Core Web Vitals Tracking
```javascript
// Web Vitals monitoring
import {getCLS, getFID, getFCP, getLCP, getTTFB} from 'web-vitals';

function sendToAnalytics(metric) {
  gtag('event', metric.name, {
    event_category: 'Web Vitals',
    event_label: metric.id,
    value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
    non_interaction: true,
  });
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

### 🔄 Real User Monitoring
```javascript
// Performance tracking
class PerformanceTracker {
  constructor() {
    this.startTime = performance.now();
    this.metrics = {
      pageLoad: 0,
      mapLoad: 0,
      searchTime: 0,
      apiResponse: []
    };
  }
  
  trackMapLoad() {
    this.metrics.mapLoad = performance.now() - this.startTime;
    gtag('event', 'map_load_time', {
      value: Math.round(this.metrics.mapLoad),
      event_category: 'performance'
    });
  }
  
  trackSearchPerformance(query, resultCount, loadTime) {
    gtag('event', 'search_performance', {
      event_category: 'user_experience',
      event_label: query,
      value: loadTime,
      custom_parameters: {
        result_count: resultCount
      }
    });
  }
}
```

## 6. 🎯 CONVERSION FUNNEL TRACKING

### 📊 Funnel Stages
```javascript
// Define conversion funnel
const conversionFunnel = {
  1: 'page_view',           // Landing page visit
  2: 'map_interaction',     // Map click/search
  3: 'property_view',       // Property detail view  
  4: 'lead_form_view',      // Contact form view
  5: 'lead_form_submit',    // Form submission
  6: 'phone_call',          // Phone call click
  7: 'conversion'           // Actual conversion
};

function trackFunnelStage(stage, additionalData = {}) {
  gtag('event', 'funnel_progression', {
    event_category: 'conversion_funnel',
    event_label: `stage_${stage}`,
    funnel_stage: stage,
    funnel_step: conversionFunnel[stage],
    ...additionalData
  });
}
```

### 🔄 Attribution Modeling
```javascript
// Multi-touch attribution
class AttributionTracker {
  constructor() {
    this.touchpoints = JSON.parse(localStorage.getItem('touchpoints') || '[]');
  }
  
  addTouchpoint(source, medium, campaign) {
    const touchpoint = {
      source,
      medium, 
      campaign,
      timestamp: Date.now(),
      page: window.location.pathname
    };
    
    this.touchpoints.push(touchpoint);
    localStorage.setItem('touchpoints', JSON.stringify(this.touchpoints));
  }
  
  getAttribution() {
    return {
      first_touch: this.touchpoints[0],
      last_touch: this.touchpoints[this.touchpoints.length - 1],
      total_touchpoints: this.touchpoints.length,
      journey_duration: Date.now() - this.touchpoints[0]?.timestamp
    };
  }
}
```

## 7. 📱 MOBILE ANALYTICS

### 📊 Mobile-specific Tracking
```javascript
// Mobile behavior tracking
function trackMobileInteractions() {
  // Touch interactions
  document.addEventListener('touchstart', function(e) {
    gtag('event', 'mobile_touch', {
      event_category: 'mobile_interaction',
      element_type: e.target.tagName.toLowerCase()
    });
  });
  
  // Orientation changes
  window.addEventListener('orientationchange', function() {
    gtag('event', 'orientation_change', {
      event_category: 'mobile_interaction',
      orientation: screen.orientation.angle
    });
  });
  
  // App-like behavior
  if (window.matchMedia('(display-mode: standalone)').matches) {
    gtag('event', 'pwa_usage', {
      event_category: 'mobile_interaction',
      launch_mode: 'standalone'
    });
  }
}
```

## 8. 🤖 AUTOMATED REPORTING

### 📊 Daily Report Script
```javascript
// Automated analytics reporting
async function generateDailyReport() {
  const metrics = await Promise.all([
    getGAMetrics(),
    getFacebookMetrics(),
    getHotjarMetrics(),
    getPerformanceMetrics()
  ]);
  
  const report = {
    date: new Date().toISOString().split('T')[0],
    traffic: metrics[0],
    social: metrics[1], 
    ux: metrics[2],
    performance: metrics[3],
    leads: await getLeadMetrics(),
    conversions: await getConversionMetrics()
  };
  
  // Send to admin dashboard
  await updateAdminDashboard(report);
  
  // Send email if critical metrics
  if (report.leads.daily < 10) {
    await sendAlert('Low lead volume detected');
  }
}
```

### 📈 Key Metrics Dashboard
```javascript
// Real-time metrics display
const dashboardMetrics = {
  realtime: {
    active_users: 0,
    page_views: 0,
    events: 0
  },
  daily: {
    sessions: 0,
    users: 0,
    leads: 0,
    conversions: 0
  },
  performance: {
    load_time: 0,
    bounce_rate: 0,
    conversion_rate: 0
  }
};
```

## 9. 🎯 A/B TESTING FRAMEWORK

### 🧪 Testing Setup
```javascript
// A/B Testing for conversion optimization
class ABTestManager {
  constructor() {
    this.activeTests = [];
    this.userGroup = this.assignUserGroup();
  }
  
  assignUserGroup() {
    const groups = ['control', 'variant_a', 'variant_b'];
    const hash = this.hashUserId(this.getUserId());
    return groups[hash % groups.length];
  }
  
  runTest(testName, variants) {
    const variant = variants[this.userGroup] || variants.control;
    
    gtag('event', 'ab_test_view', {
      event_category: 'experimentation',
      test_name: testName,
      variant: this.userGroup
    });
    
    return variant;
  }
}
```

## 10. 🔐 PRIVACY & COMPLIANCE

### 🛡️ GDPR Compliance
```javascript
// Cookie consent management
function initCookieConsent() {
  if (!localStorage.getItem('analytics_consent')) {
    showCookieConsent();
  } else {
    initAnalytics();
  }
}

function handleConsentChoice(accepted) {
  localStorage.setItem('analytics_consent', accepted);
  
  if (accepted) {
    initAnalytics();
  } else {
    gtag('consent', 'update', {
      analytics_storage: 'denied',
      ad_storage: 'denied'
    });
  }
}
```

---

**🎯 Implementation Priority:**
1. GA4 + Facebook Pixel (Week 1)
2. Search Console + Heatmaps (Week 2)  
3. Performance monitoring (Week 3)
4. Advanced attribution (Week 4)

**📊 Success Metrics:**
- 95%+ data accuracy
- <2s average load time
- 15%+ conversion rate improvement
- Real-time dashboard functionality