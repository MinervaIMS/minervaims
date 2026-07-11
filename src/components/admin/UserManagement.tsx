import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, UserCheck, Clock, Info, Trash2, HelpCircle, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';


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
  portfolio_manager: 'Portfolio Manager',
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
  'portfolio_manager',
  'member',
];

// Role access matrix for the explanatory table
const ROLE_ACCESS_MATRIX = [
  { role: 'President / Vice President / Head of Asset Management', users: true, alumni: true, events: true, files: 'All divisions', team: true, readings: true, applications: true },
  { role: 'Head of Operations / Head of Media', users: false, alumni: true, events: true, files: 'All divisions', team: false, readings: false, applications: false },
  { role: 'Head of Equity', users: false, alumni: true, events: false, files: 'Equity only', team: 'Equity only', readings: true, applications: false },
  { role: 'Head of Investment', users: false, alumni: true, events: false, files: 'Investment only', team: 'Investment only', readings: true, applications: false },
  { role: 'Head of Macro', users: false, alumni: true, events: false, files: 'Macro only', team: 'Macro only', readings: true, applications: false },
  { role: 'Head of Portfolio', users: false, alumni: true, events: false, files: 'Portfolio only', team: 'Portfolio only', readings: true, applications: false },
  { role: 'Head of Quant', users: false, alumni: true, events: false, files: 'Quant only', team: 'Quant only', readings: true, applications: false },
  { role: 'Portfolio Manager', users: false, alumni: false, events: false, files: 'Portfolio only', team: false, readings: true, applications: false },
  { role: 'Member', users: false, alumni: false, events: false, files: false, team: false, readings: false, applications: false },
];

const USERS_PER_PAGE = 10;

