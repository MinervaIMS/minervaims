import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Loader2, Download, Search, Upload, User as UserIcon } from 'lucide-react';
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
import { ColumnFilter } from '@/components/admin/ColumnFilter';
import linkedinIcon from '@/assets/linkedin-icon.png';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  listMembers, saveMember, deleteMember, moveMemberToAlumni, uploadMemberPhoto,
  MEMBERSHIP_STATUS_LABELS,
  type MemberRow, type MemberInput,
} from '@/lib/members-api';

const DIVISION_OPTIONS: OrgDivision[] = ['equity', 'investment', 'macro', 'portfolio', 'quant', 'media', 'operations', 'board', 'none'];

const ROLE_OPTIONS: AppRole[] = [
  'president', 'vice_president', 'head_of_asset_management', 'head_of_division',
  'team_leader', 'portfolio_manager', 'analyst', 'head_of_media', 'media_analyst',
  'head_of_operations', 'advisor', 'member',
];

const MEMBERSHIP_OPTIONS = ['active', 'on_exchange', 'one_semester_pause', 'expelled'] as const;

// Board roles get the extra "keep as silent advisor" option when leaving.
const BOARD_ROLES: AppRole[] = ['president', 'vice_president', 'head_of_asset_management', 'head_of_division', 'head_of_media', 'head_of_operations'];

