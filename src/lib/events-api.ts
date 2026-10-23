// =====================================================================
// events-api — events (extended), registrations and attendance.
// =====================================================================

import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';
import { invokeFunction } from '@/lib/errors';
import type { OrgDivision } from '@/lib/roles';
import type { AlumniCallStatus, AlumniGuest } from '@/lib/alumni-call';

export type EventType = 'meeting' | 'aperitivo' | 'division_event' | 'online_call' | 'guest' | 'alumni_call' | 'association_wide' | 'association_on_display' | 'other';
export type RegistrationAudience = 'members' | 'members_external' | 'public';

// Event types for which choosing an organising division is mandatory.
export const DIVISION_REQUIRED_TYPES: EventType[] = ['division_event', 'alumni_call', 'meeting'];
// Recording an event in the Events archive is the CREATOR'S choice; these
// types default the choice to ON (it can be switched either way).
// No longer read by the archive, which lists every event; kept for callers
// that still send the flag.
export const DEFAULT_ARCHIVED_TYPES: EventType[] = ['online_call', 'guest', 'alumni_call'];

// =====================================================================
// WHICH EVENTS START OFF THE PUBLIC WEBSITE.
// ---------------------------------------------------------------------
// Internal meetings and online calls are for members, and the association
// has always hidden them from the public Events page (the migration that
// introduced the flag did exactly this to the rows it found). Everything
// else starts listed. It is a default, shown to the person creating the
// event and changeable there and later in the archive.
//
// Mirrored by WEBSITE_HIDDEN_TYPES in supabase/functions/admin-events.
// =====================================================================
export const WEBSITE_HIDDEN_TYPES: EventType[] = ['meeting', 'online_call'];
export const listedOnWebsiteByDefault = (type: EventType): boolean => !WEBSITE_HIDDEN_TYPES.includes(type);
// Types that can be created from Events > Create. Since Step 91 an alumni
// call is created here like any other event (Events > Alumni Calls is gone);
// Association on Display days are still opened from their own page.
export const CREATABLE_TYPES: EventType[] = ['meeting', 'aperitivo', 'division_event', 'online_call', 'guest', 'alumni_call', 'association_wide', 'other'];

export interface EventRow {
  id: string;
  title: string;
  date: string;
  place: string;
  moderator: string | null;
  guest: string[] | null;
  description: string | null;
  poster_url: string | null;
  event_type: EventType;
  division: OrgDivision | null;
  start_at: string | null;
  end_at: string | null;
  online: boolean;
  registration_enabled: boolean;
  registration_audience: RegistrationAudience;
  show_on_website: boolean;
  in_archive: boolean;
  /**
   * Set on the one event each Association on Display day has. That event is
   * created and kept in step by the database, and its registrations are the
   * day's sign-ups; it is edited from Association on Display, not here.
   */
  aod_day_id?: string | null;
  /** Registration reminders stopped for this event (Registration Forms). */
  reminders_paused?: boolean;
  /** Number of places; null or absent for no limit (the default). */
  capacity?: number | null;
  /**
   * An alumni call whose date is still to be confirmed (Step 91). Its `date`
   * is provisional and shown to nobody; it is off the website and kept out
   * of calendars, the Dashboard, Attendance and every count.
   */
  date_tbc?: boolean;
  created_at: string;
}

export interface EventInput {
  id?: string;
  title: string;
  date: string;
  place: string;
  moderator?: string | null;
  guest?: string[] | null;
  description?: string | null;
  poster_url?: string | null;
  event_type?: EventType;
  division?: OrgDivision | null;
  start_at?: string | null;
  end_at?: string | null;
  online?: boolean;
  registration_enabled?: boolean;
  registration_audience?: RegistrationAudience;
  show_on_website?: boolean;
  in_archive?: boolean;
  /** Sent only when set in the form: absent keeps the event's limit as it is. */
  capacity?: number | null;
}

