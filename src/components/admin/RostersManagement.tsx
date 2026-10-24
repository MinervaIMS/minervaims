import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileText, Pencil, Plus, Search, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { friendlyError } from '@/lib/errors';
import { downloadCSV } from '@/lib/download-utils';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import {
  ROSTER_DIVISIONS, isOfficer, rosterDivisionLabel, rosterTeamLabel, rosterTeamsFor,
} from '@/lib/rosters';
import {
  addRosterEntry, deleteRosterEntry, downloadRosterPdf, fetchRosterIndex, fetchRosterPerson, fetchRosterSemester,
  searchPeople, setPublicHidden, updateRosterEntry,
  type RosterIndex, type RosterPerson, type RosterRow, type RosterSemester,
} from '@/lib/rosters-api';

// =====================================================================
// People > Rosters (Step 94): who held which role, semester by semester.
// ---------------------------------------------------------------------
// One semester at a time: the Board of Directors first (officers, then
// heads), then each division by team and role. The current semester is
// the member register as it stands, the same record the public Members
// page is written from; past semesters are the association's history,
// from Fall 2019. The Board and Operations read every division, members
// from Analyst up their own (the database enforces both). The President
// and the Vice-President correct past semesters; every correction, and
// every PDF, is recorded in the activity log.
// =====================================================================

const STATUS_LABEL: Record<string, string> = { on_exchange: 'On exchange', one_semester_pause: 'Semester pause' };

interface EditState {
  mode: 'edit' | 'add';
  row?: RosterRow;
  role: string;
  division: string;
  team: string;
  personId: string | null;
  first: string;
  surname: string;
}

