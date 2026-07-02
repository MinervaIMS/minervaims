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
import { Plus, Pencil, Trash2, ExternalLink, FileText, StickyNote, Code, Loader2, Upload, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { divisionLabels, type OrgDivision } from '@/lib/roles';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import {
  listResources, saveResource, deleteResource, uploadResourceFile, setResourceFavourite, signResourceFile,
  RESOURCE_TYPE_LABELS, MAX_FAVOURITES, type ResourceRow, type ResourceInput, type ResourceType,
} from '@/lib/resources-api';

const TYPES: ResourceType[] = ['text', 'file', 'link', 'code', 'other'];

interface Props {
  /** Resource bucket, e.g. 'reports_templates', 'smm_instagram', 'external_relations'. */
  category: string;
  title: string;
  description: string;
  /** Divisions selectable for items; defaults to the five core divisions + none. */
  divisions?: OrgDivision[];
}

const DEFAULT_DIVISIONS: OrgDivision[] = ['equity', 'investment', 'macro', 'portfolio', 'quant', 'none'];

export default function ResourceManager({ category, title, description, divisions = DEFAULT_DIVISIONS }: Props) {
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

  const empty: ResourceInput = { category, division: divisions[0], type: 'text', title: '', description: '', file_url: '', link_url: '', body: '', is_favourite: false };
  const [form, setForm] = useState<ResourceInput>(empty);

  const showDivisions = divisions.filter((d) => d !== 'none');

  const load = async () => {
    setLoading(true);
    try { setItems(await listResources(category)); }
    catch (e) { toast({ title: 'Failed to load', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setLoading(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [category]);

  const visible = useMemo(
    () => items.filter((i) => divFilter === 'all' || i.division === divFilter),
    [items, divFilter],
  );
  const favourites = useMemo(() => visible.filter((i) => i.is_favourite), [visible]);
  const rest = useMemo(() => visible.filter((i) => !i.is_favourite), [visible]);
  const favouriteCount = items.filter((i) => i.is_favourite).length;

  const openCreate = () => { setEditingId(null); setForm({ ...empty }); setDialogOpen(true); };
  const openEdit = (r: ResourceRow) => {
    setEditingId(r.id);
    setForm({ id: r.id, category, division: r.division, type: r.type, title: r.title, description: r.description ?? '', file_url: r.file_url ?? '', link_url: r.link_url ?? '', body: r.body ?? '', is_favourite: r.is_favourite });
    setDialogOpen(true);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try { const url = await uploadResourceFile(session, file); setForm((p) => ({ ...p, file_url: url })); toast({ title: 'File uploaded' }); }
    catch (e) { toast({ title: 'Upload failed', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setUploading(false); }
  };

  const save = async () => {
    if (!form.title.trim()) { toast({ title: 'A title is required', variant: 'destructive' }); return; }
    setSaving(true);
    try { await saveResource(session, form); toast({ title: editingId ? 'Updated' : 'Added' }); setDialogOpen(false); await load(); }
    catch (e) { toast({ title: 'Could not save', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const toggleFavourite = async (r: ResourceRow) => {
    const next = !r.is_favourite;
    if (next && favouriteCount >= MAX_FAVOURITES) {
      toast({ title: `You can pin at most ${MAX_FAVOURITES} favourites here.`, variant: 'destructive' });
      return;
    }
    setItems((prev) => prev.map((x) => (x.id === r.id ? { ...x, is_favourite: next } : x)));
    try { await setResourceFavourite(session, r.id, next); }
    catch (e) { toast({ title: 'Could not update', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); load(); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try { await deleteResource(session, deleteTarget.id); setDeleteTarget(null); await load(); toast({ title: 'Removed' }); }
    catch (e) { toast({ title: 'Could not delete', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
  };

  const openFile = async (fileUrl: string) => {
    try { const url = await signResourceFile(session, fileUrl); window.open(url, '_blank', 'noopener'); }
    catch (e) { toast({ title: 'Could not open the file', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
  };

  const typeIcon = (t: ResourceType) =>
    t === 'text' ? <StickyNote className="h-4 w-4" />
      : t === 'code' ? <Code className="h-4 w-4" />
      : t === 'link' ? <ExternalLink className="h-4 w-4" />
      : <FileText className="h-4 w-4" />;

  const ItemCard = ({ r }: { r: ResourceRow }) => (
    <Card><CardContent className="py-4">
      <div className="flex items-start justify-between gap-4 font-body">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-foreground">
            {typeIcon(r.type)}
            <span className="truncate">{r.title}</span>
            <span className="text-xs text-muted-foreground">· {RESOURCE_TYPE_LABELS[r.type]}{r.division !== 'none' ? ` · ${divisionLabels[r.division]}` : ''}</span>
          </div>
          {r.description && <p className="text-sm text-muted-foreground mt-1">{r.description}</p>}
          {r.body && <p className="text-sm text-foreground mt-2 whitespace-pre-wrap">{r.body}</p>}
          <div className="flex gap-4 mt-2">
            {r.link_url && <a href={r.link_url} target="_blank" rel="noopener noreferrer" className="text-accent text-sm underline inline-flex items-center gap-1">Open link <ExternalLink className="h-3 w-3" /></a>}
            {r.file_url && <button type="button" onClick={() => openFile(r.file_url!)} className="text-accent text-sm underline inline-flex items-center gap-1">Open file <FileText className="h-3 w-3" /></button>}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            {r.author_name || 'Unknown'}{r.author_role ? `, ${r.author_role}` : ''} · {new Date(r.created_at).toLocaleDateString()}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="icon" title={r.is_favourite ? 'Unpin favourite' : 'Pin as favourite'} onClick={() => toggleFavourite(r)}>
            <Star className={`h-4 w-4 ${r.is_favourite ? 'fill-accent text-accent' : ''}`} />
          </Button>
          <Button variant="outline" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
          <Button variant="destructive" size="icon" onClick={() => setDeleteTarget(r)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>
    </CardContent></Card>
  );

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

      {loading ? <WorkspaceLoader /> : visible.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">No items yet.</p></CardContent></Card>
      ) : (
        <div className="space-y-6">
          {favourites.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-accent mb-2"><Star className="h-4 w-4 fill-accent" /><span className="font-body text-xs uppercase tracking-wider">Favourites ({favouriteCount}/{MAX_FAVOURITES})</span></div>
              <div className="space-y-3">{favourites.map((r) => <ItemCard key={r.id} r={r} />)}</div>
            </div>
          )}
          <div className="space-y-3">{rest.map((r) => <ItemCard key={r.id} r={r} />)}</div>
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
            <div className="space-y-1"><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Equity DCF model template" /></div>
            <div className="space-y-1"><Label>Description</Label><Textarea rows={2} value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Why is it useful? Explain what this is and when to use it." /></div>

            {form.type === 'text' ? (
              <div className="space-y-1"><Label>Text</Label><Textarea rows={4} value={form.body ?? ''} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Write the note or content here." /></div>
            ) : form.type === 'link' ? (
              <div className="space-y-1"><Label>Link</Label><Input value={form.link_url ?? ''} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="https://drive.google.com/..." /></div>
            ) : form.type === 'code' ? (
              <div className="space-y-1"><Label>Repository / code link</Label><Input value={form.link_url ?? ''} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="https://github.com/minerva/..." /></div>
            ) : (
              <div className="space-y-1">
                <Label>{form.type === 'file' ? 'File' : 'File or link'}</Label>
                <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} />
                <div className="flex items-center gap-3">
                  <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
                    {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading</> : <><Upload className="h-4 w-4 mr-2" />Upload</>}
                  </Button>
                  {form.file_url && <span className="text-xs text-green-700">File attached</span>}
                </div>
                <Input className="mt-2" value={form.link_url ?? ''} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="...or paste an external link (https://...)" />
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
            <AlertDialogTitle>Remove "{deleteTarget?.title}"?</AlertDialogTitle>
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
