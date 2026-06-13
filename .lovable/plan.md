# Fix: Scroll glitch on /people/alumni

## Root cause

In `src/pages/Alumni.tsx` the search/filters block is `sticky top-16` and also subscribes to `window.scroll` to flip an `isSticky` state when `rect.top <= 64`. When `isSticky` becomes true, several things inside the bar are hidden:

- The "Search" label (mobile only)
- The three filter `<select>`s (Job Area, Company, City) on mobile
- The "Showing X of Y" counter (mobile only)

This shrinks the sticky bar's height significantly while you're scrolling. On mobile the filters are stacked, so the height delta is large (~200px+). That causes two visible problems:

1. **Layout jump** at the boundary between the founders/filters area and the alumni list: when the bar collapses, the document below it shifts up, which makes the page appear to "jolt" right where the sticky bar meets the list.
2. **Boundary oscillation**: shrinking the bar can move its own `rect.top` back above 64px on slow/inertial scrolls, briefly flipping `isSticky` back to false → bar re-expands → flips true again. This produces the small jitter the user noticed, and it can also occur on desktop near the threshold (though it's less visible there because only the labels hide).

Two secondary contributors:

- `setIsSticky` is called on every scroll frame even when the value hasn't changed → unnecessary re-renders during scroll.
- The bar uses `-mx-4 px-4 md:-mx-6 px-6` which can interact with body horizontal padding when it becomes sticky and cause a 1px horizontal shift in some viewports.

## Fix

Remove the scroll-driven shrinking of the sticky bar entirely. The bar stays the same height whether sticky or not — that eliminates both the layout jump and the oscillation. Specifically in `src/pages/Alumni.tsx`:

1. Delete the `isSticky` state, the `searchBarRef`, and the `useEffect` that adds the `scroll` listener (lines 40–41, 48–59).
2. Remove every `${isSticky ? ... : ''}` conditional class on the labels, filter wrappers, and the "Showing X of Y" paragraph (lines 232, 249, 267, 285, 303). Labels, filters, and the counter render the same way whether the bar is sticky or not.
3. Keep `sticky top-16 z-20` and the background/border so the bar still pins under the header.
4. On mobile, to keep the sticky bar from taking up too much vertical space when pinned, set `max-height: calc(100vh - 4rem)` and `overflow-y: auto` on the sticky container so it can scroll internally if needed instead of resizing the page. This is a static rule, not scroll-driven, so it does not cause jitter.

## Technical details

- Files touched: `src/pages/Alumni.tsx` only. No data, types, or other components change.
- No new dependencies.
- Result: the sticky filter bar has a constant height; scrolling past it produces no document reflow, so the seam between the filters and the alumni list no longer flickers on mobile, tablet, or desktop.

## Verification

- Load `/people/alumni` on mobile viewport (375px) and scroll from the founders section down through the alumni list — boundary between filters and list should be smooth, no jolt, no flicker.
- Repeat at 768px and 1440px.
- Confirm filters and search still work and stay accessible while pinned.
