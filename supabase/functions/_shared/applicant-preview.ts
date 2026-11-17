// =====================================================================
// APPLICANT PREVIEW: THE EMAILS AN APPLICANT RECEIVES (Step 106).
// ---------------------------------------------------------------------
// Recruiting, Applicant Preview shows the recruiting roles what an
// applicant sees and receives, with a SAMPLE applicant. This file is the
// server's half: which emails an applicant can receive, and the sample
// values they are filled with. The `applicant-preview` function fills the
// STORED copy of each email (auto_email_templates, the copy the database
// sends) exactly as the database does, by replacing each {{placeholder}}.
//
// THE SAMPLE IS "MICHAEL BURRY" (the association's choice of example
// name), at an example.com address, with made-up numbers. Nothing about a
// real person is read: it is a name on a mock application. The other real
// name used is the sitting President's, which every offer is signed with.
//
// Mirrored by APPLICANT_EMAILS in src/lib/applicant-preview.ts, which
// groups the same keys by the stage they are sent at
// (scripts/applicant-preview.test.mjs keeps the two lists equal).
// =====================================================================
import { divisionReading } from './recruiting.ts';
import { emailCallCalendarBlock, emailInterviewCalendarBlock } from './calendar.ts';
import { romeZone } from './event-time.ts';

/** Every email an applicant can receive, in the order of the journey. */
export const APPLICANT_EMAIL_KEYS = [
  'application_received',
  'division_reassignment',
  'interview_invitation',
  'interview_booking_reminder_48h',
  'interview_booking_reminder_24h',
  'interview_booking_confirmation',
  'interview_reminder_30m',
  'call_invitation',
  'call_booking_reminder',
  'call_booking_confirmation',
  'call_reminder_30m',
  'offer_to_join',
  'acceptance_reminder',
  'acceptance_received',
  'declaration_signed',
  'rejection_pre_interview',
  'rejection_post_interview',
  'offer_expired',
  'offer_withdrawn',
  'application_withdrawn',
] as const;

export const SAMPLE_APPLICANT = {
  first_name: 'Michael',
  surname: 'Burry',
  email: 'michael.burry@example.com',
  phone: '+39 300 000 0000',
  division: 'equity',
  division_name: 'Equity Research',
  second_division_name: 'Macroeconomic Research',
  semester_label: 'Spring 2027',
} as const;

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "Wednesday 25 November 2026", as the recruiting emails write a date. */
function longDay(d: Date): string {
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
const inDays = (now: Date, n: number) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + n, 12));

/** The sample values every applicant email is filled with. */
export function sampleVars(opts: { supabaseUrl: string; presidentName: string; now?: Date }): Record<string, string> {
  const now = opts.now ?? new Date();
  const interview = inDays(now, 6);
  const call = inDays(now, 12);
  const zone = (d: Date) => romeZone(d);
  const s = SAMPLE_APPLICANT;
  return {
    first_name: s.first_name,
    division_name: s.division_name,
    from_division: s.second_division_name,
    to_division: s.division_name,
    semester_label: s.semester_label,
    book_by: longDay(inDays(now, 3)),
    deadline: `${longDay(inDays(now, 3))}, 11:59 pm`,
    division_reading: divisionReading(s.division),
    interview_date: longDay(interview),
    interview_time: `5:00 pm to 5:30 pm ${zone(interview)} (30 minutes)`,
    meeting_link: 'https://teams.microsoft.com/',
    calendar_block: emailInterviewCalendarBlock(opts.supabaseUrl, 'sample', 'candidate'),
    status_url: 'https://minervaims.org/workspace/applications/status',
    call_date: longDay(call),
    call_time: `6:00 pm to 6:15 pm ${zone(call)} (15 minutes)`,
    candidate_phone: s.phone,
    caller_name: 'the Vice President',
    caller_phone: '+39 300 000 0001',
    acceptance_deadline: `${longDay(inDays(now, 17))}, 11:59 pm`,
    president_name: opts.presidentName,
    signer_name: `${s.first_name} ${s.surname}`,
    signed_at: `${longDay(inDays(now, 15))}, 10:30 am`,
  };
}

/** The call booking's calendar block, which differs from the interview's. */
export function sampleCallCalendarBlock(supabaseUrl: string): string {
  return emailCallCalendarBlock(supabaseUrl, 'sample', 'candidate');
}

/** Fill a stored subject or body as the database does: each {{key}} replaced. */
export function fillTemplate(text: string, vars: Record<string, string>): string {
  let out = text;
  for (const [k, v] of Object.entries(vars)) out = out.split(`{{${k}}}`).join(v);
  return out;
}
