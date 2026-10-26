// =====================================================================
// The bottom bar of the workspace on a phone (Step 98).
// ---------------------------------------------------------------------
// The workspace has ten sections and a phone has room for five buttons,
// so the bar holds the places people go most and leaves the rest to the
// Menu, which opens the full navigation. A button the reader's
// navigation does not offer is not drawn: the bar is built from the same
// navigation the menu shows, so it can never lead anywhere the role, or
// an applicant's stage, does not already open.
//
//   Members     Menu · Dashboard · My Events · My Profile · Search
//   Applicants  Status · Interview, Phone Call or Offer · Profile · FAQs
//
// An applicant's second button is the latest of their stage pages that
// exists for them now: Offer once an offer is sent, else Phone Call once
// they are invited to one, else Interview once a division has invited
// them, else nothing. The earlier pages stay in the chips at the top.
// =====================================================================

export interface BarNavSection {
  key: string;
  label: string;
  subItems: { key: string; label: string }[];
}

export type BarItem =
  | { kind: 'menu'; id: 'menu'; label: string }
  | { kind: 'search'; id: 'search'; label: string }
  | { kind: 'page'; id: string; label: string; sectionKey: string; subKey: string | null };

const page = (id: string, label: string, sectionKey: string, subKey: string | null): BarItem =>
  ({ kind: 'page', id, label, sectionKey, subKey });

/** The bar for a member, an advisor or an alumnus: only what their navigation offers. */
export function memberBar(nav: BarNavSection[]): BarItem[] {
  const items: BarItem[] = [{ kind: 'menu', id: 'menu', label: 'Menu' }];
  if (nav.some((s) => s.key === 'dashboard')) items.push(page('dashboard', 'Dashboard', 'dashboard', null));
  const events = nav.find((s) => s.key === 'events');
  if (events?.subItems.some((si) => si.key === 'events-mine')) items.push(page('events-mine', 'My Events', 'events', 'events-mine'));
  if (nav.some((s) => s.key === 'my-role')) items.push(page('my-role', 'My Profile', 'my-role', null));
  items.push({ kind: 'search', id: 'search', label: 'Search' });
  return items;
}

/** The stage pages, latest first. */
const STAGE_PAGES = ['applications-offer', 'applications-call', 'applications-interview'];

/** The bar for an applicant: only the pages their stage has opened. */
export function applicantBar(nav: BarNavSection[]): BarItem[] {
  const items: BarItem[] = [];
  const application = nav.find((s) => s.key === 'applications');
  const subs = application?.subItems ?? [];
  if (subs.some((si) => si.key === 'applications-status')) items.push(page('applications-status', 'Status', 'applications', 'applications-status'));
  const stage = STAGE_PAGES.map((k) => subs.find((si) => si.key === k)).find(Boolean);
  if (stage) items.push(page(stage.key, stage.label, 'applications', stage.key));
  if (nav.some((s) => s.key === 'my-role')) items.push(page('my-role', 'Profile', 'my-role', null));
  if (nav.some((s) => s.key === 'applications-faqs')) items.push(page('applications-faqs', 'FAQs', 'applications-faqs', null));
  return items;
}

/** Is this button the page being read? A section button covers its subsections. */
export function isBarItemActive(item: BarItem, activeSectionKey: string | null, activeSubKey: string | null): boolean {
  if (item.kind !== 'page') return false;
  if (item.sectionKey !== activeSectionKey) return false;
  return item.subKey === null || item.subKey === activeSubKey;
}

/**
 * The pages the shell leaves exactly as they are: the Dashboard and the
 * Calendar keep their own layout, so no spacing or touch rule of Step 98
 * reaches them, directly or through the shell.
 */
export function isProtectedPage(activeSectionKey: string | null): boolean {
  return activeSectionKey === 'dashboard' || activeSectionKey === 'calendar';
}
