// =====================================================================
// INTERNAL FORMS: what a form may contain and what an answer must be.
// ---------------------------------------------------------------------
// ONE FILE, TWO COPIES, IDENTICAL BYTE FOR BYTE:
//   supabase/functions/_shared/internal-forms.ts   (the server decides)
//   src/lib/internal-forms-rules.ts                (the page says it first)
// The edge function and the browser share no module graph, so the rules
// are kept in a file with no imports at all, copied whole. A difference
// between the two copies is a bug: edit one, copy it over the other.
//
// The server is the judge. The page runs the same checks so a member is
// told what is missing next to the question, before anything is sent,
// rather than after a round trip.
//
// ORDERS. A choice question can ask "how many of each": every choice the
// member picks then takes a quantity, or a quantity per size when the
// organiser lists sizes. Such an answer is a list of order lines. Choices
// can carry a price; the amount a member owes is worked out from what
// they ordered (plus any fixed amount), here, on both sides.
//
// SHOW-IF. Any question, heading or picture can be shown only when an
// earlier choice question (or agreement) has one of the chosen answers.
// A hidden question is never required and its answer is never kept.
// =====================================================================

export type FieldType =
  | 'short_text' | 'long_text' | 'single_choice' | 'multi_choice' | 'dropdown'
  | 'number' | 'scale' | 'date' | 'email' | 'phone' | 'file' | 'consent' | 'section' | 'image';

export type FileKinds = 'images' | 'documents' | 'any';

/** Show a field only when an earlier question's answer includes one of `values`. */
export interface ShowIf { field: string; values: string[] }

export interface FormField {
  /** Stable for the life of the form: answers are stored under it. */
  id: string;
  type: FieldType;
  /** The question, or the heading of a section. */
  label: string;
  /** A line of guidance under the question. */
  help?: string;
  required?: boolean;
  /** Choice questions: the choices, in order. */
  options?: string[];
  /** Choice questions: also accept an answer typed in "Other". */
  other?: boolean;
  /** Number: bounds and whole numbers only. */
  min?: number | null;
  max?: number | null;
  integer?: boolean;
  /** Scale: from 0 or 1 to 5 or 10, with optional words at each end. */
  scaleMin?: number;
  scaleMax?: number;
  minLabel?: string;
  maxLabel?: string;
  /** File upload: how many files and of what kind. */
  maxFiles?: number;
  fileKinds?: FileKinds;
  /** Picture block: the picture, a stored path. */
  image?: string;
  /** Choice questions: a picture for each choice, in the order of `options`. */
  optionImages?: (string | null)[];
  /** Choice questions: a price in euro for each choice, in the order of `options`. */
  optionPrices?: (number | null)[];
  /** One choice and Several choices: ask how many of each choice picked. */
  quantities?: boolean;
  /** With quantities: count each choice by size (e.g. XS to XL). */
  sizes?: string[];
  /** With quantities: the most a member can order of one choice (and size). */
  maxQty?: number;
  /** Shown only when an earlier answer matches. */
  showIf?: ShowIf;
}

export interface FileAnswer { path: string; name: string; size: number; type: string }
/** One line of an order: so many of a choice, in a size when sizes are asked. */
export interface OrderLine { option: string; size?: string; qty: number }
export type AnswerValue = string | number | boolean | string[] | FileAnswer[] | OrderLine[];
export type Answers = Record<string, AnswerValue>;

export const LIMITS = {
  fields: 60,
  options: 40,
  title: 200,
  label: 300,
  help: 1000,
  option: 200,
  shortText: 300,
  longText: 5000,
  files: 5,
  fileBytes: 10 * 1024 * 1024,
  sizes: 12,
  size: 40,
  maxQty: 99,
  defaultQty: 10,
  price: 10000,
} as const;

export const FIELD_TYPES: { type: FieldType; label: string; hint: string }[] = [
  { type: 'short_text', label: 'Short answer', hint: 'A name, a size, a few words' },
  { type: 'long_text', label: 'Paragraph', hint: 'A longer written answer' },
  { type: 'single_choice', label: 'One choice', hint: 'Pick one from a list, shown as buttons' },
  { type: 'multi_choice', label: 'Several choices', hint: 'Tick all that apply' },
  { type: 'dropdown', label: 'Dropdown', hint: 'Pick one from a long list' },
  { type: 'number', label: 'Number', hint: 'A quantity or an amount' },
  { type: 'scale', label: 'Scale', hint: 'Rate from 1 to 5, or 0 to 10' },
  { type: 'date', label: 'Date', hint: 'A day in the calendar' },
  { type: 'email', label: 'Email', hint: 'An email address' },
  { type: 'phone', label: 'Phone number', hint: 'A telephone number' },
  { type: 'file', label: 'File upload', hint: 'Images or documents, up to 5 files' },
  { type: 'consent', label: 'Agreement', hint: 'One box to tick, such as "I agree to pay"' },
  { type: 'section', label: 'Section heading', hint: 'A title and text that split the form into parts' },
  { type: 'image', label: 'Picture', hint: 'A photo or a size guide, with an optional caption' },
];

