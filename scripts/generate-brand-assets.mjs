import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync, inflateSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/** Decode an 8-bit non-interlaced RGBA PNG buffer into { width, height, rgba }. */
export function decodeRgbaPng(buf) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (buf.length < 24 || !buf.subarray(0, 8).equals(sig)) {
    throw new Error('Invalid PNG signature');
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks = [];

  while (offset + 12 <= buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + length;
  }

  if (bitDepth !== 8 || colorType !== 6 || width <= 0 || height <= 0) {
    throw new Error(`Unsupported PNG format: ${width}x${height} depth=${bitDepth} colorType=${colorType}`);
  }

  const bpp = 4;
  const stride = width * bpp;
  const inflated = inflateSync(Buffer.concat(idatChunks));
  const expectedLen = height * (1 + stride);
  if (inflated.length < expectedLen) {
    throw new Error(`Truncated PNG pixel data: got ${inflated.length}, expected ${expectedLen}`);
  }

  const rgba = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y += 1) {
    const srcRow = y * (1 + stride);
    const filter = inflated[srcRow];
    const dstRow = y * stride;
    const prevRow = (y - 1) * stride;

    for (let i = 0; i < stride; i += 1) {
      const rawVal = inflated[srcRow + 1 + i];
      const a = i >= bpp ? rgba[dstRow + i - bpp] : 0;
      const b = y > 0 ? rgba[prevRow + i] : 0;
      const c = y > 0 && i >= bpp ? rgba[prevRow + i - bpp] : 0;

      let recon = rawVal;
      if (filter === 1) {
        recon = (rawVal + a) & 0xff;
      } else if (filter === 2) {
        recon = (rawVal + b) & 0xff;
      } else if (filter === 3) {
        recon = (rawVal + ((a + b) >> 1)) & 0xff;
      } else if (filter === 4) {
        recon = (rawVal + paethPredictor(a, b, c)) & 0xff;
      } else if (filter !== 0) {
        throw new Error(`Unsupported PNG scanline filter type: ${filter}`);
      }
      rgba[dstRow + i] = recon;
    }
  }

  return { width, height, rgba };
}

