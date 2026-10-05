import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { readJsonObject, textOf, optionalTextOf, UNREADABLE_BODY } from '../_shared/request-body.ts';

// =====================================================================
// register-event: public event registration. Actions:
//   (none)    register; when the event has a limit of places and it is
//             full, the person joins the waiting list instead
//   lookup    what a cancel link (?t=) refers to, for the cancel page
//   cancel    "Can't make it": by the link's token, or signed in with the
//             event id (the workspace Calendar). Frees the place, which the
//             database gives at once to the first person waiting
//             (promote_event_waitlist, migration 20260929090000).
// Every email goes through public.send_event_notice, which builds it with
// the person's own ticket, "Add to calendar" and cancel links.
//
// Registration is audience-gated:
//   members            → must be signed in and be an association member
//   members_external   → members or external students (name + email)
//   guests / public    → anyone (name + email)
//
// SIGNED IN IS NOT THE SAME THING AS A MEMBER, and this function has
// always known that: `isMember` below ignores the candidate and pending
// roles, so an APPLICANT - who has an account, because they sign in to
// follow their application - is treated here as any other guest and must
// send a name. The registration form did not know it, showed applicants
// the members' version of the form and sent no name, and this function
// duly answered "Please provide your name" about a field they had never
// been given. The form now asks the same question this does; see
// `isAssociationMember` in src/lib/events-api.ts, which mirrors the rule
// on line ~80 exactly.
// =====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

// Basic server-side email validation (format + length).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isValidEmail(e: string | null | undefined): e is string {
  return typeof e === 'string' && e.length >= 3 && e.length <= 255 && EMAIL_RE.test(e);
}

const TOKEN_RE = /^[a-f0-9]{32}$/;

