// =====================================================================
// The workspace's navigation model, and the URLs it maps onto.
// ---------------------------------------------------------------------
// This used to live inside `MinervaWorkspace.tsx`, where the active
// section and subsection were two pieces of React state and the address
// bar said `/admin` no matter where you were. Nothing could be linked to,
// nothing could be bookmarked, the back button left the workspace
// entirely, and a reload always landed on the Dashboard.
//
// The structure moves here because it is now shared: the workspace shell
// renders from it, and other pages build links into the workspace with it
// without importing the (very large) workspace module.
//
// TWO KINDS OF NAME, AND THEY ARE DELIBERATELY DIFFERENT.
//
//   `key`  — the INTERNAL identifier. It drives the permission matrix,
//            the render switch, the help system, the search index and the
//            dashboard's shortcuts. Not one of them has changed, and not
//            one of them may: they are load-bearing in a dozen files.
//
//   `slug` — the identifier IN THE URL, and nothing else. It exists so
//            that `/workspace/reports/upload` reads as what it is, rather
//            than `/workspace/reports/reports-upload`.
//
// Keeping them separate is what makes this change safe. The URL is a new
// surface written on top of the existing model; the model itself is
// untouched, so every permission check, every render case and every
// existing caller behaves exactly as it did.
// =====================================================================

import type { ComponentType } from 'react';
import {
  BarChart3, CalendarDays, ClipboardList, FileBarChart2, HelpCircle,
  Image as ImageIcon, LayoutTemplate, Presentation, Settings as SettingsIcon,
  Star, User as UserIcon, Users as UsersIcon,
} from 'lucide-react';
import type { Permissions } from '@/hooks/usePermissions';
import { WORKSPACE_BASE, LEGACY_WORKSPACE_BASE } from '@/lib/workspace-base';

// Re-exported so anything that needs the navigation as well can take both
// from one place; the definitions themselves live in a module with no
// imports, so the eagerly-loaded site chrome can have the strings without
// the tree. See lib/workspace-base.ts.
export { WORKSPACE_BASE, LEGACY_WORKSPACE_BASE } from '@/lib/workspace-base';

export type SubItem = {
  key: string;
  /** The segment this subsection occupies in the URL. Unique in its section. */
  slug: string;
  label: string;
  /** Permission predicate. If omitted, always available to anyone with hasAnyAccess. */
  allowed?: (p: Permissions) => boolean;
};

export type NavSection = {
  key: string;
  /** The segment this section occupies in the URL. Unique across sections. */
  slug: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  subItems: SubItem[];
};

