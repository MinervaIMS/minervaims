// =====================================================================
// Structured data: the site, stated as facts rather than as prose.
// ---------------------------------------------------------------------
// This is the single highest-value thing on the page for both audiences
// the association now has to write for.
//
// A search engine uses it to understand what the association IS rather
// than guessing from the words on the page, which is what earns a rich
// result rather than a blue link.
//
// A language model answering "what is Minerva IMS at Bocconi and how do
// I apply" uses it because it is unambiguous: a paragraph has to be
// interpreted, whereas `foundingDate: 2017` and a list of five divisions
// with their own descriptions do not. Where the prose and the structured
// data would disagree the structured data wins, so everything here is
// built from the same strings the pages themselves render.
//
// Every builder returns a plain object. `Seo` serialises it; nothing here
// touches the DOM.
// =====================================================================

import {
  SITE_URL, SITE_NAME, SITE_SHORT_NAME, SOCIAL_PROFILES, CONTACT_EMAIL,
  absoluteUrl, DEFAULT_OG_IMAGE,
} from './site';
import { DIVISION_META, FUND_META } from './routes';

/** A loose JSON-LD node. Deliberately not modelled: schema.org is large. */
export type JsonLd = Record<string, unknown>;

/** The stable identifier every other node points back at. */
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

/**
 * The association itself.
 *
 * `@id` matters more than it looks: it lets the event, breadcrumb and
 * collection nodes on other pages refer to THIS organisation rather than
 * each asserting a fresh, unrelated one, which is how a crawler ends up
 * believing a site describes several different bodies with the same name.
 */
export function organizationSchema(): JsonLd {
  return {
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: SITE_NAME,
    alternateName: [SITE_SHORT_NAME, 'Minerva IMS'],
    url: SITE_URL,
    logo: {
      '@type': 'ImageObject',
      url: absoluteUrl('/favicon.png'),
      width: 512,
      height: 512,
    },
    image: absoluteUrl(DEFAULT_OG_IMAGE),
    description:
      'A student association of Università Bocconi, founded in 2017, dedicated to investment research and portfolio management. It runs five research divisions and two student-managed funds, publishes research reports, and maintains an international alumni network.',
    foundingDate: '2017',
    email: CONTACT_EMAIL,
    sameAs: SOCIAL_PROFILES,
    parentOrganization: {
      '@type': 'CollegeOrUniversity',
      name: 'Università Bocconi',
      alternateName: 'Bocconi University',
      url: 'https://www.unibocconi.it',
    },
    location: {
      '@type': 'Place',
      name: 'Università Bocconi',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Via Roberto Sarfatti 25',
        addressLocality: 'Milan',
        postalCode: '20136',
        addressCountry: 'IT',
      },
    },
    knowsAbout: [
      'Equity research',
      'Investment research',
      'Macroeconomic research',
      'Portfolio management',
      'Quantitative finance',
      'Asset management',
    ],
    // The divisions, as sub-organisations. This is what lets a model answer
    // "which divisions does Minerva have" without reading five pages.
    subOrganization: Object.entries(DIVISION_META).map(([key, meta]) => ({
      '@type': 'Organization',
      name: meta.title.replace(/ Division$/, ''),
      url: absoluteUrl(`/divisions/${key}`),
      description: meta.description,
    })),
  };
}

/** The website, as distinct from the association that publishes it. */
export function websiteSchema(): JsonLd {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: SITE_URL,
    name: SITE_NAME,
    alternateName: SITE_SHORT_NAME,
    inLanguage: 'en-GB',
    publisher: { '@id': ORGANIZATION_ID },
  };
}

/**
 * The trail from the homepage to this page.
 *
 * Search results show it in place of a raw URL, and it tells a crawler
 * where a page sits rather than leaving it to infer structure from the
 * address. `position` is 1-based; the current page is included and is its
 * own last item, which is what the specification asks for.
 */
