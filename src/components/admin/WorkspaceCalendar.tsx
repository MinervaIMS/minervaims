import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CalendarClock, Loader2, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { listEvents, registerForEvent, myEventRegistrationIds, EVENT_TYPE_LABELS, AUDIENCE_LABELS, type EventRow } from '@/lib/events-api';

type Kind = 'event' | 'aod' | 'alumni' | 'application' | 'fee';
type Item = { date: string; label: string; kind: Kind; event?: EventRow };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as unknown as { from: (t: string) => any };

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const monthKey = (y: number, m: number) => `m-${y}-${m}`;

export default function WorkspaceCalendar() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [registered, setRegistered] = useState<Set<string>>(new Set());
  const [regEvent, setRegEvent] = useState<EventRow | null>(null);
  const [registering, setRegistering] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const [events, regIds] = await Promise.all([listEvents(), myEventRegistrationIds()]);
        setRegistered(regIds);
        const out: Item[] = [];
        for (const e of events) { const d = (e.start_at || e.date)?.slice(0, 10); if (d) out.push({ date: d, label: e.title, kind: 'event', event: e }); }
        const { data: aod } = await sb.from('aod_days').select('event_date');
        for (const a of (aod || []) as { event_date: string }[]) out.push({ date: a.event_date, label: 'Association on Display', kind: 'aod' });
        const { data: calls } = await sb.from('alumni_calls').select('planned_date, alumnus_name');
        for (const c of (calls || []) as { planned_date: string | null; alumnus_name: string }[]) if (c.planned_date) out.push({ date: c.planned_date, label: `Alumni call: ${c.alumnus_name}`, kind: 'alumni' });
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
            if (unpaid) out.push({ date: fee.second_deadline.slice(0, 10), label: `Membership fee — final deadline (${fee.semester_label})`, kind: 'fee' });
          }
        }
        setItems(out);
      } catch (e) { toast({ title: 'Failed to load calendar', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
      finally { setLoading(false); }
    })();
  }, [toast, session]);

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

  const kindColor = (k: Kind) =>
    k === 'event' ? 'bg-accent/10 text-accent'
      : k === 'aod' ? 'bg-amber-100 text-amber-800'
      : k === 'alumni' ? 'bg-emerald-100 text-emerald-800'
      : k === 'fee' ? 'bg-rose-100 text-rose-800'
      : 'bg-blue-100 text-blue-800';

  const doRegister = async () => {
    if (!regEvent) return;
    setRegistering(true);
    try {
      await registerForEvent(session, { event_id: regEvent.id });
      setRegistered((p) => new Set(p).add(regEvent.id));
      toast({ title: 'Registered' });
      setRegEvent(null);
    } catch (e) { toast({ title: 'Could not register', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setRegistering(false); }
  };

  if (loading) return <div><WorkspacePageHeader title="Calendar" description="Events, deadlines and meetings." /><WorkspaceLoader /></div>;

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
      <WorkspacePageHeader title="Calendar" description="Association events, Association on Display, alumni calls, application periods and the membership fee deadline. Scroll to move through the months. Click an event with open registration to sign up or check your status." />

      <div className="flex items-center justify-end mb-3">
        <Button variant="outline" size="sm" onClick={jumpToToday}>Jump to today</Button>
      </div>

      <div className="flex flex-wrap gap-4 mb-3 text-xs text-muted-foreground font-body">
        <span><span className="inline-block w-3 h-3 rounded-sm bg-accent/20 mr-1 align-middle" />Event</span>
        <span><span className="inline-block w-3 h-3 rounded-sm bg-amber-200 mr-1 align-middle" />Association on Display</span>
        <span><span className="inline-block w-3 h-3 rounded-sm bg-emerald-200 mr-1 align-middle" />Alumni call</span>
        <span><span className="inline-block w-3 h-3 rounded-sm bg-blue-200 mr-1 align-middle" />Applications</span>
        <span><span className="inline-block w-3 h-3 rounded-sm bg-rose-200 mr-1 align-middle" />Membership fee</span>
      </div>

      <div ref={scrollRef} className="max-h-[72vh] overflow-y-auto border border-separator">
        {months.map(({ year, month }) => (
          <section key={monthKey(year, month)} id={monthKey(year, month)} className="border-b border-separator last:border-b-0">
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur px-3 py-2 border-b border-separator">
              <h2 className="font-serif text-2xl text-accent">{new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
            </div>
            <div className="grid grid-cols-7 gap-px bg-separator font-body">
              {WEEKDAYS.map((d) => <div key={d} className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider px-2 py-1 text-center">{d}</div>)}
              {monthCells(year, month).map((date, i) => (
                <div key={i} className={`bg-background min-h-[92px] p-1.5 align-top ${date === todayStr ? 'ring-1 ring-accent ring-inset' : ''}`}>
                  {date && <>
                    <div className={`text-sm mb-1 ${date === todayStr ? 'text-accent' : 'text-muted-foreground'}`}>{parseInt(date.slice(-2), 10)}</div>
                    <div className="space-y-1">
                      {(itemsByDate[date] || []).map((it, j) => {
                        const isEvent = it.kind === 'event' && !!it.event;
                        const clickable = isEvent && it.event!.registration_enabled;
                        const isReg = isEvent && registered.has(it.event!.id);
                        return (
                          <button key={j} disabled={!clickable} onClick={() => clickable && setRegEvent(it.event!)}
                            title={isEvent ? EVENT_TYPE_LABELS[it.event!.event_type] : it.label}
                            className={`flex items-center gap-1 w-full text-left text-xs leading-tight px-1.5 py-0.5 rounded truncate ${kindColor(it.kind)} ${clickable ? 'cursor-pointer' : 'cursor-default'}`}>
                            {isReg && <Check className="h-3 w-3 shrink-0" />}
                            <span className="truncate">{it.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </>}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

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
              ) : (
                <Button className="w-full" onClick={doRegister} disabled={registering}>
                  {registering ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Registering</> : 'Register for this event'}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
