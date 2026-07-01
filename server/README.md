# Elevé backend

A tiny Node/Express server that gives the site a **real backend**: a content API, admin auth, a server-side store, and static hosting — so CMS edits persist for real visitors across devices (not just one browser).

## Run

```bash
cd server
npm install
npm start
```

Then open **http://localhost:4000** (the server hosts the whole site).

## How it works

- `GET  /api/content` — public; returns the published content JSON.
- `POST /api/login` — `{ "password": "..." }` → `{ token }` (30-day signed token).
- `POST /api/content` — requires `Authorization: Bearer <token>`; saves content to `content.json`.
- All other paths serve the static site (index.html, gallery.html, materials.html, builder.html, cms.html).

### Editing flow
1. Open **http://localhost:4000/cms.html**.
2. Edit text/photos/projects/materials, press **Apply changes** (saves locally in the editor).
3. Press **Publish live** → enter the admin password → content is saved on the server.
4. Every visitor on any device now sees the published content (the pages fetch `/api/content` on load).

Offline / opened from `file://` with no server running, the pages fall back to the browser's local cache — nothing breaks.

## Configuration (env vars)

- `PORT` — default `4000`
- `ADMIN_PASSWORD` — default `eleve-admin` **(change this)**
- `SECRET` — token signing secret **(change this in production)**

```bash
ADMIN_PASSWORD="my-strong-pass" SECRET="a-long-random-string" npm start
```

## Production notes (next steps toward a real product)

- Swap the `content.json` file store for a database (Postgres/SQLite) — the read/write functions in `server.js` are the only thing to change.
- Put it behind HTTPS (a reverse proxy such as Caddy/Nginx, or a host like Render/Fly/Railway).
- Add per-user accounts + roles instead of a single admin password, and store uploaded images as files/object storage rather than base64 in JSON.

## Payments (Stripe) — to enable

The API exposes `GET /api/plans` and a `POST /api/billing/checkout` **scaffold** (returns 501 until configured). To go live:

1. `npm install stripe`
2. Set `STRIPE_SECRET` (and a `STRIPE_WEBHOOK_SECRET`).
3. In `checkout`, create a Stripe Checkout Session and return its URL; handle the `checkout.session.completed` webhook to set the user's `plan = "pro"`.
4. `pricing.html` already calls the endpoint and shows the returned message/URL.

## CAD interoperability — plan

Today: **DXF** export + import (LWPOLYLINE room outlines, round-trips), plus **OBJ** and **PDF**.

To reach professional round-trip:
- **DWG**: convert DXF↔DWG server-side via the ODA File Converter or a service (Autodesk Forge/APS). Add `POST /api/convert`.
- **IFC/BIM**: export walls as IFC (IfcWall/IfcSpace) so plans open in Revit/ArchiCAD; import IFC to reconstruct rooms.
- **Robust DXF import**: parse arbitrary architect files (LINE/ARC/INSERT/blocks, layers, units) and infer rooms from closed wall loops.
