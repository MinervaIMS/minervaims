## Problem

On the 6 legal/technical/privacy pages, in tablet and mobile view the collapsible "Contents" dropdown has two bugs:

1. **TOC links are underlined.** The collapsible TOC (`<details class="lp-toc-collapse">`) is rendered *inside* `.lp-content` in `LegalLayout.tsx`. The global rule in `src/styles/legal-system.css` underlines every link inside `.lp-content`:
   ```css
   .legal-doc .lp-content a:not(.lp-backtop):not(.anchor) { text-decoration: underline; ... }
   ```
   This unintentionally catches the TOC links.

2. **Links scroll to the wrong place.** In `handleNav` (`LegalLayout.tsx`), the code measures the target's `getBoundingClientRect().top` and scrolls **while the `<details>` is still open**. The open dropdown adds significant vertical height above the target. Then `setTocOpen(false)` collapses it on the next render, removing that height — and the page ends up scrolled past the target. The fixed `-112px` offset (sized for the desktop header) is also wrong on mobile, where the sticky header is shorter.

## Fix

Two small, scoped changes to the legal layout — no other files touched.

### 1. `src/styles/legal-system.css`
Exclude TOC-collapse links from the underline rule:
```css
.legal-doc .lp-content a:not(.lp-backtop):not(.anchor):not(.lp-toc-collapse a) { ... }
```
(or equivalently add an override `.legal-doc .lp-toc-collapse a { text-decoration: none; }` — cleaner and avoids selector gymnastics).

### 2. `src/components/shared/LegalLayout.tsx` — `handleNav`
- Close the `<details>` *before* computing the scroll target, so the page layout matches what the user will see after the click.
- Use the actual sticky-header height instead of the hard-coded `112`. Either measure `document.querySelector('header')` height, or use a smaller offset on mobile (e.g. responsive: `window.innerWidth < 1024 ? 80 : 112`).
- Wrap the scroll in a `requestAnimationFrame` (or `setTimeout(..., 0)`) after the state update so the DOM has reflowed before we measure `getBoundingClientRect`.

Sketch:
```ts
const handleNav = (e, id) => {
  e.preventDefault();
  setTocOpen(false);
  requestAnimationFrame(() => {
    const el = document.getElementById(id);
    if (!el) return;
    const headerH = document.querySelector('header')?.getBoundingClientRect().height ?? 96;
    const top = el.getBoundingClientRect().top + window.scrollY - (headerH + 16);
    window.scrollTo({ top, behavior: 'smooth' });
    history.replaceState(null, '', `#${id}`);
  });
};
```

### Verification
After the change, in tablet (768px) and mobile widths:
- TOC links in the Contents dropdown render with no underline.
- Clicking any TOC entry collapses the dropdown and lands the target section just below the sticky header, with the section title visible.
- Desktop sidebar TOC behavior is unchanged.