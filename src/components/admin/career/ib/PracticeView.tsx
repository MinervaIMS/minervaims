import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, Circle, Flag, MinusCircle, Play, RotateCcw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HelpDot } from '@/components/admin/help/HelpSystem';
import type { IbLetter, IbProgress, IbQuestion } from '@/lib/ib-questions-api';
import { CareerCard } from '../CareerCard';
import { Segmented } from '../gpa/shared';
import { SELECT_CLASS } from '../gpa/format';
import { MultiPick } from '../brainteasers/MultiPick';
import type { Facet } from '../brainteasers/model';
import { pct } from '../brainteasers/model';
import { metaOf, sourceOf } from './ib-model';
import { QuestionBody, type Checked } from './QuestionBody';

// =====================================================================
// IB Questions > Practice: a session of questions answered one after
// another, as the guides' own practice sets are. Choose the subjects and
// subsections, which questions (all, not answered yet, answered wrong,
// flagged) and how many; then answer, skip or flag each in turn. At the
// end: the score, and the questions to try again. Every answer counts in
// My progress, as one given in Questions does.
//
// The session is kept in this browser, so a reload carries on where it
// was (a convenience: it can come back empty, and the page works without
// it).
// =====================================================================

type Which = 'all' | 'todo' | 'wrong' | 'flagged';
type Size = '10' | '20' | '50' | 'all';
type Result = 'right' | 'wrong' | 'skipped';

interface Setup { subjects: string[]; sections: string[]; which: Which; size: Size }
interface Session { ids: string[]; i: number; results: Record<string, Result> }

const EMPTY_SETUP: Setup = { subjects: [], sections: [], which: 'all', size: '20' };

function read<T>(key: string): T | null {
  try { return JSON.parse(localStorage.getItem(key) || 'null') as T | null; } catch { return null; }
}
function write(key: string, v: unknown) {
  try { if (v === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(v)); } catch { /* a convenience only */ }
}

function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const WHICH: { value: Which; label: string }[] = [
  { value: 'all', label: 'All questions' },
  { value: 'todo', label: 'Not answered yet' },
  { value: 'wrong', label: 'Answered wrong' },
  { value: 'flagged', label: 'Flagged' },
];
const SIZES: { value: Size; label: string }[] = [
  { value: '10', label: '10' }, { value: '20', label: '20' }, { value: '50', label: '50' }, { value: 'all', label: 'All' },
];

function ResultIcon({ r }: { r?: Result }) {
  if (r === 'right') return <CheckCircle2 aria-label="Right" className="h-4 w-4 text-emerald-700" />;
  if (r === 'wrong') return <XCircle aria-label="Wrong" className="h-4 w-4 text-amber-700" />;
  if (r === 'skipped') return <MinusCircle aria-label="Skipped" className="h-4 w-4 text-muted-foreground" />;
  return <Circle aria-label="Not answered yet" className="h-4 w-4 text-muted-foreground/50" />;
}

