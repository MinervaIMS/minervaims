import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Plus, Loader2, Trash2, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { MoreMenu } from '@/components/admin/kit/MoreMenu';
import { useConfirm } from '@/components/admin/kit/ConfirmDialog';
import {
  listFundYears, upsertFundYear, deleteFundYear, upsertFundProfile, listReferences, upsertReference,
  deleteReferenceMonths, importEstr, parseReferenceLines,
  MONTH_LABELS, formatFundValue, isValidFundValue,
  type FundYear, type RecordedFund, type ReferenceMeta, type ReferenceRow, type ReferenceSeries,
} from '@/lib/funds-api';
import { fetchFundRecords, refreshFundRecords } from '@/lib/fund-record-api';
import { fmtDate, fmtMonth, fmtPct, fmtRatio, fmtSignedPct, type FundsSnapshot, type FundProfile } from '@/lib/fund-record';
import { REPORT_FUND_LABELS } from '@/lib/report-meta';

// =====================================================================
// Fund Performances (Step 93).
// ---------------------------------------------------------------------
// Three tabs:
//   Monthly returns  the only figures typed. YTD, ITD, volatility and the
//                    Sharpe ratio beside them are computed from the months
//                    (public.fund_track_record), the same numbers the fund
//                    pages, the data files and the key numbers show.
//   Profiles         inception and, for a closed fund, end date and the
//                    reason; rebalancing, method and number of positions.
//   References       the market indices (net total return, EUR) and the
//                    €STR, typed month by month; the €STR fills itself
//                    from the ECB every morning (Step 93B), and can be
//                    filled at once from here. Nothing is scraped.
// =====================================================================

const FUNDS: RecordedFund[] = ['long-short', 'multi-asset', 'dps', 'pir'];
const CLOSED: RecordedFund[] = ['dps', 'pir'];
const emptyMonths = () => Array.from({ length: 12 }, () => '');

// Only the LAST 15 calendar months (up to the current month, future months
// included) of an ACTIVE fund stay editable; anything earlier is frozen
// history. A closed fund's history is typed once, so it is not frozen.
const EDITABLE_MONTHS_WINDOW = 15;
function monthIsLocked(fund: RecordedFund, year: number, monthIndex: number): boolean {
  if (!year || CLOSED.includes(fund)) return false;
  const now = new Date();
  const age = (now.getFullYear() * 12 + now.getMonth()) - (year * 12 + monthIndex);
  return age >= EDITABLE_MONTHS_WINDOW;
}
function yearIsLocked(fund: RecordedFund, year: number): boolean {
  if (!year) return false;
  return Array.from({ length: 12 }, (_, i) => i).every((i) => monthIsLocked(fund, year, i));
}

interface EditState { fund: RecordedFund; id: string | null; year: string; months: string[] }