// Workspace navigation. Internal `key`s are intentionally unchanged (they drive
// routing, permissions and render cases); only labels, grouping and order are
// reorganised. NOTE: "Calendar" and "People" are kept even though they were not
// in the requested 10-section list, because removing them would remove real
// functionality (the shared calendar; members/advisors/alumni management).
export const NAV: NavSection[] = [
  {
    key: 'dashboard', slug: 'dashboard', label: 'Dashboard', Icon: BarChart3,
    subItems: [],
  },
  {
    key: 'my-role', slug: 'my-profile', label: 'My Profile', Icon: UserIcon,
    subItems: [],
  },
  {
    key: 'calendar', slug: 'calendar', label: 'Calendar', Icon: CalendarDays,
    subItems: [],
  },
  {
    key: 'reports', slug: 'reports', label: 'Reports', Icon: FileBarChart2,
    subItems: [
      { key: 'reports-upload', slug: 'upload', label: 'Upload Report', allowed: (p) => p.can('reports-upload') },
      { key: 'reports-archive', slug: 'archive', label: 'Report Archive', allowed: (p) => p.can('reports-archive') },
      { key: 'reports-templates', slug: 'templates', label: 'Templates & Repositories', allowed: (p) => p.can('reports-templates') },
      { key: 'reports-funds', slug: 'fund-performances', label: 'Fund Performances', allowed: (p) => p.can('reports-funds') },
    ],
  },
  {
    // The section is labelled "Recruiting" for members and "My Application"
    // for applicants, so the slug is the one word that is true of both.
    key: 'applications', slug: 'applications', label: 'Recruiting', Icon: ClipboardList,
    subItems: [
      { key: 'applications-website', slug: 'application-page', label: 'Application Page', allowed: (p) => p.can('applications-website') },
      { key: 'applications-screening', slug: 'screening', label: 'Candidates Screening', allowed: (p) => p.can('applications-screening') },
      { key: 'applications-interview-calendar', slug: 'interview-calendar', label: 'Interview Calendar', allowed: (p) => p.can('applications-interview-calendar') },
      { key: 'applications-joiners', slug: 'offers', label: 'Offers', allowed: (p) => p.can('applications-joiners') },
      { key: 'applications-form', slug: 'form', label: 'Form & Questions', allowed: (p) => p.can('applications-form') },
    ],
  },
  {
    key: 'events', slug: 'events', label: 'Events', Icon: Presentation,
    subItems: [
      { key: 'events-create', slug: 'create', label: 'Create Event', allowed: (p) => p.can('events-create') },
      { key: 'events-forms', slug: 'registration-forms', label: 'Registration Forms', allowed: (p) => p.can('events-forms') },
      { key: 'events-attendance', slug: 'attendance', label: 'Attendance', allowed: (p) => p.can('events-attendance') },
      { key: 'events-archive', slug: 'archive', label: 'Event Archive', allowed: (p) => p.can('events-archive') },
      { key: 'events-alumni-calls', slug: 'alumni-calls', label: 'Alumni Calls', allowed: (p) => p.can('events-alumni-calls') },
      { key: 'events-on-display', slug: 'association-on-display', label: 'Association On Display', allowed: (p) => p.can('events-on-display') },
    ],
  },
  {
    key: 'people', slug: 'people', label: 'People', Icon: UsersIcon,
    subItems: [
      { key: 'people-members', slug: 'members', label: 'Members', allowed: (p) => p.can('people-members') },
      { key: 'people-alumni', slug: 'alumni', label: 'Alumni', allowed: (p) => p.can('people-alumni') },
    ],
  },
  {
    key: 'smm', slug: 'social-media', label: 'Social Media', Icon: ImageIcon,
    subItems: [
      { key: 'smm-editorial', slug: 'editorial-calendar', label: 'Editorial Calendar', allowed: (p) => p.can('smm-editorial') },
      { key: 'smm-ig', slug: 'instagram', label: 'Instagram', allowed: (p) => p.can('smm-ig') },
      { key: 'smm-li', slug: 'linkedin', label: 'LinkedIn', allowed: (p) => p.can('smm-li') },
      { key: 'smm-graphics', slug: 'graphics', label: 'MIMS Graphics', allowed: (p) => p.can('smm-graphics') },
      { key: 'smm-other', slug: 'other-resources', label: 'Other Resources', allowed: (p) => p.can('smm-other') },
      { key: 'smm-brand', slug: 'design-system', label: 'Design System', allowed: (p) => p.can('smm-brand') },
      { key: 'smm-ads', slug: 'ads-and-spending', label: 'Ads & Spending', allowed: (p) => p.can('smm-ads') },
    ],
  },
  {
    key: 'operations', slug: 'operations', label: 'Operations', Icon: Star,
    subItems: [
      { key: 'ops-fee', slug: 'membership-fees', label: 'Membership Fees', allowed: (p) => p.can('ops-fee') },
      { key: 'ops-treasury', slug: 'treasury', label: 'Treasury', allowed: (p) => p.can('ops-treasury') },
      { key: 'ops-external', slug: 'external-relations', label: 'External Relations', allowed: (p) => p.can('ops-external') },
      { key: 'ops-docs', slug: 'statute-and-documents', label: 'Statute & Documents', allowed: (p) => p.can('ops-docs') },
    ],
  },

  {
    key: 'website', slug: 'website', label: 'Website', Icon: LayoutTemplate,
    subItems: [
      { key: 'website-pages', slug: 'pages', label: 'Pages', allowed: (p) => p.can('website-pages') },
      { key: 'website-readings', slug: 'readings', label: 'Readings', allowed: (p) => p.can('website-readings') },
      { key: 'website-testimonials', slug: 'testimonials', label: 'Testimonials', allowed: (p) => p.can('website-testimonials') },
      { key: 'website-history', slug: 'history', label: 'History', allowed: (p) => p.can('website-history') },
      { key: 'ops-newsletter', slug: 'newsletter', label: 'Newsletter', allowed: (p) => p.can('ops-newsletter') },
      { key: 'ops-auto-emails', slug: 'automatic-emails', label: 'Automatic Emails', allowed: (p) => p.can('ops-auto-emails') },
    ],
  },

  {
    key: 'settings', slug: 'settings', label: 'Settings', Icon: SettingsIcon,
    subItems: [
      { key: 'settings-users', slug: 'users', label: 'Users', allowed: (p) => p.can('settings-users') },
      { key: 'settings-roles', slug: 'role-permissions', label: 'Role Permissions', allowed: (p) => p.can('settings-roles') },
      { key: 'settings-activity', slug: 'activity-log', label: 'Activity Log', allowed: (p) => p.can('settings-activity') },
    ],
  },
  {
    key: 'welcome', slug: 'how-to-use', label: 'How To Use', Icon: HelpCircle,
    subItems: [],
  },
];

