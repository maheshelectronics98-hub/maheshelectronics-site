// Express front: serves the existing static site, but intercepts *.html
// to expand <!--{{products ...}}--> placeholders by querying SQLite.
// Reuses the existing .p-card markup pattern from gaming.html so visual design is preserved.
'use strict';

const path = require('path');
const fs = require('fs');
const express = require('express');
const basicAuth = require('basic-auth');
require('dotenv').config();

const { open, SITE_ROOT } = require('./db');
const { renderProducts } = require('./render');
const scheduler = require('./scheduler');

const PORT = parseInt(process.env.PORT || '3000', 10);
const app = express();
const db = open();

// --- Auth middleware for /admin -----------------------------------
function requireAdmin(req, res, next) {
  const creds = basicAuth(req);
  if (!creds
      || creds.name !== process.env.ADMIN_USER
      || creds.pass !== process.env.ADMIN_PASS) {
    res.set('WWW-Authenticate', 'Basic realm="Mahesh Admin"');
    return res.status(401).send('Auth required');
  }
  next();
}

// --- Admin API + UI -----------------------------------------------
app.use('/admin', requireAdmin);
app.use('/admin', express.json());
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});
app.get('/admin/api/products', (req, res) => {
  const rows = db.prepare(`
    SELECT p.id, b.name AS brand, p.category, p.name, p.model,
           p.status, p.primary_image, p.last_seen_at
    FROM products p JOIN brands b ON b.id = p.brand_id
    ORDER BY b.name, p.category, p.name
  `).all();
  res.json(rows);
});
app.get('/admin/api/runs', (req, res) => {
  const rows = db.prepare(`SELECT * FROM scrape_runs ORDER BY id DESC LIMIT 20`).all();
  res.json(rows);
});
app.get('/admin/api/brands', (req, res) => {
  // Brand health: status + last scrape + active product count.
  const rows = db.prepare(`
    SELECT b.name, b.last_scraped_at, b.last_status,
           (SELECT COUNT(*) FROM products p WHERE p.brand_id = b.id AND p.status = 'active') AS active_count
    FROM brands b
    ORDER BY active_count DESC, b.name
  `).all();
  res.json(rows);
});
app.post('/admin/api/products/:id/status', (req, res) => {
  const { status } = req.body || {};
  if (!['active', 'hidden', 'discontinued'].includes(status)) {
    return res.status(400).json({ error: 'invalid status' });
  }
  db.prepare(`UPDATE products SET status=? WHERE id=?`).run(status, req.params.id);
  res.json({ ok: true });
});
app.post('/admin/api/scrape/:brand', async (req, res) => {
  const { runOne } = require('./scraper');
  res.json({ started: true, brand: req.params.brand });
  // fire-and-forget; admin polls /admin/api/runs
  runOne(req.params.brand).catch(e => console.error('[scrape]', e));
});

// --- HTML middleware: expand {{products}} tags --------------------
const HTML_RE = /\.html?$/i;
const TAG_RE  = /<!--\s*\{\{\s*products\s+([^}]*?)\s*\}\}\s*-->/g;

function parseAttrs(str) {
  const out = {};
  for (const m of str.matchAll(/(\w+)\s*=\s*"([^"]*)"/g)) out[m[1]] = m[2];
  return out;
}

app.get(/.*\.html?$/i, (req, res, next) => {
  const fp = path.join(SITE_ROOT, decodeURIComponent(req.path));
  if (!fp.startsWith(SITE_ROOT) || !fs.existsSync(fp)) return next();
  let html;
  try { html = fs.readFileSync(fp, 'utf8'); } catch { return next(); }
  if (!TAG_RE.test(html)) {
    res.type('html').send(html);
    return;
  }
  TAG_RE.lastIndex = 0;
  const out = html.replace(TAG_RE, (_, attrsStr) => {
    const attrs = parseAttrs(attrsStr);
    return renderProducts(db, attrs);
  });
  res.type('html').send(out);
});

// --- Static files (CSS, JS, images, fonts, anything else) ---------
app.use('/images', express.static(path.join(SITE_ROOT, 'images')));
app.use(express.static(SITE_ROOT, { index: 'index.html', extensions: ['html'] }));

app.listen(PORT, () => {
  console.log(`[server] Mahesh Electronics on http://localhost:${PORT}`);
  console.log(`[server] Site root:  ${SITE_ROOT}`);
  console.log(`[server] Admin:      http://localhost:${PORT}/admin`);
  scheduler.start();
});
