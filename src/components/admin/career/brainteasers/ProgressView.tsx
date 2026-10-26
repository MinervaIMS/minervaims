import { useState } from 'react';
import { Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HelpDot } from '@/components/admin/help/HelpSystem';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Brainteaser, BtProgress } from '@/lib/brainteasers-api';
import { CareerCard } from '../CareerCard';
import { NO_FIRM, NO_FIRM_LABEL, pct, tallies, type Filters, type Tally } from './model';

// =====================================================================
// Where the member stands: overall, by type of question and by firm.
// Every row opens the questions it counts, so the page answers "what
// should I practise next" and then takes you there.
//
// Career > IB Questions shows its progress here too (Step 101), by
// subject and subsection, right and wrong: `vocab` carries its words;
// without it, the view is Brainteasers'.
// =====================================================================

export interface ProgressVocab {
  helpPage: string;
  /** Questions with a mark of either kind, and those without one. */
  done: string;
  notDone: string;
  solved: string;
  solvedSub: (pctOfDone: number | null) => string;
  needed: string;
  neededSub: string;
  flagged: string;
  byType: string;
  byTypeSub: string;
  byTypeAria: string;
  byFirm: string;
  byFirmSub: string;
  byFirmAria: string;
  resetBody: string;
  keep: string;
  clear: string;
}

export const BRAINTEASER_PROGRESS_VOCAB: ProgressVocab = {
  helpPage: 'career-brainteasers',
  done: 'Done',
  notDone: 'Not done yet',
  solved: 'Solved on my own',
  solvedSub: (p) => (p === null ? 'none yet' : `${p}% of those done`),
  needed: 'Needed the solution',
  neededSub: 'worth a second go',
  flagged: 'Flagged as hard',
  byType: 'By type',
  byTypeSub: 'Press one to practise it',
  byTypeAria: 'Progress by type',
  byFirm: 'By firm',
  byFirmSub: 'Press one to practise its questions',
  byFirmAria: 'Progress by firm',
  resetBody: 'Every question goes back to "Not done yet": your Solved and Needed marks, your flags and your notes are cleared. This cannot be undone. Solutions you have already opened stay open.',
  keep: 'Keep my progress',
  clear: 'Clear everything',
};

function Bar({ t }: { t: Tally }) {
  const solved = pct(t.solved, t.total);
  const needed = pct(t.needed, t.total);
  return (
    <span className="flex h-2 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
      <span className="h-full bg-emerald-600" style={{ width: `${solved}%` }} />
      <span className="h-full bg-amber-400" style={{ width: `${needed}%` }} />
    </span>
  );
}

function Rows({ rows, onOpen, label, done }: { rows: [string, Tally][]; onOpen: (key: string) => void; label: string; done: string }) {
  return (
    <ul aria-label={label} className="divide-y divide-separator">
      {rows.map(([key, t]) => (
        <li key={key}>
          <button type="button" data-ro onClick={() => onOpen(key)} className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 px-1 py-2.5 text-left hover:bg-accent/[0.04]"
            aria-label={`${key}: ${t.solved + t.needed} of ${t.total} ${done.toLowerCase()}. Show these questions`}>
            <span className="truncate font-body text-[15px] text-foreground">{key}</span>
            <span className="font-body text-xs tabular-nums text-muted-foreground">{t.solved + t.needed} / {t.total}</span>
            <span className="col-span-2"><Bar t={t} /></span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function ProgressView({ problems, progress, onShow, onReset, vocab = BRAINTEASER_PROGRESS_VOCAB }: {
  problems: Brainteaser[];
  progress: Record<string, BtProgress>;
  /** Open the question list with these filters. */
  onShow: (f: Partial<Filters>) => void;
  onReset: () => Promise<void>;
  vocab?: ProgressVocab;
}) {
  const { all, byType, byFirm } = tallies(problems, progress);
  const done = all.solved + all.needed;
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);

  const figures = [
    { label: vocab.done, value: done, sub: `of ${all.total} (${pct(done, all.total)}%)`, onClick: () => onShow({ status: 'all' }) },
    { label: vocab.solved, value: all.solved, sub: vocab.solvedSub(done ? pct(all.solved, done) : null), onClick: () => onShow({ status: 'solved' }) },
    { label: vocab.needed, value: all.needed, sub: vocab.neededSub, onClick: () => onShow({ status: 'needed' }) },
    { label: vocab.flagged, value: all.flagged, sub: 'to come back to', onClick: () => onShow({ status: 'flagged' }) },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-2 lg:grid-rows-[auto_minmax(0,1fr)]">
      <CareerCard
        title="My progress" className="lg:col-span-2"
        action={(
          <>
          <HelpDot page={vocab.helpPage} topic="progress" />
          <Button data-ro type="button" size="sm" variant="ghost" onClick={() => setAsk(true)} disabled={!done && !all.flagged}>
            <RotateCcw className="h-4 w-4" />Start over
          </Button>
          </>
        )}
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {figures.map((f) => (
            <button key={f.label} type="button" data-ro onClick={f.onClick} className="rounded-lg border border-separator px-4 py-3 text-left transition-colors hover:border-accent/50">
              <span className="block font-serif text-[30px] leading-none text-accent tabular-nums">{f.value}</span>
              <span className="mt-1.5 block text-xs uppercase tracking-wider text-muted-foreground">{f.label}</span>
              <span className="block text-xs text-muted-foreground">{f.sub}</span>
            </button>
          ))}
        </div>
        <div className="mt-4">
          <Bar t={all} />
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-600" />{vocab.solved}</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" />{vocab.needed}</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-muted ring-1 ring-separator" />{vocab.notDone}</span>
          </p>
        </div>
      </CareerCard>

      <CareerCard title={vocab.byType} subtitle={vocab.byTypeSub} scroll className="lg:h-full">
        <Rows rows={byType} label={vocab.byTypeAria} done={vocab.done} onOpen={(k) => onShow({ types: [k], firms: [], status: 'todo' })} />
      </CareerCard>
      <CareerCard title={vocab.byFirm} subtitle={vocab.byFirmSub} scroll className="lg:h-full">
        <Rows rows={byFirm} label={vocab.byFirmAria} done={vocab.done} onOpen={(k) => onShow({ firms: [k === NO_FIRM_LABEL ? NO_FIRM : k], types: [], status: 'todo' })} />
      </CareerCard>

      <AlertDialog open={ask} onOpenChange={(o) => { if (!busy) setAsk(o); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start over?</AlertDialogTitle>
            <AlertDialogDescription>
              {vocab.resetBody}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ro disabled={busy}>{vocab.keep}</AlertDialogCancel>
            <AlertDialogAction data-ro disabled={busy} onClick={async (e) => {
              e.preventDefault(); setBusy(true);
              try { await onReset(); setAsk(false); } finally { setBusy(false); }
            }}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{vocab.clear}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ProgressView;
