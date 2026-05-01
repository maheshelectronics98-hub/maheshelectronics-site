// Weekly scrape via node-cron. Default: Sundays 03:00 IST.
'use strict';

const cron = require('node-cron');
require('dotenv').config();

let started = false;
function start() {
  if (started) return;
  started = true;
  const expr = process.env.SCRAPE_CRON || '0 3 * * 0';
  if (!cron.validate(expr)) {
    console.error(`[scheduler] invalid SCRAPE_CRON: ${expr}`);
    return;
  }
  cron.schedule(expr, async () => {
    console.log('[scheduler] weekly scrape triggered');
    try {
      const { runAll } = require('./scraper');
      await runAll();
    } catch (e) {
      console.error('[scheduler] scrape failed', e);
    }
  }, { timezone: 'Asia/Kolkata' });
  console.log(`[scheduler] cron registered: ${expr} (Asia/Kolkata)`);
}

module.exports = { start };
