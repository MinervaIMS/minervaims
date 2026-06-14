export interface HideablePage {
  key: string;
  label: string;
  path: string;
}

export const HIDEABLE_PAGES: HideablePage[] = [
  { key: 'about',         label: 'About',     path: '/about' },
  { key: 'members-index', label: 'People',    path: '/people' },
  { key: 'team',          label: 'Team',      path: '/people/members' },
  { key: 'alumni',        label: 'Alumni',    path: '/people/alumni' },
  { key: 'divisions',     label: 'Divisions', path: '/divisions/:division' },
  { key: 'funds',         label: 'Funds',     path: '/funds/:fund' },
  { key: 'events',        label: 'Events',    path: '/events' },
  { key: 'join',          label: 'Join',      path: '/join' },
  { key: 'archive',       label: 'Archive',   path: '/archive' },
  { key: 'readings',      label: 'Readings',  path: '/readings' },
  { key: 'statute',       label: 'Statute',   path: '/statute' },
];

export const HIDEABLE_PAGE_KEYS = HIDEABLE_PAGES.map((p) => p.key);
