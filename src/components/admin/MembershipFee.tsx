import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Download, Lock, Loader2, Pencil, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { divisionLabels, roleLabel as composeRoleLabel, type OrgDivision } from '@/lib/roles';
import { downloadCSV } from '@/lib/download-utils';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import {
  getCurrentFees, openFeePeriod, setFeePaid, closeFeePeriod, updateFeePeriod, feeBreakdown,
  type FeePeriod, type FeeMember, type MembershipFeeRow, type FeeBreakdownEntry,
} from '@/lib/ops-api';

const eur = (n: number) => `€${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function MembershipFee() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<FeePeriod | null>(null);
  const [members, setMembers] = useState<FeeMember[]>([]);
  const [fees, setFees] = useState<MembershipFeeRow[]>([]);
  const [breakdown, setBreakdown] = useState<FeeBreakdownEntry[]>([]);
  const [newLabel, setNewLabel] = useState('');
  const [newAmount, setNewAmount] = useState('10');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState('');
  const [editAmount, setEditAmount] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [r, b] = await Promise.all([getCurrentFees(session), feeBreakdown(session)]);
      setPeriod(r.period); setMembers(r.members); setFees(r.fees); setBreakdown(b);
    } catch (e) { toast({ title: 'Failed to load', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setLoading(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const paidMap = useMemo(() => { const m: Record<string, boolean> = {}; for (const f of fees) m[f.member_id] = f.paid; return m; }, [fees]);
  const paidCount = useMemo(() => members.filter((m) => paidMap[m.id]).length, [members, paidMap]);

  // Current-period per-division preview (live from local toggles).
  const currentByDiv = useMemo(() => {
    const acc: Record<string, { total: number; paid: number }> = {};
    for (const m of members) {
      const d = m.division || 'none';
      if (!acc[d]) acc[d] = { total: 0, paid: 0 };
      acc[d].total += 1;
      if (paidMap[m.id]) acc[d].paid += 1;
    }
    return acc;
  }, [members, paidMap]);

  const currentDivs = useMemo(() => Object.keys(currentByDiv).sort(), [currentByDiv]);
  const expectedTotal = period ? members.length * period.fee_amount : 0;
  const collectedTotal = period ? paidCount * period.fee_amount : 0;

  const startEdit = () => { if (!period) return; setEditLabel(period.semester_label); setEditAmount(String(period.fee_amount)); setEditing(true); };
  const saveEdit = async () => {
    if (!period) return;
    setBusy(true);
    try {
      await updateFeePeriod(session, period.id, { semester_label: editLabel.trim(), fee_amount: Number(editAmount) });
      toast({ title: 'Period updated' });
      setEditing(false);
      await load();
    } catch (e) { toast({ title: 'Could not update', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  const open = async () => {
    if (!newLabel.trim()) { toast({ title: 'Enter a semester label', variant: 'destructive' }); return; }
    setBusy(true);
    try { await openFeePeriod(session, newLabel.trim(), Number(newAmount) || 10); setNewLabel(''); await load(); toast({ title: 'Collection opened' }); }
    catch (e) { toast({ title: 'Could not open', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  const toggle = async (memberId: string) => {
    if (!period) return;
    const next = !paidMap[memberId];
    setFees((prev) => {
      const ex = prev.find((f) => f.member_id === memberId);
      return ex ? prev.map((f) => (f.member_id === memberId ? { ...f, paid: next } : f)) : [...prev, { id: memberId, period_id: period.id, member_id: memberId, paid: next }];
    });
    try { await setFeePaid(session, period.id, memberId, next); }
    catch (e) { toast({ title: 'Could not update', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); load(); }
  };

  const close = async () => {
    if (!period) return;
    setBusy(true);
    try { const r = await closeFeePeriod(session, period.id); toast({ title: 'Collection closed', description: `€${r.total} recorded in Treasury.` }); await load(); }
    catch (e) { toast({ title: 'Could not close', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  const exportCsv = () => {
    downloadCSV(members.map((m) => ({ name: `${m.first_name} ${m.surname}`, division: m.division !== 'none' ? divisionLabels[m.division] : '', role: composeRoleLabel(m.role, m.division), phone: m.phone ?? '', paid: paidMap[m.id] ? 'PAID' : 'UNPAID' })),
      [{ key: 'name', header: 'Name' }, { key: 'division', header: 'Division' }, { key: 'role', header: 'Role' }, { key: 'phone', header: 'Phone' }, { key: 'paid', header: 'Fee' }], 'membership-fees.csv');
  };

  const closedHistory = useMemo(() => breakdown.filter((b) => b.period.closed), [breakdown]);

  if (loading) return <div><WorkspacePageHeader title="Membership fee" description="Collect the semester membership fee." /><WorkspaceLoader /></div>;

  return (
    <div>
      <WorkspacePageHeader title="Membership fee" description="Track who has paid the semester fee (minimum €10). Closing a collection locks it and automatically records the total in Treasury." />

      {!period ? (
        <Card><CardContent className="py-8">
          <p className="font-body text-muted-foreground mb-4">No open collection. Open one for the current semester:</p>
          <div className="flex flex-col sm:flex-row gap-3 font-body max-w-lg">
            <div className="flex-1 space-y-1"><Label>Semester label</Label><Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="e.g. Autumn 2026" /></div>
            <div className="space-y-1"><Label>Fee (€)</Label><Input className="w-24" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} /></div>
            <Button className="self-end" onClick={open} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Open collection'}</Button>
          </div>
        </CardContent></Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 font-body">
            <div className="flex items-center gap-3 flex-wrap">
              {editing ? (
                <>
                  <Input className="w-48 font-serif" value={editLabel} onChange={(e) => setEditLabel(e.target.value)} />
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">€</span>
                    <Input className="w-20" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
                  </div>
                  <Button size="sm" onClick={saveEdit} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(false)} disabled={busy}><X className="h-4 w-4" /></Button>
                </>
              ) : (
                <>
                  <span className="font-serif text-xl text-accent">{period.semester_label}</span>
                  <span className="text-sm text-muted-foreground">€{period.fee_amount} · {paidCount}/{members.length} paid</span>
                  <Button size="sm" variant="ghost" onClick={startEdit}><Pencil className="h-3.5 w-3.5 mr-1" />Edit</Button>
                </>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-2" />CSV</Button>
              <AlertDialog>
                <AlertDialogTrigger asChild><Button disabled={busy}><Lock className="h-4 w-4 mr-2" />Close collection</Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Close the {period.semester_label} collection?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This locks all entries for this semester (they can no longer be edited) and automatically records {eur(collectedTotal)} as a positive Treasury entry that cannot be removed. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={close}>Close & record</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Per-division preview */}
          <Card className="mb-6"><CardContent className="py-4">
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="font-serif text-lg">Per-division preview — {period.semester_label}</h3>
              <span className="text-sm text-muted-foreground">Collected {eur(collectedTotal)} of {eur(expectedTotal)} expected</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-body text-sm">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-normal">Division</th>
                    <th className="px-3 py-2 font-normal text-right">Members</th>
                    <th className="px-3 py-2 font-normal text-right">Paid</th>
                    <th className="px-3 py-2 font-normal text-right">Outstanding</th>
                    <th className="px-3 py-2 font-normal text-right">Collected</th>
                    <th className="px-3 py-2 font-normal text-right">Expected</th>
                  </tr>
                </thead>
                <tbody>
                  {currentDivs.map((d) => {
                    const r = currentByDiv[d];
                    const expected = r.total * period.fee_amount;
                    const collected = r.paid * period.fee_amount;
                    return (
                      <tr key={d} className="border-t border-separator">
                        <td className="px-3 py-2">{d !== 'none' ? divisionLabels[d as OrgDivision] : '—'}</td>
                        <td className="px-3 py-2 text-right">{r.total}</td>
                        <td className="px-3 py-2 text-right">{r.paid}</td>
                        <td className="px-3 py-2 text-right">{r.total - r.paid}</td>
                        <td className="px-3 py-2 text-right text-green-700">{eur(collected)}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{eur(expected)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t-2 border-separator">
                  <tr className="font-medium">
                    <td className="px-3 py-2">Total</td>
                    <td className="px-3 py-2 text-right">{members.length}</td>
                    <td className="px-3 py-2 text-right">{paidCount}</td>
                    <td className="px-3 py-2 text-right">{members.length - paidCount}</td>
                    <td className="px-3 py-2 text-right text-green-700">{eur(collectedTotal)}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{eur(expectedTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent></Card>

          <div className="border border-separator overflow-x-auto">
            <table className="w-full text-left font-body text-sm">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-normal text-center">Paid</th>
                  <th className="px-3 py-2 font-normal">Name</th>
                  <th className="px-3 py-2 font-normal">Division</th>
                  <th className="px-3 py-2 font-normal">Role</th>
                  <th className="px-3 py-2 font-normal">Phone</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-t border-separator">
                    <td className="px-3 py-2 text-center"><Checkbox checked={!!paidMap[m.id]} onCheckedChange={() => toggle(m.id)} /></td>
                    <td className="px-3 py-2 text-foreground whitespace-nowrap">{m.first_name} {m.surname}</td>
                    <td className="px-3 py-2">{m.division !== 'none' ? divisionLabels[m.division] : '—'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{composeRoleLabel(m.role, m.division)}</td>
                    <td className="px-3 py-2">{m.phone || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* History of closed periods */}
      {closedHistory.length > 0 && (
        <div className="mt-10">
          <h3 className="font-serif text-lg mb-3">Closed collections</h3>
          <Accordion type="multiple" className="border border-separator">
            {closedHistory.map(({ period: p, by_division }) => {
              const divs = Object.keys(by_division).sort();
              const totalMembers = divs.reduce((s, d) => s + by_division[d].total, 0);
              const totalPaid = divs.reduce((s, d) => s + by_division[d].paid, 0);
              const totalCollected = divs.reduce((s, d) => s + by_division[d].collected, 0);
              return (
                <AccordionItem key={p.id} value={p.id} className="border-b border-separator last:border-b-0">
                  <AccordionTrigger className="px-3 hover:no-underline">
                    <div className="flex-1 flex justify-between items-center gap-3 font-body text-sm">
                      <span className="font-serif text-base">{p.semester_label}</span>
                      <span className="text-muted-foreground">€{p.fee_amount} fee · {totalPaid}/{totalMembers} paid · collected {eur(totalCollected)}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-3">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-body text-sm">
                        <thead className="bg-muted/40 text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2 font-normal">Division</th>
                            <th className="px-3 py-2 font-normal text-right">Members</th>
                            <th className="px-3 py-2 font-normal text-right">Paid</th>
                            <th className="px-3 py-2 font-normal text-right">Collected</th>
                          </tr>
                        </thead>
                        <tbody>
                          {divs.map((d) => (
                            <tr key={d} className="border-t border-separator">
                              <td className="px-3 py-2">{d !== 'none' ? divisionLabels[d as OrgDivision] : '—'}</td>
                              <td className="px-3 py-2 text-right">{by_division[d].total}</td>
                              <td className="px-3 py-2 text-right">{by_division[d].paid}</td>
                              <td className="px-3 py-2 text-right text-green-700">{eur(by_division[d].collected)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      )}
    </div>
  );
}
