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
import { DIVISION_LABELS, type OrgDivision } from '@/lib/deadlines-api';

type Kind = 'event' | 'aod' | 'alumni' | 'application' | 'deadline';
type Item = {
  date: string;
  label: string;
  kind: Kind;
  event?: EventRow;
  division?: OrgDivision | null;
  notes?: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as unknown as { from: (t: string) => any };

const KIND_LABELS: Record<Kind, string> = {
  event: 'Events',
  aod: 'Association on Display',
  alumni: 'Alumni calls',
  application: 'Applications',
  deadline: 'Report deadlines',
};
const ALL_KINDS: Kind[] = ['event', 'aod', 'alumni', 'application', 'deadline'];
const DIVISIONS: OrgDivision[] = ['equity', 'investment', 'macro', 'portfolio', 'quant', 'operations', 'media'];

export default function WorkspaceCalendar() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [registered, setRegistered] = useState<Set<string>>(new Set());
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [regEvent, setRegEvent] = useState<EventRow | null>(null);
  const [registering, setRegistering] = useState(false);

  const [enabledKinds, setEnabledKinds] = useState<Set<Kind>>(new Set(ALL_KINDS));
  const [deadlineDiv, setDeadlineDiv] = useState<string>('all'); // 'all' | 'none' | OrgDivision

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
        const { data: deadlines } = await sb.from('report_deadlines').select('title, division, due_date, notes');
        for (const d of (deadlines || []) as { title: string; division: OrgDivision | null; due_date: string; notes: string | null }[]) {
          out.push({ date: d.due_date.slice(0, 10), label: `Deadline: ${d.title}${d.division ? ` (${DIVISION_LABELS[d.division]})` : ''}`, kind: 'deadline', division: d.division, notes: d.notes });
        }
        setItems(out);
      } catch (e) { toast({ title: 'Failed to load calendar', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
      finally { setLoading(false); }
    })();
  }, [toast]);

  const monthDays = useMemo(() => {
    const year = cursor.getFullYear(), month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const startDow = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (string | null)[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    return cells;
  }, [cursor]);

  const visibleItems = useMemo(() => items.filter((it) => {
    if (!enabledKinds.has(it.kind)) return false;
    if (it.kind === 'deadline') {
      if (deadlineDiv === 'all') return true;
      if (deadlineDiv === 'none') return !it.division;
      return it.division === deadlineDiv;
    }
    return true;
  }), [items, enabledKinds, deadlineDiv]);

  const itemsByDate = useMemo(() => {
    const map: Record<string, Item[]> = {};
    for (const it of visibleItems) (map[it.date] ??= []).push(it);
    return map;
  }, [visibleItems]);

  const kindColor = (k: Kind) =>
    k === 'event' ? 'bg-accent/10 text-accent'
    : k === 'aod' ? 'bg-amber-100 text-amber-800'
    : k === 'alumni' ? 'bg-emerald-100 text-emerald-800'
    : k === 'application' ? 'bg-blue-100 text-blue-800'
    : 'bg-rose-100 text-rose-800';

  const swatchColor = (k: Kind) =>
    k === 'event' ? 'bg-accent/20'
    : k === 'aod' ? 'bg-amber-200'
    : k === 'alumni' ? 'bg-emerald-200'
    : k === 'application' ? 'bg-blue-200'
    : 'bg-rose-200';

  const toggleKind = (k: Kind) => {
    setEnabledKinds((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  };

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
      <WorkspacePageHeader title="Calendar" description="Association events, Association on Display, alumni calls, report deadlines and application periods. Click an event that needs registration to sign up." />

      <div className="flex items-center justify-between mb-4 font-body">
        <h2 className="font-serif text-xl text-accent">{cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => { const d = new Date(); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)); }}>Today</Button>
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="mb-4 p-3 border border-separator bg-muted/20 font-body">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="text-xs uppercase tracking-wider text-muted-foreground mr-1">Show</span>
          {ALL_KINDS.map((k) => {
            const on = enabledKinds.has(k);
            return (
              <button key={k} type="button" onClick={() => toggleKind(k)}
                className={`text-xs px-2 py-1 rounded border ${on ? 'border-accent bg-accent/10 text-accent' : 'border-separator text-muted-foreground'}`}>
                <span className={`inline-block w-2.5 h-2.5 rounded-sm mr-1.5 align-middle ${swatchColor(k)}`} />{KIND_LABELS[k]}
              </button>
            );
          })}
        </div>
        {enabledKinds.has('deadline') && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-muted-foreground mr-1">Deadlines — division</span>
            <select value={deadlineDiv} onChange={(e) => setDeadlineDiv(e.target.value)}
              className="border border-separator bg-background px-2 py-1 text-xs font-serif uppercase">
              <option value="all">All divisions</option>
              <option value="none">All-divisions (no division)</option>
              {DIVISIONS.map((d) => <option key={d} value={d}>{DIVISION_LABELS[d]}</option>)}
            </select>
          </div>
        )}
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
                  const tip = it.kind === 'event' ? EVENT_TYPE_LABELS[it.event!.event_type]
                    : it.kind === 'deadline' ? (it.notes || it.label)
                    : it.label;
                  return (
                    <button key={j} disabled={!clickable} onClick={() => clickable && setRegEvent(it.event!)}
                      title={tip}
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
        {ALL_KINDS.map((k) => (
          <span key={k}><span className={`inline-block w-3 h-3 rounded-sm mr-1 align-middle ${swatchColor(k)}`} />{KIND_LABELS[k]}</span>
        ))}
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
