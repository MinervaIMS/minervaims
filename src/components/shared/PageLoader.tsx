import { useEffect, useState } from 'react';
import logoColorAsset from '@/assets/logo-color-loader.webp.asset.json';
import { pulsePhaseStyle } from '@/lib/loader-pulse';
import { HIGH_FETCH_PRIORITY } from '@/lib/fetch-priority';

// =====================================================================
// PageLoader — the Suspense fallback for every lazy route.
// ---------------------------------------------------------------------
// It stands in for a page for as long as that page's chunk takes to
// arrive, which on a warm cache is a few dozen milliseconds and on a cold
// mobile connection is a second or more. Both ends of that range have to
// look deliberate, and the two rules below are what make them.
//
// IT IS ALWAYS WHITE, WITH THE COLOUR MARK. Always, on every route, in
// every direction of travel, with no state to consult and nothing to get
// wrong.
//
// It used to paint the surface the route was ABOUT to have, read from
// `--chrome-base` and `data-surface`, both of which RouteChrome writes in
// an effect keyed on the pathname. This component reads them during
// RENDER, and render runs before effects: on a navigation the loader was
// therefore reading the surface of the page being LEFT, not the one being
// opened. Going from a white page to a dark one it latched "light" and
// drew the colour lock-up, then the effect repainted the ground black
// underneath it - a black screen with a purple logo on it, which is the
// exact fault reported. Going the other way it drew the white lock-up and
// then turned the ground white, leaving a screen that looked empty.
//
// The intermittency is what made it damaging. A loader that is wrong
// sometimes reads as a site that is broken sometimes, and that is a far
// worse thing to show a visitor than any flash: nobody trusts a page that
// appears to fail at random.
//
// A fixed white ground with the colour mark cannot be wrong, because
// there is no longer a question being answered. The cost is a white
// moment before the few pages that are nearly black, which is a
// transition; the thing it replaces was a defect.
//
// THE MARK ONLY APPEARS IF THERE IS SOMETHING TO WAIT FOR. Under about a
// sixth of a second the reader sees the destination's own colour and
// nothing else, which reads as an instant transition; past that the
// lock-up fades in and pulses. Showing it immediately turned every quick
// navigation into a blink of a logo, which is what makes a fast site feel
// unsettled.
//
// `data-page-loading` on <body> is unchanged: the header watches it and
// hides for the duration, so the navigation never floats over a loader.
// =====================================================================

/** Under this, a navigation reads as instant and no mark is drawn. */
const MARK_DELAY_MS = 160;

export function PageLoader() {
  const [showMark, setShowMark] = useState(false);

  useEffect(() => {
    document.body.setAttribute('data-page-loading', 'true');
    const id = window.setTimeout(() => setShowMark(true), MARK_DELAY_MS);
    return () => {
      window.clearTimeout(id);
      document.body.removeAttribute('data-page-loading');
    };
  }, []);

  return (
    // =================================================================
    // THE FALLBACK RESERVES A SCREEN OF HEIGHT, and that is the whole of
    // this outer element.
    //
    // The overlay below is `position: fixed`, so it takes no space in the
    // flow. While a route's chunk was in the air, the page's main region
    // was therefore EMPTY, and the footer - which the Layout renders
    // beneath it - rose to sit directly under the header, filling the
    // viewport behind the overlay. When the real page arrived, the footer
    // dropped back down. The reader never saw it, because the overlay
    // covers the screen; the browser recorded it all the same, as a
    // layout shift of 0.94 on EVERY navigation to a lazy route, which is
    // to say on every route but the homepage. That is a "poor" Cumulative
    // Layout Shift by any measure, and it was the site's entire CLS.
    //
    // One screen of reserved height keeps the footer below the fold for
    // as long as the loader is up, so nothing that is on screen moves
    // when the page replaces it. Nothing here is visible: it is an empty
    // box behind an opaque overlay, and it unmounts with the loader.
    //
    // `svh` rather than `vh`: on iOS `vh` is the LARGE viewport, which
    // would reserve more height than the screen has and reintroduce a
    // shift of its own in the other direction.
    // =================================================================
    <div className="min-h-[100svh]">
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      // A LITERAL, NOT A TOKEN AND NOT A VARIABLE. `hsl(var(--background))`
      // is white today and is redefined under `.dark`, and `--chrome-base`
      // is whatever the last route set; either can hand this element a
      // dark ground at the one moment it must not have one. White is
      // stated here so that nothing upstream can answer differently.
      style={{ backgroundColor: '#FFFFFF' }}
    >
      {/* TWO ELEMENTS, TWO JOBS. They used to be one, and that is why the
          grace period above never worked: a running CSS animation writes the
          property it animates, so `animate-pulse` overrode the `opacity-0`
          the fade started from. The mark was therefore drawn at full opacity
          from the first frame - the 160ms delay changed nothing, and every
          quick navigation blinked a logo, which is what the delay exists to
          prevent.

          The outer element owns the fade in and nothing else. The inner one
          owns the pulse and nothing else. Neither can now overwrite the
          other, and the phase carries across mounts. */}
      <div className={`transition-opacity duration-200 ${showMark ? 'opacity-100' : 'opacity-0'}`}>
        <div className="animate-markPulse" style={pulsePhaseStyle()}>
          <img
            src={logoColorAsset.url}
            alt="Loading"
            width={65}
            height={48}
            className="h-12 w-auto"
            decoding="sync"
            {...HIGH_FETCH_PRIORITY}
          />
        </div>
      </div>
    </div>
    </div>
  );
}

export default PageLoader;
