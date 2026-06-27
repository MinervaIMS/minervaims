## Current state

The inline preloader in `index.html` (the `#initial-loader` div inside `#root`) currently shows on **every device** — mobile, tablet, and desktop — because there is no viewport restriction. The `<style>` block and the markup render unconditionally on first paint, and React only wipes it when it mounts into `#root`.

The same is true for the `<link rel="preload">` hints for `logo-color-loader.webp` and `logo-white-loader.webp` — they fire on every device.

So today: the loader works on mobile, tablet, AND desktop.

## What to change

Restrict the inline boot loader strictly to mobile (width < 768px, matching the project's `useIsMobile` breakpoint).

### 1. `index.html` — gate the loader visually by viewport
Wrap the existing `#initial-loader` CSS so it only displays under `(max-width: 767px)`:

```css
#initial-loader{display:none;}
@media (max-width: 767px){
  #initial-loader{position:fixed;inset:0;z-index:2147483647;display:flex;...}
  #initial-loader img{...}
  /* keep pulse + dark-mode rules nested inside the mobile media query */
}
```

Result: tablet and desktop get a blank `#root` for the brief moment before React mounts (same behaviour they had before the loader work), while mobile keeps the instant zero-JS loader.

### 2. `index.html` — keep logo preloads mobile-only too
Add `media="(max-width: 767px)"` to the two `<link rel="preload" as="image" ... fetchpriority="high">` tags for `logo-color-loader.webp` and `logo-white-loader.webp`, so tablet/desktop don't waste a high-priority request on an asset they won't display.

### 3. Leave `PageLoader.tsx` alone
The React `PageLoader` (used as `<Suspense>` fallback for route transitions) should continue to work on all viewports — it's a different concern from the cold-boot inline loader. The user's request is about the boot-time animation specifically.

### Out of scope
- No changes to routing, components, design tokens, or the `PageLoader` React component.
- No changes to the homepage background preload.

### Verification
After implementation, confirm via DevTools device toolbar that:
- Mobile (<768px): inline loader paints immediately on first HTML frame.
- Tablet/desktop (>=768px): no inline loader flash; React boots straight into the app.
