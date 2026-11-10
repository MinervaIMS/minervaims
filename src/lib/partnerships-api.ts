// =====================================================================
// partnerships-api: the partners on /partnerships (Step 105).
// ---------------------------------------------------------------------
// The other student associations the Society has an agreement or a joint
// initiative with: one list, in the order the Board sets.
//
// Visitors read the published partners straight from the table (its row
// policy shows them nothing else). The workspace, Website > Partnerships,
// reads and writes through the admin-partnerships function, which checks
// the access matrix and records every change.
// =====================================================================

import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { invokeFunction } from '@/lib/errors';

export interface Partner {
  id: string;
  name: string;
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
