/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { audited } from '../_shared/activity.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { allows, rolesOf } from '../_shared/access.ts';

// =====================================================================
// admin-history — the Society's timeline, as shown on /about.
// ---------------------------------------------------------------------
// Managed by the same people who manage the homepage testimonials: the
// full-access roles and the Head of Operations. Everything the register
// promises is enforced here as well as in the database, because the form
// is not the only way in:
//
//   * one event per year   (the year is the key; saving an existing year
//                           edits it rather than adding a duplicate)
//   * never a future year
//   * a title AND a description on every active year
//
// A year may also be marked inactive: it stays on the rail as a quiet
// marker, so the timeline never skips from one milestone to the next.
// =====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

// =====================================================================
// READ AND WRITE ARE ASKED SEPARATELY, FROM THE ACCESS MATRIX.
// ---------------------------------------------------------------------
// One list used to answer both, and it was narrower than the matrix the
// navigation uses. The visible result was a subsection that opened and
// then stayed empty, which is the fault this step exists to remove. The
// widest case was the ADVISOR, granted `'*': 'view'` and present in no
// function's list anywhere, so every read-only page an advisor is
// appointed to consult refused them.
//
// `allows` answers from `_shared/access.ts`, which mirrors
// `src/lib/access/matrix.ts` exactly. The writing list is unchanged.
// =====================================================================
const RESOURCE = 'website-history';
const MANAGE = ['admin', 'president', 'vice_president', 'head_of_asset_management', 'head_of_operations'];

const FOUNDED = 2017;

const EventSchema = z.object({
  year: z.number().int(),
  title: z.string().max(300).trim(),
  description: z.string().max(4000).trim(),
  href: z.string().max(500).trim().nullable().optional(),
  media_kind: z.enum(['none', 'report', 'number', 'image']).default('none'),
  report_file_id: z.string().uuid().nullable().optional(),
  number_value: z.number().int().min(0).max(1_000_000).nullable().optional(),
  number_label: z.string().max(120).trim().nullable().optional(),
  image_url: z.string().max(1000).trim().nullable().optional(),
  image_alt: z.string().max(300).trim().nullable().optional(),
  is_active: z.boolean().default(true),
});

Deno.serve(audited('admin-history', async (req, audit) => {
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
    const canManage = user.email === 'as.minerva@unibocconi.it' || roles.some((r: string) => MANAGE.includes(r));
    const canRead = canManage || allows(roles, user.email, RESOURCE, 'view');
    if (!canRead) return json({ error: 'Access denied' }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;
    audit.request(action, body);

    // Reading is not editing. Everything except the read needs 'manage'.
    if (action !== 'list' && !canManage) {
      return json({ error: "Your role can read the Society's timeline but not change them." }, 403);
    }

    if (action === 'list') {
      const { data, error } = await supabase
        .from('history_events').select('*').order('year', { ascending: true });
      if (error) throw error;
      return json({ events: data || [] });
    }

    if (action === 'delete') {
      const year = Number(body.year);
      if (!Number.isInteger(year)) return json({ error: 'A year is required' }, 400);
      const { error } = await supabase.from('history_events').delete().eq('year', year);
      if (error) throw error;
      return json({ success: true });
    }

    if (action === 'save') {
      const parsed = EventSchema.safeParse(body.event);
      if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? 'Invalid event' }, 400);
      const event = parsed.data;

      const thisYear = new Date().getFullYear();
      if (event.year > thisYear) {
        return json({ error: 'A key event cannot be recorded for a future year.' }, 400);
      }
      if (event.year < FOUNDED) {
        return json({ error: `The Society was founded in ${FOUNDED}: the timeline cannot start earlier.` }, 400);
      }
      if (event.is_active && (!event.title || !event.description)) {
        return json({ error: 'A key event needs both a title and a description.' }, 400);
      }

      // Only the chosen medium is stored, so switching kind never leaves a
      // stale cover or a number behind.
      const row = {
        year: event.year,
        title: event.title,
        description: event.description,
        href: event.href || null,
        media_kind: event.is_active ? event.media_kind : 'none',
        report_file_id: event.media_kind === 'report' ? event.report_file_id ?? null : null,
        number_value: event.media_kind === 'number' ? event.number_value ?? null : null,
        number_label: event.media_kind === 'number' ? event.number_label || null : null,
        image_url: event.media_kind === 'image' ? event.image_url || null : null,
        image_alt: event.media_kind === 'image' ? event.image_alt || null : null,
        is_active: event.is_active,
        created_by: user.id,
      };

      // The year is the primary key, which is what caps the timeline at one
      // event per year: a second save for the same year edits the first.
      const { data, error } = await supabase
        .from('history_events').upsert(row, { onConflict: 'year' }).select().single();
      if (error) throw error;
      return json({ event: data });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (e) {
    console.error('admin-history error:', e);
    return json({ error: e instanceof Error ? e.message : 'Unexpected error' }, 500);
  }
}));
