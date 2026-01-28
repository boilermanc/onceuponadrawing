import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const sourceIcon = path.join(__dirname, '../public/faveicon.png');
const outputDir = path.join(__dirname, '../public/icons');

async function generateIcons() {
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generate standard icons
  for (const size of sizes) {
    await sharp(sourceIcon)
      .resize(size, size)
      .png({ quality: 90 })
      .toFile(path.join(outputDir, `icon-${size}x${size}.png`));
    console.log(`Generated icon-${size}x${size}.png`);
  }

  // Generate maskable icon with padding (safe zone is 80% of canvas)
  const maskableSize = 512;
  const padding = Math.floor(maskableSize * 0.1); // 10% padding on each side
  const innerSize = maskableSize - (padding * 2);

  await sharp(sourceIcon)
    .resize(innerSize, innerSize)
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: { r: 253, g: 200, b: 94, alpha: 1 }, // Match the yellow/orange background
    })
    .png({ quality: 90 })
    .toFile(path.join(outputDir, `maskable-icon-${maskableSize}x${maskableSize}.png`));

  console.log(`Generated maskable-icon-${maskableSize}x${maskableSize}.png`);

  // Generate favicon.ico (multi-size ICO)
  // For simplicity, we'll create a 32x32 PNG as the primary favicon
  await sharp(sourceIcon)
    .resize(32, 32)
    .png()
    .toFile(path.join(__dirname, '../public/favicon-32x32.png'));
  console.log('Generated favicon-32x32.png');

  await sharp(sourceIcon)
    .resize(16, 16)
    .png()
    .toFile(path.join(__dirname, '../public/favicon-16x16.png'));
  console.log('Generated favicon-16x16.png');

  console.log('\nAll icons generated successfully!');
}

generateIcons().catch(console.error);
