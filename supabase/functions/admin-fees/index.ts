/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

// =====================================================================
// admin-fees — per-semester membership fee collection (report 12.1).
// The Head of Operations collects; the Vice President verifies. Closing a
// period locks it and writes a positive Treasury entry automatically.
// =====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
// Membership Fees is closed to the two research Heads. Removing the
// subsection from their navigation is not enough on its own: the endpoint is
// the thing that actually holds the data, so the Head of Asset Management
// comes off this list as well. The Head of Division was never on it.
// Fees remain open to the Board and to Operations, who administer them.
const MANAGE = ['admin', 'president', 'vice_president', 'head_of_operations'];

// =====================================================================
// WHO IS OUTSIDE THE MEMBERSHIP FEE.
// ---------------------------------------------------------------------
// Mirrors src/lib/membership-fee.ts, which the workspace reads. An edge
// function cannot import from `src/`, so the list is repeated here; it is
// two values and it changes about never, and the alternative is a round
// trip on every fee operation to learn something this file already knows.
//
// An advisor is an alumnus appointed to advise the association, not a
// dues-paying member of it. The consequence is applied at all four
// moments a fee row or a register row could come into being:
//
//   · a collection OPENS   - no row is created for them;
//   · a collection is READ - any row that exists anyway is dropped, so
//                            the count on screen is the count of people
//                            actually in the list;
//   · a member LEAVES to become an advisor - their unpaid row is removed
//                            (in admin-members, on the same list);
//   · a collection CLOSES  - they enter no semester register.
//
// The roles that never pay. Candidates, pending accounts, the admin
// account and alumni are excluded separately: they are not members of the
// association this semester at all, which is a different reason.
// =====================================================================
const FEE_EXEMPT_ROLES = ['advisor', 'silent_advisor'];
/** Roles that are not part of this semester's paying membership. */
const NON_PAYING_ROLES = ['candidate', 'pending', 'admin', 'alumni', ...FEE_EXEMPT_ROLES];

