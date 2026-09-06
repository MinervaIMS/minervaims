// =====================================================================
// access.ts — the access matrix, on the server side.
// ---------------------------------------------------------------------
// WHY THIS FILE EXISTS.
//
// The workspace decides what a person may open from ONE table, in
// `src/lib/access/matrix.ts`. Every edge function decided the same
// question from a hand-written array at the top of its own file:
//
//     const MANAGE = ['admin', 'president', 'vice_president', ...];
//
// Twenty-odd arrays, each written when its function was written, none of
// them consulted when the matrix changed. They drifted, and the way that
// drift SHOWS is a page that opens and stays empty: the navigation asks
// the matrix, which says yes, and the data asks the function, which says
// no. The refusal arrives as a toast that a member reads once and then
// stops reading, so what is left on screen is a subsection with nothing
// in it and no explanation.
//
// It was not a hypothetical. Every one of these was live:
//
//   * THE ADVISOR SAW NOTHING, ANYWHERE. The role is granted `'*': 'view'`
//     - every subsection, read-only - and that wildcard exists only in the
//     client matrix. No function's array contains the string 'advisor', so
//     the editorial calendar, the treasury, the FAQs, the fees, the fund
//     performances and the rest all opened blank. The one page an advisor
//     is appointed to read is the whole workspace.
//
//   * THE HEAD OF OPERATIONS could not read the editorial calendar or the
//     ads register, both of which the matrix grants them.
//
//   * A HEAD OF DIVISION could not read the fund performances unless the
//     division happened to be `portfolio`, though the matrix grants the
//     role outright.
//
//   * THE VICE PRESIDENT could not read Settings > Users, which the matrix
//     grants as 'view'.
//
// So the arrays are replaced by the matrix itself. This file is the same
// data as `src/lib/access/matrix.ts` and must be edited WITH it; a grant
// that appears on one side and not the other is exactly the bug this
// removes. Keeping them as two files is deliberate: the client bundle and
// the Deno runtime share no module graph, and a copy that is checked is
// safer than an import that cannot exist.
//
// ---------------------------------------------------------------------
// WHAT THIS IS NOT.
//
// It is not a relaxation. Nothing here grants anything the matrix did not
// already grant; it only stops functions refusing what the matrix grants.
// The refusals that ARE deliberate - the offers flow reserved to the
// President, the treasury being append-only for the Board, a candidate
// isolated from everything - are unaffected, because they are expressed
// as their own checks and not as membership of one of these arrays.
//
// READ AND MANAGE ARE ANSWERED SEPARATELY, always. A function that used
// one array for both was, in effect, declaring that anybody allowed to
// look was allowed to write, and the only way to keep writes safe was to
// refuse the look. That is the trade this file removes.
// =====================================================================

export type Level = 'none' | 'view' | 'edit' | 'manage';

const ORDER: Record<Level, number> = { none: 0, view: 1, edit: 2, manage: 3 };

/** The association account. Holds everything, by construction. */
export const OWNER_EMAIL = 'as.minerva@unibocconi.it';

type Grants = Record<string, Level>;

/** Full access: every resource, at manage. */
const FULL: Grants = { '*': 'manage' };

// Baseline pages any signed-in member role can at least view.
const BASELINE = ['my-role', 'welcome', 'dashboard', 'calendar'];

