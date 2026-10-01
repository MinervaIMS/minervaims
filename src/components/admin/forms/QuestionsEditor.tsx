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
// =====================================================================

import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown, ArrowUp, ClipboardPaste, Copy, Info, Plus, Trash2, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  FIELD_TYPES, FILE_KINDS, LIMITS, isChoice, isQuestion, type FieldType, type FileKinds, type FormField,
} from '@/lib/internal-forms-rules';
import { FieldInput } from '@/components/forms/FieldInput';
import { FIELD_ICON, copyField, fieldTypeLabel, newField } from './forms-model';

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
  if (isChoice(f.type)) return `${f.options?.length ?? 0} ${(f.options?.length ?? 0) === 1 ? 'choice' : 'choices'}${f.other ? ' + Other' : ''}`;
  if (f.type === 'file') return `${FILE_KINDS[f.fileKinds ?? 'any'].label.split(' (')[0]}, up to ${f.maxFiles ?? 1}`;
  if (f.type === 'scale') return `${f.scaleMin ?? 1} to ${f.scaleMax ?? 5}`;
  if (f.type === 'number') return [f.integer ? 'Whole numbers' : 'Numbers', f.min != null ? `from ${f.min}` : '', f.max != null ? `to ${f.max}` : ''].filter(Boolean).join(' ');
  return '';
}

/** The settings particular to each type. */
function TypeSettings({ field, set, readOnly }: { field: FormField; set: (p: Partial<FormField>) => void; readOnly: boolean }) {
  const [pasting, setPasting] = useState(false);
  const [pasted, setPasted] = useState('');
  if (isChoice(field.type)) {
    const opts = field.options ?? [];
    const setOpt = (i: number, v: string) => set({ options: opts.map((o, j) => (j === i ? v : o)) });
    const move = (i: number, d: -1 | 1) => {
      const j = i + d;
      if (j < 0 || j >= opts.length) return;
      const next = [...opts];
      [next[i], next[j]] = [next[j], next[i]];
      set({ options: next });
    };
    return (
      <div className="space-y-2">
        <Label className="font-body text-xs uppercase tracking-wider text-muted-foreground">Choices</Label>
        <ol className="space-y-1.5">
          {opts.map((o, i) => (
            <li key={i} className="flex items-center gap-1.5">
              <span className="w-6 shrink-0 text-right font-body text-xs tabular-nums text-muted-foreground">{i + 1}.</span>
              <Input value={o} disabled={readOnly} maxLength={LIMITS.option} onChange={(e) => setOpt(i, e.target.value)} className="h-9 min-w-0 flex-1" aria-label={`Choice ${i + 1}`} />
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9" disabled={readOnly || i === 0} onClick={() => move(i, -1)} aria-label={`Move choice ${i + 1} up`}><ArrowUp className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9" disabled={readOnly || i === opts.length - 1} onClick={() => move(i, 1)} aria-label={`Move choice ${i + 1} down`}><ArrowDown className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9" disabled={readOnly || opts.length <= 1} onClick={() => set({ options: opts.filter((_, j) => j !== i) })} aria-label={`Remove choice ${i + 1}`}><X className="h-4 w-4" /></Button>
            </li>
          ))}
        </ol>
        {!readOnly && (
          <div className="flex flex-wrap items-center gap-2 pl-7">
            <Button type="button" variant="ghost" size="sm" disabled={opts.length >= LIMITS.options} onClick={() => set({ options: [...opts, `Option ${opts.length + 1}`] })}><Plus className="h-4 w-4" />Add a choice</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setPasting((p) => !p)}><ClipboardPaste className="h-4 w-4" />Paste a list</Button>
          </div>
        )}
        {pasting && !readOnly && (
          <div className="space-y-2 pl-7">
            <Textarea rows={4} value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder={'One choice per line, for example:\nXS\nS\nM'} aria-label="Choices, one per line" />
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="solid" onClick={() => {
                const lines = pasted.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
                if (lines.length) set({ options: Array.from(new Set(lines)).slice(0, LIMITS.options) });
                setPasting(false); setPasted('');
              }}>Replace the choices</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => { setPasting(false); setPasted(''); }}>Cancel</Button>
            </div>
          </div>
        )}
        {field.type !== 'dropdown' && (
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

export function QuestionsEditor({ fields, onChange, answerCount, readOnly, reveal, header, title, intro }: {
  fields: FormField[];
  onChange: (fields: FormField[]) => void;
  answerCount: number;
  readOnly: boolean;
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
    update(f.id, {
      ...fresh, id: f.id, label: f.label, help: f.help,
      required: type === 'section' ? undefined : f.required,
      options: isChoice(type) ? (f.options?.length ? f.options : fresh.options) : undefined,
      other: isChoice(type) && type !== 'dropdown' ? f.other : undefined,
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
                    <span className={`min-w-0 flex-1 truncate ${f.type === 'section' ? 'font-serif text-[17px] text-accent' : 'text-[15px] text-foreground'}`}>
                      {f.label || <span className="italic text-muted-foreground">{f.type === 'section' ? 'Untitled section' : 'Untitled question'}</span>}
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
                        <Label htmlFor={`edit-${f.id}`} className="text-xs">{f.type === 'section' ? 'Heading' : f.type === 'consent' ? 'What the member agrees to' : 'Question'}</Label>
                        <Input id={`edit-${f.id}`} value={f.label} disabled={readOnly} maxLength={LIMITS.label} onChange={(e) => update(f.id, { label: e.target.value })}
                          placeholder={f.type === 'section' ? 'e.g. Delivery' : 'e.g. What size do you take?'} className="h-10 text-[15px]" />
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
                      <Label htmlFor={`help-${f.id}`} className="text-xs">{f.type === 'section' ? 'Text under the heading (optional)' : 'Guidance under the question (optional)'}</Label>
                      <Textarea id={`help-${f.id}`} rows={2} value={f.help ?? ''} disabled={readOnly} maxLength={LIMITS.help} onChange={(e) => update(f.id, { help: e.target.value })}
                        placeholder={f.type === 'section' ? '' : 'e.g. The size guide is in the photo above.'} />
                    </div>
                    <TypeSettings field={f} set={(p) => update(f.id, p)} readOnly={readOnly} />
                    {!readOnly && (
                      <div className="flex flex-wrap items-center gap-2 border-t border-separator pt-3">
                        {f.type !== 'section' && (
                          <label className="mr-auto flex items-center gap-2 text-sm">
                            <Switch checked={!!f.required} onCheckedChange={(v) => update(f.id, { required: v })} />Required
                          </label>
                        )}
                        {f.type === 'section' && <span className="mr-auto" />}
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
            {(title || intro) && (
              <div className="border-b border-separator pb-4 text-center">
                <p className="font-serif text-2xl leading-tight text-accent">{title || 'Untitled form'}</p>
                {intro && <p className="mt-1.5 whitespace-pre-line font-body text-sm text-muted-foreground">{intro}</p>}
              </div>
            )}
            {fields.length === 0 && <p className="font-body text-sm text-muted-foreground">Add a question to see it here.</p>}
            {(() => { let k = 0; return fields.map((f) => (
              <div key={f.id} className={openId === f.id ? 'outline outline-2 outline-offset-4 outline-accent/40' : ''}>
                <FieldInput field={f} number={isQuestion(f) ? ++k : undefined} value={undefined} onChange={() => undefined} disabled />
              </div>
            )); })()}
          </div>
        </div>
      </aside>
    </div>
  );
}
