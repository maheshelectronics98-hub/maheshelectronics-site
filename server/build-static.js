// Static-site exporter for GitHub Pages.
// Walks the site root, expands {{products}} tags using the live DB, and
// writes everything to ../dist/ ready for `gh-pages` deploy.
//
//   node build-static.js                 → builds to ../dist/
//   node build-static.js --domain=X.in   → also writes CNAME
'use strict';

const path = require('path');
const fs = require('fs');
const { open, SITE_ROOT } = require('./db');
const { renderProducts } = require('./render');

const DIST = path.resolve(__dirname, '..', 'dist');
const TAG_RE = /<!--\s*\{\{\s*products\s+([^}]*?)\s*\}\}\s*-->/g;

function parseAttrs(str) {
  const out = {};
  for (const m of str.matchAll(/(\w+)\s*=\s*"([^"]*)"/g)) out[m[1]] = m[2];
  return out;
}

function copyDir(src, dest, skip = new Set()) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d, skip);
    else fs.copyFileSync(s, d);
  }
}

function build({ domain } = {}) {
  // Wipe dist
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  // Open DB
  const db = open();

  // Process every *.html in site root: expand {{products}} tags.
  // Track which product images get referenced so we only copy those — the
  // DB has 2250+ images but only ~150 land on the rendered pages.
  const usedImages = new Set();
  let pageCount = 0, productCount = 0;
  for (const entry of fs.readdirSync(SITE_ROOT, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
    const src = path.join(SITE_ROOT, entry.name);
    let html = fs.readFileSync(src, 'utf8');
    html = html.replace(TAG_RE, (_, attrsStr) => {
      const attrs = parseAttrs(attrsStr);
      const rendered = renderProducts(db, attrs);
      productCount += (rendered.match(/<div class="p-card"/g) || []).length;
      // Collect /images/products/... refs from THIS rendered block
      for (const m of rendered.matchAll(/src="\/?(images\/products\/[^"]+)"/g)) {
        usedImages.add(m[1]);
      }
      return rendered;
    });
    // Also pull image refs from the static HTML itself (logos, hero shots, hardcoded cards)
    for (const m of html.matchAll(/src="\/?(images\/[^"]+)"/g)) {
      usedImages.add(m[1]);
    }
    fs.writeFileSync(path.join(DIST, entry.name), html);
    pageCount++;
  }

  // Copy ONLY whitelisted asset directories — never copy the site root
  // wholesale because it contains private files (OEM certificates, customer
  // list, WhatsApp media, internal docs).
  // Skip `images` here — handled below via referenced-only copy.
  const PUBLIC_DIRS = ['css', 'js', 'styles', 'scripts', 'blog'];
  for (const dirName of PUBLIC_DIRS) {
    const src = path.join(SITE_ROOT, dirName);
    if (fs.existsSync(src)) copyDir(src, path.join(DIST, dirName));
  }
  // Copy ONLY referenced images. Anything in images/products/ not used by a
  // rendered card is left out — keeps the deploy artifact small.
  let imgCopied = 0, imgMissing = 0;
  for (const rel of usedImages) {
    const src = path.join(SITE_ROOT, rel);
    const dst = path.join(DIST, rel);
    if (!fs.existsSync(src)) { imgMissing++; continue; }
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
    imgCopied++;
  }
  // Also copy non-product images (logos, icons) — small, copy whole dir minus products/
  const imgRoot = path.join(SITE_ROOT, 'images');
  if (fs.existsSync(imgRoot)) {
    for (const e of fs.readdirSync(imgRoot, { withFileTypes: true })) {
      if (e.name === 'products') continue;
      const s = path.join(imgRoot, e.name);
      const d = path.join(DIST, 'images', e.name);
      if (e.isDirectory()) copyDir(s, d);
      else { fs.mkdirSync(path.dirname(d), { recursive: true }); fs.copyFileSync(s, d); }
    }
  }
  console.log(`[build] images: ${imgCopied} copied, ${imgMissing} missing-on-disk`);
  // Whitelisted root files only — favicon, web-safe images, robots.txt, etc.
  // Do NOT copy PDFs, .docx, .xlsx, .DNG, .rar, .mp4, .csv, .db, .enc
  const PUBLIC_ROOT_EXTS = /\.(png|jpe?g|webp|gif|svg|ico|webmanifest|txt|xml|json|woff2?|ttf|otf|eot)$/i;
  const ALLOW_TXT = new Set(['robots.txt', 'sitemap.xml', 'humans.txt', 'security.txt']);
  for (const entry of fs.readdirSync(SITE_ROOT, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (entry.name.endsWith('.html')) continue;
    if (entry.name.startsWith('.')) continue;
    const ok = PUBLIC_ROOT_EXTS.test(entry.name) || ALLOW_TXT.has(entry.name);
    if (!ok) continue;
    // Extra safeguard: never copy WhatsApp / personal-photo style names
    if (/^(WhatsApp|customer|gst|certi|oem|asus certi|epson certi|lenovo certi|optoma certi|msme|iso\.pdf|file\.enc|Visiting|Mahesh_Electronics_Growth)/i.test(entry.name)) continue;
    fs.copyFileSync(path.join(SITE_ROOT, entry.name), path.join(DIST, entry.name));
  }

  // GitHub Pages — disable Jekyll processing, write CNAME if domain given
  fs.writeFileSync(path.join(DIST, '.nojekyll'), '');
  if (domain) {
    fs.writeFileSync(path.join(DIST, 'CNAME'), domain.trim() + '\n');
  }

  db.close();

  console.log(`[build] ${pageCount} HTML pages, ${productCount} product cards rendered`);
  console.log(`[build] dist size: ${dirSize(DIST).toFixed(1)} MB`);
  console.log(`[build] output: ${DIST}`);
  if (domain) console.log(`[build] CNAME: ${domain}`);
}

function dirBytes(dir) {
  let total = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) total += dirBytes(p);
    else total += fs.statSync(p).size;
  }
  return total;
}
function dirSize(dir) { return dirBytes(dir) / (1024 * 1024); }

if (require.main === module) {
  const domainArg = process.argv.find(a => a.startsWith('--domain='));
  build({ domain: domainArg ? domainArg.split('=')[1] : null });
}

module.exports = { build };
