#!/usr/bin/env node

/**
 * Generate icon files for all platforms from a source image
 * Usage: node scripts/generate-icons.js [source-image.png]
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ICON_SIZES = {
  mac: [16, 32, 64, 128, 256, 512, 1024],
  win: [16, 24, 32, 48, 64, 128, 256],
  linux: [16, 24, 32, 48, 64, 128, 256, 512, 1024]
};

async function generateIcons(sourceImage) {
  const buildDir = path.join(__dirname, '..', 'build');
  const iconsDir = path.join(buildDir, 'icons');

  // Create directories
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  console.log('🎨 Generating icons for all platforms...');

  // If no source image provided, create a placeholder
  if (!sourceImage || !fs.existsSync(sourceImage)) {
    console.log('📝 Creating placeholder icon...');
    await createPlaceholderIcon(path.join(buildDir, 'icon-source.png'));
    sourceImage = path.join(buildDir, 'icon-source.png');
  }

  // Generate PNG icons for Linux
  console.log('🐧 Generating Linux icons...');
  for (const size of ICON_SIZES.linux) {
    const outputPath = path.join(iconsDir, `${size}x${size}.png`);
    await sharp(sourceImage)
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(outputPath);
    console.log(`  ✓ ${size}x${size}.png`);
  }

  // Generate Windows ICO (using largest PNG)
  console.log('🪟 Generating Windows icon...');
  const win256Path = path.join(iconsDir, '256x256.png');
  if (fs.existsSync(win256Path)) {
    // Copy as placeholder for ICO
    fs.copyFileSync(win256Path, path.join(buildDir, 'icon.ico'));
    console.log('  ✓ icon.ico (placeholder - use proper ICO converter for production)');
  }

  // Generate macOS ICNS (placeholder)
  console.log('🍎 Generating macOS icon...');
  const mac1024Path = path.join(iconsDir, '1024x1024.png');
  if (fs.existsSync(mac1024Path)) {
    // Copy as placeholder for ICNS
    fs.copyFileSync(mac1024Path, path.join(buildDir, 'icon.icns'));
    console.log('  ✓ icon.icns (placeholder - use proper ICNS converter for production)');
  }

  console.log('\n✅ Icon generation complete!');
  console.log('\n📌 Note: For production builds:');
  console.log('  • Convert PNG to ICO for Windows using an online tool or iconutil');
  console.log('  • Convert PNG to ICNS for macOS using: iconutil -c icns icon.iconset');
}

async function createPlaceholderIcon(outputPath) {
  // Create a simple placeholder icon with "PP" text
  const svg = `
    <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="1024" height="1024" rx="200" fill="url(#grad)"/>
      <text x="512" y="600" font-family="Arial, sans-serif" font-size="400" font-weight="bold" 
            text-anchor="middle" fill="white">PP</text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(outputPath);
}

// Run the script
const sourceImage = process.argv[2];
generateIcons(sourceImage).catch(console.error);