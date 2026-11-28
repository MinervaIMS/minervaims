// =====================================================================
// WHAT EACH ENTRY OF THE ACTIVITY LOG SAYS (Step 110).
// ---------------------------------------------------------------------
// ONE FILE, MIRRORED: supabase/functions/_shared/activity-sentences.ts is
// read by the audit wrapper (activity.ts), which writes the sentence into
// every entry as it is recorded (`details.summary`); src/lib/activity-
// sentences.ts is the same file, read by Settings > Activity Log to word
// the entries recorded before Step 110. scripts/activity-log.test.mjs
// fails if the two differ by a byte.
//
// WHY. The log used to word an entry from the name of the function that
// wrote it ("Updated career-ib", "Updated rosters", "Deleted a report"),
// and recorded as a deletion, by whoever happened to open the Report
// Archive, the clean-up the archive runs by itself every time it opens.
// Read in a list, the workspace looked as if people deleted reports all
// day. Now every action has its own sentence, in the words the workspace
// uses for it, naming what it touched, and the actions the workspace runs
// by itself are marked as automatic (and recorded only when they changed
// something).
//
// A sentence is either one template or two (with a name, without one):
// `{n}` is the name of what was touched, in quotation marks, and `{d.x}`
// a fact kept with the entry. A function of the name and the facts is
// used where the sentence depends on them.
// =====================================================================

export interface SentenceInput {
  /** The edge function that recorded the entry (`admin-files`), or `table:<name>` for a direct write. */
  fn: string;
  /** The request's action (`set-status`). */
  action: string;
  /** The verb the registry gives the action (`status_change`). */
  verb: string;
  /** The name of what was touched, when known. */
  name: string | null;
  /** The facts kept with the entry. */
  details?: Record<string, unknown> | null;
  /** The server refused it (the log marks it; the sentence is the same). */
  refused?: boolean;
}

type Facts = Record<string, unknown>;
type Sentence = string | [string, string] | ((name: string | null, d: Facts) => string);

/**
 * The actions the workspace runs by itself, not at anybody's press: shown
 * as automatic in the log and recorded only when they changed something.
 */
export const AUTOMATIC: Record<string, string> = {
  'admin-files:purge-expired': 'The Report Archive empties its bin of reports deleted more than thirty days ago each time it is opened.',
  'career-ib:guide-cover': 'The cover of a guide is drawn once, the first time the page is opened after the guide is uploaded.',
  'career-brainteasers:greenbook-cover': 'The cover of the greenbook is drawn once, the first time the page is opened after it is uploaded.',
  'people-network:tick': 'The network of the Society is analysed again by the database\'s own job, twice a month and once a month in January, July and August (Steps 111 and 112).',
};

export function isAutomatic(fn: string, action: string): boolean {
  return Object.prototype.hasOwnProperty.call(AUTOMATIC, `${fn}:${action}`);
}

/** The words for a candidate's stages, as Candidates Screening shows them. */
const APPLICATION_STAGE: Record<string, string> = {
  received: 'Received', cv_opened: 'CV opened', under_review: 'Under review',
  on_hold_pre_interview: 'On hold (before the interview)', to_be_contacted: 'To be contacted',
  interview_invitation_sent: 'Invited to interview', waiting_interview_confirmation: 'Interview booked',
  interview_confirmed: 'Interview confirmed', interview_completed: 'Interview done',
  on_hold_post_interview: 'On hold (after the interview)', plausible_offer: 'Plausible offer', to_be_rejected: 'To be rejected',
  call_invitation_sent: 'Invited to the phone call', call_confirmed: 'Phone call booked', call_on_hold: 'Phone call on hold',
  accepted: 'Accepted', rejected: 'Rejected', offer_accepted: 'Offer accepted', offer_declined: 'Offer declined',
  joined: 'Joined', withdrawn: 'Withdrawn',
};

const q = (name: string | null) => (name ? `“${name}”` : '');
const str = (v: unknown) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '');