/** What organisers may show in a form: pictures a browser can display. */
export const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'webp', 'gif'];

export const FILE_KINDS: Record<FileKinds, { label: string; ext: string[] }> = {
  images: { label: 'Images (PNG, JPG, WebP, GIF, HEIC)', ext: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'heic', 'heif'] },
  documents: { label: 'Documents (PDF, Word, Excel, PowerPoint, text, CSV)', ext: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv'] },
  any: { label: 'Images and documents', ext: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'heic', 'heif', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'zip'] },
};

const CHOICE_TYPES: FieldType[] = ['single_choice', 'multi_choice', 'dropdown'];
export const isChoice = (t: FieldType) => CHOICE_TYPES.includes(t);
/** A field that takes an answer: not a heading, not a picture. */
export const isQuestion = (f: Pick<FormField, 'type'>) => f.type !== 'section' && f.type !== 'image';
/** A question whose answer is a list of order lines. */
export const isOrder = (f: Pick<FormField, 'type' | 'quantities'>) => !!f.quantities && (f.type === 'single_choice' || f.type === 'multi_choice');
/** The kinds of question a show-if rule can depend on. */
export const canDrive = (f: Pick<FormField, 'type'>) => isChoice(f.type) || f.type === 'consent';

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** The extension of a file name, lower case. */
export function extOf(name: string): string {
  const m = String(name || '').toLowerCase().match(/\.([a-z0-9]{1,8})$/);
  return m ? m[1] : '';
}

/** Why a picture cannot be shown in a form, or null. */
export function imageProblem(name: string, size: number): string | null {
  if (!IMAGE_EXT.includes(extOf(name))) return 'Choose a PNG, JPG, WebP or GIF picture.';
  if (!(size > 0)) return 'The file is empty.';
  if (size > LIMITS.fileBytes) return 'Each picture must be 10 MB or smaller.';
  return null;
}

/** Why a file cannot be attached to this question, or null. */
export function fileProblem(field: Pick<FormField, 'fileKinds'>, name: string, size: number): string | null {
  const kinds = FILE_KINDS[field.fileKinds ?? 'any'] ?? FILE_KINDS.any;
  if (!kinds.ext.includes(extOf(name))) return `This question takes ${kinds.label.toLowerCase()}.`;
  if (!(size > 0)) return 'The file is empty.';
  if (size > LIMITS.fileBytes) return 'Each file must be 10 MB or smaller.';
  return null;
}

// ---------------------------------------------------------------------
// The form itself
// ---------------------------------------------------------------------

// A stored picture: "<form id>/_form/<file>". Nothing else is accepted.
const IMAGE_PATH_RE = /^[A-Za-z0-9-]{1,64}\/_form\/[A-Za-z0-9._-]{1,200}$/;
const imagePath = (v: unknown, prefix?: string): string | null =>
  typeof v === 'string' && IMAGE_PATH_RE.test(v) && (!prefix || v.startsWith(prefix)) ? v : null;
const price = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v.replace(',', '.')) : NaN;
  return Number.isFinite(n) && n >= 0 && n <= LIMITS.price ? Math.round(n * 100) / 100 : null;
};

/**
 * A form's questions made safe to store: unknown keys dropped, lengths
 * capped, choices de-duplicated, numbers sane. Returns an error for a
 * definition that cannot be saved at all.
 *
 * `imagePrefix`, on the server, is the only folder a picture may come
 * from: the form's own. A show-if rule that no longer points at an
 * earlier choice question (it was moved or removed) is dropped rather
 * than refused, so a form stays saveable while it is being rearranged.
 */
