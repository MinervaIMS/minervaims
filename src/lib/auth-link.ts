/**
 * Capture and hold an emailed auth token WITHOUT redeeming it.
 *
 * The one-time token that arrives in a Minerva-hosted auth link must never be
 * spent by simply loading a page: mail-security scanners (Microsoft Defender /
 * Safe Links on studbocconi.it) open links to inspect them, and the JavaScript
 * capable ones execute the page. A React component that redeems on mount is
 * therefore spent before the student ever clicks, and the same effect fires
 * again on remount, back-navigation, bfcache restore or refresh, which lets a
 * user burn their own token too.
 *
 * So the token is only CAPTURED here. Redemption happens exclusively from a
 * submit or click handler.
 *
 * It is written to sessionStorage BEFORE the query string is stripped, and read
 * back from there on mount: a refresh on the confirmation screen must not lose
 * the token, otherwise the student needs a whole new email — which on a phone
 * would happen constantly. Stripping the query is tidiness, not a security
 * claim (Safe Links has already logged the full URL, and browsers do not leak
 * query strings cross-origin by default).
 */

export interface CapturedAuthLink {
  tokenHash?: string;
  type?: string;
  next?: string;
  email?: string;
}

const STORAGE_KEY = 'mims_auth_link';

/** Only same-origin paths are ever navigated to after a redemption. */
export function safeNextPath(next: string | undefined | null): string {
  if (!next) return '/';
  if (!next.startsWith('/') || next.startsWith('//')) return '/';
  return next;
}

function read(): CapturedAuthLink | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CapturedAuthLink) : null;
  } catch {
    return null;
  }
}

/**
 * Read the token out of the URL (or out of sessionStorage on a refresh), persist
 * it for this tab, and remove it from the address bar. Never redeems anything.
 */
export function captureAuthLink(search: URLSearchParams): CapturedAuthLink {
  const tokenHash = search.get('token_hash') ?? undefined;

  if (!tokenHash) {
    // A refresh, or an arrival without a token: fall back to what this tab holds.
    return read() ?? { email: search.get('email') ?? undefined };
  }

  const captured: CapturedAuthLink = {
    tokenHash,
    type: search.get('type') ?? undefined,
    next: safeNextPath(search.get('next')),
    email: search.get('email') ?? undefined,
  };

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(captured));
  } catch {
    /* private mode: the in-memory value below still serves this page view */
  }

  try {
    const url = new URL(window.location.href);
    ['token_hash', 'type', 'next', 'token'].forEach((k) => url.searchParams.delete(k));
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  } catch {
    /* non-fatal */
  }

  return captured;
}

/** Called once a token has actually been redeemed, so it is not reused. */
export function clearAuthLink() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Turn an auth error into wording that separates "already used" from "expired",
 * because the remedy the student needs is the same but the reassurance is not.
 */
export function describeTokenError(message: string | undefined, kind: 'reset' | 'verification'): string {
  const m = (message ?? '').toLowerCase();
  const noun = kind === 'reset' ? 'reset link' : 'verification link';
  if (m.includes('expired')) {
    return `This ${noun} has expired. Request a new one below.`;
  }
  if (m.includes('not found') || m.includes('invalid')) {
    return `This ${noun} has already been used, or is no longer valid. Request a new one below.`;
  }
  return `We could not confirm this ${noun}. Request a new one below.`;
}
