import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useIsDesktop } from '@/hooks/use-desktop';
import { mobilePolicyFor } from '@/lib/mobile-policy';
import {
  type AppRole,
  type OrgDivision,
  type RoleAssignment,
  normalizeRole,
  assignmentDivision,
  primaryAssignment,
} from '@/lib/roles';
import {
  type AccessLevel,
  type ResourceKey,
  type SpecialRule,
  resolveLevel,
  atLeast,
  specialRulesFor,
  CROSS_DIVISION_VIEW_ROLES,
  DIVISION_SCOPED_RESOURCES,
  CANDIDATE_RESOURCES,
} from '@/lib/access/matrix';

const ADMIN_EMAIL = 'as.minerva@unibocconi.it';
// Association-wide full access. Every other leadership role (Vice President,
// Head of Asset Management, ...) now has explicit, granular grants in the
// matrix rather than a blanket '*'.
const FULL_ACCESS_ROLES: AppRole[] = ['admin', 'president'];
const NON_STAFF_ROLES: AppRole[] = ['member', 'pending', 'candidate'];

export interface Access {
  /** Effective level for a resource. */
  level: (resource: ResourceKey) => AccessLevel;
  /** Does the user meet at least `required` (default 'view') on a resource? */
  can: (resource: ResourceKey, required?: AccessLevel) => boolean;
  canView: (resource: ResourceKey) => boolean;
  canEdit: (resource: ResourceKey) => boolean;
  canManage: (resource: ResourceKey) => boolean;

  /** Active special rules for the current user on a resource. */
  special: (resource: ResourceKey) => SpecialRule[];
  hasSpecial: (resource: ResourceKey, rule: SpecialRule) => boolean;

  isCandidate: boolean;
  isStaff: boolean;
  isFullAccess: boolean;
  hasAnyAccess: boolean;

  /** May this user look beyond their own division on division-scoped areas? */
  canViewOtherDivisions: boolean;
  /** Is this resource limited to the viewer's own division data? */
  isDivisionScoped: (resource: ResourceKey) => boolean;

  primaryRole: AppRole | null;
  primaryDivision: OrgDivision | null;
  /** Divisions the user is scoped to (null = all divisions / full access). */
  allowedDivisions: OrgDivision[] | null;
}

export function useAccess(): Access {
  const { user, roles } = useAuth();
  // Below the desktop breakpoint the workspace runs in its mobile shell:
  // subsections marked 'view' in the mobile policy are READ-ONLY for
  // everyone, regardless of role. On desktop (>= 1024px) this cap never
  // engages, so desktop behaviour is untouched.
  const isDesktop = useIsDesktop();

  return useMemo<Access>(() => {
    const assignments: RoleAssignment[] = (roles || []).map((r) => ({
      role: r.role as AppRole,
      division: (r as { division?: OrgDivision | null }).division ?? null,
    }));

    const isAdminEmail = user?.email === ADMIN_EMAIL;
    const roleValues = assignments.map((a) => a.role);

    // Candidate isolation: a candidate that holds no other (non-pending) role
    // can ONLY ever reach the candidate resources, regardless of anything else.
    const isCandidate =
      roleValues.includes('candidate') &&
      !roleValues.some((r) => r !== 'candidate' && r !== 'pending');

    const isFullAccess = isAdminEmail || roleValues.some((r) => FULL_ACCESS_ROLES.includes(normalizeRole(r)));
    const isStaff =
      isFullAccess ||
      (!isCandidate && roleValues.some((r) => !NON_STAFF_ROLES.includes(normalizeRole(r))));

    const primary = primaryAssignment(assignments);
    const primaryRole = primary?.role ? normalizeRole(primary.role) : null;
    const primaryDivision = primary ? assignmentDivision(primary) : null;

    const allowedDivisions: OrgDivision[] | null = isFullAccess
      ? null
      : Array.from(
          new Set(
            assignments
              .map(assignmentDivision)
              .filter((d): d is OrgDivision => !!d && d !== 'none' && d !== 'board'),
          ),
        );

    const level = (resource: ResourceKey): AccessLevel => {
      const base = isCandidate
        ? (CANDIDATE_RESOURCES[resource] ?? 'none')
        : isFullAccess
          ? 'manage'
          : resolveLevel(roleValues, resource);
      // Mobile read-only cap: only 'full' subsections keep write levels.
      if (!isDesktop && atLeast(base, 'edit') && mobilePolicyFor(resource) !== 'full') {
        return 'view';
      }
      return base;
    };

    const can = (resource: ResourceKey, required: AccessLevel = 'view') => atLeast(level(resource), required);

    // Full-access users and cross-division roles are never treated as
    // candidates here (candidate isolation already returns above).
    const special = (resource: ResourceKey): SpecialRule[] =>
      isFullAccess ? [] : specialRulesFor(roleValues, resource);

    const canViewOtherDivisions =
      isFullAccess || roleValues.some((r) => CROSS_DIVISION_VIEW_ROLES.includes(normalizeRole(r)));

    return {
      level,
      can,
      canView: (r) => can(r, 'view'),
      canEdit: (r) => can(r, 'edit'),
      canManage: (r) => can(r, 'manage'),
      special,
      hasSpecial: (r, rule) => special(r).includes(rule),
      isCandidate,
      isStaff,
      isFullAccess,
      hasAnyAccess: isCandidate || isStaff,
      canViewOtherDivisions,
      isDivisionScoped: (r) => !isFullAccess && DIVISION_SCOPED_RESOURCES.includes(r),
      primaryRole,
      primaryDivision,
      allowedDivisions: allowedDivisions && allowedDivisions.length === 0 ? null : allowedDivisions,
    };
  }, [user, roles, isDesktop]);
}
