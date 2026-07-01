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
const MANAGE = ['admin', 'president', 'vice_president', 'head_of_asset_management', 'head_of_operations'];

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
        .not('role', 'in', '(candidate,pending,admin,alumni,silent_advisor)')
        .neq('email', 'as.minerva@unibocconi.it')).data || [];

    if (action === 'current') {
      const { data: period } = await supabase.from('fee_periods').select('*').eq('closed', false).order('created_at', { ascending: false }).limit(1).maybeSingle();
      const members = await activeMembers();
      let fees: any[] = [];
      if (period) fees = (await supabase.from('membership_fees').select('*').eq('period_id', period.id)).data || [];
      return json({ period, members, fees });
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
      const first_deadline = (body.first_deadline as string) || null;
      const second_deadline = (body.second_deadline as string) || null;
      if (!first_deadline) return json({ error: 'A first deadline is required.' }, 400);
      if (second_deadline && second_deadline <= first_deadline) return json({ error: 'The second deadline must be after the first.' }, 400);
      const { data: period, error } = await supabase.from('fee_periods')
        .insert({ semester_label: label, fee_amount: amount, first_deadline, second_deadline, created_by: user.id }).select().single();
      if (error) {
        if ((error as any).code === '23505') return json({ error: 'A period with this label already exists.' }, 409);
        throw error;
      }
      const members = await activeMembers();
      if (members.length) {
        await supabase.from('membership_fees').insert(members.map((m: any) => ({ period_id: period.id, member_id: m.id, paid: false })));
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

    if (action === 'update') {
      const { data: period } = await supabase.from('fee_periods').select('*').eq('id', body.period_id).maybeSingle();
      if (!period) return json({ error: 'Period not found' }, 404);
      if (period.closed) return json({ error: 'Closed periods cannot be edited.' }, 403);
      const patch: Record<string, unknown> = {};
      if (typeof body.semester_label === 'string') {
        const label = body.semester_label.trim();
        if (!label) return json({ error: 'A semester label is required' }, 400);
        patch.semester_label = label;
      }
      if (body.fee_amount != null) {
        const amount = Number(body.fee_amount);
        if (!Number.isFinite(amount) || amount < 10) return json({ error: 'The minimum fee is €10 per semester.' }, 400);
        patch.fee_amount = amount;
        // Re-price already-paid rows so totals stay consistent.
        await supabase.from('membership_fees').update({ amount }).eq('period_id', period.id).eq('paid', true);
      }
      if (!Object.keys(patch).length) return json({ error: 'Nothing to update' }, 400);
      const { data, error } = await supabase.from('fee_periods').update(patch).eq('id', period.id).select().single();
      if (error) {
        if ((error as any).code === '23505') return json({ error: 'A period with this label already exists.' }, 409);
        throw error;
      }
      return json({ success: true, period: data });
    }

    if (action === 'breakdown') {
      const { data: periods } = await supabase.from('fee_periods').select('*').order('created_at', { ascending: false });
      const { data: allFees } = await supabase.from('membership_fees').select('period_id, member_id, paid, amount');
      const { data: allMembers } = await supabase.from('members').select('id, division, first_name, surname');
      const memberDiv = new Map<string, string>();
      (allMembers || []).forEach((m: any) => memberDiv.set(m.id, m.division || 'none'));
      const result = (periods || []).map((p: any) => {
        const rows = (allFees || []).filter((f: any) => f.period_id === p.id);
        const byDiv: Record<string, { total: number; paid: number; collected: number }> = {};
        rows.forEach((r: any) => {
          const d = memberDiv.get(r.member_id) || 'none';
          if (!byDiv[d]) byDiv[d] = { total: 0, paid: 0, collected: 0 };
          byDiv[d].total += 1;
          if (r.paid) { byDiv[d].paid += 1; byDiv[d].collected += Number(r.amount || p.fee_amount); }
        });
        return { period: p, by_division: byDiv };
      });
      return json({ breakdown: result });
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
      return json({ success: true, total });
    }

    return json({ error: 'Invalid action' }, 400);
  } catch (error) {
    console.error('admin-fees error:', error);
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
