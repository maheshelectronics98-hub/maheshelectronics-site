// Generic Shopify storefront adapter.
// Every Shopify store exposes /products.json?limit=N&page=P returning
// product objects with title, handle, vendor, product_type, body_html, and
// an `images` array. We just walk the pages.
//
// Brand adapters that wrap this: lapcare.js. Anyone selling on Shopify can
// reuse: just point entries at the storefront homepage.
'use strict';

async function fetchAllProducts(ctx, storeOrigin, log, maxPages = 6) {
  const all = [];
  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    const url = `${storeOrigin}/products.json?limit=250&page=${pageNum}`;
    let body;
    try {
      const r = await ctx.request.get(url, { timeout: 60000 });
      if (!r.ok()) { log.warn({ url, status: r.status() }, 'Shopify fetch non-OK'); break; }
      body = await r.json();
    } catch (e) {
      log.warn({ url, err: e.message }, 'Shopify fetch failed');
      break;
    }
    const products = (body && body.products) || [];
    log.info({ url, page: pageNum, count: products.length }, 'Shopify page fetched');
    if (!products.length) break;
    all.push(...products);
    if (products.length < 250) break;
  }
  return all;
}

function categoryFromProductType(pt) {
  if (!pt) return null;
  const s = pt.toLowerCase();
  if (/keyboard|mouse|combo/.test(s))      return 'Accessory';
  if (/headphone|earbud|speaker|audio/.test(s)) return 'Audio';
  if (/monitor|display/.test(s))            return 'Monitor';
  if (/laptop|notebook/.test(s))            return 'Laptop';
  if (/cable|adapter|charger|power/.test(s)) return 'Accessory';
  if (/storage|ssd|hdd|drive|memory|ram/.test(s)) return 'Storage';
  if (/printer/.test(s))                    return 'Printer';
  if (/camera/.test(s))                     return 'Camera';
  // fallback: capitalised product_type
  return pt.replace(/\b\w/g, c => c.toUpperCase());
}

async function makeScrape({ brand, storeOrigin, defaultCategory, productTypeFilter }) {
  return async function scrape({ ctx, log }) {
    const products = await fetchAllProducts(ctx, storeOrigin, log);
    const out = [];
    for (const p of products) {
      if (productTypeFilter && !productTypeFilter.test(p.product_type || '')) continue;
      const img = (p.images && p.images[0] && (p.images[0].src || p.images[0].original_src)) || '';
      // Shopify images often start with // (protocol-relative)
      const fullImg = img.startsWith('//') ? `https:${img}` : img;
      out.push({
        oem_id: String(p.id),
        name: p.title,
        model: p.handle,
        description: (p.body_html || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 400),
        category: categoryFromProductType(p.product_type) || defaultCategory,
        specs: {},
        image_urls: fullImg ? [fullImg] : [],
        source_url: `${storeOrigin}/products/${p.handle}`
      });
    }
    log.info({ brand, total: out.length }, 'Shopify scrape complete');
    return out;
  };
}

module.exports = { makeScrape, fetchAllProducts, categoryFromProductType };
