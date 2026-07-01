import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// =====================================================================
// admin-alumni-calls — the alumni-call tracker. A call groups 2-5 alumni
// (each verified against the alumni directory), organised by a division on
// a date. The organiser is recorded automatically from who creates it.
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

const ParticipantSchema = z.object({
  alumni_id: z.string().uuid().nullable().optional(),
  alumnus_name: z.string().min(1).max(200),
  former_role: z.string().max(200).nullable().optional(),
});

const CallSchema = z.object({
  id: z.string().uuid().optional(),
  division: z.enum(['equity', 'investment', 'macro', 'portfolio', 'quant', 'media', 'operations', 'board', 'none']).nullable().optional(),
  planned_date: z.string().nullable().optional(),
  status: z.enum(['planned', 'invited', 'accepted', 'completed', 'declined']).optional(),
  notes: z.string().max(2000).nullable().optional(),
  participants: z.array(ParticipantSchema).min(2, 'A call needs at least 2 alumni').max(5, 'A call can have at most 5 alumni'),
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
      const { data: calls, error } = await supabase.from('alumni_calls')
        .select('*').order('planned_date', { ascending: false, nullsFirst: false });
      if (error) throw error;
      const { data: parts } = await supabase.from('alumni_call_participants').select('*');
      const byCall: Record<string, unknown[]> = {};
      for (const p of (parts || []) as { call_id: string }[]) (byCall[p.call_id] ??= []).push(p);
      const withParts = (calls || []).map((c: { id: string }) => ({ ...c, participants: byCall[c.id] || [] }));
      return json({ calls: withParts });
    }
    if (action === 'delete') {
      const { error } = await supabase.from('alumni_calls').delete().eq('id', body.id);
      if (error) throw error;
      return json({ success: true });
    }

    const parsed = CallSchema.safeParse(body.call);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || 'Validation failed';
      return json({ error: msg, details: parsed.error.format() }, 400);
    }
    const c = parsed.data;

    // Verify every named alumnus exists in the directory.
    for (const p of c.participants) {
      let ok = false;
      if (p.alumni_id) {
        const { data } = await supabase.from('alumni').select('id').eq('id', p.alumni_id).maybeSingle();
        ok = !!data;
      }
      if (!ok) {
        return json({ error: `"${p.alumnus_name}" is not in the alumni list. Please add them in the Alumni section first.` }, 400);
      }
    }

    const organiser = (await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()).data?.full_name || user.email;
    const payload = {
      division: c.division ?? null, planned_date: c.planned_date || null,
      status: c.status ?? 'planned', notes: c.notes ?? null,
    };

    const writeParticipants = async (callId: string) => {
      await supabase.from('alumni_call_participants').delete().eq('call_id', callId);
      await supabase.from('alumni_call_participants').insert(
        c.participants.map((p) => ({ call_id: callId, alumni_id: p.alumni_id ?? null, alumnus_name: p.alumnus_name, former_role: p.former_role ?? null })),
      );
    };

    if (action === 'create') {
      const { data, error } = await supabase.from('alumni_calls')
        .insert({ ...payload, organiser_name: organiser, created_by: user.id }).select().single();
      if (error) throw error;
      await writeParticipants(data.id);
      return json({ success: true, call: data });
    }
    if (action === 'update') {
      if (!c.id) return json({ error: 'Missing id' }, 400);
      const { data, error } = await supabase.from('alumni_calls').update(payload).eq('id', c.id).select().single();
      if (error) throw error;
      await writeParticipants(c.id);
      return json({ success: true, call: data });
    }
    return json({ error: 'Invalid action' }, 400);
  } catch (error) {
    console.error('admin-alumni-calls error:', error);
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
