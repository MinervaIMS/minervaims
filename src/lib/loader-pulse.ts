// =====================================================================
// loader-pulse — one continuous pulse, however many loaders run.
// ---------------------------------------------------------------------
// The lock-up on the page loader and on the workspace loader breathes:
// it fades down and back up on a slow, deliberate cycle. That reads as
// intentional only while it is ONE cycle. It stopped being one.
//
// A single navigation frequently mounts the loader more than once. On a
// gated route the sequence is: the route's Suspense fallback while the
// chunk arrives, then PageVisibilityGate's own loader while it asks
// whether the page is published, then the page's loader while its data
// loads. Three separate components, three mounts, and a CSS animation
// starts at 0% every time it is mounted. Each restart snapped the mark
// back to full opacity, so instead of one slow breath the reader saw
// three quick ones in under a second - which is exactly the "much faster
// pulse" and "flickering" that shows up on some pages and not others.
// The pages that mount the loader once always looked correct.
//
// The cycle is therefore anchored to the module, not to the component.
// Every loader starts its animation with a NEGATIVE delay equal to the
// time already elapsed in the current cycle, so a loader mounting
// halfway through picks the breath up halfway through. Three mounts in a
// row now continue one unbroken pulse.
// =====================================================================

/** One full breath. Slow on purpose: this is ambience, not activity. */
export const PULSE_MS = 2800;

/** When this tab first needed a loader. The cycle is measured from here. */
const epoch = typeof performance !== 'undefined' ? performance.now() : 0;

/**
 * The inline style that puts a freshly mounted mark at the point the cycle
 * has already reached.
 *
 * Computed during render rather than in an effect: an effect would apply it
 * a frame after the mark has already painted at 0%, which is the very jump
 * this exists to remove.
 */
export function pulsePhaseStyle(): { animationDelay: string } {
  const now = typeof performance !== 'undefined' ? performance.now() : 0;
  const elapsed = (now - epoch) % PULSE_MS;
  return { animationDelay: `-${Math.round(elapsed)}ms` };
}
