import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, UserCheck, Clock, Info } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  role: AppRole;
  role_id: string;
}

const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Admin',
  president: 'President',
  vice_president: 'Vice President',
  head_of_asset_management: 'Head of Asset Management',
  head_of_equity: 'Head of Equity Research',
  head_of_investment: 'Head of Investment Research',
  head_of_macro: 'Head of Macro Research',
  head_of_portfolio: 'Head of Portfolio Management',
  head_of_quant: 'Head of Quantitative Research',
  head_of_operations: 'Head of Operations',
  head_of_media: 'Head of Media',
  member: 'Member',
};

const ASSIGNABLE_ROLES: AppRole[] = [
  'president',
  'vice_president',
  'head_of_asset_management',
  'head_of_equity',
  'head_of_investment',
  'head_of_macro',
  'head_of_portfolio',
  'head_of_quant',
  'head_of_operations',
  'head_of_media',
  'member',
];

// Role access matrix for the explanatory table
const ROLE_ACCESS_MATRIX = [
  { role: 'President / Vice President / Head of Asset Management', users: true, alumni: true, events: 'All', files: 'All divisions', team: true },
  { role: 'Head of Operations / Head of Media', users: true, alumni: true, events: 'All', files: 'All divisions', team: false },
  { role: 'Head of Equity', users: false, alumni: false, events: 'All', files: 'Equity only', team: false },
  { role: 'Head of Investment', users: false, alumni: false, events: 'All', files: 'Investment only', team: false },
  { role: 'Head of Macro', users: false, alumni: false, events: 'All', files: 'Macro only', team: false },
  { role: 'Head of Portfolio', users: false, alumni: false, events: 'All', files: 'Portfolio only', team: false },
  { role: 'Head of Quant', users: false, alumni: false, events: 'All', files: 'Quant only', team: false },
  { role: 'Member', users: false, alumni: false, events: false, files: false, team: false },
];

const UserManagement = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const fetchUsers = async () => {
    try {
      // Fetch profiles and their roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Combine profiles with roles
      const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.id);
        return {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          created_at: profile.created_at,
          role: (userRole?.role as AppRole) || 'member',
          role_id: userRole?.id || '',
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, roleId: string, newRole: AppRole) => {
    setUpdatingUserId(userId);
    
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ 
          role: newRole,
          assigned_by: currentUser?.id,
          assigned_at: new Date().toISOString(),
        })
        .eq('id', roleId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User role updated successfully",
      });

      fetchUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const pendingUsers = users.filter(u => u.role === 'member');
  const approvedUsers = users.filter(u => u.role !== 'member');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Role Access Table - Always visible */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-2 mb-4">
            <Info className="h-4 w-4" />
            <span className="font-serif text-heading">Role Access Permissions</span>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-serif">Role</TableHead>
                  <TableHead className="font-serif text-center">Users</TableHead>
                  <TableHead className="font-serif text-center">Alumni</TableHead>
                  <TableHead className="font-serif text-center">Events</TableHead>
                  <TableHead className="font-serif text-center">Files</TableHead>
                  <TableHead className="font-serif text-center">Team</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ROLE_ACCESS_MATRIX.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-body font-medium">{row.role}</TableCell>
                    <TableCell className="text-center">
                      {row.users ? <span className="text-green-600">✓</span> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.alumni ? <span className="text-green-600">✓</span> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.events === 'All' ? <span className="text-green-600">✓ All</span> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {typeof row.files === 'string' ? (
                        <span className="text-green-600 text-sm">{row.files}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.team ? <span className="text-green-600">✓</span> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-sm text-muted-foreground mt-4 font-body">
            <strong>Note:</strong> as.minerva@unibocconi.it always has full access regardless of role. 
            Multiple users can have the same role.
          </p>
        </CardContent>
      </Card>

      {/* Pending Approvals (Members without dashboard access) */}
      <div>
        <h2 className="font-serif text-heading mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Pending Approvals ({pendingUsers.length})
        </h2>
        
        {pendingUsers.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="font-body text-muted-foreground">
                No pending user approvals
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingUsers.map(user => (
              <Card key={user.id}>
                <CardContent className="py-4 flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-body font-medium">{user.full_name || 'No name'}</p>
                    <p className="font-body text-sm text-muted-foreground">{user.email}</p>
                    <p className="font-body text-xs text-muted-foreground">
                      Registered: {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                      Pending
                    </Badge>
                    <Select
                      onValueChange={(value) => handleRoleChange(user.id, user.role_id, value as AppRole)}
                      disabled={updatingUserId === user.id}
                    >
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Assign role..." />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSIGNABLE_ROLES.map(role => (
                          <SelectItem key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {updatingUserId === user.id && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Approved Users */}
      <div>
        <h2 className="font-serif text-heading mb-4 flex items-center gap-2">
          <UserCheck className="h-5 w-5" />
          Approved Users ({approvedUsers.length})
        </h2>
        
        {approvedUsers.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="font-body text-muted-foreground">
                No approved users yet
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {approvedUsers.map(user => (
              <Card key={user.id}>
                <CardContent className="py-4 flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-body font-medium">{user.full_name || 'No name'}</p>
                    <p className="font-body text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="bg-primary/10 text-primary">
                      {ROLE_LABELS[user.role]}
                    </Badge>
                    {user.email !== 'as.minerva@unibocconi.it' && (
                      <Select
                        value={user.role}
                        onValueChange={(value) => handleRoleChange(user.id, user.role_id, value as AppRole)}
                        disabled={updatingUserId === user.id}
                      >
                        <SelectTrigger className="w-[220px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ASSIGNABLE_ROLES.map(role => (
                            <SelectItem key={role} value={role}>
                              {ROLE_LABELS[role]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {updatingUserId === user.id && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
