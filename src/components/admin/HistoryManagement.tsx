import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Pencil, Trash2, Loader2, FileText, Hash, ImageIcon, Circle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { logActivity } from '@/lib/activity-log';
import { supabase } from '@/integrations/supabase/client';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import {
  EMPTY_HISTORY_EVENT, HISTORY_FIRST_YEAR, deleteHistoryEvent, listHistoryEvents,
  saveHistoryEvent, timelineYears,
  type HistoryEventInput, type HistoryEventRow, type HistoryMediaKind,
} from '@/lib/history-api';

// =====================================================================
// Website > History — the timeline shown on /about.
// ---------------------------------------------------------------------
// The subsection is a list of YEARS, from the founding to the present,
// rather than a list of events. That is what caps the timeline at one key
// event per year without a rule anyone has to remember: a year either
// carries an event or stands quiet, and the list grows by one row each
// January on its own.
//
// A key event always needs a title and a description. It may also carry
// one piece of media: the cover of a published report, a fixed number, or
// an image. Future years are never offered.
// =====================================================================

interface ArchiveOption { id: string; title: string; date: string | null }

const MEDIA_KINDS: { value: HistoryMediaKind; label: string; hint: string }[] = [
  { value: 'none', label: 'None', hint: 'The card shows the copy alone.' },
  { value: 'report', label: 'Report cover', hint: 'The first page of a published report.' },
  { value: 'number', label: 'Number', hint: 'A fixed figure with a caption, counted up on the page.' },
  { value: 'image', label: 'Image', hint: 'A photograph, shown in a 4:3 frame.' },
];

function MediaGlyph({ kind }: { kind: HistoryMediaKind }) {
  const cls = 'h-3.5 w-3.5 shrink-0';
  if (kind === 'report') return <FileText className={cls} />;
  if (kind === 'number') return <Hash className={cls} />;
  if (kind === 'image') return <ImageIcon className={cls} />;
  return <Circle className={cls} />;
}

