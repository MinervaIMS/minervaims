// =====================================================================
// THE WEBSITE'S SEARCH: WHAT IS SEARCHED, AND WHAT A RESULT MAY SHOW
// (Step 107).
// ---------------------------------------------------------------------
// Everything here is what the public pages already show, read from the
// same sources: the pages themselves (lib/seo/routes.ts), every published
// report (public_reports, as the archive reads it), the current members
// as the Members page lists them (team_members), the events the Events
// page lists (website_events) and the readings (readings). Nothing a page
// does not show is searched or shown, and a page hidden from the website
// is left out with everything that lives on it.
//
// PEOPLE AND PRIVACY. A current member is found by name and leads to
// their entry on the Members page, as a report's byline does. Anybody
// else, alumni included, is found ONLY AS A CONTRIBUTOR TO REPORTS: the
// result says how many reports carry the name and in which years, and
// leads to those reports in the archive (/archive?author=<name>). It
// never shows, links to or searches an alumnus's employer, city or
// LinkedIn profile, and the alumni directory itself is not searched:
// those stay on the Alumni page for the most recent 100, and in the
// workspace for the rest (Privacy Policy, sections 4 and 5).
//
// Pure, so what is built can be tested (scripts/site-search.test.mjs);
// the reads are in loadSearchSources below, called when the search opens.
// =====================================================================
import type { SearchDoc } from './site-search';
import { ROUTE_META, DIVISION_META, FUND_META } from './seo/routes';
import { HIDEABLE_PAGES } from './hideable-pages';
import { authorArchivePath, reportPath, reportDate, type PublicReport } from './reports-public';
import { reportDivisionLabel, reportFundLabel, reportTypeLabel, reportYear } from './report-meta';

export interface SearchMember {
  id: string;
  name: string;
  surname: string;
  position: string | null;
  division: string | null;
  fund: string | null;
  is_board: boolean | null;
}

export interface SearchEvent {
  id: string;
  title: string;
  date: string | null;
  place: string | null;
  online?: boolean | null;
  moderator: string | null;
  guest: string[] | null;
  description: string | null;
  event_type: string | null;
  is_past: boolean | null;
  registration_enabled: boolean | null;
}

export interface SearchReading {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  publication_year: number | null;
  contributor_name: string | null;
  contributor_surname: string | null;
}

export interface SearchSources {
  reports: PublicReport[];
  members: SearchMember[];
  events: SearchEvent[];
  readings: SearchReading[];
  /** The page keys hidden from the website (page_visibility). */
  hidden: Set<string>;
  /** "Guest session" for "guest" (lib/events-api.ts eventTypeLabel). */
  eventType: (t: string | null) => string;
  /** Now, for upcoming and past. */
  now?: number;
}

/** The pages by the names the navigation and the footer give them, and the words a reader may use for them. */
export const SEARCH_PAGES: { path: string; name: string; words: string; boost: number }[] = [
  { path: '/', name: 'Home', words: 'home homepage minerva society bocconi', boost: 0.4 },
  { path: '/about', name: 'About', words: 'about history mission story who we are founded divisions board', boost: 0.5 },
  { path: '/people/members', name: 'Members', words: 'members team people board president vice president analysts heads', boost: 0.5 },
  { path: '/people/alumni', name: 'Alumni', words: 'alumni former members careers network alumni calls where alumni work', boost: 0.5 },
  { path: '/events', name: 'Events', words: 'events talks guest sessions speakers calendar company visits alumni calls register', boost: 0.5 },
  { path: '/archive', name: 'Report Archive', words: 'archive reports research publications papers pdf', boost: 0.5 },
  { path: '/readings', name: 'Readings', words: 'readings books recommended reading list', boost: 0.3 },
  { path: '/join', name: 'Join Minerva', words: 'join apply application recruitment recruiting selection interview deadline questions membership fee', boost: 0.6 },
  { path: '/join/division-fit', name: 'Division Fit', words: 'division fit quiz test which division guide', boost: 0.3 },
  { path: '/apply', name: 'Apply', words: 'apply application form candidate', boost: 0.3 },
  { path: '/company-relations', name: 'Company relations', words: 'companies company relations sponsors sponsorship collaboration corporate recruiters firms formats', boost: 0.4 },
  { path: '/partnerships', name: 'Partnerships', words: 'partners partnerships associations student associations agreements collaboration', boost: 0.4 },
  { path: '/track-record', name: "Minerva's Track Record", words: 'numbers figures statistics stats track record data in numbers', boost: 0.4 },
  { path: '/contacts', name: 'Contacts', words: 'contact contacts email mail reach get in touch', boost: 0.5 },
  { path: '/statute', name: 'Society Statute', words: 'statute constitution bylaws rules governance', boost: 0.2 },
  { path: '/sitemap', name: 'Sitemap', words: 'sitemap all pages map', boost: 0 },
  { path: '/lab', name: 'Payoff Lab', words: 'payoff lab options derivatives strategy calculator', boost: 0.1 },
  { path: '/privacy-policy', name: 'Privacy Policy', words: 'privacy gdpr personal data protection', boost: 0 },
  { path: '/cookie-policy', name: 'Cookie Policy', words: 'cookies cookie', boost: 0 },
  { path: '/terms-of-use', name: 'Terms of Use', words: 'terms conditions use', boost: 0 },
  { path: '/disclaimer', name: 'Disclaimer', words: 'disclaimer investment advice liability', boost: 0 },
];

