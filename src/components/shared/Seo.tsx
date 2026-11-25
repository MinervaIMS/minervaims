import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { SITE_NAME, canonicalPath } from '@/lib/seo/site';
import { headTags } from '@/lib/seo/head-tags';
import { releaseStaticPage } from '@/lib/page-data';
import { ROUTE_META, type RouteMeta } from '@/lib/seo/routes';
import { breadcrumbSchema, graph, type JsonLd } from '@/lib/seo/structured-data';

// =====================================================================
// Seo: one component, every page, every tag.
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
  /**
   * The sharing card's line, where it should say more than the search
   * snippet (a report, an event: who it is by, and when).
   */
  socialDescription?: string;
  /**
   * The sharing picture's card (lib/seo/share-cards.ts). Defaults to the
   * card of this page's address, so a static route passes nothing.
   */
  card?: string;
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

// The title's suffix rule lives in lib/seo/head.ts, shared with the
// static pages the build writes.

export function Seo({
  page, title, description, socialTitle, socialDescription, card, image, noindex, breadcrumbs, structuredData,
}: SeoProps) {
  const location = useLocation();
  // A page renders its Seo once its content is on screen: that is the
  // moment the static copy the build wrote for crawlers (if this load
  // came with one) gives way to the app. See lib/page-data.ts.
  useEffect(() => { releaseStaticPage(); }, []);
  const path = canonicalPath(page ?? location.pathname);
  const meta: RouteMeta | undefined = ROUTE_META[path] ?? ROUTE_META[page ?? ''];

  const resolvedTitle = title ?? meta?.title ?? SITE_NAME;
  const resolvedDescription =
    description ??
    meta?.description ??
    'Minerva Investment Management Society is the Bocconi University student society for investment research and portfolio management.';
  const resolvedSocialTitle = socialTitle ?? meta?.socialTitle ?? resolvedTitle;
  const resolvedNoindex = noindex ?? meta?.noindex ?? false;

  // Every tag below comes from lib/seo/head-tags.ts, the function the
  // build's static pages call too (Step 109): the card a chat app reads
  // from the HTML and the tags the app writes are the same tags.
  const tags = headTags({
    path,
    title: resolvedTitle,
    description: resolvedDescription,
    socialTitle: resolvedSocialTitle,
    socialDescription,
    card,
    image,
    noindex: resolvedNoindex,
  });

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
      <title>{tags.title}</title>
      <meta name="description" content={tags.description} />
      {/* NO CANONICAL ON A PAGE THAT IS NOT TO BE INDEXED. The two are
          contradictory instructions: one says do not index this, the other
          nominates it as the preferred version of itself. Google's own
          guidance is to send one signal, and on a 404 a canonical would
          nominate an address that does not exist. */}
      {tags.canonical && <link rel="canonical" href={tags.canonical} />}
      <meta name="robots" content={tags.robots} />

      {/* Open Graph and Twitter: the sharing card. `og:url` is the
          canonical, not the address the reader happens to be on: a link
          shared with a tracking parameter still resolves to one page. */}
      {tags.meta.map((m) => (m.attr === 'property'
        ? <meta key={m.key} property={m.key} content={m.content} />
        : <meta key={m.key} name={m.key} content={m.content} />))}

      {nodes.length > 0 && (
        <script type="application/ld+json">{graph(nodes)}</script>
      )}
    </Helmet>
  );
}

export default Seo;
