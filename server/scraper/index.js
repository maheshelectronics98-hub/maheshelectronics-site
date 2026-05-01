// Orchestrator. CLI:
//   node scraper/index.js                 → all brands with adapters
//   node scraper/index.js --brand=HP      → only HP
//   node scraper/index.js --list          → show what would run
'use strict';

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { open } = require('../db');
const { newContext, closeBrowser } = require('./browser');
const { downloadImage, slugify } = require('./image-downloader');
const { applyDiff } = require('./differ');
const { makeLogger } = require('./logger');

const ENTRY_POINTS = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'entry-points.json'), 'utf8')
);

function loadAdapter(brandName) {
  const slug = brandName.toLowerCase().replace(/\s+/g, '-');
  const candidates = [slug, slug.replace(/-/g, '')];
  for (const c of candidates) {
    const p = path.join(__dirname, 'adapters', `${c}.js`);
    if (fs.existsSync(p)) return { mod: require(p), slug };
  }
  return { mod: require('./adapters/_stub'), slug };
}

async function runOne(brandName) {
  const log = makeLogger(slugify(brandName));
  const db = open();
  const brandRow = db.prepare(`SELECT * FROM brands WHERE name = ?`).get(brandName);
  if (!brandRow) {
    log.error({ brand: brandName }, 'unknown brand');
    db.close();
    return { error: 'unknown brand' };
  }

  const runId = db.prepare(
    `INSERT INTO scrape_runs (brand) VALUES (?)`
  ).run(brandName).lastInsertRowid;

  const entries = ENTRY_POINTS[brandName] || [];
  if (!entries.length) {
    log.warn({ brand: brandName }, 'no entry URLs in entry-points.json — skipping');
  }

  const ctx = await newContext();
  const { mod: adapter, slug: brandSlug } = loadAdapter(brandName);
  let scraped = [];
  const errors = [];

  try {
    log.info({ brand: brandName, entries }, 'starting adapter');
    scraped = await adapter.scrape({ ctx, entries, brandSlug, log });

    // Download images for each scraped item
    for (const it of scraped) {
      const downloaded = [];
      const urls = (it.image_urls || []).slice(0, 4);
      for (let i = 0; i < urls.length; i++) {
        const r = await downloadImage(ctx.request, brandSlug, it.oem_id, urls[i], i, it.source_url);
        if (r && r.path) downloaded.push(r);
        else if (r && r.error) errors.push({ oem_id: it.oem_id, url: urls[i], err: r.error });
      }
      it.images = downloaded;
    }

    const stats = applyDiff(db, brandRow, scraped, log);
    db.prepare(`
      UPDATE scrape_runs
         SET finished_at=CURRENT_TIMESTAMP,
             products_added=?, products_updated=?, products_removed=?,
             errors_json=?
       WHERE id=?
    `).run(stats.added, stats.updated, stats.removed,
           errors.length ? JSON.stringify(errors) : null, runId);
    db.prepare(`UPDATE brands SET last_scraped_at=CURRENT_TIMESTAMP, last_status=? WHERE id=?`)
      .run(errors.length ? 'partial' : 'ok', brandRow.id);
    log.info({ brand: brandName, ...stats, errors: errors.length }, 'finished');
    return { brand: brandName, ...stats, errors };
  } catch (e) {
    log.error({ brand: brandName, err: e.message, stack: e.stack }, 'adapter crashed');
    db.prepare(`
      UPDATE scrape_runs SET finished_at=CURRENT_TIMESTAMP, errors_json=? WHERE id=?
    `).run(JSON.stringify([{ fatal: e.message }]), runId);
    db.prepare(`UPDATE brands SET last_scraped_at=CURRENT_TIMESTAMP, last_status='failed' WHERE id=?`)
      .run(brandRow.id);
    return { brand: brandName, error: e.message };
  } finally {
    await ctx.close();
    db.close();
  }
}

async function runAll() {
  const db = open();
  const brands = db.prepare(`SELECT name FROM brands ORDER BY name`).all().map(r => r.name);
  db.close();
  const results = [];
  for (const b of brands) {
    if (!ENTRY_POINTS[b]) continue;  // skip brands without an entry URL configured
    results.push(await runOne(b));
  }
  await closeBrowser();
  return results;
}

if (require.main === module) {
  const arg = process.argv.find(a => a.startsWith('--brand='));
  const list = process.argv.includes('--list');
  if (list) {
    const db = open();
    const rows = db.prepare(`SELECT name FROM brands ORDER BY name`).all();
    for (const r of rows) {
      console.log(`${r.name.padEnd(20)} ${ENTRY_POINTS[r.name] ? '✓' : '— no entry URL'}`);
    }
    db.close();
  } else if (arg) {
    runOne(arg.split('=')[1]).then(r => { console.log(r); return closeBrowser(); });
  } else {
    runAll().then(r => console.log(JSON.stringify(r, null, 2)));
  }
}

module.exports = { runOne, runAll };
