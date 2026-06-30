import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// =====================================================================
// admin-funds — monthly performance for the active simulated funds.
// Portfolio Managers and the Head of Portfolio Management upload data;
// Head of Asset Management / President / Vice President have oversight.
// The fund_performances table is public-readable so it can feed the
// public fund pages.
// =====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PerfSchema = z.object({
  id: z.string().uuid().optional(),
  fund: z.enum(['long-short', 'multi-asset']),
  period_month: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-01'),
  nav: z.number().nullable().optional(),
  monthly_return: z.number().nullable().optional(),
  ytd_return: z.number().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

const ALLOWED = ['admin', 'president', 'vice_president', 'head_of_asset_management', 'portfolio_manager'];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.split(' ')[1]);
    if (authError || !user) return json({ error: 'Invalid token' }, 401);

    const { data: roleRows } = await supabase.from('user_roles').select('role, division').eq('user_id', user.id);
    const roles = (roleRows || []) as { role: string; division: string | null }[];
    const isAdminEmail = user.email === 'as.minerva@unibocconi.it';
    // Head of Portfolio Management = head_of_division with division 'portfolio'.
    const isPortfolioHead = roles.some((r) => r.role === 'head_of_division' && r.division === 'portfolio');
    const canManage = isAdminEmail || isPortfolioHead || roles.some((r) => ALLOWED.includes(r.role));
    if (!canManage) return json({ error: 'Access denied' }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === 'list') {
      const { data, error } = await supabase.from('fund_performances').select('*').order('period_month', { ascending: false });
      if (error) throw error;
      return json({ performances: data || [] });
    }

    if (action === 'delete') {
      const { error } = await supabase.from('fund_performances').delete().eq('id', body.id);
      if (error) throw error;
      return json({ success: true });
    }

    // upsert (create or update by fund + month)
    if (action === 'upsert') {
      const parsed = PerfSchema.safeParse(body.performance);
      if (!parsed.success) return json({ error: 'Validation failed', details: parsed.error.format() }, 400);
      const p = parsed.data;
      const { data, error } = await supabase.from('fund_performances')
        .upsert({
          fund: p.fund, period_month: p.period_month, nav: p.nav ?? null,
          monthly_return: p.monthly_return ?? null, ytd_return: p.ytd_return ?? null,
          notes: p.notes ?? null, created_by: user.id,
        }, { onConflict: 'fund,period_month' })
        .select().single();
      if (error) throw error;
      return json({ success: true, performance: data });
    }

    return json({ error: 'Invalid action' }, 400);
  } catch (error) {
    console.error('admin-funds error:', error);
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
