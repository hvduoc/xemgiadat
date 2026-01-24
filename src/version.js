/**
 * Build Version Information
 * Auto-generated during build process
 * Used for cache busting and deployment diagnostics
 */

export const BUILD_VERSION = {
  // Git commit hash (replaced during build)
  COMMIT_HASH: process.env.VITE_COMMIT_HASH || 'dev-local',
  
  // Build timestamp (replaced during build)
  BUILD_TIME: process.env.VITE_BUILD_TIME || new Date().toISOString(),
  
  // Version number
  VERSION: '2.0.1-cache-fix',
  
  // Cache version for Service Worker
  CACHE_VERSION: 'xemgiadat-v2.0.1-cache-fix',
  
  // Get full version string for debugging
  getFullVersion() {
    return `${this.VERSION}+${this.COMMIT_HASH.substring(0, 7)}`;
  },
  
  // Get timestamp string
  getTimestamp() {
    return new Date(this.BUILD_TIME).toLocaleString('vi-VN');
  },
  
  // Log version info to console when debug=1
  logIfDebug() {
    if (typeof window !== 'undefined' && window.location.search.includes('debug=1')) {
      console.log(
        '%c🔍 BUILD INFORMATION',
        'color: #00ff00; font-weight: bold; font-size: 14px'
      );
      console.log(`Version: ${this.getFullVersion()}`);
      console.log(`Build Time: ${this.getTimestamp()}`);
      console.log(`Commit: ${this.COMMIT_HASH}`);
      console.log(`Cache Version: ${this.CACHE_VERSION}`);
    }
  }
};

// Auto-log on import
if (typeof window !== 'undefined') {
  BUILD_VERSION.logIfDebug();
}

export default BUILD_VERSION;
