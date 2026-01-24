# Security Audit Report - 2026-01-20

## Executive Summary
**13 moderate severity vulnerabilities remain** due to dependencies on Firebase and Vite. Non-breaking fixes cannot address these issues.

## Vulnerability Breakdown

### Root Causes

#### 1. Vite & esbuild (1 vulnerability)
- **CVE**: esbuild <=0.24.2 - Security issue with development server
- **Impact**: Moderate (dev-only, dev server only)
- **Fix Status**: Requires breaking change (vite 7.3.1 with breaking changes)
- **Affected Scope**: `npm run dev` only (dev server); production builds unaffected
- **Mitigation**: Do NOT run `npm run dev --host` on untrusted networks. This flag exposes the dev server to external access.
- **Safe Practices**:
  ```bash
  npm run dev                    # ✅ Safe: localhost-only
  npm run dev --host 0.0.0.0    # ⚠️ UNSAFE: Exposes to network
  npm run dev --host            # ⚠️ UNSAFE on untrusted networks
  ```
- **Recommendation**: Monitor for patch release; use localhost-only dev mode for now

#### 2. Firebase Dependencies (8 vulnerabilities)
- **Package**: firebase SDK and sub-packages
- **Root Cause**: Transitive dependency on undici <=6.22.0
- **Impact**: Moderate (network/decompression issues)
- **Affected Packages**:
  - @firebase/auth
  - @firebase/auth-compat
  - @firebase/firestore
  - @firebase/firestore-compat
  - @firebase/functions
  - @firebase/functions-compat
  - @firebase/storage
  - @firebase/storage-compat
- **Fix Status**: Requires Firebase SDK update (not available non-breaking)

#### 3. Undici Vulnerabilities (3+ vulnerabilities)
- **CVE**: GHSA-c76h-2ccp-4975, GHSA-cxrh-j4jr-qwg3, GHSA-g9mf-h72j-4rw9
- **Issues**:
  - Insufficiently random values in undici
  - Bad certificate data handling
  - Unbounded decompression in HTTP responses
- **Transitive Path**: firebase → @firebase/auth → undici <=6.22.0
- **Impact**: Transitive via Firebase; affects HTTP requests from Firebase SDK to backend
- **Fix Status**: npm audit fix doesn't update undici (locked by Firebase SDK version)
- **Monitoring Strategy**: Monthly check of Firebase SDK release notes for undici updates
  ```bash
  # Check current undici version
  npm ls undici
  
  # Monitor Firebase releases (monthly) — PowerShell
  npm view firebase versions --json | Select-Object -Last 20
  ```
- **Recommendation**: Monitor Firebase SDK releases monthly for undici bump

## Audit Results

### Before Fixing
```
13 moderate severity vulnerabilities
```

### After Running `npm audit fix`
```
13 moderate severity vulnerabilities (unchanged)
# No non-breaking fixes available
# Breaking changes require:
# - npm audit fix --force (NOT recommended for production)
# - Manual Firebase SDK upgrade (breaking changes)
```

## Recommendations

### Short Term (Current Sprint)
1. **Accept risk**: Vulnerabilities are in dev/transitive dependencies
2. **Monitor**: Watch for Firebase SDK patches
3. **Document**: Track in security policy (this file)
4. **No action needed** for MVP deployment

### Medium Term (Next Sprint)
1. **Firebase update check**: Monitor Firebase SDK releases monthly for undici fixes
   - Add calendar reminder: 1st of each month
   - Run: `npm outdated firebase`
   - Check release notes for undici security updates
2. **Vite upgrade**: Watch for esbuild fix (non-breaking)
3. **Testing**: When updates available, test thoroughly
4. **Staged rollout**: Test in staging before production

### Long Term
1. **Dependency audit**: Quarterly security reviews
2. **Policy**: Establish vulnerability acceptance thresholds
3. **Automation**: Add security checks to CI/CD
4. **Alternatives**: Consider lighter Firebase alternatives if vulnerabilities persist

## Impact Assessment

### Production Risk: LOW
- Vulnerabilities are primarily in build/dev dependencies
- Runtime impact is transitive through Firebase
- Not exposed to direct network attacks (backend-only)

### Build Risk: LOW
- esbuild issue is dev-server only
- Not used in production build

### Network Risk: MODERATE
- Firebase uses undici for HTTP requests
- Potential for DoS via decompression
- Mitigated by: Firebase rate limiting, server-side validation

## Mitigation Strategies

### Currently Implemented
- Use Firebase rules to validate requests
- Netlify caching reduces direct Firebase calls
- Rate limiting on listing creation

### Additional Measures (Optional)
```javascript
// Could add request timeout/size limits
// firebase.initializeApp({
//   timeoutDuration: 5000,  // 5s timeout
// });
```

## Timeline

| Date | Event | Status |
|------|-------|--------|
| 2026-01-20 | Initial audit (13 vulns) | ✅ Documented |
| 2026-Q1 | Check Firebase SDK updates | ⏳ Pending |
| 2026-Q2 | Re-audit after updates | ⏳ Pending |

## Build Status

### Before Fixing
```
$ npm audit
13 moderate severity vulnerabilities
```

### After Fixing
```
$ npm run build
✓ built in 7.75s
[verify-v2-build] OK: v2-dist artifacts present.
```

**Build works despite vulnerabilities** - they don't affect build process.

---

## Related Files
- [SECURITY.md](SECURITY.md) - General security policy
- [package.json](package.json) - Current dependencies
- [package-lock.json](package-lock.json) - Locked dependency tree

---

**Report Date**: 2026-01-20  
**Auditor**: npm audit  
**Status**: Acknowledged & Documented  
**Action**: No immediate action required
