/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { audited } from '../_shared/activity.ts';
import { isBookableSlot, isFutureSlot, nowInAssociationTime } from '../_shared/interview-slots.ts';
import { emailCallCalendarBlock } from '../_shared/calendar.ts';
import { romeZone, romeStamp12 } from '../_shared/event-time.ts';
import { notifyStaff, type StaffRecipient } from '../_shared/staff-notify.ts';
import { intakeLabel, intakeOf } from '../_shared/recruiting.ts';
import { readJsonObject, UNREADABLE_BODY, isIsoDate, isClockTime, type LooseBody } from '../_shared/request-body.ts';

// =====================================================================
// recruiting-calls: the phone call (Step 97).
// ---------------------------------------------------------------------
// AFTER THE DIVISION'S INTERVIEW AND BEFORE THE OFFER, a candidate the
// division wants is invited to a short phone call with the President or
// the Vice President. The call is about the Society as a whole, not about
// markets. It reuses the interview's machinery: slots opened by smart
// planning, a booking with one change, "Add to calendar", a reminder to
// book and one before the call, the booking row as the once-only marker.
//
// Staff actions (the President, the Vice President, the admin account):
//   overview · create-slots · update-slot · delete-slot · invite · record-outcome
// Candidate actions (the invited applicant, on their own application):
//   my-context · list-available · book · cancel
//
// THE OUTCOME MOVES THE CANDIDACY ON, and the caller's notes go into the
// candidate's notes, where every reviewer reads them:
//   pass    -> "Accepted": selected for an offer, nothing sent yet
//   hold    -> "Call on hold": internal, nothing sent
//   decline -> "Rejected", with the usual post-interview rejection email
// =====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const ADMIN_EMAIL = 'as.minerva@unibocconi.it';
const CALLER_ROLES = ['admin', 'president', 'vice_president'];
const STATUS_URL = 'https://minervaims.org/workspace/applications/phone-call';

