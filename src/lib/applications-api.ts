// =====================================================================
// applications-api — typed data access for the Applications pipeline.
// Reviewer access goes through the admin-applications edge function;
// candidates read only their own row (RLS). Contains the cast around the
// not-yet-regenerated Supabase types in one place.
// =====================================================================

import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';
import { callFunction, invokeFunction } from '@/lib/errors';
import { divisionLabels, type OrgDivision } from '@/lib/roles';

export type AcademicYear = 'bachelor_1' | 'bachelor_2' | 'bachelor_3' | 'master_1' | 'master_2' | 'exchange';

export type ApplicationStatus =
  | 'received' | 'cv_opened' | 'under_review' | 'to_be_contacted' | 'interview_invitation_sent'
  | 'waiting_interview_confirmation' | 'interview_confirmed' | 'interview_completed'
  // THE THREE INTERNAL ONES. Workspace-only: nothing is sent, nothing is
  // unlocked, and the candidate's own page reads all three as the
  // interview stage. See INTERNAL STATUSES below.
  | 'on_hold_pre_interview' | 'on_hold_post_interview' | 'plausible_offer' | 'to_be_rejected'
  | 'accepted' | 'rejected' | 'offer_accepted' | 'offer_declined' | 'joined'
  // The candidate's own decision to stop their candidacy. See WITHDRAWAL below.
  | 'withdrawn';

export interface ApplicationRow {
  id: string;
  user_id: string | null;
  semester_label: string;
  first_name: string;
  surname: string;
  bocconi_id: string;
  email: string;
  phone: string;
  linkedin_url: string | null;
  degree_course: string;
  academic_year: AcademicYear;
  cv_path: string | null;
  answer_path: string | null;
  first_choice: OrgDivision;
  second_choice: OrgDivision | null;
  status: ApplicationStatus;
  /** Division the candidate was invited to interview for (set on invitation). */
  interview_division: OrgDivision | null;
  /**
   * The division currently ASSESSING this candidate, which is not the same
   * question as the divisions they asked for. Defaults to the first choice
   * and may be changed by a role that can move candidacies. Optional in
   * the type only because the generated Supabase types are regenerated
   * from the live schema and lag behind a migration; `select('*')` returns
   * the column regardless. Read it through `evaluationDivision()`.
   */
  evaluation_division?: OrgDivision | null;
  /** The division the evaluation was last moved away from, or null. */
  evaluation_division_previous?: OrgDivision | null;
  /**
   * Screening marker: this candidacy is to be looked at first.
   *
   * NOT A COLUMN ON THE APPLICATION, deliberately. A candidate may read
   * their own application row in full (row-scoped RLS plus `select('*')`),
   * and a reviewers' judgement about somebody should not travel inside a
   * response addressed to them. It is kept in `application_priorities`,
   * which candidates have no grant on, and the admin-applications
   * function merges it into the reviewer's copy as this boolean. Absent
   * on any row that did not come from that function, so read it as
   * `!!a.priority`.
   */
  priority?: boolean;
  cv_viewed_at: string | null;
  created_at: string;
  note_count?: number;
  // Offer to join (set when New Joiners sends an offer).
  offer_sent_at?: string | null;
  offer_deadline?: string | null;
  offer_role?: string | null;
  offer_division?: OrgDivision | null;
  offer_fee_due?: boolean | null;
  /** When the candidate withdrew their own application, if they did. */
  withdrawn_at?: string | null;
  /** How many times this candidate has taken an interview slot. */
  interview_bookings_made?: number;
}

// =====================================================================
// INTERNAL STATUSES: the three the association sees and nobody else.
// ---------------------------------------------------------------------
// "On hold", "Plausible offer" and "To be rejected" are decisions taken
// but not yet acted on. They were first built as a separate MARK field,
// because the status column only ever moves forward and a note-to-self
// wants to be settable in any order; the association chose the status
// list instead, with three states rather than two, knowing what that
// costs.
//
// THERE ARE TWO HOLDS, ONE ON EACH SIDE OF THE INTERVIEW, and where each
// sits is the whole of the design. A status only ever moves forward, so
// the position of a hold decides what is still possible after it:
//
//   on_hold_pre_interview   sits between "Under review" and "To be
//                           invited". Everything from the invitation
//                           onwards is still AHEAD of it, so parking
//                           somebody here keeps the interview open. This
//                           is the commonest pause - a CV read, and
//                           neither an obvious invitation nor an obvious
//                           refusal - and a single post-interview hold
//                           could not express it without carrying the
//                           candidate past the interview for good.
//
//   on_hold_post_interview  sits after "Interview completed", beside
//                           "Plausible offer" and "To be rejected": the
//                           three decisions taken and not yet acted on.
//
// NONE OF THE FOUR IS A DEAD END. Accepted and Rejected are reachable
// from every one of them, so a decision recorded here can still go
// either way.
//
// NOTHING IS ATTACHED TO ANY OF THEM. They are absent from
// `EMAIL_ON_STATUS`, so no confirmation is asked for and no email is
// sent; they unlock nothing; and `candidateStatus` maps all three to the
// interview stage, so an applicant reading their own page sees exactly
// what they saw before. That is the whole point: the association can
// finish deciding before the candidate is told anything.
// =====================================================================

