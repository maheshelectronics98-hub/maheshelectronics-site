'use strict';
const { scrape: genericScrape } = require('./_generic-listing');
module.exports = {
  scrape: (opts) => genericScrape({
    ...opts,
    brand: 'LG',
    linkPattern: /lg\.com\/in\/.+/,
    categoryHint: null
  })
};
