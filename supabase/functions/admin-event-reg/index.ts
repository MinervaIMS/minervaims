import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { audited } from '../_shared/activity.ts';
import { buildMemberIndex, matchRegistration, type MemberLike } from '../_shared/member-match.ts';
import { readJsonObject, textOf, optionalTextOf, UNREADABLE_BODY, type LooseBody } from '../_shared/request-body.ts';
import { attendanceOpen, attendanceClosesOn } from '../_shared/attendance-window.ts';

// =====================================================================
// admin-event-reg — staff management of event registrations & attendance.
// Actions: list · mark-attended · add-external · members · add-member · remove
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

    // =====================================================================
    // THE LIST CLOSES A WEEK AFTER THE EVENT. See _shared/attendance-window.ts.
    // Every change to it - ticking, adding a walk-in, removing a row - asks
    // this first, by the event's own date.
    // =====================================================================
    const WEEK_DAY = (iso: string) => {
      const [y, m, d] = iso.split('-').map(Number);
      return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
    };
    const closedError = async (eventId: unknown): Promise<string | null> => {
      if (typeof eventId !== 'string' || !eventId) return null;
      const { data: ev } = await supabase.from('events').select('date').eq('id', eventId).maybeSingle();
      if (!ev?.date || attendanceOpen(ev.date)) return null;
      return `Attendance for this event closed on ${WEEK_DAY(attendanceClosesOn(ev.date))}, a week after it took place. The list is now the record of who attended.`;
    };
    const eventOfRegistration = async (id: unknown): Promise<string | null> => {
      if (typeof id !== 'string' || !id) return null;
      const { data } = await supabase.from('event_registrations').select('event_id').eq('id', id).maybeSingle();
      return data?.event_id ?? null;
    };

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

      // Whether the list can still be changed, so the page can say so
      // before anybody tries rather than after.
      const { data: ev } = await supabase.from('events').select('date').eq('id', body.event_id).maybeSingle();
      return json({
        attendance_open: ev?.date ? attendanceOpen(ev.date) : true,
        attendance_closes_on: ev?.date ? attendanceClosesOn(ev.date) : null,
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
      const closed = await closedError(await eventOfRegistration(body.id));
      if (closed) return json({ error: closed }, 403);
      const { error } = await supabase.from('event_registrations')
        .update({ attended: !!body.attended }).eq('id', body.id);
      if (error) throw error;
      return json({ success: true });
    }
    if (action === 'add-external') {
      const closed = await closedError(body.event_id);
      if (closed) return json({ error: closed }, 403);
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
    // =====================================================================
    // A MEMBER WHO TURNED UP IS ADDED AS A MEMBER.
    // ---------------------------------------------------------------------
    // The walk-in form took a name and an address and filed everybody as an
    // external guest, so a member who came without registering was counted
    // as a guest and their address was put on the newsletter. The page now
    // searches the register first (`members`), and a member picked from it
    // is added here with their account and the address on their record.
    // If they are already on the list, they are ticked rather than added
    // twice. Nothing is written to the newsletter for a member.
    // =====================================================================
    if (action === 'members') {
      const { data, error } = await supabase.from('members')
        .select('id, first_name, surname, email, division, membership_status')
        .neq('membership_status', 'expelled')
        .order('surname', { ascending: true });
      if (error) throw error;
      return json({
        members: (data || []).map((m: { id: string; first_name: string | null; surname: string | null; email: string | null; division: string | null; membership_status: string | null }) => ({
          id: m.id, first_name: m.first_name, surname: m.surname, email: m.email,
          division: m.division, membership_status: m.membership_status,
        })),
      });
    }
    if (action === 'add-member') {
      const closed = await closedError(body.event_id);
      if (closed) return json({ error: closed }, 403);
      const eventId = optionalTextOf(body, 'event_id');
      const memberId = optionalTextOf(body, 'member_id');
      if (!eventId || !memberId) return json({ error: 'Choose the member to add.' }, 400);
      const { data: ev } = await supabase.from('events').select('id').eq('id', eventId).maybeSingle();
      if (!ev) return json({ error: 'This event no longer exists. Reload the page.' }, 404);
      const { data: m } = await supabase.from('members')
        .select('id, user_id, first_name, surname, email, membership_status').eq('id', memberId).maybeSingle();
      if (!m || m.membership_status === 'expelled') return json({ error: 'This person is not on the register of members.' }, 404);
      const fullName = `${m.first_name || ''} ${m.surname || ''}`.trim() || 'Member';
      let email: string | null = (m.email || '').trim() || null;
      if (!email && m.user_id) {
        const { data: p } = await supabase.from('profiles').select('email').eq('id', m.user_id).maybeSingle();
        email = (p?.email || '').trim() || null;
      }
      // Already on the list, by account or by address: tick them.
      const { data: existing } = await supabase.from('event_registrations')
        .select('id, user_id, email').eq('event_id', eventId);
      const mine = (existing || []).find((r: { user_id: string | null; email: string | null }) =>
        (m.user_id && r.user_id === m.user_id) || (email && (r.email || '').trim().toLowerCase() === email.toLowerCase()));
      if (mine) {
        const { error } = await supabase.from('event_registrations')
          .update({ attended: true }).eq('id', mine.id);
        if (error) throw error;
        return json({ success: true, already_listed: true, name: fullName });
      }
      const { error } = await supabase.from('event_registrations').insert({
        event_id: eventId, user_id: m.user_id || null, name: fullName, email,
        is_member: true, is_external: false, attended: true, added_by: user.id,
      });
      if (error) throw error;
      return json({ success: true, already_listed: false, name: fullName });
    }
    if (action === 'remove') {
      const closed = await closedError(await eventOfRegistration(body.id));
      if (closed) return json({ error: closed }, 403);
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
