# Elevé — design studio site + room builder

A single, self-contained web project for a high-end interior/architecture/exterior studio, plus two products:

- **Marketing site** — `index.html` (home), `gallery.html` (3D coverflow), `materials.html` (interactive materials book).
- **Room Builder** — `builder.html`, a browser CAD tool: draw plans, furnish rooms (real mm blocks, CAD layers), 3D wall view, cost estimate, and export **DXF / OBJ / PDF** (with DXF import round-trip).
- **CMS** — `cms.html`, edits all marketing content (text, photos, projects, materials) with a left-side navigator.
- **Backend** — `server/`, a Node/Express API: accounts, content publishing, per-user builder projects with version history + share links, privacy-first analytics, rate limiting, security headers.

## Run (recommended — enables backend + persistence)

```bash
cd server
npm install
npm start            # → http://localhost:4000
```
Open **http://localhost:4000**. The server hosts the whole site and the API.

Opened directly from `file://` the pages still work (offline), falling back to the browser's local cache; the backend features (accounts, cloud projects, publishing) require the server.

## Structure

```
index.html gallery.html materials.html builder.html cms.html   # pages
cms.js               # applies published content on public pages (+ backend sync)
materials-data.js    # shared materials catalogue (page + CMS read it)
elevate.css          # shared UI/UX polish + a11y layer
site.js              # privacy-first analytics beacon + consent + client error log
builder-cloud.js     # builder autosave/recovery + cloud save/list/share
sfx.js               # UI sound (handpan) + scroll tick, muteable
robots.txt sitemap.xml site.webmanifest favicon.svg 404.html
privacy.html terms.html accessibility.html pricing.html
server/              # Express API + tests + docs
docs: ROADMAP.md BRAND.md CONTENT.md PITCH.md SECURITY.md LICENSE
```

## Honest status

This is a polished product **foundation**, not a finished business. See `ROADMAP.md` for what's real vs. still required (real payments with Stripe keys, professional photography & copy, a full accessibility audit, native DWG/IFC, and — the part code can't fake — users, traffic and revenue).
