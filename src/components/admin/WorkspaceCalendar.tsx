import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { listEvents, registerForEvent, myEventRegistrationIds, EVENT_TYPE_LABELS, type EventRow } from '@/lib/events-api';

type Item = { date: string; label: string; kind: 'event' | 'aod' | 'alumni' | 'application'; event?: EventRow };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as unknown as { from: (t: string) => any };

export default function WorkspaceCalendar() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [registered, setRegistered] = useState<Set<string>>(new Set());
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [regEvent, setRegEvent] = useState<EventRow | null>(null);
  const [registering, setRegistering] = useState(false);

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
        setItems(out);
      } catch (e) { toast({ title: 'Failed to load calendar', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
      finally { setLoading(false); }
    })();
  }, [toast]);

  const monthDays = useMemo(() => {
    const year = cursor.getFullYear(), month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const startDow = (first.getDay() + 6) % 7; // Monday-first
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (string | null)[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    return cells;
  }, [cursor]);

  const itemsByDate = useMemo(() => {
    const map: Record<string, Item[]> = {};
    for (const it of items) (map[it.date] ??= []).push(it);
    return map;
  }, [items]);

  const kindColor = (k: Item['kind']) => k === 'event' ? 'bg-accent/10 text-accent' : k === 'aod' ? 'bg-amber-100 text-amber-800' : k === 'alumni' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800';

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

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <WorkspacePageHeader title="Calendar" description="Association events, Association on Display, alumni calls and application periods. Click an event that needs registration to sign up." />

      <div className="flex items-center justify-between mb-4 font-body">
        <h2 className="font-serif text-xl text-accent">{cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => { const d = new Date(); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)); }}>Today</Button>
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-separator border border-separator font-body text-sm">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider px-2 py-1 text-center">{d}</div>)}
        {monthDays.map((date, i) => (
          <div key={i} className={`bg-background min-h-[96px] p-1.5 align-top ${date === todayStr ? 'ring-1 ring-accent ring-inset' : ''}`}>
            {date && <>
              <div className="text-xs text-muted-foreground mb-1">{parseInt(date.slice(-2), 10)}</div>
              <div className="space-y-1">
                {(itemsByDate[date] || []).map((it, j) => {
                  const clickable = it.kind === 'event' && it.event?.registration_enabled && !registered.has(it.event.id);
                  return (
                    <button key={j} disabled={!clickable} onClick={() => clickable && setRegEvent(it.event!)}
                      title={it.kind === 'event' ? EVENT_TYPE_LABELS[it.event!.event_type] : it.label}
                      className={`block w-full text-left text-[11px] leading-tight px-1.5 py-0.5 rounded truncate ${kindColor(it.kind)} ${clickable ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'}`}>
                      {it.label}{it.kind === 'event' && registered.has(it.event!.id) ? ' ✓' : ''}
                    </button>
                  );
                })}
              </div>
            </>}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground font-body">
        <span><span className="inline-block w-3 h-3 rounded-sm bg-accent/20 mr-1 align-middle" />Event</span>
        <span><span className="inline-block w-3 h-3 rounded-sm bg-amber-200 mr-1 align-middle" />Association on Display</span>
        <span><span className="inline-block w-3 h-3 rounded-sm bg-emerald-200 mr-1 align-middle" />Alumni call</span>
        <span><span className="inline-block w-3 h-3 rounded-sm bg-blue-200 mr-1 align-middle" />Applications</span>
      </div>

      <Dialog open={!!regEvent} onOpenChange={(o) => !o && setRegEvent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">{regEvent?.title}</DialogTitle>
            <DialogDescription className="font-body">
              {regEvent && new Date(regEvent.start_at || regEvent.date).toLocaleString()} · {regEvent?.place}
            </DialogDescription>
          </DialogHeader>
          {regEvent?.description && <p className="font-body text-sm text-muted-foreground">{regEvent.description}</p>}
          <Button className="font-body" onClick={doRegister} disabled={registering}>
            {registering ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Registering</> : 'Register for this event'}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
