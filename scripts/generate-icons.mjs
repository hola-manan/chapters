import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outputDir = path.join(rootDir, 'assets', 'images');

// Geometry definition in 100x100 space
const BARS = [
  { x: 20, y: 28, width: 60, height: 6, opacity: 1.0 },
  { x: 20, y: 40, width: 44, height: 6, opacity: 0.75 },
  { x: 20, y: 58, width: 60, height: 6, opacity: 1.0 },
  { x: 20, y: 70, width: 32, height: 6, opacity: 0.75 },
];
const CORNER_RADIUS = 3;

// CRC32 table and computation
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c >>> 0;
}

function crc32(buffers) {
  let crc = 0xffffffff;
  for (const buf of buffers) {
    for (let i = 0; i < buf.length; i++) {
      crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const dataBuf = data || Buffer.alloc(0);
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(dataBuf.length, 0);

  const crcVal = crc32([typeBuf, dataBuf]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);

  return Buffer.concat([lenBuf, typeBuf, dataBuf, crcBuf]);
}

function encodePng(width, height, rgbaBuffer) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth 8
  ihdrData.writeUInt8(6, 9); // RGBA (colour type 6)
  ihdrData.writeUInt8(0, 10); // compression method 0 (deflate)
  ihdrData.writeUInt8(0, 11); // filter method 0
  ihdrData.writeUInt8(0, 12); // interlace method 0 (none)
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Scanlines with filter byte 0
  const scanlineLength = 1 + width * 4;
  const rawData = Buffer.alloc(height * scanlineLength);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter byte 0: None
    const pixelRowOffset = y * width * 4;
    rgbaBuffer.copy(rawData, rowOffset + 1, pixelRowOffset, pixelRowOffset + width * 4);
  }

  // IDAT chunk
  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = createChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = createChunk('IEND', null);

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function parseHexColor(hex) {
  if (!hex || hex === 'transparent') {
    return null;
  }
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  };
}

function isPointInBar(px, py, bar) {
  const { x, y, width: w, height: h } = bar;
  const r = CORNER_RADIUS;
  if (px < x || px > x + w || py < y || py > y + h) {
    return false;
  }
  let cx = px;
  let cy = py;
  if (px < x + r) {
    cx = x + r;
  } else if (px > x + w - r) {
    cx = x + w - r;
  }
  if (py < y + r) {
    cy = y + r;
  } else if (py > y + h - r) {
    cy = y + h - r;
  }
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= r * r;
}

function renderIcon({ size, groundHex, markHex, inset = false }) {
  const ground = parseHexColor(groundHex);
  const mark = parseHexColor(markHex);
  const buffer = Buffer.alloc(size * size * 4);

  // Supersampling: 4x (4x4 = 16 subpixel samples per pixel)
  const SAMPLES_PER_AXIS = 4;
  const TOTAL_SAMPLES = SAMPLES_PER_AXIS * SAMPLES_PER_AXIS;

  const insetRatio = inset ? 0.72 : 1.0;
  const fieldSize = size * insetRatio;
  const offset = (size - fieldSize) / 2;

  const sampleOffsets = [];
  for (let sy = 0; sy < SAMPLES_PER_AXIS; sy++) {
    for (let sx = 0; sx < SAMPLES_PER_AXIS; sx++) {
      sampleOffsets.push({
        dx: (sx + 0.5) / SAMPLES_PER_AXIS,
        dy: (sy + 0.5) / SAMPLES_PER_AXIS,
      });
    }
  }

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let sumPremulR = 0;
      let sumPremulG = 0;
      let sumPremulB = 0;
      let sumA = 0;

      for (let s = 0; s < TOTAL_SAMPLES; s++) {
        const subX = px + sampleOffsets[s].dx;
        const subY = py + sampleOffsets[s].dy;

        // Map canvas subpixel to 100x100 mark coordinates
        const fx = ((subX - offset) / fieldSize) * 100;
        const fy = ((subY - offset) / fieldSize) * 100;

        let subR = ground ? ground.r : 0;
        let subG = ground ? ground.g : 0;
        let subB = ground ? ground.b : 0;
        let subA = ground ? 1.0 : 0.0;

        if (mark) {
          for (let b = 0; b < BARS.length; b++) {
            const bar = BARS[b];
            if (isPointInBar(fx, fy, bar)) {
              const barOpacity = bar.opacity;
              if (ground) {
                subR = mark.r * barOpacity + ground.r * (1 - barOpacity);
                subG = mark.g * barOpacity + ground.g * (1 - barOpacity);
                subB = mark.b * barOpacity + ground.b * (1 - barOpacity);
                subA = 1.0;
              } else {
                subR = mark.r;
                subG = mark.g;
                subB = mark.b;
                subA = barOpacity;
              }
              break;
            }
          }
        }

        sumPremulR += subR * subA;
        sumPremulG += subG * subA;
        sumPremulB += subB * subA;
        sumA += subA;
      }

      const pixelIndex = (py * size + px) * 4;
      const avgA = sumA / TOTAL_SAMPLES;

      if (avgA > 0) {
        buffer[pixelIndex] = Math.round(sumPremulR / sumA);
        buffer[pixelIndex + 1] = Math.round(sumPremulG / sumA);
        buffer[pixelIndex + 2] = Math.round(sumPremulB / sumA);
        buffer[pixelIndex + 3] = Math.round(avgA * 255);
      } else {
        buffer[pixelIndex] = 0;
        buffer[pixelIndex + 1] = 0;
        buffer[pixelIndex + 2] = 0;
        buffer[pixelIndex + 3] = 0;
      }
    }
  }

  return encodePng(size, size, buffer);
}

const ICONS = [
  { file: 'icon.png', size: 1024, groundHex: '#142621', markHex: '#F7F8FA' },
  { file: 'icon-dark.png', size: 1024, groundHex: '#0C1412', markHex: '#F7F8FA' },
  { file: 'icon-tinted.png', size: 1024, groundHex: '#1C1C1C', markHex: '#EDEDED' },
  { file: 'android-icon-foreground.png', size: 1024, groundHex: 'transparent', markHex: '#F7F8FA', inset: true },
  { file: 'android-icon-background.png', size: 1024, groundHex: '#142621', markHex: null },
  { file: 'android-icon-monochrome.png', size: 1024, groundHex: 'transparent', markHex: '#FFFFFF', inset: true },
  { file: 'splash-icon.png', size: 512, groundHex: 'transparent', markHex: '#142621' },
  { file: 'splash-icon-dark.png', size: 512, groundHex: 'transparent', markHex: '#F7F8FA' },
  { file: 'favicon.png', size: 48, groundHex: '#142621', markHex: '#F7F8FA' },
];

fs.mkdirSync(outputDir, { recursive: true });

for (const icon of ICONS) {
  const startTime = Date.now();
  const pngBuffer = renderIcon(icon);
  const outPath = path.join(outputDir, icon.file);
  fs.writeFileSync(outPath, pngBuffer);
  console.log(`Generated ${icon.file} (${icon.size}x${icon.size}) in ${Date.now() - startTime}ms`);
}
