// =====================================================================
// One question of an internal form, as a member answers it.
// ---------------------------------------------------------------------
// Used by the member's form page and by the organisers' live preview, so
// what is built is exactly what is seen. The rules the research is clear
// on: the label above the field, one column, the requirement said in
// words as well as by an asterisk, a hint under the label, and an error
// under the field that says how to fix it, marked by text and an icon as
// well as by colour. Choices are big rows, easy to hit on a phone.
//
// PICTURES. A choice with a picture becomes a tile showing it; any
// picture opens full size. ORDERS. When a question counts "how many of
// each", picking a choice opens its counter right under it (one per size
// when sizes are asked), with what that choice comes to when it has a
// price. The counters are steppers with a typed number in the middle:
// big enough for a thumb, exact for a keyboard.
// =====================================================================

import { useRef, useState, type DragEvent, type ReactNode } from 'react';
import { AlertCircle, FileText, Image as ImageIcon, Loader2, Maximize2, Minus, Paperclip, Plus, Upload, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  FILE_KINDS, LIMITS, eur, fileProblem, isOrder, optionPrice,
  type AnswerValue, type FileAnswer, type FormField, type OrderLine,
} from '@/lib/internal-forms-rules';

export interface UploadingFile { key: string; name: string; progress: number; error: string | null }

export interface FieldInputProps {
  field: FormField;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue | undefined) => void;
  error?: string | null;
  disabled?: boolean;
  /** File questions: send one file, get back what to store. */
  onUpload?: (field: FormField, file: File, onProgress: (f: number) => void) => Promise<FileAnswer>;
  /** File questions: links to open files already attached. */
  fileUrls?: Record<string, string>;
  /** Links to the form's pictures, by stored path. */
  imageUrls?: Record<string, string>;
  /** Number shown before the question. */
  number?: number;
}

const formatSize = (b: number) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);

/** A picture at full size, over the page. */
export function ImageZoom({ url, alt, onClose }: { url: string | null; alt: string; onClose: () => void }) {
  return (
    <Dialog open={!!url} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="w-[min(96vw,64rem)] max-w-[min(96vw,64rem)] border-0 bg-background p-2 sm:p-3">
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        {url && <img src={url} alt={alt} className="mx-auto max-h-[85vh] w-auto object-contain" />}
      </DialogContent>
    </Dialog>
  );
}

/** "-", a number to type, "+": a quantity. */
function Stepper({ value, max, onChange, label, disabled }: { value: number; max: number; onChange: (n: number) => void; label: string; disabled?: boolean }) {
  const set = (n: number) => onChange(Math.max(0, Math.min(max, Math.round(n) || 0)));
  return (
    <div className="inline-flex items-stretch border border-separator bg-background" role="group" aria-label={label}>
      <button type="button" disabled={disabled || value <= 0} onClick={() => set(value - 1)} aria-label={`One fewer: ${label}`}
        className="flex h-10 w-10 items-center justify-center text-accent hover:bg-accent/5 disabled:text-muted-foreground disabled:hover:bg-transparent"><Minus className="h-4 w-4" /></button>
      <input
        type="text" inputMode="numeric" value={String(value)} disabled={disabled} aria-label={label}
        onChange={(e) => set(Number(e.target.value.replace(/\D/g, '')))} onFocus={(e) => e.target.select()}
        className="h-10 w-11 border-x border-separator bg-background text-center font-body text-[15px] tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <button type="button" disabled={disabled || value >= max} onClick={() => set(value + 1)} aria-label={`One more: ${label}`}
        className="flex h-10 w-10 items-center justify-center text-accent hover:bg-accent/5 disabled:text-muted-foreground disabled:hover:bg-transparent"><Plus className="h-4 w-4" /></button>
    </div>
  );
}

