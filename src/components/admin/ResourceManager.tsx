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
import { Plus, Pencil, Trash2, ExternalLink, FileText, StickyNote, Link2, Loader2, Upload, Star, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { logActivity } from '@/lib/activity-log';
import { useAccess } from '@/hooks/useAccess';
import { useIsDesktop } from '@/hooks/use-desktop';
import { divisionLabels, type OrgDivision } from '@/lib/roles';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import {
  listResources, saveResource, deleteResource, uploadResourceFile, setResourceFavourite, signResourceFile,
  MAX_FAVOURITES, MAX_SOURCES_PER_KIND, type ResourceRow, type ResourceSource,
} from '@/lib/resources-api';

interface Props {
  /** Resource bucket, e.g. 'reports_templates', 'smm_instagram', 'external_relations'. */
  category: string;
  title: string;
  description: string;
  /** Divisions selectable for items; defaults to the five core divisions + none. */
  divisions?: OrgDivision[];
  /** If set, limit this instance to these divisions (per-division material). */
  restrictDivisions?: OrgDivision[] | null;
  /** May the viewer look at divisions other than their own? (Heads can.) */
  canViewOtherDivisions?: boolean;
  /** May the viewer create / edit / delete items here? (false = read-only.) */
  canManage?: boolean;
}

const DEFAULT_DIVISIONS: OrgDivision[] = ['equity', 'investment', 'macro', 'portfolio', 'quant', 'none'];
const MAX = MAX_SOURCES_PER_KIND;

interface FileEntry { value: string; label: string }

interface FormState {
  id: string | null;
  division: OrgDivision;
  title: string;
  description: string;
  texts: string[];
  links: string[];
  files: FileEntry[];
  is_favourite: boolean;
}

const emptyForm = (division: OrgDivision): FormState => ({
  id: null, division, title: '', description: '', texts: [''], links: [], files: [], is_favourite: false,
});

export default function ResourceManager({
  category, title, description, divisions = DEFAULT_DIVISIONS,
  restrictDivisions = null, canViewOtherDivisions = true, canManage = true,
}: Props) {
  const { session } = useAuth();
  const { primaryRole } = useAccess();
  // Repositories are consultable but read-only in the mobile shell.
  const isDesktop = useIsDesktop();
  canManage = canManage && isDesktop;
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  // Division scoping. When `restrictDivisions` is set this instance holds
  // per-division material: users who cannot view other divisions only ever
  // see their own division's items (plus shared "General" items), and can
  // only create in their own division.
  const scoped = !!restrictDivisions && restrictDivisions.length > 0;
  const lockedToOwn = scoped && !canViewOtherDivisions;
  const homeDivision = restrictDivisions?.[0];
  const viewable: OrgDivision[] = scoped ? [...(restrictDivisions as OrgDivision[]), 'none'] : divisions;
  const createDivisions = scoped ? divisions.filter((d) => viewable.includes(d)) : divisions;
  const createDefault: OrgDivision = (scoped ? homeDivision : undefined) ?? divisions[0];

  const [items, setItems] = useState<ResourceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [divFilter, setDivFilter] = useState<OrgDivision | 'all'>(scoped && canViewOtherDivisions && homeDivision ? homeDivision : 'all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ResourceRow | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm(createDefault));

  const showDivisions = (lockedToOwn ? viewable : divisions).filter((d) => d !== 'none');

  const load = async () => {
    setLoading(true);
    try { setItems(await listResources(category)); }
    catch (e) { toast({ title: 'Failed to load', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setLoading(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [category]);

  const visible = useMemo(
    () => items.filter((i) => {
      // Juniors never see other divisions' material.
      if (lockedToOwn && !viewable.includes(i.division)) return false;
      return divFilter === 'all' || i.division === divFilter;
    }),
    [items, divFilter, lockedToOwn, viewable],
  );
  const favourites = useMemo(() => visible.filter((i) => i.is_favourite), [visible]);
  const rest = useMemo(() => visible.filter((i) => !i.is_favourite), [visible]);
  const favouriteCount = items.filter((i) => i.is_favourite).length;

  const openCreate = () => { setForm(emptyForm(createDefault)); setDialogOpen(true); };
  const openEdit = (r: ResourceRow) => {
    setForm({
      id: r.id, division: r.division, title: r.title, description: r.description ?? '',
      texts: r.sources.filter((s) => s.kind === 'text').map((s) => s.value),
      links: r.sources.filter((s) => s.kind === 'link').map((s) => s.value),
      files: r.sources.filter((s) => s.kind === 'file').map((s) => ({ value: s.value, label: s.label || 'File' })),
      is_favourite: r.is_favourite,
    });
    setDialogOpen(true);
  };

  const handleUpload = async (file: File) => {
    if (form.files.length >= MAX) { toast({ title: `At most ${MAX} files per item.`, variant: 'destructive' }); return; }
    setUploading(true);
    try {
      const url = await uploadResourceFile(session, file);
      setForm((p) => ({ ...p, files: [...p.files, { value: url, label: file.name }] }));
      toast({ title: 'File added' });
    } catch (e) { toast({ title: 'Upload failed', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setUploading(false); }
  };

  // Build the sources array from whichever fields the user filled — the kind of
  // each source is inferred here, so there is no manual "type" selector.
  const buildSources = (f: FormState): ResourceSource[] => [
    ...f.texts.map((t) => t.trim()).filter(Boolean).map((t) => ({ kind: 'text' as const, value: t })),
    ...f.links.map((l) => l.trim()).filter(Boolean).map((l) => ({ kind: 'link' as const, value: l })),
    ...f.files.map((file) => ({ kind: 'file' as const, value: file.value, label: file.label })),
  ];

  const save = async () => {
    const sources = buildSources(form);
    if (!form.title.trim()) { toast({ title: 'A title is required', variant: 'destructive' }); return; }
    if (!form.description.trim()) { toast({ title: 'A description is required', variant: 'destructive' }); return; }
    if (sources.length < 1) { toast({ title: 'Add at least one text, link or file', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      logActivity(session, primaryRole, { action: form.id ? 'update' : 'create', section: 'Workspace', subsection: title, entityType: 'resource', entityName: form.title });
      await saveResource(session, {
        id: form.id ?? undefined, category, division: form.division,
        title: form.title.trim(), description: form.description.trim(), sources, is_favourite: form.is_favourite,
      });
      toast({ title: form.id ? 'Updated' : 'Added' });
      setDialogOpen(false);
      await load();
    } catch (e) { toast({ title: 'Could not save', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
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
    try { await deleteResource(session, deleteTarget.id); logActivity(session, primaryRole, { action: 'delete', section: 'Workspace', subsection: title, entityType: 'resource', entityId: deleteTarget.id, entityName: deleteTarget.title }); setDeleteTarget(null); await load(); toast({ title: 'Removed' }); }
    catch (e) { toast({ title: 'Could not delete', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
  };

  const openFile = async (fileUrl: string) => {
    try { const url = await signResourceFile(session, fileUrl); window.open(url, '_blank', 'noopener'); }
    catch (e) { toast({ title: 'Could not open the file', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
  };

  // ── Sub-editors for each source kind ──────────────────────────────────────
  const setTexts = (texts: string[]) => setForm((p) => ({ ...p, texts }));
  const setLinks = (links: string[]) => setForm((p) => ({ ...p, links }));

  const summaryIcons = (r: ResourceRow) => {
    const t = r.sources.filter((s) => s.kind === 'text').length;
    const l = r.sources.filter((s) => s.kind === 'link').length;
    const f = r.sources.filter((s) => s.kind === 'file').length;
    return (
      <span className="text-xs text-muted-foreground inline-flex items-center gap-2">
        {t > 0 && <span className="inline-flex items-center gap-0.5"><StickyNote className="h-3.5 w-3.5" />{t}</span>}
        {l > 0 && <span className="inline-flex items-center gap-0.5"><Link2 className="h-3.5 w-3.5" />{l}</span>}
        {f > 0 && <span className="inline-flex items-center gap-0.5"><FileText className="h-3.5 w-3.5" />{f}</span>}
      </span>
    );
  };

  const ItemCard = ({ r }: { r: ResourceRow }) => (
    <Card><CardContent className="py-4">
      <div className="flex items-start justify-between gap-4 font-body">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-foreground flex-wrap">
            <span className="truncate font-medium">{r.title}</span>
            {r.division !== 'none' && <span className="text-xs text-muted-foreground">· {divisionLabels[r.division]}</span>}
            {summaryIcons(r)}
          </div>
          {r.description && <p className="text-sm text-muted-foreground mt-1">{r.description}</p>}

          {/* Text sources */}
          {r.sources.filter((s) => s.kind === 'text').map((s, i) => (
            <p key={`t${i}`} className="text-sm text-foreground mt-2 whitespace-pre-wrap border-l-2 border-separator pl-3">{s.value}</p>
          ))}

          {/* Link + file sources */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
            {r.sources.filter((s) => s.kind === 'link').map((s, i) => (
              <a key={`l${i}`} href={s.value} target="_blank" rel="noopener noreferrer" className="text-accent text-sm underline inline-flex items-center gap-1">
                {s.label || 'Open link'} <ExternalLink className="h-3 w-3" />
              </a>
            ))}
            {r.sources.filter((s) => s.kind === 'file').map((s, i) => (
              <button key={`f${i}`} type="button" onClick={() => openFile(s.value)} className="text-accent text-sm underline inline-flex items-center gap-1">
                {s.label || 'Open file'} <FileText className="h-3 w-3" />
              </button>
            ))}
          </div>

          <div className="text-xs text-muted-foreground mt-2">
            {r.author_name || 'Unknown'}{r.author_role ? `, ${r.author_role}` : ''} · {new Date(r.created_at).toLocaleDateString()}
          </div>
        </div>
        {canManage && (
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="icon" title={r.is_favourite ? 'Unpin favourite' : 'Pin as favourite'} onClick={() => toggleFavourite(r)}>
              <Star className={`h-4 w-4 ${r.is_favourite ? 'fill-accent text-accent' : ''}`} />
            </Button>
            <Button variant="outline" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
            <Button variant="destructive" size="icon" onClick={() => setDeleteTarget(r)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        )}
      </div>
    </CardContent></Card>
  );

  return (
    <div>
      <WorkspacePageHeader title={title} description={description} actions={
        canManage ? <Button className="font-body" onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add item</Button> : undefined
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
          <DialogHeader><DialogTitle className="font-serif">{form.id ? 'Edit item' : 'Add item'}</DialogTitle></DialogHeader>
          <div className="space-y-4 font-body">
            {createDivisions.length > 1 && (
              <div className="space-y-1">
                <Label>Division</Label>
                <Select value={form.division} onValueChange={(v) => setForm({ ...form, division: v as OrgDivision })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{createDivisions.map((d) => <SelectItem key={d} value={d}>{d === 'none' ? 'General' : divisionLabels[d]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1"><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Equity DCF model template" /></div>
            <div className="space-y-1"><Label>Description *</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What is it and when to use it?" /></div>

            <div className="rounded-md border border-separator p-3 space-y-4">
              <p className="text-xs text-muted-foreground">Add any mix of texts, links and files (up to {MAX} of each, at least one in total). The type is detected from what you fill in.</p>

              {/* Texts */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5"><StickyNote className="h-4 w-4" />Texts ({form.texts.filter((t) => t.trim()).length}/{MAX})</Label>
                  {form.texts.length < MAX && <Button type="button" variant="ghost" size="sm" onClick={() => setTexts([...form.texts, ''])}><Plus className="h-3.5 w-3.5 mr-1" />Add text</Button>}
                </div>
                {form.texts.map((t, i) => (
                  <div key={i} className="flex gap-2">
                    <Textarea rows={2} value={t} onChange={(e) => setTexts(form.texts.map((x, j) => (j === i ? e.target.value : x)))} placeholder="Write the note or content here." />
                    <Button type="button" variant="ghost" size="icon" onClick={() => setTexts(form.texts.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>

              {/* Links */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5"><Link2 className="h-4 w-4" />Links / repos ({form.links.filter((l) => l.trim()).length}/{MAX})</Label>
                  {form.links.length < MAX && <Button type="button" variant="ghost" size="sm" onClick={() => setLinks([...form.links, ''])}><Plus className="h-3.5 w-3.5 mr-1" />Add link</Button>}
                </div>
                {form.links.map((l, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={l} onChange={(e) => setLinks(form.links.map((x, j) => (j === i ? e.target.value : x)))} placeholder="https://github.com/… or https://drive.google.com/…" />
                    <Button type="button" variant="ghost" size="icon" onClick={() => setLinks(form.links.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>

              {/* Files */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5"><FileText className="h-4 w-4" />Files ({form.files.length}/{MAX})</Label>
                  <div>
                    <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} />
                    {form.files.length < MAX && (
                      <Button type="button" variant="ghost" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
                        {uploading ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Uploading</> : <><Upload className="h-3.5 w-3.5 mr-1" />Add file</>}
                      </Button>
                    )}
                  </div>
                </div>
                {form.files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate flex-1">{f.label}</span>
                    <Button type="button" variant="ghost" size="icon" onClick={() => setForm((p) => ({ ...p, files: p.files.filter((_, j) => j !== i) }))}><X className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            </div>

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
