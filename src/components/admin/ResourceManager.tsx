// =====================================================================
// THE FILE LIBRARY.
// ---------------------------------------------------------------------
// One component draws every library in the workspace: the Instagram,
// LinkedIn and Other Resources tabs of Social Template, MIMS Graphics,
// Templates & repositories, External relations and Statute & documents.
// They are one store (workspace_resources), one set of permissions and
// now one way of working, so learning one teaches all of them.
//
// WHAT A READER NEEDS FIRST IS TO FIND THE RIGHT FILE, so the page is
// built around that: a search over titles, notes, texts, file names and
// authors; one row of type filters with their counts (Images 12, PDFs
// and documents 3), offering only the types the library holds; a sort;
// and a choice of Grid, where pictures show as pictures, or List, where
// many items can be scanned in a column. Whatever was chosen is kept
// while the workspace stays open, so opening an item and coming back
// finds the library exactly as it was left.
//
// WHICH FILE IS WHICH is answered on the card itself: the picture or a
// type tile (icon, colour and extension together), the title, the size
// and who added it when. Opening an item shows everything it holds, with
// a preview, a download and a copy button where each applies.
//
// ADDING IS DONE IN BULK. Files dropped anywhere on the library, or
// chosen with Upload files, are listed with a title read from each name,
// uploaded a few at a time with their own progress, and each becomes its
// own item. New item remains for the item that is not a file: a caption,
// a link, a contact.
//
// SEVERAL AT ONCE. Tick items to download them together as one ZIP or,
// for those who manage the library, to remove them together.
//
// The read-only rule is unchanged: on a phone, and for roles that read a
// library without managing it, every writing control is absent, while
// search, filters, preview, copy and download keep working.
// =====================================================================

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { Download, FolderOpen, Loader2, Plus, SearchX, Trash2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useIsDesktop } from '@/hooks/use-desktop';
import { divisionLabels, type OrgDivision } from '@/lib/roles';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { friendlyError } from '@/lib/errors';
import {
  deleteResource, setResourceFavourite, signResourceFile, MAX_FAVOURITES, type ResourceRow, type ResourceSource,
} from '@/lib/resources-api';
import {
  ACCEPT_ATTR, filesOf, fold, itemFilters, matchesQuery, searchText, sortItems, LIBRARY_FILTERS, type LibraryFilter,
} from '@/lib/library-files';
import { downloadBlob, downloadTitled, safeFileName } from '@/lib/file-download';
import { zipFromUrls } from '@/lib/zip';
import { Chip, GridCard, ListRow, SearchBox, SortSelect, ViewSwitch, type QuickHandlers } from '@/components/admin/library/LibraryParts';
import { ItemSheet } from '@/components/admin/library/ItemSheet';
import { FilePreview, type PreviewState } from '@/components/admin/library/FilePreview';
import { UploadDialog } from '@/components/admin/library/UploadDialog';
import { ItemEditor } from '@/components/admin/library/ItemEditor';
import {
  FLAVOUR_VIEW, useLibraryChoices, useLibraryItems, useThumbnails, type LibraryFlavour,
} from '@/components/admin/library/library-data';

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
  /** What the library is for: its starting view and how texts are called. */
  flavour?: LibraryFlavour;
  /** Drawn inside another page (a tab): no page header of its own. */
  embedded?: boolean;
}

const DEFAULT_DIVISIONS: OrgDivision[] = ['equity', 'investment', 'macro', 'portfolio', 'quant', 'none'];

/** Copy to the clipboard, with the old route for browsers without the API. */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/** Names inside a ZIP must be unique: "logo.png", "logo (2).png". */
function uniqueNames(names: string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((n) => {
    const key = n.toLowerCase();
    const k = (seen.get(key) ?? 0) + 1;
    seen.set(key, k);
    if (k === 1) return n;
    const m = n.match(/^(.*?)(\.[a-z0-9]{1,8})?$/i);
    return `${m?.[1] ?? n} (${k})${m?.[2] ?? ''}`;
  });
}

