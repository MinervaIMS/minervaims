// =====================================================================
// MICROSOFT CLARITY, ONLY WITH CONSENT (Step 92).
// ---------------------------------------------------------------------
// Clarity (usage statistics, heatmaps and recordings of visits) is
// loaded only after the visitor accepts the Analytics category in the
// cookie banner, and only on the public pages. Before that the script is
// not on the page at all: nothing is collected, not even without cookies.
//
//   * Consent is passed with Clarity's consentv2 call: analytics granted,
//     advertising always denied.
//   * Never in the Workspace or on the sign-in pages. A visitor who has
//     Clarity running and moves to one of them gets that page freshly
//     loaded, without Clarity.
//   * Withdrawing consent tells Clarity, deletes its cookies on this site
//     and reloads the page, so recording stops at once.
//   * On the application, registration and form pages typed text is
//     masked (data-clarity-mask on those forms), and Clarity always masks
//     passwords.
//
// The Cookie Policy and the Privacy Policy describe exactly this.
// =====================================================================

export const CLARITY_PROJECT_ID = 'z1q4eg2wfs';

const CONSENT_STORAGE_KEY = 'mims-cookie-consent';

/** Pages Clarity never runs on: the Workspace and everything around signing in. */
const EXCLUDED = [
  /^\/workspace(\/|$)/, /^\/admin(\/|$)/, /^\/auth(\/|$)/, /^\/forgot-password/, /^\/reset-password/,
  /^\/password-reset-success/, /^\/check-email/, /^\/application-check-email/, /^\/verify-email/,
  /^\/session-expired/, /^\/access-denied/, /^\/pending-approval/, /^\/unsubscribe/,
];

export const clarityAllowedOn = (path: string): boolean => !EXCLUDED.some((re) => re.test(path));

type ClarityFn = ((...args: unknown[]) => void) & { q?: unknown[][] };
type ClarityWindow = Window & { clarity?: ClarityFn };

/** Whether the stored cookie choice includes Analytics. */
export function analyticsConsented(): boolean {
  try {
    const saved = JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY) || 'null') as { analytics?: boolean } | null;
    return saved?.analytics === true;
  } catch {
    return false;
  }
}

let loaded = false;

/** Microsoft's own loader, as given in the Clarity setup page, run only once. */
function inject(w: ClarityWindow, d: Document) {
  if (loaded) return;
  loaded = true;
  const fn: ClarityFn = w.clarity || function (...args: unknown[]) { (fn.q = fn.q || []).push(args); };
  w.clarity = fn;
  const t = d.createElement('script');
  t.async = true;
  t.src = `https://www.clarity.ms/tag/${CLARITY_PROJECT_ID}?ref=bwt`;
  const y = d.getElementsByTagName('script')[0];
  if (y?.parentNode) y.parentNode.insertBefore(t, y); else d.head.appendChild(t);
}

/** Clarity's own first-party cookies on this site. */
function deleteClarityCookies(d: Document) {
  for (const name of ['_clck', '_clsk']) {
    const host = location.hostname;
    const domains = ['', host, `.${host.replace(/^www\./, '')}`];
    for (const domain of domains) {
      d.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ''}`;
    }
  }
}

/**
 * Bring Clarity in line with the visitor's choice and the page they are on.
 * Called on start, after every cookie choice, and on every navigation.
 */
export function syncClarity(path: string, consent: boolean = analyticsConsented()): void {
  if (typeof window === 'undefined') return;
  const w = window as ClarityWindow;
  const allowed = clarityAllowedOn(path);

  if (!loaded) {
    if (consent && allowed) {
      inject(w, document);
      w.clarity?.('consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' });
    }
    return;
  }

  // Clarity is on this page already.
  if (!consent) {
    w.clarity?.('consentv2', { ad_Storage: 'denied', analytics_Storage: 'denied' });
    deleteClarityCookies(document);
    window.location.reload();
    return;
  }
  if (!allowed) {
    // Reload the page the visitor asked for: it starts without Clarity.
    window.location.replace(window.location.href);
  }
}
