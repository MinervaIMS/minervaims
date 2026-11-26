import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowRight, Download, FileText, Pencil, Plus, Search, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { friendlyError } from '@/lib/errors';
import { downloadCSV } from '@/lib/download-utils';
import { workspacePath } from '@/lib/workspace-nav';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { HelpDot } from '@/components/admin/help/HelpSystem';
import { PersonRecordDialog, type PersonRecordTarget } from '@/components/admin/PersonRecord';
import { MoreMenu } from '@/components/admin/kit/MoreMenu';
import { PeopleMatches } from '@/components/admin/PeopleMatches';
import { TimeMachineConsole, TimeWarp, useWarpEngine, type Phase, type TravelRequest } from '@/components/admin/TimeMachineConsole';
import { normalizeLinkedInProfile } from '@/lib/linkedin';
// The workspace's LinkedIn mark: the square with rounded corners, drawn in
// negative on the machine's dark ground.
import linkedinIcon from '@/assets/linkedin-icon.png';
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
//
// STEP 110: THE WHOLE PAGE IS THE MACHINE. It is drawn in the design
// system's dark theme (the `.dark` tokens, with the Society's purple as
// the accent) from edge to edge of the page, with the console at the top
// (TimeMachineConsole) and, below it, the departures board (every past
// semester, a trip away) or the semester the machine has landed on.
// Searching shows every match in every semester, each a trip away. In a
// semester, every table has the same columns at the same widths, so the
// names, roles and codes of the officers, the heads and each division
// line up; each person's LinkedIn profile, where the records hold one,
// is the workspace's square mark. The CSV is a secondary download.
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
  const [registerOnly, setRegisterOnly] = useState<Set<string>>(new Set());
  const [pdfBusy, setPdfBusy] = useState<string | null>(null);
  const [person, setPerson] = useState<PersonRecordTarget | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<{ semester: TimeMachineSemester; row: RosterRow } | null>(null);
  const [found, setFound] = useState<{ id: string; first_name: string; surname: string }[]>([]);
  // The machine (Step 110): where the trip is, the semester it has landed
  // on (null: the departures board), and a trip asked for from the list.
  const stageRef = useRef<HTMLDivElement>(null);
  const engine = useWarpEngine();
  const [phase, setPhase] = useState<Phase>('idle');
  const [landed, setLanded] = useState<string | null>(null);
  const [request, setRequest] = useState<TravelRequest | null>(null);
  const travelTo = (key: string) => { setQuery(''); setRequest({ key, n: Date.now() }); };
  const arriveAt = useCallback((key: string) => {
    setQuery('');
    setRegisterOnly((prev) => { if (!prev.has(key)) return prev; const next = new Set(prev); next.delete(key); return next; });
    setLanded(key);
  }, []);
  // After a trip, the semester is brought into view when it landed below
  // the fold (on a phone the console fills the screen).
  useEffect(() => {
    if (!landed || phase !== 'arrived') return;
    const t = window.setTimeout(() => {
      const el = document.querySelector<HTMLElement>('.tm-landing');
      const pane = el?.closest<HTMLElement>('[data-ws-pane]');
      if (!el || !pane) return;
      if (el.getBoundingClientRect().top > pane.getBoundingClientRect().bottom - 160) {
        el.scrollIntoView({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      }
    }, 120);
    return () => window.clearTimeout(t);
  }, [landed, phase]);

  const load = useCallback(() => fetchTimeMachine()
    .then((d) => {
      setData(d);
      setFailed(null);
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
      ? <button type="button" data-ro className="text-left text-accent underline-offset-2 hover:underline max-lg:inline-flex max-lg:min-h-11 max-lg:items-center" onClick={() => setPerson({ kind: 'person', id: r.person_id!, name: `${r.first_name} ${r.surname}` })}>{r.first_name} {r.surname}</button>
      : <span>{r.first_name} {r.surname}</span>
  );

  // The person's LinkedIn profile, where the records hold one: the
  // workspace's square mark, in negative on the dark ground (Step 110).
  const linkedinCell = (r: RosterRow) => {
    const url = normalizeLinkedInProfile(r.linkedin_url).url;
    if (!url) return null;
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" data-ro className="inline-flex h-11 w-11 items-center justify-center lg:h-8 lg:w-8"
        title={`${r.first_name} ${r.surname} on LinkedIn`} aria-label={`${r.first_name} ${r.surname} on LinkedIn`}>
        <img src={linkedinIcon} alt="" width={18} height={18} className="h-[1.1rem] w-[1.1rem] object-contain invert opacity-90" />
      </a>
    );
  };

  // Correct on the row; Remove, rare and asked first, under More (Step 98).
  const rowActions = (s: TimeMachineSemester, r: RosterRow) => canEdit ? (
    <div className="flex justify-end gap-2">
      <Button variant="outline" size="icon" className="h-11 w-11 lg:h-8 lg:w-8" title="Correct" aria-label={`Correct ${r.first_name} ${r.surname} in ${s.label}`} onClick={() => startEdit(s, r)}><Pencil className="h-4 w-4" /></Button>
      <MoreMenu
        label={`More actions for ${r.first_name} ${r.surname} in ${s.label}`}
        title={`${r.first_name} ${r.surname}, ${s.label}`}
        triggerClassName="lg:h-8 lg:w-8"
        actions={[{ key: 'remove', label: `Remove from ${s.label}`, icon: Trash2, destructive: true, onSelect: () => setRemoving({ semester: s, row: r }) }]}
      />
    </div>
  ) : null;

  // An advisor is outside the membership fee, so outside the register by
  // definition: the mark would read as a fee they missed (Step 104).
  const registerMark = (s: TimeMachineSemester, r: RosterRow) => (s.register && !r.in_register && !/\badvisor\b/i.test(r.role ?? '')
    ? <span className="ml-2 text-xs text-muted-foreground" title="Not in the official register frozen with the fee collection">not in the register</span>
    : null);

  // ONE SET OF COLUMNS FOR EVERY TABLE OF A SEMESTER (Step 110). Each table
  // used to size its own columns to its own contents, so the officers'
  // roles started at one place and the heads' at another. Now every table
  // is laid out at fixed widths from the same list, which depends on the
  // semester (is there a team anywhere?) and the reader, never on the rows.
  type Columns = { team: boolean };
  const table = (s: TimeMachineSemester, list: RosterRow[], cols: Columns) => (
    <>
      <div className="md:hidden divide-y divide-separator rounded-lg border border-separator bg-background/40">
        {list.map((r) => (
          <div key={r.entry_id} className="px-4 py-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-body text-body flex items-center gap-1">{nameCell(r)}{linkedinCell(r)}</div>
              <div className="font-body text-small text-muted-foreground">
                {r.role}{r.team ? ` · ${rosterTeamLabel(r.team)}` : ''}{registerMark(s, r)}
              </div>
              {showCodes && r.code && <div className="font-mono text-xs text-muted-foreground/80 mt-0.5">{r.code}</div>}
            </div>
            {rowActions(s, r)}
          </div>
        ))}
      </div>
      <div className="hidden md:block overflow-hidden rounded-lg border border-separator bg-background/40">
        <table className="w-full table-fixed font-body text-small" data-tm-table>
          <colgroup>
            <col className="w-[28%]" />
            <col />
            {cols.team && <col className="w-[16%]" />}
            <col className="w-[5.5rem]" />
            {showCodes && <col className="w-[7.5rem]" />}
            {canEdit && <col className="w-[7.5rem]" />}
          </colgroup>
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-normal">Name</th>
              <th className="px-3 py-2 font-normal">Role</th>
              {cols.team && <th className="px-3 py-2 font-normal">Team</th>}
              <th className="px-3 py-2 font-normal text-center">LinkedIn</th>
              {showCodes && <th className="px-3 py-2 font-normal">Code</th>}
              {canEdit && <th className="px-3 py-2 font-normal text-right">Corrections</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-separator">
            {list.map((r) => (
              <tr key={r.entry_id}>
                <td className="px-3 py-2 truncate">{nameCell(r)}</td>
                <td className="px-3 py-2">{r.role}{registerMark(s, r)}</td>
                {cols.team && <td className="px-3 py-2 text-muted-foreground">{rosterTeamLabel(r.team) ?? ''}</td>}
                <td className="px-3 py-1 text-center">{linkedinCell(r)}</td>
                {showCodes && <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{r.code ?? ''}</td>}
                {canEdit && <td className="px-3 py-2">{rowActions(s, r)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );

  const groupsOf = (s: TimeMachineSemester & { shown: RosterRow[] }) => {
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
    return { board, groups };
  };

  const semesterBody = (s: TimeMachineSemester & { shown: RosterRow[] }) => {
    const { board, groups } = groupsOf(s);
    const cols: Columns = { team: s.rows.some((r) => r.team) };
    return (
      <div className="space-y-8">
        {s.shown.length === 0 ? (
          <p className="font-body text-small text-muted-foreground">Nobody matches in {s.label}.</p>
        ) : (
          <>
            {board.length > 0 && (division === 'all' || division === 'board') && (
              <section>
                <h4 className="font-serif text-subheading text-foreground mb-3">Board of Directors</h4>
                {board.some((r) => isOfficer(r.role)) && (
                  <><p className="font-body text-xs uppercase tracking-wider text-muted-foreground mb-2">Officers</p>
                    {table(s, board.filter((r) => isOfficer(r.role)), cols)}</>
                )}
                {board.some((r) => !isOfficer(r.role)) && (
                  <><p className="font-body text-xs uppercase tracking-wider text-muted-foreground mt-5 mb-2">Heads</p>
                    {table(s, board.filter((r) => !isOfficer(r.role)), cols)}</>
                )}
              </section>
            )}
            {division !== 'board' && groups.map((g) => (
              <section key={g.key}>
                <h4 className="font-serif text-subheading text-foreground mb-3">
                  {g.label} <span className="font-body text-small text-muted-foreground">({g.rows.length})</span>
                </h4>
                {table(s, g.rows, cols)}
              </section>
            ))}
          </>
        )}
      </div>
    );
  };

  const president = (s: TimeMachineSemester) => s.rows.find((r) => r.role === 'President');
  const divisionsIn = (s: TimeMachineSemester) => new Set(s.rows.map((r) => r.division).filter((d) => d && d !== 'none' && d !== 'board')).size;
  const here = landed ? visible.find((s) => s.key === landed) ?? null : null;
  const travelling = phase === 'charging' || phase === 'travelling' || phase === 'flash';

  // The semester the machine has landed on: what it was, then who.
  const arrival = (s: TimeMachineSemester & { shown: RosterRow[] }) => {
    const head = president(s);
    const divisions = divisionsIn(s);
    return (
      <div className="tm-landing space-y-6" key={s.key}>
        <div className="flex flex-col gap-4 border-b border-separator pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <button type="button" data-ro onClick={() => setLanded(null)} className="mb-2 inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground lg:min-h-0">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />Every semester
            </button>
            <p className="text-[11px] uppercase tracking-[0.24em] text-accent">Arrived</p>
            <h3 className="font-serif text-4xl leading-tight text-foreground sm:text-5xl">{s.label}</h3>
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-small text-muted-foreground">
              <span><strong className="font-medium text-foreground">{s.count}</strong> {s.count === 1 ? 'person' : 'people'}</span>
              {divisions > 0 && <span><strong className="font-medium text-foreground">{divisions}</strong> {divisions === 1 ? 'division' : 'divisions'}</span>}
              {head && <span>President: <span className="text-foreground">{head.first_name} {head.surname}</span></span>}
              {s.register && <span>Official register: <span className="text-foreground">{s.register.count}</span>, frozen on {frozenOn(s.register.frozen_at)}</span>}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {s.register && (
              <div className="mr-2 flex items-center gap-3">
                {/* `data-ro`: a filter on what is shown, which writes nothing. */}
                <Switch data-ro id={`register-${s.key}`} checked={registerOnly.has(s.key)}
                  onCheckedChange={(v) => setRegisterOnly((prev) => { const n = new Set(prev); if (v) n.add(s.key); else n.delete(s.key); return n; })} />
                <Label htmlFor={`register-${s.key}`} className="font-body text-small">Only the official register</Label>
              </div>
            )}
            <Button data-ro variant="outline" size="sm" className="font-body h-11 lg:h-9" disabled={pdfBusy === s.key} onClick={() => exportPdf(s)}>
              {pdfBusy === s.key ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}PDF
            </Button>
            {canEdit && (
              <Button variant="outline" size="sm" className="font-body h-11 lg:h-9" onClick={() => startAdd(s)}><Plus className="h-4 w-4 mr-2" />Add a person</Button>
            )}
          </div>
        </div>
        {semesterBody(s)}
      </div>
    );
  };

  // Every past semester, a trip away (and, without a trip, one press).
  const departures = (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-serif text-subheading text-foreground">Every semester</h3>
        <span className="text-xs text-muted-foreground">{visible.length} {visible.length === 1 ? 'semester' : 'semesters'}</span>
      </div>
      <ul className="divide-y divide-separator overflow-hidden rounded-lg border border-separator bg-background/40" data-ro>
        {visible.map((s) => {
          const head = president(s);
          return (
            <li key={s.key} id={`tm-${s.key}`} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
              <button type="button" onClick={() => setLanded(s.key)} className="min-w-0 flex-1 text-left">
                <span className="font-serif text-lg text-foreground">{s.label}</span>
                <span className="block text-xs text-muted-foreground">
                  {s.count} people{head ? ` · President: ${head.first_name} ${head.surname}` : ''}
                  {s.register ? ` · Official register: ${s.register.count}, frozen on ${frozenOn(s.register.frozen_at)}` : ''}
                </span>
              </button>
              <div className="flex shrink-0 gap-2">
                <Button variant="ghost" size="sm" className="h-11 lg:h-9" onClick={() => setLanded(s.key)}>Open</Button>
                <Button variant="outline" size="sm" className="h-11 border-accent/50 text-accent hover:bg-accent/15 lg:h-9" onClick={() => travelTo(s.key)} aria-label={`Travel to ${s.label}`}>
                  Travel<ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );

  // A search reaches every semester: each with its matches, a trip away.
  const results = (
    <div className="space-y-8">
      {visible.map((s) => (
        <section key={s.key} id={`tm-${s.key}`} className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-serif text-xl text-foreground">{s.label} <span className="font-body text-small text-muted-foreground">({s.shown.length} of {s.count})</span></h3>
            <Button data-ro variant="outline" size="sm" className="h-11 border-accent/50 text-accent hover:bg-accent/15 lg:h-9" onClick={() => travelTo(s.key)}>
              Travel to {s.label}<ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
          {table(s, s.shown, { team: s.rows.some((r) => r.team) })}
        </section>
      ))}
    </div>
  );

  return (
    <div id="time-machine-section" ref={stageRef} className="dark tm-root relative isolate bg-background font-body text-foreground" data-phase={phase}>
      <TimeWarp engine={engine} stageRef={stageRef} />
      <div aria-hidden="true" className="tm-flash pointer-events-none absolute inset-0 z-[2]" />
      <div className="tm-inner relative z-[1] space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.24em] text-accent">People</p>
            <h1 className="font-serif text-heading text-foreground">Time Machine</h1>
            <p className="mt-1.5 max-w-2xl text-body text-muted-foreground">
              Who was in the Society, semester by semester, from Fall 2019. Set a season and a year, travel, and the Society appears as it was.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <HelpDot page="people-rosters" />
            {/* Secondary: the whole history as a spreadsheet, for working elsewhere. */}
            <Button data-ro variant="ghost" size="sm" className="h-11 text-muted-foreground hover:text-foreground lg:h-9" disabled={!data || visible.every((s) => s.shown.length === 0)} onClick={exportCsv}>
              <Download className="h-4 w-4 mr-2" />Download CSV
            </Button>
          </div>
        </header>

        {data && data.semesters.length > 0 && (
          <TimeMachineConsole
            semesters={data.semesters}
            currentKey={data.current}
            currentLabel={data.current_label}
            onArrive={arriveAt}
            onPhase={setPhase}
            engine={engine}
            request={request}
          />
        )}

        {data && (
          <p className="text-small text-muted-foreground border-l-2 border-accent pl-3">
            {data.current_label}, the present, is in{' '}
            <Link to={workspacePath('people', 'people-members')} className="text-accent underline-offset-2 hover:underline">People, Members</Link>.
            {data.scope === 'division' ? ` You see the semesters of ${data.divisions.map(rosterDivisionLabel).join(' and ')}.` : ''}
            {fullScope ? ' Press a name to open the person\'s record.' : ''}
            {canEdit ? ' Corrections are recorded in the activity log.' : ''}
          </p>
        )}

        <div className={`tm-lower space-y-6 ${travelling ? 'tm-lower-away' : ''}`} aria-busy={travelling || undefined}>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
            <Select value={division} onValueChange={setDivision}>
              <SelectTrigger className="font-body h-11 lg:h-10" aria-label="Division"><SelectValue /></SelectTrigger>
              <SelectContent className="dark">
                <SelectItem value="all">{fullScope ? 'Every division' : 'My division'}</SelectItem>
                {divisionsPresent.map((d) => <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-10 font-body h-11 lg:h-10" placeholder="Find a person or a role in every semester" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          </div>

          {/* Records that may be one person, for the President and the
              Vice-President to answer (Step 108). */}
          {canEdit && !here && !q && <PeopleMatches onChanged={() => { void load(); }} />}

          {failed ? (
            <div className="rounded-lg border border-separator py-12 text-center"><p className="font-body text-muted-foreground">{failed}</p></div>
          ) : !data ? (
            <WorkspaceLoader />
          ) : visible.length === 0 ? (
            <div className="rounded-lg border border-separator py-12 text-center"><p className="font-body text-muted-foreground">{q ? 'Nobody matches in any semester.' : 'No past semester is recorded yet.'}</p></div>
          ) : q ? results : here ? arrival(here) : departures}
        </div>
      </div>

      <PersonRecordDialog target={person} onClose={() => { setPerson(null); }} />

      {/* Correct an entry, or add a person to a past semester. */}
      <Dialog open={!!edit} onOpenChange={(o) => { if (!o) setEdit(null); }}>
        <DialogContent className="max-w-md ws-form-touch">
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
            <AlertDialogCancel className="h-11 lg:h-10">Cancel</AlertDialogCancel>
            <AlertDialogAction className="h-11 lg:h-10" onClick={remove}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
