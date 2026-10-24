// =====================================================================
// board.ts: the Board of Directors on the public Members page (Step 94).
// ---------------------------------------------------------------------
// The Board is the Statute's (Art. 14): the officers (President,
// Vice-President, Head of Asset Management), then the heads of the five
// divisions, of Media & Communication and of Operations. It is shown with
// each person's office, name and LinkedIn profile when they added one,
// and the photographs they chose to publish, in one grid.
//
// THE SAME FACTS FOR PEOPLE AND MACHINES. The structured data built here
// (schema.org Person, one per Board member on the page) states exactly
// what the page prints: the name, the office and, for those who added
// it, the LinkedIn address. No email or private fields. Its
// `@id` is the person's own line on the page.
//
// No imports, so that scripts/people.test.mjs can load and check it.
// =====================================================================

export interface BoardMember {
  id: string;
  name: string;
  surname: string;
  /** The stored position, e.g. 'Head of Media', 'Co-Head of Equity Research'. */
  position: string;
  linkedinUrl?: string;
}

/** Officers below 50, heads from 50, in the Statute's order. */
const OFFICE_ORDER: Record<string, number> = {
  'President': 10,
  'Vice President': 20,
  'Head of Asset Management': 30,
  'Head of Equity Research': 50, 'Co-Head of Equity Research': 51,
  'Head of Investment Research': 52, 'Co-Head of Investment Research': 53,
  'Head of Macro Research': 54, 'Co-Head of Macro Research': 55,
  'Head of Portfolio Management': 56, 'Co-Head of Portfolio Management': 57,
  'Head of Quantitative Research': 58, 'Co-Head of Quantitative Research': 59,
  'Head of Media': 70, 'Co-Head of Media': 71,
  'Head of Operations': 72, 'Co-Head of Operations': 73,
};

/** The office as the Statute names it. */
export function officeLabel(position: string): string {
  if (position === 'Head of Media') return 'Head of Media & Communication';
  if (position === 'Co-Head of Media') return 'Co-Head of Media & Communication';
  return position;
}

export function officeRank(position: string): number | null {
  return OFFICE_ORDER[position] ?? null;
}

export interface BoardGroups<T extends BoardMember> {
  officers: T[];
  heads: T[];
  advisors: T[];
}

/** The Board in its two parts, and the advisors who assist it. */
export function boardGroups<T extends BoardMember>(members: T[]): BoardGroups<T> {
  const byRank = (a: T, b: T) =>
    (officeRank(a.position)! - officeRank(b.position)!) || a.surname.localeCompare(b.surname, 'en');
  const onBoard = members.filter((m) => officeRank(m.position) !== null);
  return {
    officers: onBoard.filter((m) => officeRank(m.position)! < 50).sort(byRank),
    heads: onBoard.filter((m) => officeRank(m.position)! >= 50).sort(byRank),
    advisors: members.filter((m) => m.position === 'Advisor')
      .sort((a, b) => a.surname.localeCompare(b.surname, 'en')),
  };
}

const LINKEDIN = /^https:\/\/([a-z0-9-]+\.)*linkedin\.com\/[^\s]*$/i;

/**
 * One schema.org Person per Board member shown on the page: name, office,
 * the Society they belong to, and the LinkedIn profile they added.
 */
export function boardPersonsJsonLd(
  members: BoardMember[],
  opts: { siteUrl: string; organizationId: string; pagePath: string },
): Record<string, unknown>[] {
  const { officers, heads } = boardGroups(members);
  return [...officers, ...heads].map((m) => {
    const name = `${m.name} ${m.surname}`.replace(/\s+/g, ' ').trim();
    const person: Record<string, unknown> = {
      '@type': 'Person',
      '@id': `${opts.siteUrl}${opts.pagePath}#person-${m.id}`,
      name,
      givenName: m.name.trim(),
      familyName: m.surname.trim(),
      jobTitle: officeLabel(m.position),
      memberOf: { '@id': opts.organizationId },
    };
    if (m.linkedinUrl && LINKEDIN.test(m.linkedinUrl)) person.sameAs = [m.linkedinUrl];
    return person;
  });
}

/** A past semester's Board, as public.public_past_boards() returns it. */
export interface PastBoard {
  key: string;
  label: string;
  board: { office: string; name: string; group: 'officer' | 'head'; linkedin_url?: string }[];
}
