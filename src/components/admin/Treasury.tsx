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
import { Plus, Lock, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { listTreasury, addTreasuryEntry, type TreasuryEntry } from '@/lib/ops-api';

const eur = (n: number) => `€${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Treasury() {
  const { session } = useAuth();
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

  const submit = async () => {
    const amt = Number(form.amount);
    if (!amt || amt <= 0) { toast({ title: 'Enter a positive amount', variant: 'destructive' }); return; }
    if (!form.description.trim()) { toast({ title: 'A description is required', variant: 'destructive' }); return; }
    setBusy(true);
    try {
      await addTreasuryEntry(session, { amount: amt, flow: form.flow, description: form.description.trim(), source: form.source || null, execution_date: form.execution_date });
      toast({ title: 'Entry recorded' });
      setConfirmOpen(false); setDialogOpen(false);
      setForm({ amount: '', flow: 'in', description: '', source: '', execution_date: new Date().toISOString().slice(0, 10) });
      await load();
    } catch (e) { toast({ title: 'Could not record', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <WorkspacePageHeader title="Treasury" description="The association's cash-flow register. Entries cannot be deleted or edited — correct a mistake by adding a correction entry."
        actions={<Button className="font-body" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />New entry</Button>} />

      <Card className="mb-6 max-w-xs"><CardContent className="py-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Current balance</div>
        <div className={`font-serif text-2xl ${balance < 0 ? 'text-destructive' : 'text-accent'}`}>{eur(balance)}</div>
      </CardContent></Card>

      {loading ? <WorkspaceLoader /> : entries.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">No entries yet.</p></CardContent></Card>
      ) : (
        <div className="border border-separator overflow-x-auto">
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
              {entries.map((e) => (
                <tr key={e.id} className="border-t border-separator">
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(e.execution_date).toLocaleDateString()}</td>
                  <td className="px-3 py-2 text-foreground">{e.description}{e.is_auto && <span className="ml-2 text-xs text-muted-foreground inline-flex items-center"><Lock className="h-3 w-3 mr-1" />auto</span>}</td>
                  <td className="px-3 py-2">{e.source || '—'}</td>
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
              You are recording {form.flow === 'out' ? 'an outflow of −' : 'an inflow of +'}€{form.amount || '0'} — “{form.description}”. Treasury entries <strong>cannot be removed or edited later</strong>. Continue?
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
