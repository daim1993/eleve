# ✦ Glass Morphism · Interior + Exterior Design Studio
### *Website Concept & Feature Plan*

---

## 1. Overall Vision

- **Vibe:** futuristic, airy, immersive, minimalist
- **Core style:** glass-morphism (frosted glass, blur, translucent layers)
- **Mesmerizing effects:** animated gradients, floating 3D geometric shapes, slow parallax, soft glow orbs
- **Audience:** high-end residential & commercial clients

---

## 2. Color Palette

| Usage | Color | Hex |
|-------|-------|-----|
| Background | Deep indigo / midnight | `#0b0d14` |
| Glass base | White with opacity | `rgba(255,255,255,0.08)` |
| Glass border | Soft white / violet | `rgba(255,255,255,0.2)` |
| Glow accents | Purple, blue, pink | `#a855f7`, `#3b82f6`, `#ec4899` |
| Primary text | White / off-white | `#f1f5f9` |
| Secondary text | Light grey | `#94a3b8` |

---

## 3. Mesmerizing Effects (Motion Design)

- **Animated gradient orbs** – 3 large blurred circles moving slowly across the background (infinite loop)
- **Floating 3D cube** – rotates continuously with semi-transparent faces (glass style)
- **Glass card hover** – cards lift slightly, blur intensifies, border glow pulses
- **Slow parallax** – background elements move at different speeds on scroll
- **Typing / fade-in text** – hero headline appears with a soft reveal

---

## 4. Page Structure (5 sections)

### 4.1 Hero Section
- Full-viewport glass overlay
- Main headline: *"Where Space Becomes Emotion"*
- Subtext: *Interior · Architecture · Exterior*
- CTA button: "Explore our world" (glass button with glow)
- Background: large floating glass ring (3D CSS or canvas)

### 4.2 Services (Interior + Exterior)
- Two glass cards side-by-side
  - **Interior:** residential, office, retail, lighting design
  - **Exterior:** facades, landscaping, rooftop, pergolas
- Each card: icon, title, short description, "Learn more" link
- Hover: card expands slightly, blur increases, border glows

### 4.3 Portfolio Showcase
- Grid of 6 project thumbnails (glass-morphism frames)
- Each thumbnail: image placeholder, project name, category tag
- Hover: image zooms, glass overlay appears with brief description
- "View all projects" glass button at bottom

### 4.4 Testimonials
- Carousel of 3 client quotes
- Each quote inside a glass card with avatar placeholder
- Navigation dots (glass style)
- Auto-slide with pause on hover

### 4.5 Contact / Studio Info
- Left: glass card with address, phone, email, social icons
- Right: simple contact form (name, email, message) in glass style
- Submit button: glass with gradient border
- Background: subtle pulsing orb behind the section

---

## 5. Glass-morphism Design System

| Element | Style |
|---------|-------|
| Background | `rgba(255,255,255,0.05)` to `0.12` |
| Backdrop blur | `blur(12px)` to `blur(24px)` |
| Border | `1px solid rgba(255,255,255,0.15)` |
| Box shadow | `0 8px 32px rgba(0,0,0,0.3)` |
| Border radius | `20px` (cards), `60px` (buttons) |
| Inner glow | subtle white inset shadow (optional) |

---

## 6. Interactive Behaviors

| Trigger | Effect |
|---------|--------|
| Page load | Orbs start floating, cube rotates, text fades in |
| Hover on glass card | Scale `1.02`, shadow deepens, border brightens |
| Hover on button | Background becomes more opaque, glow expands |
| Scroll | Parallax shift on orbs and cube |
| Click on nav | Smooth scroll to section |

---

## 7. Tech Stack Suggestions

- **Framework:** React or Next.js (for component reuse)
- **Styling:** Tailwind CSS + custom glass utilities
- **Animations:** Framer Motion (for smooth, declarative animations)
- **3D elements:** Three.js (for the floating cube / glass ring)
- **Orbs:** CSS keyframes or canvas

---

## 8. Performance & Accessibility

- Use `prefers-reduced-motion` to respect user settings
- Lazy-load images and 3D assets
- Keep glass blur values moderate for performance
- Ensure contrast ratios (text on glass) meet WCAG AA

---

## 9. Future Enhancements

- Dark / light mode toggle (glass adapts)
- 360° room viewer (Three.js)
- AI-powered style recommendation chatbot

---

## 10. Inspiration Keywords

`#glassmorphism` `#uiux` `#interiordesign` `#exteriorarchitecture` `#3dweb` `#framer` `#neubrutalism` (soft version)

---

> **Created by:** Experience Elysian
> **Last updated:** June 2026
