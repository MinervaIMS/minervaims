import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// =====================================================================
// admin-funds — fund performance matrix for the active simulated funds.
// Portfolio Managers and the Head of Portfolio Management upload data;
// Head of Asset Management / President / Vice President have oversight.
// One row per (fund, year) feeds the public fund page tables directly.
// =====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const YearSchema = z.object({
  fund: z.enum(['long-short', 'multi-asset']),
  year: z.number().int().min(2000).max(2100),
  itd: z.string().max(20).default(''),
  months: z.array(z.string().max(20)).length(12),
  ytd: z.string().max(20).default(''),
  vol: z.string().max(20).default(''),
  sharpe: z.string().max(20).default(''),
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
      const { data, error } = await supabase.from('fund_performance_years').select('*').order('year', { ascending: true });
      if (error) throw error;
      return json({ years: data || [] });
    }

    if (action === 'delete') {
      const { error } = await supabase.from('fund_performance_years').delete().eq('id', body.id);
      if (error) throw error;
      return json({ success: true });
    }

    // upsert (create or update by fund + year)
    if (action === 'upsert') {
      const parsed = YearSchema.safeParse(body.year);
      if (!parsed.success) return json({ error: 'Validation failed', details: parsed.error.format() }, 400);
      const y = parsed.data;
      const { data, error } = await supabase.from('fund_performance_years')
        .upsert({
          fund: y.fund, year: y.year, itd: y.itd, months: y.months,
          ytd: y.ytd, vol: y.vol, sharpe: y.sharpe, updated_by: user.id,
        }, { onConflict: 'fund,year' })
        .select().single();
      if (error) throw error;
      return json({ success: true, year: data });
    }

    return json({ error: 'Invalid action' }, 400);
  } catch (error) {
    console.error('admin-funds error:', error);
    return json({ error: 'An unexpected error occurred. Please try again.' }, 500);
  }
});
