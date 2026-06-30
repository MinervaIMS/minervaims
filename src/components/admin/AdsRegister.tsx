import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { listAds, saveAd, deleteAd, type AdEntry, type AdInput } from '@/lib/smm-api';

const EMPTY: AdInput = { content: '', platform: '', ad_date: '', amount: null, campaign_purpose: '', effectiveness_notes: '' };
const eur = (n: number) => `€${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function AdsRegister() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [ads, setAds] = useState<AdEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{ content: string; platform: string; ad_date: string; amount: string; campaign_purpose: string; effectiveness_notes: string }>({ content: '', platform: '', ad_date: '', amount: '', campaign_purpose: '', effectiveness_notes: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setAds(await listAds(session)); }
    catch (e) { toast({ title: 'Failed to load', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setLoading(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const total = useMemo(() => ads.reduce((s, a) => s + Number(a.amount || 0), 0), [ads]);

  const openCreate = () => { setEditingId(null); setForm({ content: '', platform: '', ad_date: '', amount: '', campaign_purpose: '', effectiveness_notes: '' }); setDialogOpen(true); };
  const openEdit = (a: AdEntry) => {
    setEditingId(a.id);
    setForm({ content: a.content, platform: a.platform ?? '', ad_date: a.ad_date ?? '', amount: a.amount?.toString() ?? '', campaign_purpose: a.campaign_purpose ?? '', effectiveness_notes: a.effectiveness_notes ?? '' });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.content.trim()) { toast({ title: 'Describe the promoted content', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const payload: AdInput = { id: editingId ?? undefined, content: form.content.trim(), platform: form.platform || null, ad_date: form.ad_date || null, amount: form.amount.trim() === '' ? null : Number(form.amount), campaign_purpose: form.campaign_purpose || null, effectiveness_notes: form.effectiveness_notes || null };
      await saveAd(session, payload); toast({ title: editingId ? 'Updated' : 'Added' }); setDialogOpen(false); await load();
    } catch (e) { toast({ title: 'Could not save', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const remove = async (a: AdEntry) => {
    if (!confirm('Delete this entry?')) return;
    try { await deleteAd(session, a.id); await load(); } catch (e) { toast({ title: 'Could not delete', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
  };

  return (
    <div>
      <WorkspacePageHeader title="Ads & spending register" description="Track paid advertising - content, platform, date, amount, campaign purpose, and notes on whether it worked - so future media teams know what was effective."
        actions={<Button className="font-body" onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add entry</Button>} />

      <Card className="mb-6 max-w-xs"><CardContent className="py-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Total spent</div>
        <div className="font-serif text-2xl text-accent">{eur(total)}</div>
      </CardContent></Card>

      {loading ? <WorkspaceLoader /> : ads.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">No paid advertising recorded yet.</p></CardContent></Card>
      ) : (
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
                <th className="px-3 py-2 font-normal text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {ads.map((a) => (
                <tr key={a.id} className="border-t border-separator">
                  <td className="px-3 py-2 whitespace-nowrap">{a.ad_date ? new Date(a.ad_date).toLocaleDateString() : '-'}</td>
                  <td className="px-3 py-2 text-foreground">{a.content}</td>
                  <td className="px-3 py-2">{a.platform || '-'}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">{a.amount != null ? eur(Number(a.amount)) : '-'}</td>
                  <td className="px-3 py-2">{a.campaign_purpose || '-'}</td>
                  <td className="px-3 py-2 max-w-xs truncate">{a.effectiveness_notes || '-'}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="icon" onClick={() => openEdit(a)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="destructive" size="icon" onClick={() => remove(a)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-serif">{editingId ? 'Edit entry' : 'Add entry'}</DialogTitle></DialogHeader>
          <div className="space-y-3 font-body">
            <div className="space-y-1"><Label>Content promoted *</Label><Input value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="e.g. Recruitment reel" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Platform</Label><Input value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} placeholder="Instagram / LinkedIn" /></div>
              <div className="space-y-1"><Label>Date</Label><Input type="date" value={form.ad_date} onChange={(e) => setForm({ ...form, ad_date: e.target.value })} /></div>
              <div className="space-y-1"><Label>Amount (€)</Label><Input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" /></div>
              <div className="space-y-1"><Label>Campaign purpose</Label><Input value={form.campaign_purpose} onChange={(e) => setForm({ ...form, campaign_purpose: e.target.value })} /></div>
            </div>
            <div className="space-y-1"><Label>Notes on effectiveness</Label><Textarea rows={3} value={form.effectiveness_notes} onChange={(e) => setForm({ ...form, effectiveness_notes: e.target.value })} placeholder="Did it work well, or not? What would you do differently?" /></div>
            <div className="flex gap-3 pt-1">
              <Button className="flex-1" onClick={save} disabled={saving}>{saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving</> : 'Save'}</Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