// ---------------------------------------------------------------------
// MIRROR OF `DEFAULT_MATRIX` in src/lib/access/matrix.ts.
// Edit the two together. Anything not listed is 'none'.
// ---------------------------------------------------------------------
export const MATRIX: Record<string, Grants> = {
  admin: FULL,
  president: FULL,
  vice_president: {
    'my-role': 'manage', 'dashboard': 'view', 'welcome': 'view', 'calendar': 'manage',
    'reports-upload': 'manage', 'reports-archive': 'manage', 'reports-templates': 'manage', 'reports-funds': 'manage',
    'applications-website': 'manage', 'applications-screening': 'manage', 'applications-interview-calendar': 'manage',
    'applications-joiners': 'view', 'applications-form': 'manage',
    'events-create': 'manage', 'events-forms': 'manage', 'events-attendance': 'manage', 'events-archive': 'manage',
    'events-alumni-calls': 'manage', 'events-on-display': 'manage',
    'people-members': 'manage', 'people-alumni': 'view',
    'smm-editorial': 'manage', 'smm-ig': 'manage', 'smm-li': 'manage', 'smm-graphics': 'manage',
    'smm-other': 'manage', 'smm-brand': 'manage', 'smm-ads': 'manage',
    'ops-fee': 'manage', 'ops-treasury': 'manage', 'ops-external': 'manage', 'ops-docs': 'manage',
    'website-pages': 'view', 'website-readings': 'manage', 'website-testimonials': 'manage',
    'website-history': 'manage', 'website-faqs': 'manage',
    'ops-newsletter': 'view', 'ops-auto-emails': 'view',
    'settings-users': 'view', 'settings-roles': 'view', 'settings-mobile': 'view', 'settings-activity': 'view',
  },
  head_of_asset_management: {
    'my-role': 'manage', 'dashboard': 'view', 'welcome': 'view', 'calendar': 'view',
    'reports-upload': 'manage', 'reports-archive': 'manage', 'reports-templates': 'manage', 'reports-funds': 'manage',
    'applications-screening': 'manage', 'applications-interview-calendar': 'manage',
    'applications-joiners': 'view', 'applications-form': 'manage',
    'events-attendance': 'view', 'events-archive': 'view', 'events-alumni-calls': 'manage', 'events-on-display': 'view',
    'people-members': 'view', 'people-alumni': 'view',
    'smm-editorial': 'view', 'smm-ig': 'view', 'smm-li': 'view', 'smm-graphics': 'view',
    'smm-other': 'view', 'smm-brand': 'view', 'smm-ads': 'view',
    'ops-treasury': 'view', 'ops-external': 'view', 'ops-docs': 'view',
    'website-readings': 'manage',
  },
  head_of_division: {
    'my-role': 'manage', 'dashboard': 'view', 'welcome': 'view', 'calendar': 'view',
    'reports-upload': 'manage', 'reports-archive': 'manage', 'reports-templates': 'manage', 'reports-funds': 'manage',
    'applications-screening': 'manage', 'applications-interview-calendar': 'manage',
    'applications-joiners': 'view', 'applications-form': 'manage',
    'events-attendance': 'view', 'events-archive': 'view', 'events-alumni-calls': 'manage', 'events-on-display': 'view',
    'people-members': 'view', 'people-alumni': 'view',
    'ops-treasury': 'view', 'ops-external': 'view', 'ops-docs': 'view',
    'website-readings': 'manage',
  },
  portfolio_manager: {
    'my-role': 'manage', 'dashboard': 'view', 'welcome': 'view', 'calendar': 'view',
    'reports-archive': 'view', 'reports-templates': 'manage', 'reports-funds': 'manage',
    'applications-screening': 'view', 'applications-interview-calendar': 'view', 'applications-joiners': 'view',
    'events-archive': 'view', 'events-on-display': 'view',
    'people-members': 'view', 'people-alumni': 'view', 'website-readings': 'manage',
  },
  team_leader: {
    'my-role': 'manage', 'dashboard': 'view', 'welcome': 'view', 'calendar': 'view',
    'reports-archive': 'view', 'reports-templates': 'manage',
    'applications-screening': 'view', 'applications-interview-calendar': 'view', 'applications-joiners': 'view',
    'events-archive': 'view', 'events-on-display': 'view',
    'people-members': 'view', 'people-alumni': 'view', 'website-readings': 'manage',
  },
  senior_analyst: {
    'my-role': 'manage', 'dashboard': 'view', 'welcome': 'view', 'calendar': 'view',
    'reports-archive': 'view', 'reports-templates': 'manage',
    'events-on-display': 'view', 'people-members': 'view', 'people-alumni': 'view', 'website-readings': 'view',
  },
  analyst: {
    'my-role': 'manage', 'dashboard': 'view', 'welcome': 'view', 'calendar': 'view',
    'reports-archive': 'view', 'reports-templates': 'view',
    'events-on-display': 'view', 'people-members': 'view', 'people-alumni': 'view', 'website-readings': 'view',
  },
  head_of_media: {
    'my-role': 'manage', 'dashboard': 'view', 'welcome': 'view', 'calendar': 'view',
    'events-attendance': 'manage', 'events-archive': 'manage', 'events-alumni-calls': 'view', 'events-on-display': 'view',
    'smm-editorial': 'manage', 'smm-ig': 'manage', 'smm-li': 'manage', 'smm-graphics': 'manage',
    'smm-other': 'manage', 'smm-brand': 'manage', 'smm-ads': 'manage',
    'ops-external': 'manage', 'ops-docs': 'manage',
  },
  media_analyst: {
    'my-role': 'manage', 'dashboard': 'view', 'welcome': 'view', 'calendar': 'view',
    'events-on-display': 'view',
    'smm-editorial': 'view', 'smm-ig': 'manage', 'smm-li': 'manage', 'smm-graphics': 'manage',
    'smm-other': 'manage', 'smm-brand': 'view', 'smm-ads': 'view',
  },
  head_of_operations: {
    'my-role': 'manage', 'dashboard': 'view', 'welcome': 'view', 'calendar': 'manage',
    'events-create': 'manage', 'events-forms': 'manage', 'events-attendance': 'manage',
    'events-archive': 'manage', 'events-on-display': 'manage',
    'people-members': 'manage', 'people-alumni': 'view',
    'smm-editorial': 'view', 'smm-brand': 'view', 'smm-ads': 'view',
    'ops-fee': 'manage', 'ops-treasury': 'manage', 'ops-external': 'manage', 'ops-docs': 'manage',
    'website-pages': 'view', 'website-readings': 'view', 'website-testimonials': 'manage',
    'website-history': 'manage', 'website-faqs': 'manage',
    'ops-newsletter': 'view', 'ops-auto-emails': 'view',
  },
  // Everything, read-only, minus Settings (see DENY). See the matrix for why.
  advisor: { '*': 'view', 'my-role': 'manage' },
  alumni: { 'my-role': 'manage', 'dashboard': 'view', 'welcome': 'view', 'calendar': 'view' },
  // member / pending / candidate deliberately have no general grants.
};

