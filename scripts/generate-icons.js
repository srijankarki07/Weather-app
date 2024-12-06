#!/usr/bin/env node
/**
 * Generates the PWA icon set.
 *
 * Chrome's install prompt wants real raster icons at 192 and 512, and there is
 * no image tooling in this project to produce them by hand. So they are drawn
 * here: the same cloud that `ConditionIcon` builds from three circles and a
 * rounded rectangle, over the brand accent, rasterised with 4x supersampling
 * for clean edges.
 *
 * Run with `node scripts/generate-icons.js`. Output goes to `public/`.
 *
 * The PNG encoder is written out rather than pulled from a dependency because
 * it is about forty lines and the alternative is adding a build-time image
 * library to a project that only ever needs to draw this one shape.
 */

const zlib = require("node:zlib");
const fs = require("node:fs");
const path = require("node:path");

/* ------------------------------------------------------------- PNG writer */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

/** Encodes RGBA pixel data as a PNG buffer. */
function encodePng(width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  // Each scanline is prefixed with a filter byte; 0 means "none", which costs
  // a little compression ratio and a lot of clarity.
  const stride = width * 4;
  const rawWithFilters = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    rawWithFilters[y * (stride + 1)] = 0;
    rgba.copy(rawWithFilters, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(rawWithFilters, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ---------------------------------------------------------------- drawing */

const RAUSCH = [0xff, 0x38, 0x5c];
const WHITE = [0xff, 0xff, 0xff];

/** Signed distance from a point to a rounded rectangle, negative inside. */
function roundedRectDistance(px, py, cx, cy, halfW, halfH, radius) {
  const dx = Math.abs(px - cx) - (halfW - radius);
  const dy = Math.abs(py - cy) - (halfH - radius);
  const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
  return outside + Math.min(Math.max(dx, dy), 0) - radius;
}

/**
 * The icon's coverage at a point, in 0–1, as a list of shapes layered in
 * order. Everything is expressed in a 0–1 unit square so the same geometry
 * scales to any output size.
 */
function coverage(u, v, { maskable }) {
  // A maskable icon must keep its content inside the "safe zone" — the middle
  // 80% — because the platform may crop it to a circle or a squircle.
  const inset = maskable ? 0.1 : 0;
  const scale = 1 - inset * 2;
  const x = (u - inset) / scale;
  const y = (v - inset) / scale;

  if (x < -0.05 || x > 1.05 || y < -0.05 || y > 1.05) return null;

  /*
   * Sun, upper right. Placed far enough from every cloud circle that the two
   * do not touch — an earlier version overlapped them and the whole mark read
   * as one shapeless blob rather than a sun behind a cloud.
   */
  if (Math.hypot(x - 0.72, y - 0.29) - 0.13 <= 0) return WHITE;

  // Cloud mass, matching ConditionIcon's three circles plus a base bar.
  const cloudCircles = [
    [0.32, 0.67, 0.145],
    [0.48, 0.59, 0.195],
    [0.65, 0.65, 0.13],
  ];
  for (const [cx, cy, r] of cloudCircles) {
    if (Math.hypot(x - cx, y - cy) - r <= 0) return WHITE;
  }
  // Flat bottom: the union of the circles alone would be scalloped.
  if (roundedRectDistance(x, y, 0.48, 0.71, 0.23, 0.055, 0.05) <= 0) {
    return WHITE;
  }

  return null;
}

/**
 * Rasterises the icon. Each output pixel is sampled 4x4 and averaged, which is
 * what keeps the curves from looking like staircases at 192px.
 */
function render(size, { maskable, radius }) {
  const SS = 4;
  const rgba = Buffer.alloc(size * size * 4);

  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      for (let sy = 0; sy < SS; sy += 1) {
        for (let sx = 0; sx < SS; sx += 1) {
          const u = (px + (sx + 0.5) / SS) / size;
          const v = (py + (sy + 0.5) / SS) / size;

          // Background: a rounded square for the "any" icon, full bleed for
          // maskable, since the platform applies its own mask there.
          const insideBackground = maskable
            ? true
            : roundedRectDistance(u, v, 0.5, 0.5, 0.5, 0.5, radius) <= 0;

          if (!insideBackground) continue;

          const shape = coverage(u, v, { maskable });
          const colour = shape ?? RAUSCH;
          r += colour[0];
          g += colour[1];
          b += colour[2];
          a += 255;
        }
      }

      const samples = SS * SS;
      const offset = (py * size + px) * 4;
      if (a === 0) {
        rgba[offset] = 0;
        rgba[offset + 1] = 0;
        rgba[offset + 2] = 0;
        rgba[offset + 3] = 0;
      } else {
        // Colours are averaged over the samples that actually landed inside
        // the shape, or the transparent corners would darken the edges.
        const covered = a / 255;
        rgba[offset] = Math.round(r / covered);
        rgba[offset + 1] = Math.round(g / covered);
        rgba[offset + 2] = Math.round(b / covered);
        rgba[offset + 3] = Math.round(a / samples);
      }
    }
  }

  return encodePng(size, size, rgba);
}

/* ------------------------------------------------------------------ main */

const targets = [
  { file: "pwa-192x192.png", size: 192, maskable: false, radius: 0.22 },
  { file: "pwa-512x512.png", size: 512, maskable: false, radius: 0.22 },
  { file: "maskable-192x192.png", size: 192, maskable: true, radius: 0.5 },
  { file: "maskable-512x512.png", size: 512, maskable: true, radius: 0.5 },
  { file: "apple-touch-icon.png", size: 180, maskable: false, radius: 0.22 },
];

const outDir = path.join(__dirname, "..", "public");

for (const target of targets) {
  const png = render(target.size, {
    maskable: target.maskable,
    radius: target.radius,
  });
  fs.writeFileSync(path.join(outDir, target.file), png);
  process.stdout.write(
    `${target.file}  ${target.size}x${target.size}  ${png.length} bytes\n`
  );
}

// The favicon is the same mark at a size browsers actually use for tabs.
const favicon = render(64, { maskable: false, radius: 0.22 });
fs.writeFileSync(path.join(outDir, "favicon.ico"), buildIco(favicon, 64));
process.stdout.write("favicon.ico  64x64\n");

/**
 * Wraps a PNG in an ICO container. Every browser that reads .ico today accepts
 * an embedded PNG, which avoids writing a BMP encoder.
 */
function buildIco(png, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // image count

  const entry = Buffer.alloc(16);
  entry[0] = size >= 256 ? 0 : size; // width
  entry[1] = size >= 256 ? 0 : size; // height
  entry[2] = 0; // palette colours
  entry[3] = 0; // reserved
  entry.writeUInt16LE(1, 4); // colour planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(header.length + entry.length, 12);

  return Buffer.concat([header, entry, png]);
}
