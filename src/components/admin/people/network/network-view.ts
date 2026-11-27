import type { NetworkPerson, NetworkRead, NetworkTieRow, RankMap } from '@/lib/people-network-api';

// =====================================================================
// People > Network: what the page derives from the analysis (Step 111).
// No React, so the tests can read it as it is.
// =====================================================================

export type Measure = 'overall' | 'status' | 'mediation' | 'coalition';

/**
 * The weight of each kind of tie, as the engine applies it (TIE_WEIGHTS in
 * `_shared/network-engine.ts`: officers, lead, report, board, division,
 * interview). Shown on the page; the tests keep the two the same.
 */
export const TIE_TABLE: { label: string; weight: string }[] = [
  { label: 'President and Vice-President of the same semester', weight: '1.5' },
  { label: 'A head of division with the President or the Vice-President, same semester', weight: '1.25' },
  { label: 'A report written together', weight: '1' },
  { label: 'Two heads on the same Board, same semester', weight: '1' },
  { label: 'The same division, same semester', weight: '0.5' },
  { label: 'Interviewer and new joiner: the head of the division a member joined, in the semester they got in', weight: '0.5' },
];

export const MEASURES: { key: Measure; label: string; short: string; explain: string }[] = [
  {
    key: 'overall', label: 'Overall', short: 'Overall',
    explain: 'Status, mediation and coalition building read together: first is the person placed highest on all three at once.',
  },
  {
    key: 'status', label: 'Status', short: 'Status',
    explain: 'Tied to people who are themselves well tied. The most central people in the network, close to everyone who matters in it.',
  },
  {
    key: 'mediation', label: 'Mediation', short: 'Mediation',
    explain: 'How often a person lies on the shortest path between two others: the bridges between groups that would otherwise barely meet.',
  },
  {
    key: 'coalition', label: 'Coalition building', short: 'Coalition',
    explain: 'A close group of their own, many people tied to them, and ties reaching into the other groups of the Society.',
  },
];

export function rankOf(p: NetworkPerson, m: Measure): number {
  return m === 'overall' ? p.rank_overall : m === 'status' ? p.rank_status : m === 'mediation' ? p.rank_mediation : p.rank_coalition;
}

/** A person's score on a measure (higher is better placed). */
export function valueOf(p: NetworkPerson, m: Measure): number {
  return m === 'overall' ? p.overall : m === 'status' ? p.status : m === 'mediation' ? p.mediation : p.coalition;
}

const RANK_INDEX: Record<Measure, number> = { overall: 0, status: 1, mediation: 2, coalition: 3 };

/** A person's rank in a stored point, or null if they were not yet in the network. */
export function rankIn(ranks: RankMap | undefined, node: string, m: Measure): number | null {
  const r = ranks?.[node];
  return r ? r[RANK_INDEX[m]] : null;
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

/** The point a movement is measured from: the latest weekly point before the latest analysis. */
export function previousPoint(data: NetworkRead): { label: string; ranks: RankMap } | null {
  const latest = data.latest;
  if (!latest) return null;
  const t = Date.parse(latest.computed_at);
  const before = data.weeks.filter((w) => Date.parse(w.computed_at) < t - 60_000);
  const prev = before[before.length - 1];
  if (!prev) return null;
  return { label: shortDate(prev.computed_at), ranks: prev.ranks };
}

/** Change of rank: positive when the person climbed; null when new. */
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

/** "13 reports, 3 Boards, 5 division semesters". */
export function groupsLine(g: { report: number; board: number; division: number }): string {
  const parts: string[] = [];
  if (g.report) parts.push(plural(g.report, 'report'));
  if (g.board) parts.push(plural(g.board, 'Board'));
  if (g.division) parts.push(plural(g.division, 'semester') + ' in a division');
  return parts.join(', ') || 'No shared groups';
}

/** What two people share: "2 reports, 1 Board, 3 semesters in the same division". */
export function sharedLine(t: NetworkTieRow): string {
  const [, , , report, board, division, interview] = t;
  const parts: string[] = [];
  if (report) parts.push(plural(report, 'report') + ' together');
  if (board) parts.push(`${plural(board, 'Board')} together`);
  if (division) parts.push(`${plural(division, 'semester')} in the same division`);
  if (interview) parts.push('head and new joiner of the division');
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

/** The colour of a community on the map: eight hues, then a neutral grey. */
export function communityColour(c: number): string {
  if (c >= 1 && c <= 8) return `var(--net-${c})`;
  return 'var(--net-other)';
}

/** Each community's size and the person placed highest in it. */
export function communitiesOf(people: NetworkPerson[]): { id: number; size: number; lead: NetworkPerson }[] {
  const by = new Map<number, NetworkPerson[]>();
  for (const p of people) if (p.community) by.set(p.community, [...(by.get(p.community) ?? []), p]);
  return [...by.entries()]
    .map(([id, list]) => ({ id, size: list.length, lead: list.reduce((a, b) => (b.rank_overall < a.rank_overall ? b : a)) }))
    .sort((a, b) => a.id - b.id);
}

/** How far down a ranking counts as its upper part: a quarter of the network, at least 25 places. */
export function upperPart(people: number): number {
  return Math.max(25, Math.ceil(people / 4));
}

/**
 * The people who climbed most between two points, among those now in the
 * upper part of the whole network (`total` people; the list may be only
 * this semester's members, whose ranks are still read in the whole).
 */
export function climbers(people: NetworkPerson[], before: RankMap | undefined, m: Measure, count = 5, total = people.length) {
  if (!before) return [];
  const top = upperPart(total);
  return people
    .filter((p) => rankOf(p, m) <= top)
    .map((p) => ({ p, move: movement(rankOf(p, m), rankIn(before, p.node, m)) }))
    .filter((x): x is { p: NetworkPerson; move: number } => x.move !== null && x.move > 0)
    .sort((a, b) => b.move - a.move || rankOf(a.p, m) - rankOf(b.p, m))
    .slice(0, count);
}
