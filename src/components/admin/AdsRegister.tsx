import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Loader2, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { logActivity } from '@/lib/activity-log';
import { useAccess } from '@/hooks/useAccess';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { listAds, saveAd, type AdEntry, type AdInput } from '@/lib/smm-api';

const eur = (n: number) => `€${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function semesterOf(dateStr: string | null): { label: string; sort: number } {
  if (!dateStr) return { label: 'Undated', sort: -1 };
  const d = new Date(dateStr); const m = d.getMonth() + 1; const y = d.getFullYear();
  if (m >= 9 || m === 1) { const yr = m === 1 ? y - 1 : y; return { label: `Sep ${yr} - Jan ${yr + 1}`, sort: yr * 10 + 2 }; }
  return { label: `Feb ${y} - Aug ${y}`, sort: y * 10 + 1 };
}

export default function AdsRegister() {
  const { session } = useAuth();
  const { primaryRole } = useAccess();
  const { toast } = useToast();
  const [ads, setAds] = useState<AdEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ content: '', platform: '', ad_date: '', amount: '', campaign_purpose: '', effectiveness_notes: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setAds(await listAds(session)); }
    catch (e) { toast({ title: 'Failed to load', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setLoading(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const currentLabel = useMemo(() => semesterOf(new Date().toISOString().slice(0, 10)).label, []);

  // Group by semester, newest first; each group carries its own total.
  const groups = useMemo(() => {
    const map = new Map<string, { label: string; sort: number; rows: AdEntry[]; total: number }>();
    for (const a of ads) {
      const s = semesterOf(a.ad_date);
      const g = map.get(s.label) ?? { label: s.label, sort: s.sort, rows: [], total: 0 };
      g.rows.push(a); g.total += Number(a.amount || 0);
      map.set(s.label, g);
    }
    return [...map.values()].sort((a, b) => b.sort - a.sort);
  }, [ads]);

  const grandTotal = useMemo(() => ads.reduce((s, a) => s + Number(a.amount || 0), 0), [ads]);

  const openCreate = () => { setEditingId(null); setForm({ content: '', platform: '', ad_date: '', amount: '', campaign_purpose: '', effectiveness_notes: '' }); setDialogOpen(true); };
  const openEdit = (a: AdEntry) => {
    setEditingId(a.id);
    setForm({ content: a.content, platform: a.platform ?? '', ad_date: a.ad_date ?? '', amount: a.amount?.toString() ?? '', campaign_purpose: a.campaign_purpose ?? '', effectiveness_notes: a.effectiveness_notes ?? '' });
    setDialogOpen(true);
  };

  const requestSave = () => {
    if (!form.content.trim()) { toast({ title: 'Describe the promoted content', variant: 'destructive' }); return; }
    if (editingId) { doSave(); return; } // editing does not touch the Treasury
    setConfirmOpen(true);
  };

  const doSave = async () => {
    setSaving(true);
    try {
      const payload: AdInput = {
        id: editingId ?? undefined, content: form.content.trim(), platform: form.platform || null,
        ad_date: form.ad_date || null, amount: form.amount.trim() === '' ? null : Number(form.amount),
        campaign_purpose: form.campaign_purpose || null, effectiveness_notes: form.effectiveness_notes || null,
      };
      await saveAd(session, payload);
      logActivity(session, primaryRole, { action: editingId ? 'update' : 'create', section: 'Media & Communication', subsection: 'Ads & spending', entityType: 'ad', entityName: form.content.slice(0, 80), details: { amount: form.amount || null, platform: form.platform || null } });
      toast({ title: editingId ? 'Updated' : 'Entry added', description: editingId ? undefined : 'The amount was posted to the Treasury.' });
      setConfirmOpen(false); setDialogOpen(false); await load();
    } catch (e) { toast({ title: 'Could not save', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <WorkspacePageHeader title="Ads & spending register" description="Record paid advertising - content, platform, date, amount, purpose and notes on whether it worked. Each amount is posted once to the Treasury on the date the expense was incurred. Entries can be added but not deleted."
        actions={<Button className="font-body" onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add entry</Button>} />

      <Card className="mb-6 max-w-xs"><CardContent className="py-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Total spent (all time)</div>
        <div className="font-serif text-2xl text-accent">{eur(grandTotal)}</div>
      </CardContent></Card>

      {loading ? <WorkspaceLoader /> : ads.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">No paid advertising recorded yet.</p></CardContent></Card>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => {
            const isCurrent = g.label === currentLabel;
            const table = (
              <div className="border border-separator overflow-x-auto">
                <table className="w-full text-left font-body text-sm">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-normal">Date</th>
                      <th className="px-3 py-2 font-normal">Content</th>
                      <th className="px-3 py-2 font-normal">Platform</th>
                      <th className="px-3 py-2 font-normal text-right">Amount</th>
                      <th className="px-3 py-2 font-normal">Purpose</th>
                      <th className="px-3 py-2 font-normal">Effectiveness</th>
                      <th className="px-3 py-2 font-normal text-right">Edit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.rows.map((a) => (
                      <tr key={a.id} className="border-t border-separator">
                        <td className="px-3 py-2 whitespace-nowrap">{a.ad_date ? new Date(a.ad_date).toLocaleDateString() : '-'}</td>
                        <td className="px-3 py-2 text-foreground">{a.content}</td>
                        <td className="px-3 py-2">{a.platform || '-'}</td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">{a.amount != null ? eur(Number(a.amount)) : '-'}</td>
                        <td className="px-3 py-2">{a.campaign_purpose || '-'}</td>
                        <td className="px-3 py-2 max-w-xs truncate">{a.effectiveness_notes || '-'}</td>
                        <td className="px-3 py-2 text-right"><Button variant="outline" size="icon" onClick={() => openEdit(a)}><Pencil className="h-4 w-4" /></Button></td>
                      </tr>
                    ))}
                    <tr className="border-t border-separator bg-muted/20">
                      <td className="px-3 py-2 font-medium text-foreground" colSpan={3}>Semester total</td>
                      <td className="px-3 py-2 text-right font-medium text-accent whitespace-nowrap">{eur(g.total)}</td>
                      <td colSpan={3}></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
            return isCurrent ? (
              <div key={g.label}>
                <h3 className="font-serif text-lg text-accent mb-2">{g.label} <span className="text-xs text-muted-foreground">(current)</span></h3>
                {table}
              </div>
            ) : (
              <details key={g.label} className="border border-separator">
                <summary className="cursor-pointer px-3 py-2 font-body text-sm bg-muted/30 flex items-center justify-between">
                  <span className="text-accent">{g.label}</span>
                  <span className="text-muted-foreground">{eur(g.total)} · {g.rows.length} entr{g.rows.length === 1 ? 'y' : 'ies'}</span>
                </summary>
                <div className="p-2">{table}</div>
              </details>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-serif">{editingId ? 'Edit entry' : 'Add entry'}</DialogTitle></DialogHeader>
          <div className="space-y-3 font-body">
            {!editingId && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground border border-separator p-2">
                <Info className="h-4 w-4 mt-0.5 shrink-0 text-accent" />
                <span>The amount is posted to the Treasury as an outflow on the date below, and cannot be changed afterwards.</span>
              </div>
            )}
            <div className="space-y-1"><Label>Content promoted *</Label><Input value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="e.g. Recruitment reel" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Platform</Label><Input value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} placeholder="e.g. Instagram" /></div>
              <div className="space-y-1"><Label>Date incurred{editingId ? '' : ' *'}</Label><Input type="date" value={form.ad_date} disabled={!!editingId} onChange={(e) => setForm({ ...form, ad_date: e.target.value })} /></div>
              <div className="space-y-1"><Label>Amount (€)</Label><Input value={form.amount} disabled={!!editingId} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="e.g. 25.00" /></div>
              <div className="space-y-1"><Label>Campaign purpose</Label><Input value={form.campaign_purpose} onChange={(e) => setForm({ ...form, campaign_purpose: e.target.value })} placeholder="e.g. Applications drive" /></div>
            </div>
            <div className="space-y-1"><Label>Notes on effectiveness</Label><Textarea rows={3} value={form.effectiveness_notes} onChange={(e) => setForm({ ...form, effectiveness_notes: e.target.value })} placeholder="Did it work well, or not? What would you do differently?" /></div>
            <div className="flex gap-3 pt-1">
              <Button className="flex-1" onClick={requestSave} disabled={saving}>{saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving</> : editingId ? 'Save changes' : 'Add entry'}</Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm this expense</AlertDialogTitle>
            <AlertDialogDescription>
              Careful: this expense will be added and posted to the Treasury, and cannot be deleted. Are you sure the amount ({form.amount ? eur(Number(form.amount)) : '-'}), reason and date are correct?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Go back</AlertDialogCancel>
            <AlertDialogAction onClick={doSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yes, add it'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
