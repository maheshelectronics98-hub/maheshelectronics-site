'use strict';
const { makeScrape } = require('./_shopify');
let _scrape;
module.exports = {
  scrape: async (opts) => {
    if (!_scrape) {
      _scrape = await makeScrape({
        brand: 'Artis',
        storeOrigin: 'https://www.artis.in',
        defaultCategory: 'Audio'
      });
    }
    return _scrape(opts);
  }
};
