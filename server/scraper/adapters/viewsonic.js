// ViewSonic India adapter.
// Strategy: ViewSonic India has no XML sitemap and no public catalog API.
// Each campaign / category landing page contains anchors to product detail
// pages at URLs like:
//   /in/colorpro/products/VP2766-2K
//   /in/products/projectors/PA503X
// Product pages have rich OpenGraph tags (title + image + description).
//
// We:
//   1. Visit each entry URL (campaign/category landing)
//   2. Harvest anchors matching /in/.../products/<MODEL>
//   3. Visit each model URL and extract og: tags
'use strict';

function isProductUrl(href) {
  // Strip trailing slash, query, fragment
  const u = href.replace(/[?#].*$/, '').replace(/\/$/, '');
  // Must be on viewsonic.com/in and contain /products/<segment> where the
  // segment looks like a model code (uppercase + digits, possibly with -)
  const m = u.match(/^https:\/\/www\.viewsonic\.com\/in\/[^?#]*\/products\/([A-Z0-9][A-Za-z0-9_.-]{2,})$/);
  if (!m) return false;
  const last = m[1];
  // Reject obvious non-model slugs
  if (/^(accessories|software|support|community|solutions|courses|list)$/i.test(last)) return false;
  return true;
}

async function scrape({ ctx, entries, log }) {
  const page = await ctx.newPage();
  const allUrls = new Set();

  // Phase 1: collect product URLs from each landing page.
  for (const entryUrl of entries) {
    try {
      log.info({ entryUrl }, 'crawling ViewSonic landing');
      await page.goto(entryUrl, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForTimeout(2000);
      // scroll to trigger lazy-rendered links
      await page.evaluate(async () => {
        await new Promise(r => {
          let t = 0;
          const i = setInterval(() => {
            window.scrollBy(0, 800); t += 800;
            if (t > 5000) { clearInterval(i); r(); }
          }, 150);
        });
      });
      await page.waitForTimeout(1000);
      const found = await page.evaluate(() =>
        Array.from(document.querySelectorAll('a[href]')).map(a => a.href)
      );
      for (const u of found) if (isProductUrl(u)) allUrls.add(u.replace(/[?#].*$/, '').replace(/\/$/, ''));
    } catch (e) {
      log.warn({ entryUrl, err: e.message }, 'landing crawl failed');
    }
  }
  log.info({ uniqueProductUrls: allUrls.size }, 'ViewSonic URLs collected');

  // Phase 2: visit each product page, extract og: tags.
  const all = [];
  let n = 0;
  for (const url of allUrls) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(400);
      const meta = await page.evaluate(() => ({
        title: document.querySelector('meta[property="og:title"]')?.content
            || document.querySelector('h1')?.textContent?.trim()
            || document.title,
        image: document.querySelector('meta[property="og:image"]')?.content,
        desc:  document.querySelector('meta[property="og:description"]')?.content,
      }));
      if (!meta.title) continue;
      const model = url.split('/').pop();
      // Rough category from URL path
      let cat = 'Display';
      if (/projectors/i.test(url))  cat = 'Projector';
      else if (/colorpro|lcd|monitor/i.test(url)) cat = 'Monitor';
      else if (/lecture/i.test(url)) cat = 'Display';
      all.push({
        oem_id: model,
        name: meta.title.replace(/\s*\|\s*ViewSonic.*$/, '').trim(),
        model,
        description: (meta.desc || '').trim().slice(0, 400),
        category: cat,
        specs: {},
        image_urls: meta.image ? [meta.image] : [],
        source_url: url
      });
      if (++n % 10 === 0) log.info({ done: n, total: allUrls.size }, 'ViewSonic progress');
    } catch (e) {
      log.warn({ url, err: e.message }, 'ViewSonic detail fetch failed');
    }
  }
  await page.close();
  log.info({ total: all.length }, 'ViewSonic scrape complete');
  return all;
}

module.exports = { scrape };
