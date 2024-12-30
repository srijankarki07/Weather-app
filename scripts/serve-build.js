#!/usr/bin/env node
/**
 * Serves `build/` the way a real host does.
 *
 * `python3 -m http.server` sends no `Content-Encoding` and no `Cache-Control`,
 * which makes a Lighthouse run against it report failures for text compression
 * and cache policy that have nothing to do with the application. This adds both,
 * so `npm run preview` produces an audit that reflects the deployed site.
 *
 * Not a production server: it exists to make local measurements honest.
 */

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const ROOT = process.argv[2] ?? path.join(__dirname, "..", "build");
const PORT = Number(process.argv[3] ?? 8899);

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

function cacheControlFor(url) {
  // Mirrors the rules in vercel.json so a local audit measures the same policy.
  if (url.startsWith("/static/")) return "public, max-age=31536000, immutable";
  if (/\.(png|ico|svg|woff2)$/.test(url)) return "public, max-age=604800";
  return "public, max-age=0, must-revalidate";
}

if (!fs.existsSync(ROOT)) {
  console.error(
    `No build directory at ${ROOT}. Run \`npm run build\` first.`
  );
  process.exit(1);
}

http
  .createServer((request, response) => {
    const url = (request.url ?? "/").split("?")[0];
    let file = path.join(ROOT, url === "/" ? "index.html" : url);

    // Anything that is not a real file falls back to the shell, matching the
    // SPA rewrite in vercel.json.
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      file = path.join(ROOT, "index.html");
    }

    const type =
      CONTENT_TYPES[path.extname(file)] ?? "application/octet-stream";
    const body = fs.readFileSync(file);

    response.setHeader("Content-Type", type);
    response.setHeader("Cache-Control", cacheControlFor(url));
    response.setHeader("X-Content-Type-Options", "nosniff");

    const compressible = /text|javascript|json|svg/.test(type);
    const acceptsGzip = /\bgzip\b/.test(
      request.headers["accept-encoding"] ?? ""
    );

    if (compressible && acceptsGzip && body.length > 1024) {
      response.setHeader("Content-Encoding", "gzip");
      response.setHeader("Vary", "Accept-Encoding");
      response.end(zlib.gzipSync(body, { level: 9 }));
      return;
    }

    response.end(body);
  })
  .listen(PORT, () => {
    console.log(`Serving ${ROOT} at http://localhost:${PORT}`);
  });
