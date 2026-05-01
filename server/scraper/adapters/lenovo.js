// Lenovo India adapter — uses their public Open API.
// Strategy: discovered via XHR sniffing on lenovo.com/in/en/laptops/c/laptops.
// The endpoint
//   https://openapi.lenovo.com/in/en/ofp/search/dlp/product/query/get/_tsc
// returns paginated product lists. Direct fetch is 403 (anti-CSRF), so we
// load a Lenovo page first (gets cookies + Origin), then call the API
// from inside the page context using fetch().
//
// Each entry in entry-points.json is a "classificationGroupId" — a Lenovo
// category code (laptops=80001, desktops=80002, etc.).
'use strict';

const PAGE_FILTER_ID = 'c5b2b24c-54b2-414e-87d9-819cc43f1c94';
const PAGE_SIZE = 50;
const SEED_PAGE_URL = 'https://www.lenovo.com/in/en/laptops/c/laptops';

// classificationGroupId → category label for our DB
const CATEGORY_MAP = {
  '80001': 'Laptop',
  '80002': 'Desktop',
  '80003': 'Workstation',
  '80004': 'Tablet',
  '80005': 'Monitor',
  '80008': 'Accessory',
};

async function scrape({ ctx, entries, log }) {
  const page = await ctx.newPage();
  // Seed cookies + origin by loading any Lenovo page once
  log.info({ url: SEED_PAGE_URL }, 'seeding Lenovo session');
  try {
    await page.goto(SEED_PAGE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500);
  } catch (e) {
    log.warn({ err: e.message }, 'seed page failed');
    await page.close();
    return [];
  }

  const all = [];
  const seenCode = new Set();

  // entries are classification IDs. Default to laptops if none provided.
  const classIds = entries && entries.length ? entries : ['80001'];

  for (const classId of classIds) {
    let pageNum = 1;
    while (true) {
      const result = await page.evaluate(async ({ classId, pageNum, pageSize, pageFilterId }) => {
        const url = `https://openapi.lenovo.com/in/en/ofp/search/dlp/product/query/get/_tsc?pageFilterId=${pageFilterId}`;
        const params = encodeURIComponent(JSON.stringify({
          classificationGroupIds: classId,
          pageFilterId,
          pageSize,
          page: pageNum,
        }));
        const r = await fetch(url + '&params=' + params, { credentials: 'include' });
        if (!r.ok) return { error: 'http ' + r.status };
        const j = await r.json();
        return { products: (j.data && j.data.data) || [], pageCount: (j.data && j.data.pageCount) || 1 };
      }, { classId, pageNum, pageSize: PAGE_SIZE, pageFilterId: PAGE_FILTER_ID });

      if (result.error) { log.warn({ classId, pageNum, err: result.error }, 'Lenovo API error'); break; }

      log.info({ classId, pageNum, got: result.products.length, totalPages: result.pageCount }, 'Lenovo page');
      const cat = CATEGORY_MAP[classId] || 'Laptop';

      for (const pr of result.products) {
        const code = pr.productCode;
        if (!code || seenCode.has(code)) continue;
        seenCode.add(code);
        // Image: prefer heroImage > thumbnail > first gallery item
        let img = (pr.media && pr.media.heroImage && pr.media.heroImage.imageAddress)
               || (pr.media && pr.media.thumbnail && pr.media.thumbnail.imageAddress)
               || (pr.media && pr.media.gallery && pr.media.gallery[0] && pr.media.gallery[0].imageAddress)
               || '';
        if (img.startsWith('//')) img = 'https:' + img;
        // Strip HTML from long description for clean text
        const desc = (pr.marketingLongDescription || '')
          .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400);
        const name = (pr.productName || code).trim();
        all.push({
          oem_id: code,
          name,
          model: code,
          description: desc,
          category: cat,
          specs: {},
          image_urls: img ? [img] : [],
          source_url: `https://www.lenovo.com/in/en/p/${code.toLowerCase()}`
        });
      }

      if (pageNum >= (result.pageCount || 1)) break;
      pageNum++;
      if (pageNum > 10) break; // safety cap
    }
  }

  await page.close();
  log.info({ total: all.length }, 'Lenovo scrape complete');
  return all;
}

module.exports = { scrape };