export default function RostersManagement() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [index, setIndex] = useState<RosterIndex | null>(null);
  const [semesterKey, setSemesterKey] = useState<string>('');
  const [semester, setSemester] = useState<RosterSemester | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<string | null>(null);
  const [division, setDivision] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [pdfBusy, setPdfBusy] = useState(false);
  const [person, setPerson] = useState<RosterPerson | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<RosterRow | null>(null);
  const [found, setFound] = useState<{ id: string; first_name: string; surname: string }[]>([]);

  useEffect(() => {
    fetchRosterIndex()
      .then((ix) => { setIndex(ix); setSemesterKey(ix.current); })
      .catch((e) => { setFailed(friendlyError(e)); setLoading(false); });
  }, []);

  const loadSemester = useCallback((key: string) => {
    setLoading(true);
    return fetchRosterSemester(key)
      .then((s) => { setSemester(s); setFailed(null); })
      .catch((e) => setFailed(friendlyError(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (semesterKey) void loadSemester(semesterKey); }, [semesterKey, loadSemester]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (semester?.rows ?? []).filter((r) =>
      (division === 'all' || r.division === division || (division === 'board' && r.office_rank !== null))
      && (!q || `${r.first_name} ${r.surname} ${r.role}`.toLowerCase().includes(q)));
  }, [semester, division, query]);

  const board = useMemo(() => rows.filter((r) => r.office_rank !== null).sort((a, b) => a.office_rank! - b.office_rank!), [rows]);
  const groups = useMemo(() => ROSTER_DIVISIONS
    .filter((d) => d.key !== 'board')
    .map((d) => ({
      ...d,
      rows: rows.filter((r) => r.division === d.key).sort((a, b) =>
        ((a.office_rank ?? 99) - (b.office_rank ?? 99)) || a.role.localeCompare(b.role)
        || (a.team ?? '').localeCompare(b.team ?? '') || a.surname.localeCompare(b.surname)),
    }))
    .filter((g) => g.rows.length > 0), [rows]);

  const divisionsPresent = useMemo(() => {
    const keys = new Set((semester?.rows ?? []).map((r) => r.division));
    return ROSTER_DIVISIONS.filter((d) => keys.has(d.key) || (d.key === 'board' && (semester?.rows ?? []).some((r) => r.office_rank !== null)));
  }, [semester]);

  const canEdit = !!semester?.can_edit;
  const showCodes = !!semester?.show_codes;
  const fullScope = semester?.scope === 'all';

  const exportCsv = () => {
    if (!semester) return;
    downloadCSV(
      rows.map((r) => ({
        semester: semester.label, first_name: r.first_name, surname: r.surname, role: r.role,
        division: rosterDivisionLabel(r.division), team: rosterTeamLabel(r.team) ?? '',
        board: r.office_rank === null ? '' : isOfficer(r.role) ? 'Officer' : 'Head',
      })),
      [
        { key: 'semester', header: 'Semester' }, { key: 'first_name', header: 'First name' },
        { key: 'surname', header: 'Surname' }, { key: 'role', header: 'Role' },
        { key: 'division', header: 'Division' }, { key: 'team', header: 'Team' },
        { key: 'board', header: 'Board of Directors' },
      ],
      `MIMS Roster ${semester.label}.csv`,
    );
  };

  const exportPdf = async () => {
    if (!semester) return;
    setPdfBusy(true);
    try {
      await downloadRosterPdf(session, semester.key);
    } catch (e) {
      toast({ title: 'The PDF could not be prepared', description: friendlyError(e), variant: 'destructive' });
    } finally {
      setPdfBusy(false);
    }
  };

  const openPerson = async (r: RosterRow) => {
    if (!r.person_id) return;
    try {
      setPerson(await fetchRosterPerson(r.person_id));
    } catch (e) {
      toast({ title: 'This history could not be opened', description: friendlyError(e), variant: 'destructive' });
    }
  };

  const startEdit = (r: RosterRow) => setEdit({ mode: 'edit', row: r, role: r.role, division: r.division, team: r.team ?? '', personId: r.person_id, first: '', surname: '' });
  const startAdd = () => { setFound([]); setEdit({ mode: 'add', role: '', division: division === 'all' || division === 'board' ? 'equity' : division, team: '', personId: null, first: '', surname: '' }); };

  const save = async () => {
    if (!edit || !semester) return;
    setSaving(true);
    const input = { role: edit.role.trim(), division: edit.division, team: edit.team || null };
    try {
      if (edit.mode === 'edit' && edit.row?.entry_id) {
        await updateRosterEntry(session, edit.row.entry_id, input);
      } else {
        await addRosterEntry(session, semester.key,
          edit.personId ? { person_id: edit.personId } : { first_name: edit.first.trim(), surname: edit.surname.trim() }, input);
      }
      toast({ title: edit.mode === 'edit' ? 'Roster corrected' : 'Added to the roster' });
      setEdit(null);
      await loadSemester(semester.key);
    } catch (e) {
      toast({ title: 'Not saved', description: friendlyError(e), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!removing?.entry_id || !semester) return;
    try {
      await deleteRosterEntry(session, removing.entry_id);
      toast({ title: 'Removed from the roster' });
      await loadSemester(semester.key);
    } catch (e) {
      toast({ title: 'Not removed', description: friendlyError(e), variant: 'destructive' });
    } finally {
      setRemoving(null);
    }
  };

  const togglePublic = async (hidden: boolean) => {
    if (!person) return;
    try {
      await setPublicHidden(session, person.person_id, hidden);
      setPerson({ ...person, public_hidden: hidden });
      toast({ title: hidden ? 'Left out of the public past Boards' : 'Shown in the public past Boards again' });
    } catch (e) {
      toast({ title: 'Not changed', description: friendlyError(e), variant: 'destructive' });
    }
  };

  useEffect(() => {
    if (!edit || edit.mode !== 'add' || edit.personId) return;
    const q = `${edit.first} ${edit.surname}`.trim();
    if (q.length < 2) { setFound([]); return; }
    const timer = window.setTimeout(() => {
      searchPeople(session, edit.surname.trim() || edit.first.trim()).then(setFound).catch(() => setFound([]));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [edit, session]);

  const nameCell = (r: RosterRow) => (
    fullScope && r.person_id
      ? <button type="button" className="text-left text-accent underline-offset-2 hover:underline" onClick={() => openPerson(r)}>{r.first_name} {r.surname}</button>
      : <span>{r.first_name} {r.surname}</span>
  );

  const rowActions = (r: RosterRow) => canEdit && r.entry_id ? (
    <div className="flex justify-end gap-2">
      <Button variant="outline" size="icon" className="h-8 w-8" title="Correct" onClick={() => startEdit(r)}><Pencil className="h-4 w-4" /></Button>
      <Button variant="outline" size="icon" className="h-8 w-8" title="Remove" onClick={() => setRemoving(r)}><Trash2 className="h-4 w-4" /></Button>
    </div>
  ) : null;

  const table = (list: RosterRow[], withTeam: boolean) => (
    <>
      <div className="md:hidden divide-y divide-separator border border-separator">
        {list.map((r, i) => (
          <div key={`${r.entry_id ?? r.person_id ?? i}-${r.role}`} className="px-4 py-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-body text-body">{nameCell(r)}</div>
              <div className="font-body text-small text-muted-foreground">
                {r.role}{withTeam && r.team ? ` · ${rosterTeamLabel(r.team)}` : ''}
                {r.status && STATUS_LABEL[r.status] ? ` · ${STATUS_LABEL[r.status]}` : ''}
              </div>
              {showCodes && r.code && <div className="font-mono text-xs text-muted-foreground/80 mt-0.5">{r.code}</div>}
            </div>
            {rowActions(r)}
          </div>
        ))}
      </div>
      <div className="hidden md:block border border-separator">
        <table className="w-full font-body text-small">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-normal">Name</th>
              <th className="px-3 py-2 font-normal">Role</th>
              {withTeam && <th className="px-3 py-2 font-normal">Team</th>}
              {showCodes && <th className="px-3 py-2 font-normal">Code</th>}
              {canEdit && <th className="px-3 py-2 font-normal text-right">Corrections</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-separator">
            {list.map((r, i) => (
              <tr key={`${r.entry_id ?? r.person_id ?? i}-${r.role}`}>
                <td className="px-3 py-2">{nameCell(r)}</td>
                <td className="px-3 py-2">
                  {r.role}
                  {r.status && STATUS_LABEL[r.status] && <Badge variant="outline" className="ml-2 font-normal">{STATUS_LABEL[r.status]}</Badge>}
                </td>
                {withTeam && <td className="px-3 py-2 text-muted-foreground">{rosterTeamLabel(r.team) ?? ''}</td>}
                {showCodes && <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{r.code ?? ''}</td>}
                {canEdit && <td className="px-3 py-2">{rowActions(r)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );

  const scopeNote = semester && semester.scope === 'division'
    ? `You see the rosters of ${semester.divisions.map(rosterDivisionLabel).join(' and ')}.`
    : null;

  return (
    <div id="rosters-section">
      <WorkspacePageHeader
        title="Rosters"
        description="Who held which role, semester by semester, from Fall 2019."
        actions={<>
          <Button variant="outline" className="font-body" disabled={!semester || rows.length === 0} onClick={exportCsv}>
            <Download className="h-4 w-4 mr-2" />CSV
          </Button>
          <Button variant="outline" className="font-body" disabled={!semester || pdfBusy} onClick={exportPdf}>
            {pdfBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}PDF
          </Button>
          {canEdit && (
            <Button className="font-body" onClick={startAdd}><Plus className="h-4 w-4 mr-2" />Add a person</Button>
          )}
        </>}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-[minmax(0,14rem)_minmax(0,16rem)_minmax(0,1fr)]">
        <Select value={semesterKey} onValueChange={(v) => { setSemesterKey(v); setDivision('all'); }} disabled={!index}>
          <SelectTrigger className="font-body" aria-label="Semester"><SelectValue placeholder="Semester" /></SelectTrigger>
          <SelectContent>
            {(index?.semesters ?? []).map((s) => (
              <SelectItem key={s.key} value={s.key}>{s.label}{s.live ? ' (current)' : ''} · {s.count}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={division} onValueChange={setDivision}>
          <SelectTrigger className="font-body" aria-label="Division"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{fullScope ? 'Every division' : 'My division'}</SelectItem>
            {divisionsPresent.map((d) => <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-10 font-body" placeholder="Search by name or role" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      {semester && (
        <p className="font-body text-small text-muted-foreground mb-6 border-l-2 border-accent pl-3">
          {semester.live
            ? `${semester.label} is read live from People, Members, the same record the public Members page is written from. It is fixed in the history on the semester's last day.`
            : `${semester.label}: the association's record of that semester.`}
          {scopeNote ? ` ${scopeNote}` : ''}
          {canEdit && !semester.live ? ' Corrections are recorded in the activity log.' : ''}
        </p>
      )}

      {failed ? (
        <Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">{failed}</p></CardContent></Card>
      ) : loading || !semester ? (
        <WorkspaceLoader />
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">Nobody matches in {semester.label}.</p></CardContent></Card>
      ) : (
        <div className="space-y-10">
          {board.length > 0 && (division === 'all' || division === 'board') && (
            <section>
              <h3 className="font-serif text-subheading text-accent mb-3">Board of Directors</h3>
              {board.some((r) => isOfficer(r.role)) && (
                <><p className="font-body text-xs uppercase tracking-wider text-muted-foreground mb-2">Officers</p>
                  {table(board.filter((r) => isOfficer(r.role)), false)}</>
              )}
              {board.some((r) => !isOfficer(r.role)) && (
                <><p className="font-body text-xs uppercase tracking-wider text-muted-foreground mt-5 mb-2">Heads</p>
                  {table(board.filter((r) => !isOfficer(r.role)), false)}</>
              )}
            </section>
          )}
          {division !== 'board' && groups.map((g) => (
            <section key={g.key}>
              <h3 className="font-serif text-subheading text-accent mb-3">
                {g.label} <span className="font-body text-small text-muted-foreground">({g.rows.length})</span>
              </h3>
              {table(g.rows, g.rows.some((r) => r.team))}
            </section>
          ))}
        </div>
      )}

      {/* One person's path through the Society. */}
      <Dialog open={!!person} onOpenChange={(o) => { if (!o) setPerson(null); }}>
        <DialogContent className="max-w-lg">
          {person && (
            <>
              <DialogHeader>
                <DialogTitle className="font-serif">{person.first_name} {person.surname}</DialogTitle>
                <DialogDescription className="font-body">
                  {[person.is_member ? 'Member register' : null, person.is_alumnus ? 'Alumni directory' : null].filter(Boolean).join(' · ') || 'History only'}
                  {person.code ? ` · ${person.code}` : ''}
                </DialogDescription>
              </DialogHeader>
              <ol className="font-body text-small divide-y divide-separator border border-separator max-h-[50vh] overflow-y-auto">
                {[...person.entries, ...(person.current ? [person.current] : [])].map((e, i) => (
                  <li key={`${e.semester}-${e.role}-${i}`} className="px-3 py-2 flex justify-between gap-3">
                    <span className="text-muted-foreground shrink-0">{e.label}{e.source === 'live' ? ' (current)' : ''}</span>
                    <span className="text-right">{e.role}{e.team ? ` · ${rosterTeamLabel(e.team)}` : ''}</span>
                  </li>
                ))}
              </ol>
              {person.can_edit && (
                <div className="flex items-start justify-between gap-4 pt-2">
                  <Label htmlFor="public-hidden" className="font-body text-small leading-snug">
                    Leave out of the public past Boards
                    <span className="block text-xs text-muted-foreground">For a former Board member who asked not to be listed (Privacy Policy, section 9).</span>
                  </Label>
                  <Switch id="public-hidden" checked={person.public_hidden} onCheckedChange={togglePublic} />
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Correct an entry, or add a person to a past semester. */}
      <Dialog open={!!edit} onOpenChange={(o) => { if (!o) setEdit(null); }}>
        <DialogContent className="max-w-md">
          {edit && semester && (
            <>
              <DialogHeader>
                <DialogTitle className="font-serif">{edit.mode === 'edit' ? 'Correct the roster' : `Add a person to ${semester.label}`}</DialogTitle>
                <DialogDescription className="font-body">
                  {edit.mode === 'edit' && edit.row ? `${edit.row.first_name} ${edit.row.surname}, ${semester.label}` : 'Choose someone already in the history, or enter a new name.'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 font-body">
                {edit.mode === 'add' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="add-first">First name</Label>
                      <Input id="add-first" value={edit.first} disabled={!!edit.personId} onChange={(e) => setEdit({ ...edit, first: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="add-surname">Surname</Label>
                      <Input id="add-surname" value={edit.surname} disabled={!!edit.personId} onChange={(e) => setEdit({ ...edit, surname: e.target.value })} />
                    </div>
                    {!edit.personId && found.length > 0 && (
                      <div className="col-span-2 border border-separator divide-y divide-separator text-small">
                        {found.map((p) => (
                          <button key={p.id} type="button" className="block w-full text-left px-3 py-1.5 hover:bg-muted"
                            onClick={() => setEdit({ ...edit, personId: p.id, first: p.first_name, surname: p.surname })}>
                            {p.first_name} {p.surname}
                          </button>
                        ))}
                      </div>
                    )}
                    {edit.personId && (
                      <button type="button" className="col-span-2 text-left text-small text-accent underline"
                        onClick={() => setEdit({ ...edit, personId: null })}>
                        Someone else
                      </button>
                    )}
                  </div>
                )}
                <div>
                  <Label htmlFor="roster-role">Role, as the Society wrote it that semester</Label>
                  <Input id="roster-role" value={edit.role} maxLength={120} onChange={(e) => setEdit({ ...edit, role: e.target.value })} placeholder="e.g. Equity Research Analyst" />
                </div>
                <div>
                  <Label>Division</Label>
                  <Select value={edit.division} onValueChange={(v) => setEdit({ ...edit, division: v, team: '' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROSTER_DIVISIONS.map((d) => <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {rosterTeamsFor(edit.division).length > 0 && (
                  <div>
                    <Label>Team</Label>
                    <Select value={edit.team || 'none'} onValueChange={(v) => setEdit({ ...edit, team: v === 'none' ? '' : v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No team</SelectItem>
                        {rosterTeamsFor(edit.division).map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button>
                  <Button disabled={saving || !edit.role.trim() || (edit.mode === 'add' && !edit.personId && (!edit.first.trim() || !edit.surname.trim()))} onClick={save}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removing} onOpenChange={(o) => { if (!o) setRemoving(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from {semester?.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              {removing ? `${removing.first_name} ${removing.surname} will no longer appear as ${removing.role} in ${semester?.label}. Their other semesters stay as they are.` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
