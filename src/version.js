/**
 * Build Version Module
 * Auto-generated version info for production builds
 */

export const BUILD_VERSION = {
  version: '2.0.0',
  buildTime: new Date().toISOString(),
  commit: process.env.COMMIT_REF || 'local',
  
  getFullVersion() {
    return `${this.version}-${this.commit.slice(0, 7)}`;
  },
  
  getTimestamp() {
    return this.buildTime;
  }
};

export default BUILD_VERSION;
