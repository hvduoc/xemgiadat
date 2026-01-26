/**
 * P0 FIX: Rename v2.html → index.html in public/v2/
 * 
 * Problem: Vite outputs v2/v2.html but netlify.toml expects v2/index.html
 * Solution: Post-build rename to match redirect expectations
 * 
 * Rollback: Delete this file and remove from package.json build script
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const v2Dir = path.resolve(rootDir, 'public', 'v2');

const source = path.resolve(v2Dir, 'v2.html');
const target = path.resolve(v2Dir, 'index.html');

console.log('[fix-v2-html] Checking for v2.html...');

if (!fs.existsSync(source)) {
  console.error(`[fix-v2-html] ❌ Source file not found: ${source}`);
  process.exit(1);
}

// Remove target if exists (stale from previous build)
if (fs.existsSync(target)) {
  console.log(`[fix-v2-html] Removing old index.html...`);
  fs.unlinkSync(target);
}

// Rename v2.html → index.html
fs.renameSync(source, target);

// Verify
if (fs.existsSync(target) && !fs.existsSync(source)) {
  console.log(`[fix-v2-html] ✅ Renamed v2.html → index.html`);
  console.log(`[fix-v2-html] File: ${target} (${fs.statSync(target).size} bytes)`);
} else {
  console.error(`[fix-v2-html] ❌ Rename failed!`);
  process.exit(1);
}
