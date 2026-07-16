import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CalendarClock, Loader2, Check, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { logActivity } from '@/lib/activity-log';
import { useAccess } from '@/hooks/useAccess';
import { divisionLabels, type OrgDivision } from '@/lib/roles';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { useIsDesktop } from '@/hooks/use-desktop';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { listEvents, registerForEvent, myEventRegistrationIds, EVENT_TYPE_LABELS, AUDIENCE_LABELS, type EventRow } from '@/lib/events-api';
import {
  listCalendarEntries, saveCalendarEntry, deleteCalendarEntry, CALENDAR_ENTRY_LABELS,
  listExamSessions, saveExamSession, deleteExamSession, examSessionOn,
  type CalendarEntry, type CalendarEntryType, type ExamSession,
} from '@/lib/calendar-api';
import { italianHolidays, italianHolidayOn } from '@/lib/italian-holidays';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Kind = 'event' | 'aod' | 'alumni' | 'application' | 'fee' | 'custom';
type Item = { date: string; label: string; kind: Kind; event?: EventRow; entry?: CalendarEntry };

interface EntryForm { id: string | null; title: string; description: string; entry_date: string; entry_type: CalendarEntryType; location: string }
const emptyEntry = (date = ''): EntryForm => ({ id: null, title: '', description: '', entry_date: date, entry_type: 'meeting', location: '' });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as unknown as { from: (t: string) => any };

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const monthKey = (y: number, m: number) => `m-${y}-${m}`;

