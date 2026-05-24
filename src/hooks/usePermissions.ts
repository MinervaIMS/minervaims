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
  | 'portfolio_manager'
  | 'member';

// Map roles to their associated divisions (using the Division type from types.ts)
const roleToDivision: Partial<Record<AppRole, Division>> = {
  head_of_equity: 'equity',
  head_of_investment: 'investment',
  head_of_macro: 'macro',
  head_of_portfolio: 'portfolio',
  head_of_quant: 'quant',
};

// Roles with full workspace access
const fullAccessRoles: AppRole[] = [
  'admin',
  'president',
  'vice_president',
  'head_of_asset_management',
];

// Operations and media roles - events, alumni, files access (no user management)
const operationsMediaRoles: AppRole[] = [
  'head_of_operations',
  'head_of_media',
];

// Division head roles - only files and team for their division (no events)
const divisionHeadRoles: AppRole[] = [
  'head_of_equity',
  'head_of_investment',
  'head_of_macro',
  'head_of_portfolio',
  'head_of_quant',
];

// Portfolio manager role - only files for portfolio division
const portfolioManagerRole: AppRole = 'portfolio_manager';

export interface Permissions {
  // Section access
  canAccessUsers: boolean;
  canAccessAlumni: boolean;
  canAccessEvents: boolean;
  canAccessFiles: boolean;
  canAccessTeam: boolean;
  canAccessSettings: boolean;
  canAccessReadings: boolean;
  canAccessActivity: boolean;
  
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
        canAccessSettings: true,
        canAccessReadings: true,
        canAccessActivity: true,
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
        canAccessSettings: false,
        canAccessReadings: false, // No readings access for ops/media
        canAccessActivity: true, // All roles except member can access activity
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
        canAccessAlumni: true, // Division heads can now manage alumni
        canAccessEvents: false, // Division heads no longer have events access
        canAccessFiles: true,
        canAccessTeam: true, // Division heads can now manage team (restricted to their division)
        canAccessSettings: false,
        canAccessReadings: true, // Division heads can access readings
        canAccessActivity: true, // All roles except member can access activity
        allowedDivisions: allowedDivisions.length > 0 ? allowedDivisions : null,
        hasAnyAccess: true,
        isFullAccess: false,
      };
    }
    
    // Check for portfolio manager role
    const isPortfolioManager = userRoles.includes(portfolioManagerRole);
    
    if (isPortfolioManager) {
      return {
        canAccessUsers: false,
        canAccessAlumni: false,
        canAccessEvents: false,
        canAccessFiles: true, // Can only upload files for portfolio division
        canAccessTeam: false,
        canAccessSettings: false,
        canAccessReadings: true, // Portfolio managers can access readings
        canAccessActivity: true, // All roles except member can access activity
        allowedDivisions: ['portfolio'], // Restricted to portfolio division only
        hasAnyAccess: true,
        isFullAccess: false,
      };
    }
    
    // No special roles (member) - no workspace access
    return {
      canAccessUsers: false,
      canAccessAlumni: false,
      canAccessEvents: false,
      canAccessFiles: false,
      canAccessTeam: false,
      canAccessSettings: false,
      canAccessReadings: false,
      canAccessActivity: false,
      allowedDivisions: null,
      hasAnyAccess: false,
      isFullAccess: false,
    };
  }, [user, roles]);
};