export function sanitizeFields(raw: unknown, imagePrefix?: string): { fields: FormField[]; error?: string } {
  if (!Array.isArray(raw)) return { fields: [], error: 'The questions are missing.' };
  if (raw.length > LIMITS.fields) return { fields: [], error: `A form can have at most ${LIMITS.fields} questions and sections.` };
  const types = FIELD_TYPES.map((t) => t.type);
  const seen = new Set<string>();
  const out: FormField[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    const type = r.type as FieldType;
    if (!types.includes(type)) return { fields: [], error: 'One question has a type the form does not know.' };
    const id = str(r.id, 40).replace(/[^a-zA-Z0-9_-]/g, '');
    if (!id || seen.has(id)) return { fields: [], error: 'Two questions share the same identifier. Reload the page and try again.' };
    seen.add(id);
    const label = str(r.label, LIMITS.label);
    // A picture's caption is optional; every other field needs its text.
    if (!label && type !== 'image') return { fields: [], error: type === 'section' ? 'Every section needs a heading.' : 'Every question needs its text.' };
    const f: FormField = { id, type, label };
    const help = str(r.help, LIMITS.help);
    if (help) f.help = help;
    if (type === 'image') {
      const img = imagePath(r.image, imagePrefix);
      if (!img) return { fields: [], error: 'A picture block has no picture. Add one, or remove the block.' };
      f.image = img;
    }
    if (isQuestion({ type })) f.required = r.required === true;
    if (isChoice(type)) {
      // Choices travel with their picture and price, so dropping an empty
      // or repeated choice never shifts another choice's picture or price.
      const rawOpts = Array.isArray(r.options) ? r.options : [];
      const rawImgs = Array.isArray(r.optionImages) ? r.optionImages : [];
      const rawPrices = Array.isArray(r.optionPrices) ? r.optionPrices : [];
      const seenOpt = new Set<string>();
      const opts: string[] = []; const imgs: (string | null)[] = []; const prices: (number | null)[] = [];
      rawOpts.forEach((o, i) => {
        const label = str(o, LIMITS.option);
        if (!label || seenOpt.has(label) || opts.length >= LIMITS.options) return;
        seenOpt.add(label);
        opts.push(label);
        imgs.push(imagePath(rawImgs[i], imagePrefix));
        prices.push(price(rawPrices[i]));
      });
      if (opts.length < 1) return { fields: [], error: `"${label}" needs at least one choice.` };
      f.options = opts;
      if (imgs.some(Boolean)) f.optionImages = imgs;
      if (prices.some((x) => x !== null)) f.optionPrices = prices;
      if (r.quantities === true && type !== 'dropdown') {
        f.quantities = true;
        const sizes = Array.isArray(r.sizes) ? Array.from(new Set(r.sizes.map((x) => str(x, LIMITS.size)).filter(Boolean))).slice(0, LIMITS.sizes) : [];
        if (sizes.length) f.sizes = sizes;
        const m = Math.round(num(r.maxQty) ?? LIMITS.defaultQty);
        f.maxQty = Math.min(LIMITS.maxQty, Math.max(1, m));
      } else if (r.other === true && type !== 'dropdown') {
        // "Other" is a typed answer: it cannot be counted or priced.
        f.other = true;
      }
    }
    if (type === 'number') {
      const min = num(r.min); const max = num(r.max);
      if (min !== null) f.min = min;
      if (max !== null) f.max = max;
      if (min !== null && max !== null && min > max) return { fields: [], error: `"${label}": the smallest number is larger than the largest.` };
      if (r.integer === true) f.integer = true;
    }
    if (type === 'scale') {
      f.scaleMin = r.scaleMin === 0 ? 0 : 1;
      f.scaleMax = r.scaleMax === 10 ? 10 : 5;
      const lo = str(r.minLabel, 60); const hi = str(r.maxLabel, 60);
      if (lo) f.minLabel = lo;
      if (hi) f.maxLabel = hi;
    }
    if (type === 'file') {
      const n = Math.round(num(r.maxFiles) ?? 1);
      f.maxFiles = Math.min(LIMITS.files, Math.max(1, n));
      f.fileKinds = (['images', 'documents', 'any'] as FileKinds[]).includes(r.fileKinds as FileKinds) ? (r.fileKinds as FileKinds) : 'any';
    }
    // Show-if: only on an EARLIER choice question or agreement, so rules
    // can never go round in a circle, and only with answers it can give.
    const cond = r.showIf && typeof r.showIf === 'object' ? (r.showIf as Record<string, unknown>) : null;
    if (cond) {
      const src = out.find((x) => x.id === cond.field);
      const allowed = src ? (src.type === 'consent' ? ['Yes'] : src.options ?? []) : [];
      const values = Array.isArray(cond.values) ? cond.values.map((x) => str(x, LIMITS.option)).filter((x) => allowed.includes(x)) : [];
      if (src && canDrive(src) && values.length) f.showIf = { field: src.id, values: Array.from(new Set(values)) };
    }
    out.push(f);
  }
  return { fields: out };
}

