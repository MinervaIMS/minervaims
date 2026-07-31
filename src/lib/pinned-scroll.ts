// =====================================================================
// pinned-scroll — let a sideways gesture drive a pinned section.
// ---------------------------------------------------------------------
// Three sections pin themselves and turn vertical scrolling into
// horizontal travel: Our Divisions on the homepage, Our Divisions on
// /join, and Our History on /about. Once the content is visibly moving
// sideways, reaching for a sideways gesture is the natural thing to do,
// so a horizontal wheel, trackpad or touch gesture over one of them is
// converted into the equivalent vertical page scroll and both axes
// advance the same animation.
//
// TWO THINGS DEFEATED THE FIRST ATTEMPT, and both are worth stating
// because neither is visible in the component that uses this module:
//
//  1. `html { scroll-behavior: smooth }` is set globally. Every
//     programmatic scroll therefore became an ANIMATED one, and a
//     continuous gesture fires dozens per second, each cancelling and
//     restarting the last. The page crawled instead of tracking the
//     finger, which read as "nothing happens". Every scroll here is now
//     performed with that behaviour suspended for the duration of the
//     call, so the page moves exactly as far as the gesture did.
//
//  2. There was no `touch-action` on the pinned wrappers. With the
//     default `auto`, WebKit decides the gesture's axis at touch-start;
//     a horizontal swipe on a page with no horizontal overflow is
//     classified as "nothing to scroll", and from that moment every
//     touchmove is non-cancelable, so preventDefault is ignored and the
//     gesture cannot be claimed at all. The callers now declare
//     `touch-action: pan-y`, which reserves vertical panning for the
//     browser and hands horizontal gestures to us.
//
// Two rules keep the bridge from ever trapping the reader:
//
//   * only PREDOMINANTLY horizontal gestures are claimed, so ordinary
//     scrolling past the section is untouched;
//   * the bridge releases at the ends, so a reader can always leave in
//     the direction they are already going.
// =====================================================================

export interface PinnedScrollOptions {
  /** The section's own scroll progress, 0 to 1. Read at gesture time. */
  progress: () => number;
  /** False while the section is not pinned (short viewport, reduced motion). */
  enabled: () => boolean;
}

/**
 * Scroll the page by `delta` immediately, with the document's smooth
 * scrolling suspended. Without this the global `scroll-behavior: smooth`
 * turns every step of a gesture into a queued animation.
 */
function scrollNow(delta: number): void {
  const root = document.documentElement;
  const previous = root.style.scrollBehavior;
  root.style.scrollBehavior = 'auto';
  window.scrollTo(0, window.scrollY + delta);
  root.style.scrollBehavior = previous;
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
    scrollNow(dx);
  };

  // Touch: a horizontal drag over the section moves the page by the same
  // distance, so the cards travel with the finger.
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
      // Decide as early as the gesture allows. Waiting for a large
      // threshold lets WebKit commit to its own interpretation first,
      // after which the events stop being cancelable.
      if (dx < 4 && dy < 4) return;
      claimed = dx > dy;
      if (!claimed) return;
    }

    const step = lastX - x;
    lastX = x;
    if (!hasRoom(step)) { claimed = false; return; }
    if (e.cancelable) e.preventDefault();
    scrollNow(step);
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
