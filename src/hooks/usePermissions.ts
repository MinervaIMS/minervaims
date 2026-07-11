import { useMemo } from 'react';
import { useAccess } from '@/hooks/useAccess';
import { CORE_DIVISIONS } from '@/lib/roles';
import { Division } from '@/lib/types';

// =====================================================================
// usePermissions — compatibility layer.
// ---------------------------------------------------------------------
// The workspace's access logic now lives in useAccess() + the permission
// matrix. This hook is preserved with its original shape so the pages
// already built against it (TeamManagement, FileManagement, the workspace
// shell, ...) keep working unchanged. New code should prefer useAccess().
// =====================================================================

export interface Permissions {
  canAccessUsers: boolean;
  canAccessAlumni: boolean;
  canAccessEvents: boolean;
  canAccessFiles: boolean;
  canAccessTeam: boolean;
  canAccessSettings: boolean;
  canAccessReadings: boolean;
  canAccessActivity: boolean;
  canManageTestimonials: boolean;

  // null = all divisions; array = specific core divisions only.
  allowedDivisions: Division[] | null;

  hasAnyAccess: boolean;
  isFullAccess: boolean;

  /** Resource-level view check, backed by the access matrix. */
  can: (resource: string) => boolean;
}

export const usePermissions = (): Permissions => {
  const access = useAccess();

  return useMemo(() => {
    const { isFullAccess, isStaff } = access;

    // Scope to the five core divisions for the legacy division filters.
    const coreDivisions = access.allowedDivisions
      ? (access.allowedDivisions.filter((d) => (CORE_DIVISIONS as string[]).includes(d)) as Division[])
      : null;

    return {
      canAccessUsers: isFullAccess,
      canAccessSettings: isFullAccess,
      canAccessAlumni: access.canView('people-alumni'),
      canAccessEvents: access.canView('events-archive') || access.canView('events-create'),
      canAccessFiles: access.canView('reports-archive') || access.canView('reports-upload'),
      canAccessTeam: access.canView('people-members'),
      canAccessReadings: isFullAccess || (coreDivisions !== null && coreDivisions.length > 0),
      canAccessActivity: isStaff,
      canManageTestimonials: access.canManage('website-testimonials'),
      allowedDivisions: isFullAccess ? null : coreDivisions && coreDivisions.length > 0 ? coreDivisions : null,
      hasAnyAccess: isStaff,
      isFullAccess,
      can: (resource: string) => access.canView(resource),
    };
  }, [access]);
};

export type { Division };
