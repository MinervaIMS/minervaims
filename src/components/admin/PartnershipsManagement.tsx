import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ExternalLink, Eye, EyeOff, ImagePlus, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { HelpDot } from '@/components/admin/help/HelpSystem';
import { MoreMenu, type MoreAction } from '@/components/admin/kit/MoreMenu';
import { useConfirm } from '@/components/admin/kit/ConfirmDialog';
import { RecordCard, RecordList } from '@/components/admin/kit/RecordCard';
import { REGISTER_FIRST_COLUMN, REGISTER_HEAD, RegisterFrame } from '@/components/admin/kit/Register';
import {
  deletePartner, listAllPartners, reorderPartners, savePartner, uploadPartnerLogo, type Partner,
} from '@/lib/partnerships-api';

// =====================================================================
// Website > Partnerships (Step 105).
// ---------------------------------------------------------------------
// The partners shown on /partnerships: the other student associations
// the Society has an agreement or a joint initiative with. Each has a
// name, a sentence on what the agreement covers, a link and a logo; it
// can be hidden without being removed, and the order here is the order on
// the page. Built with the Step 98 kit
// (kit/AGENTS.md): a card per partner on a phone, a register on a
// computer, the rarer actions in More, every removal asked first.
// =====================================================================

interface FormState { id: string | null; name: string; summary: string; url: string; logo_url: string; published: boolean }
const EMPTY: FormState = { id: null, name: '', summary: '', url: '', logo_url: '', published: true };

