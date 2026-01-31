/**
 * Image Optimization Script
 * Chuyển đổi PNG/JPG sang WebP và AVIF với kích thước tối ưu
 * 
 * Chạy: npm run optimize:images
 * Yêu cầu: npm install sharp --save-dev
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IMAGES_DIR = path.join(__dirname, '../public/images');
const OUTPUT_DIR = path.join(__dirname, '../public/images/optimized');

// Cấu hình tối ưu cho từng loại hình
const configs = {
    'thumbnail.png': {
        width: 1200,  // OG image chuẩn
        height: 630,
        quality: 85
    },
    'logo.png': {
        width: 200,
        quality: 90
    },
    'favicon.png': {
        width: 192,  // PWA icon size
        quality: 95
    },
    'qr-code.png': {
        width: 300,
        quality: 90
    },
    'your-avatar.png': {
        width: 200,
        quality: 85
    }
};

async function optimizeImages() {
    // Tạo thư mục output nếu chưa có
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const files = fs.readdirSync(IMAGES_DIR).filter(f => 
        f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg')
    );

    console.log(`🖼️  Tìm thấy ${files.length} hình ảnh cần tối ưu\n`);

    for (const file of files) {
        const inputPath = path.join(IMAGES_DIR, file);
        const baseName = path.parse(file).name;
        const config = configs[file] || { quality: 85 };

        // Bỏ qua thư mục
        if (fs.statSync(inputPath).isDirectory()) continue;

        const originalSize = fs.statSync(inputPath).size;
        console.log(`📦 ${file}: ${(originalSize / 1024).toFixed(1)} KB`);

        try {
            let pipeline = sharp(inputPath);

            // Resize nếu có config
            if (config.width) {
                pipeline = pipeline.resize(config.width, config.height, {
                    fit: 'inside',
                    withoutEnlargement: true
                });
            }

            // Xuất WebP
            const webpPath = path.join(OUTPUT_DIR, `${baseName}.webp`);
            await pipeline.clone().webp({ quality: config.quality }).toFile(webpPath);
            const webpSize = fs.statSync(webpPath).size;
            console.log(`   → WebP: ${(webpSize / 1024).toFixed(1)} KB (${Math.round((1 - webpSize/originalSize) * 100)}% giảm)`);

            // Xuất AVIF (nén tốt hơn WebP)
            const avifPath = path.join(OUTPUT_DIR, `${baseName}.avif`);
            await pipeline.clone().avif({ quality: config.quality - 5 }).toFile(avifPath);
            const avifSize = fs.statSync(avifPath).size;
            console.log(`   → AVIF: ${(avifSize / 1024).toFixed(1)} KB (${Math.round((1 - avifSize/originalSize) * 100)}% giảm)`);

            // Giữ lại PNG đã optimize
            const pngPath = path.join(OUTPUT_DIR, file);
            await pipeline.clone().png({ 
                compressionLevel: 9,
                palette: true 
            }).toFile(pngPath);
            const pngSize = fs.statSync(pngPath).size;
            console.log(`   → PNG:  ${(pngSize / 1024).toFixed(1)} KB (${Math.round((1 - pngSize/originalSize) * 100)}% giảm)\n`);

        } catch (err) {
            console.error(`   ❌ Lỗi: ${err.message}\n`);
        }
    }

    console.log('✅ Hoàn tất! Hình ảnh đã tối ưu nằm trong: public/images/optimized/');
    console.log('\n📝 Bước tiếp theo:');
    console.log('1. Kiểm tra chất lượng hình ảnh');
    console.log('2. Copy hình ảnh mới vào public/images/');
    console.log('3. Cập nhật HTML để dùng <picture> tag với srcset');
}

optimizeImages().catch(console.error);
