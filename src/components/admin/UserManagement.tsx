import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { Loader2, Clock, ChevronDown, ChevronRight, Trash2, Search, ShieldCheck, Save } from 'lucide-react';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { ColumnFilter } from '@/components/admin/ColumnFilter';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { type AppRole, type OrgDivision, roleLabel, divisionLabels, normalizeRole, CORE_DIVISIONS } from '@/lib/roles';

const ADMIN_EMAIL = 'as.minerva@unibocconi.it';

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  role: AppRole;
  division: OrgDivision | null;
  role_id: string;
}

// Roles that can be granted from this page (canonical set).
const ASSIGNABLE_ROLES: AppRole[] = [
  'admin', 'president', 'vice_president', 'head_of_asset_management', 'head_of_division',
  'portfolio_manager', 'team_leader', 'senior_analyst', 'analyst', 'head_of_media',
  'media_analyst', 'head_of_operations', 'advisor', 'silent_advisor', 'alumni', 'member',
];
// Roles that need a division to be meaningful.
const DIVISION_ROLES: AppRole[] = ['head_of_division', 'portfolio_manager', 'team_leader', 'senior_analyst', 'analyst'];
// A user with one of these (or no role row) is "pending" — not yet given real access.
const PENDING_ROLES: AppRole[] = ['member', 'pending'];

