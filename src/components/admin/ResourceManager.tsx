import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, ExternalLink, FileText, StickyNote, Loader2, Upload, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { divisionLabels, type OrgDivision } from '@/lib/roles';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import {
  listResources, saveResource, deleteResource, uploadResourceFile,
  RESOURCE_TYPE_LABELS, type ResourceRow, type ResourceInput, type ResourceType,
} from '@/lib/resources-api';

const TYPES: ResourceType[] = ['drive_link', 'code_repo', 'ppt', 'excel', 'word', 'pdf', 'file', 'note', 'other'];
const LINK_TYPES: ResourceType[] = ['drive_link', 'code_repo', 'other'];

interface Props {
  /** Resource bucket, e.g. 'reports_templates', 'smm_instagram', 'external_relations'. */
  category: string;
  title: string;
  description: string;
  /** Divisions selectable for items; defaults to the five core divisions + none. */
  divisions?: OrgDivision[];
  /** Enable a single "main reference" highlighted item (Design, Brand & Logo). */
  allowPrimary?: boolean;
}

const DEFAULT_DIVISIONS: OrgDivision[] = ['equity', 'investment', 'macro', 'portfolio', 'quant', 'none'];

export default function ResourceManager({ category, title, description, divisions = DEFAULT_DIVISIONS, allowPrimary = false }: Props) {
  const { session } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<ResourceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [divFilter, setDivFilter] = useState<OrgDivision | 'all'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ResourceRow | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const empty: ResourceInput = { category, division: divisions[0], type: 'note', title: '', description: '', reason: '', file_url: '', link_url: '', body: '', is_primary: false };
  const [form, setForm] = useState<ResourceInput>(empty);

  // Members with access to more than one division get the filter selector.
  const showDivisions = divisions.filter((d) => d !== 'none');

  const load = async () => {
    setLoading(true);
    try { setItems(await listResources(category)); }
    catch (e) { toast({ title: 'Failed to load', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setLoading(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [category]);

  const primaryItem = allowPrimary ? items.find((i) => i.is_primary) : undefined;
  const rows = useMemo(
    () => items.filter((i) => (divFilter === 'all' || i.division === divFilter) && !(allowPrimary && i.is_primary)),
    [items, divFilter, allowPrimary],
  );

  const openCreate = () => { setEditingId(null); setForm({ ...empty }); setDialogOpen(true); };
  const openEdit = (r: ResourceRow) => {
    setEditingId(r.id);
    setForm({ id: r.id, category, division: r.division, type: r.type, title: r.title, description: r.description ?? '', reason: r.reason ?? '', file_url: r.file_url ?? '', link_url: r.link_url ?? '', body: r.body ?? '', is_primary: r.is_primary });
    setDialogOpen(true);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try { const url = await uploadResourceFile(session, file); setForm((p) => ({ ...p, file_url: url })); toast({ title: 'File uploaded' }); }
    catch (e) { toast({ title: 'Upload failed', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setUploading(false); }
  };

  const save = async () => {
    if (!form.title.trim()) { toast({ title: 'Title is required', variant: 'destructive' }); return; }
    setSaving(true);
    try { await saveResource(session, form); toast({ title: editingId ? 'Updated' : 'Added' }); setDialogOpen(false); await load(); }
    catch (e) { toast({ title: 'Could not save', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try { await deleteResource(session, deleteTarget.id); setDeleteTarget(null); await load(); toast({ title: 'Removed' }); }
    catch (e) { toast({ title: 'Could not delete', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
  };

  const icon = (t: ResourceType) => t === 'note' ? <StickyNote className="h-4 w-4" /> : LINK_TYPES.includes(t) ? <ExternalLink className="h-4 w-4" /> : <FileText className="h-4 w-4" />;

  return (
    <div>
      <WorkspacePageHeader title={title} description={description} actions={
        <Button className="font-body" onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add item</Button>
      } />

      {showDivisions.length > 1 && (
        <div className="mb-6">
          <label className="font-body text-xs text-muted-foreground uppercase tracking-wider block mb-2">Division</label>
          <Select value={divFilter} onValueChange={(v) => setDivFilter(v as OrgDivision | 'all')}>
            <SelectTrigger className="min-w-[200px] font-body"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All divisions</SelectItem>
              {showDivisions.map((d) => <SelectItem key={d} value={d}>{divisionLabels[d]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {allowPrimary && primaryItem && (
        <Card className="mb-4 border-accent/40 bg-accent/5"><CardContent className="py-4">
          <div className="flex items-start justify-between gap-4 font-body">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-accent"><Star className="h-4 w-4 fill-accent" /><span className="text-xs uppercase tracking-wider">Main reference</span></div>
              <div className="text-foreground font-medium mt-1">{primaryItem.title}</div>
              {primaryItem.description && <p className="text-sm text-muted-foreground mt-1">{primaryItem.description}</p>}
              <div className="flex gap-4 mt-2">
                {primaryItem.link_url && <a href={primaryItem.link_url} target="_blank" rel="noopener noreferrer" className="text-accent text-sm underline">Open link</a>}
                {primaryItem.file_url && <a href={primaryItem.file_url} target="_blank" rel="noopener noreferrer" className="text-accent text-sm underline">Open file</a>}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="icon" onClick={() => openEdit(primaryItem)}><Edit className="h-4 w-4" /></Button>
              <Button variant="destructive" size="icon" onClick={() => setDeleteTarget(primaryItem)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardContent></Card>
      )}

      {loading ? <WorkspaceLoader /> : rows.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">No items yet.</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id}><CardContent className="py-4">
              <div className="flex items-start justify-between gap-4 font-body">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-foreground">
                    {icon(r.type)}
                    <span className="font-medium truncate">{r.title}</span>
                    <span className="text-xs text-muted-foreground">· {RESOURCE_TYPE_LABELS[r.type]}{r.division !== 'none' ? ` · ${divisionLabels[r.division]}` : ''}</span>
                  </div>
                  {r.description && <p className="text-sm text-muted-foreground mt-1">{r.description}</p>}
                  {r.reason && <p className="text-xs text-muted-foreground mt-1"><span className="uppercase tracking-wider">Why useful:</span> {r.reason}</p>}
                  {r.body && <p className="text-sm text-foreground mt-2 whitespace-pre-wrap">{r.body}</p>}
                  <div className="flex gap-4 mt-2">
                    {r.link_url && <a href={r.link_url} target="_blank" rel="noopener noreferrer" className="text-accent text-sm underline inline-flex items-center gap-1">Open link <ExternalLink className="h-3 w-3" /></a>}
                    {r.file_url && <a href={r.file_url} target="_blank" rel="noopener noreferrer" className="text-accent text-sm underline inline-flex items-center gap-1">Open file <FileText className="h-3 w-3" /></a>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">{r.author_name} · {new Date(r.created_at).toLocaleDateString()}</div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="icon" onClick={() => openEdit(r)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="destructive" size="icon" onClick={() => setDeleteTarget(r)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-serif">{editingId ? 'Edit item' : 'Add item'}</DialogTitle></DialogHeader>
          <div className="space-y-4 font-body">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as ResourceType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{RESOURCE_TYPE_LABELS[t]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Division</Label>
                <Select value={form.division} onValueChange={(v) => setForm({ ...form, division: v as OrgDivision })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{divisions.map((d) => <SelectItem key={d} value={d}>{d === 'none' ? 'General' : divisionLabels[d]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1"><Label>Short title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="space-y-1"><Label>Short description</Label><Input value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="space-y-1"><Label>Why it is useful</Label><Input value={form.reason ?? ''} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>

            {form.type === 'note' ? (
              <div className="space-y-1"><Label>Note</Label><Textarea rows={4} value={form.body ?? ''} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
            ) : LINK_TYPES.includes(form.type) ? (
              <div className="space-y-1"><Label>Link URL</Label><Input value={form.link_url ?? ''} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="https://…" /></div>
            ) : (
              <div className="space-y-1">
                <Label>File</Label>
                <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} />
                <div className="flex items-center gap-3">
                  <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
                    {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading</> : <><Upload className="h-4 w-4 mr-2" />Upload</>}
                  </Button>
                  {form.file_url && <span className="text-xs text-green-700">File attached</span>}
                </div>
                <Input className="mt-2" value={form.link_url ?? ''} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="…or paste an external link" />
              </div>
            )}

            {allowPrimary && (
              <div className="flex items-center justify-between border border-separator p-3">
                <Label htmlFor="primary">Main reference document</Label>
                <Switch id="primary" checked={!!form.is_primary} onCheckedChange={(v) => setForm({ ...form, is_primary: v })} />
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Button className="flex-1" onClick={save} disabled={saving}>{saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving</> : 'Save'}</Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove “{deleteTarget?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
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
