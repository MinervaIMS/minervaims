// =====================================================================
// ALUMNI CAREER AREAS (Step 107).
// ---------------------------------------------------------------------
// Twelve areas, one per alumnus, in place of the job areas as typed (61
// spellings for 335 people). The database works each one out from the
// job area AND the employer (public.alumni_career_area, migration
// 20261124090000) and keeps it in step on every write; a person in the
// workspace can set one by hand, which is then kept. The job area stays
// as typed, as the detail of the role.
//
// This file is the list the pages show: the keys, in order, with their
// labels and what each covers. The database's twin
// (public.alumni_career_keys and public.alumni_career_label) and the edge
// functions' copy (supabase/functions/_shared/alumni-careers.ts) must say
// the same, key for key and label for label (scripts/alumni-careers.test.mjs).
// =====================================================================

export const ALUMNI_CAREER_KEYS = [
  'investment_banking', 'markets', 'asset_management', 'private_markets',
  'hedge_funds', 'research', 'risk_quant', 'consulting', 'corporate',
  'entrepreneurship', 'academia', 'other',
] as const;

export type AlumniCareerKey = (typeof ALUMNI_CAREER_KEYS)[number];

export interface AlumniCareer {
  key: AlumniCareerKey;
  label: string;
  /** What the area covers, in one line. */
  covers: string;
}

export const ALUMNI_CAREERS: AlumniCareer[] = [
  { key: 'investment_banking', label: 'Investment Banking & Advisory', covers: 'M&A, equity and debt capital markets, coverage, valuation, restructuring and corporate finance advisory, in banks, boutiques and deal teams.' },
  { key: 'markets', label: 'Sales & Trading', covers: 'Sales, trading and structuring of equities, fixed income, currencies and derivatives, treasury, brokerage and market infrastructure.' },
  { key: 'asset_management', label: 'Asset & Wealth Management', covers: 'Investment and portfolio teams at asset managers, wealth management, private banking and family offices.' },
  { key: 'private_markets', label: 'Private Markets', covers: 'Private equity, venture capital, private credit, infrastructure and real estate investing.' },
  { key: 'hedge_funds', label: 'Hedge Funds & Trading Firms', covers: 'Hedge funds, quantitative funds and proprietary trading firms.' },
  { key: 'research', label: 'Research & Economics', covers: 'Equity and macro research, ratings, and economics at central banks, international institutions and research bodies.' },
  { key: 'risk_quant', label: 'Risk & Quantitative', covers: 'Risk management, quantitative analysis and data roles in financial institutions.' },
  { key: 'consulting', label: 'Consulting', covers: 'Strategy, management and economic consulting, and the advisory practices of the Big Four.' },
  { key: 'corporate', label: 'Corporate & Industry', covers: 'Finance, strategy, business development and other roles in companies, insurers and fintechs included.' },
  { key: 'entrepreneurship', label: 'Entrepreneurship', covers: 'Founders and the first employees of start-ups.' },
  { key: 'academia', label: 'Academia', covers: 'Doctoral studies, research and teaching at universities.' },
  { key: 'other', label: 'Other', covers: 'A role that none of the areas above describes.' },
];

const BY_KEY = new Map<string, AlumniCareer>(ALUMNI_CAREERS.map((c) => [c.key, c]));

export const isAlumniCareerKey = (v: unknown): v is AlumniCareerKey => typeof v === 'string' && BY_KEY.has(v);

/** "Sales & Trading"; an unknown or empty key reads as nothing. */
export function alumniCareerLabel(key: string | null | undefined): string {
  return (key && BY_KEY.get(key)?.label) || '';
}

/** What an area covers, by its key or by its label. */
export function alumniCareerCovers(keyOrLabel: string | null | undefined): string {
  if (!keyOrLabel) return '';
  const hit = BY_KEY.get(keyOrLabel) ?? ALUMNI_CAREERS.find((c) => c.label === keyOrLabel);
  return hit?.covers ?? '';
}

/** The areas, as options for a select, in the list's order. */
export const ALUMNI_CAREER_OPTIONS = ALUMNI_CAREERS.map((c) => ({ value: c.key, label: c.label }));

/** The heading and the note of "Where alumni work", shared by the page and its static copy. */
export const WHERE_ALUMNI_WORK = {
  heading: 'Where alumni work',
  intro: 'Every alumnus in the directory, in one of twelve career areas, worked out from the role and the employer each has recorded.',
  without: (n: number) => `${n} ${n === 1 ? 'alumnus has' : 'alumni have'} not recorded a role or an employer yet.`,
};
