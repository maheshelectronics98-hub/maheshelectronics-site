// Brother India adapter — sitemap-driven.
// Strategy: sitemap-product.xml lists every product page. Each detail page
// has og:title + og:description but NO og:image, so we pick the first
// product image (≥200px) from the DOM after page load.
'use strict';

async function scrape({ ctx, entries, log }) {
  const sitemapUrl = entries[0] || 'https://www.brother.in/sitemap-product.xml';
  let xml;
  try {
    const r = await ctx.request.get(sitemapUrl, { timeout: 60000 });
    if (!r.ok()) { log.warn({ sitemapUrl, status: r.status() }, 'sitemap fetch failed'); return []; }
    xml = await r.text();
  } catch (e) {
    log.warn({ sitemapUrl, err: e.message }, 'sitemap fetch error');
    return [];
  }

  const allUrls = (xml.match(/<loc>([^<]+)<\/loc>/g) || []).map(s => s.slice(5, -6));
  // Keep only product detail pages: /en/<category>/all-<category>/<model>
  // Reject /compare and category landing pages.
  const productUrls = allUrls.filter(u =>
    /\/en\/(printers|scanners|fax-machines|labellers)\/all-(?:printers|scanners|fax-machines|labellers)\/[^/]+$/.test(u) &&
    !/\/compare$/.test(u)
  );
  log.info({ totalUrls: allUrls.length, productUrls: productUrls.length }, 'Brother sitemap parsed');

  const page = await ctx.newPage();
  const all = [];
  let processed = 0;
  for (const url of productUrls) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1500);
      const data = await page.evaluate(() => {
        const meta = {
          title: document.querySelector('meta[property="og:title"]')?.content
              || document.querySelector('h1')?.textContent?.trim()
              || document.title,
          desc:  document.querySelector('meta[property="og:description"]')?.content
              || document.querySelector('meta[name="description"]')?.content,
        };
        // Brother has no og:image — find largest product image (≥200px wide,
        // skip nav/icon SVGs and logos).
        const imgs = Array.from(document.querySelectorAll('img'))
          .map(i => ({ src: i.currentSrc || i.src, w: i.naturalWidth }))
          .filter(i => i.src && i.w >= 200 && !/logo|icon|sprite/i.test(i.src));
        return { ...meta, image: imgs[0]?.src || '' };
      });
      if (!data.title) continue;
      const slug = url.split('/').pop().toUpperCase();
      const isPrinter = /\/printers\//i.test(url);
      const isScanner = /\/scanners\//i.test(url);
      const isFax     = /\/fax-machines\//i.test(url);
      const isLabel   = /\/labellers\//i.test(url);
      const cat = isPrinter ? 'Printer'
                : isScanner ? 'Scanner'
                : isFax     ? 'Fax Machine'
                : isLabel   ? 'Labeller'
                            : null;
      all.push({
        oem_id: slug,
        name: data.title.replace(/\s*\|\s*Brother.*$/i, '').trim(),
        model: slug,
        description: (data.desc || '').trim().slice(0, 400),
        category: cat,
        specs: {},
        image_urls: data.image ? [data.image] : [],
        source_url: url
      });
      processed++;
      if (processed % 10 === 0) log.info({ processed, total: productUrls.length }, 'Brother progress');
    } catch (e) {
      log.warn({ url, err: e.message }, 'Brother product fetch failed');
    }
  }
  await page.close();
  log.info({ total: all.length }, 'Brother scrape complete');
  return all;
}

module.exports = { scrape };
