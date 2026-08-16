import { Fragment, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Lock, Loader2, Download } from 'lucide-react';
import { downloadCSV } from '@/lib/download-utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { HelpDot } from '@/components/admin/help/HelpSystem';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { listTreasury, addTreasuryEntry, type TreasuryEntry } from '@/lib/ops-api';
import { semesterOf, currentSemester } from '@/lib/semester';
import { logActivity } from '@/lib/activity-log';
import { useAccess } from '@/hooks/useAccess';

const eur = (n: number) => `€${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Treasury() {
  const { session, user, roles } = useAuth();
  const { primaryRole } = useAccess();
  // Only these roles may export the register.
  const canExport = user?.email === 'as.minerva@unibocconi.it' ||
    (roles || []).some((r) => ['admin', 'president', 'vice_president', 'head_of_operations'].includes(r.role as string));
  const { toast } = useToast();
  const [entries, setEntries] = useState<TreasuryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ amount: '', flow: 'in' as 'in' | 'out', description: '', source: '', execution_date: new Date().toISOString().slice(0, 10) });

  const load = async () => {
    setLoading(true);
    try { setEntries(await listTreasury(session)); }
    catch (e) { toast({ title: 'Failed to load', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setLoading(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const balance = useMemo(() => entries.reduce((s, e) => s + Number(e.amount), 0), [entries]);

  const exportCsv = () => {
    if (!entries.length) { toast({ title: 'Nothing to export' }); return; }
    const rows = entries.map((e) => ({
      execution_date: e.execution_date,
      registration_date: e.registration_date ? new Date(e.registration_date).toISOString().slice(0, 10) : '',
      description: e.description,
      source: e.source || 'manual',
      academic_semester: e.academic_semester || '',
      flow: e.flow === 'out' ? 'Outflow' : 'Inflow',
      amount: Number(e.amount).toFixed(2),
      entry_type: e.is_auto ? 'automatic' : 'manual',
    }));
    downloadCSV(rows, [
      { key: 'execution_date', header: 'Execution date' },
      { key: 'registration_date', header: 'Registration date' },
      { key: 'description', header: 'Description' },
      { key: 'source', header: 'Source' },
      { key: 'academic_semester', header: 'Semester' },
      { key: 'flow', header: 'Flow' },
      { key: 'amount', header: 'Amount (EUR)' },
      { key: 'entry_type', header: 'Entry type' },
    ], `minerva-treasury-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  // Group entries by semester (each semester may have a different leadership
  // team, so the register reads semester by semester), newest first.
  const semesterGroups = useMemo(() => {
    const map = new Map<string, { label: string; sort: number; rows: TreasuryEntry[]; net: number }>();
    for (const e of entries) {
      const s = semesterOf(e.execution_date);
      const g = map.get(s.key) ?? { label: s.label, sort: s.sort, rows: [], net: 0 };
      g.rows.push(e); g.net += Number(e.amount);
      map.set(s.key, g);
    }
    return [...map.values()].sort((a, b) => b.sort - a.sort);
  }, [entries]);

  const submit = async () => {
    const amt = Number(form.amount);
    if (!amt || amt <= 0) { toast({ title: 'Enter a positive amount', variant: 'destructive' }); return; }
    if (!form.description.trim()) { toast({ title: 'A description is required', variant: 'destructive' }); return; }
    setBusy(true);
    try {
      await addTreasuryEntry(session, { amount: amt, flow: form.flow, description: form.description.trim(), source: form.source || null, execution_date: form.execution_date });
      logActivity(session, primaryRole, { action: 'create', section: 'Operations', subsection: 'Treasury', entityType: 'treasury_entry', entityName: form.description.trim(), details: { amount: amt, flow: form.flow } });
      toast({ title: 'Entry recorded' });
      setConfirmOpen(false); setDialogOpen(false);
      setForm({ amount: '', flow: 'in', description: '', source: '', execution_date: new Date().toISOString().slice(0, 10) });
      await load();
    } catch (e) { toast({ title: 'Could not record', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <WorkspacePageHeader title="Treasury" description="The association's cash-flow register. Entries cannot be deleted or edited - correct a mistake by adding a correction entry."
        actions={<div className="flex items-center gap-2">
          {canExport && <Button variant="outline" className="font-body" onClick={exportCsv}><Download className="h-4 w-4 mr-2" />Download CSV</Button>}
          <Button className="font-body" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />New entry</Button>
        </div>} />

      <Card className="mb-6 max-w-xs"><CardContent className="py-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">Current balance <HelpDot page="ops-treasury" topic="immutability" /></div>
        <div className={`font-serif text-2xl ${balance < 0 ? 'text-destructive' : 'text-accent'}`}>{eur(balance)}</div>
      </CardContent></Card>

      {loading ? <WorkspaceLoader /> : entries.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">No entries yet.</p></CardContent></Card>
      ) : (
        <div className="max-w-full border border-separator overflow-x-auto">
          <table className="w-full text-left font-body text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-normal">Execution</th>
                <th className="px-3 py-2 font-normal">Description</th>
                <th className="px-3 py-2 font-normal">Source</th>
                <th className="px-3 py-2 font-normal">Semester</th>
                <th className="px-3 py-2 font-normal text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {semesterGroups.map((g) => (
                <Fragment key={g.label}>
                  {/* Semester divider: one leadership team per semester. */}
                  <tr className="border-t border-separator bg-accent/5">
                    <td colSpan={4} className="px-3 py-1.5 font-serif text-accent uppercase tracking-wider text-xs">
                      {g.label}{g.label === currentSemester().label ? ' · current semester' : ''}
                    </td>
                    <td className={`px-3 py-1.5 text-right text-xs whitespace-nowrap ${g.net < 0 ? 'text-destructive' : 'text-green-700'}`}>net {eur(g.net)}</td>
                  </tr>
                  {g.rows.map((e) => (
                    <tr key={e.id} className="border-t border-separator">
                      <td className="px-3 py-2 whitespace-nowrap">{new Date(e.execution_date).toLocaleDateString()}</td>
                      <td className="px-3 py-2 text-foreground">{e.description}{e.is_auto && <span className="ml-2 text-xs text-muted-foreground inline-flex items-center"><Lock className="h-3 w-3 mr-1" />auto</span>}</td>
                      <td className="px-3 py-2">{e.source || '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{e.academic_semester || '-'}</td>
                      <td className={`px-3 py-2 text-right whitespace-nowrap ${Number(e.amount) < 0 ? 'text-destructive' : 'text-green-700'}`}>{eur(Number(e.amount))}</td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New entry */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-serif">New cash-flow entry</DialogTitle></DialogHeader>
          <div className="space-y-3 font-body">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Flow</Label>
                <Select value={form.flow} onValueChange={(v) => setForm({ ...form, flow: v as 'in' | 'out' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="in">Inflow (+)</SelectItem><SelectItem value="out">Outflow (−)</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Amount (€)</Label><Input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" /></div>
            </div>
            <div className="space-y-1"><Label>Execution date</Label><Input type="date" value={form.execution_date} onChange={(e) => setForm({ ...form, execution_date: e.target.value })} /></div>
            <div className="space-y-1"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What is this for?" /></div>
            <div className="space-y-1"><Label>Source / reason</Label><Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="e.g. CASA funding, sponsorship" /></div>
            <Button className="w-full" onClick={() => setConfirmOpen(true)}>Review & record</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm this entry</AlertDialogTitle>
            <AlertDialogDescription>
              You are recording {form.flow === 'out' ? 'an outflow of −' : 'an inflow of +'}€{form.amount || '0'} - “{form.description}”. Treasury entries <strong>cannot be removed or edited later</strong>. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={submit} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Record entry'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
