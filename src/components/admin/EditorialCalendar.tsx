import { useEffect, useMemo, useState, type DragEvent } from 'react';
import { CalendarDays, Columns3, Inbox, List, Plus, Euro, CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useIsDesktop } from '@/hooks/use-desktop';
import { useAccess } from '@/hooks/useAccess';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { HelpDot } from '@/components/admin/help/HelpSystem';
import {
  listEditorial, saveEditorial, deleteEditorial, normalisedDestinations,
  ED_STATUS_LABELS, PLATFORM_LABELS, PLATFORM_ORDER,
  type EditorialInput, type EditorialItem, type EditorialPlatform, type EditorialStatus,
} from '@/lib/smm-api';
import { listEvents, type EventRow } from '@/lib/events-api';
import { formatEventWhen } from '@/lib/event-time';
import { addDays, longDay, monthTitle, sameMonth, shortDay, todayYmd } from '@/lib/calendar-dates';
import { CalendarToolbar, EmptyState, FilterChip, MonthGrid } from '@/components/admin/calendar/CalendarKit';
import { useMedia, useStoredChoice } from '@/components/admin/calendar/calendar-hooks';
import { eventDay } from '@/components/admin/calendar/calendar-model';
import { EditorialItemSheet } from '@/components/admin/editorial/EditorialItemSheet';
import { EMPTY_EDITORIAL, PLATFORM_ICON, STATUS_ORDER, STATUS_STYLE, toInput } from '@/components/admin/editorial/editorial-model';
import { Destinations, StatusBadge } from '@/components/admin/editorial/EditorialBits';

// =====================================================================
// EDITORIAL CALENDAR: what the Media team is publishing, where and when.
// ---------------------------------------------------------------------
// Three ways to read the same plan:
//
//   MONTH   the dates. Each item shows its status (style and icon) and
//           where it goes (Instagram, LinkedIn, elsewhere). The
//           association's own events are drawn faintly on their days, so
//           the plan can be read against what it is promoting.
//   BOARD   the pipeline: one column per status, Idea to Published.
//   LIST    everything in date order, the easiest read on a phone.
//
// Items without a date wait in Unscheduled. On a computer the Media team
// can drag an item to another day (or into Unscheduled) to move it, and
// to another column of the board to change its status; the same can
// always be done from the item itself, without dragging (WCAG 2.5.7).
// =====================================================================

type View = 'month' | 'board' | 'list';
const VIEWS = ['month', 'board', 'list'] as const;

const itemDay = (i: EditorialItem) => (i.scheduled_date ? i.scheduled_date.slice(0, 10) : null);

