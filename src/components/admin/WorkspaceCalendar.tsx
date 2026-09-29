import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarClock, CalendarDays, CircleCheck, Hourglass, List, Loader2, Plus, Ticket, Trash2, CalendarX2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { divisionLabels, type OrgDivision } from '@/lib/roles';
import { isFeeExempt } from '@/lib/membership-fee';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { HelpDot } from '@/components/admin/help/HelpSystem';
import { romeWall, romeWallToIso, zoneOnDate } from '@/lib/event-time';
import {
  listEvents, registerForEvent, myEventRegistrationIds, myEventWaitlistIds, cancelMyRegistration, saveEvent, eventPlaces,
  EVENT_TYPE_LABELS, type EventRow, type EventPlaces,
} from '@/lib/events-api';
import {
  listCalendarEntries, saveCalendarEntry, deleteCalendarEntry, CALENDAR_ENTRY_LABELS,
  listExamSessions, saveExamSession, deleteExamSession, examSessionOn,
  type CalendarEntry, type CalendarEntryType, type ExamSession,
} from '@/lib/calendar-api';
import { italianHolidays, italianHolidayOn } from '@/lib/italian-holidays';
import { longDay, monthTitle, relativeDay, sameMonth, shortDay, todayYmd } from '@/lib/calendar-dates';
import { CalendarToolbar, EmptyState, FilterChip, MonthGrid } from '@/components/admin/calendar/CalendarKit';
import { useMedia, useStoredChoice } from '@/components/admin/calendar/calendar-hooks';
import { AgendaRow, ItemChip, RegisterButton } from '@/components/admin/calendar/CalendarItems';
import { RegistrationPanel, type OpenEvent } from '@/components/admin/calendar/RegistrationPanel';
import { ItemDetailSheet } from '@/components/admin/calendar/ItemDetailSheet';
import {
  CATEGORY, CATEGORY_ORDER, categoryOf, eventDay, isOver, placesLine, regState,
  type CalItem, type Category, type RegState,
} from '@/components/admin/calendar/calendar-model';

// =====================================================================
// CALENDAR: what the association has on, and what you can sign up for.
// ---------------------------------------------------------------------
// Rebuilt around the two questions a member brings to it.
//
//   1. WHAT SHOULD I REGISTER FOR? Answered first, by "Register for
//      events": every upcoming event still open to you, soonest first,
//      each with its own Register button, beside the events you are
//      already down for. "How registration works" lays out the four steps
//      from the button to the door.
//
//   2. WHAT IS ON, AND WHEN? One month at a time (with Today and the
//      arrows), or as an agenda: a list by day, which is also what a
//      phone shows first, because a month grid is too small to read on
//      one. The filter chips over it are the colour key as well.
//
// Every item opens the same panel: the details, where you stand, and the
// one action that follows. Editing is unchanged for the roles that may
// edit: "Add entry" and "Exam sessions" in the header, "Edit details" in
// an event's panel, and a "+" on any day.
// =====================================================================

interface EntryForm { id: string | null; title: string; description: string; entry_date: string; entry_type: CalendarEntryType; location: string }
const emptyEntry = (date = ''): EntryForm => ({ id: null, title: '', description: '', entry_date: date, entry_type: 'meeting', location: '' });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as unknown as { from: (t: string) => any };

type View = 'month' | 'agenda';
const VIEWS = ['month', 'agenda'] as const;

/** A day shaded as an exam session break: stripes, not only a colour. */
const BREAK_BG = '[background-image:repeating-linear-gradient(135deg,rgba(0,0,0,0.045)_0,rgba(0,0,0,0.045)_5px,transparent_5px,transparent_11px)]';

