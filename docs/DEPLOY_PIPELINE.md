# Deploy Pipeline Documentation

> Last Updated: 2026-01-26  
> Status: P0 Fix Applied - Static Asset Protection

## Overview

This document describes the build and deployment pipeline for xemgiadat.com on Netlify.

## Build Configuration

### Build Command
```bash
npm ci && npm run build
```

This executes:
1. `node scripts/stamp-build.mjs` - Stamps health.txt and index.html with commit hash + timestamp
2. `vite build` - Builds V2 app into `public/v2/`
3. `node scripts/verify-v2-build.mjs` - Validates critical assets exist

### Publish Directory
```
publish = "public"
```

The `public/` folder contains:
- **Legacy app** (root): `index.html`, `script.js`, `style.css`, etc.
- **V2 app**: `v2/index.html`, `v2/assets/*.js`, `v2/assets/*.css`
- **Static assets**: `images/`, `css/`, `js/`, `tiles/`, `data/`

## P0 Fix: Static Asset Protection

### Problem
The SPA catch-all redirect (`/* → /index.html`) was rewriting requests for real static files (CSS, JS, images) to HTML, breaking the site.

### Solution
Explicit pass-through rules for asset directories **BEFORE** the SPA catch-all:

```toml
# Asset directories - MUST come before SPA fallback
[[redirects]]
  from = "/assets/*"
  to = "/assets/:splat"
  status = 200

[[redirects]]
  from = "/v2/assets/*"
  to = "/v2/assets/:splat"
  status = 200

[[redirects]]
  from = "/js/*"
  to = "/js/:splat"
  status = 200

[[redirects]]
  from = "/css/*"
  to = "/css/:splat"
  status = 200

[[redirects]]
  from = "/images/*"
  to = "/images/:splat"
  status = 200

[[redirects]]
  from = "/tiles/*"
  to = "/tiles/:splat"
  status = 200

# SPA fallback - MUST BE LAST
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Rule Order (Top to Bottom)
1. **Serverless functions**: `/api/*`, `/proxy/*`, `/pi-verify`
2. **Explicit static files**: `/og.html`, `/health.txt`
3. **Asset directories**: `/assets/*`, `/v2/assets/*`, `/js/*`, `/css/*`, `/images/*`, `/tiles/*`, `/data/*`
4. **V2 routes**: `/v2/`, `/v2/*`
5. **Legacy redirects**: `/v2` → `/v2/`, `/v2.html` → `/v2/`
6. **SPA fallback**: `/*` → `/index.html` (LAST)

## Cache Headers

### Policy
- **HTML files**: `max-age=0, must-revalidate` (never cache)
- **Fingerprinted assets** (`/assets/*`, `/v2/assets/*`): `max-age=31536000, immutable`
- **Root-level JS/CSS**: `max-age=86400, must-revalidate`
- **Tiles**: `max-age=86400, must-revalidate` with CORS
- **Health check**: `max-age=0, must-revalidate`

### Important
**DO NOT** set `immutable` on:
- `/*` (catch-all)
- `/*.html`
- `/index.html`

## Health Check

### Endpoint
```
GET /health.txt
```

### Content
```
BUILD_STATUS=OK
BUILD_TIME=<ISO timestamp>
COMMIT_HASH=<full hash>
COMMIT_SHORT=<short hash>
VERSION=2.0.0
DEPLOY_TARGET=netlify
STAMP=<short-hash>-<timestamp>
```

### Build Banner
`index.html` shows a small version banner in the bottom-right corner displaying the build stamp.

## Verification

### Local Build Test
```bash
npm ci && npm run build
```

### Production Asset Check
```powershell
.\scripts\verify-prod-assets.ps1
```

This script checks:
- `/` returns `text/html`
- `/health.txt` returns `text/plain`
- `/script.js` returns `text/javascript`
- `/style.css` returns `text/css`
- `/manifest.json` returns `application/json`
- `/v2/` returns `text/html`
- `/tiles/metadata.json` returns `application/json`

### Manual Verification
```bash
curl -I https://xemgiadat.com/script.js
# Should return: Content-Type: text/javascript
# Should NOT return: Content-Type: text/html
```

## Deployment Checklist

- [ ] Run `npm ci && npm run build` locally - no errors
- [ ] Check `public/health.txt` has valid stamp
- [ ] Check `public/index.html` meta tags updated
- [ ] Verify `public/v2/assets/` contains JS/CSS bundles
- [ ] Push to main branch
- [ ] Wait for Netlify deploy
- [ ] Run `.\scripts\verify-prod-assets.ps1`
- [ ] Check https://xemgiadat.com/health.txt shows new stamp

## Troubleshooting

### Assets Returning HTML
1. Check redirect order in `netlify.toml` - asset rules must be BEFORE `/*`
2. Verify file exists in `public/` folder
3. Check for typos in redirect paths

### Stale Cache
1. Check Cache-Control headers on the file
2. HTML files should have `max-age=0`
3. Clear browser cache and Netlify cache if needed

### Build Failures
1. Check `scripts/stamp-build.mjs` can access git
2. Verify `vite.config.js` outputs to `public/v2/`
3. Run `node scripts/verify-v2-build.mjs` manually

## Files Changed in P0 Fix

- `netlify.toml` - Redirect order + header cleanup
- `public/health.txt` - Build stamp file
- `public/index.html` - Build banner added
- `package.json` - Added stamp script to build
- `scripts/stamp-build.mjs` - Build metadata stamper
- `scripts/verify-prod-assets.ps1` - Production verification script
- `docs/DEPLOY_PIPELINE.md` - This documentation
