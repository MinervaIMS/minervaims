// =====================================================================
// pinned-scroll — let a sideways gesture drive a pinned section.
// ---------------------------------------------------------------------
// Three sections of the site pin themselves and turn vertical scrolling
// into horizontal travel: Our Divisions on the homepage, Our Divisions on
// /join, and Our History on /about.
//
// Once the content is visibly moving sideways, reaching for a sideways
// gesture is the natural thing to do, and until now it did nothing: a
// trackpad swipe or a horizontal flick produced no travel at all, because
// the page has no horizontal scroll to give. This module bridges the gap.
// A predominantly horizontal gesture over a pinned section is converted
// into the equivalent vertical page scroll, so both axes advance the same
// animation and neither feels broken.
//
// Two rules keep it from ever trapping the reader:
//
//   * only PREDOMINANTLY horizontal gestures are claimed. A diagonal or
//     vertical one is left alone entirely, so ordinary scrolling past the
//     section is untouched;
//   * the bridge releases at the ends. Swiping further left once the run
//     is at its start, or further right once it is finished, is handed
//     back to the page, so a reader can always leave in the direction
//     they are already going.
// =====================================================================

export interface PinnedScrollOptions {
  /** The section's own scroll progress, 0 to 1. Read at gesture time. */
  progress: () => number;
  /** False while the section is not pinned (short viewport, reduced motion). */
  enabled: () => boolean;
}

/**
 * Bind the bridge to a pinned section's outer element.
 * Returns the unbind function.
 */
export function bindPinnedScroll(el: HTMLElement, options: PinnedScrollOptions): () => void {
  const { progress, enabled } = options;

  /** True when travel in this direction still has somewhere to go. */
  const hasRoom = (delta: number) => {
    const p = progress();
    if (delta > 0) return p < 0.999;
    if (delta < 0) return p > 0.001;
    return false;
  };

  const onWheel = (e: WheelEvent) => {
    if (!enabled()) return;
    const dx = e.deltaX;
    const dy = e.deltaY;
    // Leave anything that is not clearly a sideways gesture to the page.
    if (Math.abs(dx) <= Math.abs(dy) * 1.2 || Math.abs(dx) < 2) return;
    if (!hasRoom(dx)) return;
    e.preventDefault();
    window.scrollBy({ top: dx, behavior: 'auto' });
  };

  // Touch: a horizontal flick over the section scrolls the page by the
  // same distance, so the cards travel with the finger.
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let claimed: boolean | null = null;

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) { claimed = false; return; }
    startX = lastX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    claimed = null;
  };

  const onTouchMove = (e: TouchEvent) => {
    if (claimed === false || !enabled() || e.touches.length !== 1) return;
    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;

    if (claimed === null) {
      const dx = Math.abs(x - startX);
      const dy = Math.abs(y - startY);
      // Wait for the gesture to declare itself before taking it.
      if (dx < 8 && dy < 8) return;
      claimed = dx > dy * 1.2;
      if (!claimed) return;
    }

    const step = lastX - x;
    lastX = x;
    if (!hasRoom(step)) { claimed = false; return; }
    if (e.cancelable) e.preventDefault();
    window.scrollBy({ top: step, behavior: 'auto' });
  };

  const onTouchEnd = () => { claimed = null; };

  el.addEventListener('wheel', onWheel, { passive: false });
  el.addEventListener('touchstart', onTouchStart, { passive: true });
  el.addEventListener('touchmove', onTouchMove, { passive: false });
  el.addEventListener('touchend', onTouchEnd);
  el.addEventListener('touchcancel', onTouchEnd);

  return () => {
    el.removeEventListener('wheel', onWheel);
    el.removeEventListener('touchstart', onTouchStart);
    el.removeEventListener('touchmove', onTouchMove);
    el.removeEventListener('touchend', onTouchEnd);
    el.removeEventListener('touchcancel', onTouchEnd);
  };
}