export default function EditorialCalendar() {
  const { session } = useAuth();
  const { toast } = useToast();
  const isDesktop = useIsDesktop();
  const { canManage } = useAccess();
  // Editing needs 'manage' on this page and a computer: the phone shell is
  // read-only (lib/mobile-policy.ts), and the server checks the role too.
  const canEdit = isDesktop && canManage('smm-editorial');
  const readOnlyReason = !isDesktop
    ? 'Read-only on a phone: open the Editorial calendar on a computer to change the plan.'
    : 'Your role can read the plan but not change it.';
  const wide = useMedia('(min-width: 640px)');

  const [items, setItems] = useState<EditorialItem[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(() => `${todayYmd().slice(0, 7)}-01`);
  const [selected, setSelected] = useState<string | null>(todayYmd());
  const [view, setView] = useStoredChoice<View>('mims.zoom.editorial', VIEWS, typeof window !== 'undefined' && window.innerWidth < 640 ? 'list' : 'month');
  const [hiddenStatus, setHiddenStatus] = useState<Set<EditorialStatus>>(new Set());
  const [hiddenPlatform, setHiddenPlatform] = useState<Set<EditorialPlatform>>(new Set());
  const [showEvents, setShowEvents] = useState(true);
  const [sheet, setSheet] = useState<{ initial: EditorialInput; item: EditorialItem | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const [dropCol, setDropCol] = useState<string | null>(null);

  const load = async () => {
    try { setItems(await listEditorial(session)); }
    catch (e) { toast({ title: 'Failed to load the plan', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    load();
    listEvents().then(setEvents).catch(() => setEvents([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Filtering ───────────────────────────────────────────────────────
  const passes = (i: EditorialItem) =>
    !hiddenStatus.has(i.status) && normalisedDestinations(i).platforms.some((p) => !hiddenPlatform.has(p));
  const visible = useMemo(() => items.filter(passes),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, hiddenStatus, hiddenPlatform]);
  const byDay = useMemo(() => {
    const m: Record<string, EditorialItem[]> = {};
    for (const i of visible) { const d = itemDay(i); if (d) (m[d] ??= []).push(i); }
    return m;
  }, [visible]);
  const unscheduled = visible.filter((i) => !i.scheduled_date);
  const monthItems = items.filter((i) => { const d = itemDay(i); return d && sameMonth(d, cursor); });
  const statusCount = (s: EditorialStatus) => monthItems.filter((i) => i.status === s).length;
  const eventsByDay = useMemo(() => {
    const m: Record<string, EventRow[]> = {};
    for (const e of events) { if (e.aod_day_id) continue; const d = eventDay(e); if (d) (m[d] ??= []).push(e); }
    return m;
  }, [events]);

  // ── Changing the plan ───────────────────────────────────────────────
  const openItem = (i: EditorialItem) => setSheet({ initial: toInput(i), item: i });
  const openNew = (date?: string, event?: EventRow) => setSheet({
    initial: { ...EMPTY_EDITORIAL, scheduled_date: date ?? '', event_id: event?.id ?? null, title: event ? `${event.title}: ` : '' },
    item: null,
  });

  const save = async (v: EditorialInput) => {
    if (!v.title.trim()) { toast({ title: 'Say what the item promotes', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      await saveEditorial(session, { ...v, scheduled_date: v.scheduled_date || null });
      toast({ title: v.id ? 'Item updated' : 'Added to the plan' });
      setSheet(null);
      await load();
    } catch (e) { toast({ title: 'Could not save', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const remove = async () => {
    const it = sheet?.item;
    if (!it) return;
    try { await deleteEditorial(session, it.id); toast({ title: 'Item deleted' }); setSheet(null); await load(); }
    catch (e) { toast({ title: 'Could not delete', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
  };

  /** Move or re-status one item, at once on screen and then on the server. */
  const patch = async (id: string, change: Partial<Pick<EditorialItem, 'scheduled_date' | 'status'>>, said: string) => {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    if ((change.scheduled_date !== undefined && (it.scheduled_date?.slice(0, 10) ?? null) === change.scheduled_date) || (change.status && change.status === it.status)) return;
    const before = items;
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...change } : x)));
    try {
      await saveEditorial(session, { ...toInput(it), ...change, scheduled_date: (change.scheduled_date !== undefined ? change.scheduled_date : it.scheduled_date) || null });
      toast({ title: said, description: it.title });
    } catch (e) {
      setItems(before);
      toast({ title: 'Could not move the item', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    }
  };

  const dragProps = (i: EditorialItem) => (canEdit ? {
    draggable: true,
    onDragStart: (e: DragEvent) => { e.dataTransfer.setData('text/plain', i.id); e.dataTransfer.effectAllowed = 'move'; },
  } : {});

  // ── Pieces ──────────────────────────────────────────────────────────
  const chip = (i: EditorialItem) => {
    const st = STATUS_STYLE[i.status];
    return (
      <button
        key={i.id} data-ro type="button" {...dragProps(i)}
        onClick={(e) => { e.stopPropagation(); openItem(i); }}
        onDoubleClick={(e) => e.stopPropagation()}
        title={`${i.title} (${ED_STATUS_LABELS[i.status]})`}
        aria-label={`${i.title}, ${ED_STATUS_LABELS[i.status]}, ${normalisedDestinations(i).platforms.map((p) => PLATFORM_LABELS[p]).join(' and ')}${i.paid ? ', paid' : ''}`}
        className={`flex w-full items-start gap-1 px-1.5 py-[3px] text-left text-[12px] leading-[1.3] ${st.chip} ${canEdit ? 'cursor-grab active:cursor-grabbing' : ''} hover:ring-1 hover:ring-accent/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent`}
      >
        <span aria-hidden className="mt-[1px] shrink-0">{st.icon('h-3 w-3')}</span>
        <span className="min-w-0 flex-1 line-clamp-2 break-words">{i.title}</span>
        <span aria-hidden className="mt-[1px] flex shrink-0 items-center gap-0.5 opacity-80">
          {normalisedDestinations(i).platforms.map((p) => <span key={p}>{PLATFORM_ICON[p]('h-3 w-3')}</span>)}
          {i.paid && <Euro className="h-3 w-3" />}
        </span>
      </button>
    );
  };

  const eventMarker = (e: EventRow) => (
    <Popover key={e.id}>
      <PopoverTrigger asChild>
        <button data-ro type="button" onClick={(ev) => ev.stopPropagation()}
          className="flex w-full items-center gap-1 truncate border-b border-dotted border-accent/40 pb-[1px] text-left text-[11px] text-accent/80 hover:text-accent">
          <CalendarDays aria-hidden className="h-3 w-3 shrink-0" /><span className="truncate">{e.title}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3 font-body" onClick={(ev) => ev.stopPropagation()}>
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Association event</p>
        <p className="font-serif text-lg leading-snug text-accent">{e.title}</p>
        <p className="mt-1 text-[13px] text-muted-foreground">{formatEventWhen(e)}{e.place ? ` · ${e.place}` : ''}</p>
        <p className="mt-2 text-[13px] text-foreground">
          {items.filter((x) => x.event_id === e.id).length
            ? `${items.filter((x) => x.event_id === e.id).length} item(s) in the plan for it.`
            : 'Nothing in the plan for it yet.'}
        </p>
        {canEdit && (
          <Button variant="outline" size="sm" className="mt-3 w-full font-body" onClick={() => openNew(addDays(eventDay(e), -3) < todayYmd() ? todayYmd() : addDays(eventDay(e), -3), e)}>
            <CalendarPlus className="h-4 w-4" />Plan content for this event
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );

  const renderDay = (d: string) => {
    const list = byDay[d] || [];
    const evs = showEvents ? eventsByDay[d] || [] : [];
    if (!wide) {
      return (
        <span className="mt-1 flex h-2 items-center gap-0.5" aria-hidden>
          {evs.length > 0 && <span className="h-1.5 w-1.5 rounded-full border border-accent" />}
          {Array.from(new Set(list.map((i) => i.status))).slice(0, 3).map((s) => (
            <span key={s} className={`h-1.5 w-1.5 rounded-full ${s === 'published' ? 'bg-emerald-600' : s === 'in_progress' ? 'bg-amber-500' : s === 'scheduled' ? 'bg-accent' : 'bg-slate-400'}`} />
          ))}
        </span>
      );
    }
    const max = evs.length ? 2 : 3;
    const shown = list.slice(0, max);
    const more = list.length - shown.length;
    return (
      <div className="mt-1 flex flex-1 flex-col gap-1">
        {evs.slice(0, 1).map((e) => eventMarker(e))}
        {evs.length > 1 && <span className="text-[11px] text-accent/80">+{evs.length - 1} more event{evs.length > 2 ? 's' : ''}</span>}
        {shown.map((i) => chip(i))}
        {more > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <button data-ro type="button" onClick={(e) => e.stopPropagation()} className="self-start px-1 text-[12px] font-medium text-accent hover:underline">+{more} more</button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 p-3 font-body" onClick={(e) => e.stopPropagation()}>
              <p className="mb-2 font-serif text-base text-accent">{longDay(d)}</p>
              <div className="flex flex-col gap-1">{list.map((i) => chip(i))}</div>
            </PopoverContent>
          </Popover>
        )}
        {canEdit && (
          <button type="button" onClick={(e) => { e.stopPropagation(); openNew(d); }} aria-label={`Add an item on ${longDay(d)}`} title="Add an item on this day"
            className="absolute right-1 top-1 hidden h-6 w-6 items-center justify-center text-muted-foreground opacity-0 transition-opacity hover:bg-accent/10 hover:text-accent focus-visible:opacity-100 group-hover/day:opacity-100 sm:flex">
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  };

  /** A row of the list and of the phone's day list. */
  const row = (i: EditorialItem) => {
    const d = itemDay(i);
    return (
      <button key={i.id} data-ro type="button" onClick={() => openItem(i)}
        className="grid w-full grid-cols-[4.5rem_minmax(0,1fr)] items-start gap-x-3 gap-y-1 px-4 py-3 text-left hover:bg-accent/[0.04] sm:grid-cols-[6.5rem_8.5rem_minmax(0,1fr)_11rem_8rem]">
        <span className="font-body text-[13px] text-muted-foreground">{d ? shortDay(d) : 'No date'}</span>
        <span className="col-start-2 row-start-2 sm:col-start-auto sm:row-start-auto"><StatusBadge status={i.status} /></span>
        <span className="col-start-2 row-start-1 min-w-0 sm:col-start-auto sm:row-start-auto">
          <span className={`block font-body text-[15px] font-medium leading-snug ${i.status === 'cancelled' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{i.title}</span>
          {i.event_id && events.find((e) => e.id === i.event_id) && (
            <span className="mt-0.5 flex items-center gap-1 text-[12px] text-accent/80"><CalendarDays className="h-3 w-3" />{events.find((e) => e.id === i.event_id)!.title}</span>
          )}
        </span>
        <span className="col-start-2 font-body text-[13px] text-muted-foreground sm:col-start-auto"><Destinations item={i} /></span>
        <span className="col-start-2 font-body text-[13px] text-muted-foreground sm:col-start-auto">
          {i.responsible_person || ''}{i.paid && <span className="ml-1.5 inline-flex items-center gap-0.5 border border-separator px-1 text-[11px]"><Euro className="h-3 w-3" />Paid</span>}
        </span>
      </button>
    );
  };

  const unscheduledTray = () => (
    <aside
      aria-label="Unscheduled"
      onDragOver={canEdit ? (e) => { e.preventDefault(); setDropCol('unscheduled'); } : undefined}
      onDragLeave={canEdit ? () => setDropCol(null) : undefined}
      onDrop={canEdit ? (e) => { e.preventDefault(); setDropCol(null); const id = e.dataTransfer.getData('text/plain'); if (id) patch(id, { scheduled_date: null }, 'Moved to Unscheduled'); } : undefined}
      className={`border bg-background p-3 ${dropCol === 'unscheduled' ? 'border-accent ring-2 ring-accent/30' : 'border-separator'}`}
    >
      <h3 className="mb-1 flex items-center gap-2 font-body text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
        <Inbox className="h-4 w-4" />Unscheduled <span className="tabular-nums">{unscheduled.length}</span>
      </h3>
      <p className="mb-2 font-body text-[12px] text-muted-foreground">{canEdit ? 'Ideas without a date. Drag one onto a day to schedule it.' : 'Ideas without a date yet.'}</p>
      {unscheduled.length === 0 ? (
        <p className="py-2 font-body text-[13px] text-muted-foreground">Nothing waiting for a date.</p>
      ) : (
        <div className="flex flex-col gap-1">{unscheduled.map((i) => chip(i))}</div>
      )}
    </aside>
  );

  if (loading) return <div><WorkspacePageHeader title="Editorial calendar" description="What the Media team is publishing, where and when." /><WorkspaceLoader /></div>;

  // ── Board ──────────────────────────────────────────────────────────
  const boardItems = visible.filter((i) => { const d = itemDay(i); return !d || sameMonth(d, cursor); })
    .sort((a, b) => (itemDay(a) ?? '9999').localeCompare(itemDay(b) ?? '9999'));

  const today = todayYmd();
  const monthList = visible.filter((i) => { const d = itemDay(i); return d && sameMonth(d, cursor); })
    .sort((a, b) => (itemDay(a) ?? '').localeCompare(itemDay(b) ?? ''));

  return (
    <div>
      <WorkspacePageHeader
        title="Editorial calendar"
        description="What the Media team is publishing, where and when."
        actionColumns="row"
        actions={canEdit ? <Button variant="solid" className="font-body h-9" onClick={() => openNew(selected && selected >= today ? selected : undefined)}><Plus className="h-4 w-4" />New item</Button> : undefined}
      />

      <section aria-label="Plan" className="space-y-3">
        <CalendarToolbar
          cursor={cursor}
          onCursor={(d) => setCursor(`${d.slice(0, 7)}-01`)}
          views={[
            { value: 'month', label: 'Month', icon: <CalendarDays className="h-4 w-4" /> },
            { value: 'board', label: 'Board', icon: <Columns3 className="h-4 w-4" /> },
            { value: 'list', label: 'List', icon: <List className="h-4 w-4" /> },
          ]}
          view={view}
          onView={setView}
          extra={<HelpDot page="smm-editorial" topic="planning" />}
        />

        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 [&>*]:shrink-0" role="group" aria-label="Show in the plan">
          {STATUS_ORDER.map((s) => (
            <FilterChip key={s} active={!hiddenStatus.has(s)} icon={STATUS_STYLE[s].icon('h-3.5 w-3.5')} label={ED_STATUS_LABELS[s]} count={statusCount(s)}
              onToggle={() => setHiddenStatus((h) => { const n = new Set(h); if (n.has(s)) n.delete(s); else n.add(s); return n; })} />
          ))}
          <span aria-hidden className="mx-1 w-px self-stretch bg-separator" />
          {PLATFORM_ORDER.map((p) => (
            <FilterChip key={p} active={!hiddenPlatform.has(p)} icon={PLATFORM_ICON[p]('h-3.5 w-3.5')} label={PLATFORM_LABELS[p]}
              onToggle={() => setHiddenPlatform((h) => { const n = new Set(h); if (n.has(p)) n.delete(p); else n.add(p); return n; })} />
          ))}
          <span aria-hidden className="mx-1 w-px self-stretch bg-separator" />
          <FilterChip active={showEvents} icon={<CalendarDays className="h-3.5 w-3.5 text-accent" />} label="Association events" onToggle={() => setShowEvents((v) => !v)} />
        </div>

        {view === 'month' && (
          <div className="grid grid-cols-1 gap-4 min-[1600px]:grid-cols-[minmax(0,1fr)_16rem]">
            <div className="min-w-0 space-y-4">
              <MonthGrid
                cursor={cursor}
                selected={selected}
                onSelect={setSelected}
                onCursor={(d) => setCursor(`${d.slice(0, 7)}-01`)}
                renderDay={(d) => renderDay(d)}
                dayClass={() => 'group/day'}
                dayLabel={(d) => { const n = (byDay[d] || []).length; const ev = (eventsByDay[d] || []).length; return [n ? `${n} ${n === 1 ? 'item' : 'items'}` : 'nothing planned', ev ? `${ev} association event${ev > 1 ? 's' : ''}` : ''].filter(Boolean).join(', '); }}
                onDayDoubleClick={canEdit ? (d) => openNew(d) : undefined}
                onDayDrop={canEdit ? (d, id) => patch(id, { scheduled_date: d }, `Moved to ${shortDay(d)}`) : undefined}
                compact={!wide}
              />
              {!wide && selected && (
                <div className="border border-separator">
                  <h3 className="bg-muted/60 px-4 py-2 font-body text-[13px] font-semibold">{longDay(selected)}</h3>
                  {(eventsByDay[selected] || []).map((e) => (
                    <p key={e.id} className="flex items-center gap-1.5 border-b border-separator px-4 py-2 font-body text-[13px] text-accent"><CalendarDays className="h-3.5 w-3.5" />{e.title}</p>
                  ))}
                  {(byDay[selected] || []).length === 0
                    ? <p className="px-4 py-3 font-body text-[13px] text-muted-foreground">Nothing planned for this day.</p>
                    : <div className="divide-y divide-separator">{(byDay[selected] || []).map((i) => row(i))}</div>}
                </div>
              )}
            </div>
            {unscheduledTray()}
          </div>
        )}

        {view === 'board' && (
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <div className="grid min-w-[62rem] grid-cols-[repeat(4,minmax(0,1fr))_12rem] gap-3">
              {STATUS_ORDER.map((s) => {
                const col = boardItems.filter((i) => i.status === s);
                return (
                  <section key={s} aria-label={ED_STATUS_LABELS[s]}
                    onDragOver={canEdit ? (e) => { e.preventDefault(); setDropCol(s); } : undefined}
                    onDragLeave={canEdit ? () => setDropCol(null) : undefined}
                    onDrop={canEdit ? (e) => { e.preventDefault(); setDropCol(null); const id = e.dataTransfer.getData('text/plain'); if (id) patch(id, { status: s }, `Moved to ${ED_STATUS_LABELS[s]}`); } : undefined}
                    className={`min-h-[16rem] border border-t-[3px] bg-muted/20 p-2 ${STATUS_STYLE[s].column} ${dropCol === s ? 'ring-2 ring-accent/40' : 'border-separator'}`}
                  >
                    <h3 className="mb-2 flex items-center gap-1.5 px-1 font-body text-[13px] font-medium text-foreground">
                      {STATUS_STYLE[s].icon('h-4 w-4')}{ED_STATUS_LABELS[s]}<span className="ml-auto tabular-nums text-muted-foreground">{col.length}</span>
                    </h3>
                    <div className="flex flex-col gap-2">
                      {col.map((i) => (
                        <button key={i.id} data-ro type="button" {...dragProps(i)} onClick={() => openItem(i)}
                          className={`border border-separator bg-background p-2.5 text-left font-body shadow-sm hover:border-accent/50 ${canEdit ? 'cursor-grab active:cursor-grabbing' : ''}`}>
                          <span className={`block text-[14px] font-medium leading-snug ${s === 'cancelled' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{i.title}</span>
                          <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted-foreground">
                            <span>{itemDay(i) ? shortDay(itemDay(i)!) : 'No date'}</span>
                            <Destinations item={i} />
                            {i.paid && <span className="inline-flex items-center gap-0.5"><Euro className="h-3 w-3" />Paid</span>}
                          </span>
                          {(i.responsible_person || i.event_id) && (
                            <span className="mt-1 block truncate text-[12px] text-muted-foreground">
                              {[i.responsible_person, events.find((e) => e.id === i.event_id)?.title].filter(Boolean).join(' · ')}
                            </span>
                          )}
                        </button>
                      ))}
                      {col.length === 0 && <p className="px-1 py-3 font-body text-[12px] text-muted-foreground">{canEdit ? 'Drop an item here.' : 'Nothing here.'}</p>}
                    </div>
                  </section>
                );
              })}
            </div>
            <p className="mt-2 font-body text-[12px] text-muted-foreground">The board shows {monthTitle(cursor)} and everything still without a date.{canEdit ? ' Drag a card to another column to change its status.' : ''}</p>
          </div>
        )}

        {view === 'list' && (
          <div className="border border-separator">
            <div className="hidden grid-cols-[6.5rem_8.5rem_minmax(0,1fr)_11rem_8rem] gap-x-3 border-b border-separator bg-muted/50 px-4 py-2 font-body text-[11px] uppercase tracking-wider text-muted-foreground sm:grid">
              <span>Date</span><span>Status</span><span>Item</span><span>Where</span><span>Responsible</span>
            </div>
            {monthList.length === 0 && unscheduled.length === 0 ? (
              <div className="p-4">
                <EmptyState icon={<CalendarDays className="h-5 w-5" />} title={`Nothing planned in ${monthTitle(cursor)}`}
                  action={canEdit ? <Button variant="solid" size="sm" onClick={() => openNew()}><Plus className="h-4 w-4" />New item</Button> : undefined}>
                  {hiddenStatus.size || hiddenPlatform.size ? 'Some items are hidden by the filters above.' : 'Use the arrows to look at another month.'}
                </EmptyState>
              </div>
            ) : (
              <>
                <div className="divide-y divide-separator">{monthList.map((i) => row(i))}</div>
                {unscheduled.length > 0 && (
                  <>
                    <h3 className="flex items-center gap-2 border-y border-separator bg-muted/40 px-4 py-2 font-body text-[12px] font-medium uppercase tracking-wider text-muted-foreground"><Inbox className="h-4 w-4" />Unscheduled {unscheduled.length}</h3>
                    <div className="divide-y divide-separator">{unscheduled.map((i) => row(i))}</div>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </section>

      <EditorialItemSheet
        open={!!sheet}
        initial={sheet?.initial ?? EMPTY_EDITORIAL}
        item={sheet?.item ?? null}
        events={events}
        canEdit={canEdit}
        readOnlyReason={readOnlyReason}
        saving={saving}
        onSave={save}
        onDelete={remove}
        onClose={() => setSheet(null)}
      />
    </div>
  );
}
