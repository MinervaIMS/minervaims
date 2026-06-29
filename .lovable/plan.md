The user wants the mobile initial loader (the `#initial-loader` shown before React hydrates) to visually cover the entire screen on mobile, including the top and bottom browser chrome areas, with the brand purple background.

## What I found

- The initial mobile loader lives as inline CSS/HTML in `index.html` (`#initial-loader`).
- It is scoped to `@media (max-width: 767px)` and currently uses `position:fixed; inset:0` with a white (light mode) / black (dark mode) background.
- The user's screenshot shows a purple loader with white bars at the very top (iOS status bar) and bottom (Safari tab bar). Web content cannot paint over those browser chrome areas, but Safari 15+ colours them using the `theme-color` meta tag.

## Plan

### 1. Change loader background to brand purple

Update the `#initial-loader` inline styles in `index.html` so the background is `#1F0F4D` in **both** light and dark mode (removing the white/black split).

### 2. Ensure full dynamic viewport coverage

Replace `inset:0` with explicit `width: 100dvw; height: 100dvh; top: 0; left: 0;` so the loader fills the dynamic viewport on mobile Safari and does not shrink when the URL bar collapses/expands.

### 3. Match browser chrome colour

- Update `<meta name="theme-color" content="#000000">` to `#1F0F4D` so iOS Safari tints the status bar and bottom tab bar to the same purple.
- Add `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">` so the status-bar text remains readable over the purple backdrop.

### 4. Align manifest colours

Update `public/manifest.json`:
- `theme_color`: `#1E2047` → `#1F0F4D`
- `background_color`: `#FFFFFF` → `#1F0F4D`

This keeps the PWA splash screen consistent with the in-browser loader.

### Files to change
- `index.html`
- `public/manifest.json`

No other components or pages are affected.