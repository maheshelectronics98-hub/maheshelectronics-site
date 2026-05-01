// Reads a discovery folder, ranks JSON responses by likelihood of being a product list.
//   node scraper/analyze-discovery.js server/discovery/www.hp.com/<timestamp>
'use strict';

const path = require('path');
const fs = require('fs');

function score(text) {
  let s = 0;
  const lc = text.toLowerCase();
  // signals that this is a product list
  if (/"sku"|"productid"|"product_id"|"modelnumber"|"model_number"/.test(lc)) s += 10;
  if (/"name"|"title"|"productname"/.test(lc)) s += 3;
  if (/"image"|"thumbnail"|"imageurl"|"image_url"|"picture"/.test(lc)) s += 5;
  if (/"price"|"listprice"|"current_price"/.test(lc)) s += 3;
  if (/"description"|"shortdescription"/.test(lc)) s += 2;
  if (/"hits"|"products":\s*\[|"items":\s*\[|"results":\s*\[/.test(lc)) s += 8;
  // negative: tracking / config / nav
  if (/"trackingid"|"sessionid"|"correlationid"|"messages"|"errors"/.test(lc) && !/"products"/.test(lc)) s -= 5;
  if (/"locale"|"currency"|"languages"/.test(lc) && text.length < 5000) s -= 3;
  return s;
}

function summarize(text) {
  // try to find first 3 keys at top level
  try {
    const o = JSON.parse(text.replace(/^\/\/.*\n/, ''));
    if (Array.isArray(o)) return `array[${o.length}]`;
    if (o && typeof o === 'object') {
      const keys = Object.keys(o).slice(0, 8);
      return `obj{${keys.join(', ')}}`;
    }
    return typeof o;
  } catch { return 'unparseable'; }
}

const dir = process.argv[2];
if (!dir || !fs.existsSync(dir)) { console.log('Usage: node scraper/analyze-discovery.js <discovery-dir>'); process.exit(1); }

const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') && f !== '_index.json');
const ranked = files.map(f => {
  const p = path.join(dir, f);
  const text = fs.readFileSync(p, 'utf8');
  const urlMatch = text.match(/^\/\/\s*(.*)$/m);
  return {
    file: f,
    size: text.length,
    score: score(text),
    summary: summarize(text),
    url: urlMatch ? urlMatch[1] : '?'
  };
}).sort((a, b) => b.score - a.score);

console.log(`\n  SCORE  SIZE      SUMMARY                              URL\n  -----  --------  -----------------------------------  ------------------------`);
for (const r of ranked.slice(0, 15)) {
  console.log(`  ${String(r.score).padStart(5)}  ${String(r.size).padStart(8)}  ${r.summary.padEnd(36).slice(0, 36)} ${r.url.slice(0, 100)}`);
}
console.log(`\nTop file: ${path.join(dir, ranked[0].file)}`);
