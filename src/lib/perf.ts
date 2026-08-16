// =====================================================================
// perf — one decision about how much ambient motion this browser gets.
// ---------------------------------------------------------------------
// The site's animation is well behaved in Safari and Chrome. It is NOT
// well behaved in the browsers embedded inside other apps: the Instagram,
// Facebook, LinkedIn, TikTok and WhatsApp in-app views, and the generic
// Android WebView. Those are the same engines, but they run with a
// smaller renderer process, frequently without GPU rasterisation, and on
// iOS the in-app WKWebView does not get the JIT that Safari itself gets.
// The result is the reported symptom: motion that is effortless in Safari
// arrives in jumps and lags when the same page is opened from a social
// media app.
//
// SO THE SITE ASKS ONE QUESTION, ONCE, AND ANSWERS IT BEFORE REACT PAINTS.
// `document.documentElement.dataset.perf` is 'full' or 'lite'. CSS reads
// it as `[data-perf="lite"]`; components read it with `usePerfMode`.
//
// THE ANSWER IS ONE-WAY. It can go from full to lite and never back, so
// the page can never oscillate between two treatments while somebody is
// reading it.
//
// WHAT LITE ACTUALLY MEANS, everywhere it is honoured:
//   * the WebGL layers (the particle field, the beams, the specular
//     button border) are not mounted at all;
//   * per-frame filters, which force a repaint on a weak compositor, are
//     dropped, while the transforms they accompanied are kept;
//   * ambient loops that are purely decorative stop.
// The page keeps its structure, its type, its images and every piece of
// content. Nothing that carries meaning is removed.
//
// NOTHING HERE CHANGES A CAPABLE BROWSER. Safari and Chrome do not match
// any of the signals and never fail the frame-rate check, so they stay on
// 'full' and render exactly what they render today.
// =====================================================================

export type PerfMode = 'full' | 'lite';

/**
 * Browsers embedded in another app.
 *
 * `; wv)` is the Android WebView marker, and `FBAN`/`FB_IAB` are Facebook's;
 * the rest identify themselves by name. The list is deliberately explicit
 * rather than clever: a false positive costs a visitor some ambience, a
 * false negative costs them the stutter this exists to prevent.
 */
const IN_APP = /\bFBAN\b|\bFBAV\b|FB_IAB|FBIOS|Instagram|LinkedInApp|Twitter(?:Android|for)|TikTok|musical_ly|Snapchat|Pinterest|WhatsApp|MicroMessenger|Line\/|; wv\)|GSA\//i;

let decided: PerfMode | null = null;

/** The signals available before anything has been drawn. */
function initialMode(): PerfMode {
  if (typeof navigator === 'undefined' || typeof document === 'undefined') return 'full';

  const ua = navigator.userAgent || '';
  if (IN_APP.test(ua)) return 'lite';

  // Very low-end hardware, whatever the browser. Both figures are
  // deliberately at the bottom of the range: a modern mid-range phone
  // reports 6 to 8 cores and 4GB or more, so neither of these fires on a
  // device that can cope.
  const cores = (navigator as Navigator & { hardwareConcurrency?: number }).hardwareConcurrency;
  if (typeof cores === 'number' && cores > 0 && cores <= 2) return 'lite';
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (typeof memory === 'number' && memory > 0 && memory <= 2) return 'lite';

  return 'full';
}

/** The decision, computed once and then remembered. */
export function perfMode(): PerfMode {
  if (decided) return decided;
  decided = initialMode();
  return decided;
}

/** Writes the decision onto <html> so CSS can act on it. */
function publish(mode: PerfMode) {
  decided = mode;
  if (typeof document !== 'undefined') document.documentElement.dataset.perf = mode;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mims:perfmode', { detail: mode }));
  }
}

/**
 * Called once from the entry module.
 *
 * After publishing the initial answer it WATCHES THE FIRST SECOND OF
 * FRAMES. An unrecognised in-app browser, or simply a device having a bad
 * day, will not match the list above; what it will do is miss frames. If
 * the median frame over the sample is worse than 32ms - about 30 frames a
 * second, against the 16.7ms a healthy browser holds - the page steps down
 * to lite for the rest of the visit.
 *
 * The median is used rather than the mean so that one long frame, which
 * every page has while it is starting up, cannot condemn a browser that is
 * otherwise fine. The sample starts after a short delay for the same
 * reason: the frames during mount are not representative of anything.
 */
export function initPerfMode() {
  if (typeof document === 'undefined') return;
  publish(perfMode());
  if (decided === 'lite') return;
  if (typeof requestAnimationFrame !== 'function') return;

  const frames: number[] = [];
  let last = 0;
  let raf = 0;
  const SAMPLE_MS = 1000;
  const MEDIAN_LIMIT_MS = 32;

  const step = (now: number) => {
    if (last) frames.push(now - last);
    last = now;
    if (frames.length < 90 && frames.reduce((a, b) => a + b, 0) < SAMPLE_MS) {
      raf = requestAnimationFrame(step);
      return;
    }
    raf = 0;
    if (frames.length < 12) return; // Too few to judge: leave it alone.
    const sorted = frames.slice().sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    if (median > MEDIAN_LIMIT_MS) publish('lite');
  };

  // The sample begins once the page has settled, so start-up work is not
  // mistaken for a slow browser.
  const begin = () => { last = 0; raf = requestAnimationFrame(step); };
  window.setTimeout(begin, 900);

  window.addEventListener('pagehide', () => { if (raf) cancelAnimationFrame(raf); }, { once: true });
}
