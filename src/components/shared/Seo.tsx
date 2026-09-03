import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import {
  SITE_NAME, SITE_SHORT_NAME, SITE_LOCALE, TWITTER_HANDLE,
  DEFAULT_OG_IMAGE, absoluteUrl, canonicalPath,
} from '@/lib/seo/site';
import { ROUTE_META, type RouteMeta } from '@/lib/seo/routes';
import { breadcrumbSchema, graph, type JsonLd } from '@/lib/seo/structured-data';

// =====================================================================
// Seo — one component, every page, every tag.
// ---------------------------------------------------------------------
// WHAT WAS WRONG. Each page declared a `<title>` and stopped there, so
// the description, the canonical link and the whole Open Graph block came
// from the static tags in `index.html` and were therefore IDENTICAL on
// every route. Three consequences, all of them real:
//
//   * every page claimed the homepage as its canonical, which tells a
//     search engine that /join, /archive and /events are duplicates of /
//     and should not be indexed in their own right;
//   * twenty pages shared one description, so the sentence under a search
//     result rarely described the page it belonged to;
//   * a link to any page shared on LinkedIn, Instagram or WhatsApp showed
//     the homepage's title, description and image.
//
// HOW THE STATIC TAGS AND THIS COMPONENT COEXIST. The tags in
// `index.html` are still there, and still matter: they are what a crawler
// that does not execute JavaScript reads. They now carry `data-rh="true"`,
// which is the attribute react-helmet-async stamps on the tags it owns.
// On mount it collects every tag carrying that attribute and treats it as
// its own, so a per-page tag REPLACES the static one instead of sitting
// beside it. Without that attribute the page would end up with two
// `og:title` tags and consumers would pick whichever they met first.
//
// USAGE. Most pages need only `<Seo page="/about" />`: the words live in
// the route registry. Pass `title`/`description` directly for a page whose
// subject is not known until it renders (a division, a fund), and
// `structuredData` for a page that has facts worth stating as data.
// =====================================================================

export interface SeoProps {
  /**
   * The registry key for this page. Defaults to the current path, which
   * is right for every static route, so most callers pass nothing at all.
   */
  page?: string;
  /** Overrides the registry title. For pages with a dynamic subject. */
  title?: string;
  /** Overrides the registry description. */
  description?: string;
  /** A longer or friendlier title for social previews. */
  socialTitle?: string;
  /** A page-specific sharing image, absolute or site-relative. */
  image?: string;
  /** Keep this page out of search results. */
  noindex?: boolean;
  /**
   * The trail to this page, for the breadcrumb node. The homepage is
   * prepended here, so callers pass only what comes after it.
   */
  breadcrumbs?: { name: string; path: string }[];
  /** Extra schema.org nodes, from `@/lib/seo/structured-data`. */
  structuredData?: (JsonLd | null | undefined)[];
}

/**
 * Roughly where a search result stops showing a title. Not a hard limit:
 * Google measures pixels, not characters, and truncates around here.
 */
const TITLE_BUDGET = 60;

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
function fullTitle(title: string): string {
  const trimmed = title.trim();
  if (trimmed.toLowerCase().includes('minerva')) return `${trimmed} | ${SITE_SHORT_NAME}`;
  const long = `${trimmed} | ${SITE_NAME}`;
  return long.length <= TITLE_BUDGET ? long : `${trimmed} | Minerva IMS`;
}

export function Seo({
  page, title, description, socialTitle, image, noindex, breadcrumbs, structuredData,
}: SeoProps) {
  const location = useLocation();
  const path = canonicalPath(page ?? location.pathname);
  const meta: RouteMeta | undefined = ROUTE_META[path] ?? ROUTE_META[page ?? ''];

  const resolvedTitle = title ?? meta?.title ?? SITE_NAME;
  const resolvedDescription =
    description ??
    meta?.description ??
    'Minerva Investment Management Society is the Bocconi University student society for investment research and portfolio management.';
  const resolvedSocialTitle = socialTitle ?? meta?.socialTitle ?? resolvedTitle;
  const resolvedNoindex = noindex ?? meta?.noindex ?? false;

  const canonical = absoluteUrl(path);
  const ogImage = absoluteUrl(image ?? DEFAULT_OG_IMAGE);
  const head = fullTitle(resolvedTitle);

  // The homepage is always the first crumb, and is never repeated when the
  // page IS the homepage.
  const trail = path === '/'
    ? []
    : [{ name: 'Home', path: '/' }, ...(breadcrumbs ?? [{ name: resolvedTitle, path }])];

  const nodes: (JsonLd | null | undefined)[] = [
    ...(trail.length > 1 ? [breadcrumbSchema(trail)] : []),
    ...(structuredData ?? []),
  ];

  return (
    <Helmet prioritizeSeoTags>
      <title>{head}</title>
      <meta name="description" content={resolvedDescription} />
      {/* NO CANONICAL ON A PAGE THAT IS NOT TO BE INDEXED. The two are
          contradictory instructions: one says do not index this, the other
          nominates it as the preferred version of itself. Google's own
          guidance is to send one signal, and on a 404 a canonical would
          nominate an address that does not exist. */}
      {!resolvedNoindex && <link rel="canonical" href={canonical} />}
      <meta
        name="robots"
        content={resolvedNoindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'}
      />

      {/* Open Graph. `og:url` must be the canonical, not the address the
          reader happens to be on: a link shared with a tracking parameter
          should still resolve to one page rather than to a variant. */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content={SITE_LOCALE} />
      <meta property="og:url" content={canonical} />
      <meta property="og:title" content={fullTitle(resolvedSocialTitle)} />
      <meta property="og:description" content={resolvedDescription} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:alt" content={`${resolvedSocialTitle} | ${SITE_NAME}`} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={TWITTER_HANDLE} />
      <meta name="twitter:title" content={fullTitle(resolvedSocialTitle)} />
      <meta name="twitter:description" content={resolvedDescription} />
      <meta name="twitter:image" content={ogImage} />

      {nodes.length > 0 && (
        <script type="application/ld+json">{graph(nodes)}</script>
      )}
    </Helmet>
  );
}

export default Seo;
