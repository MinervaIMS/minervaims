/**
 * Central registry of pages whose visibility can be toggled from
 * Workspace › Website › Pages.
 *
 * Adding a new page to the website:
 * 1. Add one entry below (pick a stable, kebab-case `key`).
 * 2. Wrap the page route in `<PageVisibilityGate pageKey="<key>">` in App.tsx.
 *    (Or wrap the page body directly — see PageHiddenOverlay.)
 *
 * The Homepage and core legal pages are intentionally excluded — they
 * cannot be hidden.
 */
export interface HideablePage {
  key: string;
  label: string;
  path: string;
}

export const HIDEABLE_PAGES: HideablePage[] = [
  { key: 'about', label: 'About', path: '/about' },
  { key: 'members-index', label: 'People', path: '/people' },
  { key: 'team', label: 'Team', path: '/people/members' },
  { key: 'alumni', label: 'Alumni', path: '/people/alumni' },
  { key: 'divisions', label: 'Divisions', path: '/divisions/:division' },
  { key: 'funds', label: 'Funds', path: '/funds/:fund' },
  { key: 'events', label: 'Events', path: '/events' },
  { key: 'join', label: 'Join', path: '/join' },
  { key: 'archive', label: 'Archive', path: '/archive' },
  { key: 'readings', label: 'Readings', path: '/readings' },
  { key: 'statute', label: 'Statute', path: '/statute' },
];

export const HIDEABLE_PAGE_KEYS = HIDEABLE_PAGES.map((p) => p.key);
