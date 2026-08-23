import { useEffect, useState } from 'react';
import logoColorAsset from '@/assets/logo-color-loader.webp.asset.json';
import logoWhiteAsset from '@/assets/logo-white-loader.webp.asset.json';
import { pulsePhaseStyle } from '@/lib/loader-pulse';

// =====================================================================
// PageLoader — the Suspense fallback for every lazy route.
// ---------------------------------------------------------------------
// It stands in for a page for as long as that page's chunk takes to
// arrive, which on a warm cache is a few dozen milliseconds and on a cold
// mobile connection is a second or more. Both ends of that range have to
// look deliberate, and the two rules below are what make them.
//
// IT PAINTS THE SURFACE THE ROUTE IS ABOUT TO HAVE, not white. The
// fallback used to be `bg-background`, so opening /join, /apply, /auth or
// an event registration produced a full-screen WHITE flash immediately
// before a page that is nearly black - the single most visible loading
// fault on the site, and the more visible the faster the connection.
// RouteChrome already decides each route's surface for the mobile browser
// chrome; it now publishes it as `--chrome-base`, and the loader simply
// stands on it. The lock-up follows the same decision, so it is never a
// dark logo on a dark ground.
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
  // Read synchronously: an effect would settle a frame late, which is
  // exactly the frame this component exists to get right.
  const [dark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.dataset.surface === 'dark',
  );

  useEffect(() => {
    document.body.setAttribute('data-page-loading', 'true');
    const id = window.setTimeout(() => setShowMark(true), MARK_DELAY_MS);
    return () => {
      window.clearTimeout(id);
      document.body.removeAttribute('data-page-loading');
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ backgroundColor: 'var(--chrome-base, hsl(var(--background)))' }}
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
            src={dark ? logoWhiteAsset.url : logoColorAsset.url}
            alt="Loading"
            width={65}
            height={48}
            className="h-12 w-auto"
            decoding="sync"
            fetchPriority="high"
          />
        </div>
      </div>
    </div>
  );
}

export default PageLoader;