/** Where a candidate may be invited from: after the interview, before a decision. */
const INVITABLE = ['interview_completed', 'on_hold_post_interview', 'plausible_offer'];
const CALL_STATUSES = ['call_invitation_sent', 'call_confirmed', 'call_on_hold'];
const BOOKABLE_STATUS = 'call_invitation_sent';
const BOOKED_STATUS = 'call_confirmed';
/** The first booking and one change, as for the interview. */
const MAX_BOOKINGS = 2;
/** A booked call can be moved until an hour before it. */
const CANCEL_BEFORE_MINUTES = 60;
/** Smart planning: fifteen minutes unless the caller chooses another length. */
export const CALL_MINUTES = [10, 15, 20, 30];
const DEFAULT_CALL_MINUTES = 15;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function formatDate(iso: string): string {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return `${WEEKDAYS[dt.getUTCDay()]} ${d} ${MONTHS[m - 1]} ${y}`;
}
function clock(t: string): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(t || '');
  if (!m) return String(t || '').slice(0, 5);
  const h = Number(m[1]);
  return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${h >= 12 ? 'pm' : 'am'}`;
}
const toMin = (t: string) => { const [h, m] = String(t).split(':').map(Number); return h * 60 + m; };
function span(start: string, end: string, date: string): string {
  const zone = romeZone(new Date(`${String(date).slice(0, 10)}T12:00:00Z`));
  const mins = toMin(end) - toMin(start);
  return `${clock(start)} to ${clock(end)} ${zone}${mins > 0 ? ` (${mins} minutes)` : ''}`;
}
function addMinutes(t: string, mins: number): string {
  const total = toMin(t) + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** A phone number a person can dial: digits, spaces, a leading +, brackets, dots and dashes. */
export function phoneError(raw: unknown): string | null {
  const v = typeof raw === 'string' ? raw.trim() : '';
  if (!v) return 'Add the phone number you will call from. Candidates receive it, so they recognise the call and can call back.';
  if (!/^\+?[0-9][0-9 ().-]{4,24}$/.test(v) || v.replace(/\D/g, '').length < 6) {
    return 'That is not a phone number. Use digits, spaces and an optional + with the country code, for example +39 333 123 4567.';
  }
  return null;
}

/** Minutes from now to a slot's start, on Rome's clock. */
function minutesUntil(slot: { slot_date: string; start_time: string }): number {
  const now = nowInAssociationTime();
  const days = (Date.parse(`${slot.slot_date}T00:00:00Z`) - Date.parse(`${now.date}T00:00:00Z`)) / 86400000;
  return days * 1440 + toMin(String(slot.start_time).slice(0, 5)) - toMin(now.time);
}

async function systemNote(supabase: any, applicationId: string, body: string): Promise<void> {
  try {
    await supabase.from('application_notes').insert({ application_id: applicationId, author_id: null, author_name: 'Minerva Workspace', body, kind: 'system' });
  } catch (e) { console.error('system note failed', e); }
}

Deno.serve(audited('recruiting-calls', async (req, audit) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.split(' ')[1]);
    if (authError || !user) return json({ error: 'Invalid token' }, 401);

    const { data: roleRows } = await supabase.from('user_roles').select('role, division').eq('user_id', user.id);
    const roles = (roleRows || []).map((r: any) => r.role as string);
    audit.actor(user, roles);
    const isCaller = user.email === ADMIN_EMAIL || roles.some((r: string) => CALLER_ROLES.includes(r));

    const parsed = await readJsonObject(req);
    if (!parsed) return json({ error: UNREADABLE_BODY }, 400);
    const body = parsed as LooseBody;
    const action = typeof body.action === 'string' ? body.action : '';
    audit.request(action, body);

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
    const myName = async () => {
      const { data: p } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
      return p?.full_name || user.email || 'A member of the Board';
    };
    const recipientOf = async (id: string | null | undefined): Promise<StaffRecipient[]> => {
      if (!id) return [];
      const { data } = await supabase.from('profiles').select('email, full_name').eq('id', id).maybeSingle();
      if (!data?.email) return [];
      return [{ email: data.email, first_name: (data.full_name || '').trim().split(/\s+/)[0] || 'colleague' }];
    };
    // Bookings per slot, to know what is still free.
    const takenBySlot = async (ids: string[]) => {
      const out: Record<string, any[]> = {};
      if (!ids.length) return out;
      const { data } = await supabase.from('call_bookings')
        .select('id, slot_id, application_id, candidate_name, candidate_email, candidate_phone, reminder_sent_at').in('slot_id', ids);
      for (const b of data || []) (out[b.slot_id] ||= []).push(b);
      return out;
    };
    const freeSlots = async () => {
      const now = nowInAssociationTime();
      const { data: slots } = await supabase.from('call_slots').select('*')
        .eq('is_active', true).gte('slot_date', now.date)
        .order('slot_date', { ascending: true }).order('start_time', { ascending: true });
      const live = (slots || []).filter((s: any) => isBookableSlot({ ...s, is_booked: false }, now));
      const taken = await takenBySlot(live.map((s: any) => s.id));
      return live.filter((s: any) => (taken[s.id]?.length ?? 0) < Number(s.capacity || 1));
    };

    // =================================================================
    // STAFF ACTIONS
    // =================================================================
    if (['overview', 'create-slots', 'update-slot', 'delete-slot', 'invite', 'record-outcome'].includes(action)) {
      if (!isCaller) return json({ error: 'The phone call is run by the President and the Vice President.' }, 403);
    }

    if (action === 'overview') {
      // Past slots nobody booked are rubbish, as on the interview calendar;
      // a slot that was booked is the record of a call and stays.
      try {
        const now = nowInAssociationTime();
        const { data: old } = await supabase.from('call_slots').select('id, slot_date, start_time').lte('slot_date', now.date);
        const past = (old || []).filter((s: any) => !isFutureSlot(s, now)).map((s: any) => s.id);
        if (past.length) {
          const taken = await takenBySlot(past);
          const empty = past.filter((id: string) => !taken[id]?.length);
          if (empty.length) await supabase.from('call_slots').delete().in('id', empty);
        }
      } catch (e) { console.error('sweeping past call slots failed', e); }

      const { data: slots } = await supabase.from('call_slots').select('*')
        .order('slot_date', { ascending: true }).order('start_time', { ascending: true });
      const taken = await takenBySlot((slots || []).map((s: any) => s.id));
      const { data: apps } = await supabase.from('applications')
        .select('id, first_name, surname, email, phone, status, semester_label, evaluation_division, interview_division, first_choice, call_invited_at, call_outcome, call_outcome_at, call_bookings_made, created_at')
        .or(`status.in.(${[...INVITABLE, ...CALL_STATUSES].join(',')}),call_invited_at.not.is.null`)
        .order('created_at', { ascending: false });
      const { data: member } = await supabase.from('members').select('phone').eq('user_id', user.id).maybeSingle();
      return json({
        slots: (slots || []).map((s: any) => ({ ...s, bookings: taken[s.id] || [] })),
        candidates: (apps || []).map((a: any) => ({ ...a, division: intakeOf(a.evaluation_division || a.interview_division || a.first_choice) })),
        me: { id: user.id, name: await myName(), phone: member?.phone || '' },
        minutes: CALL_MINUTES,
      });
    }

    if (action === 'create-slots') {
      const { slot_date, start_time, end_time } = body;
      if (!isIsoDate(slot_date)) return json({ error: 'Choose a valid date.' }, 400);
      if (!isClockTime(start_time) || !isClockTime(end_time)) return json({ error: 'Choose a valid start and end time (HH:MM).' }, 400);
      if (String(end_time).slice(0, 5) <= String(start_time).slice(0, 5)) return json({ error: 'The range must end after it starts.' }, 400);
      const minutes = body.slot_minutes == null ? DEFAULT_CALL_MINUTES : Number(body.slot_minutes);
      if (!CALL_MINUTES.includes(minutes)) return json({ error: `A call can be ${CALL_MINUTES.join(', ')} minutes long.` }, 400);
      const capacity = body.capacity == null ? 1 : Number(body.capacity);
      if (!Number.isInteger(capacity) || capacity < 1 || capacity > 10) return json({ error: 'Each slot takes between 1 and 10 candidates.' }, 400);
      const phone = String(body.caller_phone ?? '').trim();
      const pErr = phoneError(phone);
      if (pErr) return json({ error: pErr }, 400);
      if (!isFutureSlot({ slot_date: String(slot_date), start_time: String(start_time) })) return json({ error: 'That time has already passed.' }, 400);

      const name = await myName();
      const rows: any[] = [];
      let cur = String(start_time).slice(0, 5);
      const end = String(end_time).slice(0, 5);
      for (let guard = 0; cur < end && guard < 96; guard++) {
        const next = addMinutes(cur, minutes);
        if (next > end || next <= cur) break;
        rows.push({ slot_date, start_time: cur, end_time: next, caller_id: user.id, caller_name: name, caller_phone: phone, capacity, created_by: user.id });
        cur = next;
      }
      if (!rows.length) return json({ error: `That range holds no ${minutes}-minute call.` }, 400);
      // No overlaps in one caller's day.
      const { data: mine } = await supabase.from('call_slots').select('start_time, end_time').eq('slot_date', slot_date).eq('caller_id', user.id);
      const busy = (mine || []).map((s: any) => [String(s.start_time).slice(0, 5), String(s.end_time).slice(0, 5)]);
      const fresh = rows.filter((r) => !busy.some(([s, e]: string[]) => r.start_time < e && r.end_time > s));
      if (!fresh.length) return json({ success: true, created: 0, skipped_overlapping: rows.length });
      const { error } = await supabase.from('call_slots').insert(fresh);
      if (error) {
        if ((error as any).code === '23514') return json({ error: (error as any).message }, 400);
        throw error;
      }
      return json({ success: true, created: fresh.length, skipped_overlapping: rows.length - fresh.length });
    }

    if (action === 'update-slot') {
      const { data: slot } = await supabase.from('call_slots').select('*').eq('id', body.id).maybeSingle();
      if (!slot) return json({ error: 'Not found' }, 404);
      const updates: Record<string, unknown> = {};
      if (body.caller_phone !== undefined) {
        const pErr = phoneError(body.caller_phone);
        if (pErr) return json({ error: pErr }, 400);
        updates.caller_phone = String(body.caller_phone).trim();
      }
      if (body.capacity !== undefined) {
        const capacity = Number(body.capacity);
        const taken = (await takenBySlot([slot.id]))[slot.id]?.length ?? 0;
        if (!Number.isInteger(capacity) || capacity < 1 || capacity > 10) return json({ error: 'Each slot takes between 1 and 10 candidates.' }, 400);
        if (capacity < taken) return json({ error: `${taken} candidates have booked this slot, so it cannot take fewer.` }, 409);
        updates.capacity = capacity;
      }
      if (!Object.keys(updates).length) return json({ success: true });
      const { error } = await supabase.from('call_slots').update(updates).eq('id', slot.id);
      if (error) throw error;
      return json({ success: true });
    }

    if (action === 'delete-slot') {
      const { data: slot } = await supabase.from('call_slots').select('id').eq('id', body.id).maybeSingle();
      if (!slot) return json({ error: 'Not found' }, 404);
      // A booked slot is somebody's call: it is not taken away from here.
      const taken = (await takenBySlot([slot.id]))[slot.id]?.length ?? 0;
      if (taken) return json({ error: 'A candidate has booked this slot. It can be removed once they have moved their call, or kept as the record of the call once it has been held.' }, 409);
      const { error } = await supabase.from('call_slots').delete().eq('id', slot.id);
      if (error) throw error;
      return json({ success: true });
    }

    if (action === 'invite') {
      const { data: app } = await supabase.from('applications')
        .select('id, first_name, surname, email, status, call_invited_at').eq('id', body.id).maybeSingle();
      if (!app) return json({ error: 'Not found' }, 404);
      audit.subject(`${app.first_name} ${app.surname}`, app.id);
      if (!INVITABLE.includes(app.status)) {
        return json({ error: 'Only a candidate whose interview is completed, and who has not been accepted or rejected, can be invited to a phone call.' }, 409);
      }
      // AN INVITATION WITHOUT A TIME TO BOOK IS NOT AN INVITATION, as for interviews.
      if (!(await freeSlots()).length) {
        return json({ error: 'There is no call slot a candidate could book. Open at least one future slot below, then invite.' }, 409);
      }
      const invitedAt = new Date();
      const { error } = await supabase.from('applications').update({
        status: BOOKABLE_STATUS, call_invited_at: invitedAt.toISOString(), call_invited_by: user.id, call_reminder_sent_at: null,
      }).eq('id', app.id).eq('status', app.status);
      if (error) throw error;
      await systemNote(supabase, app.id, `Invited to a phone call by ${await myName()}.`);
      try {
        await supabase.rpc('enqueue_app_email', {
          p_key: 'call_invitation', p_to: app.email,
          p_vars: { first_name: esc(app.first_name), book_by: romeStamp12(new Date(invitedAt.getTime() + 72 * 3600 * 1000)), status_url: STATUS_URL },
        });
      } catch (e) { console.error('call invitation email failed', e); }
      return json({ success: true });
    }

    if (action === 'record-outcome') {
      const outcome = body.outcome;
      if (!['pass', 'hold', 'decline'].includes(outcome)) return json({ error: 'Choose Pass, Hold or Decline.' }, 400);
      const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 4000) : '';
      const { data: app } = await supabase.from('applications')
        .select('id, first_name, surname, email, status, evaluation_division, interview_division, first_choice').eq('id', body.id).maybeSingle();
      if (!app) return json({ error: 'Not found' }, 404);
      audit.subject(`${app.first_name} ${app.surname}`, app.id);
      if (!CALL_STATUSES.includes(app.status)) return json({ error: 'This candidate is not at the phone call stage.' }, 409);
      if (outcome === 'hold' && app.status === 'call_on_hold' && !notes) return json({ success: true });

      const next = outcome === 'pass' ? 'accepted' : outcome === 'decline' ? 'rejected' : 'call_on_hold';
      const { error } = await supabase.from('applications').update({
        status: next, call_outcome: outcome, call_outcome_at: new Date().toISOString(), call_outcome_by: user.id,
      }).eq('id', app.id).eq('status', app.status);
      if (error) throw error;

      const caller = await myName();
      const label = outcome === 'pass' ? 'Pass' : outcome === 'decline' ? 'Decline' : 'Hold';
      try {
        await supabase.from('application_notes').insert({
          application_id: app.id, author_id: user.id, author_name: caller, kind: 'human',
          body: `Phone call outcome: ${label}.${notes ? ` ${notes}` : ''}`,
        });
      } catch (e) { console.error('call note failed', e); }

      if (outcome === 'decline') {
        try {
          await supabase.rpc('enqueue_app_email', {
            p_key: 'rejection_post_interview', p_to: app.email,
            p_vars: { first_name: esc(app.first_name), division_name: intakeLabel(app.evaluation_division || app.interview_division || app.first_choice) },
          });
        } catch (e) { console.error('rejection email failed', e); }
      }
      return json({ success: true, status: next });
    }

    // =================================================================
    // CANDIDATE ACTIONS, on the caller's own application only
    // =================================================================
    const { data: app } = await supabase.from('applications')
      .select('id, user_id, first_name, surname, email, phone, status, evaluation_division, interview_division, first_choice, call_invited_at, call_bookings_made')
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();

    if (action === 'my-context') {
      if (!app) return json({ invited: false });
      const { data: booking } = await supabase.from('call_bookings').select('id, slot_id').eq('application_id', app.id).maybeSingle();
      let slot = null;
      if (booking) {
        const { data: s } = await supabase.from('call_slots')
          .select('slot_date, start_time, end_time, caller_name, caller_phone').eq('id', booking.slot_id).maybeSingle();
        slot = s;
      }
      const withdrawn = app.status === 'withdrawn';
      const invited = !withdrawn && !!app.call_invited_at && CALL_STATUSES.includes(app.status);
      // The call is behind them: the decision is reached elsewhere, and is
      // not given away here before the association acts on it.
      const done = !withdrawn && !!app.call_invited_at && !CALL_STATUSES.includes(app.status);
      return json({
        invited, withdrawn, done,
        status: app.status,
        phone: app.phone,
        bookBy: app.call_invited_at ? romeStamp12(new Date(Date.parse(app.call_invited_at) + 72 * 3600 * 1000)) : null,
        booking: booking ? { id: booking.id, slot } : null,
        changesLeft: Math.max(0, MAX_BOOKINGS - Number(app.call_bookings_made ?? 0)),
      });
    }

    if (action === 'list-available') {
      if (!app || app.status !== BOOKABLE_STATUS) return json({ slots: [] });
      const slots = await freeSlots();
      // The candidate sees when, for how long and with whom; the caller's
      // number arrives with the booking.
      return json({ slots: slots.map((s: any) => ({ id: s.id, slot_date: s.slot_date, start_time: s.start_time, end_time: s.end_time, caller_name: s.caller_name })) });
    }

    if (action === 'book') {
      if (!app || !app.call_invited_at) return json({ error: 'You have not been invited to a phone call.' }, 403);
      audit.subject(`${app.first_name} ${app.surname}`, app.id);
      if (app.status !== BOOKABLE_STATUS) return json({ error: 'Booking is not open for your application.' }, 403);
      const { data: existing } = await supabase.from('call_bookings').select('id').eq('application_id', app.id).maybeSingle();
      if (existing) return json({ error: 'You already have a booked call.' }, 409);
      const made = Number(app.call_bookings_made ?? 0);
      if (made >= MAX_BOOKINGS) {
        return json({ error: 'You have already changed your call once, and a call can only be changed once. Please write to the association if you genuinely cannot make the time you booked.' }, 409);
      }
      const { data: slot } = await supabase.from('call_slots').select('*').eq('id', body.slot_id).maybeSingle();
      if (!slot || !slot.is_active || !isBookableSlot({ ...slot, is_booked: false })) return json({ error: 'This slot is no longer available.' }, 409);
      const { data: row, error } = await supabase.from('call_bookings').insert({
        slot_id: slot.id, application_id: app.id, candidate_user_id: user.id,
        candidate_name: `${app.first_name} ${app.surname}`, candidate_email: app.email, candidate_phone: app.phone,
      }).select('id').maybeSingle();
      if (error) {
        if ((error as any).code === '23505' || (error as any).code === 'P0002') return json({ error: 'This slot has just been taken. Please choose another.' }, 409);
        throw error;
      }
      const bookingId = (row as any)?.id ?? '';
      await supabase.from('applications').update({ status: BOOKED_STATUS, call_bookings_made: made + 1 }).eq('id', app.id);
      await systemNote(supabase, app.id, made === 0
        ? `Phone call booked for ${formatDate(slot.slot_date)} at ${clock(slot.start_time)} with ${slot.caller_name || 'the caller'}.`
        : `Phone call moved to ${formatDate(slot.slot_date)} at ${clock(slot.start_time)} with ${slot.caller_name || 'the caller'}. This was the candidate's one permitted change.`);
      try {
        await supabase.rpc('enqueue_app_email', {
          p_key: 'call_booking_confirmation', p_to: app.email,
          p_vars: {
            first_name: esc(app.first_name),
            call_date: formatDate(slot.slot_date),
            call_time: span(slot.start_time, slot.end_time, slot.slot_date),
            caller_name: esc(slot.caller_name || 'A member of the Board'),
            caller_phone: esc(slot.caller_phone),
            candidate_phone: esc(app.phone),
            calendar_block: bookingId ? emailCallCalendarBlock(SUPABASE_URL, bookingId, 'candidate') : '',
            status_url: STATUS_URL,
          },
        });
      } catch (e) { console.error('call confirmation email failed', e); }
      try {
        await notifyStaff(supabase, 'staff_call_booked', await recipientOf(slot.caller_id || slot.created_by), {
          candidate_name: esc(`${app.first_name} ${app.surname}`),
          candidate_phone: esc(app.phone),
          division_name: intakeLabel(app.evaluation_division || app.interview_division || app.first_choice),
          call_when: `${formatDate(slot.slot_date)}, ${span(slot.start_time, slot.end_time, slot.slot_date)}`,
          calendar_block: bookingId ? emailCallCalendarBlock(SUPABASE_URL, bookingId, 'caller') : '',
        }, `${app.id}:${slot.id}:call-booked`);
      } catch (e) { console.error('caller notice failed', e); }
      return json({ success: true });
    }

    if (action === 'cancel') {
      if (!app) return json({ error: 'No application found' }, 404);
      audit.subject(`${app.first_name} ${app.surname}`, app.id);
      const { data: booking } = await supabase.from('call_bookings').select('id, slot_id').eq('application_id', app.id).maybeSingle();
      if (!booking) return json({ error: 'You have no booked call to cancel.' }, 404);
      if (app.status !== BOOKED_STATUS) return json({ error: 'This call can no longer be changed from here.' }, 409);
      if (Number(app.call_bookings_made ?? 0) >= MAX_BOOKINGS) {
        return json({ error: 'You have already used your one change, so this call can no longer be cancelled from here. Please write to the association if you cannot take it.' }, 409);
      }
      const { data: slot } = await supabase.from('call_slots').select('*').eq('id', booking.slot_id).maybeSingle();
      if (slot && minutesUntil(slot) < CANCEL_BEFORE_MINUTES) {
        return json({ error: 'A call can be moved up to one hour before it starts. Please write to the association if you cannot take it.' }, 409);
      }
      const { error } = await supabase.from('call_bookings').delete().eq('id', booking.id);
      if (error) throw error;
      await supabase.from('applications').update({ status: BOOKABLE_STATUS }).eq('id', app.id).eq('status', BOOKED_STATUS);
      if (slot) {
        await systemNote(supabase, app.id, `Phone call of ${formatDate(slot.slot_date)} at ${clock(slot.start_time)} cancelled by the candidate, to choose another time.`);
        try {
          await notifyStaff(supabase, 'staff_call_released', await recipientOf(slot.caller_id || slot.created_by), {
            candidate_name: esc(`${app.first_name} ${app.surname}`),
            call_when: `${formatDate(slot.slot_date)}, ${span(slot.start_time, slot.end_time, slot.slot_date)}`,
          }, `${app.id}:${slot.id}:call-released`);
        } catch (e) { console.error('caller release notice failed', e); }
      }
      return json({ success: true });
    }

    return json({ error: 'Invalid action' }, 400);
  } catch (error) {
    console.error('recruiting-calls error:', error);
    return json({ error: 'An unexpected error occurred. Please try again.' }, 500);
  }
}));
