// =====================================================================
// events-api — events (extended), registrations and attendance.
// =====================================================================

import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';
import { invokeFunction } from '@/lib/errors';
import type { OrgDivision } from '@/lib/roles';

export type EventType = 'meeting' | 'aperitivo' | 'division_event' | 'online_call' | 'guest' | 'alumni_call' | 'association_wide' | 'other';
export type RegistrationAudience = 'members' | 'members_external' | 'public';

// Event types for which choosing an organising division is mandatory.
export const DIVISION_REQUIRED_TYPES: EventType[] = ['division_event', 'alumni_call', 'meeting'];
// Recording an event in the Events archive is the CREATOR'S choice; these
// types default the choice to ON (it can be switched either way).
export const DEFAULT_ARCHIVED_TYPES: EventType[] = ['online_call', 'guest', 'alumni_call'];
// Types that can be created from Events > Create. Alumni calls are excluded:
// they are created only through Events > Alumni Calls.
export const CREATABLE_TYPES: EventType[] = ['meeting', 'aperitivo', 'division_event', 'online_call', 'guest', 'association_wide', 'other'];

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

  // ── Recognised against the register of members ────────────────────────
  // Added by `admin-event-reg` on every read; see
  // supabase/functions/_shared/member-match.ts. Optional in the type only
  // because a row that did not come from that endpoint has no answer.
  member_match?: MemberMatch;
  member_name?: string | null;
  member_division?: OrgDivision | null;
  member_ambiguous?: boolean;
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
export type MemberMatch = 'account' | 'email' | 'name' | 'none';

/** Is this registration a member of the association, however we know? */
export function isRecognisedMember(r: Pick<EventRegistration, 'member_match' | 'is_member'>): boolean {
  // `is_member` still counts: it is the answer for anybody who WAS signed
  // in, and it remains true of rows written before any of this existed.
  return (!!r.member_match && r.member_match !== 'none') || !!r.is_member;
}

/** What to call the evidence, in the reader's words. */
export const MEMBER_MATCH_LABELS: Record<MemberMatch, string> = {
  account: 'Signed in',
  email: 'Matched by email',
  name: 'Matched by name',
  none: 'Not a member',
};

/** How much weight to put on it. */
export const MEMBER_MATCH_NOTE: Record<MemberMatch, string> = {
  account: 'They were signed in when they registered, so this is their own account.',
  email: 'The address they gave is a member\u2019s address, which identifies one person.',
  name: 'The name matches one member exactly. Nothing else confirms it, so check if it matters.',
  none: 'Nothing on this registration matches the register of members.',
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  meeting: 'Internal meeting', aperitivo: 'Aperitivo', division_event: 'Division event',
  online_call: 'Online call', guest: 'Guest event', alumni_call: 'Alumni call',
  association_wide: 'Association-wide', other: 'Other',
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

export async function myEventRegistrationIds(): Promise<Set<string>> {
  const { data } = await sb.from('event_registrations').select('event_id');
  return new Set(((data || []) as { event_id: string }[]).map((r) => r.event_id));
}

export function saveEvent(session: Session | null, event: EventInput) {
  return invoke('admin-events', session, { action: event.id ? 'update' : 'create', event });
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
  return (await invoke('admin-event-reg', session, { action: 'list', event_id: eventId })).registrations;
}
export function markAttended(session: Session | null, id: string, attended: boolean) {
  return invoke('admin-event-reg', session, { action: 'mark-attended', id, attended });
}
export function addExternalAttendee(session: Session | null, eventId: string, name: string, surname: string, email: string, attended: boolean) {
  return invoke('admin-event-reg', session, { action: 'add-external', event_id: eventId, name, surname, email, attended });
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