export default function PartnershipsManagement() {
  const { session } = useAuth();
  const { toast } = useToast();
  const access = useAccess();
  const canManage = access.canManage('website-partnerships');
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [items, setItems] = useState<Partner[] | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try { setItems(await listAllPartners(session)); }
    catch (e) { setItems([]); toast({ title: 'Could not load the partnerships', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  // In the page's order.
  const rows = useMemo(() => [...(items ?? [])].sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name)), [items]);

  const openEdit = (p: Partner) => setForm({
    id: p.id, name: p.name, summary: p.summary ?? '', url: p.url ?? '', logo_url: p.logo_url ?? '', published: p.published,
  });

  const save = async () => {
    if (!form) return;
    if (!form.name.trim()) { toast({ title: 'A name is required', variant: 'destructive' }); return; }
    if (form.url.trim() && !/^https?:\/\/\S+$/i.test(form.url.trim())) { toast({ title: 'The link must start with https://', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      await savePartner(session, {
        id: form.id ?? undefined, name: form.name.trim(),
        summary: form.summary.trim() || null, url: form.url.trim() || null, logo_url: form.logo_url.trim() || null, published: form.published,
      });
      toast({ title: form.id ? 'Partner updated' : 'Partner added', description: form.published ? 'Shown on the Partnerships page.' : 'Hidden from the website until you show it.' });
      setForm(null);
      await load();
    } catch (e) { toast({ title: 'Could not save', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const pickLogo = async (file: File | undefined) => {
    if (!file || !form) return;
    setUploading(true);
    try { const url = await uploadPartnerLogo(session, file); setForm((f) => (f ? { ...f, logo_url: url } : f)); }
    catch (e) { toast({ title: 'Could not upload the logo', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const move = async (id: string, dir: -1 | 1) => {
    const i = rows.findIndex((r) => r.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= rows.length) return;
    const ids = rows.map((r) => r.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    setBusy(true);
    try { await reorderPartners(session, ids); await load(); }
    catch (e) { toast({ title: 'Could not reorder', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  const togglePublished = async (p: Partner) => {
    setBusy(true);
    try {
      await savePartner(session, { id: p.id, name: p.name, summary: p.summary, url: p.url, logo_url: p.logo_url, published: !p.published });
      toast({ title: p.published ? 'Hidden from the website' : 'Shown on the website', description: p.name });
      await load();
    } catch (e) { toast({ title: 'Could not change it', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  const remove = async (p: Partner) => {
    const ok = await confirm({
      title: `Remove ${p.name}?`,
      body: <p>{p.name} disappears from the Partnerships page and from this list. To take it off the website for a while instead, hide it.</p>,
      action: 'Remove partner',
    });
    if (!ok) return;
    setBusy(true);
    try { await deletePartner(session, p.id); toast({ title: 'Partner removed', description: p.name }); await load(); }
    catch (e) { toast({ title: 'Could not remove', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  const actionsFor = (p: Partner, index: number, count: number): MoreAction[] => [
    { key: 'up', label: 'Move up', icon: ArrowUp, disabled: busy || index === 0, onSelect: () => { void move(p.id, -1); } },
    { key: 'down', label: 'Move down', icon: ArrowDown, disabled: busy || index === count - 1, onSelect: () => { void move(p.id, 1); } },
    { key: 'publish', label: p.published ? 'Hide from the website' : 'Show on the website', icon: p.published ? EyeOff : Eye, disabled: busy, onSelect: () => { void togglePublished(p); } },
    { key: 'delete', label: 'Remove partner', icon: Trash2, destructive: true, disabled: busy, onSelect: () => { void remove(p); } },
  ];

  const header = (
    <WorkspacePageHeader
      title="Partnerships"
      description="The student associations shown on the website's Partnerships page. Company relations has its own page."
    />
  );
  if (items === null) return <div>{header}<WorkspaceLoader /></div>;

  const logo = (p: Partner) => (p.logo_url
    ? <img src={p.logo_url} alt="" className="h-10 w-16 shrink-0 border border-separator bg-background object-contain p-1" loading="lazy" />
    : <span className="flex h-10 w-16 shrink-0 items-center justify-center border border-dashed border-separator text-[10px] uppercase tracking-wider text-muted-foreground">Logo</span>);
  const shown = (p: Partner) => (
    <span className={`whitespace-nowrap text-[11px] px-1.5 py-0.5 ${p.published ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground'}`}>{p.published ? 'On the website' : 'Hidden'}</span>
  );

  return (
    <div className="font-body">
      {header}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {canManage && (
          <Button className="h-11 lg:h-10" onClick={() => setForm({ ...EMPTY })}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />Add partner
          </Button>
        )}
        <a href="/partnerships" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 text-sm text-accent underline-offset-4 hover:underline lg:min-h-0">
          <ExternalLink className="h-4 w-4" aria-hidden="true" />See the page
        </a>
        <HelpDot page="website-partnerships" topic="partners" />
      </div>

      {(items.length === 0) && (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
          No partner yet. The Partnerships page says that agreements will be listed there; it fills in as you add them.
        </CardContent></Card>
      )}

      {rows.length > 0 && (
        <section className="mb-8" aria-label="Student associations">
          <RecordList label="Student associations">
            {rows.map((p, i) => (
              <RecordCard
                key={p.id}
                title={<span className="flex items-center gap-3">{logo(p)}<span className="min-w-0">{p.name}</span></span>}
                aside={shown(p)}
                lines={p.summary ? <p className="text-sm text-muted-foreground">{p.summary}</p> : undefined}
                actions={canManage ? (
                  <>
                    <Button data-ro variant="outline" className="h-11 flex-1" onClick={() => openEdit(p)}><Pencil className="mr-1.5 h-4 w-4" aria-hidden="true" />Edit</Button>
                    <MoreMenu label={`More actions for ${p.name}`} title={p.name} actions={actionsFor(p, i, rows.length)} />
                  </>
                ) : undefined}
              />
            ))}
          </RecordList>
          <RegisterFrame>
            <table className="w-full text-left text-sm">
              <thead className={REGISTER_HEAD}>
                <tr>
                  <th className={`px-3 py-2 font-normal ${REGISTER_FIRST_COLUMN}`}>Partner</th>
                  <th className="px-3 py-2 font-normal">What the agreement covers</th>
                  <th className="px-3 py-2 font-normal">Link</th>
                  <th className="px-3 py-2 font-normal">Website</th>
                  {canManage && <th className="px-3 py-2 font-normal text-right"><span className="sr-only">Actions</span></th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((p, i) => (
                  <tr key={p.id} className="border-t border-separator align-top">
                    <td className={`px-3 py-2 ${REGISTER_FIRST_COLUMN}`}><span className="flex items-center gap-3">{logo(p)}<span className="text-foreground">{p.name}</span></span></td>
                    <td className="max-w-md px-3 py-2 text-muted-foreground">{p.summary || '-'}</td>
                    <td className="px-3 py-2">{p.url ? <a data-ro href={p.url} target="_blank" rel="noopener noreferrer" className="break-all text-accent underline-offset-2 hover:underline">{p.url.replace(/^https?:\/\//, '')}</a> : '-'}</td>
                    <td className="px-3 py-2">{shown(p)}</td>
                    {canManage && (
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-2">
                          <Button data-ro variant="outline" size="sm" onClick={() => openEdit(p)} aria-label={`Edit ${p.name}`}><Pencil className="mr-1.5 h-4 w-4" aria-hidden="true" />Edit</Button>
                          <MoreMenu label={`More actions for ${p.name}`} title={p.name} actions={actionsFor(p, i, rows.length)} />
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </RegisterFrame>
        </section>
      )}

      <Dialog open={!!form} onOpenChange={(o) => { if (!o && !saving) setForm(null); }}>
        <DialogContent className="ws-form-touch max-w-lg max-h-[90vh] overflow-y-auto font-body">
          <DialogHeader className="text-left">
            <DialogTitle className="font-serif text-xl">{form?.id ? 'Edit partner' : 'Add partner'}</DialogTitle>
            <DialogDescription>Shown on the website&apos;s Partnerships page unless you hide it. A partnership with another student association needs the prior request to the CASA Committee (Statute, Art. 26).</DialogDescription>
          </DialogHeader>
          {form && (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="pt-name">Name *</Label>
                <Input id="pt-name" value={form.name} maxLength={160} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Bocconi Students Investment Club" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pt-summary">What the agreement covers</Label>
                <Textarea id="pt-summary" rows={3} maxLength={600} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="One or two sentences, as the page shows them" />
                <p className="text-xs text-muted-foreground">{form.summary.length}/600</p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="pt-url">Link</Label>
                <Input id="pt-url" type="url" inputMode="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://" />
              </div>
              <div className="space-y-2">
                <Label>Logo</Label>
                <div className="flex flex-wrap items-center gap-3">
                  {form.logo_url
                    ? <img src={form.logo_url} alt="" className="h-14 w-24 border border-separator bg-background object-contain p-1" />
                    : <span className="flex h-14 w-24 items-center justify-center border border-dashed border-separator text-xs text-muted-foreground">No logo</span>}
                  <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={(e) => pickLogo(e.target.files?.[0])} />
                  <Button type="button" variant="outline" className="h-11 lg:h-10" disabled={uploading} onClick={() => fileRef.current?.click()}>
                    {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" aria-hidden="true" />}
                    {form.logo_url ? 'Replace logo' : 'Upload logo'}
                  </Button>
                  {form.logo_url && <Button type="button" variant="ghost" className="h-11 lg:h-10" onClick={() => setForm({ ...form, logo_url: '' })}>Remove logo</Button>}
                </div>
                <p className="text-xs text-muted-foreground">PNG, JPEG, WebP or SVG, up to 2 MB. A wide logo on a transparent background reads best.</p>
              </div>
              <label className="flex min-h-11 items-center justify-between gap-3 border border-separator px-3">
                <span className="text-sm text-foreground">Show on the website</span>
                <Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} />
              </label>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" className="h-11 lg:h-10" disabled={saving} onClick={() => setForm(null)}>Cancel</Button>
            <Button className="h-11 lg:h-10" disabled={saving || uploading} onClick={save}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{form?.id ? 'Save changes' : 'Add partner'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </div>
  );
}