/** Every picture a form shows: the cover, picture blocks and choice pictures. */
export function formImagePaths(fields: FormField[], cover?: string | null): string[] {
  const out = new Set<string>();
  if (cover) out.add(cover);
  for (const f of fields) {
    if (f.image) out.add(f.image);
    for (const p of f.optionImages ?? []) if (p) out.add(p);
  }
  return [...out];
}

// ---------------------------------------------------------------------
// What is shown, and what an order comes to
// ---------------------------------------------------------------------

/** The choices an answer has picked, whatever shape it is stored in. */
export function pickedOptions(field: FormField, value: unknown): string[] {
  if (value === undefined || value === null || value === '') return [];
  if (field.type === 'consent') return value === true ? ['Yes'] : [];
  if (isOrder(field)) {
    const list = Array.isArray(value) ? value : [];
    const out: string[] = [];
    for (const l of list) {
      const o = l && typeof l === 'object' ? (l as Record<string, unknown>) : {};
      const qty = Number(o.qty);
      if (typeof o.option === 'string' && qty > 0 && !out.includes(o.option)) out.push(o.option);
    }
    return out;
  }
  if (Array.isArray(value)) return value.filter((x): x is string => typeof x === 'string');
  return typeof value === 'string' ? [value] : [];
}

/** The ids of the fields shown for these answers, in order. */
export function visibleIds(fields: FormField[], answers: Record<string, unknown>): Set<string> {
  const shown = new Set<string>();
  for (const f of fields) {
    if (!f.showIf) { shown.add(f.id); continue; }
    const src = fields.find((x) => x.id === f.showIf!.field);
    if (!src || !shown.has(src.id)) continue;
    const picked = pickedOptions(src, answers[src.id]);
    if (f.showIf.values.some((v) => picked.includes(v))) shown.add(f.id);
  }
  return shown;
}

/** Whether any choice in the form carries a price. */
export const hasPrices = (fields: FormField[]) => fields.some((f) => (f.optionPrices ?? []).some((p) => p !== null && p !== undefined));

/** The price of one choice, or null when it has none. */
export function optionPrice(field: FormField, option: string): number | null {
  const i = (field.options ?? []).indexOf(option);
  const p = i >= 0 ? field.optionPrices?.[i] : null;
  return typeof p === 'number' ? p : null;
}

/** What the priced choices in these answers add up to, in euro. */
export function itemsTotal(fields: FormField[], answers: Answers): number {
  let cents = 0;
  for (const f of fields) {
    if (!isChoice(f.type) || !f.optionPrices) continue;
    const v = answers[f.id];
    if (v === undefined) continue;
    if (isOrder(f)) {
      for (const l of (Array.isArray(v) ? v : []) as OrderLine[]) cents += Math.round((optionPrice(f, l.option) ?? 0) * 100) * (l.qty || 0);
    } else {
      for (const o of pickedOptions(f, v)) cents += Math.round((optionPrice(f, o) ?? 0) * 100);
    }
  }
  return cents / 100;
}

/**
 * What a member owes: the fixed amount, if any, plus what they ordered.
 * Null when the form takes no payment, or has neither a fixed amount nor
 * prices.
 */
export function amountDue(trackPayments: boolean, fixed: number | null | undefined, fields: FormField[], answers: Answers): number | null {
  if (!trackPayments) return null;
  const priced = hasPrices(fields);
  if (!priced && (fixed === null || fixed === undefined)) return null;
  return Math.round(((Number(fixed) || 0) + (priced ? itemsTotal(fields, answers) : 0)) * 100) / 100;
}

// ---------------------------------------------------------------------
// An answer
// ---------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Check a member's answers against the form, question by question.
 *
 * Returns the answers to store (only known questions, normalised) and,
 * for every question that is not right, the sentence to show under it.
 * `filePrefix`, on the server, is the only folder a file answer may point
 * into: the form's folder for this member.
 */
