import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

// =====================================================================
// admin-event-reg — staff management of event registrations & attendance.
// Actions: list · mark-attended · add-external · remove
// =====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

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
      const { data, error } = await supabase.from('event_registrations')
        .select('*').eq('event_id', body.event_id).order('registered_at', { ascending: true });
      if (error) throw error;
      return json({ registrations: data || [] });
    }
    if (action === 'mark-attended') {
      const { error } = await supabase.from('event_registrations')
        .update({ attended: !!body.attended }).eq('id', body.id);
      if (error) throw error;
      return json({ success: true });
    }
    if (action === 'add-external') {
      if (!body.name?.trim()) return json({ error: 'Name is required' }, 400);
      const { error } = await supabase.from('event_registrations').insert({
        event_id: body.event_id, name: body.name.trim(), email: body.email?.trim() || null,
        is_member: false, is_external: true, attended: !!body.attended, added_by: user.id,
      });
      if (error) throw error;
      return json({ success: true });
    }
    if (action === 'remove') {
      const { error } = await supabase.from('event_registrations').delete().eq('id', body.id);
      if (error) throw error;
      return json({ success: true });
    }
    return json({ error: 'Invalid action' }, 400);
  } catch (error) {
    console.error('admin-event-reg error:', error);
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
