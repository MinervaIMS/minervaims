// =====================================================================
// funds-api — fund performance matrix (public-readable; managed via the
// admin-funds edge function). One row per (fund, year) mirrors the public
// fund page table: ITD, twelve monthly returns, YTD, Vol, Sharpe.
// =====================================================================

import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

export type ActiveFund = 'long-short' | 'multi-asset';

export interface FundYear {
  id: string;
  fund: ActiveFund;
  year: number;
  itd: string;
  months: string[]; // 12 entries, Jan..Dec
  ytd: string;
  vol: string;
  sharpe: string;
}

export interface FundYearInput {
  fund: ActiveFund;
  year: number;
  itd: string;
  months: string[];
  ytd: string;
  vol: string;
  sharpe: string;
}

export const ACTIVE_FUND_LABELS: Record<ActiveFund, string> = {
  'long-short': 'Long-Short Equity Fund',
  'multi-asset': 'Multi-Asset Global Opportunities Fund',
};

export const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as unknown as { from: (t: string) => any };

function normalizeMonths(m: unknown): string[] {
  const arr = Array.isArray(m) ? m.map((x) => (x == null ? '' : String(x))) : [];
  return Array.from({ length: 12 }, (_, i) => arr[i] ?? '');
}

export async function listFundYears(): Promise<FundYear[]> {
  const { data, error } = await sb.from('fund_performance_years').select('*').order('year', { ascending: true });
  if (error) throw new Error(error.message);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data || []) as any[]).map((r) => ({ ...r, months: normalizeMonths(r.months) })) as FundYear[];
}

async function invoke(session: Session | null, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('admin-funds', {
    body, headers: { Authorization: `Bearer ${session?.access_token}` },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export function upsertFundYear(session: Session | null, year: FundYearInput) {
  return invoke(session, { action: 'upsert', year });
}
export function deleteFundYear(session: Session | null, id: string) {
  return invoke(session, { action: 'delete', id });
}
