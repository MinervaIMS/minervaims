import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { audited } from '../_shared/activity.ts';
import { buildMemberIndex, normaliseEmail, normaliseName, type MemberLike } from '../_shared/member-match.ts';
import { readJsonObject, textOf, optionalTextOf, UNREADABLE_BODY, type LooseBody } from '../_shared/request-body.ts';
import { attendanceOpen, attendanceClosesOn, canOverrideClosedAttendance } from '../_shared/attendance-window.ts';
import { allows } from '../_shared/access.ts';
import { tokenFromScan } from '../_shared/checkin.ts';

// =====================================================================
// admin-event-reg — staff management of event registrations & attendance.
// Actions: list · mark-attended · add-external · members · add-member · remove · checkin · door-status
//          link-member (settle who a registration is)
//          member-attendance (Members) · my-events (Events > My events)
//          import-preview · import-attendance (an online event's meeting report)
//
// WHO A REGISTRATION IS comes from ONE place, the database view
// public.event_registration_members (migration 20261022100000): a link
// stored on the row, else the account, else the address (record or
// account), else a name carried by exactly one member. The door list, the
// count in People > Members and Events > My events all read it, so a
// person recognised on the list is counted, and a name shared by two
// members is counted for nobody until somebody links it ("Needs linking").
//
// `checkin` is the door scanner: the QR code of a registration's ticket
// (see _shared/checkin.ts) ticks that person as present. It needs full
// access to Events, Attendance, as ticking by hand does in the page.
// Several phones can scan the same event at once: the tick is one
// conditional update, so when two phones read the same ticket together
// exactly one of them says "checked in" and the other says "already".
// A scan saved on a phone without signal arrives later with `scanned_at`,
// the moment it was read at the door, which becomes the check-in time.
//
// `door-status` is what the scanners poll to share one live count: who is
// ticked, and when, for one event. Small on purpose, no names or member
// matching, so it can be asked every few seconds.
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
    // THE LIST STAYS OPEN UNTIL THE END OF THE EVENT'S SEMESTER (never less
    // than two weeks after it). See _shared/attendance-window.ts. Every
    // change to it - ticking, adding a walk-in, removing a row, linking a
    // member, a scan, a Teams report - asks this first, by the event's own
    // date. After it closes, the President and the Vice President can still
    // correct it, and their change is marked as such in Activity tracking.
    // =====================================================================
    const WEEK_DAY = (iso: string) => {
      const [y, m, d] = iso.split('-').map(Number);
      return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
    };
    const overrides = canOverrideClosedAttendance(roles, user.email);
    const closedError = async (eventId: unknown): Promise<string | null> => {
      if (typeof eventId !== 'string' || !eventId) return null;
      const { data: ev } = await supabase.from('events').select('date').eq('id', eventId).maybeSingle();
      if (!ev?.date || attendanceOpen(ev.date)) return null;
      if (overrides) {
        audit.note({ after_close: true, closed_on: attendanceClosesOn(ev.date) });
        return null;
      }
      return `Attendance for this event closed on ${WEEK_DAY(attendanceClosesOn(ev.date))}, at the end of its semester. The list is now the record of who attended; the President or the Vice President can still correct it.`;
    };
    // Changing the list is for full access to Attendance, as the page shows it.
    const ATTENDANCE_EDIT_DENIED = 'Only people with full access to Attendance can change the list.';
    const canEditAttendance = allows(roles, user.email, 'events-attendance', 'manage');
    const eventOfRegistration = async (id: unknown): Promise<string | null> => {
      if (typeof id !== 'string' || !id) return null;
      const { data } = await supabase.from('event_registrations').select('event_id').eq('id', id).maybeSingle();
      return data?.event_id ?? null;
    };

    // =====================================================================
    // THE SEMESTER'S EVENTS THAT COUNT, shared by Members and My events.
    //   * Counted: events from `from` up to today (Rome), Association on
    //     Display days included, and only those where attendance was taken
    //     (somebody ticked), so an event nobody recorded does not count
    //     against anybody.
    //   * Attended / registered, PER MEMBER: who each row is comes from the
    //     view public.event_registration_members, the one definition (see
    //     the header). A row that matches two members by name belongs to
    //     nobody until somebody links it.
    //   * `keysBy` also keeps each row's account and address, for the one
    //     reader who may not be on the register at all (the association's
    //     own account opening My events).
    // =====================================================================
    const keysOf = (uid: string | null, email: string | null) =>
      [uid ? `u:${uid}` : null, email ? `e:${email.trim().toLowerCase()}` : null].filter(Boolean) as string[];
    type HeldEvent = { id: string; title: string; date: string; start_at: string | null; aod: boolean; online: boolean };
    const heldEvents = async (from: string, to: string) => {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Rome' });
      const until = to < today ? to : today;
      const { data: evs, error: evErr } = await supabase.from('events')
        .select('id, title, date, start_at, aod_day_id, online').gte('date', from).lte('date', until);
      if (evErr) throw evErr;
      const all = (evs || []) as { id: string; title: string | null; date: string; start_at: string | null; aod_day_id: string | null; online: boolean | null }[];
      const ids = all.map((e) => e.id);
      const attendedBy = new Map<string, Set<string>>(); // event id -> member ids present
      const registeredBy = new Map<string, Set<string>>(); // event id -> member ids on the list
      const keysAttended = new Map<string, Set<string>>(); // event id -> account/address keys present
      const keysRegistered = new Map<string, Set<string>>(); // event id -> account/address keys on the list
      const taken = new Set<string>(); // events where somebody was ticked
      const add = (map: Map<string, Set<string>>, ev: string, values: string[]) => {
        const set = map.get(ev) ?? new Set<string>();
        values.forEach((v) => set.add(v));
        map.set(ev, set);
      };
      for (let i = 0; i < ids.length; i += 200) {
        const slice = ids.slice(i, i + 200);
        const [{ data: who, error: wErr }, { data: regs, error: rErr }] = await Promise.all([
          supabase.from('event_registration_members').select('registration_id, event_id, member_id, attended').in('event_id', slice),
          supabase.from('event_registrations').select('id, event_id, user_id, email, attended').in('event_id', slice),
        ]);
        if (wErr) throw wErr;
        if (rErr) throw rErr;
        for (const r of (who || []) as { event_id: string; member_id: string | null; attended: boolean | null }[]) {
          if (r.attended) taken.add(r.event_id);
          if (!r.member_id) continue;
          add(registeredBy, r.event_id, [r.member_id]);
          if (r.attended) add(attendedBy, r.event_id, [r.member_id]);
        }
        for (const r of (regs || []) as { event_id: string; user_id: string | null; email: string | null; attended: boolean | null }[]) {
          const keys = keysOf(r.user_id, r.email);
          add(keysRegistered, r.event_id, keys);
          if (r.attended) { taken.add(r.event_id); add(keysAttended, r.event_id, keys); }
        }
      }
      const events: HeldEvent[] = all
        .filter((e) => taken.has(e.id))
        .map((e) => ({ id: e.id, title: e.title || (e.aod_day_id ? 'Association on Display' : 'Event'), date: e.date, start_at: e.start_at, aod: !!e.aod_day_id, online: !!e.online }))
        .sort((a, b) => (a.start_at || a.date).localeCompare(b.start_at || b.date));
      for (const ev of events) {
        for (const map of [attendedBy, registeredBy, keysAttended, keysRegistered]) if (!map.has(ev.id)) map.set(ev.id, new Set());
      }
      return { events, attendedBy, registeredBy, keysAttended, keysRegistered, until };
    };

    // =====================================================================
    // EVENTS ATTENDED, PER MEMBER, FOR PEOPLE, MEMBERS.
    // How many of the semester's events each member attended, out of those
    // held so far. For the roles with full access to Members only.
    //   * Counted: events of the semester up to today, Association on
    //     Display days included, and only those where attendance was taken
    //     (somebody ticked), so an event nobody recorded does not count
    //     against anybody.
    //   * Attended: ticked or scanned in, recognised by their account or
    //     by the address on their member record.
    // =====================================================================
    if (action === 'member-attendance') {
      if (!allows(roles, user.email, 'people-members', 'manage')) return json({ error: 'Access denied' }, 403);
      const DAY = /^\d{4}-\d{2}-\d{2}$/;
      const from = typeof body.from === 'string' && DAY.test(body.from) ? body.from : null;
      const to = typeof body.to === 'string' && DAY.test(body.to) ? body.to : null;
      if (!from || !to || from > to) return json({ error: 'Choose a semester.' }, 400);
      const held = await heldEvents(from, to);
      const { data: members, error: mErr } = await supabase.from('members').select('id');
      if (mErr) throw mErr;
      const counts: Record<string, number> = {};
      // WHICH events, as well as how many: the count in Members opens the
      // list behind it. Per member, the events attended and the events they
      // registered for, by id; `events` names them once.
      const attended: Record<string, string[]> = {};
      const registered: Record<string, string[]> = {};
      for (const m of (members || []) as { id: string }[]) {
        const went = held.events.filter((ev) => held.attendedBy.get(ev.id)!.has(m.id)).map((ev) => ev.id);
        counts[m.id] = went.length;
        if (went.length) attended[m.id] = went;
        const signed = held.events.filter((ev) => held.registeredBy.get(ev.id)!.has(m.id)).map((ev) => ev.id);
        if (signed.length) registered[m.id] = signed;
      }
      return json({ total: held.events.length, from, to: held.until, counts, events: held.events, attended, registered });
    }

    // =====================================================================
    // EVENTS > MY EVENTS: the signed-in member's own record.
    //   * history: the semester's events held so far with attendance taken
    //     (as counted in Members), each attended, or missed, and if missed
    //     whether they were registered (the likely case for a correction:
    //     present but not ticked);
    //   * open: the events taking registrations from today, with their
    //     place on the list (registered, waiting, or not yet), the places
    //     left, and the meeting link of an online event they hold a place
    //     at (it is private: see migration 20261005100000);
    //   * the Head of Operations, by name, for the reminder to ask for a
    //     correction.
    // Registering and cancelling go through register-event, as everywhere.
    // =====================================================================
    if (action === 'my-events') {
      if (!allows(roles, user.email, 'events-mine', 'view')) return json({ error: 'Access denied' }, 403);
      const DAY = /^\d{4}-\d{2}-\d{2}$/;
      const from = typeof body.from === 'string' && DAY.test(body.from) ? body.from : null;
      const to = typeof body.to === 'string' && DAY.test(body.to) ? body.to : null;
      if (!from || !to || from > to) return json({ error: 'Choose a semester.' }, 400);
      const { data: meRow } = await supabase.from('members').select('id, email').eq('user_id', user.id).maybeSingle();
      const me = meRow as { id: string; email: string | null } | null;
      const myKeys = new Set([...keysOf(user.id, user.email ?? null), ...keysOf(null, me?.email ?? null)]);
      const mineIn = (set: Set<string> | undefined) => !!set && [...myKeys].some((k) => set.has(k));

      // The same answer as People > Members: by the member the rows belong
      // to. Somebody with no member record (the association's own account)
      // is recognised by their account and address, as before.
      const held = await heldEvents(from, to);
      const wentTo = (ev: string) => (me ? held.attendedBy.get(ev)!.has(me.id) : mineIn(held.keysAttended.get(ev)));
      const listedFor = (ev: string) => (me ? held.registeredBy.get(ev)!.has(me.id) : mineIn(held.keysRegistered.get(ev)));
      const history = held.events.map((ev) => ({
        ...ev,
        status: wentTo(ev.id) ? 'attended' : listedFor(ev.id) ? 'registered_absent' : 'not_registered',
      }));

      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Rome' });
      const { data: openRows, error: openErr } = await supabase.from('events')
        .select('id, title, date, start_at, end_at, place, online, event_type, description, poster_url, registration_audience, capacity')
        .eq('registration_enabled', true).is('aod_day_id', null).gte('date', today)
        .order('date', { ascending: true }).limit(60);
      if (openErr) throw openErr;
      const open = (openRows || []) as {
        id: string; title: string; date: string; start_at: string | null; end_at: string | null; place: string | null; online: boolean | null;
        event_type: string; description: string | null; poster_url: string | null; registration_audience: string; capacity: number | null;
      }[];
      const openIds = open.map((e) => e.id);
      const regRows: { event_id: string; user_id: string | null; email: string | null }[] = [];
      const waitRows: { event_id: string; user_id: string | null; email: string | null }[] = [];
      if (openIds.length) {
        const [{ data: r1, error: e1 }, { data: w1, error: e2 }] = await Promise.all([
          supabase.from('event_registrations').select('event_id, user_id, email').in('event_id', openIds),
          supabase.from('event_waitlist').select('event_id, user_id, email').in('event_id', openIds),
        ]);
        if (e1) throw e1;
        if (e2) throw e2;
        regRows.push(...((r1 || []) as typeof regRows));
        waitRows.push(...((w1 || []) as typeof waitRows));
      }
      const isMine = (r: { user_id: string | null; email: string | null }) => keysOf(r.user_id, r.email).some((k) => myKeys.has(k));
      const { data: links } = openIds.length
        ? await supabase.from('event_join_links').select('event_id, url').in('event_id', openIds)
        : { data: [] };
      const linkOf = new Map(((links || []) as { event_id: string; url: string }[]).map((l) => [l.event_id, l.url]));
      const upcoming = open.map((e) => {
        const regs = regRows.filter((r) => r.event_id === e.id);
        const waits = waitRows.filter((r) => r.event_id === e.id);
        const status = regs.some(isMine) ? 'registered' : waits.some(isMine) ? 'waitlisted' : 'none';
        return {
          id: e.id, title: e.title, date: e.date, start_at: e.start_at, end_at: e.end_at,
          place: e.online ? 'Online' : e.place, online: !!e.online, event_type: e.event_type,
          description: e.description, poster_url: e.poster_url, audience: e.registration_audience,
          capacity: e.capacity, taken: regs.length, waiting: waits.length, status,
          join_url: status === 'registered' && e.online ? linkOf.get(e.id) ?? null : null,
        };
      });

      const { data: hoo } = await supabase.from('members')
        .select('first_name, surname').eq('role', 'head_of_operations').eq('membership_status', 'active')
        .order('created_at', { ascending: false }).limit(1);
      const h = ((hoo || [])[0] ?? null) as { first_name: string | null; surname: string | null } | null;
      const headOfOperations = h ? [h.first_name, h.surname].filter(Boolean).join(' ') || null : null;

      return json({ from, to: held.until, history, upcoming, head_of_operations: headOfOperations });
    }

    if (action === 'list') {
      const { data, error } = await supabase.from('event_registrations')
        .select('*').eq('event_id', body.event_id).order('registered_at', { ascending: true });
      if (error) throw error;
      const registrations = data || [];

      // ── who among them is a member ──────────────────────────────────────
      // From the one definition (public.event_registration_members), read
      // once for the whole list, so a room of two hundred costs one query.
      // A failure here must not fail the door list: the names still matter
      // more than the labels, so the rows go out unrecognised rather than
      // not at all.
      type Who = { member_id: string | null; how: string; ambiguous: boolean };
      const whoOf = new Map<string, Who>();
      const memberById = new Map<string, MemberLike>();
      let index = buildMemberIndex([]);
      try {
        const [{ data: who }, { data: members }] = await Promise.all([
          supabase.from('event_registration_members').select('registration_id, member_id, how, ambiguous').eq('event_id', body.event_id),
          supabase.from('members').select('id, user_id, first_name, surname, email, division, membership_status'),
        ]);
        for (const w of (who || []) as ({ registration_id: string } & Who)[]) whoOf.set(w.registration_id, w);
        const usable = ((members || []) as MemberLike[]).filter((m) => m.membership_status !== 'expelled');
        usable.forEach((m) => memberById.set(m.id, m));
        index = buildMemberIndex(usable);
      } catch (e) {
        console.error('member recognition failed; registrations go out unrecognised', e);
      }
      const fullName = (m: MemberLike) => `${m.first_name} ${m.surname}`.trim();
      const recognition = (r: Record<string, unknown>) => {
        const w = whoOf.get(r.id as string);
        const m = w?.member_id ? memberById.get(w.member_id) : undefined;
        const how = (w?.how ?? 'none') as 'account' | 'email' | 'name' | 'manual' | 'none';
        const ambiguous = !!w?.ambiguous;
        return {
          member_match: m ? how : 'none',
          member_id: m ? m.id : null,
          member_name: m ? fullName(m) : null,
          member_division: m ? m.division ?? null : null,
          member_ambiguous: ambiguous,
          // "Not a member", said by a person: shown so it can be undone.
          member_declined: (r.member_link as string | null) === 'none',
          // For a name two members share: who it could be, for "Link to member".
          member_candidates: ambiguous
            ? (index.byName.get(normaliseName(r.name as string | null)) || []).map((c) => ({ id: c.id, name: fullName(c), division: c.division ?? null }))
            : [],
        };
      };

      // Whether the list can still be changed, so the page can say so
      // before anybody tries rather than after.
      const { data: ev } = await supabase.from('events').select('*').eq('id', body.event_id).maybeSingle();
      // Who is waiting for a place, in order. Read on its own: before the
      // waiting list exists (or if it fails) the door list is unaffected.
      let waitlist: Record<string, unknown>[] = [];
      try {
        const { data: w } = await supabase.from('event_waitlist')
          .select('id, name, email, is_member, programme, affiliation, created_at')
          .eq('event_id', body.event_id).order('created_at', { ascending: true });
        waitlist = (w || []) as Record<string, unknown>[];
      } catch (e) { console.error('waiting list unavailable', e); }
      const listOpen = ev?.date ? attendanceOpen(ev.date) : true;
      return json({
        attendance_open: listOpen,
        attendance_closes_on: ev?.date ? attendanceClosesOn(ev.date) : null,
        // Closed for everybody else, but this reader can still correct it.
        attendance_override: !listOpen && overrides,
        // The ticket's token stays on the server: the list never needs it,
        // and a page showing it would make every ticket copyable.
        capacity: (ev as { capacity?: number | null } | null)?.capacity ?? null,
        waitlist,
        // The cancel link's token stays on the server for the same reason.
        registrations: registrations.map(({ checkin_token: _ticket, cancel_token: _cancel, ...r }: Record<string, unknown>) => ({
          ...r,
          ...recognition(r),
        })),
      });
    }
    if (action === 'checkin') {
      if (!allows(roles, user.email, 'events-attendance', 'manage')) {
        return json({ error: 'Only people with full access to Attendance can check people in.' }, 403);
      }
      const eventId = optionalTextOf(body, 'event_id');
      if (!eventId) return json({ error: 'Choose the event first.' }, 400);
      const token = tokenFromScan(body.token);
      if (!token) return json({ result: 'not_a_ticket' });
      const { data: reg } = await supabase.from('event_registrations')
        .select('id, event_id, user_id, name, email, attended, checked_in_at')
        .eq('checkin_token', token).maybeSingle();
      if (!reg) return json({ result: 'unknown' });
      if (reg.event_id !== eventId) {
        const { data: other } = await supabase.from('events').select('title, date').eq('id', reg.event_id).maybeSingle();
        return json({ result: 'other_event', name: reg.name, event_title: other?.title ?? null, event_date: other?.date ?? null });
      }
      const closed = await closedError(eventId);
      if (closed) return json({ error: closed }, 403);

      // Member or guest, the same way the door list decides it.
      let member = false;
      try {
        const { data: who } = await supabase.from('event_registration_members')
          .select('member_id').eq('registration_id', reg.id).maybeSingle();
        member = !!(who as { member_id: string | null } | null)?.member_id;
      } catch { /* recognised as a guest */ }

      audit.subject(reg.name, reg.id);
      if (reg.attended) {
        return json({ result: 'already', id: reg.id, name: reg.name, member, checked_in_at: reg.checked_in_at ?? null });
      }
      // The moment of the scan: now, or, for a scan kept on a phone without
      // signal, the moment it was read (within the last day, never ahead).
      let at = new Date();
      if (typeof body.scanned_at === 'string') {
        const t = new Date(body.scanned_at);
        const age = Date.now() - t.getTime();
        if (!Number.isNaN(t.getTime()) && age < 24 * 3600 * 1000 && age > -2 * 60 * 1000) at = age < 0 ? new Date() : t;
      }
      const stamp = at.toISOString();
      // Only a row not yet ticked is ticked: of two phones scanning the same
      // ticket at the same moment, one changes the row and the other finds
      // it already done.
      const { data: changed, error } = await supabase.from('event_registrations')
        .update({ attended: true, checked_in_at: stamp }).eq('id', reg.id).eq('attended', false).select('id');
      if (error) throw error;
      if (!changed || changed.length === 0) {
        const { data: now } = await supabase.from('event_registrations').select('checked_in_at').eq('id', reg.id).maybeSingle();
        return json({ result: 'already', id: reg.id, name: reg.name, member, checked_in_at: now?.checked_in_at ?? null });
      }
      return json({ result: 'checked_in', id: reg.id, name: reg.name, member, checked_in_at: stamp });
    }
    if (action === 'door-status') {
      if (!allows(roles, user.email, 'events-attendance', 'manage')) {
        return json({ error: 'Only people with full access to Attendance can check people in.' }, 403);
      }
      const eventId = optionalTextOf(body, 'event_id');
      if (!eventId) return json({ error: 'Choose the event first.' }, 400);
      const { data, error } = await supabase.from('event_registrations')
        .select('id, attended, checked_in_at').eq('event_id', eventId);
      if (error) throw error;
      const rows = (data || []) as { id: string; attended: boolean | null; checked_in_at: string | null }[];
      return json({
        rows: rows.map((r) => ({ id: r.id, attended: !!r.attended, checked_in_at: r.checked_in_at ?? null })),
        checked_in: rows.filter((r) => r.attended).length,
        total: rows.length,
      });
    }
    if (action === 'mark-attended') {
      if (!canEditAttendance) return json({ error: ATTENDANCE_EDIT_DENIED }, 403);
      const closed = await closedError(await eventOfRegistration(body.id));
      if (closed) return json({ error: closed }, 403);
      const { data: row, error } = await supabase.from('event_registrations')
        .update({ attended: !!body.attended }).eq('id', body.id).select('id, name').maybeSingle();
      if (error) throw error;
      if (row) audit.subject(`${(row as { name: string }).name}: ${body.attended ? 'present' : 'not present'}`, (row as { id: string }).id);
      return json({ success: true });
    }
    if (action === 'add-external') {
      if (!canEditAttendance) return json({ error: ATTENDANCE_EDIT_DENIED }, 403);
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
      audit.subject(fullName, typeof body.event_id === 'string' ? body.event_id : null);
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
      if (!canEditAttendance) return json({ error: ATTENDANCE_EDIT_DENIED }, 403);
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
      audit.subject(fullName, eventId);
      if (mine) {
        const { error } = await supabase.from('event_registrations')
          .update({ attended: true }).eq('id', mine.id);
        if (error) throw error;
        return json({ success: true, already_listed: true, name: fullName });
      }
      // Picked from the register by a person: that is the link.
      const { error } = await supabase.from('event_registrations').insert({
        event_id: eventId, user_id: m.user_id || null, name: fullName, email,
        is_member: true, is_external: false, attended: true, added_by: user.id,
        member_id: m.id, member_link: 'manual', member_linked_by: user.id, member_linked_at: new Date().toISOString(),
      });
      if (error) throw error;
      return json({ success: true, already_listed: false, name: fullName });
    }
    // =====================================================================
    // AN ONLINE EVENT'S ATTENDANCE, FROM THE MEETING'S REPORT.
    // ---------------------------------------------------------------------
    // The page reads the attendance report Teams gives the organiser (see
    // src/lib/attendance-report.ts) and sends the people in it, name and
    // email. Nothing it says about who they are is trusted: each person is
    // recognised HERE, against the register of members, the way the door
    // list does it (email first, then a name that matches exactly one
    // member; two members with the same name is no match).
    //
    //   import-preview     who each person is and whether they are on the
    //                      list already. Changes nothing.
    //   import-attendance  the people the organiser kept ticked, marked as
    //                      present: a row already on the list is ticked; a
    //                      member who is not is added as a member (with
    //                      their account and address), anybody else as a
    //                      guest. Guests are NOT added to the newsletter,
    //                      unlike a walk-in typed at the door: they never
    //                      asked to be. Running it twice changes nothing
    //                      the second time.
    //
    // Online events only, full access to Attendance only, and inside the
    // two weeks the list stays open, as every other change to it.
    // =====================================================================
    if (action === 'import-preview' || action === 'import-attendance') {
      if (!allows(roles, user.email, 'events-attendance', 'manage')) {
        return json({ error: 'Only people with full access to Attendance can record attendance from a report.' }, 403);
      }
      const eventId = optionalTextOf(body, 'event_id');
      if (!eventId) return json({ error: 'Choose the event first.' }, 400);
      const { data: ev } = await supabase.from('events').select('id, title, date, online').eq('id', eventId).maybeSingle();
      if (!ev) return json({ error: 'This event no longer exists. Reload the page.' }, 404);
      if (!ev.online) return json({ error: 'A meeting report records attendance for online events. For an event in person, scan the tickets or tick the list.' }, 400);
      const closed = await closedError(eventId);
      if (closed) return json({ error: closed }, 403);

      // The people sent, cleaned and counted once each.
      const EMAIL = /^[^\s@,;<>()"]+@[^\s@,;<>()"]+\.[a-z]{2,}$/i;
      const raw = Array.isArray(body.people) ? body.people : [];
      if (raw.length === 0) return json({ error: 'The report has nobody in it.' }, 400);
      if (raw.length > 1000) return json({ error: 'A report can hold at most 1,000 people.' }, 400);
      // `i`: the person's place in what was sent, so the page can put each
      // answer against the right line of its file.
      type Person = { name: string; email: string | null; i: number };
      const people: Person[] = [];
      const seen = new Set<string>();
      for (const [i, p] of (raw as unknown[]).entries()) {
        if (!p || typeof p !== 'object') continue;
        const o = p as Record<string, unknown>;
        const name = typeof o.name === 'string' ? o.name.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) : '';
        const e = normaliseEmail(typeof o.email === 'string' ? o.email : '');
        const email = e && e.length <= 254 && EMAIL.test(e) ? e : null;
        if (!name && !email) continue;
        const key = email ? `e:${email}` : `n:${normaliseName(name)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        people.push({ name: name || email!, email, i });
      }
      if (people.length === 0) return json({ error: 'The report has nobody in it.' }, 400);

      // The register, with the address of each member's account as well as
      // the one on their record, since either may be the one Teams shows.
      const { data: memberRows, error: mErr } = await supabase.from('members')
        .select('id, user_id, first_name, surname, email, division, membership_status');
      if (mErr) throw mErr;
      const members = ((memberRows || []) as MemberLike[]).filter((m) => m.membership_status !== 'expelled');
      const index = buildMemberIndex(members);
      const accountEmail = new Map<string, string>(); // member id -> account address
      const userIds = members.map((m) => m.user_id).filter(Boolean) as string[];
      for (let i = 0; i < userIds.length; i += 200) {
        const { data: profs } = await supabase.from('profiles').select('id, email').in('id', userIds.slice(i, i + 200));
        for (const pr of (profs || []) as { id: string; email: string | null }[]) {
          const e = normaliseEmail(pr.email);
          const m = index.byUserId.get(pr.id);
          if (!e || !m) continue;
          accountEmail.set(m.id, e);
          if (!index.byEmail.has(e)) index.byEmail.set(e, m);
        }
      }

      const { data: regRows, error: rErr } = await supabase.from('event_registrations')
        .select('id, user_id, name, email, attended, member_id, member_link').eq('event_id', eventId);
      if (rErr) throw rErr;
      type Reg = { id: string; user_id: string | null; name: string | null; email: string | null; attended: boolean | null; member_id?: string | null; member_link?: string | null };
      const regs = (regRows || []) as Reg[];
      const regByEmail = new Map<string, Reg>();
      const regsByName = new Map<string, Reg[]>();
      for (const r of regs) {
        const e = normaliseEmail(r.email);
        if (e && !regByEmail.has(e)) regByEmail.set(e, r);
        const n = normaliseName(r.name);
        if (n) regsByName.set(n, [...(regsByName.get(n) || []), r]);
      }
      /** The one row a name points at, if exactly one does. */
      const oneByName = (n: string, emailOk: (r: Reg) => boolean) => {
        const hits = (regsByName.get(n) || []).filter(emailOk);
        return hits.length === 1 ? hits[0] : null;
      };

      type Seen = {
        i: number; name: string; email: string | null; kind: 'member' | 'guest'; how: 'email' | 'name' | null;
        member: MemberLike | null; ambiguous: boolean; reg: Reg | null;
      };
      const recognise = (p: Person): Seen => {
        let member: MemberLike | null = null;
        let how: Seen['how'] = null;
        let ambiguous = false;
        if (p.email) { member = index.byEmail.get(p.email) ?? null; if (member) how = 'email'; }
        if (!member) {
          const hits = index.byName.get(normaliseName(p.name)) || [];
          if (hits.length === 1) { member = hits[0]; how = 'name'; }
          else if (hits.length > 1) ambiguous = true;
        }
        let reg: Reg | null = null;
        if (member) {
          const addresses = [normaliseEmail(member.email), accountEmail.get(member.id) ?? '', p.email ?? ''].filter(Boolean);
          reg = regs.find((r) => (member!.user_id && r.user_id === member!.user_id)) ?? null;
          for (const a of addresses) if (!reg) reg = regByEmail.get(a) ?? null;
          if (!reg) reg = oneByName(normaliseName(`${member.first_name} ${member.surname}`), (r) => !r.email || addresses.includes(normaliseEmail(r.email)));
          if (!reg) reg = oneByName(normaliseName(p.name), (r) => !r.email || addresses.includes(normaliseEmail(r.email)));
        } else {
          if (p.email) reg = regByEmail.get(p.email) ?? null;
          // By name only where the addresses cannot disagree.
          if (!reg) reg = oneByName(normaliseName(p.name), (r) => !r.email || !p.email || normaliseEmail(r.email) === p.email);
        }
        return { i: p.i, name: p.name, email: p.email, kind: member ? 'member' : 'guest', how, member, ambiguous, reg };
      };
      const found = people.map(recognise);

      if (action === 'import-preview') {
        return json({
          event: { id: ev.id, title: ev.title, date: ev.date },
          people: found.map((f) => ({
            i: f.i, name: f.name, email: f.email, kind: f.kind, how: f.how, ambiguous: f.ambiguous,
            member_name: f.member ? `${f.member.first_name} ${f.member.surname}`.trim() : null,
            member_division: f.member?.division ?? null,
            on_list: !!f.reg, already_present: !!f.reg?.attended,
          })),
        });
      }

      // Record them. Rows on the list are ticked together; the others are
      // added together; a clash on an address (somebody registered while
      // this ran) is settled row by row, by ticking the row that is there.
      const tick = new Set<string>();
      let already = 0;
      const inserts: Record<string, unknown>[] = [];
      // A row already on the list that the report recognised as a member,
      // and that nobody has linked yet: the link is stored now, so the
      // count keeps it whatever is later edited on the row.
      const links: { id: string; member_id: string; member_link: string }[] = [];
      for (const f of found) {
        if (f.reg) {
          if (f.reg.attended) already++; else tick.add(f.reg.id);
          if (f.member && !f.reg.member_id && !f.reg.member_link) {
            links.push({ id: f.reg.id, member_id: f.member.id, member_link: f.how === 'name' ? 'name' : 'email' });
          }
          continue;
        }
        if (f.member) {
          const email = normaliseEmail(f.member.email) || accountEmail.get(f.member.id) || f.email;
          inserts.push({
            event_id: eventId, user_id: f.member.user_id || null, name: `${f.member.first_name || ''} ${f.member.surname || ''}`.trim() || f.name,
            email: email || null, is_member: true, is_external: false, attended: true, added_by: user.id,
            // Recognised here, and confirmed by the organiser in the preview.
            member_id: f.member.id, member_link: f.how === 'name' ? 'name' : 'email',
          });
        } else {
          inserts.push({
            event_id: eventId, user_id: null, name: f.name, email: f.email,
            is_member: false, is_external: true, attended: true, added_by: user.id,
          });
        }
      }
      // Two report rows can lead to the same new row (a member found by
      // name and by address): one insert each address.
      const byAddress = new Map<string, Record<string, unknown>>();
      const unique: Record<string, unknown>[] = [];
      for (const row of inserts) {
        const e = normaliseEmail(row.email as string | null);
        if (e) { if (byAddress.has(e)) continue; byAddress.set(e, row); }
        unique.push(row);
      }
      if (tick.size) {
        const ids = [...tick];
        for (let i = 0; i < ids.length; i += 200) {
          const { error } = await supabase.from('event_registrations').update({ attended: true }).in('id', ids.slice(i, i + 200));
          if (error) throw error;
        }
      }
      for (const l of links) {
        const { error } = await supabase.from('event_registrations')
          .update({ member_id: l.member_id, member_link: l.member_link }).eq('id', l.id).is('member_id', null);
        if (error) throw error;
      }
      let addedMembers = 0;
      let addedGuests = 0;
      const count = (row: Record<string, unknown>) => { if (row.is_member) addedMembers++; else addedGuests++; };
      if (unique.length) {
        const { error } = await supabase.from('event_registrations').insert(unique);
        if (!error) unique.forEach(count);
        else if ((error as { code?: string }).code === '23505') {
          for (const row of unique) {
            const { error: one } = await supabase.from('event_registrations').insert(row);
            if (!one) { count(row); continue; }
            if ((one as { code?: string }).code !== '23505' || !row.email) throw one;
            const { data: there } = await supabase.from('event_registrations').select('id, attended')
              .eq('event_id', eventId).ilike('email', String(row.email).replace(/[\\%_]/g, (c) => `\\${c}`)).maybeSingle();
            if (there && !there.attended) {
              await supabase.from('event_registrations').update({ attended: true }).eq('id', there.id);
              tick.add(there.id);
            } else already++;
          }
        } else throw error;
      }
      audit.subject(`${ev.title || 'Online event'}: ${found.length} from the meeting report`, ev.id);
      return json({ success: true, ticked: tick.size, added_members: addedMembers, added_guests: addedGuests, already, total: found.length });
    }
    if (action === 'remove') {
      if (!canEditAttendance) return json({ error: ATTENDANCE_EDIT_DENIED }, 403);
      const closed = await closedError(await eventOfRegistration(body.id));
      if (closed) return json({ error: closed }, 403);
      const { data: gone, error } = await supabase.from('event_registrations').delete().eq('id', body.id).select('id, name').maybeSingle();
      if (error) throw error;
      if (gone) audit.subject((gone as { name: string }).name, (gone as { id: string }).id);
      return json({ success: true });
    }
    // =====================================================================
    // WHO A REGISTRATION IS, SETTLED BY A PERSON.
    // ---------------------------------------------------------------------
    // "Link to member" on a row that matches two members by name ("Needs
    // linking"), or a correction on any row: `member_id` links it to that
    // member; `member_id: null` says it is NOT a member (a guest who shares
    // a member's name). Either way it is never relinked automatically, and
    // the count in People > Members follows at once. Inside the same
    // window as every other change to the list.
    // =====================================================================
    if (action === 'link-member') {
      if (!canEditAttendance) return json({ error: ATTENDANCE_EDIT_DENIED }, 403);
      const regId = optionalTextOf(body, 'id');
      if (!regId) return json({ error: 'Choose the registration first.' }, 400);
      const { data: reg } = await supabase.from('event_registrations').select('id, event_id, name').eq('id', regId).maybeSingle();
      if (!reg) return json({ error: 'This registration no longer exists. Reload the page.' }, 404);
      const closed = await closedError(reg.event_id);
      if (closed) return json({ error: closed }, 403);
      const memberId = body.member_id === null ? null : optionalTextOf(body, 'member_id');
      if (body.member_id !== null && !memberId) return json({ error: 'Choose the member.' }, 400);
      let memberName = 'not a member';
      if (memberId) {
        const { data: m } = await supabase.from('members').select('id, first_name, surname, membership_status').eq('id', memberId).maybeSingle();
        if (!m || m.membership_status === 'expelled') return json({ error: 'This person is not on the register of members.' }, 404);
        memberName = `${m.first_name || ''} ${m.surname || ''}`.trim();
      }
      const { error } = await supabase.from('event_registrations').update({
        member_id: memberId, member_link: memberId ? 'manual' : 'none',
        member_linked_by: user.id, member_linked_at: new Date().toISOString(),
      }).eq('id', regId);
      if (error) throw error;
      audit.subject(`${reg.name}: linked to ${memberName}`, regId);
      return json({ success: true, member_id: memberId, member_name: memberId ? memberName : null });
    }
    return json({ error: 'Invalid action' }, 400);
  } catch (error) {
    console.error('admin-event-reg error:', error);
    return json({ error: 'An unexpected error occurred. Please try again.' }, 500);
  }
}));
