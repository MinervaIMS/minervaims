// =====================================================================
// rosters.ts: the words the semester rosters are written in (Step 94).
// ---------------------------------------------------------------------
// ONE FILE, TWO COPIES. The workspace reads this file and the admin-rosters
// edge function reads its copy in supabase/functions/_shared/rosters.ts;
// the two are byte for byte the same, and scripts/people.test.mjs fails if
// they drift. The Board's offices are also the database's own list
// (public.roster_office_rank, migration 20261025090000), which the same
// test compares with OFFICES below.
//
// No imports, so that both Deno and the browser can load it.
// =====================================================================

/** Where a roster entry sits: today's divisions and the older areas. */
export type RosterDivision =
  | 'board' | 'asset_management' | 'research' | 'portfolio' | 'equity' | 'investment'
  | 'macro' | 'quant' | 'risk' | 'markets_alternatives' | 'media' | 'operations' | 'none';

/** In the order a roster is read: the Board first, then the divisions. */
export const ROSTER_DIVISIONS: { key: RosterDivision; label: string }[] = [
  { key: 'board', label: 'Board of Directors' },
  { key: 'asset_management', label: 'Asset Management' },
  { key: 'research', label: 'Research' },
  { key: 'equity', label: 'Equity Research' },
  { key: 'investment', label: 'Investment Research' },
  { key: 'macro', label: 'Macro Research' },
  { key: 'portfolio', label: 'Portfolio Management' },
  { key: 'quant', label: 'Quantitative Research' },
  { key: 'risk', label: 'Risk Management' },
  { key: 'markets_alternatives', label: 'Markets & Alternatives Research' },
  { key: 'media', label: 'Media & Communication' },
  { key: 'operations', label: 'Operations' },
  { key: 'none', label: 'No division stated' },
];

/** A fund in Portfolio Management, a desk in Investment Research, a project. */
export const ROSTER_TEAMS: { key: string; division: RosterDivision; label: string; short: string }[] = [
  { key: 'long-short', division: 'portfolio', label: 'Long Short Equity Fund', short: 'Long Short Equity' },
  { key: 'multi-asset', division: 'portfolio', label: 'Multi Asset Global Opportunities Fund', short: 'Multi Asset' },
  { key: 'dps', division: 'portfolio', label: 'Diversified Passive Selection Fund', short: 'Diversified Passive Selection' },
  { key: 'pir', division: 'portfolio', label: 'Italian Equity PIR Fund', short: 'Italian Equity PIR' },
  { key: 'equities', division: 'investment', label: 'Equities', short: 'Equities' },
  { key: 'fixed-income', division: 'investment', label: 'Fixed Income', short: 'Fixed Income' },
  { key: 'fx-commodities', division: 'investment', label: 'FX & Commodities', short: 'FX & Commodities' },
  { key: 'hercle-project', division: 'research', label: 'Hercle project', short: 'Hercle project' },
];

/**
 * THE BOARD OF DIRECTORS: every office, and its place. Officers first
 * (below 50), then the heads in the Statute's order (Art. 14); offices the
 * Society no longer has keep their place among them. A role that is not
 * listed here is not on the Board (an advisor holds no office).
 */
export const OFFICES: [string, number][] = [
  ['President', 10], ['President (outgoing)', 11],
  ['Vice President', 20], ['Vice President - External Relations Manager', 21],
  ['Head of Asset Management', 30], ['Head of Research', 31],
  ['External Relations', 40], ['Board Member', 41],
  ['Head of Equity Research', 50], ['Co-Head of Equity Research', 51],
  ['Head of Investment Research', 52], ['Co-Head of Investment Research', 53],
  ['Head of Macro Research', 54], ['Co-Head of Macro Research', 55],
  ['Head of Portfolio Management', 56], ['Co-Head of Portfolio Management', 57],
  ['Head of Quantitative Research', 58], ['Co-Head of Quantitative Research', 59],
  ['Head of Risk Management', 60], ['Co-Head of Risk Management', 61],
  ['Head of Markets & Alternatives Research', 62], ['Co-Head of Markets & Alternatives Research', 63],
  ['Head of Media & Communication', 70], ['Co-Head of Media & Communication', 71],
  ['Head of Operations', 72], ['Co-Head of Operations', 73],
];

const OFFICE_RANK = new Map(OFFICES);

/** An office's place on the Board, or null for a role that is not on it. */
export function officeRank(role: string | null | undefined): number | null {
  return role ? OFFICE_RANK.get(role) ?? null : null;
}

/** Officers sit above the heads. */
export function isOfficer(role: string | null | undefined): boolean {
  const rank = officeRank(role);
  return rank !== null && rank < 50;
}

export function rosterDivisionLabel(key: string | null | undefined): string {
  return ROSTER_DIVISIONS.find((d) => d.key === key)?.label ?? 'No division stated';
}

export function rosterTeamLabel(key: string | null | undefined): string | null {
  return key ? ROSTER_TEAMS.find((t) => t.key === key)?.label ?? null : null;
}

/** The short form, where a column is narrow (the PDF, a phone). */
export function rosterTeamShort(key: string | null | undefined): string | null {
  return key ? ROSTER_TEAMS.find((t) => t.key === key)?.short ?? null : null;
}

/** The teams a division has, for the correction form. */
export function rosterTeamsFor(division: string | null | undefined): { key: string; label: string }[] {
  return ROSTER_TEAMS.filter((t) => t.division === division).map(({ key, label }) => ({ key, label }));
}

/** "2025-fall": the form every semester key has. */
export const SEMESTER_KEY = /^[0-9]{4}-(fall|spring)$/;

export function semesterLabel(key: string): string {
  const [year, term] = key.split('-');
  return `${term === 'fall' ? 'Fall' : 'Spring'} ${year}`;
}

/** The longest role a correction may write. */
export const ROLE_LABEL_MAX = 120;
