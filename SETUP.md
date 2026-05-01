# Mahesh Electronics — ₹800/yr deployment setup

Total cost: **just the GoDaddy domain (~₹800/yr)**. No server bills.
What runs where:
- **Scraping** — happens on GitHub's servers every Sunday 3am IST (free)
- **Hosting** — GitHub Pages serves the catalogue (free, fast CDN, free SSL)
- **Domain** — your GoDaddy domain points at GitHub Pages (~₹800/yr only)

You do this **once**. Then the site updates itself every week.

---

## Step 1 — Create the GitHub repo (5 min)

1. Sign up at **github.com** if you haven't already (free).
2. Click **+** → **New repository**.
3. Name: `maheshelectronics-site` (or whatever you want).
4. **Private** is fine; the published Pages site will still be public.
5. Don't add a README, .gitignore, or license — leave it empty.
6. Click **Create repository**. Copy the URL it shows (looks like `https://github.com/YOURNAME/maheshelectronics-site.git`).

## Step 2 — Push this folder to that repo (5 min)

In PowerShell, in `D:\Mahesh Electroncis`:

```powershell
git init
git add .
git commit -m "initial import"
git branch -M main
git remote add origin https://github.com/YOURNAME/maheshelectronics-site.git
git push -u origin main
```

You'll be prompted to authenticate; sign in with your GitHub account (browser popup).

> If you don't have `git` installed: download Git for Windows from git-scm.com.

## Step 3 — Configure GitHub Actions + Pages (3 min)

In your new repo on github.com:

1. **Settings → Pages**
   - **Source:** *GitHub Actions* (NOT "Deploy from a branch")
2. **Settings → Actions → General → Workflow permissions**
   - Set **"Read and write permissions"**
   - Save.
3. **Settings → Secrets and variables → Actions → Variables → New repository variable**
   - Name: `SITE_DOMAIN`
   - Value: your GoDaddy domain, e.g. `maheshelectronics.in` (no `https://`, no trailing slash)
   - Skip this step if you don't have a custom domain yet — site will publish at `https://YOURNAME.github.io/maheshelectronics-site/` instead.

## Step 4 — Trigger the first build (1 min)

1. **Actions** tab → click **"Scrape & Deploy"** workflow on the left
2. Click **Run workflow** → tick **"Skip scrape"** for the first run (so it deploys instantly without re-scraping all 12 brands — the DB is already in the repo)
3. Click the green **Run workflow** button
4. Wait ~3 minutes; refresh the page; the run should turn green ✅

After it finishes, your site is live at:
- `https://YOURNAME.github.io/maheshelectronics-site/` (default URL)
- OR your custom GoDaddy domain (after step 5)

## Step 5 — Point your GoDaddy domain at GitHub Pages (10 min, optional)

Skip this if you're OK with the `github.io` URL.

1. Sign in to GoDaddy → My Products → DNS for `maheshelectronics.in`
2. Add these records (delete any conflicting `A` or `CNAME` for `@` and `www`):

| Type | Name | Value | TTL |
|---|---|---|---|
| A | @ | `185.199.108.153` | 1 hour |
| A | @ | `185.199.109.153` | 1 hour |
| A | @ | `185.199.110.153` | 1 hour |
| A | @ | `185.199.111.153` | 1 hour |
| CNAME | www | `YOURNAME.github.io.` | 1 hour |

3. Wait 30 min – 24 hours for DNS to propagate.
4. Back on GitHub: **Settings → Pages** → under "Custom domain", paste `maheshelectronics.in` → Save.
5. Once GitHub verifies the domain (the warning banner disappears), tick **Enforce HTTPS**.

That's it. Your site is live at `https://maheshelectronics.in/`.

---

## What happens automatically

- Every **Sunday 3am IST**, GitHub Actions:
  1. Scrapes all 12 brand websites for new/changed/discontinued products
  2. Downloads new product photos
  3. Re-renders shop.html / cctv.html with the latest catalogue
  4. Commits the updated DB and images back to the repo
  5. Publishes the new HTML to GitHub Pages

- You can **manually trigger** a scrape from the Actions tab → Scrape & Deploy → Run workflow.

- You can **scrape one brand only** by typing e.g. `HP` in the "brand_only" field when triggering manually.

## Editing products manually

Since the admin panel doesn't run on GitHub Pages, manual edits work like this:

**Hide a product:**
1. On your local PC: `cd server && node server.js`
2. Open `http://localhost:3000/admin`, login (`admin` / `change-me-please`)
3. Set the product's status to *hidden*
4. Commit + push the updated DB:
   ```
   git add server/mahesh.db
   git commit -m "hide product XYZ"
   git push
   ```
5. Run the workflow with **"Skip scrape" ticked** — site rebuilds in 90 seconds with the change.

**Add a brand-new adapter** — same flow: build it on your local PC, commit + push, the next scheduled run picks it up.

---

## Things that will go wrong eventually (and how to fix)

| Symptom | Likely cause | Fix |
|---|---|---|
| Workflow fails in "Run scraper" step | One OEM changed their HTML | Read the failing brand's log in the Actions run; update that adapter's selectors; commit + push |
| Site shows old products | Workflow hasn't run yet OR Pages cache | Trigger workflow manually from Actions tab, OR hard-refresh browser (Ctrl+Shift+R) |
| Domain stops resolving | GoDaddy DNS records overwritten / domain expired | Re-add the 4 A records + 1 CNAME from Step 5 |
| Repo size grows past 1 GB (years away) | Image accumulation | Run `node server/scripts/prune-old-images.js` (would need to be added later) |

## Cost summary

| Item | Cost | When |
|---|---|---|
| GoDaddy `.in` domain | ~₹800 | Annual |
| GitHub account | Free | — |
| GitHub Actions (scraper compute) | Free | Within 2000 min/month free tier; we use ~30 min/week |
| GitHub Pages (hosting + bandwidth) | Free | Within 1 GB storage / 100 GB bandwidth/month |
| **TOTAL** | **~₹800/yr** | |
