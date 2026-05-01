// BenQ India adapter — sitemap-driven.
// Strategy: BenQ's category pages are marketing landing pages with no
// product list. The sitemap.xml lists every product URL. We:
//   1. Fetch /en-in/sitemap.xml
//   2. Filter to product detail URLs (matching `/monitor/<series>/<model>.html`
//      or `/projector/<series>/<model>.html`, excluding /buy /spec /review etc.)
//   3. Visit each, extract og:title + og:image + og:description (BenQ
//      populates OpenGraph well on product pages)
//
// Entry URL is the sitemap; everything else is derived.
'use strict';

async function scrape({ ctx, entries, log }) {
  const all = [];
  const sitemapUrl = entries[0] || 'https://www.benq.com/en-in/sitemap.xml';
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
  // Keep only product detail pages (model URL like /monitor/<series>/<model>.html
  // or /projector/<series>/<model>.html). Exclude landing pages, buy/spec/review/support tabs.
  const productUrls = allUrls.filter(u =>
    /\/en-in\/(monitor|projector)\/[^/]+\/[^/]+\.html$/.test(u) &&
    !/\/(?:buy|spec|review|support|select|where-to-buy|app|knowledge|features|overview|gallery|compare|technology|technologies|service|warranty|software|update|driver|series|landing|pre-order|news|article|story|video|how-to|tutorial|case-study|tip|tutorials|webinar|register|trade-in|sample|download|design|color|customer)\.html$/.test(u)
  );
  log.info({ totalUrls: allUrls.length, productUrls: productUrls.length }, 'BenQ sitemap parsed');

  // Fetch each product page concurrently in batches of 5.
  const page = await ctx.newPage();
  let processed = 0;
  for (const url of productUrls) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(400);
      const meta = await page.evaluate(() => ({
        title: document.querySelector('meta[property="og:title"]')?.content
            || document.querySelector('h1')?.textContent?.trim(),
        image: document.querySelector('meta[property="og:image"]')?.content,
        desc:  document.querySelector('meta[property="og:description"]')?.content,
      }));
      if (!meta.title) continue;
      // Model is the last URL segment without .html, uppercased.
      const model = (url.split('/').pop().replace(/\.html$/, '')).toUpperCase();
      const isProjector = /\/projector\//.test(url);
      const cat = isProjector ? 'Projector' : 'Monitor';
      // Strip Adobe Scene7 sizing so the original ships
      const img = meta.image ? meta.image.split('?')[0] : '';
      all.push({
        oem_id: model,
        name: meta.title.split('|')[0].trim() + (meta.title.includes('|') ? ' — ' + meta.title.split('|')[1].trim() : ''),
        model,
        description: (meta.desc || '').trim(),
        category: cat,
        specs: {},
        image_urls: img ? [img] : [],
        source_url: url
      });
      processed++;
      if (processed % 20 === 0) log.info({ processed, total: productUrls.length }, 'BenQ progress');
    } catch (e) {
      log.warn({ url, err: e.message }, 'BenQ product fetch failed');
    }
  }
  await page.close();
  log.info({ total: all.length }, 'BenQ scrape complete');
  return all;
}

module.exports = { scrape };
