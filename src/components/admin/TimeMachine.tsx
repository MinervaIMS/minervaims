import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronRight, Download, FileText, Pencil, Plus, Search, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { friendlyError } from '@/lib/errors';
import { downloadCSV } from '@/lib/download-utils';
import { workspacePath } from '@/lib/workspace-nav';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { HelpDot } from '@/components/admin/help/HelpSystem';
import { PersonRecordDialog, type PersonRecordTarget } from '@/components/admin/PersonRecord';
import {
  ROSTER_DIVISIONS, isOfficer, rosterDivisionLabel, rosterTeamLabel, rosterTeamsFor,
} from '@/lib/rosters';
import {
  addRosterEntry, deleteRosterEntry, downloadRosterPdf, fetchTimeMachine, searchPeople, updateRosterEntry,
  type RosterRow, type TimeMachine as TimeMachineData, type TimeMachineSemester,
} from '@/lib/rosters-api';

// =====================================================================
// People > Time Machine (Step 94B): who was in the Society, semester by
// semester, from Fall 2019, newest first.
// ---------------------------------------------------------------------
// Each past semester opens on its Board of Directors (officers, then
// heads) and then each division by team and role. It holds the roster
// history and the official register the fee collection froze (until now
// shown in People, Members): a person in either is listed, and the
// register can be shown alone. The current semester is People, Members.
//
// The Board and Operations read every division, members from Analyst up
// their own (the database enforces both). A name opens the person's
// record: career in Minerva, reports, alumni entry. The President and the
// Vice-President correct a past semester; every correction, and every
// PDF, is recorded in the activity log.
// =====================================================================

interface EditState {
  mode: 'edit' | 'add';
  semester: TimeMachineSemester;
  row?: RosterRow;
  role: string;
  division: string;
  team: string;
  personId: string | null;
  first: string;
  surname: string;
}

const frozenOn = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Rome' });
};

