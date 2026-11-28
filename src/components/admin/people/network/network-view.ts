import type { NetworkPerson, NetworkTieRow, RankMap } from '@/lib/people-network-api';

// =====================================================================
// People > Network: what the page derives from the analysis (Steps 111
// and 112). No React, so the tests can read it as it is.
//
// ONE POSITION (Step 112). The page shows each person's overall position
// only. Status, mediation and coalition building are what make it up, and
// the person's window shows them as such, never as rankings of their own:
// the members are peers, and the page is there to show who is well
// connected and whom to ask, not who comes first.
// =====================================================================

/**
 * The weight of each kind of tie, as the engine applies it (TIE_WEIGHTS in
 * `_shared/network-engine.ts`: officers, lead, report, board, direct,
 * division, interview, president, vice). Shown on the page; the tests keep
 * the two the same.
 */
export const TIE_TABLE: { label: string; weight: string }[] = [
  { label: 'President and Vice-President of the same semester', weight: '1.5' },
  { label: 'A head with the President or the Vice-President, same semester', weight: '1.25' },
  { label: 'A report written together', weight: '1' },
  { label: 'Two heads on the same Board, same semester', weight: '1' },
  { label: 'Media & Operations with the President or the Vice-President, in a semester it has no head', weight: '1' },
  { label: 'The same division, same semester', weight: '0.5' },
  { label: 'Interviewer and new joiner: the head of the division a member joined, in the semester they got in', weight: '0.5' },
  { label: 'The President with every member of their semester', weight: '0.1' },
  { label: 'The Vice-President with every member of their semester', weight: '0.05' },
];

/** What makes up the overall position: three factors, explained, never ranked on their own. */
export type Factor = 'status' | 'mediation' | 'coalition';
export const FACTORS: { key: Factor; label: string; explain: string }[] = [
  { key: 'status', label: 'Tied to the well connected', explain: 'Ties with people who are themselves well connected count for more.' },
  { key: 'mediation', label: 'A bridge between groups', explain: 'How often the person lies on the shortest path between two others, joining people who would otherwise barely meet.' },
  { key: 'coalition', label: 'A circle of their own, and reach', explain: 'A close division of their own, many people tied to them, and ties into the other divisions.' },
];

export function factorOf(p: NetworkPerson, f: Factor): number {
  return f === 'status' ? p.status : f === 'mediation' ? p.mediation : p.coalition;
}

/** The divisions of belonging, as the page names them, in the map's order. */
export const DIVISIONS: { key: string; label: string; colour: string }[] = [
  { key: 'board', label: 'Board of Directors', colour: 'var(--net-1)' },
  { key: 'equity', label: 'Equity Research', colour: 'var(--net-2)' },
  { key: 'investment', label: 'Investment Research', colour: 'var(--net-3)' },
  { key: 'macro', label: 'Macro Research', colour: 'var(--net-4)' },
  { key: 'portfolio', label: 'Portfolio Management', colour: 'var(--net-5)' },
  { key: 'quant', label: 'Quantitative Research', colour: 'var(--net-6)' },
  { key: 'markets_alternatives', label: 'Markets & Alternatives Research', colour: 'var(--net-7)' },
  { key: 'media_operations', label: 'Media & Operations', colour: 'var(--net-8)' },
  { key: 'risk', label: 'Risk Management', colour: 'var(--net-other)' },
];
const DIVISION_BY_KEY = new Map(DIVISIONS.map((d) => [d.key, d]));

export function divisionLabel(key: string | null | undefined): string {
  return DIVISION_BY_KEY.get(key ?? '')?.label ?? 'No division on record';
}

export function divisionColour(key: string | null | undefined): string {
  return DIVISION_BY_KEY.get(key ?? '')?.colour ?? 'var(--net-other)';
}

