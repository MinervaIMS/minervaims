/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// =====================================================================
// admin-testimonials — control centre for the homepage testimonials.
// The operations team adds / edits / removes / reorders testimonials and links
// each one to the alumnus who provided it. Managed by full-access roles and the
// Head of Operations (mirrors the access matrix 'website-testimonials').
// =====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

const MANAGE = ['admin', 'president', 'vice_president', 'head_of_asset_management', 'head_of_operations'];

const TestimonialSchema = z.object({
  id: z.string().uuid().optional(),
  quote: z.string().min(1).max(1200).trim(),
  alumni_id: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(200).trim(),
  role_label: z.string().min(1).max(200).trim(),
  published: z.boolean().optional(),
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

    if (action === 'list') {
      const { data, error } = await supabase.from('testimonials').select('*').order('display_order', { ascending: true });
      if (error) throw error;
      return json({ testimonials: data || [] });
    }

    if (action === 'delete') {
      const { error } = await supabase.from('testimonials').delete().eq('id', body.id);
      if (error) throw error;
      return json({ success: true });
    }

    if (action === 'reorder') {
      const ids = Array.isArray(body.ids) ? (body.ids as string[]) : [];
      // Persist the new order (1-based) one row at a time.
      for (let i = 0; i < ids.length; i++) {
        const { error } = await supabase.from('testimonials').update({ display_order: i + 1 }).eq('id', ids[i]);
        if (error) throw error;
      }
      return json({ success: true });
    }

    if (action === 'save') {
      const parsed = TestimonialSchema.safeParse(body.testimonial);
      if (!parsed.success) return json({ error: 'Validation failed', details: parsed.error.format() }, 400);
      const t = parsed.data;

      // If linked to an alumnus, keep the display name in sync with that record.
      let name = t.name;
      if (t.alumni_id) {
        const { data: al } = await supabase.from('alumni').select('name, surname').eq('id', t.alumni_id).maybeSingle();
        if (al) name = `${al.name} ${al.surname}`;
      }

      const payload = {
        quote: t.quote, alumni_id: t.alumni_id ?? null, name,
        role_label: t.role_label, published: t.published ?? true,
      };

      if (t.id) {
        const { error } = await supabase.from('testimonials').update(payload).eq('id', t.id);
        if (error) throw error;
      } else {
        // New rows go to the end of the list.
        const { data: maxRow } = await supabase.from('testimonials').select('display_order').order('display_order', { ascending: false }).limit(1).maybeSingle();
        const nextOrder = (maxRow?.display_order ?? 0) + 1;
        const { error } = await supabase.from('testimonials').insert({ ...payload, display_order: nextOrder, created_by: user.id });
        if (error) throw error;
      }
      return json({ success: true });
    }

    return json({ error: 'Invalid action' }, 400);
  } catch (error) {
    console.error('admin-testimonials error:', error);
    return json({ error: 'An unexpected error occurred. Please try again.' }, 500);
  }
});
