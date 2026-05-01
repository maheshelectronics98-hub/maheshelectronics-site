// Quick Heal adapter — Quick Heal India (quickheal.co.in) doesn't have a
// product LISTING page; each product is a leaf URL like
//   /home-users/quick-heal-total-security
// We hardcode the set of consumer + business product URLs (small, ~12 SKUs)
// and visit each to pull og:title + og:image + og:description.
'use strict';

const PRODUCT_URLS = [
  'https://www.quickheal.co.in/home-users/quick-heal-total-security',
  'https://www.quickheal.co.in/home-users/quick-heal-internet-security',
  'https://www.quickheal.co.in/home-users/quick-heal-antivirus-pro',
  'https://www.quickheal.co.in/home-users/quick-heal-internet-security-essentials',
  'https://www.quickheal.co.in/home-users/quick-heal-total-security-for-mac',
  'https://www.quickheal.co.in/home-users/quick-heal-home-server-antivirus',
  'https://www.quickheal.co.in/home-users/quick-heal-mobile-security',
  'https://www.quickheal.co.in/home-users/quick-heal-total-security-multi-device',
  'https://www.quickheal.co.in/quick-heal-antifraud',
];

async function scrape({ ctx, log }) {
  const page = await ctx.newPage();
  const all = [];
  for (const url of PRODUCT_URLS) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(500);
      const meta = await page.evaluate(() => ({
        title: document.querySelector('meta[property="og:title"]')?.content
            || document.querySelector('h1')?.textContent?.trim()
            || document.title,
        image: document.querySelector('meta[property="og:image"]')?.content
            || document.querySelector('img.product-image, img.banner-image')?.src,
        desc:  document.querySelector('meta[property="og:description"]')?.content
            || document.querySelector('meta[name="description"]')?.content,
      }));
      if (!meta.title) { log.warn({ url }, 'no title'); continue; }
      const slug = url.split('/').pop();
      all.push({
        oem_id: slug,
        name: meta.title.replace(/\s*\|\s*Quick Heal.*$/, '').trim(),
        model: slug.toUpperCase(),
        description: (meta.desc || '').trim().slice(0, 400),
        category: 'Security Software',
        specs: {},
        image_urls: meta.image ? [meta.image] : [],
        source_url: url
      });
    } catch (e) {
      log.warn({ url, err: e.message }, 'Quick Heal fetch failed');
    }
  }
  await page.close();
  log.info({ total: all.length }, 'Quick Heal scrape complete');
  return all;
}

module.exports = { scrape };
