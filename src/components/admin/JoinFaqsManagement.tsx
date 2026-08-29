import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Loader2, ChevronUp, ChevronDown, ExternalLink, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { logActivity } from '@/lib/activity-log';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import {
  FAQ_GROUPS, EMPTY_FAQ, listAllFaqs, saveFaq, deleteFaq, reorderFaqs,
  type FaqGroupKey, type JoinFaqRow, type JoinFaqInput,
} from '@/lib/join-faqs-api';

// =====================================================================
// Website > FAQs — the admissions questions, edited where everything
// else on the website is edited.
// ---------------------------------------------------------------------
// These questions already appear in two places: at the foot of the
// public /join page, and inside the workspace for applicants. Until now
// they appeared in NO place where they could be changed - the rows
// existed only in the database, so correcting a deadline or adding a
// question meant asking somebody with SQL access.
//
// One table, one screen. Adding, editing, removing, moving between
// categories and reordering all write to the same rows both surfaces
// read, so the public page and the applicant's page can never disagree
// with each other or with this one.
//
// PUBLISHED IS A STATE, NOT A DELETION. A question can be taken off the
// public page and kept: unpublished rows are invisible to visitors (row
// level security filters them) and visible here, greyed, so they can be
// brought back without being rewritten.
// =====================================================================

