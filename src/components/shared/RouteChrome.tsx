import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { WORKSPACE_BASE, LEGACY_WORKSPACE_BASE } from '@/lib/workspace-base';

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
  // The bottom band is painted WHITE rather than left transparent: with no
  // theme-color declared, Safari samples the page near each edge, and a
  // transparent band let it reach the purple shell and tint the lower
  // toolbar purple after a reload. A white strip over the home-indicator
  // zone gives it something light to find, every time.
  if (path.startsWith(WORKSPACE_BASE) || path.startsWith(LEGACY_WORKSPACE_BASE)) return { theme: NAVY, base: WHITE, bottom: WHITE };
  if (AUTH_LIKE.some((p) => path === p || path.startsWith(p + '/'))) {
    return { theme: AUTH_DARK, base: AUTH_DARK, bottom: AUTH_DARK };
  }
  // Event registration shares the auth backdrop.
  if (/^\/events\/[^/]+\/register/.test(path)) return { theme: AUTH_DARK, base: AUTH_DARK, bottom: AUTH_DARK };
  // Public site. Two bands, decided separately.
  //
  // The bottom band is painted WHITE. Leaving it transparent has now been
  // tried twice and fails the same way: with no theme-color declared,
  // Safari samples the page near each edge to tint its bars, and a
  // transparent band lets it reach whatever happens to sit underneath. On
  // the homepage that is the dark hero on a cold load (a black strip) and
  // the purple section after a reload. A white strip over the
  // home-indicator zone gives it one predictable thing to find, on every
  // public page and on every load.
  //
  // `base` is the overscroll colour, and it follows the band for the same
  // reason: a rubber-band bounce should reveal the page's own surface, not
  // a black gutter under a white section.
  return { theme: BLACK, base: WHITE, bottom: WHITE };
}

export function RouteChrome() {
  const { pathname } = useLocation();

  useEffect(() => {
    const c = chromeFor(pathname);
    const root = document.documentElement;

    // The head script already set this for the entry URL; keep it true for
    // every client-side navigation, since the purple top band is painted
    // from it.
    root.setAttribute(
      'data-route',
      pathname.startsWith(WORKSPACE_BASE) || pathname.startsWith(LEGACY_WORKSPACE_BASE) ? 'workspace' : 'public',
    );

    // Always drop the current tag first: on WebKit a replaced element is
    // re-read, while an edited one is not.
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.remove());

    if (!isIOS()) {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = c.theme;
      document.head.appendChild(meta);
    }

    root.style.backgroundColor = c.base;
    root.style.setProperty('--chrome-bottom', c.bottom);

    // THE ROUTE'S OWN SURFACE, PUBLISHED FOR ANYTHING THAT HAS TO MATCH IT.
    // The page loader is the reason this exists. It is the Suspense fallback
    // for every lazy route, and it used to paint `bg-background`, i.e. white,
    // whatever it was standing in for: opening /join, /apply, /auth or an
    // event registration from anywhere on the site meant a full-screen white
    // flash immediately before a page that is nearly black. Reading the
    // surface the route is about to have removes the flash entirely, and
    // `--chrome-surface` tells the loader which of the two lock-ups to draw.
    root.style.setProperty('--chrome-base', c.base);
    root.dataset.surface = c.base === WHITE ? 'light' : 'dark';
  }, [pathname]);

  return null;
}

export default RouteChrome;
