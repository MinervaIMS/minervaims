import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2, Trash2, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import {
  listPerformances, upsertPerformance, deletePerformance,
  ACTIVE_FUND_LABELS, type ActiveFund, type FundPerformance,
} from '@/lib/funds-api';

const FUNDS: ActiveFund[] = ['long-short', 'multi-asset'];

const fmt = (n: number | null) => (n === null || n === undefined ? '-' : n.toString());
const pct = (n: number | null) => (n === null || n === undefined ? '-' : `${n}%`);
const monthLabel = (d: string) => new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'long' });

export default function FundsPerformances() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<FundPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [fund, setFund] = useState<ActiveFund>('long-short');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ period: new Date().toISOString().slice(0, 7), nav: '', monthly_return: '', ytd_return: '', notes: '' });

  const load = async () => {
    setLoading(true);
    try { setRows(await listPerformances()); }
    catch (e) { toast({ title: 'Failed to load', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setLoading(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const fundRows = useMemo(() => rows.filter((r) => r.fund === fund), [rows, fund]);

  const openAdd = () => { setForm({ period: new Date().toISOString().slice(0, 7), nav: '', monthly_return: '', ytd_return: '', notes: '' }); setDialogOpen(true); };
  const openEdit = (r: FundPerformance) => {
    setForm({ period: r.period_month.slice(0, 7), nav: r.nav?.toString() ?? '', monthly_return: r.monthly_return?.toString() ?? '', ytd_return: r.ytd_return?.toString() ?? '', notes: r.notes ?? '' });
    setDialogOpen(true);
  };

  const num = (s: string) => (s.trim() === '' ? null : Number(s));

  const save = async () => {
    if (!form.period) { toast({ title: 'Month is required', variant: 'destructive' }); return; }
    setBusy(true);
    try {
      await upsertPerformance(session, {
        fund, period_month: `${form.period}-01`,
        nav: num(form.nav), monthly_return: num(form.monthly_return), ytd_return: num(form.ytd_return), notes: form.notes || null,
      });
      toast({ title: 'Performance saved', description: 'It will appear on the public fund table.' });
      setDialogOpen(false);
      await load();
    } catch (e) { toast({ title: 'Could not save', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  const remove = async (r: FundPerformance) => {
    if (!confirm(`Delete ${monthLabel(r.period_month)} for ${ACTIVE_FUND_LABELS[r.fund]}?`)) return;
    try { await deletePerformance(session, r.id); await load(); toast({ title: 'Deleted' }); }
    catch (e) { toast({ title: 'Could not delete', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
  };

  return (
    <div>
      <WorkspacePageHeader
        title="Funds' performances"
        description="Upload monthly performance data for the active simulated funds. This feeds the public fund performance tables."
        actions={<Button className="font-body" onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Add month</Button>}
      />

      <div className="mb-6">
        <label className="font-body text-xs text-muted-foreground uppercase tracking-wider block mb-2">Fund</label>
        <Select value={fund} onValueChange={(v) => setFund(v as ActiveFund)}>
          <SelectTrigger className="min-w-[280px] font-body"><SelectValue /></SelectTrigger>
          <SelectContent>{FUNDS.map((f) => <SelectItem key={f} value={f}>{ACTIVE_FUND_LABELS[f]}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {loading ? <WorkspaceLoader /> : fundRows.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">No performance data yet for {ACTIVE_FUND_LABELS[fund]}.</p></CardContent></Card>
      ) : (
        <div className="border border-separator overflow-x-auto">
          <table className="w-full text-left font-body text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-normal">Month</th>
                <th className="px-3 py-2 font-normal">NAV</th>
                <th className="px-3 py-2 font-normal">Monthly return</th>
                <th className="px-3 py-2 font-normal">YTD return</th>
                <th className="px-3 py-2 font-normal">Notes</th>
                <th className="px-3 py-2 font-normal text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {fundRows.map((r) => (
                <tr key={r.id} className="border-t border-separator">
                  <td className="px-3 py-2 whitespace-nowrap text-foreground">{monthLabel(r.period_month)}</td>
                  <td className="px-3 py-2">{fmt(r.nav)}</td>
                  <td className="px-3 py-2">{pct(r.monthly_return)}</td>
                  <td className="px-3 py-2">{pct(r.ytd_return)}</td>
                  <td className="px-3 py-2 max-w-xs truncate">{r.notes || '-'}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="icon" onClick={() => openEdit(r)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="destructive" size="icon" onClick={() => remove(r)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">{ACTIVE_FUND_LABELS[fund]}</DialogTitle>
            <DialogDescription className="font-body">Adding a month that already exists updates it.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 font-body">
            <div className="space-y-1"><Label>Month *</Label><Input type="month" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1"><Label>NAV</Label><Input value={form.nav} onChange={(e) => setForm({ ...form, nav: e.target.value })} placeholder="100.0" /></div>
              <div className="space-y-1"><Label>Monthly %</Label><Input value={form.monthly_return} onChange={(e) => setForm({ ...form, monthly_return: e.target.value })} placeholder="1.2" /></div>
              <div className="space-y-1"><Label>YTD %</Label><Input value={form.ytd_return} onChange={(e) => setForm({ ...form, ytd_return: e.target.value })} placeholder="4.5" /></div>
            </div>
            <div className="space-y-1"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="flex gap-3 pt-1">
              <Button className="flex-1" onClick={save} disabled={busy}>{busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving</> : 'Save'}</Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