function Choice({ type, name, checked, onChange, disabled, children }: {
  type: 'radio' | 'checkbox'; name: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; children: ReactNode;
}) {
  return (
    <label className={`flex min-h-[44px] cursor-pointer items-center gap-3 border px-3 py-2 font-body text-[15px] transition-colors ${
      checked ? 'border-accent bg-accent/5 text-foreground' : 'border-separator bg-background hover:border-accent/60'
    } ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}>
      <input
        type={type} name={name} checked={checked} disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 shrink-0 accent-[hsl(var(--accent))]"
      />
      <span className="min-w-0 flex-1 break-words">{children}</span>
    </label>
  );
}

export function FieldInput({ field, value, onChange, error, disabled, onUpload, fileUrls = {}, imageUrls = {}, number }: FieldInputProps) {
  const id = `q-${field.id}`;
  const helpId = field.help ? `${id}-help` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [helpId, errId].filter(Boolean).join(' ') || undefined;
  const [uploading, setUploading] = useState<UploadingFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const otherRef = useRef<HTMLInputElement>(null);
  const [otherActive, setOtherActive] = useState(false);
  const [zoom, setZoom] = useState<{ url: string; alt: string } | null>(null);
  // Orders: choices picked whose sizes are not counted yet.
  const [opened, setOpened] = useState<string[]>([]);
  // The latest answer, for uploads that finish one after another.
  const latest = useRef(value);
  latest.current = value;
  const zoomLayer = <ImageZoom url={zoom?.url ?? null} alt={zoom?.alt ?? ''} onClose={() => setZoom(null)} />;

  // ── A picture ───────────────────────────────────────────────────
  if (field.type === 'image') {
    const url = field.image ? imageUrls[field.image] : undefined;
    return (
      <figure id={id} className="m-0">
        {url ? (
          <button type="button" data-ro onClick={() => setZoom({ url, alt: field.label || 'Picture' })}
            className="group relative block w-full overflow-hidden border border-separator bg-muted/30" aria-label={`Open the picture${field.label ? `: ${field.label}` : ''} full size`}>
            <img src={url} alt={field.label || 'Picture'} loading="lazy" className="mx-auto max-h-[30rem] w-auto object-contain" />
            <span className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center bg-background/90 text-accent opacity-80 group-hover:opacity-100" aria-hidden><Maximize2 className="h-4 w-4" /></span>
          </button>
        ) : (
          <div className="flex h-40 items-center justify-center border border-dashed border-separator bg-muted/30 font-body text-sm text-muted-foreground">
            <ImageIcon aria-hidden className="mr-2 h-4 w-4" />{field.image ? 'Loading the picture' : 'No picture yet'}
          </div>
        )}
        {(field.label || field.help) && (
          <figcaption className="mt-2 font-body">
            {field.label && <span className="block text-[15px] font-medium text-foreground">{field.label}</span>}
            {field.help && <span className="mt-0.5 block whitespace-pre-wrap text-[13px] leading-relaxed text-muted-foreground">{field.help}</span>}
          </figcaption>
        )}
        {zoomLayer}
      </figure>
    );
  }

  if (field.type === 'section') {
    return (
      <div className="border-t-2 border-accent pt-5" id={id}>
        <h2 className="font-serif text-xl text-accent">{field.label || 'Section'}</h2>
        {field.help && <p className="mt-1 whitespace-pre-wrap font-body text-sm leading-relaxed text-muted-foreground">{field.help}</p>}
      </div>
    );
  }

  const label = (
    <span className="block font-body text-[15px] font-medium leading-snug text-foreground">
      {number !== undefined && <span className="mr-1.5 tabular-nums text-muted-foreground">{number}.</span>}
      {field.label || 'Untitled question'}
      {field.required && <><span aria-hidden className="ml-1 text-destructive">*</span><span className="sr-only"> (required)</span></>}
    </span>
  );
  const help = field.help ? <p id={helpId} className="mt-1 whitespace-pre-wrap font-body text-[13px] leading-relaxed text-muted-foreground">{field.help}</p> : null;
  const errorLine = error ? (
    <p id={errId} className="mt-1.5 flex items-start gap-1.5 font-body text-[13px] font-medium text-destructive">
      <AlertCircle aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />{error}
    </p>
  ) : null;
  const invalid = error ? 'border-destructive focus-visible:ring-destructive' : '';

  const optImage = (o: string): string | undefined => {
    const i = (field.options ?? []).indexOf(o);
    const p = i >= 0 ? field.optionImages?.[i] : null;
    return p ? imageUrls[p] : undefined;
  };
  const priceTag = (o: string) => {
    const pr = optionPrice(field, o);
    return pr === null ? null : <span className="shrink-0 tabular-nums text-muted-foreground">{eur(pr)}</span>;
  };
  // The picture of a choice: decorative inside its label (the text names
  // the choice), with its "see full size" button kept OUTSIDE the label,
  // so a tick box never has a button inside its name.
  const thumb = (o: string, size: 'sm' | 'lg') => {
    const url = optImage(o);
    if (!url) return null;
    return (
      <span className={`block shrink-0 overflow-hidden border border-separator bg-muted/30 ${size === 'lg' ? 'aspect-square w-full' : 'h-16 w-16 sm:h-20 sm:w-20'}`}>
        <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
      </span>
    );
  };
  const zoomButton = (o: string, className: string) => {
    const url = optImage(o);
    if (!url) return null;
    return (
      <button type="button" data-ro onClick={() => setZoom({ url, alt: o })} aria-label={`See ${o} full size`}
        className={`flex h-8 w-8 items-center justify-center bg-background/90 text-accent hover:bg-background ${className}`}>
        <Maximize2 className="h-3.5 w-3.5" />
      </button>
    );
  };

  // ── Orders: how many of each choice (and size) ─────────────────
  if (isOrder(field)) {
    const opts = field.options ?? [];
    const sizes = field.sizes ?? [];
    const max = field.maxQty ?? LIMITS.defaultQty;
    const multi = field.type === 'multi_choice';
    const lines: OrderLine[] = Array.isArray(value) ? (value as OrderLine[]) : [];
    const qtyOf = (o: string, size?: string) => lines.filter((l) => l.option === o && (l.size ?? '') === (size ?? '')).reduce((a, l) => a + l.qty, 0);
    const picked = (o: string) => opened.includes(o) || lines.some((l) => l.option === o && l.qty > 0);
    const commit = (next: OrderLine[]) => onChange(next.length ? next : undefined);
    const setQty = (o: string, size: string | undefined, qty: number) => {
      const others = lines.filter((l) => !(l.option === o && (l.size ?? '') === (size ?? '')));
      const keep = multi ? others : others.filter((l) => l.option === o);
      commit(qty > 0 ? [...keep, { option: o, ...(size ? { size } : {}), qty }] : keep);
    };
    const pick = (o: string, on: boolean) => {
      if (on) {
        // A choice without sizes starts at one; with sizes, the member says which.
        const rest = multi ? lines : [];
        if (!multi) setOpened([o]); else setOpened((x) => [...new Set([...x, o])]);
        if (!sizes.length) commit([...rest.filter((l) => l.option !== o), { option: o, qty: Math.max(1, qtyOf(o)) }]);
        else if (!multi) commit([]);
      } else {
        setOpened((x) => x.filter((y) => y !== o));
        commit(lines.filter((l) => l.option !== o));
      }
    };
    return (
      <fieldset id={id} aria-describedby={describedBy} aria-invalid={!!error || undefined}>
        <legend className="mb-1">{label}</legend>
        {help}
        <p className="mt-1 font-body text-xs text-muted-foreground">
          {multi ? 'Tick what you would like' : 'Choose one'}{sizes.length ? ', then how many of each size' : ', then how many'}. Up to {max} of each.
        </p>
        <div className="mt-2.5 grid gap-2">
          {opts.map((o) => {
            const on = picked(o);
            const count = lines.filter((l) => l.option === o).reduce((a, l) => a + l.qty, 0);
            const pr = optionPrice(field, o);
            return (
              <div key={o} className={`border transition-colors ${on ? 'border-accent bg-accent/[0.03]' : 'border-separator bg-background'}`}>
                <div className="flex items-center gap-2 pr-2">
                  <label className={`flex min-h-[44px] min-w-0 flex-1 cursor-pointer items-center gap-3 px-3 py-2 font-body text-[15px] ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}>
                    <input type={multi ? 'checkbox' : 'radio'} name={id} checked={on} disabled={disabled}
                      onChange={(e) => pick(o, e.target.checked)} className="h-4 w-4 shrink-0 accent-[hsl(var(--accent))]" />
                    {thumb(o, 'sm')}
                    <span className="min-w-0 flex-1 break-words">{o}</span>
                    {priceTag(o)}
                  </label>
                  {zoomButton(o, 'shrink-0 border border-separator')}
                </div>
                {on && (
                  <div className="border-t border-separator px-3 pb-3 pt-2.5 font-body">
                    {sizes.length ? (
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-x-4 gap-y-2.5">
                        {sizes.map((sz) => (
                          <div key={sz} className="flex items-center justify-between gap-2">
                            <span className="text-sm text-foreground">{sz}</span>
                            <Stepper value={qtyOf(o, sz)} max={max} disabled={disabled} label={`${o}, size ${sz}, how many`} onChange={(n) => setQty(o, sz, n)} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-foreground">How many</span>
                        <Stepper value={qtyOf(o)} max={max} disabled={disabled} label={`${o}, how many`} onChange={(n) => setQty(o, undefined, n)} />
                      </div>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
                      {count ? `${count} ${count === 1 ? 'item' : 'items'}${pr !== null ? `, ${eur(pr * count)}` : ''}` : sizes.length ? 'Choose how many of each size.' : 'Choose how many.'}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {errorLine}
        {zoomLayer}
      </fieldset>
    );
  }

  // ── Choices ─────────────────────────────────────────────────────
  if (field.type === 'single_choice' || field.type === 'multi_choice') {
    const opts = field.options ?? [];
    const multi = field.type === 'multi_choice';
    const list: string[] = multi ? (Array.isArray(value) ? (value as string[]) : []) : typeof value === 'string' && value ? [value] : [];
    const otherText = list.find((x) => !opts.includes(x)) ?? '';
    const otherOn = !!otherText || otherActive;
    const set = (opt: string, on: boolean) => {
      if (!multi) { setOtherActive(false); onChange(on ? opt : undefined); return; }
      const next = on ? [...list.filter((x) => x !== opt), opt] : list.filter((x) => x !== opt);
      onChange(next.length ? next : undefined);
    };
    const setOther = (t: string) => {
      const kept = list.filter((x) => opts.includes(x));
      if (!multi) onChange(t ? t : undefined);
      else onChange([...kept, ...(t ? [t] : [])].length ? [...kept, ...(t ? [t] : [])] : undefined);
    };
    return (
      <fieldset id={id} aria-describedby={describedBy} aria-invalid={!!error || undefined}>
        <legend className="mb-1">{label}</legend>
        {help}
        {opts.some((o) => optImage(o)) ? (
          // Pictures: one tile per choice, the picture first.
          <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {opts.map((o, i) => (
              <div key={o} className={`relative border p-2 font-body text-[15px] transition-colors ${list.includes(o) ? 'border-accent bg-accent/5' : 'border-separator bg-background hover:border-accent/60'} ${disabled ? 'opacity-70' : ''}`}>
                {/* The picture is a second label for the same tick box: a tap on it picks the choice. */}
                <label htmlFor={`${id}-opt-${i}`} className={disabled ? 'block cursor-not-allowed' : 'block cursor-pointer'}>
                  {thumb(o, 'lg') ?? <span className="flex aspect-square w-full items-center justify-center bg-muted/40 text-muted-foreground"><ImageIcon aria-hidden className="h-5 w-5" /></span>}
                </label>
                {zoomButton(o, 'absolute right-3 top-3 border border-separator')}
                <label htmlFor={`${id}-opt-${i}`} className={`mt-2 flex items-start gap-2 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                  <input id={`${id}-opt-${i}`} type={multi ? 'checkbox' : 'radio'} name={id} checked={list.includes(o)} disabled={disabled}
                    onChange={(e) => set(o, e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[hsl(var(--accent))]" />
                  <span className="min-w-0 flex-1 break-words">{o}</span>
                </label>
                {optionPrice(field, o) !== null && <span className="ml-6 block text-sm tabular-nums text-muted-foreground">{eur(optionPrice(field, o) as number)}</span>}
              </div>
            ))}
          </div>
        ) : null}
        <div className="mt-2.5 grid gap-2">
          {!opts.some((o) => optImage(o)) && opts.map((o) => (
            <Choice key={o} type={multi ? 'checkbox' : 'radio'} name={id} checked={list.includes(o)} onChange={(on) => set(o, on)} disabled={disabled}>
              <span className="flex items-center justify-between gap-3"><span>{o}</span>{priceTag(o)}</span>
            </Choice>
          ))}
          {field.other && (
            <div className={`flex min-h-[44px] items-center gap-3 border px-3 py-1.5 ${otherText ? 'border-accent bg-accent/5' : 'border-separator'}`}>
              <input
                type={multi ? 'checkbox' : 'radio'} name={id} checked={otherOn} disabled={disabled}
                onChange={(e) => { if (e.target.checked) { setOtherActive(true); otherRef.current?.focus(); } else { setOtherActive(false); setOther(''); } }}
                className="h-4 w-4 shrink-0 accent-[hsl(var(--accent))]" aria-label="Other"
              />
              <span className="font-body text-[15px] text-muted-foreground">Other:</span>
              <Input
                ref={otherRef} value={otherText} disabled={disabled} maxLength={LIMITS.option}
                onFocus={() => setOtherActive(true)}
                onChange={(e) => setOther(e.target.value)} className="h-9 min-w-0 flex-1" aria-label={`${field.label}: other answer`}
                placeholder="Write your answer"
              />
            </div>
          )}
        </div>
        {errorLine}
        {zoomLayer}
      </fieldset>
    );
  }

  // ── Scale ───────────────────────────────────────────────────────
  if (field.type === 'scale') {
    const lo = field.scaleMin ?? 1; const hi = field.scaleMax ?? 5;
    const steps = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
    return (
      <fieldset id={id} aria-describedby={describedBy} aria-invalid={!!error || undefined}>
        <legend className="mb-1">{label}</legend>
        {help}
        <div role="radiogroup" aria-label={field.label} className="mt-2.5 flex flex-wrap gap-1.5">
          {steps.map((n) => (
            <button
              key={n} type="button" role="radio" aria-checked={value === n} disabled={disabled}
              onClick={() => onChange(value === n ? undefined : n)}
              className={`h-11 min-w-[44px] flex-1 border font-body text-[15px] tabular-nums transition-colors ${value === n ? 'border-accent bg-accent text-accent-foreground' : 'border-separator bg-background hover:border-accent'}`}
            >{n}</button>
          ))}
        </div>
        {(field.minLabel || field.maxLabel) && (
          <div className="mt-1 flex justify-between font-body text-xs text-muted-foreground"><span>{field.minLabel}</span><span>{field.maxLabel}</span></div>
        )}
        {errorLine}
      </fieldset>
    );
  }

  // ── Agreement ───────────────────────────────────────────────────
  if (field.type === 'consent') {
    return (
      <div id={id}>
        <label className={`flex min-h-[44px] cursor-pointer items-start gap-3 border px-3 py-3 ${value === true ? 'border-accent bg-accent/5' : error ? 'border-destructive' : 'border-separator'}`}>
          <input
            type="checkbox" checked={value === true} disabled={disabled} aria-describedby={describedBy} aria-invalid={!!error || undefined}
            onChange={(e) => onChange(e.target.checked ? true : undefined)}
            className="mt-1 h-4 w-4 shrink-0 accent-[hsl(var(--accent))]"
          />
          <span>{label}{help}</span>
        </label>
        {errorLine}
      </div>
    );
  }

  // ── Files ───────────────────────────────────────────────────────
  if (field.type === 'file') {
    const files: FileAnswer[] = Array.isArray(value) ? (value as FileAnswer[]) : [];
    const max = field.maxFiles ?? 1;
    const room = max - files.length - uploading.filter((u) => !u.error).length;
    const kinds = FILE_KINDS[field.fileKinds ?? 'any'];
    const add = async (list: File[]) => {
      if (!onUpload || disabled) return;
      for (const file of list.slice(0, Math.max(0, room))) {
        const key = `${Date.now()}-${Math.random()}`;
        const problem = fileProblem(field, file.name, file.size);
        setUploading((u) => [...u, { key, name: file.name, progress: 0, error: problem }]);
        if (problem) continue;
        try {
          const stored = await onUpload(field, file, (p) => setUploading((u) => u.map((x) => (x.key === key ? { ...x, progress: p } : x))));
          setUploading((u) => u.filter((x) => x.key !== key));
          const now = Array.isArray(latest.current) ? (latest.current as FileAnswer[]) : [];
          const next = [...now.filter((f) => f.path !== stored.path), stored];
          latest.current = next;
          onChange(next);
        } catch (e) {
          setUploading((u) => u.map((x) => (x.key === key ? { ...x, error: e instanceof Error ? e.message : 'The upload did not complete.' } : x)));
        }
      }
    };
    const onDrop = (e: DragEvent) => { e.preventDefault(); setDragging(false); add(Array.from(e.dataTransfer.files ?? [])); };
    return (
      <div id={id} role="group" aria-labelledby={`${id}-label`} aria-describedby={describedBy}>
        <div id={`${id}-label`}>{label}</div>
        {help}
        <p className="mt-1 font-body text-xs text-muted-foreground">{kinds.label}; up to {max} {max === 1 ? 'file' : 'files'}, 10 MB each.</p>
        {files.length > 0 && (
          <ul className="mt-2.5 divide-y divide-separator border border-separator">
            {files.map((f) => (
              <li key={f.path} className="flex items-center gap-3 px-3 py-2">
                <FileText aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 break-words font-body text-sm">
                  {fileUrls[f.path] ? <a href={fileUrls[f.path]} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2">{f.name}</a> : f.name}
                  <span className="ml-2 text-xs text-muted-foreground">{formatSize(f.size)}</span>
                </span>
                {!disabled && (
                  <button type="button" onClick={() => onChange(files.filter((x) => x.path !== f.path).length ? files.filter((x) => x.path !== f.path) : undefined)}
                    className="flex h-9 w-9 items-center justify-center text-muted-foreground hover:text-destructive" aria-label={`Remove ${f.name}`}>
                    <X className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {uploading.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {uploading.map((u) => (
              <li key={u.key} className="font-body text-sm">
                <div className="flex items-center gap-2">
                  {u.error ? <AlertCircle className="h-4 w-4 shrink-0 text-destructive" /> : <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent" />}
                  <span className="min-w-0 flex-1 truncate">{u.name}</span>
                  {u.error && (
                    <button type="button" className="text-xs text-muted-foreground underline" onClick={() => setUploading((x) => x.filter((y) => y.key !== u.key))}>Dismiss</button>
                  )}
                </div>
                {u.error ? <p className="ml-6 text-xs text-destructive">{u.error}</p> : (
                  <div className="ml-6 mt-1 h-1.5 bg-muted" role="progressbar" aria-label={`Uploading ${u.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(u.progress * 100)}>
                    <div className="h-full bg-accent transition-[width]" style={{ width: `${Math.round(u.progress * 100)}%` }} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {room > 0 && !disabled && (
          <button
            type="button" onClick={() => picker.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}
            className={`mt-2.5 flex w-full items-center justify-center gap-2 border border-dashed px-4 py-4 font-body text-sm transition-colors ${dragging ? 'border-accent bg-accent/5' : error ? 'border-destructive' : 'border-separator hover:border-accent hover:bg-accent/5'}`}
          >
            {files.length ? <Paperclip aria-hidden className="h-4 w-4 text-accent" /> : <Upload aria-hidden className="h-4 w-4 text-accent" />}
            <span className="text-foreground">{files.length ? 'Attach another file' : 'Choose a file'}</span>
            <span className="text-muted-foreground">or drop it here</span>
          </button>
        )}
        <input ref={picker} type="file" className="hidden" multiple={max > 1}
          accept={kinds.ext.map((e) => `.${e}`).join(',')}
          onChange={(e) => { add(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
        {errorLine}
      </div>
    );
  }

  // ── Dropdown ────────────────────────────────────────────────────
  if (field.type === 'dropdown') {
    return (
      <div>
        <label htmlFor={id}>{label}</label>
        {help}
        <select
          id={id} value={typeof value === 'string' ? value : ''} disabled={disabled}
          aria-describedby={describedBy} aria-invalid={!!error || undefined} aria-required={field.required || undefined}
          onChange={(e) => onChange(e.target.value || undefined)}
          className={`mt-2 h-11 w-full border bg-background px-3 font-body text-[15px] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${error ? 'border-destructive' : 'border-input'}`}
        >
          <option value="">Choose...</option>
          {(field.options ?? []).map((o) => <option key={o} value={o}>{optionPrice(field, o) !== null ? `${o} (${eur(optionPrice(field, o) as number)})` : o}</option>)}
        </select>
        {errorLine}
      </div>
    );
  }

  // ── Text, number, date, email, phone ───────────────────────────
  if (field.type === 'long_text') {
    const t = typeof value === 'string' ? value : '';
    return (
      <div>
        <label htmlFor={id}>{label}</label>
        {help}
        <Textarea
          id={id} value={t} rows={4} disabled={disabled} maxLength={LIMITS.longText}
          aria-describedby={describedBy} aria-invalid={!!error || undefined} aria-required={field.required || undefined}
          onChange={(e) => onChange(e.target.value || undefined)} className={`mt-2 text-[15px] ${invalid}`}
        />
        <div className="mt-1 flex justify-between gap-2">{errorLine ?? <span />}<span className="font-body text-xs tabular-nums text-muted-foreground">{t.length ? `${t.length.toLocaleString('en-GB')} / ${LIMITS.longText.toLocaleString('en-GB')}` : ''}</span></div>
      </div>
    );
  }
  const inputType = field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : field.type === 'date' ? 'date' : 'text';
  const inputMode = field.type === 'number' ? (field.integer ? 'numeric' : 'decimal') : field.type === 'phone' ? 'tel' : field.type === 'email' ? 'email' : undefined;
  const shown = value === undefined || value === null ? '' : String(value);
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      {help}
      <Input
        id={id} type={inputType} inputMode={inputMode} value={shown} disabled={disabled}
        maxLength={field.type === 'short_text' ? LIMITS.shortText : 254}
        autoComplete={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'off'}
        aria-describedby={describedBy} aria-invalid={!!error || undefined} aria-required={field.required || undefined}
        onChange={(e) => {
          const v = e.target.value;
          if (field.type === 'number') onChange(v.trim() === '' ? undefined : (Number.isFinite(Number(v.replace(',', '.'))) ? Number(v.replace(',', '.')) : v));
          else onChange(v || undefined);
        }}
        className={`mt-2 h-11 text-[15px] ${field.type === 'number' || field.type === 'date' ? 'max-w-[16rem]' : ''} ${invalid}`}
        placeholder={field.type === 'number' && (field.min != null || field.max != null) ? [field.min != null ? `from ${field.min}` : '', field.max != null ? `to ${field.max}` : ''].filter(Boolean).join(' ') : undefined}
      />
      {errorLine}
    </div>
  );
}
