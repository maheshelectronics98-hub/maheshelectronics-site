// Default adapter for brands we haven't custom-built one for yet.
// Returns nothing so the differ marks any pre-existing rows for the brand
// as "still here, just no fresh scrape" — last_seen_at won't advance, so
// they'll naturally fall to the bottom of grids ordered by recency.
'use strict';

module.exports = {
  async scrape({ log, brandSlug }) {
    log.warn({ brand: brandSlug }, 'no adapter implemented — returning []');
    return [];
  }
};
