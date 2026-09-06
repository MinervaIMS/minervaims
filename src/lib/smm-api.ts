// =====================================================================
// smm-api — editorial calendar + ads/spending register.
// =====================================================================

import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

import { invokeFunction } from '@/lib/errors';
export type EditorialPlatform = 'instagram' | 'linkedin' | 'other';
export type EditorialFormat = 'ig_story' | 'ig_post' | 'ig_reel' | 'li_post' | 'other';
export type EditorialStatus = 'idea' | 'scheduled' | 'in_progress' | 'published' | 'cancelled';

// =====================================================================
// ONE PIECE OF WORK, HOWEVER MANY PLACES IT GOES.
// ---------------------------------------------------------------------
// `platforms` and `formats` are parallel arrays: `platforms[i]` is a
// destination and `formats[i]` is what the piece is IN that destination.
// A teaser that runs as a reel on Instagram and a post on LinkedIn is one
// row, not two, which is the whole point: it used to be two rows with the
// same title, kept in step by whoever remembered.
//
// `platform` and `format` remain, holding the first of each. Nothing new
// should read them - they are there so that the day chip's colour, and
// anything else written against the single-value shape, keeps working
// without being rewritten.
// =====================================================================
export interface EditorialItem {
  id: string;
  title: string;
  event_id: string | null;
  /** @deprecated The first of `platforms`. Kept for the single-value readers. */
  platform: EditorialPlatform;
  /** @deprecated The first of `formats`. Kept for the single-value readers. */
  format: EditorialFormat;
  platforms: EditorialPlatform[];
  formats: EditorialFormat[];
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
  platforms: EditorialPlatform[];
  formats: EditorialFormat[];
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

/** The order destinations are always offered and always listed in. */
export const PLATFORM_ORDER: EditorialPlatform[] = ['instagram', 'linkedin', 'other'];

/**
 * Add or remove one destination, keeping the two arrays in step.
 *
 * THE PAIR IS EDITED TOGETHER OR IT GOES WRONG. Every alternative was
 * tried in the writing of this: two pieces of state that a handler has to
 * remember to update together, an array of objects that then has to be
 * flattened on save, a set plus a lookup. All of them work until one
 * handler forgets, and the failure is a row whose formats describe the
 * wrong platforms - which the server refuses, correctly, with an error
 * the editor cannot act on.
 *
 * So the toggle is one function, it is the only way the arrays change,
 * and it cannot produce a mismatched pair. Removing the last destination
 * is refused here rather than at the server: an item has to go somewhere.
 */
export function togglePlatform(
  platforms: EditorialPlatform[],
  formats: EditorialFormat[],
  platform: EditorialPlatform,
): { platforms: EditorialPlatform[]; formats: EditorialFormat[] } {
  const at = platforms.indexOf(platform);
  if (at >= 0) {
    if (platforms.length === 1) return { platforms, formats };
    return {
      platforms: platforms.filter((_, i) => i !== at),
      formats: formats.filter((_, i) => i !== at),
    };
  }
  // Added in the canonical order, so the list reads the same whatever
  // order the editor happened to click in.
  const next = PLATFORM_ORDER.filter((p) => p === platform || platforms.includes(p));
  return {
    platforms: next,
    formats: next.map((p) => {
      const was = platforms.indexOf(p);
      return was >= 0 ? formats[was] : FORMATS_BY_PLATFORM[p][0];
    }),
  };
}

/** Set the format for one destination, leaving the others alone. */
export function setFormatFor(
  platforms: EditorialPlatform[],
  formats: EditorialFormat[],
  platform: EditorialPlatform,
  format: EditorialFormat,
): EditorialFormat[] {
  const at = platforms.indexOf(platform);
  if (at < 0) return formats;
  return formats.map((f, i) => (i === at ? format : f));
}

/**
 * A stored row as a valid pair, whatever shape it was saved in.
 *
 * Rows predate the arrays, and a row saved when the two controls did not
 * agree can hold a format that does not belong to its platform - LinkedIn
 * with an Instagram reel. Both are repaired here, once, so the editor is
 * never opened in a state its own controls cannot express.
 */
export function normalisedDestinations(item: {
  platform: EditorialPlatform; format: EditorialFormat;
  platforms?: EditorialPlatform[] | null; formats?: EditorialFormat[] | null;
}): { platforms: EditorialPlatform[]; formats: EditorialFormat[] } {
  const rawP = item.platforms?.length ? item.platforms : [item.platform];
  const rawF = item.formats?.length ? item.formats : [item.format];
  const seen = new Set<EditorialPlatform>();
  const platforms: EditorialPlatform[] = [];
  const formats: EditorialFormat[] = [];
  rawP.forEach((p, i) => {
    if (seen.has(p)) return;
    seen.add(p);
    platforms.push(p);
    formats.push(formatForPlatform(p, rawF[i] ?? rawF[0] ?? 'other'));
  });
  if (platforms.length === 0) return { platforms: ['instagram'], formats: ['ig_post'] };
  return { platforms, formats };
}

/** "Instagram reel and LinkedIn post", for a preview or a tooltip. */
export function describeDestinations(
  platforms: EditorialPlatform[],
  formats: EditorialFormat[],
): string {
  const parts = platforms.map((p, i) => `${PLATFORM_LABELS[p]} ${FORMAT_SHORT_LABELS[formats[i]].toLowerCase()}`);
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}
export const ED_STATUS_LABELS: Record<EditorialStatus, string> = {
  idea: 'Idea', scheduled: 'Scheduled', in_progress: 'In progress', published: 'Published', cancelled: 'Cancelled',
};

  // `any` deliberately, matching what `supabase.functions.invoke` used to
  // hand back: every caller in this module already narrows the shape it
  // expects. Only the ERROR path changed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
async function invoke(session: Session | null, body: Record<string, unknown>): Promise<any> {
  return invokeFunction('admin-smm', { body: body, session });
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
