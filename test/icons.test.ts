import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function parsePngHeader(filePath: string) {
  const buf = fs.readFileSync(filePath);
  assert.ok(buf.length >= 33, `File ${filePath} is too small to be a valid PNG`);

  // Check 8-byte signature
  assert.deepStrictEqual(
    buf.subarray(0, 8),
    PNG_SIGNATURE,
    `File ${filePath} does not have a valid PNG signature`
  );

  // Chunk length (IHDR is always 13 bytes)
  const ihdrLength = buf.readUInt32BE(8);
  assert.strictEqual(ihdrLength, 13, `IHDR chunk length must be 13, got ${ihdrLength}`);

  // Chunk type
  const ihdrType = buf.subarray(12, 16).toString('ascii');
  assert.strictEqual(ihdrType, 'IHDR', `First chunk must be IHDR, got ${ihdrType}`);

  // Chunk data
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const bitDepth = buf.readUInt8(24);
  const colourType = buf.readUInt8(25);
  const compressionMethod = buf.readUInt8(26);
  const filterMethod = buf.readUInt8(27);
  const interlaceMethod = buf.readUInt8(28);

  return {
    width,
    height,
    bitDepth,
    colourType,
    compressionMethod,
    filterMethod,
    interlaceMethod,
  };
}

test('icon.png has valid PNG signature, 1024x1024 dimensions, 8-bit depth, and RGBA colour type', () => {
  const iconPath = path.resolve(process.cwd(), 'assets', 'images', 'icon.png');
  assert.ok(fs.existsSync(iconPath), 'icon.png must exist');

  const header = parsePngHeader(iconPath);
  assert.strictEqual(header.width, 1024);
  assert.strictEqual(header.height, 1024);
  assert.strictEqual(header.bitDepth, 8);
  assert.strictEqual(header.colourType, 6);
  assert.strictEqual(header.compressionMethod, 0);
  assert.strictEqual(header.filterMethod, 0);
  assert.strictEqual(header.interlaceMethod, 0);
});

test('splash-icon.png has valid PNG signature, 512x512 dimensions, 8-bit depth, and RGBA colour type', () => {
  const splashPath = path.resolve(process.cwd(), 'assets', 'images', 'splash-icon.png');
  assert.ok(fs.existsSync(splashPath), 'splash-icon.png must exist');

  const header = parsePngHeader(splashPath);
  assert.strictEqual(header.width, 512);
  assert.strictEqual(header.height, 512);
  assert.strictEqual(header.bitDepth, 8);
  assert.strictEqual(header.colourType, 6);
  assert.strictEqual(header.compressionMethod, 0);
  assert.strictEqual(header.filterMethod, 0);
  assert.strictEqual(header.interlaceMethod, 0);
});

test('all required icon assets exist with valid PNG headers and expected dimensions', () => {
  const expectedFiles: { name: string; size: number }[] = [
    { name: 'icon.png', size: 1024 },
    { name: 'icon-dark.png', size: 1024 },
    { name: 'icon-tinted.png', size: 1024 },
    { name: 'android-icon-foreground.png', size: 1024 },
    { name: 'android-icon-background.png', size: 1024 },
    { name: 'android-icon-monochrome.png', size: 1024 },
    { name: 'splash-icon.png', size: 512 },
    { name: 'splash-icon-dark.png', size: 512 },
    { name: 'favicon.png', size: 48 },
  ];

  for (const { name, size } of expectedFiles) {
    const filePath = path.resolve(process.cwd(), 'assets', 'images', name);
    assert.ok(fs.existsSync(filePath), `${name} must exist`);
    const header = parsePngHeader(filePath);
    assert.strictEqual(header.width, size, `${name} width must be ${size}`);
    assert.strictEqual(header.height, size, `${name} height must be ${size}`);
    assert.strictEqual(header.bitDepth, 8, `${name} bit depth must be 8`);
    assert.strictEqual(header.colourType, 6, `${name} colour type must be 6 (RGBA)`);
  }
});

test('all required web icon assets exist with valid PNG headers and expected dimensions', () => {
  const expectedWebFiles: { name: string; size: number }[] = [
    { name: 'icon-192.png', size: 192 },
    { name: 'icon-512.png', size: 512 },
    { name: 'icon-512-maskable.png', size: 512 },
    { name: 'apple-touch-icon.png', size: 180 },
  ];

  for (const { name, size } of expectedWebFiles) {
    const filePath = path.resolve(process.cwd(), 'public', 'icons', name);
    assert.ok(fs.existsSync(filePath), `${name} must exist`);
    const header = parsePngHeader(filePath);
    assert.strictEqual(header.width, size, `${name} width must be ${size}`);
    assert.strictEqual(header.height, size, `${name} height must be ${size}`);
    assert.strictEqual(header.bitDepth, 8, `${name} bit depth must be 8`);
    assert.strictEqual(header.colourType, 6, `${name} colour type must be 6 (RGBA)`);
  }
});
