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
  /**
   * Page scroll needed per pixel of horizontal card travel.
   *
   * A pinned section stretches its travel: it consumes `overflow * pacing`
   * pixels of page scroll to move the cards `overflow` pixels. That ratio is
   * deliberate for VERTICAL scrolling, where it sets the reading pace. Applied
   * to a HORIZONTAL gesture it is simply drag: the reader pushes the cards
   * sideways by a hundred pixels and they move eighty-seven. Multiplying a
   * sideways gesture by the same ratio makes the cards track the gesture
   * one to one, which is the whole point of touching them sideways.
   */
  pacing?: () => number;
}

/** A line-mode wheel tick, in pixels. Firefox and many mice report lines. */
const LINE_HEIGHT = 16;

/**
 * Wheel deltas arrive in three units. Without normalising them a line-mode
 * wheel reports "3" for a full notch, which used to move the page three
 * pixels: indistinguishable from the gesture doing nothing at all.
 */
function normaliseDelta(value: number, mode: number): number {
  if (mode === 1) return value * LINE_HEIGHT;
  if (mode === 2) return value * window.innerHeight;
  return value;
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
  const { progress, enabled, pacing } = options;

  const ratio = () => {
    const p = pacing ? pacing() : 1;
    return Number.isFinite(p) && p > 0 ? p : 1;
  };

  /** True when travel in this direction still has somewhere to go. */
  const hasRoom = (delta: number) => {
    const p = progress();
    if (delta > 0) return p < 0.999;
    if (delta < 0) return p > 0.001;
    return false;
  };

  /*
    Gestures are coalesced into a single scroll per animation frame. A
    trackpad can deliver several wheel events between two frames, and each
    synchronous window.scrollTo forces its own layout pass; batching them
    keeps the travel smooth under a fast flick without changing the total
    distance by a single pixel.
  */
  let queued = 0;
  let frame = 0;

  const flush = () => {
    frame = 0;
    const delta = queued;
    queued = 0;
    if (delta !== 0) scrollNow(delta);
  };

  const push = (delta: number) => {
    queued += delta;
    if (!frame) frame = requestAnimationFrame(flush);
  };

  const onWheel = (e: WheelEvent) => {
    if (!enabled()) return;
    const dx = normaliseDelta(e.deltaX, e.deltaMode);
    const dy = normaliseDelta(e.deltaY, e.deltaMode);
    // Leave anything that is not clearly a sideways gesture to the page: a
    // vertical or vertical-dominant gesture already advances the pinned
    // section natively, so intercepting it would process it twice.
    if (Math.abs(dx) <= Math.abs(dy) || Math.abs(dx) < 2) return;
    if (!hasRoom(dx)) return;
    e.preventDefault();
    // Default is prevented, so nothing else will move the page. A diagonal
    // gesture therefore has to contribute both axes here or its vertical
    // component would simply be discarded. Only the sideways part is scaled
    // to card travel; the vertical part is already page scroll.
    push(dx * ratio() + dy);
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
    // Same one-to-one rule as the wheel: the cards keep up with the finger.
    push(step * ratio());
  };

  const onTouchEnd = () => { claimed = null; };

  el.addEventListener('wheel', onWheel, { passive: false });
  el.addEventListener('touchstart', onTouchStart, { passive: true });
  el.addEventListener('touchmove', onTouchMove, { passive: false });
  el.addEventListener('touchend', onTouchEnd);
  el.addEventListener('touchcancel', onTouchEnd);

  return () => {
    if (frame) cancelAnimationFrame(frame);
    el.removeEventListener('wheel', onWheel);
    el.removeEventListener('touchstart', onTouchStart);
    el.removeEventListener('touchmove', onTouchMove);
    el.removeEventListener('touchend', onTouchEnd);
    el.removeEventListener('touchcancel', onTouchEnd);
  };
}
