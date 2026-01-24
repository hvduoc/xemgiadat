import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Strict smoke check: v2-dist must have core assets after build
 * - Uses absolute paths from repo root
 * - Requires CSS presence (v2 core styles)
 * - Validates all vendor chunks
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'public', 'v2-dist');
const assetsDir = path.resolve(distDir, 'assets');

const requiredPatterns = [
  { label: 'v2 bundle', regex: /^v2-.*\.js$/ },
  { label: 'v2 core styles', regex: /^v2-.*-.*\.css$/ },  // v2-core-styles-*.css or similar
  { label: 'MapLibre chunk', regex: /^maplibre-.*\.js$/ },
  { label: 'PMTiles chunk', regex: /^pmtiles-.*\.js$/ },
];

const rel = (p) => path.relative(rootDir, p);
const sizeKB = (p) => `${(fs.statSync(p).size / 1024).toFixed(1)}KB`;

function logDir(label, dir) {
  if (!fs.existsSync(dir)) {
    console.error(`[verify-v2-build] ${label}: (missing)`);
    return;
  }
  const entries = fs.readdirSync(dir);
  console.error(`[verify-v2-build] ${label}:`);
  if (!entries.length) {
    console.error('  (empty)');
    return;
  }
  for (const name of entries) {
    const full = path.join(dir, name);
    let info = '<unknown>';
    try {
      const stat = fs.statSync(full);
      info = stat.isDirectory() ? '<dir>' : `${(stat.size / 1024).toFixed(1)}KB`;
    } catch (e) {
      info = `<error: ${e.message}>`;
    }
    console.error(`  - ${name} (${info})`);
  }
}

function fail(message) {
  console.error(`[verify-v2-build] ${message}`);
  logDir('dist contents (public/v2-dist)', distDir);
  logDir('asset contents (public/v2-dist/assets)', assetsDir);
  process.exit(1);
}

if (!fs.existsSync(distDir)) {
  fail('Missing public/v2-dist/. Run "npm run build" first.');
}

const htmlPath = path.resolve(distDir, 'v2.html');
if (!fs.existsSync(htmlPath)) {
  fail('Missing public/v2-dist/v2.html. Vite entry may be misconfigured.');
}

if (!fs.existsSync(assetsDir)) {
  fail('Missing public/v2-dist/assets/. Build may have failed.');
}

const assets = fs.readdirSync(assetsDir);
const matches = [];
for (const pattern of requiredPatterns) {
  const match = assets.find((file) => pattern.regex.test(file));
  if (!match) {
    fail(`Missing asset: ${pattern.label} (${pattern.regex}).`);
  }
  matches.push({ label: pattern.label, file: match });
}

// Additional checks for listing feature (if present)
const listingHtml = path.resolve(distDir, 'listing.html');
if (fs.existsSync(listingHtml)) {
  const listingServiceChunk = assets.find((file) => /^ListingService-.*\.js$/.test(file));
  if (!listingServiceChunk) {
    fail('Listing page exists but missing ListingService-*.js chunk.');
  }
  matches.push({ label: 'listing bundle', file: listingServiceChunk });
}

// Anti-regression: Verify PMTiles file exists and has reasonable size
const tilesPath = path.resolve(rootDir, 'public', 'tiles', 'danang_parcels_final.pmtiles');
if (!fs.existsSync(tilesPath)) {
  fail('Missing public/tiles/danang_parcels_final.pmtiles. Parcel data required for V2.');
}
const tilesSize = fs.statSync(tilesPath).size;
if (tilesSize < 1024 * 1024) {
  fail(`PMTiles file too small (${(tilesSize / 1024 / 1024).toFixed(1)}MB). Expected > 1MB.`);
}

console.log('[verify-v2-build] OK: v2-dist artifacts present.');
console.log(`[verify-v2-build] HTML: ${rel(htmlPath)} (${sizeKB(htmlPath)})`);
for (const entry of matches) {
  const full = path.resolve(assetsDir, entry.file);
  console.log(`[verify-v2-build] ${entry.label}: ${rel(full)} (${sizeKB(full)})`);
}
console.log(`[verify-v2-build] tiles: ${rel(tilesPath)} (${(tilesSize / 1024 / 1024).toFixed(1)}MB)`);
