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
import { Plus, Pencil, Trash2, ExternalLink, FileText, StickyNote, Link2, Loader2, Upload, Star, X, Eye, Download } from 'lucide-react';
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
import { downloadTitled } from '@/lib/file-download';
import { previewLink } from '@/lib/link-label';

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
/**
 * A link and, optionally, what to call it.
 *
 * The label is almost always left blank: previewLink reads a good one out of
 * the URL. It exists for the cases the URL cannot describe - a share link with
 * an opaque id, an internal tool - where the person adding it knows the answer
 * and nothing else does.
 */
interface LinkEntry { value: string; label: string }

interface FormState {
  id: string | null;
  division: OrgDivision;
  title: string;
  description: string;
  texts: string[];
  links: LinkEntry[];
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
  // Quick look: a signed URL rendered in place, so a file can be checked
  // without leaving the page or committing to a download.
  const [preview, setPreview] = useState<{ url: string; label: string } | null>(null);
  const [previewBusy, setPreviewBusy] = useState<string | null>(null);
  const [downloadBusy, setDownloadBusy] = useState<string | null>(null);

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
      links: r.sources.filter((s) => s.kind === 'link').map((s) => ({ value: s.value, label: s.label ?? '' })),
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
    ...f.links
      .map((l) => ({ value: l.value.trim(), label: l.label.trim() }))
      .filter((l) => l.value)
      .map((l) => ({ kind: 'link' as const, value: l.value, label: l.label || null })),
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

