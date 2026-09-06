/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { allows, rolesOf } from '../_shared/access.ts';

// =====================================================================
// admin-smm — SMM editorial calendar + ads/spending register (report 11).
// Managed by the Head of Media & Communication and Media Analysts.
// ---------------------------------------------------------------------
// READING AND WRITING ARE NOW TWO QUESTIONS, ANSWERED FROM THE MATRIX.
//
// One array used to answer both, and it was shorter than the matrix. The
// Head of Operations is granted 'view' on the editorial calendar and on
// the ads register, and an advisor is granted 'view' on everything; both
// opened the two pages and both got 403, so the pages loaded and the
// tables stayed empty. That is the fault as reported: "shows no data for
// some roles that can see it".
//
// The two subsections are also asked about separately. A Media Analyst
// manages the Instagram and LinkedIn plans but only READS the editorial
// calendar and the ads register, and there is no way to say that with a
// single list.
// =====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
/** The subsection each action belongs to, and what it needs there. */
const EDITORIAL = 'smm-editorial';
const ADS = 'smm-ads';

function academicSemester(d: Date): string {
  const m = d.getMonth() + 1; const y = d.getFullYear();
  return m >= 9 || m === 1 ? `Sep-Jan ${m === 1 ? y - 1 : y}` : `Feb-Aug ${y}`;
}

const PlatformEnum = z.enum(['instagram', 'linkedin', 'other']);
const FormatEnum = z.enum(['ig_story', 'ig_post', 'ig_reel', 'li_post', 'other']);

/** The formats each platform offers. Mirrors FORMATS_BY_PLATFORM on the client. */
const FORMATS_BY_PLATFORM: Record<string, string[]> = {
  instagram: ['ig_story', 'ig_post', 'ig_reel'],
  linkedin: ['li_post'],
  other: ['other'],
};

// =====================================================================
// AN ITEM GOES TO ONE PLACE OR TO SEVERAL, AND SAYS WHICH FORMAT IN EACH.
// ---------------------------------------------------------------------
// `platforms` and `formats` are parallel: element i of one describes
// element i of the other, which is what lets a single piece be a reel on
// Instagram and a post on LinkedIn without being two records.
//
// The checks are here as well as in the table because a form is not the
// only way in, and because two of them cannot be written as a column
// constraint at all: that the two arrays are the same length, that no
// platform is listed twice, and that each format actually belongs to the
// platform beside it. A LinkedIn reel is not a thing, and refusing it
// here means it can never be stored, whichever client asks.
// =====================================================================
const EditorialSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  event_id: z.string().uuid().nullable().optional(),
  platforms: z.array(PlatformEnum).min(1).max(3),
  formats: z.array(FormatEnum).min(1).max(3),
  scheduled_date: z.string().nullable().optional(),
  responsible_person: z.string().max(200).nullable().optional(),
  status: z.enum(['idea', 'scheduled', 'in_progress', 'published', 'cancelled']),
  paid: z.boolean().optional(),
  notes: z.string().max(2000).nullable().optional(),
})
  .refine((v) => v.platforms.length === v.formats.length, {
    message: 'Each destination needs its own format', path: ['formats'],
  })
  .refine((v) => new Set(v.platforms).size === v.platforms.length, {
    message: 'A destination can only be chosen once', path: ['platforms'],
  })
  .refine(
    (v) => v.platforms.every((p, i) => FORMATS_BY_PLATFORM[p].includes(v.formats[i])),
    { message: 'That format does not belong to that destination', path: ['formats'] },
  );