const UserManagement = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [divFilter, setDivFilter] = useState<string[]>([]);
  const [pendingOpen, setPendingOpen] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, { role: AppRole; division: OrgDivision | null }>>({});
  const [confirmChange, setConfirmChange] = useState<UserRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<UserRow | null>(null);
  const { toast } = useToast();
  const { user: currentUser, session } = useAuth();
  const { canManage } = useAccess();
  const canEdit = canManage('settings-users');

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: pErr } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (pErr) throw pErr;
      const { data: roles, error: rErr } = await supabase.from('user_roles').select('*');
      if (rErr) throw rErr;
      // Applicants live in Recruiting → Candidates, not here.
      const { data: apps } = await supabase.from('applications').select('user_id');
      const applicantIds = new Set((apps || []).map((a: { user_id: string }) => a.user_id));

      const rows: UserRow[] = (profiles || []).map((profile) => {
        const ur = roles?.find((r) => r.user_id === profile.id);
        return {
          id: profile.id, email: profile.email, full_name: profile.full_name, created_at: profile.created_at,
          role: (ur?.role as AppRole) || 'pending',
          division: (ur?.division as OrgDivision | null) ?? null,
          role_id: ur?.id || '',
        };
      }).filter((u) => {
        const roleStr = String(u.role);
        if (roleStr === 'candidate') return false;
        if (applicantIds.has(u.id) && ['member', 'pending', 'candidate'].includes(roleStr)) return false;
        return true;
      });
      setUsers(rows);
      setDrafts(Object.fromEntries(rows.map((u) => [u.id, { role: u.role, division: u.division }])));
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({ title: 'Error', description: 'Failed to fetch users', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchUsers(); }, []);

  const setDraftRole = (id: string, role: AppRole) =>
    setDrafts((d) => ({ ...d, [id]: { role, division: DIVISION_ROLES.includes(role) ? (d[id]?.division ?? null) : null } }));
  const setDraftDivision = (id: string, division: OrgDivision) =>
    setDrafts((d) => ({ ...d, [id]: { role: d[id]?.role ?? 'pending', division } }));

  const isDirty = (u: UserRow) => {
    const d = drafts[u.id];
    return !!d && (d.role !== u.role || (d.division ?? null) !== (u.division ?? null));
  };
  const draftValid = (u: UserRow) => {
    const d = drafts[u.id];
    if (!d) return false;
    if (DIVISION_ROLES.includes(d.role) && !d.division) return false;
    return true;
  };

  const applyRole = async (u: UserRow) => {
    const d = drafts[u.id];
    if (!d) return;
    setBusyUserId(u.id);
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'set-role', userId: u.id, role: d.role, division: d.division },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;
      if (data?.error) { toast({ title: 'Could not update', description: data.error, variant: 'destructive' }); return; }
      toast({ title: 'Role updated', description: `${u.full_name || u.email} is now ${roleLabel(d.role, d.division)}.` });
      await fetchUsers();
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed to update role', variant: 'destructive' });
    } finally {
      setBusyUserId(null);
      setConfirmChange(null);
    }
  };

  const deleteUser = async (u: UserRow) => {
    setBusyUserId(u.id);
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'delete', userId: u.id },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;
      if (data?.error) { toast({ title: 'Could not delete', description: data.error, variant: 'destructive' }); return; }
      toast({ title: 'User deleted' });
      await fetchUsers();
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed to delete user', variant: 'destructive' });
    } finally {
      setBusyUserId(null);
      setConfirmDelete(null);
    }
  };

  const pendingUsers = useMemo(() => users.filter((u) => PENDING_ROLES.includes(normalizeRole(u.role))), [users]);
  const approvedUsers = useMemo(() => users.filter((u) => !PENDING_ROLES.includes(normalizeRole(u.role))), [users]);

  // Filter options derived from approved users only.
  const roleOptions = useMemo(() => {
    const present = [...new Set(approvedUsers.map((u) => normalizeRole(u.role)))];
    return present.map((r) => ({ value: r, label: roleLabel(r, null) }));
  }, [approvedUsers]);
  const divisionOptions = useMemo(() => {
    const present = [...new Set(approvedUsers.map((u) => u.division).filter(Boolean) as OrgDivision[])];
    return present.map((d) => ({ value: d, label: divisionLabels[d] ?? d }));
  }, [approvedUsers]);

  const filteredApproved = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return approvedUsers
      .filter((u) => roleFilter.length === 0 || roleFilter.includes(normalizeRole(u.role)))
      .filter((u) => divFilter.length === 0 || (u.division && divFilter.includes(u.division)))
      .filter((u) =>
        u.email.toLowerCase().includes(q) ||
        (u.full_name?.toLowerCase().includes(q) ?? false) ||
        roleLabel(u.role, u.division).toLowerCase().includes(q));
  }, [approvedUsers, searchQuery, roleFilter, divFilter]);

  if (isLoading) {
    return <div><WorkspacePageHeader title="Users" description="Assign workspace roles and manage access." /><WorkspaceLoader /></div>;
  }

  // Editable controls (role + division selects, save + delete buttons).
  const renderEditControls = (u: UserRow, pending: boolean) => {
    const d = drafts[u.id] ?? { role: u.role, division: u.division };
    const isSelf = u.id === currentUser?.id;
    const isAdminAccount = u.email === ADMIN_EMAIL;
    return (
      <div className="flex flex-wrap items-center gap-2 justify-end">
        <Select value={d.role} onValueChange={(v) => setDraftRole(u.id, v as AppRole)} disabled={busyUserId === u.id}>
          <SelectTrigger className="w-[190px] h-9 font-body"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ASSIGNABLE_ROLES.map((r) => <SelectItem key={r} value={r}>{roleLabel(r, null)}</SelectItem>)}
          </SelectContent>
        </Select>
        {DIVISION_ROLES.includes(d.role) && (
          <Select value={d.division ?? ''} onValueChange={(v) => setDraftDivision(u.id, v as OrgDivision)} disabled={busyUserId === u.id}>
            <SelectTrigger className={`w-[140px] h-9 font-body ${!d.division ? 'border-amber-400' : ''}`}><SelectValue placeholder="Division…" /></SelectTrigger>
            <SelectContent>
              {CORE_DIVISIONS.map((dv) => <SelectItem key={dv} value={dv}>{divisionLabels[dv]}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Button size="sm" className="h-9" disabled={!isDirty(u) || !draftValid(u) || busyUserId === u.id}
          onClick={() => setConfirmChange(u)}>
          {busyUserId === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-1.5" />{pending ? 'Approve' : 'Save'}</>}
        </Button>
        {!isAdminAccount && !isSelf && (
          <Button variant="outline" size="icon" className="h-9 w-9 text-destructive border-destructive/40 hover:bg-destructive/10"
            disabled={busyUserId === u.id} onClick={() => setConfirmDelete(u)}><Trash2 className="h-4 w-4" /></Button>
        )}
      </div>
    );
  };

  // Pending list row (kept compact inside the accordion).
  const renderPendingRow = (u: UserRow) => {
    const isSelf = u.id === currentUser?.id;
    return (
      <div key={u.id} className="flex flex-col lg:flex-row lg:items-center gap-3 px-4 py-3 border-b border-separator last:border-b-0 font-body">
        <div className="min-w-0 flex-1">
          <div className="text-foreground truncate">{u.full_name || '—'} {isSelf && <span className="text-xs text-muted-foreground">(you)</span>}</div>
          <div className="text-xs text-muted-foreground truncate">{u.email}</div>
        </div>
        {canEdit ? renderEditControls(u, true) : <Badge variant="secondary" className="shrink-0">{roleLabel(u.role, u.division)}</Badge>}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <WorkspacePageHeader
        title="Users"
        description="Assign workspace roles — this controls who can manage the website, applications, events, membership and everything else. Role changes are confirmed, logged, and restricted to the President and Admin."
      />

      {!canEdit && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-body border border-separator rounded-lg px-4 py-2">
          <ShieldCheck className="h-4 w-4 text-accent" /> You can view who has which role. Only the President and Admin can change roles.
        </div>
      )}

      {/* Pending approvals — secondary, collapsed by default. */}
      <div className="border border-separator rounded-lg">
        <button type="button" onClick={() => setPendingOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-3 font-body">
          <span className="flex items-center gap-2 text-sm">
            {pendingOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <Clock className="h-4 w-4 text-amber-600" />
            <span className="text-foreground">Pending approvals</span>
            <Badge variant={pendingUsers.length ? 'default' : 'secondary'}>{pendingUsers.length}</Badge>
          </span>
          <span className="text-xs text-muted-foreground">Accounts without a workspace role yet</span>
        </button>
        {pendingOpen && (
          <div className="border-t border-separator">
            {pendingUsers.length === 0
              ? <p className="px-4 py-6 text-center text-sm text-muted-foreground font-body">No accounts are waiting for a role.</p>
              : pendingUsers.map(renderPendingRow)}
          </div>
        )}
      </div>

      {/* Approved users — primary. */}
      <div>
        <div className="mb-4 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-10 font-body" placeholder="Search by name, email or role"
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>

        {approvedUsers.length === 0 ? (
          <Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">No users with a role yet.</p></CardContent></Card>
        ) : filteredApproved.length === 0 ? (
          <Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">No users match the current filters.</p></CardContent></Card>
        ) : (
          <div className="border border-separator overflow-x-auto">
            <table className="w-full text-left font-body text-sm">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-normal">Name</th>
                  <th className="px-3 py-2 font-normal">Email</th>
                  <th className="px-3 py-2 font-normal"><ColumnFilter label="Role" options={roleOptions} selected={roleFilter} onChange={setRoleFilter} /></th>
                  <th className="px-3 py-2 font-normal"><ColumnFilter label="Division" options={divisionOptions} selected={divFilter} onChange={setDivFilter} /></th>
                  <th className="px-3 py-2 font-normal text-right">{canEdit ? 'Actions' : ' '}</th>
                </tr>
              </thead>
              <tbody>
                {filteredApproved.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} className="border-t border-separator align-middle">
                      <td className="px-3 py-2 text-foreground whitespace-nowrap">
                        {u.full_name || '—'} {isSelf && <span className="text-xs text-muted-foreground">(you)</span>}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{u.email}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{roleLabel(u.role, u.division)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{u.division ? (divisionLabels[u.division] ?? u.division) : '-'}</td>
                      <td className="px-3 py-2">
                        {canEdit
                          ? renderEditControls(u, false)
                          : <div className="flex justify-end"><Badge variant="secondary">{roleLabel(u.role, u.division)}</Badge></div>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="font-body text-xs text-muted-foreground mt-3">
          Showing {filteredApproved.length}{searchQuery || roleFilter.length || divFilter.length ? ` of ${approvedUsers.length}` : ''} approved users.
        </p>
      </div>

      {/* Confirm role change */}
      <AlertDialog open={!!confirmChange} onOpenChange={(o) => !o && setConfirmChange(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change this user's role?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmChange && (() => {
                const d = drafts[confirmChange.id];
                return <>You are about to set <span className="text-foreground font-medium">{confirmChange.full_name || confirmChange.email}</span> from{' '}
                  <span className="text-foreground">{roleLabel(confirmChange.role, confirmChange.division)}</span> to{' '}
                  <span className="text-foreground">{d && roleLabel(d.role, d.division)}</span>. This immediately changes what they can access, and is recorded in the activity log.</>;
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmChange && applyRole(confirmChange)}>Confirm change</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm delete */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this user?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete && <>This permanently deletes <span className="text-foreground font-medium">{confirmDelete.full_name || confirmDelete.email}</span>, their profile and role. This cannot be undone.</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => confirmDelete && deleteUser(confirmDelete)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserManagement;
