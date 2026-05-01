// Shared listing-then-detail crawler. Used by Epson, Acer, LG, Hikvision adapters.
// Brand-specific overrides (selectors etc) live in the wrapper files.
'use strict';

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise(resolve => {
      let total = 0;
      const t = setInterval(() => {
        window.scrollBy(0, 600); total += 600;
        if (total >= document.body.scrollHeight - window.innerHeight) { clearInterval(t); resolve(); }
      }, 200);
    });
  });
}

async function scrape({ ctx, entries, log, brand, linkPattern, categoryHint }) {
  const page = await ctx.newPage();
  const all = [];

  for (const entryUrl of entries) {
    try {
      await page.goto(entryUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(1500);
      await autoScroll(page);
      await page.waitForTimeout(1500);
    } catch (e) { log.warn({ entryUrl, err: e.message }, 'listing failed'); continue; }

    const links = await page.$$eval('a', as => as.map(a => a.href));
    const unique = Array.from(new Set(links)).filter(u => linkPattern.test(u)).slice(0, 30);
    log.info({ brand, entryUrl, count: unique.length }, 'listing collected');

    for (const url of unique) {
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      } catch (e) { continue; }
      const d = await page.evaluate(() => {
        const t = s => { const e = document.querySelector(s); return e ? e.textContent.trim().replace(/\s+/g,' ') : ''; };
        const meta = n => { const e = document.querySelector(`meta[property="${n}"], meta[name="${n}"]`); return e ? e.getAttribute('content') : ''; };
        const specs = {};
        document.querySelectorAll('table tr').forEach(r => {
          const k = r.querySelector('th, td:first-child'), v = r.querySelector('td:last-child');
          if (k && v && k !== v) {
            const key = k.textContent.trim(), val = v.textContent.trim().replace(/\s+/g, ' ');
            if (key && val && key.length < 60) specs[key] = val;
          }
        });
        const imgs = new Set();
        const og = meta('og:image'); if (og) imgs.add(og);
        document.querySelectorAll('picture img, img.product-image, .product-gallery img').forEach(img => {
          const s = img.getAttribute('src') || img.getAttribute('data-src');
          if (s && /^https?:/.test(s) && !/icon|logo|sprite/i.test(s)) imgs.add(s);
        });
        return {
          name: t('h1') || meta('og:title'),
          description: t('.product-description, .description, [itemprop="description"]')
                    || meta('og:description') || meta('description'),
          specs,
          image_urls: Array.from(imgs).slice(0, 4)
        };
      });
      if (!d || !d.name) continue;
      const oem_id = (url.split('/').filter(Boolean).pop() || '').replace(/[^A-Za-z0-9-]/g, '').slice(0, 60);
      if (!oem_id) continue;
      all.push({
        oem_id, name: d.name, model: null,
        description: d.description, category: categoryHint,
        specs: d.specs, image_urls: d.image_urls, source_url: url
      });
    }
  }

  await page.close();
  log.info({ brand, total: all.length }, 'scrape complete');
  return all;
}

module.exports = { scrape };
