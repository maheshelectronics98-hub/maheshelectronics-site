// Shared Playwright launcher. Headless Chromium with India locale + realistic UA
// so OEM sites with bot detection are less likely to block us.
'use strict';
// Some OEM sites (Acer, LG) detect plain Playwright via TLS/JS fingerprints.
// Use playwright-extra + stealth to bypass. Stealth is harmless for sites that
// don't fingerprint, so we use it for ALL contexts.
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
         + '(KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36';

let browser = null;

async function getBrowser() {
  if (browser && browser.isConnected()) return browser;
  browser = await chromium.launch({ headless: true });
  return browser;
}

async function newContext() {
  const b = await getBrowser();
  return b.newContext({
    userAgent: UA,
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
    viewport: { width: 1366, height: 900 },
    extraHTTPHeaders: { 'Accept-Language': 'en-IN,en;q=0.9' }
  });
}

async function closeBrowser() {
  if (browser) { await browser.close(); browser = null; }
}

module.exports = { getBrowser, newContext, closeBrowser, UA };
