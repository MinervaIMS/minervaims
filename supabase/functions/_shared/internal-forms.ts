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
// =====================================================================

export type FieldType =
  | 'short_text' | 'long_text' | 'single_choice' | 'multi_choice' | 'dropdown'
  | 'number' | 'scale' | 'date' | 'email' | 'phone' | 'file' | 'consent' | 'section';

export type FileKinds = 'images' | 'documents' | 'any';

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
}

export interface FileAnswer { path: string; name: string; size: number; type: string }
export type AnswerValue = string | number | boolean | string[] | FileAnswer[];
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
];

export const FILE_KINDS: Record<FileKinds, { label: string; ext: string[] }> = {
  images: { label: 'Images (PNG, JPG, WebP, GIF, HEIC)', ext: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'heic', 'heif'] },
  documents: { label: 'Documents (PDF, Word, Excel, PowerPoint, text, CSV)', ext: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv'] },
  any: { label: 'Images and documents', ext: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'heic', 'heif', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'zip'] },
};

const CHOICE_TYPES: FieldType[] = ['single_choice', 'multi_choice', 'dropdown'];
export const isChoice = (t: FieldType) => CHOICE_TYPES.includes(t);
export const isQuestion = (f: Pick<FormField, 'type'>) => f.type !== 'section';

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** The extension of a file name, lower case. */
export function extOf(name: string): string {
  const m = String(name || '').toLowerCase().match(/\.([a-z0-9]{1,8})$/);
  return m ? m[1] : '';
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

/**
 * A form's questions made safe to store: unknown keys dropped, lengths
 * capped, choices de-duplicated, numbers sane. Returns an error for a
 * definition that cannot be saved at all.
 */
export function sanitizeFields(raw: unknown): { fields: FormField[]; error?: string } {
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
    if (!label) return { fields: [], error: type === 'section' ? 'Every section needs a heading.' : 'Every question needs its text.' };
    const f: FormField = { id, type, label };
    const help = str(r.help, LIMITS.help);
    if (help) f.help = help;
    if (type !== 'section') f.required = r.required === true;
    if (isChoice(type)) {
      const opts = Array.isArray(r.options) ? r.options.map((o) => str(o, LIMITS.option)).filter(Boolean) : [];
      const unique = Array.from(new Set(opts)).slice(0, LIMITS.options);
      if (unique.length < 1) return { fields: [], error: `"${label}" needs at least one choice.` };
      f.options = unique;
      if (r.other === true && type !== 'dropdown') f.other = true;
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
    out.push(f);
  }
  return { fields: out };
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
  for (const f of fields) {
    if (!isQuestion(f)) continue;
    const v = input[f.id];
    const empty = v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0) || (f.type === 'consent' && v !== true);
    if (empty) {
      if (f.required) errors[f.id] = f.type === 'consent' ? 'Tick the box to continue.' : f.type === 'file' ? 'Attach a file.' : 'This question needs an answer.';
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

/** An answer as one line of text: for a table, an export or an email. */
export function answerText(field: Pick<FormField, 'type'>, value: AnswerValue | undefined): string {
  if (value === undefined || value === null || value === '') return '';
  if (field.type === 'consent') return value === true ? 'Yes' : '';
  if (field.type === 'file') return Array.isArray(value) ? (value as FileAnswer[]).map((f) => f.name).join(', ') : '';
  if (Array.isArray(value)) return (value as string[]).join(', ');
  return String(value);
}
