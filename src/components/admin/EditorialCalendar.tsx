import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useIsDesktop } from '@/hooks/use-desktop';
import { logActivity } from '@/lib/activity-log';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { CalendarLegend, type LegendItem } from '@/components/admin/CalendarLegend';

/** The same three platforms and colours the permanent band used to print. */
const EDITORIAL_LEGEND: LegendItem[] = [
  { swatch: 'bg-pink-200', label: 'Instagram' },
  { swatch: 'bg-blue-200', label: 'LinkedIn' },
  { swatch: 'bg-muted', label: 'Other' },
];
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import {
  CalendarDayCell, CalendarHoverPreview, CalendarZoomControl, CALENDAR_ZOOM,
  PreviewRow, useCalendarZoom, useScrollToCurrentMonth,
} from '@/components/admin/CalendarView';
import {
  listEditorial, saveEditorial, deleteEditorial,
  FORMAT_SHORT_LABELS, FORMATS_BY_PLATFORM, PLATFORM_LABELS, PLATFORM_ORDER,
  describeDestinations, normalisedDestinations, setFormatFor, togglePlatform,
  ED_STATUS_LABELS,
  type EditorialItem, type EditorialInput, type EditorialFormat, type EditorialPlatform, type EditorialStatus,
} from '@/lib/smm-api';

const EMPTY: EditorialInput = { title: '', platforms: ['instagram'], formats: ['ig_post'], scheduled_date: '', responsible_person: '', status: 'idea', paid: false, notes: '' };
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const monthKey = (y: number, m: number) => `ed-${y}-${m}`;

// =====================================================================
// A CHIP THAT GOES TO TWO PLACES LOOKS LIKE IT GOES TO TWO PLACES.
// ---------------------------------------------------------------------
// The colour was the platform, one chip one colour, and that reading has
// to survive an item that has more than one destination. Rather than
// invent a fourth colour for "several" - which would say nothing about
// WHICH several - the chip is split into equal bands of the colours it
// actually has, in the canonical order, so Instagram-and-LinkedIn reads
// as pink beside blue at a glance and needs no key of its own.
//
// A single destination is a single band, which is exactly the flat colour
// it always was. Nothing about the existing chips changes.
// =====================================================================
const PLATFORM_TINT: Record<EditorialPlatform, string> = {
  instagram: '#FBCFE8',   // pink-200
  linkedin: '#BFDBFE',    // blue-200
  other: '#E7E5E4',       // a neutral that is not either of the two
};

function chipStyle(platforms: EditorialPlatform[]): React.CSSProperties {
  const tints = platforms.map((p) => PLATFORM_TINT[p]);
  if (tints.length === 1) return { backgroundColor: tints[0] };
  const step = 100 / tints.length;
  const stops = tints
    .map((c, i) => `${c} ${i * step}%, ${c} ${(i + 1) * step}%`)
    .join(', ');
  return { backgroundImage: `linear-gradient(90deg, ${stops})` };
}

