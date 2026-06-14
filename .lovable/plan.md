## Goal

Make the four alumni ticker rows scroll perfectly smoothly while still supporting manual horizontal scrolling (wheel / drag / swipe) with seamless infinite looping in both directions.

## Root cause of the current choppiness

The current implementation drives `band.scrollLeft += dir * pps * dt` every animation frame. Two problems compound:

1. **Integer rounding.** Chromium snaps the *read* value of `scrollLeft` to whole CSS pixels. At 55 px/s ÷ 60 fps the per-frame increment is ~0.92 px, so half the frames effectively move 0 px and the other half jump 1 px — visible stutter even though the float accumulator is correct.
2. **Main-thread work per frame.** Writing `scrollLeft` triggers scroll events, our wrap handler, and a synchronous layout/scroll-anchor reconciliation on the main thread. A CSS `transform`, by contrast, is composited on the GPU with sub-pixel precision and zero main-thread cost during steady-state.

## Solution: dual-mode (transform for auto, scrollLeft for manual)

Each `TickerBand` operates in one of two modes:

- **AUTO mode (default).** The track translates via a CSS `@keyframes` animation (`translateX(0) → translateX(-period)`) running on a Web Animation handle. The scroll container's `scrollLeft` stays at `0`. This is GPU-composited and is the smoothest path the platform offers.
- **MANUAL mode (during user interaction).** The transform animation is paused, its current `translateX` is read once, folded into the container's `scrollLeft`, the transform is then cleared, and the container takes over. The user's wheel / drag / swipe moves `scrollLeft` natively. A wrap handler keeps `scrollLeft` inside `[period, 2 * period)` so looping is seamless in both directions.

On mouse-leave / touch-end the band hands control back to AUTO mode: read current `scrollLeft`, fold it back into a starting transform offset, restart the keyframe animation from that point, reset `scrollLeft` to 0. The hand-off is single-frame and invisible because all three copies of the logo set are identical.

## Implementation details

1. **Exact period.** Keep the existing `offsetLeft(child[N]) − offsetLeft(child[0])` measurement (we already added this) — it's the only way to avoid the `gap/3` error.
2. **Track content.** Keep 3 copies of the logo set. The CSS animation runs from `0` to `-period` (one set), iterations `Infinity`, easing `linear`. The middle copy gives manual scrolling runway in both directions.
3. **Web Animations API.** Build the animation imperatively via `track.animate(...)` once the period is known. We get `animation.currentTime`, `pause()`, `play()`, and `effect.updateTiming({ duration })` without touching CSS strings.
4. **Auto → Manual hand-off** (on `mouseenter` / `touchstart` / `wheel`):
   - `animation.pause()`
   - Read `tx = currentTransformX` (from `animation.currentTime` and known duration; no `getComputedStyle` required).
   - Set inline `transform: translateZ(0)` (no X offset).
   - Set `band.scrollLeft = period + (-tx)`  // park inside the middle copy.
5. **Manual → Auto hand-off** (on `mouseleave` / `touchend` / debounced after wheel stops):
   - Read current `scrollLeft`, normalise to `s ∈ [0, period)`.
   - Set inline `transform: translateX(-s) translateZ(0)`.
   - Set `band.scrollLeft = 0`.
   - Restart the WAAPI animation with `currentTime` set so the running transform continues from `-s`.
6. **Manual wrap handler.** When in manual mode only, the scroll event listener wraps `scrollLeft` inside `[period, 2 * period)`. Suppress this in auto mode (scrollLeft is pinned at 0).
7. **Prefers-reduced-motion.** Skip the keyframe animation entirely; the row simply stays put but is still manually scrollable.
8. **GPU hints.** `will-change: transform`, `transform: translateZ(0)`, `backface-visibility: hidden` on the track (already present). Add `contain: layout paint` on the band for good measure.
9. **No per-frame JS.** Remove the rAF tick loop and `overflow-anchor: none` (no longer needed once we stop writing scrollLeft per frame).

## Files

- `src/components/shared/AlumniTicker.tsx` — replace the rAF-driven `TickerBand` body with the dual-mode implementation above. CSS string at the top of the file gets one `@keyframes mimsSlide` rule again. No changes to `AlumniTicker`, `LogoItem`, or the `ROWS` data.

## Acceptance criteria

- All four rows scroll continuously and visibly smoothly on desktop and mobile, with no per-frame stutter.
- Hovering / touching / wheeling a row pauses it instantly with no positional jump, and manual scrolling moves the row immediately.
- Scrolling past the end in either direction loops seamlessly — no visible snap, no dead zone.
- Releasing the row (mouse-leave, touch-end, or 250 ms after a wheel stops) resumes auto-scroll from exactly where the user left it.
- `prefers-reduced-motion: reduce` halts auto-scroll on all rows; manual scrolling still works.