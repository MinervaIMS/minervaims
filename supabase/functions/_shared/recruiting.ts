// =====================================================================
// recruiting — one definition of "the division a candidate applies to".
// ---------------------------------------------------------------------
// The association has seven divisions, and it recruits into SIX: the five
// research divisions, and one joint intake for Media & Communication and
// Operations. A candidate for the joint intake applies once, is screened
// once, is invited once and is interviewed once, by either Head. Which of
// the two they end up in is decided at the end, by the ROLE they are
// offered - not by the form, not by the screening, not by the calendar.
//
// The joint intake is stored as `media`. That value was already the one
// the form wrote, so no application changes shape; what changes is that
// every recruiting surface now reads it the same way:
//
//   * one NAME, "Media & Communication and Operations", wherever a
//     candidate or an examiner reads which intake a candidacy is in: the
//     form, the screening table, the interview calendar, the invitation,
//     the booking confirmation, the reminders and the notes;
//   * `operations` is no longer a separate place to evaluate or interview
//     anybody. A row that still says `operations` (written when the
//     evaluation list offered it) is read as the joint intake;
//   * both Heads may run it: the Head of Media & Communication and the
//     Head of Operations open its interview slots, invite its candidates
//     and move them on, exactly as a Head of Division does for theirs.
//
// WHERE A JOINER IS PLACED is untouched and still reads the register's
// own names: an offer for Media & Communication Analyst says "Media &
// Communication", because that is the division the role belongs to. The
// statute makes Operations "an auxiliary division of one person rather
// than a team" (Art. 22), so there is no Operations role below the Head
// for an offer to hand out; appointing somebody to Operations is a
// leadership appointment made in People > Members.
//
// Mirrored by the "joint intake" block in src/lib/applications-api.ts.
// If one changes, change the other.
// =====================================================================

/** The value the joint intake is stored under. */
export const JOINT_INTAKE = 'media';

/** Its name, everywhere a candidacy is described. */
export const JOINT_INTAKE_LABEL = 'Media & Communication and Operations';

/** The five research divisions. */
export const RESEARCH_DIVISIONS = ['equity', 'investment', 'macro', 'portfolio', 'quant'];

/**
 * The divisions a candidacy can be assessed and interviewed by: the five
 * research divisions and the joint intake. Operations is not listed on
 * its own because it is not recruited into on its own.
 */
export const RECRUITING_DIVISIONS = [...RESEARCH_DIVISIONS, JOINT_INTAKE];

/** The register's names, for placement (where an offer puts somebody). */
export const PLACEMENT_LABELS: Record<string, string> = {
  equity: 'Equity Research', investment: 'Investment Research', macro: 'Macro Research',
  portfolio: 'Portfolio Management', quant: 'Quantitative Research',
  media: 'Media & Communication', operations: 'Operations', board: 'Board', none: '',
};

/**
 * The recruiting division a value stands for. `operations` - from a row
 * written while the evaluation list still offered it separately - is the
 * joint intake; everything else is itself.
 */
export function intakeOf(division: string | null | undefined): string {
  if (!division) return '';
  return division === 'operations' ? JOINT_INTAKE : division;
}

/** The name of the division a CANDIDACY is in. */
export function intakeLabel(division: string | null | undefined): string {
  const d = intakeOf(division);
  if (!d) return '';
  if (d === JOINT_INTAKE) return JOINT_INTAKE_LABEL;
  return PLACEMENT_LABELS[d] ?? d;
}

/** The name of the division an OFFER places somebody in. */
export function placementLabel(division: string | null | undefined): string {
  if (!division) return '';
  return PLACEMENT_LABELS[division] ?? division;
}

/**
 * Heads who run a recruiting division, from their role assignments.
 *
 * A Head of Division runs the division they head. The Head of Media &
 * Communication and the Head of Operations both run the joint intake,
 * whatever division their own row carries.
 */
export function headedIntakes(roles: Array<{ role: string; division: string | null }>): string[] {
  const out = new Set<string>();
  for (const r of roles) {
    if (r.role === 'head_of_division' && r.division && RESEARCH_DIVISIONS.includes(r.division)) out.add(r.division);
    if (r.role === 'head_of_media' || r.role === 'head_of_operations') out.add(JOINT_INTAKE);
  }
  return [...out];
}

// =====================================================================
// THE PREPARATION SENTENCE IN THE INTERVIEW EMAILS.
// ---------------------------------------------------------------------
// The invitation, both booking reminders and the booking confirmation all
// said: "We also strongly recommend reading your division's latest reports
// at minervaims.org/divisions/{{division_slug}}". For a research division
// that is exactly right. For the joint intake it sent the candidate to
// /divisions/media - a page that does not exist, because Media &
// Communication and Operations publish no research - so the one practical
// instruction in the email was a dead link.
//
// The sentence is now a variable, `{{division_reading}}`, and it is
// written here for each kind of intake. Research candidates receive, word
// for word and link for link, what they received before.
//
// Mirrored by public.interview_division_reading() in the database, which
// the reminder job uses. Keep the two identical.
// =====================================================================
const LINK_STYLE = 'color:#1F0F4D;';

export function divisionReading(division: string | null | undefined): string {
  const d = intakeOf(division);
  if (d && RESEARCH_DIVISIONS.includes(d)) {
    return `We also strongly recommend reading your division&rsquo;s latest reports at <a href="https://minervaims.org/divisions/${d}" style="${LINK_STYLE}">minervaims.org/divisions/${d}</a>.`;
  }
  return `We also recommend reading about the association, its divisions and the work of Media &amp; Communication and Operations at <a href="https://minervaims.org/about" style="${LINK_STYLE}">minervaims.org/about</a>.`;
}
