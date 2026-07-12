// =====================================================================
// Access-control matrix — SINGLE SOURCE OF TRUTH
// ---------------------------------------------------------------------
// This module encodes who can do what, where. It is authored from the
// society's role-permissions matrix (roles x subsections) and it is the
// SAME data that (a) enforces access across the workspace and (b) renders
// the "Role access permissions" table in Settings, so the two can never
// drift apart again.
//
//   Levels:   none  <  view  <  edit  <  manage
//     none   — Hidden: the subsection never appears for the role.
//     view   — "Interact only": open + read + light actions (register,
//              preview, download), but no create / edit / delete.
//     manage — "Full interact": everything, incl. create / edit / delete.
//   (`edit` exists for completeness but the matrix only uses none/view/manage.)
//
// Nuances that don't fit a single level are expressed as SPECIAL_RULES and
// as division scoping (see below), mirroring the "Special permissions"
// sheet of the source workbook.
// =====================================================================

import type { AppRole } from '@/lib/roles';
import { normalizeRole } from '@/lib/roles';

export type AccessLevel = 'none' | 'view' | 'edit' | 'manage';

const LEVEL_ORDER: Record<AccessLevel, number> = { none: 0, view: 1, edit: 2, manage: 3 };

export function atLeast(level: AccessLevel, required: AccessLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[required];
}

function maxLevel(a: AccessLevel, b: AccessLevel): AccessLevel {
  return LEVEL_ORDER[a] >= LEVEL_ORDER[b] ? a : b;
}

// Resource keys mirror the workspace navigation keys in MinervaWorkspace.
export type ResourceKey = string;

// Baseline pages every authorised (non-candidate) user can at least view.
export const BASELINE_RESOURCES: ResourceKey[] = ['my-role', 'welcome', 'dashboard', 'calendar'];

// Candidates may ONLY ever reach these. Enforced here, in the workspace
// route guard, and again in the database via RLS (defence in depth).
// A candidate's profile is READ-ONLY: personal data is captured by the
// application form and cannot be changed afterwards.
export const CANDIDATE_RESOURCES: Record<ResourceKey, AccessLevel> = {
  'my-role': 'view',
  'applications-status': 'view',
  'applications-interview-calendar': 'view',
};

type RoleGrants = Record<ResourceKey, AccessLevel>;

// '*' grants a level to every resource (used by full-access roles).
const FULL: RoleGrants = { '*': 'manage' };

