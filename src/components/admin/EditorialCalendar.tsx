import { useEffect, useMemo, useState } from 'react';
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
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import {
  listEditorial, saveEditorial, deleteEditorial,
  FORMAT_LABELS, ED_STATUS_LABELS,
  type EditorialItem, type EditorialInput, type EditorialFormat, type EditorialPlatform, type EditorialStatus,
} from '@/lib/smm-api';

const EMPTY: EditorialInput = { title: '', platform: 'instagram', format: 'ig_post', scheduled_date: '', responsible_person: '', status: 'idea', paid: false, notes: '' };
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const monthKey = (y: number, m: number) => `ed-${y}-${m}`;

const platformColor = (p: EditorialPlatform) =>
  p === 'instagram' ? 'bg-pink-100 text-pink-800' : p === 'linkedin' ? 'bg-blue-100 text-blue-800' : 'bg-muted text-foreground';

export default function EditorialCalendar() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<EditorialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EditorialInput>(EMPTY);
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
    if (loading) return;
    const now = new Date();
    document.getElementById(monthKey(now.getFullYear(), now.getMonth()))?.scrollIntoView({ block: 'start' });
  }, [loading]);

  const openCreate = (date?: string) => { setEditingId(null); setForm({ ...EMPTY, scheduled_date: date ?? '' }); setDialogOpen(true); };
  const openEdit = (i: EditorialItem) => {
    setEditingId(i.id);
    setForm({ id: i.id, title: i.title, platform: i.platform, format: i.format, scheduled_date: i.scheduled_date ?? '', responsible_person: i.responsible_person ?? '', status: i.status, paid: i.paid, notes: i.notes ?? '' });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) { toast({ title: 'Title is required', variant: 'destructive' }); return; }
    setSaving(true);
    try { await saveEditorial(session, form); toast({ title: editingId ? 'Updated' : 'Added' }); setDialogOpen(false); await load(); }
    catch (e) { toast({ title: 'Could not save', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const remove = async (i: EditorialItem) => {
    if (!confirm(`Delete "${i.title}"?`)) return;
    try { await deleteEditorial(session, i.id); setDialogOpen(false); await load(); } catch (e) { toast({ title: 'Could not delete', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
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
      <WorkspacePageHeader title="Editorial calendar" description="A dedicated calendar for the Media team: plan what to publish and when, on which platform and format, who is responsible, the status and whether it is paid. Scroll through the months and click a day to add, or an item to edit."
        actions={<Button className="font-body" onClick={() => openCreate()}><Plus className="h-4 w-4 mr-2" />Add item</Button>} />

      {loading ? <WorkspaceLoader /> : (
        <>
          <div className="flex flex-wrap gap-4 mb-3 text-xs text-muted-foreground font-body">
            <span><span className="inline-block w-3 h-3 rounded-sm bg-pink-200 mr-1 align-middle" />Instagram</span>
            <span><span className="inline-block w-3 h-3 rounded-sm bg-blue-200 mr-1 align-middle" />LinkedIn</span>
            <span><span className="inline-block w-3 h-3 rounded-sm bg-muted mr-1 align-middle" />Other</span>
          </div>

          <div className="max-h-[68vh] overflow-y-auto border border-separator">
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
                        <button className={`text-sm mb-1 ${date === todayStr ? 'text-accent' : 'text-muted-foreground'} hover:text-accent`} onClick={() => openCreate(date)} title="Add on this day">{parseInt(date.slice(-2), 10)}</button>
                        <div className="space-y-1">
                          {(itemsByDate[date] || []).map((it) => (
                            <button key={it.id} onClick={() => openEdit(it)} title={`${FORMAT_LABELS[it.format]} · ${ED_STATUS_LABELS[it.status]}`}
                              className={`block w-full text-left text-xs leading-tight px-1.5 py-0.5 rounded truncate ${platformColor(it.platform)}`}>
                              {it.paid ? '€ ' : ''}{it.title}
                            </button>
                          ))}
                        </div>
                      </>}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {undated.length > 0 && (
            <div className="mt-6">
              <h3 className="font-serif text-lg text-accent mb-2">Unscheduled ideas</h3>
              <div className="flex flex-wrap gap-2">
                {undated.map((it) => (
                  <button key={it.id} onClick={() => openEdit(it)} className={`text-sm px-2 py-1 rounded ${platformColor(it.platform)}`}>{it.title}</button>
                ))}
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Platform</Label>
                <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v as EditorialPlatform })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="instagram">Instagram</SelectItem><SelectItem value="linkedin">LinkedIn</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Format</Label>
                <Select value={form.format} onValueChange={(v) => setForm({ ...form, format: v as EditorialFormat })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(Object.keys(FORMAT_LABELS) as EditorialFormat[]).map((f) => <SelectItem key={f} value={f}>{FORMAT_LABELS[f]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
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
              <Button className="flex-1" onClick={save} disabled={saving}>{saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving</> : 'Save'}</Button>
              {editingId && <Button variant="destructive" size="icon" onClick={() => { const it = items.find((x) => x.id === editingId); if (it) remove(it); }}><Trash2 className="h-4 w-4" /></Button>}
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
