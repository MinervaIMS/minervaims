// =====================================================================
// Operations > Internal Forms: the organisers' page.
// ---------------------------------------------------------------------
// TWO PLACES, ONE ADDRESS EACH. The list of forms is the page itself;
// a form opens in place, at `?form=<id>&view=questions|settings|answers`,
// so a form (and the tab it was on) can be linked to, reloaded, and left
// with the Back button.
//
// THE LIST answers "what is running?" first: the open forms with their
// deadline and how many have answered (and paid), then the drafts, then
// the closed ones. A new form starts from a blank page or from one of
// the forms the Society runs most often.
//
// A FORM has three tabs, in the order work is done: Questions (the title,
// the introduction and the questions, with the member's view beside
// them), Settings (deadline, changes, payment, the message after
// sending) and Answers. Edits are held on the page until Save, in a bar
// that stays in view while anything is unsaved; leaving the page keeps
// them for when the form is opened again. Opening, closing and reopening
// say what will happen to members before they happen.
// =====================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, BarChart3, CopyPlus, Eye, FilePlus2, Link2, ListChecks, Loader2, Lock, MoreHorizontal, Plus,
  RefreshCw, Search, Settings2, Trash2, Undo2, Unlock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { useIsDesktop } from '@/hooks/use-desktop';
import { useToast } from '@/hooks/use-toast';
import { friendlyError } from '@/lib/errors';
import { isQuestion, LIMITS } from '@/lib/internal-forms-rules';
import {
  deleteForm, duplicateForm, getForm, listForms, saveForm, setFormStatus,
  type FormResponse, type FormStatus, type InternalForm,
} from '@/lib/internal-forms-api';
import {
  STARTERS, STATE_LABEL, deadlineRelative, deadlineText, effectiveState, firstProblem, formLink, money,
  type EffectiveState, type Problem,
} from './forms-model';
import { stamp } from './answers-model';
import { QuestionsEditor } from './QuestionsEditor';
import { FormSettingsPanel } from './FormSettingsPanel';
import { AnswersView } from './AnswersView';

type View = 'questions' | 'settings' | 'answers';
const VIEWS: View[] = ['questions', 'settings', 'answers'];

// The list, kept between visits so returning to it is instant; it is
// refreshed quietly each time.
let listCache: InternalForm[] | null = null;
// Edits not yet saved when the page was left, restored when the same
// form is opened again (and only if nobody saved it in between).
const unsaved = new Map<string, { base: string; draft: InternalForm }>();

/** The parts of a form the organiser edits, compared and saved. */
const EDITABLE = ['title', 'description', 'fields', 'closes_at', 'allow_edits', 'track_payments', 'payment_amount', 'payment_instructions', 'confirmation_message'] as const;
const editable = (f: InternalForm) => Object.fromEntries(EDITABLE.map((k) => [k, f[k]])) as Partial<InternalForm>;
// Empty text, null and absent read the same, so typing and deleting a
// word does not leave a form "changed".
const norm = (f: InternalForm) => JSON.stringify(editable(f), (_k, v) => (v === '' || v === null || v === undefined ? undefined : v));
const tidy = (f: InternalForm): InternalForm => ({ ...f, payment_amount: f.payment_amount == null ? null : Number(f.payment_amount), fields: Array.isArray(f.fields) ? f.fields : [] });

const BADGE: Record<EffectiveState, string> = {
  open: 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  draft: 'border-separator bg-muted/50 text-muted-foreground',
  closed: 'border-separator bg-background text-muted-foreground',
  expired: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
};

function StateBadge({ state }: { state: EffectiveState }) {
  return <span className={`inline-flex shrink-0 items-center border px-2 py-0.5 font-body text-xs ${BADGE[state]}`}>{STATE_LABEL[state]}</span>;
}

export default function InternalForms() {
  const [params, setParams] = useSearchParams();
  const formId = params.get('form');
  const rawView = params.get('view') as View | null;
  const view: View = rawView && VIEWS.includes(rawView) ? rawView : 'questions';

  const open = useCallback((id: string | null, v: View = 'questions', replace = false) => {
    setParams((prev) => {
      const p = new URLSearchParams(prev);
      if (id) { p.set('form', id); p.set('view', v); } else { p.delete('form'); p.delete('view'); }
      return p;
    }, { replace });
  }, [setParams]);

  return formId
    ? <FormEditor key={formId} id={formId} view={view} onView={(v) => open(formId, v, true)} onOpen={open} />
    : <FormList onOpen={open} />;
}

