# Fix: Figures band not loading on /join

## Diagnosis

The five-figure band ("2017 / Active Members / Alumni Network / Research Reports / 5") renders the purple panel but its content (numbers and labels) stays invisible. Two compounding issues in `src/pages/Join.tsx`:

1. **Per-cell `Reveal` wrappers stay at `opacity-0`.** Each figure cell is wrapped in `<Reveal>`, which starts `opacity-0` and only flips to visible when its own IntersectionObserver fires. On this section the observers are unreliable (the section is full-bleed with `left-1/2 … w-screen`, and the children are short — combined with the section's own observer this leaves cells stuck hidden in many cases, including the static "2017" and "5"). Result: an empty purple band.

2. **`CountUp` latches on the first `start=true` even when the value is still `0`.** It guards with `started.current` and re-runs only on the very first time `start` is true. If `figures.inView` flips true a tick before `keyFigures` has populated (e.g. cache miss, slow first paint), it animates `0 → 0` and never updates when the real numbers arrive.

## Changes (single file: `src/pages/Join.tsx`)

### 1. Remove per-cell `Reveal` wrappers in the figures band
Replace the `<Reveal key={f.label} …>` around each cell with a plain `<div className="text-center">`. The band already has its own `figures.ref` observer driving the count-up, so it never depended on per-cell reveals for the animation — they were only adding a fade that is now blocking visibility. Keep the surrounding section and `figures.ref` div untouched.

### 2. Make `CountUp` robust to late-arriving values
- Drop the `started.current` latch.
- Re-run the animation effect when `value` becomes non-zero after `start` is already true.
- Snap immediately to `value` when `prefers-reduced-motion` is set OR when `start` is false but `value > 0` should still display (always render the current `value` if `start` never becomes true, instead of staying at 0 — fallback so the figure is at minimum legible even if the observer misfires).

Concretely: initialize `n` to `0`; when `start && value > 0`, run the rAF animation from the current displayed `n` up to `value`; if `start` flips true and `value` is still 0, do nothing and re-trigger once `value` updates.

### 3. Safety net for the section observer
Lower the figures section threshold from `0.3` to `0.15` and add a fallback: if `figures.inView` has not become true within 1.2 s after mount, force it true. This guarantees the counters always start, even when the band is rendered fully in-viewport on load (where `IntersectionObserver` sometimes does not fire an initial intersecting entry on Safari/Firefox).

## Out of scope

No copy changes, no layout changes to other sections, no changes to `useKeyFigures`, no animation-memory updates, no Tailwind/CSS changes. Only `src/pages/Join.tsx` is touched.