/** The divisions present, in the map's order, with their people. */
export function divisionsOf(people: NetworkPerson[]): { key: string; label: string; colour: string; size: number }[] {
  const count = new Map<string, number>();
  for (const p of people) if (p.degree > 0) count.set(p.division ?? 'other', (count.get(p.division ?? 'other') ?? 0) + 1);
  const known = DIVISIONS.filter((d) => count.has(d.key)).map((d) => ({ ...d, size: count.get(d.key)! }));
  const rest = [...count.keys()].filter((k) => !DIVISION_BY_KEY.has(k))
    .map((k) => ({ key: k, label: divisionLabel(k), colour: divisionColour(k), size: count.get(k)! }));
  return [...known, ...rest];
}

/** A person's position in a stored semester, or null if they were not yet in the network. */
export function positionIn(ranks: RankMap | undefined, node: string): number | null {
  const r = ranks?.[node];
  return r ? r[0] : null;
}

/** "Fall 2019" from "2019-fall". */
export function semesterName(key: string | null | undefined): string {
  const m = /^(\d{4})-(spring|fall)$/.exec(key ?? '');
  return m ? `${m[2] === 'fall' ? 'Fall' : 'Spring'} ${m[1]}` : '';
}

/** "Fall 2021 to Spring 2024", "Since Fall 2023", or one semester. */
export function periodOf(p: NetworkPerson, current: string): string {
  const first = semesterName(p.first_semester);
  const last = semesterName(p.last_semester);
  if (p.is_current || p.last_semester === current) return first ? `Since ${first}` : 'Now';
  if (!first) return last;
  return first === last ? first : `${first} to ${last}`;
}

/** Change of position: positive when the person moved up; null when new. */
export function movement(now: number, before: number | null): number | null {
  return before === null ? null : before - now;
}

export function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Rome' });
}

export function dateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' });
}

/** "10:48", in Milan. */
export function timeOf(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' });
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`;
}

/** "13 reports, 3 Boards, 5 semesters in a division". */
export function groupsLine(g: { report: number; board: number; division: number }): string {
  const parts: string[] = [];
  if (g.report) parts.push(plural(g.report, 'report'));
  if (g.board) parts.push(plural(g.board, 'Board'));
  if (g.division) parts.push(plural(g.division, 'semester') + ' in a division');
  return parts.join(', ') || 'No shared groups';
}

/** What two people share: "2 reports together, 1 Board together, 3 semesters in the same division". */
export function sharedLine(t: NetworkTieRow): string {
  const [, , , report, board, division, interview, officer] = t;
  const parts: string[] = [];
  if (report) parts.push(plural(report, 'report') + ' together');
  if (board) parts.push(`${plural(board, 'Board')} together`);
  if (division) parts.push(`${plural(division, 'semester')} in the same division`);
  if (interview) parts.push('head and new joiner of the division');
  if (officer && !board) parts.push(`${plural(officer, 'semester')} with one of them as President or Vice-President`);
  return parts.join(', ');
}

/** Each person's ties, strongest first. */
export function tiesByPerson(ties: NetworkTieRow[], people: number): NetworkTieRow[][] {
  const out: NetworkTieRow[][] = Array.from({ length: people }, () => []);
  for (const t of ties) {
    if (out[t[0]]) out[t[0]].push(t);
    if (out[t[1]]) out[t[1]].push(t);
  }
  for (const list of out) list.sort((a, b) => b[2] - a[2]);
  return out;
}

/**
 * The members of today who moved up most since the end of the last
 * semester, by their position in the whole network.
 */
export function movingUp(people: NetworkPerson[], before: RankMap | undefined, count = 5) {
  if (!before) return [];
  return people
    .filter((p) => p.is_current)
    .map((p) => ({ p, move: movement(p.rank_overall, positionIn(before, p.node)) }))
    .filter((x): x is { p: NetworkPerson; move: number } => x.move !== null && x.move > 0)
    .sort((a, b) => b.move - a.move || a.p.rank_overall - b.p.rank_overall)
    .slice(0, count);
}

/** Folds accents and case, for finding a person by name. */
export const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