export default function EditorialCalendar() {
  const { session } = useAuth();
  // The editorial calendar is read-only in the mobile shell.
  const isDesktop = useIsDesktop();
  const { toast } = useToast();
  const [items, setItems] = useState<EditorialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EditorialInput>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [zoom, setZoom] = useCalendarZoom('mims.zoom.editorial');
  const scrollRef = useRef<HTMLDivElement>(null);
  const size = CALENDAR_ZOOM[zoom];

  const load = async () => {
    setLoading(true);
    try { setItems(await listEditorial(session)); }
    catch (e) { toast({ title: 'Failed to load', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setLoading(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const dated = useMemo(() => items.filter((i) => i.scheduled_date), [items]);
  const undated = useMemo(() => items.filter((i) => !i.scheduled_date), [items]);

  const itemsByDate = useMemo(() => {
    const map: Record<string, EditorialItem[]> = {};
    for (const i of dated) (map[i.scheduled_date!.slice(0, 10)] ??= []).push(i);
    return map;
  }, [dated]);

  const months = useMemo(() => {
    const now = new Date();
    const ds = dated.map((i) => i.scheduled_date!.slice(0, 10)).sort();
    const earliest = ds.length ? new Date(ds[0]) : now;
    const latest = ds.length ? new Date(ds[ds.length - 1]) : now;
    const start = new Date(Math.min(new Date(earliest.getFullYear(), earliest.getMonth() - 1, 1).getTime(), new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime()));
    const end = new Date(Math.max(latest.getTime(), new Date(now.getFullYear(), now.getMonth() + 6, 1).getTime()));
    const list: { year: number; month: number }[] = [];
    const cur = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cur <= end) { list.push({ year: cur.getFullYear(), month: cur.getMonth() }); cur.setMonth(cur.getMonth() + 1); }
    return list;
  }, [dated]);


  useScrollToCurrentMonth(!loading, scrollRef, monthKey);

  const openCreate = (date?: string) => { setEditingId(null); setForm({ ...EMPTY, scheduled_date: date ?? '' }); setDialogOpen(true); };
  const openEdit = (i: EditorialItem) => {
    setEditingId(i.id);
    // `normalisedDestinations` repairs both legacy shapes at once: a row
    // written before the arrays existed, and a row whose format does not
    // belong to its platform. The editor is therefore never opened in a
    // state its own controls cannot express.
    const { platforms, formats } = normalisedDestinations(i);
    setForm({ id: i.id, title: i.title, platforms, formats, scheduled_date: i.scheduled_date ?? '', responsible_person: i.responsible_person ?? '', status: i.status, paid: i.paid, notes: i.notes ?? '' });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) { toast({ title: 'Title is required', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      await saveEditorial(session, form);
      toast({ title: editingId ? 'Updated' : 'Added' }); setDialogOpen(false); await load();
    }
    catch (e) { toast({ title: 'Could not save', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const remove = async (i: EditorialItem) => {
    if (!confirm(`Delete "${i.title}"?`)) return;
    try {
      await deleteEditorial(session, i.id);
      setDialogOpen(false); await load();
    } catch (e) { toast({ title: 'Could not delete', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
  };

  const monthCells = (year: number, month: number): (string | null)[] => {
    const first = new Date(year, month, 1);
    const startDow = (first.getDay() + 6) % 7;
    const days = new Date(year, month + 1, 0).getDate();
    const cells: (string | null)[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= days; d++) cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    return cells;
  };

  const todayStr = ymd(new Date());

  return (
    <div>
      {/* The colour key moves up beside Add item and folds away, exactly as on
          the main Calendar. Same three platforms, same three colours. */}
      <WorkspacePageHeader title="Editorial calendar" description="What the Media team is publishing, and when."
        actions={
          <>
            <CalendarLegend items={EDITORIAL_LEGEND} />
            <CalendarZoomControl value={zoom} onChange={setZoom} />
            {isDesktop && <Button className="font-body h-9" onClick={() => openCreate()}><Plus className="h-4 w-4 mr-2" />Add item</Button>}
          </>
        } />

      {loading ? <WorkspaceLoader /> : (
        <>
          <div ref={scrollRef} className="max-h-[68vh] overflow-y-auto border border-separator">
            {months.map(({ year, month }) => (
              <section key={monthKey(year, month)} id={monthKey(year, month)} className="border-b border-separator last:border-b-0">
                <div className="sticky top-0 z-10 bg-background/95 backdrop-blur px-3 py-2 border-b border-separator">
                  <h2 className="font-serif text-2xl text-accent">{new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
                </div>
                <div className="grid grid-cols-7 gap-px bg-separator font-body">
                  {WEEKDAYS.map((d) => <div key={d} className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider px-2 py-1 text-center">{d}</div>)}
                  {monthCells(year, month).map((date, i) => {
                    if (!date) return <div key={i} className={`bg-muted/20 ${size.cell}`} />;
                    const dayItems = itemsByDate[date] || [];
                    const shown = dayItems.slice(0, size.max);
                    const hidden = dayItems.length - shown.length;
                    return (
                      <CalendarDayCell
                        key={i}
                        date={date}
                        canAdd={isDesktop}
                        onAdd={openCreate}
                        className={`bg-background align-top ${size.cell} ${size.pad} ${date === todayStr ? 'ring-1 ring-accent ring-inset' : ''}`}
                      >
                        <div className={`${size.day} mb-1 ${date === todayStr ? 'text-accent' : 'text-muted-foreground'}`}>{parseInt(date.slice(-2), 10)}</div>
                        <div className="space-y-1">
                          {shown.map((it) => {
                            const dest = normalisedDestinations(it);
                            return (
                              <CalendarHoverPreview
                                key={it.id}
                                title={it.title}
                                meta={<>
                                  <PreviewRow label="Where" value={describeDestinations(dest.platforms, dest.formats)} />
                                  <PreviewRow label="When" value={it.scheduled_date ?? 'Not scheduled'} />
                                  <PreviewRow label="Status" value={ED_STATUS_LABELS[it.status]} />
                                  <PreviewRow label="Responsible" value={it.responsible_person} />
                                  <PreviewRow label="Paid" value={it.paid ? 'Paid advertising' : undefined} />
                                  <PreviewRow label="Notes" value={it.notes} />
                                </>}
                              >
                                <button
                                  onClick={() => openEdit(it)}
                                  style={chipStyle(dest.platforms)}
                                  className={`block w-full text-left rounded truncate text-foreground/90 ${size.chip}`}
                                >
                                  {it.paid ? '€ ' : ''}{it.title}
                                </button>
                              </CalendarHoverPreview>
                            );
                          })}
                          {hidden > 0 && (
                            <div className="px-1 text-[10px] text-muted-foreground">{hidden} more</div>
                          )}
                        </div>
                      </CalendarDayCell>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          {undated.length > 0 && (
            <div className="mt-6">
              <h3 className="font-serif text-lg text-accent mb-2">Unscheduled ideas</h3>
              <div className="flex flex-wrap gap-2">
                {undated.map((it) => {
                  const dest = normalisedDestinations(it);
                  return (
                    <CalendarHoverPreview
                      key={it.id}
                      title={it.title}
                      meta={<>
                        <PreviewRow label="Where" value={describeDestinations(dest.platforms, dest.formats)} />
                        <PreviewRow label="Status" value={ED_STATUS_LABELS[it.status]} />
                        <PreviewRow label="Responsible" value={it.responsible_person} />
                        <PreviewRow label="Notes" value={it.notes} />
                      </>}
                    >
                      <button onClick={() => openEdit(it)} style={chipStyle(dest.platforms)} className="text-sm px-2 py-1 rounded text-foreground/90">{it.title}</button>
                    </CalendarHoverPreview>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-serif">{editingId ? 'Edit item' : 'Add item'}</DialogTitle></DialogHeader>
          <div className="space-y-3 font-body">
            <div className="space-y-1"><Label>What to promote *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Guest speaker event teaser" /></div>
            {/* ==========================================================
                WHERE IT GOES, AND WHAT IT IS IN EACH PLACE.

                "Where it goes" is a MULTIPLE choice now. Most of what the
                Media team publishes goes to Instagram and LinkedIn both,
                and the calendar allowed exactly one destination, so the
                team was entering the same piece twice - two rows, same
                title, same date, kept in step by whoever remembered. Two
                records for one piece of work is not a plan.

                The format follows, one row PER SELECTED DESTINATION,
                because the answer genuinely differs: a teaser is a reel
                on Instagram and a post on LinkedIn. A single format field
                would have forced one of those two to be recorded as
                something it is not.

                A platform with one format shows that one option, selected
                and unremarkable, which is more honest than a dropdown
                that opens to a single line. The last destination cannot
                be removed: an item has to go somewhere, and refusing it
                here means the editor never reaches a state the server
                would have to reject.
                ========================================================== */}
            <div className="space-y-1">
              <Label>Where it goes</Label>
              <div className="flex flex-wrap gap-2">
                {PLATFORM_ORDER.map((p) => {
                  const on = form.platforms.includes(p);
                  const only = on && form.platforms.length === 1;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setForm({ ...form, ...togglePlatform(form.platforms, form.formats, p) })}
                      aria-pressed={on}
                      title={only ? 'An item has to go somewhere: add another destination before removing this one.' : undefined}
                      className={`h-9 px-4 border font-body text-sm transition-colors ${
                        on
                          ? 'border-accent bg-accent text-accent-foreground'
                          : 'border-separator bg-background text-foreground hover:bg-muted'
                      }`}
                    >
                      {PLATFORM_LABELS[p]}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">Choose one or more. The same piece can go to Instagram and LinkedIn.</p>
            </div>
            {form.platforms.map((p) => (
              <div key={p} className="space-y-1">
                <Label>{form.platforms.length > 1 ? `Format on ${PLATFORM_LABELS[p]}` : 'Format'}</Label>
                <div className="flex flex-wrap gap-2">
                  {FORMATS_BY_PLATFORM[p].map((f) => {
                    const current = form.formats[form.platforms.indexOf(p)];
                    return (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setForm({ ...form, formats: setFormatFor(form.platforms, form.formats, p, f) })}
                        aria-pressed={current === f}
                        className={`h-9 px-4 border font-body text-sm transition-colors ${
                          current === f
                            ? 'border-accent bg-accent text-accent-foreground'
                            : 'border-separator bg-background text-foreground hover:bg-muted'
                        }`}
                      >
                        {FORMAT_SHORT_LABELS[f]}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Scheduled date</Label><Input type="date" value={form.scheduled_date ?? ''} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} /></div>
              <div className="space-y-1"><Label>Responsible</Label><Input value={form.responsible_person ?? ''} onChange={(e) => setForm({ ...form, responsible_person: e.target.value })} placeholder="e.g. Jane Smith" /></div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as EditorialStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(Object.keys(ED_STATUS_LABELS) as EditorialStatus[]).map((s) => <SelectItem key={s} value={s}>{ED_STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between pt-6"><Label htmlFor="paid">Paid advertising</Label><Switch id="paid" checked={!!form.paid} onCheckedChange={(v) => setForm({ ...form, paid: v })} /></div>
            </div>
            <div className="space-y-1"><Label>Notes</Label><Textarea rows={2} value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Anything the team should know" /></div>
            <div className="flex gap-3 pt-1">
              {isDesktop ? (
                <>
                  <Button className="flex-1" onClick={save} disabled={saving}>{saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving</> : 'Save'}</Button>
                  {editingId && <Button variant="destructive" size="icon" onClick={() => { const it = items.find((x) => x.id === editingId); if (it) remove(it); }}><Trash2 className="h-4 w-4" /></Button>}
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                </>
              ) : (
                <>
                  <p className="flex-1 self-center text-xs text-muted-foreground">Read-only on mobile: editing is available on desktop.</p>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Close</Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
