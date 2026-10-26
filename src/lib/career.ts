// =====================================================================
// career.ts: a person's career inside Minerva, read from their semesters
// (Step 94B).
// ---------------------------------------------------------------------
// The person record (People > Time Machine, Members and Alumni) receives
// one entry per role per semester, from the history, the frozen registers
// and, for the current semester, the member register. This file turns
// them into what the record shows:
//
//   path       consecutive semesters with the same role merged ("Fall 2023
//              to Spring 2024: Equity Research Analyst"), and a semester
//              with no record between two recorded ones marked as such;
//   growth     each step up in seniority, from the first role;
//   summary    in Minerva since, semesters recorded, promotions, highest
//              role.
//
// Seniority follows the Statute's order: a member of a team, a senior or
// lead, a team or group leader (or Portfolio Manager), a co-head, a head,
// the officers, the Vice President, the President. Placeholders the old
// records use ("Member (role not stated)", "On semester break") are part
// of the path but never a step of growth.
//
// No imports, so that scripts/time-machine.test.mjs can load it.
// =====================================================================

export interface CareerEntry {
  /** "2025-fall" */
  semester: string;
  /** "Fall 2025" */
  label: string;
  role: string;
  team?: string | null;
  /** The current semester, read live from the member register. */
  live?: boolean;
}

export interface CareerStretch {
  kind: 'roles';
  from: string;
  to: string;
  fromLabel: string;
  toLabel: string;
  roles: { role: string; team: string | null }[];
  live: boolean;
}

export interface CareerGap {
  kind: 'gap';
  fromLabel: string;
  toLabel: string;
  semesters: number;
}

export interface CareerStep {
  role: string;
  semester: string;
  label: string;
  live: boolean;
}

export interface CareerSummary {
  since: { semester: string; label: string } | null;
  semesters: number;
  promotions: number;
  highest: string | null;
  growth: CareerStep[];
  path: (CareerStretch | CareerGap)[];
}

/** Fall 2025 comes right after Spring 2025: one number per semester. */
export function semesterOrdinal(key: string): number {
  const [year, term] = key.split('-');
  return Number(year) * 2 + (term === 'fall' ? 1 : 0);
}

export function semesterLabelOf(ordinal: number): string {
  return ordinal % 2 === 1 ? `Fall ${(ordinal - 1) / 2}` : `Spring ${ordinal / 2}`;
}

/** Seniority, 0 for a placeholder that is no role at all. */
export function roleTier(role: string): number {
  const r = role.trim();
  if (/^President\b/i.test(r)) return 8;
  if (/^Vice President\b/i.test(r)) return 7;
  if (/^(Head of Asset Management|Head of Research|External Relations|Board Member)$/i.test(r)) return 6;
  if (/^Co-Head of\b/i.test(r)) return 4;
  if (/^Head of\b/i.test(r)) return 5;
  // A desk's lead strategist leads it, as a team leader leads a team.
  if (/\b(Team Leader|Group Leader)\b/i.test(r) || /^Portfolio Manager$/i.test(r) || /-\s*Lead$/i.test(r)) return 3;
  if (/^Senior\b/i.test(r) || /\bSenior Analyst\b/i.test(r) || /^Lead Analyst$/i.test(r)) return 2;
  if (/^Member\b/i.test(r) || /^On semester break\b/i.test(r) || /^Research member\b/i.test(r) || /Advisor$/i.test(r)) return 0;
  if (/\b(Analyst|Strategist)\b/i.test(r) || /\bmember$/i.test(r)) return 1;
  return 1;
}

const sameRoles = (a: { role: string; team: string | null }[], b: { role: string; team: string | null }[]) =>
  a.length === b.length && a.every((x, i) => x.role === b[i].role && x.team === b[i].team);

/** One person's semesters, in order, with each semester's roles (the most senior first). */
function bySemester(entries: CareerEntry[]) {
  const map = new Map<string, { semester: string; label: string; live: boolean; roles: { role: string; team: string | null }[] }>();
  for (const e of entries) {
    if (!e.semester || !e.role) continue;
    const s = map.get(e.semester) ?? { semester: e.semester, label: e.label, live: !!e.live, roles: [] };
    if (!s.roles.some((x) => x.role === e.role && x.team === (e.team ?? null))) s.roles.push({ role: e.role, team: e.team ?? null });
    s.live = s.live || !!e.live;
    map.set(e.semester, s);
  }
  return [...map.values()]
    .map((s) => ({ ...s, roles: [...s.roles].sort((a, b) => roleTier(b.role) - roleTier(a.role) || a.role.localeCompare(b.role)) }))
    .sort((a, b) => semesterOrdinal(a.semester) - semesterOrdinal(b.semester));
}

export function careerPath(entries: CareerEntry[]): (CareerStretch | CareerGap)[] {
  const out: (CareerStretch | CareerGap)[] = [];
  let prev: number | null = null;
  for (const s of bySemester(entries)) {
    const ord = semesterOrdinal(s.semester);
    if (prev !== null && ord - prev > 1) {
      out.push({ kind: 'gap', fromLabel: semesterLabelOf(prev + 1), toLabel: semesterLabelOf(ord - 1), semesters: ord - prev - 1 });
    }
    const last = out[out.length - 1];
    if (last && last.kind === 'roles' && prev !== null && ord - prev === 1 && sameRoles(last.roles, s.roles)) {
      last.to = s.semester;
      last.toLabel = s.label;
      last.live = last.live || s.live;
    } else {
      out.push({ kind: 'roles', from: s.semester, to: s.semester, fromLabel: s.label, toLabel: s.label, roles: s.roles, live: s.live });
    }
    prev = ord;
  }
  return out;
}

export function careerGrowth(entries: CareerEntry[]): CareerStep[] {
  const steps: CareerStep[] = [];
  let best = 0;
  for (const s of bySemester(entries)) {
    const top = s.roles[0];
    const tier = top ? roleTier(top.role) : 0;
    if (tier > best) {
      steps.push({ role: top.role, semester: s.semester, label: s.label, live: s.live });
      best = tier;
    }
  }
  return steps;
}

export function careerSummary(entries: CareerEntry[]): CareerSummary {
  const semesters = bySemester(entries);
  const growth = careerGrowth(entries);
  const first = semesters[0];
  return {
    since: first ? { semester: first.semester, label: first.label } : null,
    semesters: semesters.length,
    promotions: Math.max(0, growth.length - 1),
    highest: growth.length ? growth[growth.length - 1].role : (first?.roles[0]?.role ?? null),
    growth,
    path: careerPath(entries),
  };
}

/** "Fall 2023 to Spring 2024", or one semester. */
export function stretchLabel(s: { fromLabel: string; toLabel: string }): string {
  return s.fromLabel === s.toLabel ? s.fromLabel : `${s.fromLabel} to ${s.toLabel}`;
}
