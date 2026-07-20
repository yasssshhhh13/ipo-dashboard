# Calm Capital — Deployment Guide

This is a production-ready Vite + React app with one serverless function
(`api/chat.js`) that keeps your Claude API key private. No CLI required —
everything below uses GitHub's and Vercel's website.

---

## 1. Put the code on GitHub

(Skip this if you already have a repo with this project.)

1. Go to **github.com**, log in, click **"+"** → **New repository**.
2. Name it (e.g. `ipo-dashboard`), leave everything unchecked, click **Create repository**.
3. On the empty repo page, click **"uploading an existing file"**.
4. Unzip the file you downloaded from me. Select **everything inside** the
   unzipped folder (`src`, `api`, `public`, `package.json`, `vite.config.js`,
   `index.html`, all of it) and drag it all into the upload box at once.
5. Scroll down, add a commit message like `Initial upload`, click **Commit changes**.

## 2. Deploy on Vercel

1. Go to **vercel.com**, sign up/log in — **use "Continue with GitHub"** so it
   can see your repos without extra setup.
2. Click **"Add New..."** → **"Project"**.
3. Find your repo in the list and click **Import**.
4. Vercel auto-detects this as a Vite project. Leave the build settings as-is
   (Build Command: `npm run build`, Output Directory: `dist`).
