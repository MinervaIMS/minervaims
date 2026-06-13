## Problem identified

The Application Journey activation depends on `useInView` observing the journey container with `threshold: 0.2`. That means at least 20% of the whole journey block must be visible before `journey.inView` becomes true.

Because the journey block is tall and placed below several large sections, on some scroll positions/viewports the heading and first step can be visible while the observed container still has not crossed the 20% intersection threshold. The result is that the dots/line appear inactive, so it feels like the effect “doesn't activate.”

There is also a secondary issue: the trigger is attached to the content wrapper, not the section itself, so activation happens later than expected.

## Proposed solution

Update only the Application Journey trigger logic in `src/pages/Join.tsx`:

1. Attach the `journey.ref` to the full Application Journey `<section>` instead of the inner `max-w-[54rem]` wrapper.
2. Make the observer trigger earlier and more reliably by using a lower threshold, e.g. `threshold: 0.05`.
3. Keep the existing sequential lighting behavior, timing, gradient fill, geometry, and content unchanged.
4. Leave the removed `Reveal` fade-ins untouched, so text still appears immediately and remains consistent with the rest of the site.

## Expected result

When the Application Journey section enters the viewport, the step dots and rail fill activate sequentially without requiring the user to scroll unusually far into the section.