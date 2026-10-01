// =====================================================================
// One question of an internal form, as a member answers it.
// ---------------------------------------------------------------------
// Used by the member's form page and by the organisers' live preview, so
// what is built is exactly what is seen. The rules the research is clear
// on: the label above the field, one column, the requirement said in
// words as well as by an asterisk, a hint under the label, and an error
// under the field that says how to fix it, marked by text and an icon as
// well as by colour. Choices are big rows, easy to hit on a phone.
// =====================================================================

import { useRef, useState, type DragEvent } from 'react';
import { AlertCircle, FileText, Loader2, Paperclip, Upload, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  FILE_KINDS, LIMITS, fileProblem, type AnswerValue, type FileAnswer, type FormField,
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
  /** Number shown before the question. */
  number?: number;
}

const formatSize = (b: number) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);

function Choice({ type, name, checked, onChange, disabled, children }: {
  type: 'radio' | 'checkbox'; name: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; children: React.ReactNode;
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
      <span className="min-w-0 break-words">{children}</span>
    </label>
  );
}

export function FieldInput({ field, value, onChange, error, disabled, onUpload, fileUrls = {}, number }: FieldInputProps) {
  const id = `q-${field.id}`;
  const helpId = field.help ? `${id}-help` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [helpId, errId].filter(Boolean).join(' ') || undefined;
  const [uploading, setUploading] = useState<UploadingFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const otherRef = useRef<HTMLInputElement>(null);
  const [otherActive, setOtherActive] = useState(false);
  // The latest answer, for uploads that finish one after another.
  const latest = useRef(value);
  latest.current = value;

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
        <div className="mt-2.5 grid gap-2">
          {opts.map((o) => (
            <Choice key={o} type={multi ? 'checkbox' : 'radio'} name={id} checked={list.includes(o)} onChange={(on) => set(o, on)} disabled={disabled}>{o}</Choice>
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
          {(field.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
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