  /** Quick look at an attachment, in place. */
  const previewFile = async (fileUrl: string, label: string) => {
    setPreviewBusy(fileUrl);
    try { setPreview({ url: await signResourceFile(session, fileUrl), label }); }
    catch (e) { toast({ title: 'Could not open the preview', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setPreviewBusy(null); }
  };

  /** Save an attachment under its own name, not the storage key. */
  const downloadFile = async (fileUrl: string, label: string) => {
    setDownloadBusy(fileUrl);
    try {
      const url = await signResourceFile(session, fileUrl);
      await downloadTitled(url, label.replace(/\.[a-z0-9]{1,8}$/i, ''), 'pdf');
    } catch (e) {
      toast({ title: 'Could not download the file', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setDownloadBusy(null); }
  };

  // ── Sub-editors for each source kind ──────────────────────────────────────
  const setTexts = (texts: string[]) => setForm((p) => ({ ...p, texts }));
  const setLinks = (links: LinkEntry[]) => setForm((p) => ({ ...p, links }));

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

          {/* LINKS SAY WHERE THEY GO. Every link used to render the same
              word, so a list of six was six identical labels and the only
              way to find out what any of them was, was to open it. The
              label is read out of the URL - the publication from the host,
              the subject from the path - and the address is printed under
              it so it can be checked before it is opened. Nothing about the
              anchor changes: same href, same target, same new tab. See
              lib/link-label.ts. */}
          {r.sources.filter((s) => s.kind === 'link').length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {r.sources.filter((s) => s.kind === 'link').map((s, i) => {
                const preview = previewLink(s.value, s.label);
                return (
                  <li key={`l${i}`} className="flex items-start gap-2 text-sm">
                    <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground mt-[3px]" />
                    <span className="min-w-0">
                      <a
                        href={s.value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent underline underline-offset-2 inline-flex items-baseline gap-1"
                        title={s.value}
                      >
                        <span className="break-words">{preview.label}</span>
                        <ExternalLink className="h-3 w-3 shrink-0 self-center" />
                      </a>
                      {/* The source, then the address. When the label already
                          IS the source - a link whose path says nothing - the
                          line drops to the address alone rather than printing
                          the same name twice. */}
                      {!preview.raw && (
                        <span className="block text-xs text-muted-foreground truncate">
                          {preview.label === preview.source ? preview.domain : `${preview.source} · ${preview.domain}`}
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Attachments: every file carries its own quick look and download. */}
          {r.sources.filter((s) => s.kind === 'file').length > 0 && (
            <ul className="mt-2 space-y-1">
              {r.sources.filter((s) => s.kind === 'file').map((s, i) => (
                <li key={`f${i}`} className="flex items-center gap-2 flex-wrap text-sm">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-foreground truncate max-w-[16rem]">{s.label || `File ${i + 1}`}</span>
                  <button type="button" onClick={() => previewFile(s.value, s.label || `File ${i + 1}`)}
                    className="text-accent underline inline-flex items-center gap-1 disabled:opacity-60"
                    disabled={previewBusy === s.value}>
                    {previewBusy === s.value ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}Preview
                  </button>
                  <button type="button" onClick={() => downloadFile(s.value, s.label || `File ${i + 1}`)}
                    className="text-accent underline inline-flex items-center gap-1 disabled:opacity-60"
                    disabled={downloadBusy === s.value}>
                    {downloadBusy === s.value ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}Download
                  </button>
                </li>
              ))}
            </ul>
          )}

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
          {/* Standard filter format: no label above the field. */}
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

              {/* Links.
                  The label is optional and the preview below each field shows
                  what the item will read if it is left blank, so nobody has to
                  type a name for a link that already explains itself - and the
                  few that do not can be named on the spot. */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5"><Link2 className="h-4 w-4" />Links / repos ({form.links.filter((l) => l.value.trim()).length}/{MAX})</Label>
                  {form.links.length < MAX && <Button type="button" variant="ghost" size="sm" onClick={() => setLinks([...form.links, { value: '', label: '' }])}><Plus className="h-3.5 w-3.5 mr-1" />Add link</Button>}
                </div>
                {form.links.map((l, i) => {
                  const preview = l.value.trim() ? previewLink(l.value, l.label) : null;
                  return (
                    <div key={i} className="space-y-1.5">
                      <div className="flex gap-2">
                        <Input
                          value={l.value}
                          onChange={(e) => setLinks(form.links.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                          placeholder="https://github.com/… or https://drive.google.com/…"
                        />
                        <Button type="button" variant="ghost" size="icon" onClick={() => setLinks(form.links.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
                      </div>
                      {l.value.trim() && (
                        <div className="pr-12 space-y-1">
                          <Input
                            value={l.label}
                            onChange={(e) => setLinks(form.links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                            placeholder={`Shown as: ${preview?.label ?? ''}`}
                            className="h-9 text-sm"
                            aria-label="What this link should be called (optional)"
                          />
                          <p className="text-xs text-muted-foreground">
                            {l.label.trim()
                              ? 'Your own wording is used.'
                              : preview && !preview.raw
                                ? <>Read from the address: <span className="text-foreground">{preview.label}</span> · {preview.domain}</>
                                : 'Add a name for this link so colleagues can tell what it is.'}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
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

      {/* Quick look at an attachment: full-height frame, download to hand. */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-5xl w-[min(96vw,64rem)] h-[92vh] flex flex-col gap-3 p-5">
          <DialogHeader className="shrink-0">
            <DialogTitle className="font-serif truncate pr-8">{preview?.label}</DialogTitle>
          </DialogHeader>
          {preview && (
            <>
              <div className="flex-1 min-h-0 border border-separator bg-muted/20">
                <iframe title={`preview-${preview.label}`} src={preview.url} className="w-full h-full block" />
              </div>
              <div className="shrink-0 flex justify-end gap-2 font-body">
                <Button variant="outline" onClick={() => window.open(preview.url, '_blank', 'noopener')}>
                  <ExternalLink className="h-4 w-4 mr-2" />Open in a new tab
                </Button>
                <Button onClick={() => downloadTitled(preview.url, preview.label.replace(/\.[a-z0-9]{1,8}$/i, ''), 'pdf')}>
                  <Download className="h-4 w-4 mr-2" />Download
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
