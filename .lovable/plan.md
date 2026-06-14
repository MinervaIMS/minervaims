# Alumni Ticker — Pause Glitch Fix

## Where it comes from

The four scrolling rows live in `src/components/shared/AlumniTicker.tsx`. Each row uses a pure-CSS `@keyframes` animation (`mimsLeft` / `mimsRight`) on `.mims-track`, and hover pauses it by toggling the inline `animationPlayState` between `running` and `paused`.

Two things conspire to produce the "snaps to a slightly different position" glitch:

1. **Duration mutates while the animation is running.** A `ResizeObserver` plus per-image `load`/`error` listeners call `setDuration(half / pps)` as logos decode and as the track is measured. CSS animations preserve *elapsed time*, not *progress*, when `animation-duration` changes — so each duration update instantly remaps the current `translateX` to a new point on the new timeline. The track visually jumps.

2. **Pause + GPU layer rounding.** While running, `.mims-track` is a composited layer with sub-pixel `transform` interpolation. The moment `animation-play-state: paused` is committed, the browser commits the current computed transform value; depending on the frame, that committed value can differ from the last painted sub-pixel position by ~1 px. Combined with (1), that's the glitch the user sees — most visibly right when the cursor enters a row.

A secondary contributor: as the cursor crosses from one row into another, `hoveredId` changes and all four bands re-render. The leaving band briefly resumes (one frame at the old transform) before settling, which can also look like a tiny jump.

## Fix

Stop driving pause/resume through `animationPlayState` and let the Web Animations API freeze the exact current transform. Also stop mutating `animation-duration` after the first measurement so the running track never gets re-mapped.

### Changes in `src/components/shared/AlumniTicker.tsx`

1. **Acquire the actual animation handle.** After mount, read `el.getAnimations()[0]` for each track and keep a ref to it. This is the live `Animation` instance the browser is running.

2. **Pause / resume via the Animation API.**
   - On `onMouseEnter`: call `animation.pause()`. This commits the precise current time — no rounding shift, no re-rasterization jump.
   - On `onMouseLeave`: call `animation.play()`. Resumes from the exact same `currentTime`.
   - Remove the `animationPlayState: paused | running` style toggle entirely (keep the `prefers-reduced-motion` CSS rule).

3. **Freeze duration after first valid measurement.** Once `measure()` produces a non-zero half-width and all images in the track have resolved (`complete === true` for every `<img>`), tear down the per-image `load` listeners and the `ResizeObserver`. After that point, `duration` never changes for the lifetime of the row, so the running animation is never re-timed. Keep one re-measure path: an `isMobile` change (re-mounts the effect anyway).

4. **Pixel-snap the track to remove the sub-pixel commit shift.** Add `transform: translateZ(0)` to `.mims-track`'s inline style (alongside `will-change: transform`) to keep the layer composited the same way whether running or paused, so the committed transform on pause matches the last painted frame.

5. **Avoid the cross-row resume flash.** Change the hover model so each `TickerBand` owns its own paused state via `onMouseEnter` / `onMouseLeave` on its own ref (the band already does this; just stop lifting `hoveredId` to the parent). That way moving the cursor from row 1 into row 2 doesn't re-render row 1 — it only fires that row's `mouseleave` → `animation.play()`, with no intermediate React render of the other three bands.

### Acceptance criteria

- Hovering any of the four rows pauses it instantly with no visible horizontal shift of the logos.
- Moving the cursor across rows does not cause any other row to flicker.
- After all logos have decoded, the row's scroll speed stays constant — no re-timing snaps mid-animation.
- `prefers-reduced-motion: reduce` still pauses all four rows.

### Out of scope

- No changes to the logo list, row directions, fade-vignette, or speeds.
- No changes to mobile breakpoints or band heights.