export function validateAnswers(
  fields: FormField[],
  raw: unknown,
  filePrefix?: string,
): { answers: Answers; errors: Record<string, string> } {
  const input = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const answers: Answers = {};
  const errors: Record<string, string> = {};
  // A question the member's own answers hide is neither required nor kept.
  const shown = visibleIds(fields, input);
  for (const f of fields) {
    if (!isQuestion(f) || !shown.has(f.id)) continue;
    const v = input[f.id];
    const empty = v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0) || (f.type === 'consent' && v !== true);
    if (empty) {
      if (f.required) errors[f.id] = f.type === 'consent' ? 'Tick the box to continue.' : f.type === 'file' ? 'Attach a file.' : isOrder(f) ? 'Choose at least one, and how many.' : 'This question needs an answer.';
      continue;
    }
    if (isOrder(f)) {
      const opts = f.options ?? [];
      const sizes = f.sizes ?? [];
      const max = f.maxQty ?? LIMITS.defaultQty;
      const merged = new Map<string, OrderLine>();
      let bad = '';
      for (const x of Array.isArray(v) ? v : []) {
        const o = x && typeof x === 'object' ? (x as Record<string, unknown>) : {};
        const option = typeof o.option === 'string' ? o.option : '';
        const size = typeof o.size === 'string' ? o.size : '';
        const qty = typeof o.qty === 'number' ? o.qty : Number(o.qty);
        if (!opts.includes(option)) { bad = 'Choose from the options.'; break; }
        if (sizes.length ? !sizes.includes(size) : size) { bad = sizes.length ? 'Choose a size for each item.' : 'Choose from the options.'; break; }
        if (!Number.isInteger(qty) || qty < 0) { bad = 'Enter how many as a whole number.'; break; }
        if (qty === 0) continue;
        const key = `${option}\u0000${size}`;
        const line = merged.get(key) ?? { option, ...(sizes.length ? { size } : {}), qty: 0 };
        line.qty += qty;
        if (line.qty > max) { bad = `At most ${max} of each.`; break; }
        merged.set(key, line);
      }
      if (bad) { errors[f.id] = bad; continue; }
      const lines = [...merged.values()].sort((a, b) => opts.indexOf(a.option) - opts.indexOf(b.option) || sizes.indexOf(a.size ?? '') - sizes.indexOf(b.size ?? ''));
      if (!lines.length) { if (f.required) errors[f.id] = 'Choose at least one, and how many.'; continue; }
      if (f.type === 'single_choice' && new Set(lines.map((l) => l.option)).size > 1) { errors[f.id] = 'Choose one of the options.'; continue; }
      answers[f.id] = lines;
      continue;
    }
    switch (f.type) {
      case 'short_text':
      case 'long_text': {
        if (typeof v !== 'string') { errors[f.id] = 'Write your answer as text.'; break; }
        const max = f.type === 'short_text' ? LIMITS.shortText : LIMITS.longText;
        const t = v.trim();
        if (!t) { if (f.required) errors[f.id] = 'This question needs an answer.'; break; }
        if (t.length > max) { errors[f.id] = `Keep it under ${max.toLocaleString('en-GB')} characters.`; break; }
        answers[f.id] = t;
        break;
      }
      case 'email': {
        const t = typeof v === 'string' ? v.trim() : '';
        if (!EMAIL_RE.test(t) || t.length > 254) { errors[f.id] = 'Enter an email address, like name@studbocconi.it.'; break; }
        answers[f.id] = t;
        break;
      }
      case 'phone': {
        const t = typeof v === 'string' ? v.trim() : '';
        if (!/^[+()\d\s.-]{5,40}$/.test(t) || (t.match(/\d/g) || []).length < 5) { errors[f.id] = 'Enter a phone number, with the country code if it is not Italian.'; break; }
        answers[f.id] = t;
        break;
      }
      case 'date': {
        const t = typeof v === 'string' ? v.trim() : '';
        if (!DATE_RE.test(t) || Number.isNaN(Date.parse(`${t}T12:00:00Z`))) { errors[f.id] = 'Choose a date.'; break; }
        answers[f.id] = t;
        break;
      }
      case 'number': {
        const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v.replace(',', '.')) : NaN;
        if (!Number.isFinite(n)) { errors[f.id] = 'Enter a number.'; break; }
        if (f.integer && !Number.isInteger(n)) { errors[f.id] = 'Enter a whole number.'; break; }
        if (f.min != null && n < f.min) { errors[f.id] = `The smallest accepted is ${f.min}.`; break; }
        if (f.max != null && n > f.max) { errors[f.id] = `The largest accepted is ${f.max}.`; break; }
        answers[f.id] = n;
        break;
      }
      case 'scale': {
        const n = typeof v === 'number' ? v : Number(v);
        const lo = f.scaleMin ?? 1; const hi = f.scaleMax ?? 5;
        if (!Number.isInteger(n) || n < lo || n > hi) { errors[f.id] = `Choose a value from ${lo} to ${hi}.`; break; }
        answers[f.id] = n;
        break;
      }
      case 'single_choice':
      case 'dropdown': {
        const t = typeof v === 'string' ? v.trim() : '';
        const opts = f.options ?? [];
        if (!opts.includes(t) && !(f.other && t && t.length <= LIMITS.option)) { errors[f.id] = 'Choose one of the options.'; break; }
        answers[f.id] = t;
        break;
      }
      case 'multi_choice': {
        const list = Array.isArray(v) ? v.map((x) => (typeof x === 'string' ? x.trim() : '')).filter(Boolean) : [];
        const opts = f.options ?? [];
        const extra = list.filter((x) => !opts.includes(x));
        if (extra.length > (f.other ? 1 : 0) || extra.some((x) => x.length > LIMITS.option)) { errors[f.id] = 'Choose from the options.'; break; }
        if (list.length === 0) { if (f.required) errors[f.id] = 'Choose at least one.'; break; }
        // Kept in the order the form lists them, "Other" last.
        answers[f.id] = [...opts.filter((o) => list.includes(o)), ...extra];
        break;
      }
      case 'consent': {
        answers[f.id] = true;
        break;
      }
      case 'file': {
        const list = Array.isArray(v) ? v : [];
        const files: FileAnswer[] = [];
        let bad = '';
        for (const x of list) {
          const o = x && typeof x === 'object' ? (x as Record<string, unknown>) : {};
          const path = typeof o.path === 'string' ? o.path : '';
          const name = typeof o.name === 'string' ? o.name.slice(0, 200) : '';
          const size = typeof o.size === 'number' ? o.size : 0;
          const type = typeof o.type === 'string' ? o.type.slice(0, 120) : '';
          if (!path || !name || path.includes('..') || (filePrefix && !path.startsWith(filePrefix))) { bad = 'One of the files could not be read. Attach it again.'; break; }
          const p = fileProblem(f, name, size);
          if (p) { bad = p; break; }
          files.push({ path, name, size, type });
        }
        if (bad) { errors[f.id] = bad; break; }
        if (files.length > (f.maxFiles ?? 1)) { errors[f.id] = `Attach at most ${f.maxFiles ?? 1} ${(f.maxFiles ?? 1) === 1 ? 'file' : 'files'}.`; break; }
        if (files.length === 0) { if (f.required) errors[f.id] = 'Attach a file.'; break; }
        answers[f.id] = files;
        break;
      }
      default:
        break;
    }
  }
  return { answers, errors };
}

