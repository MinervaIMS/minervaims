// =====================================================================
// THE PAGES A READER VISITED LAST (Step 106).
// ---------------------------------------------------------------------
// The workspace search shows them when its box is empty: most searches
// are a way back to a page used a minute ago, and "Recently visited" gets
// there in one tap, on a phone above all.
//
// WHAT IS KEPT: the keys of the last few workspace pages opened (page
// keys such as `people-members`, never a record, a name or a search), on
// this device only, per account, so two members sharing a computer never
// see each other's pages. Nothing is sent anywhere.
//
// WHAT IS SHOWN: the three most recent, without the page being read now,
// and only pages the reader can still open (the search filters them
// through the same access as everything else it lists).
//
// Storage can be unavailable (private browsing, blocked site data): then
// nothing is remembered and the search shows what it showed before.
// =====================================================================

/** How many pages the search shows. */
export const RECENT_SHOWN = 3;
/** How many are kept: one more than shown, as the newest is usually the page being read. */
const RECENT_KEPT = RECENT_SHOWN + 1;

const storageKey = (scope: string) => `mims.recent-pages.${scope}`;

/** The pages kept for this account, newest first. Never throws. */
export function recentPages(scope: string | null | undefined): string[] {
  if (!scope) return [];
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(storageKey(scope));
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string' && x.length > 0 && x.length < 80).slice(0, RECENT_KEPT) : [];
  } catch {
    return [];
  }
}

/** Remember that this account opened this page. Never throws. */
export function rememberPage(scope: string | null | undefined, page: string | null | undefined): void {
  if (!scope || !page) return;
  try {
    const next = [page, ...recentPages(scope).filter((p) => p !== page)].slice(0, RECENT_KEPT);
    localStorage.setItem(storageKey(scope), JSON.stringify(next));
  } catch {
    /* a page not remembered is not worth an error */
  }
}

/** The pages to offer: newest first, without the one being read, at most three. */
export function pagesToOffer(kept: string[], current: string | null | undefined): string[] {
  return kept.filter((p) => p !== current).slice(0, RECENT_SHOWN);
}