5. **Before clicking Deploy**, expand **Environment Variables** and add:
   - Name: `ANTHROPIC_API_KEY`
   - Value: your key from [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
   - Leave it set for Production, Preview, and Development.
   - Name: `VITE_SITE_URL` — Value: your live origin with no trailing slash
     (e.g. `https://your-app.vercel.app` or `https://calmcapital.in`). Used for
     canonical URLs, Open Graph, and the XML sitemap.
   - (Optional for analytics) Name: `VITE_GA_MEASUREMENT_ID` — Value: your GA4 ID `G-XXXXXXXXXX` (see section 6 below).
6. Click **Deploy**. Wait ~1 minute.

You'll get a URL like `https://ipo-dashboard-yourname.vercel.app` — that's
your live, public site. Anyone with that link can use it.

**Where the API key lives:** only in Vercel's Environment Variables, and only
read by `api/chat.js` on the server. It is never included in the JavaScript
sent to browsers, so it can't be extracted by visitors viewing page source.

---

## 3. Connecting your GitHub Action's live IPO data (optional)

If you set up the investorgain scraper GitHub Action from earlier: open the
deployed site → click the **"Static baseline"** badge in the header → paste
your repo's raw URL, e.g.:

```
https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/public/live-data.json
```

It'll sync immediately and then every hour automatically. This is saved in
each visitor's own browser (not shared), so it only needs to be entered once
per device.

---

## 4. Redeploying after future code changes

Vercel redeploys automatically on every push — you don't need to click
anything on Vercel's side.

- **Small edit:** open the file on GitHub (click it, click the pencil icon),
  make your change, scroll down, click **Commit changes**. Vercel starts a new
  deploy within seconds. Watch progress on your Vercel project's **Deployments** tab.
- **Multiple/larger changes:** repeat the "uploading an existing file" step
  from Part 1 — GitHub will ask to confirm you're replacing existing files.
- If Claude (me) makes changes for you again: I'll give you an updated
  zip/files, and you re-upload via either method above.

Each deploy gets its own preview URL too, so you can sanity-check a change
before it's live — but pushes to your repo's default branch (`main`) go
straight to your production URL.

---

## 5. Connecting a custom domain

1. Buy a domain anywhere (Namecheap, GoDaddy, Google Domains, etc.) if you
   don't have one.
2. In Vercel: your project → **Settings** → **Domains** → enter your domain
   → **Add**.
3. Vercel shows you either:
   - **A records / CNAME values** to add at your domain registrar, or
   - Instructions to point your domain's nameservers to Vercel.
4. Go to your domain registrar's DNS settings, add the record(s) Vercel
   showed you.
5. Wait 10 minutes–24 hours for DNS to propagate. Vercel auto-issues a free
   HTTPS certificate once it detects the domain is pointed correctly — no
   extra step needed.

---

## 6. Google Analytics (GA4) — visitor tracking

Calm Capital sends GA4 `page_view` and `tab_view` events when visitors open tabs
(Overview, Subscriptions, etc.) and IPO detail URLs. Analytics loads **only** when
`VITE_GA_MEASUREMENT_ID` is set.

### A. Create a GA4 property
1. Open [analytics.google.com](https://analytics.google.com) and sign in.
2. **Admin** (gear) → **Create property** → name it `Calm Capital`.
3. Time zone: **India**; currency: **INR**.
4. Create a **Web** data stream with your live site URL
   (e.g. `https://your-app.vercel.app`).
5. Copy the **Measurement ID** (`G-XXXXXXXXXX`).

### B. Add the Measurement ID
**Local (optional):** copy `.env.example` to `.env.local` and set:

```
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_SITE_URL=https://calmcapital.in
```

**Production (Vercel):** Project → **Settings** → **Environment Variables** →
add `VITE_GA_MEASUREMENT_ID` and `VITE_SITE_URL` for Production (and Preview if you want).
Then **Redeploy** so the build picks up the variables.

### C. Verify it works
1. Open your live site (disable ad-block for that tab if needed).
2. In GA4 go to **Reports → Realtime** — you should appear within ~30 seconds.
3. Switch sidebar tabs; confirm `page_view` / `tab_view` events.
4. After 24–48 hours, check **Acquisition** and **Engagement** for Users / Sessions.

---

## 7. Technical SEO (SPA-friendly)

Calm Capital stays a **one-page app** (tabs + IPO detail modal). SEO is layered on without multi-page redesigns:

- Shareable paths: `/ipo/<id>`, `/gmp`, `/subscriptions`, `/allotment`, etc.
- Build step `generate-seo.mjs` writes per-IPO HTML shells (title, description, canonical, OG/Twitter, JSON-LD) into `dist/` so crawlers see metadata before JS.
- `public/sitemap.xml` + `public/robots.txt` refresh on build and on the hourly data Action.
- Cards and nav use real `href`s; clicks still open the same modal/tab instantly.

Submit `https://YOUR_DOMAIN/sitemap.xml` in Google Search Console after deploy.

---

## 8. Ongoing maintenance checklist

| What | How often | How |
|---|---|---|
| Anthropic API key still valid | If AI Assistant stops responding | Check [console.anthropic.com](https://console.anthropic.com) billing/key status; rotate in Vercel env vars if needed, then redeploy |
| Google Analytics Measurement ID | Once at setup | Keep `VITE_GA_MEASUREMENT_ID` set in Vercel; check Realtime after deploys |
| Site URL for SEO | Once at setup | Keep `VITE_SITE_URL` set to your production origin; optional GitHub Actions variable `VITE_SITE_URL` for sitemap commits |
| GitHub Action scraper still running | Monthly | Repo → Actions tab → confirm recent green runs; investorgain.com occasionally changes its page structure and breaks selectors — see `LIVE_DATA_SETUP.md` in that repo for the fix procedure |
| Dependency updates | Every few months | Not required to keep working, but `npm outdated` locally (or just ask me) to check for security patches |
| Domain renewal | Yearly (if using a custom domain) | Set auto-renew at your registrar |
| Vercel usage | Free | Free tier covers this project's traffic comfortably; Vercel emails you if you're ever near a limit |

---

## What "production-ready" means here, specifically

- **CORS**: not an issue — the browser only ever calls same-origin `/api/chat`; that function calls Anthropic server-to-server, where CORS doesn't apply.
- **Routing**: path-based SPA URLs (`/ipo/...`, `/gmp`, …) with `history.pushState`; `vercel.json` SPA fallback still applies after static SEO shells.
- **Build**: `npm run build` runs DRHP validation, Vite, then SEO shell/sitemap generation.
- **Secrets**: `ANTHROPIC_API_KEY` is server-only in Vercel. `VITE_GA_MEASUREMENT_ID` and `VITE_SITE_URL` are public client/build values (safe to embed; set via env so you can rotate them).
