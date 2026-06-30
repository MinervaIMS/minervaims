import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Loader2, Download, Search, Upload, User as UserIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import {
  divisionLabels, roleLabel as composeRoleLabel, memberRank, normalizeRole,
  type AppRole, type OrgDivision,
} from '@/lib/roles';
import { downloadCSV } from '@/lib/download-utils';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import linkedinIcon from '@/assets/linkedin-icon.png';
import {
  listMembers, saveMember, deleteMember, uploadMemberPhoto,
  type MemberRow, type MemberInput,
} from '@/lib/members-api';

const DIVISION_OPTIONS: OrgDivision[] = ['equity', 'investment', 'macro', 'portfolio', 'quant', 'media', 'operations', 'board', 'none'];

const ROLE_OPTIONS: AppRole[] = [
  'president', 'vice_president', 'head_of_asset_management', 'head_of_division',
  'team_leader', 'portfolio_manager', 'analyst', 'head_of_media', 'media_analyst',
  'head_of_operations', 'advisor', 'member',
];

const MEMBERSHIP_OPTIONS = ['active', 'temporary_leave', 'alumni', 'expelled'] as const;
const ACCOUNT_OPTIONS = ['approved', 'pending', 'to_redeem'] as const;

const EMPTY: MemberInput = {
  first_name: '', surname: '', email: '', phone: '', linkedin_url: '', photo_url: '',
  division: 'none', role: 'analyst', membership_status: 'active', account_status: 'to_redeem',
  fee_status: 'unpaid', is_public: true,
};

interface Props {
  /** When true, render the Silent Advisors variant instead of active members. */
  silentAdvisors?: boolean;
}

