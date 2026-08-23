/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// =====================================================================
// admin-treasury — append-only cash-flow register (report 12.2).
// No deletes or edits: mistakes are corrected with a new entry.
// =====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
// =====================================================================
// WHO MAY READ, AND WHO MAY WRITE, ARE TWO DIFFERENT QUESTIONS.
// ---------------------------------------------------------------------
// One list used to answer both, and `list` was gated on it. The Head of
// Division is not on that list, so every attempt to READ the register
// came back 403; the workspace caught the error, showed a toast and left
// the table empty. The page loaded, the figures did not - which is
// exactly the fault reported: an empty Treasury for a role that is
// supposed to see it.
//
// The client matrix has always said what the answer should be:
// `ops-treasury` is 'view' for the two research Heads and 'manage' for
// the Board and Operations. These two lists now say the same thing, so
// the interface and the server cannot disagree.
//
// READ is deliberately wider than MANAGE: consulting the association's
// cash position is part of leading a research area. Recording a movement
// is not - that belongs to the Board and to Operations, and the register
// is append-only for them too.
// =====================================================================
const READ = ['admin', 'president', 'vice_president', 'head_of_operations', 'head_of_asset_management', 'head_of_division'];
const MANAGE = ['admin', 'president', 'vice_president', 'head_of_operations'];

const EntrySchema = z.object({
  amount: z.number().positive('Amount must be greater than zero'),
  flow: z.enum(['in', 'out']),
  description: z.string().min(1).max(500),
  source: z.string().max(300).nullable().optional(),
  execution_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

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
    const isOwner = user.email === 'as.minerva@unibocconi.it';
    const canRead = isOwner || roles.some((r: string) => READ.includes(r));
    const canManage = isOwner || roles.some((r: string) => MANAGE.includes(r));
    // Treasury holds financial data: it is never open to any signed-in user.
    // Reading requires a role on READ; recording requires one on MANAGE.
    if (!canRead) return json({ error: 'Access denied' }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === 'list') {
      const { data, error } = await supabase.from('treasury_entries').select('*').order('execution_date', { ascending: false }).order('created_at', { ascending: false });
      if (error) throw error;
      return json({ entries: data || [] });
    }

    if (action === 'add') {
      // Reading the register is not permission to add to it.
      if (!canManage) return json({ error: 'Recording an entry is reserved for the Board and Operations.' }, 403);
      const parsed = EntrySchema.safeParse(body.entry);
      if (!parsed.success) return json({ error: 'Validation failed', details: parsed.error.format() }, 400);
      const e = parsed.data;
      const signed = e.flow === 'out' ? -Math.abs(e.amount) : Math.abs(e.amount);
      const { data, error } = await supabase.from('treasury_entries').insert({
        amount: signed, flow: e.flow, description: e.description, source: (e.source ?? '').trim() || 'manual',
        execution_date: e.execution_date, academic_semester: academicSemester(new Date(e.execution_date)),
        is_auto: false, locked: false, created_by: user.id,
      }).select().single();
      if (error) throw error;
      return json({ success: true, entry: data });
    }

    return json({ error: 'Invalid action' }, 400);
  } catch (error) {
    console.error('admin-treasury error:', error);
    return json({ error: 'An unexpected error occurred. Please try again.' }, 500);
  }
});
