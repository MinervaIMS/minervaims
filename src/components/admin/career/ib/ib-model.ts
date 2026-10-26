import { XCircle } from 'lucide-react';
import type { Brainteaser, BtProgress } from '@/lib/brainteasers-api';
import type { IbBank, IbLetter, IbProgress, IbQuestion } from '@/lib/ib-questions-api';
import { STATUS_OPTIONS, type StatusFilter } from '../brainteasers/model';
import type { ListVocab } from '../brainteasers/ProblemList';
import type { ProgressVocab } from '../brainteasers/ProgressView';

// =====================================================================
// Career > IB Questions: how the page reuses Brainteasers' list, filters
// and progress, with no markup in it.
//
// Brainteasers' list and counts work on a question's type and firms and
// on "solved" and "needed". Here the type is the subject, the firm is the
// subsection of the guide, and the last answer given is right or wrong:
// a question is handed to them in that shape, and its record likewise.
// =====================================================================

export const LETTERS: IbLetter[] = ['A', 'B', 'C', 'D'];

/** The line under a question: its subject and subsection, without saying the subject twice. */
export function metaOf(subject: string, section: string): string {
  const first = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').trim().split(/\s+/)[0] ?? '';
  const sec = section.toLowerCase();
  if (sec === subject.toLowerCase() || (first(subject).length > 2 && sec.startsWith(first(subject)))) return section;
  return `${subject} · ${section}`;
}

/** A question in the shape of the Brainteasers list: subject for type, subsection for firm. */
export function toListItem(q: IbQuestion): Brainteaser {
  return {
    id: q.id,
    title: q.question,
    field: q.subject,
    firms: [q.section],
    // What the search looks through besides the question and its subject:
    // the statement to complete, the guide's own wording and the answers.
    question: [q.statement ?? '', q.original ?? '', ...q.options].join('\n'),
    hidden: q.hidden,
    sort_order: q.sort_order,
    updated_at: q.updated_at,
  };
}

/** A record in the shape of Brainteasers': right counts as solved, wrong as needed. */
export function toBtProgress(p: IbProgress | undefined): BtProgress | undefined {
  if (!p) return undefined;
  return {
    status: p.status === 'right' ? 'solved' : p.status === 'wrong' ? 'needed_help' : null,
    flagged: p.flagged, note: p.note, revealed_at: p.revealed_at, status_at: p.status_at,
  };
}

const STATUS_WORDS: Record<StatusFilter, string> = {
  all: 'All questions',
  todo: 'Not answered yet',
  solved: 'Answered right',
  needed: 'Answered wrong',
  flagged: 'Flagged',
  noted: 'With my notes',
};

export const IB_LIST_VOCAB: ListVocab = {
  helpPage: 'career-ib',
  typeLabel: 'Subject',
  typeAll: 'All subjects',
  firmLabel: 'Subsection',
  firmAll: 'All subsections',
  search: 'Search the questions and answers',
  emptyHint: 'Widen the subject, subsection or status, or clear the search.',
  status: Object.fromEntries(STATUS_OPTIONS.map((o) => [o.value, STATUS_WORDS[o.value]])) as Record<StatusFilter, string>,
  solved: 'Answered right',
  needed: 'Answered wrong',
  // A cross, not Brainteasers' lifebuoy: here it means a wrong answer, not help asked for.
  neededIcon: XCircle,
  notDone: 'Not answered yet',
  flagged: 'Flagged',
  randomTitle: 'A question from this list you have not answered yet',
  meta: (p) => metaOf(p.field, p.firms[0] ?? ''),
  twoLines: true,
};

export const IB_PROGRESS_VOCAB: ProgressVocab = {
  helpPage: 'career-ib',
  done: 'Answered',
  notDone: 'Not answered yet',
  solved: 'Answered right',
  solvedSub: (p) => (p === null ? 'none yet' : `${p}% of those answered`),
  needed: 'Answered wrong',
  neededSub: 'worth another try',
  flagged: 'Flagged',
  byType: 'By subject',
  byTypeSub: 'Press one to practise it',
  byTypeAria: 'Progress by subject',
  byFirm: 'By subsection',
  byFirmSub: 'Press one to practise its questions',
  byFirmAria: 'Progress by subsection',
  resetBody: 'Every question of this bank goes back to "Not answered yet": your answers, your flags and your notes are cleared. This cannot be undone. The other bank is not affected.',
  keep: 'Keep my progress',
  clear: 'Clear this bank',
};

/** A small, fast hash of a string, for the order of the answers. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/**
 * The order the four answers are shown in: shuffled, as the guides' sets
 * ask, so the right one is not always in the same place; the same for a
 * question for as long as the page is open (`seed` changes per visit).
 * Returns the positions of A, B, C and D: [2, 0, 3, 1] shows C first.
 */
export function shuffledOrder(id: string, seed: string): number[] {
  let x = hash(`${seed}:${id}`) || 1;
  const rnd = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 10000) / 10000; };
  const order = [0, 1, 2, 3];
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** Each bank's guide: its name as members know it, and the full title. */
export const BANK_INFO: Record<IbBank, { short: string; title: string; author: string; year: string }> = {
  redbook: { short: 'RedBook', title: 'Investment Banking Interview Questions', author: 'Wall Street Prep', year: '2020' },
  blueprint: { short: 'Banker Blueprint', title: 'The 400 Investment Banking Interview Questions & Answers You Need to Know', author: 'Breaking Into Wall Street', year: '2010' },
};

/** "RedBook, page 13" */
export function sourceOf(bank: IbBank, page: number | null): string {
  return page ? `${BANK_INFO[bank].short}, page ${page}` : BANK_INFO[bank].short;
}
