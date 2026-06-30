/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// =====================================================================
// admin-smm — SMM editorial calendar + ads/spending register (report 11).
// Managed by the Head of Media & Communication and Media Analysts.
// =====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
const MANAGE = ['admin', 'president', 'vice_president', 'head_of_asset_management', 'head_of_media', 'media_analyst'];

const EditorialSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  event_id: z.string().uuid().nullable().optional(),
  platform: z.enum(['instagram', 'linkedin', 'other']),
  format: z.enum(['ig_story', 'ig_post', 'ig_reel', 'li_post', 'other']),
  scheduled_date: z.string().nullable().optional(),
  responsible_person: z.string().max(200).nullable().optional(),
  status: z.enum(['idea', 'scheduled', 'in_progress', 'published', 'cancelled']),
  paid: z.boolean().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

const AdSchema = z.object({
  id: z.string().uuid().optional(),
  content: z.string().min(1).max(300),
  platform: z.string().max(100).nullable().optional(),
  ad_date: z.string().nullable().optional(),
  amount: z.number().nullable().optional(),
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
    const roles = (roleRows || []).map((r: any) => r.role);
    const canManage = user.email === 'as.minerva@unibocconi.it' || roles.some((r: string) => MANAGE.includes(r));
    if (!canManage) return json({ error: 'Access denied' }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    // ── editorial ────────────────────────────────────────────────────────
    if (action === 'editorial-list') {
      const { data, error } = await supabase.from('editorial_items').select('*').order('scheduled_date', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return json({ items: data || [] });
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
      const payload = {
        title: i.title, event_id: i.event_id ?? null, platform: i.platform, format: i.format,
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
        content: a.content, platform: a.platform ?? null, ad_date: a.ad_date || null,
        amount: a.amount ?? null, campaign_purpose: a.campaign_purpose ?? null, effectiveness_notes: a.effectiveness_notes ?? null,
      };
      if (a.id) { const { error } = await supabase.from('ads_spending').update(payload).eq('id', a.id); if (error) throw error; }
      else { const { error } = await supabase.from('ads_spending').insert({ ...payload, created_by: user.id }); if (error) throw error; }
      return json({ success: true });
    }

    return json({ error: 'Invalid action' }, 400);
  } catch (error) {
    console.error('admin-smm error:', error);
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
