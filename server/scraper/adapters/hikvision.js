// Hikvision adapter — v2.
// Strategy: hikvision.com is built on Adobe Experience Manager (AEM). Every
// listing page (Network-Cameras, Turbo-HD-Products, etc.) loads its data from
// a sibling JSON URL:
//   <listing-page>/jcr:content/root/responsivegrid/search_list_copy.json
// The JSON is huge (~2 MB, 1000+ products) and fully self-describes each
// product: productModel (SKU), title, description, image (absolute URL),
// detailFullPath. No DOM scraping needed — just fetch the JSON.
//
// Each entry URL in entry-points.json is the listing PAGE URL; we derive the
// JSON URL by inserting the AEM jcr:content path.
'use strict';

function deriveJsonUrl(listingUrl) {
  // strip query/fragment, strip trailing slash, swap .html → /
  const u = listingUrl.replace(/[?#].*/, '').replace(/\.html$/, '').replace(/\/$/, '');
  // listingUrl is like https://www.hikvision.com/en/products/IP-Products/Network-Cameras
  // → https://www.hikvision.com/content/hikvision/en/products/IP-Products/Network-Cameras/jcr:content/root/responsivegrid/search_list_copy.json
  const m = u.match(/^(https:\/\/www\.hikvision\.com)(\/en\/products\/.+)$/);
  if (!m) return null;
  return `${m[1]}/content/hikvision${m[2]}/jcr:content/root/responsivegrid/search_list_copy.json`;
}

async function scrape({ ctx, entries, log }) {
  const all = [];
  const seenModel = new Set();
  const page = await ctx.newPage();

  for (const entryUrl of entries) {
    const jsonUrl = deriveJsonUrl(entryUrl);
    if (!jsonUrl) {
      log.warn({ entryUrl }, 'cannot derive Hikvision JSON URL');
      continue;
    }
    log.info({ entryUrl, jsonUrl }, 'fetching Hikvision JSON');
    let data;
    try {
      // Use Playwright's request fixture — same UA/cookies as page context.
      const resp = await ctx.request.get(jsonUrl, { timeout: 60000 });
      if (!resp.ok()) { log.warn({ jsonUrl, status: resp.status() }, 'JSON fetch non-OK'); continue; }
      data = await resp.json();
    } catch (e) {
      log.warn({ jsonUrl, err: e.message }, 'JSON fetch failed');
      continue;
    }
    const products = data && Array.isArray(data.products) ? data.products : [];
    log.info({ entryUrl, count: products.length }, 'Hikvision products parsed');

    // Determine category from the URL.
    let cat = 'CCTV Camera';
    if (/Network-Cameras/i.test(entryUrl))    cat = 'IP Camera';
    else if (/Turbo-HD/i.test(entryUrl))      cat = 'Turbo HD Camera';
    else if (/Recorders|NVR|DVR/i.test(entryUrl)) cat = 'Recorder';
    else if (/Access-Control/i.test(entryUrl)) cat = 'Access Control';
    else if (/Intercom/i.test(entryUrl))      cat = 'Intercom';
    else if (/Alarm/i.test(entryUrl))         cat = 'Alarm';
    else if (/Display/i.test(entryUrl))       cat = 'Display';

    // Cap per entry to avoid 1000+ products in one cat. Take featured/recommended first.
    const sorted = products.slice().sort((a, b) => {
      const aHot = (a.hotMark === '1' || a.recommend) ? 1 : 0;
      const bHot = (b.hotMark === '1' || b.recommend) ? 1 : 0;
      if (aHot !== bHot) return bHot - aHot;
      return (a.sortNum || '').localeCompare(b.sortNum || '');
    });

    for (const pr of sorted.slice(0, 60)) {
      const model = pr.productModel || pr.title;
      if (!model || seenModel.has(model)) continue;
      seenModel.add(model);
      const detailUrl = pr.detailFullPath
        ? `https://www.hikvision.com${pr.detailFullPath}`
        : '';
      all.push({
        oem_id: model,
        name: pr.title || model,
        model,
        description: pr.description || '',
        category: cat,
        specs: {},
        image_urls: pr.image ? [pr.image] : [],
        source_url: detailUrl
      });
    }
  }

  await page.close();
  log.info({ total: all.length }, 'Hikvision scrape complete');
  return all;
}

module.exports = { scrape };
