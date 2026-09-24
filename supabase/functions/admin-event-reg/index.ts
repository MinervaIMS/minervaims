import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { audited } from '../_shared/activity.ts';
import { buildMemberIndex, matchRegistration, type MemberLike } from '../_shared/member-match.ts';
import { readJsonObject, textOf, optionalTextOf, UNREADABLE_BODY, type LooseBody } from '../_shared/request-body.ts';

// =====================================================================
// admin-event-reg — staff management of event registrations & attendance.
// Actions: list · mark-attended · add-external · remove
//
// `list` also RECOGNISES MEMBERS WHO REGISTERED WITHOUT SIGNING IN. The
// public form does not require an account, so a member who used it is
// stored with `is_member = false` - that column records whether an
// account was attached at the moment of registering, not whether the
// person is one of ours. The register of members is consulted here and
// the answer travels with each row. See _shared/member-match.ts for how
// confident each answer is and why an ambiguous name is not a match.
// =====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

Deno.serve(audited('admin-event-reg', async (req, audit) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.split(' ')[1]);
    if (authError || !user) return json({ error: 'Invalid token' }, 401);

    const { data: roleRows } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
    const roles = (roleRows || []).map((r: { role: string }) => r.role);
    audit.actor(user, roles);
    const isStaff = user.email === 'as.minerva@unibocconi.it' || roles.some((r) => !['member', 'pending', 'candidate'].includes(r));
    if (!isStaff) return json({ error: 'Access denied' }, 403);

    // Read as a JSON object, or refused as unreadable: see
    // _shared/request-body.ts for why a cast was not enough.
    const parsedBody = await readJsonObject(req);
    if (!parsedBody) return json({ error: UNREADABLE_BODY }, 400);
    const body = parsedBody as LooseBody;
    const action = typeof body.action === 'string' ? body.action : '';
    audit.request(action, body);

    if (action === 'list') {
      const { data, error } = await supabase.from('event_registrations')
        .select('*').eq('event_id', body.event_id).order('registered_at', { ascending: true });
      if (error) throw error;
      const registrations = data || [];

      // ── who among them is a member ──────────────────────────────────────
      // Read once for the whole list and indexed, so a room of two hundred
      // costs one query rather than two hundred. A failure here must not
      // fail the door list: the names still matter more than the labels,
      // so the rows go out unrecognised rather than not at all.
      let index = buildMemberIndex([]);
      try {
        const { data: members } = await supabase.from('members')
          .select('id, user_id, first_name, surname, email, division, membership_status');
        // Expelled accounts are not members and must not be counted as
        // such on a door list; everybody else on the register is.
        index = buildMemberIndex(((members || []) as MemberLike[])
          .filter((m) => m.membership_status !== 'expelled'));
      } catch (e) {
        console.error('member index failed; registrations go out unrecognised', e);
      }

      return json({
        registrations: registrations.map((r: Record<string, unknown>) => ({
          ...r,
          ...matchRegistration(
            {
              user_id: (r.user_id as string | null) ?? null,
              name: (r.name as string | null) ?? null,
              email: (r.email as string | null) ?? null,
            },
            index,
          ),
        })),
      });
    }
    if (action === 'mark-attended') {
      const { error } = await supabase.from('event_registrations')
        .update({ attended: !!body.attended }).eq('id', body.id);
      if (error) throw error;
      return json({ success: true });
    }
    if (action === 'add-external') {
      const first = textOf(body, 'name');
      const surname = textOf(body, 'surname');
      if (!first) return json({ error: 'Name is required' }, 400);
      const fullName = `${first} ${surname}`.trim();
      const email = optionalTextOf(body, 'email');
      const { error } = await supabase.from('event_registrations').insert({
        event_id: body.event_id, name: fullName, email,
        is_member: false, is_external: true, attended: !!body.attended, added_by: user.id,
      });
      if (error) throw error;
      // External attendees are added to the newsletter (name, surname, email).
      if (email) {
        try { await supabase.from('newsletter_subscribers').insert({ email, consent: true, source: 'event' }); }
        catch { /* ignore duplicates */ }
      }
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
    return json({ error: 'An unexpected error occurred. Please try again.' }, 500);
  }
}));
