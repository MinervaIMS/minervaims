// =====================================================================
// A page's <title>, as the Seo component writes it.
// ---------------------------------------------------------------------
// Its own module, with only a relative import, so the static pages the
// build writes (vite.static-pages.ts) use the very function the app uses:
// a report's static copy and the page React draws over it carry the same
// title, letter for letter.
// =====================================================================

import { SITE_NAME, SITE_SHORT_NAME } from './site';

/**
 * Roughly where a search result stops showing a title. Not a hard limit:
 * Google measures pixels, not characters, and truncates around here.
 */
export const TITLE_BUDGET = 60;

/**
 * The title as it appears in a tab and in a search result.
 *
 * THE SUFFIX ADAPTS TO THE ROOM LEFT. The association's full name is
 * worth carrying, because it is what somebody searching for it by name
 * types; but "Quantitative Research Division | Minerva Investment
 * Management Society" is seventy characters, and a search result that
 * truncates loses the name it was carrying it for. So the full name is
 * used where it fits and the short form where it does not, which keeps
 * every title inside the budget without ever dropping the identity
 * altogether.
 *
 * The suffix is added here rather than in the registry so that the
 * homepage, whose title already names the association in full, does not
 * end up saying it twice.
 */
export function fullTitle(title: string): string {
  const trimmed = title.trim();
  if (trimmed.toLowerCase().includes('minerva')) return `${trimmed} | ${SITE_SHORT_NAME}`;
  const long = `${trimmed} | ${SITE_NAME}`;
  return long.length <= TITLE_BUDGET ? long : `${trimmed} | Minerva IMS`;
}
