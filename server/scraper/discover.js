// One-time-use API discovery: load a URL in Playwright, capture every JSON
// response, save them to server/discovery/<host>/ for inspection.
//   node scraper/discover.js https://www.hp.com/in-en/shop/laptops
'use strict';

const path = require('path');
const fs = require('fs');
const { newContext, closeBrowser } = require('./browser');

async function discover(url) {
  const u = new URL(url);
  const outDir = path.join(__dirname, '..', 'discovery', u.hostname, Date.now().toString());
  fs.mkdirSync(outDir, { recursive: true });

  const ctx = await newContext();
  const page = await ctx.newPage();
  const captured = [];

  page.on('response', async (resp) => {
    try {
      const ct = resp.headers()['content-type'] || '';
      if (!/json/i.test(ct)) return;
      const respUrl = resp.url();
      const status = resp.status();
      let body;
      try { body = await resp.text(); } catch { return; }
      if (!body || body.length < 50) return;
      // skip telemetry / analytics
      if (/google|gtm|adobe|clarity|optimize|analytics|sentry|hotjar|datadog/i.test(respUrl)) return;
      const idx = captured.length;
      const fname = `${String(idx).padStart(3, '0')}-${status}-${respUrl.split('?')[0].split('/').slice(-1)[0].slice(0, 40).replace(/[^A-Za-z0-9.-]/g, '_') || 'response'}.json`;
      fs.writeFileSync(path.join(outDir, fname), `// ${respUrl}\n` + body);
      captured.push({ idx, url: respUrl, size: body.length, status });
    } catch {}
  });

  console.log(`[discover] loading ${url}`);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(3000);
  // try a scroll to trigger lazy-loaded data
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
  await page.waitForTimeout(3000);

  await page.close();
  await ctx.close();
  await closeBrowser();

  // write index
  fs.writeFileSync(path.join(outDir, '_index.json'),
    JSON.stringify(captured.sort((a, b) => b.size - a.size), null, 2));
  console.log(`[discover] captured ${captured.length} JSON responses → ${outDir}`);
  console.log(`[discover] top 10 by size:`);
  for (const c of captured.sort((a, b) => b.size - a.size).slice(0, 10)) {
    console.log(`  ${c.size.toString().padStart(8)}  ${c.status}  ${c.url}`);
  }
}

if (require.main === module) {
  const url = process.argv[2];
  if (!url) { console.log('Usage: node scraper/discover.js <URL>'); process.exit(1); }
  discover(url).catch(e => { console.error(e); process.exit(1); });
}

module.exports = { discover };
