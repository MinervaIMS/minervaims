import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { audited } from '../_shared/activity.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { allows } from '../_shared/access.ts';
import { readJsonObject, type LooseBody } from '../_shared/request-body.ts';
import { estrMonthly, lastCompleteMonth } from '../_shared/ecb.ts';

// =====================================================================
// admin-funds: fund performance matrix for the simulated funds.
// Portfolio Managers and the Head of Portfolio Management upload data;
// Head of Asset Management / President / Vice President have oversight.
// One row per (fund, year) holds the twelve monthly returns.
//
// Since Step 93 only the monthly returns are typed. Every other figure
// (YTD, ITD, volatility, Sharpe ratio, drawdown, beta...) is computed
// from them by ONE database function, public.fund_track_record, which the
// fund pages, the data files and the key numbers all read. The ITD, YTD,
// Vol and Sharpe columns of a row are kept as they were typed (nothing is
// overwritten) but no longer shown.
//
// Also here: each fund's profile (inception, end, rebalancing, method,
// positions), and the market references the PM team types. The €STR
// fills itself from the ECB every morning (key-numbers `fill-estr`,
// Step 93B); `import-estr` does the same at once, from Fund Performances.
// =====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const FUNDS = ['long-short', 'multi-asset', 'dps', 'pir'] as const;

// The four summary cells are optional: the workspace no longer sends them
// (they are computed), and a row that has them keeps them.
const YearSchema = z.object({
  fund: z.enum(FUNDS),
  year: z.number().int().min(2000).max(2100),
  itd: z.string().max(20).optional(),
  months: z.array(z.string().max(20)).length(12),
  ytd: z.string().max(20).optional(),
  vol: z.string().max(20).optional(),
  sharpe: z.string().max(20).optional(),
});

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a YYYY-MM-DD date').nullable();
const ProfileSchema = z.object({
  fund: z.enum(FUNDS),
  inception_date: isoDate.optional(),
  end_date: isoDate.optional(),
  closing_reason: z.string().trim().max(600).optional(),
  rebalancing_policy: z.string().trim().max(600).optional(),
  methodology: z.string().trim().max(2000).optional(),
  positions_count: z.number().int().min(0).max(2000).nullable().optional(),
  positions_as_of: isoDate.optional(),
});

const SERIES = ['euro_stoxx_50', 'sp_500', 'msci_china', 'estr'] as const;
const monthKey = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use a YYYY-MM month');
const ReferenceSchema = z.object({
  series: z.enum(SERIES),
  source: z.string().trim().max(300).default(''),
  as_of: isoDate.optional(),
  rows: z.array(z.object({ month: monthKey, value: z.number().min(-100).max(1000) })).min(1).max(600),
});
const ReferenceDeleteSchema = z.object({ series: z.enum(SERIES), months: z.array(monthKey).min(1).max(600) });

// The €STR comes from the ECB through _shared/ecb.ts, which key-numbers
// also uses to fill it by itself every morning (Step 93B).

// =====================================================================
// READING THE FIGURES AND PUBLISHING THEM ARE TWO QUESTIONS.
// ---------------------------------------------------------------------
// One list answered both, and it was missing a role the matrix grants
// outright: `reports-funds` is 'manage' for EVERY Head of Division, and
// this list only admitted the one whose division happens to be
// `portfolio`. A Head of Equity opening Fund performances got a 403 and
// an empty table. The advisor, granted 'view' on everything, got the
// same.
//
// Reading now comes from the matrix. Writing keeps the list, because it
// is deliberately narrower than the matrix and always was: the numbers
// on this page are published on the website.
// =====================================================================
const RESOURCE = 'reports-funds';
const ALLOWED = ['admin', 'president', 'vice_president', 'head_of_asset_management', 'portfolio_manager'];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