export interface EventRegistration {
  id: string;
  event_id: string;
  user_id: string | null;
  name: string;
  email: string | null;
  is_member: boolean;
  is_external: boolean;
  attended: boolean;
  is_bocconi: boolean | null;
  programme: string | null;
  academic_year: string | null;
  affiliation: string | null;
  registered_at: string;
  /** When the person's ticket was scanned at the door (Attendance, Scan tickets). */
  checked_in_at?: string | null;

  // ── Recognised against the register of members ────────────────────────
  // Added by `admin-event-reg` on every read; see
  // supabase/functions/_shared/member-match.ts. Optional in the type only
  // because a row that did not come from that endpoint has no answer.
  member_match?: MemberMatch;
  member_name?: string | null;
  member_division?: OrgDivision | null;
  member_ambiguous?: boolean;
  /** The member the row belongs to, the one the events-attended count uses. */
  member_id?: string | null;
  /** A person said this registration is NOT a member (a guest sharing a name). */
  member_declined?: boolean;
  /** For a name two members share: who it could be, for "Link to member". */
  member_candidates?: { id: string; name: string; division: OrgDivision | null }[];
}

// =====================================================================
// A MEMBER WHO REGISTERED WITHOUT SIGNING IN IS STILL A MEMBER.
// ---------------------------------------------------------------------
// The public event form asks for a name and an address and does not
// require an account, which is the point of a public event. `is_member`
// on the row records only whether an account was attached AT THE MOMENT
// OF REGISTERING, so a member who used that form is stored as not one,
// and the door list called them an external guest.
//
// The endpoint now asks the register of members instead, and says how it
// knows. The distinction is kept all the way to the screen because the
// answers are not equally certain: an account or an address identifies
// one person, a name is a good guess. A reader taking attendance can see
// which is which and settle the rest themselves.
// =====================================================================

/** How a registration was recognised. Mirrors `MemberMatch` on the server. */
export type MemberMatch = 'account' | 'email' | 'name' | 'manual' | 'none';

/** Is this registration a member of the association, however we know? */
export function isRecognisedMember(r: Pick<EventRegistration, 'member_match' | 'is_member'>): boolean {
  // The endpoint's answer is the one the events-attended count uses, so the
  // door list says exactly what the count will count. `is_member` (was an
  // account attached when registering) is only the fallback for a row that
  // did not come through the endpoint.
  if (r.member_match) return r.member_match !== 'none';
  return !!r.is_member;
}

/** What to call the evidence, in the reader's words. */
export const MEMBER_MATCH_LABELS: Record<MemberMatch, string> = {
  account: 'Signed in',
  email: 'Matched by email',
  name: 'Matched by name',
  manual: 'Linked by hand',
  none: 'Not a member',
};

