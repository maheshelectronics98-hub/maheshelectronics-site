// Sony India adapter — uses their public catalog API.
// Discovered via XHR: https://www.sony.co.in/api/open/products
// Returns paginated product list with images.desktop, name, slug, etc.
// Direct fetch is rate-limited / 403, so we proxy the call through a
// Sony page context (gets cookies + correct origin).
'use strict';

const SEED_URL = 'https://www.sony.co.in/electronics/televisions';
const PAGE_SIZE = 50;

function categoryFromHierarchy(hier) {
  if (!hier) return null;
  const s = hier.toLowerCase();
  if (/television|bravia|tv\b/.test(s)) return 'Television';
  if (/headphone|earphone|earbud/.test(s)) return 'Audio';
  if (/speaker|soundbar|home-theatre|home-theater/.test(s)) return 'Audio';
  if (/camera|lens|alpha/.test(s)) return 'Camera';
  if (/sd-card|memory|storage/.test(s)) return 'Storage';
  if (/battery|charger|cable/.test(s)) return 'Accessory';
  return null;
}

async function scrape({ ctx, entries, log }) {
  const page = await ctx.newPage();
  log.info({ url: SEED_URL }, 'seeding Sony session');
  try {
    await page.goto(SEED_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
  } catch (e) {
    log.warn({ err: e.message }, 'seed failed');
    await page.close();
    return [];
  }

  const all = [];
  const seenId = new Set();

  // entries can be category slugs (mainCategoryId or root). If none, walk
  // a few canonical groups by sort=newest to maximise variety.
  const groups = entries && entries.length ? entries : [null];

  for (const group of groups) {
    let pageNum = 1;
    while (pageNum <= 10) {
      const result = await page.evaluate(async ({ pageNum, pageSize, group }) => {
        // Sony API returns { searchResponse: { products[], count, start, end } }.
        // presetFacets is required (the API ignores requests without it). To
        // get all products, we use a deliberately broad facet group and let
        // the count drive pagination via start/end.
        const facets = group
          ? { groupIds: [group], priceRanges: [] }
          : { groupIds: ['allTvScreenSizeNeww', 'tvResolution', 'tvType'], priceRanges: [] };
        const start = (pageNum - 1) * pageSize;
        const url = `https://www.sony.co.in/api/open/products?locale=en_IN&sort=featured&start=${start}&end=${start + pageSize}&presetFacets=${encodeURIComponent(JSON.stringify(facets))}&selectedFilters=[]`;
        const r = await fetch(url, { credentials: 'include' });
        if (!r.ok) return { error: 'http ' + r.status };
        const j = await r.json();
        const sr = j.searchResponse || {};
        return { products: sr.products || [], total: sr.count || 0 };
      }, { pageNum, pageSize: PAGE_SIZE, group });

      if (result.error) { log.warn({ pageNum, err: result.error }, 'Sony API error'); break; }
      log.info({ group: group || 'all', pageNum, got: result.products.length, total: result.total }, 'Sony page');
      if (!result.products.length) break;

      for (const pr of result.products) {
        const id = pr.id || pr.slug;
        if (!id || seenId.has(id)) continue;
        seenId.add(id);
        // Image: images[0].desktop is protocol-relative
        let img = '';
        if (pr.images && pr.images[0]) {
          img = pr.images[0].desktop || pr.images[0].mobile || '';
          if (img.startsWith('//')) img = 'https:' + img;
        }
        const name = (pr.marketingProductName || pr.name || id).trim();
        const cat = categoryFromHierarchy(pr.categoryHierarchy)
                 || categoryFromHierarchy(pr.mainProductTypeRootId)
                 || 'Electronics';
        all.push({
          oem_id: id,
          name,
          model: pr.superModelOrModelNumber || pr.name || id,
          description: (pr.topFeatures || [])
            .map(t => String(t).replace(/<[^>]+>|\[FN\|[^\]]+\]/g, ' ').replace(/\s+/g, ' ').trim())
            .filter(Boolean).slice(0, 3).join(' · ').slice(0, 400),
          category: cat,
          specs: {},
          image_urls: img ? [img] : [],
          source_url: pr.learnMoreURL || `https://www.sony.co.in/${pr.slug || id}`
        });
      }

      // Stop if we got less than a full page
      if (result.products.length < PAGE_SIZE) break;
      pageNum++;
    }
  }

  await page.close();
  log.info({ total: all.length }, 'Sony scrape complete');
  return all;
}

module.exports = { scrape };