const AdSchema = z.object({
  id: z.string().uuid().optional(),
  content: z.string().min(1).max(300),
  platform: z.string().max(100).nullable().optional(),
  ad_date: z.string().min(1),
  amount: z.number().positive(),
  campaign_purpose: z.string().max(500).nullable().optional(),
  effectiveness_notes: z.string().max(2000).nullable().optional(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.split(' ')[1]);
    if (authError || !user) return json({ error: 'Invalid token' }, 401);
    const { data: roleRows } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
    const roles = rolesOf(roleRows);
    const email = user.email;

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    // Each action is checked against ITS OWN subsection, at the level it
    // actually needs. Listing needs 'view'; saving and deleting need
    // 'manage'. A caller with neither on either subsection is refused here,
    // so an unrelated role still cannot reach the function at all.
    const resource = action?.startsWith('ads-') ? ADS : EDITORIAL;
    const needed = action?.endsWith('-list') ? 'view' : 'manage';
    if (!allows(roles, email, resource, needed)) {
      return json({
        error: needed === 'manage'
          ? 'Your role can read this register but not change it.'
          : 'Access denied',
      }, 403);
    }

    // ── editorial ────────────────────────────────────────────────────────
    if (action === 'editorial-list') {
      const { data, error } = await supabase.from('editorial_items').select('*').order('scheduled_date', { ascending: true, nullsFirst: false });
      if (error) throw error;
      // A row written before the arrays existed is answered as a
      // one-element pair, so the client never has to know there were two
      // shapes. The database backfill does the same thing; this covers a
      // database where the migration has not run yet.
      const items = (data || []).map((r: any) => ({
        ...r,
        platforms: Array.isArray(r.platforms) && r.platforms.length ? r.platforms : [r.platform],
        formats: Array.isArray(r.formats) && r.formats.length ? r.formats : [r.format],
      }));
      return json({ items });
    }
    if (action === 'editorial-delete') {
      const { error } = await supabase.from('editorial_items').delete().eq('id', body.id);
      if (error) throw error;
      return json({ success: true });
    }
    if (action === 'editorial-save') {
      const parsed = EditorialSchema.safeParse(body.item);
      if (!parsed.success) return json({ error: 'Validation failed', details: parsed.error.format() }, 400);
      const i = parsed.data;
      // `platform` and `format` are the first of each array. The table's
      // trigger sets them too; writing them here as well means a row is
      // correct even if this function is ever pointed at a database that
      // has not had the trigger applied yet.
      const payload = {
        title: i.title, event_id: i.event_id ?? null,
        platforms: i.platforms, formats: i.formats,
        platform: i.platforms[0], format: i.formats[0],
        scheduled_date: i.scheduled_date || null, responsible_person: i.responsible_person ?? null,
        status: i.status, paid: i.paid ?? false, notes: i.notes ?? null,
      };
      if (i.id) { const { error } = await supabase.from('editorial_items').update(payload).eq('id', i.id); if (error) throw error; }
      else { const { error } = await supabase.from('editorial_items').insert({ ...payload, created_by: user.id }); if (error) throw error; }
      return json({ success: true });
    }

    // ── ads ──────────────────────────────────────────────────────────────
    if (action === 'ads-list') {
      const { data, error } = await supabase.from('ads_spending').select('*').order('ad_date', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return json({ ads: data || [] });
    }
    if (action === 'ads-delete') {
      const { error } = await supabase.from('ads_spending').delete().eq('id', body.id);
      if (error) throw error;
      return json({ success: true });
    }
    if (action === 'ads-save') {
      const parsed = AdSchema.safeParse(body.ad);
      if (!parsed.success) return json({ error: 'Validation failed', details: parsed.error.format() }, 400);
      const a = parsed.data;
      const payload = {
        content: a.content, platform: a.platform ?? null, ad_date: a.ad_date,
        amount: a.amount, campaign_purpose: a.campaign_purpose ?? null, effectiveness_notes: a.effectiveness_notes ?? null,
      };
      if (a.id) {
        // Editing never re-posts to the Treasury (the register is append-only
        // financially). Only the descriptive fields change.
        const { error } = await supabase.from('ads_spending').update(payload).eq('id', a.id);
        if (error) throw error;
        return json({ success: true });
      }

      // New entry: post the spend to the Treasury once, on the date incurred.
      let treasuryEntryId: string | null = null;
      {
        const when = new Date(a.ad_date);
        const { data: entry, error: entryErr } = await supabase.from('treasury_entries').insert({
          // Ads are always a cost: store the amount as a negative (outflow)
          // so it reduces the treasury balance.
          amount: -Math.abs(a.amount), flow: 'out',
          description: 'Advertising - social media communication',
          source: 'ads_spending', execution_date: a.ad_date,
          academic_semester: academicSemester(when), is_auto: true, locked: true, created_by: user.id,
        }).select('id').single();
        if (entryErr) throw entryErr;
        treasuryEntryId = entry.id;
      }
      const { error } = await supabase.from('ads_spending').insert({ ...payload, treasury_entry_id: treasuryEntryId, created_by: user.id });
      if (error) throw error;
      return json({ success: true });
    }

    return json({ error: 'Invalid action' }, 400);
  } catch (error) {
    console.error('admin-smm error:', error);
    return json({ error: 'An unexpected error occurred. Please try again.' }, 500);
  }
});
