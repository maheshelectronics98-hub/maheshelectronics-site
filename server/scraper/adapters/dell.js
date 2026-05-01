// Dell India store (dellstore.com) adapter.
// Strategy: dellstore.com is Magento — same as Acer/HP shop. www.dell.com/en-in
// redirects through to dellstore.com for actual e-commerce. Cards have
// `li.product-item` with image inside `.product-slider`. SKU isn't on the
// card as a clean attribute, so we derive it from the product URL slug
// (e.g. .../alienware-16-aurora-gaming-laptop-oan1625000701mino.html).
//
// Cloudflare-protected — uses the stealth-enabled browser context.
'use strict';

async function scrapePageOnce(page) {
  return await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('li.product-item').forEach(card => {
      const linkEl = card.querySelector('a.product-item-link')
                  || card.querySelector('.product-item-name a')
                  || card.querySelector('a[href$=".html"]');
      const url = linkEl ? linkEl.getAttribute('href') : '';
      // SKU = last URL segment without .html (Magento URL key)
      const sku = url ? url.replace(/[#?].*$/, '').split('/').pop().replace(/\.html$/, '') : '';
      // querySelector with a list returns DOM-order first match, not
      // selector-order — `.product-item-link` (empty image anchor) wins over
      // `.product-item-name`. Sequential lookups instead.
      const nameEl = card.querySelector('strong.product-item-name a')
                  || card.querySelector('.product-item-name a')
                  || card.querySelector('strong.product-item-name')
                  || card.querySelector('.product-item-name');
      const name = nameEl ? nameEl.textContent.trim().replace(/\s+/g, ' ') : '';
      const img = card.querySelector('.product-slider img, img.product-image-photo, .product-item-photo img, img');
      const imgSrc = img ? (img.getAttribute('src')
                          || img.getAttribute('data-src')
                          || img.getAttribute('data-lazy')
                          || '') : '';
      if (sku && name) out.push({ sku, name, url, imgSrc });
    });
    return out;
  });
}

async function scrape({ ctx, entries, log }) {
  const page = await ctx.newPage();
  const all = [];
  const seenSku = new Set();

  for (const entryUrl of entries) {
    let pageItems = [];
    for (let pageNum = 1; pageNum <= 8; pageNum++) {
      const sep = entryUrl.includes('?') ? '&' : '?';
      const url = pageNum === 1 ? entryUrl : `${entryUrl}${sep}p=${pageNum}`;
      log.info({ entryUrl: url, pageNum }, 'loading Dell store listing');
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
      } catch (e) {
        log.warn({ entryUrl: url, err: e.message }, 'goto failed');
        break;
      }
      await page.waitForTimeout(2500);
      const got = await scrapePageOnce(page);
      const newCount = got.filter(it => !pageItems.some(p => p.sku === it.sku)).length;
      log.info({ pageNum, parsed: got.length, newOnPage: newCount }, 'Dell page parsed');
      pageItems = pageItems.concat(got);
      if (newCount === 0 || got.length < 5) break;
    }

    let cat = null;
    if (/laptop/i.test(entryUrl))   cat = 'Laptop';
    else if (/desktop/i.test(entryUrl)) cat = 'Desktop';
    else if (/monitor/i.test(entryUrl)) cat = 'Monitor';
    else if (/keyboard|mice|mouse|accessor/i.test(entryUrl)) cat = 'Accessory';
    else if (/headset|audio|webcam/i.test(entryUrl))         cat = 'Accessory';

    for (const it of pageItems) {
      if (seenSku.has(it.sku)) continue;
      seenSku.add(it.sku);
      const fullUrl = it.url && (it.url.startsWith('http') ? it.url : `https://www.dellstore.com${it.url}`);
      all.push({
        oem_id: it.sku,
        name: it.name,
        model: it.sku,
        description: '',
        category: cat,
        specs: {},
        image_urls: it.imgSrc ? [it.imgSrc] : [],
        source_url: fullUrl
      });
    }
  }

  await page.close();
  log.info({ total: all.length }, 'Dell scrape complete');
  return all;
}

module.exports = { scrape };
