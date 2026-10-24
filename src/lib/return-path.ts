// =====================================================================
// Where a reader goes back to after signing in.
// ---------------------------------------------------------------------
// A member who opens an event's registration, a company visit or a form
// while signed out is sent to sign in, and must come back to that page,
// not to the Dashboard. The page they came from travels to the sign-in
// page in the router's state, and is also kept here for half an hour, so
// it survives "Forgot password", which comes back to the site in a new
// tab and then to the sign-in page.
//
// Only the Society's own pages that need a signed-in reader are followed:
// the workspace, an event's registration (and the company visit interest
// that lives there) and a form. Anything else, and anything from another
// site, falls back to the workspace.
// =====================================================================

const RETURN_PATH_RE = /^\/(workspace(\/[A-Za-z0-9/_-]*)?|events\/[A-Za-z0-9-]+\/register|forms\/[A-Za-z0-9-]+)(\?[^#]*)?$/;
const KEY = 'mims.returnTo';
const KEEP_MS = 30 * 60 * 1000;

/** The path itself when it is one of ours that needs a signed-in reader, otherwise null. */
export function safeReturnPath(path: unknown): string | null {
  return typeof path === 'string' && RETURN_PATH_RE.test(path) ? path : null;
}

/** Keep a return path for the next sign-in in this browser. */
export function rememberReturnPath(path: unknown): void {
  const p = safeReturnPath(path);
  if (!p) return;
  try { localStorage.setItem(KEY, JSON.stringify({ p, at: Date.now() })); } catch { /* storage unavailable: the router state still carries it */ }
}

/** The kept return path, if recent, and forget it. */
export function takeReturnPath(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    localStorage.removeItem(KEY);
    if (!raw) return null;
    const { p, at } = JSON.parse(raw) as { p?: unknown; at?: number };
    return typeof at === 'number' && Date.now() - at < KEEP_MS ? safeReturnPath(p) : null;
  } catch {
    return null;
  }
}
