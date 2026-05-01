# Mahesh Electronics — server

Express + SQLite + Playwright scraper that pulls product info weekly from OEM sites and serves the existing static HTML pages with product cards rendered from the DB.

## First-time setup

You need **Node.js 20+** installed. Download from https://nodejs.org (LTS).

```bash
cd "D:\Mahesh Electroncis\server"
copy .env.example .env       # then edit .env to set ADMIN_USER/ADMIN_PASS
npm install
npx playwright install chromium
node db.js --init             # creates mahesh.db, seeds brands from Brand Website.csv
npm start                     # http://localhost:3000  (admin at /admin)
```

## Run a scrape

```bash
node scraper/index.js --list             # show brands, ✓ = adapter+entry-URL ready
node scraper/index.js --brand=HP         # scrape HP only
node scraper/index.js                    # scrape all brands with adapters
```

Or hit the "Run for selected brand" button in the admin UI at http://localhost:3000/admin.

The scheduler also runs `runAll` weekly on **Sunday 03:00 IST** (override via `SCRAPE_CRON` in `.env`).

## How HTML pages get their products

In any `*.html` page under the site root, write:

```html
<div class="p-grid container">
  <!--{{products brand="HP" category="Laptop" limit=8}}-->
</div>
```

Express expands the comment at request time using the `.p-card` markup that `gaming.html` already uses, so design is unchanged.

Supported attrs: `brand` (matches `brands.name`), `category` (matches `products.category`), `limit` (default 12, max 100). `status='active'` is implied — `hidden`/`discontinued` rows never render.

## Where things live

```
server/
├── server.js           Express + HTML middleware
├── db.js               SQLite schema + brand seeder
├── render.js           p-card HTML generator
├── scheduler.js        node-cron (weekly)
├── entry-points.json   per-brand India product-listing URLs (HAND-CURATED)
├── scraper/
│   ├── index.js        orchestrator
│   ├── browser.js      Playwright launcher
│   ├── image-downloader.js   downloads to ../images/products/<brand>/, dedupes by SHA-256
│   ├── differ.js       INSERT / UPDATE / mark-discontinued
│   ├── logger.js       pino → server/logs/scrape-YYYY-MM-DD.json
│   └── adapters/
│       ├── hp.js, canon.js, epson.js, acer.js, lg.js, hikvision.js
│       ├── _generic-listing.js   shared crawl pattern
│       └── _stub.js              for un-adapted brands
└── admin/index.html    /admin UI (basic-auth)
```

## Adapter contract

Each `adapters/<brand>.js` exports:

```js
exports.scrape = async ({ ctx, entries, brandSlug, log }) => [
  { oem_id, name, model, description, category, specs, image_urls: [...], source_url }
];
```

`ctx` is a Playwright BrowserContext. `entries` comes from `entry-points.json`. The orchestrator handles image downloading, DB upserts, and the discontinued sweep — adapters only return raw scraped items.

## When an adapter breaks

OEMs change HTML 2–4×/year. Symptoms: that brand's `last_status` shows `failed` or `partial` in `/admin`, or `products_added` is suddenly 0. Open the latest log in `server/logs/`, find the failing selector, update the relevant `adapters/*.js` file. The other adapters keep running independently.
