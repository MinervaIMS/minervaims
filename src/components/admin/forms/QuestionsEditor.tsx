// =====================================================================
// Building the questions of a form.
// ---------------------------------------------------------------------
// One card per question, in the order members will see them. A card
// closed shows what the question is at a glance (its number, its type,
// its text, whether it is required); opened, it shows everything that
// can be set for that type and nothing else. One card is open at a time,
// so the list stays readable however long the form grows.
//
// Ordering is done with Move up and Move down, which work with a mouse,
// a finger and a keyboard alike. New questions go straight after the one
// being edited, which is where people expect them, and open ready to be
// typed into. The live preview beside the list is the member's view,
// drawn by the same component the member's page uses.
//
// ORDERS AND PICTURES. A choice can carry a picture and, when the form
// collects a payment, a price. "Ask how many of each" turns a choice
// question into an order: each choice picked gets a quantity, by size
// when sizes are listed. A Picture block shows a photo or a size guide
// anywhere in the form. SHOW-IF: any card can be shown only for some
// answers to a choice question above it; the card says so in its
// summary, and a rule that no longer points above is flagged on the card.
// =====================================================================

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AlertTriangle, ArrowDown, ArrowUp, ClipboardPaste, Copy, Eye, Image as ImageIcon, Info, Loader2, Plus, Trash2, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  FIELD_TYPES, FILE_KINDS, IMAGE_EXT, LIMITS, canDrive, imageProblem, isChoice, isOrder, isQuestion,
  type FieldType, type FileKinds, type FormField,
} from '@/lib/internal-forms-rules';
import { FieldInput } from '@/components/forms/FieldInput';
import { useToast } from '@/hooks/use-toast';
import { FIELD_ICON, copyField, fieldTypeLabel, newField } from './forms-model';

/** What the cards need to show and add pictures, and whether prices apply. */
export interface MediaContext {
  imageUrls: Record<string, string>;
  /** Store a picture in the form; resolves to its stored path. */
  uploadImage: (file: File) => Promise<string>;
  /** The form collects a payment, so choices can carry prices. */
  payments: boolean;
}

