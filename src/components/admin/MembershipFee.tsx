import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Download, Lock, Loader2, ArrowUp, ArrowDown, ChevronsUpDown, Search, UserX, UserCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { logActivity } from '@/lib/activity-log';
import { divisionLabels, roleLabel as composeRoleLabel, memberRank } from '@/lib/roles';
import { downloadCSV } from '@/lib/download-utils';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { Recommendation } from '@/components/admin/Recommendation';
import { HelpDot } from '@/components/admin/help/HelpSystem';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { dayMonthYear } from '@/lib/workspace-dates';
import { firstFeeDeadlineExpired } from '@/lib/fee-deadline';
import {
  getCurrentFees, openFeePeriod, setFeePaid, setFeeExempt, closeFeePeriod,
  type FeePeriod, type FeeMember, type MembershipFeeRow,
} from '@/lib/ops-api';
import { ColumnFilter } from '@/components/admin/ColumnFilter';
import { ClearFilters } from '@/components/shared/ClearFilters';
import { FilterSheet, FilterSummary, filterChips, type FilterGroup } from '@/components/admin/kit/Filters';
import { RecordCard, RecordList } from '@/components/admin/kit/RecordCard';
import { MoreMenu, type MoreAction } from '@/components/admin/kit/MoreMenu';
import { useConfirm } from '@/components/admin/kit/ConfirmDialog';
import { Pinned, REGISTER_FIRST_COLUMN, REGISTER_HEAD, RegisterFrame, RegisterPage } from '@/components/admin/kit/Register';

// =====================================================================
// THE FEE REGISTER (Step 105): the open collection as a full register,
// with the Step 98 kit (kit/AGENTS.md). A search across name, email and
// phone; filters on the fee (paid, not paid, exempted), the division and
// the role, in the column headers on a computer and in one sheet on a
// phone, named as chips under the toolbar; every column of the member
// shown; sorting kept as it was.
//
// THE PRESIDENT'S EXEMPTION: a row's More menu offers "Exempt from this
// collection" to the President and the association's account only (the
// server says who, `can_exempt`, and checks again). An exempted person
// owes nothing, gets no reminder, sees no fee deadline, and is not
// written into the semester's member register when the collection
// closes. It is lifted the same way while the collection is open.
// =====================================================================

type FeeState = 'paid' | 'unpaid' | 'exempt';
const FEE_STATE_LABEL: Record<FeeState, string> = { paid: 'Paid', unpaid: 'Not paid', exempt: 'Exempted' };
const FEE_STATE_CLASS: Record<FeeState, string> = {
  paid: 'bg-emerald-50 text-emerald-800',
  unpaid: 'bg-muted text-muted-foreground',
  exempt: 'bg-accent/10 text-accent',
};

interface PastFeeRow { first_name: string; surname: string; division: string | null; role: string | null; fee_paid: boolean }
interface PastCollection { semester_key: string; semester_label: string; rows: PastFeeRow[] }