export function PracticeView({
  bankLabel, storageKey, questions, progress, subjects, sections, orderOf, onCheck, onFlag, onOpen, perHour,
}: {
  bankLabel: string;
  /** Where this bank's session is kept in the browser. */
  storageKey: string;
  /** The bank's questions members can see. */
  questions: IbQuestion[];
  progress: Record<string, IbProgress>;
  subjects: Facet[];
  sections: Facet[];
  orderOf: (id: string) => number[];
  /** Checks an answer and records it; rejects with a message to show. */
  onCheck: (id: string, choice: IbLetter) => Promise<Checked>;
  onFlag: (id: string, f: boolean) => void;
  /** Opens a question in Questions. */
  onOpen: (id: string) => void;
  perHour: number;
}) {
  const [setup, setSetup] = useState<Setup>(() => ({ ...EMPTY_SETUP, ...(read<Partial<Setup>>(`${storageKey}:setup`) ?? {}) }));
  const [session, setSession] = useState<Session | null>(() => read<Session>(`${storageKey}:session`));
  const [checked, setChecked] = useState<Record<string, Checked>>({});
  useEffect(() => { write(`${storageKey}:setup`, setup); }, [storageKey, setup]);
  useEffect(() => { write(`${storageKey}:session`, session); }, [storageKey, session]);

  const byId = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);
  // A session's questions that are no longer there (hidden since) are let go.
  const ids = useMemo(() => (session ? session.ids.filter((id) => byId.has(id)) : []), [session, byId]);

  const pool = useMemo(() => {
    const subj = new Set(setup.subjects);
    const sec = new Set(setup.sections);
    return questions.filter((q) => {
      if (subj.size && !subj.has(q.subject)) return false;
      if (sec.size && !sec.has(q.section)) return false;
      const p = progress[q.id];
      if (setup.which === 'todo') return !p?.status;
      if (setup.which === 'wrong') return p?.status === 'wrong';
      if (setup.which === 'flagged') return !!p?.flagged;
      return true;
    });
  }, [questions, progress, setup]);
  const take = setup.size === 'all' ? pool.length : Math.min(pool.length, Number(setup.size));

  const start = (list: string[]) => {
    setChecked({});
    setSession({ ids: list, i: 0, results: {} });
  };

  const finished = !!session && session.i >= ids.length;
  const current = session && !finished ? byId.get(ids[session.i]) ?? null : null;
  const results = session?.results ?? {};
  const answered = ids.filter((id) => results[id] === 'right' || results[id] === 'wrong').length;
  const right = ids.filter((id) => results[id] === 'right').length;
  const missed = ids.filter((id) => results[id] === 'wrong');
  const flaggedHere = ids.filter((id) => progress[id]?.flagged);

  const next = () => setSession((s) => (s ? { ...s, i: s.i + 1 } : s));
  const skip = () => {
    if (!current) return;
    setSession((s) => (s ? { ...s, results: { ...s.results, [current.id]: s.results[current.id] ?? 'skipped' }, i: s.i + 1 } : s));
  };
  const check = async (choice: IbLetter) => {
    if (!current) return;
    const id = current.id;
    const r = await onCheck(id, choice);
    setChecked((m) => ({ ...m, [id]: r }));
    setSession((s) => (s ? { ...s, results: { ...s.results, [id]: r.right ? 'right' : 'wrong' } } : s));
  };

  // ── Setting up, or the session's list ──────────────────────────────
  const left = !session ? (
    <CareerCard title="A practice session" subtitle={bankLabel} scroll className="lg:h-full" action={<HelpDot page="career-ib" topic="practice" />}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
          <MultiPick label="Subject" all="All subjects" options={subjects} selected={setup.subjects} onChange={(v) => setSetup({ ...setup, subjects: v })} />
          <MultiPick label="Subsection" all="All subsections" options={sections} selected={setup.sections} onChange={(v) => setSetup({ ...setup, sections: v })} searchable />
        </div>
        <label className="block">
          <span className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Which questions</span>
          <select data-ro value={setup.which} onChange={(e) => setSetup({ ...setup, which: e.target.value as Which })} className={SELECT_CLASS}>
            {WHICH.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <div>
          <p className="mb-1.5 text-xs uppercase tracking-wider text-muted-foreground">How many</p>
          <Segmented<Size> value={setup.size} onChange={(v) => setSetup({ ...setup, size: v })} label="How many questions" options={SIZES} className="w-full" />
        </div>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          <span className="tabular-nums text-foreground">{pool.length}</span> {pool.length === 1 ? 'question matches' : 'questions match'}
          {pool.length ? <>; the session takes <span className="tabular-nums text-foreground">{take}</span>, in a random order.</> : '. Widen the choice above.'}
        </p>
        <Button data-ro type="button" variant="solid" className="w-full" disabled={!take} onClick={() => start(shuffle(pool.map((q) => q.id)).slice(0, take))}>
          <Play className="h-4 w-4" />Start the session
        </Button>
      </div>
    </CareerCard>
  ) : (
    <CareerCard
      title="This session" subtitle={`${right} right of ${answered} answered · ${ids.length} questions`}
      className="lg:h-full lg:min-h-0" bodyClassName="lg:min-h-0"
      action={<Button data-ro type="button" size="sm" variant="ghost" onClick={() => setSession(null)}>End</Button>}
    >
      <span className="mb-3 flex h-2 w-full shrink-0 overflow-hidden rounded-full bg-muted" aria-hidden>
        <span className="h-full bg-emerald-600" style={{ width: `${pct(right, ids.length)}%` }} />
        <span className="h-full bg-amber-400" style={{ width: `${pct(missed.length, ids.length)}%` }} />
      </span>
      <ol aria-label="The questions of this session" className="min-h-0 flex-1 divide-y divide-separator border-t border-separator lg:ws-card-scroll lg:-mr-2 lg:pr-2">
        {ids.map((id, n) => {
          const q = byId.get(id)!;
          const on = session.i === n;
          return (
            <li key={id}>
              <button type="button" data-ro onClick={() => setSession((s) => (s ? { ...s, i: n } : s))} aria-current={on ? 'true' : undefined}
                className={`flex w-full items-start gap-2.5 px-2 py-2 text-left transition-colors ${on ? 'bg-accent/[0.07]' : 'hover:bg-accent/[0.04]'}`}>
                <span className="mt-0.5 w-6 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{n + 1}</span>
                <span className="mt-0.5 shrink-0"><ResultIcon r={results[id]} /></span>
                <span className={`min-w-0 flex-1 truncate text-sm ${on ? 'text-accent' : 'text-foreground'}`}>{q.question}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </CareerCard>
  );

  // ── The question, or the end of the session ────────────────────────
  let right_: ReactNode;
  if (!session) {
    right_ = (
      <CareerCard title="How a session works" className="lg:h-full lg:min-h-0" bodyClassName="lg:min-h-0">
        <ol className="space-y-3 text-sm leading-relaxed text-foreground">
          <li>1. Choose the subjects and subsections, which questions and how many. The session takes them in a random order.</li>
          <li>2. Answer each one, then check it: the right answer and the guide's explanation follow at once. Skip one you would rather leave for later, or flag it to come back to it.</li>
          <li>3. At the end you see your score, and can try again the questions you got wrong or flagged.</li>
        </ol>
        <p className="mt-4 text-sm text-muted-foreground">Every answer counts in My progress, as one given in Questions does.</p>
      </CareerCard>
    );
  } else if (finished) {
    right_ = (
      <CareerCard title="Session complete" subtitle={bankLabel} scroll className="lg:h-full">
        <div className="space-y-5">
          <div>
            <p className="font-serif text-[40px] leading-none text-accent tabular-nums">{right} <span className="text-2xl text-muted-foreground">/ {ids.length}</span></p>
            <p className="mt-2 text-sm text-muted-foreground">
              {answered ? `${pct(right, answered)}% of the questions you answered were right.` : 'You did not answer any question.'}
              {ids.length - answered ? ` ${ids.length - answered} skipped.` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button data-ro type="button" variant="solid" disabled={!missed.length} onClick={() => start(shuffle(missed))}><RotateCcw className="h-4 w-4" />Try again the {missed.length} I got wrong</Button>
            <Button data-ro type="button" variant="outline" disabled={!flaggedHere.length} onClick={() => start(shuffle(flaggedHere))}><Flag className="h-4 w-4" />Try the {flaggedHere.length} flagged</Button>
            <Button data-ro type="button" variant="ghost" onClick={() => setSession(null)}>New session</Button>
          </div>
          {missed.length > 0 && (
            <div>
              <h3 className="mb-1 border-b border-separator pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-accent">Answered wrong</h3>
              <ul className="divide-y divide-separator">
                {missed.map((id) => {
                  const q = byId.get(id)!;
                  return (
                    <li key={id}>
                      <button type="button" data-ro onClick={() => onOpen(id)} className="w-full py-2.5 text-left hover:text-accent">
                        <span className="block text-[15px] leading-snug text-foreground">{q.question}</span>
                        <span className="block text-xs text-muted-foreground">{metaOf(q.subject, q.section)} · open in Questions</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </CareerCard>
    );
  } else if (current) {
    const flagged = !!progress[current.id]?.flagged;
    const isChecked = checked[current.id];
    right_ = (
      <CareerCard
        title={`Question ${session.i + 1} of ${ids.length}`} subtitle={`${metaOf(current.subject, current.section)} · ${sourceOf(current.bank, current.page)}`}
        scroll className="lg:h-full"
        action={(
          <Button data-ro type="button" size="sm" variant={flagged ? 'outline' : 'ghost'} onClick={() => onFlag(current.id, !flagged)} aria-pressed={flagged}
            title={flagged ? 'Flagged: press to unflag' : 'Flag it, to come back to it'}
            className={`max-lg:min-w-11 ${flagged ? 'border-amber-500/60 text-amber-800' : ''}`}>
            <Flag className={`h-4 w-4 ${flagged ? 'fill-amber-500 text-amber-600' : ''}`} /><span className="hidden sm:inline">{flagged ? 'Flagged' : 'Flag'}</span>
          </Button>
        )}
      >
        <QuestionBody
          question={current} order={orderOf(current.id)} progress={progress[current.id]} checked={isChecked}
          onCheck={check} onRetry={() => setChecked((m) => { const n = { ...m }; delete n[current.id]; return n; })}
          perHour={perHour} idPrefix="ib-practice"
        />
        {/* On a computer the card's body scrolls, so Skip and Next stay at its foot. */}
        <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-separator pt-4 lg:sticky lg:bottom-0 lg:z-10 lg:bg-background lg:pb-0.5">
          {!isChecked && <Button data-ro type="button" variant="ghost" onClick={skip}>Skip</Button>}
          <Button data-ro type="button" variant={isChecked ? 'solid' : 'outline'} onClick={next} disabled={!isChecked && !results[current.id]}>
            {session.i + 1 >= ids.length ? 'See my score' : 'Next question'}
          </Button>
        </div>
      </CareerCard>
    );
  } else {
    right_ = <CareerCard title="Practice" className="lg:h-full"><p className="text-sm text-muted-foreground">This session's questions are no longer available. End it and start a new one.</p></CareerCard>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
      {left}
      {right_}
    </div>
  );
}

export default PracticeView;
