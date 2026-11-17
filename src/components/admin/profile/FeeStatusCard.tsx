// =====================================================================
// MY PROFILE, MEMBERSHIP: THE MEMBERSHIP FEE (Step 106).
// ---------------------------------------------------------------------
// Where the member's own fee stands, in one rounded card at the top of
// the Membership page: this semester's collection, whether it is paid
// (and when), what is owed and by when, and how to pay. Earlier
// collections follow in one line each.
//
// The fee emails and the Dashboard's fee card open the page here
// (`?show=fee`), so "See your fee status" lands on this card, scrolled
// into view, rather than on Operations, Membership Fees, which most
// members cannot open.
//
// IT ONLY READS. Payments are recorded by the roles that run the
// collection; this card never offers a button that would change anything.
// =====================================================================
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Wallet } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { isFeeExempt } from '@/lib/membership-fee';
import { normalizeRole, type AppRole } from '@/lib/roles';
import { EmptyState, ProfileCard, StatusChip, longDate } from '@/components/admin/profile/profile-ui';
import {
  FEE_QUERY, LEAVE_AND_EXCHANGE_NOTE, feeAmountLabel, feeState, fetchMyFees, ibanGroups, nextDeadline, type FeeState, type MyFee,
} from '@/lib/my-fee';

const STATE: Record<FeeState, { label: string; tone: 'positive' | 'waiting' | 'negative' | 'neutral' | 'accent' }> = {
  paid: { label: 'Paid', tone: 'positive' },
  exempt: { label: 'Exempt', tone: 'neutral' },
  due: { label: 'To pay', tone: 'waiting' },
  overdue: { label: 'Past the deadline', tone: 'negative' },
  unpaid: { label: 'Not paid', tone: 'neutral' },
};

/** The sentence under the status: what it means, in words. */
function sentence(f: MyFee): string {
  const s = feeState(f);
  const amount = feeAmountLabel(f.amount);
  if (s === 'paid') return f.paidAt ? `Your payment${amount ? ` of ${amount}` : ''} was recorded on ${longDate(f.paidAt)}. Thank you.` : `Your payment${amount ? ` of ${amount}` : ''} is recorded. Thank you.`;
  if (s === 'exempt') return 'You are exempt from the fee for this collection. Nothing is owed.';
  if (s === 'unpaid') return 'This collection is closed and no payment was recorded for you. If you did pay, please contact the Head of Operations or the Vice President.';
  const next = nextDeadline(f);
  if (s === 'overdue') return `${amount ? `${amount} is` : 'The fee is'} still to be paid, and the last deadline has passed. Please pay as soon as you can.`;
  return `${amount ? `${amount} to pay` : 'The fee is to be paid'}${next ? `, by ${longDate(next)}` : ''}.`;
}

function Row({ label, value, mono = false }: { label: string; value: string | null; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-x-3 py-1.5 text-sm sm:grid-cols-[9rem_1fr]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`min-w-0 break-words text-foreground ${mono ? 'tabular-nums tracking-wide' : ''}`}>{value}</dd>
    </div>
  );
}

export function FeeStatusCard({ fees, error, loading, focus }: {
  fees: MyFee[];
  error: boolean;
  loading: boolean;
  /** Opened from a fee email or the Dashboard: scroll the card into view. */
  focus: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const current = fees.find((f) => f.open) ?? fees[0] ?? null;
  const earlier = fees.filter((f) => f !== current);

  useEffect(() => {
    if (!focus || loading) return;
    ref.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [focus, loading]);

  const state = current ? feeState(current) : null;
  const showHowToPay = current && (state === 'due' || state === 'overdue');

  return (
    <div ref={ref} id="fee" className="scroll-mt-4">
      <ProfileCard
        title="Membership fee"
        headingId="ms-fee"
        subtitle={current ? current.semester : undefined}
        action={current && state ? <StatusChip tone={STATE[state].tone}>{STATE[state].label}</StatusChip> : undefined}
        className={focus ? 'ring-2 ring-accent/40' : ''}
      >
        {loading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Reading your fee</div>
        ) : error ? (
          <EmptyState icon={<Wallet className="h-5 w-5" />} title="Your fee could not be read just now">
            Try again in a moment.
          </EmptyState>
        ) : !current ? (
          <EmptyState icon={<Wallet className="h-5 w-5" />} title="No fee collection for you yet">
            When a collection opens you receive an email, and your fee is shown here: what is owed, by when and how to pay.
          </EmptyState>
        ) : (
          <>
            <p className="text-[15px] leading-relaxed text-foreground/85">{sentence(current)}</p>

            {showHowToPay && (
              <dl className="mt-3 divide-y divide-separator rounded-lg border border-separator px-3 sm:px-4">
                <Row label="Amount" value={feeAmountLabel(current.amount)} mono />
                <Row label="First deadline" value={current.firstDeadline ? longDate(current.firstDeadline) : null} />
                <Row label="Second deadline" value={current.secondDeadline ? longDate(current.secondDeadline) : null} />
                <Row label="How to pay" value={current.payment.method} />
                <Row label="Account holder" value={current.payment.holder} />
                <Row label="IBAN" value={ibanGroups(current.payment.iban)} mono />
                <Row label="Reference" value={current.payment.reference} />
                <Row label="Notes" value={current.payment.notes} />
              </dl>
            )}

            {current.open && (
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                {LEAVE_AND_EXCHANGE_NOTE} Once your payment arrives it is recorded here as paid, and you receive a receipt by email. A question? Ask the Head of Operations or the Vice President.
              </p>
            )}

            {earlier.length > 0 && (
              <div className="mt-4 border-t border-separator pt-3">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Earlier collections</p>
                <ul className="mt-2 space-y-1.5">
                  {earlier.slice(0, 6).map((f) => {
                    const s = feeState(f);
                    return (
                      <li key={f.id} className="flex items-center justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate text-foreground/85">{f.semester}</span>
                        <StatusChip tone={STATE[s].tone}>{STATE[s].label}</StatusChip>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </>
        )}
      </ProfileCard>
    </div>
  );
}

/**
 * The card as My Profile, Membership shows it: it reads the member's own
 * fee, and opens scrolled to itself when the address says `?show=fee`.
 * Nothing is shown to a role outside the fee (an advisor), nor to an
 * alumnus with no fee on record.
 */
export function MyFeeSection() {
  const { user, roles } = useAuth();
  const [params] = useSearchParams();
  const focus = params.get(FEE_QUERY.split('=')[0]) === FEE_QUERY.split('=')[1];
  const roleList = (roles || []).map((r) => r.role as string);
  const exempt = isFeeExempt(roleList);
  const [fees, setFees] = useState<MyFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!user?.id || exempt) { setLoading(false); return undefined; }
    let live = true;
    setLoading(true);
    fetchMyFees(user.id)
      .then((rows) => { if (live) { setFees(rows); setError(false); } })
      .catch(() => { if (live) setError(true); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [user?.id, exempt]);

  if (exempt) return null;
  const onlyAlumni = roleList.length > 0 && roleList.every((r) => normalizeRole(r as AppRole) === 'alumni');
  if (!loading && !error && fees.length === 0 && onlyAlumni) return null;
  return <FeeStatusCard fees={fees} error={error} loading={loading} focus={focus} />;
}

export default FeeStatusCard;