/** The four the workspace keeps to itself. */
export const INTERNAL_STATUSES: ApplicationStatus[] = [
  'on_hold_pre_interview', 'on_hold_post_interview', 'plausible_offer', 'to_be_rejected',
];

/** Is this a status the candidate is never shown? */
export function isInternalStatus(s: ApplicationStatus): boolean {
  return INTERNAL_STATUSES.includes(s);
}

export interface ApplicationNote {
  id: string;
  application_id: string;
  author_name: string | null;
  body: string;
  created_at: string;
  /**
   * Who wrote it. `system` is a line the workspace recorded itself, such
   * as an interview being booked; anything else, including a row written
   * before this field existed, is a person.
   *
   * It matters because the notes carry opinions and are shared with every
   * reviewer. A fact printed in the same style as an opinion is read as
   * one, so the two are told apart here and drawn differently.
   */
  kind?: 'human' | 'system';
}

/** Is this note one the workspace wrote itself? */
export function isSystemNote(n: Pick<ApplicationNote, 'kind'>): boolean {
  return n.kind === 'system';
}

/**
 * One automatic email the association has sent to a candidate's address.
 *
 * Read from `email_send_log`, which records the template KEY; the name a
 * reader knows the email by is resolved server-side into `template_label`
 * and is null only for a key no template row explains.
 */
export interface ApplicationEmail {
  id: string;
  template_name: string;
  template_label: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
}

/** How an email's outcome reads, and how it is coloured. */
export function emailStatusTone(status: string): string {
  if (status === 'sent') return 'text-green-700';
  if (status === 'failed' || status === 'bounced' || status === 'complained' || status === 'dlq') return 'text-destructive';
  if (status === 'suppressed') return 'text-amber-700';
  return 'text-muted-foreground';
}

/** What a status means for somebody wondering why a candidate has not replied. */
export const EMAIL_STATUS_MEANING: Record<string, string> = {
  sent: 'Delivered to the candidate.',
  pending: 'Queued, not yet sent.',
  suppressed: 'Not sent: this address is on the suppression list.',
  failed: 'The send failed. The candidate did not receive it.',
  bounced: 'The address rejected it. The candidate did not receive it.',
  complained: 'Marked as spam by the recipient.',
  dlq: 'The send failed repeatedly and was set aside.',
};

export interface ApplicationQuestion {
  division: OrgDivision;
  question: string;
}

export const ACADEMIC_YEAR_LABELS: Record<AcademicYear, string> = {
  bachelor_1: 'Bachelor, 1st year', bachelor_2: 'Bachelor, 2nd year', bachelor_3: 'Bachelor, 3rd year',
  master_1: 'Master, 1st year', master_2: 'Master, 2nd year', exchange: 'Exchange student',
};

// Colour classes per status for the reviewer table / detail (report item 15).
// Grouped: neutral (early), amber (interview in progress / caution), green
// (positive outcomes), red (negative outcomes).
// =====================================================================
// THE DIVISIONS AN APPLICANT MAY CHOOSE, and what they are called here.
// ---------------------------------------------------------------------
// The five core research divisions, plus Media and Operations, which the
// Society recruits for jointly: one intake, one team, one choice on the
// form.
//
// IT IS STORED AS `media`, which is an existing value of the
// `org_division` enum, so nothing in the database, in the edge functions
// or in the interview scheduling has to change to accept it. Only the
// NAME differs on the applicant's side, because "Media and Operations"
// is what the Society calls the intake even though the register keeps
// the two divisions separately for members.
//
// TWO THINGS ARE TRUE OF IT AND OF NOTHING ELSE ON THE FORM: there is no
// written question to answer, and there is no second choice to make.
// Both follow from the same fact - it is not one of the five research
// divisions a candidate ranks - and both are declared here rather than
// spelled out as conditions in the form, so the form reads the rule
// instead of restating it.
// =====================================================================

