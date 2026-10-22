// =====================================================================
// Attendance for an online event, from the meeting's report.
// ---------------------------------------------------------------------
// Three steps, in one dialog.
//
//   1. THE FILE. Teams gives the organiser of a meeting an attendance
//      report (a .csv file). It is read here, in the browser, by
//      src/lib/attendance-report.ts, which copes with the ways the file
//      varies; nothing is sent until the list has been checked.
//   2. THE LIST. The server says who each person is (a member, found by
//      address or, less surely, by name; or a guest) and whether they are
//      already on the event's list. Everyone is ticked to start with,
//      except a name two members share, a phone number dialling in, and
//      anybody under the shortest stay chosen. The organiser unticks
//      whoever should not count. A report for another day than the
//      event's says so, in amber, before anything is recorded.
//   3. RECORD. The ticked people are marked as present: ticked if on the
//      list, added (as a member or as a guest) if not. Guests are not put
//      on the newsletter. Doing it twice changes nothing the second time.
// =====================================================================

import { useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileUp, Loader2, Upload, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { divisionLabels } from '@/lib/roles';
import { formatEventWhen } from '@/lib/event-time';
import { ReportError, formatSeconds, readReportFile, reportDay, type ParsedReport, type ReportPerson } from '@/lib/attendance-report';
import { importAttendance, previewAttendanceImport, type EventRow, type ImportPreviewRow, type ImportResult } from '@/lib/events-api';

type Row = ImportPreviewRow & { person: ReportPerson; key: string };

const STAYS = [0, 5, 10, 15, 30];

const longDay = (ymd: string) => new Date(`${ymd}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export function TeamsImportDialog({ open, onOpenChange, event, onDone }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  event: EventRow;
  /** After recording: reload the list. */
  onDone: () => void;
}) {
  const { session } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<'pick' | 'review' | 'done'>('pick');
  const [busy, setBusy] = useState<null | 'reading' | 'saving'>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [report, setReport] = useState<ParsedReport | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  // What the organiser ticked or unticked by hand: a change of the shortest
  // stay never undoes it.
  const [manual, setManual] = useState<Map<string, boolean>>(new Map());
  const [minStay, setMinStay] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragging, setDragging] = useState(false);

  const reset = () => {
    setStage('pick'); setBusy(null); setProblem(null); setFileName(''); setReport(null);
    setRows([]); setPicked(new Set()); setManual(new Map()); setMinStay(0); setResult(null);
  };
  const close = (o: boolean) => {
    if (busy) return;
    onOpenChange(o);
    if (!o) window.setTimeout(reset, 200);
  };

  /** Ticked to start with: not ambiguous, not a phone, long enough, not already done. */
  const startsTicked = (r: Row, stay: number) =>
    !r.already_present && !r.ambiguous && !r.person.phone && (stay === 0 || r.person.seconds === null || r.person.seconds >= stay * 60);

  const read = async (file: File | undefined) => {
    if (!file) return;
    setProblem(null);
    setFileName(file.name);
    setBusy('reading');
    try {
      const parsed = await readReportFile(file);
      const people = parsed.people.map((p) => ({ name: p.name, email: p.email }));
      const { people: seen } = await previewAttendanceImport(session, event.id, people);
      // Each answer names the line of the file it is about.
      const list: Row[] = seen.filter((s) => parsed.people[s.i]).map((s) => ({ ...s, person: parsed.people[s.i], key: `${s.i}` }));
      setReport(parsed);
      setRows(list);
      setPicked(new Set(list.filter((r) => startsTicked(r, 0)).map((r) => r.key)));
      setManual(new Map());
      setStage('review');
    } catch (e) {
      setProblem(e instanceof ReportError ? e.message : e instanceof Error ? e.message : 'The file could not be read.');
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const applyStay = (stay: number) => {
    setMinStay(stay);
    setPicked(new Set(rows.filter((r) => (manual.has(r.key) ? manual.get(r.key) : startsTicked(r, stay))).map((r) => r.key)));
  };
  const toggle = (key: string, on: boolean) => {
    setManual((m) => new Map(m).set(key, on));
    setPicked((s) => { const n = new Set(s); if (on) n.add(key); else n.delete(key); return n; });
  };

  const members = rows.filter((r) => r.kind === 'member');
  const guests = rows.filter((r) => r.kind === 'guest');
  const chosen = rows.filter((r) => picked.has(r.key) && !r.already_present);
  const anyStay = rows.some((r) => r.person.seconds !== null);
  const day = report ? reportDay(report.meeting.start, event.date) : null;
  const otherDay = !!day && day !== event.date;

  const record = async () => {
    if (!chosen.length) return;
    setBusy('saving');
    try {
      const res = await importAttendance(session, event.id, chosen.map((r) => ({ name: r.person.name, email: r.person.email })));
      setResult(res);
      setStage('done');
      onDone();
    } catch (e) {
      toast({ title: 'Attendance was not recorded', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setBusy(null); }
  };

  const section = (title: string, list: Row[]) => {
    if (!list.length) return null;
    const open_ = list.filter((r) => !r.already_present);
    const all = open_.length > 0 && open_.every((r) => picked.has(r.key));
    return (
      <section aria-label={title}>
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-separator bg-background/95 px-1 py-2 backdrop-blur">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-accent">{title} <span className="font-normal tabular-nums text-muted-foreground">{list.length}</span></h3>
          {open_.length > 0 && (
            <button type="button" className="text-xs text-accent underline underline-offset-2"
              onClick={() => open_.forEach((r) => toggle(r.key, !all))}>
              {all ? 'Untick all' : 'Tick all'}
            </button>
          )}
        </div>
        <ul className="divide-y divide-separator">
          {list.map((r) => {
            const id = `imp-${r.key}`;
            const checked = r.already_present || picked.has(r.key);
            const short = minStay > 0 && r.person.seconds !== null && r.person.seconds < minStay * 60;
            return (
              <li key={r.key} className={`flex items-start gap-3 px-1 py-2.5 ${short && !checked ? 'opacity-60' : ''}`}>
                <Checkbox id={id} className="mt-0.5" checked={checked} disabled={r.already_present || busy !== null}
                  onCheckedChange={(v) => toggle(r.key, v === true)} aria-label={`Record ${r.person.name} as present`} />
                <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
                  <span className="block text-sm text-foreground break-words">
                    {r.person.name}
                    {r.member_name && r.member_name.toLowerCase() !== r.person.name.toLowerCase() && <span className="text-muted-foreground"> · on the register: {r.member_name}</span>}
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                    {r.person.email ? <span className="break-all">{r.person.email}</span> : <span>No email in the report</span>}
                    {r.kind === 'member' && r.member_division && r.member_division !== 'none' && <span>{divisionLabels[r.member_division]}</span>}
                    {r.kind === 'member' && <span className={r.how === 'name' ? 'text-amber-700' : 'text-emerald-700'}>{r.how === 'email' ? 'Member, by email' : 'Member, by name: check'}</span>}
                    {r.ambiguous && <span className="text-amber-700">Several members have this name: recorded as written, for you to settle on the list</span>}
                    {r.person.unverified && <span>Unverified in Teams</span>}
                    {r.person.phone && <span>Phone dial-in</span>}
                    {r.person.seconds !== null && <span>{formatSeconds(r.person.seconds)} in the meeting</span>}
                    {r.person.role && /organi[sz]er|presenter/i.test(r.person.role) && <span>{r.person.role}</span>}
                  </span>
                </label>
                <span className={`shrink-0 text-xs ${r.already_present ? 'text-emerald-700' : 'text-muted-foreground'}`}>
                  {r.already_present ? 'Present' : r.on_list ? 'On the list' : 'New'}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    );
  };

  const summary = useMemo(() => {
    const already = rows.filter((r) => r.already_present).length;
    return { already, members: members.length, guests: guests.length };
  }, [rows, members.length, guests.length]);

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="flex max-h-[92vh] w-[min(96vw,44rem)] max-w-[min(96vw,44rem)] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-separator px-6 pb-4 pt-6 text-left">
          <DialogTitle className="flex items-center gap-2 font-serif"><Video className="h-5 w-5 text-accent" aria-hidden />Attendance from Teams</DialogTitle>
          <DialogDescription className="font-body">{event.title} · {formatEventWhen(event, { weekday: false, month: 'short' })}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 font-body">
          {stage === 'pick' && (
            <div className="space-y-4">
              <ol className="list-decimal space-y-1.5 pl-5 text-sm text-foreground">
                <li>In Teams, open the meeting (in the Calendar, or its chat) and go to <strong>Attendance</strong>.</li>
                <li>Press <strong>Download</strong>: Teams saves the attendance report as a .csv file.</li>
                <li>Choose that file here. You will see who was found before anything is recorded.</li>
              </ol>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); void read(e.dataTransfer.files?.[0]); }}
                className={`flex flex-col items-center gap-3 border-2 border-dashed px-4 py-8 text-center transition-colors ${dragging ? 'border-accent bg-accent/5' : 'border-separator'}`}
              >
                <FileUp className="h-7 w-7 text-accent" aria-hidden />
                <p className="text-sm text-muted-foreground">Drop the attendance report here, or</p>
                <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" className="hidden" onChange={(e) => void read(e.target.files?.[0])} aria-label="Choose the attendance report" />
                <Button type="button" variant="solid" disabled={busy !== null} onClick={() => fileRef.current?.click()}>
                  {busy === 'reading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {busy === 'reading' ? `Reading ${fileName}` : 'Choose the file'}
                </Button>
              </div>
              {problem && (
                <p className="flex items-start gap-2 border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-sm text-destructive" role="alert">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{problem}
                </p>
              )}
              <p className="text-xs text-muted-foreground">The file is read on this device. Only the names and emails in it are sent, to be matched to the members.</p>
            </div>
          )}

          {stage === 'review' && report && (
            <div className="space-y-4">
              <div className="text-sm">
                <p className="text-foreground">{report.meeting.title || fileName}</p>
                {report.meeting.start && <p className="text-xs text-muted-foreground">Started {report.meeting.start}{report.meeting.end ? `, ended ${report.meeting.end}` : ''}</p>}
              </div>
              {otherDay && (
                <p className="flex items-start gap-2 border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200" role="alert">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>This report is for a meeting on {longDay(day!)}, and this event is on {longDay(event.date)}. Check that it is the right meeting before recording.</span>
                </p>
              )}
              {report.notes.map((n) => <p key={n} className="text-xs text-muted-foreground">{n}</p>)}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <span className="text-foreground">{summary.members} {summary.members === 1 ? 'member' : 'members'} · {summary.guests} {summary.guests === 1 ? 'guest' : 'guests'}{summary.already ? ` · ${summary.already} already present` : ''}</span>
                {anyStay && (
                  <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                    Count
                    <select className="h-8 border border-input bg-background px-2 text-xs text-foreground" value={minStay} onChange={(e) => applyStay(Number(e.target.value))} disabled={busy !== null}>
                      {STAYS.map((m) => <option key={m} value={m}>{m === 0 ? 'everyone in the report' : `who stayed ${m} minutes or more`}</option>)}
                    </select>
                  </label>
                )}
              </div>
              <div className="max-h-[48vh] overflow-y-auto border-y border-separator">
                {section('Members', members)}
                {section('Guests', guests)}
              </div>
              <p className="text-xs text-muted-foreground">
                Guests are recorded as present and are not added to the newsletter. As for every guest marked present, those with an email receive the thank-you the morning after the event, if it has not gone out yet.
              </p>
            </div>
          )}

          {stage === 'done' && result && (
            <div className="space-y-3 py-4 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" aria-hidden />
              <p className="font-serif text-xl text-accent">Attendance recorded</p>
              <p className="text-sm text-foreground">
                {[
                  result.ticked ? `${result.ticked} ticked on the list` : '',
                  result.added_members ? `${result.added_members} ${result.added_members === 1 ? 'member' : 'members'} added` : '',
                  result.added_guests ? `${result.added_guests} ${result.added_guests === 1 ? 'guest' : 'guests'} added` : '',
                  result.already ? `${result.already} already present` : '',
                ].filter(Boolean).join(' · ') || 'Nothing to change: everyone was already recorded.'}
              </p>
              <p className="text-xs text-muted-foreground">Anybody can still be unticked or removed on the list, until it closes at the end of the semester.</p>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-3 border-t border-separator bg-background px-6 py-4 font-body">
          {stage === 'review' && (
            <>
              <p className="mr-auto text-sm text-muted-foreground" aria-live="polite">{chosen.length} to record</p>
              <Button type="button" variant="ghost" onClick={reset} disabled={busy !== null}>Another file</Button>
              <Button type="button" variant="solid" onClick={record} disabled={busy !== null || chosen.length === 0}>
                {busy === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Record {chosen.length} as present
              </Button>
            </>
          )}
          {stage !== 'review' && <Button type="button" variant="outline" className="ml-auto" onClick={() => close(false)} disabled={busy !== null}>{stage === 'done' ? 'Close' : 'Cancel'}</Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default TeamsImportDialog;
