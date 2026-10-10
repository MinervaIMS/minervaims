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
// =====================================================================

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

function Rows({ rows, onOpen, label }: { rows: [string, Tally][]; onOpen: (key: string) => void; label: string }) {
  return (
    <ul aria-label={label} className="divide-y divide-separator">
      {rows.map(([key, t]) => (
        <li key={key}>
          <button type="button" data-ro onClick={() => onOpen(key)} className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 px-1 py-2.5 text-left hover:bg-accent/[0.04]"
            aria-label={`${key}: ${t.solved + t.needed} of ${t.total} done. Show these questions`}>
            <span className="truncate font-body text-[15px] text-foreground">{key}</span>
            <span className="font-body text-xs tabular-nums text-muted-foreground">{t.solved + t.needed} / {t.total}</span>
            <span className="col-span-2"><Bar t={t} /></span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function ProgressView({ problems, progress, onShow, onReset }: {
  problems: Brainteaser[];
  progress: Record<string, BtProgress>;
  /** Open the question list with these filters. */
  onShow: (f: Partial<Filters>) => void;
  onReset: () => Promise<void>;
}) {
  const { all, byType, byFirm } = tallies(problems, progress);
  const done = all.solved + all.needed;
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);

  const figures = [
    { label: 'Done', value: done, sub: `of ${all.total} (${pct(done, all.total)}%)`, onClick: () => onShow({ status: 'all' }) },
    { label: 'Solved on my own', value: all.solved, sub: done ? `${pct(all.solved, done)}% of those done` : 'none yet', onClick: () => onShow({ status: 'solved' }) },
    { label: 'Needed the solution', value: all.needed, sub: 'worth a second go', onClick: () => onShow({ status: 'needed' }) },
    { label: 'Flagged as hard', value: all.flagged, sub: 'to come back to', onClick: () => onShow({ status: 'flagged' }) },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-2 lg:grid-rows-[auto_minmax(0,1fr)]">
      <CareerCard
        title="My progress" className="lg:col-span-2"
        action={(
          <>
          <HelpDot page="career-brainteasers" topic="progress" />
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
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-600" />Solved on my own</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" />Needed the solution</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-muted ring-1 ring-separator" />Not done yet</span>
          </p>
        </div>
      </CareerCard>

      <CareerCard title="By type" subtitle="Press one to practise it" scroll className="lg:h-full">
        <Rows rows={byType} label="Progress by type" onOpen={(k) => onShow({ types: [k], firms: [], status: 'todo' })} />
      </CareerCard>
      <CareerCard title="By firm" subtitle="Press one to practise its questions" scroll className="lg:h-full">
        <Rows rows={byFirm} label="Progress by firm" onOpen={(k) => onShow({ firms: [k === NO_FIRM_LABEL ? NO_FIRM : k], types: [], status: 'todo' })} />
      </CareerCard>

      <AlertDialog open={ask} onOpenChange={(o) => { if (!busy) setAsk(o); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start over?</AlertDialogTitle>
            <AlertDialogDescription>
              Every question goes back to "Not done yet": your Solved and Needed marks, your flags and your notes are cleared. This cannot be undone. Solutions you have already opened stay open.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ro disabled={busy}>Keep my progress</AlertDialogCancel>
            <AlertDialogAction data-ro disabled={busy} onClick={async (e) => {
              e.preventDefault(); setBusy(true);
              try { await onReset(); setAsk(false); } finally { setBusy(false); }
            }}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Clear everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ProgressView;
