import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// =====================================================================
// admin-alumni-calls — the alumni-call tracker (report 9.5).
// Actions: list · create · update · delete
// =====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

const CallSchema = z.object({
  id: z.string().uuid().optional(),
  alumnus_name: z.string().min(1).max(200),
  former_role: z.string().max(200).nullable().optional(),
  current_company: z.string().max(200).nullable().optional(),
  current_position: z.string().max(200).nullable().optional(),
  division: z.enum(['equity','investment','macro','portfolio','quant','media','operations','board','none']).nullable().optional(),
  responsible_person: z.string().max(200).nullable().optional(),
  planned_date: z.string().nullable().optional(),
  status: z.enum(['planned','invited','accepted','completed','declined']).optional(),
  notes: z.string().max(2000).nullable().optional(),
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
    const roles = (roleRows || []).map((r: { role: string }) => r.role);
    const isStaff = user.email === 'as.minerva@unibocconi.it' || roles.some((r) => !['member', 'pending', 'candidate'].includes(r));
    if (!isStaff) return json({ error: 'Access denied' }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === 'list') {
      const { data, error } = await supabase.from('alumni_calls').select('*').order('planned_date', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return json({ calls: data || [] });
    }
    if (action === 'delete') {
      const { error } = await supabase.from('alumni_calls').delete().eq('id', body.id);
      if (error) throw error;
      return json({ success: true });
    }
    const parsed = CallSchema.safeParse(body.call);
    if (!parsed.success) return json({ error: 'Validation failed', details: parsed.error.format() }, 400);
    const c = parsed.data;
    const payload = {
      alumnus_name: c.alumnus_name, former_role: c.former_role ?? null,
      current_company: c.current_company ?? null, current_position: c.current_position ?? null,
      division: c.division ?? null, responsible_person: c.responsible_person ?? null,
      planned_date: c.planned_date || null, status: c.status ?? 'planned', notes: c.notes ?? null,
    };
    if (action === 'create') {
      const { data, error } = await supabase.from('alumni_calls').insert({ ...payload, created_by: user.id }).select().single();
      if (error) throw error;
      return json({ success: true, call: data });
    }
    if (action === 'update') {
      if (!c.id) return json({ error: 'Missing id' }, 400);
      const { data, error } = await supabase.from('alumni_calls').update(payload).eq('id', c.id).select().single();
      if (error) throw error;
      return json({ success: true, call: data });
    }
    return json({ error: 'Invalid action' }, 400);
  } catch (error) {
    console.error('admin-alumni-calls error:', error);
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
