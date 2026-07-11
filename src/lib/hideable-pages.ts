export interface HideablePage {
  key: string;
  label: string;
  path: string;
  /** UI grouping in the Pages management table. */
  group?: string;
}

// Every public content page that can be toggled on/off. Excluded by design:
// the homepage, legal pages (privacy, cookie, terms, disclaimer) and technical
// pages (auth, sitemap, apply, register, etc.). The statute page CAN be hidden.
//
// Division and fund detail pages are keyed per page (`division-<slug>` /
// `fund-<slug>`) so each one can be hidden individually — the routes build the
// same key from the URL slug via ParamVisibilityGate.
export const HIDEABLE_PAGES: HideablePage[] = [
  { key: 'about',         label: 'About',        path: '/about',          group: 'Main pages' },
  { key: 'members-index', label: 'People',       path: '/people',         group: 'Main pages' },
  { key: 'team',          label: 'Team',         path: '/people/members', group: 'Main pages' },
  { key: 'alumni',        label: 'Alumni',       path: '/people/alumni',  group: 'Main pages' },
  { key: 'events',        label: 'Events',       path: '/events',         group: 'Main pages' },
  { key: 'archive',       label: 'Archive',      path: '/archive',        group: 'Main pages' },
  { key: 'readings',      label: 'Readings',     path: '/readings',       group: 'Main pages' },
  { key: 'contacts',      label: 'Contacts',     path: '/contacts',       group: 'Main pages' },
  { key: 'partnerships',  label: 'Partnerships', path: '/partnerships',   group: 'Main pages' },
  { key: 'join',          label: 'Join',         path: '/join',           group: 'Main pages' },
  { key: 'lab',           label: 'Payoff Lab',   path: '/lab',            group: 'Main pages' },
  { key: 'statute',       label: 'Statute',      path: '/statute',        group: 'Main pages' },

  // Division detail pages (/divisions/:division)
  { key: 'division-equity',     label: 'Equity Research',       path: '/divisions/equity',     group: 'Divisions' },
  { key: 'division-investment', label: 'Investment Research',   path: '/divisions/investment', group: 'Divisions' },
  { key: 'division-macro',      label: 'Macro Research',        path: '/divisions/macro',      group: 'Divisions' },
  { key: 'division-portfolio',  label: 'Portfolio Management',  path: '/divisions/portfolio',  group: 'Divisions' },
  { key: 'division-quant',      label: 'Quantitative Research', path: '/divisions/quant',      group: 'Divisions' },

  // Fund detail pages (/funds/:fund)
  { key: 'fund-long-short',  label: 'Long Short Equity Fund',              path: '/funds/long-short',  group: 'Funds' },
  { key: 'fund-multi-asset', label: 'Multi Asset Global Opportunities Fund', path: '/funds/multi-asset', group: 'Funds' },
  { key: 'fund-dps',         label: 'Diversified Passive Selection Fund',   path: '/funds/dps',         group: 'Funds' },
  { key: 'fund-pir',         label: 'Italian Equity PIR Fund',             path: '/funds/pir',         group: 'Funds' },
];

export const HIDEABLE_PAGE_KEYS = HIDEABLE_PAGES.map((p) => p.key);