const HIDE_KEY_BY_PATH = new Map(HIDEABLE_PAGES.map((p) => [p.path, p.key]));
const hiddenPath = (path: string, hidden: Set<string>) => {
  const key = HIDE_KEY_BY_PATH.get(path);
  return !!key && hidden.has(key);
};

const clip = (s: string | null | undefined, n: number) => {
  const t = (s ?? '').replace(/\s+/g, ' ').trim();
  return t.length <= n ? t : `${t.slice(0, t.lastIndexOf(' ', n) > 40 ? t.lastIndexOf(' ', n) : n)}…`;
};

const DIVISION_NAMES: Record<string, string> = {
  equity: 'Equity Research', investment: 'Investment Research', macro: 'Macro Research',
  portfolio: 'Portfolio Management', quant: 'Quantitative Research', operations: 'Operations', media: 'Media',
};

const yearsLabel = (years: number[]) => {
  if (!years.length) return '';
  const lo = Math.min(...years), hi = Math.max(...years);
  return lo === hi ? String(lo) : `${lo} to ${hi}`;
};

const personKey = (name: string) => name.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]+/g, ' ').trim();

/** Every document of the website's search, from what the pages show. */
export function buildSiteDocs(src: SearchSources): SearchDoc[] {
  const docs: SearchDoc[] = [];
  const hidden = src.hidden;
  const now = src.now ?? Date.now();

  // Pages.
  for (const p of SEARCH_PAGES) {
    const meta = ROUTE_META[p.path];
    if (!meta || meta.noindex || hiddenPath(p.path, hidden)) continue;
    docs.push({
      id: `page:${p.path}`, kind: 'page', title: p.name, meta: clip(meta.description, 120), href: p.path,
      fields: [{ text: p.name, weight: 3 }, { text: meta.title, weight: 2 }, { text: p.words, weight: 1.4 }, { text: meta.description, weight: 0.6 }],
      boost: p.boost,
    });
  }
  for (const [slug, m] of Object.entries(DIVISION_META)) {
    const path = `/divisions/${slug}`;
    if (hidden.has(`division-${slug}`)) continue;
    docs.push({
      id: `page:${path}`, kind: 'page', title: m.title, meta: clip(m.description, 120), href: path,
      fields: [{ text: m.title, weight: 3 }, { text: `${DIVISION_NAMES[slug] ?? ''} division research`, weight: 1.4 }, { text: m.description, weight: 0.6 }],
      boost: 0.45,
    });
  }
  for (const [slug, m] of Object.entries(FUND_META)) {
    const path = `/funds/${slug}`;
    if (hidden.has(`fund-${slug}`)) continue;
    docs.push({
      id: `page:${path}`, kind: 'page', title: m.title, meta: clip(m.description, 120), href: path,
      fields: [{ text: m.title, weight: 3 }, { text: `fund portfolio ${slug.replace(/-/g, ' ')}`, weight: 1.4 }, { text: m.description, weight: 0.6 }],
      boost: 0.45,
    });
  }

  // Current members, as the Members page lists them.
  const memberNames = new Set<string>();
  if (!hidden.has('team')) {
    for (const m of src.members) {
      const name = `${m.name ?? ''} ${m.surname ?? ''}`.replace(/\s+/g, ' ').trim();
      if (!name) continue;
      memberNames.add(personKey(name));
      const division = m.division ? DIVISION_NAMES[m.division] ?? '' : '';
      const position = (m.position ?? '').trim();
      const fund = m.fund && ['long-short', 'multi-asset', 'dps', 'pir'].includes(m.fund) ? reportFundLabel(m.fund) : '';
      const where = [division && !position.includes(division) ? division : '', fund].filter(Boolean).join(', ');
      docs.push({
        id: `member:${m.id}`, kind: 'person', title: name,
        meta: [position || 'Member', where].filter(Boolean).join(', '),
        href: `/people/members?person=${encodeURIComponent(m.id)}`,
        fields: [{ text: name, weight: 3 }, { text: position, weight: 1.2 }, { text: `${division} ${fund} member${m.is_board ? ' board' : ''}`, weight: 0.8 }],
        boost: m.is_board ? 0.3 : 0.15,
      });
    }
  }

  // Reports, and the people who wrote them.
  if (!hidden.has('archive')) {
    const contributors = new Map<string, { name: string; years: number[]; reports: number; divisions: Set<string> }>();
    for (const r of src.reports) {
      const authors = (r.authors ?? []).map((a) => a.name).filter(Boolean);
      const year = reportYear(r.date);
      const ageYears = Math.max(0, (now - (Date.parse(r.date) || now)) / (365.25 * 864e5));
      const fund = r.fund ? reportFundLabel(r.fund) : '';
      docs.push({
        id: `report:${r.id}`, kind: 'report', title: r.title,
        meta: [reportTypeLabel(r.report_type), fund || reportDivisionLabel(r.division), reportDate(r.date)].filter(Boolean).join(' · '),
        body: [r.description ?? '', authors.length ? `By ${authors.join(', ')}.` : ''].filter(Boolean).join(' '),
        href: reportPath(r.slug),
        fields: [
          { text: r.title, weight: 3 },
          { text: authors.join(' '), weight: 2 },
          { text: [...(r.tags ?? []), fund, reportDivisionLabel(r.division), reportTypeLabel(r.report_type), year].join(' '), weight: 1.2 },
          { text: r.description ?? '', weight: 0.6 },
        ],
        boost: Math.max(0, 0.3 - ageYears * 0.05),
        date: r.date,
      });
      for (const a of r.authors ?? []) {
        const n = (a.name ?? '').replace(/\s+/g, ' ').trim();
        if (!n) continue;
        // A current member is found as a member, above; this is everybody else.
        if (a.link?.startsWith('/people/members') && !hidden.has('team')) continue;
        const key = personKey(n);
        if (memberNames.has(key)) continue;
        const c = contributors.get(key) ?? { name: n, years: [], reports: 0, divisions: new Set<string>() };
        c.reports += 1;
        const y = Number(year);
        if (Number.isFinite(y) && y > 0) c.years.push(y);
        if (r.division) c.divisions.add(reportDivisionLabel(r.division));
        contributors.set(key, c);
      }
    }
    for (const [key, c] of contributors) {
      docs.push({
        id: `contributor:${key}`, kind: 'person', title: c.name,
        // How many reports carry the name, and when: what the reports
        // themselves print, and nothing about the person today.
        meta: `Contributor to ${c.reports} ${c.reports === 1 ? 'report' : 'reports'}${c.years.length ? `, ${yearsLabel(c.years)}` : ''}${c.divisions.size ? ` · ${[...c.divisions].join(', ')}` : ''}`,
        href: authorArchivePath(c.name),
        fields: [{ text: c.name, weight: 3 }, { text: [...c.divisions].join(' '), weight: 0.5 }],
        boost: 0,
      });
    }
  }

  // Events, as the Events page lists them.
  if (!hidden.has('events')) {
    for (const e of src.events) {
      const when = e.date ? Date.parse(e.date) : NaN;
      const upcoming = Number.isFinite(when) ? when >= now - 864e5 : e.is_past === false;
      const day = e.date ? reportDate(e.date) : '';
      docs.push({
        id: `event:${e.id}`, kind: 'event', title: e.title,
        meta: [src.eventType(e.event_type), day || (upcoming ? 'Date to be announced' : ''), upcoming ? 'Upcoming' : ''].filter(Boolean).join(' · '),
        // The guests are searched but never quoted: a guest line names an
        // employer, and a result says nothing about a person's work.
        body: e.description ?? '',
        href: upcoming && e.registration_enabled ? `/events/${encodeURIComponent(e.id)}/register` : `/events?q=${encodeURIComponent(e.title)}`,
        fields: [
          { text: e.title, weight: 3 },
          { text: [...(e.guest ?? []), e.moderator ?? ''].join(' '), weight: 1.6 },
          { text: [src.eventType(e.event_type), e.place ?? '', e.date ? reportYear(e.date) : ''].join(' '), weight: 1 },
          { text: e.description ?? '', weight: 0.6 },
        ],
        boost: upcoming ? 0.5 : 0.1,
        date: e.date,
      });
    }
  }

  // Readings.
  if (!hidden.has('readings')) {
    for (const r of src.readings) {
      const by = [r.contributor_name, r.contributor_surname].filter(Boolean).join(' ');
      docs.push({
        id: `reading:${r.id}`, kind: 'reading', title: r.title,
        meta: [r.author, r.publication_year ? String(r.publication_year) : '', by ? `recommended by ${by}` : ''].filter(Boolean).join(' · '),
        body: r.description ?? '',
        href: '/readings',
        fields: [{ text: r.title, weight: 3 }, { text: r.author ?? '', weight: 2 }, { text: by, weight: 1 }, { text: r.description ?? '', weight: 0.6 }],
        boost: 0,
      });
    }
  }
  return docs;
}

/** The pages offered before anything is typed. */
export const SEARCH_START_PAGES = ['/archive', '/join', '/events', '/people/members', '/track-record', '/contacts'];
