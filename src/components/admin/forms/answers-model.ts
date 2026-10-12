// =====================================================================
// Reading the answers to a form: summaries, columns and exports.
// ---------------------------------------------------------------------
// The organisers' questions are practical: how many of each size, how
// many people in total, who has not paid yet, and a sheet to send to the
// supplier. So every choice question is counted, every number question
// is totalled, and the export is built from exactly the columns and the
// rows that were chosen, in the order the form asks its questions.
//
// MORE THAN ONE. An answer can hold several items (three hoodies). A
// question asked again for each item has one value per item: the table
// lists them numbered in one cell, the summaries count every item (the
// supplier needs every hoodie), and the export can give one row per item.
// =====================================================================

import {
  MORE_KEY, answerText, firstItem, isChoice, isOrder, isQuestion, itemCount, moreItems, optionPrice, repeats,
  type AnswerValue, type FileAnswer, type FormField, type OrderLine,
} from '@/lib/internal-forms-rules';
import type { FormResponse, InternalForm } from '@/lib/internal-forms-api';
import { formatDay, formatTime } from '@/lib/event-time';
import { roleLabel, type AppRole, type OrgDivision } from '@/lib/roles';
import type { Cell } from '@/lib/xlsx-lite';

/** "1 Oct 2026, 6:42 pm CEST". */
export function stamp(iso: string | null | undefined): string {
  if (!iso) return '';
  return `${formatDay(iso, { weekday: false, month: 'short' })}, ${formatTime(iso)}`;
}

export function memberRoleLabel(r: Pick<FormResponse, 'member_role' | 'member_division'> & { respondent?: FormResponse['respondent'] }): string {
  if (r.respondent === 'guest') return 'Guest';
  if (!r.member_role) return '';
  return roleLabel(r.member_role as AppRole, (r.member_division as OrgDivision | null) ?? null);
}

/**
 * What one question holds in an answer: a value for each item when the
 * question is asked again for each, otherwise the one value.
 */
export function valuesOf(f: FormField, answers: unknown): (AnswerValue | undefined)[] {
  const first = firstItem(answers);
  if (!repeats(f)) return [first[f.id]];
  return [first[f.id], ...moreItems(answers).map((m) => m[f.id])];
}

const blank = (v: unknown) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);

// ---------------------------------------------------------------------
// Summaries
// ---------------------------------------------------------------------

/** What an answer owes: its own amount, or the form's fixed amount for answers sent before prices existed. */
export function dueOf(form: Pick<InternalForm, 'track_payments' | 'payment_amount'>, r: Pick<FormResponse, 'amount_due'>): number | null {
  if (!form.track_payments) return null;
  if (r.amount_due !== null && r.amount_due !== undefined) return Number(r.amount_due);
  return form.payment_amount === null || form.payment_amount === undefined ? null : Number(form.payment_amount);
}

export interface OrderRow { label: string; total: number; bySize: Record<string, number>; amount: number | null }

/**
 * `answered` counts the answers (people) with a value; `n` counts the
 * values themselves, one per item, which is what percentages are of.
 */
export type Summary = { answered: number; n: number } & (
  | { kind: 'order'; sizes: string[]; rows: OrderRow[]; items: number; amount: number | null; bySize: Record<string, number> }
  | { kind: 'choices'; rows: { label: string; count: number; other?: boolean }[] }
  | { kind: 'numbers'; total: number; mean: number; min: number; max: number; rows: { label: string; count: number }[] }
  | { kind: 'texts'; latest: { who: string; text: string }[] }
  | { kind: 'files'; files: number }
  | { kind: 'consent' }
);

