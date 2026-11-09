/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { audited } from '../_shared/activity.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { allows, rolesOf } from '../_shared/access.ts';
import { readJsonObject, type LooseBody } from '../_shared/request-body.ts';

// =====================================================================
// admin-partnerships: Website > Partnerships (Step 105).
// ---------------------------------------------------------------------
// The association's agreements and joint initiatives with service
// providers and other student associations, shown on /partnerships. The
// Board adds each partner (name, kind, what the agreement covers, link,
// logo), orders them, hides or publishes them, and removes them.
//
//   list              everything, drafts included (anybody who can open
//                     the subsection; visitors read the published rows
//                     straight from the table)
//   save              create or change one partner
//   reorder           the order within the page
//   delete            remove one partner
//   logo-upload-url   a one-time link to put a logo in partner-logos
//
// Reading and writing are answered by the access matrix, resource
// 'website-partnerships' (src/lib/access/matrix.ts, mirrored in
// _shared/access.ts). Every change is recorded by `audited`.
// =====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

const RESOURCE = 'website-partnerships';
const BUCKET = 'partner-logos';
const LOGO_TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/svg+xml': 'svg' };

const httpUrl = z.string().trim().max(500).regex(/^https?:\/\/[^\s]+$/i, 'A link must start with http:// or https://');
const PartnerSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, 'A name is required').max(160),
  kind: z.enum(['service_provider', 'student_association']),
  summary: z.string().trim().max(600).nullable().optional(),
  url: httpUrl.nullable().optional().or(z.literal('').transform(() => null)),
  logo_url: httpUrl.nullable().optional().or(z.literal('').transform(() => null)),
  published: z.boolean().optional(),
});

Deno.serve(audited('admin-partnerships', async (req, audit) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.split(' ')[1]);
    if (authError || !user) return json({ error: 'Invalid token' }, 401);
    const { data: roleRows } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
    const roles = rolesOf(roleRows);
    audit.actor(user, roles);
    const canManage = allows(roles, user.email, RESOURCE, 'manage');
    const canRead = canManage || allows(roles, user.email, RESOURCE, 'view');
    if (!canRead) return json({ error: 'Access denied' }, 403);

    const body = ((await readJsonObject(req)) ?? {}) as LooseBody;
    const action = typeof body.action === 'string' ? body.action : '';
    audit.request(action, body);

    if (action !== 'list' && !canManage) {
      return json({ error: 'Your role can read the partnerships but not change them.' }, 403);
    }

    if (action === 'list') {
      const { data, error } = await supabase.from('partnerships').select('*')
        .order('kind', { ascending: true }).order('display_order', { ascending: true }).order('name', { ascending: true });
      if (error) throw error;
      return json({ partnerships: data || [] });
    }

    if (action === 'save') {
      const parsed = PartnerSchema.safeParse(body.partner);
      if (!parsed.success) {
        const first = parsed.error.issues[0];
        return json({ error: first?.message || 'Check the fields and try again.' }, 400);
      }
      const p = parsed.data;
      const payload = {
        name: p.name, kind: p.kind, summary: p.summary || null,
        url: p.url || null, logo_url: p.logo_url || null, published: p.published ?? true,
      };
      if (p.id) {
        const { data, error } = await supabase.from('partnerships').update(payload).eq('id', p.id).select('id').maybeSingle();
        if (error) throw error;
        if (!data) return json({ error: 'This partner no longer exists.' }, 404);
        audit.subject(p.name, p.id);
        return json({ success: true, id: p.id });
      }
      const { data: last } = await supabase.from('partnerships').select('display_order')
        .eq('kind', p.kind).order('display_order', { ascending: false }).limit(1).maybeSingle();
      const { data, error } = await supabase.from('partnerships')
        .insert({ ...payload, display_order: (last?.display_order ?? 0) + 1, created_by: user.id }).select('id').single();
      if (error) throw error;
      audit.subject(p.name, data.id);
      return json({ success: true, id: data.id });
    }

    if (action === 'reorder') {
      const ids = Array.isArray(body.ids) ? (body.ids as unknown[]).filter((x): x is string => typeof x === 'string').slice(0, 200) : [];
      for (let i = 0; i < ids.length; i++) {
        const { error } = await supabase.from('partnerships').update({ display_order: i + 1 }).eq('id', ids[i]);
        if (error) throw error;
      }
      return json({ success: true });
    }

    if (action === 'delete') {
      const id = typeof body.id === 'string' ? body.id : '';
      if (!id) return json({ error: 'Which partner?' }, 400);
      const { data: row } = await supabase.from('partnerships').select('id, name').eq('id', id).maybeSingle();
      if (!row) return json({ success: true });
      const { error } = await supabase.from('partnerships').delete().eq('id', id);
      if (error) throw error;
      audit.subject(row.name, row.id);
      return json({ success: true });
    }

    if (action === 'logo-upload-url') {
      const type = typeof body.content_type === 'string' ? body.content_type : '';
      const ext = LOGO_TYPES[type];
      if (!ext) return json({ error: 'A logo must be a PNG, JPEG, WebP or SVG image.' }, 400);
      const path = `${crypto.randomUUID()}.${ext}`;
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
      if (error || !data) throw error ?? new Error('No upload link');
      const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      return json({ bucket: BUCKET, path, token: data.token, public_url: publicUrl });
    }

    return json({ error: 'Invalid action' }, 400);
  } catch (error) {
    console.error('admin-partnerships error:', error);
    return json({ error: 'An unexpected error occurred. Please try again.' }, 500);
  }
}));
