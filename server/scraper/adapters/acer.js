// Acer India store (store.acer.com) adapter — v2.
// Strategy: store.acer.com is Magento — same engine HP shop uses. The listing
// pages render `li.item.product.product-item` cards directly in the initial
// HTML (server-side render). We just parse the DOM after page load.
//
// Cloudflare blocks plain Playwright; the parent browser.js now uses
// playwright-extra + stealth so the request looks like real Chrome.
'use strict';

async function scrapePageOnce(page) {
  return await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('li.product-item, li.product.product-item').forEach(card => {
      const info = card.querySelector('.product-item-info');
      const sku = (info && info.getAttribute('data-eec-product-id'))
               || card.getAttribute('data-eec-product-id')
               || (card.querySelector('[data-product-sku]')?.getAttribute('data-product-sku'))
               || '';
      const linkEl = card.querySelector('a.product-item-photo')
                  || card.querySelector('a.product-item-link');
      const url = linkEl ? linkEl.getAttribute('href') : '';
      const nameEl = card.querySelector('.product-item-name a, .product-item-link, .product-item-name');
      const name = nameEl ? nameEl.textContent.trim().replace(/\s+/g, ' ') : '';
      const img = card.querySelector('img.product-image-photo')
               || card.querySelector('.product-image-photo');
      const imgSrc = img ? (img.getAttribute('data-lazy')
                          || img.getAttribute('data-src')
                          || img.getAttribute('src')
                          || '') : '';
      if (sku && (name || url)) out.push({ sku, name, url, imgSrc });
    });
    return out;
  });
}

async function scrape({ ctx, entries, log }) {
  const page = await ctx.newPage();
  const all = [];
  const seenSku = new Set();

  for (const entryUrl of entries) {
    // Acer locks the page size at 10 and ignores product_list_limit. Walk
    // pages 1..N until we hit a page with no new SKUs (max 6 pages safety).
    let pageItems = [];
    for (let pageNum = 1; pageNum <= 6; pageNum++) {
      const sep = entryUrl.includes('?') ? '&' : '?';
      const url = pageNum === 1 ? entryUrl : `${entryUrl}${sep}p=${pageNum}`;
      log.info({ entryUrl: url, pageNum }, 'loading Acer store listing');
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
      } catch (e) {
        log.warn({ entryUrl: url, err: e.message }, 'goto failed');
        break;
      }
      await page.waitForTimeout(2500);
      const got = await scrapePageOnce(page);
      const newCount = got.filter(it => !pageItems.some(p => p.sku === it.sku)).length;
      log.info({ entryUrl: url, pageNum, parsed: got.length, newOnPage: newCount }, 'Acer page parsed');
      pageItems = pageItems.concat(got);
      if (newCount === 0) break;  // no new products → done
    }
    const items = pageItems;
    log.info({ entryUrl, totalParsed: items.length }, 'Acer entry parsed');

    let cat = null;
    if (/laptop/i.test(entryUrl))   cat = 'Laptop';
    else if (/desktop/i.test(entryUrl) || /aio|all-in-one/i.test(entryUrl)) cat = 'Desktop';
    else if (/monitor/i.test(entryUrl)) cat = 'Monitor';
    else if (/projector/i.test(entryUrl)) cat = 'Projector';
    else if (/accessor/i.test(entryUrl))  cat = 'Accessory';

    for (const it of items) {
      if (seenSku.has(it.sku)) continue;
      seenSku.add(it.sku);
      const fullUrl = it.url && (it.url.startsWith('http') ? it.url : `https://store.acer.com${it.url}`);
      // Strip query params from image URL (Magento serves with sizing params,
      // but the bare URL is also valid and dedupes better).
      const imgClean = it.imgSrc ? it.imgSrc.split('?')[0] : '';
      all.push({
        oem_id: it.sku,
        name: it.name || it.sku,
        model: it.sku,
        description: '',
        category: cat,
        specs: {},
        image_urls: imgClean ? [it.imgSrc] : [],  // pass full URL with params for download
        source_url: fullUrl
      });
    }
  }

  await page.close();
  log.info({ total: all.length }, 'Acer scrape complete');
  return all;
}

module.exports = { scrape };