/** In the order the form offers them. */
export const APPLY_DIVISIONS: OrgDivision[] = ['equity', 'investment', 'macro', 'portfolio', 'quant', 'media'];

// =====================================================================
// THE EVALUATION DIVISION: who is assessing this candidate.
// ---------------------------------------------------------------------
// Separate from the two preferences, and wider than them. An applicant
// ranks the five research divisions, or applies once to the joint Media
// and Operations intake; an examiner may conclude that somebody belongs
// in a division nobody named, including Operations on its own, and this
// is the list that lets them say so.
//
// Mirrors EVALUATION_DIVISIONS in supabase/functions/admin-applications.
// =====================================================================
export const EVALUATION_DIVISIONS: OrgDivision[] = ['equity', 'investment', 'macro', 'portfolio', 'quant', 'media', 'operations'];

/**
 * The division assessing this candidate.
 *
 * Every screen that names "the division" for a candidate reads it from
 * here, so the table, the candidate's own status page and the emails can
 * never be describing three different divisions. The fallbacks cover rows
 * written before the field existed: an application already invited to
 * interview is being evaluated by whoever invited it, and one that is not
 * is being evaluated by its first choice.
 */
export function evaluationDivision(
  a: Pick<ApplicationRow, 'first_choice'> & Partial<Pick<ApplicationRow, 'evaluation_division' | 'interview_division'>>,
): OrgDivision {
  return a.evaluation_division || a.interview_division || a.first_choice;
}

/**
 * Is this candidate being assessed by a division they did not ask for?
 *
 * The one fact that makes a candidacy unusual, and the trigger for both
 * the marker in the reviewer's table and the notice on the candidate's
 * own status page.
 */
export function isReEvaluated(
  a: Pick<ApplicationRow, 'first_choice' | 'second_choice'> & Partial<Pick<ApplicationRow, 'evaluation_division' | 'interview_division' | 'evaluation_division_previous'>>,
): boolean {
  if (!a.evaluation_division_previous) return false;
  const ev = evaluationDivision(a);
  return ev !== a.first_choice && ev !== a.second_choice;
}

/**
 * The divisions this candidacy may still be moved to.
 *
 * Before the first move: any of them. After it: only the two it has
 * already involved, which is what caps a candidate at two selection
 * processes rather than an open-ended tour of the association.
 */
export function allowedEvaluationDivisions(
  a: Pick<ApplicationRow, 'first_choice'> & Partial<Pick<ApplicationRow, 'evaluation_division' | 'interview_division' | 'evaluation_division_previous'>>,
): OrgDivision[] {
  const current = evaluationDivision(a);
  const previous = a.evaluation_division_previous;
  if (!previous) return EVALUATION_DIVISIONS;
  return EVALUATION_DIVISIONS.filter((d) => d === current || d === previous);
}

// =====================================================================
// WHAT A REVIEWER MAY DO, AND TO WHICH CANDIDATES.
// ---------------------------------------------------------------------
// THREE QUESTIONS NOW, AND THE ANSWERS DIFFER:
//
//   READING            every reviewer reads every application in the
//                      semester. There is nothing to compute here: if the
//                      page opened, the candidate may be read.
//
//   MOVING TO ANOTHER  whoever may manage this page may move ANY
//   DIVISION           candidate. Reassignment exists because a candidate
//                      is in the wrong place, and the person who notices
//                      is usually not the division holding them.
//
//   ADVANCING,         the same roles, but only for the candidates their
//   INVITING,          own division is assessing: those acts speak to the
//   REJECTING          candidate in that division's name, and an
//                      invitation opens that division's calendar. That is
//                      the one question below still worth asking, and
//                      `canProgressApplication` is it.
//
// THE SERVER IS THE BOUNDARY AND ENFORCES ALL THREE (`inScope`,
// `canProgress` and `inWriteScope` in
// supabase/functions/admin-applications). What this mirror is for is
// telling the reviewer BEFORE they act, rather than after a red toast. It
// follows the server's rule line for line; if one moves, move the other.
// =====================================================================

/** Roles scoped to their own division for PROGRESSION (mirrors REVIEW_ROLES). */
const REVIEWER_ROLES = ['head_of_division', 'team_leader', 'portfolio_manager'];

