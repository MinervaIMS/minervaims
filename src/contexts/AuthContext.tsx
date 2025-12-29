import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
}

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  assigned_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: UserRole[];
  isLoading: boolean;
  isAdmin: boolean;
  isSessionExpired: boolean;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const { toast } = useToast();

  const isAdmin = user?.email === 'as.minerva@unibocconi.it' || roles.some(r => r.role === 'admin' || r.role === 'president');

  const fetchProfile = async (userId: string) => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    setProfile(profileData);
  };

  const fetchRoles = async (userId: string) => {
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId);
    
    setRoles(rolesData || []);
  };

  const refreshProfile = async () => {
    if (user) {
      await Promise.all([fetchProfile(user.id), fetchRoles(user.id)]);
    }
  };

  // Manual session refresh function
  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error || !data.session) {
        console.error('Failed to refresh session:', error);
        setIsSessionExpired(true);
        return false;
      }
      setSession(data.session);
      setUser(data.session.user);
      setIsSessionExpired(false);
      return true;
    } catch (error) {
      console.error('Session refresh error:', error);
      setIsSessionExpired(true);
      return false;
    }
  }, []);

  // Check if session is about to expire and refresh proactively
  const checkAndRefreshSession = useCallback(async () => {
    if (!session?.expires_at) return;
    
    const expiresAt = session.expires_at * 1000; // Convert to milliseconds
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;
    
    // Refresh if less than 5 minutes until expiry
    if (timeUntilExpiry < 5 * 60 * 1000 && timeUntilExpiry > 0) {
      console.log('Session expiring soon, refreshing...');
      await refreshSession();
    } else if (timeUntilExpiry <= 0) {
      console.log('Session has expired');
      setIsSessionExpired(true);
      toast({
        title: "Session Expired",
        description: "Your session has expired. Please log in again.",
        variant: "destructive",
      });
    }
  }, [session, refreshSession, toast]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log('Auth state change:', event);
        
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          setRoles([]);
          setIsSessionExpired(false);
          return;
        }

        if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed successfully');
          setIsSessionExpired(false);
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          setIsSessionExpired(false);

          // Defer Supabase calls with setTimeout
          if (currentSession?.user) {
            setTimeout(() => {
              fetchProfile(currentSession.user.id);
              fetchRoles(currentSession.user.id);
            }, 0);
          }
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession }, error }) => {
      if (error) {
        console.error('Error getting session:', error);
        setIsSessionExpired(true);
        setIsLoading(false);
        return;
      }

      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      
      if (existingSession?.user) {
        Promise.all([
          fetchProfile(existingSession.user.id),
          fetchRoles(existingSession.user.id)
        ]).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Set up periodic session check (every 1 minute)
  useEffect(() => {
    if (!session) return;

    const intervalId = setInterval(() => {
      checkAndRefreshSession();
    }, 60 * 1000); // Check every minute

    // Also check immediately
    checkAndRefreshSession();

    return () => clearInterval(intervalId);
  }, [session, checkAndRefreshSession]);

  const signIn = async (email: string, password: string, rememberMe = false) => {
    setIsSessionExpired(false);
    
    // Store remember me preference
    if (rememberMe) {
      localStorage.setItem('mims_remember_me', 'true');
    } else {
      localStorage.removeItem('mims_remember_me');
    }
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    // Validate email domain
    const isAdminEmail = email === 'as.minerva@unibocconi.it';
    const isStudentEmail = email.endsWith('@studbocconi.it');
    
    if (!isAdminEmail && !isStudentEmail) {
      return { 
        error: new Error('Registration requires a @studbocconi.it email address') 
      };
    }

    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
    setIsSessionExpired(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        isLoading,
        isAdmin,
        isSessionExpired,
        signIn,
        signUp,
        signOut,
        refreshProfile,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