export default function HistoryManagement() {
  const { session } = useAuth();
  const access = useAccess();
  const { primaryRole } = access;
  const canManage = access.canManage('website-history');
  const { toast } = useToast();

  const [rows, setRows] = useState<HistoryEventRow[]>([]);
  const [reports, setReports] = useState<ArchiveOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<HistoryEventInput | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [events, archive] = await Promise.all([
        listHistoryEvents(),
        (async () => {
          const { data } = await supabase.from('archive_files')
            .select('id, title, date')
            .not('file_url', 'is', null)
            .order('date', { ascending: false })
            .limit(300);
          return (data || []) as ArchiveOption[];
        })(),
      ]);
      setRows(events);
      setReports(archive);
    } catch (e) {
      toast({
        title: 'Failed to load the timeline',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  /** Every year from the founding to today, with its event where one exists. */
  const years = useMemo(() => {
    const byYear = new Map(rows.map((r) => [r.year, r]));
    return timelineYears()
      .map((year) => ({ year, event: byYear.get(year) ?? null }))
      .reverse();
  }, [rows]);

  const openEdit = (year: number, existing: HistoryEventRow | null) => {
    setForm(existing ? { ...existing } : EMPTY_HISTORY_EVENT(year));
  };

  const submit = async () => {
    if (!form) return;
    if (form.is_active && (!form.title.trim() || !form.description.trim())) {
      toast({
        title: 'Title and description are required',
        description: 'A key event on the timeline always carries both.',
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    try {
      await saveHistoryEvent(session, {
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        href: form.href?.trim() || null,
      });
      toast({ title: `${form.year} saved` });
      logActivity(session, primaryRole, {
        action: 'update', section: 'Website', subsection: 'History',
        entityType: 'key event', entityName: String(form.year),
      });
      setForm(null);
      load();
    } catch (e) {
      toast({
        title: 'Failed to save',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (deleteTarget == null) return;
    try {
      await deleteHistoryEvent(session, deleteTarget);
      toast({ title: `${deleteTarget} cleared` });
      logActivity(session, primaryRole, {
        action: 'delete', section: 'Website', subsection: 'History',
        entityType: 'key event', entityName: String(deleteTarget),
      });
      load();
    } catch (e) {
      toast({
        title: 'Failed to clear',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setDeleteTarget(null);
    }
  };

  const reportTitle = (id: string | null) =>
    reports.find((r) => r.id === id)?.title ?? 'Report no longer in the archive';

  return (
    <div>
      <WorkspacePageHeader
        title="History"
        description={`The timeline shown in "Our History" on the About page. One key event per year, from ${HISTORY_FIRST_YEAR} to today. A year with no event stays on the rail as a quiet marker, so the story never skips a step.`}
      />

      {loading ? (
        <WorkspaceLoader />
      ) : (
        <div className="max-w-full border border-separator divide-y divide-separator">
          {years.map(({ year, event }) => {
            const active = !!event?.is_active;
            return (
              <div key={year} className="flex items-start gap-4 px-4 py-3 font-body">
                <div className="w-16 shrink-0">
                  <div className="font-serif text-xl text-accent leading-none">{year}</div>
                  <div className={`mt-1 text-[11px] uppercase tracking-wider ${active ? 'text-accent' : 'text-muted-foreground/70'}`}>
                    {active ? 'Active' : 'Quiet'}
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  {active ? (
                    <>
                      <div className="text-foreground text-base leading-snug break-words">{event!.title}</div>
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{event!.description}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <MediaGlyph kind={event!.media_kind} />
                          {event!.media_kind === 'report' && reportTitle(event!.report_file_id)}
                          {event!.media_kind === 'number' && `${event!.number_value ?? 0}+ ${event!.number_label ?? ''}`}
                          {event!.media_kind === 'image' && (event!.image_alt || event!.image_url || 'Image')}
                          {event!.media_kind === 'none' && 'No media'}
                        </span>
                        {event!.href && <span className="truncate">Links to {event!.href}</span>}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No key event recorded. The year is drawn as a small marker on the rail.
                    </p>
                  )}
                </div>

                {canManage && (
                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => openEdit(year, event)} title={active ? 'Edit this year' : 'Add a key event'}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {event && (
                      <Button variant="destructive" size="icon" className="h-9 w-9" onClick={() => setDeleteTarget(year)} title="Clear this year">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && years.length === 0 && (
        <Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">No years yet.</p></CardContent></Card>
      )}

      <Dialog open={!!form} onOpenChange={(open) => !open && setForm(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">{form?.year}</DialogTitle>
            <DialogDescription className="font-body">
              One key event per year. Leave it inactive to keep the year on the rail without a card.
            </DialogDescription>
          </DialogHeader>

          {form && (
            <div className="space-y-4 font-body">
              <div className="flex items-center justify-between border border-separator px-4 py-3">
                <div>
                  <Label htmlFor="history-active">A key event happened in {form.year}</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Turn this off for a quiet year: the rail keeps the year, with no card.
                  </p>
                </div>
                <Switch
                  id="history-active"
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                />
              </div>

              {form.is_active && (
                <>
                  <div className="space-y-1">
                    <Label htmlFor="history-title">Title</Label>
                    <Input
                      id="history-title" value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="What happened, in a sentence"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="history-desc">Description</Label>
                    <Textarea
                      id="history-desc" rows={5} value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="The paragraph shown under the title."
                    />
                    <p className="text-xs text-muted-foreground">
                      Write [n] anywhere to insert the live alumni total.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="history-href">Link (optional)</Label>
                    <Input
                      id="history-href" value={form.href ?? ''}
                      onChange={(e) => setForm({ ...form, href: e.target.value })}
                      placeholder="/people/alumni"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Media</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {MEDIA_KINDS.map((kind) => (
                        <button
                          key={kind.value}
                          type="button"
                          onClick={() => setForm({ ...form, media_kind: kind.value })}
                          className={`border px-3 py-2 text-left text-sm transition-colors ${
                            form.media_kind === kind.value
                              ? 'border-accent text-accent bg-accent/5'
                              : 'border-separator text-muted-foreground hover:border-accent/50'
                          }`}
                        >
                          <span className="inline-flex items-center gap-1.5"><MediaGlyph kind={kind.value} />{kind.label}</span>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {MEDIA_KINDS.find((k) => k.value === form.media_kind)?.hint}
                    </p>
                  </div>

                  {form.media_kind === 'report' && (
                    <div className="space-y-1">
                      <Label htmlFor="history-report">Report</Label>
                      <select
                        id="history-report"
                        value={form.report_file_id ?? ''}
                        onChange={(e) => setForm({ ...form, report_file_id: e.target.value || null })}
                        className="w-full font-body bg-background border border-input px-3 h-10"
                      >
                        <option value="">Choose a published report</option>
                        {reports.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.title}{r.date ? ` (${new Date(r.date).getFullYear()})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {form.media_kind === 'number' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="history-number">Figure</Label>
                        <Input
                          id="history-number" type="number" inputMode="numeric" value={form.number_value ?? ''}
                          onChange={(e) => setForm({ ...form, number_value: e.target.value === '' ? null : Number(e.target.value) })}
                          placeholder="100"
                        />
                        <p className="text-xs text-muted-foreground">Shown with a + and counted up on the page.</p>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="history-number-label">Caption</Label>
                        <Input
                          id="history-number-label" value={form.number_label ?? ''}
                          onChange={(e) => setForm({ ...form, number_label: e.target.value })}
                          placeholder="Alumni Network"
                        />
                      </div>
                    </div>
                  )}

                  {form.media_kind === 'image' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="history-image">Image address</Label>
                        <Input
                          id="history-image" value={form.image_url ?? ''}
                          onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                          placeholder="/history/2026-founders-return.jpg"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="history-alt">Description of the image</Label>
                        <Input
                          id="history-alt" value={form.image_alt ?? ''}
                          onChange={(e) => setForm({ ...form, image_alt: e.target.value })}
                          placeholder="The founders back at Bocconi, 2026"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="flex gap-3 pt-2">
                <Button className="flex-1" onClick={submit} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save {form.year}
                </Button>
                <Button variant="outline" onClick={() => setForm(null)} disabled={saving}>Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget != null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif">Clear {deleteTarget}?</AlertDialogTitle>
            <AlertDialogDescription className="font-body">
              The year stays on the timeline as a quiet marker. The title, description and media are removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-body">Cancel</AlertDialogCancel>
            <AlertDialogAction className="font-body" onClick={confirmDelete}>Clear the year</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