const SENTENCES: Record<string, Sentence> = {
  // Reports.
  'admin-files:create': ['Added the report {n} to the archive', 'Added a report to the archive'],
  'admin-files:upload': ['Uploaded the PDF {n}', 'Uploaded a report’s PDF'],
  'admin-files:update': ['Edited the report {n}', 'Edited a report'],
  'admin-files:delete': ['Moved the report {n} to the bin (recoverable for 30 days)', 'Moved a report to the bin'],
  'admin-files:restore': ['Restored the report {n} from the bin', 'Restored a report from the bin'],
  'admin-files:purge': ['Deleted the report {n} for good', 'Deleted a report for good'],
  'admin-files:purge-expired': ['Emptied the bin of reports deleted more than 30 days ago: {n}', 'Checked the bin for reports deleted more than 30 days ago'],
  'admin-files:set-status': (n, d) => {
    const to = str(d.to);
    const what = n ? `the report ${q(n)}` : 'a report';
    if (to === 'published') return `Published ${what}`;
    if (to === 'blocked') return `Blocked ${what}`;
    if (to === 'draft') return `Set ${what} back to draft`;
    return `Changed the status of ${what}`;
  },
  'admin-files:favourite': ['Changed the favourite reports ({n})', 'Changed the favourite reports'],
  'admin-files:bulk-update': ['Edited {n} at once', 'Edited several reports at once'],
  'admin-files:pdf-metadata-apply': ['Wrote the title and authors into {n}', 'Wrote the title and authors into the report PDFs'],
  'admin-files:division-page-save': ['Edited the division page {n}', 'Edited a division page'],
  'admin-funds:upsert': ['Saved the fund performance {n}', 'Saved a fund performance'],
  'admin-funds:delete': ['Deleted the fund performance {n}', 'Deleted a fund performance'],
  'admin-funds:profile-upsert': ['Edited the fund profile {n}', 'Edited a fund profile'],
  'admin-funds:reference-upsert': ['Saved the reference series {n}', 'Saved a reference series'],
  'admin-funds:reference-delete': ['Deleted the reference series {n}', 'Deleted a reference series'],
  'admin-funds:import-estr': 'Imported the latest €STR rates',
  // Recruiting.
  'admin-applications:update-status': (n, d) => {
    const who = n ?? 'a candidate';
    const to = str(d.to);
    if (to === 'rejected') return `Rejected ${who}`;
    if (to && APPLICATION_STAGE[to]) return `Moved ${who} to ${APPLICATION_STAGE[to]}`;
    return `Changed the stage of ${who}`;
  },
  'admin-applications:reject-remaining': ['Rejected the remaining candidates: {n}', 'Rejected the remaining candidates'],
  'admin-applications:set-evaluation-division': ['Moved {n} to another division for evaluation', 'Moved a candidate to another division for evaluation'],
  'admin-applications:set-priority': ['Changed the priority of {n}', 'Changed the priority of a candidate'],
  'admin-applications:set-question': ['Edited the division question {n}', 'Edited a division question'],
  'admin-applications:add-note': ['Added a note on {n}', 'Added a note on a candidate'],
  'admin-applications:send-offer': ['Sent an offer to {n}', 'Sent an offer'],
  'admin-applications:withdraw-offer': ['Withdrew the offer to {n}', 'Withdrew an offer'],
  'admin-applications:convert-to-member': ['Made {n} a member', 'Made a candidate a member'],
  'admin-applications:sign-url': (n, d) => {
    const doc = str(d.document) === 'answer' ? 'written answer' : 'CV';
    const verb = str(d.mode) === 'download' ? 'Downloaded' : 'Opened';
    return n ? `${verb} the ${doc} of ${n}` : `${verb} a candidate’s ${doc}`;
  },
  'admin-applications:bulk-urls': (n, d) => {
    const doc = str(d.document) === 'answer' ? 'written answers' : str(d.document) === 'both' ? 'CVs and written answers' : 'CVs';
    return n ? `Downloaded the ${doc} of ${n}` : `Downloaded candidates’ ${doc}`;
  },
  'admin-settings:update': ['Edited the application setup for {n}', 'Edited the application setup'],
  'admin-interviews:create-slot': ['Opened an interview slot {n}', 'Opened an interview slot'],
  'admin-interviews:bulk-create': ['Opened interview slots {n}', 'Opened interview slots'],
  'admin-interviews:update-slot': ['Edited an interview slot {n}', 'Edited an interview slot'],
  'admin-interviews:delete-slot': ['Deleted an interview slot {n}', 'Deleted an interview slot'],
  'admin-interviews:clear-division': ['Cleared the interview slots of {n}', 'Cleared a division’s interview slots'],
  'admin-interviews:book': ['Booked the interview {n}', 'Booked an interview'],
  'admin-interviews:cancel': ['Cancelled the interview booking {n}', 'Cancelled an interview booking'],
  'recruiting-calls:create-slots': ['Opened phone call times {n}', 'Opened phone call times'],
  'recruiting-calls:update-slot': ['Edited a phone call time {n}', 'Edited a phone call time'],
  'recruiting-calls:delete-slot': ['Deleted a phone call time {n}', 'Deleted a phone call time'],
  'recruiting-calls:invite': ['Invited {n} to the phone call', 'Invited a candidate to the phone call'],
  'recruiting-calls:record-outcome': ['Recorded the outcome of the phone call with {n}', 'Recorded the outcome of a phone call'],
  'recruiting-calls:book': ['Booked the phone call {n}', 'Booked a phone call'],
  'recruiting-calls:cancel': ['Cancelled the phone call {n}', 'Cancelled a phone call'],
  'applicant-notify:accept-offer': 'Accepted their offer',
  'applicant-notify:decline-offer': 'Declined their offer',
  'applicant-notify:withdraw-application': 'Withdrew their application',
  'submit-application:submit': ['Submitted an application ({n})', 'Submitted an application'],
  // People.
  'admin-members:create': ['Added {n} to the members register', 'Added a member to the register'],
  'admin-members:update': ['Edited the member {n}', 'Edited a member'],
  'admin-members:delete': ['Removed {n} from the members register', 'Removed a member from the register'],
  'admin-members:move-to-alumni': ['Moved {n} to the alumni', 'Moved a member to the alumni'],
  'admin-members:upload-photo': ['Uploaded the photo of {n}', 'Uploaded a member’s photo'],
  'admin-team:create': ['Added {n} to the team on the website', 'Added a person to the team on the website'],
  'admin-team:update': ['Edited {n} on the team on the website', 'Edited the team on the website'],
  'admin-team:delete': ['Removed {n} from the team on the website', 'Removed a person from the team on the website'],
  'admin-team:upload-photo': ['Uploaded the photo of {n} for the website', 'Uploaded a photo for the team on the website'],
  'admin-team:reorder': 'Reordered the team on the website',
  'admin-alumni:create': ['Added the alumnus {n}', 'Added an alumnus'],
  'admin-alumni:update': ['Edited the alumnus {n}', 'Edited an alumnus'],
  'admin-alumni:delete': ['Deleted the alumnus {n}', 'Deleted an alumnus'],
  'admin-rosters:add': ['Added {n} to a past semester', 'Added a person to a past semester'],
  'admin-rosters:update': ['Corrected {n} in a past semester', 'Corrected a past semester'],
  'admin-rosters:delete': ['Removed {n} from a past semester', 'Removed a person from a past semester'],
  'admin-rosters:match-decide': (n, d) => {
    const pair = n ?? 'two records';
    return str(d.decision) === 'the same person' ? `Joined ${pair} as one person` : `Kept ${pair} as two different people`;
  },
  'admin-rosters:pdf': ['Downloaded the PDF of {n}', 'Downloaded a semester’s PDF'],
  'admin-rosters:set-public-hidden': ['Changed whether {n} is listed on the website', 'Changed whether a person is listed on the website'],
  'admin-rosters:pending-dismiss': ['Set aside {n} from the former members to complete', 'Set aside a former member to complete'],
  // People > Network (Step 111).
  // No longer an action since Step 112 (the page has no button): kept so
  // that the entries recorded before are still read in these words.
  'people-network:recompute': 'Recalculated the network of the Society',
  'people-network:exclude': ['Left {n} out of the network analysis', 'Left a person out of the network analysis'],
  'people-network:include': ['Brought {n} back into the network analysis', 'Brought a person back into the network analysis'],
  'people-network:tick': 'Recalculated the network of the Society on its scheduled run',
  'admin-invites:send': ['Sent an invitation to {n}', 'Sent an invitation'],
  'admin-invites:resend': ['Sent the invitation to {n} again', 'Sent an invitation again'],
  'admin-invites:revoke': ['Withdrew the invitation to {n}', 'Withdrew an invitation'],
  // Events.
  'admin-events:create': ['Created the event {n}', 'Created an event'],
  'admin-events:update': ['Edited the event {n}', 'Edited an event'],
  'admin-events:delete': ['Deleted the event {n}', 'Deleted an event'],
  'admin-event-reg:add-external': ['Added the guest {n} to an event’s list', 'Added a guest to an event’s list'],
  'admin-event-reg:add-member': ['Added {n} to an event’s list', 'Added a member to an event’s list'],
  'admin-event-reg:admit-waitlist': ['Admitted {n} from the waiting list', 'Admitted a person from the waiting list'],
  'admin-event-reg:checkin': ['Checked {n} in at the door', 'Checked a person in at the door'],
  'admin-event-reg:import-attendance': ['Imported the attendance of {n}', 'Imported an attendance list'],
  'admin-event-reg:link-member': ['Linked {n} to their member record', 'Linked a registration to a member record'],
  'admin-event-reg:link-person': ['Linked {n} to their record in the history', 'Linked a guest to a person in the history'],
  'admin-event-reg:mark-attended': ['Changed the attendance of {n}', 'Changed an attendance'],
  'admin-event-reg:remove': ['Removed {n} from an event’s list', 'Removed a person from an event’s list'],
  'admin-event-reminders:set-paused': ['Paused or resumed the reminders of {n}', 'Paused or resumed registration reminders'],
  'admin-event-reminders:send-test': ['Sent themselves a test reminder for {n}', 'Sent themselves a test reminder'],
  'register-event:register': ['Registered for {n}', 'Registered for an event'],
  'register-event:cancel': ['Cancelled their registration for {n}', 'Cancelled an event registration'],
  'event-door-list:pdf': ['Downloaded the door list of {n}', 'Downloaded a door list'],
  'admin-aod:create-day': ['Added the Association On Display day {n}', 'Added an Association On Display day'],
  'admin-aod:delete-day': ['Deleted the Association On Display day {n}', 'Deleted an Association On Display day'],
  'admin-aod:set-open': ['Opened or closed the sign-up for Association On Display {n}', 'Opened or closed an Association On Display sign-up'],
  'admin-aod:signup': ['Signed up for an Association On Display slot {n}', 'Signed up for an Association On Display slot'],
  'admin-aod:remove-signup': ['Cancelled an Association On Display slot {n}', 'Cancelled an Association On Display slot'],
  'company-visits:submit': ['Asked to join the company visit {n}', 'Asked to join a company visit'],
  'company-visits:decide': ['Chose who joins the company visit {n}', 'Chose who joins a company visit'],
  'company-visits:close-now': ['Closed the interest list of {n}', 'Closed a company visit’s interest list'],
  'company-visits:send': ['Sent the company visit invitations for {n}', 'Sent company visit invitations'],
  'company-visits:open-place': ['Offered a freed place on {n}', 'Offered a freed place on a company visit'],
  'company-visits:withdraw': ['Withdrew from the company visit {n}', 'Withdrew from a company visit'],
  'company-visits:cv-url': ['Opened a CV sent for {n}', 'Opened a CV sent for a company visit'],
  'company-visits:cvs-zip': ['Downloaded the CVs for {n}', 'Downloaded the CVs for a company visit'],
  'company-visits:cleanup': 'Deleted the CVs of company visits held more than six months ago',
  // Operations.
  'admin-fees:open': ['Opened the fee collection {n}', 'Opened a fee collection'],
  'admin-fees:close': ['Closed the fee collection {n} and froze its register', 'Closed a fee collection and froze its register'],
  'admin-fees:set-paid': ['Recorded a fee payment: {n}', 'Recorded a fee payment'],
  'admin-fees:set-exempt': ['Changed a fee exemption: {n}', 'Changed a fee exemption'],
  'admin-treasury:add': ['Added the treasury entry {n}', 'Added a treasury entry'],
  'internal-forms:save': ['Saved the form {n}', 'Saved a form'],
  'internal-forms:delete': ['Deleted the form {n}', 'Deleted a form'],
  'internal-forms:duplicate': ['Duplicated the form {n}', 'Duplicated a form'],
  'internal-forms:set-status': ['Opened or closed the form {n}', 'Opened or closed a form'],
  'internal-forms:set-paid': ['Recorded a payment for {n}', 'Recorded a payment for a form'],
  'internal-forms:set-note': ['Added a note to an answer of {n}', 'Added a note to a form answer'],
  'internal-forms:delete-response': ['Deleted an answer to {n}', 'Deleted a form answer'],
  'internal-forms:submit': ['Answered the form {n}', 'Answered a form'],
  'internal-forms:upload': ['Attached a file to an answer of {n}', 'Attached a file to a form answer'],
  'internal-forms:sign': ['Downloaded the files of {n}', 'Downloaded a form’s files'],
  'internal-forms:test-receipt': ['Sent themselves a test receipt for {n}', 'Sent themselves a test receipt'],
  'admin-auto-emails:create-template': ['Created the automatic email {n}', 'Created an automatic email'],
  'admin-auto-emails:save-template': ['Edited the automatic email {n}', 'Edited an automatic email'],
  'admin-auto-emails:sync-fee-emails': 'Brought the fee emails up to date',
  'admin-auto-emails:test-fee-email': ['Sent themselves a test of {n}', 'Sent themselves a test fee email'],
  // Website.
  'admin-readings:create': ['Added the reading {n}', 'Added a reading'],
  'admin-readings:update': ['Edited the reading {n}', 'Edited a reading'],
  'admin-readings:delete': ['Deleted the reading {n}', 'Deleted a reading'],
  'admin-readings:reorder': 'Reordered the readings',
  'admin-testimonials:save': ['Saved the testimonial {n}', 'Saved a testimonial'],
  'admin-testimonials:delete': ['Deleted the testimonial {n}', 'Deleted a testimonial'],
  'admin-testimonials:reorder': 'Reordered the testimonials',
  'admin-partnerships:save': ['Saved the partnership {n}', 'Saved a partnership'],
  'admin-partnerships:delete': ['Deleted the partnership {n}', 'Deleted a partnership'],
  'admin-partnerships:reorder': 'Reordered the partnerships',
  'admin-history:save': ['Saved the History entry {n}', 'Saved a History entry'],
  'admin-history:delete': ['Deleted the History entry {n}', 'Deleted a History entry'],
  'admin-join-faqs:save': ['Saved the FAQ {n}', 'Saved an FAQ'],
  'admin-join-faqs:delete': ['Deleted the FAQ {n}', 'Deleted an FAQ'],
  'admin-join-faqs:reorder': 'Reordered the FAQs',
  // Media & Communication.
  'admin-smm:editorial-save': ['Saved the editorial item {n}', 'Saved an editorial item'],
  'admin-smm:editorial-delete': ['Deleted the editorial item {n}', 'Deleted an editorial item'],
  'admin-smm:ads-save': ['Saved the ad {n}', 'Saved an ad'],
  'admin-smm:ads-delete': ['Deleted the ad {n}', 'Deleted an ad'],
  'brand-kit:download': 'Downloaded the design system package',
  'brand-kit:upload-url': ['Uploaded the design system file {n}', 'Uploaded a design system file'],
  'admin-resources:create': ['Added the resource {n}', 'Added a resource'],
  'admin-resources:update': ['Edited the resource {n}', 'Edited a resource'],
  'admin-resources:delete': ['Deleted the resource {n}', 'Deleted a resource'],
  'admin-resources:favourite': ['Changed the favourite resources ({n})', 'Changed the favourite resources'],
  'admin-calendar:save': ['Saved the calendar entry {n}', 'Saved a calendar entry'],
  'admin-calendar:delete': ['Deleted the calendar entry {n}', 'Deleted a calendar entry'],
  // Career.
  'career-files:upload': ['Uploaded the Career template {n}', 'Uploaded a Career template'],
  'career-files:rename': ['Renamed the Career template {n}', 'Renamed a Career template'],
  'career-files:delete': ['Deleted the Career template {n}', 'Deleted a Career template'],
  'career-files:download': ['Downloaded the Career template {n}', 'Downloaded a Career template'],
  'career-ib:save': ['Saved the IB question {n}', 'Saved an IB question'],
  // A member answering a question to practise (Step 112: it never edits the question).
  'career-ib:answer': ['Answered the IB question {n}', 'Answered an IB question'],
  'career-ib:progress': ['Updated their progress on the IB question {n}', 'Updated their IB progress'],
  'career-ib:reset': 'Reset their IB progress',
  'career-ib:guide-commit': ['Uploaded the guide {n}', 'Uploaded an IB guide'],
  'career-ib:guide-remove': ['Removed the guide {n}', 'Removed an IB guide'],
  'career-ib:guide-download': ['Downloaded the guide {n}', 'Downloaded an IB guide'],
  'career-ib:guide-cover': ['Stored the cover of the guide {n}', 'Stored the cover of an IB guide'],
  'career-brainteasers:save': ['Saved the brainteaser {n}', 'Saved a brainteaser'],
  'career-brainteasers:progress': ['Updated their progress on the brainteaser {n}', 'Updated their brainteaser progress'],
  'career-brainteasers:reveal': ['Revealed the answer to the brainteaser {n}', 'Revealed a brainteaser’s answer'],
  'career-brainteasers:reset': 'Reset their brainteaser progress',
  'career-brainteasers:greenbook-commit': ['Uploaded the greenbook {n}', 'Uploaded the greenbook'],
  'career-brainteasers:greenbook-remove': ['Removed the greenbook {n}', 'Removed the greenbook'],
  'career-brainteasers:greenbook-download': ['Downloaded the greenbook {n}', 'Downloaded the greenbook'],
  'career-brainteasers:greenbook-cover': ['Stored the cover of the greenbook {n}', 'Stored the cover of the greenbook'],
  // My Profile and Settings.
  'member-profile:update': 'Edited their profile',
  'member-profile:upload': 'Uploaded their photo',
  'member-profile:redeem': 'Linked their account to the members register',
  'membership-certificate:issue': ['Downloaded their membership certificate {n}', 'Downloaded their membership certificate'],
  'membership-certificate:withdraw': ['Withdrew the certificate {n}', 'Withdrew a certificate'],
  'membership-certificate:restore': ['Restored the certificate {n}', 'Restored a certificate'],
  'declarations:sign-commitment': ['Signed the semester commitment {n}', 'Signed the semester commitment'],
  'declarations:set-settings': 'Changed the declarations asked of applicants and members',
  'declarations:launch-commitment': ['Sent the semester commitment requests {n}', 'Sent the semester commitment requests'],
  'declarations:send-test': 'Sent themselves a test commitment request',
  'admin-users:set-role': ['Changed the role of {n}', 'Changed the role of an account'],
  'admin-users:delete': ['Deleted the account of {n}', 'Deleted an account'],
  'admin-users:delete-pending': ['Deleted {n} awaiting approval', 'Deleted the accounts awaiting approval'],
  // The workspace's direct writes, recorded by the database (audit_client_write).
  'table:calendar_entries:create': ['Added the calendar entry {n}', 'Added a calendar entry'],
  'table:calendar_entries:update': ['Edited the calendar entry {n}', 'Edited a calendar entry'],
  'table:calendar_entries:delete': ['Deleted the calendar entry {n}', 'Deleted a calendar entry'],
  'table:exam_sessions:create': ['Added the exam session {n}', 'Added an exam session'],
  'table:exam_sessions:update': ['Edited the exam session {n}', 'Edited an exam session'],
  'table:exam_sessions:delete': ['Deleted the exam session {n}', 'Deleted an exam session'],
  'table:report_deadlines:create': ['Set the report deadline {n}', 'Set a report deadline'],
  'table:report_deadlines:update': ['Changed the report deadline {n}', 'Changed a report deadline'],
  'table:report_deadlines:delete': ['Removed the report deadline {n}', 'Removed a report deadline'],
  'table:page_visibility:update': ['Showed or hid the page {n} on the website', 'Showed or hid a page on the website'],
  'table:page_visibility:create': ['Showed or hid the page {n} on the website', 'Showed or hid a page on the website'],
  'table:newsletter_subscribers:create': ['Added {n} to the newsletter', 'Added a newsletter subscriber'],
  'table:newsletter_subscribers:update': ['Edited the newsletter subscriber {n}', 'Edited a newsletter subscriber'],
  'table:newsletter_subscribers:delete': ['Removed {n} from the newsletter', 'Removed a newsletter subscriber'],
  'table:gpa_calculations:create': 'Saved a GPA comparison',
  'table:gpa_calculations:update': 'Edited a GPA comparison',
  'table:gpa_calculations:delete': 'Deleted a GPA comparison',
  'table:onboarding_progress:create': 'Ticked a step of their onboarding checklist',
  'table:onboarding_progress:update': 'Ticked a step of their onboarding checklist',
  'table:onboarding_progress:delete': 'Unticked a step of their onboarding checklist',
  'table:members:create': ['Added {n} to the members register', 'Added a member to the register'],
  'table:members:update': ['Edited the member {n}', 'Edited a member'],
  'table:members:delete': ['Removed {n} from the members register', 'Removed a member from the register'],
};

