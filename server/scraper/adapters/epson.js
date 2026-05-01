// Epson India (epson.co.in) adapter — v2.
// Strategy: server-rendered listing pages under /<line>/c/<code>. Each product
// is a `li.product-item[data-tl_sku=...]` with a thumb anchor + name anchor +
// img.lazyOwl. Image src is already populated (not the placeholder version).
'use strict';

async function scrape({ ctx, entries, log }) {
  const page = await ctx.newPage();
  const all = [];
  const seenSku = new Set();

  for (const entryUrl of entries) {
    log.info({ entryUrl }, 'loading Epson listing');
    try {
      await page.goto(entryUrl, { waitUntil: 'networkidle', timeout: 90000 });
    } catch (e) {
      log.warn({ entryUrl, err: e.message }, 'goto failed');
      continue;
    }
    await page.waitForTimeout(2500);

    const items = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('li.product-item').forEach(card => {
        const sku = card.getAttribute('data-tl_sku')
                 || card.getAttribute('data-sku')
                 || (card.querySelector('[data-sku]')?.getAttribute('data-sku'));
        const nameAnchor = card.querySelector('a.name');
        const name = nameAnchor
          ? (nameAnchor.getAttribute('title') || nameAnchor.textContent.trim())
          : '';
        const thumb = card.querySelector('a.thumb');
        const url = (thumb && thumb.getAttribute('href'))
                 || (nameAnchor && nameAnchor.getAttribute('href'))
                 || '';
        const img = card.querySelector('img.lazyOwl, img');
        const imgSrc = img ? (img.getAttribute('src') || img.getAttribute('data-src') || '') : '';
        if (sku && name) out.push({ sku, name, url, imgSrc });
      });
      return out;
    });

    log.info({ entryUrl, parsed: items.length }, 'Epson page parsed');

    // Derive category from URL path: /<Type>-Printers/c/<code> or /<Type>/c/...
    let cat = null;
    if (/printer/i.test(entryUrl))    cat = 'Printer';
    else if (/projector/i.test(entryUrl)) cat = 'Projector';
    else if (/scanner/i.test(entryUrl))   cat = 'Scanner';

    for (const it of items) {
      if (seenSku.has(it.sku)) continue;
      seenSku.add(it.sku);
      const fullUrl = it.url.startsWith('http') ? it.url : `https://www.epson.co.in${it.url}`;
      const fullImg = !it.imgSrc ? '' :
        (it.imgSrc.startsWith('http') ? it.imgSrc : `https://www.epson.co.in${it.imgSrc}`);
      all.push({
        oem_id: it.sku,
        name: it.name,
        model: it.sku,
        description: '',
        category: cat,
        specs: {},
        image_urls: fullImg ? [fullImg] : [],
        source_url: fullUrl
      });
    }
  }

  await page.close();
  log.info({ total: all.length }, 'Epson scrape complete');
  return all;
}

module.exports = { scrape };
