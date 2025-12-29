import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Division } from '@/lib/types';

type AppRole = 
  | 'admin'
  | 'president'
  | 'vice_president'
  | 'head_of_asset_management'
  | 'head_of_equity'
  | 'head_of_investment'
  | 'head_of_macro'
  | 'head_of_portfolio'
  | 'head_of_quant'
  | 'head_of_operations'
  | 'head_of_media'
  | 'member';

// Map roles to their associated divisions (using the Division type from types.ts)
const roleToDivision: Partial<Record<AppRole, Division>> = {
  head_of_equity: 'equity',
  head_of_investment: 'investment',
  head_of_macro: 'macro',
  head_of_portfolio: 'portfolio',
  head_of_quant: 'quant',
};

// Roles with full dashboard access
const fullAccessRoles: AppRole[] = [
  'admin',
  'president',
  'vice_president',
  'head_of_asset_management',
];

// Operations and media roles - all except team management
const operationsMediaRoles: AppRole[] = [
  'head_of_operations',
  'head_of_media',
];

// Division head roles - only events and files for their division
const divisionHeadRoles: AppRole[] = [
  'head_of_equity',
  'head_of_investment',
  'head_of_macro',
  'head_of_portfolio',
  'head_of_quant',
];

export interface Permissions {
  // Section access
  canAccessUsers: boolean;
  canAccessAlumni: boolean;
  canAccessEvents: boolean;
  canAccessFiles: boolean;
  canAccessTeam: boolean;
  
  // Division restrictions (null = all divisions, array = specific divisions only)
  allowedDivisions: Division[] | null;
  
  // For display purposes
  hasAnyAccess: boolean;
  isFullAccess: boolean;
}

export const usePermissions = (): Permissions => {
  const { user, roles } = useAuth();
  
  return useMemo(() => {
    // Admin email always has full access
    const isAdminEmail = user?.email === 'as.minerva@unibocconi.it';
    
    const userRoles = roles.map(r => r.role);
    
    // Check for full access roles
    const hasFullAccess = isAdminEmail || userRoles.some(role => fullAccessRoles.includes(role as AppRole));
    
    if (hasFullAccess) {
      return {
        canAccessUsers: true,
        canAccessAlumni: true,
        canAccessEvents: true,
        canAccessFiles: true,
        canAccessTeam: true,
        allowedDivisions: null, // null means all divisions
        hasAnyAccess: true,
        isFullAccess: true,
      };
    }
    
    // Check for operations/media roles
    const hasOperationsMediaRole = userRoles.some(role => operationsMediaRoles.includes(role as AppRole));
    
    if (hasOperationsMediaRole) {
      return {
        canAccessUsers: false, // No user management
        canAccessAlumni: true,
        canAccessEvents: true,
        canAccessFiles: true,
        canAccessTeam: false, // No team management
        allowedDivisions: null, // All divisions for files
        hasAnyAccess: true,
        isFullAccess: false,
      };
    }
    
    // Check for division head roles
    const divisionHeadUserRoles = userRoles.filter(role => divisionHeadRoles.includes(role as AppRole));
    
    if (divisionHeadUserRoles.length > 0) {
      // Get all divisions the user has access to
      const allowedDivisions = divisionHeadUserRoles
        .map(role => roleToDivision[role as AppRole])
        .filter((div): div is Division => div !== undefined);
      
      return {
        canAccessUsers: false,
        canAccessAlumni: false,
        canAccessEvents: true,
        canAccessFiles: true,
        canAccessTeam: false,
        allowedDivisions: allowedDivisions.length > 0 ? allowedDivisions : null,
        hasAnyAccess: true,
        isFullAccess: false,
      };
    }
    
    // No special roles (member) - no dashboard access
    return {
      canAccessUsers: false,
      canAccessAlumni: false,
      canAccessEvents: false,
      canAccessFiles: false,
      canAccessTeam: false,
      allowedDivisions: null,
      hasAnyAccess: false,
      isFullAccess: false,
    };
  }, [user, roles]);
};
