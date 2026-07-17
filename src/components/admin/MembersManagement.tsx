import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Loader2, Download, Search, Upload, User as UserIcon, EyeOff, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { logActivity } from '@/lib/activity-log';
import { useAccess } from '@/hooks/useAccess';
import {
  divisionLabels, roleLabel as composeRoleLabel, memberRank, normalizeRole,
  divisionsForRole, roleNeedsDivision, isBoardRole,
  type AppRole, type OrgDivision,
} from '@/lib/roles';
import { MEMBERS_DIVISION_VIEW_ROLES } from '@/lib/access/matrix';
import { downloadCSV } from '@/lib/download-utils';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { HelpDot } from '@/components/admin/help/HelpSystem';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { ColumnFilter } from '@/components/admin/ColumnFilter';
import { supabase } from '@/integrations/supabase/client';
import linkedinIcon from '@/assets/linkedin-icon.png';

interface SemesterMemberRow {
  semester_key: string; semester_label: string;
  first_name: string; surname: string;
  division: string | null; role: string | null; fee_paid: boolean;
}
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  listMembers, saveMember, deleteMember, moveMemberToAlumni, uploadMemberPhoto,
  MEMBERSHIP_STATUS_LABELS,
  type MemberRow, type MemberInput,
} from '@/lib/members-api';

// THE role list: the same canonical set everywhere (People > Members and
// Settings > Users edit the SAME record, the member profile, and workspace
// access mirrors it automatically). One email, one user, one role.
const ROLE_OPTIONS: AppRole[] = [
  'president', 'vice_president', 'head_of_asset_management', 'head_of_division',
  'portfolio_manager', 'team_leader', 'senior_analyst', 'analyst', 'head_of_media',
  'media_analyst', 'head_of_operations', 'advisor', 'member',
];

const MEMBERSHIP_OPTIONS = ['active', 'on_exchange', 'one_semester_pause', 'expelled'] as const;

const EMPTY: MemberInput = {
  first_name: '', surname: '', email: '', phone: '', linkedin_url: '', photo_url: '',
  division: 'none', role: 'analyst', membership_status: 'active', account_status: 'approved',
  fee_status: 'unpaid', is_public: true,
};

