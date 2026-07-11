// =====================================================================
// testimonials-api — homepage testimonials, managed from the workspace
// (Website → Testimonials). Public reads are RLS-guarded to published rows;
// staff read all; writes go through the admin-testimonials edge function.
// =====================================================================

import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

export interface Testimonial {
  id: string;
  quote: string;
  alumni_id: string | null;
  name: string;
  role_label: string;
  display_order: number;
  published: boolean;
  created_at: string;
}

export interface TestimonialInput {
  id?: string;
  quote: string;
  alumni_id?: string | null;
  name: string;
  role_label: string;
  published?: boolean;
}

/** Minimal alumnus shape used to resolve the "currently at <company>" suffix. */
export interface AlumniLite {
  id: string;
  name: string;
  surname: string;
  company: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as unknown as { from: (t: string) => any };

/** Published testimonials for the public homepage (ordered). */
export async function listPublishedTestimonials(): Promise<Testimonial[]> {
  const { data, error } = await sb.from('testimonials').select('*').eq('published', true).order('display_order', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []) as Testimonial[];
}

/** All testimonials for the workspace control centre (staff, includes drafts). */
export async function listAllTestimonials(): Promise<Testimonial[]> {
  const { data, error } = await sb.from('testimonials').select('*').order('display_order', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []) as Testimonial[];
}

/** Alumni directory (public-readable) for linking + company resolution. */
export async function listAlumniLite(): Promise<AlumniLite[]> {
  const { data, error } = await sb.from('alumni').select('id, name, surname, company').order('surname', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []) as AlumniLite[];
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Resolve the alumnus that backs a testimonial: by explicit link first, then by
 * matching "First Last" against the alumni directory. Returns the alumnus and
 * whether the match was explicit — used by the control centre to flag issues.
 */
export function resolveAlumnus(t: Pick<Testimonial, 'alumni_id' | 'name'>, alumni: AlumniLite[]): { alumnus: AlumniLite | null; linked: boolean } {
  if (t.alumni_id) {
    const byId = alumni.find((a) => a.id === t.alumni_id) || null;
    return { alumnus: byId, linked: !!byId };
  }
  const parts = t.name.trim().split(/\s+/);
  const first = parts[0] ?? '';
  const last = parts.slice(1).join(' ');
  const byName = alumni.find((a) => norm(a.name) === norm(first) && norm(a.surname) === norm(last)) || null;
  return { alumnus: byName, linked: false };
}

async function invoke(session: Session | null, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('admin-testimonials', {
    body, headers: { Authorization: `Bearer ${session?.access_token}` },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export function saveTestimonial(session: Session | null, testimonial: TestimonialInput) {
  return invoke(session, { action: 'save', testimonial });
}
export function deleteTestimonial(session: Session | null, id: string) {
  return invoke(session, { action: 'delete', id });
}
/** Persist a new ordering (array of ids in the desired order). */
export function reorderTestimonials(session: Session | null, ids: string[]) {
  return invoke(session, { action: 'reorder', ids });
}
