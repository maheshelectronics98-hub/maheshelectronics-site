// Lapcare adapter — Lapcare runs on Shopify, so we just hit /products.json.
'use strict';
const { makeScrape } = require('./_shopify');

let _scrape;
module.exports = {
  scrape: async (opts) => {
    if (!_scrape) {
      _scrape = await makeScrape({
        brand: 'Lapcare',
        storeOrigin: 'https://www.lapcare.com',
        defaultCategory: 'Accessory'
      });
    }
    return _scrape(opts);
  }
};
