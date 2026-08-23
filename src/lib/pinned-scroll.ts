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
// THE THIRD THING, AND THE REASON THIS FILE CHANGED AGAIN: releasing
// the gesture at the ends handed it to the browser's back-navigation.
//
// The bridge used to return without calling preventDefault whenever the
// travel had no room left in the gesture's direction. On a trackpad,
// an unclaimed horizontal gesture over a page with no horizontal
// overflow is precisely what Safari and Chrome interpret as "go back".
// And because the section rests at progress 0 - both when a reader
// first arrives and every time they return to its start - the direction
// with no room there is BACKWARDS. So pushing the cards forwards worked
// and pushing them back towards the first division left the page.
//
// A horizontal gesture over a pinned rail is now always claimed. When
// the travel has room it moves the cards; when it does not, it is
// absorbed and nothing happens, which is what every horizontal carousel
// does at its end. Nothing about leaving the section changes: a reader
// leaves by scrolling VERTICALLY, and a vertical or vertical-dominant
// gesture is never claimed - it is not even inspected. The vertical
// component of a diagonal gesture is still passed through, so a
// diagonal flick at the end of the rail still scrolls the page.
//
// This is deliberately not `overscroll-behavior-x` on the document.
// The rails already declare it (see DivisionVideoRail.css), but that
// property only governs an element that actually scrolls, and a pinned
// rail travels by transform and scrolls not at all - so the browser
// never consults it. Setting it globally would disable the back gesture
// across the whole site, which is not ours to take away.
//
// Two rules still keep the bridge from ever trapping the reader:
//
//   * only PREDOMINANTLY horizontal gestures are claimed, so ordinary
//     scrolling past the section is untouched;
//   * the bridge is only bound while the section is pinned, so the
//     static rail keeps native horizontal scrolling and its own
//     `overscroll-behavior-x: contain`, which does work there.
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
    //
    // There is no minimum size any more. A two-pixel floor sounds harmless
    // and is not: the browser starts accumulating horizontal overscroll from
    // the very first fraction of a pixel, so a slow sideways drag stayed
    // under the floor all the way to a back-navigation.
    if (dx === 0 || Math.abs(dx) <= Math.abs(dy)) return;
    // Claimed either way. If the travel has no room in this direction the
    // sideways component is simply absorbed - see the note at the top of the
    // file: leaving it unclaimed is what triggered swipe-to-go-back.
    e.preventDefault();
    // Default is prevented, so nothing else will move the page. A diagonal
    // gesture therefore has to contribute both axes here or its vertical
    // component would simply be discarded. Only the sideways part is scaled
    // to card travel; the vertical part is already page scroll, and it is
    // passed through even at the ends so a reader is never held in place.
    push((hasRoom(dx) ? dx * ratio() : 0) + dy);
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
    // THE CLAIM IS KEPT AT THE ENDS. Dropping it mid-gesture - which is what
    // `claimed = false` did here - releases the rest of the swipe to WebKit,
    // and a horizontal swipe it is handed halfway through is a swipe back a
    // page. The gesture stays ours and simply stops moving anything, exactly
    // as the wheel path now does.
    if (e.cancelable) e.preventDefault();
    if (!hasRoom(step)) return;
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
