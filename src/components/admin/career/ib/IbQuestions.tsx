import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useIsDesktop } from '@/hooks/use-desktop';
import { friendlyError } from '@/lib/errors';
import {
  IB_BANKS, answerIbQuestion, downloadIbGuide, fullIbQuestion, ibGuideRegister, loadIbQuestions, removeIbGuide,
  resetIbProgress, saveIbProgress, saveIbQuestion, uploadIbGuide,
  type IbBank, type IbData, type IbLetter, type IbProgress, type IbQuestion, type IbQuestionDraft,
} from '@/lib/ib-questions-api';
import type { BtProgress } from '@/lib/brainteasers-api';
import { CareerPage } from '../CareerPage';
import { BookView, type BookCopy } from '../BookView';
import { Segmented } from '../gpa/shared';
import { ProblemList } from '../brainteasers/ProblemList';
import { ProgressView } from '../brainteasers/ProgressView';
import { EMPTY_FILTERS, filterProblems, firmFacets, pickRandom, typeFacets, type Filters } from '../brainteasers/model';
import { BANK_INFO, IB_LIST_VOCAB, IB_PROGRESS_VOCAB, metaOf, shuffledOrder, sourceOf, toBtProgress, toListItem } from './ib-model';
import { QuestionPanel } from './QuestionPanel';
import { PracticeView } from './PracticeView';
import { QuestionEditor } from './QuestionEditor';
import type { Checked } from './QuestionBody';

// =====================================================================
// Career > IB Questions (Step 101): two banks of four-option questions
// for investment banking interviews, built as Brainteasers is.
//
//   RedBook           202 questions from Wall Street Prep's guide (2020)
//   Banker Blueprint  145 questions from Breaking Into Wall Street's
//                     "400 Investment Banking Interview Questions" (2010)
//
// Each bank keeps its own subjects and subsections. Four views, switched
// at the top as in Brainteasers:
//
//   Questions    the list with its filters (subject, subsection, where you
//                stand, search) beside the question on screen: choose an
//                answer, check it, read the guide's explanation; flag it,
//                take notes. Brainteasers' own list and filters.
//   Practice     a session of questions one after another, with the score
//                at the end and the ones to try again.
//   My progress  overall, by subject and by subsection (Brainteasers' own).
//   The guide    the bank's guide, as the reader's own watermarked copy
//                (the greenbook's view).
//
// ON A COMPUTER THE PAGE DOES NOT SCROLL (see CareerPage): the list and
// the question scroll inside their cards. On a phone the list is the
// page, and a question opens in a sheet over it.
//
// The right answers come from the function one question at a time, once
// answered. Where the member stands is theirs alone. The bank, the view,
// the filters and the question on screen are kept in this browser, so the
// page reopens where it was left (a convenience only).
// =====================================================================

type View = 'questions' | 'practice' | 'progress' | 'guide';
const STATE_KEY = 'mims.ib.v1';
interface BankState { filters: Filters; selected: string | null }
interface Saved { bank: IbBank; view: View; banks: Record<IbBank, BankState> }

const EMPTY_BANK: BankState = { filters: EMPTY_FILTERS, selected: null };

function readSaved(key: string): Saved {
  const fallback: Saved = { bank: 'redbook', view: 'questions', banks: { redbook: EMPTY_BANK, blueprint: EMPTY_BANK } };
  try {
    const s = JSON.parse(localStorage.getItem(key) || 'null') as Partial<Saved> | null;
    if (!s || typeof s !== 'object') return fallback;
    const bankOf = (b: unknown): BankState => {
      const x = (b && typeof b === 'object' ? b : {}) as Partial<BankState>;
      const f = (x.filters ?? {}) as Partial<Filters>;
      return {
        filters: {
          q: typeof f.q === 'string' ? f.q : '',
          types: Array.isArray(f.types) ? f.types.filter((v) => typeof v === 'string') : [],
          firms: Array.isArray(f.firms) ? f.firms.filter((v) => typeof v === 'string') : [],
          status: ['all', 'todo', 'solved', 'needed', 'flagged', 'noted'].includes(f.status as string) ? f.status as Filters['status'] : 'all',
        },
        selected: typeof x.selected === 'string' ? x.selected : null,
      };
    };
    return {
      bank: s.bank === 'blueprint' ? 'blueprint' : 'redbook',
      view: s.view === 'practice' || s.view === 'progress' || s.view === 'guide' ? s.view : 'questions',
      banks: { redbook: bankOf(s.banks?.redbook), blueprint: bankOf(s.banks?.blueprint) },
    };
  } catch { return fallback; }
}

