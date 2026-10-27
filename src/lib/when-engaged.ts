// =====================================================================
// START SOMETHING ONCE THE READER DOES SOMETHING (Step 102).
// ---------------------------------------------------------------------
// The public pages keep two live subscriptions to the database (the
// testimonials on the homepage, and which pages are hidden), so that a
// change made in the Workspace shows up without a reload. Each one opens a
// WebSocket. Opened with the page, that socket competed with the first
// screen for the connection, and where it cannot connect it wrote an
// error to the console that the page-quality checks count against the
// site, for a feature nobody needs before they have touched the page.
//
// So the sockets now open on the reader's first press, key, touch, wheel
// or scroll. The data itself is still read at once, exactly as before;
// only the live updates wait. Once the reader has engaged, anything asked
// for later starts immediately.
// =====================================================================

const EVENTS = ['pointerdown', 'keydown', 'touchstart', 'wheel', 'scroll'] as const;

let engaged = false;
let listening = false;
const waiting = new Set<() => void>();

function onEngage() {
  if (engaged) return;
  engaged = true;
  EVENTS.forEach((type) => window.removeEventListener(type, onEngage, true));
  const queued = Array.from(waiting);
  waiting.clear();
  queued.forEach((start) => {
    try { start(); } catch { /* one subscriber cannot stop the others */ }
  });
}

/**
 * Run `start` on the reader's first interaction with the page, or at once
 * if that has already happened. Returns a function that cancels a start
 * still waiting (call it from an effect's cleanup).
 */
export function whenEngaged(start: () => void): () => void {
  if (engaged || typeof window === 'undefined') {
    start();
    return () => {};
  }
  waiting.add(start);
  if (!listening) {
    listening = true;
    EVENTS.forEach((type) => window.addEventListener(type, onEngage, { capture: true, passive: true }));
  }
  return () => { waiting.delete(start); };
}
