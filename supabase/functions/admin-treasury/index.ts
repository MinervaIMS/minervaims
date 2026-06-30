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
const MANAGE = ['admin', 'president', 'vice_president', 'head_of_asset_management', 'head_of_operations'];

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
    const canManage = user.email === 'as.minerva@unibocconi.it' || roles.some((r: string) => MANAGE.includes(r));

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === 'list') {
      const { data, error } = await supabase.from('treasury_entries').select('*').order('execution_date', { ascending: false }).order('created_at', { ascending: false });
      if (error) throw error;
      return json({ entries: data || [] });
    }

    if (action === 'add') {
      if (!canManage) return json({ error: 'Access denied' }, 403);
      const parsed = EntrySchema.safeParse(body.entry);
      if (!parsed.success) return json({ error: 'Validation failed', details: parsed.error.format() }, 400);
      const e = parsed.data;
      const signed = e.flow === 'out' ? -Math.abs(e.amount) : Math.abs(e.amount);
      const { data, error } = await supabase.from('treasury_entries').insert({
        amount: signed, flow: e.flow, description: e.description, source: e.source ?? null,
        execution_date: e.execution_date, academic_semester: academicSemester(new Date(e.execution_date)),
        is_auto: false, locked: false, created_by: user.id,
      }).select().single();
      if (error) throw error;
      return json({ success: true, entry: data });
    }

    return json({ error: 'Invalid action' }, 400);
  } catch (error) {
    console.error('admin-treasury error:', error);
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
