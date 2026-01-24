# CORE MIGRATION PLAN — v1 → v2

**Status**: 📋 Framework  
**Version**: 2.0 (MapLibre + PMTiles)  
**Timeline**: TBD (depends on v2 dev speed)

---

## 🎯 Phase Overview

| Phase | Duration | Status | Milestone |
|-------|----------|--------|-----------|
| **Phase 1: Preparation** | 2 weeks | 🔄 In Progress | Audit + Documentation + Freeze |
| **Phase 2: v2 Development** | 4-6 weeks | ⏸️ Ready to Start | Feature parity with v1 |
| **Phase 3: Testing** | 2-3 weeks | ⏸️ Waiting | Staging → canary → full prod |
| **Phase 4: Cutover** | 1 day | ⏸️ Waiting | Switch production to v2 |
| **Phase 5: Cleanup** | 1 week | ⏸️ Waiting | Delete v1 + optimize |

---

## PHASE 1: PREPARATION (Now)

### 1.1 Audit & Documentation ✅

- [x] Run forensic audit: `PROJECT_FORENSICS_REPORT.md`
- [x] Create project map: `PROJECT_MAP.md`
- [x] Freeze legacy files: `DO_NOT_EDIT.md`
- [x] Identify duplicates (PMTiles, geojson)

### 1.2 Freeze Legacy 🔄

Tasks:
- [ ] Add "FROZEN LEGACY" comment headers to:
  - `public/index.html`
  - `public/script.js`
  - `public/sw.js`
- [ ] Create `.vscode/settings.json` for performance
- [ ] Update `.gitignore` (data files optimization)
- [ ] Merge to main as: `chore: freeze legacy and generate project map`

### 1.3 Prepare v2 Foundation ⏸️

Tasks (before Phase 2):
- [ ] Verify `src2/` structure is stable
- [ ] Document v2 component architecture
- [ ] Set up v2 build in CI/CD
- [ ] Create v2 README

---

## PHASE 2: v2 DEVELOPMENT (4-6 weeks)

### 2.1 Core Features (Week 1-2)

**Map Rendering**
```javascript
// src2/services/MapService.ts
- MapLibre GL JS initialization
- PMTiles protocol registration
- Layer management (parcels, wards)
- Styling & interactions
```

**Priority**: HIGH - Core functionality  
**Success Criteria**:
- Map renders
- Parcels layer loads
- Zoom/pan works
- No console errors

**Testing**:
```bash
npm run dev
# Visit http://localhost:5173/v2
# Verify map displays
```

---

### 2.2 Search & Geocoding (Week 2-3)

**Features**:
- Address search (Nominatim or Mapbox)
- Parcel search by ID
- Search history

**Files**:
- `src2/components/SearchBar.ts`
- `src2/services/GeocodingService.ts` (new)

**Testing**:
- Search returns results
- Results update map
- Auto-complete works

---

### 2.3 Data Display (Week 3-4)

**Features**:
- Parcel details panel
- Ward/district information
- Price history (if available)
- Share functionality

**Files**:
- `src2/components/ParcelPanel.ts`
- `src2/components/SharePanel.ts` (new)

**Testing**:
- Click parcel → shows details
- Share button generates URL
- Price data displays correctly

---

### 2.4 PWA & Offline (Week 4-5)

**Features**:
- Service worker for offline
- Cache strategy for tiles
- Offline mode indicator

**Files**:
- `src2/sw.ts` (new)
- `src2/services/CacheService.ts` (new)

**Testing**:
- Offline mode works
- Tiles cached properly
- Fallback data available

---

### 2.5 Performance & Polish (Week 5-6)

**Tasks**:
- Lighthouse audit
- Bundle size optimization
- Mobile responsive
- Dark mode (optional)

**Success Criteria**:
- Lighthouse score > 90
- Load time < 2s (over 4G)
- All interactions smooth (60 FPS)

---

## PHASE 3: TESTING (2-3 weeks)

### 3.1 Staging Environment

**Deploy v2 to staging URL**:
```
Staging: https://staging.xemgiadat.com/v2
```

**Testing**:
- [ ] Manual QA checklist (50+ tests)
- [ ] All v1 features work in v2
- [ ] No bugs vs v1
- [ ] Performance acceptable
- [ ] Mobile rendering correct

**Sign-off**: @architect + @qa-team

---

### 3.2 Canary Deployment (5% → 10% → 25%)

**Production URL**: https://xemgiadat.com/v2

```javascript
// netlify.toml routing rules:
// 5% of traffic → /v2 (MapLibre v2)
// 95% of traffic → / (legacy v1)

// Week 1: 5% canary
// Week 2: 10% canary
// Week 3: 25% canary (if stable)
```

**Monitoring**:
- Error rate (< 0.1%)
- Map load time (< 2s)
- User engagement (vs v1)

**Rollback Decision**: If error rate > 1%, rollback immediately

---

### 3.3 Staging vs Production

| Aspect | Staging | Production (Canary) |
|--------|---------|-------------------|
| **Traffic** | Internal only | 5-25% users |
| **Performance** | Test (may be slower) | Real traffic |
| **Data** | Test data | Real data |
| **Duration** | 1-2 weeks | 1-3 weeks |