export function summarise(field: FormField, responses: FormResponse[], itemLabel = 'Item'): Summary {
  // Every value, one per item: the second hoodie's size counts as much as the first's.
  const values = responses.flatMap((r) => {
    const several = itemCount(r.answers) > 1 && repeats(field);
    return valuesOf(field, r.answers).map((v, i) => ({ r, v, item: several ? i + 1 : 0 }));
  }).filter((x) => !blank(x.v));
  const answered = new Set(values.map((x) => x.r.id)).size;
  const n = values.length;
  // An order: how many of each choice, by size, and what it comes to. The
  // supplier's list, without a spreadsheet.
  if (isOrder(field)) {
    const sizes = field.sizes ?? [];
    const rows: OrderRow[] = (field.options ?? []).map((label) => ({ label, total: 0, bySize: {}, amount: optionPrice(field, label) === null ? null : 0 }));
    const bySize: Record<string, number> = {};
    for (const { v } of values) {
      for (const l of (Array.isArray(v) ? v : []) as OrderLine[]) {
        const row = rows.find((r) => r.label === l.option);
        if (!row) continue;
        row.total += l.qty;
        if (l.size) { row.bySize[l.size] = (row.bySize[l.size] ?? 0) + l.qty; bySize[l.size] = (bySize[l.size] ?? 0) + l.qty; }
        const pr = optionPrice(field, l.option);
        if (pr !== null) row.amount = Math.round(((row.amount ?? 0) + pr * l.qty) * 100) / 100;
      }
    }
    const priced = rows.some((r) => r.amount !== null);
    return {
      kind: 'order', answered, n, sizes, rows, bySize,
      items: rows.reduce((a, r) => a + r.total, 0),
      amount: priced ? Math.round(rows.reduce((a, r) => a + (r.amount ?? 0), 0) * 100) / 100 : null,
    };
  }
  if (isChoice(field.type)) {
    const counts = new Map<string, number>();
    for (const o of field.options ?? []) counts.set(o, 0);
    let other = 0;
    for (const { v } of values) {
      const list = Array.isArray(v) ? (v as string[]) : [String(v)];
      for (const x of list) {
        if (counts.has(x)) counts.set(x, (counts.get(x) ?? 0) + 1);
        else other += 1;
      }
    }
    const rows: { label: string; count: number; other?: boolean }[] = [...counts.entries()].map(([label, count]) => ({ label, count }));
    if (field.other || other) rows.push({ label: 'Other', count: other, other: true });
    return { kind: 'choices', answered, n, rows };
  }
  if (field.type === 'number' || field.type === 'scale') {
    const nums = values.map(({ v }) => Number(v)).filter((x) => Number.isFinite(x));
    const total = nums.reduce((a, b) => a + b, 0);
    const counts = new Map<number, number>();
    for (const x of nums) counts.set(x, (counts.get(x) ?? 0) + 1);
    // A distribution only where it reads at a glance: a scale, or few distinct numbers.
    const distinct = [...counts.keys()].sort((a, b) => a - b);
    const rows = field.type === 'scale'
      ? Array.from({ length: (field.scaleMax ?? 5) - (field.scaleMin ?? 1) + 1 }, (_, i) => (field.scaleMin ?? 1) + i).map((k) => ({ label: String(k), count: counts.get(k) ?? 0 }))
      : distinct.length <= 12 ? distinct.map((k) => ({ label: String(k), count: counts.get(k) ?? 0 })) : [];
    return {
      kind: 'numbers', answered, n, total,
      mean: nums.length ? total / nums.length : 0,
      min: nums.length ? Math.min(...nums) : 0,
      max: nums.length ? Math.max(...nums) : 0,
      rows,
    };
  }
  if (field.type === 'file') {
    return { kind: 'files', answered, n, files: values.reduce((a, { v }) => a + (Array.isArray(v) ? v.length : 0), 0) };
  }
  if (field.type === 'consent') return { kind: 'consent', answered, n };
  const latest = [...values]
    .sort((a, b) => b.r.updated_at.localeCompare(a.r.updated_at))
    .slice(0, 5)
    .map(({ r, v, item }) => ({ who: `${r.member_name ?? ''}${item ? `, ${itemLabel.toLowerCase()} ${item}` : ''}`, text: answerText(field, v as AnswerValue) }));
  return { kind: 'texts', answered, n, latest };
}

