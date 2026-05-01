// Seqrite (Quick Heal's enterprise brand) adapter.
// Strategy: pull product URLs from /product-sitemap.xml, then OpenGraph each.
'use strict';
const { urlsFromSitemap, scrapeUrls } = require('./_og-page');

async function scrape({ ctx, entries, log }) {
  const sitemapUrl = entries[0] || 'https://www.seqrite.com/product-sitemap.xml';
  const urls = await urlsFromSitemap(ctx, sitemapUrl, null, log);
  log.info({ urls: urls.length }, 'Seqrite product URLs from sitemap');
  const out = await scrapeUrls({
    ctx, urls,
    defaultCategory: 'Security Software',
    brandSuffix: 'Seqrite',
    log
  });
  log.info({ total: out.length }, 'Seqrite scrape complete');
  return out;
}

module.exports = { scrape };
