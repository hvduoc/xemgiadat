# PR #3: Listing MVP Complete ✅

## Summary
Implementation of **feat(v2): listing mvp (create + view + share) linked to parcel**

## Changes Made

### 1. Firebase Integration
- **Added dependency**: `firebase` (JS SDK v11)
- **Services**:
  - `src2/services/ListingService.ts`: Firestore/Storage integration
    - Upload images to Storage (listing-images/{listingId}/{filename})
    - Create listing documents in Firestore (listings collection)
    - Fetch listing by ID
  - Firebase config uses environment variables (optional)

### 2. Listing Creation Flow
- **Components**:
  - `src2/components/ListingForm.ts`: Modal form with:
    - Title, price, description inputs
    - Image upload (multiple files)
    - Success screen with share options (Facebook, WhatsApp, Zalo copy, link copy)
    - Directions (Google Maps) and Street View links using parcel centroid
  - `src2/components/ParcelPanel.ts`: Added "Đăng tin" button + handler setter
- **Integration**:
  - `src2/index.ts`: Wired ListingForm + ListingService
  - Computes polygon centroid for share links
  - Opens modal on "Đăng tin" click

### 3. Listing View Page
- **New page**: `public/listing.html` + `public/listing-entry.ts` + `src2/listing-view.ts`
  - Fetches listing by ID from query param (`?id=xxx`)
  - Displays title, price, description, address, images (gallery)
  - Share links (Facebook, WhatsApp, Zalo copy, copy link)
  - Google Maps directions + Street View
- **Build**:
  - Added `listing` input to Vite config
  - Built to `public/v2-dist/listing.html`

### 4. Types & Data Model
- **Types** (`src2/types/index.ts`):
  - Added `centroid` to `SelectedParcel`
  - Added `Listing`, `ListingImage` interfaces
- **Firestore model**:
  ```
  listings/{listingId}:
    - title: string
    - price: number
    - description: string
    - parcelId: number
    - address: string
    - centroid: [number, number]
    - images: ListingImage[]
    - createdAt: timestamp
    - userId: string (optional)
  ```

### 5. Build & Verification
- **Updated**: `scripts/verify-v2-build.mjs`
  - Made v2 CSS optional (no direct styles in v2 entry)
  - Added optional patterns check
- **Build output**:
  - ✅ `public/v2-dist/v2.html` (22.5KB JS)
  - ✅ `public/v2-dist/listing.html` (4.3KB JS + 3KB CSS)
  - ✅ MapLibre + PMTiles chunks
  - ✅ Firebase chunk (464KB, includes auth/firestore/storage)

### 6. Documentation
- **Added**: `docs/V2_LISTING_MVP.md`
  - Setup guide (Firebase project, credentials, rules)
  - Data model
  - User flow (create + view)
  - Test checklist
  - Rollback instructions

## Testing Checklist

### Build
- [x] `npm install` (firebase dependency)
- [x] `npm run build` (no errors)
- [x] Verify `public/v2-dist/listing.html` exists
- [x] Verify `public/v2-dist/v2.html` exists

### Listing Creation
- [ ] Open `/v2-dist/v2.html`
- [ ] Click on a parcel → "Thông tin thửa đất" panel appears
- [ ] Click "Đăng tin" → Modal opens
- [ ] Fill title, price, description
- [ ] Upload 1+ images
- [ ] Click "Đăng tin" → Success screen with share links
- [ ] Click "Sao chép link" → Link copied to clipboard
- [ ] Open copied link → Listing view page loads

### Listing View
- [ ] Open `/v2-dist/listing.html?id={listingId}`
- [ ] Listing details displayed (title, price, description, address)
- [ ] Images rendered in gallery
- [ ] Share links work (Facebook, WhatsApp, Zalo copy)
- [ ] "Chỉ đường" opens Google Maps
- [ ] "Xem Street View" opens Google Street View

### Firebase Integration
- [ ] Create `.env` with Firebase config (or use default credentials in code)
- [ ] Verify Firestore rules allow reads/writes
- [ ] Verify Storage rules allow uploads to `listing-images/`
- [ ] Check Firestore console for new listing documents
- [ ] Check Storage console for uploaded images

## Rollback

If issues arise:
1. **Remove listing feature**:
   ```bash
   git checkout main -- src2/index.ts src2/types/index.ts
   git rm src2/services/ListingService.ts src2/components/ListingForm.ts
   git rm public/listing.html public/listing-entry.ts src2/listing-view.ts
   ```
2. **Revert Vite config**:
   ```bash
   git checkout main -- vite.config.js
   ```
3. **Revert package.json**:
   ```bash
   npm uninstall firebase
   git checkout main -- package.json package-lock.json
   npm install
   ```
4. **Rebuild**:
   ```bash
   npm run build
   ```

## Deployment Notes

- **Netlify config**: No changes to `netlify.toml` (publish=public)
- **Firebase credentials**: Use environment variables in Netlify:
  - `VITE_FIREBASE_API_KEY`
  - `VITE_FIREBASE_AUTH_DOMAIN`
  - `VITE_FIREBASE_PROJECT_ID`
  - `VITE_FIREBASE_STORAGE_BUCKET`
  - `VITE_FIREBASE_MESSAGING_SENDER_ID`
  - `VITE_FIREBASE_APP_ID`
- **Firestore rules**: Ensure rules allow:
  - Read: `allow read: if true;`
  - Write: `allow write: if request.auth != null;` (or `if true;` for MVP)
- **Storage rules**: Ensure rules allow:
  - Write: `allow write: if true;` (or authenticated)
  - Read: `allow read: if true;`

## Files Changed

### Added
- `src2/services/ListingService.ts`
- `src2/components/ListingForm.ts`
- `public/listing.html`
- `public/listing-entry.ts`
- `src2/listing-view.ts`
- `docs/V2_LISTING_MVP.md`
- `PR3_LISTING_MVP_COMPLETE.md` (this file)

### Modified
- `package.json` (added firebase dependency)
- `src2/types/index.ts` (added centroid, Listing types)
- `src2/components/ParcelPanel.ts` (added "Đăng tin" button)
- `src2/index.ts` (integrated listing form, centroid computation)
- `vite.config.js` (added listing input)
- `scripts/verify-v2-build.mjs` (made v2 CSS optional)

### No Changes
- Legacy code (`src/`, `public/script.js`, etc.)
- Netlify config (`netlify.toml`)
- MapLibre/PMTiles logic

## Next Steps

1. **Firebase Setup**: Create Firebase project, enable Firestore + Storage, deploy rules
2. **Test Locally**: Run `npm run dev`, test listing creation/view flow
3. **Deploy**: Push to `main`, trigger Netlify build, add Firebase env vars
4. **Validate**: Smoke test on production (create listing, view, share)
5. **Monitor**: Check Firestore/Storage usage, error logs

## PR Ready ✅

- [x] Build passes
- [x] No TypeScript errors in V2 code
- [x] No legacy changes
- [x] Documentation complete
- [x] Rollback instructions provided

---

**Author**: GitHub Copilot  
**Date**: 2025  
**PR**: feat(v2): listing mvp (create + view + share) linked to parcel