export function filterNav(permissions: Permissions): NavSection[] {
  return NAV
    .map((s) => ({ ...s, subItems: s.subItems.filter((si) => !si.allowed || si.allowed(permissions)) }))
    .filter((s) => s.key === 'my-role' || s.key === 'welcome' || s.key === 'dashboard' || s.key === 'calendar' || s.subItems.length > 0);
}

// Candidates are hard-isolated: they may only ever reach their own profile and
// their application status. This is enforced here, plus by the render guard in
// the workspace, plus by row-level security in the database (defence in depth).
// The candidate's whole workspace. It exists ONLY here: none of these keys
// appears in the member navigation, and `applications-faqs` is granted only by
// CANDIDATE_RESOURCES, so no member role can view it however it is reached.
export const CANDIDATE_NAV: NavSection[] = [
  { key: 'my-role', slug: 'my-profile', label: 'My Profile', Icon: UserIcon, subItems: [] },
  {
    key: 'applications', slug: 'applications', label: 'My Application', Icon: ClipboardList,
    subItems: [
      { key: 'applications-status', slug: 'status', label: 'Status' },
      { key: 'applications-interview-calendar', slug: 'interview-calendar', label: 'Interview Calendar' },
    ],
  },
  { key: 'applications-faqs', slug: 'faqs', label: 'FAQs', Icon: HelpCircle, subItems: [] },
];

// =====================================================================
// URLs
// =====================================================================

/**
 * Every section and subsection that EXISTS, regardless of who may see it.
 *
 * Both navigations are merged, because existence is a global fact while
 * permission is a per-role one. That distinction is the whole reason a
 * reader who follows a link to a section they cannot open is told "not
 * available for your role" rather than "no such page": the first is true
 * and useful, the second would be a lie.
 */
const ALL_SECTIONS: NavSection[] = (() => {
  const merged: NavSection[] = [...NAV];
  for (const c of CANDIDATE_NAV) {
    const existing = merged.find((s) => s.key === c.key);
    if (!existing) { merged.push(c); continue; }
    // Same section, extra subsections (the applicant's Status page).
    const subs = [...existing.subItems];
    for (const si of c.subItems) if (!subs.some((x) => x.key === si.key)) subs.push(si);
    merged[merged.indexOf(existing)] = { ...existing, subItems: subs };
  }
  return merged;
})();

/** key -> the section that owns it, across both navigations. */
const SECTION_BY_KEY = new Map(ALL_SECTIONS.map((s) => [s.key, s]));
/** subsection key -> its owning section, across both navigations. */
const SECTION_BY_SUB_KEY = new Map<string, NavSection>();
for (const s of ALL_SECTIONS) for (const si of s.subItems) if (!SECTION_BY_SUB_KEY.has(si.key)) SECTION_BY_SUB_KEY.set(si.key, s);

/**
 * The canonical URL for a section, and optionally one of its subsections.
 *
 * Falls back to the key when a slug is somehow missing, so a mistake here
 * produces an ugly URL rather than a broken one.
 */
export function workspacePath(sectionKey: string, subKey?: string | null): string {
  const section = SECTION_BY_KEY.get(sectionKey);
  const sectionSlug = section?.slug ?? sectionKey;
  if (!subKey) return `${WORKSPACE_BASE}/${sectionSlug}`;
  const sub = section?.subItems.find((si) => si.key === subKey);
  return `${WORKSPACE_BASE}/${sectionSlug}/${sub?.slug ?? subKey}`;
}

/**
 * The canonical URL for a target expressed the way the OLD query string
 * expressed it: a section, a subsection, or a subsection alone. Used by the
 * `/admin` compatibility route, which still has to understand
 * `?section=…&sub=…` links sent out in emails months ago.
 */
