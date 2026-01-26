#!/usr/bin/env node
/**
 * stamp-build.mjs - Stamps build artifacts with commit hash and timestamp
 * Run this during CI/CD to inject build metadata into health.txt and index.html
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const publicDir = resolve(rootDir, 'public');

// Get build metadata
function getBuildMetadata() {
    let commitHash = 'local';
    let commitShort = 'local';
    
    try {
        commitHash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
        commitShort = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    } catch (e) {
        console.warn('⚠️  Could not get git commit hash, using "local"');
    }
    
    const buildTime = new Date().toISOString();
    const buildTimestamp = Date.now();
    
    return {
        commitHash,
        commitShort,
        buildTime,
        buildTimestamp,
        stamp: `${commitShort}-${buildTimestamp}`
    };
}

// Stamp health.txt
function stampHealthFile(meta) {
    const healthPath = resolve(publicDir, 'health.txt');
    
    if (!existsSync(healthPath)) {
        console.warn('⚠️  health.txt not found, creating...');
    }
    
    const content = `BUILD_STATUS=OK
BUILD_TIME=${meta.buildTime}
COMMIT_HASH=${meta.commitHash}
COMMIT_SHORT=${meta.commitShort}
VERSION=2.0.0
DEPLOY_TARGET=netlify
STAMP=${meta.stamp}
`;
    
    writeFileSync(healthPath, content, 'utf8');
    console.log(`✅ Stamped health.txt with ${meta.stamp}`);
}

// Stamp index.html with build banner
function stampIndexHtml(meta) {
    const indexPath = resolve(publicDir, 'index.html');
    
    if (!existsSync(indexPath)) {
        console.error('❌ index.html not found!');
        return;
    }
    
    let html = readFileSync(indexPath, 'utf8');
    
    // Update build-version meta tag
    html = html.replace(
        /<meta name="build-version" content="[^"]*">/,
        `<meta name="build-version" content="${meta.stamp}">`
    );
    
    // Update build-time meta tag
    html = html.replace(
        /<meta name="build-time" content="[^"]*">/,
        `<meta name="build-time" content="${meta.buildTime}">`
    );
    
    // Update cache-version meta tag
    html = html.replace(
        /<meta name="cache-version" content="[^"]*">/,
        `<meta name="cache-version" content="${meta.stamp}">`
    );
    
    writeFileSync(indexPath, html, 'utf8');
    console.log(`✅ Stamped index.html meta tags with ${meta.stamp}`);
}

// Main execution
console.log('🔨 Build Stamping Started...');
const meta = getBuildMetadata();
console.log(`   Commit: ${meta.commitShort}`);
console.log(`   Time:   ${meta.buildTime}`);
console.log(`   Stamp:  ${meta.stamp}`);

stampHealthFile(meta);
stampIndexHtml(meta);

console.log('✅ Build stamping complete!');
