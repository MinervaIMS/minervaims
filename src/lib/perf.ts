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
// THE ANSWER IS STATIC, AND IT IS THE SAME ON EVERY VISIT FROM THE SAME
// DEVICE. It used to be revisable: after publishing this decision the
// module WATCHED THE FIRST SECOND OF FRAMES and stepped a browser down to
// lite if the median frame was worse than 32ms. That is why the beams and
// the dot field "often did not load at all", on ordinary laptops and
// ordinary phones, with no pattern the reader could see.
//
// The sample began 900ms after load - which is exactly when the page is
// fetching a route chunk, decoding the hero image, compiling the very
// shaders the check was meant to protect, and doing it all on one thread.
// A median frame over 32ms in that window says nothing about the machine.
// It says the page is starting up.
//
// So the check condemned the animation FOR THE COST OF STARTING THE
// ANIMATION, and it did so permanently for the visit: same device, same
// browser, same page, and whether the background appeared came down to
// whether another tab happened to be busy at second one. An effect that
// is present nine times and absent the tenth does not read as a
// performance decision. It reads as a broken page.
//
// The static signals below are kept, because they are the ones this was
// actually written for: an in-app browser identifies itself in the user
// agent, and a two-core device is two cores on every visit. Those answers
// are stable, so the treatment is stable.
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
// any of the signals, so they stay on 'full' and render exactly what they
// render today - every time, not most times.
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
 * It publishes the static decision and stops. There is no sampling and no
 * later revision: whatever this answers on the first frame is what the
 * visit gets, so a background layer that mounts is a background layer
 * that stays.
 */
export function initPerfMode() {
  if (typeof document === 'undefined') return;
  publish(perfMode());
}