export function breadcrumbSchema(trail: { name: string; path: string }[]): JsonLd {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

/**
 * A set of questions and their answers.
 *
 * Used on /join, where the association already publishes real admissions
 * questions. This is the single most directly useful node on the site for
 * somebody asking a language model about applying, because each answer is
 * attached to the exact question it answers rather than being a paragraph
 * that happens to contain it.
 *
 * Answers are plain text: schema.org allows limited HTML, and stripping it
 * is safer than passing through whatever an editor typed.
 */
export function faqSchema(entries: { question: string; answer: string }[]): JsonLd | null {
  const clean = entries
    .map((e) => ({ question: e.question?.trim(), answer: e.answer?.trim() }))
    .filter((e) => e.question && e.answer);
  if (clean.length === 0) return null;
  return {
    '@type': 'FAQPage',
    mainEntity: clean.map((e) => ({
      '@type': 'Question',
      name: e.question,
      acceptedAnswer: { '@type': 'Answer', text: e.answer },
    })),
  };
}

/** One event the association has held or will hold. */
export interface EventInput {
  id: string;
  title: string;
  date: string;
  place?: string | null;
  description?: string | null;
  online?: boolean | null;
  posterUrl?: string | null;
  guests?: string[] | null;
}

/**
 * The events on a page, as a list of events.
 *
 * `eventAttendanceMode` and `eventStatus` are required for a valid Event
 * node; omitting them is the usual reason an otherwise correct events page
 * earns nothing in search. A past event stays `EventScheduled`: it
 * happened, which is different from having been cancelled.
 */
export function eventListSchema(events: EventInput[], listName: string): JsonLd | null {
  if (events.length === 0) return null;
  return {
    '@type': 'ItemList',
    name: listName,
    numberOfItems: events.length,
    itemListElement: events.map((e, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Event',
        name: e.title,
        startDate: e.date,
        eventAttendanceMode: e.online
          ? 'https://schema.org/OnlineEventAttendanceMode'
          : 'https://schema.org/OfflineEventAttendanceMode',
        eventStatus: 'https://schema.org/EventScheduled',
        ...(e.description ? { description: e.description } : {}),
        ...(e.posterUrl ? { image: absoluteUrl(e.posterUrl) } : {}),
        location: e.online
          ? { '@type': 'VirtualLocation', url: absoluteUrl('/events') }
          : { '@type': 'Place', name: e.place || 'Università Bocconi', address: {
              '@type': 'PostalAddress', addressLocality: 'Milan', addressCountry: 'IT',
            } },
        organizer: { '@id': ORGANIZATION_ID },
        ...(e.guests && e.guests.length
          ? { performer: e.guests.map((g) => ({ '@type': 'Person', name: g.split(' - ')[0] })) }
          : {}),
      },
    })),
  };
}

/** One published research report. */
export interface ReportInput {
  id: string;
  title: string;
  date: string;
  description?: string | null;
  url?: string | null;
  division?: string | null;
}

/**
 * The research on a page, as a list of scholarly articles.
 *
 * `Report` is the closest schema.org type to what these documents are:
 * dated, authored analysis published by an organisation. Naming the
 * association as both author and publisher is accurate, since the reports
 * are collective work and are not individually bylined on the site.
 */
export function reportListSchema(reports: ReportInput[], listName: string): JsonLd | null {
  if (reports.length === 0) return null;
  return {
    '@type': 'ItemList',
    name: listName,
    numberOfItems: reports.length,
    itemListElement: reports.map((r, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Report',
        name: r.title,
        datePublished: r.date,
        ...(r.description ? { abstract: r.description } : {}),
        ...(r.url ? { url: r.url } : {}),
        inLanguage: 'en',
        author: { '@id': ORGANIZATION_ID },
        publisher: { '@id': ORGANIZATION_ID },
        isAccessibleForFree: true,
      },
    })),
  };
}

/** The two student-managed funds, for the About and fund pages. */
export function fundSchema(key: string): JsonLd | null {
  const meta = FUND_META[key];
  if (!meta) return null;
  return {
    '@type': 'InvestmentOrDeposit',
    name: meta.title,
    description: meta.description,
    url: absoluteUrl(`/funds/${key}`),
    provider: { '@id': ORGANIZATION_ID },
  };
}

/**
 * Wrap one or more nodes in a single `@graph`.
 *
 * One script tag holding a graph is easier for a consumer to resolve than
 * five sibling tags each asserting its own island, and it is the only way
 * the `@id` references above actually join up.
 */
export function graph(nodes: (JsonLd | null | undefined)[]): string {
  const kept = nodes.filter(Boolean) as JsonLd[];
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': kept });
}
