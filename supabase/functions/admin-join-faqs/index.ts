/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// =====================================================================
// admin-join-faqs — the admissions FAQ shown on /join and to applicants.
// ---------------------------------------------------------------------
// Managed by the same people who manage the Society's timeline: the
// full-access roles and the Head of Operations. The table's own
// constraints are re-applied here, because a form is not the only way in:
//
//   * the category must be one of the four the table allows;
//   * a link is a PAIR - both a label and an internal href, or neither;
//   * an href must be internal (it is rendered as a routed link, and an
//     external one would silently not work);
//   * `sort_order` is unique per category, so ordering is done by
//     renumbering a whole category rather than one row at a time.
//
// The public read stays where it is: RLS lets anybody select published
// rows, which is what /join uses. This function exists for the WRITES,
// and for the one read a visitor may not make - the unpublished rows,
// which an editor has to see in order to publish them again.
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

/** The four categories, with the label and order the page renders. */
const GROUPS: Record<string, { label: string; order: number }> = {
  eligibility: { label: 'Eligibility', order: 1 },
  process: { label: 'The process', order: 2 },
  preparing: { label: 'Preparing', order: 3 },
  membership: { label: 'Membership', order: 4 },
};

const FaqSchema = z.object({
  id: z.string().uuid().optional(),
  group_key: z.enum(['eligibility', 'process', 'preparing', 'membership']),
  sort_order: z.number().int().min(0).max(9999).default(0),
  question: z.string().min(1).max(400).trim(),
  answer: z.string().min(1).max(4000).trim(),
  link_label: z.string().max(120).trim().nullable().optional(),
  link_href: z.string().max(500).trim().nullable().optional(),
  is_published: z.boolean().default(true),
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
      const { data, error } = await supabase
        .from('join_faqs').select('*')
        .order('group_order', { ascending: true })
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return json({ faqs: data || [] });
    }

    if (action === 'delete') {
      const id = String(body.id || '');
      if (!id) return json({ error: 'An id is required' }, 400);
      const { error } = await supabase.from('join_faqs').delete().eq('id', id);
      if (error) throw error;
      return json({ success: true });
    }

    if (action === 'reorder') {
      const group = String(body.group || '');
      const ids: string[] = Array.isArray(body.ids) ? body.ids.map((x: unknown) => String(x)) : [];
      if (!GROUPS[group]) return json({ error: 'Unknown category' }, 400);
      if (!ids.length) return json({ success: true });

      // TWO PASSES, BECAUSE `sort_order` IS UNIQUE PER CATEGORY. Writing
      // the final numbers directly would collide with the rows that still
      // hold them, so every row is first parked in a range nothing else
      // uses, and only then given its place.
      for (let i = 0; i < ids.length; i += 1) {
        const { error } = await supabase.from('join_faqs')
          .update({ sort_order: 1000 + i }).eq('id', ids[i]).eq('group_key', group);
        if (error) throw error;
      }
      for (let i = 0; i < ids.length; i += 1) {
        const { error } = await supabase.from('join_faqs')
          .update({ sort_order: i + 1 }).eq('id', ids[i]).eq('group_key', group);
        if (error) throw error;
      }
      return json({ success: true });
    }

    if (action === 'save') {
      const parsed = FaqSchema.safeParse(body.faq);
      if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? 'Invalid question' }, 400);
      const faq = parsed.data;

      const label = (faq.link_label || '').trim() || null;
      const href = (faq.link_href || '').trim() || null;
      if ((label === null) !== (href === null)) {
        return json({ error: 'A link needs both a label and an address, or neither.' }, 400);
      }
      if (href && !href.startsWith('/')) {
        return json({ error: 'A link must be an address on this website, starting with "/".' }, 400);
      }

      const group = GROUPS[faq.group_key];

      // A NEW QUESTION GOES TO THE END OF ITS CATEGORY. `sort_order` is
      // unique per category, so a new row cannot simply take the number
      // the form happens to hold; the next free one is looked up here.
      let sortOrder = faq.sort_order;
      if (!faq.id || sortOrder <= 0) {
        const { data: last } = await supabase
          .from('join_faqs').select('sort_order')
          .eq('group_key', faq.group_key)
          .order('sort_order', { ascending: false }).limit(1);
        sortOrder = ((last?.[0]?.sort_order as number) ?? 0) + 1;
      }

      const row = {
        group_key: faq.group_key,
        group_label: group.label,
        group_order: group.order,
        sort_order: sortOrder,
        question: faq.question,
        answer: faq.answer,
        link_label: label,
        link_href: href,
        is_published: faq.is_published,
        updated_by: user.id,
      };

      if (faq.id) {
        // An EDIT keeps its place unless the category changed, in which
        // case it joins the end of the new one - the number it held in the
        // old category may already be taken in the new.
        const { data: existing } = await supabase
          .from('join_faqs').select('group_key, sort_order').eq('id', faq.id).maybeSingle();
        if (existing && existing.group_key === faq.group_key) {
          row.sort_order = existing.sort_order as number;
        }
        const { data, error } = await supabase
          .from('join_faqs').update(row).eq('id', faq.id).select().single();
        if (error) throw error;
        return json({ faq: data });
      }

      const { data, error } = await supabase.from('join_faqs').insert(row).select().single();
      if (error) throw error;
      return json({ faq: data });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (e) {
    console.error('admin-join-faqs error:', e);
    return json({ error: e instanceof Error ? e.message : 'Unexpected error' }, 500);
  }
});
