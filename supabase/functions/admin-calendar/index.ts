/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// =====================================================================
// admin-calendar — custom entries on the main workspace Calendar.
// Add / edit / remove meetings, deadlines, reminders and socials. The other
// calendar layers (Events, AoD, Alumni calls, Applications, Fee) are read-only
// reflections of their own sections and are not touched here.
// =====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

// Who may manage the main calendar. Mirrors the access matrix: full-access
// roles + Head of Operations. Adjust here and in the matrix together.
const MANAGE = ['admin', 'president', 'vice_president', 'head_of_asset_management', 'head_of_operations'];

const ROLE_BASE: Record<string, string> = {
  president: 'President', vice_president: 'Vice President', head_of_asset_management: 'Head of Asset Management',
  head_of_operations: 'Head of Operations', admin: 'Admin',
};
const ROLE_RANK: Record<string, number> = {
  president: 1, vice_president: 2, admin: 2, head_of_asset_management: 3, head_of_operations: 6,
};

const EntrySchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).nullable().optional(),
  entry_date: z.string().min(4),
  entry_type: z.enum(['meeting', 'deadline', 'reminder', 'social', 'other']),
  location: z.string().max(300).nullable().optional(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.split(' ')[1]);
    if (authError || !user) return json({ error: 'Invalid token' }, 401);

    const { data: roleRows } = await supabase.from('user_roles').select('role, division').eq('user_id', user.id);
    const roles = (roleRows || []) as { role: string; division: string | null }[];
    const canManage = user.email === 'as.minerva@unibocconi.it' || roles.some((r) => MANAGE.includes(r.role));
    if (!canManage) return json({ error: 'Access denied' }, 403);

    const authorName = (await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()).data?.full_name || user.email;
    const primary = [...roles].sort((a, b) => (ROLE_RANK[a.role] ?? 99) - (ROLE_RANK[b.role] ?? 99))[0];
    const authorRole = primary ? (ROLE_BASE[primary.role] || primary.role) : null;

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === 'list') {
      const { data, error } = await supabase.from('calendar_entries').select('*').order('entry_date', { ascending: true });
      if (error) throw error;
      return json({ entries: data || [] });
    }

    if (action === 'delete') {
      const { error } = await supabase.from('calendar_entries').delete().eq('id', body.id);
      if (error) throw error;
      return json({ success: true });
    }

    if (action === 'save') {
      const parsed = EntrySchema.safeParse(body.entry);
      if (!parsed.success) return json({ error: 'Validation failed', details: parsed.error.format() }, 400);
      const e = parsed.data;
      const payload = {
        title: e.title, description: e.description ?? null, entry_date: e.entry_date,
        entry_type: e.entry_type, location: e.location ?? null,
      };
      if (e.id) {
        const { error } = await supabase.from('calendar_entries').update(payload).eq('id', e.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('calendar_entries')
          .insert({ ...payload, created_by: user.id, author_name: authorName, author_role: authorRole });
        if (error) throw error;
      }
      return json({ success: true });
    }

    return json({ error: 'Invalid action' }, 400);
  } catch (error) {
    console.error('admin-calendar error:', error);
    return json({ error: 'An unexpected error occurred. Please try again.' }, 500);
  }
});