// =====================================================================
// UNSCOPED IN RECRUITING IS A WIDER SET THAN "FULL ACCESS".
// ---------------------------------------------------------------------
// `useAccess().isFullAccess` means admin and president: the two roles the
// workspace-wide matrix grants everything to. The recruiting endpoint has
// always used its own, wider list - `FULL_ACCESS` in
// supabase/functions/admin-applications - which also holds the VICE
// PRESIDENT and the HEAD OF ASSET MANAGEMENT.
//
// Reading the narrower flag here made the interface disagree with the
// endpoint about those two: they were shown "this candidate is being
// assessed by another division" and offered no status control, on
// candidacies the server would have let them move without complaint.
// Mirroring the endpoint's own list is what makes the two agree.
// =====================================================================
const RECRUITING_UNSCOPED_ROLES = ['admin', 'president', 'vice_president', 'head_of_asset_management'];

/**
 * The divisions this reader may progress a candidacy in, from their role
 * assignments. `null` means every division.
 */
export function reviewerDivisionsOf(
  roles: { role: string; division?: OrgDivision | string | null }[] | null | undefined,
  isFullAccess: boolean,
): OrgDivision[] | null {
  if (isFullAccess) return null;
  if ((roles || []).some((r) => RECRUITING_UNSCOPED_ROLES.includes(r.role))) return null;
  const own = (roles || [])
    .filter((r) => REVIEWER_ROLES.includes(r.role) && r.division)
    .map((r) => r.division as OrgDivision);
  return Array.from(new Set(own));
}

/**
 * May this reader ADVANCE, INVITE or REJECT this candidate? `divisions`
 * is what `reviewerDivisionsOf` returned, so `null` is "any".
 *
 * Moving a candidate to another division is NOT this question: that is
 * open to anybody who may manage the page, for any candidate.
 */
export function canProgressApplication(
  a: Pick<ApplicationRow, 'first_choice'> & Partial<Pick<ApplicationRow, 'second_choice' | 'evaluation_division'>>,
  divisions: OrgDivision[] | null,
): boolean {
  if (!divisions) return true;
  if (divisions.includes(a.first_choice)) return true;
  if (a.second_choice && divisions.includes(a.second_choice)) return true;
  if (a.evaluation_division && divisions.includes(a.evaluation_division)) return true;
  return false;
}

// =====================================================================
// A DIVISION THAT HAS FILLED ITS PLACES.
// ---------------------------------------------------------------------
// A round runs for a fortnight, and a division can fill its places in
// three days. Until now the only way to stop taking applications for it
// was to close the whole round, so the choice was between reading CVs
// nobody could accept and shutting four divisions that were still
// recruiting.
//
// `closed_divisions` on `application_settings` records the ones that have
// stopped early. These two read it, and every surface that offers a
// division to an APPLICANT goes through them: the form's two selects, the
// public note on /join, and the endpoint that accepts the submission.
//
// WHAT IT DOES NOT TOUCH is the association's own side of the process.
// `EVALUATION_DIVISIONS` is untouched, so a head can still move a
// candidate INTO a division that has closed to new applications: the
// register's places may be full for people applying from outside while
// somebody already in the round is exactly who that division wants.
// =====================================================================

/** The divisions on the form that are still taking applications. */
export function openApplyDivisions(closed: readonly string[] | null | undefined): OrgDivision[] {
  const shut = new Set(closed ?? []);
  return APPLY_DIVISIONS.filter((d) => !shut.has(d));
}

/**
 * The divisions that have closed early, in the form's own order and with
 * anything that is not a division on the form dropped. The stored column
 * is free text, so this is what every reader should print rather than the
 * raw value.
 */
export function closedApplyDivisions(closed: readonly string[] | null | undefined): OrgDivision[] {
  const shut = new Set(closed ?? []);
  return APPLY_DIVISIONS.filter((d) => shut.has(d));
}

/** Is this division still taking applications through the public form? */
export function isApplyDivisionOpen(
  division: OrgDivision | '' | null | undefined,
  closed: readonly string[] | null | undefined,
): boolean {
  if (!division) return false;
  return !(closed ?? []).includes(division);
}

/** The five a candidate may rank. Media and Operations is not ranked. */
export const RANKED_APPLY_DIVISIONS: OrgDivision[] = ['equity', 'investment', 'macro', 'portfolio', 'quant'];

/** Divisions whose applicants attach no written answer. */
export const NO_WRITTEN_ANSWER_DIVISIONS: OrgDivision[] = ['media'];

export const hasWrittenAnswer = (division: OrgDivision | '' | null | undefined): boolean =>
  !!division && !NO_WRITTEN_ANSWER_DIVISIONS.includes(division);

export const hasSecondChoice = (division: OrgDivision | '' | null | undefined): boolean =>
  !!division && RANKED_APPLY_DIVISIONS.includes(division);