export default function FundsPerformances() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<FundYear[]>([]);
  const [records, setRecords] = useState<FundsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('returns');
  // "Are you sure?" in the workspace's own window (Step 98).
  const { confirm: confirmAction, dialog: confirmDialog } = useConfirm();

  // The loader only on the first read: a reload after a save keeps the
  // page (and the tab) where it is.
  const load = async () => {
    refreshFundRecords();
    try {
      const [years, recs] = await Promise.all([listFundYears(), fetchFundRecords().catch(() => null)]);
      setRows(years);
      setRecords(recs);
    } catch (e) {
      toast({ title: 'Failed to load', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setLoading(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const byFund = useMemo(() => {
    const m: Record<RecordedFund, FundYear[]> = { 'long-short': [], 'multi-asset': [], dps: [], pir: [] };
    for (const r of rows) m[r.fund]?.push(r);
    for (const f of FUNDS) m[f].sort((a, b) => a.year - b.year);
    return m;
  }, [rows]);

  const computed = (fund: RecordedFund, year: number) => records?.funds[fund]?.record.years.find((y) => y.year === year);

  const openAdd = (fund: RecordedFund) => {
    const existing = byFund[fund].map((r) => r.year);
    const nextYear = existing.length ? Math.max(...existing) + 1 : new Date().getFullYear();
    setEdit({ fund, id: null, year: String(nextYear), months: emptyMonths() });
  };
  const openEdit = (r: FundYear) => setEdit({ fund: r.fund, id: r.id, year: String(r.year), months: [...r.months] });

  const save = async () => {
    if (!edit) return;
    const year = parseInt(edit.year, 10);
    if (!year || year < 2000 || year > 2100) { toast({ title: 'Enter a valid year', variant: 'destructive' }); return; }
    if (edit.months.some((v) => !isValidFundValue(v))) {
      toast({ title: 'Check the numbers', description: 'Some months are not valid numbers. Use digits only, e.g. 1.2 or -0.4.', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      // Only the months: the summary of the year is computed from them.
      await upsertFundYear(session, { fund: edit.fund, year, months: edit.months.map((m) => formatFundValue(m, 'signed-pct')) });
      toast({ title: 'Saved', description: 'The year-to-date, inception-to-date, volatility and Sharpe ratio are recomputed from the months.' });
      setEdit(null);
      await load();
    } catch (e) { toast({ title: 'Could not save', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  const remove = async (r: FundYear) => {
    if (!(await confirmAction({
      title: `Delete ${r.year} for the ${REPORT_FUND_LABELS[r.fund]}?`,
      body: <p>The year&rsquo;s months are deleted, and the year comes off the public fund table.</p>,
      action: 'Delete year',
    }))) return;
    try { await deleteFundYear(session, r.id); await load(); toast({ title: 'Deleted' }); }
    catch (e) { toast({ title: 'Could not delete', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
  };

  return (
    <div>
      {confirmDialog}
      <WorkspacePageHeader
        title="Fund Performances"
        description="Monthly returns of the virtual funds; every other figure is computed from them."
      />

      {loading ? <WorkspaceLoader /> : (
        <Tabs value={tab} onValueChange={setTab} className="font-body">
          <TabsList className="mb-6 max-w-full overflow-x-auto">
            <TabsTrigger value="returns">Monthly returns</TabsTrigger>
            <TabsTrigger value="profiles">Profiles</TabsTrigger>
            <TabsTrigger value="references">References</TabsTrigger>
          </TabsList>

          <TabsContent value="returns">
            <div className="space-y-10">
              {FUNDS.map((fund) => (
                <section key={fund}>
                  <div className="flex items-center justify-between mb-3 gap-3">
                    <h2 className="font-serif text-xl text-accent">
                      {REPORT_FUND_LABELS[fund]}{CLOSED.includes(fund) && <span className="ml-2 font-body text-xs uppercase tracking-wider text-muted-foreground">Closed</span>}
                    </h2>
                    <Button variant="outline" size="sm" className="h-11 lg:h-9" onClick={() => openAdd(fund)}><Plus className="h-4 w-4 mr-2" />Add year</Button>
                  </div>
                  {CLOSED.includes(fund) && (
                    <p className="text-xs text-muted-foreground mb-3">
                      Shown on the fund page once its monthly returns are here and its start and end dates are set in Profiles.
                    </p>
                  )}
                  {byFund[fund].length === 0 ? (
                    <Card><CardContent className="py-10 text-center"><p className="font-body text-muted-foreground">No monthly returns yet.</p></CardContent></Card>
                  ) : (
                    <div className="max-w-full border border-separator overflow-x-auto">
                      {/* A TRUE GRID: twelve months and four figures a year, so it
                          keeps its columns and scrolls sideways. The year stays
                          on the left and the actions on the right while the
                          months move between them (Step 98). */}
                      <table className="w-full text-left font-body text-sm min-w-[1000px]">
                        <thead className="bg-muted/40 text-muted-foreground">
                          <tr>
                            <th className="sticky left-0 z-10 bg-muted px-2 py-2 font-normal text-center shadow-[1px_0_0_hsl(var(--separator))]">Year</th>
                            {MONTH_LABELS.map((m) => <th key={m} className="px-2 py-2 font-normal text-center">{m}</th>)}
                            <th className="px-2 py-2 font-normal text-center" title="Computed from the months">YTD</th>
                            <th className="px-2 py-2 font-normal text-center" title="Computed from the months">ITD</th>
                            <th className="px-2 py-2 font-normal text-center" title="Computed from the months">Vol</th>
                            <th className="px-2 py-2 font-normal text-center" title="Computed from the months and the €STR">Sharpe</th>
                            <th className="sticky right-0 z-10 bg-muted px-2 py-2 font-normal text-right shadow-[-1px_0_0_hsl(var(--separator))]">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {byFund[fund].map((r) => {
                            const c = computed(fund, r.year);
                            return (
                              <tr key={r.id} className="border-t border-separator">
                                <td className="sticky left-0 z-[1] bg-background px-2 py-2 text-center text-accent shadow-[1px_0_0_hsl(var(--separator))]">{r.year}</td>
                                {r.months.map((v, i) => <td key={i} className="px-2 py-2 text-center whitespace-nowrap">{formatFundValue(v, 'signed-pct') || ''}</td>)}
                                <td className="px-2 py-2 text-center bg-muted/30">{c ? fmtSignedPct(c.ytd) : '-'}</td>
                                <td className="px-2 py-2 text-center bg-muted/30">{c ? fmtPct(c.itd) : '-'}</td>
                                <td className="px-2 py-2 text-center bg-muted/30">{c ? fmtPct(c.vol) || '-' : '-'}</td>
                                <td className="px-2 py-2 text-center bg-muted/30">{c ? fmtRatio(c.sharpe) || '-' : '-'}</td>
                                <td className="sticky right-0 z-[1] bg-background px-2 py-2 text-right shadow-[-1px_0_0_hsl(var(--separator))]">
                                  {yearIsLocked(fund, r.year) ? (
                                    <span className="text-xs text-muted-foreground pr-1">Frozen</span>
                                  ) : (
                                    <div className="flex gap-2 justify-end">
                                      <Button variant="outline" size="icon" className="h-11 w-11 lg:h-10 lg:w-10" onClick={() => openEdit(r)} aria-label={`Edit ${r.year}`}><Pencil className="h-4 w-4" /></Button>
                                      <MoreMenu
                                        label={`More actions for ${r.year}`}
                                        title={`${REPORT_FUND_LABELS[r.fund]}, ${r.year}`}
                                        triggerClassName="lg:h-10 lg:w-10"
                                        actions={[{ key: 'delete', label: `Delete ${r.year}`, icon: Trash2, destructive: true, onSelect: () => remove(r) }]}
                                      />
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              ))}
              <p className="text-xs text-muted-foreground">
                YTD, ITD, Vol and Sharpe (shaded) are computed from the monthly returns: compounded, annualised from the year&apos;s months, and, for a full year with the €STR recorded, the Sharpe ratio. They are the figures the website shows.
                {records ? '' : ' They will appear once the database has been updated for this version.'}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="profiles" className="ws-form-touch">
            <ProfilesTab records={records} onSaved={load} />
          </TabsContent>

          <TabsContent value="references" className="ws-form-touch">
            <ReferencesTab onChanged={load} />
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-2xl max-h-[92dvh] overflow-y-auto ws-form-touch">
          <DialogHeader>
            <DialogTitle className="font-serif">{edit && REPORT_FUND_LABELS[edit.fund]}</DialogTitle>
            <DialogDescription className="font-body">
              Type the monthly returns, net, in %. The year&apos;s summary is computed from them.
            </DialogDescription>
          </DialogHeader>
          {edit && (
            <div className="space-y-4 font-body">
              <div className="space-y-1 max-w-[10rem]"><Label>Year</Label><Input value={edit.year} onChange={(e) => setEdit({ ...edit, year: e.target.value })} placeholder="e.g. 2026" disabled={!!edit.id} /></div>
              <div>
                <Label className="mb-2 block">Monthly returns</Label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {MONTH_LABELS.map((m, i) => {
                    const locked = monthIsLocked(edit.fund, parseInt(edit.year, 10) || 0, i);
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
                  {CLOSED.includes(edit.fund)
                    ? 'A closed fund\'s history can be typed in full.'
                    : `Only the last ${EDITABLE_MONTHS_WINDOW} months are editable; earlier months are frozen history.`}
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

// ── Profiles ────────────────────────────────────────────────────────────

function ProfilesTab({ records, onSaved }: { records: FundsSnapshot | null; onSaved: () => void }) {
  if (!records) {
    return <p className="font-body text-muted-foreground">The profiles appear once the database has been updated for this version.</p>;
  }
  return (
    <div className="space-y-8">
      {FUNDS.map((fund) => <ProfileForm key={fund} fund={fund} profile={records.funds[fund]?.profile ?? null} onSaved={onSaved} />)}
    </div>
  );
}

function ProfileForm({ fund, profile, onSaved }: { fund: RecordedFund; profile: FundProfile | null; onSaved: () => void }) {
  const { session } = useAuth();
  const { toast } = useToast();
  const closed = CLOSED.includes(fund);
  const [f, setF] = useState({
    inception_date: profile?.inception_date ?? '',
    end_date: profile?.end_date ?? '',
    closing_reason: profile?.closing_reason ?? '',
    rebalancing_policy: profile?.rebalancing_policy ?? '',
    methodology: profile?.methodology ?? '',
    positions_count: profile?.positions_count != null ? String(profile.positions_count) : '',
    positions_as_of: profile?.positions_as_of ?? '',
  });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    const positions = f.positions_count.trim() === '' ? null : Number(f.positions_count);
    if (positions !== null && (!Number.isInteger(positions) || positions < 0)) { toast({ title: 'Positions must be a whole number', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      await upsertFundProfile(session, {
        fund,
        inception_date: f.inception_date || null,
        ...(closed ? { end_date: f.end_date || null, closing_reason: f.closing_reason.trim() } : {}),
        rebalancing_policy: f.rebalancing_policy.trim(),
        methodology: f.methodology.trim(),
        positions_count: positions,
        positions_as_of: f.positions_as_of || null,
      });
      toast({ title: 'Profile saved', description: `${REPORT_FUND_LABELS[fund]}: shown on its page.` });
      onSaved();
    } catch (e) { toast({ title: 'Could not save', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setSaving(false); }
  };
  return (
    <section className="border border-separator p-4 space-y-4">
      <h2 className="font-serif text-xl text-accent">{REPORT_FUND_LABELS[fund]}{closed && <span className="ml-2 font-body text-xs uppercase tracking-wider text-muted-foreground">Closed</span>}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="space-y-1"><Label>Inception</Label><Input type="date" value={f.inception_date} onChange={(e) => setF({ ...f, inception_date: e.target.value })} /></div>
        {closed && <div className="space-y-1"><Label>Closed on</Label><Input type="date" value={f.end_date} onChange={(e) => setF({ ...f, end_date: e.target.value })} /></div>}
        <div className="space-y-1"><Label>Positions</Label><Input inputMode="numeric" value={f.positions_count} onChange={(e) => setF({ ...f, positions_count: e.target.value })} placeholder="e.g. 80" /></div>
        <div className="space-y-1"><Label>Positions as of</Label><Input type="date" value={f.positions_as_of} onChange={(e) => setF({ ...f, positions_as_of: e.target.value })} /></div>
      </div>
      {closed && (
        <div className="space-y-1"><Label>Why it closed (optional)</Label><Input value={f.closing_reason} maxLength={600} onChange={(e) => setF({ ...f, closing_reason: e.target.value })} /></div>
      )}
      <div className="space-y-1"><Label>Rebalancing</Label><Textarea rows={2} maxLength={600} value={f.rebalancing_policy} onChange={(e) => setF({ ...f, rebalancing_policy: e.target.value })} /></div>
      <div className="space-y-1"><Label>Method</Label><Textarea rows={4} maxLength={2000} value={f.methodology} onChange={(e) => setF({ ...f, methodology: e.target.value })} /></div>
      <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save profile'}</Button>
    </section>
  );
}

// ── References ──────────────────────────────────────────────────────────

function ReferencesTab({ onChanged }: { onChanged: () => void }) {
  const { session } = useAuth();
  const { toast } = useToast();
  const [meta, setMeta] = useState<ReferenceMeta[]>([]);
  const [rows, setRows] = useState<ReferenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [series, setSeries] = useState<ReferenceSeries>('euro_stoxx_50');
  const [text, setText] = useState('');
  const [source, setSource] = useState('');
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const { confirm: confirmAction, dialog: confirmDialog } = useConfirm();

  const load = async () => {
    try { const r = await listReferences(session); setMeta(r.meta); setRows(r.rows); }
    catch (e) { toast({ title: 'Could not load the references', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setLoading(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const fromEcb = async () => {
    setImporting(true);
    try {
      const r = await importEstr(session);
      toast({ title: `€STR: ${r.filled} ${r.filled === 1 ? 'month' : 'months'} filled from the ECB`, description: `${fmtMonth(r.from)} to ${fmtMonth(r.to)}. ${r.kept} already recorded, kept as they were.` });
      await load(); onChanged();
    } catch (e) { toast({ title: 'The ECB could not be read', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setImporting(false); }
  };

  const save = async () => {
    const { rows: parsed, bad } = parseReferenceLines(text);
    if (bad.length) { toast({ title: `${bad.length} ${bad.length === 1 ? 'line' : 'lines'} not understood`, description: `Write "YYYY-MM value" per line, e.g. 2024-03 1.25. First: ${bad[0]}`, variant: 'destructive' }); return; }
    if (!parsed.length) { toast({ title: 'Type at least one month', variant: 'destructive' }); return; }
    if (!source.trim()) { toast({ title: 'Say where the values come from', description: 'For example the index provider and the series name.', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      await upsertReference(session, { series, source: source.trim(), as_of: asOf || null, rows: parsed });
      toast({ title: `${parsed.length} ${parsed.length === 1 ? 'month' : 'months'} saved` });
      setText(''); await load(); onChanged();
    } catch (e) { toast({ title: 'Could not save', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const removeMonth = async (r: ReferenceRow) => {
    const month = r.month.slice(0, 7);
    if (!(await confirmAction({
      title: `Remove ${fmtMonth(month)} from this series?`,
      body: <p>The value ({r.value}) is removed from the series. It is kept in the activity log.</p>,
      action: 'Remove month',
    }))) return;
    try { await deleteReferenceMonths(session, r.series, [month]); await load(); onChanged(); }
    catch (e) { toast({ title: 'Could not remove', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
  };

  if (loading) return <WorkspaceLoader />;
  const bySeries = (s: ReferenceSeries) => rows.filter((r) => r.series === s);
  const current = meta.find((m) => m.series === series);

  return (
    <div className="space-y-8">
      {confirmDialog}
      <p className="text-sm text-muted-foreground max-w-3xl">
        Market indices are typed by the Portfolio Management team as monthly returns in % (net total return, in EUR); only the beta and correlation computed from them are published, never the index values. The €STR is the risk-free rate of the Sharpe ratio, as a monthly average in % a year.
      </p>

      <div className="border border-separator overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr><th className="text-left px-3 py-2 font-normal">Series</th><th className="text-left px-3 py-2 font-normal">Months recorded</th><th className="text-left px-3 py-2 font-normal">From</th><th className="text-left px-3 py-2 font-normal">To</th><th className="text-left px-3 py-2 font-normal">Source</th></tr>
          </thead>
          <tbody>
            {meta.map((m) => {
              const list = bySeries(m.series);
              return (
                <tr key={m.series} className="border-t border-separator">
                  <td className="px-3 py-2">{m.label}<span className="block text-xs text-muted-foreground">{m.variant}{m.currency ? `, ${m.currency}` : ''}</span></td>
                  <td className="px-3 py-2">{list.length}</td>
                  <td className="px-3 py-2">{list.length ? fmtMonth(list[0].month) : '-'}</td>
                  <td className="px-3 py-2">{list.length ? fmtMonth(list[list.length - 1].month) : '-'}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{[...new Set(list.map((r) => r.source).filter(Boolean))].join('; ') || '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <section className="border border-separator p-4 space-y-3">
        <h2 className="font-serif text-xl text-accent">€STR from the ECB</h2>
        <p className="text-sm text-muted-foreground">
          Filled automatically: every morning the workspace adds the last complete month (from the 4th of the next month) with the average of the ECB&apos;s daily €STR, and the Sharpe ratios on the website follow. Before October 2019 it uses the EONIA less 8.5 basis points, as the ECB converts it. A month already recorded, or typed here, is never replaced. The button fills any missing month at once.
        </p>
        <Button onClick={fromEcb} disabled={importing}>{importing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Reading the ECB</> : 'Fill the €STR from the ECB now'}</Button>
      </section>

      <section className="border border-separator p-4 space-y-3">
        <h2 className="font-serif text-xl text-accent">Type months</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label htmlFor="ref-series">Series</Label>
            <select id="ref-series" value={series} onChange={(e) => setSeries(e.target.value as ReferenceSeries)} className="bg-background border border-separator px-3 h-10 w-full">
              {meta.map((m) => <option key={m.series} value={m.series}>{m.label}</option>)}
            </select>
          </div>
          <div className="space-y-1"><Label htmlFor="ref-source">Source</Label><Input id="ref-source" value={source} maxLength={300} onChange={(e) => setSource(e.target.value)} placeholder="e.g. STOXX, EURO STOXX 50 Net Return EUR" /></div>
          <div className="space-y-1"><Label htmlFor="ref-asof">As of</Label><Input id="ref-asof" type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} /></div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="ref-lines">{current?.kind === 'risk_free' ? 'Month and rate in % a year, one per line' : 'Month and return in %, one per line'}</Label>
          <Textarea id="ref-lines" rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder={'2024-01 2.15\n2024-02 -0.84'} className="font-mono text-sm" />
          <p className="text-xs text-muted-foreground">A month typed again replaces its value. Pasting two columns from a spreadsheet works.</p>
        </div>
        <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save months'}</Button>
        {bySeries(series).length > 0 && (
          <div className="pt-2">
            <p className="text-xs text-muted-foreground mb-2">Last months of {current?.label}</p>
            <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {bySeries(series).slice(-12).reverse().map((r) => (
                <li key={r.month} className="flex items-center justify-between border border-separator px-2 py-1 text-sm">
                  <span>{fmtMonth(r.month)}: {r.value}</span>
                  <button type="button" className="inline-flex h-11 w-11 lg:h-auto lg:w-auto items-center justify-center text-muted-foreground hover:text-destructive" onClick={() => removeMonth(r)} aria-label={`Remove ${fmtMonth(r.month)}`}><Trash2 className="h-3.5 w-3.5" /></button>
                </li>
              ))}
            </ul>
            {bySeries(series)[0]?.as_of && <p className="text-xs text-muted-foreground mt-2">Values as of {fmtDate(bySeries(series)[bySeries(series).length - 1].as_of)}.</p>}
          </div>
        )}
      </section>
    </div>
  );
}