export default function MembershipFee() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<FeePeriod | null>(null);
  const [members, setMembers] = useState<FeeMember[]>([]);
  const [fees, setFees] = useState<MembershipFeeRow[]>([]);
  const [newLabel, setNewLabel] = useState('');
  const [newAmount, setNewAmount] = useState('10');
  const [firstDeadline, setFirstDeadline] = useState('');
  const [secondDeadline, setSecondDeadline] = useState('');
  // Payment information members receive in the collection email.
  const [payMethod, setPayMethod] = useState('Bank transfer');
  const [payHolder, setPayHolder] = useState('');
  const [payIban, setPayIban] = useState('');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmPaid, setConfirmPaid] = useState<FeeMember | null>(null);
  const [canExempt, setCanExempt] = useState(false);
  const { confirm, dialog: confirmDialog } = useConfirm();
  // The register's search and filters (Step 105).
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<string[]>([]);
  const [divisionFilter, setDivisionFilter] = useState<string[]>([]);
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  // Payments banked for this collection by somebody who has since left the
  // list (moved to alumni, or appointed advisor). Reported rather than
  // folded silently into the total.
  const [bankedOff, setBankedOff] = useState(0);

  // Past collections: who contributed each closed semester. Read from the
  // frozen semester registers (snapshotted when a collection closes).
  const [past, setPast] = useState<PastCollection[]>([]);
  const [openPast, setOpenPast] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('semester_members')
        .select('semester_key, semester_label, first_name, surname, division, role, fee_paid')
        .order('semester_key', { ascending: false }).order('surname');
      const map = new Map<string, PastCollection>();
      for (const r of (data || []) as (PastFeeRow & { semester_key: string; semester_label: string })[]) {
        const g = map.get(r.semester_key) ?? { semester_key: r.semester_key, semester_label: r.semester_label, rows: [] };
        g.rows.push(r); map.set(r.semester_key, g);
      }
      setPast([...map.values()]);
    })();
  }, []);

  const load = async () => {
    setLoading(true);
    try { const r = await getCurrentFees(session); setPeriod(r.period); setMembers(r.members); setFees(r.fees); setBankedOff(r.banked_off_register ?? 0); setCanExempt(!!r.can_exempt); }
    catch (e) { toast({ title: 'Failed to load', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setLoading(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const paidMap = useMemo(() => { const m: Record<string, boolean> = {}; for (const f of fees) m[f.member_id] = f.paid; return m; }, [fees]);
  const feeOf = useMemo(() => { const m: Record<string, MembershipFeeRow> = {}; for (const f of fees) m[f.member_id] = f; return m; }, [fees]);
  const stateOf = (id: string): FeeState => (feeOf[id]?.exempt ? 'exempt' : paidMap[id] ? 'paid' : 'unpaid');
  const paidCount = useMemo(() => members.filter((m) => paidMap[m.id]).length, [members, paidMap]);
  // Those the President exempted owe nothing: "12/38 paid", 2 exempted.
  const exemptCount = useMemo(() => members.filter((m) => feeOf[m.id]?.exempt).length, [members, feeOf]);
  const owingCount = members.length - exemptCount;

  // Excel-style sorting by role seniority, division, name or phone.
  type SortKey = 'name' | 'division' | 'role' | 'phone';
  const [sortKey, setSortKey] = useState<SortKey>('role');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const toggleSort = (k: SortKey) => { if (sortKey === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc')); else { setSortKey(k); setSortDir('asc'); } };

  const shownMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      if (stateFilter.length && !stateFilter.includes(stateOf(m.id))) return false;
      if (divisionFilter.length && !divisionFilter.includes(m.division)) return false;
      if (roleFilter.length && !roleFilter.includes(composeRoleLabel(m.role, m.division))) return false;
      if (!q) return true;
      return [`${m.first_name} ${m.surname}`, m.email ?? '', m.phone ?? ''].some((v) => v.toLowerCase().includes(q));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, search, stateFilter, divisionFilter, roleFilter, feeOf, paidMap]);

  const sortedMembers = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    const val = (m: FeeMember) =>
      sortKey === 'role' ? memberRank(m.role)
        : sortKey === 'division' ? (m.division !== 'none' ? divisionLabels[m.division] : '~')
        : sortKey === 'phone' ? (m.phone || '~')
        : `${m.surname} ${m.first_name}`;
    return [...shownMembers].sort((a, b) => {
      const va = val(a), vb = val(b);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return `${a.surname} ${a.first_name}`.localeCompare(`${b.surname} ${b.first_name}`);
    });
  }, [shownMembers, sortKey, sortDir]);

  const stateOptions = (Object.keys(FEE_STATE_LABEL) as FeeState[]).map((v) => ({ value: v, label: FEE_STATE_LABEL[v] }));
  const divisionOptions = useMemo(() => [...new Set(members.map((m) => m.division))]
    .map((d) => ({ value: d, label: d !== 'none' ? divisionLabels[d] : 'No division' }))
    .sort((a, b) => a.label.localeCompare(b.label)), [members]);
  const roleOptions = useMemo(() => [...new Set(members.map((m) => composeRoleLabel(m.role, m.division)))]
    .sort((a, b) => a.localeCompare(b)).map((r) => ({ value: r, label: r })), [members]);
  const filterGroups: FilterGroup[] = [
    { key: 'fee', label: 'Fee', options: stateOptions, selected: stateFilter, onChange: setStateFilter },
    { key: 'division', label: 'Division', options: divisionOptions, selected: divisionFilter, onChange: setDivisionFilter },
    { key: 'role', label: 'Role', options: roleOptions, selected: roleFilter, onChange: setRoleFilter },
  ];
  const clearFilters = () => { setSearch(''); setStateFilter([]); setDivisionFilter([]); setRoleFilter([]); };
  const activeFilters = (search.trim() ? 1 : 0) + (stateFilter.length ? 1 : 0) + (divisionFilter.length ? 1 : 0) + (roleFilter.length ? 1 : 0);

  const SortHead = ({ label, k, className }: { label: string; k: SortKey; className?: string }) => (
    <th className={`px-3 py-2 font-normal ${className ?? ''}`}>
      <button type="button" className="inline-flex items-center gap-1 hover:text-accent" onClick={() => toggleSort(k)}>
        {label}
        {sortKey === k ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ChevronsUpDown className="h-3 w-3 opacity-50" />}
      </button>
    </th>
  );

  // A sort arrow beside a column's filter, for the columns that have both.
  const SortButton = ({ k, label }: { k: SortKey; label: string }) => (
    <button type="button" data-ro className="inline-flex h-5 w-5 items-center justify-center hover:text-accent" onClick={() => toggleSort(k)} title={`Sort by ${label.toLowerCase()}`} aria-label={`Sort by ${label.toLowerCase()}`}>
      {sortKey === k ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ChevronsUpDown className="h-3 w-3 opacity-50" />}
    </button>
  );

  // A row's More menu: the President's exemption, or lifting it (Step 105).
  const exemptActions = (m: FeeMember): MoreAction[] => {
    const st = stateOf(m.id);
    if (st === 'exempt') return [{ key: 'lift', label: 'Lift the exemption', icon: UserCheck, disabled: busy, onSelect: () => { void changeExemption(m, false); } }];
    return [{
      key: 'exempt',
      label: st === 'paid' ? 'Exempt from this collection (record it as not paid first)' : 'Exempt from this collection',
      icon: UserX, destructive: true, disabled: busy || st === 'paid',
      onSelect: () => { void changeExemption(m, true); },
    }];
  };

  // A collection cannot open until members can be told how to pay: the
  // opening email carries these details, so every field below is required.
  const paymentReady = !!(payMethod.trim() && payHolder.trim() && payIban.trim() && payRef.trim());
  const openReady = !!newLabel.trim() && !!firstDeadline && paymentReady && (!secondDeadline || secondDeadline > firstDeadline);

  const open = async () => {
    if (!newLabel.trim()) { toast({ title: 'Enter a semester label', variant: 'destructive' }); return; }
    if (!firstDeadline) { toast({ title: 'Set a first deadline', variant: 'destructive' }); return; }
    if (secondDeadline && secondDeadline <= firstDeadline) { toast({ title: 'The second deadline must be after the first', variant: 'destructive' }); return; }
    if (!paymentReady) { toast({ title: 'Complete the payment details', description: 'Method, account holder, IBAN and reference are required.', variant: 'destructive' }); return; }
    setBusy(true);
    try {
      const r = await openFeePeriod(session, newLabel.trim(), Number(newAmount) || 10, firstDeadline, secondDeadline || null,
        { payment_method: payMethod.trim(), payment_account_holder: payHolder.trim(), payment_iban: payIban.trim(), payment_reference: payRef.trim(), payment_notes: payNotes.trim() },
        true);
      setNewLabel(''); setFirstDeadline(''); setSecondDeadline('');
      setPayMethod(''); setPayHolder(''); setPayIban(''); setPayRef(''); setPayNotes('');
      await load();
      toast({ title: 'Collection opened', description: r?.notified ? `${r.notified} member${r.notified === 1 ? '' : 's'} notified by email.` : undefined });
    }
    catch (e) { toast({ title: 'Could not open', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setBusy(false); }
  };


  const toggle = async (memberId: string, confirmed = false) => {
    if (!period) return;
    // Exempted: nothing to pay until the President lifts the exemption.
    if (feeOf[memberId]?.exempt) return;
    const next = !paidMap[memberId];
    if (next && !confirmed) {
      setConfirmPaid(members.find((m) => m.id === memberId) ?? null);
      return;
    }
    setBusy(true);
    setFees((prev) => {
      const ex = prev.find((f) => f.member_id === memberId);
      return ex ? prev.map((f) => (f.member_id === memberId ? { ...f, paid: next } : f)) : [...prev, { id: memberId, period_id: period.id, member_id: memberId, paid: next }];
    });
    try { await setFeePaid(session, period.id, memberId, next);}
    catch (e) { toast({ title: 'Could not update', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); load(); }
    finally { setBusy(false); }
  };

  // The President's exemption (Step 105): asked first, as every change is.
  const changeExemption = async (m: FeeMember, exempt: boolean) => {
    if (!period) return;
    const name = `${m.first_name} ${m.surname}`.trim();
    const ok = await confirm(exempt ? {
      title: `Exempt ${name} from the ${period.semester_label} collection?`,
      body: (
        <>
          <p>{name} will owe nothing for this collection, receive no reminder and see no fee deadline.</p>
          <p>When the collection closes, {name} is <strong>not</strong> written into the semester&apos;s member register, so is not a member of the association for {period.semester_label}.</p>
          <p>You can lift the exemption while the collection is open.</p>
        </>
      ),
      action: 'Exempt from this collection',
    } : {
      title: `Lift the exemption of ${name}?`,
      body: <p>{name} owes the fee for {period.semester_label} again, and receives the reminders from four working days on, as everyone who has not paid.</p>,
      action: 'Lift the exemption',
    });
    if (!ok) return;
    setBusy(true);
    try {
      await setFeeExempt(session, period.id, m.id, exempt);
      toast({ title: exempt ? 'Exempted from this collection' : 'Exemption lifted', description: name });
      await load();
    } catch (e) {
      toast({ title: 'Could not change the exemption', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const close = async () => {
    if (!period) return;
    setBusy(true);
    try { const r = await closeFeePeriod(session, period.id); toast({ title: 'Collection closed', description: `€${r.total} recorded in Treasury.` }); await load(); }
    catch (e) { toast({ title: 'Could not close', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  const exportCsv = () => {
    const fee: Record<FeeState, string> = { paid: 'PAID', unpaid: 'UNPAID', exempt: 'EXEMPTED' };
    downloadCSV(sortedMembers.map((m) => ({ name: `${m.first_name} ${m.surname}`, email: m.email ?? '', division: m.division !== 'none' ? divisionLabels[m.division] : '', role: composeRoleLabel(m.role, m.division), phone: m.phone ?? '', paid: fee[stateOf(m.id)] })),
      [{ key: 'name', header: 'Name' }, { key: 'email', header: 'Email' }, { key: 'division', header: 'Division' }, { key: 'role', header: 'Role' }, { key: 'phone', header: 'Phone' }, { key: 'paid', header: 'Fee' }], 'membership-fees.csv');
  };

  if (loading) return <div><WorkspacePageHeader title="Membership Fees" description="Collect the semester membership fee." /><WorkspaceLoader /></div>;

  return (
    <div>
      <WorkspacePageHeader title="Membership Fees" description="The semester's fee collection, and who has paid." />

      <div className="mb-5">
        <Recommendation title="Collect fees as soon as offers are accepted">
          <p>
            Past semesters show that the collection works best when it starts immediately after the new candidates
            accept their offers. Collecting early means the association knows exactly who its members are for the
            semester as soon as possible: the official member register can be frozen, teams can be organised with
            certainty, and the semester starts in an orderly way instead of chasing payments for weeks.
          </p>
        </Recommendation>
      </div>

      {!period ? (
        <Card><CardContent className="py-8 ws-form-touch">
          <p className="font-body text-muted-foreground mb-4">No open collection. Open one for the current semester. The first deadline is shown on the Calendar to everyone who owes the fee (advisors are outside it); the second deadline stays hidden until the first has passed and is then shown only to members who have not paid.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-body">
            <div className="space-y-1"><Label>Semester label</Label><Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="e.g. Autumn 2026" /></div>
            <div className="space-y-1"><Label>Fee (€)</Label><Input value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="e.g. 10" /></div>
            <div className="space-y-1"><Label>First deadline</Label><Input type="date" value={firstDeadline} onChange={(e) => setFirstDeadline(e.target.value)} /></div>
            <div className="space-y-1"><Label>Second deadline (optional, hidden until the first passes)</Label><Input type="date" value={secondDeadline} onChange={(e) => setSecondDeadline(e.target.value)} /></div>
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-body">
            <div className="space-y-1"><Label>Payment method</Label><Input value={payMethod} onChange={(e) => setPayMethod(e.target.value)} placeholder="e.g. Bank transfer" /></div>
            <div className="space-y-1"><Label>Account holder</Label><Input value={payHolder} onChange={(e) => setPayHolder(e.target.value)} placeholder="e.g. Minerva IMS" /></div>
            <div className="space-y-1"><Label>IBAN</Label><Input value={payIban} onChange={(e) => setPayIban(e.target.value)} placeholder="IT00 0000 0000 0000 0000 00" /></div>
            <div className="space-y-1"><Label>Payment reference</Label><Input value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="e.g. Fee Autumn 2026 - Name Surname" /></div>
            <div className="space-y-1 sm:col-span-2 lg:col-span-4"><Label>Further instructions (optional)</Label><Input value={payNotes} onChange={(e) => setPayNotes(e.target.value)} placeholder="Anything else members need to know to pay" /></div>
          </div>
          <p className="font-body text-sm text-muted-foreground mt-3">
            All payment details above are required: they are sent to every member in the fee collection email,
            so a collection cannot open without them.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="mt-4 h-11 lg:h-10" disabled={busy || !openReady}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Open collection'}</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Open the collection and email every member?</AlertDialogTitle>
                <AlertDialogDescription>
                  Opening the {newLabel.trim() || 'new'} collection sends the fee collection email to all
                  {' '}{members.length || ''} listed members immediately, with the amount, the deadline and the payment
                  details entered above. This email cannot be recalled.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="h-11 lg:h-10">Cancel</AlertDialogCancel>
                <AlertDialogAction className="h-11 lg:h-10" onClick={open}>Open & send email</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent></Card>
      ) : (
        <RegisterPage>
          <Pinned>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 font-body">
            <div>
              <span className="font-serif text-xl text-accent">{period.semester_label}</span>
              <span className="ml-3 text-sm text-muted-foreground">
                €{period.fee_amount} · {paidCount}/{owingCount} paid{exemptCount > 0 ? ` · ${exemptCount} exempted by the President` : ''}
              </span>
              {period.first_deadline && (
                <div className="text-sm text-muted-foreground mt-1">
                  First deadline {dayMonthYear(period.first_deadline)}
                  {period.second_deadline && firstFeeDeadlineExpired(period.first_deadline) ? ` · second deadline ${dayMonthYear(period.second_deadline)}` : ''}
                </div>
              )}
              {/* The one case where the ticks below and the total banked can
                  legitimately differ, said out loud rather than left as an
                  unexplained gap in the Treasury entry. */}
              {bankedOff > 0 && (
                <div className="text-sm text-amber-700 mt-1">
                  {bankedOff} further payment{bankedOff !== 1 ? 's were' : ' was'} banked for this collection by
                  {bankedOff !== 1 ? ' people who have' : ' somebody who has'} since left the list, and {bankedOff !== 1 ? 'are' : 'is'} still
                  counted in the Treasury total.
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="h-11 lg:h-10" onClick={exportCsv}><Download className="h-4 w-4 mr-2" />CSV</Button>
              <AlertDialog>
                <span className="inline-flex items-center gap-1.5"><AlertDialogTrigger asChild><Button className="h-11 lg:h-10" disabled={busy}><Lock className="h-4 w-4 mr-2" />Close collection</Button></AlertDialogTrigger><HelpDot page="ops-fee" topic="close" /></span>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Close the {period.semester_label} collection?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This locks all entries for this semester (they can no longer be edited) and automatically records €{(paidCount * period.fee_amount).toFixed(2)} as a positive Treasury entry that cannot be removed.
                      {exemptCount > 0 ? ` The ${exemptCount} ${exemptCount === 1 ? 'person' : 'people'} exempted by the President ${exemptCount === 1 ? 'is' : 'are'} not written into the semester's member register.` : ''} This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="h-11 lg:h-10">Cancel</AlertDialogCancel>
                    <AlertDialogAction className="h-11 lg:h-10" onClick={close}>Close & record</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* The toolbar: search, the phone's filters, and one press back. */}
          <div className="mb-3 flex flex-col sm:flex-row gap-3 sm:items-center flex-wrap font-body">
            <div className="relative max-w-md flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input className="pl-10 font-body h-11 lg:h-10" placeholder="Search by name, email or phone" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search the fee register" />
            </div>
            <FilterSheet groups={filterGroups} shown={sortedMembers.length} noun={{ one: 'member', many: 'members' }} onClearAll={clearFilters} />
            <ClearFilters count={activeFilters} onClear={clearFilters} size="sm" className="max-lg:h-11" />
            <HelpDot page="ops-fee" topic="register" />
          </div>
          <FilterSummary
            shown={sortedMembers.length}
            total={members.length}
            noun={{ one: 'member', many: 'members' }}
            chips={filterChips(filterGroups, { value: search, clear: () => setSearch('') })}
            onClearAll={clearFilters}
          />
          </Pinned>

          {/* On a phone, a card per member with the Paid box at its foot,
              ticked at a table with a queue in front of you (Step 98). */}
          <RecordList label="Members and their fee">
            {sortedMembers.map((m) => {
              const st = stateOf(m.id);
              return (
                <RecordCard
                  key={m.id}
                  title={`${m.first_name} ${m.surname}`}
                  meta={m.email || undefined}
                  aside={<span className={`whitespace-nowrap text-[11px] px-1.5 py-0.5 ${FEE_STATE_CLASS[st]}`}>{FEE_STATE_LABEL[st]}</span>}
                  lines={(
                    <span className="block truncate text-xs text-muted-foreground">
                      {[m.division !== 'none' ? divisionLabels[m.division] : null, composeRoleLabel(m.role, m.division), m.phone].filter(Boolean).join(' · ')}
                    </span>
                  )}
                  actions={(
                    <>
                      {st !== 'exempt' && (
                        <label className="inline-flex min-h-11 flex-1 cursor-pointer items-center gap-3 border border-separator px-3">
                          <Checkbox disabled={busy} checked={!!paidMap[m.id]} onCheckedChange={() => toggle(m.id)} aria-label={`Paid: ${m.first_name} ${m.surname}`} />
                          <span className="text-sm text-foreground">Paid</span>
                        </label>
                      )}
                      {canExempt && <MoreMenu label={`More actions for ${m.first_name} ${m.surname}`} title={`${m.first_name} ${m.surname}`} actions={exemptActions(m)} />}
                    </>
                  )}
                />
              );
            })}
          </RecordList>

          <RegisterFrame>
            <table className="w-full text-left font-body text-sm">
              <thead className={REGISTER_HEAD}>
                <tr>
                  <SortHead label="Name" k="name" className={REGISTER_FIRST_COLUMN} />
                  <th className="px-3 py-2 font-normal text-center">Paid</th>
                  <th className="px-3 py-2 font-normal">Email</th>
                  <th className="px-3 py-2 font-normal"><div className="flex items-center gap-1"><ColumnFilter label="Division" options={divisionOptions} selected={divisionFilter} onChange={setDivisionFilter} /><SortButton k="division" label="Division" /></div></th>
                  <th className="px-3 py-2 font-normal"><div className="flex items-center gap-1"><ColumnFilter label="Role" options={roleOptions} selected={roleFilter} onChange={setRoleFilter} /><SortButton k="role" label="Role" /></div></th>
                  <SortHead label="Phone" k="phone" />
                  <th className="px-3 py-2 font-normal"><ColumnFilter label="Fee" options={stateOptions} selected={stateFilter} onChange={setStateFilter} /></th>
                  {canExempt && <th className="px-3 py-2 font-normal text-right"><span className="sr-only">Actions</span></th>}
                </tr>
              </thead>
              <tbody>
                {sortedMembers.map((m) => {
                  const st = stateOf(m.id);
                  const row = feeOf[m.id];
                  return (
                    <tr key={m.id} className="border-t border-separator align-top">
                      <td className={`px-3 py-2 text-foreground whitespace-nowrap ${REGISTER_FIRST_COLUMN}`}>{m.first_name} {m.surname}</td>
                      <td className="px-3 py-2 text-center">
                        {st === 'exempt'
                          ? <span className="text-xs text-muted-foreground" title="Exempted by the President">-</span>
                          : <Checkbox disabled={busy} checked={!!paidMap[m.id]} onCheckedChange={() => toggle(m.id)} aria-label={`Paid: ${m.first_name} ${m.surname}`} />}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{m.email || '-'}</td>
                      <td className="px-3 py-2">{m.division !== 'none' ? divisionLabels[m.division] : '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{composeRoleLabel(m.role, m.division)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{m.phone || '-'}</td>
                      <td className="px-3 py-2">
                        <span className={`whitespace-nowrap text-[11px] px-1.5 py-0.5 ${FEE_STATE_CLASS[st]}`}>{FEE_STATE_LABEL[st]}</span>
                        {st === 'exempt' && row?.exempted_at && (
                          <p className="mt-1 text-xs text-muted-foreground whitespace-nowrap">By the President, {dayMonthYear(row.exempted_at.slice(0, 10))}</p>
                        )}
                      </td>
                      {canExempt && (
                        <td className="px-3 py-2 text-right">
                          <MoreMenu label={`More actions for ${m.first_name} ${m.surname}`} title={`${m.first_name} ${m.surname}`} actions={exemptActions(m)} />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </RegisterFrame>
          {sortedMembers.length === 0 && (
            <Pinned><p className="py-8 text-center font-body text-sm text-muted-foreground">Nobody matches the search and the filters.</p></Pinned>
          )}
        </RegisterPage>

      )}

      <AlertDialog open={!!confirmPaid} onOpenChange={(open) => { if (!open) setConfirmPaid(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Record payment and send confirmation?</AlertDialogTitle>
            <AlertDialogDescription>
              Mark {confirmPaid?.first_name} {confirmPaid?.surname} as paid for {period?.semester_label} (€{period?.fee_amount}).
              A payment confirmation will be emailed to {confirmPaid?.email || 'this member'}. The email cannot be recalled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (confirmPaid) void toggle(confirmPaid.id, true); }}>Record & send email</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {confirmDialog}

      {/* Past collections: the contribution record of every closed semester,
          frozen when its collection closed. Always consultable, especially
          useful while no collection is open. */}
      {past.length > 0 && (
        <div className="mt-10">
          <h3 className="font-serif text-lg text-accent mb-1">Past collections</h3>
          <p className="font-body text-sm text-muted-foreground mb-3">
            Who contributed to each closed semester's fee collection. Each record was frozen when that
            collection closed and can no longer change. Advisors are not members of the association for
            fee purposes and are in none of these registers.
          </p>
          <div className="space-y-2">
            {past.map((g) => {
              const paid = g.rows.filter((r) => r.fee_paid).length;
              return (
                <div key={g.semester_key} className="border border-separator rounded-lg">
                  <button type="button" className="w-full flex items-center justify-between gap-3 px-4 py-2.5 font-body text-sm max-lg:min-h-12"
                    onClick={() => setOpenPast(openPast === g.semester_key ? null : g.semester_key)}>
                    <span className="text-foreground font-serif">{g.semester_label}</span>
                    <span className="text-muted-foreground text-xs">{paid}/{g.rows.length} paid {openPast === g.semester_key ? '▾' : '▸'}</span>
                  </button>
                  {openPast === g.semester_key && (
                    <div className="max-w-full border-t border-separator overflow-x-auto">
                      <table className="w-full text-left font-body text-sm">
                        <thead className="bg-muted/40 text-muted-foreground">
                          <tr>
                            <th className="px-3 py-1.5 font-normal">Name</th>
                            <th className="px-3 py-1.5 font-normal">Division</th>
                            <th className="px-3 py-1.5 font-normal">Role</th>
                            <th className="px-3 py-1.5 font-normal text-center">Fee</th>
                          </tr>
                        </thead>
                        <tbody>
                          {g.rows.map((r, i) => (
                            <tr key={i} className="border-t border-separator">
                              <td className="px-3 py-1.5 text-foreground">{r.first_name} {r.surname}</td>
                              <td className="px-3 py-1.5">{r.division && r.division !== 'none' && r.division !== 'board' ? (divisionLabels[r.division as keyof typeof divisionLabels] ?? r.division) : '-'}</td>
                              <td className="px-3 py-1.5">{r.role ? composeRoleLabel(r.role as never, (r.division ?? null) as never) : '-'}</td>
                              <td className={`px-3 py-1.5 text-center ${r.fee_paid ? 'text-emerald-700' : 'text-muted-foreground'}`}>{r.fee_paid ? 'Paid' : 'Not paid'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
