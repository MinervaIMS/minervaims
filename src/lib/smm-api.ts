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
  ad_date: string;
  amount: number;
  campaign_purpose: string | null;
  effectiveness_notes: string | null;
  treasury_entry_id: string | null;
}

export interface AdInput {
  id?: string;
  content: string;
  platform?: string | null;
  ad_date: string;
  amount: number;
  campaign_purpose?: string | null;
  effectiveness_notes?: string | null;
}

export const FORMAT_LABELS: Record<EditorialFormat, string> = {
  ig_story: 'Instagram story', ig_post: 'Instagram post', ig_reel: 'Instagram reel', li_post: 'LinkedIn post', other: 'Other',
};
export const PLATFORM_LABELS: Record<EditorialPlatform, string> = { instagram: 'Instagram', linkedin: 'LinkedIn', other: 'Other' };

// =====================================================================
// PLATFORM AND FORMAT ARE ONE CHOICE, NOT TWO INDEPENDENT ONES.
// ---------------------------------------------------------------------
// The editor offered them as two unrelated dropdowns over the same five
// formats, which made the pair both repetitive and wrong:
//
//   * every option restated the platform sitting beside it - "LinkedIn"
//     followed by "LinkedIn post" - so the second control spent a whole
//     line saying what the first had just said;
//   * and the lists did not agree. "Instagram reel" could be chosen with
//     the platform set to LinkedIn, and the record would be saved that
//     way, because nothing checked.
//
// The formats belong TO a platform, so they are declared that way here.
// The stored values are untouched - `ig_story`, `li_post` and the rest
// are the same strings the table's CHECK constraint and the edge
// function already know - and `FORMAT_LABELS` still spells each one in
// full for the places a format appears on its own, where the platform is
// not there to supply the context.
// =====================================================================

/** The formats each platform offers, in the order they are offered. */
export const FORMATS_BY_PLATFORM: Record<EditorialPlatform, EditorialFormat[]> = {
  instagram: ['ig_story', 'ig_post', 'ig_reel'],
  linkedin: ['li_post'],
  other: ['other'],
};

/**
 * The format's name WITHOUT its platform, for use directly beside a
 * platform control. "Story", not "Instagram story".
 */
export const FORMAT_SHORT_LABELS: Record<EditorialFormat, string> = {
  ig_story: 'Story', ig_post: 'Post', ig_reel: 'Reel', li_post: 'Post', other: 'Other',
};

/**
 * The format to hold after a platform change: the current one if it still
 * belongs to that platform, otherwise the platform's first. Calling this
 * on every platform change is what makes an inconsistent pair
 * unrepresentable rather than merely discouraged.
 */
export function formatForPlatform(platform: EditorialPlatform, current: EditorialFormat): EditorialFormat {
  const allowed = FORMATS_BY_PLATFORM[platform];
  return allowed.includes(current) ? current : allowed[0];
}

/** The platform a stored format belongs to, for repairing legacy rows. */
export function platformForFormat(format: EditorialFormat): EditorialPlatform {
  const found = (Object.keys(FORMATS_BY_PLATFORM) as EditorialPlatform[])
    .find((p) => FORMATS_BY_PLATFORM[p].includes(format));
  return found ?? 'other';
}
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