export default function TimeMachine() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<TimeMachineData | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [division, setDivision] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [registerOnly, setRegisterOnly] = useState<Set<string>>(new Set());
  const [pdfBusy, setPdfBusy] = useState<string | null>(null);
  const [person, setPerson] = useState<PersonRecordTarget | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<{ semester: TimeMachineSemester; row: RosterRow } | null>(null);
  const [found, setFound] = useState<{ id: string; first_name: string; surname: string }[]>([]);

  const load = useCallback(() => fetchTimeMachine()
    .then((d) => {
      setData(d);
      setFailed(null);
      // The most recent past semester opens by itself.
      setOpen((prev) => (prev.size || !d.semesters[0] ? prev : new Set([d.semesters[0].key])));
    })
    .catch((e) => setFailed(friendlyError(e))), []);

  useEffect(() => { void load(); }, [load]);

  const q = query.trim().toLowerCase();
  const visible = useMemo(() => (data?.semesters ?? []).map((s) => ({
    ...s,
    shown: s.rows.filter((r) =>
      (division === 'all' || r.division === division || (division === 'board' && r.office_rank !== null))
      && (!registerOnly.has(s.key) || r.in_register)
      && (!q || `${r.first_name} ${r.surname} ${r.role}`.toLowerCase().includes(q))),
  })).filter((s) => !q || s.shown.length > 0), [data, division, registerOnly, q]);

  const divisionsPresent = useMemo(() => {
    const keys = new Set((data?.semesters ?? []).flatMap((s) => s.rows.map((r) => r.division)));
    return ROSTER_DIVISIONS.filter((d) => keys.has(d.key));
  }, [data]);

  const canEdit = !!data?.can_edit;
  const showCodes = !!data?.show_codes;
  const fullScope = data?.scope === 'all';
  const isOpen = (key: string) => !!q || open.has(key);
  const toggle = (key: string) => setOpen((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const exportCsv = () => {
    const rows = visible.flatMap((s) => s.shown.map((r) => ({
      semester: s.label, first_name: r.first_name, surname: r.surname, role: r.role,
      division: rosterDivisionLabel(r.division), team: rosterTeamLabel(r.team) ?? '',
      board: r.office_rank === null ? '' : isOfficer(r.role) ? 'Officer' : 'Head',
      ...(fullScope ? { register: r.in_register ? 'Yes' : '' } : {}),
    })));
    downloadCSV(rows, [
      { key: 'semester', header: 'Semester' }, { key: 'first_name', header: 'First name' },
      { key: 'surname', header: 'Surname' }, { key: 'role', header: 'Role' },
      { key: 'division', header: 'Division' }, { key: 'team', header: 'Team' },
      { key: 'board', header: 'Board of Directors' },
      ...(fullScope ? [{ key: 'register' as const, header: 'In the official register' }] : []),
    ], 'MIMS Time Machine.csv');
  };

  const exportPdf = async (s: TimeMachineSemester) => {
    setPdfBusy(s.key);
    try {
      await downloadRosterPdf(session, s.key);
    } catch (e) {
      toast({ title: 'The PDF could not be prepared', description: friendlyError(e), variant: 'destructive' });
    } finally {
      setPdfBusy(null);
    }
  };

  const startEdit = (semester: TimeMachineSemester, r: RosterRow) =>
    setEdit({ mode: 'edit', semester, row: r, role: r.role, division: r.division, team: r.team ?? '', personId: r.person_id, first: '', surname: '' });
  const startAdd = (semester: TimeMachineSemester) => {
    setFound([]);
    setEdit({ mode: 'add', semester, role: '', division: division === 'all' || division === 'board' ? 'equity' : division, team: '', personId: null, first: '', surname: '' });
  };

  const save = async () => {
    if (!edit) return;
    setSaving(true);
    const input = { role: edit.role.trim(), division: edit.division, team: edit.team || null };
    try {
      if (edit.mode === 'edit' && edit.row) {
        await updateRosterEntry(session, edit.row.entry_id, input);
      } else {
        await addRosterEntry(session, edit.semester.key,
          edit.personId ? { person_id: edit.personId } : { first_name: edit.first.trim(), surname: edit.surname.trim() }, input);
      }
      toast({ title: edit.mode === 'edit' ? 'Semester corrected' : `Added to ${edit.semester.label}` });
      setEdit(null);
      await load();
    } catch (e) {
      toast({ title: 'Not saved', description: friendlyError(e), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!removing) return;
    try {
      await deleteRosterEntry(session, removing.row.entry_id);
      toast({ title: `Removed from ${removing.semester.label}` });
      await load();
    } catch (e) {
      toast({ title: 'Not removed', description: friendlyError(e), variant: 'destructive' });
    } finally {
      setRemoving(null);
    }
  };

  useEffect(() => {
    if (!edit || edit.mode !== 'add' || edit.personId) return;
    const name = `${edit.first} ${edit.surname}`.trim();
    if (name.length < 2) { setFound([]); return; }
    const timer = window.setTimeout(() => {
      searchPeople(session, edit.surname.trim() || edit.first.trim()).then(setFound).catch(() => setFound([]));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [edit, session]);

  const nameCell = (r: RosterRow) => (
    fullScope && r.person_id
      // `data-ro`: opening a record is a read, for every reader of this page.
      ? <button type="button" data-ro className="text-left text-accent underline-offset-2 hover:underline" onClick={() => setPerson({ kind: 'person', id: r.person_id!, name: `${r.first_name} ${r.surname}` })}>{r.first_name} {r.surname}</button>
      : <span>{r.first_name} {r.surname}</span>
  );

  const rowActions = (s: TimeMachineSemester, r: RosterRow) => canEdit ? (
    <div className="flex justify-end gap-2">
      <Button variant="outline" size="icon" className="h-8 w-8" title="Correct" onClick={() => startEdit(s, r)}><Pencil className="h-4 w-4" /></Button>
      <Button variant="outline" size="icon" className="h-8 w-8" title="Remove" onClick={() => setRemoving({ semester: s, row: r })}><Trash2 className="h-4 w-4" /></Button>
    </div>
  ) : null;

  const registerMark = (s: TimeMachineSemester, r: RosterRow) => (s.register && !r.in_register
    ? <span className="ml-2 text-xs text-muted-foreground" title="Not in the official register frozen with the fee collection">not in the register</span>
    : null);

  const table = (s: TimeMachineSemester, list: RosterRow[], withTeam: boolean) => (
    <>
      <div className="md:hidden divide-y divide-separator border border-separator">
        {list.map((r) => (
          <div key={r.entry_id} className="px-4 py-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-body text-body">{nameCell(r)}</div>
              <div className="font-body text-small text-muted-foreground">
                {r.role}{withTeam && r.team ? ` · ${rosterTeamLabel(r.team)}` : ''}{registerMark(s, r)}
              </div>
              {showCodes && r.code && <div className="font-mono text-xs text-muted-foreground/80 mt-0.5">{r.code}</div>}
            </div>
            {rowActions(s, r)}
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
            {list.map((r) => (
              <tr key={r.entry_id}>
                <td className="px-3 py-2">{nameCell(r)}</td>
                <td className="px-3 py-2">{r.role}{registerMark(s, r)}</td>
                {withTeam && <td className="px-3 py-2 text-muted-foreground">{rosterTeamLabel(r.team) ?? ''}</td>}
                {showCodes && <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{r.code ?? ''}</td>}
                {canEdit && <td className="px-3 py-2">{rowActions(s, r)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );

  const semesterBody = (s: TimeMachineSemester & { shown: RosterRow[] }) => {
    const board = s.shown.filter((r) => r.office_rank !== null).sort((a, b) => a.office_rank! - b.office_rank!);
    const groups = ROSTER_DIVISIONS
      .filter((d) => d.key !== 'board')
      .map((d) => ({
        ...d,
        rows: s.shown.filter((r) => r.division === d.key).sort((a, b) =>
          ((a.office_rank ?? 99) - (b.office_rank ?? 99)) || a.role.localeCompare(b.role)
          || (a.team ?? '').localeCompare(b.team ?? '') || a.surname.localeCompare(b.surname)),
      }))
      .filter((g) => g.rows.length > 0);
    return (
      <div className="border-t border-separator px-4 py-5 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {s.register ? (
            <div className="flex items-center gap-3">
              {/* `data-ro`: a filter on what is shown, which writes nothing. */}
              <Switch data-ro id={`register-${s.key}`} checked={registerOnly.has(s.key)}
                onCheckedChange={(v) => setRegisterOnly((prev) => { const n = new Set(prev); if (v) n.add(s.key); else n.delete(s.key); return n; })} />
              <Label htmlFor={`register-${s.key}`} className="font-body text-small">Only the official register</Label>
            </div>
          ) : <span />}
          <div className="flex flex-wrap gap-2">
            <Button data-ro variant="outline" size="sm" className="font-body" disabled={pdfBusy === s.key} onClick={() => exportPdf(s)}>
              {pdfBusy === s.key ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}PDF
            </Button>
            {canEdit && (
              <Button variant="outline" size="sm" className="font-body" onClick={() => startAdd(s)}><Plus className="h-4 w-4 mr-2" />Add a person</Button>
            )}
          </div>
        </div>
        {s.shown.length === 0 ? (
          <p className="font-body text-small text-muted-foreground">Nobody matches in {s.label}.</p>
        ) : (
          <>
            {board.length > 0 && (division === 'all' || division === 'board') && (
              <section>
                <h4 className="font-serif text-subheading text-accent mb-3">Board of Directors</h4>
                {board.some((r) => isOfficer(r.role)) && (
                  <><p className="font-body text-xs uppercase tracking-wider text-muted-foreground mb-2">Officers</p>
                    {table(s, board.filter((r) => isOfficer(r.role)), false)}</>
                )}
                {board.some((r) => !isOfficer(r.role)) && (
                  <><p className="font-body text-xs uppercase tracking-wider text-muted-foreground mt-5 mb-2">Heads</p>
                    {table(s, board.filter((r) => !isOfficer(r.role)), false)}</>
                )}
              </section>
            )}
            {division !== 'board' && groups.map((g) => (
              <section key={g.key}>
                <h4 className="font-serif text-subheading text-accent mb-3">
                  {g.label} <span className="font-body text-small text-muted-foreground">({g.rows.length})</span>
                </h4>
                {table(s, g.rows, g.rows.some((r) => r.team))}
              </section>
            ))}
          </>
        )}
      </div>
    );
  };

  const president = (s: TimeMachineSemester) => s.rows.find((r) => r.role === 'President');

  return (
    <div id="time-machine-section">
      <WorkspacePageHeader
        title="Time Machine"
        description="Who was in the Society, semester by semester, from Fall 2019: the Board of Directors first, then each division by team and role."
        actions={
          <Button variant="outline" className="font-body" disabled={!data || visible.every((s) => s.shown.length === 0)} onClick={exportCsv}>
            <Download className="h-4 w-4 mr-2" />CSV
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
        <Select value={division} onValueChange={setDivision}>
          <SelectTrigger className="font-body" aria-label="Division"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{fullScope ? 'Every division' : 'My division'}</SelectItem>
            {divisionsPresent.map((d) => <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-10 font-body" placeholder="Find a person or a role in every semester" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      {data && (
        <p className="font-body text-small text-muted-foreground mb-6 border-l-2 border-accent pl-3">
          {data.current_label}, the current semester, is in{' '}
          <Link to={workspacePath('people', 'people-members')} className="text-accent underline-offset-2 hover:underline">People, Members</Link>.
          {data.scope === 'division' ? ` You see the semesters of ${data.divisions.map(rosterDivisionLabel).join(' and ')}.` : ''}
          {fullScope ? ' Press a name to open the person\'s record.' : ''}
          {canEdit ? ' Corrections are recorded in the activity log.' : ''}
          <HelpDot page="people-rosters" className="ml-2 align-middle" />
        </p>
      )}

      {failed ? (
        <Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">{failed}</p></CardContent></Card>
      ) : !data ? (
        <WorkspaceLoader />
      ) : visible.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">{q ? 'Nobody matches in any semester.' : 'No past semester is recorded yet.'}</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {visible.map((s) => {
            const head = president(s);
            const expanded = isOpen(s.key);
            return (
              <div key={s.key} className="border border-separator">
                <button type="button" aria-expanded={expanded} onClick={() => toggle(s.key)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40">
                  <span className="min-w-0">
                    <span className="font-serif text-lg text-foreground">{s.label}</span>
                    <span className="block font-body text-xs text-muted-foreground">
                      {q ? `${s.shown.length} of ${s.count} people` : `${s.count} people`}
                      {head ? ` · President: ${head.first_name} ${head.surname}` : ''}
                      {s.register ? ` · Official register: ${s.register.count}, frozen on ${frozenOn(s.register.frozen_at)}` : ''}
                    </span>
                  </span>
                  {expanded ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                </button>
                {expanded && semesterBody(s)}
              </div>
            );
          })}
        </div>
      )}

      <PersonRecordDialog target={person} onClose={() => { setPerson(null); }} />

      {/* Correct an entry, or add a person to a past semester. */}
      <Dialog open={!!edit} onOpenChange={(o) => { if (!o) setEdit(null); }}>
        <DialogContent className="max-w-md">
          {edit && (
            <>
              <DialogHeader>
                <DialogTitle className="font-serif">{edit.mode === 'edit' ? `Correct ${edit.semester.label}` : `Add a person to ${edit.semester.label}`}</DialogTitle>
                <DialogDescription className="font-body">
                  {edit.mode === 'edit' && edit.row ? `${edit.row.first_name} ${edit.row.surname}` : 'Choose someone already in the history, or enter a new name.'}
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
            <AlertDialogTitle>Remove from {removing?.semester.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              {removing ? `${removing.row.first_name} ${removing.row.surname} will no longer appear as ${removing.row.role} in ${removing.semester.label}. Their other semesters stay as they are.` : ''}
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
