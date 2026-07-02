## What's happening

The mobile/tablet intro is `src/components/shared/Preloader.tsx`, rendered from `src/App.tsx` on viewports `<1024px`, once per tab session (guarded by `sessionStorage["__mims_intro__"]`). The gating and mount logic still work — the animation itself has been shortened and half of it was removed, which is why it now reads as a flash.

## Why it feels like a flash

Original spec (chat #1276): "~3.2 seconds… a deep-navy #1F0F4D panel expands from the centre of the screen to full-width (vertical wipe), the white logo fades in and settles, then after a short pause everything reverses — the logo fades out and the panel contracts back to nothing", all with `power2.inOut` easing.

Current `Preloader.tsx` timeline (total ≈ 2.46s):
```text
gsap.set(overlay, { scaleX: 1 })   // panel starts ALREADY full-width — opening wipe deleted
logo fade in     0.48s   power1.out
hold             0.88s
logo fade out    0.38s   power1.in
overlay 1 → 0    0.72s   power2.inOut   // only the closing wipe survives
```

Two regressions vs. the original:

- **The opening vertical wipe is missing.** The panel is initialised at `scaleX: 1`, so it never expands from the centre. On mobile the inline `#initial-loader` in `index.html` (same #1F0F4D + logo) is already covering the screen when React mounts, so there's no visible transition between the HTML splash and the Preloader — the eye just sees "purple, purple, close-wipe".
- **Overall duration was shortened** from ~3.2s to ~2.46s and the easings on the logo were changed from `power2.inOut` to `power1.*`, which makes the remaining motion feel abrupt.

Net effect on mobile: the only motion actually perceived is the ~0.72s closing wipe → "flash".

There is also a secondary stability bug: `Preloader`'s `useEffect` depends on `[onComplete]`, and `handlePreloaderComplete` in `App.tsx` is a new function reference on every App render. Any re-render of `App` while the intro is playing would run cleanup (`tl.kill()`) and restart the timeline — a subtle way to further shorten what the user sees. Not currently firing in a visible way, but worth fixing while we're in the file.

## Fix

Rewrite the GSAP timeline in `src/components/shared/Preloader.tsx` to match the original ~3.2s spec, restoring the opening wipe and slower easings. Nothing else changes.

New timeline in `Preloader.tsx`:
```text
gsap.set(overlay, { scaleX: 0, transformOrigin: "center center" })
gsap.set(logo,    { opacity: 0, scale: 0.94 })

overlay scaleX 0 → 1   duration 0.75  ease "power2.inOut"   // opening wipe
logo    opacity/scale  duration 0.55  ease "power2.out"     // settle in
hold                    duration 0.90
logo    opacity 0.9→0  duration 0.45  ease "power2.in"      // fade out
overlay scaleX 1 → 0   duration 0.75  ease "power2.inOut"   // closing wipe
                       ≈ 3.4s total
```

Also capture `onComplete` in a ref inside `Preloader` and drop it from the `useEffect` dependency array, so a parent re-render can't kill and restart the timeline mid-play.

## Out of scope

- No changes to `index.html`'s `#initial-loader` (still mobile‑only, still instant).
- No change to the `<1024px` gating or the `sessionStorage["__mims_intro__"]` once-per-session rule.
- No visual/design changes beyond restoring the original motion (same #1F0F4D panel, same white logo, same clamp sizing).

## Verification

On a mobile viewport with `sessionStorage.removeItem("__mims_intro__")` and a hard reload:

1. Inline `#initial-loader` paints immediately (dark purple + pulsing logo).
2. GSAP Preloader mounts: opening wipe expands from centre (~0.75s), logo settles (~0.55s), holds (~0.9s), logo fades (~0.45s), closing wipe contracts (~0.75s), homepage revealed.
3. Reload again in the same tab → no intro (sessionStorage guard).
4. Desktop (≥1024px) → no intro at all.
