/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { isBookableSlot, isFutureSlot, nowInAssociationTime } from '../_shared/interview-slots.ts';
import { audited } from '../_shared/activity.ts';
import { notifyStaff, slotOpener } from '../_shared/staff-notify.ts';
import { RECRUITING_DIVISIONS, headedIntakes, intakeLabel, intakeOf, divisionReading } from '../_shared/recruiting.ts';
import { readJsonObject, UNREADABLE_BODY, isIsoDate, isClockTime, type LooseBody } from '../_shared/request-body.ts';
import { meetingLinkError } from '../_shared/meeting-link.ts';


// =====================================================================
// admin-interviews — backend for the Interview Calendar.
// ---------------------------------------------------------------------
// Staff actions (service role, division-scoped):
//   list · create-slot · bulk-create · update-slot · delete-slot · clear-division
//   - Heads of Division (and full-access roles) MANAGE their division's slots.
//   - Team Leaders may VIEW (list) their division but not open/edit slots.
//
// Candidate actions (the invited applicant only):
//   my-context · list-available · book · cancel
//   - Booking is allowed only while the candidacy is at
//     'interview_invitation_sent', and only for the division they were
//     invited to (applications.interview_division). Booking auto-advances
//     the candidacy to 'interview_confirmed'; cancelling reverts it.
// =====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const FULL_ACCESS = ['admin', 'president', 'vice_president', 'head_of_asset_management'];
const ADMIN_EMAIL = 'as.minerva@unibocconi.it';
// The five research divisions and the joint Media & Communication and
// Operations intake. It used to be the five alone, which is why the joint
// intake could never be given a slot, and therefore could never be
// invited: the invitation refuses a division with nothing to book. See
// _shared/recruiting.ts.
const INTERVIEW_DIVISIONS = RECRUITING_DIVISIONS;
// Statuses at which a candidate may hold/see an interview booking.
const BOOKABLE_STATUS = 'interview_invitation_sent';
const BOOKED_STATUS = 'interview_confirmed';

/**
 * How many times one candidate may take a slot: the first booking, plus
 * one change. A third is refused.
 *
 * Enforced HERE and not in the browser, because the browser is where the
 * candidate is. The Interview page hides the Cancel button once the
 * change is spent, which is a courtesy; this is the rule.
 */
const MAX_BOOKINGS = 2;

/**
 * A line the workspace writes into a candidate's notes itself.
 *
 * `author_id` is null and the kind is `system`, so the reviewer's notes
 * can draw it as a fact rather than as somebody's opinion. Failure is
 * swallowed on purpose: a booking that went through must not be reported
 * as failed because the note beside it could not be written.
 */
async function systemNote(supabase: any, applicationId: string, body: string): Promise<void> {
  try {
    await supabase.from('application_notes').insert({
      application_id: applicationId,
      author_id: null,
      author_name: 'Minerva Workspace',
      body,
      kind: 'system',
    });
  } catch (e) {
    console.error('system note failed', e);
  }
}

