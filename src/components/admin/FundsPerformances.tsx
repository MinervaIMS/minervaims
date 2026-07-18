import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Plus, Loader2, Trash2, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { logActivity } from '@/lib/activity-log';
import { useAccess } from '@/hooks/useAccess';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import {
  listFundYears, upsertFundYear, deleteFundYear,
  ACTIVE_FUND_LABELS, MONTH_LABELS, formatFundValue, isValidFundValue, type ActiveFund, type FundYear,
} from '@/lib/funds-api';

const FUNDS: ActiveFund[] = ['long-short', 'multi-asset'];
const emptyMonths = () => Array.from({ length: 12 }, () => '');

// Only the LAST 15 calendar months (up to the current month, future months
// included) stay editable; anything earlier is frozen history.
const EDITABLE_MONTHS_WINDOW = 15;
function monthIsLocked(year: number, monthIndex: number): boolean {
  if (!year) return false;
  const now = new Date();
  const age = (now.getFullYear() * 12 + now.getMonth()) - (year * 12 + monthIndex);
  return age >= EDITABLE_MONTHS_WINDOW;
}
// Once EVERY month of a year is frozen, its aggregates (ITD, YTD, Vol,
// Sharpe) freeze with it: the whole year is closed history.
function yearIsLocked(year: number): boolean {
  if (!year) return false;
  return Array.from({ length: 12 }, (_, i) => i).every((i) => monthIsLocked(year, i));
}

interface EditState {
  fund: ActiveFund;
  id: string | null;
  year: string;
  itd: string;
  months: string[];
  ytd: string;
  vol: string;
  sharpe: string;
}

