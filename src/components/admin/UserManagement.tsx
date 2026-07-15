import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { Loader2, Clock, ChevronDown, ChevronRight, Trash2, Search, ShieldCheck, Pencil, Save } from 'lucide-react';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { HelpDot } from '@/components/admin/help/HelpSystem';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { ColumnFilter } from '@/components/admin/ColumnFilter';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  type AppRole, type OrgDivision, roleLabel, divisionLabels, normalizeRole, assignmentDivision,
  divisionsForRole, roleNeedsDivision,
} from '@/lib/roles';

const ADMIN_EMAIL = 'as.minerva@unibocconi.it';

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  role: AppRole;              // normalised (canonical) role
  division: OrgDivision | null;
  role_id: string;
}

// Roles that can be granted from this page (canonical set).
const ASSIGNABLE_ROLES: AppRole[] = [
  'admin', 'president', 'vice_president', 'head_of_asset_management', 'head_of_division',
  'portfolio_manager', 'team_leader', 'senior_analyst', 'analyst', 'head_of_media',
  'media_analyst', 'head_of_operations', 'advisor', 'silent_advisor', 'alumni', 'member',
];
// A user with one of these (or no role row) is "pending" — not yet given real access.
const PENDING_ROLES: AppRole[] = ['member', 'pending'];

// Role ⇄ division pairing comes from the shared rules in src/lib/roles.ts —
// the SAME rules used by People → Members and enforced by the edge
// functions, so the two role-assignment surfaces can never drift apart.