/**
 * The division's name as an APPLICANT sees it. Everywhere else - the
 * register, the workspace, a member's own profile - keeps `divisionLabels`,
 * which is the association's own naming for its divisions.
 */
export function applyDivisionLabel(division: OrgDivision): string {
  return division === 'media' ? 'Media and Operations' : divisionLabels[division];
}

export const STATUS_COLORS: Record<ApplicationStatus, string> = {
  received: 'bg-muted text-muted-foreground border-separator',
  cv_opened: 'bg-muted text-muted-foreground border-separator',
  under_review: 'bg-sky-50 text-sky-700 border-sky-200',
  to_be_contacted: 'bg-sky-50 text-sky-700 border-sky-200',
  interview_invitation_sent: 'bg-amber-50 text-amber-700 border-amber-200',
  waiting_interview_confirmation: 'bg-amber-50 text-amber-700 border-amber-200',
  interview_confirmed: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  interview_completed: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  // The three internal ones share a family of their own, so a reviewer
  // scanning the register can see at a glance which rows are the
  // association's own working state rather than a stage the candidate
  // has been told about.
  on_hold_pre_interview: 'bg-slate-100 text-slate-700 border-slate-300',
  on_hold_post_interview: 'bg-slate-100 text-slate-700 border-slate-300',
  plausible_offer: 'bg-teal-50 text-teal-700 border-teal-200',
  to_be_rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  offer_accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  joined: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  offer_declined: 'bg-orange-50 text-orange-700 border-orange-200',
  withdrawn: 'bg-slate-100 text-slate-700 border-slate-300',
};

/** Small status pill used in the reviewer table and detail view. */
export function statusBadgeClass(status: ApplicationStatus): string {
  return STATUS_COLORS[status] ?? 'bg-muted text-muted-foreground border-separator';
}

// Full internal status list (reviewer-facing), in workflow order.
export const STATUS_FLOW: ApplicationStatus[] = [
  'received', 'cv_opened', 'under_review',
  // BEFORE the invitation, so "To be invited" and the whole interview
  // stay ahead of it. That placement is the reason this one exists.
  'on_hold_pre_interview',
  'to_be_contacted', 'interview_invitation_sent',
  'waiting_interview_confirmation', 'interview_confirmed', 'interview_completed',
  // Post-interview triage, in the order the association named them. They
  // are placed here and not earlier because a status only moves forward:
  // after them, Accepted and Rejected are both still reachable, which is
  // what makes them a pause rather than an outcome.
  'on_hold_post_interview', 'plausible_offer', 'to_be_rejected',
  'accepted', 'rejected', 'offer_accepted', 'offer_declined', 'joined',
  // LAST, AND THAT IS THE POINT. The progression is enforced by comparing
  // positions in this list, so a state at the end can be reached from any
  // stage and can never be left. See WITHDRAWAL below.
  'withdrawn',
];

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  received: 'Application received', cv_opened: 'CV opened', under_review: 'Under review',
  // The KEY stays `to_be_contacted`: it is stored on every application row,
  // referenced by the edge function's STATUSES list and used for ordering the
  // workflow. Only the words a reviewer reads change.
  to_be_contacted: 'To be invited', interview_invitation_sent: 'Interview invitation sent',
  waiting_interview_confirmation: 'Waiting for interview confirmation', interview_confirmed: 'Interview confirmed',
  interview_completed: 'Interview completed',
  on_hold_pre_interview: 'On hold pre interview',
  on_hold_post_interview: 'On hold post interview',
  plausible_offer: 'Plausible offer', to_be_rejected: 'To be rejected',
  accepted: 'Accepted', rejected: 'Rejected',
  offer_accepted: 'Offer accepted', offer_declined: 'Offer declined', joined: 'Joined',
  withdrawn: 'Withdrawn by candidate',
};

/** Statuses locked from manual change — driven by the offer flow / applicant response. */
export const LOCKED_STATUSES: ApplicationStatus[] = ['offer_accepted', 'offer_declined', 'joined', 'withdrawn'];
export function isLockedStatus(s: ApplicationStatus): boolean {
  return LOCKED_STATUSES.includes(s);
}

/** Position of a status in the forward-only workflow. */
export function statusRank(s: ApplicationStatus): number {
  return STATUS_FLOW.indexOf(s);
}

/**
 * A candidacy only ever moves FORWARD: once a stage is reached it can never
 * be taken back (enforced again server-side). The only sanctioned exception
 * is the post-interview division transfer, which is its own explicit process.
 */
