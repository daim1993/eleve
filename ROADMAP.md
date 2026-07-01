# Roadmap — from foundation to product

## Done in this codebase
- Real backend: accounts (hashed passwords), content API + admin publish, per-user builder projects with **version history** and **public share links**, rate limiting, security headers, privacy-first analytics, client error logging. API covered by an automated test suite (`server/ && npm test`).
- Builder: **autosave + crash recovery**, cloud save / my-projects / share, and **DXF import/export round-trip** (LWPOLYLINE room outlines) alongside OBJ + PDF.
- SEO/PWA: meta + OpenGraph on all pages, `sitemap.xml`, `robots.txt`, `site.webmanifest`, favicon, `404.html`.
- Legal/privacy: cookie-free consent banner, `privacy.html`, `terms.html`, `accessibility.html`.
- Accessibility pass: focus-visible states, reduced-motion honoured globally, muteable audio.

## Still required (needs external inputs — cannot be finished from code alone)
1. **Payments** — wire Stripe (needs a Stripe account + secret key). Scaffold is in `server.js` (`/api/billing/checkout`) and `pricing.html`; add the Stripe SDK + webhook to go live.
2. **CAD interoperability** — native **DWG** (via a converter service/ODA) and **IFC/BIM** import/export; import of arbitrary architect DXFs (not just our own). This is the real moat vs. Revit/AutoCAD/SketchUp.
3. **Accounts hardening** — email verification, password reset, OAuth, team seats/roles, object storage for images (instead of base64 in JSON), and a real database (Postgres) — the DB read/write funcs in `server.js` are the only swap point.
4. **Testing/QA** — cross-browser/device matrix, Playwright E2E for the builder/3D, performance budgets, uptime + error telemetry dashboards.
5. **Full WCAG 2.1 AA audit** — screen-reader passes, keyboard-complete builder/3D flows, an accessible alternative to the custom cursor.
6. **Content & assets** — replace placeholder studio/founder/contact details and greyscale swatches with real photography, case studies, and a brand guidelines PDF.
7. **Performance engineering** — lazy-load/compress the GLB + audio, self-host fonts, cache headers, Lighthouse pass.
8. **Security/compliance** — HTTPS host, secrets management, CSP, dependency/supply-chain scanning, GDPR data-export/delete flows.
9. **Business substance** — users, traffic, revenue, retention, IP/licensing clarity, and a founding story. Valuation follows traction and defensibility, not polish.
