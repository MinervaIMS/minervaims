// =====================================================================
// THE MOBILE RULE, AND THERE IS ONLY ONE.
// ---------------------------------------------------------------------
// EVERY PAGE OF THE WORKSPACE OPENS ON A PHONE, and NOTHING CAN BE
// CHANGED FROM ONE.
//
// This used to be a table with a line per subsection and three possible
// answers: 'full' (works as on a computer), 'view' (opens, read-only) and
// 'no' (listed in the navigation but refused, with a card explaining that
// it needs a desktop). Nineteen subsections were on 'no', which meant a
// member who happened to be away from their computer could not so much as
// LOOK at the recruiting pipeline, the treasury, the user list or the
// activity log. Reading is not the risky half of any of those pages.
//
// So the table is gone and the answer is the same everywhere:
//
//   * WHAT YOU MAY OPEN is decided by your role, exactly as on the
//     desktop. This rule adds nothing and takes nothing away there: a
//     page your role cannot see stays invisible on a phone too.
//   * WHAT YOU MAY DO on a phone is: read. Every write is withheld,
//     for every role, on every page, including the President's.
//
// IT IS A CAP AND NEVER A GRANT. It can only ever lower an access level
// (`useAccess` reduces 'edit' and 'manage' to 'view' below the desktop
// breakpoint); it can never raise one. That is what makes "role
// permissions still apply, and editing is never allowed" a single
// sentence rather than two rules that could disagree.
//
// A subsection added tomorrow is covered without being listed, because
// there is no list left to forget it in.
// =====================================================================

/**
 * What a subsection offers on a phone.
 *
 * `'full'` is kept in the type deliberately: it is the shape the rule
 * would take again if a page were ever allowed to be edited from a phone,
 * and keeping it makes that a one-line change rather than a refactor.
 * Nothing returns it today.
 */
export type MobilePolicy = 'full' | 'view';

/** The rule, for every subsection there is and every one still to come. */
export const MOBILE_POLICY: MobilePolicy = 'view';

/**
 * What the given subsection offers on a phone. The answer no longer
 * depends on which subsection is asked about.
 */
export function mobilePolicyFor(_key?: string | null): MobilePolicy {
  return MOBILE_POLICY;
}