export function workspacePathForKeys(sectionKey?: string | null, subKey?: string | null): string {
  if (subKey) {
    const owner = SECTION_BY_SUB_KEY.get(subKey);
    if (owner) return workspacePath(owner.key, subKey);
  }
  if (sectionKey && SECTION_BY_KEY.has(sectionKey)) return workspacePath(sectionKey, subKey ?? null);
  return WORKSPACE_BASE;
}

/**
 * The two path segments after the workspace base, if any.
 *
 * Deliberately forgiving in three ways, because these are addresses people
 * type, paste and forward: a trailing slash is ignored, anything beyond the
 * second segment is ignored (and the canonicalising redirect then tidies the
 * address bar), and case is folded, so a link capitalised by a mail client
 * or a chat app still opens the page it names.
 */
export function parseWorkspaceUrl(pathname: string): { sectionSlug: string | null; subSlug: string | null } {
  const clean = pathname.replace(/\/+$/, '');
  for (const base of [WORKSPACE_BASE, LEGACY_WORKSPACE_BASE]) {
    if (clean === base) return { sectionSlug: null, subSlug: null };
    if (clean.startsWith(`${base}/`)) {
      const [sectionSlug, subSlug] = clean.slice(base.length + 1).split('/');
      return {
        sectionSlug: sectionSlug ? sectionSlug.toLowerCase() : null,
        subSlug: subSlug ? subSlug.toLowerCase() : null,
      };
    }
  }
  return { sectionSlug: null, subSlug: null };
}

export type WorkspaceResolution =
  /** The viewer may open this, and here is what to render. */
  | { status: 'ok'; sectionKey: string; subKey: string | null }
  /** It exists, but not for this role. `label` names it, for the notice. */
  | { status: 'forbidden'; label: string }
  /** No such section or subsection, for anybody. */
  | { status: 'unknown' }
  /** The URL names nothing at all: bare `/workspace`. */
  | { status: 'empty' };

/**
 * Resolve a URL against the navigation THIS VIEWER HAS.
 *
 * The order of the checks is the point. A slug is looked up first in the
 * viewer's own navigation, which is already permission-filtered; only if it
 * is missing there is it looked up in the complete set, and finding it there
 * is exactly what "exists but not for you" means. Nothing about the
 * permission model is re-implemented here - `visibleNav` has already applied
 * it - so this can never grant access the navigation would not.
 */
export function resolveWorkspaceTarget(
  visibleNav: NavSection[],
  sectionSlug: string | null,
  subSlug: string | null,
): WorkspaceResolution {
  if (!sectionSlug) return { status: 'empty' };

  const section = visibleNav.find((s) => s.slug === sectionSlug);
  if (section) {
    if (!subSlug) return { status: 'ok', sectionKey: section.key, subKey: section.subItems[0]?.key ?? null };
    const sub = section.subItems.find((si) => si.slug === subSlug);
    if (sub) return { status: 'ok', sectionKey: section.key, subKey: sub.key };
    // The section is open to this viewer; the subsection inside it is not.
    const full = ALL_SECTIONS.find((s) => s.slug === sectionSlug);
    const known = full?.subItems.find((si) => si.slug === subSlug);
    return known ? { status: 'forbidden', label: `${section.label} / ${known.label}` } : { status: 'unknown' };
  }

  const full = ALL_SECTIONS.find((s) => s.slug === sectionSlug);
  if (!full) return { status: 'unknown' };
  if (!subSlug) return { status: 'forbidden', label: full.label };
  const known = full.subItems.find((si) => si.slug === subSlug);
  return known
    ? { status: 'forbidden', label: `${full.label} / ${known.label}` }
    : { status: 'forbidden', label: full.label };
}

// Slugs are the URL, so a duplicate would silently make one page
// unreachable. This runs once, in development only, and is dropped from the
// production bundle along with the `import.meta.env.DEV` branch.
if (import.meta.env.DEV) {
  const sectionSlugs = ALL_SECTIONS.map((s) => s.slug);
  const dupSection = sectionSlugs.filter((s, i) => sectionSlugs.indexOf(s) !== i);
  if (dupSection.length) console.error('[workspace-nav] duplicate section slugs:', dupSection);
  for (const s of ALL_SECTIONS) {
    const subs = s.subItems.map((si) => si.slug);
    const dup = subs.filter((x, i) => subs.indexOf(x) !== i);
    if (dup.length) console.error(`[workspace-nav] duplicate sub slugs in "${s.slug}":`, dup);
  }
}
