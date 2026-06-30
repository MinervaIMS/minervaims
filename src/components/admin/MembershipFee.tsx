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
import { Download, Lock, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { divisionLabels, roleLabel as composeRoleLabel } from '@/lib/roles';
import { downloadCSV } from '@/lib/download-utils';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import {
  getCurrentFees, openFeePeriod, setFeePaid, closeFeePeriod,
  type FeePeriod, type FeeMember, type MembershipFeeRow,
} from '@/lib/ops-api';

export default function MembershipFee() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<FeePeriod | null>(null);
  const [members, setMembers] = useState<FeeMember[]>([]);
  const [fees, setFees] = useState<MembershipFeeRow[]>([]);
  const [newLabel, setNewLabel] = useState('');
  const [newAmount, setNewAmount] = useState('10');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const r = await getCurrentFees(session); setPeriod(r.period); setMembers(r.members); setFees(r.fees); }
    catch (e) { toast({ title: 'Failed to load', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setLoading(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const paidMap = useMemo(() => { const m: Record<string, boolean> = {}; for (const f of fees) m[f.member_id] = f.paid; return m; }, [fees]);
  const paidCount = useMemo(() => members.filter((m) => paidMap[m.id]).length, [members, paidMap]);

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
            <div>
              <span className="font-serif text-xl text-accent">{period.semester_label}</span>
              <span className="ml-3 text-sm text-muted-foreground">€{period.fee_amount} · {paidCount}/{members.length} paid</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-2" />CSV</Button>
              <AlertDialog>
                <AlertDialogTrigger asChild><Button disabled={busy}><Lock className="h-4 w-4 mr-2" />Close collection</Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Close the {period.semester_label} collection?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This locks all entries for this semester (they can no longer be edited) and automatically records €{(paidCount * period.fee_amount).toFixed(2)} as a positive Treasury entry that cannot be removed. This cannot be undone.
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
    </div>
  );
}
