// =====================================================================
// funds-api — monthly fund performance (public-readable; managed via
// the admin-funds edge function).
// =====================================================================

import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

export type ActiveFund = 'long-short' | 'multi-asset';

export interface FundPerformance {
  id: string;
  fund: ActiveFund;
  period_month: string; // YYYY-MM-DD (first of month)
  nav: number | null;
  monthly_return: number | null;
  ytd_return: number | null;
  notes: string | null;
}

export interface PerformanceInput {
  fund: ActiveFund;
  period_month: string;
  nav?: number | null;
  monthly_return?: number | null;
  ytd_return?: number | null;
  notes?: string | null;
}

export const ACTIVE_FUND_LABELS: Record<ActiveFund, string> = {
  'long-short': 'Long-Short Equity Fund',
  'multi-asset': 'Multi-Asset Global Opportunities Fund',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as unknown as { from: (t: string) => any };

export async function listPerformances(): Promise<FundPerformance[]> {
  const { data, error } = await sb.from('fund_performances').select('*').order('period_month', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as FundPerformance[];
}

async function invoke(session: Session | null, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('admin-funds', {
    body, headers: { Authorization: `Bearer ${session?.access_token}` },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export function upsertPerformance(session: Session | null, performance: PerformanceInput) {
  return invoke(session, { action: 'upsert', performance });
}
export function deletePerformance(session: Session | null, id: string) {
  return invoke(session, { action: 'delete', id });
}
