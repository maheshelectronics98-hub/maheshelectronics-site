/**
 * Mahesh Electronics — OEM product scraper
 *
 * Reads `Brand Website.csv`, fetches each OEM's listing/product pages, extracts
 * product name + image + indicative MRP, and writes a merged catalog JSON to
 * `data/products.json`.  catalog.html and shop.html can render this on top of
 * the static brand list when the file is present.
 *
 * USAGE:
 *   npm install                      # one-time, installs node-fetch + cheerio
 *   node scripts/scrape.js           # scrape everything
 *   node scripts/scrape.js epson hp  # scrape only specified brands
 *
 * SCHEDULE (Windows Task Scheduler — run daily at 6am):
 *   schtasks /create /tn "Mahesh OEM Scrape" /tr "node \"D:\\Mahesh Electroncis\\scripts\\scrape.js\"" /sc daily /st 06:00
 *
 * NOTE ON LEGALITY:
 *   You're scraping public OEM marketing pages for product names + image URLs to
 *   display on YOUR authorized-dealer site. That's almost universally fine —
 *   you're not republishing copyrighted content beyond what affiliate banners
 *   already do. But:
 *     - Respect robots.txt (this script does)
 *     - Throttle requests (1 sec delay between pages built in)
 *     - Cache aggressively — only re-fetch if the OEM's listing page hash changed
 *     - Don't hot-link images to OEM CDN in production; mirror to your /images/ dir
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import fetch from 'node-fetch';        // npm i node-fetch@3
import * as cheerio from 'cheerio';     // npm i cheerio

const CSV_PATH = path.resolve('Brand Website.csv');
const OUT_PATH = path.resolve('data/products.json');
const UA = 'Mozilla/5.0 (compatible; MaheshElectronicsBot/1.0; +https://maheshelectronics.in/bot)';
const REQUEST_DELAY_MS = 1500;
const MAX_PRODUCTS_PER_HANDLER = 12;

/* -------------------------------------------------------------------------- */
/* Per-OEM handlers                                                            */
/* -------------------------------------------------------------------------- */
/* Each handler returns Array<{name, image, price?, url, sku?}>.               */
/* When OEMs change their HTML you only edit the handler for that brand.       */
/* -------------------------------------------------------------------------- */

