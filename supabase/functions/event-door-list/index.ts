// =====================================================================
// event-door-list: the door list of one event, as a PDF to print
// (Step 106D, Events > Attendance, "PDF" beside "CSV").
// ---------------------------------------------------------------------
// The paper copy kept at the door in case the connection, the server or
// the phones fail: everybody registered, alphabetical by surname, with a
// box to tick (see sheet.ts for the order, pdf.ts for the page).
//
// WHO: anybody who can open Events, Attendance, at any level, as the CSV
// beside it (the same matrix the page uses, _shared/access.ts).
// WHAT IS READ: the event, its registrations, who among them is a member
// (public.event_registration_members, the one definition the door list
// uses), those members' names and divisions on the register, and the
// waiting list. NOTHING IS WRITTEN except the record of the download
// (Activity tracking). The sheet carries names and member or guest only:
// no address (except where a name cannot be printed), no ticket code.
// =====================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { audited } from '../_shared/activity.ts';
import { allows } from '../_shared/access.ts';
import { readJsonObject, optionalTextOf, UNREADABLE_BODY, type LooseBody } from '../_shared/request-body.ts';
import { formatEventTime, romeClock12 } from '../_shared/event-time.ts';
import { rosterDivisionLabel } from '../_shared/rosters.ts';
import { doorListFileName, doorRows, type DoorMember, type DoorRegistration } from './sheet.ts';
import { renderDoorList } from './pdf.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

function toBase64(bytes: Uint8Array): string {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(bin);
}

/** "Friday 21 November 2026", Rome's calendar. */
function dayLabel(date: string | null, startAt: string | null): string {
  const at = startAt ? new Date(startAt) : date ? new Date(`${date.slice(0, 10)}T12:00:00Z`) : null;
  if (!at || Number.isNaN(at.getTime())) return 'Date to be confirmed';
  return at.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Rome' }).replace(',', '');
}

Deno.serve(audited('event-door-list', async (req, audit) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.split(' ')[1]);
    if (authError || !user) return json({ error: 'Invalid token' }, 401);
    const { data: roleRows } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
    const roles = (roleRows || []).map((r: { role: string }) => r.role);
    audit.actor(user, roles);
    if (!allows(roles, user.email, 'events-attendance', 'view')) {
      return json({ error: 'The door list is for the people who can open Events, Attendance.' }, 403);
    }

    const parsed = await readJsonObject(req);
    if (!parsed) return json({ error: UNREADABLE_BODY }, 400);
    const body = parsed as LooseBody;
    const action = typeof body.action === 'string' ? body.action : '';
    audit.request(action, body);
    if (action !== 'pdf') return json({ error: 'Invalid action' }, 400);

    const eventId = optionalTextOf(body, 'event_id');
    if (!eventId) return json({ error: 'Choose the event first.' }, 400);
    const { data: ev } = await supabase.from('events')
      .select('id, title, date, start_at, end_at, place, online, capacity').eq('id', eventId).maybeSingle();
    if (!ev) return json({ error: 'This event no longer exists. Reload the page.' }, 404);

    const [{ data: regs, error: regErr }, { data: who }, { data: waiting }] = await Promise.all([
      supabase.from('event_registrations')
        .select('id, name, email, attended, checked_in_at, programme, affiliation, is_bocconi').eq('event_id', eventId),
      supabase.from('event_registration_members').select('registration_id, member_id').eq('event_id', eventId),
      supabase.from('event_waitlist').select('name, email, is_member, programme, affiliation, created_at')
        .eq('event_id', eventId).order('created_at', { ascending: true }),
    ]);
    if (regErr) throw regErr;

    const memberOf = new Map<string, string>();
    for (const w of (who || []) as { registration_id: string; member_id: string | null }[]) {
      if (w.member_id) memberOf.set(w.registration_id, w.member_id);
    }
    const members = new Map<string, DoorMember>();
    const ids = [...new Set(memberOf.values())];
    for (let i = 0; i < ids.length; i += 200) {
      const { data: ms } = await supabase.from('members')
        .select('id, first_name, surname, division, membership_status').in('id', ids.slice(i, i + 200));
      for (const m of (ms || []) as (DoorMember & { membership_status: string | null })[]) {
        if (m.membership_status !== 'expelled') members.set(m.id, m);
      }
    }

    const rows = doorRows((regs || []) as DoorRegistration[], memberOf, members, rosterDivisionLabel);
    const waitlist = ((waiting || []) as { name: string | null; email: string | null; is_member: boolean | null; programme: string | null; affiliation: string | null }[])
      .map((w) => ({
        name: (w.name || '').trim() || 'Name not given',
        kind: w.is_member ? 'Member' : `Guest${(w.programme || w.affiliation || '').trim() ? `, ${(w.programme || w.affiliation || '').trim()}` : ''}`,
      }));
    const now = new Date();
    const day = dayLabel(ev.date, ev.start_at);
    const pdf = await renderDoorList({
      title: (ev.title || 'Event').trim(),
      dayLabel: day,
      timeLabel: formatEventTime(ev.start_at, ev.end_at),
      place: ev.online ? 'Online' : (ev.place || '').trim() || null,
      rows,
      waitlist,
      capacity: ev.capacity ?? null,
      generatedAt: now,
      generatedLabel: `${now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Rome' })}, ${romeClock12(now)}`,
    });
    audit.subject(`Door list, ${ev.title}`, eventId);
    audit.note({ rows: rows.length, waiting: waitlist.length, already_in: rows.filter((r) => r.attended).length });
    return json({ file_name: doorListFileName(ev.title || 'Event', day.replace(/^\w+ /, '')), pdf: toBase64(pdf) });
  } catch (e) {
    console.error('event-door-list failed', e);
    return json({ error: 'The door list could not be prepared just now. Try again.' }, 500);
  }
}));
