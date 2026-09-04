// =====================================================================
// Who owes the semester membership fee, in one place.
// ---------------------------------------------------------------------
// The rule itself is short: an advisor does not pay. An advisor is an
// alumnus appointed to advise the association, not a dues-paying member
// of it, so they belong to no collection, count towards no total, and
// enter no semester register.
//
// The rule was already true in one place - the edge function that opens
// and closes a collection - and false in three others: the workspace
// calendar put a fee deadline in front of them, the dashboard made that
// deadline their headline update, and a member appointed advisor
// mid-collection kept the fee row they had been given while they were
// still a member.
//
// One list, read by all of them, is what stops those from drifting apart
// again. The edge functions cannot import from `src/`, so they carry the
// same list verbatim with a comment pointing here; the constant is small
// and stable enough that this is the lesser evil compared with an extra
// round trip on every fee operation.
// =====================================================================

import { normalizeRole, type AppRole } from '@/lib/roles';

/**
 * Roles that never contribute to the membership fee.
 *
 * `silent_advisor` is the same appointment without the public listing, so
 * it follows the advisor in every respect that touches money.
 */
export const FEE_EXEMPT_ROLES: AppRole[] = ['advisor', 'silent_advisor'];

/** Is this role outside the membership fee entirely? */
export function isFeeExemptRole(role: AppRole | string | null | undefined): boolean {
  if (!role) return false;
  return FEE_EXEMPT_ROLES.includes(normalizeRole(role as AppRole));
}

/**
 * Is this person outside the membership fee, given every role they hold?
 *
 * Deliberately ALL, not ANY: somebody who is an advisor and nothing else
 * is exempt, but a president who is also listed as an advisor is still a
 * member of the association and still pays. Reading it the other way
 * would let a second role quietly excuse a member from the fee.
 */
export function isFeeExempt(roles: (AppRole | string)[] | null | undefined): boolean {
  if (!roles || roles.length === 0) return false;
  return roles.every((r) => isFeeExemptRole(r));
}
