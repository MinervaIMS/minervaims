import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Loader2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { divisionLabels, type OrgDivision } from '@/lib/roles';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import {
  listAlumniCalls, saveAlumniCall, deleteAlumniCall, listAlumniDirectory,
  type AlumniCall, type AlumniCallInput, type CallParticipant, type AlumniOption,
} from '@/lib/alumni-aod-api';

const DIVISIONS: OrgDivision[] = ['equity', 'investment', 'macro', 'portfolio', 'quant'];
const EMPTY: AlumniCallInput = { division: null, planned_date: '', status: 'planned', notes: '', participants: [] };

export default function AlumniCalls() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [calls, setCalls] = useState<AlumniCall[]>([]);
  const [alumni, setAlumni] = useState<AlumniOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AlumniCallInput>(EMPTY);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [c, a] = await Promise.all([listAlumniCalls(session), listAlumniDirectory()]);
      setCalls(c); setAlumni(a);
    } catch (e) { toast({ title: 'Failed to load', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setLoading(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const alumniById = useMemo(() => { const m: Record<string, AlumniOption> = {}; for (const a of alumni) m[a.id] = a; return m; }, [alumni]);
  const available = useMemo(() => alumni.filter((a) => !form.participants.some((p) => p.alumni_id === a.id)), [alumni, form.participants]);
  // Search alumni by name or company for the invite typeahead.
  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [] as AlumniOption[];
    return available
      .filter((a) => `${a.name} ${a.surname} ${a.company ?? ''}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [available, search]);

  const openCreate = () => { setEditingId(null); setForm(EMPTY); setSearch(''); setDialogOpen(true); };
  const openEdit = (c: AlumniCall) => {
    setEditingId(c.id);
    setForm({ id: c.id, division: c.division, planned_date: c.planned_date ?? '', status: c.status, notes: c.notes ?? '', participants: c.participants.map((p) => ({ alumni_id: p.alumni_id, alumnus_name: p.alumnus_name, former_role: p.former_role })) });
    setSearch('');
    setDialogOpen(true);
  };

  const addParticipant = (alumniId: string) => {
    const a = alumniById[alumniId];
    if (!a) return;
    if (form.participants.length >= 5) { toast({ title: 'A call can have at most 5 alumni', variant: 'destructive' }); return; }
    const participant: CallParticipant = { alumni_id: a.id, alumnus_name: `${a.name} ${a.surname}`, former_role: a.company };
    setForm((f) => ({ ...f, participants: [...f.participants, participant] }));
    setSearch('');
  };
  const removeParticipant = (idx: number) => setForm((f) => ({ ...f, participants: f.participants.filter((_, i) => i !== idx) }));

  const save = async () => {
    if (form.participants.length < 2) { toast({ title: 'Add at least 2 alumni', description: 'A call is a group of 2 to 5 alumni.', variant: 'destructive' }); return; }
    setSaving(true);
    try { await saveAlumniCall(session, form); toast({ title: editingId ? 'Updated' : 'Added' }); setDialogOpen(false); await load(); }
    catch (e) { toast({ title: 'Could not save', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const remove = async (c: AlumniCall) => {
    if (!confirm('Delete this alumni call?')) return;
    try { await deleteAlumniCall(session, c.id); await load(); } catch (e) { toast({ title: 'Could not delete', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
  };

  return (
    <div>
      <WorkspacePageHeader title="Alumni calls" description="Each alumni call is an initiative grouping 2 to 5 alumni, organised by a division on a date. Alumni are verified against the alumni directory; the organiser is recorded automatically."
        actions={<Button className="font-body" onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add call</Button>} />

      {loading ? <WorkspaceLoader /> : calls.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">No alumni calls recorded yet.</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {calls.map((c) => (
            <Card key={c.id}><CardContent className="py-4">
              <div className="flex items-start justify-between gap-4 font-body">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="text-foreground">{c.planned_date ? new Date(c.planned_date).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : 'Date to be set'}</span>
                    {c.division && c.division !== 'none' && <span className="text-xs text-muted-foreground">{divisionLabels[c.division]}</span>}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {c.participants.map((p, i) => (
                      <span key={i} className="text-xs bg-accent/10 text-accent px-2 py-0.5">{p.alumnus_name}{p.former_role ? ` · ${p.former_role}` : ''}</span>
                    ))}
                  </div>
                  {c.notes && <p className="text-sm text-muted-foreground mt-2">{c.notes}</p>}
                  <div className="text-xs text-muted-foreground mt-2">Organised by {c.organiser_name || 'Unknown'}</div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="destructive" size="icon" onClick={() => remove(c)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-serif">{editingId ? 'Edit alumni call' : 'Add alumni call'}</DialogTitle></DialogHeader>
          <div className="space-y-4 font-body">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Organising division</Label>
                <Select value={form.division || 'none'} onValueChange={(v) => setForm({ ...form, division: v === 'none' ? null : v as OrgDivision })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">-</SelectItem>{DIVISIONS.map((d) => <SelectItem key={d} value={d}>{divisionLabels[d]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Date</Label><Input type="date" value={form.planned_date ?? ''} onChange={(e) => setForm({ ...form, planned_date: e.target.value })} /></div>
            </div>

            <div className="space-y-2">
              <Label>Alumni (2 to 5) *</Label>
              {/* Invited alumni — each chip shows the alumnus and their company. */}
              <div className="flex flex-wrap gap-1.5">
                {form.participants.map((p, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-sm bg-accent/10 text-accent px-2 py-1">
                    {p.alumnus_name}{p.former_role ? ` · ${p.former_role}` : ''}
                    <button type="button" onClick={() => removeParticipant(i)}><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
              {/* Searchable typeahead over the alumni directory. */}
              {form.participants.length < 5 && (
                <div className="relative">
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search alumni to invite by name or company…"
                  />
                  {search.trim() && (
                    <div className="mt-1 border border-separator rounded-md divide-y divide-separator max-h-56 overflow-y-auto">
                      {searchResults.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">No matching alumni in the directory.</div>
                      ) : searchResults.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => addParticipant(a.id)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center justify-between gap-3"
                        >
                          <span className="text-foreground">{a.name} {a.surname}</span>
                          {a.company && <span className="text-xs text-muted-foreground shrink-0">{a.company}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground">Alumni must exist in the alumni directory. If someone is missing, add them in the Alumni section first.</p>
            </div>

            <div className="space-y-1"><Label>Notes</Label><Textarea rows={2} value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. Panel on careers in asset management" /></div>
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