/** Has this action (`fn:action`, or `table:<name>:<verb>`) a sentence of its own? */
export function hasSentence(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(SENTENCES, key);
}

/** What an action is called when no sentence of its own is written. */
const VERB_PHRASE: Record<string, string> = {
  create: 'Created', update: 'Edited', delete: 'Deleted', reorder: 'Reordered', status_change: 'Changed the status of',
  registration: 'Registered for', approval: 'Approved', rejection: 'Rejected', upload: 'Uploaded', download: 'Downloaded',
  open: 'Opened', close: 'Closed', send: 'Sent',
};

function fill(template: string, name: string | null, d: Facts): string {
  return template
    .replace(/\{n\}/g, q(name))
    .replace(/\{d\.([a-z_]+)\}/g, (_, k: string) => str(d[k]));
}

/** The sentence for an entry. */
export function activitySentence(input: SentenceInput): string {
  const d = (input.details ?? {}) as Facts;
  const name = input.name && input.name.trim() ? input.name.trim() : null;
  const s = SENTENCES[`${input.fn}:${input.action}`];
  let out: string;
  if (typeof s === 'function') out = s(name, d);
  else if (Array.isArray(s)) out = fill(name ? s[0] : s[1], name, d);
  else if (typeof s === 'string') out = fill(s, name, d);
  else {
    const verb = VERB_PHRASE[input.verb] ?? 'Changed';
    out = name ? `${verb} ${q(name)}` : `${verb} an item`;
  }
  // A refused attempt keeps the same sentence: the log marks it refused.
  return out.replace(/\s+/g, ' ').trim();
}

/**
 * The function an entry was recorded by, from what the entry keeps: the
 * audit wrapper stores the function's name without its `admin-` prefix.
 */
export function functionOfEntry(entityType: string): string {
  const prefixed = `admin-${entityType}`;
  const known = (fn: string) => Object.keys(SENTENCES).some((k) => k.startsWith(`${fn}:`)) || Object.keys(AUTOMATIC).some((k) => k.startsWith(`${fn}:`));
  if (known(prefixed)) return prefixed;
  return entityType;
}
