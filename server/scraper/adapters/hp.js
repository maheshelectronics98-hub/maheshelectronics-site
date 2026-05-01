// HP India (hp.com/in-en/shop) adapter — v2.
// Strategy: HP's listing pages (laptops, desktops, printers) all trigger a single
// AJAX call to /shop/hpols_catalog/category/consumeproduct that returns
// {productlist: "<html string of all product cards>"}. We let Playwright load the
// page so HP sets the right category context cookies, then capture that response
// and parse the embedded HTML for SKU + name + image + detail URL.
'use strict';

async function scrape({ ctx, entries, log }) {
  const page = await ctx.newPage();
  const all = [];
  const seenSku = new Set();

  for (const entryUrl of entries) {
    log.info({ entryUrl }, 'loading HP listing');
    let html = '';
    try {
      // Listen for the consumeproduct response BEFORE navigating.
      const respPromise = page.waitForResponse(
        r => r.url().includes('/hpols_catalog/category/consumeproduct'),
        { timeout: 60000 }
      );
      await page.goto(entryUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      const resp = await respPromise;
      const json = await resp.json();
      html = (json && json.productlist) || '';
    } catch (e) {
      log.warn({ entryUrl, err: e.message }, 'consumeproduct capture failed');
      continue;
    }
    if (!html || html.length < 200) {
      log.warn({ entryUrl, htmlLen: html.length }, 'empty productlist');
      continue;
    }

    // Inject the HTML into a hidden element on the page, then query it with
    // browser DOM (avoids adding a separate parser dep).
    const items = await page.evaluate((rawHtml) => {
      const root = document.createElement('div');
      root.style.display = 'none';
      root.innerHTML = rawHtml;
      const out = [];
      root.querySelectorAll('.product-item-info, .product-item').forEach(card => {
        const sku  = card.getAttribute('data-sku')
                  || (card.querySelector('[data-sku]')?.getAttribute('data-sku'))
                  || (card.querySelector('[data-gtm-id]')?.getAttribute('data-gtm-id') || '').replace(/^-?\d+-/, '');
        const link = card.querySelector('a.product-item-link, a.product-item-photo');
        const url  = link ? link.getAttribute('href') : '';
        const nameEl = card.querySelector('.plp-h2-title, .product-item-name, .product.name');
        const name = nameEl ? nameEl.textContent.trim().replace(/\s+/g, ' ') : '';
        // Sequential fallback — querySelector with a selector LIST returns
        // first match in document order, not first matching selector. The
        // swatch <img> appears before product-image-photo in card markup,
        // so a list selector grabs the wrong one.
        const img = card.querySelector('img.product-image-photo')
                 || card.querySelector('.product-image img')
                 || card.querySelector('a.product-item-photo img');
        const imgSrc = img ? (img.getAttribute('src') || img.getAttribute('data-src')) : '';
        const dataCat = card.getAttribute('data-category') || '';
        const categorySegment = dataCat.split('/')[1] || ''; // "laptops"
        if (sku && name) out.push({ sku, name, url, imgSrc, categorySegment });
      });
      return out;
    }, html);

    log.info({ entryUrl, parsed: items.length }, 'productlist parsed');

    // Derive category from the entry URL since data-category sometimes empty.
    // Order matters: check 'printer' before generic /shop/<seg> match because
    // printer URLs are /shop/printers/<line>/<model>.html (multiple segments).
    let cat = null;
    if (/\/printers?\//i.test(entryUrl) || /\/printers?\.html|\/shop\/printers/i.test(entryUrl)) {
      cat = 'Printer';
    } else {
      const m = entryUrl.match(/\/shop\/([^/?#]+)/);
      cat = m ? m[1].replace(/-/g, ' ').replace(/s$/, '').replace(/\b\w/g, c => c.toUpperCase()) : null;
    }

    for (const it of items) {
      if (seenSku.has(it.sku)) continue;
      seenSku.add(it.sku);
      all.push({
        oem_id: it.sku,
        name: it.name,
        model: it.sku,
        description: '',
        category: cat,
        specs: {},
        image_urls: it.imgSrc ? [it.imgSrc] : [],
        source_url: it.url
      });
    }
  }

  await page.close();
  log.info({ total: all.length }, 'HP scrape complete');
  return all;
}

module.exports = { scrape };
