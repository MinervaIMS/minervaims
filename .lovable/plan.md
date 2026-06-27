## Where the glitch comes from

Two issues compound on a first mobile visit:

1. **The logo file is huge and decodes top‑down.** `src/assets/logo-white.svg` (250 KB) and `logo-color.svg` (307 KB) are not real vector SVGs — they are SVG wrappers around a 2000×2000 **base64 PNG**. PNG decodes in scanlines on slow connections, so the top portion paints first while the rest streams in. That is exactly the "upper‑left quarter appears first, then the rest" effect you are seeing. On a fast desktop refresh it's invisible; on cold mobile cellular it's very visible.

2. **The preloader is a React component**, not part of the initial HTML. On a cold visit the browser has to: download `index.html` → download `main.tsx` chunk → boot React → render `<PageLoader />` → only then start fetching the logo asset. So before the loader even shows, the screen is blank; then the giant logo streams in unevenly. The loader has no priority over the rest of the JS/CSS.

## Plan

### 1. Replace the logo asset with a lightweight version
- Generate compact bitmap copies of the two logos optimised for the loader size (logo renders at ~48 px tall → 192 px @ 4x is plenty):
  - `src/assets/logo-white-loader.webp` (~5–10 KB)
  - `src/assets/logo-color-loader.webp` (~5–10 KB)
- Keep the original 2 MB SVGs only where a giant logo is actually used; switch `PageLoader.tsx` and the inline HTML loader (below) to the small WebPs.
- A small WebP decodes in one pass, eliminating the scanline reveal.

### 2. Inline the preloader directly in `index.html`
- Add a `<style>` block in `<head>` with the loader's layout (fixed full‑screen, background, centered img, pulse keyframes).
- Add the loader markup inside `<div id="root">` so it is part of the server‑sent HTML and paints on the very first frame, before any JS runs. React will replace `#root`'s contents on mount, automatically removing it.
- Use the small WebP via a plain `<img>` with `fetchpriority="high"` and `decoding="sync"`.

### 3. Give the logo absolute network priority
- Add `<link rel="preload" as="image" href="/src/assets/logo-color-loader.webp" fetchpriority="high">` (and the white variant) in `<head>`, ahead of the existing `homepage-bg.webp` preload.
- Lower the homepage background preload to `fetchpriority="low"` so it doesn't compete with the logo on a 3G/4G handshake.

### 4. Keep the React `PageLoader` component
- It still renders for route transitions after boot; just point it at the new small WebPs so subsequent loads are equally crisp.
- No changes to how pages use `<Suspense fallback={<PageLoader/>}>`.

### Technical notes
- Inline loader will be ~1 KB of CSS + markup, no JS — safe in `<head>`/`<body>` per the HTML5 rules in the system prompt (no `<noscript>` tricks).
- React's root mount call (`createRoot(root).render(...)`) wipes the inline loader automatically; no manual removal script needed.
- Dark‑mode handling in the inline loader: use `prefers-color-scheme` media query inside the inline `<style>` to pick which `<img>` is visible, mirroring the current Tailwind `dark:` logic.
- Original heavy logo SVGs are left untouched for any place that still imports them; no risk to existing pages.

### Out of scope
- No changes to routing, navigation, page content, or design tokens.
- No new fonts/colors/components.