export default function MembersManagement({ silentAdvisors = false }: Props) {
  const { session } = useAuth();
  const access = useAccess();
  const { toast } = useToast();
  const canEdit = access.canEdit('people-advisors') || access.canEdit('people-members');

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [divisionFilter, setDivisionFilter] = useState<OrgDivision | 'all'>('all');
  const [membershipFilter, setMembershipFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MemberInput>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MemberRow | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      setMembers(await listMembers());
    } catch (e) {
      toast({ title: 'Failed to load members', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const isSilent = (m: MemberRow) => m.role === 'silent_advisor' || m.membership_status === 'silent_advisor';

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members
      // The admin role is a user, not a member - never list it.
      .filter((m) => m.role !== 'admin')
      .filter((m) => (silentAdvisors ? isSilent(m) : !isSilent(m)))
      .filter((m) => divisionFilter === 'all' || m.division === divisionFilter)
      .filter((m) => membershipFilter === 'all' || m.membership_status === membershipFilter)
      .filter((m) => accountFilter === 'all' || m.account_status === accountFilter)
      .filter((m) => !q || `${m.first_name} ${m.surname} ${m.email ?? ''}`.toLowerCase().includes(q))
      .sort((a, b) => {
        const r = memberRank(a.role) - memberRank(b.role);
        if (r !== 0) return r;
        return `${a.surname} ${a.first_name}`.localeCompare(`${b.surname} ${b.first_name}`);
      });
  }, [members, search, divisionFilter, membershipFilter, accountFilter, silentAdvisors]);

  const openCreate = () => {
    setEditingId(null);
    setForm(silentAdvisors ? { ...EMPTY, role: 'silent_advisor', membership_status: 'silent_advisor', is_public: false } : EMPTY);
    setDialogOpen(true);
  };
  const openEdit = (m: MemberRow) => {
    setEditingId(m.id);
    setForm({
      id: m.id, first_name: m.first_name, surname: m.surname, email: m.email ?? '',
      phone: m.phone ?? '', linkedin_url: m.linkedin_url ?? '', photo_url: m.photo_url ?? '',
      division: m.division, role: m.role,
      membership_status: m.membership_status === 'silent_advisor' ? 'active' : m.membership_status,
      account_status: m.account_status, fee_status: m.fee_status, is_public: m.is_public,
    });
    setDialogOpen(true);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadMemberPhoto(session, file);
      setForm((p) => ({ ...p, photo_url: url }));
      toast({ title: 'Photo uploaded' });
    } catch (e) {
      toast({ title: 'Upload failed', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.first_name.trim() || !form.surname.trim()) {
      toast({ title: 'Name required', description: 'First name and surname are required.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload: MemberInput = silentAdvisors
        ? { ...form, role: 'silent_advisor', membership_status: 'silent_advisor', is_public: false }
        : form;
      await saveMember(session, payload);
      toast({ title: editingId ? 'Member updated' : 'Member added' });
      setDialogOpen(false);
      await load();
    } catch (e) {
      toast({ title: 'Could not save', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMember(session, deleteTarget.id);
      toast({ title: 'Member removed' });
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast({ title: 'Could not delete', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    }
  };

  const exportCsv = () => {
    // Export reflects the current filters (what the table is showing).
    const flat = rows.map((m) => ({
      first_name: m.first_name, surname: m.surname,
      division: m.division !== 'none' ? divisionLabels[m.division] : '',
      role: composeRoleLabel(m.role, m.division), phone: m.phone ?? '', email: m.email ?? '',
      linkedin_url: m.linkedin_url ?? '', membership_status: m.membership_status, account_status: m.account_status,
    }));
    downloadCSV(flat, [
      { key: 'first_name', header: 'First name' }, { key: 'surname', header: 'Surname' },
      { key: 'division', header: 'Division' }, { key: 'role', header: 'Role' },
      { key: 'phone', header: 'Phone' }, { key: 'email', header: 'Email' },
      { key: 'linkedin_url', header: 'LinkedIn' },
      { key: 'membership_status', header: 'Membership' }, { key: 'account_status', header: 'Account' },
    ], silentAdvisors ? 'silent-advisors.csv' : 'members-register.csv');
    toast({ title: 'Download started' });
  };

  const title = silentAdvisors ? 'Advisors' : 'Members';
  const description = silentAdvisors
    ? 'Silent Advisors - people with workspace access who are not shown on the public Members page.'
    : 'The association members register. Photo and the public subset feed the website; phone, fee and membership status are internal.';

  return (
    <div>
      <WorkspacePageHeader title={title} description={description} actions={
        <>
          <Button variant="outline" className="font-body" disabled={rows.length === 0} onClick={exportCsv}>
            <Download className="h-4 w-4 mr-2" />Download CSV
          </Button>
          {canEdit && (
            <Button className="font-body" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />{silentAdvisors ? 'Add advisor' : 'Add member'}
            </Button>
          )}
        </>
      } />

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        {!silentAdvisors && (
          <div>
            <label className="font-body text-xs text-muted-foreground uppercase tracking-wider block mb-2">Division</label>
            <Select value={divisionFilter} onValueChange={(v) => setDivisionFilter(v as OrgDivision | 'all')}>
              <SelectTrigger className="min-w-[160px] font-body"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All divisions</SelectItem>
                {DIVISION_OPTIONS.filter((d) => d !== 'none').map((d) => (
                  <SelectItem key={d} value={d}>{divisionLabels[d]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {!silentAdvisors && (
          <div>
            <label className="font-body text-xs text-muted-foreground uppercase tracking-wider block mb-2">Membership</label>
            <Select value={membershipFilter} onValueChange={setMembershipFilter}>
              <SelectTrigger className="min-w-[150px] font-body"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {MEMBERSHIP_OPTIONS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <div>
          <label className="font-body text-xs text-muted-foreground uppercase tracking-wider block mb-2">Account</label>
          <Select value={accountFilter} onValueChange={setAccountFilter}>
            <SelectTrigger className="min-w-[150px] font-body"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {ACCOUNT_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s === 'to_redeem' ? 'To redeem' : s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <label className="font-body text-xs text-muted-foreground uppercase tracking-wider block mb-2">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-10 font-body" placeholder="Name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {loading ? (
        <WorkspaceLoader />
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">No {silentAdvisors ? 'advisors' : 'members'} yet.</p></CardContent></Card>
      ) : (
        <div className="border border-separator overflow-x-auto">
          <table className="w-full text-left font-body text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-normal"> </th>
                <th className="px-3 py-2 font-normal">Name</th>
                <th className="px-3 py-2 font-normal">Division</th>
                <th className="px-3 py-2 font-normal">Role</th>
                <th className="px-3 py-2 font-normal">Phone</th>
                <th className="px-3 py-2 font-normal">Email</th>
                <th className="px-3 py-2 font-normal text-center">In</th>
                <th className="px-3 py-2 font-normal">Status</th>
                {canEdit && <th className="px-3 py-2 font-normal text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="border-t border-separator">
                  <td className="px-3 py-2">
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                      {m.photo_url ? <img src={m.photo_url} alt="" className="w-full h-full object-cover" /> : <UserIcon className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-foreground whitespace-nowrap">{m.first_name} {m.surname}</td>
                  <td className="px-3 py-2">{m.division !== 'none' ? divisionLabels[m.division] : '-'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{composeRoleLabel(m.role, m.division)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{m.phone || '-'}</td>
                  <td className="px-3 py-2">{m.email || <span className="text-amber-700">to redeem</span>}</td>
                  <td className="px-3 py-2 text-center">
                    {m.linkedin_url ? (
                      <a href={m.linkedin_url} target="_blank" rel="noopener noreferrer" title="Open LinkedIn profile" className="inline-flex">
                        <img src={linkedinIcon} alt="LinkedIn" className="h-4 w-4 opacity-80 hover:opacity-100" />
                      </a>
                    ) : <span className="text-muted-foreground">-</span>}
                  </td>
                  <td className="px-3 py-2">
                    <span className="capitalize">{m.account_status === 'to_redeem' ? 'to redeem' : m.account_status}</span>
                  </td>
                  {canEdit && (
                    <td className="px-3 py-2">
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="icon" onClick={() => openEdit(m)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="destructive" size="icon" onClick={() => setDeleteTarget(m)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="font-body text-xs text-muted-foreground mt-3">
        Ordering is automatic by role seniority, then alphabetical.
      </p>

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-serif">{editingId ? 'Edit' : 'Add'} {silentAdvisors ? 'advisor' : 'member'}</DialogTitle></DialogHeader>
          <div className="space-y-4 font-body">
            <div className="flex items-start gap-4">
              <div className="w-20 h-24 border border-separator bg-muted/40 overflow-hidden flex items-center justify-center shrink-0">
                {form.photo_url ? <img src={form.photo_url} alt="" className="w-full h-full object-cover" /> : <UserIcon className="h-6 w-6 text-muted-foreground" />}
              </div>
              <div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} />
                <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
                  {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading</> : <><Upload className="h-4 w-4 mr-2" />Photo</>}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>First name *</Label><Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
              <div className="space-y-1"><Label>Surname *</Label><Input value={form.surname} onChange={(e) => setForm({ ...form, surname: e.target.value })} /></div>
              <div className="space-y-1"><Label>Email</Label><Input value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="enables account redemption" /></div>
              <div className="space-y-1"><Label>Phone</Label><Input value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="space-y-1 col-span-2"><Label>LinkedIn URL</Label><Input value={form.linkedin_url ?? ''} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} /></div>

              {!silentAdvisors && (
                <>
                  <div className="space-y-1">
                    <Label>Role</Label>
                    <Select value={normalizeRole(form.role)} onValueChange={(v) => setForm({ ...form, role: v as AppRole })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{ROLE_OPTIONS.map((r) => <SelectItem key={r} value={r}>{composeRoleLabel(r, form.division)}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Division</Label>
                    <Select value={form.division} onValueChange={(v) => setForm({ ...form, division: v as OrgDivision })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{DIVISION_OPTIONS.map((d) => <SelectItem key={d} value={d}>{d === 'none' ? '-' : divisionLabels[d]}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Membership</Label>
                    <Select value={form.membership_status as string} onValueChange={(v) => setForm({ ...form, membership_status: v as MemberInput['membership_status'] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{MEMBERSHIP_OPTIONS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between col-span-2 pt-1">
                    <Label htmlFor="is_public">Show on public Members page</Label>
                    <Switch id="is_public" checked={!!form.is_public} onCheckedChange={(v) => setForm({ ...form, is_public: v })} />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving</> : editingId ? 'Save changes' : 'Add'}
              </Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deleteTarget?.first_name} {deleteTarget?.surname}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the person from the roster and from the public Members page. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