export function allowedNextStatuses(current: ApplicationStatus): typeof MANUAL_STATUSES {
  const rank = statusRank(current);
  return MANUAL_STATUSES.filter((o) => statusRank(o.value) > rank);
}

/** Statuses a reviewer can set by hand. `effect: 'action'` = triggers an email or unlocks a step. */
export const MANUAL_STATUSES: { value: ApplicationStatus; label: string; effect: 'passive' | 'action' }[] = [
  { value: 'received', label: STATUS_LABELS.received, effect: 'passive' },
  { value: 'cv_opened', label: STATUS_LABELS.cv_opened, effect: 'passive' },
  { value: 'under_review', label: STATUS_LABELS.under_review, effect: 'passive' },
  { value: 'on_hold_pre_interview', label: STATUS_LABELS.on_hold_pre_interview, effect: 'passive' },
  { value: 'to_be_contacted', label: STATUS_LABELS.to_be_contacted, effect: 'passive' },
  { value: 'interview_invitation_sent', label: STATUS_LABELS.interview_invitation_sent, effect: 'action' },
  { value: 'waiting_interview_confirmation', label: STATUS_LABELS.waiting_interview_confirmation, effect: 'passive' },
  { value: 'interview_confirmed', label: STATUS_LABELS.interview_confirmed, effect: 'passive' },
  { value: 'interview_completed', label: STATUS_LABELS.interview_completed, effect: 'passive' },
  // `effect: 'passive'` on all three, which is not a detail: it is what
  // keeps them out of the confirmation dialog and out of the email path.
  { value: 'on_hold_post_interview', label: STATUS_LABELS.on_hold_post_interview, effect: 'passive' },
  { value: 'plausible_offer', label: STATUS_LABELS.plausible_offer, effect: 'passive' },
  { value: 'to_be_rejected', label: STATUS_LABELS.to_be_rejected, effect: 'passive' },
  { value: 'accepted', label: STATUS_LABELS.accepted, effect: 'passive' },
  { value: 'rejected', label: STATUS_LABELS.rejected, effect: 'action' },
];

// =====================================================================
// THE APPLICANT'S JOURNEY, as their own workspace sees it.
// ---------------------------------------------------------------------
// The applicant workspace shows a section only once it has something in
// it: Interview appears when a division has invited them, Offer appears
// when an offer has been sent. Both questions are answered here, once,
// so the navigation and the pages themselves cannot disagree about
// whether a stage has been reached.
//
// Both are deliberately answered from FACTS ON THE ROW rather than from
// the status alone. `interview_division` is written when the invitation
// is sent and is never cleared, so a candidate who has since been
// interviewed, transferred, accepted or rejected still keeps the record
// of the interview they sat. `offer_sent_at` works the same way: an
// offer that was declined or that expired still happened, and hiding the
// page would leave the applicant unable to see what they replied to.
// =====================================================================

/** Statuses that mean an interview has been offered, sat or is pending. */
const INTERVIEW_STATUSES: ApplicationStatus[] = [
  'interview_invitation_sent', 'waiting_interview_confirmation',
  'interview_confirmed', 'interview_completed',
];

/** Has a division invited this applicant to interview? */
export function isInvitedToInterview(a: Pick<ApplicationRow, 'status' | 'interview_division'> | null): boolean {
  if (!a) return false;
  return !!a.interview_division || INTERVIEW_STATUSES.includes(a.status);
}

/**
 * Has an offer been sent to this applicant?
 *
 * `offer_sent_at` is the only trustworthy signal. The status `accepted`
 * on its own is an INTERNAL decision that the applicant must not see
 * until the President actually sends the offers, so it is not enough.
 */
export function hasOffer(a: Pick<ApplicationRow, 'status' | 'offer_sent_at'> | null): boolean {
  if (!a) return false;
  return !!a.offer_sent_at || a.status === 'offer_accepted' || a.status === 'joined';
}

/** An offer that is sent, not yet answered and not yet expired. */
export function isOfferLive(a: ApplicationRow | null): boolean {
  if (!a) return false;
  return a.status === 'accepted' && !!a.offer_sent_at
    && (!a.offer_deadline || new Date(a.offer_deadline) > new Date());
}

