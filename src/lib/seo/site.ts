// =====================================================================
// The site's own identity, in one place.
// ---------------------------------------------------------------------
// Every canonical link, every Open Graph URL, every absolute URL in the
// structured data and every entry in the sitemap is built from the one
// constant below. Before this file existed the answer was given in three
// different places and two of them disagreed: `index.html` declared the
// canonical as the Lovable preview subdomain while the structured data on
// /join asserted `minervaims.org`. A search engine reading both is being
// told the association has two identities, and the one it believes is the
// one it happens to read first.
//
// THIS IS THE LINE TO CHECK WHEN THE DOMAIN CHANGES. Nothing else needs
// to be touched, and `VITE_SITE_URL` overrides it without a code change
// (useful for a staging deployment that must not canonicalise to
// production).
// =====================================================================

/** The production origin, with no trailing slash. */
export const SITE_URL: string = (
  (import.meta.env?.VITE_SITE_URL as string | undefined) || 'https://minervaims.org'
).replace(/\/+$/, '');

export const SITE_NAME = 'Minerva Investment Management Society';
export const SITE_SHORT_NAME = 'MIMS';
export const SITE_LOCALE = 'en_GB';
export const TWITTER_HANDLE = '@MIMS';

/** The association's public profiles, used as schema.org `sameAs`. */
export const SOCIAL_PROFILES = [
  'https://www.linkedin.com/company/minerva-investment-management/',
  'https://www.instagram.com/minerva.ims/',
];

export const CONTACT_EMAIL = 'as.minerva@unibocconi.it';

/** The default sharing image. 1200x630, as the Open Graph tags declare. */
export const DEFAULT_OG_IMAGE = '/og-image.png';

/**
 * Turn a site-relative path into an absolute URL.
 *
 * Absolute is not a preference here, it is a requirement: a canonical link
 * or an `og:url` given as a path is ignored by most consumers, and a
 * relative `og:image` is ignored by all of them.
 */
export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  // The root keeps its slash. Every other path loses a trailing one. This
  // is not cosmetic: the sitemap lists the homepage as ".../" and a
  // canonical of "..." without the slash is a second spelling of the same
  // page, which is the exact ambiguity a canonical exists to remove.
  return `${SITE_URL}${path}`;
}

/**
 * The canonical form of a path.
 *
 * Query strings and fragments never belong in a canonical: `/archive` and
 * `/archive?division=equity` are the same document with a filter applied,
 * and declaring the second as its own page splits whatever authority the
 * first has earned. Trailing slashes are dropped so one page has one
 * address rather than two.
 */
export function canonicalPath(pathname: string): string {
  const clean = pathname.split('?')[0].split('#')[0];
  if (clean === '/' || clean === '') return '/';
  return clean.replace(/\/+$/, '') || '/';
}