export default function WorkspaceCalendar({ onNavigate }: { onNavigate?: (section: string, sub: string) => void } = {}) {
  const { session } = useAuth();
  const { primaryRole } = useAccess();
  const { toast } = useToast();
  const { canManage } = useAccess();
  const canEdit = canManage('calendar');
  // The calendar is read-only in the mobile shell: consult everything,
  // register and edit from desktop.
  const isDesktop = useIsDesktop();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [registered, setRegistered] = useState<Set<string>>(new Set());
  const [regEvent, setRegEvent] = useState<EventRow | null>(null);
  const [registering, setRegistering] = useState(false);
  const [entryForm, setEntryForm] = useState<EntryForm | null>(null);
  const [savingEntry, setSavingEntry] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Exam session breaks: ranges during which the calendars accept no events.
  const [examSessions, setExamSessions] = useState<ExamSession[]>([]);
  const [examDialogOpen, setExamDialogOpen] = useState(false);
  const [examForm, setExamForm] = useState({ label: '', start_date: '', end_date: '' });
  const [savingExam, setSavingExam] = useState(false);

  const load = async () => {
      try {
        const [events, regIds, entries, exams] = await Promise.all([
          listEvents(), myEventRegistrationIds(), listCalendarEntries().catch(() => []),
          listExamSessions().catch(() => [] as ExamSession[]),
        ]);
        setRegistered(regIds);
        setExamSessions(exams);
        const out: Item[] = [];
        for (const e of events) { const d = (e.start_at || e.date)?.slice(0, 10); if (d) out.push({ date: d, label: e.title, kind: 'event', event: e }); }
        for (const c of entries) out.push({ date: c.entry_date.slice(0, 10), label: c.title, kind: 'custom', entry: c });
        const { data: aod } = await sb.from('aod_days').select('event_date');
        for (const a of (aod || []) as { event_date: string }[]) out.push({ date: a.event_date, label: 'Association on Display', kind: 'aod' });
        // Alumni calls are organised by a division, and can invite several
        // alumni, so the calendar labels them by the ORGANISING DIVISION rather
        // than a single alumnus name (which may be empty → "Alumni Call: null").
        const { data: calls } = await sb.from('alumni_calls').select('planned_date, division');
        for (const c of (calls || []) as { planned_date: string | null; division: OrgDivision | null }[]) {
          if (c.planned_date) out.push({ date: c.planned_date, label: c.division ? `Alumni call: ${divisionLabels[c.division]}` : 'Alumni call', kind: 'alumni' });
        }
        const { data: settings } = await sb.from('application_settings').select('start_date, end_date, semester_label').limit(1).maybeSingle();
        if (settings?.start_date) out.push({ date: settings.start_date.slice(0, 10), label: `Applications open (${settings.semester_label})`, kind: 'application' });
        if (settings?.end_date) out.push({ date: settings.end_date.slice(0, 10), label: `Applications close (${settings.semester_label})`, kind: 'application' });

        // Membership fee — an association-wide deadline (never a division deadline).
        const { data: fee } = await sb.from('fee_periods').select('*').eq('closed', false).order('created_at', { ascending: false }).limit(1).maybeSingle();
        if (fee?.first_deadline) {
          out.push({ date: fee.first_deadline.slice(0, 10), label: `Membership fee deadline (${fee.semester_label})`, kind: 'fee' });
          // The second deadline is hidden until the first has passed, then shown
          // only to the viewing member if they have not yet paid.
          if (fee.second_deadline) {
            const firstPassed = ymd(new Date()) > fee.first_deadline.slice(0, 10);
            let unpaid = false;
            if (firstPassed && session?.user?.id) {
              const { data: me } = await sb.from('members').select('id').eq('user_id', session.user.id).maybeSingle();
              if (me?.id) {
                const { data: myFee } = await sb.from('membership_fees').select('paid').eq('period_id', fee.id).eq('member_id', me.id).maybeSingle();
                unpaid = !!myFee && !myFee.paid;
              }
            }
            if (unpaid) out.push({ date: fee.second_deadline.slice(0, 10), label: `Membership fee final deadline (${fee.semester_label})`, kind: 'fee' });
          }
        }
        setItems(out);
      } catch (e) { toast({ title: 'Failed to load calendar', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
      finally { setLoading(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [session]);

  const saveEntry = async () => {
    if (!entryForm) return;
    if (!entryForm.title.trim()) { toast({ title: 'A title is required', variant: 'destructive' }); return; }
    if (!entryForm.entry_date) { toast({ title: 'A date is required', variant: 'destructive' }); return; }
    // Meetings and socials cannot land inside an exam session break (the
    // database enforces this too; deadlines, reminders and CASA Committee
    // meetings remain possible).
    if (['meeting', 'social'].includes(entryForm.entry_type)) {
      const brk = examSessionOn(examSessions, entryForm.entry_date);
      if (brk) { toast({ title: 'Exam session break', description: `${brk.label}: the calendar does not accept events between ${brk.start_date} and ${brk.end_date}.`, variant: 'destructive' }); return; }
      const hol = italianHolidayOn(entryForm.entry_date);
      if (hol) { toast({ title: 'Italian public holiday', description: `${hol}: the calendar does not accept events on national holidays.`, variant: 'destructive' }); return; }
    }
    setSavingEntry(true);
    try {
      await saveCalendarEntry(session, {
        id: entryForm.id ?? undefined, title: entryForm.title.trim(), description: entryForm.description.trim() || null,
        entry_date: entryForm.entry_date, entry_type: entryForm.entry_type, location: entryForm.location.trim() || null,
      });
      logActivity(session, primaryRole, { action: entryForm.id ? 'update' : 'create', section: 'General', subsection: 'Calendar', entityType: 'calendar_entry', entityName: entryForm.title.trim() });
      toast({ title: entryForm.id ? 'Entry updated' : 'Entry added' });
      setEntryForm(null);
      await load();
    } catch (e) { toast({ title: 'Could not save', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setSavingEntry(false); }
  };

  const removeEntry = async () => {
    if (!entryForm?.id) return;
    try { await deleteCalendarEntry(session, entryForm.id); logActivity(session, primaryRole, { action: 'delete', section: 'General', subsection: 'Calendar', entityType: 'calendar_entry', entityName: entryForm.title }); toast({ title: 'Entry removed' }); setEntryForm(null); await load(); }
    catch (e) { toast({ title: 'Could not remove', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
  };

  const openEntryEdit = (c: CalendarEntry) => setEntryForm({
    id: c.id, title: c.title, description: c.description ?? '', entry_date: c.entry_date.slice(0, 10),
    entry_type: c.entry_type, location: c.location ?? '',
  });

  const saveExam = async () => {
    if (!examForm.label.trim()) { toast({ title: 'A label is required', description: 'e.g. Winter exam session', variant: 'destructive' }); return; }
    if (!examForm.start_date || !examForm.end_date || examForm.end_date < examForm.start_date) {
      toast({ title: 'Choose a valid date range', variant: 'destructive' }); return;
    }
    setSavingExam(true);
    try {
      await saveExamSession(session, { label: examForm.label.trim(), start_date: examForm.start_date, end_date: examForm.end_date });
      logActivity(session, primaryRole, { action: 'create', section: 'General', subsection: 'Calendar', entityType: 'exam_session', entityName: examForm.label.trim(), details: { start: examForm.start_date, end: examForm.end_date } });
      toast({ title: 'Exam session added', description: 'No events can be scheduled on those days, on any workspace calendar.' });
      setExamForm({ label: '', start_date: '', end_date: '' });
      await load();
    } catch (e) { toast({ title: 'Could not save', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setSavingExam(false); }
  };

  const removeExam = async (ex: ExamSession) => {
    try {
      await deleteExamSession(ex.id);
      logActivity(session, primaryRole, { action: 'delete', section: 'General', subsection: 'Calendar', entityType: 'exam_session', entityId: ex.id, entityName: ex.label });
      toast({ title: 'Exam session removed' });
      await load();
    } catch (e) { toast({ title: 'Could not remove', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
  };

  const itemsByDate = useMemo(() => {
    const map: Record<string, Item[]> = {};
    for (const it of items) (map[it.date] ??= []).push(it);
    return map;
  }, [items]);

  // Continuous range of months: from one month before the earliest item (or
  // this month) to the later of the latest item and three months out.
  const months = useMemo(() => {
    const now = new Date();
    const dates = items.map((i) => i.date).filter(Boolean).sort();
    const earliest = dates.length ? new Date(dates[0]) : now;
    const latest = dates.length ? new Date(dates[dates.length - 1]) : now;
    const start = new Date(Math.min(
      new Date(earliest.getFullYear(), earliest.getMonth() - 1, 1).getTime(),
      new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime(),
    ));
    const end = new Date(Math.max(latest.getTime(), new Date(now.getFullYear(), now.getMonth() + 6, 1).getTime()));
    const list: { year: number; month: number }[] = [];
    const cur = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cur <= end) { list.push({ year: cur.getFullYear(), month: cur.getMonth() }); cur.setMonth(cur.getMonth() + 1); }
    return list;
  }, [items]);

  // Italian public holidays for every year covered by the rendered range.
  // Holidays HARD BLOCK scheduling (enforced in the database) and are not
  // editable by any user — they render as a red badge on the day cell.
  const holidayByDate = useMemo(() => {
    const map: Record<string, string> = {};
    const years = new Set(months.map((m) => m.year));
    for (const y of years) for (const h of italianHolidays(y)) map[h.date] = h.label;
    return map;
  }, [months]);

  // Jump to the current month once the calendar is rendered.
  useEffect(() => {
    if (loading) return;
    const now = new Date();
    const el = document.getElementById(monthKey(now.getFullYear(), now.getMonth()));
    el?.scrollIntoView({ block: 'start' });
  }, [loading]);

  const jumpToToday = () => {
    const now = new Date();
    document.getElementById(monthKey(now.getFullYear(), now.getMonth()))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const kindColor = (k: Kind, entry?: CalendarEntry) =>
    k === 'event' ? 'bg-accent/10 text-accent'
      : k === 'aod' ? 'bg-amber-100 text-amber-800'
      : k === 'alumni' ? 'bg-emerald-100 text-emerald-800'
      : k === 'fee' ? 'bg-rose-100 text-rose-800'
      : k === 'custom' ? (entry?.entry_type === 'casa_committee' ? 'bg-indigo-100 text-indigo-800' : entry?.entry_type === 'casa_deadline' ? 'bg-fuchsia-100 text-fuchsia-800' : 'bg-violet-100 text-violet-800')
      : 'bg-blue-100 text-blue-800';

  const doRegister = async () => {
    if (!regEvent) return;
    setRegistering(true);
    try {
      await registerForEvent(session, { event_id: regEvent.id });
      setRegistered((p) => new Set(p).add(regEvent.id));
      logActivity(session, primaryRole, { action: 'registration', section: 'General', subsection: 'Calendar', entityType: 'event_registration', entityId: regEvent.id, entityName: regEvent.title });
      toast({ title: 'Registered' });
      setRegEvent(null);
    } catch (e) { toast({ title: 'Could not register', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setRegistering(false); }
  };

  if (loading) return <div><WorkspacePageHeader title="Calendar" description="Events, deadlines and meetings." /><WorkspaceLoader /></div>;

  const dayIsClickable = canEdit;

  const todayStr = ymd(new Date());

  const monthCells = (year: number, month: number): (string | null)[] => {
    const first = new Date(year, month, 1);
    const startDow = (first.getDay() + 6) % 7; // Monday-first
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (string | null)[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    return cells;
  };

  return (
    <div>
      <WorkspacePageHeader
        title="Calendar"
        description={`Association events, Association on Display, alumni calls, application periods and the membership fee deadline. Scroll to move through the months. Click an event with open registration to sign up or check your status. Click an Association on Display day to open its slot registration page.${canEdit ? ' Click a day to add your own entry (meeting, deadline, reminder…).' : ''}`}
        actions={canEdit ? (
          <>
            <Button variant="outline" className="font-body" onClick={() => setExamDialogOpen(true)}>
              <CalendarClock className="h-4 w-4 mr-2" />Exam sessions
            </Button>
            <Button className="font-body" onClick={() => setEntryForm(emptyEntry(ymd(new Date())))}><Plus className="h-4 w-4 mr-2" />Add entry</Button>
          </>
        ) : undefined}
      />

      <div className="flex items-center justify-end mb-3">
        <Button variant="outline" size="sm" onClick={jumpToToday}>Jump to today</Button>
      </div>

      <div className="flex flex-wrap gap-4 mb-3 text-xs text-muted-foreground font-body">
        <span><span className="inline-block w-3 h-3 rounded-sm bg-accent/20 mr-1 align-middle" />Event</span>
        <span><span className="inline-block w-3 h-3 rounded-sm bg-amber-200 mr-1 align-middle" />Association on Display</span>
        <span><span className="inline-block w-3 h-3 rounded-sm bg-emerald-200 mr-1 align-middle" />Alumni call</span>
        <span><span className="inline-block w-3 h-3 rounded-sm bg-blue-200 mr-1 align-middle" />Applications</span>
        <span><span className="inline-block w-3 h-3 rounded-sm bg-rose-200 mr-1 align-middle" />Membership fee</span>
        <span><span className="inline-block w-3 h-3 rounded-sm bg-violet-200 mr-1 align-middle" />Custom entry</span>
        <span><span className="inline-block w-3 h-3 rounded-sm bg-indigo-200 mr-1 align-middle" />CASA Committee meetings (board only)</span>
        <span><span className="inline-block w-3 h-3 rounded-sm bg-fuchsia-200 mr-1 align-middle" />CASA request deadline (board only)</span>
        <span><span className="inline-block w-3 h-3 rounded-sm bg-red-200 mr-1 align-middle" />Italian public holiday: no events accepted</span>
        <span><span className="inline-block w-3 h-3 rounded-sm bg-muted border border-separator mr-1 align-middle" />Exam session break: no events accepted</span>
      </div>

      <div ref={scrollRef} className="max-h-[72vh] overflow-y-auto border border-separator">
        {months.map(({ year, month }) => (
          <section key={monthKey(year, month)} id={monthKey(year, month)} className="border-b border-separator last:border-b-0">
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur px-3 py-2 border-b border-separator">
              <h2 className="font-serif text-2xl text-accent">{new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
            </div>
            <div className="grid grid-cols-7 gap-px bg-separator font-body">
              {WEEKDAYS.map((d) => <div key={d} className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider px-2 py-1 text-center">{d}</div>)}
              {monthCells(year, month).map((date, i) => {
                const brk = date ? examSessionOn(examSessions, date) : undefined;
                const hol = date ? holidayByDate[date] : undefined;
                const blocked = !!brk || !!hol;
                const blockedTitle = brk
                  ? `${brk.label}: exam session break, the calendar does not accept events on this day`
                  : hol
                  ? `${hol}: Italian public holiday, the calendar does not accept events on this day`
                  : undefined;
                return (
                <div key={i}
                  className={`${hol ? 'bg-red-50' : brk ? 'bg-muted/70' : 'bg-background'} min-h-[92px] p-1.5 align-top ${date === todayStr ? 'ring-1 ring-accent ring-inset' : ''}`}
                  title={blockedTitle}>
                  {date && <>
                    {dayIsClickable && !blocked ? (
                      <button type="button" className={`text-sm mb-1 hover:text-accent ${date === todayStr ? 'text-accent' : 'text-muted-foreground'}`} onClick={() => setEntryForm(emptyEntry(date))} title="Add an entry on this day">{parseInt(date.slice(-2), 10)}</button>
                    ) : (
                      <div className={`text-sm mb-1 ${hol ? 'text-red-700' : date === todayStr ? 'text-accent' : 'text-muted-foreground'}`}>{parseInt(date.slice(-2), 10)}</div>
                    )}
                    {hol && (
                      <div className="text-[10px] leading-tight px-1.5 py-0.5 rounded bg-red-100 text-red-800 truncate mb-1" title={hol}>{hol}</div>
                    )}
                    <div className="space-y-1">
                      {(itemsByDate[date] || []).map((it, j) => {
                        const isEvent = it.kind === 'event' && !!it.event;
                        const isCustom = it.kind === 'custom' && !!it.entry;
                        const isAod = it.kind === 'aod' && !!onNavigate;
                        const clickable = (isEvent && it.event!.registration_enabled) || (isCustom && canEdit) || isAod;
                        const isReg = isEvent && registered.has(it.event!.id);
                        const onClick = () => {
                          if (isEvent && it.event!.registration_enabled) setRegEvent(it.event!);
                          else if (isCustom && canEdit) openEntryEdit(it.entry!);
                          else if (isAod) onNavigate!('events', 'events-on-display');
                        };
                        return (
                          <button key={j} disabled={!clickable} onClick={onClick}
                            title={isCustom ? `${CALENDAR_ENTRY_LABELS[it.entry!.entry_type]}: ${it.label}` : isEvent ? EVENT_TYPE_LABELS[it.event!.event_type] : isAod ? 'Open the Association on Display registration page' : it.label}
                            className={`flex items-center gap-1 w-full text-left text-xs leading-tight px-1.5 py-0.5 rounded truncate ${kindColor(it.kind, it.entry)} ${clickable ? 'cursor-pointer' : 'cursor-default'}`}>
                            {isReg && <Check className="h-3 w-3 shrink-0" />}
                            <span className="truncate">{it.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    {brk && (itemsByDate[date]?.length ?? 0) === 0 && (
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground/60 mt-1">Exam break</div>
                    )}
                  </>}
                </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Custom entry create / edit dialog (authorised users only) */}
      <Dialog open={!!entryForm} onOpenChange={(o) => !o && setEntryForm(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">{entryForm?.id ? 'Edit entry' : 'Add calendar entry'}</DialogTitle>
            <DialogDescription className="font-body">Meetings, deadlines, reminders and socials you add here appear on the shared calendar for the whole team.</DialogDescription>
          </DialogHeader>
          {entryForm && (
            <div className="space-y-3 font-body">
              <div className="space-y-1"><Label>Title *</Label><Input value={entryForm.title} onChange={(e) => setEntryForm({ ...entryForm, title: e.target.value })} placeholder="e.g. Board meeting" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Date *</Label><Input type="date" value={entryForm.entry_date} onChange={(e) => setEntryForm({ ...entryForm, entry_date: e.target.value })} /></div>
                <div className="space-y-1">
                  <Label>Type</Label>
                  <Select value={entryForm.entry_type} onValueChange={(v) => setEntryForm({ ...entryForm, entry_type: v as CalendarEntryType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(['meeting', 'deadline', 'reminder', 'social', 'other', 'casa_committee', 'casa_deadline'] as CalendarEntryType[]).map((t) => (
                        <SelectItem key={t} value={t}>{CALENDAR_ENTRY_LABELS[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {(entryForm.entry_type === 'casa_committee' || entryForm.entry_type === 'casa_deadline') && (
                <p className="text-xs text-muted-foreground border border-separator bg-muted/40 p-2">
                  CASA Committee meetings and request deadlines are visible ONLY to the members of the board of
                  directors (and the admin account). Other members never see this entry on the calendar.
                </p>
              )}
              <div className="space-y-1"><Label>Location</Label><Input value={entryForm.location} onChange={(e) => setEntryForm({ ...entryForm, location: e.target.value })} placeholder="e.g. Room N01 / online" /></div>
              <div className="space-y-1"><Label>Description</Label><Textarea rows={3} value={entryForm.description} onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })} placeholder="Anything the team should know" /></div>
              <div className="flex gap-3 pt-1">
                <Button className="flex-1" onClick={saveEntry} disabled={savingEntry}>{savingEntry ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving</> : 'Save'}</Button>
                {entryForm.id && <Button variant="destructive" size="icon" onClick={removeEntry}><Trash2 className="h-4 w-4" /></Button>}
                <Button variant="outline" onClick={() => setEntryForm(null)}>Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Exam session breaks manager (authorised users only). */}
      <Dialog open={examDialogOpen} onOpenChange={setExamDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">Exam session breaks</DialogTitle>
            <DialogDescription className="font-body">
              During an exam session break, NO event can be scheduled anywhere in the workspace: events,
              interview slots, Association on Display days, alumni calls, meetings and socials are all refused on
              those days. This protects the time when the student community needs to study, so events land when
              people can actually attend. Deadlines and reminders remain possible.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 font-body">
            {examSessions.length > 0 && (
              <div className="border border-separator divide-y divide-separator">
                {examSessions.map((ex) => (
                  <div key={ex.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <div>
                      <div className="text-foreground">{ex.label}</div>
                      <div className="text-xs text-muted-foreground">{ex.start_date} to {ex.end_date}</div>
                    </div>
                    <Button variant="outline" size="icon" className="h-8 w-8 text-destructive border-destructive/40" onClick={() => removeExam(ex)} title="Remove this break">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2"><Label>Label *</Label><Input value={examForm.label} onChange={(e) => setExamForm({ ...examForm, label: e.target.value })} placeholder="e.g. Winter exam session" /></div>
              <div className="space-y-1"><Label>From *</Label><Input type="date" value={examForm.start_date} onChange={(e) => setExamForm({ ...examForm, start_date: e.target.value })} /></div>
              <div className="space-y-1"><Label>To *</Label><Input type="date" value={examForm.end_date} onChange={(e) => setExamForm({ ...examForm, end_date: e.target.value })} /></div>
            </div>
            <div className="flex gap-3">
              <Button className="flex-1" onClick={saveExam} disabled={savingExam}>{savingExam ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving</> : 'Add exam session'}</Button>
              <Button variant="outline" onClick={() => setExamDialogOpen(false)}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!regEvent} onOpenChange={(o) => !o && setRegEvent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">{regEvent?.title}</DialogTitle>
            <DialogDescription className="font-body">
              {regEvent && new Date(regEvent.start_at || regEvent.date).toLocaleString()}{regEvent?.place ? ` · ${regEvent.place}` : ''}
            </DialogDescription>
          </DialogHeader>
          {regEvent && (
            <div className="font-body text-sm space-y-3">
              <p className="text-muted-foreground">{EVENT_TYPE_LABELS[regEvent.event_type]} · {AUDIENCE_LABELS[regEvent.registration_audience]}</p>
              {regEvent.description && <p className="text-muted-foreground">{regEvent.description}</p>}
              {registered.has(regEvent.id) ? (
                <div className="flex items-center gap-2 text-emerald-700"><CalendarClock className="h-4 w-4" />You are registered for this event.</div>
              ) : isDesktop ? (
                <Button className="w-full" onClick={doRegister} disabled={registering}>
                  {registering ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Registering</> : 'Register for this event'}
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground border border-separator bg-muted/40 p-2">Registration is available on desktop.</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
