// =====================================================================
// The sub-units inside a division, in one place.
// ---------------------------------------------------------------------
// Two divisions are subdivided, and until now only one of them could say
// so. Portfolio Management shows which fund a member runs; Investment
// Research is organised into three desks and had nowhere to record it.
//
// Both are the same idea - which part of the division a person belongs
// to - so both are answered by one field, `members.team`, and by this
// one list. The workspace builds its selector from it, the public
// Members page builds the label after a member's position from it, and
// the database CHECK constraint mirrors it, so a value can be offered,
// stored and displayed only if it appears here.
//
// A division not listed has no sub-units, and its members carry no team.
// =====================================================================

import type { OrgDivision } from '@/lib/roles';

export interface DivisionTeam {
  /** Stored in `members.team` and `team_members.team`. */
  value: string;
  /** What the workspace selector shows. */
  label: string;
  /** What the public page prints after the position. Kept short: it sits
   *  on one line beside a role, where the full fund name would wrap. */
  short: string;
}

export const DIVISION_TEAMS: Partial<Record<OrgDivision, DivisionTeam[]>> = {
  // The funds, which the public page has always shown for this division.
  portfolio: [
    { value: 'long-short', label: 'Long Short Equity Fund', short: 'Long Short Equity' },
    { value: 'multi-asset', label: 'Multi Asset Global Opportunities Fund', short: 'Multi Asset' },
    { value: 'dps', label: 'Diversified Passive Selection Fund (closed)', short: 'Diversified Passive Selection' },
    { value: 'pir', label: 'Italian Equity PIR Fund (closed)', short: 'Italian Equity PIR' },
  ],
  // The three desks, as the organisational chart on /about already names
  // them. The chart used "FX and Commodities"; the association writes it
  // with an ampersand, which is what is used here and on the chart now.
  investment: [
    { value: 'equities', label: 'Equities', short: 'Equities' },
    { value: 'fixed-income', label: 'Fixed Income', short: 'Fixed Income' },
    { value: 'fx-commodities', label: 'FX & Commodities', short: 'FX & Commodities' },
  ],
};

/** Does this division have sub-units at all? */
export function divisionHasTeams(division: string | null | undefined): boolean {
  return !!division && !!DIVISION_TEAMS[division as OrgDivision]?.length;
}

/** The sub-units of a division, or an empty list. */
export function teamsFor(division: string | null | undefined): DivisionTeam[] {
  return DIVISION_TEAMS[division as OrgDivision] ?? [];
}

/**
 * The short label for a stored team key, for the line under a name.
 *
 * The division is passed so a key can never be resolved against the wrong
 * division's list. Returns null when there is nothing true to print,
 * which is what keeps an empty separator off the page.
 */
export function teamShortLabel(division: string | null | undefined, team: string | null | undefined): string | null {
  if (!team) return null;
  return teamsFor(division).find((t) => t.value === team)?.short ?? null;
}

/** The full label, for the workspace and for anywhere with room. */
export function teamLabel(division: string | null | undefined, team: string | null | undefined): string | null {
  if (!team) return null;
  return teamsFor(division).find((t) => t.value === team)?.label ?? null;
}

/** What the workspace calls the field, which differs by division. */
export function teamFieldLabel(division: string | null | undefined): string {
  if (division === 'portfolio') return 'Fund';
  if (division === 'investment') return 'Team';
  return 'Team';
}