// =====================================================================
// WITHDRAWAL: the one decision on this page that is the candidate's.
// ---------------------------------------------------------------------
// Everything else a candidacy does is decided by the association -
// reviewed, invited, offered, rejected - and the applicant's part is to
// wait. Withdrawing is the exception, and the association has no say in
// it: an applicant who has changed their mind, taken another place or
// simply has no time this semester should be able to stop the process
// themselves rather than ignore emails until it lapses.
//
// IT IS NOT A REJECTION AND IT IS NOT A DECLINED OFFER. Both of those
// describe an outcome the association reached, and filing a withdrawal
// under either would misrepresent, in the association's own register,
// what actually happened. It is its own state, and it reads as its own
// state to reviewers.
//
// WHAT IT CANNOT DO IS CLEAR THE WAY FOR A SECOND APPLICATION. Only one
// application per person is accepted in a round, and the row is neither
// deleted nor hidden: the unique index on (user_id, semester_label)
// still holds, the public form still finds the row and still refuses a
// new submission. Withdrawing closes a candidacy; it does not reopen the
// intake.

/** Has the candidate stopped their own candidacy? */
export function isWithdrawn(a: Pick<ApplicationRow, 'status'> | null): boolean {
  return a?.status === 'withdrawn';
}

/**
 * Outcomes that have already been reached, by the candidate or by the
 * association. There is nothing left to withdraw from any of them.
 */
const CLOSED_STATUSES: ApplicationStatus[] = [
  'withdrawn', 'rejected', 'offer_declined', 'offer_accepted', 'joined',
];

/**
 * May this candidate withdraw right now?
 *
 * "At any point" means at any point while the candidacy is running: from
 * the moment it is received to the moment an offer is answered, an
 * applicant can stop. Once it has closed there is nothing to stop, and
 * an applicant who has already joined is a member, whose leaving is a
 * different matter with a different process.
 *
 * Answered here so the page, the dialog and the server all decide it the
 * same way; the server asks the question again for itself.
 */
export function canWithdraw(a: Pick<ApplicationRow, 'status'> | null): boolean {
  if (!a) return false;
  return !CLOSED_STATUSES.includes(a.status);
}

