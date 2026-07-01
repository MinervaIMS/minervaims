// =====================================================================
// smm-api — editorial calendar + ads/spending register.
// =====================================================================

import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

export type EditorialPlatform = 'instagram' | 'linkedin' | 'other';
export type EditorialFormat = 'ig_story' | 'ig_post' | 'ig_reel' | 'li_post' | 'other';
export type EditorialStatus = 'idea' | 'scheduled' | 'in_progress' | 'published' | 'cancelled';

export interface EditorialItem {
  id: string;
  title: string;
  event_id: string | null;
  platform: EditorialPlatform;
  format: EditorialFormat;
  scheduled_date: string | null;
  responsible_person: string | null;
  status: EditorialStatus;
  paid: boolean;
  notes: string | null;
}

export interface EditorialInput {
  id?: string;
  title: string;
  event_id?: string | null;
  platform: EditorialPlatform;
  format: EditorialFormat;
  scheduled_date?: string | null;
  responsible_person?: string | null;
  status: EditorialStatus;
  paid?: boolean;
  notes?: string | null;
}

export interface AdEntry {
  id: string;
  content: string;
  platform: string | null;
  ad_date: string | null;
  amount: number | null;
  campaign_purpose: string | null;
  effectiveness_notes: string | null;
  treasury_entry_id: string | null;
}

export interface AdInput {
  id?: string;
  content: string;
  platform?: string | null;
  ad_date?: string | null;
  amount?: number | null;
  campaign_purpose?: string | null;
  effectiveness_notes?: string | null;
}

export const FORMAT_LABELS: Record<EditorialFormat, string> = {
  ig_story: 'Instagram story', ig_post: 'Instagram post', ig_reel: 'Instagram reel', li_post: 'LinkedIn post', other: 'Other',
};
export const PLATFORM_LABELS: Record<EditorialPlatform, string> = { instagram: 'Instagram', linkedin: 'LinkedIn', other: 'Other' };
export const ED_STATUS_LABELS: Record<EditorialStatus, string> = {
  idea: 'Idea', scheduled: 'Scheduled', in_progress: 'In progress', published: 'Published', cancelled: 'Cancelled',
};

async function invoke(session: Session | null, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('admin-smm', { body, headers: { Authorization: `Bearer ${session?.access_token}` } });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function listEditorial(session: Session | null): Promise<EditorialItem[]> {
  return (await invoke(session, { action: 'editorial-list' })).items;
}
export function saveEditorial(session: Session | null, item: EditorialInput) {
  return invoke(session, { action: 'editorial-save', item });
}
export function deleteEditorial(session: Session | null, id: string) {
  return invoke(session, { action: 'editorial-delete', id });
}

export async function listAds(session: Session | null): Promise<AdEntry[]> {
  return (await invoke(session, { action: 'ads-list' })).ads;
}
export function saveAd(session: Session | null, ad: AdInput) {
  return invoke(session, { action: 'ads-save', ad });
}
export function deleteAd(session: Session | null, id: string) {
  return invoke(session, { action: 'ads-delete', id });
}
