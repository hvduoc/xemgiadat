#!/usr/bin/env node

/**
 * Build Search Index for 600k Parcels
 * 
 * Scans all GeoJSON files in public/data/parcels/ and builds an inverted index:
 * SoThua → { SoTo: [MaXa codes] }
 * 
 * Output: public/data/search_index.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const PARCELS_DIR = path.join(__dirname, '../public/data/parcels');
const OUTPUT_FILE = path.join(__dirname, '../public/data/search_index.json');

// Statistics
let stats = {
  totalFiles: 0,
  totalParcels: 0,
  totalIndexEntries: 0,
  errors: 0,
  startTime: Date.now()
};

// Index structure: { "0": { "1": [...], "10": [...] }, "1": { ... }, ... }
const index = {
  "0": {},
  "1": {},
  "2": {},
  "3": {},
  "4": {},
  "5": {},
  "6": {},
  "7": {},
  "8": {},
  "9": {}
};

console.log('🔍 Building search index for 600k parcels...\n');

// Check if parcels directory exists
if (!fs.existsSync(PARCELS_DIR)) {
  console.error(`❌ Directory not found: ${PARCELS_DIR}`);
  console.error('Please ensure GeoJSON files exist in public/data/parcels/');
  process.exit(1);
}

// Get all GeoJSON files
const files = fs.readdirSync(PARCELS_DIR).filter(f => f.endsWith('.geojson'));

if (files.length === 0) {
  console.error(`❌ No GeoJSON files found in ${PARCELS_DIR}`);
  console.error('Expected: 20194.geojson, 20195.geojson, etc.');
  process.exit(1);
}

console.log(`📁 Found ${files.length} GeoJSON files\n`);
stats.totalFiles = files.length;

// Process each GeoJSON file
for (const filename of files) {
  const maXa = filename.replace('.geojson', ''); // Extract MaXa code from filename
  const filePath = path.join(PARCELS_DIR, filename);
  
  try {
    // Read and parse GeoJSON
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const geojson = JSON.parse(fileContent);
    
    if (!geojson.features || !Array.isArray(geojson.features)) {
      console.warn(`⚠️  Invalid GeoJSON structure in ${filename}`);
      stats.errors++;
      continue;
    }
    
    const parcelCount = geojson.features.length;
    stats.totalParcels += parcelCount;
    
    // Process each parcel
    for (const feature of geojson.features) {
      const props = feature.properties;
      
      // Extract SoThua and SoTo
      const soThua = props.SoThuTuThua || props.SoThua || props.SOTHUA;
      const soTo = props.SoHieuToBanDo || props.SoTo || props.SOTO;
      
      if (!soThua) continue; // Skip if no SoThua
      
      // Determine shard based on first digit of SoThua
      const soThuaStr = String(soThua);
      const firstDigit = soThuaStr.charAt(0);
      const shard = index[firstDigit] || index["0"];
      
      // Build index entry
      if (!shard[soThuaStr]) {
        shard[soThuaStr] = [];
        stats.totalIndexEntries++;
      }
      
      // Add MaXa with optional SoTo
      const entry = soTo ? `${maXa}:${soTo}` : maXa;
      
      // Only add if not already present (avoid duplicates)
      if (!shard[soThuaStr].includes(entry)) {
        shard[soThuaStr].push(entry);
      }
    }
    
    console.log(`✓ Processed ${filename.padEnd(20)} → ${parcelCount.toLocaleString().padStart(6)} parcels`);
    
  } catch (error) {
    console.error(`❌ Error processing ${filename}:`, error.message);
    stats.errors++;
  }
}

// Build final output structure
const output = {
  version: "1.0",
  generated: new Date().toISOString(),
  total_parcels: stats.totalParcels,
  total_index_entries: stats.totalIndexEntries,
  index: index
};

// Write to file
try {
  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');
  
  const duration = ((Date.now() - stats.startTime) / 1000).toFixed(2);
  const fileSize = (fs.statSync(OUTPUT_FILE).size / 1024).toFixed(2);
  
  console.log('\n📊 Index Generation Complete!');
  console.log('━'.repeat(50));
  console.log(`✅ Total files processed:    ${stats.totalFiles}`);
  console.log(`✅ Total parcels indexed:    ${stats.totalParcels.toLocaleString()}`);
  console.log(`✅ Unique SoThua values:     ${stats.totalIndexEntries.toLocaleString()}`);
  console.log(`✅ Shards created:           10 (0-9)`);
  console.log(`✅ Output file size:         ${fileSize} KB`);
  console.log(`✅ Build time:               ${duration}s`);
  console.log(`✅ Errors encountered:       ${stats.errors}`);
  console.log('━'.repeat(50));
  console.log(`✅ Written to: ${OUTPUT_FILE}`);
  console.log('\n🎉 Search index ready for use!');
  
  // Show shard breakdown
  console.log('\n📈 Shard Breakdown:');
  for (let i = 0; i <= 9; i++) {
    const shardSize = Object.keys(index[String(i)]).length;
    if (shardSize > 0) {
      console.log(`   Shard "${i}": ${shardSize.toLocaleString()} entries`);
    }
  }
  
} catch (error) {
  console.error('\n❌ Failed to write index file:', error.message);
  process.exit(1);
}
