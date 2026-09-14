// =====================================================================
// WHICH ADDRESSES THE ASSOCIATION ACCEPTS, AND WHY IT IS A LIST.
// ---------------------------------------------------------------------
// Bocconi does not issue one domain, it issues three, and which one a
// person has is an accident of what they are studying and when they
// enrolled:
//
//   studbocconi.it         undergraduates and most students
//   master.unibocconi.it   several of the graduate programmes
//   unibocconi.it          staff, faculty and some graduate accounts
//
// All three are the university. Accepting only the first turned the
// other two away from an association they are entitled to join, which is
// what this list corrects.
//
// IT IS A LIST OF WHOLE DOMAINS, COMPARED FOR EQUALITY, and deliberately
// not a pattern. A regular expression written the obvious way
// (`/unibocconi\.it$/`) also accepts `notunibocconi.it`, and one written
// carefully still has to be written carefully in every one of the four
// places that asks the question. Equality against a fixed list cannot be
// got subtly wrong.
//
// THE SERVER KEEPS ITS OWN COPY, at
// supabase/functions/_shared/bocconi-email.ts, because an edge function
// cannot import from `src/`. The two must be changed together; each
// names the other.
// =====================================================================

/** Every domain the association accepts for a new account. */
export const ALLOWED_EMAIL_DOMAINS = [
  'studbocconi.it',
  'master.unibocconi.it',
  'unibocconi.it',
] as const;

/**
 * The domain part of an address, lowercased, or '' if there is not
 * exactly one.
 *
 * EXACTLY ONE `@`, AND SOMETHING ON BOTH SIDES OF IT. Reading the domain
 * as "whatever follows the last @" accepts
 * `someone@example.com?x=@unibocconi.it`, which is not an address at all
 * but does end in a domain on the list. Nothing downstream would have
 * sent mail to it, and the forms reject it before this is ever asked, but
 * a function whose whole job is to answer "is this ours" should not be
 * the part that says yes.
 *
 * An address whose local part is quoted may legitimately contain an `@`
 * (`"a@b"@example.com`). No Bocconi address is written that way, and the
 * cost of refusing one is a person being asked to check their address,
 * against the cost of accepting something crafted. It refuses.
 */
export function emailDomain(email: string): string {
  const parts = (email || '').trim().split('@');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return '';
  return parts[1].toLowerCase();
}

/** Is this an address the association accepts for a new account? */
export function isAllowedBocconiEmail(email: string): boolean {
  return (ALLOWED_EMAIL_DOMAINS as readonly string[]).includes(emailDomain(email));
}

/** The three domains as a person would read them out. */
export const ALLOWED_DOMAINS_SENTENCE = '@studbocconi.it, @master.unibocconi.it or @unibocconi.it';

/** What to tell somebody whose address is not one of them. */
export const DOMAIN_REJECTED_MESSAGE =
  `Please use your Bocconi address: ${ALLOWED_DOMAINS_SENTENCE}.`;

/** The placeholder every address field on the site shows. */
export const EMAIL_PLACEHOLDER = 'name.surname@studbocconi.it';
