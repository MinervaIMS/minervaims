import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Loader2, Link2, AlertTriangle, CheckCircle2, Building2, Quote } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { logActivity } from '@/lib/activity-log';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import {
  listAllTestimonials, listAlumniLite, saveTestimonial, deleteTestimonial, reorderTestimonials, resolveAlumnus,
  type Testimonial, type AlumniLite,
} from '@/lib/testimonials-api';

interface FormState { id: string | null; quote: string; alumni_id: string | null; name: string; role_label: string; published: boolean }

export default function TestimonialsManagement() {
  const { session } = useAuth();
  const { primaryRole } = useAccess();
  const { toast } = useToast();
  const [items, setItems] = useState<Testimonial[]>([]);
  const [alumni, setAlumni] = useState<AlumniLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Testimonial | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [ts, al] = await Promise.all([listAllTestimonials(), listAlumniLite().catch(() => [])]);
      setItems(ts);
      setAlumni(al);
    } catch (e) { toast({ title: 'Failed to load', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setLoading(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const alumniById = useMemo(() => Object.fromEntries(alumni.map((a) => [a.id, a])), [alumni]);

  const openCreate = () => setForm({ id: null, quote: '', alumni_id: null, name: '', role_label: '', published: true });
  const openEdit = (t: Testimonial) => setForm({ id: t.id, quote: t.quote, alumni_id: t.alumni_id, name: t.name, role_label: t.role_label, published: t.published });

  const pickAlumnus = (value: string) => {
    if (!form) return;
    if (value === 'none') { setForm({ ...form, alumni_id: null }); return; }
    const a = alumniById[value];
    setForm({ ...form, alumni_id: value, name: a ? `${a.name} ${a.surname}` : form.name });
  };

  const save = async () => {
    if (!form) return;
    if (!form.quote.trim()) { toast({ title: 'A quote is required', variant: 'destructive' }); return; }
    if (!form.role_label.trim()) { toast({ title: 'A role label is required (e.g. "Former President")', variant: 'destructive' }); return; }
    if (!form.alumni_id && !form.name.trim()) { toast({ title: 'Link an alumnus or type a name', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      await saveTestimonial(session, {
        id: form.id ?? undefined, quote: form.quote.trim(), alumni_id: form.alumni_id,
        name: form.name.trim(), role_label: form.role_label.trim(), published: form.published,
      });
      toast({ title: form.id ? 'Testimonial updated' : 'Testimonial added' });
      logActivity(session, primaryRole, { action: form.id ? 'update' : 'create', section: 'Website', subsection: 'Testimonials', entityType: 'testimonial', entityName: form.name.trim() });
      setForm(null);
      await load();
    } catch (e) { toast({ title: 'Could not save', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const togglePublished = async (t: Testimonial) => {
    setItems((prev) => prev.map((x) => (x.id === t.id ? { ...x, published: !x.published } : x)));
    try { await saveTestimonial(session, { id: t.id, quote: t.quote, alumni_id: t.alumni_id, name: t.name, role_label: t.role_label, published: !t.published }); }
    catch (e) { toast({ title: 'Could not update', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); load(); }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const next = [...items];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    setBusy(true);
    try { await reorderTestimonials(session, next.map((t) => t.id)); }
    catch (e) { toast({ title: 'Could not reorder', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); load(); }
    finally { setBusy(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTestimonial(session, deleteTarget.id);
      logActivity(session, primaryRole, { action: 'delete', section: 'Website', subsection: 'Testimonials', entityType: 'testimonial', entityId: deleteTarget.id, entityName: deleteTarget.name });
      setDeleteTarget(null); await load(); toast({ title: 'Removed' });
    }
    catch (e) { toast({ title: 'Could not delete', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
  };

  const selectedAlumnusCompany = form?.alumni_id ? alumniById[form.alumni_id]?.company?.trim() : undefined;

  return (
    <div>
      <WorkspacePageHeader
        title="Testimonials"
        description="The control centre for the homepage testimonials carousel. Add or edit the quotes, link each one to the alumnus who gave it, and check that their current company is found and shown correctly. Reorder to change the sequence on the homepage; unpublish to hide one without deleting it."
        actions={<Button className="font-body" onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add testimonial</Button>}
      />

      {loading ? <WorkspaceLoader /> : (
        <div className="space-y-4">
          <Card><CardContent className="py-3 font-body text-sm text-muted-foreground flex items-start gap-2">
            <Link2 className="h-4 w-4 mt-0.5 shrink-0 text-accent" />
            <span>Every testimonial comes from an alumnus/alumna. Link each one to its alumni record so the homepage can show “…, currently at &lt;Company&gt;”. A warning below means the person or their company could not be found; fix it in <strong>People → Alumni</strong> or by re-linking here.</span>
          </CardContent></Card>

          {items.length === 0 ? (
            <Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">No testimonials yet.</p></CardContent></Card>
          ) : items.map((t, i) => {
            const { alumnus, linked } = resolveAlumnus(t, alumni);
            const company = alumnus?.company?.trim();
            return (
              <Card key={t.id} className={t.published ? '' : 'opacity-60'}>
                <CardContent className="py-4 font-body">
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col gap-1 shrink-0">
                      <Button variant="outline" size="icon" className="h-7 w-7" disabled={i === 0 || busy} onClick={() => move(i, -1)}><ArrowUp className="h-3.5 w-3.5" /></Button>
                      <span className="text-center text-xs text-muted-foreground">{i + 1}</span>
                      <Button variant="outline" size="icon" className="h-7 w-7" disabled={i === items.length - 1 || busy} onClick={() => move(i, 1)}><ArrowDown className="h-3.5 w-3.5" /></Button>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2 text-foreground">
                        <Quote className="h-4 w-4 text-accent shrink-0 mt-1" />
                        <p className="text-sm">{t.quote}</p>
                      </div>
                      <div className="mt-2 text-sm text-foreground font-medium">{t.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {t.role_label}{company ? `, currently at ${company}` : ''}
                      </div>

                      {/* Connection + company diagnostics */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {alumnus ? (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="h-3.5 w-3.5" />{linked ? 'Linked to alumnus' : 'Matched by name'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                            <AlertTriangle className="h-3.5 w-3.5" />No matching alumnus
                          </span>
                        )}
                        {alumnus && (company ? (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            <Building2 className="h-3.5 w-3.5" />{company}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                            <AlertTriangle className="h-3.5 w-3.5" />No company on file
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{t.published ? 'Published' : 'Hidden'}</span>
                        <Switch checked={t.published} onCheckedChange={() => togglePublished(t)} aria-label="Published" />
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="icon" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="destructive" size="icon" onClick={() => setDeleteTarget(t)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / edit dialog */}
      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">{form?.id ? 'Edit testimonial' : 'Add testimonial'}</DialogTitle>
            <DialogDescription className="font-body">Testimonials are provided by alumni. Link the alumnus so their company shows automatically.</DialogDescription>
          </DialogHeader>
          {form && (
            <div className="space-y-4 font-body">
              <div className="space-y-1"><Label>Quote *</Label><Textarea rows={4} value={form.quote} onChange={(e) => setForm({ ...form, quote: e.target.value })} placeholder="The testimonial sentence, exactly as it should appear." /></div>

              <div className="space-y-1">
                <Label>Alumnus</Label>
                <Select value={form.alumni_id ?? 'none'} onValueChange={pickAlumnus}>
                  <SelectTrigger><SelectValue placeholder="Link an alumnus" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not linked (type name manually)</SelectItem>
                    {alumni.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name} {a.surname}{a.company ? ` · ${a.company}` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.alumni_id && (
                  selectedAlumnusCompany
                    ? <p className="text-xs text-emerald-700">Homepage will show: “{form.role_label || 'role'}, currently at {selectedAlumnusCompany}”.</p>
                    : <p className="text-xs text-amber-700">This alumnus has no company on file; add it in People → Alumni so it shows on the homepage.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Display name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Anna Maruccio" disabled={!!form.alumni_id} /></div>
                <div className="space-y-1"><Label>Role label *</Label><Input value={form.role_label} onChange={(e) => setForm({ ...form, role_label: e.target.value })} placeholder="e.g. Former President" /></div>
              </div>

              <div className="flex items-center justify-between">
                <div><Label>Published</Label><p className="text-xs text-muted-foreground">Off = kept but hidden from the homepage.</p></div>
                <Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} />
              </div>

              <div className="flex gap-3 pt-1">
                <Button className="flex-1" onClick={save} disabled={saving}>{saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving</> : 'Save'}</Button>
                <Button variant="outline" onClick={() => setForm(null)}>Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this testimonial?</AlertDialogTitle>
            <AlertDialogDescription>“{deleteTarget?.name}” will be removed from the homepage. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
