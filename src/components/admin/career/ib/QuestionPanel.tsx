import { ChevronLeft, ChevronRight, Flag, Pencil, Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { IbLetter, IbProgress, IbQuestion } from '@/lib/ib-questions-api';
import { CareerCard } from '../CareerCard';
import { NoteSection } from '../brainteasers/NoteSection';
import { metaOf, sourceOf } from './ib-model';
import { QuestionBody, type Checked } from './QuestionBody';

// =====================================================================
// The question on screen in IB Questions > Questions, as Brainteasers'
// question panel is: the question and its answers, a flag to come back
// to it, a private note, Previous and Next through the list, and Edit
// for those who correct the questions. On a phone it is drawn without a
// card of its own, in the sheet that opens over the list.
// =====================================================================

export function QuestionPanel({
  question, order, progress, checked, onCheck, onRetry, onFlag, onNote,
  index, count, onPrev, onNext, onRandom, canManage, onEdit, perHour, compact = false,
}: {
  question: IbQuestion | null;
  order: number[];
  progress?: IbProgress;
  checked?: Checked;
  onCheck: (choice: IbLetter) => Promise<void>;
  onRetry: () => void;
  onFlag: (f: boolean) => void;
  onNote: (id: string, note: string) => Promise<void>;
  index: number;
  count: number;
  onPrev: () => void;
  onNext: () => void;
  onRandom: () => void;
  canManage: boolean;
  onEdit: () => void;
  perHour: number;
  compact?: boolean;
}) {
  if (!question) {
    const empty = (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center font-body">
        <p className="font-serif text-xl text-foreground">Choose a question</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">Pick one from the list, or let the page choose one you have not answered yet.</p>
        <Button data-ro type="button" variant="outline" className="mt-4" onClick={onRandom} disabled={!count}><Shuffle className="h-4 w-4" />A random question</Button>
      </div>
    );
    return compact ? empty : <CareerCard title="Question" className="lg:h-full lg:min-h-0" bodyClassName="lg:min-h-0">{empty}</CareerCard>;
  }

  const flagged = !!progress?.flagged;
  const nav = (
    <div className="flex items-center gap-1">
      <Button data-ro type="button" size="sm" variant={flagged ? 'outline' : 'ghost'} onClick={() => onFlag(!flagged)} aria-pressed={flagged}
        title={flagged ? 'Flagged: press to unflag' : 'Flag it, to come back to it'}
        className={`max-lg:min-w-11 ${flagged ? 'border-amber-500/60 text-amber-800' : ''}`}>
        <Flag className={`h-4 w-4 ${flagged ? 'fill-amber-500 text-amber-600' : ''}`} /><span className="hidden sm:inline">{flagged ? 'Flagged' : 'Flag'}</span>
      </Button>
      {canManage && (
        <Button data-ro type="button" size="sm" variant="ghost" className="max-lg:min-w-11" onClick={onEdit} aria-label="Edit this question"><Pencil className="h-4 w-4" /></Button>
      )}
      <Button data-ro type="button" size="icon" variant="ghost" className="h-9 w-9" onClick={onPrev} disabled={index <= 0} aria-label="Previous question"><ChevronLeft className="h-4 w-4" /></Button>
      <span className="min-w-[3.5rem] text-center font-body text-xs tabular-nums text-muted-foreground" aria-live="polite">{index >= 0 ? `${index + 1} / ${count}` : `- / ${count}`}</span>
      <Button data-ro type="button" size="icon" variant="ghost" className="h-9 w-9" onClick={onNext} disabled={index < 0 || index >= count - 1} aria-label="Next question"><ChevronRight className="h-4 w-4" /></Button>
    </div>
  );

  const body = (
    <div className="space-y-6 font-body">
      <QuestionBody question={question} order={order} progress={progress} checked={checked} onCheck={onCheck} onRetry={onRetry} perHour={perHour} />
      <NoteSection pid={question.id} initial={progress?.note} onNote={onNote} idPrefix="ib" placeholder="The idea to remember, a formula, where you went wrong..." />
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
    <CareerCard title={metaOf(question.subject, question.section)} subtitle={sourceOf(question.bank, question.page)} action={nav} scroll className="lg:h-full">
      {body}
    </CareerCard>
  );
}

export default QuestionPanel;
