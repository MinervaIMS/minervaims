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
//
// ---------------------------------------------------------------------
// ONE EXCEPTION, AND IT IS THE PAGE THE RULE WAS ALWAYS WRONG ABOUT.
//
// TAKING ATTENDANCE IS A PHONE TASK. It is done standing at a door with
// a queue in front of you, ticking people off as they arrive and adding
// the ones who turned up without registering. There is no desktop at the
// door. "Read-only on mobile" meant the one job that cannot be done at a
// computer was the one job the workspace would not let you do away from
// one, and the association took the register on paper instead and typed
// it up afterwards.
//
// So `events-attendance` is 'full'. Everything else is unchanged, and the
// exception is narrow on purpose: it is a list of one, in one place, and
// a page is added to it only when it is genuinely done away from a desk.
//
// THE ROLE STILL DECIDES. This is still a cap and still never a grant:
// 'full' means the mobile cap does not lower the level, not that anybody
// gets one. A reader with 'view' on Attendance still only reads it, on a
// phone exactly as on a computer, and the edge function checks again.
// =====================================================================

/**
 * What a subsection offers on a phone.
 *
 * `'view'` for everything except the subsections listed below, which are
 * done away from a desk and keep their writes on a phone.
 */
export type MobilePolicy = 'full' | 'view';

/** The rule, for every subsection there is and every one still to come. */
export const MOBILE_POLICY: MobilePolicy = 'view';

/**
 * The subsections that are done away from a desk, and so keep their
 * writes on a phone. See the exception above before adding to it.
 */
export const MOBILE_FULL_SUBSECTIONS = new Set<string>(['events-attendance']);

/** What the given subsection offers on a phone. */
export function mobilePolicyFor(key?: string | null): MobilePolicy {
  return key && MOBILE_FULL_SUBSECTIONS.has(key) ? 'full' : MOBILE_POLICY;
}