const handlers = {
  'epson.com': async (category) => {
    const map = {
      'MULTIMEDIA PROJECTORS': 'https://www.epson.co.in/Projectors',
      'MULTIFUNCTION MACHINE': 'https://www.epson.co.in/All-in-One-Printers',
      'COMPUTER PRINTER':      'https://www.epson.co.in/InkTank-Printers',
      'SCANNER':               'https://www.epson.co.in/Scanners',
      'INTERACTIVE PANEL':     'https://www.epson.co.in/Interactive-Display',
      'BARCODE PRINTER':       'https://www.epson.co.in/Label-Printers',
    };
    const listingUrl = map[category]; if (!listingUrl) return [];
    const html = await get(listingUrl);
    const $ = cheerio.load(html);
    const out = [];
    $('div.product-tile, li.product, article.product').slice(0, MAX_PRODUCTS_PER_HANDLER).each((_, el) => {
      const $el = $(el);
      const name = $el.find('h2, h3, .product-name, [itemprop=name]').first().text().trim();
      const image = absUrl(listingUrl, $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src'));
      const url = absUrl(listingUrl, $el.find('a').first().attr('href'));
      if (name && image) out.push({ name, image, url });
    });
    return out;
  },

  'hp.com': async (category) => {
    const map = {
      'LAPTOP':              'https://www.hp.com/in-en/shop/laptops.html',
      'DESKTOP':             'https://www.hp.com/in-en/shop/desktops.html',
      'WORKSTATION':         'https://www.hp.com/in-en/shop/workstations.html',
      'ALL IN ONE':          'https://www.hp.com/in-en/shop/all-in-ones.html',
      'COMPUTER WORKSTATION':'https://www.hp.com/in-en/shop/workstations.html',
      'LAPTOP WORKSTATION':  'https://www.hp.com/in-en/shop/mobile-workstations.html',
      'COMPUTER PRINTER':    'https://www.hp.com/in-en/shop/printers.html',
      'MULTIFUNCTION MACHINE':'https://www.hp.com/in-en/shop/all-in-one-printers.html',
      'SCANNER':             'https://www.hp.com/in-en/shop/scanners.html',
      'COMPUTER MONITOR':    'https://www.hp.com/in-en/shop/monitors.html',
      'KEYBOARD MOUSE':      'https://www.hp.com/in-en/shop/accessories/keyboards-mice.html',
      'SERVER':              'https://www.hpe.com/in/en/servers.html',
    };
    const listingUrl = map[category]; if (!listingUrl) return [];
    const html = await get(listingUrl);
    const $ = cheerio.load(html);
    const out = [];
    $('article.product-card, .productItem, [data-product-id]').slice(0, MAX_PRODUCTS_PER_HANDLER).each((_, el) => {
      const $el = $(el);
      const name = $el.find('.productName, .product-title, h3').first().text().trim();
      const image = absUrl(listingUrl, $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src'));
      const price = parsePrice($el.find('.price, .productPrice').first().text());
      const url = absUrl(listingUrl, $el.find('a').first().attr('href'));
      if (name) out.push({ name, image, price, url });
    });
    return out;
  },

  'global.canon': async (category) => {
    const map = {
      'COMPUTER PRINTER':      'https://in.canon/en/consumer/web/category-inkjet-printers',
      'MULTIFUNCTION MACHINE': 'https://in.canon/en/consumer/web/category-inkjet-multifunction-printers',
      'SCANNER':               'https://in.canon/en/consumer/web/category-document-scanners',
      'A3 SIZE XEROX MACHINE': 'https://in.canon/en/business/web/category-multifunction-devices',
      'OEM/COMPATIBLE CARTRIDGES':'https://in.canon/en/consumer/web/category-genuine-supplies',
    };
    const listingUrl = map[category]; if (!listingUrl) return [];
    const html = await get(listingUrl);
    const $ = cheerio.load(html);
    const out = [];
    $('.product-tile, .product-card, .listing-item').slice(0, MAX_PRODUCTS_PER_HANDLER).each((_, el) => {
      const $el = $(el);
      const name = $el.find('.product-name, h3, h4').first().text().trim();
      const image = absUrl(listingUrl, $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src'));
      const url = absUrl(listingUrl, $el.find('a').first().attr('href'));
      if (name) out.push({ name, image, url });
    });
    return out;
  },

  'acer.com': async (category) => {
    const map = {
      'LAPTOP':              'https://store.acer.com/en-in/laptops',
      'DESKTOP':             'https://store.acer.com/en-in/desktops',
      'ALL IN ONE':          'https://store.acer.com/en-in/desktops/all-in-one',
      'COMPUTER MONITOR':    'https://store.acer.com/en-in/monitors',
      'WORKSTATION':         'https://store.acer.com/en-in/workstations',
      'SERVER':              'https://www.acer.com/in-en/servers',
      'TV':                  'https://www.acer.com/in-en/tv',
      'AIR CONDITIONER':     'https://www.acer.com/in-en/air-conditioners',
    };
    const listingUrl = map[category]; if (!listingUrl) return [];
    const html = await get(listingUrl);
    const $ = cheerio.load(html);
    const out = [];
    $('.product-item, .product-card, [data-product-sku]').slice(0, MAX_PRODUCTS_PER_HANDLER).each((_, el) => {
      const $el = $(el);
      const name = $el.find('.product-item-link, .product-name, h3').first().text().trim();
      const image = absUrl(listingUrl, $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src'));
      const price = parsePrice($el.find('.price, .product-price').first().text());
      const url = absUrl(listingUrl, $el.find('a').first().attr('href'));
      if (name) out.push({ name, image, price, url });
    });
    return out;
  },

  'lg.com': async (category) => {
    const map = {
      'TV':              'https://www.lg.com/in/tvs',
      'AIR CONDITIONER': 'https://www.lg.com/in/air-conditioners',
      'REFRIGERATOR':    'https://www.lg.com/in/refrigerators',
      'WASHING MACHINE': 'https://www.lg.com/in/washing-machines',
    };
    const listingUrl = map[category]; if (!listingUrl) return [];
    const html = await get(listingUrl);
    const $ = cheerio.load(html);
    const out = [];
    $('.lg-product, .product-item, [data-model-id]').slice(0, MAX_PRODUCTS_PER_HANDLER).each((_, el) => {
      const $el = $(el);
      const name = $el.find('.product-name, h3').first().text().trim();
      const image = absUrl(listingUrl, $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src'));
      const url = absUrl(listingUrl, $el.find('a').first().attr('href'));
      if (name) out.push({ name, image, url });
    });
    return out;
  },

  'viewsonic.com': async (category) => {
    const map = {
      'MULTIMEDIA PROJECTORS': 'https://www.viewsonic.com/in/products/projectors/',
      'INTERACTIVE PANEL':     'https://www.viewsonic.com/in/products/displays/interactive-flat-panels.php',
    };
    const listingUrl = map[category]; if (!listingUrl) return [];
    const html = await get(listingUrl);
    const $ = cheerio.load(html);
    const out = [];
    $('.product-list-item, .productCard, article.product').slice(0, MAX_PRODUCTS_PER_HANDLER).each((_, el) => {
      const $el = $(el);
      const name = $el.find('h3, h4, .product-name').first().text().trim();
      const image = absUrl(listingUrl, $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src'));
      const url = absUrl(listingUrl, $el.find('a').first().attr('href'));
      if (name) out.push({ name, image, url });
    });
    return out;
  },

  'benq.com': async (category) => {
    const map = { 'MULTIMEDIA PROJECTORS': 'https://www.benq.com/en-in/projector.html' };
    const listingUrl = map[category]; if (!listingUrl) return [];
    return await genericListing(listingUrl);
  },

  'vertiv.com': async (category) => {
    const map = {
      'LINE INTERACTIVE UPS': 'https://www.vertiv.com/en-in/products-catalog/critical-power/uninterruptible-power-supplies-ups/',
      'ONLINE UPS':           'https://www.vertiv.com/en-in/products-catalog/critical-power/uninterruptible-power-supplies-ups/',
    };
    const listingUrl = map[category]; if (!listingUrl) return [];
    return await genericListing(listingUrl);
  },

  'dell.com': async (category) => {
    const map = { 'KEYBOARD MOUSE': 'https://www.dell.com/en-in/shop/dell-accessories/sf/keyboard-mice' };
    const listingUrl = map[category]; if (!listingUrl) return [];
    return await genericListing(listingUrl);
  },

  'quickheal.com': async (category) => {
    const map = { 'ANTIVIRUS & END POINT PROTECTION': 'https://www.quickheal.co.in/' };
    const listingUrl = map[category]; if (!listingUrl) return [];
    return await genericListing(listingUrl);
  },

  // Fallback for sites we haven't custom-tuned yet
  '*': async (category, url) => genericListing(url),
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

async function get(url) {
  const robots = await checkRobots(url);
  if (!robots) { console.warn('  ⚠ blocked by robots.txt:', url); return ''; }
  await sleep(REQUEST_DELAY_MS);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'text/html' }, redirect: 'follow', timeout: 20000 });
    if (!res.ok) { console.warn(`  ⚠ ${res.status} for ${url}`); return ''; }
    return await res.text();
  } catch (e) {
    console.warn('  ⚠ fetch failed:', url, e.message);
    return '';
  }
}

const robotsCache = new Map();
async function checkRobots(url) {
  const u = new URL(url);
  if (robotsCache.has(u.host)) return robotsCache.get(u.host);
  try {
    const txt = await (await fetch(`${u.origin}/robots.txt`, { headers: { 'User-Agent': UA }, timeout: 10000 })).text();
    const blocked = /User-agent:\s*\*[\s\S]*?Disallow:\s*\/\s*$/im.test(txt);
    robotsCache.set(u.host, !blocked);
    return !blocked;
  } catch { robotsCache.set(u.host, true); return true; }
}

function absUrl(base, href) { if (!href) return null; try { return new URL(href, base).toString(); } catch { return null; } }
function parsePrice(s) { if (!s) return null; const m = s.replace(/,/g, '').match(/([\d.]+)/); return m ? Number(m[1]) : null; }

async function genericListing(url) {
  const html = await get(url); if (!html) return [];
  const $ = cheerio.load(html);
  const out = [];
  $('article, [class*=product], [class*=Product]').slice(0, MAX_PRODUCTS_PER_HANDLER).each((_, el) => {
    const $el = $(el);
    const img = $el.find('img').first();
    const a = $el.find('a').first();
    const name = ($el.find('h2,h3,h4').first().text() || img.attr('alt') || '').trim();
    const image = absUrl(url, img.attr('src') || img.attr('data-src'));
    const link = absUrl(url, a.attr('href'));
    if (name && image) out.push({ name, image, url: link });
  });
  return out;
}

function pickHandler(websiteUrl) {
  const host = new URL(websiteUrl).host.replace(/^www\./, '');
  for (const key of Object.keys(handlers)) if (host.includes(key)) return handlers[key];
  return handlers['*'];
}

/* -------------------------------------------------------------------------- */
/* Main                                                                       */
/* -------------------------------------------------------------------------- */

async function main() {
  const filterBrands = process.argv.slice(2).map(s => s.toLowerCase());
  const csv = await fs.readFile(CSV_PATH, 'utf8');
  const rows = csv.trim().split(/\r?\n/).slice(1).map(line => {
    const [category, brand, url] = line.split(',');
    return { category: category?.trim(), brand: brand?.trim(), url: url?.trim() };
  }).filter(r => r.category && r.brand && r.url);

  const out = {}; // out[categorySlug] = [...products]
  let totalProducts = 0, totalRequests = 0;

  for (const row of rows) {
    if (filterBrands.length && !filterBrands.includes(row.brand.toLowerCase())) continue;
    const handler = pickHandler(row.url);
    const slug = row.category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    console.log(`→ ${row.category} / ${row.brand}  (${row.url})`);
    totalRequests++;
    try {
      const products = await handler(row.category, row.url);
      const tagged = products.map(p => ({ ...p, brand: row.brand, category: row.category, scrapedAt: new Date().toISOString() }));
      out[slug] = (out[slug] || []).concat(tagged);
      totalProducts += tagged.length;
      console.log(`   ✓ ${tagged.length} products`);
    } catch (e) {
      console.error(`   ✗ ${e.message}`);
    }
  }

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), totalProducts, byCategory: out }, null, 2));
  console.log(`\n✓ Wrote ${totalProducts} products across ${Object.keys(out).length} categories to ${OUT_PATH}`);
  console.log(`  ${totalRequests} OEM requests in this run`);
}

main().catch(err => { console.error(err); process.exit(1); });
