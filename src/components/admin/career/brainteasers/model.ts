import type { Brainteaser, BtProgress } from '@/lib/brainteasers-api';

// =====================================================================
// Career > Brainteasers: filtering and counting, with no React in it.
// =====================================================================

/** The firm filter's entry for questions not attributed to any firm. */
export const NO_FIRM = '__none__';
export const NO_FIRM_LABEL = 'Firm not specified';

export type StatusFilter = 'all' | 'todo' | 'solved' | 'needed' | 'flagged' | 'noted';

export const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All questions' },
  { value: 'todo', label: 'Not done yet' },
  { value: 'solved', label: 'Solved on my own' },
  { value: 'needed', label: 'Needed the solution' },
  { value: 'flagged', label: 'Flagged as hard' },
  { value: 'noted', label: 'With my notes' },
];

export interface Filters {
  q: string;
  types: string[];
  firms: string[];
  status: StatusFilter;
}

export const EMPTY_FILTERS: Filters = { q: '', types: [], firms: [], status: 'all' };

export const isFiltered = (f: Filters) => !!f.q.trim() || f.types.length > 0 || f.firms.length > 0 || f.status !== 'all';

/** Done means the member said how it went: solved alone, or with the solution. */
export const isDone = (p?: BtProgress) => !!p?.status;

function haystack(p: Brainteaser): string {
  return `${p.title}\n${p.field}\n${p.firms.join(' ')}\n${p.question}`.toLowerCase();
}

const hayCache = new WeakMap<Brainteaser, string>();
function hay(p: Brainteaser): string {
  let h = hayCache.get(p);
  if (!h) { h = haystack(p); hayCache.set(p, h); }
  return h;
}

export function matchesStatus(status: StatusFilter, pr?: BtProgress): boolean {
  switch (status) {
    case 'todo': return !isDone(pr);
    case 'solved': return pr?.status === 'solved';
    case 'needed': return pr?.status === 'needed_help';
    case 'flagged': return !!pr?.flagged;
    case 'noted': return !!pr?.note;
    default: return true;
  }
}

export function filterProblems(problems: Brainteaser[], progress: Record<string, BtProgress>, f: Filters): Brainteaser[] {
  const terms = f.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const types = new Set(f.types);
  const firms = new Set(f.firms);
  return problems.filter((p) => {
    if (types.size && !types.has(p.field)) return false;
    if (firms.size) {
      const hit = p.firms.length ? p.firms.some((x) => firms.has(x)) : firms.has(NO_FIRM);
      if (!hit) return false;
    }
    if (!matchesStatus(f.status, progress[p.id])) return false;
    if (terms.length) {
      const h = hay(p);
      for (const t of terms) if (!h.includes(t)) return false;
    }
    return true;
  });
}

export interface Facet { value: string; label: string; count: number }

/** Types, most frequent first. */
export function typeFacets(problems: Brainteaser[]): Facet[] {
  const m = new Map<string, number>();
  for (const p of problems) m.set(p.field, (m.get(p.field) ?? 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([value, count]) => ({ value, label: value, count }));
}

/** Firms, most frequent first, then the questions with no firm. */
export function firmFacets(problems: Brainteaser[]): Facet[] {
  const m = new Map<string, number>();
  let none = 0;
  for (const p of problems) {
    if (!p.firms.length) none += 1;
    for (const f of p.firms) m.set(f, (m.get(f) ?? 0) + 1);
  }
  const out = [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([value, count]) => ({ value, label: value, count }));
  if (none) out.push({ value: NO_FIRM, label: NO_FIRM_LABEL, count: none });
  return out;
}

export interface Tally { total: number; solved: number; needed: number; flagged: number; opened: number }
const emptyTally = (): Tally => ({ total: 0, solved: 0, needed: 0, flagged: 0, opened: 0 });

function add(t: Tally, pr?: BtProgress) {
  t.total += 1;
  if (pr?.status === 'solved') t.solved += 1;
  if (pr?.status === 'needed_help') t.needed += 1;
  if (pr?.flagged) t.flagged += 1;
  if (pr?.revealed_at) t.opened += 1;
}

export function tallies(problems: Brainteaser[], progress: Record<string, BtProgress>) {
  const all = emptyTally();
  const byType = new Map<string, Tally>();
  const byFirm = new Map<string, Tally>();
  for (const p of problems) {
    const pr = progress[p.id];
    add(all, pr);
    const t = byType.get(p.field) ?? emptyTally(); add(t, pr); byType.set(p.field, t);
    const firms = p.firms.length ? p.firms : [NO_FIRM_LABEL];
    for (const f of firms) { const x = byFirm.get(f) ?? emptyTally(); add(x, pr); byFirm.set(f, x); }
  }
  const sort = (m: Map<string, Tally>) => [...m].sort((a, b) => b[1].total - a[1].total || a[0].localeCompare(b[0]));
  return { all, byType: sort(byType), byFirm: sort(byFirm) };
}

/** A question to try next from the list: not done yet, at random; or any, if all are done. */
export function pickRandom(list: Brainteaser[], progress: Record<string, BtProgress>, avoid?: string | null, rnd = Math.random): Brainteaser | null {
  const fresh = list.filter((p) => !isDone(progress[p.id]) && p.id !== avoid);
  const pool = fresh.length ? fresh : list.filter((p) => p.id !== avoid);
  if (!pool.length) return list[0] ?? null;
  return pool[Math.floor(rnd() * pool.length)];
}

export const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

export function firmsText(firms: string[], max = 2): string {
  if (!firms.length) return NO_FIRM_LABEL;
  return firms.length <= max ? firms.join(', ') : `${firms.slice(0, max).join(', ')} +${firms.length - max}`;
}
