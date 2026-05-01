// Downloads a remote image into images/products/<brand>/<oem_id>-<n>.<ext>.
// Dedupes by SHA-256: if the file content already exists for this product slot,
// the existing path is reused. Uses the Playwright context's request API so cookies
// + UA + Referer match what fetched the product page → bypasses most CDN referer locks.
'use strict';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { SITE_ROOT } = require('../db');

const ROOT = path.join(SITE_ROOT, 'images', 'products');

function slugify(s) {
  return String(s || '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

function extFromUrlOrCT(url, contentType) {
  const m = String(url).split('?')[0].match(/\.(jpe?g|png|webp|gif|avif)$/i);
  if (m) return m[1].toLowerCase().replace('jpeg', 'jpg');
  if (/png/.test(contentType))  return 'png';
  if (/webp/.test(contentType)) return 'webp';
  if (/gif/.test(contentType))  return 'gif';
  if (/avif/.test(contentType)) return 'avif';
  return 'jpg';
}

/**
 * @param {import('playwright').APIRequestContext} request  Playwright request context (carries cookies + UA)
 * @param {string} brandSlug
 * @param {string} oemId
 * @param {string} url
 * @param {number} idx
 * @returns {Promise<{path:string, sha256:string, source_url:string}|null>}
 */
async function downloadImage(request, brandSlug, oemId, url, idx = 0, referer = '') {
  if (!url) return null;
  const dir = path.join(ROOT, brandSlug);
  fs.mkdirSync(dir, { recursive: true });
  let resp;
  try {
    resp = await request.get(url, { headers: referer ? { Referer: referer } : {}, timeout: 30000 });
  } catch (e) {
    return { error: `fetch failed: ${e.message}` };
  }
  if (!resp.ok()) return { error: `HTTP ${resp.status()}` };
  const buf = await resp.body();
  const sha = crypto.createHash('sha256').update(buf).digest('hex');
  const ext = extFromUrlOrCT(url, resp.headers()['content-type'] || '');
  const fname = `${slugify(oemId)}-${idx}.${ext}`;
  const abs = path.join(dir, fname);
  // If a file with the same hash already exists in this dir, reuse it
  for (const existing of fs.readdirSync(dir)) {
    const ep = path.join(dir, existing);
    try {
      const eh = crypto.createHash('sha256').update(fs.readFileSync(ep)).digest('hex');
      if (eh === sha) {
        return { path: path.relative(SITE_ROOT, ep).replace(/\\/g, '/'), sha256: sha, source_url: url };
      }
    } catch {}
  }
  fs.writeFileSync(abs, buf);
  return { path: path.relative(SITE_ROOT, abs).replace(/\\/g, '/'), sha256: sha, source_url: url };
}

module.exports = { downloadImage, slugify };
