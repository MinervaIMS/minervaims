import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

// =====================================================================
// register-event — public event registration. Audience-gated:
//   members            → must be signed in and be an association member
//   members_external   → members or external students (name + email)
//   guests / public    → anyone (name + email)
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

    // Optional auth (members register signed in; the public can register anon).
    let userId: string | null = null;
    let userEmail: string | null = null;
    let isMember = false;
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.split(' ')[1]);
      if (user) {
        userId = user.id; userEmail = user.email ?? null;
        const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
        isMember = (roles || []).some((r: { role: string }) => !['candidate', 'pending'].includes(r.role));
      }
    }

    const body = await req.json().catch(() => ({}));
    const eventId = body.event_id as string;
    const name = (body.name as string | undefined)?.trim();
    const email = (body.email as string | undefined)?.trim() || userEmail;

    if (!eventId) return json({ error: 'Missing event' }, 400);

    const { data: ev } = await supabase.from('events')
      .select('registration_enabled, registration_audience, title').eq('id', eventId).maybeSingle();
    if (!ev || !ev.registration_enabled) return json({ error: 'Registration is not open for this event.' }, 403);

    const audience = ev.registration_audience as string;
    if (audience === 'members' && !isMember) {
      return json({ error: 'This event is open to association members only. Please sign in.' }, 403);
    }
    if ((audience === 'members' || audience === 'members_external') && !isMember && !email) {
      return json({ error: 'An email is required to register.' }, 400);
    }
    if (!name && !isMember) return json({ error: 'Please provide your name.' }, 400);
    if (!email) return json({ error: 'An email is required to register.' }, 400);

    // Resolve a display name for members.
    let displayName = name;
    if (!displayName && userId) {
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle();
      displayName = profile?.full_name || userEmail || 'Member';
    }

    // Dedupe by event + email.
    const { data: existing } = await supabase.from('event_registrations')
      .select('id').eq('event_id', eventId).ilike('email', email).maybeSingle();
    if (existing) return json({ success: true, alreadyRegistered: true });

    const { error } = await supabase.from('event_registrations').insert({
      event_id: eventId, user_id: userId, name: displayName, email,
      is_member: isMember, is_external: !isMember,
    });
    if (error) throw error;
    return json({ success: true });
  } catch (error) {
    console.error('register-event error:', error);
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
