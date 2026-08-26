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
import { Plus, Pencil, Trash2, ExternalLink, FileText, StickyNote, Link2, Loader2, Upload, Star, X, Eye, Download, Phone, Mail } from 'lucide-react';
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
  MAX_FAVOURITES, SOURCE_LIMITS, type ResourceRow, type ResourceSource,
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
// Per-kind caps, read from the one table the server enforces.
const MAX_TEXTS = SOURCE_LIMITS.text;
const MAX_LINKS = SOURCE_LIMITS.link;
const MAX_FILES = SOURCE_LIMITS.file;
const MAX_PHONES = SOURCE_LIMITS.phone;
const MAX_EMAILS = SOURCE_LIMITS.email;

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
/** A telephone number or an address, with an optional note of whose it is. */
interface ContactEntry { value: string; label: string }

interface FormState {
  id: string | null;
  division: OrgDivision;
  title: string;
  description: string;
  texts: string[];
  links: LinkEntry[];
  files: FileEntry[];
  phones: ContactEntry[];
  emails: ContactEntry[];
  is_favourite: boolean;
}

const emptyForm = (division: OrgDivision): FormState => ({
  id: null, division, title: '', description: '', texts: [''], links: [], files: [],
  phones: [], emails: [], is_favourite: false,
});

/**
 * One telephone number or email address, with an optional note of whose it is.
 *
 * The note is the second field on the row rather than a line beneath it: a
 * contact is naturally two short things side by side, and stacking them would
 * have repeated the mistake the link editor is being corrected for.
 */
