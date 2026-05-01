# Mahesh Electronics — server deployment notes

## What's in this folder

| File / dir | Purpose |
|---|---|
| `server.js`, `db.js`, `render.js` | Express app, SQLite wrapper, HTML template renderer |
| `scheduler.js` | Weekly cron — Sundays 03:00 IST runs all adapters |
| `scraper/` | Per-brand adapters + image downloader + diff engine |
| `entry-points.json` | Per-brand catalog URLs the scraper crawls |
| `admin/index.html` | Basic-auth admin panel at `/admin` |
| `Dockerfile`, `docker-compose.yml`, `Caddyfile` | Production deploy bundle |

## Local development

```sh
cd server
npm install
npx playwright install chromium
node db.js --init          # creates mahesh.db, seeds 17 brands from CSV
node scraper/index.js --brand=HP   # smoke-test one adapter
node server.js             # http://localhost:3000
```

`/admin` requires basic auth — set `ADMIN_USER` and `ADMIN_PASS` in `.env`.

## Brands currently working

| Brand | Adapter strategy | Categories | Notes |
|---|---|---|---|
| **HP** | Captures `/hpols_catalog/category/consumeproduct` JSON, parses embedded HTML | Laptop, Desktop, Printer | Magento. Each shop subcategory page must individually fire consumeproduct. |
| **Canon** | DOM scrape `.productCard` on `/products/search?category=…` | Printer, Scanner, Camera | Server-rendered. |
| **Epson** | DOM scrape `li.product-item[data-tl_sku]` | Printer | Hybris e-commerce. |
| **Hikvision** | Direct fetch of AEM `.../jcr:content/.../search_list_copy.json` | IP Camera | 1080+ products in JSON; we cap at 60/category. |
| **Acer** | DOM scrape `li.product-item` on `store.acer.com` | Laptop, Monitor | **Cloudflare-protected** — uses `playwright-extra` + stealth. Paginates 10/page. |

Other brands listed in `entry-points.json` (LG, ViewSonic, BenQ, Vertiv, Dell, etc.) need adapters. LG also needs stealth.

## Production deployment (single VPS)

Tested target: Hetzner CX22 (2 vCPU, 4 GB RAM, Ubuntu 22.04, ~₹400/mo) or Railway Hobby.

```sh
# On the VPS, after Docker + Docker Compose are installed:
git clone <your-repo> /opt/mahesh
cd /opt/mahesh/server

# Edit Caddyfile — replace maheshelectronics.in with your real domain
nano Caddyfile

# Set admin credentials
echo "ADMIN_USER=admin" > .env
echo "ADMIN_PASS=$(openssl rand -hex 16)" >> .env
cat .env  # save the password somewhere

docker compose up -d
docker compose logs -f mahesh   # watch first scrape
```

Point your domain's A record at the VPS public IP. On first hit, Caddy fetches a Let's Encrypt cert automatically (no manual SSL config needed).

### Persistent state

Two named volumes survive container rebuilds:
- `mahesh-db` — `/app/server/data/mahesh.db` (the SQLite file). Set `DB_PATH=data/mahesh.db` in `.env`.
- `mahesh-images` — `/app/images/products/` (downloaded OEM photos)

`logs/` is bind-mounted to host for easy `tail -f`.

### Backups

```sh
# Nightly DB snapshot (cron on host):
docker exec mahesh-server sqlite3 /app/server/data/mahesh.db ".backup /app/server/logs/mahesh-$(date +%F).db"
# images bucket survives via volume; back up the volume directory periodically
```

## Adding a new brand adapter

1. Run `node scraper/discover.js https://brand-listing-url` — captures all JSON XHRs to `discovery/<host>/<ts>/`.
2. Run `node scraper/analyze-discovery.js discovery/<host>/<ts>` — ranks by likelihood of being a product list.
3. If a JSON endpoint exists, fetch it directly (Hikvision pattern).
4. Otherwise probe DOM with a one-off Playwright script to find the card selector.
5. Copy `scraper/adapters/canon.js` as a template; replace selectors.
6. Add the brand entry URL(s) to `entry-points.json`.
7. `INSERT INTO brands (name, homepage, adapter) VALUES (...)` if the brand isn't already in the CSV.
8. `node scraper/index.js --brand=NEWBRAND` to test.
9. Verify in admin panel (`/admin`) and inspect `images/products/<brand-slug>/`.

## Scraping schedule

`scheduler.js` registers cron `0 3 * * 0` (Sundays 03:00 Asia/Kolkata) and runs all adapters in sequence. Trigger an out-of-cycle run from `/admin` ("Run scrape" per-brand button).

## Failure modes to expect

- **HTML drift** — OEMs change their selectors 2–4× a year. Watch `scrape_runs.errors_json` and the `last_status` per brand. Symptoms: a brand suddenly drops to 0 active and `removed = N` jumps high.
- **CDN 403** — some image CDNs check `Referer`. The downloader uses Playwright's `request.get()` which inherits the page context's cookies; if you see 403s, capture and re-set `Referer` per-brand in `image-downloader.js`.
- **Cloudflare upgrade** — if a stealth-protected brand starts blocking again, try `rebrowser-playwright` instead of `playwright-extra`.
- **Disk fill** — `images/products/` grows unbounded. Add a cron to delete unreferenced files quarterly: `find images/products -type f -mtime +180` then check against DB rows.