// A wildcard grant needs a way to say "everything EXCEPT". Scoped to the
// ROLE that carries it: a president who is also listed as an advisor keeps
// what the presidency gives.
const DENY: Record<string, string[]> = {
  advisor: ['settings-users', 'settings-roles', 'settings-mobile', 'settings-activity'],
};

// Legacy division-baked head roles, and the retired silent advisor.
const LEGACY: Record<string, string> = {
  head_of_equity: 'head_of_division',
  head_of_investment: 'head_of_division',
  head_of_macro: 'head_of_division',
  head_of_portfolio: 'head_of_division',
  head_of_quant: 'head_of_division',
  silent_advisor: 'advisor',
};

/** Canonical form of a stored role. */
export function normalizeRole(role: string): string {
  return LEGACY[role] ?? role;
}

/** The effective level a set of stored roles has on a resource. */
export function resolveLevel(roles: string[], resource: string): Level {
  let level: Level = 'none';
  for (const raw of roles) {
    const role = normalizeRole(raw);
    const grants = MATRIX[role];
    if (!grants) continue;
    if (DENY[role]?.includes(resource)) continue;
    const wildcard = grants['*'];
    if (wildcard && ORDER[wildcard] > ORDER[level]) level = wildcard;
    const exact = grants[resource];
    if (exact && ORDER[exact] > ORDER[level]) level = exact;
  }
  if (level === 'none' && BASELINE.includes(resource)) {
    const hasAnyGrant = roles.some((r) => {
      const g = MATRIX[normalizeRole(r)];
      return g && Object.keys(g).length > 0;
    });
    if (hasAnyGrant) return 'view';
  }
  return level;
}

/**
 * The one question an edge function asks.
 *
 * `email` is checked against the association account, which holds
 * everything regardless of the rows in `user_roles`; every other caller is
 * answered from the matrix, exactly as the navigation answered it.
 */
export function allows(
  roles: string[],
  email: string | undefined | null,
  resource: string,
  required: Level = 'view',
): boolean {
  if (email && email === OWNER_EMAIL) return true;
  return ORDER[resolveLevel(roles, resource)] >= ORDER[required];
}

/** True if any of these resources is readable. For pages backed by several. */
export function allowsAny(
  roles: string[],
  email: string | undefined | null,
  resources: string[],
  required: Level = 'view',
): boolean {
  return resources.some((r) => allows(roles, email, r, required));
}

/**
 * Read the caller's roles once, from the row shape every function uses.
 * Accepts the `{ role, division }` rows as selected, and returns the plain
 * role strings the helpers above expect.
 */
export function rolesOf(rows: { role: string }[] | null | undefined): string[] {
  return (rows ?? []).map((r) => r.role);
}
