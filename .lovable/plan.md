## Problem

The current duration formula assumes every logo occupies the same horizontal space:

```
duration = logos.length * SECONDS_PER_LOGO
```

That is only true if each slot is the same width. In reality logos render at their natural aspect ratio (capped by `maxWidth: 650px` / `maxHeight: 40px`), so a wordmark like "Toulouse School of Economics" takes far more pixels than a square mark like "ETH Zurich". Rows with more wide wordmarks therefore have a longer track but the same animation duration → they scroll visibly faster. That is what you are seeing.

To make perceived speed truly uniform, duration must be derived from the **actual rendered track width**, not the logo count.

## Fix

In `src/components/shared/AlumniTicker.tsx`, replace the count-based duration with a measured-width duration:

1. Add a ref to the inner scrolling track in `TickerBand`.
2. After the logos load, measure `trackRef.current.scrollWidth / 2` (half, because the array is duplicated for the seamless loop) — that is the true distance one full cycle travels.
3. Compute `duration = trackWidth / PIXELS_PER_SECOND`, where `PIXELS_PER_SECOND` is a single shared constant (e.g. 40 px/s desktop, 20 px/s mobile — slightly slower than the current pace, matching the speed you liked).
4. Recompute on:
   - all images' `onLoad` (use a counter — once all are loaded, measure)
   - window resize (ResizeObserver on the track)
   - `isMobile` change
5. Apply the duration via inline style on the track (`animationDuration: \`${duration}s\``), keeping the existing `linear infinite` keyframes untouched so the seamless -50% loop math still works.
6. Remove `SECONDS_PER_LOGO` (no longer needed).

Result: every row scrolls at exactly the same pixels/second regardless of how many wide vs. square logos it contains.

### Technical notes

- Measurement must happen after images decode, otherwise `scrollWidth` reflects only the alt-text fallback width. Hence the load-counter gate.
- Until the first measurement completes, render with a sensible default duration (e.g. 60s) so there is no visible jump — the swap to the measured value is imperceptible because the animation is linear and infinite.
- No change to keyframes, gap, fade overlay, hover-pause, or the duplicated-array loop technique.
- No other files affected.