/** A button that picks one picture, uploads it and hands back its path. */
export function PictureButton({ media, onPicked, disabled, children, className, label }: {
  media: MediaContext; onPicked: (path: string) => void; disabled?: boolean; children: ReactNode; className?: string; label: string;
}) {
  const { toast } = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const pick = async (file: File | undefined) => {
    if (!file) return;
    const problem = imageProblem(file.name, file.size);
    if (problem) { toast({ title: 'This picture cannot be used', description: problem, variant: 'destructive' }); return; }
    setBusy(true);
    try { onPicked(await media.uploadImage(file)); }
    catch (e) { toast({ title: 'The picture did not upload', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setBusy(false); }
  };
  return (
    <>
      <button type="button" disabled={disabled || busy} onClick={() => input.current?.click()} aria-label={label} title={label} className={className}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin text-accent" /> : children}
      </button>
      <input ref={input} type="file" className="hidden" accept={IMAGE_EXT.map((e) => `.${e}`).join(',')}
        onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
    </>
  );
}

/** An array kept the same length as the choices. */
const aligned = <T,>(list: T[] | undefined, n: number, empty: T): T[] => Array.from({ length: n }, (_, i) => (list && i < list.length ? list[i] : empty));

function TypePicker({ onPick, children }: { onPick: (t: FieldType) => void; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="start" className="w-[min(92vw,34rem)] p-2">
        <p className="px-2 pb-2 pt-1 font-body text-xs uppercase tracking-wider text-muted-foreground">Add a question</p>
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {FIELD_TYPES.map((t) => {
            const Icon = FIELD_ICON[t.type];
            return (
              <button
                key={t.type} type="button"
                onClick={() => { setOpen(false); onPick(t.type); }}
                className="flex items-start gap-2.5 px-2.5 py-2 text-left font-body hover:bg-accent/5 focus-visible:bg-accent/5 focus-visible:outline-none"
              >
                <Icon aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span><span className="block text-sm text-foreground">{t.label}</span><span className="block text-xs text-muted-foreground">{t.hint}</span></span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function summaryOf(f: FormField): string {
  if (f.type === 'image') return f.image ? 'Picture' : 'No picture yet';
  if (isChoice(f.type)) {
    return [
      `${f.options?.length ?? 0} ${(f.options?.length ?? 0) === 1 ? 'choice' : 'choices'}${f.other ? ' + Other' : ''}`,
      isOrder(f) ? (f.sizes?.length ? 'how many, by size' : 'how many of each') : '',
      (f.optionPrices ?? []).some((x) => x != null) ? 'prices' : '',
      (f.optionImages ?? []).some(Boolean) ? 'pictures' : '',
    ].filter(Boolean).join(', ');
  }
  if (f.type === 'file') return `${FILE_KINDS[f.fileKinds ?? 'any'].label.split(' (')[0]}, up to ${f.maxFiles ?? 1}`;
  if (f.type === 'scale') return `${f.scaleMin ?? 1} to ${f.scaleMax ?? 5}`;
  if (f.type === 'number') return [f.integer ? 'Whole numbers' : 'Numbers', f.min != null ? `from ${f.min}` : '', f.max != null ? `to ${f.max}` : ''].filter(Boolean).join(' ');
  return '';
}

/** The settings particular to each type. */
function TypeSettings({ field, set, readOnly, media }: { field: FormField; set: (p: Partial<FormField>) => void; readOnly: boolean; media: MediaContext }) {
  const [pasting, setPasting] = useState(false);
  const [pasted, setPasted] = useState('');
  const [sizesText, setSizesText] = useState((field.sizes ?? []).join(', '));
  useEffect(() => { setSizesText((field.sizes ?? []).join(', ')); }, [field.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (field.type === 'image') {
    const url = field.image ? media.imageUrls[field.image] : undefined;
    return (
      <div className="space-y-2">
        <Label className="font-body text-xs uppercase tracking-wider text-muted-foreground">Picture</Label>
        {field.image ? (
          <div className="flex flex-wrap items-start gap-3">
            <div className="flex h-32 w-48 items-center justify-center overflow-hidden border border-separator bg-muted/30">
              {url ? <img src={url} alt={field.label || 'Picture'} className="max-h-full max-w-full object-contain" /> : <Loader2 className="h-4 w-4 animate-spin text-accent" />}
            </div>
            {!readOnly && (
              <div className="flex flex-col gap-1.5">
                <PictureButton media={media} onPicked={(path) => set({ image: path })} label="Replace the picture"
                  className="inline-flex h-9 items-center gap-2 border border-separator px-3 font-body text-sm text-accent hover:bg-accent/5"><ImageIcon className="h-4 w-4" />Replace</PictureButton>
                <Button type="button" variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => set({ image: undefined })}><X className="h-4 w-4" />Remove the picture</Button>
              </div>
            )}
          </div>
        ) : !readOnly ? (
          <PictureButton media={media} onPicked={(path) => set({ image: path })} label="Add a picture"
            className="flex w-full items-center justify-center gap-2 border border-dashed border-separator px-4 py-6 font-body text-sm text-accent hover:border-accent hover:bg-accent/5">
            <ImageIcon className="h-4 w-4" />Add a picture (PNG, JPG, WebP or GIF, up to 10 MB)
          </PictureButton>
        ) : <p className="font-body text-sm text-muted-foreground">No picture yet.</p>}
        <p className="font-body text-xs text-muted-foreground">Members can open it full size. Use it for the product, a size guide or a map.</p>
      </div>
    );
  }

  if (isChoice(field.type)) {
    const opts = field.options ?? [];
    const imgs = aligned(field.optionImages, opts.length, null as string | null);
    const prices = aligned(field.optionPrices, opts.length, null as number | null);
    // Choices, pictures and prices change together, so a picture never ends up on another choice.
    const write = (o: string[], im: (string | null)[], pr: (number | null)[]) => set({
      options: o,
      optionImages: im.some(Boolean) ? im : undefined,
      optionPrices: pr.some((x) => x !== null) ? pr : undefined,
    });
    const setOpt = (i: number, v: string) => write(opts.map((o, j) => (j === i ? v : o)), imgs, prices);
    const move = (i: number, d: -1 | 1) => {
      const j = i + d;
      if (j < 0 || j >= opts.length) return;
      const sw = <T,>(a: T[]) => { const n = [...a]; [n[i], n[j]] = [n[j], n[i]]; return n; };
      write(sw(opts), sw(imgs), sw(prices));
    };
    const removeAt = (i: number) => write(opts.filter((_, j) => j !== i), imgs.filter((_, j) => j !== i), prices.filter((_, j) => j !== i));
    const canCount = field.type === 'single_choice' || field.type === 'multi_choice';
    return (
      <div className="space-y-2">
        <Label className="font-body text-xs uppercase tracking-wider text-muted-foreground">Choices</Label>
        <ol className="space-y-1.5">
          {opts.map((o, i) => {
            const url = imgs[i] ? media.imageUrls[imgs[i] as string] : undefined;
            return (
              <li key={i} className="flex items-center gap-1.5">
                <span className="w-6 shrink-0 text-right font-body text-xs tabular-nums text-muted-foreground">{i + 1}.</span>
                {field.type !== 'dropdown' && (
                  <span className="relative shrink-0">
                    <PictureButton media={media} disabled={readOnly} onPicked={(path) => write(opts, imgs.map((x, j) => (j === i ? path : x)), prices)}
                      label={imgs[i] ? `Replace the picture of "${o}"` : `Add a picture to "${o}"`}
                      className={`flex h-9 w-9 items-center justify-center overflow-hidden border ${imgs[i] ? 'border-accent' : 'border-dashed border-separator text-muted-foreground hover:border-accent hover:text-accent'}`}>
                      {imgs[i] ? (url ? <img src={url} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-4 w-4 text-accent" />) : <ImageIcon className="h-4 w-4" />}
                    </PictureButton>
                  </span>
                )}
                <Input value={o} disabled={readOnly} maxLength={LIMITS.option} onChange={(e) => setOpt(i, e.target.value)} className="h-9 min-w-0 flex-1" aria-label={`Choice ${i + 1}`} />
                {media.payments && (
                  <Input type="number" min={0} step="0.01" inputMode="decimal" className="h-9 w-24" disabled={readOnly} placeholder="Price"
                    value={prices[i] ?? ''} aria-label={`Price of "${o}" in euro`}
                    onChange={(e) => write(opts, imgs, prices.map((x, j) => (j === i ? (e.target.value === '' ? null : Number(e.target.value)) : x)))} />
                )}
                {imgs[i] && !readOnly && (
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => write(opts, imgs.map((x, j) => (j === i ? null : x)), prices)} aria-label={`Remove the picture of "${o}"`} title="Remove the picture"><ImageIcon className="h-4 w-4 text-destructive" /></Button>
                )}
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9" disabled={readOnly || i === 0} onClick={() => move(i, -1)} aria-label={`Move choice ${i + 1} up`}><ArrowUp className="h-4 w-4" /></Button>
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9" disabled={readOnly || i === opts.length - 1} onClick={() => move(i, 1)} aria-label={`Move choice ${i + 1} down`}><ArrowDown className="h-4 w-4" /></Button>
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9" disabled={readOnly || opts.length <= 1} onClick={() => removeAt(i)} aria-label={`Remove choice ${i + 1}`}><X className="h-4 w-4" /></Button>
              </li>
            );
          })}
        </ol>
        {!readOnly && (
          <div className="flex flex-wrap items-center gap-2 pl-7">
            <Button type="button" variant="ghost" size="sm" disabled={opts.length >= LIMITS.options} onClick={() => write([...opts, `Option ${opts.length + 1}`], [...imgs, null], [...prices, null])}><Plus className="h-4 w-4" />Add a choice</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setPasting((p) => !p)}><ClipboardPaste className="h-4 w-4" />Paste a list</Button>
          </div>
        )}
        {pasting && !readOnly && (
          <div className="space-y-2 pl-7">
            <Textarea rows={4} value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder={'One choice per line, for example:\nBlack\nGrey\nNavy'} aria-label="Choices, one per line" />
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="solid" onClick={() => {
                const lines = Array.from(new Set(pasted.split(/\r?\n/).map((l) => l.trim()).filter(Boolean))).slice(0, LIMITS.options);
                // A choice that keeps its name keeps its picture and its price.
                if (lines.length) write(lines, lines.map((l) => imgs[opts.indexOf(l)] ?? null), lines.map((l) => prices[opts.indexOf(l)] ?? null));
                setPasting(false); setPasted('');
              }}>Replace the choices</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => { setPasting(false); setPasted(''); }}>Cancel</Button>
            </div>
          </div>
        )}
        {!media.payments && !readOnly && (
          <p className="pl-7 font-body text-xs text-muted-foreground">To put a price on each choice, turn on "This form collects a payment" in Settings.</p>
        )}
        {canCount && (
          <div className="space-y-2 border-t border-separator pt-3">
            <label className="flex items-start gap-2 font-body text-sm">
              <Switch className="mt-0.5" checked={!!field.quantities} disabled={readOnly}
                onCheckedChange={(v) => set(v ? { quantities: true, other: undefined, maxQty: field.maxQty ?? LIMITS.defaultQty } : { quantities: undefined, sizes: undefined, maxQty: undefined })} />
              <span>Ask how many of each<span className="block text-xs text-muted-foreground">Each choice a member picks gets its own quantity, for example two black hoodies and one grey.</span></span>
            </label>
            {field.quantities && (
              <div className="grid gap-3 pl-11 sm:grid-cols-[minmax(0,1fr)_10rem]">
                <div className="space-y-1">
                  <Label htmlFor={`sizes-${field.id}`} className="text-xs">Sizes, counted separately (optional)</Label>
                  <Input id={`sizes-${field.id}`} className="h-9" disabled={readOnly} value={sizesText} placeholder="e.g. XS, S, M, L, XL"
                    onChange={(e) => setSizesText(e.target.value)}
                    onBlur={() => {
                      const list = Array.from(new Set(sizesText.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean))).slice(0, LIMITS.sizes);
                      set({ sizes: list.length ? list : undefined });
                      setSizesText(list.join(', '));
                    }} />
                  <p className="font-body text-xs text-muted-foreground">Separated by commas. With sizes, a member says how many of each size of each choice.</p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`max-${field.id}`} className="text-xs">Most of one item</Label>
                  <select id={`max-${field.id}`} className="h-9 w-full border border-input bg-background px-2 font-body text-sm" disabled={readOnly}
                    value={field.maxQty ?? LIMITS.defaultQty} onChange={(e) => set({ maxQty: Number(e.target.value) })}>
                    {[1, 2, 3, 4, 5, 10, 20, 50, 99].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}
        {field.type !== 'dropdown' && !field.quantities && (
          <label className="flex items-center gap-2 pl-7 font-body text-sm">
            <Switch checked={!!field.other} disabled={readOnly} onCheckedChange={(v) => set({ other: v })} />
            Let members write their own answer under "Other"
          </label>
        )}
      </div>
    );
  }
  if (field.type === 'number') {
    return (
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1"><Label className="text-xs">Smallest accepted</Label><Input type="number" className="h-9 w-32" disabled={readOnly} value={field.min ?? ''} onChange={(e) => set({ min: e.target.value === '' ? null : Number(e.target.value) })} /></div>
        <div className="space-y-1"><Label className="text-xs">Largest accepted</Label><Input type="number" className="h-9 w-32" disabled={readOnly} value={field.max ?? ''} onChange={(e) => set({ max: e.target.value === '' ? null : Number(e.target.value) })} /></div>
        <label className="flex h-9 items-center gap-2 font-body text-sm"><Switch checked={!!field.integer} disabled={readOnly} onCheckedChange={(v) => set({ integer: v })} />Whole numbers only</label>
      </div>
    );
  }
  if (field.type === 'scale') {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">From</Label>
          <select className="h-9 w-full border border-input bg-background px-2 font-body text-sm" disabled={readOnly} value={field.scaleMin ?? 1} onChange={(e) => set({ scaleMin: Number(e.target.value) })}>
            <option value={0}>0</option><option value={1}>1</option>
          </select>
          <Input className="h-9" disabled={readOnly} value={field.minLabel ?? ''} maxLength={60} onChange={(e) => set({ minLabel: e.target.value })} placeholder="Word under the lowest, e.g. Not at all" aria-label="Word under the lowest value" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">To</Label>
          <select className="h-9 w-full border border-input bg-background px-2 font-body text-sm" disabled={readOnly} value={field.scaleMax ?? 5} onChange={(e) => set({ scaleMax: Number(e.target.value) })}>
            <option value={5}>5</option><option value={10}>10</option>
          </select>
          <Input className="h-9" disabled={readOnly} value={field.maxLabel ?? ''} maxLength={60} onChange={(e) => set({ maxLabel: e.target.value })} placeholder="Word under the highest, e.g. Very much" aria-label="Word under the highest value" />
        </div>
      </div>
    );
  }
  if (field.type === 'file') {
    return (
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Accepts</Label>
          <select className="h-9 border border-input bg-background px-2 font-body text-sm" disabled={readOnly} value={field.fileKinds ?? 'any'} onChange={(e) => set({ fileKinds: e.target.value as FileKinds })}>
            <option value="images">Images only</option>
            <option value="documents">Documents only</option>
            <option value="any">Images and documents</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">How many files</Label>
          <select className="h-9 border border-input bg-background px-2 font-body text-sm" disabled={readOnly} value={field.maxFiles ?? 1} onChange={(e) => set({ maxFiles: Number(e.target.value) })}>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>Up to {n}</option>)}
          </select>
        </div>
        <p className="pb-2 font-body text-xs text-muted-foreground">10 MB per file. Files stay private to the form's organisers.</p>
      </div>
    );
  }
  if (field.type === 'consent') {
    return <p className="font-body text-xs text-muted-foreground">The text above is what the member agrees to by ticking the box, for example "I will pay for my order by the deadline".</p>;
  }
  return null;
}

/** "Show only for some answers": the rule on one card. */
function ShowIfEditor({ field, before, set, readOnly }: { field: FormField; before: FormField[]; set: (p: Partial<FormField>) => void; readOnly: boolean }) {
  const drivers = before.filter(canDrive);
  const rule = field.showIf;
  const src = rule ? before.find((x) => x.id === rule.field) : undefined;
  const values = src ? (src.type === 'consent' ? ['Yes'] : src.options ?? []) : [];
  const broken = !!rule && (!src || !canDrive(src) || (rule.values.length > 0 && !rule.values.some((v) => values.includes(v))));
  return (
    <div className="space-y-2 border-t border-separator pt-3">
      <label className="flex items-start gap-2 font-body text-sm">
        <Switch className="mt-0.5" checked={!!rule} disabled={readOnly || (!drivers.length && !rule)}
          onCheckedChange={(v) => set({ showIf: v ? { field: drivers[drivers.length - 1].id, values: [] } : undefined })} />
        <span>Show only for some answers
          <span className="block text-xs text-muted-foreground">
            {drivers.length || rule
              ? 'Shown only when a question above has one of the answers you tick. Otherwise it is skipped, and never required.'
              : 'Add a choice question or an agreement above this one to use this.'}
          </span>
        </span>
      </label>
      {rule && (
        <div className="space-y-2 pl-11 font-body">
          {broken && (
            <p className="flex items-start gap-1.5 text-xs text-destructive"><AlertTriangle aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />The question this depended on is no longer above this one, or its answers changed. Choose again.</p>
          )}
          <div className="space-y-1">
            <Label htmlFor={`if-${field.id}`} className="text-xs">When this question</Label>
            <select id={`if-${field.id}`} className="h-9 w-full border border-input bg-background px-2 text-sm" disabled={readOnly}
              value={src ? src.id : ''} onChange={(e) => set({ showIf: { field: e.target.value, values: [] } })}>
              <option value="" disabled>Choose a question above</option>
              {drivers.map((d) => <option key={d.id} value={d.id}>{d.label || 'Untitled question'}</option>)}
            </select>
          </div>
          {src && (
            <fieldset>
              <legend className="mb-1 text-xs">has one of these answers</legend>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {values.map((v) => (
                  <label key={v} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="h-4 w-4 accent-[hsl(var(--accent))]" disabled={readOnly} checked={rule.values.includes(v)}
                      onChange={(e) => set({ showIf: { field: src.id, values: e.target.checked ? [...rule.values.filter((x) => values.includes(x)), v] : rule.values.filter((x) => x !== v) } })} />
                    {src.type === 'consent' ? 'Ticked' : v}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </div>
      )}
    </div>
  );
}

/** "Only if Size: M, L", for the card summary and the preview. */
function ruleText(f: FormField, all: FormField[]): string | null {
  if (!f.showIf) return null;
  const src = all.find((x) => x.id === f.showIf!.field);
  if (!src) return 'Only for some answers';
  const vals = src.type === 'consent' ? ['ticked'] : f.showIf.values;
  return `Only if "${src.label || 'a question'}": ${vals.join(', ') || 'no answer ticked yet'}`;
}

export function QuestionsEditor({ fields, onChange, answerCount, readOnly, reveal, header, title, intro, media, coverPath }: {
  fields: FormField[];
  onChange: (fields: FormField[]) => void;
  answerCount: number;
  readOnly: boolean;
  /** Pictures: their links, how to add one, and whether prices apply. */
  media: MediaContext;
  /** The cover, for the preview. */
  coverPath?: string | null;
  /** A question to open and focus, for instance the one a save stopped at. */
  reveal?: { id: string; at: number } | null;
  /** Above the questions, in the same column: the title and introduction. */
  header?: React.ReactNode;
  /** Shown at the head of the member's view. */
  title?: string;
  intro?: string | null;
}) {
  const [openId, setOpenId] = useState<string | null>(fields[0]?.id ?? null);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (!reveal) return;
    setOpenId(reveal.id);
    setJustAdded(reveal.id);
  }, [reveal]);

  useEffect(() => {
    if (!justAdded) return;
    const el = document.getElementById(`edit-${justAdded}`) as HTMLInputElement | null;
    el?.focus();
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setJustAdded(null);
  }, [justAdded]);

  const update = (id: string, patch: Partial<FormField>) => onChange(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  const insertAfter = (afterId: string | null, f: FormField) => {
    const i = afterId ? fields.findIndex((x) => x.id === afterId) : -1;
    const next = [...fields];
    next.splice(i >= 0 ? i + 1 : fields.length, 0, f);
    onChange(next);
    setOpenId(f.id);
    setJustAdded(f.id);
  };
  const move = (id: string, d: -1 | 1) => {
    const i = fields.findIndex((f) => f.id === id);
    const j = i + d;
    if (i < 0 || j < 0 || j >= fields.length) return;
    const next = [...fields];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
    requestAnimationFrame(() => document.getElementById(`card-${id}`)?.scrollIntoView({ block: 'nearest' }));
  };
  const changeType = (f: FormField, type: FieldType) => {
    const fresh = newField(type);
    // Keep what carries over: the text, the guidance, the requirement and, between choice types, the choices.
    const choice = isChoice(type);
    const counted = type === 'single_choice' || type === 'multi_choice';
    update(f.id, {
      ...fresh, id: f.id, label: f.label, help: f.help, showIf: f.showIf,
      required: isQuestion({ type }) ? f.required : undefined,
      options: choice ? (f.options?.length ? f.options : fresh.options) : undefined,
      optionImages: choice && type !== 'dropdown' ? f.optionImages : undefined,
      optionPrices: choice ? f.optionPrices : undefined,
      other: choice && type !== 'dropdown' && !f.quantities ? f.other : undefined,
      quantities: counted ? f.quantities : undefined,
      sizes: counted && f.quantities ? f.sizes : undefined,
      maxQty: counted && f.quantities ? f.maxQty : undefined,
      image: type === 'image' ? f.image : undefined,
    });
  };

  let number = 0;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
      <div className="min-w-0">
        {header}
        {answerCount > 0 && (
          <p className="mb-4 flex items-start gap-2 border border-separator bg-muted/30 px-3 py-2 font-body text-sm">
            <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <span>This form already has {answerCount} {answerCount === 1 ? 'answer' : 'answers'}. Changing a question does not change what was already answered; a removed question keeps its answers in the export, as "Removed question".</span>
          </p>
        )}
        <ol ref={listRef} className="space-y-2.5">
          {fields.map((f, i) => {
            const Icon = FIELD_ICON[f.type];
            const open = openId === f.id;
            const n = isQuestion(f) ? ++number : null;
            return (
              <li key={f.id} id={`card-${f.id}`} className={`border bg-background transition-colors ${open ? 'border-accent shadow-sm' : 'border-separator hover:border-accent/50'}`}>
                {/* The summary line, which also opens the card. */}
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <button
                    type="button" onClick={() => setOpenId(open ? null : f.id)} aria-expanded={open} data-ro
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left font-body"
                  >
                    <span className="w-6 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{n ?? ''}</span>
                    <Icon aria-hidden className="h-4 w-4 shrink-0 text-accent" />
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate ${f.type === 'section' ? 'font-serif text-[17px] text-accent' : 'text-[15px] text-foreground'}`}>
                        {f.label || <span className="italic text-muted-foreground">{f.type === 'section' ? 'Untitled section' : f.type === 'image' ? 'Picture without a caption' : 'Untitled question'}</span>}
                      </span>
                      {f.showIf && <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground"><Eye aria-hidden className="h-3 w-3 shrink-0" />{ruleText(f, fields)}</span>}
                    </span>
                    <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">{fieldTypeLabel(f.type)}{summaryOf(f) ? ` · ${summaryOf(f)}` : ''}</span>
                    {f.required && <span className="shrink-0 border border-destructive/40 px-1.5 text-[11px] text-destructive">Required</span>}
                  </button>
                  {!readOnly && (
                    <div className="flex shrink-0">
                      <Button type="button" variant="ghost" size="icon" className="h-9 w-9" disabled={i === 0} onClick={() => move(f.id, -1)} aria-label={`Move "${f.label || 'question'}" up`}><ArrowUp className="h-4 w-4" /></Button>
                      <Button type="button" variant="ghost" size="icon" className="h-9 w-9" disabled={i === fields.length - 1} onClick={() => move(f.id, 1)} aria-label={`Move "${f.label || 'question'}" down`}><ArrowDown className="h-4 w-4" /></Button>
                    </div>
                  )}
                </div>
                {open && (
                  <div className="space-y-4 border-t border-separator px-4 pb-4 pt-3 font-body">
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
                      <div className="space-y-1">
                        <Label htmlFor={`edit-${f.id}`} className="text-xs">{f.type === 'section' ? 'Heading' : f.type === 'consent' ? 'What the member agrees to' : f.type === 'image' ? 'Caption (optional)' : 'Question'}</Label>
                        <Input id={`edit-${f.id}`} value={f.label} disabled={readOnly} maxLength={LIMITS.label} onChange={(e) => update(f.id, { label: e.target.value })}
                          placeholder={f.type === 'section' ? 'e.g. Delivery' : f.type === 'image' ? 'e.g. The three colours' : 'e.g. What size do you take?'} className="h-10 text-[15px]" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`type-${f.id}`} className="text-xs">Type</Label>
                        <select id={`type-${f.id}`} value={f.type} disabled={readOnly} onChange={(e) => changeType(f, e.target.value as FieldType)}
                          className="h-10 w-full border border-input bg-background px-2 text-sm">
                          {FIELD_TYPES.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`help-${f.id}`} className="text-xs">{f.type === 'section' ? 'Text under the heading (optional)' : f.type === 'image' ? 'Text under the picture (optional)' : 'Guidance under the question (optional)'}</Label>
                      <Textarea id={`help-${f.id}`} rows={2} value={f.help ?? ''} disabled={readOnly} maxLength={LIMITS.help} onChange={(e) => update(f.id, { help: e.target.value })}
                        placeholder={f.type === 'section' ? '' : 'e.g. The size guide is in the photo above.'} />
                    </div>
                    <TypeSettings field={f} set={(p) => update(f.id, p)} readOnly={readOnly} media={media} />
                    {i > 0 && <ShowIfEditor field={f} before={fields.slice(0, i)} set={(p) => update(f.id, p)} readOnly={readOnly} />}
                    {!readOnly && (
                      <div className="flex flex-wrap items-center gap-2 border-t border-separator pt-3">
                        {isQuestion(f) && (
                          <label className="mr-auto flex items-center gap-2 text-sm">
                            <Switch checked={!!f.required} onCheckedChange={(v) => update(f.id, { required: v })} />Required
                          </label>
                        )}
                        {!isQuestion(f) && <span className="mr-auto" />}
                        <Button type="button" variant="ghost" size="sm" onClick={() => insertAfter(f.id, copyField(f))}><Copy className="h-4 w-4" />Duplicate</Button>
                        <Button type="button" variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => { onChange(fields.filter((x) => x.id !== f.id)); setOpenId(null); }}>
                          <Trash2 className="h-4 w-4" />Remove
                        </Button>
                        <TypePicker onPick={(t) => insertAfter(f.id, newField(t))}>
                          <Button type="button" variant="outline" size="sm"><Plus className="h-4 w-4" />Add after this</Button>
                        </TypePicker>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
        {!readOnly && fields.length < LIMITS.fields && (
          <TypePicker onPick={(t) => insertAfter(fields[fields.length - 1]?.id ?? null, newField(t))}>
            <button type="button" className="mt-3 flex w-full items-center justify-center gap-2 border border-dashed border-separator px-4 py-4 font-body text-sm text-accent hover:border-accent hover:bg-accent/5">
              <Plus className="h-4 w-4" />Add a question
            </button>
          </TypePicker>
        )}
        {fields.length >= LIMITS.fields && <p className="mt-2 font-body text-xs text-muted-foreground">A form holds at most {LIMITS.fields} questions and sections.</p>}
      </div>

      {/* The member's view, as they will see it. */}
      <aside className="hidden xl:block" aria-label="Preview">
        <div className="sticky top-0 max-h-[calc(100vh-14rem)] overflow-y-auto border border-separator bg-muted/20 p-5">
          <p className="mb-4 font-body text-xs uppercase tracking-wider text-muted-foreground">What members see</p>
          <div className="space-y-6 bg-background p-5">
            {coverPath && media.imageUrls[coverPath] && (
              <img src={media.imageUrls[coverPath]} alt="" className="max-h-48 w-full border border-separator object-cover" />
            )}
            {(title || intro) && (
              <div className="border-b border-separator pb-4 text-center">
                <p className="font-serif text-2xl leading-tight text-accent">{title || 'Untitled form'}</p>
                {intro && <p className="mt-1.5 whitespace-pre-line font-body text-sm text-muted-foreground">{intro}</p>}
              </div>
            )}
            {fields.length === 0 && <p className="font-body text-sm text-muted-foreground">Add a question to see it here.</p>}
            {(() => { let k = 0; return fields.map((f) => (
              <div key={f.id} className={openId === f.id ? 'outline outline-2 outline-offset-4 outline-accent/40' : ''}>
                {f.showIf && <p className="mb-1.5 flex items-center gap-1 font-body text-[11px] uppercase tracking-wider text-muted-foreground"><Eye aria-hidden className="h-3 w-3" />{ruleText(f, fields)}</p>}
                <FieldInput field={f} number={isQuestion(f) ? ++k : undefined} value={undefined} onChange={() => undefined} disabled imageUrls={media.imageUrls} />
              </div>
            )); })()}
          </div>
        </div>
      </aside>
    </div>
  );
}
