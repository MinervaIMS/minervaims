// =====================================================================
// The rules of the membership certificate, apart from the page itself:
// who may have one, how a role is named, which semester it is, who signs,
// and what a certificate number looks like. Plain functions, no I/O.
// =====================================================================

/** Roles that are not a membership: no certificate. */
const NOT_MEMBERSHIP = new Set(['advisor', 'silent_advisor', 'alumni', 'candidate', 'pending', 'admin']);

/** The Society's own account carries the president role; it is nobody. */
export const SOCIETY_ACCOUNT = 'as.minerva@unibocconi.it';

export interface MemberRow {
  id: string;
  first_name: string | null;
  surname: string | null;
  email: string | null;
  role: string | null;
  division: string | null;
  membership_status: string | null;
}

const STATUS_WORDS: Record<string, string> = {
  on_exchange: 'on exchange',
  one_semester_pause: 'on a one-semester pause',
  alumni: 'alumni',
  expelled: 'no longer a member',
  silent_advisor: 'an advisor',
};

/** Why this person cannot have a certificate, or null when they can. */
export function ineligibility(m: MemberRow | null): string | null {
  if (!m) return 'Certificates are for members of the Society, and your account is not on the register of members.';
  if ((m.email || '').trim().toLowerCase() === SOCIETY_ACCOUNT) return 'The Society’s own account is not a member.';
  const role = normaliseRole(m.role || '');
  if (NOT_MEMBERSHIP.has(role)) return 'Certificates are issued to the Society’s current members; advisors and alumni are not covered.';
  if ((m.membership_status || '') !== 'active') {
    const word = STATUS_WORDS[m.membership_status || ''] || 'not active';
    return `Certificates are issued to active members, and your membership is recorded as ${word}. The Head of Operations can help if this is wrong.`;
  }
  if (!(m.first_name || '').trim() || !(m.surname || '').trim()) return 'Your name is incomplete on the register of members. The Head of Operations can correct it.';
  return null;
}

// ── How a role is named. Mirrors roleLabel in src/lib/roles.ts. ──────────

const LEGACY_HEAD: Record<string, string> = {
  head_of_equity: 'equity', head_of_investment: 'investment', head_of_macro: 'macro',
  head_of_portfolio: 'portfolio', head_of_quant: 'quant',
};

export function normaliseRole(role: string): string {
  if (role in LEGACY_HEAD) return 'head_of_division';
  if (role === 'silent_advisor') return 'advisor';
  return role;
}

const DIVISION: Record<string, string> = {
  equity: 'Equity Research', investment: 'Investment Research', macro: 'Macro Research',
  portfolio: 'Portfolio Management', quant: 'Quantitative Research',
  media: 'Media & Communication', operations: 'Operations',
};

const BASE: Record<string, string> = {
  president: 'President', vice_president: 'Vice President', head_of_asset_management: 'Head of Asset Management',
  head_of_division: 'Head of Division', team_leader: 'Team Leader', senior_analyst: 'Senior Analyst',
  portfolio_manager: 'Portfolio Manager', analyst: 'Analyst', head_of_media: 'Head of Media & Communication',
  media_analyst: 'Media & Communication Analyst', operations_analyst: 'Operations Analyst', head_of_operations: 'Head of Operations', member: 'Member',
};

export function roleLabel(rawRole: string, rawDivision: string | null): string {
  const role = normaliseRole(rawRole);
  const div = rawDivision && rawDivision !== 'none' && rawDivision !== 'board' ? rawDivision : (LEGACY_HEAD[rawRole] ?? null);
  if (role === 'head_of_division' && div && DIVISION[div]) return `Head of ${DIVISION[div]}`;
  if ((role === 'analyst' || role === 'team_leader' || role === 'senior_analyst') && div && DIVISION[div] && div !== 'media' && div !== 'operations') {
    const suffix = role === 'analyst' ? 'Analyst' : role === 'team_leader' ? 'Team Leader' : 'Senior Analyst';
    return `${DIVISION[div]} ${suffix}`;
  }
  return BASE[role] ?? 'Member';
}

