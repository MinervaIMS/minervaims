// =====================================================================
// IS THE PERSON ON THIS REGISTRATION ONE OF OURS?
// ---------------------------------------------------------------------
// The event form does not require signing in, and it should not: half the
// point of a public event is that somebody who has never heard of the
// association can put their name down. But members use that same form,
// and when they do, nothing connects what they typed to the member they
// already are. The registration is stored with `is_member = false`,
// because that column records whether an ACCOUNT was attached at the
// moment of registering, and the door list then calls a Head of Division
// an external guest.
//
// So the question is asked again when the list is read, against the
// register of members, and answered with HOW CONFIDENT THE ANSWER IS
// rather than with a bare yes.
//
//   account  the registration carries a user id that belongs to a member.
//            Not a guess at all: they were signed in.
//   email    the address on the registration is a member's address.
//            An address identifies one person, so this is as good as
//            certain.
//   name     the name matches exactly one member and nothing else does.
//            Probable, and the interface says so rather than pretending.
//   none     nobody, or more than one.
//
// "MORE THAN ONE" IS DELIBERATELY NOT A MATCH. Two members called the
// same thing means we do not know which of them registered, and naming
// one of them would be worse than saying nothing: attendance is what the
// association counts membership obligations from. An ambiguous row is
// reported as ambiguous and left for a person to settle.
// =====================================================================

export type MemberMatch = 'account' | 'email' | 'name' | 'none';

export interface MemberLike {
  id: string;
  user_id: string | null;
  first_name: string;
  surname: string;
  email: string | null;
  division: string | null;
  membership_status?: string | null;
}

export interface RegistrationLike {
  user_id: string | null;
  name: string | null;
  email: string | null;
}

export interface MatchResult {
  /** How the person was recognised, if at all. */
  member_match: MemberMatch;
  /** The member they were recognised as, in the register's own spelling. */
  member_name: string | null;
  member_division: string | null;
  /**
   * The name matched more than one member, so no claim is made. Shown to
   * the reader, because it is the one case a person has to settle.
   */
  member_ambiguous: boolean;
}

/**
 * A name reduced to what two spellings of the same person share.
 *
 * Accents off, case off, punctuation off (so "D'Amico" and "D Amico"
 * agree), and the words SORTED, because "Mario Rossi" and "Rossi Mario"
 * are the same person typed by two people in a hurry.
 *
 * Deliberately NOT fuzzy beyond that. "Mario Luigi Rossi" does not match
 * "Mario Rossi": under-matching leaves a member listed as external, which
 * somebody notices and can fix in one press, while over-matching quietly
 * credits attendance to the wrong person.
 */
export function normaliseName(raw: string | null | undefined): string {
  return (raw || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(' ');
}

/** An address reduced to what two spellings of it share. */
export function normaliseEmail(raw: string | null | undefined): string {
  return (raw || '').trim().toLowerCase();
}

/** The lookup tables, built once for a whole list of registrations. */
export interface MemberIndex {
  byUserId: Map<string, MemberLike>;
  byEmail: Map<string, MemberLike>;
  /** Name to every member carrying it, so ambiguity is visible. */
  byName: Map<string, MemberLike[]>;
}

export function buildMemberIndex(members: MemberLike[]): MemberIndex {
  const byUserId = new Map<string, MemberLike>();
  const byEmail = new Map<string, MemberLike>();
  const byName = new Map<string, MemberLike[]>();
  for (const m of members) {
    if (m.user_id) byUserId.set(m.user_id, m);
    const e = normaliseEmail(m.email);
    if (e) byEmail.set(e, m);
    const n = normaliseName(`${m.first_name} ${m.surname}`);
    if (n) byName.set(n, [...(byName.get(n) || []), m]);
  }
  return { byUserId, byEmail, byName };
}

/** Full name as the register spells it. */
function fullName(m: MemberLike): string {
  return `${m.first_name} ${m.surname}`.trim();
}

/**
 * Recognise one registration, strongest evidence first.
 *
 * The order is the point: an account beats an address, an address beats a
 * name, and a name that is not unique beats nothing.
 */
export function matchRegistration(reg: RegistrationLike, index: MemberIndex): MatchResult {
  const none: MatchResult = {
    member_match: 'none', member_name: null, member_division: null, member_ambiguous: false,
  };

  if (reg.user_id) {
    const m = index.byUserId.get(reg.user_id);
    if (m) {
      return {
        member_match: 'account', member_name: fullName(m),
        member_division: m.division ?? null, member_ambiguous: false,
      };
    }
  }

  const email = normaliseEmail(reg.email);
  if (email) {
    const m = index.byEmail.get(email);
    if (m) {
      return {
        member_match: 'email', member_name: fullName(m),
        member_division: m.division ?? null, member_ambiguous: false,
      };
    }
  }

  const name = normaliseName(reg.name);
  if (name) {
    const hits = index.byName.get(name) || [];
    if (hits.length === 1) {
      return {
        member_match: 'name', member_name: fullName(hits[0]),
        member_division: hits[0].division ?? null, member_ambiguous: false,
      };
    }
    if (hits.length > 1) {
      // Recognised as a member, but not as WHICH member. No claim is made.
      return { ...none, member_ambiguous: true };
    }
  }

  return none;
}
