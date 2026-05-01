// Generic OpenGraph product-page scraper.
// For brands where products are individual marketing pages (not in a true
// catalog/listing), this adapter:
//   1. Optionally fetches a sitemap.xml and filters URLs by regex
//   2. OR uses a hardcoded list of product URLs
//   3. Visits each, extracts og:title / og:image / og:description
//
// Used by Seqrite, can be reused for any other brand with the same shape.
'use strict';

async function urlsFromSitemap(ctx, sitemapUrl, filterRe, log) {
  const r = await ctx.request.get(sitemapUrl, { timeout: 30000 });
  if (!r.ok()) { log.warn({ sitemapUrl, status: r.status() }, 'sitemap fetch failed'); return []; }
  const xml = await r.text();
  const all = (xml.match(/<loc>([^<]+)<\/loc>/g) || []).map(s => s.slice(5, -6));
  return filterRe ? all.filter(u => filterRe.test(u)) : all;
}

async function scrapeUrls({ ctx, urls, defaultCategory, brandSuffix, log }) {
  const page = await ctx.newPage();
  const all = [];
  for (const url of urls) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForTimeout(500);
      const meta = await page.evaluate(() => ({
        title: document.querySelector('meta[property="og:title"]')?.content
            || document.querySelector('h1')?.textContent?.trim()
            || document.title,
        image: document.querySelector('meta[property="og:image"]')?.content,
        desc:  document.querySelector('meta[property="og:description"]')?.content
            || document.querySelector('meta[name="description"]')?.content,
      }));
      if (!meta.title) { log.warn({ url }, 'no title'); continue; }
      const slug = url.replace(/[#?].*$/, '').replace(/\/$/, '').split('/').pop();
      const re = new RegExp(`\\s*[|\\-—]?\\s*${brandSuffix || ''}.*$`, 'i');
      all.push({
        oem_id: slug,
        name: brandSuffix ? meta.title.replace(re, '').trim() : meta.title.trim(),
        model: slug.toUpperCase(),
        description: (meta.desc || '').trim().slice(0, 400),
        category: defaultCategory,
        specs: {},
        image_urls: meta.image ? [meta.image] : [],
        source_url: url
      });
    } catch (e) {
      log.warn({ url, err: e.message }, 'OG fetch failed');
    }
  }
  await page.close();
  return all;
}

module.exports = { urlsFromSitemap, scrapeUrls };
