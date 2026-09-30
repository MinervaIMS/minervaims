// =====================================================================
// Upload many files at once.
// ---------------------------------------------------------------------
// Drop a folder's worth of files, or pick them, and each one is listed
// with its picture (for images), a title read from its name that can be
// changed, its size, and anything that would stop it: a type the
// library does not take, a size over 25 MB, a name already in the
// library. Nothing is sent until Upload is pressed.
//
// Each file then shows its own progress and its own outcome, so one
// failure never hides nine successes: a failed file keeps its place with
// the reason and a Retry. By default every file becomes its own item,
// which is what makes a library searchable; up to eight can instead be
// kept together as one item (a post and its slides, a template and its
// instructions).
// =====================================================================

import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, RotateCcw, Upload, X } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { saveResource, uploadResourceFileWithProgress, SOURCE_LIMITS, type ResourceSource } from '@/lib/resources-api';
import {
  ACCEPT_ATTR, ACCEPTED_SENTENCE, fileBadge, fileKindOf, formatBytes, fold, titleFromFileName, uploadProblem,
} from '@/lib/library-files';
import { divisionLabels, type OrgDivision } from '@/lib/roles';
import { lookStyle } from './library-look';
import { Thumb } from './LibraryParts';

type Status = 'ready' | 'rejected' | 'uploading' | 'saving' | 'done' | 'failed';

interface Entry {
  id: string;
  file: File;
  title: string;
  status: Status;
  progress: number;
  error: string | null;
  /** The stored path once the bytes are up, so a retry does not resend them. */
  path: string | null;
  preview: string | null;
  duplicate: boolean;
}

const MAX_BATCH = 50;
const PARALLEL = 3;
const MAX_TOGETHER = SOURCE_LIMITS.file;

let seq = 0;
function toEntry(file: File, existing: Set<string>): Entry {
  const problem = uploadProblem(file);
  const kind = fileKindOf({ value: file.name, label: file.name });
  return {
    id: `u${++seq}`,
    file,
    title: titleFromFileName(file.name),
    status: problem ? 'rejected' : 'ready',
    progress: 0,
    error: problem,
    path: null,
    preview: kind === 'image' && !problem && typeof URL !== 'undefined' ? URL.createObjectURL(file) : null,
    duplicate: existing.has(fold(file.name)),
  };
}

