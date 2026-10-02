// =====================================================================
// Internal forms: the parts with no React in them. What a new question
// looks like, the forms a new one can start from, how a deadline reads,
// what state a form is really in, and the icon of each question type.
// =====================================================================

import {
  AlignLeft, Calendar, CheckSquare, ChevronDownSquare, CircleDot, FileUp, Hash, Heading, Image as ImageIcon, Mail, Phone, SlidersHorizontal, Type, ShieldCheck,
} from 'lucide-react';
import { FIELD_TYPES, LIMITS, canDrive, isChoice, isQuestion, sanitizeFields, type FieldType, type FormField } from '@/lib/internal-forms-rules';
import { formatDay, formatTime, romeYmd } from '@/lib/event-time';
import type { InternalForm } from '@/lib/internal-forms-api';

export const FIELD_ICON: Record<FieldType, typeof Type> = {
  short_text: Type,
  long_text: AlignLeft,
  single_choice: CircleDot,
  multi_choice: CheckSquare,
  dropdown: ChevronDownSquare,
  number: Hash,
  scale: SlidersHorizontal,
  date: Calendar,
  email: Mail,
  phone: Phone,
  file: FileUp,
  consent: ShieldCheck,
  section: Heading,
  image: ImageIcon,
};

export const fieldTypeLabel = (t: FieldType) => FIELD_TYPES.find((x) => x.type === t)?.label ?? t;

