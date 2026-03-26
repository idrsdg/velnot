'use strict';
const { PNG } = require('pngjs');
const { imagesToIco } = require('png-to-ico');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'assets');
fs.mkdirSync(OUT, { recursive: true });

// Orange #f97316 → Pink #ec4899, 135° linear gradient, rounded corners
function makeGradientBitmap(size) {
  const data = Buffer.alloc(size * size * 4);
  const radius = Math.round(size * 0.25); // ~25% corner radius (matches site's rx=8 on 32px)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) * 4;

      // Rounded-rect alpha: check if pixel is inside
      const inCorner = (cx, cy) => {
        const dx = x - cx, dy = y - cy;
        return Math.sqrt(dx * dx + dy * dy) > radius;
      };
      const outside =
        (x < radius && y < radius && inCorner(radius, radius)) ||
        (x > size - 1 - radius && y < radius && inCorner(size - 1 - radius, radius)) ||
        (x < radius && y > size - 1 - radius && inCorner(radius, size - 1 - radius)) ||
        (x > size - 1 - radius && y > size - 1 - radius && inCorner(size - 1 - radius, size - 1 - radius));

      if (outside) {
        data[idx + 3] = 0; // transparent
        continue;
      }

      // 135° linear gradient: t goes 0→1 from top-left to bottom-right
      const t = (x + y) / (2 * (size - 1));

      // #f97316 (249,115,22) → #ec4899 (236,72,153)
      data[idx]     = Math.round(249 + (236 - 249) * t); // R
      data[idx + 1] = Math.round(115 + (72  - 115) * t); // G
      data[idx + 2] = Math.round(22  + (153 - 22)  * t); // B
      data[idx + 3] = 255;                                // A
    }
  }
  return { width: size, height: size, data };
}

// Save icon.png (256×256)
const bitmap256 = makeGradientBitmap(256);
const png = new PNG({ width: 256, height: 256 });
bitmap256.data.copy(png.data);
const pngBuf = PNG.sync.write(png);
fs.writeFileSync(path.join(OUT, 'icon.png'), pngBuf);
console.log('✅ assets/icon.png oluşturuldu');

// Save icon.ico (256, 48, 32, 16 — multi-size ICO)
const sizes = [256, 48, 32, 16];
const bitmaps = sizes.map(makeGradientBitmap);
const icoBuf = imagesToIco(bitmaps);
fs.writeFileSync(path.join(OUT, 'icon.ico'), icoBuf);
console.log('✅ assets/icon.ico oluşturuldu (' + sizes.join('px, ') + 'px)');
