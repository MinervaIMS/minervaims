// =====================================================================
// ALUMNI CAREER AREAS (Steps 107 and 112).
// ---------------------------------------------------------------------
// Fourteen areas, one per alumnus, in place of the job areas as typed (61
// spellings for 335 people). The database works each one out from the
// job area AND the employer (public.alumni_career_area, migrations
// 20261124090000 and 20261129090100: Step 112 added Market Operations &
// Infrastructure and Public Institutions & Policy, so clearing is no
// longer read as trading nor a central bank as research) and keeps it in
// step on every write; a person in the
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
  'investment_banking', 'markets', 'market_operations', 'asset_management', 'private_markets',
  'hedge_funds', 'research', 'public_policy', 'risk_quant', 'consulting', 'corporate',
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
  { key: 'markets', label: 'Sales & Trading', covers: 'Sales, trading and structuring of equities, fixed income, currencies and derivatives, treasury and brokerage.' },
  { key: 'market_operations', label: 'Market Operations & Infrastructure', covers: 'Clearing, settlement, custody and post-trade, and the roles at exchanges, clearing houses and securities depositories.' },
  { key: 'asset_management', label: 'Asset & Wealth Management', covers: 'Investment and portfolio teams at asset managers, wealth management, private banking and family offices.' },
  { key: 'private_markets', label: 'Private Markets', covers: 'Private equity, venture capital, private credit, infrastructure and real estate investing.' },
  { key: 'hedge_funds', label: 'Hedge Funds & Trading Firms', covers: 'Hedge funds, quantitative funds and proprietary trading firms.' },
  { key: 'research', label: 'Research & Ratings', covers: 'Equity, credit and macro research, ratings and financial data, at banks, agencies and data providers.' },
  { key: 'public_policy', label: 'Public Institutions & Policy', covers: 'Economics, policy and supervision at central banks, international institutions, regulators and public bodies.' },
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
  intro: 'Every alumnus in the directory, in one of fourteen career areas, worked out from the role and the employer each has recorded.',
  without: (n: number) => `${n} ${n === 1 ? 'alumnus has' : 'alumni have'} not recorded a role or an employer yet.`,
};

/**
 * FIRMS WHERE ALUMNI WORK (Step 112), shared by the Track Record page, its
 * static copy and llms-full.txt: every employer recorded in the directory,
 * as people read it and as search engines and language models read it.
 */
export const ALUMNI_FIRMS = {
  heading: 'Firms where alumni work',
  intro: (n: number) => `Every employer recorded in the alumni directory: ${n} firms and institutions, in alphabetical order.`,
};

/** The employers as a clean list: trimmed, each once whatever its capitals, in alphabetical order. */
export function alumniFirmNames(companies: unknown): string[] {
  if (!Array.isArray(companies)) return [];
  const seen = new Map<string, string>();
  for (const c of companies) {
    if (typeof c !== 'string') continue;
    const name = c.trim().replace(/\s+/g, ' ');
    if (!name || name === '-') continue;
    const key = name.toLocaleLowerCase('en-GB');
    if (!seen.has(key)) seen.set(key, name);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, 'en-GB', { sensitivity: 'base' }));
}