export default function WorkspaceCalendar({ onNavigate }: { onNavigate?: (section: string, sub: string) => void } = {}) {
  const { session, roles } = useAuth();
  const { toast } = useToast();
  const { canManage, canView } = useAccess();
  const canEdit = canManage('calendar');
  // ═══════════════════════════════════════════════════════════════════
  // EDITING AN EVENT FROM THE CALENDAR EDITS THE EVENT, and needs both
  // permissions: adding a calendar entry and changing an association
  // event are different powers, and the events endpoint enforces its own
  // list of roles.
  // ═══════════════════════════════════════════════════════════════════
  const canEditEvents = canEdit && canManage('events-create');
  const canOpenForms = canManage('events-forms') && !!onNavigate;
  // An advisor pays no membership fee, so no fee deadline is theirs.
  const feeExempt = isFeeExempt((roles || []).map((r) => r.role));
  const wide = useMedia('(min-width: 640px)');

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CalItem[]>([]);
  const [registered, setRegistered] = useState<Set<string>>(new Set());
  const [waiting, setWaiting] = useState<Set<string>>(new Set());
  const [places, setPlaces] = useState<Record<string, EventPlaces | null>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [detail, setDetail] = useState<CalItem | null>(null);

  const [cursor, setCursor] = useState(() => `${todayYmd().slice(0, 7)}-01`);
  const [selected, setSelected] = useState<string | null>(todayYmd());
  const [view, setView] = useStoredChoice<View>('mims.zoom.workspace', VIEWS, typeof window !== 'undefined' && window.innerWidth < 640 ? 'agenda' : 'month');
  const [hidden, setHidden] = useState<Set<Category>>(new Set());
  const [showEarlier, setShowEarlier] = useState(false);

  const [entryForm, setEntryForm] = useState<EntryForm | null>(null);
  const [savingEntry, setSavingEntry] = useState(false);
  const [eventForm, setEventForm] = useState<{ event: EventRow; title: string; date: string; time: string; endTime: string; place: string } | null>(null);
  const [savingEvent, setSavingEvent] = useState(false);
  const [examSessions, setExamSessions] = useState<ExamSession[]>([]);
  const [examDialogOpen, setExamDialogOpen] = useState(false);
  const [examForm, setExamForm] = useState({ label: '', start_date: '', end_date: '' });
  const [savingExam, setSavingExam] = useState(false);

  // ── Loading ─────────────────────────────────────────────────────────
  const loadPlaces = async (events: EventRow[]) => {
    const want = events.filter((e) => e.registration_enabled && !e.aod_day_id && e.capacity && !isOver(e));
    if (!want.length) return;
    const got = await Promise.all(want.map(async (e) => [e.id, await eventPlaces(e.id)] as const));
    setPlaces((p) => ({ ...p, ...Object.fromEntries(got) }));
  };

  const load = async () => {
    try {
      const [events, regIds, entries, exams] = await Promise.all([
        listEvents(), myEventRegistrationIds(), listCalendarEntries().catch(() => []),
        listExamSessions().catch(() => [] as ExamSession[]),
      ]);
      setRegistered(regIds);
      myEventWaitlistIds().then(setWaiting);
      setExamSessions(exams);
      const out: CalItem[] = [];
      // An Association on Display day also has an event (for attendance);
      // the day is drawn from `aod_days`, so its event is skipped here.
      for (const e of events) {
        if (e.aod_day_id) continue;
        const d = eventDay(e);
        if (d) out.push({ key: `e-${e.id}`, date: d, kind: 'event', title: e.title, sort: e.start_at || `${d}T00:00`, event: e });
      }
      for (const c of entries) out.push({ key: `c-${c.id}`, date: c.entry_date.slice(0, 10), kind: 'custom', title: c.title, sort: `${c.entry_date.slice(0, 10)}T00:01`, entry: c });
      const { data: aod } = await sb.from('aod_days').select('id, event_date');
      for (const a of (aod || []) as { id?: string; event_date: string }[]) {
        out.push({ key: `a-${a.id ?? a.event_date}`, date: a.event_date, kind: 'aod', title: 'Association on Display', sort: `${a.event_date}T00:02` });
      }
      // Alumni calls are labelled by the ORGANISING DIVISION: a call can
      // invite several alumni, and a single alumnus name may be empty.
      const { data: calls } = await sb.from('alumni_calls').select('planned_date, division');
      (calls || []).forEach((c: { planned_date: string | null; division: OrgDivision | null }, i: number) => {
        if (c.planned_date) out.push({ key: `l-${i}`, date: c.planned_date.slice(0, 10), kind: 'alumni', title: c.division ? `Alumni call: ${divisionLabels[c.division]}` : 'Alumni call', sort: `${c.planned_date}T00:03` });
      });
      const { data: settings } = await sb.from('application_settings').select('start_date, end_date, semester_label').limit(1).maybeSingle();
      if (settings?.start_date) out.push({ key: 'app-open', date: settings.start_date.slice(0, 10), kind: 'application', title: 'Applications open', note: `Recruiting for ${settings.semester_label}`, sort: `${settings.start_date.slice(0, 10)}T00:04` });
      if (settings?.end_date) out.push({ key: 'app-close', date: settings.end_date.slice(0, 10), kind: 'application', title: 'Applications close', note: `Recruiting for ${settings.semester_label}`, sort: `${settings.end_date.slice(0, 10)}T00:04` });

      // Membership fee: association-wide, never an advisor's.
      const { data: fee } = feeExempt
        ? { data: null }
        : await sb.from('fee_periods').select('*').eq('closed', false).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (fee?.first_deadline) {
        out.push({ key: 'fee-1', date: fee.first_deadline.slice(0, 10), kind: 'fee', title: 'Membership fee deadline', note: fee.semester_label, sort: `${fee.first_deadline.slice(0, 10)}T00:05` });
        // The final deadline appears once the first has passed, and only
        // to a member who has not yet paid.
        if (fee.second_deadline) {
          const firstPassed = todayYmd() > fee.first_deadline.slice(0, 10);
          let unpaid = false;
          if (firstPassed && session?.user?.id) {
            const { data: me } = await sb.from('members').select('id').eq('user_id', session.user.id).maybeSingle();
            if (me?.id) {
              const { data: myFee } = await sb.from('membership_fees').select('paid').eq('period_id', fee.id).eq('member_id', me.id).maybeSingle();
              unpaid = !!myFee && !myFee.paid;
            }
          }
          if (unpaid) out.push({ key: 'fee-2', date: fee.second_deadline.slice(0, 10), kind: 'fee', title: 'Membership fee: final deadline', note: fee.semester_label, sort: `${fee.second_deadline.slice(0, 10)}T00:05` });
        }
      }
      out.sort((a, b) => (a.date === b.date ? a.sort.localeCompare(b.sort) : a.date.localeCompare(b.date)));
      setItems(out);
      loadPlaces(events).catch(() => undefined);
    } catch (e) { toast({ title: 'Failed to load calendar', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setLoading(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [session]);

  // ── Derived ─────────────────────────────────────────────────────────
  const stateOf = (it: CalItem): RegState | undefined =>
    it.event ? regState(it.event, registered, waiting, places[it.event.id]) : undefined;

  const visible = useMemo(() => items.filter((it) => !hidden.has(categoryOf(it))), [items, hidden]);
  const byDate = useMemo(() => {
    const m: Record<string, CalItem[]> = {};
    for (const it of visible) (m[it.date] ??= []).push(it);
    return m;
  }, [visible]);

  const monthItems = useMemo(() => items.filter((it) => sameMonth(it.date, cursor)), [items, cursor]);
  const countIn = (c: Category) => monthItems.filter((it) => categoryOf(it) === c).length;

  const holidayByDate = useMemo(() => {
    const y = Number(cursor.slice(0, 4));
    const m: Record<string, string> = {};
    for (const yr of [y - 1, y, y + 1]) for (const h of italianHolidays(yr)) m[h.date] = h.label;
    return m;
  }, [cursor]);

  const registration = useMemo(() => {
    const open: OpenEvent[] = [];
    const mine: OpenEvent[] = [];
    for (const it of items) {
      if (!it.event || isOver(it.event)) continue;
      const st = regState(it.event, registered, waiting, places[it.event.id]);
      const row = { event: it.event, state: st, places: places[it.event.id] ?? null };
      if (st === 'open' || st === 'full') open.push(row);
      else if (st === 'registered' || st === 'waiting') mine.push(row);
    }
    return { open, mine };
  }, [items, registered, waiting, places]);

  // ── Registering ─────────────────────────────────────────────────────
  const refreshPlaces = async (id: string) => {
    const p = await eventPlaces(id);
    setPlaces((m) => ({ ...m, [id]: p }));
  };

  const doRegister = async (ev: EventRow) => {
    setBusyId(ev.id);
    try {
      const res = await registerForEvent(session, { event_id: ev.id }) as { waitlisted?: boolean; position?: number | null };
      if (res?.waitlisted) {
        setWaiting((p) => new Set(p).add(ev.id));
        toast({ title: 'You are on the waiting list', description: `${ev.title} is full${res.position ? `: you are number ${res.position}` : ''}. If a place opens up you are registered and emailed at once.` });
      } else {
        setRegistered((p) => new Set(p).add(ev.id));
        toast({ title: `Registered for ${ev.title}`, description: 'Your confirmation, with your entry code, is on its way to your inbox.' });
      }
      if (ev.capacity) refreshPlaces(ev.id).catch(() => undefined);
    } catch (e) { toast({ title: 'Could not register', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setBusyId(null); }
  };

  // "Can't make it": your registration, or your place in the queue.
  const doCancel = async (ev: EventRow) => {
    setCancelling(true);
    try {
      const res = await cancelMyRegistration(session, ev.id);
      const drop = (p: Set<string>) => { const n = new Set(p); n.delete(ev.id); return n; };
      setRegistered(drop);
      setWaiting(drop);
      toast({ title: res.cancelled === 'waitlist' ? 'You have left the waiting list' : 'Registration cancelled', description: res.cancelled === 'waitlist' ? undefined : 'Thank you for letting us know: your place can go to somebody else.' });
      if (ev.capacity) refreshPlaces(ev.id).catch(() => undefined);
    } catch (e) { toast({ title: 'Could not cancel', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setCancelling(false); }
  };

  const openEvent = (ev: EventRow) => {
    const it = items.find((x) => x.event?.id === ev.id);
    if (it) setDetail(it);
  };

  // ── Entries, events and breaks (editing roles) ──────────────────────
  const saveEntry = async () => {
    if (!entryForm) return;
    if (!entryForm.title.trim()) { toast({ title: 'A title is required', variant: 'destructive' }); return; }
    if (!entryForm.entry_date) { toast({ title: 'A date is required', variant: 'destructive' }); return; }
    // Meetings and socials cannot land in an exam session break or on a
    // national holiday (the database enforces this too).
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
      toast({ title: entryForm.id ? 'Entry updated' : 'Entry added' });
      setEntryForm(null);
      await load();
    } catch (e) { toast({ title: 'Could not save', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setSavingEntry(false); }
  };

  const removeEntry = async () => {
    if (!entryForm?.id) return;
    try { await deleteCalendarEntry(session, entryForm.id); toast({ title: 'Entry removed' }); setEntryForm(null); await load(); }
    catch (e) { toast({ title: 'Could not remove', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
  };

  const splitWhen = (iso: string | null, fallbackDate: string) => {
    const w = romeWall(iso);
    return w.date ? w : { date: fallbackDate, time: '' };
  };

  const openEventEdit = (event: EventRow) => {
    const start = splitWhen(event.start_at, (event.date || '').slice(0, 10));
    const end = splitWhen(event.end_at, start.date);
    setDetail(null);
    setEventForm({ event, title: event.title ?? '', date: start.date, time: start.time, endTime: event.end_at ? end.time : '', place: event.place ?? '' });
  };

  const saveEventEdits = async () => {
    if (!eventForm) return;
    const { event, title, date, time, endTime, place } = eventForm;
    if (!title.trim()) { toast({ title: 'A title is required', variant: 'destructive' }); return; }
    if (!date) { toast({ title: 'A date is required', variant: 'destructive' }); return; }
    if (!place.trim()) { toast({ title: 'A place is required', variant: 'destructive' }); return; }
    if (endTime && !time) { toast({ title: 'Give a start time before an end time', variant: 'destructive' }); return; }
    // A wall-clock time typed on Rome's clock becomes an instant here, once.
    const start_at = time ? romeWallToIso(date, time) : null;
    let end_at: string | null = null;
    if (endTime) {
      end_at = romeWallToIso(date, endTime);
      // An end before the start is an event that runs past midnight.
      if (start_at && end_at && end_at <= start_at) {
        const next = new Date(`${date}T12:00:00Z`);
        next.setUTCDate(next.getUTCDate() + 1);
        end_at = romeWallToIso(next.toISOString().slice(0, 10), endTime);
      }
    }
    setSavingEvent(true);
    try {
      // THE WHOLE EVENT IS SENT, not the four edited fields: the endpoint
      // writes every column it is given, so a partial payload would blank
      // the poster, the guests and the registration settings.
      await saveEvent(session, { ...event, title: title.trim(), date, place: place.trim(), start_at, end_at });
      toast({ title: 'Event updated', description: 'The change applies everywhere the event appears, including its registration form.' });
      setEventForm(null);
      await load();
    } catch (e) {
      toast({ title: 'Could not update the event', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setSavingEvent(false); }
  };

  const openEntryEdit = (c: CalendarEntry) => {
    setDetail(null);
    setEntryForm({ id: c.id, title: c.title, description: c.description ?? '', entry_date: c.entry_date.slice(0, 10), entry_type: c.entry_type, location: c.location ?? '' });
  };

  const addOn = (date: string) => {
    if (!canEdit) return;
    setEntryForm(emptyEntry(date));
  };

  const saveExam = async () => {
    if (!examForm.label.trim()) { toast({ title: 'A label is required', description: 'e.g. Winter exam session', variant: 'destructive' }); return; }
    if (!examForm.start_date || !examForm.end_date || examForm.end_date < examForm.start_date) {
      toast({ title: 'Choose a valid date range', variant: 'destructive' }); return;
    }
    setSavingExam(true);
    try {
      await saveExamSession(session, { label: examForm.label.trim(), start_date: examForm.start_date, end_date: examForm.end_date });
      toast({ title: 'Exam session added', description: 'No events can be scheduled on those days, on any workspace calendar.' });
      setExamForm({ label: '', start_date: '', end_date: '' });
      await load();
    } catch (e) { toast({ title: 'Could not save', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setSavingExam(false); }
  };

  const removeExam = async (ex: ExamSession) => {
    try { await deleteExamSession(ex.id); toast({ title: 'Exam session removed' }); await load(); }
    catch (e) { toast({ title: 'Could not remove', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
  };

  if (loading) return <div><WorkspacePageHeader title="Calendar" description="Everything the association has on, and the events you can register for." /><WorkspaceLoader /></div>;

  const today = todayYmd();
  const categories = CATEGORY_ORDER;

  // ── One day's markers: holiday, exam break ─────────────────────────
  const dayNotes = (d: string) => {
    const brk = examSessionOn(examSessions, d);
    const hol = holidayByDate[d];
    return { brk, hol };
  };

  // ── Month view: the inside of a day ─────────────────────────────────
  const renderDay = (d: string) => {
    const list = byDate[d] || [];
    const { brk, hol } = dayNotes(d);
    if (!wide) {
      // Phone: dots, one per kind of thing that day.
      const cats = Array.from(new Set(list.map(categoryOf))).slice(0, 3);
      return (
        <span className="mt-1 flex h-2 items-center gap-0.5" aria-hidden>
          {cats.map((c) => <span key={c} className={`h-1.5 w-1.5 rounded-full ${CATEGORY[c].dot}`} />)}
          {!cats.length && hol && <span className="h-1.5 w-1.5 rounded-full bg-red-500" />}
        </span>
      );
    }
    const max = hol || (brk && d === brk.start_date) ? 2 : 3;
    const shown = list.slice(0, max);
    const more = list.length - shown.length;
    return (
      <div className="mt-1 flex flex-1 flex-col gap-1">
        {hol && <span className="truncate text-[11px] font-medium leading-tight text-red-700" title={`${hol}: Italian public holiday, no events on this day`}>{hol}</span>}
        {brk && (d === brk.start_date || new Date(`${d}T12:00:00Z`).getUTCDay() === 1) && (
          <span className="truncate text-[11px] leading-tight text-muted-foreground" title={`${brk.label}: exam session break, no events on this day`}>{brk.label}</span>
        )}
        {shown.map((it) => <ItemChip key={it.key} item={it} state={stateOf(it)} onOpen={() => setDetail(it)} />)}
        {more > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <button data-ro type="button" onClick={(e) => e.stopPropagation()} className="self-start px-1 text-[12px] font-medium text-accent hover:underline">
                +{more} more
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 p-3 font-body" onClick={(e) => e.stopPropagation()}>
              <p className="mb-2 font-serif text-base text-accent">{longDay(d)}</p>
              <div className="flex flex-col gap-1">
                {list.map((it) => <ItemChip key={it.key} item={it} state={stateOf(it)} onOpen={() => setDetail(it)} />)}
              </div>
            </PopoverContent>
          </Popover>
        )}
        {canEdit && !hol && !brk && (
          <button
            type="button" onClick={(e) => { e.stopPropagation(); addOn(d); }}
            aria-label={`Add an entry on ${longDay(d)}`} title="Add an entry on this day"
            className="absolute right-1 top-1 hidden h-6 w-6 items-center justify-center text-muted-foreground opacity-0 transition-opacity hover:bg-accent/10 hover:text-accent focus-visible:opacity-100 group-hover/day:opacity-100 sm:flex"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  };

  const dayClass = (d: string) => {
    const { brk, hol } = dayNotes(d);
    return `group/day ${hol ? '!bg-red-50' : ''} ${brk ? BREAK_BG : ''}`;
  };

  const dayLabel = (d: string) => {
    const n = (byDate[d] || []).length;
    const { brk, hol } = dayNotes(d);
    return [n ? `${n} ${n === 1 ? 'item' : 'items'}` : 'nothing on', hol ? `${hol}, public holiday` : '', brk ? `${brk.label}, exam session break` : ''].filter(Boolean).join(', ');
  };

  // ── Agenda: a list by day ───────────────────────────────────────────
  const agendaDays = (() => {
    const days = new Set<string>();
    for (const it of visible) if (sameMonth(it.date, cursor)) days.add(it.date);
    for (const d of Object.keys(holidayByDate)) if (sameMonth(d, cursor)) days.add(d);
    return [...days].sort();
  })();
  const isThisMonth = sameMonth(cursor, today);
  const earlierDays = isThisMonth ? agendaDays.filter((d) => d < today) : [];
  const listedDays = isThisMonth && !showEarlier ? agendaDays.filter((d) => d >= today) : agendaDays;

  const renderDayList = (d: string, withHeader = true) => {
    const list = byDate[d] || [];
    const { brk, hol } = dayNotes(d);
    const rel = relativeDay(d, today);
    return (
      <section key={d} aria-label={longDay(d)} className="border-b border-separator last:border-b-0">
        {withHeader && (
          <h3 className={`sticky top-0 z-[1] flex flex-wrap items-baseline gap-x-2 bg-muted/60 px-4 py-2 font-body text-[13px] backdrop-blur ${d === today ? 'text-accent' : 'text-foreground'}`}>
            <span className="font-semibold">{rel === 'Today' || rel === 'Tomorrow' || rel === 'Yesterday' ? rel : shortDay(d)}</span>
            <span className="text-muted-foreground">{longDay(d)}</span>
            {hol && <span className="text-red-700">{hol} (public holiday)</span>}
            {brk && <span className="text-muted-foreground">{brk.label} (exam break)</span>}
          </h3>
        )}
        {list.length === 0 ? (
          <p className="px-4 py-3 font-body text-[13px] text-muted-foreground">Nothing on this day.{hol ? ' No events are held on public holidays.' : ''}</p>
        ) : (
          <div className="divide-y divide-separator">
            {list.map((it) => {
              const st = stateOf(it);
              return (
                <AgendaRow
                  key={it.key} item={it} state={st}
                  placesText={it.event ? placesLine(places[it.event.id]) : ''}
                  onOpen={() => setDetail(it)}
                  action={it.event && st ? <RegisterButton state={st} busy={busyId === it.event.id} onClick={() => doRegister(it.event!)} /> : undefined}
                />
              );
            })}
          </div>
        )}
      </section>
    );
  };

  const detailEvent = detail?.event;
  const detailState = detail ? stateOf(detail) : undefined;

  return (
    <div>
      <WorkspacePageHeader
        title="Calendar"
        description="Everything the association has on, and the events you can register for."
        actionColumns="row"
        actions={canEdit ? (
          <>
            <Button variant="outline" className="font-body h-9" onClick={() => setExamDialogOpen(true)}>
              <CalendarClock className="h-4 w-4" />Exam sessions
            </Button>
            <Button variant="solid" className="font-body h-9" onClick={() => setEntryForm(emptyEntry(selected && selected >= today ? selected : today))}>
              <Plus className="h-4 w-4" />Add entry
            </Button>
          </>
        ) : undefined}
      />

      <RegistrationPanel
        open={registration.open}
        mine={registration.mine}
        busyId={busyId}
        onRegister={doRegister}
        onOpen={openEvent}
      />

      <section aria-label="Calendar" className="space-y-3">
        <CalendarToolbar
          cursor={cursor}
          onCursor={(d) => { setCursor(`${d.slice(0, 7)}-01`); setShowEarlier(false); }}
          views={[
            { value: 'month', label: 'Month', icon: <CalendarDays className="h-4 w-4" /> },
            { value: 'agenda', label: 'Agenda', icon: <List className="h-4 w-4" /> },
          ]}
          view={view}
          onView={setView}
          extra={<HelpDot page="calendar" topic="colors" />}
        />

        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 [&>*]:shrink-0" role="group" aria-label="Show on the calendar">
          {categories.map((c) => (
            <FilterChip
              key={c}
              active={!hidden.has(c)}
              onToggle={() => setHidden((h) => { const n = new Set(h); if (n.has(c)) n.delete(c); else n.add(c); return n; })}
              swatch={CATEGORY[c].bar}
              icon={CATEGORY[c].icon('h-3.5 w-3.5')}
              label={CATEGORY[c].label}
              count={countIn(c)}
            />
          ))}
          <span className="inline-flex h-8 items-center gap-1.5 px-2 font-body text-[13px] text-muted-foreground">
            <span aria-hidden className="h-2.5 w-2.5 bg-red-200" />Public holiday
          </span>
          <span className="inline-flex h-8 items-center gap-1.5 px-2 font-body text-[13px] text-muted-foreground">
            <span aria-hidden className={`h-2.5 w-3.5 border border-separator ${BREAK_BG}`} />Exam break
          </span>
          <span className="inline-flex h-8 items-center gap-1.5 px-2 font-body text-[13px] text-muted-foreground">
            <Ticket aria-hidden className="h-3.5 w-3.5 text-accent" />Open to register
          </span>
          <span className="inline-flex h-8 items-center gap-1.5 px-2 font-body text-[13px] text-muted-foreground">
            <CircleCheck aria-hidden className="h-3.5 w-3.5 text-emerald-700" />Registered
          </span>
          <span className="inline-flex h-8 items-center gap-1.5 px-2 font-body text-[13px] text-muted-foreground">
            <Hourglass aria-hidden className="h-3.5 w-3.5 text-amber-700" />Waiting list
          </span>
        </div>

        {view === 'month' ? (
          <div className="space-y-4">
            <MonthGrid
              cursor={cursor}
              selected={selected}
              onSelect={setSelected}
              onCursor={(d) => setCursor(`${d.slice(0, 7)}-01`)}
              renderDay={(d) => renderDay(d)}
              dayClass={(d) => dayClass(d)}
              dayLabel={dayLabel}
              onDayDoubleClick={canEdit ? (d) => { if (!dayNotes(d).hol && !dayNotes(d).brk) addOn(d); } : undefined}
              compact={!wide}
            />
            {/* On a phone the grid shows dots; the chosen day is listed below it. */}
            {!wide && selected && (
              <div className="border border-separator">
                {renderDayList(selected)}
              </div>
            )}
          </div>
        ) : (
          <div className="border border-separator">
            {earlierDays.length > 0 && (
              <button data-ro type="button" onClick={() => setShowEarlier((v) => !v)}
                className="w-full border-b border-separator bg-muted/30 px-4 py-2 text-left font-body text-[13px] text-accent hover:bg-muted/50">
                {showEarlier ? 'Hide the earlier days of this month' : `Show the earlier days of ${monthTitle(cursor)} (${earlierDays.length})`}
              </button>
            )}
            {listedDays.length === 0 ? (
              <div className="p-4">
                <EmptyState icon={<CalendarX2 className="h-5 w-5" />} title={`Nothing more in ${monthTitle(cursor)}`}>
                  {hidden.size ? 'Some kinds of item are hidden by the filters above.' : 'Use the arrows to look at the next month.'}
                </EmptyState>
              </div>
            ) : listedDays.map((d) => renderDayList(d))}
          </div>
        )}
      </section>

      <ItemDetailSheet
        item={detail}
        state={detailState}
        places={detailEvent ? places[detailEvent.id] : null}
        busy={!!detailEvent && busyId === detailEvent.id}
        cancelling={cancelling}
        onClose={() => setDetail(null)}
        onRegister={() => detailEvent && doRegister(detailEvent)}
        onCancel={() => detailEvent && doCancel(detailEvent)}
        canEditEvent={canEditEvents}
        onEditEvent={() => detailEvent && openEventEdit(detailEvent)}
        canEditEntry={canEdit}
        onEditEntry={() => detail?.entry && openEntryEdit(detail.entry)}
        canOpenForms={canOpenForms}
        onOpenForms={() => { setDetail(null); onNavigate?.('events', 'events-forms'); }}
        onOpenAod={onNavigate && canView('events-on-display') ? () => { setDetail(null); onNavigate('events', 'events-on-display'); } : undefined}
      />

      {/* ═══════════════════════════════════════════════════════════════
          EDIT AN EVENT, FROM THE CALENDAR: its name, when it starts and
          ends, and where. Everything else stays on the Events pages and
          is carried through this save untouched.
          ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={!!eventForm} onOpenChange={(o) => !o && setEventForm(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">Edit event</DialogTitle>
            <DialogDescription className="font-body">
              These are the event's own details. Changing them here changes them everywhere the event appears, including its registration form and the public website.
            </DialogDescription>
          </DialogHeader>
          {eventForm && (
            <div className="space-y-3 font-body">
              <div className="space-y-1">
                <Label>Name *</Label>
                <Input value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Date *</Label>
                  <Input type="date" value={eventForm.date} onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Start</Label>
                  <Input type="time" value={eventForm.time} onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>End</Label>
                  <Input type="time" value={eventForm.endTime} onChange={(e) => setEventForm({ ...eventForm, endTime: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Place *</Label>
                <Input value={eventForm.place} onChange={(e) => setEventForm({ ...eventForm, place: e.target.value })} placeholder="e.g. Room 3-E4-SR03, Via Roentgen 1" />
              </div>
              <p className="text-xs text-muted-foreground">
                Times are Rome time ({zoneOnDate(eventForm.date || new Date().toISOString())}). Leave them empty for an all-day event. {EVENT_TYPE_LABELS[eventForm.event.event_type]}
                {eventForm.event.registration_enabled ? ' · registration is open for this event' : ''}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button variant="solid" onClick={saveEventEdits} disabled={savingEvent} className="font-body">
                  {savingEvent ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Save changes
                </Button>
                <Button variant="outline" onClick={() => setEventForm(null)} disabled={savingEvent} className="font-body">Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
              {entryForm.entry_date && (examSessionOn(examSessions, entryForm.entry_date) || italianHolidayOn(entryForm.entry_date)) && ['meeting', 'social'].includes(entryForm.entry_type) && (
                <p className="text-xs text-destructive border border-destructive/30 bg-destructive/5 p-2">
                  This day is {italianHolidayOn(entryForm.entry_date) ? 'a public holiday' : 'in an exam session break'}: meetings and socials cannot be scheduled on it. Deadlines and reminders can.
                </p>
              )}
              {(entryForm.entry_type === 'casa_committee' || entryForm.entry_type === 'casa_deadline') && (
                <p className="text-xs text-muted-foreground border border-separator bg-muted/40 p-2">
                  CASA Committee meetings and request deadlines are visible ONLY to the members of the board of
                  directors (and the admin account). Other members never see this entry on the calendar.
                </p>
              )}
              <div className="space-y-1"><Label>Location</Label><Input value={entryForm.location} onChange={(e) => setEntryForm({ ...entryForm, location: e.target.value })} placeholder="e.g. Room N01 / online" /></div>
              <div className="space-y-1"><Label>Description</Label><Textarea rows={3} value={entryForm.description} onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })} placeholder="Anything the team should know" /></div>
              <div className="flex gap-3 pt-1">
                <Button variant="solid" className="flex-1" onClick={saveEntry} disabled={savingEntry}>{savingEntry ? <><Loader2 className="h-4 w-4 animate-spin" />Saving</> : 'Save'}</Button>
                {entryForm.id && <Button variant="destructive" size="icon" onClick={removeEntry} aria-label="Remove this entry"><Trash2 className="h-4 w-4" /></Button>}
                <Button variant="outline" onClick={() => setEntryForm(null)}>Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Exam session breaks (editing roles only). */}
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
                      <div className="text-xs text-muted-foreground">{longDay(ex.start_date)} to {longDay(ex.end_date)}</div>
                    </div>
                    <Button variant="outline" size="icon" className="h-8 w-8 text-destructive border-destructive/40" onClick={() => removeExam(ex)} aria-label={`Remove ${ex.label}`}>
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
              <Button variant="solid" className="flex-1" onClick={saveExam} disabled={savingExam}>{savingExam ? <><Loader2 className="h-4 w-4 animate-spin" />Saving</> : 'Add exam session'}</Button>
              <Button variant="outline" onClick={() => setExamDialogOpen(false)}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

