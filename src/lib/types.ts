// Data types for MIMS website

export type Division = 'equity' | 'investment' | 'macro' | 'portfolio' | 'quant';
export type Fund = 'long-short' | 'multi-asset' | 'dps' | 'pir';
export type Position = 
  | 'President'
  | 'Vice President'
  | 'Head of Asset Management'
  | 'Advisor'
  | 'Head of Equity Research'
  | 'Head of Investment Research'
  | 'Head of Macro Research'
  | 'Head of Portfolio Management'
  | 'Head of Quantitative Research'
  | 'Portfolio Manager'
  // A rank of its own, and it was absent from this list. Because there
  // was no value for it, the database function that publishes a member
  // mapped the workspace role `team_leader` onto 'Senior Analyst', so
  // every team leader appeared on the public site as a senior analyst.
  | 'Team Leader'
  | 'Senior Analyst'
  | 'Analyst'
  | 'Head of Operations'
  | 'Head of Media'
  | 'Operations'
  | 'Media';

export interface Report {
  id: string;
  date: string;
  title: string;
  description: string;
  division: Division;
  fund?: Fund;
  pdfUrl: string;
}

export interface TeamMember {
  id: string;
  name: string;
  surname: string;
  position: Position;
  division?: Division;
  /** Legacy: the fund column, still populated on rows created before the
   *  roster became the single source of truth. Read as a fallback. */
  fund?: Fund;
  /** The member's sub-unit within their division: a fund for Portfolio
   *  Management, a desk for Investment Research. See lib/division-teams. */
  team?: string;
  photoUrl?: string;
  linkedinUrl?: string;
  isBoard: boolean;
  displayOrder?: number;
}

export interface Alumni {
  id: string;
  name: string;
  surname: string;
  graduationYear: number;
  currentRole: string;
  company: string;
  linkedinUrl?: string;
}

export interface Event {
  id: string;
  date: string;
  title: string;
  location?: string;
  description: string;
  photoUrl?: string;
}

export const divisionLabels: Record<Division, string> = {
  equity: 'Equity Research',
  investment: 'Investment Research',
  macro: 'Macro Research',
  portfolio: 'Portfolio Management',
  quant: 'Quantitative Research',
};

export const fundLabels: Record<Fund, string> = {
  'long-short': 'Long Short Equity Fund',
  'multi-asset': 'Multi Asset Global Opportunities Fund',
  'dps': 'Diversified Passive Selection Fund',
  'pir': 'Italian Equity PIR Fund',
};

/**
 * Compact fund names, for places where the label sits beside something else
 * and the full name would dominate the line: the Members directory prints
 * "Analyst · Multi Asset Fund", not the full mandate title.
 */
export const fundShortLabels: Record<Fund, string> = {
  'long-short': 'Long Short Fund',
  'multi-asset': 'Multi Asset Fund',
  'dps': 'Diversified Passive Fund',
  'pir': 'Italian Equity Fund',
};

export const activeFunds: Fund[] = ['long-short', 'multi-asset'];
export const closedFunds: Fund[] = ['dps', 'pir'];