// Simplified candidate-facing status (report 10.3).
export function candidateStatus(s: ApplicationStatus): { label: string; step: number } {
  switch (s) {
    case 'received': return { label: 'Application received', step: 1 };
    // EACH INTERNAL STATUS READS AS THE STAGE THE CANDIDATE WAS ALREADY
    // AT when it was set, which is why there are two groups rather than
    // one: a pre-interview hold belongs with "under review", a
    // post-interview one with the interview. Their page must not change
    // because the association has started deciding. "On hold" in
    // particular would be read as bad news, and it is not news at all
    // until somebody acts on it.
    case 'cv_opened':
    case 'under_review':
    case 'on_hold_pre_interview':
    case 'to_be_contacted': return { label: 'Application under review', step: 2 };
    case 'interview_invitation_sent':
    case 'waiting_interview_confirmation':
    case 'interview_confirmed':
    case 'interview_completed':
    case 'on_hold_post_interview':
    case 'plausible_offer':
    case 'to_be_rejected': return { label: 'Interview stage', step: 3 };
    case 'accepted':
    case 'offer_accepted':
    case 'joined': return { label: 'Accepted', step: 4 };
    case 'rejected':
    case 'offer_declined': return { label: 'Not selected', step: 5 };
    case 'withdrawn': return { label: 'Application withdrawn', step: 6 };
    default: return { label: 'Application received', step: 1 };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as unknown as { from: (t: string) => any };

  // `any` deliberately, matching what `supabase.functions.invoke` used to
  // hand back: every caller in this module already narrows the shape it
  // expects. Only the ERROR path changed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
async function invoke(session: Session | null, body: Record<string, unknown>): Promise<any> {
  return invokeFunction('admin-applications', { body: body, session });
}

// ── Reviewer ───────────────────────────────────────────────────────────
export async function listApplications(session: Session | null): Promise<ApplicationRow[]> {
  return (await invoke(session, { action: 'list' })).applications as ApplicationRow[];
}
export async function getApplication(
  session: Session | null,
  id: string,
): Promise<{ application: ApplicationRow; notes: ApplicationNote[]; emails?: ApplicationEmail[] }> {
  return await invoke(session, { action: 'get', id });
}
export async function signDocumentUrl(session: Session | null, id: string, kind: 'cv' | 'answer', mode: 'preview' | 'download'): Promise<string> {
  return (await invoke(session, { action: 'sign-url', id, kind, mode })).url as string;
}
/** One document of one applicant, signed and ready to fetch. */
export interface BulkDocument {
  /** The file's own name, e.g. "Rossi_Anna_cv.pdf". */
  name: string;
  url: string;
  /** The applicant it belongs to, used as the folder in a combined zip. */
  folder?: string;
  kind?: 'cv' | 'answer';
}

export async function bulkDocumentUrls(
  session: Session | null,
  ids: string[],
  kind: 'cv' | 'answer' | 'both',
): Promise<BulkDocument[]> {
  return (await invoke(session, { action: 'bulk-urls', ids, kind })).files;
}
export async function updateApplicationStatus(session: Session | null, id: string, status: ApplicationStatus, interviewDivision?: OrgDivision | null) {
  return await invoke(session, { action: 'update-status', id, status, interview_division: interviewDivision ?? undefined });
}
export async function addApplicationNote(session: Session | null, id: string, body: string) {
  return await invoke(session, { action: 'add-note', id, body });
}
/**
 * Move a candidacy to a different division.
 *
 * Returns the candidacy to "To be invited" for the new division, clears
 * the old interview invitation and releases any slot it held. Sends no
 * email of its own: the invitation that follows does that, naming the new
 * division. Refused server-side once the candidacy has already been moved
 * once and the target is neither of its two divisions.
 */
export async function setEvaluationDivision(session: Session | null, id: string, division: OrgDivision) {
  return await invoke(session, { action: 'set-evaluation-division', id, division });
}
/**
 * Flag, or unflag, a candidacy as one to look at first.
 *
 * A marker and nothing more: it moves nobody, changes no status and sends
 * no email. Refused server-side for any role that cannot manage Candidate
 * Screening, so the hidden toggle is not the only thing holding it.
 */
export async function setApplicationPriority(session: Session | null, id: string, priority: boolean) {
  return await invoke(session, { action: 'set-priority', id, priority });
}

export async function setDivisionQuestion(session: Session | null, division: OrgDivision, question: string) {
  return await invoke(session, { action: 'set-question', division, question });
}
export async function convertToMember(session: Session | null, id: string, role: string, division: OrgDivision, feeDue: boolean) {
  return await invoke(session, { action: 'convert-to-member', id, role, division, fee_due: feeDue });
}
/** New Joiners: extend an offer to join (3-day window, 2-day reminder). */
export async function sendOffer(session: Session | null, id: string, role: string, division: OrgDivision, feeDue: boolean) {
  return await invoke(session, { action: 'send-offer', id, role, division, fee_due: feeDue });
}

// ── Candidate offer actions (self-service via applicant-notify) ─────────────
  // `any` deliberately, matching what `supabase.functions.invoke` used to
  // hand back: every caller in this module already narrows the shape it
  // expects. Only the ERROR path changed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
async function invokeNotify(session: Session | null, body: Record<string, unknown>): Promise<any> {
  return invokeFunction('applicant-notify', { body: body, session });
}
/** Read-only signed URL for the applicant's OWN CV / written answer. */
export async function signMyDocument(session: Session | null, kind: 'cv' | 'answer', mode: 'preview' | 'download'): Promise<string> {
  const data = await invokeNotify(session, { action: 'sign-own-doc', kind, mode });
  return data.url as string;
}
export async function acceptOffer(session: Session | null) {
  return await invokeNotify(session, { action: 'accept-offer' });
}
export async function declineOffer(session: Session | null) {
  return await invokeNotify(session, { action: 'decline-offer' });
}
/**
 * Withdraw the caller's OWN application.
 *
 * Deliberately the same pipeline as accepting an offer: the applicant's
 * own function, acting only on the applicant's own row, reached with the
 * applicant's own session. The signature is collected by the dialog for
 * the same reason it is collected there - so the decision is made
 * deliberately rather than by a stray click - and, exactly as with
 * accepting, it is not checked against the name on file. The applicant
 * is already authenticated as themselves; there is nothing to verify.
 */
export async function withdrawApplication(session: Session | null) {
  return await invokeNotify(session, { action: 'withdraw-application' });
}

// ── Public / candidate ─────────────────────────────────────────────────
export async function listQuestions(): Promise<ApplicationQuestion[]> {
  const { data, error } = await sb.from('application_questions').select('division, question');
  if (error) throw new Error(error.message);
  return (data || []) as ApplicationQuestion[];
}

/** The signed-in candidate's own application (RLS returns only their row). */
export async function getMyApplication(): Promise<ApplicationRow | null> {
  const { data, error } = await sb.from('applications').select('*').limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ApplicationRow) ?? null;
}

// Public: the applicant creates their account (client-side auth.signUp) and
// then submits this form with the returned user id. No prior session needed.
export async function submitApplication(form: FormData): Promise<{ id: string; verified?: boolean; already?: boolean }> {
  const { data, error } = await callFunction('submit-application', { body: form });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}
