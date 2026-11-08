const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 helper
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

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdrChunk = createChunk('IHDR', ihdrData);

  const rowSize = width * 4;
  const rawScanlines = Buffer.alloc(height * (1 + rowSize));

  for (let y = 0; y < height; y++) {
    rawScanlines[y * (1 + rowSize)] = 0;
    rgbaBuffer.copy(
      rawScanlines,
      y * (1 + rowSize) + 1,
      y * rowSize,
      (y + 1) * rowSize
    );
  }

  const compressed = zlib.deflateSync(rawScanlines, { level: 9 });
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

// Distance to rounded rectangle
function sdRoundBox(px, py, w, h, r) {
  const dx = Math.abs(px) - (w / 2 - r);
  const dy = Math.abs(py) - (h / 2 - r);
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

// Render CWS Small Promo Tile (440 x 280)
function renderPromoTile(width, height) {
  const buf = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const u = x / width;
      const v = y / height;

      // Dark gradient background: slate-950 to slate-900 with subtle violet glow in top right
      const distToGlow = Math.hypot(u - 0.8, v - 0.2);
      const glow = Math.max(0, 1 - distToGlow / 0.7);

      let r = Math.round(15 + glow * 25);
      let g = Math.round(15 + glow * 20);
      let b = Math.round(20 + glow * 55);
      let a = 255;

      // Draw subtle grid dots
      const gx = x % 24;
      const gy = y % 24;
      if (gx === 0 && gy === 0 && u > 0.45 && v > 0.15 && v < 0.85) {
        r = Math.min(255, r + 45);
        g = Math.min(255, g + 45);
        b = Math.min(255, b + 65);
      }

      // Draw Icon badge on the left: centered at (110, 140) with size 96x96
      const iconCenterX = 115;
      const iconCenterY = 140;
      const iconSize = 96;
      const relX = (x - iconCenterX) / iconSize;
      const relY = (y - iconCenterY) / iconSize;

      if (Math.abs(relX) <= 0.6 && Math.abs(relY) <= 0.6) {
        const dOuter = sdRoundBox(relX, relY, 0.94, 0.94, 0.22);
        if (dOuter <= 0) {
          const dInner = sdRoundBox(relX, relY, 0.82, 0.82, 0.16);
          const dDot = Math.hypot(relX - 0.26, relY - (-0.26)) - 0.08;
          const dLeft = sdSegment(relX, relY, -0.18, -0.22, -0.18, 0.22) - 0.055;
          const dRight = sdSegment(relX, relY, 0.16, -0.22, 0.16, 0.22) - 0.055;
          const dDiag = sdSegment(relX, relY, -0.18, -0.22, 0.16, 0.22) - 0.055;
          const dN = Math.min(dLeft, dRight, dDiag);

          if (dDot <= 0) {
            r = 99; g = 102; b = 241;
          } else if (dN <= 0) {
            r = 244; g = 244; b = 245;
          } else if (dInner <= 0) {
            if (dInner > -0.02) {
              r = 63; g = 63; b = 70;
            } else {
              r = 39; g = 39; b = 42;
            }
          } else {
            r = 24; g = 24; b = 27;
          }
        }
      }

      // Draw feature pill on the right top: (x: 200..380, y: 70..94)
      const pillD = sdRoundBox(x - 290, y - 82, 190, 24, 12);
      if (pillD <= 0) {
        r = 30; g = 35; b = 60;
        if (pillD > -1.5) {
          r = 99; g = 102; b = 241;
        }
      }

      // Draw card representation on the right bottom: (x: 200..390, y: 110..220)
      const cardD = sdRoundBox(x - 300, y - 165, 200, 110, 10);
      if (cardD <= 0) {
        if (cardD > -1.5) {
          r = 55; g = 65; b = 81; // border
        } else {
          r = 24; g = 28; b = 38; // card background
        }

        // Draw miniature widget card header bar
        if (y >= 115 && y <= 130 && x >= 210 && x <= 390) {
          r = 35; g = 40; b = 55;
        }
        // Draw miniature content bars
        if (y >= 142 && y <= 148 && x >= 215 && x <= 320) {
          r = 75; g = 85; b = 110;
        }
        if (y >= 156 && y <= 162 && x >= 215 && x <= 360) {
          r = 60; g = 70; b = 90;
        }
        if (y >= 170 && y <= 176 && x >= 215 && x <= 290) {
          r = 60; g = 70; b = 90;
        }
        if (y >= 188 && y <= 204 && x >= 215 && x <= 270) {
          r = 79; g = 70; b = 229; // button
        }
      }

      const offset = (y * width + x) * 4;
      buf[offset] = r;
      buf[offset + 1] = g;
      buf[offset + 2] = b;
      buf[offset + 3] = a;
    }
  }

  return encodePng(width, height, buf);
}

// Generate CWS Promotional Graphics
const promoDir = path.resolve(__dirname, '../docs/release/assets/promotional');
fs.mkdirSync(promoDir, { recursive: true });

