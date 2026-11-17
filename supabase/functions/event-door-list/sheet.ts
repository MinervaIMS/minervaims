// =====================================================================
// THE DOOR LIST, AS ROWS (Step 106D): who is on it, in what order, and
// what each line says. Pure, so the order can be tested on its own
// (scripts/door-list.test.mjs); pdf.ts draws it.
// ---------------------------------------------------------------------
// ALPHABETICAL BY SURNAME, the way a register is read at a door. The
// public form asks for a name and a surname separately but keeps them as
// one field, so the surname is:
//   * for a member recognised on the register, the register's own surname
//     (exact);
//   * for anybody else, the last word of the name, together with the small
//     words that belong to a surname ("De Luca", "Van der Berg", "La Rosa"),
//     never taking the whole name.
// Each line prints "Surname, Name", so the order can be followed by eye.
// =====================================================================

export interface DoorRegistration {
  id: string;
  name: string | null;
  email?: string | null;
  attended: boolean | null;
  checked_in_at: string | null;
  programme?: string | null;
  affiliation?: string | null;
  is_bocconi?: boolean | null;
}

export interface DoorMember {
  id: string;
  first_name: string | null;
  surname: string | null;
  division: string | null;
}

export interface DoorRow {
  /** Position in the alphabetical list, from 1. */
  n: number;
  surname: string;
  given: string;
  /** "Member, Equity Research" or "Guest, MSc in Finance". */
  kind: string;
  member: boolean;
  /** Checked in when the list was made, and when. */
  attended: boolean;
  checkedInAt: string | null;
  /** The letter of the alphabet the line is filed under ("#" after Z). */
  letter: string;
  /** The address, printed only when the name is in a script the sheet's typefaces lack. */
  fallback: string | null;
}

/** Small words that belong to the surname after them. Lower case. */
export const SURNAME_PARTICLES = new Set([
  'de', 'di', 'da', 'del', 'dei', 'degli', 'della', 'delle', 'dello', 'dal', 'dalla', 'dalle', 'dall',
  'van', 'von', 'der', 'den', 'ter', 'te', 'du', 'des', 'dos', 'das', 'do',
  'la', 'le', 'lo', 'li', 'st', 'st.', 'san', 'santa', 'al', 'el', 'bin', 'ibn', 'ben', 'mac',
]);

const tidy = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();

/** "Maria De Luca" -> { given: "Maria", surname: "De Luca" }. A single word is the surname. */
export function splitName(full: string | null | undefined): { given: string; surname: string } {
  const words = tidy(full).split(' ').filter(Boolean);
  if (words.length === 0) return { given: '', surname: '' };
  if (words.length === 1) return { given: '', surname: words[0] };
  let start = words.length - 1;
  while (start > 1 && SURNAME_PARTICLES.has(words[start - 1].toLowerCase())) start -= 1;
  return { given: words.slice(0, start).join(' '), surname: words.slice(start).join(' ') };
}

/** For sorting and filing: no accents, no case, no apostrophes or spaces. */
export function foldKey(s: string): string {
  return s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/** The letter a surname is filed under ("#" for one that starts with no letter). */
export function letterOf(surname: string): string {
  const c = foldKey(surname).charAt(0).toUpperCase();
  return /[A-Z]/.test(c) ? c : '#';
}

export interface DivisionLabeller { (key: string | null | undefined): string }

/**
 * The door list: every registration, alphabetical by surname then name.
 * `memberOf` says which member a registration is (the database's one
 * definition, public.event_registration_members); a member's name and
 * division come from the register.
 */
export function doorRows(
  regs: DoorRegistration[],
  memberOf: Map<string, string>,
  members: Map<string, DoorMember>,
  divisionLabel: DivisionLabeller,
): DoorRow[] {
  const rows = regs.map((r) => {
    const m = members.get(memberOf.get(r.id) ?? '');
    let given: string, surname: string;
    if (m && tidy(m.surname)) { given = tidy(m.first_name); surname = tidy(m.surname); }
    else ({ given, surname } = splitName(r.name || r.email || ''));
    if (!surname) surname = 'Name not given';
    const guestDetail = tidy(r.programme) || tidy(r.affiliation) || (r.is_bocconi ? 'Bocconi' : '');
    const kind = m
      ? `Member${m.division && m.division !== 'none' ? `, ${divisionLabel(m.division)}` : ''}`
      : `Guest${guestDetail ? `, ${guestDetail}` : ''}`;
    return { surname, given, kind, member: !!m, attended: !!r.attended, checkedInAt: r.attended ? r.checked_in_at : null, fallback: tidy(r.email) || null };
  });
  // A surname that starts with no letter of the Latin alphabet is filed
  // last, under "#", rather than first.
  const hash = (x: { surname: string }) => (letterOf(x.surname) === '#' ? 1 : 0);
  rows.sort((a, b) => hash(a) - hash(b)
    || foldKey(a.surname).localeCompare(foldKey(b.surname), 'en')
    || foldKey(a.given).localeCompare(foldKey(b.given), 'en')
    || a.surname.localeCompare(b.surname, 'en'));
  return rows.map((r, i) => ({ ...r, n: i + 1, letter: letterOf(r.surname) }));
}

/** A file name every system accepts: "MIMS Door list 19 November 2026 Winter Aperitivo.pdf". */
export function doorListFileName(title: string, day: string): string {
  const clean = `${day} ${title}`.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
  return `MIMS Door list ${clean || 'event'}.pdf`;
}