// ---------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------

export interface Column {
  key: string;
  label: string;
  group: 'member' | 'timing' | 'questions' | 'payment' | 'notes';
  value: (r: FormResponse) => Cell;
  /** A question asked again for each item: its value for item i (0 for the first). */
  itemValue?: (r: FormResponse, i: number) => Cell;
  /** Said once per answer: in an export with a row per item, only on the answer's first row, so the column adds up. */
  perAnswer?: boolean;
  /** Questions only. */
  field?: FormField;
  /** One count of an order (a choice, or a choice in a size): exported, hidden in the table at first. */
  breakdown?: boolean;
}

/**
 * Every column an answer can be shown or exported with. Questions removed
 * from the form after people answered them keep their answers: they are
 * offered at the end, marked as removed, so nothing collected is lost.
 */
export function allColumns(form: InternalForm, responses: FormResponse[], itemLabel = 'Item'): Column[] {
  const several = (form.items_max ?? 1) > 1 || responses.some((r) => itemCount(r.answers) > 1);
  const cols: Column[] = [
    { key: 'name', label: 'Name', group: 'member', value: (r) => r.member_name ?? '' },
    { key: 'email', label: 'Email', group: 'member', value: (r) => r.member_email ?? '' },
    { key: 'role', label: 'Role', group: 'member', value: (r) => memberRoleLabel(r) },
    { key: 'submitted', label: 'First sent', group: 'timing', value: (r) => stamp(r.submitted_at) },
    { key: 'updated', label: 'Last changed', group: 'timing', value: (r) => (r.edit_count > 0 ? stamp(r.updated_at) : '') },
  ];
  // How many items each answer holds.
  if (several) cols.push({ key: 'items', label: `How many (${itemLabel.toLowerCase()})`, group: 'questions', value: (r) => itemCount(r.answers), perAnswer: true });
  const known = new Set<string>([MORE_KEY]);
  for (const f of form.fields.filter(isQuestion)) {
    known.add(f.id);
    const one = (v: AnswerValue | undefined): Cell => {
      if (f.type === 'number' || f.type === 'scale') return typeof v === 'number' ? v : '';
      return answerText(f, v as AnswerValue);
    };
    cols.push({
      key: `q:${f.id}`, label: f.label, group: 'questions', field: f,
      value: (r) => {
        const vs = valuesOf(f, r.answers);
        if (vs.length === 1) return one(vs[0]);
        // Several items: one numbered line each, "1. M", "2. S".
        return vs.map((v, i) => `${i + 1}. ${blank(v) ? '-' : String(one(v))}`).join('\n');
      },
      itemValue: repeats(f) ? (r, i) => one(valuesOf(f, r.answers)[i]) : undefined,
    });
    // An order also gives one column per choice (and size): a number each,
    // so the sheet adds up in Excel and goes straight to the supplier.
    if (isOrder(f)) {
      const linesOf = (v: AnswerValue | undefined) => (Array.isArray(v) ? v : []) as OrderLine[];
      const sum = (lines: OrderLine[], option: string, size?: string) => lines.filter((l) => l.option === option && (size === undefined || l.size === size)).reduce((a, l) => a + l.qty, 0);
      // Every item's order counts.
      const count = (r: FormResponse, option: string, size?: string): Cell => valuesOf(f, r.answers).reduce<number>((a, v) => a + sum(linesOf(v), option, size), 0) || '';
      const countItem = (r: FormResponse, i: number, option: string, size?: string): Cell => sum(linesOf(valuesOf(f, r.answers)[i]), option, size) || '';
      for (const o of f.options ?? []) {
        if (f.sizes?.length) {
          for (const sz of f.sizes) {
            cols.push({ key: `qb:${f.id}:${o}:${sz}`, label: `${f.label}: ${o}, ${sz}`, group: 'questions', breakdown: true, value: (r) => count(r, o, sz), itemValue: repeats(f) ? (r, i) => countItem(r, i, o, sz) : undefined });
          }
        } else {
          cols.push({ key: `qb:${f.id}:${o}`, label: `${f.label}: ${o}`, group: 'questions', breakdown: true, value: (r) => count(r, o), itemValue: repeats(f) ? (r, i) => countItem(r, i, o) : undefined });
        }
      }
    }
  }
  // Answers to questions that are no longer on the form.
  const orphans = new Set<string>();
  for (const r of responses) for (const k of Object.keys(r.answers ?? {})) if (!known.has(k)) orphans.add(k);
  let n = 0;
  for (const k of orphans) {
    n += 1;
    cols.push({
      key: `q:${k}`, label: orphans.size > 1 ? `Removed question ${n}` : 'Removed question', group: 'questions',
      value: (r) => {
        const v = r.answers?.[k];
        if (Array.isArray(v)) return (v as (string | FileAnswer)[]).map((x) => (typeof x === 'string' ? x : x.name)).join(', ');
        return v === undefined ? '' : String(v);
      },
    });
  }
  if (form.track_payments) {
    cols.push({ key: 'amount', label: 'Amount due (EUR)', group: 'payment', value: (r) => dueOf(form, r) ?? '', perAnswer: true });
    cols.push({ key: 'paid', label: 'Paid', group: 'payment', value: (r) => (r.paid ? 'Yes' : 'No') });
    cols.push({ key: 'paid_at', label: 'Payment recorded', group: 'payment', value: (r) => (r.paid ? `${stamp(r.paid_at)}${r.paid_by_name ? `, by ${r.paid_by_name}` : ''}` : '') });
  }
  cols.push({ key: 'note', label: 'Team note', group: 'notes', value: (r) => r.staff_note ?? '' });
  return cols;
}

