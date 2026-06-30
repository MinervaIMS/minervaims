import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
  resolveLevel,
  atLeast,
  CANDIDATE_RESOURCES,
} from '@/lib/access/matrix';

const ADMIN_EMAIL = 'as.minerva@unibocconi.it';
const FULL_ACCESS_ROLES: AppRole[] = ['admin', 'president', 'vice_president', 'head_of_asset_management'];
const NON_STAFF_ROLES: AppRole[] = ['member', 'pending', 'candidate'];

export interface Access {
  /** Effective level for a resource. */
  level: (resource: ResourceKey) => AccessLevel;
  /** Does the user meet at least `required` (default 'view') on a resource? */
  can: (resource: ResourceKey, required?: AccessLevel) => boolean;
  canView: (resource: ResourceKey) => boolean;
  canEdit: (resource: ResourceKey) => boolean;
  canManage: (resource: ResourceKey) => boolean;

  isCandidate: boolean;
  isStaff: boolean;
  isFullAccess: boolean;
  hasAnyAccess: boolean;

  primaryRole: AppRole | null;
  primaryDivision: OrgDivision | null;
  /** Divisions the user is scoped to (null = all divisions / full access). */
  allowedDivisions: OrgDivision[] | null;
}

export function useAccess(): Access {
  const { user, roles } = useAuth();

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
      if (isCandidate) return CANDIDATE_RESOURCES[resource] ?? 'none';
      if (isFullAccess) return 'manage';
      return resolveLevel(roleValues, resource);
    };

    const can = (resource: ResourceKey, required: AccessLevel = 'view') => atLeast(level(resource), required);

    return {
      level,
      can,
      canView: (r) => can(r, 'view'),
      canEdit: (r) => can(r, 'edit'),
      canManage: (r) => can(r, 'manage'),
      isCandidate,
      isStaff,
      isFullAccess,
      hasAnyAccess: isCandidate || isStaff,
      primaryRole,
      primaryDivision,
      allowedDivisions: allowedDivisions && allowedDivisions.length === 0 ? null : allowedDivisions,
    };
  }, [user, roles]);
}