function academicSemester(d: Date): string {
  const m = d.getMonth() + 1; const y = d.getFullYear();
  return m >= 9 || m === 1 ? `Sep-Jan ${m === 1 ? y - 1 : y}` : `Feb-Aug ${y}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.split(' ')[1]);
    if (authError || !user) return json({ error: 'Invalid token' }, 401);
    const { data: roleRows } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
    const roles = (roleRows || []).map((r: any) => r.role);
    const canManage = user.email === 'as.minerva@unibocconi.it' || roles.some((r: string) => MANAGE.includes(r));
    if (!canManage) return json({ error: 'Access denied' }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    const activeMembers = async () =>
      (await supabase.from('members').select('id, first_name, surname, division, role, phone, email')
        .eq('membership_status', 'active')
        .not('role', 'in', `(${NON_PAYING_ROLES.join(',')})`)).data || [];

    if (action === 'current') {
      const { data: period } = await supabase.from('fee_periods').select('*').eq('closed', false).order('created_at', { ascending: false }).limit(1).maybeSingle();
      const members = await activeMembers();
      let fees: any[] = [];
      let banked_off_register = 0;
      if (period) {
        const all = (await supabase.from('membership_fees').select('*').eq('period_id', period.id)).data || [];
        // THE LIST AND ITS COUNT MUST BE THE SAME PEOPLE. A member who was
        // in the collection and has since left - to alumni, or to an
        // advisor appointment - keeps their row, but is no longer in
        // `members`. Returning that row anyway made "12/40 paid" count a
        // thirteenth person the table did not show, and nothing on screen
        // explained the difference. Rows are now narrowed to the visible
        // list, and any payment left outside it is reported separately
        // rather than silently folded into the total or silently dropped:
        // the money was received and Treasury will still record it.
        const visible = new Set(members.map((m: any) => m.id));
        fees = all.filter((f: any) => visible.has(f.member_id));
        banked_off_register = all.filter((f: any) => f.paid && !visible.has(f.member_id)).length;
      }
      return json({ period, members, fees, banked_off_register });
    }

    if (action === 'history') {
      const { data } = await supabase.from('fee_periods').select('*').eq('closed', true).order('closed_at', { ascending: false });
      return json({ periods: data || [] });
    }

    if (action === 'open') {
      const label = (body.semester_label as string)?.trim();
      if (!label) return json({ error: 'A semester label is required' }, 400);
      const amount = Number(body.fee_amount) || 10;
      if (amount < 10) return json({ error: 'The minimum fee is €10 per semester.' }, 400);
      const firstDeadline = (body.first_deadline as string)?.trim() || null;
      const secondDeadline = (body.second_deadline as string)?.trim() || null;
      if (!firstDeadline) return json({ error: 'A first deadline is required.' }, 400);
      if (secondDeadline && secondDeadline <= firstDeadline) {
        return json({ error: 'The second deadline must be after the first.' }, 400);
      }
      const { data: period, error } = await supabase.from('fee_periods')
        .insert({ semester_label: label, fee_amount: amount, first_deadline: firstDeadline, second_deadline: secondDeadline, created_by: user.id }).select().single();
      if (error) {
        if ((error as any).code === '23505') return json({ error: 'A period with this label already exists.' }, 409);
        throw error;
      }
      const members = await activeMembers();
      if (members.length) {
        await supabase.from('membership_fees').insert(members.map((m: any) => ({ period_id: period.id, member_id: m.id, paid: false })));
      }
      // Defensive, and idempotent: a fresh period cannot already hold an
      // exempt member's row, but re-running this against a period that
      // somehow does costs one statement and removes the possibility.
      const { data: exempt } = await supabase.from('members').select('id').in('role', FEE_EXEMPT_ROLES);
      const exemptIds = (exempt || []).map((m: any) => m.id);
      if (exemptIds.length) {
        await supabase.from('membership_fees').delete()
          .eq('period_id', period.id).eq('paid', false).in('member_id', exemptIds);
      }
      return json({ success: true, period });
    }

    if (action === 'set-paid') {
      const { data: period } = await supabase.from('fee_periods').select('*').eq('id', body.period_id).maybeSingle();
      if (!period) return json({ error: 'Period not found' }, 404);
      if (period.closed) return json({ error: 'This collection is closed and can no longer be edited.' }, 403);
      const paid = !!body.paid;
      const { error } = await supabase.from('membership_fees')
        .update({ paid, amount: paid ? period.fee_amount : null, collected_by: paid ? user.id : null, collected_at: paid ? new Date().toISOString() : null })
        .eq('period_id', body.period_id).eq('member_id', body.member_id);
      if (error) throw error;
      return json({ success: true });
    }

    if (action === 'close') {
      const { data: period } = await supabase.from('fee_periods').select('*').eq('id', body.period_id).maybeSingle();
      if (!period) return json({ error: 'Period not found' }, 404);
      if (period.closed) return json({ error: 'Already closed.' }, 409);
      const { data: paidRows } = await supabase.from('membership_fees').select('amount').eq('period_id', period.id).eq('paid', true);
      const total = (paidRows || []).reduce((s: number, r: any) => s + Number(r.amount || period.fee_amount), 0);

      const now = new Date();
      const { data: entry, error: entryErr } = await supabase.from('treasury_entries').insert({
        amount: total, flow: 'in',
        description: `Membership fees — ${period.semester_label}`,
        source: 'membership_fees', execution_date: now.toISOString().slice(0, 10),
        academic_semester: academicSemester(now), is_auto: true, locked: true, created_by: user.id,
      }).select('id').single();
      if (entryErr) throw entryErr;

      const { error } = await supabase.from('fee_periods')
        .update({ closed: true, closed_at: now.toISOString(), treasury_entry_id: entry.id }).eq('id', period.id);
      if (error) throw error;

      // Semester member register: closing the collection is the moment the
      // member list becomes definitive, so snapshot who belongs to the
      // association this semester (fee payers + fee-exempt active members).
      try {
        const m = now.getMonth() + 1; const y = now.getFullYear();
        const fallYear = m === 1 ? y - 1 : y;
        const isFall = m >= 9 || m === 1;
        const semKey = isFall ? `${fallYear}-fall` : `${y}-spring`;
        const semLabel = isFall ? `Fall ${fallYear}` : `Spring ${y}`;
        const { data: fees } = await supabase.from('membership_fees').select('member_id, paid').eq('period_id', period.id);
        const paidIds = new Set((fees || []).filter((f: any) => f.paid).map((f: any) => f.member_id));
        const { data: allMembers } = await supabase.from('members')
          .select('id, first_name, surname, email, division, role, fee_status, membership_status');
        // Advisors are appointed alumni, not dues-paying members: they never
        // enter the register, even in the case where a payment of theirs was
        // banked before the appointment. The register answers "who belonged
        // to the association this semester", and an advisor does not.
        const registerRows = (allMembers || []).filter((mm: any) =>
          !FEE_EXEMPT_ROLES.includes(mm.role) &&
          (paidIds.has(mm.id) || (mm.membership_status === 'active' && mm.fee_status === 'exempt')));
        // Idempotent: re-closing/re-running replaces that semester's register.
        await supabase.from('semester_members').delete().eq('semester_key', semKey);
        if (registerRows.length > 0) {
          await supabase.from('semester_members').insert(registerRows.map((mm: any) => ({
            semester_key: semKey, semester_label: semLabel, member_id: mm.id,
            first_name: mm.first_name, surname: mm.surname, email: mm.email,
            division: mm.division, role: mm.role, fee_paid: paidIds.has(mm.id),
            fee_period_id: period.id,
          })));
        }
        const { count: alumniCount } = await supabase.from('alumni').select('id', { count: 'exact', head: true });
        await supabase.from('semester_snapshots').upsert({
          semester_key: semKey, semester_label: semLabel,
          members_count: registerRows.length, alumni_count: alumniCount ?? 0,
          fee_period_id: period.id,
        }, { onConflict: 'semester_key' });
      } catch (snapErr) {
        console.error('Semester snapshot failed (collection still closed):', snapErr);
      }

      // Audit trail — records the closer's role AT THIS MOMENT.
      try {
        await supabase.from('activity_logs').insert({
          user_id: user.id, user_email: user.email ?? '', user_role: roles[0] ?? 'admin',
          action: 'close', entity_type: 'fee_period', entity_id: period.id, entity_name: period.semester_label,
          section: 'Operations', subsection: 'Membership fees', details: { total, members_registered: undefined },
        });
      } catch (logErr) { console.error('Failed to log fee close:', logErr); }

      return json({ success: true, total });
    }

    return json({ error: 'Invalid action' }, 400);
  } catch (error) {
    console.error('admin-fees error:', error);
    return json({ error: 'An unexpected error occurred. Please try again.' }, 500);
  }
});
