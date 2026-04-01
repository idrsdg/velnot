'use strict';
const { createCanvas } = require('canvas');
const { imagesToIco } = require('png-to-ico');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'assets');
fs.mkdirSync(OUT, { recursive: true });

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const radius = size * 0.22;

  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#f97316');
  grad.addColorStop(1, '#ec4899');

  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.font = `${size * 0.52}px "Segoe UI Emoji", "Apple Color Emoji", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🎙', size / 2, size * 0.54);

  return canvas;
}

function makeIconPng(size) {
  return drawIcon(size).toBuffer('image/png');
}

function makeIconBitmap(size) {
  const canvas = drawIcon(size);
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, size, size);
  return { width: size, height: size, data: Buffer.from(imageData.data) };
}

// Save icon.png (256×256)
const png256 = makeIconPng(256);
fs.writeFileSync(path.join(OUT, 'icon.png'), png256);
console.log('✅ assets/icon.png oluşturuldu');

// Save icon.ico (256, 48, 32, 16)
const sizes = [256, 48, 32, 16];
const buffers = sizes.map(makeIconBitmap);

(async () => {
  const icoBuf = await imagesToIco(buffers);
  fs.writeFileSync(path.join(OUT, 'icon.ico'), icoBuf);
  console.log('✅ assets/icon.ico oluşturuldu (' + sizes.join('px, ') + 'px)');
})();