export function UploadDialog({
  open, onOpenChange, files, libraryName, category, divisions, defaultDivision, existingNames, session, onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Files handed over by a drop or the picker, when the dialog opens. */
  files: File[];
  libraryName: string;
  category: string;
  divisions: OrgDivision[];
  defaultDivision: OrgDivision;
  /** The folded names of the files already in the library. */
  existingNames: Set<string>;
  session: Session | null;
  /** Called after each item is saved, so the library can refresh. */
  onSaved: () => void;
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [mode, setMode] = useState<'separate' | 'together'>('separate');
  const [groupTitle, setGroupTitle] = useState('');
  const [note, setNote] = useState('');
  const [division, setDivision] = useState<OrgDivision>(defaultDivision);
  const [running, setRunning] = useState(false);
  const [dragging, setDragging] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const entriesRef = useRef<Entry[]>([]);
  entriesRef.current = entries;

  // A new set of files replaces the list; the options start afresh.
  useEffect(() => {
    if (!open) return;
    const next = files.slice(0, MAX_BATCH).map((f) => toEntry(f, existingNames));
    setEntries(next);
    setMode('separate');
    setGroupTitle(next[0]?.title ?? '');
    setNote('');
    setDivision(defaultDivision);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, files]);

  // Release the pictures' object URLs when the list goes.
  useEffect(() => () => { entriesRef.current.forEach((e) => e.preview && URL.revokeObjectURL(e.preview)); }, []);

  const patch = (id: string, p: Partial<Entry>) => setEntries((list) => list.map((e) => (e.id === id ? { ...e, ...p } : e)));

  const addFiles = (more: File[]) => {
    setEntries((list) => {
      const room = Math.max(0, MAX_BATCH - list.length);
      const known = new Set(list.map((e) => `${e.file.name}:${e.file.size}`));
      const fresh = more.filter((f) => !known.has(`${f.name}:${f.size}`)).slice(0, room).map((f) => toEntry(f, existingNames));
      if (list.length === 0 && fresh[0]) setGroupTitle(fresh[0].title);
      return [...list, ...fresh];
    });
  };

  const remove = (id: string) => setEntries((list) => {
    const gone = list.find((e) => e.id === id);
    if (gone?.preview) URL.revokeObjectURL(gone.preview);
    return list.filter((e) => e.id !== id);
  });

  const sendable = entries.filter((e) => e.status === 'ready' || e.status === 'failed');
  const done = entries.filter((e) => e.status === 'done').length;
  const rejected = entries.filter((e) => e.status === 'rejected').length;
  const failed = entries.filter((e) => e.status === 'failed').length;
  const valid = entries.filter((e) => e.status !== 'rejected');
  const canTogether = valid.length >= 2 && valid.length <= MAX_TOGETHER;
  const together = mode === 'together' && canTogether;
  const finished = entries.length > 0 && !running && sendable.length === 0 && done > 0;

  const describe = useMemo(() => {
    if (running) return `${done} of ${valid.length} added. Keep this window open until they finish.`;
    if (finished) return `${done} ${done === 1 ? 'file' : 'files'} added to ${libraryName}.`;
    const parts = [`${sendable.length} ready`];
    if (rejected) parts.push(`${rejected} cannot be uploaded`);
    if (failed) parts.push(`${failed} to retry`);
    return parts.join(', ');
  }, [running, finished, done, valid.length, sendable.length, rejected, failed, libraryName]);

  // --------------------------------------------------------------
  // Sending
  // --------------------------------------------------------------

  const uploadOne = async (e: Entry, signal: AbortSignal): Promise<string> => {
    if (e.path) return e.path;
    patch(e.id, { status: 'uploading', progress: 0, error: null });
    const path = await uploadResourceFileWithProgress(session, e.file, (f) => patch(e.id, { progress: f }), signal);
    patch(e.id, { path });
    return path;
  };

  const sourceOf = (e: Entry, path: string): ResourceSource => ({ kind: 'file', value: path, label: e.file.name, size: e.file.size });

  const start = async () => {
    const queue = entriesRef.current.filter((e) => e.status === 'ready' || e.status === 'failed');
    if (queue.length === 0) return;
    const ctl = new AbortController();
    abort.current = ctl;
    setRunning(true);
    const description = note.trim() || null;

    const work = async (e: Entry) => {
      try {
        const path = await uploadOne(e, ctl.signal);
        if (together) { patch(e.id, { status: 'saving', progress: 1 }); return; }
        patch(e.id, { status: 'saving', progress: 1 });
        await saveResource(session, {
          category, division, title: e.title.trim() || titleFromFileName(e.file.name), description, sources: [sourceOf(e, path)],
        });
        patch(e.id, { status: 'done' });
        onSaved();
      } catch (err) {
        const stopped = err instanceof DOMException && err.name === 'AbortError';
        patch(e.id, { status: 'failed', error: stopped ? 'Stopped before it finished.' : err instanceof Error ? err.message : 'The upload did not complete.' });
      }
    };

    // A few at a time: fast, without every file fighting for the line.
    const pending = [...queue];
    const runners = Array.from({ length: Math.min(PARALLEL, pending.length) }, async () => {
      while (pending.length && !ctl.signal.aborted) await work(pending.shift() as Entry);
    });
    await Promise.all(runners);
    pending.forEach((e) => patch(e.id, { status: 'failed', error: 'Stopped before it started.' }));

    if (together) {
      const all = entriesRef.current.filter((e) => e.status !== 'rejected');
      if (all.every((e) => e.path) && !ctl.signal.aborted) {
        try {
          await saveResource(session, {
            category, division, title: groupTitle.trim() || all[0].title, description,
            sources: all.map((e) => sourceOf(e, e.path as string)),
          });
          all.forEach((e) => patch(e.id, { status: 'done' }));
          onSaved();
        } catch (err) {
          all.forEach((e) => patch(e.id, { status: 'failed', error: err instanceof Error ? err.message : 'The item could not be saved.' }));
        }
      } else {
        all.filter((e) => e.status === 'saving').forEach((e) => patch(e.id, { status: 'ready', error: null }));
      }
    }
    abort.current = null;
    setRunning(false);
  };

  // --------------------------------------------------------------

  const onDrop = (ev: DragEvent) => {
    ev.preventDefault();
    setDragging(false);
    if (running) return;
    addFiles(Array.from(ev.dataTransfer.files ?? []));
  };

  const close = (o: boolean) => {
    if (!o && running) return; // finish or stop first
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        className="flex max-h-[92vh] w-[min(96vw,56rem)] max-w-[min(96vw,56rem)] flex-col gap-0 overflow-hidden p-0"
        onDragOver={(e) => { e.preventDefault(); if (!running) setDragging(true); }}
        onDragLeave={(e) => { if (e.currentTarget === e.target) setDragging(false); }}
        onDrop={onDrop}
        onInteractOutside={(e) => { if (running) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (running) e.preventDefault(); }}
      >
        <DialogHeader className="shrink-0 border-b border-separator px-6 pb-4 pt-6 text-left">
          <DialogTitle className="font-serif">Upload to {libraryName}</DialogTitle>
          <DialogDescription className="font-body" aria-live="polite">{describe}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5 font-body">
          {/* The list of files. */}
          {entries.length > 0 && (
            <ul className="divide-y divide-separator border border-separator">
              {entries.map((e) => {
                const kind = fileKindOf({ value: e.file.name, label: e.file.name });
                const { tile } = lookStyle(kind);
                const locked = running || e.status === 'done' || e.status === 'saving' || e.status === 'uploading';
                return (
                  <li key={e.id} className="flex items-start gap-3 px-3 py-3" data-upload-row={e.status}>
                    <span className={`flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden border border-separator text-[10px] font-semibold tracking-wide ${e.preview ? '' : tile}`}>
                      <Thumb url={e.preview} id={`${e.id}:${e.file.name}`} fallback={fileBadge({ value: e.file.name })} />
                    </span>
                    <div className="min-w-0 flex-1 space-y-1">
                      {!together && e.status !== 'rejected' ? (
                        <Input value={e.title} disabled={locked} onChange={(ev) => patch(e.id, { title: ev.target.value })}
                          aria-label={`Title for ${e.file.name}`} className="h-9" maxLength={200} />
                      ) : (
                        <p className="break-words pt-1 text-sm text-foreground">{e.file.name}</p>
                      )}
                      <p className="truncate text-xs text-muted-foreground" title={e.file.name}>
                        {[!together && e.status !== 'rejected' ? e.file.name : null, fileBadge({ value: e.file.name }), formatBytes(e.file.size)].filter(Boolean).join(' · ')}
                      </p>
                      {e.duplicate && e.status !== 'done' && e.status !== 'rejected' && (
                        <p className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300"><AlertTriangle className="h-3.5 w-3.5 shrink-0" />A file with this name is already in {libraryName}.</p>
                      )}
                      {(e.status === 'uploading' || e.status === 'saving') && (
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 bg-muted" role="progressbar" aria-label={`Uploading ${e.file.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(e.progress * 100)}>
                            <div className="h-full bg-accent transition-[width] duration-200" style={{ width: `${Math.round(e.progress * 100)}%` }} />
                          </div>
                          <span className="w-16 text-right text-xs tabular-nums text-muted-foreground">{e.status === 'saving' ? 'Saving' : `${Math.round(e.progress * 100)}%`}</span>
                        </div>
                      )}
                      {e.status === 'done' && <p className="flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" />Added</p>}
                      {(e.status === 'rejected' || e.status === 'failed') && e.error && (
                        <p className="text-xs text-destructive">{e.error}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {e.status === 'failed' && !running && (
                        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={`Retry ${e.file.name}`} title="Retry" onClick={() => { patch(e.id, { status: 'ready', error: null }); }}>
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                      {!locked && (
                        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={`Remove ${e.file.name} from the list`} title="Remove from the list" onClick={() => remove(e.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Add more: a drop area that is also a button. */}
          {!running && !finished && entries.length < MAX_BATCH && (
            <button
              type="button" onClick={() => picker.current?.click()}
              className={`flex w-full flex-col items-center gap-1.5 border border-dashed px-4 py-6 text-center transition-colors ${dragging ? 'border-accent bg-accent/5' : 'border-separator hover:border-accent hover:bg-accent/5'}`}
            >
              <Upload aria-hidden className="h-6 w-6 text-accent" />
              <span className="text-sm text-foreground">{entries.length ? 'Add more files' : 'Choose files'} <span className="text-muted-foreground">or drop them here</span></span>
              <span className="max-w-lg text-xs text-muted-foreground">{ACCEPTED_SENTENCE} Up to {MAX_BATCH} at a time.</span>
            </button>
          )}
          <input ref={picker} type="file" multiple accept={ACCEPT_ATTR} className="hidden"
            onChange={(ev) => { addFiles(Array.from(ev.target.files ?? [])); ev.target.value = ''; }} />

          {/* Options. */}
          {!finished && valid.length > 0 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <fieldset className="space-y-2" disabled={running}>
                <legend className="mb-1 text-sm font-medium text-foreground">Add them as</legend>
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <input type="radio" name="upload-mode" className="mt-1 accent-[hsl(var(--accent))]" checked={!together} onChange={() => setMode('separate')} />
                  <span><span className="text-foreground">One item per file</span><span className="block text-xs text-muted-foreground">Each is found, pinned and shared on its own. Best for most uploads.</span></span>
                </label>
                <label className={`flex items-start gap-2 text-sm ${canTogether ? 'cursor-pointer' : 'opacity-60'}`}>
                  <input type="radio" name="upload-mode" className="mt-1 accent-[hsl(var(--accent))]" disabled={!canTogether} checked={together} onChange={() => setMode('together')} />
                  <span><span className="text-foreground">One item holding all of them</span><span className="block text-xs text-muted-foreground">{canTogether ? 'For files that only make sense together, like a post and its slides.' : `For 2 to ${MAX_TOGETHER} files.`}</span></span>
                </label>
              </fieldset>
              <div className="space-y-3">
                {together && (
                  <div className="space-y-1">
                    <Label htmlFor="upload-group-title">Title of the item</Label>
                    <Input id="upload-group-title" value={groupTitle} disabled={running} onChange={(e) => setGroupTitle(e.target.value)} maxLength={200} />
                  </div>
                )}
                {divisions.length > 1 && (
                  <div className="space-y-1">
                    <Label>Division</Label>
                    <Select value={division} onValueChange={(v) => setDivision(v as OrgDivision)} disabled={running}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{divisions.map((d) => <SelectItem key={d} value={d}>{d === 'none' ? 'General' : divisionLabels[d]}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1">
                  <Label htmlFor="upload-note">Note <span className="font-normal text-muted-foreground">(optional, added to {together ? 'the item' : 'every item'})</span></Label>
                  <Textarea id="upload-note" rows={2} value={note} disabled={running} onChange={(e) => setNote(e.target.value)} maxLength={2000}
                    placeholder="What these are and when to use them" />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-3 border-t border-separator bg-background px-6 py-4">
          {finished ? (
            <Button variant="solid" className="min-w-[10rem]" onClick={() => onOpenChange(false)}>Done</Button>
          ) : running ? (
            <>
              <Button variant="solid" className="min-w-[10rem]" disabled><Loader2 className="h-4 w-4 animate-spin" />Uploading</Button>
              <Button variant="outline" onClick={() => abort.current?.abort()}>Stop</Button>
            </>
          ) : (
            <>
              <Button variant="solid" className="min-w-[10rem]" disabled={sendable.length === 0} onClick={start}>
                <Upload className="h-4 w-4" />
                {together ? `Upload ${sendable.length} as one item` : `Upload ${sendable.length} ${sendable.length === 1 ? 'file' : 'files'}`}
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>{done > 0 ? 'Close' : 'Cancel'}</Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
