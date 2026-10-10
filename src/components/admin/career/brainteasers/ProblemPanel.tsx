import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, EyeOff, Flag, Loader2, Pencil, Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HelpDot } from '@/components/admin/help/HelpSystem';
import type { Brainteaser, BtProgress, BtStatus } from '@/lib/brainteasers-api';
import { CareerCard } from '../CareerCard';
import { MathText } from './MathText';
import { NO_FIRM_LABEL } from './model';

// =====================================================================
// One question: read it, try it, then open the solution and say how it
// went. The order is deliberate, and the one a coach would set: the
// solution is behind a button, so the first thing the eye meets is the
// question, not the answer to it.
//
// What the member records here is theirs alone: how it went (solved on
// their own, or needed the solution), a "hard" flag to come back to, and
// a note. Nobody else sees any of it.
// =====================================================================

const NOTE_MAX = 2000;

export function ProblemPanel({
  problem, progress, answer, revealing, revealError, onReveal, onStatus, onFlag, onNote,
  index, count, onPrev, onNext, onRandom, canManage, onEdit, perHour, compact = false,
}: {
  problem: Brainteaser | null;
  progress?: BtProgress;
  answer?: string;
  revealing: boolean;
  revealError?: string | null;
  onReveal: () => void;
  onStatus: (s: BtStatus | null) => void;
  onFlag: (f: boolean) => void;
  /** Saves the note of the question it was written for; resolves when it is stored. */
  onNote: (id: string, note: string) => Promise<void>;
  index: number;
  count: number;
  onPrev: () => void;
  onNext: () => void;
  onRandom: () => void;
  canManage: boolean;
  onEdit: () => void;
  perHour: number;
  /** In a phone's sheet: no card chrome of its own. */
  compact?: boolean;
}) {
  const [note, setNote] = useState(progress?.note ?? '');
  const [noteState, setNoteState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saved = useRef(progress?.note ?? '');
  const timer = useRef<number | null>(null);
  const pid = problem?.id;
  // The question the note on screen belongs to. It changes only once the
  // next question's note is in place, so a note still being saved as the
  // reader moves on is saved where it was written, never on the next one.
  const noteFor = useRef(pid);

  // A different question brings its own note.
  useEffect(() => {
    noteFor.current = pid;
    setNote(progress?.note ?? '');
    saved.current = progress?.note ?? '';
    setNoteState('idle');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid]);

  const flush = async (value: string) => {
    if (timer.current) { window.clearTimeout(timer.current); timer.current = null; }
    const id = noteFor.current;
    if (!id || value.trim() === saved.current.trim()) return;
    setNoteState('saving');
    try {
      await onNote(id, value);
      if (noteFor.current === id) { saved.current = value; setNoteState('saved'); }
    } catch { if (noteFor.current === id) setNoteState('error'); }
  };
  const onNoteChange = (v: string) => {
    setNote(v);
    setNoteState('idle');
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { void flush(v); }, 1200);
  };
  // Leaving the question (or the page) keeps what was typed.
  const latest = useRef({ note, flush });
  latest.current = { note, flush };
  useEffect(() => () => { if (timer.current) void latest.current.flush(latest.current.note); }, [pid]);

  if (!problem) {
    const empty = (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center font-body">
        <p className="font-serif text-xl text-foreground">Choose a question</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">Pick one from the list, or let the page choose one you have not done yet.</p>
        <Button data-ro type="button" variant="outline" className="mt-4" onClick={onRandom} disabled={!count}><Shuffle className="h-4 w-4" />A random question</Button>
      </div>
    );
    return compact ? empty : <CareerCard title="Question" className="lg:h-full lg:min-h-0" bodyClassName="lg:min-h-0">{empty}</CareerCard>;
  }

  const status = progress?.status ?? null;
  const flagged = !!progress?.flagged;
  const meta = `${problem.field} · ${problem.firms.length ? problem.firms.join(', ') : NO_FIRM_LABEL}`;

  const nav = (
    <div className="flex items-center gap-1">
      <Button data-ro type="button" size="sm" variant={flagged ? 'outline' : 'ghost'} onClick={() => onFlag(!flagged)} aria-pressed={flagged}
        title={flagged ? 'Flagged as hard: press to unflag' : 'Flag as hard, to come back to it'}
        className={flagged ? 'border-amber-500/60 text-amber-800' : ''}>
        <Flag className={`h-4 w-4 ${flagged ? 'fill-amber-500 text-amber-600' : ''}`} /><span className="hidden sm:inline">{flagged ? 'Flagged' : 'Flag as hard'}</span>
      </Button>
      {canManage && (
        <Button data-ro type="button" size="sm" variant="ghost" onClick={onEdit} aria-label="Edit this question"><Pencil className="h-4 w-4" /></Button>
      )}
      <Button data-ro type="button" size="icon" variant="ghost" className="h-9 w-9" onClick={onPrev} disabled={index <= 0} aria-label="Previous question"><ChevronLeft className="h-4 w-4" /></Button>
      <span className="min-w-[3.5rem] text-center font-body text-xs tabular-nums text-muted-foreground" aria-live="polite">{index >= 0 ? `${index + 1} / ${count}` : `- / ${count}`}</span>
      <Button data-ro type="button" size="icon" variant="ghost" className="h-9 w-9" onClick={onNext} disabled={index < 0 || index >= count - 1} aria-label="Next question"><ChevronRight className="h-4 w-4" /></Button>
    </div>
  );

  const body = (
    <div className="space-y-6 font-body">
      {problem.hidden && (
        <p className="inline-flex items-center gap-1.5 border border-separator bg-muted px-2 py-1 text-xs text-muted-foreground"><EyeOff className="h-3.5 w-3.5" />Hidden from members</p>
      )}
      <section aria-label="The question">
        <MathText text={problem.question} />
      </section>

      <section aria-labelledby="bt-solution" className="border-t border-separator pt-5">
        <h3 id="bt-solution" className="mb-3 flex items-center gap-2 font-body text-xs font-semibold uppercase tracking-wider text-accent">Solution <HelpDot page="career-brainteasers" topic="solutions" /></h3>
        {answer ? (
          <div className="bt-protect bt-print-hide" onCopy={(e) => e.preventDefault()}>
            <MathText text={answer} />
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-separator px-4 py-5 text-center">
            <p className="text-sm text-muted-foreground">Give it a real try first: work it out on paper, then compare.</p>
            <Button data-ro type="button" variant="outline" className="mt-3" onClick={onReveal} disabled={revealing}>
              {revealing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}Show the solution
            </Button>
            {revealError && <p role="alert" className="mt-3 text-sm text-destructive">{revealError}</p>}
            <p className="mt-3 text-xs text-muted-foreground">Solutions open one at a time, up to {perHour} new ones an hour. One you have opened stays open.</p>
          </div>
        )}
      </section>

      <section aria-labelledby="bt-how" className="border-t border-separator pt-5">
        <h3 id="bt-how" className="mb-3 font-body text-xs font-semibold uppercase tracking-wider text-accent">How did it go?</h3>
        <div role="group" aria-labelledby="bt-how" className="flex flex-wrap gap-2">
          <Button data-ro type="button" size="sm" variant={status === 'solved' ? 'solid' : 'outline'} aria-pressed={status === 'solved'}
            onClick={() => onStatus(status === 'solved' ? null : 'solved')}>Solved on my own</Button>
          <Button data-ro type="button" size="sm" variant={status === 'needed_help' ? 'solid' : 'outline'} aria-pressed={status === 'needed_help'}
            onClick={() => onStatus(status === 'needed_help' ? null : 'needed_help')}>Needed the solution</Button>
          {status && <button type="button" data-ro onClick={() => onStatus(null)} className="text-sm text-muted-foreground underline-offset-4 hover:text-accent hover:underline">Clear</button>}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {status === 'needed_help' ? 'It stays in "Needed the solution", so you can try it again later.' : 'Be honest with yourself: the ones you needed help with are the ones worth a second go.'}
        </p>
      </section>

      <section aria-labelledby="bt-note" className="border-t border-separator pt-5">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h3 id="bt-note" className="font-body text-xs font-semibold uppercase tracking-wider text-accent">My notes</h3>
          <span className="text-xs text-muted-foreground" aria-live="polite">
            {noteState === 'saving' ? 'Saving...' : noteState === 'saved' ? 'Saved' : noteState === 'error' ? 'Not saved: check your connection' : 'Only you can read them'}
          </span>
        </div>
        <textarea
          data-ro value={note} maxLength={NOTE_MAX} rows={3}
          onChange={(e) => onNoteChange(e.target.value)} onBlur={() => void flush(note)}
          aria-labelledby="bt-note" placeholder="The trick, a formula, where you went wrong..."
          className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-body text-base outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm"
        />
      </section>
    </div>
  );

  if (compact) {
    return (
      <div className="font-body">
        <div className="mb-3 flex items-center justify-between gap-2 border-b border-separator pb-3">{nav}</div>
        {body}
      </div>
    );
  }
  return (
    <CareerCard title={problem.title} subtitle={meta} action={nav} scroll className="lg:h-full">
      {body}
    </CareerCard>
  );
}

export default ProblemPanel;
