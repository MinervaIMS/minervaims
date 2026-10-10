import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useIsDesktop } from '@/hooks/use-desktop';
import { friendlyError } from '@/lib/errors';
import {
  loadBrainteasers, resetProgress, revealSolution, saveBrainteaser, saveProgress,
  type Brainteaser, type BrainteaserDraft, type BrainteasersData, type BtProgress, type BtStatus, type Greenbook,
} from '@/lib/brainteasers-api';
import { CareerPage } from '../CareerPage';
import { Segmented } from '../gpa/shared';
import { ProblemList } from './ProblemList';
import { ProblemPanel } from './ProblemPanel';
import { ProgressView } from './ProgressView';
import { GreenbookView } from './GreenbookView';
import { ProblemEditor } from './ProblemEditor';
import { EMPTY_FILTERS, NO_FIRM_LABEL, filterProblems, firmFacets, pickRandom, typeFacets, type Filters } from './model';

// =====================================================================
// Career > Brainteasers: interview questions to train on.
// ---------------------------------------------------------------------
// Three views, switched at the top, as in the GPA Converter:
//
//   Questions    the list with its filters (type, firm, where you stand,
//                search) beside the question on screen: read it, try it,
//                open the solution, say how it went, flag it, take notes.
//                Random picks one from the list you have not done yet.
//   My progress  overall, by type and by firm; every row opens the
//                questions it counts.
//   Greenbook    the one downloadable file, as the reader's own
//                watermarked copy.
//
// ON A COMPUTER THE PAGE DOES NOT SCROLL (see CareerPage): the list and
// the question scroll inside their cards. On a phone the list is the
// page, and a question opens in a sheet over it.
//
// Nothing is downloadable but the greenbook: solutions come from the
// function one at a time, as they are opened, and are not selectable or
// printable here. Where the member stands is theirs alone.
// The filters and the question on screen are kept in this browser, so
// the page reopens where it was left (a convenience: it can come back
// empty, and the page works without it).
// =====================================================================

type View = 'questions' | 'progress' | 'greenbook';
const STATE_KEY = 'mims.brainteasers.v1';

interface Saved { view: View; filters: Filters; selected: string | null }

function readSaved(key: string): Saved {
  try {
    const s = JSON.parse(localStorage.getItem(key) || 'null') as Partial<Saved> | null;
    if (s && typeof s === 'object') {
      const f = s.filters as Partial<Filters> | undefined;
      return {
        view: s.view === 'progress' || s.view === 'greenbook' ? s.view : 'questions',
        filters: {
          q: typeof f?.q === 'string' ? f.q : '',
          types: Array.isArray(f?.types) ? f!.types.filter((x) => typeof x === 'string') : [],
          firms: Array.isArray(f?.firms) ? f!.firms.filter((x) => typeof x === 'string') : [],
          status: ['all', 'todo', 'solved', 'needed', 'flagged', 'noted'].includes(f?.status as string) ? f!.status as Filters['status'] : 'all',
        },
        selected: typeof s.selected === 'string' ? s.selected : null,
      };
    }
  } catch { /* a convenience only */ }
  return { view: 'questions', filters: EMPTY_FILTERS, selected: null };
}

const emptyProgress = (): BtProgress => ({ status: null, flagged: false, note: null, revealed_at: null, status_at: null });

