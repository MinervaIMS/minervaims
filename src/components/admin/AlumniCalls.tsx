import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { divisionLabels, type OrgDivision } from '@/lib/roles';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import {
  listAlumniCalls, saveAlumniCall, deleteAlumniCall, CALL_STATUS_LABELS,
  type AlumniCall, type AlumniCallInput, type CallStatus,
} from '@/lib/alumni-aod-api';

const DIVISIONS: OrgDivision[] = ['equity', 'investment', 'macro', 'portfolio', 'quant'];
const EMPTY: AlumniCallInput = { alumnus_name: '', former_role: '', current_company: '', current_position: '', division: null, responsible_person: '', planned_date: '', status: 'planned', notes: '' };

export default function AlumniCalls() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [calls, setCalls] = useState<AlumniCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AlumniCallInput>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setCalls(await listAlumniCalls(session)); }
    catch (e) { toast({ title: 'Failed to load', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setLoading(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditingId(null); setForm(EMPTY); setDialogOpen(true); };
  const openEdit = (c: AlumniCall) => {
    setEditingId(c.id);
    setForm({ id: c.id, alumnus_name: c.alumnus_name, former_role: c.former_role ?? '', current_company: c.current_company ?? '', current_position: c.current_position ?? '', division: c.division, responsible_person: c.responsible_person ?? '', planned_date: c.planned_date ?? '', status: c.status, notes: c.notes ?? '' });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.alumnus_name?.trim()) { toast({ title: 'Alumnus name is required', variant: 'destructive' }); return; }
    setSaving(true);
    try { await saveAlumniCall(session, form); toast({ title: editingId ? 'Updated' : 'Added' }); setDialogOpen(false); await load(); }
    catch (e) { toast({ title: 'Could not save', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const remove = async (c: AlumniCall) => {
    if (!confirm(`Delete the call record for ${c.alumnus_name}?`)) return;
    try { await deleteAlumniCall(session, c.id); await load(); } catch (e) { toast({ title: 'Could not delete', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
  };

  return (
    <div>
      <WorkspacePageHeader title="Alumni calls" description="Track which alumni have been invited, by which division, by whom, when, and the status - to avoid double-inviting and keep the calendar of calls clear."
        actions={<Button className="font-body" onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add call</Button>} />

      {loading ? <WorkspaceLoader /> : calls.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">No alumni calls recorded yet.</p></CardContent></Card>
      ) : (
        <div className="border border-separator overflow-x-auto">
          <table className="w-full text-left font-body text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-normal">Alumnus</th>
                <th className="px-3 py-2 font-normal">Now</th>
                <th className="px-3 py-2 font-normal">Division</th>
                <th className="px-3 py-2 font-normal">Responsible</th>
                <th className="px-3 py-2 font-normal">Date</th>
                <th className="px-3 py-2 font-normal">Status</th>
                <th className="px-3 py-2 font-normal text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {calls.map((c) => (
                <tr key={c.id} className="border-t border-separator">
                  <td className="px-3 py-2 text-foreground whitespace-nowrap">{c.alumnus_name}{c.former_role ? <span className="block text-xs text-muted-foreground">{c.former_role}</span> : null}</td>
                  <td className="px-3 py-2">{[c.current_position, c.current_company].filter(Boolean).join(' · ') || '-'}</td>
                  <td className="px-3 py-2">{c.division && c.division !== 'none' ? divisionLabels[c.division] : '-'}</td>
                  <td className="px-3 py-2">{c.responsible_person || '-'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{c.planned_date ? new Date(c.planned_date).toLocaleDateString() : '-'}</td>
                  <td className="px-3 py-2">{CALL_STATUS_LABELS[c.status]}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="icon" onClick={() => openEdit(c)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="destructive" size="icon" onClick={() => remove(c)}><Trash2 className="h-4 w-4" /></Button>
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
          <DialogHeader><DialogTitle className="font-serif">{editingId ? 'Edit alumni call' : 'Add alumni call'}</DialogTitle></DialogHeader>
          <div className="space-y-3 font-body">
            <div className="space-y-1"><Label>Alumnus name *</Label><Input value={form.alumnus_name} onChange={(e) => setForm({ ...form, alumnus_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Former role / division</Label><Input value={form.former_role ?? ''} onChange={(e) => setForm({ ...form, former_role: e.target.value })} /></div>
              <div className="space-y-1">
                <Label>Inviting division</Label>
                <Select value={form.division || 'none'} onValueChange={(v) => setForm({ ...form, division: v === 'none' ? null : v as OrgDivision })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">-</SelectItem>{DIVISIONS.map((d) => <SelectItem key={d} value={d}>{divisionLabels[d]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Current company</Label><Input value={form.current_company ?? ''} onChange={(e) => setForm({ ...form, current_company: e.target.value })} /></div>
              <div className="space-y-1"><Label>Current position</Label><Input value={form.current_position ?? ''} onChange={(e) => setForm({ ...form, current_position: e.target.value })} /></div>
              <div className="space-y-1"><Label>Responsible person</Label><Input value={form.responsible_person ?? ''} onChange={(e) => setForm({ ...form, responsible_person: e.target.value })} /></div>
              <div className="space-y-1"><Label>Planned / held date</Label><Input type="date" value={form.planned_date ?? ''} onChange={(e) => setForm({ ...form, planned_date: e.target.value })} /></div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as CallStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(Object.keys(CALL_STATUS_LABELS) as CallStatus[]).map((s) => <SelectItem key={s} value={s}>{CALL_STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
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
