import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
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

  const openCreate = () => { setEditingId(null); setForm(EMPTY); setDialogOpen(true); };
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
    if (!confirm(`Delete “${i.title}”?`)) return;
    try { await deleteEditorial(session, i.id); await load(); } catch (e) { toast({ title: 'Could not delete', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
  };

  return (
    <div>
      <WorkspacePageHeader title="Editorial calendar" description="Plan what needs promoting and when: platform, format, the responsible person, status, and whether paid advertising is used."
        actions={<Button className="font-body" onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add item</Button>} />

      {loading ? <WorkspaceLoader /> : items.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">Nothing planned yet.</p></CardContent></Card>
      ) : (
        <div className="border border-separator overflow-x-auto">
          <table className="w-full text-left font-body text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-normal">Date</th>
                <th className="px-3 py-2 font-normal">Content</th>
                <th className="px-3 py-2 font-normal">Format</th>
                <th className="px-3 py-2 font-normal">Responsible</th>
                <th className="px-3 py-2 font-normal">Status</th>
                <th className="px-3 py-2 font-normal text-center">Paid</th>
                <th className="px-3 py-2 font-normal text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-t border-separator">
                  <td className="px-3 py-2 whitespace-nowrap">{i.scheduled_date ? new Date(i.scheduled_date).toLocaleDateString() : '—'}</td>
                  <td className="px-3 py-2 text-foreground">{i.title}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{FORMAT_LABELS[i.format]}</td>
                  <td className="px-3 py-2">{i.responsible_person || '—'}</td>
                  <td className="px-3 py-2">{ED_STATUS_LABELS[i.status]}</td>
                  <td className="px-3 py-2 text-center">{i.paid ? '€' : '—'}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="icon" onClick={() => openEdit(i)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="destructive" size="icon" onClick={() => remove(i)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
              <div className="space-y-1"><Label>Responsible</Label><Input value={form.responsible_person ?? ''} onChange={(e) => setForm({ ...form, responsible_person: e.target.value })} /></div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as EditorialStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(Object.keys(ED_STATUS_LABELS) as EditorialStatus[]).map((s) => <SelectItem key={s} value={s}>{ED_STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between pt-6"><Label htmlFor="paid">Paid advertising</Label><Switch id="paid" checked={!!form.paid} onCheckedChange={(v) => setForm({ ...form, paid: v })} /></div>
            </div>
            <div className="space-y-1"><Label>Notes</Label><Textarea rows={2} value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="flex gap-3 pt-1">
              <Button className="flex-1" onClick={save} disabled={saving}>{saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving</> : 'Save'}</Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