/** A short id, unique within a form, under which answers are stored. */
export function newFieldId(): string {
  return `q${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
}

/** A question of this type, ready to be written. */
export function newField(type: FieldType): FormField {
  const id = newFieldId();
  switch (type) {
    case 'single_choice':
    case 'multi_choice':
    case 'dropdown':
      return { id, type, label: '', required: false, options: ['Option 1', 'Option 2'] };
    case 'scale':
      return { id, type, label: '', required: false, scaleMin: 1, scaleMax: 5, minLabel: 'Not at all', maxLabel: 'Very much' };
    case 'file':
      return { id, type, label: '', required: false, maxFiles: 1, fileKinds: 'any' };
    case 'number':
      return { id, type, label: '', required: false, integer: true, min: null, max: null };
    case 'consent':
      return { id, type, label: '', required: true };
    case 'section':
    case 'image':
      return { id, type, label: '' };
    default:
      return { id, type, label: '', required: false };
  }
}

/** A copy of a question, with its own id. */
export function copyField(f: FormField): FormField {
  return {
    ...f, id: newFieldId(), label: f.label ? `${f.label} (copy)` : '',
    options: f.options ? [...f.options] : undefined,
    optionImages: f.optionImages ? [...f.optionImages] : undefined,
    optionPrices: f.optionPrices ? [...f.optionPrices] : undefined,
    sizes: f.sizes ? [...f.sizes] : undefined,
    showIf: f.showIf ? { ...f.showIf, values: [...f.showIf.values] } : undefined,
  };
}

// ---------------------------------------------------------------------
// Forms to start from
// ---------------------------------------------------------------------

export interface Starter {
  key: string;
  title: string;
  blurb: string;
  build: () => Partial<InternalForm>;
}

const q = (type: FieldType, label: string, extra: Partial<FormField> = {}): FormField => ({ ...newField(type), label, ...extra });

export const STARTERS: Starter[] = [
  {
    key: 'blank',
    title: 'Blank form',
    blurb: 'Start from nothing and add the questions you need.',
    build: () => ({ title: 'Untitled form', fields: [q('short_text', 'Your question')] }),
  },
  {
    key: 'merch',
    title: 'Merchandise order',
    blurb: 'Hoodies, T-shirts, scarves: colours with their pictures, how many of each size, a name to print, and the total to pay.',
    build: () => {
      const order = q('multi_choice', 'Which colours, and how many of each size?', {
        required: true, options: ['Black', 'Grey', 'Navy'], optionPrices: [35, 35, 35],
        quantities: true, sizes: ['XS', 'S', 'M', 'L', 'XL'], maxQty: 5,
        help: 'Tick a colour, then choose how many of each size. Add a picture to each colour in its settings.',
      });
      const name = q('single_choice', 'Add a name on the sleeve?', { required: true, options: ['No', 'Yes'], optionPrices: [null, 5] });
      return {
        title: 'Hoodie order',
        description: 'Order your Minerva hoodie. Sizes run true to fit.',
        track_payments: true,
        payment_amount: null,
        payment_instructions: 'Bank transfer to the Society account, with your name and "Hoodie" in the description.',
        fields: [
          order,
          name,
          q('short_text', 'Name to print on the sleeve', { required: true, showIf: { field: name.id, values: ['Yes'] } }),
          q('consent', 'I will pay for my order by the deadline', { required: true }),
        ],
      };
    },
  },
  {
    key: 'visit',
    title: 'Interest in a company visit',
    blurb: 'Who wants to come, why, when they are free, and a CV for the host.',
    build: () => ({
      title: 'Company visit: expression of interest',
      description: 'Places are limited. Tell us whether you would like to come; we will confirm the list by email.',
      fields: [
        q('single_choice', 'Would you like to join the visit?', { required: true, options: ['Yes', 'Maybe, depending on the date', 'No'] }),
        q('multi_choice', 'Which dates suit you?', { options: ['Week 1', 'Week 2', 'Week 3'] }),
        q('long_text', 'Why are you interested?', { help: 'Two or three sentences are enough.' }),
        q('file', 'Your CV', { fileKinds: 'documents', maxFiles: 1, help: 'PDF preferred. The host may ask for it.' }),
      ],
    }),
  },
  {
    key: 'signup',
    title: 'Sign-up with preferences',
    blurb: 'A dinner, a trip or a workshop: who comes, dietary needs, and a phone number.',
    build: () => ({
      title: 'Sign-up',
      fields: [
        q('single_choice', 'Will you attend?', { required: true, options: ['Yes', 'No'] }),
        q('multi_choice', 'Dietary requirements', { options: ['Vegetarian', 'Vegan', 'Gluten free', 'Lactose free'], other: true }),
        q('phone', 'A phone number for the day', { help: 'Only used on the day, if we need to reach you.' }),
      ],
    }),
  },
];

// ---------------------------------------------------------------------
// State and deadline
// ---------------------------------------------------------------------

export type EffectiveState = 'draft' | 'open' | 'closed' | 'expired';

/** The state a reader should see: an open form past its deadline reads as closed. */
export function effectiveState(f: Pick<InternalForm, 'status' | 'closes_at'>, now = Date.now()): EffectiveState {
  if (f.status === 'draft') return 'draft';
  if (f.status === 'closed') return 'closed';
  if (f.closes_at && new Date(f.closes_at).getTime() <= now) return 'expired';
  return 'open';
}

export const STATE_LABEL: Record<EffectiveState, string> = {
  draft: 'Draft', open: 'Open', closed: 'Closed', expired: 'Deadline passed',
};

/** "Friday 10 October 2026, 11:59 pm CEST". */
export function deadlineText(iso: string): string {
  return `${formatDay(iso)}, ${formatTime(iso)}`;
}

/** "Closes in 3 days", "Closes today at 6:00 pm CEST", "Closed 2 days ago". */
export function deadlineRelative(iso: string | null, now = Date.now()): string {
  if (!iso) return 'No deadline';
  const t = new Date(iso).getTime();
  // Counted in calendar days on Rome's clock, as people count them: a
  // deadline next Thursday night is "in 7 days" on a Thursday afternoon.
  const days = Math.round((Date.parse(`${romeYmd(new Date(t))}T12:00:00Z`) - Date.parse(`${romeYmd(new Date(now))}T12:00:00Z`)) / 86400000);
  if (t <= now) {
    const ago = -days;
    return ago <= 0 ? 'Closed today' : ago === 1 ? 'Closed yesterday' : `Closed ${ago} days ago`;
  }
  if (days === 0) return `Closes today at ${formatTime(iso)}`;
  if (days === 1) return `Closes tomorrow at ${formatTime(iso)}`;
  return `Closes in ${days} days`;
}

/** The link members open. */
export const formLink = (id: string) => `${typeof window !== 'undefined' ? window.location.origin : 'https://minervaims.org'}/forms/${id}`;

/** "EUR 35.00". */
export const money = (n: number | null | undefined) => (n == null ? '' : `EUR ${Number(n).toFixed(2)}`);

// ---------------------------------------------------------------------
// Before saving
// ---------------------------------------------------------------------

export interface Problem {
  message: string;
  /** Where to take the organiser to fix it. */
  view: 'questions' | 'settings';
  fieldId?: string;
}

/**
 * The first thing that would stop a save, said where it can be fixed.
 * The server checks the same rules (the rules file is shared); this only
 * lets the page point at the question instead of reporting a refusal.
 */
export function firstProblem(form: Pick<InternalForm, 'title' | 'fields' | 'status' | 'track_payments' | 'payment_amount'>): Problem | null {
  if (!form.title.trim()) return { message: 'Give the form a title.', view: 'questions', fieldId: '__title' };
  for (const [i, f] of form.fields.entries()) {
    if (f.type === 'image') {
      if (!f.image) return { message: 'A picture block has no picture yet. Add one, or remove the block.', view: 'questions', fieldId: f.id };
    } else if (!f.label.trim()) {
      return { message: f.type === 'section' ? 'A section has no heading yet.' : 'A question has no text yet.', view: 'questions', fieldId: f.id };
    }
    if (isChoice(f.type) && !(f.options ?? []).some((o) => o.trim())) {
      return { message: `"${f.label}" needs at least one choice.`, view: 'questions', fieldId: f.id };
    }
    if (isChoice(f.type) && (f.optionPrices ?? []).some((p) => p !== null && p !== undefined && (!Number.isFinite(p) || p < 0 || p > LIMITS.price))) {
      return { message: `"${f.label}": a price is not valid.`, view: 'questions', fieldId: f.id };
    }
    if (f.type === 'number' && f.min != null && f.max != null && f.min > f.max) {
      return { message: `"${f.label}": the smallest number is larger than the largest.`, view: 'questions', fieldId: f.id };
    }
    if (f.showIf) {
      // The rule must point at a choice question ABOVE this one, with answers it still has.
      const at = form.fields.findIndex((x) => x.id === f.showIf!.field);
      const src = at >= 0 && at < i ? form.fields[at] : null;
      const allowed = src ? (src.type === 'consent' ? ['Yes'] : src.options ?? []) : [];
      if (src && canDrive(src) && f.showIf.values.length === 0) {
        return { message: `"${f.label || 'A picture'}" is shown only for some answers, but none is ticked yet. Tick at least one, or turn the rule off.`, view: 'questions', fieldId: f.id };
      }
      if (!src || !canDrive(src) || !f.showIf.values.some((v) => allowed.includes(v))) {
        return { message: `"${f.label || 'A picture'}" is shown only for an answer that is no longer above it. Choose the rule again, or remove it.`, view: 'questions', fieldId: f.id };
      }
    }
  }
  if (form.status === 'open' && !form.fields.some(isQuestion)) return { message: 'An open form needs at least one question.', view: 'questions' };
  if (form.track_payments && form.payment_amount != null && (!Number.isFinite(form.payment_amount) || form.payment_amount < 0 || form.payment_amount > 100000)) {
    return { message: 'The amount to pay is not valid.', view: 'settings' };
  }
  const { error } = sanitizeFields(form.fields);
  if (error) return { message: error, view: 'questions' };
  return null;
}