// Per-role grants by normalised role. Anything not listed = none (Hidden).
// admin/president are association-wide full access; every other role is
// granted explicitly from the matrix. Members, pending and candidates have
// no general grants (candidates are governed by CANDIDATE_RESOURCES).
export const DEFAULT_MATRIX: Partial<Record<AppRole, RoleGrants>> = {
  admin: FULL,
  president: FULL,
  vice_president: { 'my-role': 'manage', 'dashboard': 'view', 'welcome': 'view', 'calendar': 'manage', 'reports-upload': 'manage', 'reports-archive': 'manage', 'reports-templates': 'manage', 'reports-funds': 'manage', 'applications-website': 'manage', 'applications-screening': 'manage', 'applications-interview-calendar': 'manage', 'applications-joiners': 'view', 'applications-form': 'manage', 'events-create': 'manage', 'events-forms': 'manage', 'events-attendance': 'manage', 'events-archive': 'manage', 'events-alumni-calls': 'manage', 'events-on-display': 'manage', 'people-members': 'manage', 'people-advisors': 'view', 'people-alumni': 'view', 'smm-editorial': 'manage', 'smm-ig': 'manage', 'smm-li': 'manage', 'smm-other': 'manage', 'smm-brand': 'manage', 'smm-ads': 'manage', 'ops-fee': 'manage', 'ops-treasury': 'manage', 'ops-external': 'manage', 'ops-docs': 'manage', 'website-pages': 'view', 'website-readings': 'manage', 'website-testimonials': 'manage', 'ops-newsletter': 'view', 'ops-auto-emails': 'view', 'settings-users': 'view', 'settings-roles': 'view', 'settings-activity': 'view' },
  head_of_asset_management: { 'my-role': 'manage', 'dashboard': 'view', 'welcome': 'view', 'calendar': 'view', 'reports-upload': 'manage', 'reports-archive': 'manage', 'reports-templates': 'manage', 'reports-funds': 'manage', 'applications-screening': 'manage', 'applications-interview-calendar': 'manage', 'applications-joiners': 'view', 'applications-form': 'manage', 'events-attendance': 'view', 'events-archive': 'view', 'events-alumni-calls': 'manage', 'events-on-display': 'view', 'people-members': 'view', 'people-advisors': 'view', 'people-alumni': 'view', 'smm-editorial': 'view', 'smm-ig': 'view', 'smm-li': 'view', 'smm-other': 'view', 'smm-brand': 'view', 'smm-ads': 'view', 'ops-fee': 'view', 'ops-treasury': 'view', 'ops-external': 'view', 'ops-docs': 'view', 'website-readings': 'manage' },
  head_of_division: { 'my-role': 'manage', 'dashboard': 'view', 'welcome': 'view', 'calendar': 'view', 'reports-upload': 'manage', 'reports-archive': 'manage', 'reports-templates': 'manage', 'reports-funds': 'manage', 'applications-screening': 'manage', 'applications-interview-calendar': 'manage', 'applications-joiners': 'view', 'applications-form': 'manage', 'events-attendance': 'view', 'events-archive': 'view', 'events-alumni-calls': 'manage', 'events-on-display': 'view', 'people-members': 'view', 'people-advisors': 'view', 'people-alumni': 'view', 'ops-fee': 'view', 'ops-treasury': 'view', 'ops-external': 'view', 'ops-docs': 'view', 'website-readings': 'manage' },
  portfolio_manager: { 'my-role': 'manage', 'dashboard': 'view', 'welcome': 'view', 'calendar': 'view', 'reports-archive': 'view', 'reports-templates': 'manage', 'reports-funds': 'manage', 'applications-screening': 'view', 'applications-interview-calendar': 'view', 'applications-joiners': 'view', 'events-archive': 'view', 'events-on-display': 'view', 'people-members': 'view', 'website-readings': 'manage' },
  team_leader: { 'my-role': 'manage', 'dashboard': 'view', 'welcome': 'view', 'calendar': 'view', 'reports-archive': 'view', 'reports-templates': 'manage', 'applications-screening': 'view', 'applications-interview-calendar': 'view', 'applications-joiners': 'view', 'events-archive': 'view', 'events-on-display': 'view', 'people-members': 'view', 'website-readings': 'manage' },
  senior_analyst: { 'my-role': 'manage', 'dashboard': 'view', 'welcome': 'view', 'calendar': 'view', 'reports-archive': 'view', 'reports-templates': 'manage', 'events-on-display': 'view', 'website-readings': 'view' },
  analyst: { 'my-role': 'manage', 'dashboard': 'view', 'welcome': 'view', 'calendar': 'view', 'reports-archive': 'view', 'reports-templates': 'view', 'events-on-display': 'view' },
  head_of_media: { 'my-role': 'manage', 'dashboard': 'view', 'welcome': 'view', 'calendar': 'view', 'events-attendance': 'manage', 'events-archive': 'manage', 'events-alumni-calls': 'view', 'events-on-display': 'view', 'smm-editorial': 'manage', 'smm-ig': 'manage', 'smm-li': 'manage', 'smm-other': 'manage', 'smm-brand': 'manage', 'smm-ads': 'manage' },
  media_analyst: { 'my-role': 'manage', 'dashboard': 'view', 'welcome': 'view', 'calendar': 'view', 'smm-editorial': 'view', 'smm-ig': 'manage', 'smm-li': 'manage', 'smm-other': 'manage', 'smm-brand': 'view', 'smm-ads': 'view' },
  head_of_operations: { 'my-role': 'manage', 'dashboard': 'view', 'welcome': 'view', 'calendar': 'manage', 'events-create': 'manage', 'events-forms': 'manage', 'events-attendance': 'manage', 'events-archive': 'manage', 'events-on-display': 'manage', 'people-members': 'manage', 'people-advisors': 'manage', 'people-alumni': 'view', 'smm-editorial': 'view', 'smm-brand': 'view', 'smm-ads': 'view', 'ops-fee': 'manage', 'ops-treasury': 'manage', 'ops-external': 'manage', 'ops-docs': 'manage', 'website-pages': 'view', 'website-readings': 'view', 'website-testimonials': 'manage', 'ops-newsletter': 'view', 'ops-auto-emails': 'view' },
  advisor: { 'my-role': 'manage', 'dashboard': 'view', 'welcome': 'view', 'calendar': 'view', 'people-members': 'view', 'people-advisors': 'view', 'people-alumni': 'view' },
  silent_advisor: { 'my-role': 'manage', 'dashboard': 'view', 'welcome': 'view', 'calendar': 'view', 'people-members': 'view', 'people-advisors': 'view', 'people-alumni': 'view' },
  alumni: { 'my-role': 'manage', 'dashboard': 'view', 'welcome': 'view', 'calendar': 'view' },
  // member / pending / candidate intentionally have no general grants.
};

