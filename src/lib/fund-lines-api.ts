// =====================================================================
// The funds' official lines, for any public component (Step 93B): the
// copy the build embedded in the page, or one live read of the records
// when there is none (see lib/fund-lines.ts). Shared, so the homepage's
// hero and its chart never ask twice.
// =====================================================================

import { fetchFundRecords } from '@/lib/fund-record-api';
import { linesFromRecords, readEmbeddedFundLines, type FundLinesSnapshot } from '@/lib/fund-lines';

const embedded = readEmbeddedFundLines();
let pending: Promise<FundLinesSnapshot> | null = null;

/** The lines embedded in this page, if the build put them there. */
export const embeddedFundLines = (): FundLinesSnapshot | null => embedded;

/** The lines, embedded or read live. Never rejects: a failed read is no lines. */
export function loadFundLines(): Promise<FundLinesSnapshot> {
  if (embedded) return Promise.resolve(embedded);
  if (!pending) {
    pending = fetchFundRecords().then(linesFromRecords, () => {
      pending = null;
      return { computed_at: null, lines: {} };
    });
  }
  return pending;
}