/** Encode RGBA buffer as an 8-bit RGBA PNG buffer. */
export function encodeRgbaPng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc(height * (1 + stride));
  for (let y = 0; y < height; y += 1) {
    raw[y * (1 + stride)] = 0;
    rgba.copy(raw, y * (1 + stride) + 1, y * stride, (y + 1) * stride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', deflateSync(raw, { level: 9 })),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Compute square crop box around opaque pixels (alpha > 8) with padding ratio. */
function getContentSquareCrop(src) {
  const { width, height, rgba } = src;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const a = rgba[(y * width + x) * 4 + 3];
      if (a > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return { x: 0, y: 0, size: Math.min(width, height) };
  }

  const contentW = maxX - minX + 1;
  const contentH = maxY - minY + 1;
  return {
    cx: minX + contentW / 2,
    cy: minY + contentH / 2,
    span: Math.max(contentW, contentH),
  };
}

/** Downsample/render source RGBA into a target square canvas using box filtering with premultiplied alpha. */
function renderResizedIcon(src, cropInfo, targetSize, paddingRatio, bgRgb = null) {
  const out = Buffer.alloc(targetSize * targetSize * 4);
  const innerSize = targetSize * (1 - paddingRatio * 2);
  const srcHalf = cropInfo.span / 2;

  for (let dy = 0; dy < targetSize; dy += 1) {
    const sy0 = ((dy - targetSize * paddingRatio) / innerSize) * cropInfo.span + (cropInfo.cy - srcHalf);
    const sy1 = ((dy + 1 - targetSize * paddingRatio) / innerSize) * cropInfo.span + (cropInfo.cy - srcHalf);

    const yStart = Math.max(0, Math.floor(sy0));
    const yEnd = Math.min(src.height, Math.ceil(sy1));

    for (let dx = 0; dx < targetSize; dx += 1) {
      const sx0 = ((dx - targetSize * paddingRatio) / innerSize) * cropInfo.span + (cropInfo.cx - srcHalf);
      const sx1 = ((dx + 1 - targetSize * paddingRatio) / innerSize) * cropInfo.span + (cropInfo.cx - srcHalf);

      const xStart = Math.max(0, Math.floor(sx0));
      const xEnd = Math.min(src.width, Math.ceil(sx1));

      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      let sumA = 0;
      const cellArea = Math.max(1e-9, (sx1 - sx0) * (sy1 - sy0));

      for (let sy = yStart; sy < yEnd; sy += 1) {
        const wy = Math.min(sy + 1, sy1) - Math.max(sy, sy0);
        if (wy <= 0) continue;
        for (let sx = xStart; sx < xEnd; sx += 1) {
          const wx = Math.min(sx + 1, sx1) - Math.max(sx, sx0);
          if (wx <= 0) continue;
          const weight = wx * wy;
          const p = (sy * src.width + sx) * 4;
          const alpha = src.rgba[p + 3] / 255;
          sumR += src.rgba[p] * alpha * weight;
          sumG += src.rgba[p + 1] * alpha * weight;
          sumB += src.rgba[p + 2] * alpha * weight;
          sumA += alpha * weight;
        }
      }

      const normA = Math.min(1, sumA / cellArea);
      let r = normA > 1e-6 ? sumR / sumA : 0;
      let g = normA > 1e-6 ? sumG / sumA : 0;
      let b = normA > 1e-6 ? sumB / sumA : 0;
      let outA = Math.round(normA * 255);

      if (bgRgb) {
        r = r * normA + bgRgb[0] * (1 - normA);
        g = g * normA + bgRgb[1] * (1 - normA);
        b = b * normA + bgRgb[2] * (1 - normA);
        outA = 255;
      }

      const outIdx = (dy * targetSize + dx) * 4;
      out[outIdx] = Math.max(0, Math.min(255, Math.round(r)));
      out[outIdx + 1] = Math.max(0, Math.min(255, Math.round(g)));
      out[outIdx + 2] = Math.max(0, Math.min(255, Math.round(b)));
      out[outIdx + 3] = outA;
    }
  }

  return encodeRgbaPng(targetSize, targetSize, out);
}

/** Package multiple square PNG payloads into a multi-resolution Windows/browser .ico file. */
function buildIcoFromPngs(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type = 1 (icon)
  header.writeUInt16LE(entries.length, 4);

  const dirEntries = [];
  let offset = 6 + entries.length * 16;

  for (const { size, png } of entries) {
    const dir = Buffer.alloc(16);
    dir[0] = size >= 256 ? 0 : size;
    dir[1] = size >= 256 ? 0 : size;
    dir[2] = 0; // palette count
    dir[3] = 0; // reserved
    dir.writeUInt16LE(1, 4); // color planes
    dir.writeUInt16LE(32, 6); // bits per pixel
    dir.writeUInt32LE(png.length, 8);
    dir.writeUInt32LE(offset, 12);
    dirEntries.push(dir);
    offset += png.length;
  }

  return Buffer.concat([header, ...dirEntries, ...entries.map((e) => e.png)]);
}

export function generateBrandAssets({ extensionOnly = false } = {}) {
  const logoPath = join(rootDir, 'public', 'logo.png');
  const src = decodeRgbaPng(readFileSync(logoPath));
  const crop = getContentSquareCrop(src);

  const extIconsDir = join(rootDir, 'extension', 'icons');
  mkdirSync(extIconsDir, { recursive: true });

  for (const size of [16, 48, 128]) {
    const png = renderResizedIcon(src, crop, size, 0.06);
    writeFileSync(join(extIconsDir, `icon${size}.png`), png);
  }

  if (extensionOnly) {
    console.log('[generate-brand-assets] Updated extension/icons/{icon16,icon48,icon128}.png from public/logo.png');
    return;
  }

  const publicIconsDir = join(rootDir, 'public', 'icons');
  mkdirSync(publicIconsDir, { recursive: true });

  writeFileSync(join(rootDir, 'app', 'icon.png'), renderResizedIcon(src, crop, 192, 0.10));
  writeFileSync(
    join(rootDir, 'app', 'apple-icon.png'),
    renderResizedIcon(src, crop, 180, 0.14, [9, 9, 11])
  );
  writeFileSync(join(publicIconsDir, 'icon-192.png'), renderResizedIcon(src, crop, 192, 0.10));
  writeFileSync(join(publicIconsDir, 'icon-512.png'), renderResizedIcon(src, crop, 512, 0.10));

  const icoEntries = [16, 32, 48].map((size) => ({
    size,
    png: renderResizedIcon(src, crop, size, 0.06),
  }));
  writeFileSync(join(rootDir, 'app', 'favicon.ico'), buildIcoFromPngs(icoEntries));

  console.log(
    '[generate-brand-assets] Generated app/icon.png, app/apple-icon.png, app/favicon.ico, public/icons/{icon-192,icon-512}.png, extension/icons/{icon16,icon48,icon128}.png'
  );
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  generateBrandAssets();
}