// =====================================================================
// SPECIAL rules — nuances that a single level cannot express.
// These parallel the "Special permissions" sheet of the source workbook.
// Components consult them; the Settings table lists them under the grid.
// =====================================================================
export type SpecialRule =
  // Offers: open the page READ-ONLY to understand the offer flow; every
  // action is disabled and the page explains why.
  | 'offers_readonly'
  // Candidate screening: sees candidates from EVERY division, regardless of
  // the applicant's division preference.
  | 'candidates_all_divisions'
  // Candidate screening: may view candidates and add notes, but may NOT
  // change a candidate's status.
  | 'candidates_notes_only';

export interface SpecialEntry {
  rule: SpecialRule;
  resource: ResourceKey;
  roles: AppRole[];
  /** Short human explanation, shown in the table and to affected users. */
  label: string;
}

export const SPECIAL_RULES: SpecialEntry[] = [
  {
    rule: 'offers_readonly',
    resource: 'applications-joiners',
    roles: ['vice_president', 'head_of_asset_management', 'head_of_division', 'portfolio_manager', 'team_leader'],
    label: 'View-only: can open Offers to understand the process, but cannot perform any action.',
  },
  {
    rule: 'candidates_all_divisions',
    resource: 'applications-screening',
    roles: ['head_of_asset_management', 'head_of_division'],
    label: "Sees candidates from every division, regardless of the applicant's division preference.",
  },
  {
    rule: 'candidates_notes_only',
    resource: 'applications-screening',
    roles: ['portfolio_manager', 'team_leader'],
    label: 'May view candidates and add notes, but cannot change a candidate\'s status.',
  },
];

/** Active special rules for a set of (raw) roles on a resource. */
export function specialRulesFor(roles: AppRole[], resource: ResourceKey): SpecialRule[] {
  const norm = roles.map(normalizeRole);
  return SPECIAL_RULES.filter((s) => s.resource === resource && s.roles.some((r) => norm.includes(r))).map((s) => s.rule);
}

// =====================================================================
// Division scoping — research areas whose DATA is limited to the viewer's
// own division. The section-level matrix decides whether a role can open
// these; this list decides whose data they see inside.
//   - analyst / senior_analyst / team_leader / portfolio_manager: own division, locked.
//   - head_of_division: own division by default, may switch to view others.
//   - head_of_asset_management + full access: all divisions.
// =====================================================================
export const DIVISION_SCOPED_RESOURCES: ResourceKey[] = [
  'reports-upload', 'reports-archive', 'reports-funds', 'reports-templates',
];

// Roles allowed to look beyond their own division on the scoped areas.
export const CROSS_DIVISION_VIEW_ROLES: AppRole[] = ['head_of_division', 'head_of_asset_management'];

/**
 * Resolve the effective access level for a set of (normalised) roles on a
 * given resource. Candidate isolation is handled by the caller (useAccess)
 * before this is consulted.
 */
export function resolveLevel(roles: AppRole[], resource: ResourceKey): AccessLevel {
  let level: AccessLevel = 'none';
  for (const raw of roles) {
    const role = normalizeRole(raw);
    const grants = DEFAULT_MATRIX[role];
    if (!grants) continue;
    if (grants['*']) level = maxLevel(level, grants['*']);
    if (grants[resource]) level = maxLevel(level, grants[resource]);
  }
  // Baseline view for any role that has at least one grant somewhere.
  if (level === 'none' && BASELINE_RESOURCES.includes(resource)) {
    const hasAnyGrant = roles.some((r) => {
      const g = DEFAULT_MATRIX[normalizeRole(r)];
      return g && Object.keys(g).length > 0;
    });
    if (hasAnyGrant) return 'view';
  }
  return level;
}
