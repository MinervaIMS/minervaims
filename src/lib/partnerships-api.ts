// =====================================================================
// partnerships-api: the partners on /partnerships (Step 105).
// ---------------------------------------------------------------------
// Visitors read the published partners straight from the table (its row
// policy shows them nothing else). The workspace, Website > Partnerships,
// reads and writes through the admin-partnerships function, which checks
// the access matrix and records every change.
// =====================================================================

import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { invokeFunction } from '@/lib/errors';

export type PartnerKind = 'service_provider' | 'student_association';

export const PARTNER_KIND_LABEL: Record<PartnerKind, string> = {
  service_provider: 'Service provider',
  student_association: 'Student association',
};

/** The two groups of the public page, in their order, with their headings. */
export const PARTNER_GROUPS: { kind: PartnerKind; heading: string; intro: string }[] = [
  {
    kind: 'student_association',
    heading: 'Student associations',
    intro: 'Associations we work alongside: joint events, shared initiatives and opportunities for both memberships.',
  },
  {
    kind: 'service_provider',
    heading: 'Service providers',
    intro: 'Organisations that support the Society with tools, data, services or conditions for our members.',
  },
];

export interface Partner {
  id: string;
  name: string;
  kind: PartnerKind;
  /** What the agreement covers, in a sentence or two. */
  summary: string | null;
  url: string | null;
  logo_url: string | null;
  display_order: number;
  published: boolean;
  updated_at?: string;
}

export interface PartnerInput {
  id?: string;
  name: string;
  kind: PartnerKind;
  summary?: string | null;
  url?: string | null;
  logo_url?: string | null;
  published?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as unknown as { from: (t: string) => any };

/** The published partners, for the public page; empty when the table is not there yet. */
export async function listPublishedPartners(): Promise<Partner[]> {
  try {
    const { data, error } = await sb.from('partnerships').select('*').eq('published', true)
      .order('display_order', { ascending: true }).order('name', { ascending: true });
    if (error) return [];
    return (data || []) as Partner[];
  } catch {
    return [];
  }
}

const call = <T>(session: Session | null, body: Record<string, unknown>) =>
  invokeFunction<T>('admin-partnerships', { body, session });

export async function listAllPartners(session: Session | null): Promise<Partner[]> {
  return (await call<{ partnerships: Partner[] }>(session, { action: 'list' })).partnerships;
}

export function savePartner(session: Session | null, partner: PartnerInput) {
  return call<{ success: true; id: string }>(session, { action: 'save', partner });
}

export function deletePartner(session: Session | null, id: string) {
  return call<{ success: true }>(session, { action: 'delete', id });
}

export function reorderPartners(session: Session | null, ids: string[]) {
  return call<{ success: true }>(session, { action: 'reorder', ids });
}

/** Puts a logo in storage through a one-time link and returns its public address. */
export async function uploadPartnerLogo(session: Session | null, file: File): Promise<string> {
  if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) throw new Error('A logo must be a PNG, JPEG, WebP or SVG image.');
  if (file.size > 2 * 1024 * 1024) throw new Error('A logo must be under 2 MB.');
  const link = await call<{ bucket: string; path: string; token: string; public_url: string }>(session, { action: 'logo-upload-url', content_type: file.type });
  const { error } = await supabase.storage.from(link.bucket).uploadToSignedUrl(link.path, link.token, file, { contentType: file.type });
  if (error) throw new Error('The logo did not upload. Please try again.');
  return link.public_url;
}