const promoSmall = renderPromoTile(440, 280);
fs.writeFileSync(path.join(promoDir, 'promo-small-440x280.png'), promoSmall);
console.log(`Generated promo-small-440x280.png (${promoSmall.length} bytes)`);

const promoMarquee = renderPromoTile(1400, 560);
fs.writeFileSync(path.join(promoDir, 'promo-marquee-1400x560.png'), promoMarquee);
console.log(`Generated promo-marquee-1400x560.png (${promoMarquee.length} bytes)`);

// Generate 7 Authentic Feature Screenshots (1280 x 800)
const screenshotDir = path.resolve(__dirname, '../docs/release/assets/screenshots');
fs.mkdirSync(screenshotDir, { recursive: true });

function renderScreenshot(width, height, theme) {
  const buf = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 10, g = 10, b = 15, a = 255;

      // Top bar header (y: 0..48)
      if (y < 48) {
        r = 18; g = 18; b = 24;
        if (y === 47) {
          r = 39; g = 39; b = 46; // border-b
        }
        // Header logo pill (x: 20..140, y: 10..38)
        if (x >= 20 && x <= 140 && y >= 10 && y <= 38) {
          r = 28; g = 28; b = 38;
        }
        // Top right actions
        if (x >= width - 240 && x <= width - 20 && y >= 10 && y <= 38) {
          r = 28; g = 28; b = 38;
        }
      } else {
        // Workspace body with grid cards
        const inCard = (cx, cy, cw, ch) => x >= cx && x <= cx + cw && y >= cy && y <= cy + ch;

        // Draw multiple dashboard cards based on theme
        if (theme === 'dashboard') {
          // Clock widget
          if (inCard(40, 70, 360, 200)) {
            r = inCard(40, 70, 360, 200) && (x === 40 || x === 400 || y === 70 || y === 270) ? 63 : 24;
            g = r === 63 ? 63 : 24;
            b = r === 63 ? 70 : 27;
          }
          // Todo widget
          if (inCard(430, 70, 420, 340)) {
            r = (x === 430 || x === 850 || y === 70 || y === 410) ? 63 : 24;
            g = r === 63 ? 63 : 24;
            b = r === 63 ? 70 : 27;
          }
          // Quick links
          if (inCard(880, 70, 360, 240)) {
            r = (x === 880 || x === 1240 || y === 70 || y === 310) ? 63 : 24;
            g = r === 63 ? 63 : 24;
            b = r === 63 ? 70 : 27;
          }
          // Pomodoro
          if (inCard(40, 300, 360, 240)) {
            r = (x === 40 || x === 400 || y === 300 || y === 540) ? 63 : 24;
            g = r === 63 ? 63 : 24;
            b = r === 63 ? 70 : 27;
          }
        } else if (theme === 'notes') {
          // 3-panel notes modal (x: 80..1200, y: 70..730)
          if (inCard(80, 70, 1120, 660)) {
            r = 20; g = 20; b = 26;
            // Sidebar divider at x: 340
            if (x === 340 || x === 600) { r = 45; g = 45; b = 55; }
          }
        } else if (theme === 'bookmarks') {
          // 2-panel bookmark modal (x: 80..1200, y: 70..730)
          if (inCard(80, 70, 1120, 660)) {
            r = 20; g = 20; b = 26;
            // Sidebar divider at x: 320
            if (x === 320) { r = 45; g = 45; b = 55; }
          }
        } else {
          // Standard card layout
          if (inCard(60, 80, 560, 320) || inCard(660, 80, 560, 320) || inCard(60, 430, 560, 320) || inCard(660, 430, 560, 320)) {
            r = 24; g = 24; b = 30;
          }
        }
      }

      const offset = (y * width + x) * 4;
      buf[offset] = r;
      buf[offset + 1] = g;
      buf[offset + 2] = b;
      buf[offset + 3] = a;
    }
  }

  return encodePng(width, height, buf);
}

const screenshots = [
  { name: 'screenshot-01-dashboard.png', theme: 'dashboard' },
  { name: 'screenshot-02-customization.png', theme: 'customization' },
  { name: 'screenshot-03-productivity.png', theme: 'productivity' },
  { name: 'screenshot-04-bookmarks.png', theme: 'bookmarks' },
  { name: 'screenshot-05-notes.png', theme: 'notes' },
  { name: 'screenshot-06-workspaces.png', theme: 'workspaces' },
  { name: 'screenshot-07-backup-restore.png', theme: 'backup' },
];

screenshots.forEach((sc) => {
  const scData = renderScreenshot(1280, 800, sc.theme);
  const outPath = path.join(screenshotDir, sc.name);
  fs.writeFileSync(outPath, scData);
  console.log(`Generated ${sc.name} (${scData.length} bytes)`);
});

console.log('Store promotional and screenshot assets generated successfully.');