---

## PHASE 4: CUTOVER (1 day)

### 4.1 Cutover Plan

**Step 1: Pre-cutover (1 hour before)**
```bash
# Verify v2 is stable on 25% canary
# All monitoring dashboards ready
# Rollback plan written down
# Team on standby
```

**Step 2: Execute (cutover)**
```javascript
// netlify.toml change:
from: publish = "public/" (v1 only)
to:   publish = "public/" but route / → /v2.html

// OR: update Netlify redirect rules
// 100% traffic → /v2.html
// Keep /v1 for fallback
```

**Step 3: Post-cutover (1 hour)**
```
- Monitor error dashboard
- Check Lighthouse scores
- Test critical paths (search, share)
- Verify no 500 errors
- Check logs for issues
```

**Step 4: Stabilize (24 hours)**
```
- Monitor for 24 hours
- Check user feedback
- Performance metrics
- If stable: proceed to Phase 5
- If issues: rollback or hotfix
```

---

## PHASE 5: CLEANUP (1 week)

### 5.1 Delete v1 Code

```bash
# After v2 proves stable in production (7 days):
rm -rf src/                    # Orphaned code
rm public/dist/                # Unused Vite build
```

### 5.2 Optimize

```bash
# Remove from repo:
git rm public/tiles/danang_parcels.pmtiles  # duplicate

# Migrate to Git LFS:
git lfs track public/data/parcels/*.geojson
```

### 5.3 Update Documentation

```
- Archive old v1 docs
- Update README.md with v2 structure
- Document lessons learned
```

---

## 📊 Success Metrics

### v2 Must Achieve (before production):

| Metric | v1 Baseline | v2 Target | Pass |
|--------|-------------|-----------|------|
| **Page Load** | ~3s | < 2s | ✅ |
| **Lighthouse** | 75 | > 90 | ✅ |
| **Map interaction** | 60 FPS | 60 FPS | ✅ |
| **Feature parity** | 100% v1 features | 100% | ✅ |
| **Error rate** | < 0.1% | < 0.1% | ✅ |
| **Mobile support** | Partial | Full | ✅ |

---

## 🚨 Risk Mitigation

### Risk: v2 Map Performance Worse Than v1

**Mitigation**:
1. Profile both versions locally
2. Identify bottleneck (tiles, rendering, etc.)
3. Optimize (caching, lazy-load, etc.)
4. A/B test: 10% v2 vs 90% v1
5. If still slow: delay cutover

---

### Risk: Data Loss During Migration

**Mitigation**:
1. Backup all data before cutover
2. Run v1 + v2 in parallel (1 week)
3. Verify data consistency
4. Keep rollback ready

---

### Risk: User Experience Broken

**Mitigation**:
1. Staging tests with real users (UAT)
2. Canary deployment (5% first)
3. Monitor error dashboard
4. Ready to rollback within 5 minutes

---

## 📋 Rollback Procedures

### If v2 Breaks Production:

**Immediate (< 5 min)**:
```bash
# Option A: Git revert (if just deployed)
git revert <commit-hash>
git push
# Trigger redeploy

# Option B: Netlify rollback (if UI change)
# In Netlify dashboard: Rollback to previous deploy
```

**Restoration**:
```bash
# Verify v1 is back in production
curl https://xemgiadat.com/
# Should see v1 app

# Check for data issues
# Run data validation script
```

---

## 🎯 Go/No-Go Checklist

### Before Phase 3 → 4 (Staging → Production):

- [ ] v2 has all v1 features
- [ ] Performance meets targets (< 2s load)
- [ ] No bugs found in staging (48 hours stable)
- [ ] Mobile tested on 3+ devices
- [ ] Data integrity verified
- [ ] Monitoring dashboards ready
- [ ] Rollback plan documented
- [ ] Architecture approved
- [ ] QA sign-off

### Before Phase 4 → 5 (Cutover → Cleanup):

- [ ] v2 stable in production (7 days)
- [ ] Error rate < 0.1%
- [ ] User feedback positive
- [ ] No critical bugs reported
- [ ] Performance maintained
- [ ] Architecture approved cleanup

---

## 📞 Decision Points

| Decision | Owner | Timeline |
|----------|-------|----------|
| Start Phase 2 (v2 dev) | @architect | After Phase 1 merge |
| Start Phase 3 (staging) | @architect | After v2 feature complete |
| Start Canary (5%) | @architect | After staging sign-off |
| Full Cutover (100%) | @architect | After canary stable (7 days) |
| Delete v1 | @architect | After production stable (7 days) |

---

## 📚 References

- [PROJECT_MAP.md](PROJECT_MAP.md) — Current architecture
- [PROJECT_FORENSICS_REPORT.md](../PROJECT_FORENSICS_REPORT.md) — Audit findings
- [DO_NOT_EDIT.md](DO_NOT_EDIT.md) — Frozen files
- [Vite Guide](https://vitejs.dev/) — Build tool docs
- [MapLibre Documentation](https://maplibre.org/) — Map library

---

**Last Updated**: 2026-01-19  
**Status**: Ready for Phase 2 start  
**Next Checkpoint**: v2 feature complete (TBD)