/** The name of the intake a slot or a candidacy belongs to. */
const DIV_LABEL = (division: string) => intakeLabel(division) || division;
const STATUS_URL = 'https://minervaims.org/workspace';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function formatSlotDate(iso: string): string {
  // slot_date is a plain YYYY-MM-DD string; format without TZ shifts.
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return `${WEEKDAYS[dt.getUTCDay()]}, ${d} ${MONTHS[m - 1]} ${y}`;
}
function formatSlotTime(t: string): string {
  return (t || '').slice(0, 5); // "HH:MM:SS" -> "HH:MM"
}
// "10:00 - 10:15 (15 minutes)": the times and, from them, the length, so an
// email is right for a fifteen-minute slot as much as for a half hour.
function formatSlotSpan(start: string, end: string, sep = ' - '): string {
  const mins = slotLength(start, end);
  const span = `${formatSlotTime(start)}${sep}${formatSlotTime(end)}`;
  return mins > 0 ? `${span} (${mins} minutes)` : span;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// =====================================================================
// SLOT LENGTH. Smart planning cuts a range into slots of 30 minutes (the
// default, and what it always did) or 15. Nothing else reads a slot's
// length: every email and every page shows a slot's own start and end,
// and the booking confirmation states the length from those two times.
// Mirrored by SLOT_MINUTES in src/lib/interviews-api.ts.
// =====================================================================
const SLOT_MINUTES = [30, 15];
const DEFAULT_SLOT_MINUTES = 30;

// The length of a slot in minutes, from its own times.
function slotLength(start: string, end: string): number {
  const toMin = (t: string) => { const [h, m] = String(t).split(':').map(Number); return h * 60 + m; };
  return toMin(end) - toMin(start);
}

// Add minutes to a "HH:MM" or "HH:MM:SS" time string.
function addMinutes(t: string, mins: number): string {
  const [h, m] = t.split(':').map(Number);
  const total = h * 60 + m + mins;
  const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

Deno.serve(audited('admin-interviews', async (req, audit) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.split(' ')[1]);
    if (authError || !user) return json({ error: 'Invalid token' }, 401);

    const { data: roleRows } = await supabase.from('user_roles').select('role, division').eq('user_id', user.id);
    const roles = (roleRows || []) as Array<{ role: string; division: string | null }>;
    audit.actor(user, roles.map((r) => r.role));
    const roleNames = roles.map((r) => r.role);
    const isAdminEmail = user.email === ADMIN_EMAIL;
    const canAll = isAdminEmail || roleNames.some((r) => FULL_ACCESS.includes(r));

    // =====================================================================
    // Divisions the caller can OPEN slots for, and can VIEW.
    // ---------------------------------------------------------------------
    // A Head of Division runs their division's calendar. The Head of Media
    // & Communication and the Head of Operations both run the joint intake's
    // - they used to run none, because only `head_of_division` was read
    // here. Team Leaders, and the Portfolio Manager who is Portfolio
    // Management's team leader, READ their division's calendar, which is
    // what the workspace matrix has always granted them; the Portfolio
    // Manager was missing here and was refused a page the menu offered.
    // =====================================================================
    const manageDivisions = headedIntakes(roles);
    const viewDivisions = [...new Set([
      ...manageDivisions,
      ...roles
        .filter((r) => (r.role === 'team_leader' || r.role === 'portfolio_manager') && r.division && INTERVIEW_DIVISIONS.includes(r.division))
        .map((r) => r.division as string),
    ])];
    const canManage = (division: string) => canAll || manageDivisions.includes(division);
    const canView = (division: string) => canAll || viewDivisions.includes(division);
    const isStaff = canAll || viewDivisions.length > 0;

    // A body that is not a JSON object is refused as such, rather than
    // failing further down on the first property read from it.
    const parsedBody = await readJsonObject(req);
    if (!parsedBody) return json({ error: UNREADABLE_BODY }, 400);
    const body = parsedBody as LooseBody;
    const action = typeof body.action === 'string' ? body.action : '';
    audit.request(action, body);

    // =====================================================================
    // WHAT A SLOT MUST LOOK LIKE BEFORE IT REACHES THE DATABASE.
    // ---------------------------------------------------------------------
    // A division that is not a recruiting division, a date that is not a
    // date or a time that is not a time used to be handed to the insert as
    // they came, and the database's refusal was rethrown as an HTTP 500 -
    // "an unexpected error occurred", about a form field. Each is answered
    // here in words, and a slot must also end after it starts.
    // =====================================================================
    const divisionIn = (v: unknown): string | null => {
      const d = intakeOf(typeof v === 'string' ? v : null);
      return d && INTERVIEW_DIVISIONS.includes(d) ? d : null;
    };
    const slotTimesError = (slot_date: unknown, start_time: unknown, end_time: unknown): string | null => {
      if (!isIsoDate(slot_date)) return 'Choose a valid date for the slot.';
      if (!isClockTime(start_time) || !isClockTime(end_time)) return 'Choose a valid start and end time (HH:MM).';
      if ((end_time as string).slice(0, 5) <= (start_time as string).slice(0, 5)) return 'A slot must end after it starts.';
      return null;
    };

    // Resolve the caller's display name once (used as examiner_name).
    const displayName = async () => {
      const { data: p } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
      return p?.full_name || user.email || 'Examiner';
    };

    // ── the candidate's own application (for candidate actions) ────────────
    const myApplication = async () => {
      const { data } = await supabase
        .from('applications')
        .select('id, user_id, first_name, surname, email, status, interview_division, interview_bookings_made')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      // `interview_bookings_made` is what the one-change rule counts. It
      // was not selected, so it read as undefined, the count was always 0,
      // and the rule never refused anybody: every candidate could move
      // their interview as often as they liked, and every move was noted
      // as a first booking. It is selected now.
      //
      // A row still carrying `operations` from before the intake was
      // unified is read as the joint intake, so it finds that calendar.
      if (data) (data as any).interview_division = intakeOf((data as any).interview_division) || null;
      return data as any;
    };

    // =====================================================================
    // STAFF ACTIONS
    // =====================================================================

    // ── list (slots + bookings for a division) ─────────────────────────────
    if (action === 'list') {
      const division = divisionIn(body.division);
      if (!isStaff) return json({ error: 'Access denied' }, 403);
      if (!division) return json({ error: 'Choose a division.' }, 400);
      if (!canView(division)) return json({ error: 'Out of scope' }, 403);

      // =====================================================================
      // A SLOT NOBODY BOOKED AND NOBODY CAN STILL BOOK IS RUBBISH.
      // ---------------------------------------------------------------------
      // Slots are opened in bulk, a morning at a time, and most of them are
      // never taken. Nothing removed them, so a division's calendar became a
      // list of every half hour it had ever offered, in ascending order, with
      // last semester at the top and this afternoon's interview somewhere
      // below the fold. They are swept here, when the calendar is read.
      //
      // ONLY THE EMPTY ONES. A past slot that WAS booked is the only record
      // the association keeps of who was interviewed and when: the booking
      // row is `ON DELETE CASCADE` against the slot, so deleting it would
      // erase the interview itself, and the existing delete path would also
      // hand the candidate back to "book an interview" - after they had
      // already been seen. Those are kept and shown under "Interviews
      // already held".
      //
      // The clock is the association's, not the server's: `slot_date` and
      // `start_time` were typed in Rome and are compared in Rome, which is
      // the same rule the booking list and the invitation gate use.
      //
      // Only a reader who may MANAGE the division sweeps it. A team leader
      // reading the calendar should not be causing deletions, and the head
      // opening the same page a moment later does the same work.
      if (canManage(division)) {
        try {
          const now = nowInAssociationTime();
          const { data: stale } = await supabase
            .from('interview_slots')
            .select('id, slot_date, start_time')
            .eq('division', division)
            .eq('is_booked', false)
            .lte('slot_date', now.date);
          // `lte` catches today too, so the time of day decides that day's
          // slots; a PostgREST filter cannot express "earlier today or any
          // day before" in one comparison.
          const expired = (stale || []).filter((s: any) => !isFutureSlot(s, now)).map((s: any) => s.id);
          if (expired.length) {
            await supabase.from('interview_slots').delete().in('id', expired);
          }
        } catch (e) { console.error('sweeping past slots failed', e); }
      }

      const { data: slots, error } = await supabase
        .from('interview_slots')
        .select('*')
        .eq('division', division)
        .order('slot_date', { ascending: true })
        .order('start_time', { ascending: true });
      if (error) throw error;

      const ids = (slots || []).map((s: any) => s.id);
      const bookingBySlot: Record<string, any> = {};
      if (ids.length) {
        const { data: bookings } = await supabase
          .from('interview_bookings')
          .select('slot_id, candidate_name, candidate_email, application_id')
          .in('slot_id', ids);
        for (const b of bookings || []) bookingBySlot[b.slot_id] = b;
      }
      const rows = (slots || []).map((s: any) => ({ ...s, booking: bookingBySlot[s.id] || null }));
      return json({ slots: rows, canManage: canManage(division), viewDivisions: canAll ? INTERVIEW_DIVISIONS : viewDivisions, manageDivisions: canAll ? INTERVIEW_DIVISIONS : manageDivisions });
    }

    // ── create-slot ────────────────────────────────────────────────────────
    if (action === 'create-slot') {
      const division = divisionIn(body.division);
      const { slot_date, start_time, end_time } = body;
      const meeting_link = typeof body.meeting_link === 'string' ? body.meeting_link.trim() : '';
      if (!division) return json({ error: 'Choose a division.' }, 400);
      if (!canManage(division)) return json({ error: 'You can only open slots for your own division' }, 403);
      const timesError = slotTimesError(slot_date, start_time, end_time);
      if (timesError) return json({ error: timesError }, 400);
      // A slot is opened with the meeting it is held in. See _shared/meeting-link.ts.
      const linkError = meetingLinkError(meeting_link);
      if (linkError) return json({ error: linkError }, 400);
      const name = await displayName();
      const { error } = await supabase.from('interview_slots').insert({
        division, slot_date, start_time, end_time,
        meeting_link: meeting_link || null,
        examiner_id: user.id, examiner_name: name, created_by: user.id,
      });
      if (error) {
        if ((error as any).code === '23505') return json({ error: 'You already have a slot at that time' }, 409);
        throw error;
      }
      return json({ success: true });
    }

    // ── bulk-create (smart planning: 30- or 15-minute slots across a range) ──
    if (action === 'bulk-create') {
      const division = divisionIn(body.division);
      const { slot_date, start_time, end_time } = body;
      const meeting_link = typeof body.meeting_link === 'string' ? body.meeting_link.trim() : '';
      if (!division) return json({ error: 'Choose a division.' }, 400);
      if (!canManage(division)) return json({ error: 'You can only open slots for your own division' }, 403);
      const timesError = slotTimesError(slot_date, start_time, end_time);
      if (timesError) return json({ error: timesError }, 400);
      // A slot is opened with the meeting it is held in. See _shared/meeting-link.ts.
      const linkError = meetingLinkError(meeting_link);
      if (linkError) return json({ error: linkError }, 400);
      // Thirty minutes unless fifteen is asked for; anything else is refused
      // rather than quietly turned into thirty.
      const slotMinutes = body.slot_minutes === undefined || body.slot_minutes === null
        ? DEFAULT_SLOT_MINUTES : Number(body.slot_minutes);
      if (!SLOT_MINUTES.includes(slotMinutes)) {
        return json({ error: 'Slots can be 30 or 15 minutes long.' }, 400);
      }
      const name = await displayName();
      const rows: any[] = [];
      let cur = start_time.slice(0, 5);
      const end = end_time.slice(0, 5);
      let guard = 0;
      while (cur < end && guard < 96) {
        const next = addMinutes(cur, slotMinutes);
        if (next > end || next <= cur) break;
        rows.push({
          division, slot_date, start_time: cur, end_time: next,
          meeting_link: meeting_link || null,
          examiner_id: user.id, examiner_name: name, created_by: user.id,
        });
        cur = next; guard++;
      }
      if (!rows.length) return json({ error: `Time range produces no ${slotMinutes}-minute slots` }, 400);
      // NO OVERLAPS IN ONE CALENDAR. Re-running the same range was always
      // safe (identical start times are ignored below). With two lengths it
      // no longer would be: fifteen-minute slots over a morning already cut
      // into half hours would start at :15 and :45 and sit inside them. So a
      // slot that overlaps one this interviewer already has in this
      // division's calendar is left out, and the reply says how many.
      const { data: mine } = await supabase.from('interview_slots')
        .select('start_time, end_time')
        .eq('division', division).eq('slot_date', slot_date).eq('examiner_id', user.id);
      const taken = (mine || []).map((s: { start_time: string; end_time: string }) => [String(s.start_time).slice(0, 5), String(s.end_time).slice(0, 5)]);
      const fresh = rows.filter((r) => !taken.some(([s, e]) => r.start_time < e && r.end_time > s));
      const skipped = rows.length - fresh.length;
      if (!fresh.length) return json({ success: true, created: 0, skipped_overlapping: skipped });
      // Ignore duplicates so re-running a range is safe.
      const { error, count } = await supabase.from('interview_slots').upsert(fresh, {
        onConflict: 'division,slot_date,start_time,examiner_id', ignoreDuplicates: true, count: 'exact',
      });
      if (error) throw error;
      return json({ success: true, created: count ?? fresh.length, skipped_overlapping: skipped });
    }

    // ── update-slot ────────────────────────────────────────────────────────
    if (action === 'update-slot') {
      const { data: slot } = await supabase.from('interview_slots').select('*').eq('id', body.id).maybeSingle();
      if (!slot) return json({ error: 'Not found' }, 404);
      if (!canManage(slot.division)) return json({ error: 'Out of scope' }, 403);
      const updates: Record<string, unknown> = {};
      // A link can be replaced, never removed: the candidate who booked, or
      // who will, is sent to it. Slots opened before the link was required
      // keep whatever they have until somebody edits them.
      if (body.meeting_link !== undefined) {
        const linkError = meetingLinkError(body.meeting_link);
        if (linkError) return json({ error: linkError }, 400);
        updates.meeting_link = String(body.meeting_link).trim();
      }
      // Timing edits are only allowed while the slot is free.
      if (!slot.is_booked) {
        if (body.slot_date || body.start_time || body.end_time) {
          const timesError = slotTimesError(
            body.slot_date || slot.slot_date, body.start_time || slot.start_time, body.end_time || slot.end_time,
          );
          if (timesError) return json({ error: timesError }, 400);
        }
        if (body.slot_date) updates.slot_date = body.slot_date;
        if (body.start_time) updates.start_time = body.start_time;
        if (body.end_time) updates.end_time = body.end_time;
      } else if (body.slot_date || body.start_time || body.end_time) {
        return json({ error: 'This slot is already booked — cancel the booking before changing its time' }, 409);
      }
      const { error } = await supabase.from('interview_slots').update(updates).eq('id', body.id);
      if (error) throw error;
      return json({ success: true });
    }

    // ── delete-slot (frees the candidate if it was booked) ──────────────────
    if (action === 'delete-slot') {
      const { data: slot } = await supabase.from('interview_slots').select('id, division').eq('id', body.id).maybeSingle();
      if (!slot) return json({ error: 'Not found' }, 404);
      if (!canManage(slot.division)) return json({ error: 'Out of scope' }, 403);
      const { data: booking } = await supabase.from('interview_bookings').select('application_id').eq('slot_id', slot.id).maybeSingle();
      const { error } = await supabase.from('interview_slots').delete().eq('id', slot.id);
      if (error) throw error;
      // Deleting a booked slot cancels that interview; let the candidate rebook.
      if (booking?.application_id) {
        await supabase.from('applications').update({ status: BOOKABLE_STATUS }).eq('id', booking.application_id).eq('status', BOOKED_STATUS);
      }
      return json({ success: true });
    }

    // ── clear-division (remove every slot for a division) ───────────────────
    if (action === 'clear-division') {
      const division = divisionIn(body.division);
      if (!division) return json({ error: 'Choose a division.' }, 400);
      if (!canManage(division)) return json({ error: 'Out of scope' }, 403);
      const { data: booked } = await supabase.from('interview_bookings').select('application_id').eq('division', division);
      const { error } = await supabase.from('interview_slots').delete().eq('division', division);
      if (error) throw error;
      const appIds = (booked || []).map((b: any) => b.application_id).filter(Boolean);
      if (appIds.length) {
        await supabase.from('applications').update({ status: BOOKABLE_STATUS }).in('id', appIds).eq('status', BOOKED_STATUS);
      }
      return json({ success: true });
    }

    // =====================================================================
    // CANDIDATE ACTIONS
    // =====================================================================

    // ── my-context ──────────────────────────────────────────────────────────
    if (action === 'my-context') {
      const app = await myApplication();
      if (!app) return json({ invited: false });
      const { data: booking } = await supabase
        .from('interview_bookings')
        .select('id, slot_id, division')
        .eq('application_id', app.id)
        .maybeSingle();
      let bookedSlot = null;
      if (booking) {
        const { data: s } = await supabase.from('interview_slots').select('*').eq('id', booking.slot_id).maybeSingle();
        bookedSlot = s;
      }
      // A candidate who withdrew is no longer invited to anything, but
      // "not invited" is not what happened to them and is not what their
      // page should say. The fact travels so the page can tell them the
      // truth instead of the default.
      const withdrawn = app.status === 'withdrawn';
      const invited = !withdrawn && !!app.interview_division
        && (app.status === BOOKABLE_STATUS || app.status === BOOKED_STATUS || !!booking);
      return json({
        invited,
        withdrawn,
        division: app.interview_division,
        status: app.status,
        booking: booking ? { ...booking, slot: bookedSlot } : null,
        // How many slots they have taken, and whether the one change is
        // spent. The page uses it to say so plainly instead of offering a
        // Cancel button that the server would refuse.
        bookingsMade: Number(app.interview_bookings_made ?? 0),
        changesLeft: Math.max(0, MAX_BOOKINGS - Number(app.interview_bookings_made ?? 0)),
      });
    }

    // ── list-available (open slots in the candidate's invited division) ─────
    if (action === 'list-available') {
      const app = await myApplication();
      if (!app || !app.interview_division) return json({ slots: [] });
      const { data: slots } = await supabase
        .from('interview_slots')
        .select('id, division, slot_date, start_time, end_time, examiner_name, meeting_link, is_booked')
        .eq('division', app.interview_division)
        .eq('is_active', true)
        .gte('slot_date', nowInAssociationTime().date)
        .order('slot_date', { ascending: true })
        .order('start_time', { ascending: true });
      // Candidates never receive PII: only availability + examiner name.
      //
      // THE TIME OF DAY COUNTS, not only the date. `gte('slot_date', today)`
      // keeps every slot from midnight onwards, so a 09:00 slot was still
      // being offered at four in the afternoon. The same rule that decides
      // whether a division may invite anybody at all now decides what a
      // candidate is shown, so the two can never disagree: see
      // _shared/interview-slots.ts.
      const now = nowInAssociationTime();
      return json({ slots: (slots || []).filter((s: any) => isBookableSlot(s, now)) });
    }

    // ── book ─────────────────────────────────────────────────────────────────
    if (action === 'book') {
      const app = await myApplication();
      if (!app || !app.interview_division) return json({ error: 'You have not been invited to an interview yet' }, 403);
      if (app.status !== BOOKABLE_STATUS) return json({ error: 'Booking is not open for your application' }, 403);
      const { data: existing } = await supabase.from('interview_bookings').select('id').eq('application_id', app.id).maybeSingle();
      if (existing) return json({ error: 'You already have a booked interview' }, 409);

      // =====================================================================
      // ONE CHANGE, AND THEN THE TIME IS THE TIME.
      // ---------------------------------------------------------------------
      // Slots are shared: every move takes a time back from the division
      // that opened it and hands it to whoever asks next, and a candidate
      // rearranging a fourth time is rearranging everybody else's day.
      // A first booking and one change is enough for a genuine clash and
      // few enough to plan around.
      //
      // COUNTED ON THE APPLICATION, not on the booking, because cancelling
      // deletes the booking: a count kept there would be reset by the very
      // act it exists to measure.
      // =====================================================================
      const booked = Number(app.interview_bookings_made ?? 0);
      if (booked >= MAX_BOOKINGS) {
        return json({
          error: 'You have already changed your interview slot once, and a slot can only be changed once. Please write to the association if you genuinely cannot make the time you booked.',
        }, 409);
      }

      const { data: slot } = await supabase.from('interview_slots').select('*').eq('id', body.slot_id).maybeSingle();
      if (!slot || !slot.is_active) return json({ error: 'Slot not available' }, 404);
      if (intakeOf(slot.division) !== intakeOf(app.interview_division)) return json({ error: 'This slot is for another division' }, 403);
      if (slot.is_booked) return json({ error: 'Slot no longer available' }, 409);

      const { error } = await supabase.from('interview_bookings').insert({
        slot_id: slot.id, application_id: app.id, candidate_user_id: user.id,
        candidate_name: `${app.first_name} ${app.surname}`, candidate_email: app.email,
        division: app.interview_division,
      });
      if (error) {
        if ((error as any).code === '23505') return json({ error: 'Slot no longer available' }, 409);
        throw error;
      }
      // The booking stands: count it, and say so in the candidate's own
      // notes. `booked` was read above, so this writes a known value
      // rather than reading and adding in two steps.
      await supabase.from('applications')
        .update({ status: BOOKED_STATUS, interview_bookings_made: booked + 1 })
        .eq('id', app.id);

      // THE REVIEWERS LEARN OF IT WHERE THEY ALREADY LOOK. A booking used
      // to be visible only on the interview calendar, so somebody reading
      // a candidacy could not see that the interview had been arranged, or
      // that it had been moved. It is written into the notes, marked as the
      // workspace's own line rather than a reviewer's opinion.
      await systemNote(
        supabase, app.id,
        booked === 0
          ? `Interview scheduled for ${formatSlotDate(slot.slot_date)} at ${formatSlotTime(slot.start_time)} (${DIV_LABEL(slot.division)}, ${slot.examiner_name || 'examiner to be confirmed'}).`
          : `Interview booking changed to ${formatSlotDate(slot.slot_date)} at ${formatSlotTime(slot.start_time)} (${DIV_LABEL(slot.division)}, ${slot.examiner_name || 'examiner to be confirmed'}). This was the candidate's one permitted change.`,
      );

      // Automatic email: booking confirmation to the candidate.
      try {
        await supabase.rpc('enqueue_app_email', {
          p_key: 'interview_booking_confirmation',
          p_to: app.email,
          p_vars: {
            first_name: app.first_name,
            division_name: DIV_LABEL(slot.division),
            division_slug: slot.division,
            division_reading: divisionReading(slot.division),
            interview_date: formatSlotDate(slot.slot_date),
            interview_time: formatSlotSpan(slot.start_time, slot.end_time),
            examiner_name: slot.examiner_name || 'Admin',
            status_url: STATUS_URL,
            meeting_link: String(slot.meeting_link || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
          },
        });
      } catch (e) { console.error('booking confirmation email enqueue failed', e); }

      // Automatic email: the member who OPENED this slot is told it is taken.
      // Only that person, even where the division has several heads.
      try {
        await notifyStaff(supabase, 'staff_interview_booked', await slotOpener(supabase, slot), {
          candidate_name: `${app.first_name} ${app.surname}`,
          division_name: DIV_LABEL(slot.division),
          interview_when: `${formatSlotDate(slot.slot_date)}, ${formatSlotSpan(slot.start_time, slot.end_time, '–')}`,
        }, `${app.id}:${slot.id}:booked`);
      } catch (e) { console.error('staff booking notice failed', e); }

      return json({ success: true });
    }

    // ── cancel (free the slot, reopen booking) ──────────────────────────────
    if (action === 'cancel') {
      const app = await myApplication();
      if (!app) return json({ error: 'No application found' }, 404);
      const { data: booking } = await supabase.from('interview_bookings').select('id, slot_id').eq('application_id', app.id).maybeSingle();
      if (!booking) return json({ error: 'No booking to cancel' }, 404);
      // CANCELLING WHEN THERE IS NO CHANGE LEFT WOULD STRAND THEM. The
      // booking would go and `book` would then refuse to give them another,
      // leaving a candidate invited to an interview they can no longer
      // arrange. Refused here instead, while they still hold the slot.
      if (Number(app.interview_bookings_made ?? 0) >= MAX_BOOKINGS) {
        return json({
          error: 'You have already used your one change of slot, so this booking can no longer be cancelled from here. Please write to the association if you cannot attend.',
        }, 409);
      }
      // Read the slot BEFORE the booking goes, so the notice can name the
      // time that has just been given back and the person who opened it.
      const { data: freedSlot } = await supabase.from('interview_slots')
        .select('id, division, slot_date, start_time, end_time, created_by, examiner_id')
        .eq('id', booking.slot_id).maybeSingle();
      const { error } = await supabase.from('interview_bookings').delete().eq('id', booking.id);
      if (error) throw error;
      await supabase.from('applications').update({ status: BOOKABLE_STATUS }).eq('id', app.id).eq('status', BOOKED_STATUS);

      if (freedSlot) {
        try {
          await notifyStaff(supabase, 'staff_interview_released', await slotOpener(supabase, freedSlot), {
            candidate_name: `${app.first_name} ${app.surname}`,
            division_name: DIV_LABEL(freedSlot.division),
            interview_when: `${formatSlotDate(freedSlot.slot_date)}, ${formatSlotSpan(freedSlot.start_time, freedSlot.end_time, '–')}`,
          }, `${app.id}:${freedSlot.id}:released`);
        } catch (e) { console.error('staff release notice failed', e); }
      }
      return json({ success: true });
    }


    return json({ error: 'Invalid action' }, 400);
  } catch (error) {
    console.error('admin-interviews error:', error);
    return json({ error: 'An unexpected error occurred. Please try again.' }, 500);
  }
}));
