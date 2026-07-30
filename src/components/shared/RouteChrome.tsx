import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// =====================================================================
// RouteChrome — mobile browser chrome management, per route.
// ---------------------------------------------------------------------
// Mobile browsers paint two areas we do not directly control: the status
// bar at the top (time, battery, signal) and the lower browser chrome
// around the URL bar. Both derive their colour from a mix of the
// <meta name="theme-color"> tag and the page background behind them.
//
// Two behaviours of iOS Safari drive the design of this module:
//
//  1. Safari reads theme-color when the document loads and does NOT
//     re-evaluate it when the meta element's `content` attribute is
//     merely mutated. A client-side route change therefore kept showing
//     the previous route's tint until the page was reloaded by hand.
//     Re-INSERTING a fresh element does force a re-read, so every update
//     here replaces the node instead of editing it.
//
//  2. Safari applies one theme-color to BOTH its top chrome and its
//     bottom toolbar. A single declared colour can never give a purple
//     status bar and a light bottom bar at the same time — declaring the
//     workspace navy is exactly what turned the bottom bar navy too.
//     When no theme-color is declared, Safari instead samples the page's
//     own colours near each edge, which is the only mechanism that can
//     produce a different colour at the top and at the bottom.
//
// So on iOS the tag is deliberately removed and the page paints its own
// edges (the workspace shell fills the top safe area with the accent and
// its content is white; public pages open on a dark hero and end on the
// black footer). Every other engine — Android Chrome, Firefox, Samsung
// Internet, in-app WebViews — keeps the declared colour, which is what
// they honour and what they render correctly.
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
  '/unsubscribe',
];

/**
 * iOS (including iPadOS, which reports itself as a Mac with touch points).
 * Everything on iOS renders through WebKit, so Chrome, Firefox and every
 * in-app browser on the platform share Safari's chrome behaviour.
 */
function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return ua.includes('Macintosh') && typeof document !== 'undefined' && navigator.maxTouchPoints > 1;
}

function chromeFor(path: string): Chrome {
  // Workspace: the status-bar area must read PURPLE and the lower browser
  // chrome must stay light, blending into the white content. The shell
  // paints the top safe area with the accent itself, so on iOS (where the
  // tag is dropped and Safari samples the edges) both ends come out right;
  // elsewhere the declared navy tints the top chrome as intended.
  if (path.startsWith('/admin')) return { theme: NAVY, base: WHITE, bottom: 'transparent' };
  if (AUTH_LIKE.some((p) => path === p || path.startsWith(p + '/'))) {
    return { theme: AUTH_DARK, base: AUTH_DARK, bottom: AUTH_DARK };
  }
  // Event registration shares the auth backdrop.
  if (/^\/events\/[^/]+\/register/.test(path)) return { theme: AUTH_DARK, base: AUTH_DARK, bottom: AUTH_DARK };
  // Public site: hero images fade from near-black and every page ends with
  // the black footer, so black is the coherent base for overscroll.
  //
  // The bottom band, however, is deliberately NOT painted. It used to be a
  // hard black strip over the home-indicator zone, which assumed every page
  // is dark where that strip sits. /about breaks the assumption: its long
  // white "What We Do" body means the strip reads as a black bar under white
  // content — the anomaly reported on that page while the darker, shorter
  // pages hid it. Leaving the band transparent lets the real surface show
  // through (white in a white section, black over the footer), which is
  // correct on every page rather than on most of them.
  return { theme: BLACK, base: BLACK, bottom: 'transparent' };
}

export function RouteChrome() {
  const { pathname } = useLocation();

  useEffect(() => {
    const c = chromeFor(pathname);

    // Always drop the current tag first: on WebKit a replaced element is
    // re-read, while an edited one is not.
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.remove());

    if (!isIOS()) {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = c.theme;
      document.head.appendChild(meta);
    }

    const root = document.documentElement;
    root.style.backgroundColor = c.base;
    root.style.setProperty('--chrome-bottom', c.bottom);
  }, [pathname]);

  return null;
}

export default RouteChrome;