// =====================================================================
// The list
// =====================================================================

function FormList({ onOpen }: { onOpen: (id: string, v?: View) => void }) {
  const { session } = useAuth();
  const { toast } = useToast();
  const { canManage } = useAccess();
  const isDesktop = useIsDesktop();
  const canEdit = canManage('ops-forms');
  const [forms, setForms] = useState<InternalForm[] | null>(listCache);
  const [failed, setFailed] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [newOpen, setNewOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<InternalForm | null>(null);

  const load = useCallback(async () => {
    try {
      const list = (await listForms(session)).map(tidy);
      listCache = list;
      setForms(list);
      setFailed(null);
    } catch (e) {
      if (!listCache) setFailed(friendlyError(e));
    }
  }, [session]);
  useEffect(() => { load(); }, [load]);

  const groups = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const list = (forms ?? []).filter((f) => words.every((w) => `${f.title} ${f.description ?? ''}`.toLowerCase().includes(w)));
    const openForms = list.filter((f) => effectiveState(f) === 'open')
      .sort((a, b) => (a.closes_at ?? '9999').localeCompare(b.closes_at ?? '9999') || b.updated_at.localeCompare(a.updated_at));
    const drafts = list.filter((f) => f.status === 'draft').sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    const closed = list.filter((f) => ['closed', 'expired'].includes(effectiveState(f)))
      .sort((a, b) => (b.closed_at ?? b.closes_at ?? b.updated_at).localeCompare(a.closed_at ?? a.closes_at ?? a.updated_at));
    return [
      { key: 'open', title: 'Open', hint: 'Members see these on their Dashboard and can answer now.', items: openForms },
      { key: 'draft', title: 'Drafts', hint: 'Only organisers can see these.', items: drafts },
      { key: 'closed', title: 'Closed', hint: 'No new answers; every answer is kept.', items: closed },
    ].filter((g) => g.items.length);
  }, [forms, query]);

  const copyLink = async (f: InternalForm) => {
    try {
      await navigator.clipboard.writeText(formLink(f.id));
      toast({ title: 'Link copied', description: 'It opens the form for any active member, after they sign in.' });
    } catch { toast({ title: 'Copy this link', description: formLink(f.id) }); }
  };
  const duplicate = async (f: InternalForm) => {
    setBusy(`dup:${f.id}`);
    try {
      const copy = tidy(await duplicateForm(session, f.id));
      listCache = [copy, ...(listCache ?? [])];
      toast({ title: 'Copy made', description: 'A draft with the same questions and settings, and no deadline.' });
      onOpen(copy.id, 'questions');
    } catch (e) { toast({ title: 'Could not copy the form', description: friendlyError(e), variant: 'destructive' }); }
    finally { setBusy(null); }
  };
  const remove = async () => {
    if (!toDelete) return;
    const f = toDelete;
    setBusy(`del:${f.id}`);
    try {
      await deleteForm(session, f.id);
      unsaved.delete(f.id);
      setForms((prev) => { const next = (prev ?? []).filter((x) => x.id !== f.id); listCache = next; return next; });
      toast({ title: 'Form deleted' });
    } catch (e) { toast({ title: 'Could not delete the form', description: friendlyError(e), variant: 'destructive' }); }
    finally { setBusy(null); setToDelete(null); }
  };

  return (
    <div>
      <WorkspacePageHeader
        title="Internal Forms"
        description="Forms for active members, from hoodie orders to company visits, with every answer, payment and export in one place."
        actions={canEdit ? <Button variant="solid" onClick={() => setNewOpen(true)}><Plus className="h-4 w-4" />New form</Button> : undefined}
      />
      {!canEdit && (
        <p className="mb-4 flex items-center gap-2 border border-separator bg-muted/30 px-3 py-2 font-body text-sm text-muted-foreground">
          <Lock aria-hidden className="h-4 w-4 shrink-0" />
          {isDesktop ? 'Your role can read these forms but not change them.' : 'Read-only on a phone: open Internal Forms on a computer to create forms or tick payments.'}
        </p>
      )}

      {forms === null && !failed && <WorkspaceLoader />}
      {failed && (
        <div className="border border-destructive/40 bg-destructive/5 px-4 py-3 font-body text-sm">
          <p className="text-foreground">The forms could not be loaded. {failed}</p>
          <Button data-ro variant="outline" size="sm" className="mt-2" onClick={() => { setFailed(null); load(); }}><RefreshCw className="h-4 w-4" />Try again</Button>
        </div>
      )}

      {forms !== null && forms.length === 0 && (
        <div className="border border-dashed border-separator px-5 py-10 text-center font-body">
          <ListChecks aria-hidden className="mx-auto mb-3 h-8 w-8 text-accent" />
          <p className="font-serif text-xl text-foreground">No forms yet</p>
          <p className="mx-auto mt-1 max-w-lg text-sm text-muted-foreground">
            A form collects something from members: an order, a sign-up, interest in a visit. It starts as a draft only organisers see; once opened, every active member finds it on their Dashboard and receives a receipt of their answers by email.
          </p>
          {canEdit && <Button variant="solid" className="mt-4" onClick={() => setNewOpen(true)}><Plus className="h-4 w-4" />Create the first form</Button>}
        </div>
      )}

      {forms !== null && forms.length > 0 && (
        <>
          {forms.length > 6 && (
            <div className="relative mb-5 max-w-md">
              <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a form" aria-label="Find a form" className="h-10 pl-9 font-body" />
            </div>
          )}
          {groups.length === 0 && <p className="font-body text-sm text-muted-foreground">No form matches "{query}".</p>}
          <div className="space-y-8">
            {groups.map((g) => (
              <section key={g.key} aria-labelledby={`forms-${g.key}`}>
                <div className="mb-2 flex flex-wrap items-baseline gap-x-3">
                  <h2 id={`forms-${g.key}`} className="font-serif text-xl text-accent">{g.title} <span className="font-body text-sm tabular-nums text-muted-foreground">{g.items.length}</span></h2>
                  <p className="font-body text-sm text-muted-foreground">{g.hint}</p>
                </div>
                <ul className="divide-y divide-separator border-y border-separator">
                  {g.items.map((f) => (
                    <FormRow key={f.id} form={f} canEdit={canEdit} busy={busy}
                      onOpen={(v) => onOpen(f.id, v)} onCopy={() => copyLink(f)} onDuplicate={() => duplicate(f)} onDelete={() => setToDelete(f)} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}

      <NewFormDialog open={newOpen} onOpenChange={setNewOpen} onCreated={(f) => { listCache = [f, ...(listCache ?? [])]; onOpen(f.id, 'questions'); }} />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => { if (!o) setToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{toDelete?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete?.responses
                ? `The form, its ${toDelete.responses} ${toDelete.responses === 1 ? 'answer' : 'answers'} and every file attached to them are deleted for good. Export the answers first if you need them.`
                : 'The form is deleted for good.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); remove(); }} disabled={!!busy} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {busy?.startsWith('del') ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FormRow({ form: f, canEdit, busy, onOpen, onCopy, onDuplicate, onDelete }: {
  form: InternalForm;
  canEdit: boolean;
  busy: string | null;
  onOpen: (v: View) => void;
  onCopy: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const state = effectiveState(f);
  const n = f.responses ?? 0;
  const questions = f.fields.filter(isQuestion).length;
  const meta = [
    `${n} ${n === 1 ? 'answer' : 'answers'}`,
    f.track_payments ? `${f.paid_count ?? 0} of ${n} paid` : '',
    state === 'open' ? deadlineRelative(f.closes_at) : state === 'expired' && f.closes_at ? `Deadline passed ${stamp(f.closes_at)}` : '',
    state === 'closed' && f.closed_at ? `Closed ${stamp(f.closed_at)}` : '',
    state === 'draft' ? `${questions} ${questions === 1 ? 'question' : 'questions'}` : '',
  ].filter(Boolean);
  return (
    <li className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center">
      <button type="button" data-ro onClick={() => onOpen(n > 0 ? 'answers' : 'questions')} className="group min-w-0 flex-1 text-left font-body">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-serif text-lg leading-snug text-accent group-hover:underline group-hover:underline-offset-2">{f.title}</span>
          <StateBadge state={state} />
          {f.track_payments && f.payment_amount != null && <span className="text-xs text-muted-foreground">{money(f.payment_amount)}</span>}
        </span>
        {f.description && <span className="mt-0.5 block truncate text-sm text-muted-foreground">{f.description}</span>}
        <span className="mt-1 block text-[13px] text-muted-foreground">{meta.join(' · ')}</span>
      </button>
      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        <Button data-ro variant="outline" size="sm" onClick={() => onOpen('answers')}><BarChart3 className="h-4 w-4" />Answers</Button>
        {state === 'open' && <Button data-ro variant="ghost" size="sm" onClick={onCopy}><Link2 className="h-4 w-4" />Copy link</Button>}
        {canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={`More for "${f.title}"`}>
                {busy?.endsWith(f.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="font-body">
              <DropdownMenuItem onSelect={() => onOpen('questions')}><ListChecks className="h-4 w-4" />Edit the questions</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onOpen('settings')}><Settings2 className="h-4 w-4" />Settings and deadline</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => window.open(`/forms/${f.id}`, '_blank', 'noopener')}><Eye className="h-4 w-4" />Preview as a member</DropdownMenuItem>
              <DropdownMenuItem onSelect={onDuplicate}><CopyPlus className="h-4 w-4" />Make a copy</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive"><Trash2 className="h-4 w-4" />Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </li>
  );
}

function NewFormDialog({ open, onOpenChange, onCreated }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (f: InternalForm) => void;
}) {
  const { session } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const counts = useMemo(() => Object.fromEntries(STARTERS.map((s) => [s.key, (s.build().fields ?? []).filter(isQuestion).length])), []);

  const create = async (key: string) => {
    const starter = STARTERS.find((s) => s.key === key);
    if (!starter) return;
    setBusy(key);
    try {
      const f = tidy(await saveForm(session, { allow_edits: true, ...starter.build() }));
      onOpenChange(false);
      onCreated(f);
    } catch (e) { toast({ title: 'Could not create the form', description: friendlyError(e), variant: 'destructive' }); }
    finally { setBusy(null); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) onOpenChange(o); }}>
      <DialogContent className="w-[min(96vw,44rem)] max-w-[min(96vw,44rem)]">
        <DialogHeader className="text-left">
          <DialogTitle className="font-serif">New form</DialogTitle>
          <DialogDescription className="font-body">Start from a blank form or from one the Society runs often. Everything can be changed, and nothing reaches members until you open the form.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2.5 font-body sm:grid-cols-2">
          {STARTERS.map((s) => (
            <button key={s.key} type="button" disabled={!!busy} onClick={() => create(s.key)}
              className="flex min-h-[7rem] flex-col items-start gap-1 border border-separator p-4 text-left transition-colors hover:border-accent hover:bg-accent/5 focus-visible:border-accent disabled:opacity-60">
              <span className="flex w-full items-center gap-2 font-serif text-lg text-accent">
                {s.key === 'blank' ? <FilePlus2 aria-hidden className="h-4 w-4" /> : <ListChecks aria-hidden className="h-4 w-4" />}
                {s.title}
                {busy === s.key && <Loader2 className="ml-auto h-4 w-4 animate-spin" />}
              </span>
              <span className="text-sm text-muted-foreground">{s.blurb}</span>
              {s.key !== 'blank' && <span className="mt-auto pt-1 text-xs text-muted-foreground">{counts[s.key]} questions to start with</span>}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =====================================================================
// One form
// =====================================================================

function FormEditor({ id, view, onView, onOpen }: {
  id: string;
  view: View;
  onView: (v: View) => void;
  onOpen: (id: string | null, v?: View, replace?: boolean) => void;
}) {
  const { session } = useAuth();
  const { toast } = useToast();
  const { canManage } = useAccess();
  const isDesktop = useIsDesktop();
  const canEdit = canManage('ops-forms');
  const readOnly = !canEdit;

  const [saved, setSaved] = useState<InternalForm | null>(null);
  const [draft, setDraft] = useState<InternalForm | null>(null);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [missing, setMissing] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [reveal, setReveal] = useState<{ id: string; at: number } | null>(null);
  const [ask, setAsk] = useState<null | 'open' | 'close' | 'leave' | 'delete' | 'draft'>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  const dirty = !!saved && !!draft && norm(saved) !== norm(draft);

  // ── Load ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await getForm(session, id);
        if (cancelled) return;
        const f = tidy(r.form);
        setSaved(f);
        const kept = unsaved.get(id);
        if (kept && kept.base === f.updated_at && canEdit) { setDraft({ ...kept.draft, status: f.status }); setRestored(true); }
        else { setDraft(f); unsaved.delete(id); }
        setResponses(r.responses);
      } catch (e) {
        if (!cancelled) setMissing(friendlyError(e, 'This form could not be opened.'));
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Unsaved edits survive leaving the page through the workspace's own
  // navigation, and the browser asks before a reload or a closed tab.
  const latest = useRef({ saved, draft, dirty });
  latest.current = { saved, draft, dirty };
  useEffect(() => () => {
    const { saved: s, draft: d, dirty: changed } = latest.current;
    if (changed && s && d) unsaved.set(id, { base: s.updated_at, draft: d });
  }, [id]);
  useEffect(() => {
    if (!dirty) return;
    const stop = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', stop);
    return () => window.removeEventListener('beforeunload', stop);
  }, [dirty]);

  const set = useCallback((patch: Partial<InternalForm>) => {
    setDraft((d) => (d ? { ...d, ...patch } : d));
    setProblem(null);
  }, []);

  const keepInList = (f: InternalForm) => {
    if (!listCache) return;
    listCache = listCache.map((x) => (x.id === f.id ? { ...x, ...f, responses: responses.length, paid_count: responses.filter((r) => r.paid).length } : x));
  };

  // ── Save ────────────────────────────────────────────────────────────
  const showProblem = (p: Problem) => {
    setProblem(p);
    if (p.view !== view) onView(p.view);
    if (p.fieldId === '__title') window.setTimeout(() => document.getElementById('form-title')?.focus(), 60);
    else if (p.fieldId) setReveal({ id: p.fieldId, at: Date.now() });
  };

  const save = async (): Promise<InternalForm | null> => {
    if (!draft || !saved) return null;
    const p = firstProblem(draft);
    if (p) { showProblem(p); return null; }
    setSaving(true);
    try {
      const f = tidy(await saveForm(session, { id: saved.id, ...editable(draft) }));
      setSaved(f);
      setDraft(f);
      latest.current = { saved: f, draft: f, dirty: false };
      setProblem(null);
      setRestored(false);
      unsaved.delete(id);
      keepInList(f);
      toast({ title: 'Saved', description: f.status === 'open' ? 'Members see the changes from now on.' : undefined });
      return f;
    } catch (e) {
      toast({ title: 'Could not save', description: friendlyError(e), variant: 'destructive' });
      return null;
    } finally { setSaving(false); }
  };
  const discard = () => { if (saved) setDraft(saved); setProblem(null); setRestored(false); unsaved.delete(id); };

  // Ctrl or Cmd + S saves.
  useEffect(() => {
    if (!canEdit) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (latest.current.dirty) save(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // ── State changes ───────────────────────────────────────────────────
  const changeStatus = async (status: FormStatus) => {
    if (!saved || !draft) return;
    if (status === 'open') {
      if (!draft.fields.some(isQuestion)) { showProblem({ message: 'Add at least one question before opening the form.', view: 'questions' }); setAsk(null); return; }
      if (draft.closes_at && new Date(draft.closes_at).getTime() <= Date.now()) {
        showProblem({ message: 'The deadline has passed. Move it, or remove it, before opening the form.', view: 'settings' }); setAsk(null); return;
      }
    }
    setStatusBusy(true);
    try {
      if (dirty) { const f = await save(); if (!f) return; }
      const f = tidy(await setFormStatus(session, saved.id, status));
      setSaved(f);
      setDraft(f);
      keepInList(f);
      toast({
        title: status === 'open' ? 'The form is open' : status === 'closed' ? 'The form is closed' : 'Back to draft',
        description: status === 'open' ? 'Active members find it on their Dashboard. Copy the link to share it too.' : status === 'closed' ? 'Members can no longer answer. Every answer is kept.' : 'Only organisers can see it now.',
      });
    } catch (e) {
      toast({ title: 'Could not change the form', description: friendlyError(e), variant: 'destructive' });
    } finally { setStatusBusy(false); setAsk(null); }
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      const r = await getForm(session, id);
      setResponses(r.responses);
      const f = tidy(r.form);
      if (!dirty) { setSaved(f); setDraft(f); }
    } catch (e) { toast({ title: 'Could not refresh the answers', description: friendlyError(e), variant: 'destructive' }); }
    finally { setRefreshing(false); }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(formLink(id));
      toast({ title: 'Link copied', description: 'It opens the form for any active member, after they sign in.' });
    } catch { toast({ title: 'Copy this link', description: formLink(id) }); }
  };
  const preview = async () => {
    // Opened first, filled after the save, so the browser does not take
    // it for a pop-up.
    const w = window.open('', '_blank');
    if (dirty && canEdit) {
      const f = await save();
      if (!f) { w?.close(); return; }
    }
    if (w) { w.opener = null; w.location.href = `/forms/${id}`; }
    else window.location.assign(`/forms/${id}`);
  };
  const duplicate = async () => {
    setStatusBusy(true);
    try {
      const copy = tidy(await duplicateForm(session, id));
      listCache = [copy, ...(listCache ?? [])];
      toast({ title: 'Copy made', description: 'A draft with the same questions and settings, and no deadline.' });
      onOpen(copy.id, 'questions');
    } catch (e) { toast({ title: 'Could not copy the form', description: friendlyError(e), variant: 'destructive' }); }
    finally { setStatusBusy(false); }
  };
  const remove = async () => {
    setStatusBusy(true);
    try {
      await deleteForm(session, id);
      unsaved.delete(id);
      if (listCache) listCache = listCache.filter((x) => x.id !== id);
      latest.current.dirty = false;
      toast({ title: 'Form deleted' });
      onOpen(null);
    } catch (e) { toast({ title: 'Could not delete the form', description: friendlyError(e), variant: 'destructive' }); }
    finally { setStatusBusy(false); setAsk(null); }
  };
  const back = () => { if (dirty) setAsk('leave'); else onOpen(null); };

  // ── Render ──────────────────────────────────────────────────────────
  if (missing) {
    return (
      <div className="font-body">
        <button type="button" data-ro onClick={() => onOpen(null)} className="mb-4 inline-flex items-center gap-1.5 text-sm text-accent hover:underline"><ArrowLeft className="h-4 w-4" />All forms</button>
        <div className="border border-dashed border-separator px-5 py-10 text-center">
          <p className="font-serif text-xl text-foreground">This form cannot be opened</p>
          <p className="mt-1 text-sm text-muted-foreground">{missing}</p>
        </div>
      </div>
    );
  }
  if (!saved || !draft) return <WorkspaceLoader />;

  const state = effectiveState(saved);
  const questions = draft.fields.filter(isQuestion).length;
  const paid = responses.filter((r) => r.paid).length;
  const stateLine = (() => {
    if (state === 'draft') return 'A draft: only organisers can open it. Open it when the questions are ready.';
    if (state === 'open') return `Open to every active member. ${saved.closes_at ? `${deadlineRelative(saved.closes_at)} (${deadlineText(saved.closes_at)}).` : 'No deadline: it stays open until you close it.'}`;
    if (state === 'expired') return `The deadline passed ${stamp(saved.closes_at)}, so members can no longer answer. Move the deadline in Settings to take more answers.`;
    return `Closed${saved.closed_at ? ` ${stamp(saved.closed_at)}` : ''}. Members can no longer answer; every answer is kept.`;
  })();

  const tabs: { v: View; label: string; icon: typeof ListChecks; count?: number }[] = [
    { v: 'questions', label: 'Questions', icon: ListChecks, count: questions },
    { v: 'settings', label: 'Settings', icon: Settings2 },
    { v: 'answers', label: 'Answers', icon: BarChart3, count: responses.length },
  ];
  const onTabKey = (e: React.KeyboardEvent) => {
    const i = tabs.findIndex((t) => t.v === view);
    let next = -1;
    if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
    if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = tabs.length - 1;
    if (next < 0) return;
    e.preventDefault();
    onView(tabs[next].v);
    requestAnimationFrame(() => tabsRef.current?.querySelector<HTMLButtonElement>(`[data-tab="${tabs[next].v}"]`)?.focus());
  };

  const primary = !canEdit ? null : state === 'draft'
    ? <Button variant="solid" disabled={statusBusy || saving} onClick={() => setAsk('open')}><Unlock className="h-4 w-4" />Open the form</Button>
    : state === 'open'
      ? <Button variant="outline" disabled={statusBusy || saving} onClick={() => setAsk('close')}><Lock className="h-4 w-4" />Close the form</Button>
      : <Button variant="solid" disabled={statusBusy || saving} onClick={() => setAsk('open')}><Unlock className="h-4 w-4" />Reopen</Button>;

  return (
    <div className="font-body">
      <button type="button" data-ro onClick={back} className="mb-3 inline-flex items-center gap-1.5 text-sm text-accent hover:underline"><ArrowLeft className="h-4 w-4" />All forms</button>

      <div className="mb-4 border-b border-separator pb-4">
        <div className="flex flex-col gap-x-8 gap-y-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="min-w-0 break-words font-serif text-heading text-accent">{draft.title || 'Untitled form'}</h1>
              <StateBadge state={state} />
            </div>
            <p className="mt-1.5 max-w-2xl text-body text-muted-foreground">{stateLine}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button data-ro variant="ghost" onClick={preview}><Eye className="h-4 w-4" />Preview</Button>
            {state !== 'draft' && <Button data-ro variant="outline" onClick={copyLink}><Link2 className="h-4 w-4" />Copy link</Button>}
            {primary}
            {canEdit && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10" aria-label="More for this form">
                    {statusBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="font-body">
                  <DropdownMenuItem onSelect={duplicate}><CopyPlus className="h-4 w-4" />Make a copy</DropdownMenuItem>
                  {state !== 'draft' && responses.length === 0 && (
                    <DropdownMenuItem onSelect={() => setAsk('draft')}><Undo2 className="h-4 w-4" />Back to draft</DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setAsk('delete')} className="text-destructive focus:text-destructive"><Trash2 className="h-4 w-4" />Delete the form</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        {!canEdit && (
          <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Lock aria-hidden className="h-4 w-4 shrink-0" />
            {isDesktop ? 'Your role can read this form but not change it.' : 'Read-only on a phone: open the form on a computer to change it or tick payments.'}
          </p>
        )}
        {restored && dirty && (
          <p className="mt-3 border-l-2 border-accent bg-accent/5 px-3 py-2 text-sm">Your changes from earlier were kept and are not saved yet. Save them, or discard them to see the form as it is.</p>
        )}
      </div>

      <div ref={tabsRef} role="tablist" aria-label="This form" onKeyDown={onTabKey} className="-mx-1 mb-5 flex gap-1 overflow-x-auto border-b border-separator px-1">
        {tabs.map((t) => {
          const selected = t.v === view;
          return (
            <button key={t.v} type="button" role="tab" data-tab={t.v} data-ro id={`form-tab-${t.v}`} aria-controls={`form-panel-${t.v}`}
              aria-selected={selected} tabIndex={selected ? 0 : -1} onClick={() => onView(t.v)}
              className={`-mb-px inline-flex h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-[15px] transition-colors sm:px-4 ${selected ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-accent'}`}>
              <t.icon aria-hidden className="h-4 w-4" />{t.label}
              {t.count !== undefined && <span className="tabular-nums text-xs text-muted-foreground">{t.count}</span>}
            </button>
          );
        })}
        {view === 'answers' && (
          <Button data-ro variant="ghost" size="sm" className="my-auto ml-auto shrink-0" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />Refresh
          </Button>
        )}
      </div>

      <div role="tabpanel" id={`form-panel-${view}`} aria-labelledby={`form-tab-${view}`} className={dirty || problem ? 'pb-24' : ''}>
        {view === 'questions' && (
          <QuestionsEditor
            fields={draft.fields} onChange={(fields) => set({ fields })} answerCount={responses.length} readOnly={readOnly} reveal={reveal}
            title={draft.title} intro={draft.description}
            header={(
              <section className="mb-4 border border-separator border-t-4 border-t-accent p-4 sm:p-5">
                <div className="space-y-1">
                  <Label htmlFor="form-title" className="text-xs">Title</Label>
                  <Input id="form-title" value={draft.title} disabled={readOnly} maxLength={LIMITS.title} onChange={(e) => set({ title: e.target.value })}
                    placeholder="e.g. Hoodie order" className="h-11 font-serif text-xl md:text-xl" />
                </div>
                <div className="mt-3 space-y-1">
                  <Label htmlFor="form-intro" className="text-xs">Introduction (optional)</Label>
                  <Textarea id="form-intro" rows={3} maxLength={4000} disabled={readOnly} value={draft.description ?? ''} onChange={(e) => set({ description: e.target.value })}
                    placeholder="What the form is for, and anything members should know before answering." />
                </div>
              </section>
            )}
          />
        )}
        {view === 'settings' && <FormSettingsPanel form={draft} set={set} readOnly={readOnly} />}
        {view === 'answers' && (
          <AnswersView form={saved} responses={responses} setResponses={(fn) => setResponses(fn)} session={session} readOnly={readOnly} />
        )}
      </div>

      {/* Unsaved changes, always in reach. The right padding keeps Save
          clear of the floating help button in the same corner. */}
      {canEdit && (dirty || problem) && (
        <div className="sticky bottom-0 z-20 mt-6 border border-accent bg-background/95 py-3 pl-4 pr-16 shadow-sm backdrop-blur lg:pr-20" role="region" aria-label="Unsaved changes">
          <div className="flex flex-wrap items-center gap-3">
            <p className="mr-auto min-w-0 text-sm" aria-live="polite">
              {problem
                ? <span className="text-destructive">{problem.message}</span>
                : <><span className="font-medium text-foreground">Unsaved changes.</span> <span className="text-muted-foreground">{saved.status === 'open' ? 'Members see them once you save.' : 'Save before you leave.'}</span></>}
            </p>
            {dirty && <Button variant="ghost" onClick={discard} disabled={saving}>Discard</Button>}
            {dirty && <Button variant="solid" onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Save</Button>}
          </div>
        </div>
      )}

      {/* Open, reopen, close, back to draft, delete, leave. */}
      <AlertDialog open={!!ask} onOpenChange={(o) => { if (!o && !statusBusy) setAsk(null); }}>
        <AlertDialogContent>
          {ask === 'open' && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{state === 'draft' ? 'Open' : 'Reopen'} "{draft.title}"?</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-2">
                    <p>Every active member will find it on their Dashboard and can answer {draft.closes_at ? `until ${deadlineText(draft.closes_at)}` : 'until you close it'}. Each member answers once{draft.allow_edits ? ' and can change their answers while it is open' : ''}, and receives a copy of their answers by email.</p>
                    <p>{questions} {questions === 1 ? 'question' : 'questions'}{draft.track_payments ? `, with a payment${draft.payment_amount != null ? ` of ${money(draft.payment_amount)}` : ''}` : ''}.{dirty ? ' Your unsaved changes are saved first.' : ''}</p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={statusBusy}>Not yet</AlertDialogCancel>
                <AlertDialogAction onClick={(e) => { e.preventDefault(); changeStatus('open'); }} disabled={statusBusy}>
                  {statusBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4" />}{state === 'draft' ? 'Open the form' : 'Reopen'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
          {ask === 'close' && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Close "{draft.title}"?</AlertDialogTitle>
                <AlertDialogDescription>Members can no longer answer or change their answers, and the form leaves their Dashboard. The {responses.length} {responses.length === 1 ? 'answer' : 'answers'} received are kept, and you can reopen the form at any time.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={statusBusy}>Keep it open</AlertDialogCancel>
                <AlertDialogAction onClick={(e) => { e.preventDefault(); changeStatus('closed'); }} disabled={statusBusy}>
                  {statusBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}Close the form
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
          {ask === 'draft' && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Back to draft?</AlertDialogTitle>
                <AlertDialogDescription>The form leaves members' Dashboards and its link opens for organisers only. It has no answers yet, so nothing is lost.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={statusBusy}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={(e) => { e.preventDefault(); changeStatus('draft'); }} disabled={statusBusy}>
                  {statusBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}Back to draft
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
          {ask === 'delete' && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete "{saved.title}"?</AlertDialogTitle>
                <AlertDialogDescription>
                  {responses.length
                    ? `The form, its ${responses.length} ${responses.length === 1 ? 'answer' : 'answers'}${paid ? ` (${paid} paid)` : ''} and every file attached to them are deleted for good. Export the answers first if you need them.`
                    : 'The form is deleted for good.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={statusBusy}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={(e) => { e.preventDefault(); remove(); }} disabled={statusBusy} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {statusBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
          {ask === 'leave' && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Save your changes?</AlertDialogTitle>
                <AlertDialogDescription>This form has changes that are not saved yet.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep editing</AlertDialogCancel>
                <Button variant="outline" onClick={() => { discard(); latest.current.dirty = false; setAsk(null); onOpen(null); }}>Leave without saving</Button>
                <AlertDialogAction onClick={async (e) => { e.preventDefault(); setAsk(null); const f = await save(); if (f) onOpen(null); }}>Save and go back</AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