export const GROUP_LABEL: Record<Column['group'], string> = {
  member: 'Who answered', timing: 'When', questions: 'Questions', payment: 'Payment', notes: 'Notes',
};

/**
 * Rows of cells for the chosen columns: one per answer or, with
 * `perItem`, one per item, led by the item's number. In a row per item a
 * question asked again gives that item's value, one asked once repeats on
 * each row, and the amount is on the answer's first row only.
 */
export function exportRows(cols: Column[], responses: FormResponse[], perItem = false): Cell[][] {
  if (!perItem) return responses.map((r) => cols.map((c) => c.value(r)));
  return responses.flatMap((r) => Array.from({ length: itemCount(r.answers) }, (_, i) => [
    i + 1,
    ...cols.map((c) => (c.itemValue ? c.itemValue(r, i) : c.perAnswer && i > 0 ? '' : c.value(r))),
  ]));
}

/** Every file attached to these answers, named for a ZIP: "Surname Name/file.pdf". */
export function filesForZip(form: InternalForm, responses: FormResponse[]): { name: string; path: string }[] {
  const out: { name: string; path: string }[] = [];
  const fileFields = form.fields.filter((f) => f.type === 'file');
  for (const r of responses) {
    const folder = (r.member_name || r.member_email || r.user_id || '').replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'Member';
    for (const f of fileFields) {
      for (const v of valuesOf(f, r.answers)) {
        if (!Array.isArray(v)) continue;
        for (const x of v as FileAnswer[]) out.push({ name: `${folder}/${x.name}`, path: x.path });
      }
    }
  }
  return out;
}

/** Search across who answered and what they answered. */
export function responseHaystack(form: InternalForm, r: FormResponse): string {
  const parts = [r.member_name ?? '', r.member_email ?? '', r.staff_note ?? ''];
  for (const f of form.fields) if (isQuestion(f)) for (const v of valuesOf(f, r.answers)) parts.push(answerText(f, v as AnswerValue));
  return parts.join(' ').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