export default function JoinFaqsManagement() {
  const { session } = useAuth();
  const { primaryRole, canManage } = useAccess();
  const { toast } = useToast();
  const editable = canManage('website-faqs');

  const [rows, setRows] = useState<JoinFaqRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<JoinFaqInput>(EMPTY_FAQ('eligibility'));
  const [confirmDelete, setConfirmDelete] = useState<JoinFaqRow | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setRows(await listAllFaqs(session));
    } catch (e) {
      toast({ title: 'Could not load the questions', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  /** The rows arranged as the two public surfaces arrange them. */
  const byGroup = useMemo(() => {
    const map = new Map<FaqGroupKey, JoinFaqRow[]>();
    for (const g of FAQ_GROUPS) map.set(g.key, []);
    for (const r of rows) map.get(r.group_key)?.push(r);
    for (const list of map.values()) list.sort((a, b) => a.sort_order - b.sort_order);
    return map;
  }, [rows]);

  const publishedCount = rows.filter((r) => r.is_published).length;

  const openCreate = (group: FaqGroupKey) => {
    setEditingId(null);
    setForm(EMPTY_FAQ(group));
    setDialogOpen(true);
  };

  const openEdit = (r: JoinFaqRow) => {
    setEditingId(r.id);
    setForm({
      id: r.id,
      group_key: r.group_key,
      sort_order: r.sort_order,
      question: r.question,
      answer: r.answer,
      link_label: r.link_label,
      link_href: r.link_href,
      is_published: r.is_published,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.question.trim()) { toast({ title: 'A question is required', variant: 'destructive' }); return; }
    if (!form.answer.trim()) { toast({ title: 'An answer is required', variant: 'destructive' }); return; }
    // The same pairing rule the table and the edge function enforce,
    // checked here too so the reader is told before the round trip.
    const hasLabel = !!form.link_label?.trim();
    const hasHref = !!form.link_href?.trim();
    if (hasLabel !== hasHref) { toast({ title: 'A link needs both a label and an address', variant: 'destructive' }); return; }
    if (hasHref && !form.link_href!.trim().startsWith('/')) {
      toast({ title: 'The link must be an address on this website', description: 'It has to start with "/", for example /statute.', variant: 'destructive' });
      return;
    }

    setBusy(true);
    try {
      await saveFaq(session, {
        ...form,
        link_label: hasLabel ? form.link_label!.trim() : null,
        link_href: hasHref ? form.link_href!.trim() : null,
      });
      logActivity(session, primaryRole, {
        action: editingId ? 'update' : 'create',
        section: 'Website', subsection: 'FAQs',
        entityType: 'join_faq', entityName: form.question.trim().slice(0, 120),
      });
      toast({ title: editingId ? 'Question updated' : 'Question added' });
      setDialogOpen(false);
      await load();
    } catch (e) {
      toast({ title: 'Could not save', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (r: JoinFaqRow) => {
    setBusy(true);
    try {
      await deleteFaq(session, r.id);
      logActivity(session, primaryRole, {
        action: 'delete', section: 'Website', subsection: 'FAQs',
        entityType: 'join_faq', entityId: r.id, entityName: r.question.slice(0, 120),
      });
      toast({ title: 'Question removed' });
      setConfirmDelete(null);
      await load();
    } catch (e) {
      toast({ title: 'Could not remove', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  /** Swap a question with its neighbour, and renumber the whole category. */
  const move = async (group: FaqGroupKey, index: number, direction: -1 | 1) => {
    const list = byGroup.get(group) ?? [];
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    const ids = list.map((r) => r.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];

    // Moved on screen first, then on the server: the reader sees the row
    // change place immediately and a failure puts it back.
    const previous = rows;
    setRows(rows.map((r) => {
      const at = ids.indexOf(r.id);
      return r.group_key === group && at >= 0 ? { ...r, sort_order: at + 1 } : r;
    }));
    try {
      await reorderFaqs(session, group, ids);
    } catch (e) {
      setRows(previous);
      toast({ title: 'Could not reorder', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div>
        <WorkspacePageHeader title="FAQs" description="The admissions questions shown on the public Join page and to applicants in their own workspace." />
        <WorkspaceLoader />
      </div>
    );
  }

  return (
    <div>
      <WorkspacePageHeader
        title="FAQs"
        description="The admissions questions, in the four categories the Join page groups them by. Everything here appears in two places at once: at the foot of the public Join page, and in the applicant's own FAQs page inside the workspace. A question that is not published stays here and disappears from both."
        actions={
          <span className="font-body text-sm text-muted-foreground">
            {publishedCount} published{rows.length !== publishedCount && ` · ${rows.length - publishedCount} hidden`}
          </span>
        }
      />

      <div className="space-y-8 font-body">
        {FAQ_GROUPS.map((group) => {
          const list = byGroup.get(group.key) ?? [];
          return (
            <section key={group.key}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-separator pb-2">
                <h2 className="font-serif text-xl text-accent">
                  {group.label}
                  <span className="ml-2 font-body text-sm text-muted-foreground">
                    {list.length === 1 ? '1 question' : `${list.length} questions`}
                  </span>
                </h2>
                {editable && (
                  <Button variant="outline" size="sm" className="font-body" onClick={() => openCreate(group.key)}>
                    <Plus className="mr-2 h-4 w-4" />Add a question
                  </Button>
                )}
              </div>

              {list.length === 0 ? (
                <p className="text-sm text-muted-foreground">No questions in this category yet.</p>
              ) : (
                <ul className="space-y-2">
                  {list.map((r, i) => (
                    <li
                      key={r.id}
                      className={`rounded-lg border border-separator p-4 ${r.is_published ? 'bg-background' : 'bg-muted/40'}`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Order. Two buttons rather than a drag handle: this
                            list is short, it is edited rarely, and a keyboard
                            reaches a button. */}
                        {editable && (
                          <div className="flex shrink-0 flex-col">
                            <button
                              type="button"
                              onClick={() => move(group.key, i, -1)}
                              disabled={i === 0}
                              className="flex h-6 w-6 items-center justify-center text-muted-foreground hover:text-accent disabled:opacity-30"
                              aria-label="Move up"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => move(group.key, i, 1)}
                              disabled={i === list.length - 1}
                              className="flex h-6 w-6 items-center justify-center text-muted-foreground hover:text-accent disabled:opacity-30"
                              aria-label="Move down"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </button>
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-2">
                            <span className="font-medium text-foreground">{r.question}</span>
                            {!r.is_published && (
                              <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                                <EyeOff className="h-3 w-3" />Hidden
                              </span>
                            )}
                          </div>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{r.answer}</p>
                          {r.link_label && r.link_href && (
                            <span className="mt-2 inline-flex items-center gap-1 text-sm text-accent">
                              <ExternalLink className="h-3.5 w-3.5" />
                              {r.link_label}
                              <span className="text-muted-foreground">· {r.link_href}</span>
                            </span>
                          )}
                        </div>

                        {editable && (
                          <div className="flex shrink-0 gap-2">
                            <Button variant="outline" size="sm" className="font-body" onClick={() => openEdit(r)}>Edit</Button>
                            <Button variant="outline" size="icon" onClick={() => setConfirmDelete(r)} aria-label="Remove this question">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {/* The editor. One question, its answer, an optional routed link and
          whether it is published. */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && setDialogOpen(false)}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">{editingId ? 'Edit question' : 'Add question'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 font-body">
            <div className="space-y-1">
              <Label>Category</Label>
              <div className="flex flex-wrap gap-2">
                {FAQ_GROUPS.map((g) => (
                  <button
                    key={g.key}
                    type="button"
                    onClick={() => setForm({ ...form, group_key: g.key })}
                    aria-pressed={form.group_key === g.key}
                    className={`h-9 border px-4 font-body text-sm transition-colors ${
                      form.group_key === g.key
                        ? 'border-accent bg-accent text-accent-foreground'
                        : 'border-separator bg-background text-foreground hover:bg-muted'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
              {editingId && (
                <p className="text-xs text-muted-foreground">
                  Moving a question to another category places it at the end of that category.
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="faq-question">Question *</Label>
              <Input
                id="faq-question"
                value={form.question}
                onChange={(e) => setForm({ ...form, question: e.target.value })}
                placeholder="e.g. Can I apply in my first year?"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="faq-answer">Answer *</Label>
              <Textarea
                id="faq-answer"
                rows={5}
                value={form.answer}
                onChange={(e) => setForm({ ...form, answer: e.target.value })}
                placeholder="Answer in full sentences. Line breaks are kept."
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="faq-link-label">Link label (optional)</Label>
                <Input
                  id="faq-link-label"
                  value={form.link_label ?? ''}
                  onChange={(e) => setForm({ ...form, link_label: e.target.value })}
                  placeholder="e.g. Read the statute"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="faq-link-href">Link address (optional)</Label>
                <Input
                  id="faq-link-href"
                  value={form.link_href ?? ''}
                  onChange={(e) => setForm({ ...form, link_href: e.target.value })}
                  placeholder="/statute"
                />
              </div>
              <p className="text-xs text-muted-foreground sm:col-span-2">
                A link is a pair: give both or neither. It has to be an address on this website, starting
                with a slash, because it is rendered as an internal link.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-separator p-3">
              <div className="pr-4">
                <Label htmlFor="faq-published">Published</Label>
                <p className="text-xs text-muted-foreground">
                  When off, the question disappears from the public Join page and from the applicants&rsquo;
                  FAQs, and stays here.
                </p>
              </div>
              <Switch
                id="faq-published"
                checked={form.is_published}
                onCheckedChange={(v) => setForm({ ...form, is_published: v })}
              />
            </div>

            <div className="flex gap-3 pt-1">
              <Button className="flex-1" onClick={save} disabled={busy}>
                {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving</> : 'Save'}
              </Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={busy}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this question?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{confirmDelete?.question}&rdquo; will be deleted from the public Join page and from the
              applicants&rsquo; FAQs. This cannot be undone. To take it off the two pages and keep it, switch
              Published off instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDelete && remove(confirmDelete)}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
