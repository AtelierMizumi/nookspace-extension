const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 implementation for PNG chunks
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const body = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(body);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);

  return Buffer.concat([lenBuf, body, crcBuf]);
}

function encodePng(width, height, rgbaBuffer) {
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // Deflate
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Non-interlaced
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Scanlines with filter byte 0 (None)
  const rowSize = width * 4;
  const rawScanlines = Buffer.alloc(height * (1 + rowSize));

  for (let y = 0; y < height; y++) {
    rawScanlines[y * (1 + rowSize)] = 0; // Filter type: None
    rgbaBuffer.copy(
      rawScanlines,
      y * (1 + rowSize) + 1,
      y * rowSize,
      (y + 1) * rowSize
    );
  }

  const compressed = zlib.deflateSync(rawScanlines, { level: 9 });
  const idatChunk = createChunk('IDAT', compressed);

  // IEND
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

// Distance to rounded rectangle
function sdRoundBox(x, y, w, h, r) {
  const dx = Math.abs(x) - (w / 2 - r);
  const dy = Math.abs(y) - (h / 2 - r);
  const outsideDist = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
  const insideDist = Math.min(Math.max(dx, dy), 0);
  return outsideDist + insideDist - r;
}

// Distance to line segment
function sdSegment(px, py, ax, ay, bx, by) {
  const pax = px - ax;
  const pay = py - ay;
  const bax = bx - ax;
  const bay = by - ay;
  const h = Math.max(0, Math.min(1, (pax * bax + pay * bay) / (bax * bax + bay * bay)));
  return Math.hypot(pax - bax * h, pay - bay * h);
}

// Sample color at normalized coordinate (u, v) in [0, 1]
function sample(u, v) {
  // Center is (0, 0)
  const px = u - 0.5;
  const py = v - 0.5;

  // 1. Outer rounded rect (w: 0.96, h: 0.96, r: 0.22)
  const dOuter = sdRoundBox(px, py, 0.96, 0.96, 0.22);
  if (dOuter > 0.01) {
    return [0, 0, 0, 0]; // Transparent
  }

  // 2. Inner card (w: 0.82, h: 0.82, r: 0.16)
  const dInner = sdRoundBox(px, py, 0.82, 0.82, 0.16);

  // 3. Dot (center: 0.28, -0.28, r: 0.08)
  const dDot = Math.hypot(px - 0.26, py - (-0.26)) - 0.08;

  // 4. Letter "N"
  // Left bar: (-0.18, -0.22) to (-0.18, 0.22)
  const dLeft = sdSegment(px, py, -0.18, -0.22, -0.18, 0.22) - 0.055;
  // Right bar: (0.16, -0.22) to (0.16, 0.22)
  const dRight = sdSegment(px, py, 0.16, -0.22, 0.16, 0.22) - 0.055;
  // Diagonal bar: (-0.18, -0.22) to (0.16, 0.22)
  const dDiag = sdSegment(px, py, -0.18, -0.22, 0.16, 0.22) - 0.055;
  const dN = Math.min(dLeft, dRight, dDiag);

  let r = 24, g = 24, b = 27, a = 255; // #18181b

  // Inner card background
  if (dInner <= 0) {
    // Border check
    if (dInner > -0.018) {
      r = 63; g = 63; b = 70; // #3f3f46
    } else {
      r = 39; g = 39; b = 42; // #27272a
    }
  }

  // Draw Letter N
  if (dN <= 0) {
    r = 244; g = 244; b = 245; // #f4f4f5
  }

  // Draw Accent Dot (on top)
  if (dDot <= 0) {
    r = 99; g = 102; b = 241; // #6366f1
  }

  // Anti-aliasing at the outer boundary
  if (dOuter > -0.02) {
    const edgeAlpha = Math.max(0, Math.min(1, -dOuter / 0.02));
    a = Math.round(a * edgeAlpha);
  }

  return [r, g, b, a];
}

function renderIcon(size) {
  const buf = Buffer.alloc(size * size * 4);
  const ss = 4; // 4x supersampling

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let rSum = 0, gSum = 0, bSum = 0, aSum = 0;

      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const u = (x + (sx + 0.5) / ss) / size;
          const v = (y + (sy + 0.5) / ss) / size;
          const [pr, pg, pb, pa] = sample(u, v);
          rSum += pr * (pa / 255);
          gSum += pg * (pa / 255);
          bSum += pb * (pa / 255);
          aSum += pa;
        }
      }

      const totalSamples = ss * ss;
      const finalA = aSum / totalSamples;
      let finalR = 0, finalG = 0, finalB = 0;

      if (finalA > 0) {
        finalR = Math.round((rSum / totalSamples) / (finalA / 255));
        finalG = Math.round((gSum / totalSamples) / (finalA / 255));
        finalB = Math.round((bSum / totalSamples) / (finalA / 255));
      }

      const offset = (y * size + x) * 4;
      buf[offset] = Math.min(255, Math.max(0, finalR));
      buf[offset + 1] = Math.min(255, Math.max(0, finalG));
      buf[offset + 2] = Math.min(255, Math.max(0, finalB));
      buf[offset + 3] = Math.min(255, Math.max(0, Math.round(finalA)));
    }
  }

  return encodePng(size, size, buf);
}

// Generate all target sizes
const sizes = [16, 32, 48, 128, 512];

const publicIconDir = path.resolve(__dirname, '../public/icon');
const releaseIconDir = path.resolve(__dirname, '../docs/release/assets/icons');

fs.mkdirSync(publicIconDir, { recursive: true });
fs.mkdirSync(releaseIconDir, { recursive: true });

sizes.forEach((s) => {
  const pngData = renderIcon(s);
  const publicPath = path.join(publicIconDir, `${s}.png`);
  const releasePath = path.join(releaseIconDir, `icon-${s}.png`);

  fs.writeFileSync(publicPath, pngData);
  fs.writeFileSync(releasePath, pngData);

  console.log(`Generated ${s}x${s} icon -> ${publicPath} (${pngData.length} bytes)`);
});

// Copy SVG to release assets
const svgSource = path.join(publicIconDir, 'icon.svg');
if (fs.existsSync(svgSource)) {
  fs.copyFileSync(svgSource, path.join(releaseIconDir, 'icon.svg'));
  console.log(`Copied icon.svg -> ${path.join(releaseIconDir, 'icon.svg')}`);
}

console.log('Icon generation completed successfully.');