export default function MembersManagement() {
  const { session } = useAuth();
  const access = useAccess();
  const { toast } = useToast();
  const canEdit = access.canEdit('people-members');
  // Removing a member's photo is reserved for the executive level.
  const canRemovePhoto = ['admin', 'president', 'vice_president'].includes(normalizeRole(access.primaryRole ?? 'member'));
  // Portfolio managers, team leaders, senior analysts and analysts consult
  // the register in a limited form: only their own division's people, names
  // and LinkedIn (no phone or email columns). The database enforces the same
  // row limit via RLS, so this is presentation on top of a hard rule.
  const limitedToOwnDivision =
    !!access.primaryRole &&
    MEMBERS_DIVISION_VIEW_ROLES.includes(normalizeRole(access.primaryRole)) &&
    !!access.allowedDivisions?.length;
  const limitedDivisions = limitedToOwnDivision ? access.allowedDivisions! : null;

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [divFilter, setDivFilter] = useState<string[]>([]);
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [membershipFilter, setMembershipFilter] = useState<string[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MemberInput>(EMPTY);
  const [originalRole, setOriginalRole] = useState<AppRole | null>(null);
  const [saving, setSaving] = useState(false);
  const [expelConfirm, setExpelConfirm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Leave flow (move to alumni), also reused when a member is appointed
  // advisor: every advisor is a role assignment on a registered alumnus.
  const [leaveTarget, setLeaveTarget] = useState<MemberRow | null>(null);
  const [leaveForm, setLeaveForm] = useState({ graduation_year: String(new Date().getFullYear()), company: '', city: '', job_area: '' });
  const [leaving, setLeaving] = useState(false);
  // When true, the leave dialog is running as the "appoint advisor" step.
  const [advisorFlow, setAdvisorFlow] = useState(false);

  // Semester member register — the official snapshot of who belonged to the
  // association each semester, taken when that semester's fee collection
  // closed. Read-only, kept forever. Advisors are not part of it.
  const [registers, setRegisters] = useState<{ semester_key: string; semester_label: string; rows: SemesterMemberRow[] }[]>([]);
  const [openRegister, setOpenRegister] = useState<string | null>(null);

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

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('semester_members')
        .select('semester_key, semester_label, first_name, surname, division, role, fee_paid')
        .order('semester_key', { ascending: false }).order('surname');
      const map = new Map<string, { semester_key: string; semester_label: string; rows: SemesterMemberRow[] }>();
      for (const r of (data || []) as SemesterMemberRow[]) {
        const g = map.get(r.semester_key) ?? { semester_key: r.semester_key, semester_label: r.semester_label, rows: [] };
        g.rows.push(r); map.set(r.semester_key, g);
      }
      setRegisters([...map.values()]);
    })();
  }, []);

  const isAdvisor = (m: MemberRow) => normalizeRole(m.role) === 'advisor';
  // An advisor hidden from the public website (what used to be a "silent advisor").
  const isHiddenAdvisor = (m: MemberRow) => isAdvisor(m) && !m.is_public;

  // The base set (before column filters), used to build filter options.
  // Advisors are part of the roster and appear here alongside members.
  const base = useMemo(
    () => members
      .filter((m) => normalizeRole(m.role) !== 'admin')
      .filter((m) => !limitedDivisions || limitedDivisions.includes(m.division)),
    [members, limitedDivisions],
  );

  const divisionOptions = useMemo(() => {
    const present = new Set(base.map((m) => m.division));
    return ['equity', 'investment', 'macro', 'portfolio', 'quant', 'media', 'operations', 'board', 'none']
      .filter((d) => present.has(d as OrgDivision))
      .map((d) => ({ value: d, label: d === 'none' ? 'None' : divisionLabels[d as OrgDivision] }));
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

  // Members register themselves (recruiting); only advisors can be added by
  // hand, hidden from the website by default.
  const openCreate = () => {
    setEditingId(null);
    setOriginalRole(null);
    setForm({ ...EMPTY, role: 'advisor', division: 'none', membership_status: 'active', account_status: 'approved', is_public: false });
    setDialogOpen(true);
  };
  const openEdit = (m: MemberRow) => {
    setEditingId(m.id);
    setOriginalRole(normalizeRole(m.role));
    setForm({
      id: m.id, first_name: m.first_name, surname: m.surname, email: m.email ?? '',
      phone: m.phone ?? '', linkedin_url: m.linkedin_url ?? '', photo_url: m.photo_url ?? '',
      division: m.division, role: normalizeRole(m.role),
      membership_status: m.membership_status, account_status: m.account_status,
      fee_status: m.fee_status, is_public: m.is_public,
    });
    setDialogOpen(true);
  };

  // Changing the role re-scopes the division to what that role allows —
  // the same pairing rules as Settings → Users (and the server re-checks).
  const changeFormRole = (role: AppRole) => {
    setForm((f) => {
      const options = divisionsForRole(role);
      if (options.length === 0) return { ...f, role, division: 'none' };
      if (options.length === 1) return { ...f, role, division: options[0] };
      return { ...f, role, division: options.includes(f.division) ? f.division : options[0] };
    });
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
      await saveMember(session, form);
      logActivity(session, access.primaryRole, { action: form.id ? 'update' : 'create', section: 'People', subsection: 'Members', entityType: 'member', entityName: `${form.first_name} ${form.surname}` });
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
    // Becoming an advisor is not a plain role pick: every advisor is a role
    // assignment on a registered ALUMNUS, so the alumni-registration step is
    // always requested first (a board member stepping back is the typical case).
    if (editingId && normalizeRole(form.role) === 'advisor' && originalRole && originalRole !== 'advisor') {
      const target = members.find((m) => m.id === editingId);
      if (target) {
        setDialogOpen(false);
        setAdvisorFlow(true);
        setLeaveTarget(target);
        setLeaveForm({ graduation_year: String(new Date().getFullYear()), company: '', city: '', job_area: '' });
        return;
      }
    }
    // Expelling is destructive: confirm first.
    if (form.membership_status === 'expelled') { setExpelConfirm(true); return; }
    await doSave();
  };

  const openLeave = (m: MemberRow) => {
    setAdvisorFlow(false);
    setLeaveTarget(m);
    setLeaveForm({ graduation_year: String(new Date().getFullYear()), company: '', city: '', job_area: '' });
  };

  const doLeave = async (keepAsAdvisor: boolean) => {
    if (!leaveTarget) return;
    // An advisor can be registered before their company is known; a plain
    // move to the directory still requires the current company.
    if (!keepAsAdvisor && !leaveForm.company.trim()) {
      toast({ title: 'Please add their current company', variant: 'destructive' });
      return;
    }
    const year = parseInt(leaveForm.graduation_year, 10);
    if (!year) { toast({ title: 'Please add a graduation year', variant: 'destructive' }); return; }
    setLeaving(true);
    try {
      logActivity(session, access.primaryRole, { action: 'update', section: 'People', subsection: 'Members', entityType: 'member', entityId: leaveTarget.id, entityName: `${leaveTarget.first_name} ${leaveTarget.surname}`, details: { moved_to: 'alumni', kept_as: keepAsAdvisor ? 'advisor' : undefined } });
      await moveMemberToAlumni(session, {
        id: leaveTarget.id, graduation_year: year,
        company: leaveForm.company.trim() || null,
        city: leaveForm.city.trim() || null,
        job_area: leaveForm.job_area.trim() || null,
        keep_role: keepAsAdvisor ? 'advisor' : undefined,
      });
      toast({
        title: keepAsAdvisor ? 'Registered as alumnus and appointed advisor' : 'Moved to alumni',
        description: keepAsAdvisor ? 'The advisor starts hidden from the public website; use the edit dialog to show them.' : undefined,
      });
      setLeaveTarget(null);
      setAdvisorFlow(false);
      await load();
    } catch (e) { toast({ title: 'Could not complete', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setLeaving(false); }
  };

  const doJustRemove = async () => {
    if (!leaveTarget) return;
    setLeaving(true);
    try {
      await deleteMember(session, leaveTarget.id);
      logActivity(session, access.primaryRole, { action: 'delete', section: 'People', subsection: 'Members', entityType: 'member', entityId: leaveTarget.id, entityName: `${leaveTarget.first_name} ${leaveTarget.surname}` });
      toast({ title: 'Removed' });
      setLeaveTarget(null);
      await load();
    } catch (e) { toast({ title: 'Could not remove', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setLeaving(false); }
  };

  const exportCsv = () => {
    const flat = rows.map((m) => ({
      first_name: m.first_name, surname: m.surname,
      division: m.division !== 'none' && m.division !== 'board' ? divisionLabels[m.division] : '',
      role: composeRoleLabel(m.role, m.division), phone: m.phone ?? '', email: m.email ?? '',
      linkedin_url: m.linkedin_url ?? '', membership_status: m.membership_status,
      on_website: m.is_public ? 'yes' : 'no',
    }));
    downloadCSV(flat, [
      { key: 'first_name', header: 'First name' }, { key: 'surname', header: 'Surname' },
      { key: 'division', header: 'Division' }, { key: 'role', header: 'Role' },
      { key: 'phone', header: 'Phone' }, { key: 'email', header: 'Email' },
      { key: 'linkedin_url', header: 'LinkedIn' }, { key: 'membership_status', header: 'Membership' },
      { key: 'on_website', header: 'On public website' },
    ], 'members-register.csv');
    toast({ title: 'Download started' });
  };

  const targetIsBoard = leaveTarget ? isBoardRole(leaveTarget.role) : false;

  // Semester registers show the board of directors first, then the members.
  const registerGroups = (rowsIn: SemesterMemberRow[]) => {
    const rank = (r: SemesterMemberRow) => memberRank((r.role ?? 'member') as AppRole);
    const sorted = [...rowsIn].sort((a, b) => {
      const d = rank(a) - rank(b);
      if (d !== 0) return d;
      return `${a.surname} ${a.first_name}`.localeCompare(`${b.surname} ${b.first_name}`);
    });
    return {
      board: sorted.filter((r) => isBoardRole((r.role ?? 'member') as AppRole)),
      others: sorted.filter((r) => !isBoardRole((r.role ?? 'member') as AppRole)),
    };
  };

  return (
    <div>
      <WorkspacePageHeader
        title="Members"
        description="The association register: members and advisors, with THE role each person holds. This role drives their workspace permissions everywhere (Settings > Users edits the same record). Advisors are appointed alumni; the switch in their profile decides whether they appear on the public website."
        actions={
          <>
            {!limitedToOwnDivision && (
              <Button variant="outline" className="font-body" disabled={rows.length === 0} onClick={exportCsv}>
                <Download className="h-4 w-4 mr-2" />Download CSV
              </Button>
            )}
            {canEdit && (
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
        <Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">No members match.</p></CardContent></Card>
      ) : (
        <div className="border border-separator overflow-x-auto">
          <table className="w-full text-left font-body text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-normal"> </th>
                <th className="px-3 py-2 font-normal">Name</th>
                <th className="px-3 py-2 font-normal"><ColumnFilter label="Division" options={divisionOptions} selected={divFilter} onChange={setDivFilter} /></th>
                <th className="px-3 py-2 font-normal"><ColumnFilter label="Role" options={roleOptions} selected={roleFilter} onChange={setRoleFilter} /></th>
                {!limitedToOwnDivision && <th className="px-3 py-2 font-normal">Phone</th>}
                {!limitedToOwnDivision && <th className="px-3 py-2 font-normal">Email</th>}
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
                  <td className="px-3 py-2 text-foreground whitespace-nowrap">
                    {m.first_name} {m.surname}
                    {isHiddenAdvisor(m) && (
                      <span className="ml-2 inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 bg-muted text-muted-foreground align-middle" title="Advisor hidden from the public website (toggle in the edit dialog)">
                        <EyeOff className="h-3 w-3" />hidden
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">{m.division !== 'none' && m.division !== 'board' ? divisionLabels[m.division] : '-'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{composeRoleLabel(m.role, m.division)}</td>
                  {!limitedToOwnDivision && <td className="px-3 py-2 whitespace-nowrap">{m.phone || '-'}</td>}
                  {!limitedToOwnDivision && <td className="px-3 py-2">{m.email || '-'}</td>}
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
                        <Button variant="destructive" size="icon" onClick={() => openLeave(m)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="font-body text-xs text-muted-foreground mt-3">Ordering is automatic by role seniority, then alphabetical. Advisors marked "hidden" do not appear on the public website.</p>

      {/* Semester registers: the official member list of each past semester,
          snapshotted automatically when its fee collection closed. */}
      {registers.length > 0 && (
        <div className="mt-10">
          <h3 className="font-serif text-lg text-accent mb-1 inline-flex items-center gap-2">Semester registers <HelpDot page="people-members" topic="registers" /></h3>
          <p className="font-body text-sm text-muted-foreground mb-3">
            Who officially belonged to the association, semester by semester. Each register is frozen when that semester's membership-fee collection closes and can no longer change. The board of directors is listed first, then the members.
          </p>
          <div className="space-y-2">
            {registers.map((g) => {
              const groups = registerGroups(g.rows);
              return (
                <div key={g.semester_key} className="border border-separator rounded-lg">
                  <button type="button" className="w-full flex items-center justify-between px-4 py-2.5 font-body text-sm"
                    onClick={() => setOpenRegister(openRegister === g.semester_key ? null : g.semester_key)}>
                    <span className="text-foreground font-serif">{g.semester_label}</span>
                    <span className="text-muted-foreground text-xs">{g.rows.length} members {openRegister === g.semester_key ? '▾' : '▸'}</span>
                  </button>
                  {openRegister === g.semester_key && (
                    <div className="border-t border-separator overflow-x-auto">
                      <table className="w-full text-left font-body text-sm">
                        <thead className="bg-muted/40 text-muted-foreground">
                          <tr><th className="px-3 py-1.5 font-normal">Name</th><th className="px-3 py-1.5 font-normal">Role</th><th className="px-3 py-1.5 font-normal">Division</th></tr>
                        </thead>
                        <tbody>
                          {groups.board.length > 0 && (
                            <tr><td colSpan={3} className="px-3 py-1.5 bg-accent/5 text-accent font-serif uppercase tracking-wider text-[11px]">Board of directors</td></tr>
                          )}
                          {groups.board.map((r, i) => (
                            <tr key={`b${i}`} className="border-t border-separator">
                              <td className="px-3 py-1.5 text-foreground">{r.first_name} {r.surname}</td>
                              <td className="px-3 py-1.5">{r.role ? composeRoleLabel(r.role as never, (r.division ?? null) as never) : '-'}</td>
                              <td className="px-3 py-1.5">{r.division && r.division !== 'none' && r.division !== 'board' ? (divisionLabels[r.division as keyof typeof divisionLabels] ?? r.division) : '-'}</td>
                            </tr>
                          ))}
                          {groups.others.length > 0 && (
                            <tr><td colSpan={3} className="px-3 py-1.5 bg-muted/40 text-muted-foreground font-serif uppercase tracking-wider text-[11px]">Members</td></tr>
                          )}
                          {groups.others.map((r, i) => (
                            <tr key={`m${i}`} className="border-t border-separator">
                              <td className="px-3 py-1.5 text-foreground">{r.first_name} {r.surname}</td>
                              <td className="px-3 py-1.5">{r.role ? composeRoleLabel(r.role as never, (r.division ?? null) as never) : '-'}</td>
                              <td className="px-3 py-1.5">{r.division && r.division !== 'none' && r.division !== 'board' ? (divisionLabels[r.division as keyof typeof divisionLabels] ?? r.division) : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create / edit dialog (create is for advisors only) */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-serif">{editingId ? 'Edit member' : 'Add advisor'}</DialogTitle></DialogHeader>
          <div className="space-y-4 font-body">
            <div className="flex items-start gap-4">
              <div className="w-24 aspect-square border border-separator bg-muted/40 overflow-hidden flex items-center justify-center shrink-0">
                {form.photo_url ? <img src={form.photo_url} alt="" className="w-full h-full object-cover" /> : <UserIcon className="h-6 w-6 text-muted-foreground" />}
              </div>
              <div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
                    {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading</> : <><Upload className="h-4 w-4 mr-2" />Photo</>}
                  </Button>
                  {canRemovePhoto && form.photo_url && (
                    <Button variant="outline" size="sm" onClick={() => setForm((p) => ({ ...p, photo_url: '' }))} title="Remove the current photo">
                      <X className="h-4 w-4 mr-2" />Remove photo
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">A square photo works best.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>First name *</Label><Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} placeholder="e.g. Marco" /></div>
              <div className="space-y-1"><Label>Surname *</Label><Input value={form.surname} onChange={(e) => setForm({ ...form, surname: e.target.value })} placeholder="e.g. Rossi" /></div>
              <div className="space-y-1"><Label>Email</Label><Input value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="e.g. marco.rossi@studbocconi.it" /></div>
              <div className="space-y-1"><Label>Phone</Label><Input value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="e.g. +39 333 000 0000" /></div>
              <div className="space-y-1 col-span-2"><Label>LinkedIn URL</Label><Input value={form.linkedin_url ?? ''} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} placeholder="e.g. https://linkedin.com/in/marcorossi" /></div>

              <div className="space-y-1">
                <Label>Role</Label>
                <Select value={normalizeRole(form.role)} onValueChange={(v) => changeFormRole(v as AppRole)} disabled={!editingId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLE_OPTIONS.map((r) => <SelectItem key={r} value={r}>{composeRoleLabel(r, null)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Division</Label>
                <Select
                  value={roleNeedsDivision(form.role) ? form.division : 'none'}
                  onValueChange={(v) => setForm({ ...form, division: v as OrgDivision })}
                  disabled={!roleNeedsDivision(form.role) || divisionsForRole(form.role).length === 1}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {roleNeedsDivision(form.role)
                      ? divisionsForRole(form.role).map((d) => <SelectItem key={d} value={d}>{divisionLabels[d]}</SelectItem>)
                      : <SelectItem value="none">-</SelectItem>}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {!roleNeedsDivision(form.role)
                    ? 'This role carries no division (the board is not a division).'
                    : divisionsForRole(form.role).length === 1
                      ? `${composeRoleLabel(form.role, null)} always belongs to ${divisionLabels[divisionsForRole(form.role)[0]]}.`
                      : 'Heads of a division sit on the board and lead their division.'}
                </p>
              </div>
              <p className="col-span-2 text-xs text-muted-foreground border border-separator bg-muted/40 p-2">
                This role is the person's ONE role: it drives their workspace permissions everywhere.
                {editingId && normalizeRole(form.role) === 'advisor' && originalRole !== 'advisor'
                  ? ' Advisors are appointed alumni: saving with this role first asks you to register this person as an alumnus.'
                  : ''}
              </p>
              <div className="space-y-1">
                <Label>Membership</Label>
                <Select value={form.membership_status as string} onValueChange={(v) => setForm({ ...form, membership_status: v as MemberInput['membership_status'] })} disabled={normalizeRole(form.role) === 'advisor'}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MEMBERSHIP_OPTIONS.map((s) => <SelectItem key={s} value={s}>{MEMBERSHIP_STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between col-span-2 pt-1">
                <Label htmlFor="is_public">
                  Show on public Members page
                  {normalizeRole(form.role) === 'advisor' && <span className="block text-xs font-normal text-muted-foreground">Off = the advisor stays completely hidden from the website.</span>}
                </Label>
                <Switch id="is_public" checked={!!form.is_public} onCheckedChange={(v) => setForm({ ...form, is_public: v })} />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving</> : editingId ? 'Save changes' : 'Add advisor'}
              </Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Leave / move-to-alumni dialog. Also runs the "appoint advisor" step:
          the person is registered as an alumnus, then keeps the advisor role. */}
      <Dialog open={!!leaveTarget} onOpenChange={(o) => { if (!o) { setLeaveTarget(null); setAdvisorFlow(false); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">
              {advisorFlow
                ? `Appoint ${leaveTarget?.first_name} ${leaveTarget?.surname} as advisor`
                : `Remove ${leaveTarget?.first_name} ${leaveTarget?.surname}`}
            </DialogTitle>
            <DialogDescription className="font-body">
              {advisorFlow
                ? 'Every advisor is a role assignment on a registered alumnus. Complete the alumni details; the advisor role is applied right after. The advisor starts hidden from the public website.'
                : 'A member leaving usually becomes an alumnus. Add a few details to move them to the alumni directory - their phone and email are kept privately for the association only.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 font-body">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Graduation year</Label><Input value={leaveForm.graduation_year} onChange={(e) => setLeaveForm({ ...leaveForm, graduation_year: e.target.value })} placeholder="e.g. 2026" /></div>
              <div className="space-y-1">
                <Label>Current company{advisorFlow ? ' (optional)' : ''}</Label>
                <Input value={leaveForm.company} onChange={(e) => setLeaveForm({ ...leaveForm, company: e.target.value })} placeholder="e.g. Goldman Sachs" />
              </div>
              <div className="space-y-1"><Label>Job area (optional)</Label><Input value={leaveForm.job_area} onChange={(e) => setLeaveForm({ ...leaveForm, job_area: e.target.value })} placeholder="e.g. Investment Banking" /></div>
              <div className="space-y-1"><Label>City (optional)</Label><Input value={leaveForm.city} onChange={(e) => setLeaveForm({ ...leaveForm, city: e.target.value })} placeholder="e.g. Milan, Italy" /></div>
            </div>

            {advisorFlow ? (
              <>
                <Button className="w-full" disabled={leaving} onClick={() => doLeave(true)}>
                  {leaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Register as alumnus and appoint advisor'}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Advisors keep consulting access to the workspace. They start hidden from the public website;
                  the "Show on public Members page" switch in their profile controls their visibility. The company
                  can be left empty and added later from the Alumni page.
                </p>
              </>
            ) : (
              <>
                <Button className="w-full" disabled={leaving} onClick={() => doLeave(false)}>
                  {leaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Move to alumni'}
                </Button>

                {targetIsBoard && (
                  <div className="border border-separator p-3 space-y-2">
                    <Button variant="outline" className="w-full" disabled={leaving} onClick={() => doLeave(true)}>Move to alumni and appoint as advisor</Button>
                    <p className="text-xs text-muted-foreground">
                      The advisor keeps consulting access to the workspace and starts hidden from the public
                      website; the visibility switch in their profile can show them later. For an advisor the
                      company can be left empty and added later.
                    </p>
                  </div>
                )}

                <button type="button" className="text-xs text-muted-foreground underline w-full text-center" disabled={leaving} onClick={doJustRemove}>
                  Remove without adding to alumni
                </button>
              </>
            )}
          </div>
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
            <AlertDialogAction onClick={() => doSave()} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Expel member'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
