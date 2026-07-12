// =====================================================================
// Role x Division model (Phase 0 foundation)
// ---------------------------------------------------------------------
// The workspace separates a person's ROLE from their DIVISION. Legacy
// division-specific head roles (head_of_equity, ...) are normalised to
// the unified `head_of_division` so older data keeps working during the
// transition. This module is the single source of truth for role/division
// labels, normalisation and ordering used across the workspace.
// =====================================================================

export type AppRole =
  | 'admin'
  | 'president'
  | 'vice_president'
  | 'head_of_asset_management'
  | 'head_of_division'
  | 'team_leader'
  | 'senior_analyst'
  | 'portfolio_manager'
  | 'analyst'
  | 'head_of_media'
  | 'media_analyst'
  | 'head_of_operations'
  | 'advisor'
  | 'silent_advisor'
  | 'candidate'
  | 'alumni'
  | 'member'
  | 'pending'
  // legacy values still present in the enum / older rows
  | 'head_of_equity'
  | 'head_of_investment'
  | 'head_of_macro'
  | 'head_of_portfolio'
  | 'head_of_quant';

export type OrgDivision =
  | 'equity'
  | 'investment'
  | 'macro'
  | 'portfolio'
  | 'quant'
  | 'media'
  | 'operations'
  | 'board'
  | 'none';

/** A single role assignment as stored in user_roles. */
export interface RoleAssignment {
  role: AppRole;
  division?: OrgDivision | null;
}

// Map a legacy division-baked head role to (head_of_division, division).
const LEGACY_HEAD_DIVISION: Partial<Record<AppRole, OrgDivision>> = {
  head_of_equity: 'equity',
  head_of_investment: 'investment',
  head_of_macro: 'macro',
  head_of_portfolio: 'portfolio',
  head_of_quant: 'quant',
};

/** Normalise a stored role to its canonical role value. */
export function normalizeRole(role: AppRole): AppRole {
  if (role in LEGACY_HEAD_DIVISION) return 'head_of_division';
  return role;
}

/** Resolve the division for an assignment, falling back to legacy mapping. */
export function assignmentDivision(a: RoleAssignment): OrgDivision | null {
  if (a.division) return a.division;
  return LEGACY_HEAD_DIVISION[a.role] ?? null;
}

export const divisionLabels: Record<OrgDivision, string> = {
  equity: 'Equity Research',
  investment: 'Investment Research',
  macro: 'Macro Research',
  portfolio: 'Portfolio Management',
  quant: 'Quantitative Research',
  media: 'Media & Communication',
  operations: 'Operations',
  board: 'Board',
  none: '—',
};

// Base label for a normalised role (without division).
const roleBaseLabels: Record<AppRole, string> = {
  admin: 'Admin',
  president: 'President',
  vice_president: 'Vice President',
  head_of_asset_management: 'Head of Asset Management',
  head_of_division: 'Head of Division',
  team_leader: 'Team Leader',
  senior_analyst: 'Senior Analyst',
  portfolio_manager: 'Portfolio Manager',
  analyst: 'Analyst',
  head_of_media: 'Head of Media & Communication',
  media_analyst: 'Media & Communication Analyst',
  head_of_operations: 'Head of Operations',
  advisor: 'Advisor',
  silent_advisor: 'Silent Advisor',
  candidate: 'Applicant',
  alumni: 'Alumni',
  member: 'Member',
  pending: 'Pending',
  head_of_equity: 'Head of Equity Research',
  head_of_investment: 'Head of Investment Research',
  head_of_macro: 'Head of Macro Research',
  head_of_portfolio: 'Head of Portfolio Management',
  head_of_quant: 'Head of Quantitative Research',
};

/**
 * Human-readable label combining role and division.
 * e.g. (head_of_division, equity) -> "Head of Equity Research";
 *      (analyst, quant)           -> "Quantitative Research Analyst".
 */
export function roleLabel(role: AppRole, division?: OrgDivision | null): string {
  const norm = normalizeRole(role);
  const div = division ?? LEGACY_HEAD_DIVISION[role] ?? null;

  if (norm === 'head_of_division' && div && div in divisionLabels && div !== 'none' && div !== 'board') {
    return `Head of ${divisionLabels[div]}`;
  }
  if ((norm === 'analyst' || norm === 'team_leader' || norm === 'senior_analyst' || norm === 'portfolio_manager') && div && div !== 'none' && div !== 'board') {
    const suffix = norm === 'analyst' ? 'Analyst' : norm === 'team_leader' ? 'Team Leader' : norm === 'senior_analyst' ? 'Senior Analyst' : 'Portfolio Manager';
    return `${divisionLabels[div]} ${suffix}`;
  }
  return roleBaseLabels[norm] ?? norm;
}

// Seniority ranking for deterministic member ordering (report section 8.1).
const roleRank: Record<AppRole, number> = {
  president: 1,
  vice_president: 2,
  admin: 2,
  head_of_asset_management: 3,
  head_of_division: 4,
  head_of_equity: 4,
  head_of_investment: 4,
  head_of_macro: 4,
  head_of_portfolio: 4,
  head_of_quant: 4,
  head_of_media: 5,
  head_of_operations: 6,
  portfolio_manager: 7,
  team_leader: 8,
  senior_analyst: 9,
  analyst: 10,
  media_analyst: 11,
  advisor: 12,
  silent_advisor: 13,
  alumni: 90,
  member: 95,
  candidate: 98,
  pending: 99,
};

export function memberRank(role: AppRole): number {
  return roleRank[normalizeRole(role)] ?? 99;
}

/** Pick the highest-priority (lowest rank) role from a set of assignments. */
export function primaryAssignment(assignments: RoleAssignment[]): RoleAssignment | null {
  if (!assignments.length) return null;
  return [...assignments].sort((a, b) => memberRank(a.role) - memberRank(b.role))[0];
}

export const CORE_DIVISIONS: OrgDivision[] = ['equity', 'investment', 'macro', 'portfolio', 'quant'];