const UserManagement = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  const { user: currentUser, session } = useAuth();

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

      // Applicants are managed in Applications → Candidates, not here. Collect
      // the user ids that have an application on file so we can keep them out of
      // this list — whether they already hold the applicant role or are still an
      // unverified, in-progress application with no role yet (which is exactly
      // what used to show up here as a mysterious "roleless" account).
      const { data: apps } = await supabase.from('applications').select('user_id');
      const applicantIds = new Set((apps || []).map((a: { user_id: string }) => a.user_id));

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
      }).filter(u => {
        // Exclude applicants (role 'candidate') and in-progress applicants (an
        // application on file while still only member/pending/no role). Compared
        // as strings because the local role union is a narrower legacy set.
        const roleStr = String(u.role);
        const isApplicantRole = roleStr === 'candidate';
        const isInProgressApplicant = applicantIds.has(u.id) && ['member', 'pending', 'candidate'].includes(roleStr);
        return !isApplicantRole && !isInProgressApplicant;
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

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    // Prevent deleting admin email
    if (userEmail === 'as.minerva@unibocconi.it') {
      toast({
        title: "Cannot Delete",
        description: "The admin account cannot be deleted.",
        variant: "destructive",
      });
      return;
    }

    setDeletingUserId(userId);
    
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'delete', userId },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "User deleted successfully",
      });

      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    } finally {
      setDeletingUserId(null);
    }
  };

  const pendingUsers = users.filter(u => u.role === 'member');
  const approvedUsers = users.filter(u => u.role !== 'member');
  
  // Filter approved users by search query
  const filteredApprovedUsers = approvedUsers.filter(user => {
    const query = searchQuery.toLowerCase();
    return (
      user.email.toLowerCase().includes(query) ||
      (user.full_name?.toLowerCase().includes(query) ?? false) ||
      ROLE_LABELS[user.role].toLowerCase().includes(query)
    );
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredApprovedUsers.length / USERS_PER_PAGE);
  const paginatedUsers = filteredApprovedUsers.slice(
    (currentPage - 1) * USERS_PER_PAGE,
    currentPage * USERS_PER_PAGE
  );

  // Reset to page 1 when search changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <WorkspacePageHeader
        title="Users"
        description="Approve new members, assign workspace roles and review who has access to which sections."
      />

      {/* Role Access Table - Always visible */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-2 mb-4">
            <Info className="h-4 w-4 text-accent" />
            <span className="font-serif text-heading text-accent">Role Access Permissions</span>
          </div>
          <div className="overflow-x-auto">
            <TooltipProvider delayDuration={0}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-serif">Role</TableHead>
                    <TableHead className="font-serif text-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="inline-flex items-center gap-1.5 cursor-help px-2 py-1 rounded hover:bg-muted/50 transition-colors">
                            Users <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[250px] text-sm p-3">
                          <p>Manage user accounts, approve new registrations, and assign roles to team members.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead className="font-serif text-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="inline-flex items-center gap-1.5 cursor-help px-2 py-1 rounded hover:bg-muted/50 transition-colors">
                            Alumni <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[250px] text-sm p-3">
                          <p>Add, edit, and manage alumni records and their professional information.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead className="font-serif text-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="inline-flex items-center gap-1.5 cursor-help px-2 py-1 rounded hover:bg-muted/50 transition-colors">
                            Events <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[250px] text-sm p-3">
                          <p>Create and manage events, including dates, locations, and guest speakers.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead className="font-serif text-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="inline-flex items-center gap-1.5 cursor-help px-2 py-1 rounded hover:bg-muted/50 transition-colors">
                            Files <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[250px] text-sm p-3">
                          <p>Upload and manage archive files such as research reports and presentations.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead className="font-serif text-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="inline-flex items-center gap-1.5 cursor-help px-2 py-1 rounded hover:bg-muted/50 transition-colors">
                            Team <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[250px] text-sm p-3">
                          <p>Manage team member profiles, positions, and organizational structure.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead className="font-serif text-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="inline-flex items-center gap-1.5 cursor-help px-2 py-1 rounded hover:bg-muted/50 transition-colors">
                            Readings <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[250px] text-sm p-3">
                          <p>Add and manage recommended readings including books, papers, and articles.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead className="font-serif text-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="inline-flex items-center gap-1.5 cursor-help px-2 py-1 rounded hover:bg-muted/50 transition-colors">
                            Applications <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[250px] text-sm p-3">
                          <p>Configure application settings, open/close applications, and manage form URLs.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {ROLE_ACCESS_MATRIX.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-body font-medium">{row.role}</TableCell>
                    <TableCell className="text-center">
                      {row.users ? <span className="text-green-600">✓</span> : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.alumni ? <span className="text-green-600">✓</span> : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.events === true ? <span className="text-green-600">✓</span> : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {typeof row.files === 'string' ? (
                        <span className="text-green-600 text-sm">{row.files}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {typeof row.team === 'string' ? (
                        <span className="text-green-600 text-sm">{row.team}</span>
                      ) : row.team ? (
                        <span className="text-green-600">✓</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.readings ? <span className="text-green-600">✓</span> : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.applications ? <span className="text-green-600">✓</span> : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            </TooltipProvider>
          </div>
          <p className="text-sm text-muted-foreground mt-4 font-body">
            <strong>Note:</strong> as.minerva@unibocconi.it always has full access regardless of role. 
            Multiple users can have the same role.
          </p>
        </CardContent>
      </Card>

      {/* Pending Approvals (Members without workspace access) */}
      <div>
        <h2 className="font-serif text-heading text-accent mb-4 flex items-center gap-2">
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
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="text-destructive hover:bg-destructive/10"
                          disabled={deletingUserId === user.id}
                        >
                          {deletingUserId === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete User</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {user.full_name || user.email}? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDeleteUser(user.id, user.email)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Approved Users */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h2 className="font-serif text-heading text-accent flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Approved Users ({filteredApprovedUsers.length}{searchQuery && ` of ${approvedUsers.length}`})
          </h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, email or role..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 h-10 border border-separator bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent transition-colors"
              style={{ fontFamily: '"Times New Roman", Times, serif' }}
            />
          </div>
        </div>
        
        {approvedUsers.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="font-body text-muted-foreground">
                No approved users yet
              </p>
            </CardContent>
          </Card>
        ) : filteredApprovedUsers.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="font-body text-muted-foreground">
                No users match your search
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardContent className="py-0">
                <div className="divide-y divide-border">
                  {paginatedUsers.map(user => (
                    <div key={user.id} className="py-4 flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-body font-medium">{user.full_name || 'No name'}</p>
                        <p className="font-body text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className="bg-primary/10 text-primary">
                          {ROLE_LABELS[user.role]}
                        </Badge>
                        {user.email !== 'as.minerva@unibocconi.it' && (
                          <>
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
                            {updatingUserId === user.id && (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="icon"
                                  className="text-destructive hover:bg-destructive/10"
                                  disabled={deletingUserId === user.id}
                                >
                                  {deletingUserId === user.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete User</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete {user.full_name || user.email}? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDeleteUser(user.id, user.email)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground font-body">
                  Showing {((currentPage - 1) * USERS_PER_PAGE) + 1} to {Math.min(currentPage * USERS_PER_PAGE, filteredApprovedUsers.length)} of {filteredApprovedUsers.length} users
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <span className="text-sm font-body px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