export default function ResourceManager({
  category, title, description, divisions = DEFAULT_DIVISIONS,
  restrictDivisions = null, canViewOtherDivisions = true, canManage = true,
  flavour = 'general', embedded = false,
}: Props) {
  const { session } = useAuth();
  const { toast } = useToast();
  // Libraries are consultable but read-only in the mobile shell.
  const isDesktop = useIsDesktop();
  const manage = canManage && isDesktop;

  // ---- Division scoping (unchanged rules) ------------------------------
  // When `restrictDivisions` is set this instance holds per-division
  // material: users who cannot view other divisions only ever see their
  // own division's items (plus shared "General" items), and can only
  // create in their own division.
  const scoped = !!restrictDivisions && restrictDivisions.length > 0;
  const lockedToOwn = scoped && !canViewOtherDivisions;
  const homeDivision = restrictDivisions?.[0];
  const viewable: OrgDivision[] = useMemo(
    () => (scoped ? [...(restrictDivisions as OrgDivision[]), 'none'] : divisions),
    [scoped, restrictDivisions, divisions],
  );
  const createDivisions = scoped ? divisions.filter((d) => viewable.includes(d)) : divisions;
  const createDefault: OrgDivision = (scoped ? homeDivision : undefined) ?? divisions[0];
  const showDivisions = (lockedToOwn ? viewable : divisions).filter((d) => d !== 'none');
  const [divFilter, setDivFilter] = useState<OrgDivision | 'all'>(scoped && canViewOtherDivisions && homeDivision ? homeDivision : 'all');

  // ---- Data -----------------------------------------------------------
  const onLoadError = useCallback((e: unknown) => {
    toast({ title: 'The library could not be loaded', description: friendlyError(e), variant: 'destructive' });
  }, [toast]);
  const { items, setItems, loading, reload } = useLibraryItems(category, onLoadError);
  const [choices, update] = useLibraryChoices(category, { view: FLAVOUR_VIEW[flavour], sort: 'newest', filter: 'all', query: '' });

  // Several saves in a row (a bulk upload) refresh the list once.
  const reloadTimer = useRef<number | null>(null);
  const reloadSoon = useCallback(() => {
    if (reloadTimer.current) window.clearTimeout(reloadTimer.current);
    reloadTimer.current = window.setTimeout(() => { reloadTimer.current = null; reload(); }, 350);
  }, [reload]);
  useEffect(() => () => { if (reloadTimer.current) window.clearTimeout(reloadTimer.current); }, []);

  // Everything this reader may see, before their own filters.
  const inScope = useMemo(
    () => items.filter((i) => {
      if (lockedToOwn && !viewable.includes(i.division)) return false;
      // General material belongs to every division, so it stays in view
      // whichever division is chosen.
      return divFilter === 'all' || i.division === divFilter || i.division === 'none';
    }),
    [items, lockedToOwn, viewable, divFilter],
  );
  const haystacks = useMemo(() => new Map(inScope.map((i) => [i.id, searchText(i)])), [inScope]);
  const queried = useMemo(
    () => (choices.query.trim() ? inScope.filter((i) => matchesQuery(haystacks.get(i.id) ?? '', choices.query)) : inScope),
    [inScope, haystacks, choices.query],
  );
  // Counts follow the search, so each chip says what pressing it would show.
  const counts = useMemo(() => {
    const c: Partial<Record<LibraryFilter, number>> = {};
    for (const i of queried) for (const f of itemFilters(i)) c[f] = (c[f] ?? 0) + 1;
    return c;
  }, [queried]);
  const offeredFilters = LIBRARY_FILTERS.filter((f) => (counts[f.key] ?? 0) > 0 || choices.filter === f.key);
  const results = useMemo(() => {
    const typed = choices.filter === 'all' ? queried : queried.filter((i) => itemFilters(i).has(choices.filter as LibraryFilter));
    const sorted = sortItems(typed, choices.sort);
    return [...sorted.filter((i) => i.is_favourite), ...sorted.filter((i) => !i.is_favourite)];
  }, [queried, choices.filter, choices.sort]);
  const pinned = results.filter((i) => i.is_favourite);
  const others = results.filter((i) => !i.is_favourite);
  const favouriteCount = items.filter((i) => i.is_favourite).length;
  const filtersActive = !!choices.query.trim() || choices.filter !== 'all';
  const existingNames = useMemo(() => new Set(items.flatMap((i) => filesOf(i).map((f) => fold(f.label || '')))), [items]);

  const thumbs = useThumbnails(results);

  // ---- Selection --------------------------------------------------------
  const [selected, setSelected] = useState<Set<string>>(new Set());
  useEffect(() => {
    // Items that left the view leave the selection.
    setSelected((prev) => {
      const ids = new Set(results.map((r) => r.id));
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [results]);
  const toggle = (id: string, on: boolean) => setSelected((prev) => {
    const next = new Set(prev);
    if (on) next.add(id); else next.delete(id);
    return next;
  });
  const selectedItems = results.filter((r) => selected.has(r.id));

  // ---- Dialogs and panels ---------------------------------------------
  const [openId, setOpenId] = useState<string | null>(null);
  const openItem = results.find((r) => r.id === openId) ?? items.find((r) => r.id === openId) ?? null;
  const openIndex = openItem ? results.findIndex((r) => r.id === openItem.id) : -1;
  const [editor, setEditor] = useState<{ open: boolean; item: ResourceRow | null }>({ open: false, item: null });
  const [upload, setUpload] = useState<{ open: boolean; files: File[] }>({ open: false, files: [] });
  const [toRemove, setToRemove] = useState<ResourceRow[] | null>(null);
  const [removing, setRemoving] = useState(false);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [zipProgress, setZipProgress] = useState<{ done: number; total: number } | null>(null);

  const fail = useCallback((t: string, e?: unknown) => {
    toast({ title: t, description: e ? friendlyError(e) : undefined, variant: 'destructive' });
  }, [toast]);

  // ---- Actions ----------------------------------------------------------
  const downloadFile = async (file: ResourceSource) => {
    setBusy(file.value);
    try {
      const url = await signResourceFile(session, file.value);
      await downloadTitled(url, (file.label || 'file').replace(/\.[a-z0-9]{1,8}$/i, ''), 'pdf');
    } catch (e) { fail('Could not download the file', e); } finally { setBusy(null); }
  };

  /** Several files into one ZIP, a folder per item that holds more than one. */
  const downloadZip = async (list: ResourceRow[], name: string, busyKey: string) => {
    const files = list.flatMap((it) => {
      const own = filesOf(it);
      return own.map((f) => ({ path: f.value, name: own.length > 1 ? `${safeFileName(it.title)}/${f.label || 'file'}` : (f.label || safeFileName(it.title)) }));
    });
    if (files.length === 0) { fail('Nothing to download', new Error('The selected items hold links, texts or contacts, not files.')); return; }
    setBusy(busyKey);
    setZipProgress({ done: 0, total: files.length });
    try {
      const signed = await Promise.all(files.map((f) => signResourceFile(session, f.path)));
      const names = uniqueNames(files.map((f) => f.name));
      const { blob, failed } = await zipFromUrls(names.map((n, i) => ({ name: n, url: signed[i] })), (done, total) => setZipProgress({ done, total }));
      downloadBlob(blob, `${safeFileName(name)}.zip`);
      if (failed.length) toast({ title: `${failed.length} file${failed.length === 1 ? '' : 's'} could not be added`, description: `The ZIP holds the rest. Missing: ${failed.slice(0, 3).join(', ')}${failed.length > 3 ? '...' : ''}`, variant: 'destructive' });
    } catch (e) { fail('Could not prepare the ZIP', e); } finally { setBusy(null); setZipProgress(null); }
  };

  const downloadItem = (item: ResourceRow) => {
    const own = filesOf(item);
    if (own.length === 1) downloadFile(own[0]);
    else if (own.length > 1) downloadZip([item], item.title, item.id);
  };

  const copy = async (text: string, what: string) => {
    toast(await copyText(text) ? { title: `${what} copied` } : { title: 'Could not copy', description: 'Select the text and copy it by hand.', variant: 'destructive' });
  };

  const quick: QuickHandlers = { onDownload: downloadItem, onCopy: copy };

  const showPreview = async (item: ResourceRow, index: number) => {
    const files = filesOf(item).map((f) => ({ value: f.value, label: f.label || 'File' }));
    setPreview({ files, index, url: null });
    try {
      const url = await signResourceFile(session, files[index].value);
      setPreview((p) => (p && p.files[p.index]?.value === files[index].value ? { ...p, url } : p));
    } catch (e) { setPreview(null); fail('Could not open the preview', e); }
  };
  const stepPreview = async (index: number) => {
    if (!preview) return;
    const file = preview.files[index];
    setPreview({ ...preview, index, url: null });
    try {
      const url = await signResourceFile(session, file.value);
      setPreview((p) => (p && p.files[p.index]?.value === file.value ? { ...p, url } : p));
    } catch (e) { fail('Could not open the preview', e); }
  };

  const togglePin = async (item: ResourceRow) => {
    const next = !item.is_favourite;
    if (next && favouriteCount >= MAX_FAVOURITES) {
      fail(`At most ${MAX_FAVOURITES} items can be pinned here`, new Error('Unpin one first.'));
      return;
    }
    setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, is_favourite: next } : x)));
    try {
      await setResourceFavourite(session, item.id, next);
      toast({ title: next ? 'Pinned to the top' : 'Unpinned' });
    } catch (e) { fail('Could not update', e); reload(); }
  };

  const confirmRemove = async () => {
    if (!toRemove) return;
    setRemoving(true);
    let ok = 0;
    const errors: string[] = [];
    for (const it of toRemove) {
      try { await deleteResource(session, it.id); ok += 1; } catch (e) { errors.push(`${it.title}: ${friendlyError(e)}`); }
    }
    setRemoving(false);
    setToRemove(null);
    if (openId && toRemove.some((t) => t.id === openId)) setOpenId(null);
    setSelected(new Set());
    await reload();
    if (errors.length) fail(`${errors.length} could not be removed`, new Error(errors[0]));
    else toast({ title: ok === 1 ? 'Removed' : `${ok} items removed` });
  };

  // ---- Dropping files anywhere on the library ------------------------
  const [dropping, setDropping] = useState(false);
  const dragDepth = useRef(0);
  const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');
  const dropProps = manage ? {
    onDragEnter: (e: DragEvent) => { if (!hasFiles(e)) return; e.preventDefault(); dragDepth.current += 1; setDropping(true); },
    onDragOver: (e: DragEvent) => { if (hasFiles(e)) e.preventDefault(); },
    onDragLeave: () => { dragDepth.current = Math.max(0, dragDepth.current - 1); if (dragDepth.current === 0) setDropping(false); },
    onDrop: (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth.current = 0;
      setDropping(false);
      const files = Array.from(e.dataTransfer.files ?? []);
      if (files.length) setUpload({ open: true, files });
    },
  } : {};
  const pickRef = useRef<HTMLInputElement>(null);

  // ---- Drawing ----------------------------------------------------------
  const actions = manage ? (
    <>
      <Button variant="solid" className="font-body" onClick={() => pickRef.current?.click()}><Upload className="h-4 w-4" />Upload files</Button>
      <Button variant="outline" className="font-body" onClick={() => setEditor({ open: true, item: null })}><Plus className="h-4 w-4" />New item</Button>
    </>
  ) : undefined;

  const itemProps = (r: ResourceRow) => ({
    item: r,
    thumbs,
    selected: selected.has(r.id),
    onSelect: (v: boolean) => toggle(r.id, v),
    onOpen: () => setOpenId(r.id),
    busy: busy === r.id || filesOf(r).some((f) => f.value === busy),
    handlers: quick,
    showDivision: showDivisions.length > 1,
  });

  const renderGroup = (list: ResourceRow[]) => (choices.view === 'grid' ? (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {list.map((r) => <GridCard key={r.id} {...itemProps(r)} selecting={selected.size > 0} />)}
    </div>
  ) : (
    <ul className="border-t border-separator">
      {list.map((r) => <ListRow key={r.id} {...itemProps(r)} />)}
    </ul>
  ));

  const groupHeading = (text: string) => (
    <h2 className="mb-2 font-body text-xs uppercase tracking-wider text-muted-foreground">{text}</h2>
  );

  const libraryName = title;

  return (
    <div className="relative" {...dropProps}>
      {embedded ? (
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <p className="max-w-2xl font-body text-body text-muted-foreground">{description}</p>
          {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
        </div>
      ) : (
        <WorkspacePageHeader title={title} description={description} actions={actions} actionColumns="row" />
      )}
      <input ref={pickRef} type="file" multiple accept={ACCEPT_ATTR} className="hidden"
        onChange={(e) => { const files = Array.from(e.target.files ?? []); e.target.value = ''; if (files.length) setUpload({ open: true, files }); }} />

      {/* ---- Toolbar ---------------------------------------------------- */}
      <div className="mb-4 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <SearchBox value={choices.query} onChange={(query) => update({ query })}
            placeholder={flavour === 'contacts' ? 'Search names, emails, notes' : 'Search titles, files, texts, authors'} />
          <div className="flex gap-2">
            <div className="min-w-0 flex-1 sm:flex-none"><SortSelect value={choices.sort} onChange={(sort) => update({ sort })} /></div>
            <ViewSwitch value={choices.view} onChange={(view) => update({ view })} />
          </div>
        </div>
        {showDivisions.length > 1 && (
          <div role="group" aria-label="Division" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            <Chip active={divFilter === 'all'} onClick={() => setDivFilter('all')}>All divisions</Chip>
            {showDivisions.map((d) => <Chip key={d} active={divFilter === d} onClick={() => setDivFilter(d)}>{divisionLabels[d]}</Chip>)}
          </div>
        )}
        {offeredFilters.length > 1 && (
          <div role="group" aria-label="Type" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            <Chip active={choices.filter === 'all'} onClick={() => update({ filter: 'all' })} count={queried.length}>All</Chip>
            {offeredFilters.map((f) => (
              <Chip key={f.key} active={choices.filter === f.key} onClick={() => update({ filter: choices.filter === f.key ? 'all' : f.key })} count={counts[f.key] ?? 0}>{f.label}</Chip>
            ))}
          </div>
        )}
        {!loading && items.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-body text-[13px] text-muted-foreground" aria-live="polite">
            <span>
              {filtersActive ? `${results.length} of ${inScope.length} ${inScope.length === 1 ? 'item' : 'items'}` : `${inScope.length} ${inScope.length === 1 ? 'item' : 'items'}`}
              {favouriteCount > 0 && ` · ${favouriteCount} of ${MAX_FAVOURITES} pinned`}
            </span>
            {filtersActive && (
              <button type="button" data-ro onClick={() => update({ query: '', filter: 'all' })} className="inline-flex items-center gap-1 text-accent underline underline-offset-2">
                <X className="h-3.5 w-3.5" />Clear search and filters
              </button>
            )}
            {manage && <span className="hidden lg:inline">Tip: drop files anywhere on this page to upload them.</span>}
          </div>
        )}
      </div>

      {/* ---- Selection bar ------------------------------------------------ */}
      {selected.size > 0 && (
        <div className="sticky top-0 z-20 mb-4 flex flex-wrap items-center gap-2 border border-accent bg-background px-3 py-2 font-body shadow-sm" role="region" aria-label="Selected items">
          <span className="mr-1 text-sm text-foreground">{selected.size} selected</span>
          {selected.size < results.length && (
            <Button data-ro variant="ghost" size="sm" onClick={() => setSelected(new Set(results.map((r) => r.id)))}>Select all {results.length} shown</Button>
          )}
          <Button variant="outline" size="sm" disabled={busy === 'selection'} onClick={() => downloadZip(selectedItems, `${libraryName} ${new Date().toISOString().slice(0, 10)}`, 'selection')}>
            {busy === 'selection' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {busy === 'selection' && zipProgress ? `Preparing ${zipProgress.done} of ${zipProgress.total}` : 'Download as ZIP'}
          </Button>
          {manage && (
            <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setToRemove(selectedItems)}>
              <Trash2 className="h-4 w-4" />Remove
            </Button>
          )}
          <Button data-ro variant="ghost" size="sm" className="ml-auto" onClick={() => setSelected(new Set())}><X className="h-4 w-4" />Clear selection</Button>
        </div>
      )}

      {/* ---- Results ------------------------------------------------------ */}
      {loading ? <WorkspaceLoader /> : items.length === 0 || inScope.length === 0 ? (
        <div className="border border-dashed border-separator px-5 py-12 text-center font-body">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center bg-accent/5 text-accent"><FolderOpen className="h-6 w-6" /></div>
          <p className="font-serif text-xl text-foreground">{items.length === 0 ? `Nothing in ${libraryName} yet` : 'Nothing for this division yet'}</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {manage
              ? 'Drop files here or choose them: each becomes its own item, titled from its name. Use New item for a caption, a link or a contact.'
              : 'Material added by the team appears here, ready to preview and download.'}
          </p>
          {actions && <div className="mt-5 flex flex-wrap justify-center gap-2">{actions}</div>}
        </div>
      ) : results.length === 0 ? (
        <div className="border border-dashed border-separator px-5 py-10 text-center font-body">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center bg-accent/5 text-accent"><SearchX className="h-6 w-6" /></div>
          <p className="font-serif text-xl text-foreground">Nothing matches</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {choices.query.trim() ? `No item mentions "${choices.query.trim()}"${choices.filter !== 'all' ? ' with this type' : ''}.` : 'No item of this type.'} Try fewer words, or another type.
          </p>
          <div className="mt-4 flex justify-center">
            <Button data-ro variant="outline" onClick={() => update({ query: '', filter: 'all' })}>Clear search and filters</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {pinned.length > 0 && <section>{groupHeading(`Pinned (${pinned.length})`)}{renderGroup(pinned)}</section>}
          {others.length > 0 && <section>{pinned.length > 0 && groupHeading(filtersActive ? 'Other results' : 'Everything else')}{renderGroup(others)}</section>}
        </div>
      )}

      {/* ---- Dropping ------------------------------------------------------ */}
      {dropping && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center border-2 border-dashed border-accent bg-background/85">
          <div className="text-center font-body">
            <Upload className="mx-auto mb-2 h-8 w-8 text-accent" />
            <p className="font-serif text-xl text-accent">Drop to upload to {libraryName}</p>
            <p className="text-sm text-muted-foreground">You can check the titles before anything is sent.</p>
          </div>
        </div>
      )}

      <ItemSheet
        item={openItem}
        thumbs={thumbs}
        flavour={flavour}
        canManage={manage}
        busy={busy}
        position={openIndex >= 0 ? { index: openIndex, total: results.length } : null}
        onStep={(d) => { if (openIndex >= 0 && results.length) setOpenId(results[(openIndex + d + results.length) % results.length].id); }}
        onClose={() => setOpenId(null)}
        handlers={{
          onPreview: showPreview,
          onDownloadFile: downloadFile,
          onDownloadAll: (it) => downloadZip([it], it.title, it.id),
          onCopy: copy,
          onEdit: (it) => setEditor({ open: true, item: it }),
          onPin: togglePin,
          onDelete: (it) => setToRemove([it]),
        }}
      />

      <FilePreview
        state={preview}
        onClose={() => setPreview(null)}
        onIndex={stepPreview}
        onDownload={(f) => downloadFile({ kind: 'file', value: f.value, label: f.label })}
      />

      {manage && (
        <>
          <UploadDialog
            open={upload.open}
            onOpenChange={(open) => setUpload((u) => ({ ...u, open }))}
            files={upload.files}
            libraryName={libraryName}
            category={category}
            divisions={createDivisions}
            defaultDivision={createDefault}
            existingNames={existingNames}
            session={session}
            onSaved={reloadSoon}
          />
          <ItemEditor
            open={editor.open}
            item={editor.item}
            onOpenChange={(open) => setEditor((s) => ({ ...s, open }))}
            libraryName={libraryName}
            category={category}
            flavour={flavour}
            divisions={createDivisions}
            defaultDivision={createDefault}
            session={session}
            onSaved={(message) => { toast({ title: message }); reload(); }}
            onError={fail}
          />
        </>
      )}

      <AlertDialog open={!!toRemove} onOpenChange={(o) => { if (!o && !removing) setToRemove(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{toRemove && toRemove.length === 1 ? `Remove "${toRemove[0].title}"?` : `Remove ${toRemove?.length ?? 0} items?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {toRemove && toRemove.length > 1 ? `${toRemove.slice(0, 4).map((t) => t.title).join(', ')}${toRemove.length > 4 ? ' and others' : ''}. ` : ''}
              Removing takes them out of {libraryName} for everybody. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmRemove(); }} disabled={removing}>
              {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
