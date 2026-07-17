import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// =====================================================================
// RouteChrome — mobile browser chrome management, per route.
// ---------------------------------------------------------------------
// Mobile browsers paint two areas we do not directly control: the status
// bar at the top (time, battery, signal) and the lower browser chrome
// around the URL bar. Both derive their colour from a mix of the
// <meta name="theme-color"> tag and the page background behind them.
// A single static colour cannot be right for every page, so this
// component keeps three values in step with the current route:
//
//   theme  -> <meta name="theme-color">: the tint browsers use for their
//             own chrome (status bar area, tab bar on iOS Safari).
//   base   -> the <html> background: what shows through rubber-band
//             overscroll and behind any safe-area gap, top and bottom.
//   bottom -> the --chrome-bottom CSS variable consumed by the body::after
//             band that sits exactly over the iOS home-indicator zone.
//
// No negative positioning, no viewport hacks: only proper viewport-fit
// (already set in index.html), backgrounds and the standard theme-color
// mechanism, which work consistently across Safari iOS, Chrome iOS,
// Android Chrome and WebViews.
// =====================================================================

const NAVY = '#1F0F4D';       // workspace header purple
const AUTH_DARK = '#05030F';  // auth/apply beams backdrop
const BLACK = '#000000';      // public site: dark heroes + black footer
const WHITE = '#ffffff';      // workspace body

interface Chrome { theme: string; base: string; bottom: string }

// Pages that share the dark auth backdrop (beams behind a white card).
const AUTH_LIKE = [
  '/auth', '/forgot-password', '/reset-password', '/password-reset-success',
  '/check-email', '/application-check-email', '/verify-email',
  '/session-expired', '/access-denied', '/pending-approval', '/apply',
];

function chromeFor(path: string): Chrome {
  // Workspace: purple header behind the status bar, white page below, and a
  // white bottom band so the content never looks cut off against black.
  if (path.startsWith('/admin')) return { theme: NAVY, base: WHITE, bottom: WHITE };
  if (AUTH_LIKE.some((p) => path === p || path.startsWith(p + '/'))) {
    return { theme: AUTH_DARK, base: AUTH_DARK, bottom: AUTH_DARK };
  }
  // Event registration shares the auth backdrop.
  if (/^\/events\/[^/]+\/register/.test(path)) return { theme: AUTH_DARK, base: AUTH_DARK, bottom: AUTH_DARK };
  // Public site: hero images fade from near-black and every page ends with
  // the black footer, so black is the coherent base at both edges.
  return { theme: BLACK, base: BLACK, bottom: BLACK };
}

export function RouteChrome() {
  const { pathname } = useLocation();

  useEffect(() => {
    const c = chromeFor(pathname);
    let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = c.theme;
    const root = document.documentElement;
    root.style.backgroundColor = c.base;
    root.style.setProperty('--chrome-bottom', c.bottom);
  }, [pathname]);

  return null;
}

export default RouteChrome;