/** "EUR 35.00". */
export const eur = (n: number) => `EUR ${(Math.round(n * 100) / 100).toFixed(2)}`;

/** An order as one line: "Black: M × 1, L × 2; Grey × 3". */
export function orderText(lines: OrderLine[]): string {
  const groups = new Map<string, OrderLine[]>();
  for (const l of lines) groups.set(l.option, [...(groups.get(l.option) ?? []), l]);
  return [...groups.entries()].map(([option, ls]) => (ls.some((l) => l.size)
    ? `${option}: ${ls.map((l) => `${l.size} × ${l.qty}`).join(', ')}`
    : `${option} × ${ls.reduce((a, l) => a + l.qty, 0)}`)).join('; ');
}

/** How many items an order holds. */
export const orderCount = (lines: OrderLine[]) => lines.reduce((a, l) => a + (l.qty || 0), 0);

/** An answer as one line of text: for a table, an export or an email. */
export function answerText(field: Pick<FormField, 'type'> & { quantities?: boolean }, value: AnswerValue | undefined): string {
  if (value === undefined || value === null || value === '') return '';
  if (field.type === 'consent') return value === true ? 'Yes' : '';
  if (field.type === 'file') return Array.isArray(value) ? (value as FileAnswer[]).map((f) => f.name).join(', ') : '';
  if (isOrder(field)) return Array.isArray(value) ? orderText(value as OrderLine[]) : '';
  if (Array.isArray(value)) return (value as string[]).join(', ');
  return String(value);
}
