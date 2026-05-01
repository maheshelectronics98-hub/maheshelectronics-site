# Mahesh Electronics OEM-sync server
# Single-container image: serves the static site, runs the SQLite DB, and
# executes the weekly scraper via node-cron. Built on Playwright's official
# image so Chromium + Linux libs come pre-installed.
FROM mcr.microsoft.com/playwright:v1.48.0-jammy

WORKDIR /app

# Install server deps first for layer-cache friendliness.
COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm ci --omit=dev

# Copy the whole site (HTML pages + images + server code).
COPY . .

# SITE_ROOT defaults to the repo root in db.js; persistent state lives at
# /app/server/data and /app/images/products — mount these as volumes.
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

WORKDIR /app/server
CMD ["node", "server.js"]
