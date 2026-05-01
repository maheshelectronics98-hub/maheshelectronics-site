// SQLite wrapper — schema + prepared statements.
// Run `node db.js --init` to (re)apply schema and seed brands from Brand Website.csv.
'use strict';

const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
require('dotenv').config();

const DB_PATH = path.resolve(__dirname, process.env.DB_PATH || 'mahesh.db');
// Ensure parent dir exists (matters for Docker volume mounted to data/)
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const SITE_ROOT = path.resolve(__dirname, process.env.SITE_ROOT || '..');
const CSV_PATH = path.join(SITE_ROOT, 'Brand Website.csv');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS brands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  homepage TEXT,
  entry_url TEXT,
  adapter TEXT,
  last_scraped_at DATETIME,
  last_status TEXT
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand_id INTEGER NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  category TEXT,
  oem_id TEXT NOT NULL,
  name TEXT NOT NULL,
  model TEXT,
  description TEXT,
  specs_json TEXT,
  primary_image TEXT,
  source_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(brand_id, oem_id)
);
CREATE INDEX IF NOT EXISTS idx_products_brand_status ON products(brand_id, status);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

CREATE TABLE IF NOT EXISTS product_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  source_url TEXT,
  sha256 TEXT,
  sort_order INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_images_product ON product_images(product_id);

CREATE TABLE IF NOT EXISTS scrape_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  finished_at DATETIME,
  brand TEXT,
  products_added INTEGER DEFAULT 0,
  products_updated INTEGER DEFAULT 0,
  products_removed INTEGER DEFAULT 0,
  errors_json TEXT
);
`;

function open() {
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(SCHEMA);
  // helper: simple synchronous transaction wrapper (better-sqlite3 compat)
  if (!db.transaction) {
    db.transaction = (fn) => (...args) => {
      db.exec('BEGIN');
      try { const r = fn(...args); db.exec('COMMIT'); return r; }
      catch (e) { db.exec('ROLLBACK'); throw e; }
    };
  }
  return db;
}

function seedBrandsFromCsv(db) {
  if (!fs.existsSync(CSV_PATH)) {
    console.warn(`[db] Brand Website.csv not found at ${CSV_PATH} — skipping seed.`);
    return 0;
  }
  const { parse } = require('csv-parse/sync');
  const raw = fs.readFileSync(CSV_PATH, 'utf8');
  const rows = parse(raw, { columns: true, skip_empty_lines: true, trim: true });
  const upsert = db.prepare(`
    INSERT INTO brands (name, homepage, adapter)
    VALUES (?, ?, ?)
    ON CONFLICT(name) DO UPDATE SET homepage = excluded.homepage
  `);
  const seen = new Set();
  let count = 0;
  const tx = db.transaction(() => {
    for (const r of rows) {
      const name = (r.BRAND || '').trim();
      const url  = (r['OEM Website'] || '').trim();
      if (!name || seen.has(name)) continue;
      seen.add(name);
      const adapter = name.toLowerCase().replace(/\s+/g, '-');
      upsert.run(name, url, adapter);
      count++;
    }
  });
  tx();
  return count;
}

if (require.main === module) {
  if (process.argv.includes('--init')) {
    const db = open();
    const seeded = seedBrandsFromCsv(db);
    console.log(`[db] Schema applied. Seeded ${seeded} brands.`);
    db.close();
  } else {
    console.log('Usage: node db.js --init');
  }
}

module.exports = { open, seedBrandsFromCsv, DB_PATH, SITE_ROOT };