/** How much weight to put on it. */
export const MEMBER_MATCH_NOTE: Record<MemberMatch, string> = {
  account: 'They were signed in when they registered, so this is their own account.',
  email: 'The address they gave is a member\u2019s address, which identifies one person.',
  name: 'The name matches one member exactly. Nothing else confirms it, so check if it matters.',
  manual: 'Somebody linked this registration to the member by hand.',
  none: 'Nothing on this registration matches the register of members.',
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  meeting: 'Internal meeting', aperitivo: 'Aperitivo', division_event: 'Division event',
  online_call: 'Online call', guest: 'Guest event', alumni_call: 'Alumni call',
  association_wide: 'Association-wide', association_on_display: 'Association on Display', other: 'Other',
};
export const AUDIENCE_LABELS: Record<RegistrationAudience, string> = {
  members: 'Members only', members_external: 'Members & other students', public: 'Public',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as unknown as { from: (t: string) => any };

export async function listEvents(): Promise<EventRow[]> {
  const { data, error } = await sb.from('events').select('*').order('start_at', { ascending: false, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data || []) as EventRow[];
}

/**
 * The events YOU are registered for. Your own rows only: staff can read
 * every registration, and used to see every event with any registration
 * marked as theirs.
 */
export async function myEventRegistrationIds(userId?: string | null): Promise<Set<string>> {
  // The caller usually knows who is signed in already; asking the auth
  // server again costs a round trip before the real query can start.
  const uid = userId ?? (await supabase.auth.getUser()).data.user?.id;
  if (!uid) return new Set();
  const { data } = await sb.from('event_registrations').select('event_id').eq('user_id', uid);
  return new Set(((data || []) as { event_id: string }[]).map((r) => r.event_id));
}

/** The events you are waiting for a place at. Empty before the waiting list exists. */
export async function myEventWaitlistIds(userId?: string | null): Promise<Set<string>> {
  try {
    const uid = userId ?? (await supabase.auth.getUser()).data.user?.id;
    if (!uid) return new Set();
    const { data, error } = await sb.from('event_waitlist').select('event_id').eq('user_id', uid);
    if (error) return new Set();
    return new Set(((data || []) as { event_id: string }[]).map((r) => r.event_id));
  } catch {
    return new Set();
  }
}

export function saveEvent(session: Session | null, event: EventInput, alumni?: AlumniCallInput) {
  return invoke('admin-events', session, { action: event.id ? 'update' : 'create', event, ...(alumni ? { alumni } : {}) });
}

// =====================================================================
// ALUMNI CALLS ARE EVENTS (Step 91).
// ---------------------------------------------------------------------
// An alumni call is an event of type `alumni_call`. Beside it, readable
// by staff only, are where it stands and who is responsible
// (`event_alumni_calls`) and the alumni taking part (`event_alumni`). They
// are sent with the event (`saveEvent(..., alumni)`), and the event's
// public guest list is written from them by the server, with the rules in
// src/lib/alumni-call.ts.
// =====================================================================
export interface AlumniCallInput {
  status: AlumniCallStatus;
  responsible_person?: string | null;
  notes?: string | null;
  /** Saved before the date is known: off the website, no registrations. */
  date_tbc?: boolean;
  participants: AlumniGuest[];
}

export interface AlumniCallPlan {
  event_id: string;
  status: AlumniCallStatus;
  responsible_person: string | null;
  notes: string | null;
  /** Who added it. */
  added_by_name: string | null;
  participants: AlumniGuest[];
}

/** The planning of these alumni call events (or of all), by event id. */
export async function listAlumniCallPlans(eventIds?: string[]): Promise<Record<string, AlumniCallPlan>> {
  if (eventIds && eventIds.length === 0) return {};
  let plans = sb.from('event_alumni_calls').select('event_id, status, responsible_person, notes, added_by_name');
  let guests = sb.from('event_alumni').select('event_id, alumni_id, name, company, position, former_role, former_division, headline, sort_order').order('sort_order', { ascending: true });
  if (eventIds) { plans = plans.in('event_id', eventIds); guests = guests.in('event_id', eventIds); }
  const [{ data: p, error: pErr }, { data: g, error: gErr }] = await Promise.all([plans, guests]);
  if (pErr) throw new Error(pErr.message);
  if (gErr) throw new Error(gErr.message);
  const out: Record<string, AlumniCallPlan> = {};
  for (const row of (p || []) as Omit<AlumniCallPlan, 'participants'>[]) out[row.event_id] = { ...row, participants: [] };
  for (const row of (g || []) as (AlumniGuest & { event_id: string })[]) {
    const { event_id, ...guest } = row;
    (out[event_id] ??= { event_id, status: 'planned', responsible_person: null, notes: null, added_by_name: null, participants: [] }).participants.push(guest);
  }
  return out;
}
// =====================================================================
// AN ONLINE EVENT'S MEETING LINK IS PRIVATE (migration 20261005100000).
// The event's own `place` says "Online"; the link is kept apart and read
// by two kinds of people only: the organisers, to edit it, and the
// members holding a place, to join.
// =====================================================================

/** The meeting links of these events (or of all), for the organisers' edit forms. */
export async function fetchJoinLinks(session: Session | null, ids?: string[]): Promise<Record<string, string>> {
  const r = await invoke('admin-events', session, { action: 'join-links', ...(ids ? { ids } : {}) });
  return ((r && typeof r === 'object' ? (r as { links?: Record<string, string> }).links : null) ?? {});
}

export interface MyRegistration {
  event_id: string;
  status: 'registered' | 'waitlisted';
  /** The meeting link, for an online event the member holds a place at. */
  join_url: string | null;
}

/** What the signed-in member is registered for, from yesterday on, with their links. */
export async function myEventRegistrations(): Promise<MyRegistration[]> {
  const { data, error } = await supabase.rpc('my_event_registrations');
  if (error) throw error;
  return ((data || []) as unknown as MyRegistration[]).filter((r) => r && typeof r.event_id === 'string');
}

export function deleteEvent(session: Session | null, id: string) {
  return invoke('admin-events', session, { action: 'delete', event: { id } });
}

export async function uploadEventPoster(file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('event-posters').upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  return supabase.storage.from('event-posters').getPublicUrl(path).data.publicUrl;
}

// Registration & attendance
export async function listRegistrations(session: Session | null, eventId: string): Promise<EventRegistration[]> {
  return (await listRegistrationsFull(session, eventId)).registrations;
}

export interface WaitlistEntry {
  id: string;
  name: string;
  email: string;
  is_member: boolean;
  programme: string | null;
  affiliation: string | null;
  created_at: string;
}

/** The door list, the number of places and who is waiting, in order. */
export async function listRegistrationsFull(session: Session | null, eventId: string): Promise<{ registrations: EventRegistration[]; capacity: number | null; waitlist: WaitlistEntry[]; override: boolean }> {
  const res = await invoke('admin-event-reg', session, { action: 'list', event_id: eventId });
  return {
    registrations: res.registrations ?? [], capacity: res.capacity ?? null, waitlist: res.waitlist ?? [],
    // Closed for everybody else, but this reader (President, Vice President) can still correct it.
    override: !!res.attendance_override,
  };
}

/**
 * Settle who a registration is: link it to a member, or (memberId null) say
 * it is not a member. Never relinked automatically afterwards.
 */
export function linkRegistrationMember(session: Session | null, registrationId: string, memberId: string | null) {
  return invoke('admin-event-reg', session, { action: 'link-member', id: registrationId, member_id: memberId });
}

/** Events attended per member (by member id), out of those held so far in the range. Full access to Members only. */
/** An event of the semester that counts towards attendance: held, with attendance taken. */
export interface HeldEvent { id: string; title: string; date: string; start_at: string | null; aod: boolean; online: boolean }

export interface MemberAttendance {
  total: number; from: string; to: string;
  counts: Record<string, number>;
  /** The events counted, in date order. */
  events?: HeldEvent[];
  /** Per member id: the counted events they attended, and those they were registered for. */
  attended?: Record<string, string[]>;
  registered?: Record<string, string[]>;
}

export function memberEventAttendance(session: Session | null, from: string, to: string): Promise<MemberAttendance> {
  return invoke('admin-event-reg', session, { action: 'member-attendance', from, to });
}

// ── Events > My events ────────────────────────────────────────────────
export type MyHistoryStatus = 'attended' | 'registered_absent' | 'not_registered';
export interface MyHistoryEvent extends HeldEvent { status: MyHistoryStatus }
export interface MyOpenEvent {
  id: string; title: string; date: string; start_at: string | null; end_at: string | null;
  place: string | null; online: boolean; event_type: EventType; description: string | null; poster_url: string | null;
  audience: RegistrationAudience; capacity: number | null; taken: number; waiting: number;
  status: 'registered' | 'waitlisted' | 'none';
  /** The meeting link, for an online event the member holds a place at. */
  join_url: string | null;
}
export interface MyEventsData {
  from: string; to: string;
  history: MyHistoryEvent[];
  upcoming: MyOpenEvent[];
  /** The current Head of Operations, by name, for corrections. */
  head_of_operations: string | null;
}

export function myEvents(session: Session | null, from: string, to: string): Promise<MyEventsData> {
  return invoke('admin-event-reg', session, { action: 'my-events', from, to });
}

// ── Places, the waiting list and "Can't make it" ──────────────────────
export interface EventPlaces { capacity: number; taken: number; waiting: number }

/** Places left, for an event with a limit and registration open; null otherwise. */
export async function eventPlaces(eventId: string): Promise<EventPlaces | null> {
  try {
    const { data, error } = await (supabase as unknown as { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> }).rpc('event_places', { p_event_id: eventId });
    if (error) return null;
    const row = (Array.isArray(data) ? data[0] : data) as EventPlaces | undefined;
    return row && row.capacity ? row : null;
  } catch {
    return null;
  }
}

export interface CancelLookup {
  kind: 'registration' | 'waitlist' | 'gone' | 'sample';
  event?: { id: string; title: string; date: string | null; start_at: string | null; end_at: string | null; place: string | null; online: boolean };
  name?: string;
  attended?: boolean;
  started?: boolean;
  position?: number | null;
}

export function lookupCancelLink(token: string): Promise<CancelLookup> {
  return invoke('register-event', null, { action: 'lookup', t: token });
}

export function cancelByLink(token: string): Promise<{ cancelled: 'registration' | 'waitlist' }> {
  return invoke('register-event', null, { action: 'cancel', t: token });
}

/** Signed in, from the Calendar: cancel your registration or leave the waiting list. */
export function cancelMyRegistration(session: Session | null, eventId: string): Promise<{ cancelled: 'registration' | 'waitlist' }> {
  return invoke('register-event', session, { action: 'cancel', event_id: eventId });
}
// ── Check-in at the door ───────────────────────────────────────────────
// The QR code of a registration's ticket, scanned in Attendance. See
// supabase/functions/_shared/checkin.ts.
export type CheckinResult =
  | { result: 'checked_in' | 'already'; id: string; name: string; member: boolean; checked_in_at: string | null }
  | { result: 'other_event'; name: string; event_title: string | null; event_date: string | null }
  | { result: 'unknown' | 'not_a_ticket' };

/** `scannedAt`: for a scan kept on the phone without signal, when it was read at the door. */
export function checkInTicket(session: Session | null, eventId: string, token: string, scannedAt?: string): Promise<CheckinResult> {
  return invoke('admin-event-reg', session, { action: 'checkin', event_id: eventId, token, ...(scannedAt ? { scanned_at: scannedAt } : {}) });
}

/** Who is in, for every phone scanning the same event: polled by the scanner. */
export interface DoorStatus {
  rows: { id: string; attended: boolean; checked_in_at: string | null }[];
  checked_in: number;
  total: number;
}
export function doorStatus(session: Session | null, eventId: string): Promise<DoorStatus> {
  return invoke('admin-event-reg', session, { action: 'door-status', event_id: eventId });
}

export function markAttended(session: Session | null, id: string, attended: boolean) {
  return invoke('admin-event-reg', session, { action: 'mark-attended', id, attended });
}
export function addExternalAttendee(session: Session | null, eventId: string, name: string, surname: string, email: string, attended: boolean) {
  return invoke('admin-event-reg', session, { action: 'add-external', event_id: eventId, name, surname, email, attended });
}
// A member who turned up without registering: searched on the register
// and added as a member (see admin-event-reg, `members` and `add-member`).
export interface AttendanceMember {
  id: string;
  first_name: string | null;
  surname: string | null;
  email: string | null;
  division: OrgDivision | null;
  membership_status: string | null;
}
export async function listAttendanceMembers(session: Session | null): Promise<AttendanceMember[]> {
  return (await invoke('admin-event-reg', session, { action: 'members' }))?.members || [];
}
export async function addMemberAttendee(session: Session | null, eventId: string, memberId: string): Promise<{ already_listed: boolean; name: string }> {
  return invoke('admin-event-reg', session, { action: 'add-member', event_id: eventId, member_id: memberId });
}
// An online event's attendance from the meeting's report (see
// src/lib/attendance-report.ts and admin-event-reg, `import-preview` and
// `import-attendance`). The server recognises each person itself.
export interface ImportPerson { name: string; email: string | null }
export interface ImportPreviewRow {
  /** The person's place in the list sent. */
  i: number;
  name: string;
  email: string | null;
  kind: 'member' | 'guest';
  /** How a member was recognised: by address (certain) or by name (probable). */
  how: 'email' | 'name' | null;
  /** The name matches more than one member, so nobody is claimed. */
  ambiguous: boolean;
  member_name: string | null;
  member_division: OrgDivision | null;
  on_list: boolean;
  already_present: boolean;
}
export function previewAttendanceImport(session: Session | null, eventId: string, people: ImportPerson[]): Promise<{ people: ImportPreviewRow[] }> {
  return invoke('admin-event-reg', session, { action: 'import-preview', event_id: eventId, people });
}
export interface ImportResult { ticked: number; added_members: number; added_guests: number; already: number; total: number }
export function importAttendance(session: Session | null, eventId: string, people: ImportPerson[]): Promise<ImportResult> {
  return invoke('admin-event-reg', session, { action: 'import-attendance', event_id: eventId, people });
}
export function removeRegistration(session: Session | null, id: string) {
  return invoke('admin-event-reg', session, { action: 'remove', id });
}
export interface EventRegistrationPayload {
  event_id: string;
  name?: string;
  email?: string;
  is_bocconi?: boolean;
  programme?: string;
  academic_year?: string;
  affiliation?: string;
}
export async function registerForEvent(session: Session | null, payload: EventRegistrationPayload) {
  return invoke('register-event', session, { ...payload });
}

// =====================================================================
// SIGNED IN IS NOT THE SAME THING AS "WE ALREADY HAVE YOUR DETAILS".
// ---------------------------------------------------------------------
// The registration form used to ask one question, "is anybody signed
// in?", and take the answer to mean two different things: that the
// person may register, and that the association already holds their
// name, programme and year. For a member both are true. For AN
// APPLICANT THEY ARE NOT, and an applicant has an account: they sign in
// to follow their application. So a candidate opening an event page saw
// "your details are filled in automatically", pressed Register, and the
// endpoint answered "Please provide your name" about a field the form
// had never shown them. Nothing they could do on that page would have
// worked.
//
// `register-event` decides who is a member with exactly this rule, and
// this is a mirror of it, kept here beside the call it belongs to. If
// one changes, change the other: a form that disagrees with its endpoint
// about who somebody is produces precisely the failure above.
// =====================================================================

/** Roles that do not, on their own, make somebody a member of the association. */
export const NON_MEMBER_ROLES = ['candidate', 'pending'];

/**
 * Does this account belong to a member of the association, as the
 * registration endpoint counts one? An applicant, a pending account and
 * an account holding no role at all are all "no".
 */
export function isAssociationMember(roles: { role: string }[] | null | undefined): boolean {
  return (roles || []).some((r) => !NON_MEMBER_ROLES.includes(r.role));
}

  // `any` deliberately, matching what `supabase.functions.invoke` used to
  // hand back: every caller in this module already narrows the shape it
  // expects. Only the ERROR path changed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
async function invoke(fn: string, session: Session | null, body: Record<string, unknown>): Promise<any> {
  return invokeFunction(fn, { body: body, session });
}


// =====================================================================
// THE ATTENDANCE WINDOW: open until the end of the event's semester.
// ---------------------------------------------------------------------
// The mirror of supabase/functions/_shared/attendance-window.ts, which is
// what actually refuses a change. Fall closes on 31 January, Spring on 31
// August (src/lib/semester.ts), and never less than fourteen days after
// the event, so one late in a semester still has two weeks. Counted on
// Rome's calendar, the last day included. After that, the President and
// the Vice President can still correct the list (the endpoint says so in
// `attendance_override`).
// =====================================================================
export const ATTENDANCE_MIN_OPEN_DAYS = 14;

function romeToday(at: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** The last day of the semester a date (YYYY-MM-DD) belongs to. */
function semesterEndOf(day: string): string {
  const [y, m] = day.slice(0, 10).split('-').map(Number);
  if (m >= 9) return `${y + 1}-01-31`;
  if (m === 1) return `${y}-01-31`;
  return `${y}-08-31`;
}

/** Whether this event's attendance can still be changed, and until when. */
export function attendanceWindow(eventDate: string | null | undefined, at: Date = new Date()): { open: boolean; closesOn: string | null } {
  if (!eventDate) return { open: true, closesOn: null };
  const [y, m, d] = eventDate.slice(0, 10).split('-').map(Number);
  const floor = new Date(Date.UTC(y, m - 1, d + ATTENDANCE_MIN_OPEN_DAYS)).toISOString().slice(0, 10);
  const end = semesterEndOf(eventDate);
  const closesOn = end > floor ? end : floor;
  return { open: romeToday(at) <= closesOn, closesOn };
}

// =====================================================================
// REGISTRATION REMINDERS (Registration Forms).
// ---------------------------------------------------------------------
// Two weeks, one week and three days before an event with an open form,
// every active member not yet registered receives a reminder. The
// database sends them; `admin-event-reminders` reports the schedule and
// stops, resumes or tests them. Shapes mirror
// supabase/functions/_shared/event-reminders.ts.
// =====================================================================
export type ReminderStage = '2w' | '1w' | '3d' | '24h_attending';
export type ReminderState = 'sent' | 'scheduled' | 'on_hold' | 'skipped';
export interface ReminderStageStatus {
  stage: ReminderStage;
  label: string;
  due_on: string;
  state: ReminderState;
  sent_at: string | null;
  recipients: number | null;
  catching_up?: boolean;
}
// The thank-you the morning after, to the guests who attended and are not
// members. `waiting`: due, but nobody has been marked as attended yet.
export type ThankYouState = 'sent' | 'scheduled' | 'waiting' | 'not_sent';
export interface ThankYouStatus {
  due_on: string;
  state: ThankYouState;
  sent_at: string | null;
  recipients: number | null;
}
export interface EventReminderStatus {
  event_id: string;
  paused: boolean;
  paused_at: string | null;
  paused_by: string | null;
  stages: ReminderStageStatus[];
  thank_you?: ThankYouStatus | null;
}
export interface ReminderTestResult { stage: ReminderStage | 'thank_you'; status: string }

export async function listReminderStatus(session: Session | null): Promise<{ reminders: EventReminderStatus[]; can_manage: boolean }> {
  const res = await invoke('admin-event-reminders', session, { action: 'status' });
  return { reminders: res?.reminders || [], can_manage: !!res?.can_manage };
}
export function setRemindersPaused(session: Session | null, eventId: string, paused: boolean) {
  return invoke('admin-event-reminders', session, { action: 'set-paused', event_id: eventId, paused });
}
export async function sendReminderTest(session: Session | null, eventId: string, to: string, stage?: 'thank_you' | 'notices'): Promise<{ to: string; results: ReminderTestResult[] }> {
  return invoke('admin-event-reminders', session, { action: 'send-test', event_id: eventId, to, ...(stage ? { stage } : {}) });
}
