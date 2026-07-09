// =====================================================================
// Access-control matrix (Phase 0 foundation)
// ---------------------------------------------------------------------
// Single source of truth for "which role can do what, where", with three
// non-trivial levels (view < edit < manage). This is intentionally
// data-driven so the future Settings -> Roles Permissions UI can edit it.
//
// The values here are a PROVISIONAL default that (a) preserves the access
// the already-built pages have today, (b) hard-isolates candidates, and
// (c) supports view/edit/manage + fully-hidden pages. The authoritative
// matrix will be finalised once the feature pages exist (report 14.2).
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
export const CANDIDATE_RESOURCES: Record<ResourceKey, AccessLevel> = {
  'my-role': 'edit',
  'applications-status': 'view',
  'applications-interview-calendar': 'view',
};

type RoleGrants = Record<ResourceKey, AccessLevel>;

// '*' grants a level to every resource (used by full-access roles).
const FULL: RoleGrants = { '*': 'manage' };

// Provisional per-role grants (by normalised role). Anything not listed = none.
export const DEFAULT_MATRIX: Partial<Record<AppRole, RoleGrants>> = {
  admin: FULL,
  president: FULL,
  vice_president: FULL,
  head_of_asset_management: FULL,

  head_of_division: {
    'reports-upload': 'manage',
    'reports-archive': 'manage',
    'reports-templates': 'manage',
    'reports-funds': 'view',
    'people-members': 'edit',
    'people-advisors': 'view',
    'people-alumni': 'edit',
    'applications-screening': 'edit',
    'applications-joiners': 'edit',
    'applications-website': 'edit',
    'applications-questions': 'edit',
    'applications-form': 'edit',
    'applications-interview-calendar': 'manage',
    'events-create': 'edit',
    'events-alumni-calls': 'edit',
    'events-archive': 'view',
  },

  portfolio_manager: {
    'reports-upload': 'edit',
    'reports-archive': 'edit',
    'reports-templates': 'edit',
    'reports-funds': 'edit',
  },

  team_leader: {
    'reports-upload': 'edit',
    'reports-archive': 'view',
    'reports-templates': 'edit',
    'applications-screening': 'view',
    'applications-interview-calendar': 'view',
    'people-members': 'view',
  },

  analyst: {
    'reports-upload': 'edit',
    'reports-archive': 'view',
    'reports-templates': 'view',
    'events-archive': 'view',
  },

  head_of_operations: {
    'people-members': 'manage',
    'people-advisors': 'manage',
    'people-alumni': 'view',
    'events-create': 'manage',
    'events-forms': 'manage',
    'events-attendance': 'manage',
    'events-archive': 'edit',
    'events-on-display': 'manage',
    'ops-fee': 'manage',
    'ops-treasury': 'manage',
    'ops-accounts': 'manage',
    'ops-external': 'manage',
    'ops-newsletter': 'manage',
    'ops-auto-emails': 'manage',
    'ops-docs': 'manage',
  },

  head_of_media: {
    'smm-ig': 'manage',
    'smm-li': 'manage',
    'smm-other': 'manage',
    'smm-brand': 'manage',
    'smm-editorial': 'manage',
    'smm-ads': 'manage',
    'events-archive': 'view',
    'events-create': 'view',
    'applications-website': 'view',
    'reports-archive': 'view',
  },

  media_analyst: {
    'smm-ig': 'edit',
    'smm-li': 'edit',
    'smm-other': 'edit',
    'smm-brand': 'view',
    'smm-editorial': 'edit',
  },

  advisor: {
    'reports-archive': 'view',
    'events-archive': 'view',
    'people-members': 'view',
  },

  silent_advisor: {
    'reports-archive': 'view',
    'events-archive': 'view',
  },

  alumni: {
    'events-archive': 'view',
  },

  // member / pending / candidate intentionally have no general grants.
};

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
