// =====================================================================
// Reading the answers to a form: summaries, columns and exports.
// ---------------------------------------------------------------------
// The organisers' questions are practical: how many of each size, how
// many people in total, who has not paid yet, and a sheet to send to the
// supplier. So every choice question is counted, every number question
// is totalled, and the export is built from exactly the columns and the
// rows that were chosen, in the order the form asks its questions.
// =====================================================================

import {
  answerText, isChoice, isOrder, isQuestion, optionPrice, type AnswerValue, type FileAnswer, type FormField, type OrderLine,
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

export function memberRoleLabel(r: Pick<FormResponse, 'member_role' | 'member_division'>): string {
  if (!r.member_role) return '';
  return roleLabel(r.member_role as AppRole, (r.member_division as OrgDivision | null) ?? null);
}

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

export type Summary =
  | { kind: 'order'; answered: number; sizes: string[]; rows: OrderRow[]; items: number; amount: number | null; bySize: Record<string, number> }
  | { kind: 'choices'; answered: number; rows: { label: string; count: number; other?: boolean }[] }
  | { kind: 'numbers'; answered: number; total: number; mean: number; min: number; max: number; rows: { label: string; count: number }[] }
  | { kind: 'texts'; answered: number; latest: { who: string; text: string }[] }
  | { kind: 'files'; answered: number; files: number }
  | { kind: 'consent'; answered: number };

export function summarise(field: FormField, responses: FormResponse[]): Summary {
  const values = responses.map((r) => ({ r, v: r.answers?.[field.id] }))
    .filter((x) => x.v !== undefined && x.v !== null && x.v !== '' && !(Array.isArray(x.v) && x.v.length === 0));
  const answered = values.length;
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
      kind: 'order', answered, sizes, rows, bySize,
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
    return { kind: 'choices', answered, rows };
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
      kind: 'numbers', answered, total,
      mean: nums.length ? total / nums.length : 0,
      min: nums.length ? Math.min(...nums) : 0,
      max: nums.length ? Math.max(...nums) : 0,
      rows,
    };
  }
  if (field.type === 'file') {
    return { kind: 'files', answered, files: values.reduce((a, { v }) => a + (Array.isArray(v) ? v.length : 0), 0) };
  }
  if (field.type === 'consent') return { kind: 'consent', answered };
  const latest = [...values]
    .sort((a, b) => b.r.updated_at.localeCompare(a.r.updated_at))
    .slice(0, 5)
    .map(({ r, v }) => ({ who: r.member_name ?? '', text: answerText(field, v as AnswerValue) }));
  return { kind: 'texts', answered, latest };
}

// ---------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------

export interface Column {
  key: string;
  label: string;
  group: 'member' | 'timing' | 'questions' | 'payment' | 'notes';
  value: (r: FormResponse) => Cell;
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
export function allColumns(form: InternalForm, responses: FormResponse[]): Column[] {
  const cols: Column[] = [
    { key: 'name', label: 'Name', group: 'member', value: (r) => r.member_name ?? '' },
    { key: 'email', label: 'Email', group: 'member', value: (r) => r.member_email ?? '' },
    { key: 'role', label: 'Role', group: 'member', value: (r) => memberRoleLabel(r) },
    { key: 'submitted', label: 'First sent', group: 'timing', value: (r) => stamp(r.submitted_at) },
    { key: 'updated', label: 'Last changed', group: 'timing', value: (r) => (r.edit_count > 0 ? stamp(r.updated_at) : '') },
  ];
  const known = new Set<string>();
  for (const f of form.fields.filter(isQuestion)) {
    known.add(f.id);
    cols.push({
      key: `q:${f.id}`, label: f.label, group: 'questions', field: f,
      value: (r) => {
        const v = r.answers?.[f.id];
        if (f.type === 'number' || f.type === 'scale') return typeof v === 'number' ? v : '';
        return answerText(f, v as AnswerValue);
      },
    });
    // An order also gives one column per choice (and size): a number each,
    // so the sheet adds up in Excel and goes straight to the supplier.
    if (isOrder(f)) {
      const count = (r: FormResponse, option: string, size?: string): Cell => {
        const lines = (Array.isArray(r.answers?.[f.id]) ? r.answers[f.id] : []) as OrderLine[];
        const n = lines.filter((l) => l.option === option && (size === undefined || l.size === size)).reduce((a, l) => a + l.qty, 0);
        return n || '';
      };
      for (const o of f.options ?? []) {
        if (f.sizes?.length) {
          for (const sz of f.sizes) cols.push({ key: `qb:${f.id}:${o}:${sz}`, label: `${f.label}: ${o}, ${sz}`, group: 'questions', breakdown: true, value: (r) => count(r, o, sz) });
        } else {
          cols.push({ key: `qb:${f.id}:${o}`, label: `${f.label}: ${o}`, group: 'questions', breakdown: true, value: (r) => count(r, o) });
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
    cols.push({ key: 'amount', label: 'Amount due (EUR)', group: 'payment', value: (r) => dueOf(form, r) ?? '' });
    cols.push({ key: 'paid', label: 'Paid', group: 'payment', value: (r) => (r.paid ? 'Yes' : 'No') });
    cols.push({ key: 'paid_at', label: 'Payment recorded', group: 'payment', value: (r) => (r.paid ? `${stamp(r.paid_at)}${r.paid_by_name ? `, by ${r.paid_by_name}` : ''}` : '') });
  }
  cols.push({ key: 'note', label: 'Team note', group: 'notes', value: (r) => r.staff_note ?? '' });
  return cols;
}

export const GROUP_LABEL: Record<Column['group'], string> = {
  member: 'Who answered', timing: 'When', questions: 'Questions', payment: 'Payment', notes: 'Notes',
};

/** Rows of cells for the chosen columns. */
export function exportRows(cols: Column[], responses: FormResponse[]): Cell[][] {
  return responses.map((r) => cols.map((c) => c.value(r)));
}

/** Every file attached to these answers, named for a ZIP: "Surname Name/file.pdf". */
export function filesForZip(form: InternalForm, responses: FormResponse[]): { name: string; path: string }[] {
  const out: { name: string; path: string }[] = [];
  const fileFields = form.fields.filter((f) => f.type === 'file');
  for (const r of responses) {
    const folder = (r.member_name || r.member_email || r.user_id).replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'Member';
    for (const f of fileFields) {
      const v = r.answers?.[f.id];
      if (!Array.isArray(v)) continue;
      for (const x of v as FileAnswer[]) out.push({ name: `${folder}/${x.name}`, path: x.path });
    }
  }
  return out;
}

/** Search across who answered and what they answered. */
export function responseHaystack(form: InternalForm, r: FormResponse): string {
  const parts = [r.member_name ?? '', r.member_email ?? '', r.staff_note ?? ''];
  for (const f of form.fields) if (isQuestion(f)) parts.push(answerText(f, r.answers?.[f.id] as AnswerValue));
  return parts.join(' ').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