Deno.serve(audited('admin-funds', async (req, audit) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.split(' ')[1]);
    if (authError || !user) return json({ error: 'Invalid token' }, 401);

    const { data: roleRows } = await supabase.from('user_roles').select('role, division').eq('user_id', user.id);
    const roles = (roleRows || []) as { role: string; division: string | null }[];
    audit.actor(user, roles.map((r) => r.role));
    const isAdminEmail = user.email === 'as.minerva@unibocconi.it';
    // Head of Portfolio Management = head_of_division with division 'portfolio'.
    const isPortfolioHead = roles.some((r) => r.role === 'head_of_division' && r.division === 'portfolio');
    const canManage = isAdminEmail || isPortfolioHead || roles.some((r) => ALLOWED.includes(r.role));
    const canRead = allows(roles.map((r) => r.role), user.email, RESOURCE, 'view');
    if (!canRead) return json({ error: 'Access denied' }, 403);

    // Unreadable still means "no fields", exactly as before; a body that is
    // JSON but not an object (`null`, a list) now means the same, instead
    // of throwing on the first property read. See _shared/request-body.ts.
    const body = ((await readJsonObject(req)) ?? {}) as LooseBody;
    const action = body.action as string;
    audit.request(action, body);

    if (!['list', 'reference-list'].includes(action) && !canManage) {
      return json({ error: 'Your role can read the fund performances but not publish them.' }, 403);
    }

    if (action === 'list') {
      const { data, error } = await supabase.from('fund_performance_years').select('*').order('year', { ascending: true });
      if (error) throw error;
      return json({ years: data || [] });
    }

    if (action === 'reference-list') {
      // The references and the €STR as typed, for the References tab.
      const [meta, rows] = await Promise.all([
        supabase.from('fund_reference_meta').select('*').order('position', { ascending: true }),
        supabase.from('fund_reference_series').select('series, month, value, source, as_of, updated_at').order('month', { ascending: true }),
      ]);
      if (meta.error) throw meta.error;
      if (rows.error) throw rows.error;
      return json({ meta: meta.data || [], rows: rows.data || [] });
    }

    if (action === 'profile-upsert') {
      const parsed = ProfileSchema.safeParse(body.profile);
      if (!parsed.success) return json({ error: 'Validation failed', details: parsed.error.format() }, 400);
      const p = parsed.data;
      if (p.inception_date && p.end_date && p.end_date < p.inception_date) {
        return json({ error: 'The end date is before the inception date.' }, 400);
      }
      // Only the fields sent are changed.
      const row: Record<string, unknown> = { fund: p.fund, updated_by: user.id, updated_at: new Date().toISOString() };
      for (const k of ['inception_date', 'end_date', 'closing_reason', 'rebalancing_policy', 'methodology', 'positions_count', 'positions_as_of'] as const) {
        if (p[k] !== undefined) row[k] = p[k];
      }
      const { data, error } = await supabase.from('fund_profiles').upsert(row, { onConflict: 'fund' }).select().single();
      if (error) throw error;
      audit.subject(`Fund profile: ${p.fund}`, null);
      return json({ success: true, profile: data });
    }

    if (action === 'reference-upsert') {
      const parsed = ReferenceSchema.safeParse(body.reference);
      if (!parsed.success) return json({ error: 'Validation failed', details: parsed.error.format() }, 400);
      const r = parsed.data;
      const now = new Date().toISOString();
      const rows = r.rows.map((x) => ({
        series: r.series, month: `${x.month}-01`, value: x.value, source: r.source,
        as_of: r.as_of ?? now.slice(0, 10), updated_by: user.id, updated_at: now,
      }));
      const { error } = await supabase.from('fund_reference_series').upsert(rows, { onConflict: 'series,month' });
      if (error) throw error;
      audit.subject(`Reference: ${r.series}`, null);
      audit.note({ months: r.rows.length });
      return json({ success: true, saved: rows.length });
    }

    if (action === 'reference-delete') {
      const parsed = ReferenceDeleteSchema.safeParse(body.reference);
      if (!parsed.success) return json({ error: 'Validation failed', details: parsed.error.format() }, 400);
      const { series, months } = parsed.data;
      // What is removed is written to the log first, so it can be typed again.
      const { data: before } = await supabase.from('fund_reference_series')
        .select('month, value, source').eq('series', series).in('month', months.map((m) => `${m}-01`));
      const { error } = await supabase.from('fund_reference_series')
        .delete().eq('series', series).in('month', months.map((m) => `${m}-01`));
      if (error) throw error;
      audit.subject(`Reference: ${series}`, null);
      audit.note({ removed: before || [] });
      return json({ success: true, removed: (before || []).length });
    }

    if (action === 'import-estr') {
      // From the first year of fund returns to the last complete month
      // (complete from the 4th of the next month: see _shared/ecb.ts).
      const { data: years, error: yErr } = await supabase.from('fund_performance_years').select('year');
      if (yErr) throw yErr;
      const now = new Date();
      const first = Math.min(...(years || []).map((y: { year: number }) => y.year), now.getUTCFullYear());
      const { month: endMonth, lastDay } = lastCompleteMonth(now);
      const startMonth = `${first}-01`;

      let monthly: Map<string, { value: number; source: string }>;
      try {
        monthly = await estrMonthly(startMonth, endMonth, lastDay);
      } catch (e) {
        return json({ error: `The ECB Data Portal could not be read (${(e as Error)?.message || e}). Nothing was changed; try again later, or type the rates in.` }, 502);
      }
      if (!monthly.size) return json({ error: 'The ECB returned no rates for these months. Try again later, or type them in.' }, 502);

      const { data: have, error: hErr } = await supabase.from('fund_reference_series').select('month').eq('series', 'estr');
      if (hErr) throw hErr;
      const typed = new Set((have || []).map((h: { month: string }) => String(h.month).slice(0, 7)));
      const asOf = now.toISOString().slice(0, 10);
      const rows = [...monthly.entries()]
        .filter(([m]) => !typed.has(m))
        .map(([m, v]) => ({ series: 'estr', month: `${m}-01`, value: v.value, source: v.source, as_of: asOf, updated_by: user.id, updated_at: now.toISOString() }));
      if (rows.length) {
        const { error } = await supabase.from('fund_reference_series').upsert(rows, { onConflict: 'series,month', ignoreDuplicates: true });
        if (error) throw error;
        // The Sharpe ratios on the website follow at once.
        const { error: kErr } = await supabase.rpc('refresh_key_numbers');
        if (kErr) console.error('refresh_key_numbers', kErr.message);
      }
      audit.subject('Reference: estr', null);
      audit.note({ filled: rows.length, kept: monthly.size - rows.length, from: startMonth, to: endMonth });
      return json({ success: true, filled: rows.length, kept: monthly.size - rows.length, from: startMonth, to: endMonth });
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
      // The months always; a summary cell only when one is sent.
      const row: Record<string, unknown> = { fund: y.fund, year: y.year, months: y.months, updated_by: user.id };
      for (const k of ['itd', 'ytd', 'vol', 'sharpe'] as const) if (y[k] !== undefined) row[k] = y[k];
      const { data, error } = await supabase.from('fund_performance_years')
        .upsert(row, { onConflict: 'fund,year' })
        .select().single();
      if (error) throw error;
      return json({ success: true, year: data });
    }

    return json({ error: 'Invalid action' }, 400);
  } catch (error) {
    console.error('admin-funds error:', error);
    return json({ error: 'An unexpected error occurred. Please try again.' }, 500);
  }
}));