// ── The signatories, for the Board of Directors. ──────────────────────────

const BOARD_RANK: Record<string, number> = {
  president: 1, vice_president: 2, head_of_asset_management: 3, head_of_division: 4, head_of_media: 5, head_of_operations: 6,
};
const DIVISION_ORDER = ['equity', 'investment', 'macro', 'portfolio', 'quant'];

const SIGNING = new Set(['president', 'vice_president']);

export function isBoardRole(role: string): boolean {
  return normaliseRole(role) in BOARD_RANK;
}

export interface Signatory { name: string; title: string }

/**
 * Who signs: the President and the Vice President in office, in that
 * order, on behalf of the Board of Directors. Either may be missing; with
 * neither, the certificate is signed by the Board by name.
 */
export function boardSignatories(rows: MemberRow[]): Signatory[] {
  return rows
    .filter((m) => m.membership_status === 'active' && SIGNING.has(normaliseRole(m.role || ''))
      && (m.email || '').trim().toLowerCase() !== SOCIETY_ACCOUNT
      && (m.first_name || '').trim() && (m.surname || '').trim())
    .sort((a, b) => {
      const ra = BOARD_RANK[normaliseRole(a.role || '')] - BOARD_RANK[normaliseRole(b.role || '')];
      if (ra) return ra;
      const da = DIVISION_ORDER.indexOf(a.division || '') - DIVISION_ORDER.indexOf(b.division || '');
      if (da) return da;
      return `${a.surname} ${a.first_name}`.localeCompare(`${b.surname} ${b.first_name}`);
    })
    .map((m) => ({ name: `${(m.first_name || '').trim()} ${(m.surname || '').trim()}`, title: roleLabel(m.role || '', m.division) }))
    // One President and one Vice President: the most senior of each.
    .filter((s, i, all) => all.findIndex((o) => o.title === s.title) === i)
    .slice(0, 2);
}

// ── The semester. Mirrors src/lib/semester.ts, on Rome's calendar. ───────

export interface Semester { key: string; label: string; short: string }

export function semesterOf(at: Date = new Date()): Semester {
  const [y, m] = at.toLocaleDateString('en-CA', { timeZone: 'Europe/Rome' }).split('-').map(Number);
  const build = (year: number, fall: boolean): Semester => ({
    key: `${year}-${fall ? 'fall' : 'spring'}`,
    label: `${fall ? 'Fall' : 'Spring'} ${year}`,
    short: `${String(year).slice(-2)}${fall ? 'F' : 'S'}`,
  });
  if (m >= 9) return build(y, true);
  if (m === 1) return build(y - 1, true);
  return build(y, false);
}

// ── The number. Crockford's alphabet: no I, L, O or U to misread. ────────

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const CODE_RE = /^MIMS-[0-9]{2}[FS]-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/;

export function newCode(semester: Semester, random: (n: number) => Uint8Array): string {
  const bytes = random(8);
  const chars = [...bytes].map((b) => ALPHABET[b % 32]).join('');
  return `MIMS-${semester.short}-${chars.slice(0, 4)}-${chars.slice(4)}`;
}

/** A number as typed by a person: spaces off, capitals, O read as 0. */
export function normaliseCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const s = raw.trim().toUpperCase().replace(/\s+/g, '').replace(/[‐-―]/g, '-');
  const fixed = s.replace(/^MIMS-(\d{2}[FS])-(.{4})-(.{4})$/, (_m, sem, a, b) =>
    `MIMS-${sem}-${String(a).replace(/O/g, '0').replace(/[IL]/g, '1')}-${String(b).replace(/O/g, '0').replace(/[IL]/g, '1')}`);
  return CODE_RE.test(fixed) ? fixed : null;
}

export function certificateFileName(holder: string, semester: string): string {
  const safe = (t: string) => t.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
  return `Minerva_IMS_Certificate_of_Membership_${safe(holder)}_${safe(semester)}.pdf`;
}
