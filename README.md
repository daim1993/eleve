# Elysian — Interior + Exterior Design Studio

A glass-morphism marketing site built with **Next.js 14 (App Router)**, **Tailwind CSS**
and **Framer Motion**, featuring a mouse-reactive particle network, drifting glow orbs,
a rotating 3D glass cube, and scroll-driven parallax + reveal animations.

## Getting started

> If a `node_modules` folder already exists from a previous attempt, delete it first.

```bash
npm install
npm run dev      # http://localhost:3000
```

Build for production:

```bash
npm run build
npm start
```

## What's inside

| Path | Purpose |
|------|---------|
| `app/layout.jsx` | Root layout, fonts (Inter + Playfair Display), metadata |
| `app/page.jsx` | Assembles all sections + background layers |
| `app/globals.css` | Glass system, gradient text, 3D cube, reduced-motion support |
| `components/ParticleNetwork.jsx` | Canvas particle constellation (mouse-reactive) |
| `components/GlowOrbs.jsx` | Three drifting blurred color orbs |
| `components/FloatingCube.jsx` | CSS 3D rotating glass cube |
| `components/Reveal.jsx` | Scroll fade/slide-in wrapper |
| `components/Navbar.jsx` | Sticky glass nav (frosts on scroll) |
| `components/Hero.jsx` | Hero with parallax + staggered text reveal |
| `components/Services.jsx` | Interior / Exterior glass cards |
| `components/Portfolio.jsx` | 6-project grid with hover overlays |
| `components/Testimonials.jsx` | Auto-rotating quote carousel |
| `components/Contact.jsx` | Studio info + glass contact form |

## Animations (all four requested)

- **Particle network** — `ParticleNetwork.jsx`, connects nearby dots and links to the cursor.
- **Glow orbs** — `GlowOrbs.jsx`, slow infinite CSS drift.
- **Floating 3D shape** — `FloatingCube.jsx`, glass cube spinning + bobbing.
- **Scroll parallax + reveals** — Framer Motion `useScroll`/`useTransform` in `Hero.jsx`,
  `Reveal.jsx` on every section.

Respects `prefers-reduced-motion` for accessibility.

## Customizing

- Colors live in `tailwind.config.js` (`glassviolet`, `glassblue`, `glasspink`, `midnight`).
- Glass intensity, blur and glow are in `app/globals.css` under the `.glass*` classes.
- Replace the gradient placeholders in `Portfolio.jsx` with real `<Image>` photos when ready.
