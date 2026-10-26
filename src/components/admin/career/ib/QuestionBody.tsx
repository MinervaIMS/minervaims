import { useEffect, useState } from 'react';
import { CheckCircle2, EyeOff, Loader2, RotateCcw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HelpDot } from '@/components/admin/help/HelpSystem';
import type { IbLetter, IbProgress, IbQuestion } from '@/lib/ib-questions-api';
import { LETTERS, sourceOf } from './ib-model';

// =====================================================================
// One question of IB Questions, as it is answered: the question, the four
// answers in a shuffled order, then Check my answer. The right answer and
// the guide's explanation come back from the function only then, so the
// first thing the eye meets is the question, as in Brainteasers.
//
// Used by the question panel and by Practice. The letters on screen are
// the order shown (A to D from the top), not the guide's own letters.
// =====================================================================

export interface Checked { right: boolean; correct: IbLetter; explanation: string; choice: IbLetter }

/** The statement to complete, with the gap drawn; filled with the right term once known. */
function Statement({ text, fill }: { text: string; fill?: string }) {
  const parts = text.split('____');
  return (
    <p className="text-[15px] leading-relaxed text-foreground">
      {parts.map((p, i) => (
        <span key={i}>
          {p}
          {i < parts.length - 1 && (fill ? (
            <span className="rounded-sm bg-emerald-50 px-1 font-semibold text-emerald-800">{fill}</span>
          ) : (
            <span aria-label="the missing term" className="mx-0.5 inline-block w-20 border-b-2 border-accent align-baseline">&nbsp;</span>
          ))}
        </span>
      ))}
    </p>
  );
}

export function QuestionBody({ question, order, progress, checked, onCheck, onRetry, perHour, idPrefix = 'ib' }: {
  question: IbQuestion;
  /** The positions of A, B, C and D on screen (see shuffledOrder). */
  order: number[];
  progress?: IbProgress;
  /** The result, once the reader has answered on this visit. */
  checked?: Checked;
  /** Sends the reader's choice; rejects with a message to show. */
  onCheck: (choice: IbLetter) => Promise<void>;
  /** Clears the result, to answer again. */
  onRetry: () => void;
  perHour: number;
  idPrefix?: string;
}) {
  const [picked, setPicked] = useState<IbLetter | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setPicked(null); setError(null); setChecking(false); }, [question.id, checked]);

  const shown = order.map((i) => LETTERS[i]);
  const letterOnScreen = (l: IbLetter) => 'ABCD'[shown.indexOf(l)] ?? l;
  const done = !!checked;

  const check = async () => {
    if (!picked) return;
    setChecking(true); setError(null);
    try { await onCheck(picked); }
    catch (e) { setError(e instanceof Error ? e.message : 'The answer could not be checked. Please try again.'); }
    finally { setChecking(false); }
  };

  const last = progress?.status && !done
    ? `Last time you answered it ${progress.status === 'right' ? 'right' : 'wrong'}${progress.attempts > 1 ? ` (${progress.attempts} tries)` : ''}.`
    : null;

  return (
    <div className="space-y-5 font-body">
      {question.hidden && (
        <p className="inline-flex items-center gap-1.5 border border-separator bg-muted px-2 py-1 text-xs text-muted-foreground"><EyeOff className="h-3.5 w-3.5" />Hidden from members</p>
      )}

      <section aria-label="The question" className="space-y-3">
        {question.kind === 'completion' ? (
          <>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">The interview question</p>
            <p className="font-serif text-xl leading-snug text-foreground">{question.question}</p>
            <p className="text-sm text-muted-foreground">{question.instruction}</p>
            <Statement text={question.statement ?? ''} fill={checked ? question.options[LETTERS.indexOf(checked.correct)] : undefined} />
          </>
        ) : (
          <>
            <p className="font-serif text-xl leading-snug text-foreground">{question.question}</p>
            {question.original && <p className="text-sm text-muted-foreground">Asked in the guide as: &ldquo;{question.original}&rdquo;</p>}
            <p className="text-sm text-muted-foreground">{question.instruction}</p>
          </>
        )}
      </section>

      <div role="radiogroup" aria-label="The four answers" className="space-y-2">
        {shown.map((l, pos) => {
          const text = question.options[LETTERS.indexOf(l)];
          const isPicked = picked === l;
          const isRight = done && checked!.correct === l;
          const isWrongChoice = done && checked!.choice === l && !checked!.right;
          const tone = isRight ? 'border-emerald-600 bg-emerald-50'
            : isWrongChoice ? 'border-amber-500 bg-amber-50'
              : done ? 'border-separator opacity-70'
                : isPicked ? 'border-accent bg-accent/5' : 'border-input bg-background hover:border-accent/50';
          return (
            <button
              key={l} type="button" data-ro role="radio" aria-checked={done ? checked!.choice === l : isPicked}
              aria-label={`${'ABCD'[pos]}: ${text}${isRight ? ' (the right answer)' : isWrongChoice ? ' (your answer)' : ''}`}
              disabled={done || checking} onClick={() => setPicked(l)}
              className={`flex w-full flex-wrap items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors disabled:cursor-default sm:flex-nowrap ${tone}`}
            >
              <span aria-hidden className={`mt-px inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs tabular-nums ${isPicked && !done ? 'border-accent bg-accent text-accent-foreground' : 'border-input text-muted-foreground'}`}>{'ABCD'[pos]}</span>
              <span className="min-w-0 flex-1 basis-0 text-[15px] leading-snug text-foreground">{text}</span>
              {isRight && <span className="inline-flex shrink-0 items-center gap-1 text-xs max-sm:-mt-1.5 max-sm:w-full max-sm:pl-9 text-emerald-800"><CheckCircle2 aria-hidden className="h-4 w-4" />Right answer</span>}
              {isWrongChoice && <span className="inline-flex shrink-0 items-center gap-1 text-xs max-sm:-mt-1.5 max-sm:w-full max-sm:pl-9 text-amber-700"><XCircle aria-hidden className="h-4 w-4" />Your answer</span>}
            </button>
          );
        })}
      </div>

      {!done ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <Button data-ro type="button" variant="solid" onClick={() => void check()} disabled={!picked || checking}>
              {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Check my answer
            </Button>
            {last && <span className="text-sm text-muted-foreground">{last}</span>}
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <p className="text-xs text-muted-foreground">Choose one answer, then check it. Up to {perHour} new questions an hour; one you have answered can be answered again at any time.</p>
        </div>
      ) : (
        <section aria-labelledby={`${idPrefix}-result`} className="space-y-3 border-t border-separator pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 id={`${idPrefix}-result`} className={`flex items-center gap-2 font-serif text-xl ${checked!.right ? 'text-emerald-800' : 'text-amber-700'}`}>
              {checked!.right ? <CheckCircle2 aria-hidden className="h-5 w-5" /> : <XCircle aria-hidden className="h-5 w-5" />}
              {checked!.right ? 'Right' : `Not quite: the right answer is ${letterOnScreen(checked!.correct)}`}
            </h3>
            <Button data-ro type="button" size="sm" variant="ghost" onClick={onRetry}><RotateCcw className="h-4 w-4" />Answer again</Button>
          </div>
          <div>
            <p className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
              From the guide <span className="font-normal normal-case tracking-normal text-muted-foreground">({sourceOf(question.bank, question.page)})</span>
              <HelpDot page="career-ib" topic="answers" />
            </p>
            <p className="max-w-prose whitespace-pre-line text-[15px] leading-relaxed text-foreground">{checked!.explanation}</p>
          </div>
        </section>
      )}
    </div>
  );
}

export default QuestionBody;
