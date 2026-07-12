import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { listDeadlines, createDeadline, updateDeadline, deleteDeadline, DIVISION_LABELS, type ReportDeadline, type OrgDivision } from '@/lib/deadlines-api';

const DIVISIONS: OrgDivision[] = ['equity', 'investment', 'macro', 'portfolio', 'quant', 'operations', 'media'];

export default function ReportDeadlines() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ReportDeadline[]>([]);
  const [filterDiv, setFilterDiv] = useState<string>('all');
  const [editing, setEditing] = useState<ReportDeadline | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [division, setDivision] = useState<string>('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  const reload = async () => {
    try { setRows(await listDeadlines()); }
    catch (e) { toast({ title: 'Failed to load deadlines', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setLoading(false); }
  };

  useEffect(() => { reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const openCreate = () => {
    setEditing(null); setCreating(true);
    setTitle(''); setDivision(''); setDueDate(''); setNotes('');
  };
  const openEdit = (r: ReportDeadline) => {
    setEditing(r); setCreating(true);
    setTitle(r.title); setDivision(r.division ?? ''); setDueDate(r.due_date); setNotes(r.notes ?? '');
  };
  const close = () => { setCreating(false); setEditing(null); };

  const save = async () => {
    if (!title.trim() || !dueDate) { toast({ title: 'Title and due date are required', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const payload = { title: title.trim(), division: (division || null) as OrgDivision | null, due_date: dueDate, notes: notes.trim() || null };
      if (editing) await updateDeadline(editing.id, payload);
      else await createDeadline(payload);
      toast({ title: editing ? 'Deadline updated' : 'Deadline created' });
      close(); await reload();
    } catch (e) { toast({ title: 'Save failed', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const remove = async (r: ReportDeadline) => {
    if (!confirm(`Delete "${r.title}"?`)) return;
    try { await deleteDeadline(r.id); toast({ title: 'Deleted' }); await reload(); }
    catch (e) { toast({ title: 'Delete failed', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
  };

  const filtered = filterDiv === 'all' ? rows : filterDiv === 'none' ? rows.filter((r) => !r.division) : rows.filter((r) => r.division === filterDiv);

  if (loading) return <div><WorkspacePageHeader title="Report deadlines" description="Plan and publish report deadlines per division." /><WorkspaceLoader /></div>;

  return (
    <div>
      <WorkspacePageHeader title="Report deadlines" description="Plan and publish report deadlines per division. Deadlines show on the workspace Calendar." />

      <div className="flex flex-wrap items-center gap-3 mb-4 font-body">
        <Label className="text-sm">Filter division</Label>
        <select value={filterDiv} onChange={(e) => setFilterDiv(e.target.value)} className="border border-separator bg-background px-2 py-1 text-sm font-serif uppercase">
          <option value="all">All divisions</option>
          <option value="none">All-divisions (no division)</option>
          {DIVISIONS.map((d) => <option key={d} value={d}>{DIVISION_LABELS[d]}</option>)}
        </select>
        <div className="ml-auto"><Button onClick={openCreate} className="font-body"><Plus className="h-4 w-4 mr-2" />New deadline</Button></div>
      </div>

      <div className="border border-separator">
        <table className="w-full font-body text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2">Due date</th>
              <th className="text-left px-3 py-2">Title</th>
              <th className="text-left px-3 py-2">Division</th>
              <th className="text-left px-3 py-2">Notes</th>
              <th className="text-right px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">No deadlines.</td></tr>
            ) : filtered.map((r) => (
              <tr key={r.id} className="border-t border-separator">
                <td className="px-3 py-2 whitespace-nowrap">{new Date(r.due_date).toLocaleDateString()}</td>
                <td className="px-3 py-2">{r.title}</td>
                <td className="px-3 py-2">{r.division ? DIVISION_LABELS[r.division] : 'All divisions'}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.notes || '-'}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(r)}><Trash2 className="h-4 w-4" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={creating} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-serif">{editing ? 'Edit deadline' : 'New deadline'}</DialogTitle></DialogHeader>
          <div className="space-y-3 font-body">
            <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Monthly equity report" /></div>
            <div><Label>Due date</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
            <div>
              <Label>Division</Label>
              <select value={division} onChange={(e) => setDivision(e.target.value)} className="w-full border border-separator bg-background px-2 py-2 text-sm font-serif uppercase">
                <option value="">All divisions</option>
                {DIVISIONS.map((d) => <option key={d} value={d}>{DIVISION_LABELS[d]}</option>)}
              </select>
            </div>
            <div><Label>Notes (optional)</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={close}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving</> : 'Save'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
