// =====================================================================
// Add or edit one item.
// ---------------------------------------------------------------------
// Two columns on a laptop: on the left what the item IS (division,
// title, note, texts), on the right what it CONTAINS (files, links,
// telephone numbers, email addresses). Only the middle band scrolls, so
// Save stays in reach however long the item grows.
//
// What changed from the editor it replaces:
//   * files are dropped or picked several at a time, each with its own
//     progress, and each can be given a name people will recognise;
//   * the note is optional, because the title, the type and the preview
//     already say most of what a note used to be forced to repeat;
//   * captions show their length against the platform's limit.
// =====================================================================

import { useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { FileText, Link2, Loader2, Mail, Phone, Plus, StickyNote, Upload, X } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  saveResource, uploadResourceFileWithProgress, SOURCE_LIMITS, type ResourceRow, type ResourceSource,
} from '@/lib/resources-api';
import { ACCEPT_ATTR, ACCEPTED_SENTENCE, fileBadge, formatBytes, uploadProblem } from '@/lib/library-files';
import { previewLink } from '@/lib/link-label';
import { divisionLabels, type OrgDivision } from '@/lib/roles';
import { CAPTION_LIMITS, textNoun, type LibraryFlavour } from './library-data';

interface FileEntry { key: string; value: string; label: string; size: number | null; progress: number | null; error: string | null }
interface PairEntry { value: string; label: string }

interface FormState {
  id: string | null;
  division: OrgDivision;
  title: string;
  description: string;
  texts: string[];
  links: PairEntry[];
  files: FileEntry[];
  phones: PairEntry[];
  emails: PairEntry[];
  is_favourite: boolean;
}

let fileSeq = 0;

function formFrom(item: ResourceRow | null, division: OrgDivision): FormState {
  if (!item) {
    return { id: null, division, title: '', description: '', texts: [''], links: [], files: [], phones: [], emails: [], is_favourite: false };
  }
  const of = (k: ResourceSource['kind']) => item.sources.filter((s) => s.kind === k);
  return {
    id: item.id,
    division: item.division,
    title: item.title,
    description: item.description ?? '',
    texts: of('text').map((s) => s.value),
    links: of('link').map((s) => ({ value: s.value, label: s.label ?? '' })),
    files: of('file').map((s) => ({ key: `f${++fileSeq}`, value: s.value, label: s.label || 'File', size: s.size ?? null, progress: null, error: null })),
    phones: of('phone').map((s) => ({ value: s.value, label: s.label ?? '' })),
    emails: of('email').map((s) => ({ value: s.value, label: s.label ?? '' })),
    is_favourite: item.is_favourite,
  };
}

function PairRow({ entry, valuePlaceholder, labelPlaceholder, type, onChange, onRemove }: {
  entry: PairEntry; valuePlaceholder: string; labelPlaceholder: string; type: 'tel' | 'email';
  onChange: (next: PairEntry) => void; onRemove: () => void;
}) {
  return (
    <div className="flex min-w-0 gap-2">
      <Input className="min-w-0 flex-[3]" type={type} inputMode={type} value={entry.value} placeholder={valuePlaceholder}
        onChange={(e) => onChange({ ...entry, value: e.target.value })} aria-label={type === 'email' ? 'Email address' : 'Telephone number'} />
      <Input className="min-w-0 flex-[2] text-sm" value={entry.label} placeholder={labelPlaceholder}
        onChange={(e) => onChange({ ...entry, label: e.target.value })} aria-label="Whose it is (optional)" />
      <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={onRemove} aria-label="Remove"><X className="h-4 w-4" /></Button>
    </div>
  );
}