const EMPTY: MemberInput = {
  first_name: '', surname: '', email: '', phone: '', linkedin_url: '', photo_url: '',
  division: 'none', role: 'analyst', membership_status: 'active', account_status: 'approved',
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
  const [divFilter, setDivFilter] = useState<string[]>([]);
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [membershipFilter, setMembershipFilter] = useState<string[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MemberInput>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [expelConfirm, setExpelConfirm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Leave flow (move to alumni).
  const [leaveTarget, setLeaveTarget] = useState<MemberRow | null>(null);
  const [leaveForm, setLeaveForm] = useState({ graduation_year: String(new Date().getFullYear()), company: '', city: '' });
  const [leaving, setLeaving] = useState(false);

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

  // The base set for this view (before column filters), used to build filter options.
  const base = useMemo(() => members
    .filter((m) => m.role !== 'admin')
    .filter((m) => (silentAdvisors ? isSilent(m) : !isSilent(m))), [members, silentAdvisors]);

  const divisionOptions = useMemo(() => {
    const present = new Set(base.map((m) => m.division));
    return DIVISION_OPTIONS.filter((d) => present.has(d)).map((d) => ({ value: d, label: d === 'none' ? 'None' : divisionLabels[d] }));
  }, [base]);
  const roleOptions = useMemo(() => {
    const present = [...new Set(base.map((m) => normalizeRole(m.role)))];
    return present.sort((a, b) => memberRank(a) - memberRank(b)).map((r) => ({ value: r, label: composeRoleLabel(r) }));
  }, [base]);
  const membershipOptions = useMemo(() => {
    const present = [...new Set(base.map((m) => m.membership_status))];
    return present.map((s) => ({ value: s, label: MEMBERSHIP_STATUS_LABELS[s] ?? s }));
  }, [base]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return base
      .filter((m) => divFilter.length === 0 || divFilter.includes(m.division))
      .filter((m) => roleFilter.length === 0 || roleFilter.includes(normalizeRole(m.role)))
      .filter((m) => membershipFilter.length === 0 || membershipFilter.includes(m.membership_status))
      .filter((m) => !q || `${m.first_name} ${m.surname} ${m.email ?? ''}`.toLowerCase().includes(q))
      .sort((a, b) => {
        const r = memberRank(a.role) - memberRank(b.role);
        if (r !== 0) return r;
        return `${a.surname} ${a.first_name}`.localeCompare(`${b.surname} ${b.first_name}`);
      });
  }, [base, search, divFilter, roleFilter, membershipFilter]);

  // Only silent advisors can be created manually; members register themselves.
  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY, role: 'silent_advisor', membership_status: 'silent_advisor', account_status: 'approved', is_public: false });
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

  const doSave = async () => {
    setSaving(true);
    try {
      const payload: MemberInput = silentAdvisors
        ? { ...form, role: 'silent_advisor', membership_status: 'silent_advisor', is_public: false }
        : form;
      await saveMember(session, payload);
      toast({ title: editingId ? 'Updated' : 'Advisor added' });
      setExpelConfirm(false);
      setDialogOpen(false);
      await load();
    } catch (e) {
      toast({ title: 'Could not save', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!form.first_name.trim() || !form.surname.trim()) {
      toast({ title: 'Name required', description: 'First name and surname are required.', variant: 'destructive' });
      return;
    }
    // Expelling is destructive: confirm first.
    if (!silentAdvisors && form.membership_status === 'expelled') { setExpelConfirm(true); return; }
    await doSave();
  };

  const openLeave = (m: MemberRow) => {
    setLeaveTarget(m);
    setLeaveForm({ graduation_year: String(new Date().getFullYear()), company: '', city: '' });
  };

  const doLeave = async (keepAsSilentAdvisor: boolean) => {
    if (!leaveTarget) return;
    if (!leaveForm.company.trim()) { toast({ title: 'Please add their current company', variant: 'destructive' }); return; }
    const year = parseInt(leaveForm.graduation_year, 10);
    if (!year) { toast({ title: 'Please add a graduation year', variant: 'destructive' }); return; }
    setLeaving(true);
    try {
      await moveMemberToAlumni(session, { id: leaveTarget.id, graduation_year: year, company: leaveForm.company.trim(), city: leaveForm.city.trim() || null, keep_as_silent_advisor: keepAsSilentAdvisor });
      toast({ title: keepAsSilentAdvisor ? 'Moved to alumni and kept as silent advisor' : 'Moved to alumni' });
      setLeaveTarget(null);
      await load();
    } catch (e) { toast({ title: 'Could not move to alumni', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setLeaving(false); }
  };

  const doJustRemove = async () => {
    if (!leaveTarget) return;
    setLeaving(true);
    try {
      await deleteMember(session, leaveTarget.id);
      toast({ title: 'Removed' });
      setLeaveTarget(null);
      await load();
    } catch (e) { toast({ title: 'Could not remove', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setLeaving(false); }
  };

  const exportCsv = () => {
    const flat = rows.map((m) => ({
      first_name: m.first_name, surname: m.surname,
      division: m.division !== 'none' ? divisionLabels[m.division] : '',
      role: composeRoleLabel(m.role, m.division), phone: m.phone ?? '', email: m.email ?? '',
      linkedin_url: m.linkedin_url ?? '', membership_status: m.membership_status,
    }));
    downloadCSV(flat, [
      { key: 'first_name', header: 'First name' }, { key: 'surname', header: 'Surname' },
      { key: 'division', header: 'Division' }, { key: 'role', header: 'Role' },
      { key: 'phone', header: 'Phone' }, { key: 'email', header: 'Email' },
      { key: 'linkedin_url', header: 'LinkedIn' }, { key: 'membership_status', header: 'Membership' },
    ], silentAdvisors ? 'silent-advisors.csv' : 'members-register.csv');
    toast({ title: 'Download started' });
  };

  const title = silentAdvisors ? 'Advisors' : 'Members';
  const description = silentAdvisors
    ? 'Silent Advisors - people with workspace access who are not shown on the public Members page.'
    : 'The association members register. To join, a person registers with their university email; you cannot add members by hand. Removing a member offers to move them to the alumni section.';

  const targetIsBoard = leaveTarget ? BOARD_ROLES.includes(normalizeRole(leaveTarget.role)) : false;

  return (
    <div>
      <WorkspacePageHeader title={title} description={description} actions={
        <>
          <Button variant="outline" className="font-body" disabled={rows.length === 0} onClick={exportCsv}>
            <Download className="h-4 w-4 mr-2" />Download CSV
          </Button>
          {canEdit && silentAdvisors && (
            <Button className="font-body" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />Add advisor
            </Button>
          )}
        </>
      } />

      {/* Search bar above the table; column filters live in the header row. */}
      <div className="mb-4 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-10 font-body" placeholder="Search by name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <WorkspaceLoader />
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">No {silentAdvisors ? 'advisors' : 'members'} match.</p></CardContent></Card>
      ) : (
        <div className="border border-separator overflow-x-auto">
          <table className="w-full text-left font-body text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-normal"> </th>
                <th className="px-3 py-2 font-normal">Name</th>
                <th className="px-3 py-2 font-normal"><ColumnFilter label="Division" options={divisionOptions} selected={divFilter} onChange={setDivFilter} /></th>
                <th className="px-3 py-2 font-normal"><ColumnFilter label="Role" options={roleOptions} selected={roleFilter} onChange={setRoleFilter} /></th>
                <th className="px-3 py-2 font-normal">Phone</th>
                <th className="px-3 py-2 font-normal">Email</th>
                <th className="px-3 py-2 font-normal text-center">In</th>
                <th className="px-3 py-2 font-normal"><ColumnFilter label="Membership" options={membershipOptions} selected={membershipFilter} onChange={setMembershipFilter} /></th>
                {canEdit && <th className="px-3 py-2 font-normal text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="border-t border-separator">
                  <td className="px-3 py-2">
                    <div className="w-9 h-9 overflow-hidden bg-muted flex items-center justify-center">
                      {m.photo_url ? <img src={m.photo_url} alt="" className="w-full h-full object-cover" /> : <UserIcon className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-foreground whitespace-nowrap">{m.first_name} {m.surname}</td>
                  <td className="px-3 py-2">{m.division !== 'none' ? divisionLabels[m.division] : '-'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{composeRoleLabel(m.role, m.division)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{m.phone || '-'}</td>
                  <td className="px-3 py-2">{m.email || '-'}</td>
                  <td className="px-3 py-2 text-center">
                    {m.linkedin_url ? (
                      <a href={m.linkedin_url} target="_blank" rel="noopener noreferrer" title="Open LinkedIn profile" className="inline-flex">
                        <img src={linkedinIcon} alt="LinkedIn" className="h-4 w-4 opacity-80" />
                      </a>
                    ) : <span className="text-muted-foreground">-</span>}
                  </td>
                  <td className="px-3 py-2">{MEMBERSHIP_STATUS_LABELS[m.membership_status] ?? m.membership_status}</td>
                  {canEdit && (
                    <td className="px-3 py-2">
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="icon" onClick={() => openEdit(m)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="destructive" size="icon" onClick={() => (silentAdvisors ? setLeaveTarget(m) : openLeave(m))}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="font-body text-xs text-muted-foreground mt-3">Ordering is automatic by role seniority, then alphabetical.</p>

      {/* Create / edit dialog (advisors only for create) */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-serif">{editingId ? 'Edit' : 'Add'} {silentAdvisors ? 'advisor' : 'member'}</DialogTitle></DialogHeader>
          <div className="space-y-4 font-body">
            <div className="flex items-start gap-4">
              <div className="w-24 aspect-square border border-separator bg-muted/40 overflow-hidden flex items-center justify-center shrink-0">
                {form.photo_url ? <img src={form.photo_url} alt="" className="w-full h-full object-cover" /> : <UserIcon className="h-6 w-6 text-muted-foreground" />}
              </div>
              <div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} />
                <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
                  {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading</> : <><Upload className="h-4 w-4 mr-2" />Photo</>}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">A square photo works best.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>First name *</Label><Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} placeholder="e.g. Marco" /></div>
              <div className="space-y-1"><Label>Surname *</Label><Input value={form.surname} onChange={(e) => setForm({ ...form, surname: e.target.value })} placeholder="e.g. Rossi" /></div>
              <div className="space-y-1"><Label>Email</Label><Input value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="e.g. marco.rossi@studbocconi.it" /></div>
              <div className="space-y-1"><Label>Phone</Label><Input value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="e.g. +39 333 000 0000" /></div>
              <div className="space-y-1 col-span-2"><Label>LinkedIn URL</Label><Input value={form.linkedin_url ?? ''} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} placeholder="e.g. https://linkedin.com/in/marcorossi" /></div>

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
                      <SelectContent>{MEMBERSHIP_OPTIONS.map((s) => <SelectItem key={s} value={s}>{MEMBERSHIP_STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
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

      {/* Leave / move-to-alumni dialog */}
      <Dialog open={!!leaveTarget} onOpenChange={(o) => !o && setLeaveTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Remove {leaveTarget?.first_name} {leaveTarget?.surname}</DialogTitle>
            <DialogDescription className="font-body">
              {silentAdvisors
                ? 'Remove this silent advisor from the workspace.'
                : 'A member leaving usually becomes an alumnus. Add a few details to move them to the alumni directory - their phone and email are kept privately for the association only.'}
            </DialogDescription>
          </DialogHeader>

          {silentAdvisors ? (
            <div className="flex gap-3 font-body">
              <Button variant="destructive" className="flex-1" disabled={leaving} onClick={doJustRemove}>{leaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Remove'}</Button>
              <Button variant="outline" onClick={() => setLeaveTarget(null)}>Cancel</Button>
            </div>
          ) : (
            <div className="space-y-4 font-body">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Graduation year</Label><Input value={leaveForm.graduation_year} onChange={(e) => setLeaveForm({ ...leaveForm, graduation_year: e.target.value })} placeholder="e.g. 2026" /></div>
                <div className="space-y-1"><Label>Current company</Label><Input value={leaveForm.company} onChange={(e) => setLeaveForm({ ...leaveForm, company: e.target.value })} placeholder="e.g. Goldman Sachs" /></div>
                <div className="space-y-1 col-span-2"><Label>City (optional)</Label><Input value={leaveForm.city} onChange={(e) => setLeaveForm({ ...leaveForm, city: e.target.value })} placeholder="e.g. London" /></div>
              </div>

              <Button className="w-full" disabled={leaving} onClick={() => doLeave(false)}>
                {leaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Move to alumni'}
              </Button>

              {targetIsBoard && (
                <div className="border border-separator p-3 space-y-2">
                  <Button variant="outline" className="w-full" disabled={leaving} onClick={() => doLeave(true)}>Move to alumni and keep as silent advisor</Button>
                  <p className="text-xs text-muted-foreground">
                    A silent advisor is no longer an active member and is not shown in the public Members section, but keeps read-only access to the workspace: they can see what is happening without editing anything.
                  </p>
                </div>
              )}

              <button type="button" className="text-xs text-muted-foreground underline w-full text-center" disabled={leaving} onClick={doJustRemove}>
                Remove without adding to alumni
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Expulsion confirmation */}
      <AlertDialog open={expelConfirm} onOpenChange={setExpelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Expel {form.first_name} {form.surname}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The member loses access to the workspace immediately, and their account is permanently deleted after one month.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Expel member'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