const emptyProgress = (): IbProgress => ({ status: null, choice: null, attempts: 0, flagged: false, note: null, revealed_at: null, status_at: null });

// ── Each guide's words ──────────────────────────────────────────────
const CHAPTER_HEAD = 'mb-1 mt-6 border-b border-separator pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-accent';
function Chapters({ rows }: { rows: { page: string; title: string; here: string | null }[] }) {
  return (
    <>
      <h3 className={CHAPTER_HEAD}>Read it with the questions</h3>
      <ul className="divide-y divide-separator">
        {rows.map((c) => (
          <li key={c.title} className="flex items-baseline gap-3 py-2.5">
            <span className="w-12 shrink-0 font-serif text-lg text-accent tabular-nums">p. {c.page}</span>
            <span className="min-w-0">
              <span className="block text-[15px] text-foreground">{c.title}</span>
              <span className="block text-xs text-muted-foreground">{c.here ? `Questions: ${c.here}` : 'Only in the guide'}</span>
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

function guideCopy(bank: IbBank): BookCopy {
  if (bank === 'redbook') {
    return {
      cardTitle: 'The RedBook', cardSubtitle: 'Wall Street Prep, first edition (2020)',
      help: { page: 'career-ib', topic: 'guides' }, name: 'RedBook', filePrefix: 'RedBook', inSentence: 'the RedBook',
      emptyTitle: 'The RedBook is on its way', emptyBody: 'It appears here, to download as your own copy, once the President has uploaded it.',
      pdfLabel: 'Choose the RedBook PDF',
      about: [
        { label: 'What it is', text: 'Wall Street Prep\'s "Investment Banking Interview Questions", first edition (2020), known as the RedBook: the technical questions asked in investment banking interviews, on accounting, valuation, M&A, LBOs, capital markets and the industry groups, each with the answer an interviewer expects, and a section on behavioural questions.' },
        { label: 'Who it is for', text: 'Anyone preparing for investment banking, private equity or capital markets interviews, for an internship as for a full-time role.' },
        { label: 'Why it matters', text: 'The 202 questions of this bank come from it, and each gives its page: when an answer is wrong, the guide has the whole explanation, and the open and behavioural questions no four-option question can hold.' },
      ],
      aboutTitle: 'What the RedBook is', aboutSubtitle: 'Who it is for, and why it matters',
      readWith: <Chapters rows={[
        { page: '12', title: 'Accounting', here: 'Accounting' },
        { page: '44', title: 'Valuation', here: 'Valuation' },
        { page: '72', title: 'Mergers & Acquisitions', here: 'Mergers & Acquisitions' },
        { page: '90', title: 'Leveraged Buyouts', here: 'Leveraged Buyouts' },
        { page: '111', title: 'Capital Markets', here: 'Capital Markets' },
        { page: '165', title: 'Industry Specific', here: 'Industry Specific' },
        { page: '260', title: 'Behavioural questions', here: null },
      ]} />,
    };
  }
  return {
    cardTitle: 'Banker Blueprint', cardSubtitle: 'Breaking Into Wall Street (2010)',
    help: { page: 'career-ib', topic: 'guides' }, name: 'Banker Blueprint', filePrefix: 'Banker_Blueprint', inSentence: 'Banker Blueprint',
    emptyTitle: 'Banker Blueprint is on its way', emptyBody: 'It appears here, to download as your own copy, once the President has uploaded it.',
    pdfLabel: 'Choose the Banker Blueprint PDF',
    about: [
      { label: 'What it is', text: '"The 400 Investment Banking Interview Questions & Answers You Need to Know" by Breaking Into Wall Street (2010): fit and behavioural questions with suggested answers, how to discuss your deals, restructuring, and technical questions on accounting, enterprise value, valuation, DCF, merger models and LBOs, basic and advanced.' },
      { label: 'Who it is for', text: 'Anyone preparing for investment banking interviews, from the fit questions that open every interview to the technical ones that follow.' },
      { label: 'Why it matters', text: 'The 145 questions of this bank come from it, page by page; its fit questions and its longer answers are only in the guide. Its figures and rules are from 2010: check them against today\'s accounting and market practice.' },
    ],
    aboutTitle: 'What Banker Blueprint is', aboutSubtitle: 'Who it is for, and why it matters',
    readWith: <Chapters rows={[
      { page: '6', title: 'Fit and qualitative questions', here: null },
      { page: '55', title: 'Discussing transaction experience', here: null },
      { page: '62', title: 'Restructuring and distressed M&A', here: 'Restructuring / Distressed M&A' },
      { page: '76', title: 'Accounting', here: 'Accounting' },
      { page: '95', title: 'Enterprise and equity value', here: 'Enterprise & Equity Value' },
      { page: '102', title: 'Valuation', here: 'Valuation' },
      { page: '119', title: 'Discounted cash flow', here: 'Discounted Cash Flow' },
      { page: '131', title: 'Merger model', here: 'Mergers & Acquisitions' },
      { page: '148', title: 'LBO model', here: 'Leveraged Buyouts' },
      { page: '162', title: 'Brain teasers', here: 'Brainteasers' },
    ]} />,
  };
}

export default function IbQuestions() {
  const { session, user } = useAuth();
  const { toast } = useToast();
  const isDesktop = useIsDesktop();
  const key = `${STATE_KEY}:${user?.id ?? 'anon'}`;
  const [initial] = useState(() => readSaved(key));
  // The answers are shuffled once per visit, the same for a question while the page is open.
  const [seed] = useState(() => Math.random().toString(36).slice(2));

  const [data, setData] = useState<IbData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, IbProgress>>({});
  const [checked, setChecked] = useState<Record<string, Checked>>({});
  const [bank, setBank] = useState<IbBank>(initial.bank);
  const [view, setView] = useState<View>(initial.view);
  const [banks, setBanks] = useState<Record<IbBank, BankState>>(initial.banks);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editor, setEditor] = useState<{ open: boolean; draft: IbQuestionDraft | null }>({ open: false, draft: null });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const d = await loadIbQuestions(session);
      setData(d);
      setProgress(d.progress || {});
    } catch (e) { setLoadError(friendlyError(e)); }
  }, [session]);
  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify({ bank, view, banks })); } catch { /* a convenience only */ }
  }, [key, bank, view, banks]);

  const { filters, selected } = banks[bank];
  const setFilters = (f: Filters) => setBanks((b) => ({ ...b, [bank]: { ...b[bank], filters: f } }));
  const setSelected = useCallback((id: string | null) => setBanks((b) => ({ ...b, [bank]: { ...b[bank], selected: id } })), [bank]);

  const all = useMemo(() => data?.questions ?? [], [data]);
  const questions = useMemo(() => all.filter((q) => q.bank === bank), [all, bank]);
  const byId = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);
  const items = useMemo(() => questions.map(toListItem), [questions]);
  const bt = useMemo(() => {
    const m: Record<string, BtProgress> = {};
    for (const q of questions) { const p = toBtProgress(progress[q.id]); if (p) m[q.id] = p; }
    return m;
  }, [questions, progress]);
  const list = useMemo(() => filterProblems(items, bt, filters), [items, bt, filters]);
  const subjects = useMemo(() => typeFacets(items), [items]);
  const sections = useMemo(() => firmFacets(items), [items]);
  const current = selected ? byId.get(selected) ?? null : null;
  const index = current ? list.findIndex((p) => p.id === current.id) : -1;
  const orderOf = useCallback((id: string) => shuffledOrder(id, seed), [seed]);

  // A question no longer there (hidden, or the set changed) is let go.
  useEffect(() => { if (data && selected && !byId.has(selected)) setSelected(null); }, [data, selected, byId, setSelected]);

  const open = useCallback((id: string) => {
    setSelected(id);
    if (!isDesktop) setSheetOpen(true);
  }, [isDesktop, setSelected]);
  const step = useCallback((d: number) => {
    if (!list.length) return;
    const i = index < 0 ? 0 : Math.min(list.length - 1, Math.max(0, index + d));
    setSelected(list[i].id);
  }, [list, index, setSelected]);
  const random = useCallback(() => {
    const p = pickRandom(list.length ? list : items, bt, selected);
    if (p) open(p.id);
  }, [list, items, bt, selected, open]);

  // Left and right arrows move through the list, when nothing is being typed.
  useEffect(() => {
    if (view !== 'questions' || !isDesktop) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.closest('input, textarea, select, [contenteditable="true"], [role="dialog"], [role="listbox"], [role="radiogroup"]'))) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, isDesktop, step]);

  // ── Answering ────────────────────────────────────────────────────
  const check = async (id: string, choice: IbLetter): Promise<Checked> => {
    try {
      const r = await answerIbQuestion(session, id, choice);
      const c: Checked = { right: r.right, correct: r.correct, explanation: r.explanation, choice };
      setProgress((m) => ({ ...m, [id]: r.progress }));
      setChecked((m) => ({ ...m, [id]: c }));
      return c;
    } catch (e) { throw new Error(friendlyError(e)); }
  };
  const retry = (id: string) => setChecked((m) => { const n = { ...m }; delete n[id]; return n; });

  // ── The member's own flag and note, kept on screen at once ────────
  const flag = async (id: string, f: boolean) => {
    const before = progress[id] ?? emptyProgress();
    setProgress((m) => ({ ...m, [id]: { ...(m[id] ?? emptyProgress()), flagged: f } }));
    try {
      const r = await saveIbProgress(session, id, { flagged: f });
      setProgress((m) => ({ ...m, [id]: { ...(m[id] ?? emptyProgress()), flagged: r.progress.flagged } }));
    } catch (e) {
      setProgress((m) => ({ ...m, [id]: { ...(m[id] ?? emptyProgress()), flagged: before.flagged } }));
      toast({ title: f ? 'Could not flag the question' : 'Could not remove the flag', description: friendlyError(e), variant: 'destructive' });
    }
  };
  const note = async (id: string, text: string) => {
    try {
      const r = await saveIbProgress(session, id, { note: text });
      setProgress((m) => ({ ...m, [id]: { ...(m[id] ?? emptyProgress()), note: r.progress.note } }));
    } catch (e) {
      toast({ title: 'Could not save your note', description: friendlyError(e), variant: 'destructive' });
      throw e;
    }
  };

  const reset = async () => {
    try {
      await resetIbProgress(session, bank);
      const ids = new Set(questions.map((q) => q.id));
      setProgress((m) => {
        const n: Record<string, IbProgress> = {};
        for (const [id, p] of Object.entries(m)) {
          if (!ids.has(id)) n[id] = p;
          else if (p.revealed_at) n[id] = { ...emptyProgress(), revealed_at: p.revealed_at };
        }
        return n;
      });
      setChecked((m) => Object.fromEntries(Object.entries(m).filter(([id]) => !ids.has(id))));
      toast({ title: 'Progress cleared', description: `Every question of ${BANK_INFO[bank].short} is back to Not answered yet.` });
    } catch (e) {
      toast({ title: 'Could not clear your progress', description: friendlyError(e), variant: 'destructive' });
    }
  };

  // ── Editing (the President, the Vice President, the Head of Operations) ──
  const startEdit = async (q: IbQuestion | null) => {
    if (!q) { setEditor({ open: true, draft: null }); return; }
    try {
      const f = await fullIbQuestion(session, q.id);
      setEditor({ open: true, draft: { id: f.id, bank: f.bank, subject: f.subject, section: f.section, question: f.question, original: f.original, kind: f.kind, instruction: f.instruction, statement: f.statement, options: [...f.options], correct: f.correct, explanation: f.explanation, page: f.page, hidden: f.hidden } });
    } catch (e) { toast({ title: 'Could not open the question', description: friendlyError(e), variant: 'destructive' }); }
  };
  const saveEdit = async (d: IbQuestionDraft) => {
    setSaving(true);
    try {
      const full = await saveIbQuestion(session, d);
      const { correct: _c, explanation: _e, ...q } = full;
      setData((cur) => cur ? {
        ...cur,
        questions: cur.questions.some((x) => x.id === q.id) ? cur.questions.map((x) => (x.id === q.id ? q : x)) : [...cur.questions, q],
      } : cur);
      retry(q.id);
      setSelected(q.id);
      setEditor({ open: false, draft: null });
      toast({ title: d.id ? 'Question saved' : 'Question added', description: q.hidden ? 'Hidden from members until you show it again.' : metaOf(q.subject, q.section) });
    } catch (e) {
      toast({ title: 'Could not save the question', description: friendlyError(e), variant: 'destructive' });
    } finally { setSaving(false); }
  };

  // Counted over the bank's questions on the page, so one hidden since is not.
  const answered = questions.filter((q) => progress[q.id]?.status).length;
  const right = questions.filter((q) => progress[q.id]?.status === 'right').length;
  const flagged = questions.filter((q) => progress[q.id]?.flagged).length;
  const perHour = data?.limits.answer_per_hour ?? 100;

  const panel = (compact: boolean) => (
    <QuestionPanel
      question={current} order={current ? orderOf(current.id) : [0, 1, 2, 3]} progress={current ? progress[current.id] : undefined}
      checked={current ? checked[current.id] : undefined}
      onCheck={async (c) => { if (current) await check(current.id, c); }} onRetry={() => { if (current) retry(current.id); }}
      onFlag={(f) => { if (current) void flag(current.id, f); }} onNote={note}
      index={index} count={list.length} onPrev={() => step(-1)} onNext={() => step(1)} onRandom={random}
      canManage={!!data?.can_manage} onEdit={() => void startEdit(current)} perHour={perHour} compact={compact}
    />
  );

  const viewClass = (v: View) => (view === v ? 'lg:flex lg:min-h-0 lg:flex-1 lg:flex-col' : 'hidden');
  const info = BANK_INFO[bank];

  let body: ReactNode;
  if (!data) {
    body = (
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
    );
  } else {
    body = (
      <>
        <div className={viewClass('questions')}>
          <div className="grid grid-cols-1 gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
            <ProblemList
              problems={list} total={items.length} progress={bt} selectedId={selected} onSelect={open}
              filters={filters} setFilters={setFilters} types={subjects} firms={sections}
              canManage={data.can_manage} onAdd={() => void startEdit(null)} onRandom={random} vocab={IB_LIST_VOCAB}
            />
            {isDesktop && panel(false)}
          </div>
        </div>
        <div className={viewClass('practice')}>
          <PracticeView
            key={bank} bankLabel={info.short} storageKey={`${key}:${bank}`}
            questions={questions.filter((q) => !q.hidden)} progress={progress} subjects={subjects} sections={sections}
            orderOf={orderOf} onCheck={check} onFlag={(id, f) => void flag(id, f)} perHour={perHour}
            onOpen={(id) => { setFilters(EMPTY_FILTERS); setView('questions'); open(id); }}
          />
        </div>
        <div className={viewClass('progress')}>
          <ProgressView
            problems={items} progress={bt} onReset={reset} vocab={IB_PROGRESS_VOCAB}
            onShow={(f) => { setFilters({ ...EMPTY_FILTERS, ...f }); setView('questions'); }}
          />
        </div>
        <div className={viewClass('guide')}>
          <BookView
            key={bank} book={data.guides[bank]} canReplace={data.can_replace_guides} perDay={data.limits.guide_per_day}
            onChange={(g) => setData((cur) => (cur ? { ...cur, guides: { ...cur.guides, [bank]: g } } : cur))}
            copy={guideCopy(bank)}
            actions={{
              download: () => downloadIbGuide(session, bank),
              upload: (file, title) => uploadIbGuide(session, bank, file, title),
              remove: () => removeIbGuide(session, bank),
              register: () => ibGuideRegister(session, bank),
            }}
          />
        </div>
      </>
    );
  }

  return (
    <CareerPage
      title="IB Questions"
      description="Investment banking interview questions from two guides, with the right answer and the guide's explanation. Answer, practise, and keep track of what you have mastered."
      toolbar={(
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <Segmented<IbBank> value={bank} onChange={(b) => { setBank(b); setSheetOpen(false); }} label="Question bank" nowrap className="w-full sm:w-auto sm:inline-flex" options={IB_BANKS} />
            <Segmented<View>
              value={view} onChange={setView} label="IB Questions view" nowrap className="w-full sm:w-auto sm:inline-flex"
              options={[
                { value: 'questions', label: 'Questions' },
                { value: 'practice', label: 'Practice' },
                { value: 'progress', label: 'My progress' },
                { value: 'guide', label: 'The guide' },
              ]}
            />
          </div>
          {data && (
            <p className="font-body text-sm text-muted-foreground" aria-live="polite">
              <span className="text-foreground tabular-nums">{answered}</span> of {questions.length} answered
              {answered ? <> · <span className="tabular-nums">{right}</span> right</> : null}
              {flagged ? <> · <span className="tabular-nums">{flagged}</span> flagged</> : null}
            </p>
          )}
        </div>
      )}
    >
      {body}

      {!isDesktop && (
        <Sheet open={sheetOpen && !!current && view === 'questions'} onOpenChange={setSheetOpen}>
          <SheetContent side="bottom" className="h-[92vh] overflow-y-auto p-5 ws-form-touch">
            {current && (
              <SheetHeader className="mb-3 space-y-1 text-left">
                <SheetTitle className="font-serif text-2xl font-normal leading-tight text-accent">{metaOf(current.subject, current.section)}</SheetTitle>
                <SheetDescription className="text-xs uppercase tracking-wider">{sourceOf(current.bank, current.page)}</SheetDescription>
              </SheetHeader>
            )}
            {panel(true)}
          </SheetContent>
        </Sheet>
      )}

      {data?.can_manage && (
        <QuestionEditor
          open={editor.open} bank={editor.draft?.bank ?? bank} initial={editor.draft} saving={saving}
          subjects={subjects.map((t) => t.value)} sections={sections.map((s) => s.value)}
          onClose={() => setEditor({ open: false, draft: null })} onSave={(d) => void saveEdit(d)}
        />
      )}
    </CareerPage>
  );
}