const UserManagement = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [divFilter, setDivFilter] = useState<string[]>([]);
  const [pendingOpen, setPendingOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState<{ role: AppRole; division: OrgDivision | null }>({ role: 'analyst', division: null });
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
        const rawRole = (ur?.role as AppRole) || 'pending';
        const rawDiv = (ur?.division as OrgDivision | null) ?? null;
        return {
          id: profile.id, email: profile.email, full_name: profile.full_name, created_at: profile.created_at,
          // Normalise legacy roles (head_of_quant → head_of_division, ...) so the
          // selectors always show a valid option and never send a stale value.
          role: normalizeRole(rawRole),
          division: assignmentDivision({ role: rawRole, division: rawDiv }),
          role_id: ur?.id || '',
        };
      }).filter((u) => {
        const roleStr = String(u.role);
        if (roleStr === 'candidate') return false;
        if (applicantIds.has(u.id) && ['member', 'pending', 'candidate'].includes(roleStr)) return false;
        return true;
      });
      setUsers(rows);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({ title: 'Error', description: 'Failed to fetch users', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchUsers(); }, []);

  const openEdit = (u: UserRow) => {
    setEditing(u);
    setEditForm({ role: u.role, division: u.division });
  };

  // Changing the role re-scopes the division to what that role allows.
  const changeEditRole = (role: AppRole) => {
    setEditForm((f) => {
      const opts = divisionsForRole(role);
      if (opts.length === 0) return { role, division: null };
      if (opts.length === 1) return { role, division: opts[0] };
      return { role, division: f.division && opts.includes(f.division) ? f.division : null };
    });
  };

  const editValid = useMemo(() => {
    if (!editing) return false;
    if (roleNeedsDivision(editForm.role)) {
      if (!editForm.division || !divisionsForRole(editForm.role).includes(editForm.division)) return false;
    }
    const changed = editForm.role !== editing.role || (editForm.division ?? null) !== (editing.division ?? null);
    return changed;
  }, [editing, editForm]);

  const applyRole = async () => {
    if (!editing) return;
    setBusyUserId(editing.id);
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'set-role', userId: editing.id, role: editForm.role, division: editForm.division },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      // Surface the function's real message (invoke reports non-2xx as `error`).
      if (error) {
        let msg = error.message || 'Failed to update role';
        try {
          const ctx = (error as unknown as { context?: Response }).context;
          if (ctx && typeof ctx.json === 'function') { const b = await ctx.json(); if (b?.error) msg = b.error; }
        } catch { /* keep default */ }
        toast({ title: 'Could not update', description: msg, variant: 'destructive' });
        return;
      }
      if (data?.error) { toast({ title: 'Could not update', description: data.error, variant: 'destructive' }); return; }
      toast({ title: 'Role updated', description: `${editing.full_name || editing.email} is now ${roleLabel(editForm.role, editForm.division)}.` });
      setEditing(null);
      await fetchUsers();
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed to update role', variant: 'destructive' });
    } finally {
      setBusyUserId(null);
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

  const pendingUsers = useMemo(() => users.filter((u) => PENDING_ROLES.includes(u.role)), [users]);
  const approvedUsers = useMemo(() => users.filter((u) => !PENDING_ROLES.includes(u.role)), [users]);

  const roleOptions = useMemo(() => {
    const present = [...new Set(approvedUsers.map((u) => u.role))];
    return present.map((r) => ({ value: r, label: roleLabel(r, null) }));
  }, [approvedUsers]);
  const divisionOptions = useMemo(() => {
    const present = [...new Set(approvedUsers.map((u) => u.division).filter(Boolean) as OrgDivision[])];
    return present.map((d) => ({ value: d, label: divisionLabels[d] ?? d }));
  }, [approvedUsers]);

  const filteredApproved = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return approvedUsers
      .filter((u) => roleFilter.length === 0 || roleFilter.includes(u.role))
      .filter((u) => divFilter.length === 0 || (u.division && divFilter.includes(u.division)))
      .filter((u) =>
        u.email.toLowerCase().includes(q) ||
        (u.full_name?.toLowerCase().includes(q) ?? false) ||
        roleLabel(u.role, u.division).toLowerCase().includes(q));
  }, [approvedUsers, searchQuery, roleFilter, divFilter]);

  if (isLoading) {
    return <div><WorkspacePageHeader title="Users" description="Assign workspace roles and manage access." /><WorkspaceLoader /></div>;
  }

  // Row action buttons (edit + delete), shown only to those who may manage users.
  const rowActions = (u: UserRow) => {
    const isSelf = u.id === currentUser?.id;
    const isAdminAccount = u.email === ADMIN_EMAIL;
    if (!canEdit) return <Badge variant="secondary">{roleLabel(u.role, u.division)}</Badge>;
    return (
      <div className="flex items-center gap-2 justify-end">
        <Button variant="outline" size="sm" className="h-8" disabled={busyUserId === u.id} onClick={() => openEdit(u)}>
          <Pencil className="h-3.5 w-3.5 mr-1.5" />Change role
        </Button>
        {!isAdminAccount && !isSelf && (
          <Button variant="outline" size="icon" className="h-8 w-8 text-destructive border-destructive/40 hover:bg-destructive/10"
            disabled={busyUserId === u.id} onClick={() => setConfirmDelete(u)}><Trash2 className="h-4 w-4" /></Button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <WorkspacePageHeader
        title="Users"
        description="Assign workspace roles. This controls who can manage the website, applications, events, membership and everything else. Role changes are confirmed, logged, and restricted to the President and Admin."
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
              : pendingUsers.map((u) => (
                <div key={u.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 border-b border-separator last:border-b-0 font-body">
                  <div className="min-w-0 flex-1">
                    <div className="text-foreground truncate">{u.full_name || '-'}</div>
                    <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                  </div>
                  {canEdit
                    ? <Button variant="outline" size="sm" className="h-8 shrink-0" onClick={() => openEdit(u)}><Pencil className="h-3.5 w-3.5 mr-1.5" />Assign role</Button>
                    : <Badge variant="secondary" className="shrink-0">{roleLabel(u.role, u.division)}</Badge>}
                </div>
              ))}
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
                        {u.full_name || '-'} {isSelf && <span className="text-xs text-muted-foreground">(you)</span>}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{u.email}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-foreground">{roleLabel(u.role, u.division)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{u.division ? (divisionLabels[u.division] ?? u.division) : '-'}</td>
                      <td className="px-3 py-2 text-right">{rowActions(u)}</td>
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

      {/* Change-role dialog (also used to assign a pending account). */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif inline-flex items-center gap-2">Change role <HelpDot page="settings-users" topic="change-role" /></DialogTitle>
            <DialogDescription className="font-body">
              {editing && <><span className="text-foreground">{editing.full_name || editing.email}</span> is currently <span className="text-foreground">{roleLabel(editing.role, editing.division)}</span>. Changes take effect immediately and are recorded in the activity log.</>}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 font-body">
            <div className="space-y-1">
              <Label>Role</Label>
              <Select value={editForm.role} onValueChange={(v) => changeEditRole(v as AppRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLES.map((r) => <SelectItem key={r} value={r}>{roleLabel(r, null)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {roleNeedsDivision(editForm.role) && (
              <div className="space-y-1">
                <Label>Division</Label>
                <Select value={editForm.division ?? ''} onValueChange={(v) => setEditForm((f) => ({ ...f, division: v as OrgDivision }))}
                  disabled={divisionsForRole(editForm.role).length === 1}>
                  <SelectTrigger className={!editForm.division ? 'border-amber-400' : ''}><SelectValue placeholder="Select a division…" /></SelectTrigger>
                  <SelectContent>
                    {divisionsForRole(editForm.role).map((d) => <SelectItem key={d} value={d}>{divisionLabels[d]}</SelectItem>)}
                  </SelectContent>
                </Select>
                {divisionsForRole(editForm.role).length === 1 && (
                  <p className="text-xs text-muted-foreground">{roleLabel(editForm.role, null)} always belongs to {divisionLabels[divisionsForRole(editForm.role)[0]]}.</p>
                )}
              </div>
            )}
            {!roleNeedsDivision(editForm.role) && (
              <p className="text-xs text-muted-foreground">This role carries no division: the board is not a division.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={applyRole} disabled={!editValid || busyUserId === editing?.id}>
              {busyUserId === editing?.id ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving</> : <><Save className="h-4 w-4 mr-2" />Save role</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
