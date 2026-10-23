// =====================================================================
// Reading the funds' track records (Step 93): one call to
// public.public_fund_track_records(), which returns every figure already
// computed (see lib/fund-record.ts). Read once per visit.
// =====================================================================

import { supabase } from '@/integrations/supabase/client';
import { isFundsSnapshot, type FundsSnapshot } from '@/lib/fund-record';

type Rpc = (fn: string) => Promise<{ data: unknown; error: unknown }>;

let pending: Promise<FundsSnapshot> | null = null;

export function fetchFundRecords(): Promise<FundsSnapshot> {
  if (!pending) {
    pending = (supabase.rpc as unknown as Rpc)('public_fund_track_records').then(({ data, error }) => {
      if (error) throw error;
      if (!isFundsSnapshot(data)) throw new Error('Unexpected fund records');
      return data;
    });
    pending.catch(() => { pending = null; });
  }
  return pending;
}

/** Forget the read, after the editor has written new returns or references. */
export function refreshFundRecords(): void {
  pending = null;
}