export function ItemEditor({
  open, item, onOpenChange, libraryName, category, flavour, divisions, defaultDivision, session, onSaved, onError,
}: {
  open: boolean;
  /** The item to edit, or null to add a new one. */
  item: ResourceRow | null;
  onOpenChange: (open: boolean) => void;
  libraryName: string;
  category: string;
  flavour: LibraryFlavour;
  divisions: OrgDivision[];
  defaultDivision: OrgDivision;
  session: Session | null;
  onSaved: (message: string) => void;
  onError: (title: string, e?: unknown) => void;
}) {
  const [form, setForm] = useState<FormState>(() => formFrom(item, defaultDivision));
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [namingLink, setNamingLink] = useState<number | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const limit = CAPTION_LIMITS[flavour];
  const noun = textNoun(flavour);

  useEffect(() => {
    if (open) { setForm(formFrom(item, defaultDivision)); setNamingLink(null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((p) => ({ ...p, [k]: v }));
  const patchFile = (key: string, p: Partial<FileEntry>) => setForm((f) => ({ ...f, files: f.files.map((x) => (x.key === key ? { ...x, ...p } : x)) }));
  const uploading = form.files.some((f) => f.progress !== null && f.progress < 1 && !f.error);

  const addFiles = (list: File[]) => {
    const room = SOURCE_LIMITS.file - form.files.length;
    if (room <= 0) { onError(`At most ${SOURCE_LIMITS.file} files per item.`); return; }
    if (list.length > room) onError(`Only ${room} more ${room === 1 ? 'file fits' : 'files fit'} in this item. Upload the rest as their own items.`);
    for (const file of list.slice(0, room)) {
      const key = `f${++fileSeq}`;
      const problem = uploadProblem(file);
      const entry: FileEntry = { key, value: '', label: file.name, size: file.size, progress: problem ? null : 0, error: problem };
      setForm((f) => ({ ...f, files: [...f.files, entry] }));
      if (problem) continue;
      uploadResourceFileWithProgress(session, file, (p) => patchFile(key, { progress: p }))
        .then((path) => patchFile(key, { value: path, progress: 1 }))
        .catch((e) => patchFile(key, { progress: null, error: e instanceof Error ? e.message : 'The upload did not complete.' }));
    }
  };

  const onDrop = (e: DragEvent) => { e.preventDefault(); setDragging(false); addFiles(Array.from(e.dataTransfer.files ?? [])); };

  const buildSources = (f: FormState): ResourceSource[] => [
    ...f.texts.map((t) => t.trim()).filter(Boolean).map((t) => ({ kind: 'text' as const, value: t })),
    ...f.links.map((l) => ({ value: l.value.trim(), label: l.label.trim() })).filter((l) => l.value)
      .map((l) => ({ kind: 'link' as const, value: l.value, label: l.label || null })),
    ...f.files.filter((x) => x.value && !x.error)
      .map((x) => ({ kind: 'file' as const, value: x.value, label: x.label.trim() || 'File', ...(x.size != null ? { size: x.size } : {}) })),
    ...f.phones.map((c) => ({ value: c.value.trim(), label: c.label.trim() })).filter((c) => c.value)
      .map((c) => ({ kind: 'phone' as const, value: c.value, label: c.label || null })),
    ...f.emails.map((c) => ({ value: c.value.trim(), label: c.label.trim() })).filter((c) => c.value)
      .map((c) => ({ kind: 'email' as const, value: c.value, label: c.label || null })),
  ];

  const save = async () => {
    const sources = buildSources(form);
    if (!form.title.trim()) { onError('Give the item a title'); return; }
    if (uploading) { onError('Wait for the files to finish uploading'); return; }
    if (sources.length < 1) { onError('Add at least one file, link, text, telephone number or email address'); return; }
    setSaving(true);
    try {
      await saveResource(session, {
        id: form.id ?? undefined, category, division: form.division, title: form.title.trim(),
        description: form.description.trim() || null, sources, is_favourite: form.is_favourite,
      });
      onSaved(form.id ? 'Saved' : `Added to ${libraryName}`);
      onOpenChange(false);
    } catch (e) {
      onError('Could not save', e);
    } finally {
      setSaving(false);
    }
  };

  const count = (arr: { value: string }[]) => arr.filter((x) => x.value.trim()).length;
  const header = (icon: ReactNode, label: string, used: number, max: number, addLabel: string, canAdd: boolean, onAdd: () => void) => (
    <div className="flex items-center justify-between gap-2">
      <Label className="flex items-center gap-1.5">{icon}{label} <span className="font-normal text-muted-foreground">({used}/{max})</span></Label>
      {canAdd && <Button type="button" variant="ghost" size="sm" onClick={onAdd}><Plus className="h-3.5 w-3.5" />{addLabel}</Button>}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!saving) onOpenChange(o); }}>
      <DialogContent className="flex max-h-[92vh] w-[min(96vw,64rem)] max-w-[min(96vw,64rem)] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-separator px-6 pb-4 pt-6 text-left">
          <DialogTitle className="font-serif">{form.id ? 'Edit item' : `New item in ${libraryName}`}</DialogTitle>
          <DialogDescription className="font-body">A title, and at least one thing to keep: a file, a link, a text or a contact. Everything else is optional.</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 font-body">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,10fr)]">
            {/* ---- What the item is ---------------------------------- */}
            <div className="min-w-0 space-y-4">
              {divisions.length > 1 && (
                <div className="space-y-1">
                  <Label>Division</Label>
                  <Select value={form.division} onValueChange={(v) => set('division', v as OrgDivision)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{divisions.map((d) => <SelectItem key={d} value={d}>{d === 'none' ? 'General' : divisionLabels[d]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1">
                <Label htmlFor="item-title">Title</Label>
                <Input id="item-title" value={form.title} maxLength={200} onChange={(e) => set('title', e.target.value)}
                  placeholder={flavour === 'contacts' ? 'e.g. Banca Esempio, graduate recruiting' : flavour === 'documents' ? 'e.g. Equity DCF model template' : 'e.g. Recruiting campaign, week 1 post'} />
                <p className="text-xs text-muted-foreground">The name people will search for. Say what it is, not what the file is called.</p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="item-note">Note <span className="font-normal text-muted-foreground">(optional)</span></Label>
                <Textarea id="item-note" rows={4} maxLength={2000} value={form.description} onChange={(e) => set('description', e.target.value)}
                  placeholder="When to use it, what to watch out for, which version is current." />
              </div>
              <div className="space-y-2">
                {header(<StickyNote className="h-4 w-4" />, noun.many, count(form.texts.map((t) => ({ value: t }))), SOURCE_LIMITS.text,
                  flavour === 'instagram' || flavour === 'linkedin' ? 'Add caption' : 'Add text', form.texts.length < SOURCE_LIMITS.text,
                  () => set('texts', [...form.texts, '']))}
                {form.texts.map((t, i) => {
                  const n = Array.from(t).length;
                  const over = limit ? n > limit.limit : false;
                  return (
                    <div key={i} className="min-w-0 space-y-1">
                      <div className="flex min-w-0 gap-2">
                        <Textarea rows={flavour === 'instagram' || flavour === 'linkedin' ? 5 : 3} className="min-w-0" value={t} maxLength={10000}
                          onChange={(e) => set('texts', form.texts.map((x, j) => (j === i ? e.target.value : x)))}
                          placeholder={flavour === 'instagram' || flavour === 'linkedin' ? 'The caption, ready to paste.' : 'Write the text here.'}
                          aria-label={`${noun.one} ${i + 1}`} />
                        <Button type="button" variant="ghost" size="icon" className="shrink-0" aria-label="Remove" onClick={() => set('texts', form.texts.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
                      </div>
                      {t.trim() && (
                        <p className={`pr-12 text-right text-xs tabular-nums ${over ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {n.toLocaleString('en-GB')}{limit ? ` of ${limit.limit.toLocaleString('en-GB')} characters${over ? `: too long for ${limit.where}` : ''}` : ' characters'}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ---- What the item contains ---------------------------- */}
            <div className="min-w-0 space-y-5 border border-separator p-4">
              {/* Files: a drop area that is also a button. */}
              <div className="space-y-2">
                {header(<FileText className="h-4 w-4" />, 'Files', form.files.filter((f) => !f.error).length, SOURCE_LIMITS.file, '', false, () => undefined)}
                {form.files.length > 0 && (
                  <ul className="divide-y divide-separator border border-separator">
                    {form.files.map((f) => (
                      <li key={f.key} className="flex items-start gap-2 px-2 py-2">
                        <span className="mt-1 inline-flex h-6 min-w-[2.75rem] shrink-0 items-center justify-center bg-muted px-1 text-[10px] font-semibold tracking-wide text-foreground">{fileBadge({ value: f.value || f.label, label: f.label })}</span>
                        <div className="min-w-0 flex-1 space-y-1">
                          <Input value={f.label} onChange={(e) => patchFile(f.key, { label: e.target.value })} className="h-8 text-sm" maxLength={300}
                            aria-label="The file's name as people will see it" disabled={!!f.error} />
                          {f.error ? <p className="text-xs text-destructive">{f.error}</p>
                            : f.progress !== null && f.progress < 1 ? (
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 flex-1 bg-muted" role="progressbar" aria-label={`Uploading ${f.label}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(f.progress * 100)}>
                                  <div className="h-full bg-accent transition-[width]" style={{ width: `${Math.round(f.progress * 100)}%` }} />
                                </div>
                                <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{Math.round(f.progress * 100)}%</span>
                              </div>
                            ) : f.size != null ? <p className="text-xs text-muted-foreground">{formatBytes(f.size)}</p> : null}
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`Remove ${f.label}`}
                          onClick={() => setForm((p) => ({ ...p, files: p.files.filter((x) => x.key !== f.key) }))}><X className="h-4 w-4" /></Button>
                      </li>
                    ))}
                  </ul>
                )}
                {form.files.length < SOURCE_LIMITS.file && (
                  <button
                    type="button" onClick={() => picker.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}
                    className={`flex w-full flex-col items-center gap-1 border border-dashed px-3 py-4 text-center transition-colors ${dragging ? 'border-accent bg-accent/5' : 'border-separator hover:border-accent hover:bg-accent/5'}`}
                  >
                    <Upload aria-hidden className="h-5 w-5 text-accent" />
                    <span className="text-sm text-foreground">Choose files <span className="text-muted-foreground">or drop them here</span></span>
                    <span className="text-xs text-muted-foreground">{ACCEPTED_SENTENCE}</span>
                  </button>
                )}
                <input ref={picker} type="file" multiple accept={ACCEPT_ATTR} className="hidden"
                  onChange={(e) => { addFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
              </div>

              {/* Links: the name is read from the address; Rename overrides it. */}
              <div className="space-y-2">
                {header(<Link2 className="h-4 w-4" />, 'Links and repositories', count(form.links), SOURCE_LIMITS.link, 'Add link',
                  form.links.length < SOURCE_LIMITS.link, () => set('links', [...form.links, { value: '', label: '' }]))}
                {form.links.map((l, i) => {
                  const p = l.value.trim() ? previewLink(l.value, l.label) : null;
                  const naming = namingLink === i || l.label.trim().length > 0;
                  return (
                    <div key={i} className="min-w-0 space-y-1.5">
                      <div className="flex min-w-0 gap-2">
                        <Input className="min-w-0" value={l.value} placeholder="https://github.com/... or https://drive.google.com/..." aria-label="Link address"
                          onChange={(e) => set('links', form.links.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
                        <Button type="button" variant="ghost" size="icon" className="shrink-0" aria-label="Remove"
                          onClick={() => { set('links', form.links.filter((_, j) => j !== i)); setNamingLink(null); }}><X className="h-4 w-4" /></Button>
                      </div>
                      {p && (
                        <div className="min-w-0 pr-12">
                          {naming ? (
                            <Input autoFocus={namingLink === i} value={l.label} placeholder={p.label} className="h-8 text-sm" aria-label="What this link should be called"
                              onChange={(e) => set('links', form.links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} onBlur={() => setNamingLink(null)} />
                          ) : (
                            <p className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                              <span className="truncate">Will show as <span className="text-foreground">{p.label}</span>{!p.raw && p.label !== p.source && ` · ${p.source}`}</span>
                              <button type="button" onClick={() => setNamingLink(i)} className="shrink-0 text-accent underline underline-offset-2">Rename</button>
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2">
                {header(<Phone className="h-4 w-4" />, 'Telephone', count(form.phones), SOURCE_LIMITS.phone, 'Add number',
                  form.phones.length < SOURCE_LIMITS.phone, () => set('phones', [...form.phones, { value: '', label: '' }]))}
                {form.phones.map((c, i) => (
                  <PairRow key={i} entry={c} type="tel" valuePlaceholder="+39 02 5836 ..." labelPlaceholder="Whose number (optional)"
                    onChange={(n) => set('phones', form.phones.map((x, j) => (j === i ? n : x)))} onRemove={() => set('phones', form.phones.filter((_, j) => j !== i))} />
                ))}
              </div>

              <div className="space-y-2">
                {header(<Mail className="h-4 w-4" />, 'Email', count(form.emails), SOURCE_LIMITS.email, 'Add address',
                  form.emails.length < SOURCE_LIMITS.email, () => set('emails', [...form.emails, { value: '', label: '' }]))}
                {form.emails.map((c, i) => (
                  <PairRow key={i} entry={c} type="email" valuePlaceholder="name@unibocconi.it" labelPlaceholder="Whose address (optional)"
                    onChange={(n) => set('emails', form.emails.map((x, j) => (j === i ? n : x)))} onRemove={() => set('emails', form.emails.filter((_, j) => j !== i))} />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 gap-3 border-t border-separator bg-background px-6 py-4">
          <Button variant="solid" className="flex-1 sm:min-w-[10rem] sm:flex-none" onClick={save} disabled={saving || uploading}>
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving</> : uploading ? <><Loader2 className="h-4 w-4 animate-spin" />Uploading</> : 'Save'}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