export default function FundsPerformances() {
  const { session } = useAuth();
  const { primaryRole } = useAccess();
  const { toast } = useToast();
  const [rows, setRows] = useState<FundYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setRows(await listFundYears()); }
    catch (e) { toast({ title: 'Failed to load', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setLoading(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const byFund = useMemo(() => {
    const m: Record<ActiveFund, FundYear[]> = { 'long-short': [], 'multi-asset': [] };
    for (const r of rows) m[r.fund]?.push(r);
    for (const f of FUNDS) m[f].sort((a, b) => a.year - b.year);
    return m;
  }, [rows]);

  const openAdd = (fund: ActiveFund) => {
    const existing = byFund[fund].map((r) => r.year);
    const nextYear = existing.length ? Math.max(...existing) + 1 : new Date().getFullYear();
    setEdit({ fund, id: null, year: String(nextYear), itd: '', months: emptyMonths(), ytd: '', vol: '', sharpe: '' });
  };
  const openEdit = (r: FundYear) => {
    setEdit({ fund: r.fund, id: r.id, year: String(r.year), itd: r.itd, months: [...r.months], ytd: r.ytd, vol: r.vol, sharpe: r.sharpe });
  };

  const save = async () => {
    if (!edit) return;
    const year = parseInt(edit.year, 10);
    if (!year || year < 2000 || year > 2100) { toast({ title: 'Enter a valid year', variant: 'destructive' }); return; }

    // Guard: every non-empty cell must be a number. Reject anything that cannot
    // be parsed (e.g. a stray letter) before it can reach the public table.
    const invalid = [edit.itd, edit.ytd, edit.vol, edit.sharpe, ...edit.months].some((v) => !isValidFundValue(v));
    if (invalid) {
      toast({ title: 'Check the numbers', description: 'Some cells are not valid numbers. Use digits only, e.g. 1.2 or -0.4.', variant: 'destructive' });
      return;
    }

    // Normalise every value to its canonical format before saving, so the data
    // stored (and shown on the public fund page) is always consistent.
    setBusy(true);
    try {
      await upsertFundYear(session, {
        fund: edit.fund, year,
        itd: formatFundValue(edit.itd, 'pct'),
        months: edit.months.map((m) => formatFundValue(m, 'signed-pct')),
        ytd: formatFundValue(edit.ytd, 'signed-pct'),
        vol: formatFundValue(edit.vol, 'pct'),
        sharpe: formatFundValue(edit.sharpe, 'ratio'),
      });
      logActivity(session, primaryRole, { action: 'update', section: 'Reports', subsection: 'Fund performances', entityType: 'fund_year', entityName: 'Fund performance data' });
      toast({ title: 'Saved', description: 'The public fund table now shows this data.' });
      setEdit(null);
      await load();
    } catch (e) { toast({ title: 'Could not save', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  const remove = async (r: FundYear) => {
    if (!confirm(`Delete ${r.year} for ${ACTIVE_FUND_LABELS[r.fund]}? This also removes it from the public fund table.`)) return;
    try { await deleteFundYear(session, r.id); await load(); toast({ title: 'Deleted' }); }
    catch (e) { toast({ title: 'Could not delete', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
  };

  return (
    <div>
      <WorkspacePageHeader
        title="Fund performances"
        description="Update the monthly performance of the active simulated funds. Both fund tables are shown together and mirror the tables on the public fund pages: any change here appears there immediately. Enter each value exactly as it should read on the site (for example +1.2% or -0.4%)."
      />

      {loading ? <WorkspaceLoader /> : (
        <div className="space-y-10">
          {FUNDS.map((fund) => (
            <section key={fund}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-serif text-xl text-accent">{ACTIVE_FUND_LABELS[fund]}</h2>
                <Button variant="outline" size="sm" onClick={() => openAdd(fund)}><Plus className="h-4 w-4 mr-2" />Add year</Button>
              </div>
              {byFund[fund].length === 0 ? (
                <Card><CardContent className="py-10 text-center"><p className="font-body text-muted-foreground">No performance data yet.</p></CardContent></Card>
              ) : (
                <div className="border border-separator overflow-x-auto">
                  <table className="w-full text-left font-body text-sm min-w-[960px]">
                    <thead className="bg-muted/40 text-muted-foreground">
                      <tr>
                        <th className="px-2 py-2 font-normal text-center">Year</th>
                        <th className="px-2 py-2 font-normal text-center">ITD</th>
                        {MONTH_LABELS.map((m) => <th key={m} className="px-2 py-2 font-normal text-center">{m}</th>)}
                        <th className="px-2 py-2 font-normal text-center">YTD</th>
                        <th className="px-2 py-2 font-normal text-center">Vol</th>
                        <th className="px-2 py-2 font-normal text-center">Sharpe</th>
                        <th className="px-2 py-2 font-normal text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byFund[fund].map((r) => (
                        <tr key={r.id} className="border-t border-separator">
                          <td className="px-2 py-2 text-center text-accent">{r.year}</td>
                          <td className="px-2 py-2 text-center">{formatFundValue(r.itd, 'pct') || '-'}</td>
                          {r.months.map((v, i) => <td key={i} className="px-2 py-2 text-center whitespace-nowrap">{formatFundValue(v, 'signed-pct') || ''}</td>)}
                          <td className="px-2 py-2 text-center">{formatFundValue(r.ytd, 'signed-pct') || '-'}</td>
                          <td className="px-2 py-2 text-center">{formatFundValue(r.vol, 'pct') || '-'}</td>
                          <td className="px-2 py-2 text-center">{formatFundValue(r.sharpe, 'ratio') || '-'}</td>
                          <td className="px-2 py-2 text-right">
                            {yearIsLocked(r.year) ? (
                              <span className="text-xs text-muted-foreground pr-1">Frozen</span>
                            ) : (
                              <div className="flex gap-2 justify-end">
                                <Button variant="outline" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                                <Button variant="destructive" size="icon" onClick={() => remove(r)}><Trash2 className="h-4 w-4" /></Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif">{edit && ACTIVE_FUND_LABELS[edit.fund]}</DialogTitle>
            <DialogDescription className="font-body">
              {edit?.id ? 'Update this year. Add the latest month to publish it on the public fund table.' : 'Add a new year. Fill in the months as they are reported.'}
            </DialogDescription>
          </DialogHeader>
          {edit && (
            <div className="space-y-4 font-body">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1"><Label>Year</Label><Input value={edit.year} onChange={(e) => setEdit({ ...edit, year: e.target.value })} placeholder="e.g. 2026" disabled={!!edit.id} /></div>
                <div className="space-y-1"><Label>ITD</Label><Input value={edit.itd} disabled={yearIsLocked(parseInt(edit.year, 10) || 0)} onChange={(e) => setEdit({ ...edit, itd: e.target.value })} onBlur={() => setEdit((s) => (s ? { ...s, itd: formatFundValue(s.itd, 'pct') } : s))} placeholder="e.g. 52.8%" /></div>
                <div className="space-y-1"><Label>YTD</Label><Input value={edit.ytd} disabled={yearIsLocked(parseInt(edit.year, 10) || 0)} onChange={(e) => setEdit({ ...edit, ytd: e.target.value })} onBlur={() => setEdit((s) => (s ? { ...s, ytd: formatFundValue(s.ytd, 'signed-pct') } : s))} placeholder="e.g. +8.0%" /></div>
                <div className="space-y-1"><Label>Vol</Label><Input value={edit.vol} disabled={yearIsLocked(parseInt(edit.year, 10) || 0)} onChange={(e) => setEdit({ ...edit, vol: e.target.value })} onBlur={() => setEdit((s) => (s ? { ...s, vol: formatFundValue(s.vol, 'pct') } : s))} placeholder="e.g. 5.5%" /></div>
              </div>
              <div className="space-y-1 max-w-[8rem]"><Label>Sharpe</Label><Input value={edit.sharpe} disabled={yearIsLocked(parseInt(edit.year, 10) || 0)} onChange={(e) => setEdit({ ...edit, sharpe: e.target.value })} onBlur={() => setEdit((s) => (s ? { ...s, sharpe: formatFundValue(s.sharpe, 'ratio') } : s))} placeholder="e.g. 1.20" /></div>
              {yearIsLocked(parseInt(edit.year, 10) || 0) && (
                <p className="text-xs text-muted-foreground">
                  Every month of this year is older than {EDITABLE_MONTHS_WINDOW} months, so the whole year, aggregates included, is frozen history.
                </p>
              )}
              <div>
                <Label className="mb-2 block">Monthly returns</Label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {MONTH_LABELS.map((m, i) => {
                    const locked = monthIsLocked(parseInt(edit.year, 10) || 0, i);
                    return (
                      <div key={m} className="space-y-1">
                        <span className="text-xs text-muted-foreground">{m}</span>
                        <Input
                          value={edit.months[i]}
                          disabled={locked}
                          title={locked ? 'Months older than 15 months are frozen history and cannot be edited.' : undefined}
                          onChange={(e) => { const months = [...edit.months]; months[i] = e.target.value; setEdit({ ...edit, months }); }}
                          onBlur={() => setEdit((s) => { if (!s) return s; const months = [...s.months]; months[i] = formatFundValue(months[i], 'signed-pct'); return { ...s, months }; })}
                          placeholder="+0.0%"
                        />
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Only the last {EDITABLE_MONTHS_WINDOW} months are editable; earlier months are frozen history.
                </p>
              </div>
              <div className="flex gap-3 pt-1">
                <Button className="flex-1" onClick={save} disabled={busy}>{busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving</> : 'Save'}</Button>
                <Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
