import { useEffect, useMemo, useState } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { listTreasury, addTreasuryEntry, type TreasuryEntry } from '@/lib/ops-api';
import { divisionLabels, type OrgDivision } from '@/lib/roles';

const eur = (n: number) => `€${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const DIVISION_OPTIONS: OrgDivision[] = ['equity', 'investment', 'macro', 'portfolio', 'quant', 'media', 'operations'];

const ALL = '__all__';
const NONE = '__none__';

function csvEscape(v: unknown): string {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function Treasury() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = useState<TreasuryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<string>(ALL);
  const [divisionFilter, setDivisionFilter] = useState<string>(ALL);
  const [form, setForm] = useState<{
    amount: string; flow: 'in' | 'out'; description: string; source: string; execution_date: string; division: OrgDivision | '';
  }>({ amount: '', flow: 'in', description: '', source: '', execution_date: new Date().toISOString().slice(0, 10), division: '' });

  const load = async () => {
    setLoading(true);
    try { setEntries(await listTreasury(session)); }
    catch (e) { toast({ title: 'Failed to load', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setLoading(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const periods = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => { if (e.academic_semester) set.add(e.academic_semester); });
    return Array.from(set);
  }, [entries]);

  const filtered = useMemo(() => entries.filter((e) => {
    if (periodFilter !== ALL && (e.academic_semester || '') !== periodFilter) return false;
    if (divisionFilter !== ALL) {
      if (divisionFilter === NONE) { if (e.division) return false; }
      else if (e.division !== divisionFilter) return false;
    }
    return true;
  }), [entries, periodFilter, divisionFilter]);

  const totalBalance = useMemo(() => entries.reduce((s, e) => s + Number(e.amount), 0), [entries]);
  const filteredBalance = useMemo(() => filtered.reduce((s, e) => s + Number(e.amount), 0), [filtered]);
  const inflows = useMemo(() => filtered.filter((e) => Number(e.amount) > 0).reduce((s, e) => s + Number(e.amount), 0), [filtered]);
  const outflows = useMemo(() => filtered.filter((e) => Number(e.amount) < 0).reduce((s, e) => s + Number(e.amount), 0), [filtered]);

  const exportCsv = () => {
    const headers = ['Execution date', 'Registration date', 'Semester', 'Division', 'Flow', 'Amount (EUR)', 'Description', 'Source', 'Auto', 'Locked'];
    const rows = filtered.map((e) => [
      e.execution_date,
      e.registration_date,
      e.academic_semester || '',
      e.division ? divisionLabels[e.division] : '',
      e.flow,
      Number(e.amount).toFixed(2),
      e.description,
      e.source || '',
      e.is_auto ? 'yes' : 'no',
      e.locked ? 'yes' : 'no',
    ]);
    const totalRow = ['', '', '', '', '', filteredBalance.toFixed(2), 'NET BALANCE (filtered)', '', '', ''];
    const csv = [headers, ...rows, totalRow].map((r) => r.map(csvEscape).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    const tag = [periodFilter !== ALL ? periodFilter.replace(/\s+/g, '-') : 'all-periods',
                 divisionFilter !== ALL ? (divisionFilter === NONE ? 'unassigned' : divisionFilter) : 'all-divisions'].join('_');
    a.href = url; a.download = `treasury_${tag}_${stamp}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const submit = async () => {
    const amt = Number(form.amount);
    if (!amt || amt <= 0) { toast({ title: 'Enter a positive amount', variant: 'destructive' }); return; }
    if (!form.description.trim()) { toast({ title: 'A description is required', variant: 'destructive' }); return; }
    setBusy(true);
    try {
      await addTreasuryEntry(session, {
        amount: amt, flow: form.flow, description: form.description.trim(),
        source: form.source || null, execution_date: form.execution_date,
        division: form.division || null,
      });
      toast({ title: 'Entry recorded' });
      setConfirmOpen(false); setDialogOpen(false);
      setForm({ amount: '', flow: 'in', description: '', source: '', execution_date: new Date().toISOString().slice(0, 10), division: '' });
      await load();
    } catch (e) { toast({ title: 'Could not record', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <WorkspacePageHeader title="Treasury" description="The association's cash-flow register. Entries cannot be deleted or edited — correct a mistake by adding a correction entry."
        actions={<Button className="font-body" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />New entry</Button>} />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="py-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Total balance</div>
          <div className={`font-serif text-2xl ${totalBalance < 0 ? 'text-destructive' : 'text-accent'}`}>{eur(totalBalance)}</div>
        </CardContent></Card>
        <Card><CardContent className="py-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Filtered net</div>
          <div className={`font-serif text-2xl ${filteredBalance < 0 ? 'text-destructive' : 'text-accent'}`}>{eur(filteredBalance)}</div>
        </CardContent></Card>
        <Card><CardContent className="py-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Inflows</div>
          <div className="font-serif text-2xl text-green-700">{eur(inflows)}</div>
        </CardContent></Card>
        <Card><CardContent className="py-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Outflows</div>
          <div className="font-serif text-2xl text-destructive">{eur(outflows)}</div>
        </CardContent></Card>
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-4 font-body">
        <div className="space-y-1">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Period</Label>
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All periods</SelectItem>
              {periods.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Division</Label>
          <Select value={divisionFilter} onValueChange={setDivisionFilter}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All divisions</SelectItem>
              <SelectItem value={NONE}>— Unassigned</SelectItem>
              {DIVISION_OPTIONS.map((d) => <SelectItem key={d} value={d}>{divisionLabels[d]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{filtered.length} of {entries.length} entries</span>
          <Button variant="outline" className="font-body" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-2" />Export CSV
          </Button>
        </div>
      </div>

      {loading ? <WorkspaceLoader /> : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">No entries match the current filter.</p></CardContent></Card>
      ) : (
        <div className="border border-separator overflow-x-auto">
          <table className="w-full text-left font-body text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-normal">Execution</th>
                <th className="px-3 py-2 font-normal">Description</th>
                <th className="px-3 py-2 font-normal">Source</th>
                <th className="px-3 py-2 font-normal">Division</th>
                <th className="px-3 py-2 font-normal">Semester</th>
                <th className="px-3 py-2 font-normal text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-t border-separator">
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(e.execution_date).toLocaleDateString()}</td>
                  <td className="px-3 py-2 text-foreground">{e.description}{e.is_auto && <span className="ml-2 text-xs text-muted-foreground inline-flex items-center"><Lock className="h-3 w-3 mr-1" />auto</span>}</td>
                  <td className="px-3 py-2">{e.source || '—'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{e.division ? divisionLabels[e.division] : '—'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{e.academic_semester || '—'}</td>
                  <td className={`px-3 py-2 text-right whitespace-nowrap ${Number(e.amount) < 0 ? 'text-destructive' : 'text-green-700'}`}>{eur(Number(e.amount))}</td>
                </tr>
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
            <div className="space-y-1">
              <Label>Division (optional)</Label>
              <Select value={form.division || NONE} onValueChange={(v) => setForm({ ...form, division: v === NONE ? '' : v as OrgDivision })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— Association-wide</SelectItem>
                  {DIVISION_OPTIONS.map((d) => <SelectItem key={d} value={d}>{divisionLabels[d]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
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
              You are recording {form.flow === 'out' ? 'an outflow of −' : 'an inflow of +'}€{form.amount || '0'}
              {form.division ? ` for ${divisionLabels[form.division]}` : ' (association-wide)'} — “{form.description}”.
              Treasury entries <strong>cannot be removed or edited later</strong>. Continue?
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