function ContactRow({ entry, valuePlaceholder, labelPlaceholder, inputMode, onChange, onRemove }: {
  entry: ContactEntry;
  valuePlaceholder: string;
  labelPlaceholder: string;
  inputMode: 'tel' | 'email';
  onChange: (next: ContactEntry) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex gap-2 min-w-0">
      <Input
        className="min-w-0 flex-[3]"
        type={inputMode === 'email' ? 'email' : 'tel'}
        inputMode={inputMode}
        value={entry.value}
        onChange={(e) => onChange({ ...entry, value: e.target.value })}
        placeholder={valuePlaceholder}
        aria-label={inputMode === 'email' ? 'Email address' : 'Telephone number'}
      />
      <Input
        className="min-w-0 flex-[2] text-sm"
        value={entry.label}
        onChange={(e) => onChange({ ...entry, label: e.target.value })}
        placeholder={labelPlaceholder}
        aria-label="Whose it is (optional)"
      />
      <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={onRemove}><X className="h-4 w-4" /></Button>
    </div>
  );
}

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
  // Which link row has its name field open. Only one at a time: the field is
  // an override, not part of filling the row in.
  const [namingLink, setNamingLink] = useState<number | null>(null);

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

  const openCreate = () => { setForm(emptyForm(createDefault)); setNamingLink(null); setDialogOpen(true); };
  const openEdit = (r: ResourceRow) => {
    setForm({
      id: r.id, division: r.division, title: r.title, description: r.description ?? '',
      texts: r.sources.filter((s) => s.kind === 'text').map((s) => s.value),
      links: r.sources.filter((s) => s.kind === 'link').map((s) => ({ value: s.value, label: s.label ?? '' })),
      files: r.sources.filter((s) => s.kind === 'file').map((s) => ({ value: s.value, label: s.label || 'File' })),
      phones: r.sources.filter((s) => s.kind === 'phone').map((s) => ({ value: s.value, label: s.label ?? '' })),
      emails: r.sources.filter((s) => s.kind === 'email').map((s) => ({ value: s.value, label: s.label ?? '' })),
      is_favourite: r.is_favourite,
    });
    setNamingLink(null);
    setDialogOpen(true);
  };

  const handleUpload = async (file: File) => {
    if (form.files.length >= MAX_FILES) { toast({ title: `At most ${MAX_FILES} files per item.`, variant: 'destructive' }); return; }
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
    ...f.phones
      .map((c) => ({ value: c.value.trim(), label: c.label.trim() }))
      .filter((c) => c.value)
      .map((c) => ({ kind: 'phone' as const, value: c.value, label: c.label || null })),
    ...f.emails
      .map((c) => ({ value: c.value.trim(), label: c.label.trim() }))
      .filter((c) => c.value)
      .map((c) => ({ kind: 'email' as const, value: c.value, label: c.label || null })),
  ];

  const save = async () => {
    const sources = buildSources(form);
    if (!form.title.trim()) { toast({ title: 'A title is required', variant: 'destructive' }); return; }
    if (!form.description.trim()) { toast({ title: 'A description is required', variant: 'destructive' }); return; }
    if (sources.length < 1) { toast({ title: 'Add at least one text, link, file, telephone number or email address', variant: 'destructive' }); return; }
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
  const setPhones = (phones: ContactEntry[]) => setForm((p) => ({ ...p, phones }));
  const setEmails = (emails: ContactEntry[]) => setForm((p) => ({ ...p, emails }));

  const summaryIcons = (r: ResourceRow) => {
    const t = r.sources.filter((s) => s.kind === 'text').length;
    const l = r.sources.filter((s) => s.kind === 'link').length;
    const f = r.sources.filter((s) => s.kind === 'file').length;
    const ph = r.sources.filter((s) => s.kind === 'phone').length;
    const em = r.sources.filter((s) => s.kind === 'email').length;
    return (
      <span className="text-xs text-muted-foreground inline-flex items-center gap-2">
        {t > 0 && <span className="inline-flex items-center gap-0.5"><StickyNote className="h-3.5 w-3.5" />{t}</span>}
        {l > 0 && <span className="inline-flex items-center gap-0.5"><Link2 className="h-3.5 w-3.5" />{l}</span>}
        {f > 0 && <span className="inline-flex items-center gap-0.5"><FileText className="h-3.5 w-3.5" />{f}</span>}
        {ph > 0 && <span className="inline-flex items-center gap-0.5"><Phone className="h-3.5 w-3.5" />{ph}</span>}
        {em > 0 && <span className="inline-flex items-center gap-0.5"><Mail className="h-3.5 w-3.5" />{em}</span>}
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

          {/* CONTACTS ARE LIVE, not printed. A telephone number on a phone
              and an address anywhere are both one tap from doing what they
              are for, so they carry `tel:` and `mailto:` rather than sitting
              as text somebody has to copy. The optional note ("Office",
              "Head of Operations") is what makes three numbers on one item
              tell you which is which. */}
          {(r.sources.some((s) => s.kind === 'phone') || r.sources.some((s) => s.kind === 'email')) && (
            <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5">
              {r.sources.filter((s) => s.kind === 'phone').map((s, i) => (
                <li key={`p${i}`} className="flex items-center gap-1.5 text-sm min-w-0">
                  <Phone aria-hidden className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <a href={`tel:${s.value.replace(/[^\d+]/g, '')}`} className="text-accent underline underline-offset-2 truncate">{s.value}</a>
                  {s.label && <span className="text-xs text-muted-foreground truncate">· {s.label}</span>}
                </li>
              ))}
              {r.sources.filter((s) => s.kind === 'email').map((s, i) => (
                <li key={`e${i}`} className="flex items-center gap-1.5 text-sm min-w-0">
                  <Mail aria-hidden className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <a href={`mailto:${s.value}`} className="text-accent underline underline-offset-2 truncate">{s.value}</a>
                  {s.label && <span className="text-xs text-muted-foreground truncate">· {s.label}</span>}
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

      {/* =================================================================
          THE ITEM EDITOR.
          -----------------------------------------------------------------
          It was a 512px column on a 1440px screen, and everything in it
          suffered for that: a file called "Relazione su attivita ed
          iniziative Minerva Investment Management Society.pdf" had nowhere
          to go, the source rows stacked into a very tall scroll, and the
          dialog grew a horizontal scrollbar of its own.

          It is now a two-column composition on a laptop. The width is not
          spent on making the same column wider - the left side carries what
          the item IS (division, title, description) and the right side
          carries what it CONTAINS, so both are visible at once and the
          dialog is shorter as well as wider. `min-w-0` runs the whole way
          down both columns, which is what actually stops a long filename
          pushing the dialog sideways.

          It is deliberately not full-screen: 64rem on a wide display, and
          `min(96vw, ...)` so it never exceeds the viewport. Below `lg` it
          collapses to the single column it always was.
          ================================================================= */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[min(96vw,64rem)] max-w-[min(96vw,64rem)] max-h-[92vh] flex flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b border-separator">
            <DialogTitle className="font-serif">{form.id ? 'Edit item' : 'Add item'}</DialogTitle>
          </DialogHeader>

          {/* Only this middle band scrolls, so Save and Cancel stay put and
              the header stays legible however long the item becomes. */}
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 font-body">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,7fr)_minmax(0,10fr)] gap-6">

              {/* ---- What the item is ---------------------------------- */}
              <div className="min-w-0 space-y-4">
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
                <div className="space-y-1">
                  <Label>Description *</Label>
                  <Textarea rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What is it and when to use it?" />
                </div>

                {/* Texts sit with the description: they are prose too. */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="flex items-center gap-1.5"><StickyNote className="h-4 w-4" />Texts ({form.texts.filter((t) => t.trim()).length}/{MAX_TEXTS})</Label>
                    {form.texts.length < MAX_TEXTS && <Button type="button" variant="ghost" size="sm" onClick={() => setTexts([...form.texts, ''])}><Plus className="h-3.5 w-3.5 mr-1" />Add text</Button>}
                  </div>
                  {form.texts.map((t, i) => (
                    <div key={i} className="flex gap-2 min-w-0">
                      <Textarea rows={2} className="min-w-0" value={t} onChange={(e) => setTexts(form.texts.map((x, j) => (j === i ? e.target.value : x)))} placeholder="Write the note or content here." />
                      <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => setTexts(form.texts.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* ---- What the item contains ---------------------------- */}
              <div className="min-w-0 rounded-md border border-separator p-4 space-y-5">
                <p className="text-xs text-muted-foreground">
                  Any mix of links, files, telephone numbers and email addresses, plus the texts on the left.
                  At least one in total; nothing here is required on its own.
                </p>

                {/* Links.
                    THE GENERATED NAME IS NOT A SECOND FIELD. It used to be a
                    full-width input directly under the URL, with its own
                    explanatory line beneath - three boxed rows for one link,
                    which read as two links half-filled in. It is now one
                    quiet line stating what the item will read, with a Rename
                    control that reveals the input only when somebody actually
                    wants to override it. The naming itself is unchanged. */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="flex items-center gap-1.5"><Link2 className="h-4 w-4" />Links / repos ({form.links.filter((l) => l.value.trim()).length}/{MAX_LINKS})</Label>
                    {form.links.length < MAX_LINKS && <Button type="button" variant="ghost" size="sm" onClick={() => setLinks([...form.links, { value: '', label: '' }])}><Plus className="h-3.5 w-3.5 mr-1" />Add link</Button>}
                  </div>
                  {form.links.map((l, i) => {
                    const preview = l.value.trim() ? previewLink(l.value, l.label) : null;
                    const naming = namingLink === i || l.label.trim().length > 0;
                    return (
                      <div key={i} className="min-w-0 space-y-1.5">
                        <div className="flex gap-2 min-w-0">
                          <Input
                            className="min-w-0"
                            value={l.value}
                            onChange={(e) => setLinks(form.links.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                            placeholder="https://github.com/… or https://drive.google.com/…"
                            aria-label="Link address"
                          />
                          <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => { setLinks(form.links.filter((_, j) => j !== i)); setNamingLink(null); }}><X className="h-4 w-4" /></Button>
                        </div>

                        {preview && (
                          <div className="pr-11 min-w-0">
                            {naming ? (
                              <Input
                                autoFocus={namingLink === i}
                                value={l.label}
                                onChange={(e) => setLinks(form.links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                                onBlur={() => setNamingLink(null)}
                                placeholder={preview.label}
                                className="h-8 text-sm"
                                aria-label="What this link should be called"
                              />
                            ) : (
                              <p className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
                                <span className="truncate">
                                  Will show as <span className="text-foreground">{preview.label}</span>
                                  {!preview.raw && preview.label !== preview.source && ` · ${preview.source}`}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setNamingLink(i)}
                                  className="shrink-0 text-accent underline underline-offset-2 hover:text-accent/80"
                                >
                                  Rename
                                </button>
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Files */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="flex items-center gap-1.5"><FileText className="h-4 w-4" />Files ({form.files.length}/{MAX_FILES})</Label>
                    <div>
                      <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} />
                      {form.files.length < MAX_FILES && (
                        <Button type="button" variant="ghost" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
                          {uploading ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Uploading</> : <><Upload className="h-3.5 w-3.5 mr-1" />Add file</>}
                        </Button>
                      )}
                    </div>
                  </div>
                  {form.files.map((f, i) => (
                    // `min-w-0` on the row AND `break-words` on the name: a
                    // long filename now wraps inside the dialog instead of
                    // widening it. This is what produced the sideways bar.
                    <div key={i} className="flex items-start gap-2 text-sm min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span className="min-w-0 flex-1 break-words leading-snug" title={f.label}>{f.label}</span>
                      <Button type="button" variant="ghost" size="icon" className="shrink-0 -mt-1" onClick={() => setForm((p) => ({ ...p, files: p.files.filter((_, j) => j !== i) }))}><X className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>

                {/* Telephone numbers */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="flex items-center gap-1.5"><Phone className="h-4 w-4" />Telephone ({form.phones.filter((c) => c.value.trim()).length}/{MAX_PHONES})</Label>
                    {form.phones.length < MAX_PHONES && <Button type="button" variant="ghost" size="sm" onClick={() => setPhones([...form.phones, { value: '', label: '' }])}><Plus className="h-3.5 w-3.5 mr-1" />Add number</Button>}
                  </div>
                  {form.phones.map((c, i) => (
                    <ContactRow
                      key={i}
                      entry={c}
                      valuePlaceholder="+39 02 5836 …"
                      labelPlaceholder="Whose number (optional)"
                      inputMode="tel"
                      onChange={(next) => setPhones(form.phones.map((x, j) => (j === i ? next : x)))}
                      onRemove={() => setPhones(form.phones.filter((_, j) => j !== i))}
                    />
                  ))}
                </div>

                {/* Email addresses */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="flex items-center gap-1.5"><Mail className="h-4 w-4" />Email ({form.emails.filter((c) => c.value.trim()).length}/{MAX_EMAILS})</Label>
                    {form.emails.length < MAX_EMAILS && <Button type="button" variant="ghost" size="sm" onClick={() => setEmails([...form.emails, { value: '', label: '' }])}><Plus className="h-3.5 w-3.5 mr-1" />Add address</Button>}
                  </div>
                  {form.emails.map((c, i) => (
                    <ContactRow
                      key={i}
                      entry={c}
                      valuePlaceholder="name@unibocconi.it"
                      labelPlaceholder="Whose address (optional)"
                      inputMode="email"
                      onChange={(next) => setEmails(form.emails.map((x, j) => (j === i ? next : x)))}
                      onRemove={() => setEmails(form.emails.filter((_, j) => j !== i))}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* The action bar never scrolls away. */}
          <div className="shrink-0 flex gap-3 px-6 py-4 border-t border-separator bg-background">
            <Button className="flex-1 sm:flex-none sm:min-w-[10rem]" onClick={save} disabled={saving}>{saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving</> : 'Save'}</Button>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
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