/** Has the event begun (or, for an all-day event, is its day over)? */
function hasStarted(ev: { start_at: string | null; date: string | null }): boolean {
  if (ev.start_at) return Date.parse(ev.start_at) <= Date.now();
  if (ev.date) {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Rome' });
    return ev.date.slice(0, 10) < today;
  }
  return false;
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

    // THE PUBLIC FORM'S FIELDS ARE READ AS WHAT THEY ARE. These were
    // `(body.name as string | undefined)?.trim()`: a cast that enforces
    // nothing, then a string method. Any field arriving as something other
    // than text - a number, a list, `null` in place of the whole body -
    // threw, and a visitor registering for an event was told "an
    // unexpected error occurred". See _shared/request-body.ts. Every
    // well-formed registration reads exactly as before.
    const body = await readJsonObject(req);
    if (!body) return json({ error: UNREADABLE_BODY }, 400);
    const action = optionalTextOf(body, 'action') || 'register';

    // ── The cancel link: what it is, and cancelling ────────────────────
    if (action === 'lookup' || action === 'cancel') {
      const token = (optionalTextOf(body, 't') || '').toLowerCase();
      const byAccount = !token && !!userId;
      if (!byAccount && token !== 'sample' && !TOKEN_RE.test(token)) {
        return json({ error: 'This link is not complete. Open it again from your email.' }, 400);
      }
      if (token === 'sample') {
        return json({ kind: 'sample' });
      }
      type Reg = { id: string; event_id: string; name: string; email: string | null; attended: boolean };
      let reg: Reg | null = null;
      let wait: { id: string; event_id: string; name: string; email: string; created_at: string } | null = null;
      if (byAccount) {
        const evId = textOf(body, 'event_id');
        if (!evId) return json({ error: 'Missing event' }, 400);
        const { data: r } = await supabase.from('event_registrations')
          .select('id, event_id, name, email, attended').eq('event_id', evId).eq('user_id', userId).maybeSingle();
        reg = r as Reg | null;
        // A member who registered on the public form, without signing in, is
        // found by the address of their account (Events > My events counts
        // that place as theirs, so it must be theirs to cancel).
        if (!reg && userEmail) {
          const { data: byMail } = await supabase.from('event_registrations')
            .select('id, event_id, name, email, attended').eq('event_id', evId).is('user_id', null).ilike('email', userEmail).limit(1);
          reg = ((byMail || [])[0] as Reg | undefined) ?? null;
        }
        if (!reg) {
          const { data: w } = await supabase.from('event_waitlist')
            .select('id, event_id, name, email, created_at').eq('event_id', evId).eq('user_id', userId).maybeSingle();
          wait = w;
        }
        if (!reg && !wait && userEmail) {
          const { data: wMail } = await supabase.from('event_waitlist')
            .select('id, event_id, name, email, created_at').eq('event_id', evId).is('user_id', null).ilike('email', userEmail).limit(1);
          wait = (wMail || [])[0] ?? null;
        }
      } else {
        const { data: r } = await supabase.from('event_registrations')
          .select('id, event_id, name, email, attended').eq('cancel_token', token).maybeSingle();
        reg = r as Reg | null;
        if (!reg) {
          const { data: w } = await supabase.from('event_waitlist')
            .select('id, event_id, name, email, created_at').eq('token', token).maybeSingle();
          wait = w;
        }
      }
      if (!reg && !wait) return json({ kind: 'gone' });
      const evId = (reg ?? wait)!.event_id;
      const { data: ev } = await supabase.from('events')
        .select('id, title, date, start_at, end_at, place, online, aod_day_id').eq('id', evId).maybeSingle();
      if (!ev) return json({ kind: 'gone' });
      const event = { id: ev.id, title: ev.title, date: ev.date, start_at: ev.start_at, end_at: ev.end_at, place: ev.place, online: ev.online };
      let position: number | null = null;
      if (wait) {
        const { count } = await supabase.from('event_waitlist').select('id', { count: 'exact', head: true })
          .eq('event_id', evId).lte('created_at', wait.created_at);
        position = count ?? null;
      }
      const started = hasStarted(ev);
      const name = (reg ?? wait)!.name;

      if (action === 'lookup') {
        return json({ kind: reg ? 'registration' : 'waitlist', event, name, attended: !!reg?.attended, started, position });
      }
      // Cancelling.
      if (ev.aod_day_id) return json({ error: 'Association on Display is managed from its own page in the workspace.' }, 409);
      if (reg?.attended) return json({ error: 'You have already been checked in at this event.' }, 409);
      if (started) return json({ error: 'This event has already started, so there is nothing to cancel.' }, 409);
      if (reg) {
        const { error } = await supabase.from('event_registrations').delete().eq('id', reg.id);
        if (error) throw error;
        if (reg.email) {
          try {
            const { error: notice1 } = await supabase.rpc('send_event_notice', { p_kind: 'cancelled', p_event_id: evId, p_email: reg.email, p_name: name });
            if (notice1) console.error('event email not queued', notice1.message);
          } catch (e) { console.error('cancellation email failed', e); }
        }
        return json({ success: true, cancelled: 'registration', event });
      }
      const { error } = await supabase.from('event_waitlist').delete().eq('id', wait!.id);
      if (error) throw error;
      return json({ success: true, cancelled: 'waitlist', event });
    }

    const eventId = textOf(body, 'event_id');
    const name = optionalTextOf(body, 'name') ?? undefined;
    const email = optionalTextOf(body, 'email') || userEmail;

    if (!eventId) return json({ error: 'Missing event' }, 400);

    const { data: ev } = await supabase.from('events')
      .select('registration_enabled, registration_audience, title, date, start_at, end_at, place, online, description')
      .eq('id', eventId).maybeSingle();
    if (!ev || !ev.registration_enabled) return json({ error: 'Registration is not open for this event.' }, 403);


    const audience = ev.registration_audience as string;
    if (audience === 'members' && !isMember) {
      // TWO REASONS, TWO ANSWERS. "Please sign in" is an instruction an
      // applicant cannot follow: they ARE signed in, and signing in again
      // will not make them a member. Only somebody who is not signed in
      // is told to sign in.
      return json({
        error: userId
          ? 'This event is open to association members only, and your account is not a member of the association.'
          : 'This event is open to association members only. Please sign in.',
      }, 403);
    }
    if ((audience === 'members' || audience === 'members_external') && !isMember && !email) {
      return json({ error: 'An email is required to register.' }, 400);
    }
    if (!name && !isMember) return json({ error: 'Please provide your name.' }, 400);
    if (!email) return json({ error: 'An email is required to register.' }, 400);
    if (!isValidEmail(email)) return json({ error: 'Please provide a valid email address.' }, 400);

    // Resolve a display name for members.
    let displayName = name;
    if (!displayName && userId) {
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle();
      displayName = profile?.full_name || userEmail || 'Member';
    }

    const isBocconi = typeof body.is_bocconi === 'boolean' ? body.is_bocconi : (isMember ? true : null);
    const programme = optionalTextOf(body, 'programme');
    const academicYear = optionalTextOf(body, 'academic_year');
    const affiliation = optionalTextOf(body, 'affiliation');

    // Dedupe by event + email, on the list and in the queue.
    const { data: existing } = await supabase.from('event_registrations')
      .select('id').eq('event_id', eventId).ilike('email', email).maybeSingle();
    if (existing) return json({ success: true, alreadyRegistered: true });
    const waitingPosition = async (): Promise<number | null> => {
      const { data: w } = await supabase.from('event_waitlist')
        .select('created_at').eq('event_id', eventId).ilike('email', email).maybeSingle();
      if (!w) return null;
      const { count } = await supabase.from('event_waitlist').select('id', { count: 'exact', head: true })
        .eq('event_id', eventId).lte('created_at', (w as { created_at: string }).created_at);
      return count ?? 1;
    };
    const already = await waitingPosition();
    if (already) return json({ success: true, waitlisted: true, alreadyWaiting: true, position: already });

    const row = {
      event_id: eventId, user_id: userId, name: displayName, email,
      is_member: isMember, is_external: !isMember,
      is_bocconi: isBocconi, programme, academic_year: academicYear, affiliation,
    };
    const { error } = await supabase.from('event_registrations').insert(row);
    // FULL: the database refused the place (EVENT_FULL, migration
    // 20260929090000). The person joins the waiting list instead.
    if (error && /EVENT_FULL/.test(error.message || '')) {
      const { error: wErr } = await supabase.from('event_waitlist').insert({ ...row, name: displayName || email });
      if (wErr && wErr.code !== '23505') throw wErr;
      if (!isMember && email) {
        try { await supabase.from('newsletter_subscribers').insert({ email, consent: true, source: 'event' }); }
        catch { /* ignore duplicates */ }
      }
      try {
        const { error: notice2 } = await supabase.rpc('send_event_notice', { p_kind: 'waitlist_joined', p_event_id: eventId, p_email: email });
        if (notice2) console.error('event email not queued', notice2.message);
      } catch (e) { console.error('waiting list email failed', e); }
      return json({ success: true, waitlisted: true, position: await waitingPosition() });
    }
    if (error) throw error;

    // External (non-member) registrants are added to the newsletter.
    if (!isMember && email) {
      try { await supabase.from('newsletter_subscribers').insert({ email, consent: true, source: 'event' }); }
      catch { /* ignore duplicates */ }
    }

    // The confirmation, with the ticket for the door, "Add to calendar"
    // and the "Can't make it?" link, built by the database from the row.
    try {
      const { error: notice3 } = await supabase.rpc('send_event_notice', { p_kind: 'confirmation', p_event_id: eventId, p_email: email });
      if (notice3) console.error('event email not queued', notice3.message);
    } catch (e) { console.error('registration confirmation email failed', e); }

    return json({ success: true });

  } catch (error) {
    console.error('register-event error:', error);
    return json({ error: 'An unexpected error occurred. Please try again.' }, 500);
  }
});
