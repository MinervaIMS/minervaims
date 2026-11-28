// =====================================================================
// ALUMNI CAREER AREAS, FOR THE EDGE FUNCTIONS (Steps 107 and 112).
// ---------------------------------------------------------------------
// The keys of src/lib/alumni-careers.ts, in the same order: a function is
// deployed with its own folder and _shared only, so it keeps its own copy
// (scripts/alumni-careers.test.mjs checks the two say the same, and both
// say what the database's public.alumni_career_keys says).
// =====================================================================

export const ALUMNI_CAREER_KEYS = [
  'investment_banking', 'markets', 'market_operations', 'asset_management', 'private_markets',
  'hedge_funds', 'research', 'public_policy', 'risk_quant', 'consulting', 'corporate',
  'entrepreneurship', 'academia', 'other',
] as const;

export type AlumniCareerKey = (typeof ALUMNI_CAREER_KEYS)[number];
