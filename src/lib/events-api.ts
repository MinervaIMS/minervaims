// =====================================================================
// events-api — events (extended), registrations and attendance.
// =====================================================================

import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';
import type { OrgDivision } from '@/lib/roles';

export type EventType = 'meeting' | 'assembly' | 'division_event' | 'online_call' | 'guest' | 'alumni_call' | 'association_wide' | 'other';
export type RegistrationAudience = 'members' | 'members_external' | 'guests' | 'public';

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
  registered_at: string;
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  meeting: 'Internal meeting', assembly: 'Assembly', division_event: 'Division event',
  online_call: 'Online call', guest: 'Guest event', alumni_call: 'Alumni call',
  association_wide: 'Association-wide', other: 'Other',
};
export const AUDIENCE_LABELS: Record<RegistrationAudience, string> = {
  members: 'Members only', members_external: 'Members & external students',
  guests: 'Selected guests', public: 'Public',
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
export function addExternalAttendee(session: Session | null, eventId: string, name: string, email: string, attended: boolean) {
  return invoke('admin-event-reg', session, { action: 'add-external', event_id: eventId, name, email, attended });
}
export function removeRegistration(session: Session | null, id: string) {
  return invoke('admin-event-reg', session, { action: 'remove', id });
}
export async function registerForEvent(session: Session | null, payload: { event_id: string; name?: string; email?: string }) {
  return invoke('register-event', session, payload);
}

async function invoke(fn: string, session: Session | null, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke(fn, {
    body, headers: { Authorization: `Bearer ${session?.access_token}` },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}
