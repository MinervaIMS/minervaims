/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

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
const CORE_DIVISIONS = ['equity', 'investment', 'macro', 'portfolio', 'quant'];
// Statuses at which a candidate may hold/see an interview booking.
const BOOKABLE_STATUS = 'interview_invitation_sent';
const BOOKED_STATUS = 'interview_confirmed';

const DIV_LABELS: Record<string, string> = {
  equity: 'Equity Research', investment: 'Investment Research', macro: 'Macro Research',
  portfolio: 'Portfolio Management', quant: 'Quantitative Research',
  media: 'Media & Communication', operations: 'Operations', board: 'Board',
};
const STATUS_URL = 'https://minervaims.org/admin';

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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Add 30 minutes to a "HH:MM" or "HH:MM:SS" time string.
function addMinutes(t: string, mins: number): string {
  const [h, m] = t.split(':').map(Number);
  const total = h * 60 + m + mins;
  const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

Deno.serve(async (req) => {
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
    const roleNames = roles.map((r) => r.role);
    const isAdminEmail = user.email === ADMIN_EMAIL;
    const canAll = isAdminEmail || roleNames.some((r) => FULL_ACCESS.includes(r));

    // Divisions the caller can OPEN slots for, and can VIEW.
    const manageDivisions = roles.filter((r) => r.role === 'head_of_division' && r.division).map((r) => r.division as string);
    const viewDivisions = roles.filter((r) => ['head_of_division', 'team_leader'].includes(r.role) && r.division).map((r) => r.division as string);
    const canManage = (division: string) => canAll || manageDivisions.includes(division);
    const canView = (division: string) => canAll || viewDivisions.includes(division);
    const isStaff = canAll || viewDivisions.length > 0;

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    // Resolve the caller's display name once (used as examiner_name).
    const displayName = async () => {
      const { data: p } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
      return p?.full_name || user.email || 'Examiner';
    };

    // ── the candidate's own application (for candidate actions) ────────────
    const myApplication = async () => {
      const { data } = await supabase
        .from('applications')
        .select('id, user_id, first_name, surname, email, status, interview_division')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as any;
    };

    // =====================================================================
    // STAFF ACTIONS
    // =====================================================================

    // ── list (slots + bookings for a division) ─────────────────────────────
    if (action === 'list') {
      const division = body.division as string;
      if (!isStaff) return json({ error: 'Access denied' }, 403);
      if (!canView(division)) return json({ error: 'Out of scope' }, 403);

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
      return json({ slots: rows, canManage: canManage(division), viewDivisions: canAll ? CORE_DIVISIONS : viewDivisions, manageDivisions: canAll ? CORE_DIVISIONS : manageDivisions });
    }

    // ── create-slot ────────────────────────────────────────────────────────
    if (action === 'create-slot') {
      const { division, slot_date, start_time, end_time, meeting_link } = body;
      if (!canManage(division)) return json({ error: 'You can only open slots for your own division' }, 403);
      if (!division || !slot_date || !start_time || !end_time) return json({ error: 'Missing fields' }, 400);
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

    // ── bulk-create (smart planning: 30-minute slots across a range) ────────
    if (action === 'bulk-create') {
      const { division, slot_date, start_time, end_time, meeting_link } = body;
      if (!canManage(division)) return json({ error: 'You can only open slots for your own division' }, 403);
      if (!division || !slot_date || !start_time || !end_time) return json({ error: 'Missing fields' }, 400);
      const name = await displayName();
      const rows: any[] = [];
      let cur = start_time.slice(0, 5);
      const end = end_time.slice(0, 5);
      let guard = 0;
      while (cur < end && guard < 96) {
        const next = addMinutes(cur, 30);
        if (next > end) break;
        rows.push({
          division, slot_date, start_time: cur, end_time: next,
          meeting_link: meeting_link || null,
          examiner_id: user.id, examiner_name: name, created_by: user.id,
        });
        cur = next; guard++;
      }
      if (!rows.length) return json({ error: 'Time range produces no 30-minute slots' }, 400);
      // Ignore duplicates so re-running a range is safe.
      const { error, count } = await supabase.from('interview_slots').upsert(rows, {
        onConflict: 'division,slot_date,start_time,examiner_id', ignoreDuplicates: true, count: 'exact',
      });
      if (error) throw error;
      return json({ success: true, created: count ?? rows.length });
    }

    // ── update-slot ────────────────────────────────────────────────────────
    if (action === 'update-slot') {
      const { data: slot } = await supabase.from('interview_slots').select('*').eq('id', body.id).maybeSingle();
      if (!slot) return json({ error: 'Not found' }, 404);
      if (!canManage(slot.division)) return json({ error: 'Out of scope' }, 403);
      const updates: Record<string, unknown> = {};
      if (body.meeting_link !== undefined) updates.meeting_link = body.meeting_link || null;
      // Timing edits are only allowed while the slot is free.
      if (!slot.is_booked) {
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
      const division = body.division as string;
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
      const invited = !!app.interview_division && (app.status === BOOKABLE_STATUS || app.status === BOOKED_STATUS || !!booking);
      return json({
        invited,
        division: app.interview_division,
        status: app.status,
        booking: booking ? { ...booking, slot: bookedSlot } : null,
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
        .gte('slot_date', new Date().toISOString().split('T')[0])
        .order('slot_date', { ascending: true })
        .order('start_time', { ascending: true });
      // Candidates never receive PII: only availability + examiner name.
      return json({ slots: (slots || []).filter((s: any) => !s.is_booked) });
    }

    // ── book ─────────────────────────────────────────────────────────────────
    if (action === 'book') {
      const app = await myApplication();
      if (!app || !app.interview_division) return json({ error: 'You have not been invited to an interview yet' }, 403);
      if (app.status !== BOOKABLE_STATUS) return json({ error: 'Booking is not open for your application' }, 403);
      const { data: existing } = await supabase.from('interview_bookings').select('id').eq('application_id', app.id).maybeSingle();
      if (existing) return json({ error: 'You already have a booked interview' }, 409);

      const { data: slot } = await supabase.from('interview_slots').select('*').eq('id', body.slot_id).maybeSingle();
      if (!slot || !slot.is_active) return json({ error: 'Slot not available' }, 404);
      if (slot.division !== app.interview_division) return json({ error: 'This slot is for another division' }, 403);
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
      await supabase.from('applications').update({ status: BOOKED_STATUS }).eq('id', app.id);

      // Automatic email: booking confirmation to the candidate (+ ops copy).
      const bookingVars = {
        first_name: app.first_name,
        division_name: DIV_LABELS[slot.division] || slot.division,
        division_slug: slot.division,
        interview_date: formatSlotDate(slot.slot_date),
        interview_time: `${formatSlotTime(slot.start_time)} - ${formatSlotTime(slot.end_time)}`,
        examiner_name: slot.examiner_name || 'Admin',
        status_url: STATUS_URL,
      };
      try {
        await supabase.rpc('enqueue_app_email', {
          p_key: 'interview_booking_confirmation', p_to: app.email, p_vars: bookingVars,
        });
        await supabase.rpc('enqueue_app_email', {
          p_key: 'interview_booking_confirmation', p_to: 'criccardo480@gmail.com', p_vars: bookingVars,
        });
      } catch (e) { console.error('booking confirmation email enqueue failed', e); }

      return json({ success: true });
    }

    // ── cancel (free the slot, reopen booking) ──────────────────────────────
    if (action === 'cancel') {
      const app = await myApplication();
      if (!app) return json({ error: 'No application found' }, 404);
      const { data: booking } = await supabase.from('interview_bookings').select('id').eq('application_id', app.id).maybeSingle();
      if (!booking) return json({ error: 'No booking to cancel' }, 404);
      const { error } = await supabase.from('interview_bookings').delete().eq('id', booking.id);
      if (error) throw error;
      await supabase.from('applications').update({ status: BOOKABLE_STATUS }).eq('id', app.id).eq('status', BOOKED_STATUS);
      return json({ success: true });
    }

    return json({ error: 'Invalid action' }, 400);
  } catch (error) {
    console.error('admin-interviews error:', error);
    return json({ error: 'An unexpected error occurred. Please try again.' }, 500);
  }
});
