// =====================================================================
// YOUR MEMBERSHIP FEE, AS YOU SEE IT (Step 106).
// ---------------------------------------------------------------------
// One reading of the signed-in member's own fee, used by My Profile,
// Membership (the "Membership fee" card) and by the Dashboard (its fee
// card), so the two can never say different things.
//
// WHAT IS READ: the member's own rows of `membership_fees`, one per
// collection, with the collection they belong to (`fee_periods`: the
// semester, the amount, the deadlines and how to pay). The database lets
// a member read their own rows ("members read own membership fee") and
// every member role read the collections; nothing here reads anybody
// else's payment.
//
// WHO PAYS: every member on the register, INCLUDING those on a semester
// of leave or on exchange (`fee_member_status` in the database). Advisors
// and the other roles outside the fee (`isFeeExempt`) never have a row,
// and the pages do not ask for one on their behalf.
//
// The emails about the fee link here with `?show=fee`: a query, not a
// `#` anchor, because a reader who has to sign in first is returned to
// the path and its query only (lib/return-path.ts).
// =====================================================================
import { supabase } from '@/integrations/supabase/client';

export interface MyFee {
  id: string;
  periodId: string;
  semester: string;
  /** What this member owes for this collection, in euros. */
  amount: number | null;
  paid: boolean;
  /** When the payment was recorded. */
  paidAt: string | null;
  /** Exempted for this collection by the President. */
  exempt: boolean;
  /** The collection is still open. */
  open: boolean;
  firstDeadline: string | null;
  secondDeadline: string | null;
  /** When the collection was opened. */
  openedAt: string | null;
  payment: {
    method: string | null;
    holder: string | null;
    iban: string | null;
    reference: string | null;
    notes: string | null;
  };
}

/** The query string that opens My Profile, Membership on the fee card. */
export const FEE_QUERY = 'show=fee';

interface Row {
  id: string;
  period_id: string;
  paid: boolean | null;
  amount: number | string | null;
  collected_at: string | null;
  exempt: boolean | null;
  fee_periods: {
    semester_label: string | null;
    fee_amount: number | string | null;
    closed: boolean | null;
    first_deadline: string | null;
    second_deadline: string | null;
    created_at: string | null;
    payment_method: string | null;
    payment_account_holder: string | null;
    payment_iban: string | null;
    payment_reference: string | null;
    payment_notes: string | null;
  } | null;
}

const num = (v: number | string | null | undefined): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Turn the rows read into fees, newest collection first. Pure, for the tests. */
export function toMyFees(rows: Row[]): MyFee[] {
  return rows
    .filter((r) => r.fee_periods)
    .map((r) => {
      const p = r.fee_periods!;
      return {
        id: r.id,
        periodId: r.period_id,
        semester: p.semester_label ?? 'This semester',
        amount: num(r.amount) ?? num(p.fee_amount),
        paid: !!r.paid,
        paidAt: r.paid ? r.collected_at : null,
        exempt: !!r.exempt,
        open: !p.closed,
        firstDeadline: p.first_deadline,
        secondDeadline: p.second_deadline,
        openedAt: p.created_at,
        payment: {
          method: p.payment_method,
          holder: p.payment_account_holder,
          iban: p.payment_iban,
          reference: p.payment_reference,
          notes: p.payment_notes,
        },
      };
    })
    .sort((a, b) => (b.openedAt ?? '').localeCompare(a.openedAt ?? ''));
}

/** The signed-in member's own fees. Throws when they cannot be read. */
export async function fetchMyFees(userId: string): Promise<MyFee[]> {
  const { data: me, error: meError } = await supabase.from('members').select('id').eq('user_id', userId).maybeSingle();
  if (meError) throw new Error(meError.message);
  if (!me) return [];
  const { data, error } = await supabase
    .from('membership_fees')
    .select('id, period_id, paid, amount, collected_at, exempt, fee_periods(semester_label, fee_amount, closed, first_deadline, second_deadline, created_at, payment_method, payment_account_holder, payment_iban, payment_reference, payment_notes)')
    .eq('member_id', (me as { id: string }).id);
  if (error) throw new Error(error.message);
  return toMyFees((data ?? []) as unknown as Row[]);
}

/** The fee to talk about: the open collection, else the latest one. */
export function currentFee(fees: MyFee[]): MyFee | null {
  return fees.find((f) => f.open) ?? fees[0] ?? null;
}

export type FeeState = 'paid' | 'exempt' | 'due' | 'overdue' | 'unpaid';

/** Where this fee stands today. */
export function feeState(f: MyFee, today: Date = new Date()): FeeState {
  if (f.exempt) return 'exempt';
  if (f.paid) return 'paid';
  if (!f.open) return 'unpaid';
  const last = f.secondDeadline ?? f.firstDeadline;
  if (last && endOfDay(last) < today.getTime()) return 'overdue';
  return 'due';
}

/** Is there something for this member to do about this fee? */
export function feeNeedsAction(f: MyFee | null): boolean {
  if (!f) return false;
  const s = feeState(f);
  return s === 'due' || s === 'overdue';
}

/** The next deadline still ahead, if any. */
export function nextDeadline(f: MyFee, today: Date = new Date()): string | null {
  for (const d of [f.firstDeadline, f.secondDeadline]) if (d && endOfDay(d) >= today.getTime()) return d;
  return null;
}

function endOfDay(d: string): number {
  const t = new Date(`${d.slice(0, 10)}T23:59:59`);
  return t.getTime();
}

/** "EUR 30.00", as the fee emails write it. */
export function feeAmountLabel(amount: number | null): string | null {
  return amount === null ? null : `EUR ${amount.toFixed(2)}`;
}

/** An IBAN in groups of four, as it is printed on a card. */
export function ibanGroups(iban: string | null): string | null {
  if (!iban) return null;
  return iban.replace(/\s+/g, '').toUpperCase().replace(/(.{4})/g, '$1 ').trim();
}

/** Said with the fee wherever a member reads it, as the fee emails say it. */
export const LEAVE_AND_EXCHANGE_NOTE = 'Members on a semester of leave or on exchange are also expected to pay the fee.';
