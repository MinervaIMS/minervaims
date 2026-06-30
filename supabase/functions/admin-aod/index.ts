import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

// =====================================================================
// admin-aod — Association on Display stand slots (report 9.6).
//   * A few senior users (full access / Head of Operations) create days
//     and open/close registration.
//   * Any habilitated user signs up / removes themselves, up to 48h
//     before the event day.
// =====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

const SENIOR = ['admin', 'president', 'vice_president', 'head_of_asset_management', 'head_of_operations'];
const HOURS_48 = 48 * 60 * 60 * 1000;

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
    const isAdminEmail = user.email === 'as.minerva@unibocconi.it';
    const isSenior = isAdminEmail || roles.some((r) => SENIOR.includes(r.role));
    const isStaff = isSenior || roles.some((r) => !['member', 'pending', 'candidate'].includes(r.role));
    if (!isStaff) return json({ error: 'Access denied' }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === 'list') {
      const { data: days } = await supabase.from('aod_days').select('*').order('event_date', { ascending: false });
      const { data: signups } = await supabase.from('aod_signups').select('*');
      return json({ days: days || [], signups: signups || [], isSenior });
    }

    // ── senior-only ──────────────────────────────────────────────────────
    if (['create-day', 'delete-day', 'set-open'].includes(action)) {
      if (!isSenior) return json({ error: 'Only senior roles can manage Association on Display days.' }, 403);
      if (action === 'create-day') {
        if (!body.event_date) return json({ error: 'A date is required' }, 400);
        const { data, error } = await supabase.from('aod_days')
          .insert({ event_date: body.event_date, registration_open: true, notes: body.notes || null, created_by: user.id }).select().single();
        if (error) throw error;
        return json({ success: true, day: data });
      }
      if (action === 'delete-day') {
        const { error } = await supabase.from('aod_days').delete().eq('id', body.day_id);
        if (error) throw error;
        return json({ success: true });
      }
      if (action === 'set-open') {
        const { error } = await supabase.from('aod_days').update({ registration_open: !!body.open }).eq('id', body.day_id);
        if (error) throw error;
        return json({ success: true });
      }
    }

    // ── signup / remove (48h rule) ───────────────────────────────────────
    if (action === 'signup' || action === 'remove-signup') {
      let dayId = body.day_id as string | undefined;
      if (action === 'remove-signup') {
        const { data: su } = await supabase.from('aod_signups').select('day_id, user_id').eq('id', body.id).maybeSingle();
        if (!su) return json({ error: 'Not found' }, 404);
        dayId = su.day_id;
        if (su.user_id !== user.id && !isSenior) return json({ error: 'You can only remove your own signup.' }, 403);
      }
      const { data: day } = await supabase.from('aod_days').select('*').eq('id', dayId).maybeSingle();
      if (!day) return json({ error: 'Day not found' }, 404);

      const eventStart = new Date(`${day.event_date}T00:00:00`).getTime();
      const within48h = Date.now() > eventStart - HOURS_48;

      if (action === 'signup') {
        if (!day.registration_open) return json({ error: 'Registration is closed for this day.' }, 403);
        if (within48h) return json({ error: 'Registration closes 48 hours before the event.' }, 403);
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
        const primary = roles.find((r) => r.division && r.division !== 'none' && r.division !== 'board');
        const { error } = await supabase.from('aod_signups').insert({
          day_id: dayId, slot_time: body.slot_time, user_id: user.id,
          member_name: profile?.full_name || user.email, division: primary?.division ?? null,
        });
        if (error) {
          if ((error as { code?: string }).code === '23505') return json({ error: 'You are already signed up for this slot.' }, 409);
          throw error;
        }
        return json({ success: true });
      }
      // remove-signup
      if (within48h && !isSenior) return json({ error: 'You can no longer change your signup (within 48 hours).' }, 403);
      const { error } = await supabase.from('aod_signups').delete().eq('id', body.id);
      if (error) throw error;
      return json({ success: true });
    }

    return json({ error: 'Invalid action' }, 400);
  } catch (error) {
    console.error('admin-aod error:', error);
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
