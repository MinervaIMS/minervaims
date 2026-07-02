## Diagnosis

The glitch was introduced by the page-fade wrapper we just added to `src/components/layout/Layout.tsx`:

```tsx
<div key={pathname} className={isChromeless ? undefined : 'animate-page-in'}>
  <Outlet />
</div>
```

with CSS in `src/index.css`:

```css
@keyframes pageIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: none; }
}
.animate-page-in { animation: pageIn 0.35s ease-out both; }
```

On every route change the wrapper remounts (because of `key={pathname}`) and starts at `opacity: 0`. During those ~350ms:
- The Suspense fallback (`PageLoader`, positioned `fixed inset-0`) is also inside that wrapper, so it too is invisible — the loading screen never appears.
- `<main class="flex-1">` still fills the viewport, so `<Footer />` stays pinned to the bottom of the empty area and becomes the only visible chrome for a fraction of a second → "footer flashes before the page".

## Fix

Revert the two pieces we added for the page-fade:

1. `src/components/layout/Layout.tsx` — drop the wrapper div, restore the plain `<Outlet />`.
2. `src/index.css` — remove the `@keyframes pageIn` block and the `.animate-page-in` rule.

The global `select` / `[role='combobox']` flat-styling block we added in the same commit stays — it is unrelated to this glitch.

No other files change. `PageLoader` will show again during Suspense as before, and the footer will only appear once the page content has actually rendered.

## Out of scope

- Preloader / GSAP intro
- Alumni, Events, Readings content changes from the same upload