export default function Brainteasers() {
  const { session, user } = useAuth();
  const { toast } = useToast();
  const isDesktop = useIsDesktop();
  const key = `${STATE_KEY}:${user?.id ?? 'anon'}`;
  const [initial] = useState(() => readSaved(key));

  const [data, setData] = useState<BrainteasersData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, BtProgress>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [view, setView] = useState<View>(initial.view);
  const [filters, setFilters] = useState<Filters>(initial.filters);
  const [selected, setSelected] = useState<string | null>(initial.selected);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [revealError, setRevealError] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ open: boolean; draft: BrainteaserDraft | null }>({ open: false, draft: null });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const d = await loadBrainteasers(session);
      setData(d);
      setProgress(d.progress || {});
    } catch (e) { setLoadError(friendlyError(e)); }
  }, [session]);
  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify({ view, filters, selected })); } catch { /* a convenience only */ }
  }, [key, view, filters, selected]);

  const problems = useMemo(() => data?.problems ?? [], [data]);
  const byId = useMemo(() => new Map(problems.map((p) => [p.id, p])), [problems]);
  const list = useMemo(() => filterProblems(problems, progress, filters), [problems, progress, filters]);
  const types = useMemo(() => typeFacets(problems), [problems]);
  const firms = useMemo(() => firmFacets(problems), [problems]);
  const current = selected ? byId.get(selected) ?? null : null;
  const index = current ? list.findIndex((p) => p.id === current.id) : -1;

  // A question no longer there (hidden, or the set changed) is let go.
  useEffect(() => { if (data && selected && !byId.has(selected)) setSelected(null); }, [data, selected, byId]);
  useEffect(() => { setRevealError(null); }, [selected]);

  const open = useCallback((id: string) => {
    setSelected(id);
    if (!isDesktop) setSheetOpen(true);
  }, [isDesktop]);
  const step = useCallback((d: number) => {
    if (!list.length) return;
    const i = index < 0 ? 0 : Math.min(list.length - 1, Math.max(0, index + d));
    setSelected(list[i].id);
  }, [list, index]);
  const random = useCallback(() => {
    const p = pickRandom(list.length ? list : problems, progress, selected);
    if (p) open(p.id);
  }, [list, problems, progress, selected, open]);

  // Left and right arrows move through the list, when nothing is being typed.
  useEffect(() => {
    if (view !== 'questions' || !isDesktop) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.closest('input, textarea, select, [contenteditable="true"], [role="dialog"], [role="listbox"]'))) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, isDesktop, step]);

  // ── The member's own record, kept on screen at once and stored after ──
  // Quick changes (Solved, then Needed, then a flag) can come back in any
  // order: each answer only updates the parts it changed, and only if no
  // later change to them has been made since.
  const seq = useRef(0);
  const latest = useRef<Record<string, number>>({});
  const patch = async (id: string, change: Partial<Pick<BtProgress, 'status' | 'flagged' | 'note'>>, failTitle: string) => {
    const fields = Object.keys(change) as ('status' | 'flagged' | 'note')[];
    const before = progress[id] ?? emptyProgress();
    const n = ++seq.current;
    for (const f of fields) latest.current[`${id}:${f}`] = n;
    const stillMine = () => fields.filter((f) => latest.current[`${id}:${f}`] === n);
    setProgress((m) => ({ ...m, [id]: { ...(m[id] ?? emptyProgress()), ...change } }));
    try {
      const r = await saveProgress(session, id, change);
      const mine = stillMine();
      if (mine.length) {
        setProgress((m) => {
          const cur = m[id] ?? emptyProgress();
          const next: BtProgress = { ...cur, revealed_at: r.progress.revealed_at ?? cur.revealed_at };
          for (const f of mine) (next as unknown as Record<string, unknown>)[f] = r.progress[f];
          if (mine.includes('status')) next.status_at = r.progress.status_at;
          return { ...m, [id]: next };
        });
      }
    } catch (e) {
      const mine = stillMine();
      if (mine.length) {
        setProgress((m) => {
          const next: BtProgress = { ...(m[id] ?? emptyProgress()) };
          for (const f of mine) (next as unknown as Record<string, unknown>)[f] = before[f];
          return { ...m, [id]: next };
        });
      }
      toast({ title: failTitle, description: friendlyError(e), variant: 'destructive' });
      throw e;
    }
  };

  const reveal = async () => {
    if (!current) return;
    setRevealing(true); setRevealError(null);
    try {
      const r = await revealSolution(session, current.id);
      setAnswers((a) => ({ ...a, [r.id]: r.answer }));
      setProgress((m) => ({ ...m, [r.id]: { ...(m[r.id] ?? emptyProgress()), revealed_at: r.revealed_at } }));
    } catch (e) { setRevealError(friendlyError(e)); }
    finally { setRevealing(false); }
  };

  const reset = async () => {
    try {
      await resetProgress(session);
      setProgress((m) => {
        const n: Record<string, BtProgress> = {};
        for (const [id, p] of Object.entries(m)) if (p.revealed_at) n[id] = { ...emptyProgress(), revealed_at: p.revealed_at };
        return n;
      });
      toast({ title: 'Progress cleared', description: 'Every question is back to Not done yet.' });
    } catch (e) {
      toast({ title: 'Could not clear your progress', description: friendlyError(e), variant: 'destructive' });
    }
  };

  // ── Editing (the President, the Vice President, the Head of Operations) ──
  const startEdit = async (p: Brainteaser | null) => {
    if (!p) { setEditor({ open: true, draft: null }); return; }
    let answer = answers[p.id];
    if (answer === undefined) {
      try {
        const r = await revealSolution(session, p.id);
        answer = r.answer;
        setAnswers((a) => ({ ...a, [p.id]: r.answer }));
      } catch (e) { toast({ title: 'Could not open the question', description: friendlyError(e), variant: 'destructive' }); return; }
    }
    setEditor({ open: true, draft: { id: p.id, title: p.title, field: p.field, firms: p.firms, question: p.question, answer, hidden: p.hidden } });
  };
  const saveEdit = async (d: BrainteaserDraft) => {
    setSaving(true);
    try {
      const { problem } = await saveBrainteaser(session, d);
      const { answer, ...rest } = problem;
      setData((cur) => cur ? {
        ...cur,
        problems: cur.problems.some((x) => x.id === rest.id)
          ? cur.problems.map((x) => (x.id === rest.id ? rest : x))
          : [...cur.problems, rest],
      } : cur);
      setAnswers((a) => ({ ...a, [rest.id]: answer }));
      setSelected(rest.id);
      setEditor({ open: false, draft: null });
      toast({ title: d.id ? 'Question saved' : 'Question added', description: rest.hidden ? 'Hidden from members until you show it again.' : rest.title });
    } catch (e) {
      toast({ title: 'Could not save the question', description: friendlyError(e), variant: 'destructive' });
    } finally { setSaving(false); }
  };

  // Counted over the questions on the page, so one hidden since is not.
  const done = problems.filter((p) => progress[p.id]?.status).length;
  const flagged = problems.filter((p) => progress[p.id]?.flagged).length;

  const panel = (compact: boolean) => (
    <ProblemPanel
      problem={current} progress={current ? progress[current.id] : undefined} answer={current ? answers[current.id] : undefined}
      revealing={revealing} revealError={revealError} onReveal={reveal}
      onStatus={(s: BtStatus | null) => { if (current) void patch(current.id, { status: s }, 'Could not save how it went').catch(() => undefined); }}
      onFlag={(f) => { if (current) void patch(current.id, { flagged: f }, f ? 'Could not flag the question' : 'Could not remove the flag').catch(() => undefined); }}
      onNote={(id, note) => patch(id, { note }, 'Could not save your note')}
      index={index} count={list.length} onPrev={() => step(-1)} onNext={() => step(1)} onRandom={random}
      canManage={!!data?.can_manage} onEdit={() => void startEdit(current)}
      perHour={data?.limits.reveal_per_hour ?? 40} compact={compact}
    />
  );

  const viewClass = (v: View) => (view === v ? 'lg:flex lg:min-h-0 lg:flex-1 lg:flex-col' : 'hidden');

  return (
    <CareerPage
      title="Brainteasers"
      description="Interview questions asked by trading firms, with worked solutions. Filter by type and by firm, train, and keep track of what you have mastered."
      toolbar={(
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Segmented<View>
            value={view} onChange={setView} label="Brainteasers view" nowrap className="w-full sm:w-auto sm:inline-flex"
            options={[
              { value: 'questions', label: 'Questions' },
              { value: 'progress', label: 'My progress' },
              { value: 'greenbook', label: 'Greenbook' },
            ]}
          />
          {data && (
            <p className="font-body text-sm text-muted-foreground" aria-live="polite">
              <span className="text-foreground tabular-nums">{done}</span> of {problems.length} done
              {flagged ? <> · <span className="tabular-nums">{flagged}</span> flagged</> : null}
            </p>
          )}
        </div>
      )}
    >
      {!data ? (
        <div className="flex flex-1 items-center justify-center py-16 font-body">
          {loadError ? (
            <div className="text-center">
              <p className="text-sm text-destructive" role="alert">{loadError}</p>
              <Button data-ro type="button" variant="outline" size="sm" className="mt-3" onClick={() => void load()}>Try again</Button>
            </div>
          ) : (
            <p className="inline-flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading the questions...</p>
          )}
        </div>
      ) : (
        <>
          <div className={viewClass('questions')}>
            <div className="grid grid-cols-1 gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
              <ProblemList
                problems={list} total={problems.length} progress={progress} selectedId={selected} onSelect={open}
                filters={filters} setFilters={setFilters} types={types} firms={firms}
                canManage={data.can_manage} onAdd={() => void startEdit(null)} onRandom={random}
              />
              {isDesktop && panel(false)}
            </div>
          </div>
          <div className={viewClass('progress')}>
            <ProgressView
              problems={problems} progress={progress} onReset={reset}
              onShow={(f) => { setFilters({ ...EMPTY_FILTERS, ...f }); setView('questions'); }}
            />
          </div>
          <div className={viewClass('greenbook')}>
            <GreenbookView
              greenbook={data.greenbook} canReplace={data.can_replace_greenbook} perDay={data.limits.greenbook_per_day}
              onChange={(g: Greenbook | null) => setData((cur) => (cur ? { ...cur, greenbook: g } : cur))}
            />
          </div>
        </>
      )}

      {!isDesktop && (
        <Sheet open={sheetOpen && !!current} onOpenChange={setSheetOpen}>
          <SheetContent side="bottom" className="h-[92vh] overflow-y-auto p-5">
            {current && (
              <SheetHeader className="mb-3 space-y-1 text-left">
                <SheetTitle className="font-serif text-2xl font-normal leading-tight text-accent">{current.title}</SheetTitle>
                <SheetDescription className="text-xs uppercase tracking-wider">{current.field} · {current.firms.length ? current.firms.join(', ') : NO_FIRM_LABEL}</SheetDescription>
              </SheetHeader>
            )}
            {panel(true)}
          </SheetContent>
        </Sheet>
      )}

      <ProblemEditor
        open={editor.open} initial={editor.draft} saving={saving}
        types={types.map((t) => t.value)} firms={firms.map((f) => f.label).filter((f) => f !== NO_FIRM_LABEL)}
        onClose={() => setEditor({ open: false, draft: null })} onSave={(d) => void saveEdit(d)}
      />
    </CareerPage>
  );
}
