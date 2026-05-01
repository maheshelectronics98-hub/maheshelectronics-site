// Canon India (in.canon) adapter — v2.
// Strategy: Canon's product search pages are server-rendered HTML — no JSON
// API needed. Each entry URL like
//   https://in.canon/en/consumer/products/search?category=printing&subCategory=inkjet-printers
// renders product cards under selector `.globalSearch__product--card`. Each
// card has the name, detail-page URL, and a thumbnail image hosted on
// in.canon/media/image/... — no referer-locked CDN, downloads cleanly.
'use strict';

async function scrape({ ctx, entries, log }) {
  const page = await ctx.newPage();
  const all = [];
  const seenSlug = new Set();

  for (const entryUrl of entries) {
    log.info({ entryUrl }, 'loading Canon listing');
    try {
      await page.goto(entryUrl, { waitUntil: 'networkidle', timeout: 90000 });
    } catch (e) {
      log.warn({ entryUrl, err: e.message }, 'goto failed');
      continue;
    }
    await page.waitForTimeout(2500);

    const items = await page.evaluate(() => {
      const out = [];
      // .productCard is the actual results-grid card; .globalSearch__product--card
      // is a small "featured" widget that only shows 3 items. Use the former.
      document.querySelectorAll('.productCard').forEach(card => {
        const titleAnchor = card.querySelector('.productCard__title a')
                         || card.querySelector('a.js-productCard-link');
        const name = titleAnchor ? titleAnchor.textContent.trim().replace(/\s+/g, ' ') : '';
        // primary detail-page link is the unlabelled overlay <a> at top of card
        const overlayAnchor = card.querySelector('a.js-productCard-link[aria-label]')
                           || card.querySelector('a[href*="/en/consumer/"]');
        const url = (overlayAnchor && overlayAnchor.getAttribute('href'))
                 || (titleAnchor && titleAnchor.getAttribute('href'))
                 || '';
        const img = card.querySelector('.productCard__thumbnail img, .productCard__thumbnail--image');
        const imgSrc = img ? (img.getAttribute('src') || img.getAttribute('data-src') || '') : '';
        const slugMatch = url.match(/\/en\/consumer\/([^/]+)\//);
        const slug = slugMatch ? slugMatch[1] : '';
        if (slug && name) out.push({ slug, name, url, imgSrc });
      });
      return out;
    });

    log.info({ entryUrl, parsed: items.length }, 'Canon page parsed');

    // Derive category from subCategory query param.
    const m = entryUrl.match(/[?&]subCategory=([^&]+)/);
    let cat = m ? decodeURIComponent(m[1]).replace(/-/g, ' ') : null;
    if (cat) {
      if (/printer|maxify|pixma|selphy/i.test(cat))      cat = 'Printer';
      else if (/scanner/i.test(cat)) cat = 'Scanner';
      else if (/camera|lens/i.test(cat)) cat = 'Camera';
      else if (/projector/i.test(cat)) cat = 'Projector';
      else cat = cat.replace(/\b\w/g, c => c.toUpperCase());
    }

    for (const it of items) {
      if (seenSlug.has(it.slug)) continue;
      seenSlug.add(it.slug);
      const fullUrl = it.url.startsWith('http') ? it.url : `https://in.canon${it.url}`;
      const fullImg = !it.imgSrc ? '' :
        (it.imgSrc.startsWith('http') ? it.imgSrc : `https://in.canon${it.imgSrc}`);
      all.push({
        oem_id: it.slug,
        name: it.name,
        model: it.name,
        description: '',
        category: cat,
        specs: {},
        image_urls: fullImg ? [fullImg] : [],
        source_url: fullUrl
      });
    }
  }

  await page.close();
  log.info({ total: all.length }, 'Canon scrape complete');
  return all;
}

module.exports = { scrape };
