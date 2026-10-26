import { useEffect, useRef, type ReactNode } from 'react';
import { CheckCircle2, Circle, EyeOff, Flag, LifeBuoy, Plus, Search, Shuffle, X, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HelpDot } from '@/components/admin/help/HelpSystem';
import type { Brainteaser, BtProgress } from '@/lib/brainteasers-api';
import { CareerCard } from '../CareerCard';
import { SELECT_CLASS } from '../gpa/format';
import { MultiPick } from './MultiPick';
import { EMPTY_FILTERS, STATUS_OPTIONS, firmsText, isFiltered, type Facet, type Filters, type StatusFilter } from './model';

// =====================================================================
// The list of questions, with the filters above it: search, type, firm
// and where the reader stands with each. The filters stay put; the list
// scrolls inside the card.
//
// Career > IB Questions uses the same list (Step 101) with its own words:
// subject and subsection for type and firm, right and wrong for solved
// and needed. `vocab` carries them; without it, the list is Brainteasers'.
// =====================================================================

export interface ListVocab {
  /** The help page the list's help dot opens. */
  helpPage: string;
  typeLabel: string;
  typeAll: string;
  firmLabel: string;
  firmAll: string;
  search: string;
  emptyHint: string;
  /** The words of the "where you stand" filter. */
  status: Record<StatusFilter, string>;
  solved: string;
  needed: string;
  /** The mark of a "needed" question; Brainteasers' lifebuoy when not given. */
  neededIcon?: LucideIcon;
  notDone: string;
  flagged: string;
  randomTitle: string;
  /** The line under a question's title. */
  meta: (p: Brainteaser) => ReactNode;
  /** Two lines for a question's title rather than one. */
  twoLines?: boolean;
}

export const BRAINTEASER_VOCAB: ListVocab = {
  helpPage: 'career-brainteasers',
  typeLabel: 'Type',
  typeAll: 'All types',
  firmLabel: 'Firm',
  firmAll: 'All firms',
  search: 'Search titles and questions',
  emptyHint: 'Widen the type, firm or status, or clear the search.',
  status: Object.fromEntries(STATUS_OPTIONS.map((o) => [o.value, o.label])) as Record<StatusFilter, string>,
  solved: 'Solved on my own',
  needed: 'Needed the solution',
  notDone: 'Not done yet',
  flagged: 'Flagged as hard',
  randomTitle: 'A question from this list you have not done yet',
  // Three text nodes, as the list has always drawn it: one string would shift the letters after the dot.
  meta: (p) => <>{p.field} · {firmsText(p.firms)}</>,
};

export function StatusIcon({ pr, className = 'h-4 w-4', vocab = BRAINTEASER_VOCAB }: { pr?: BtProgress; className?: string; vocab?: ListVocab }) {
  if (pr?.status === 'solved') return <CheckCircle2 aria-label={vocab.solved} className={`${className} text-emerald-700`} />;
  if (pr?.status === 'needed_help') {
    const Needed = vocab.neededIcon ?? LifeBuoy;
    return <Needed aria-label={vocab.needed} className={`${className} text-amber-700`} />;
  }
  return <Circle aria-label={vocab.notDone} className={`${className} text-muted-foreground/50`} />;
}

export function ProblemList({
  problems, total, progress, selectedId, onSelect, filters, setFilters, types, firms, canManage, onAdd, onRandom, vocab = BRAINTEASER_VOCAB,
}: {
  problems: Brainteaser[];
  total: number;
  progress: Record<string, BtProgress>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  filters: Filters;
  setFilters: (f: Filters) => void;
  types: Facet[];
  firms: Facet[];
  canManage: boolean;
  onAdd: () => void;
  onRandom: () => void;
  vocab?: ListVocab;
}) {
  const rows = useRef(new Map<string, HTMLButtonElement>());
  // The question on screen stays in view as Previous and Next move through the list.
  useEffect(() => {
    if (selectedId) rows.current.get(selectedId)?.scrollIntoView({ block: 'nearest' });
  }, [selectedId]);
  const filtered = isFiltered(filters);

  return (
    <CareerCard
      title="Questions"
      subtitle={filtered ? `${problems.length} of ${total} match` : `${total} questions`}
      className="lg:h-full lg:min-h-0"
      bodyClassName="lg:min-h-0"
      action={(
        <>
          <HelpDot page={vocab.helpPage} topic="filters" />
          <Button data-ro type="button" size="sm" variant="outline" onClick={onRandom} disabled={!problems.length} title={vocab.randomTitle}>
            <Shuffle className="h-4 w-4" />Random
          </Button>
          {canManage && (
            <Button data-ro type="button" size="sm" variant="ghost" onClick={onAdd} aria-label="Add a question">
              <Plus className="h-4 w-4" />Add
            </Button>
          )}
        </>
      )}
    >
      <div className="flex shrink-0 flex-col gap-2 pb-3">
        <label className="flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring">
          <Search aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            data-ro value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            placeholder={vocab.search} aria-label={vocab.search}
            className="h-full w-full min-w-0 bg-transparent font-body text-base outline-none md:text-sm"
          />
          {filters.q && (
            <button type="button" data-ro onClick={() => setFilters({ ...filters, q: '' })} aria-label="Clear the search" className="text-muted-foreground hover:text-accent">
              <X className="h-4 w-4" />
            </button>
          )}
        </label>
        <div className="grid grid-cols-2 gap-2">
          <MultiPick label={vocab.typeLabel} all={vocab.typeAll} options={types} selected={filters.types} onChange={(v) => setFilters({ ...filters, types: v })} />
          <MultiPick label={vocab.firmLabel} all={vocab.firmAll} options={firms} selected={filters.firms} onChange={(v) => setFilters({ ...filters, firms: v })} searchable />
        </div>
        <div className="flex items-center gap-2">
          <select
            data-ro value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value as StatusFilter })}
            aria-label="Show" className={`${SELECT_CLASS} !h-9`}
          >
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{vocab.status[o.value]}</option>)}
          </select>
          {filtered && (
            <button type="button" data-ro onClick={() => setFilters(EMPTY_FILTERS)} className="shrink-0 font-body text-sm text-accent underline-offset-4 hover:underline">
              Clear all
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 border-t border-separator lg:ws-card-scroll lg:-mr-2 lg:pr-2">
        {problems.length === 0 ? (
          <div className="px-1 py-8 text-center font-body">
            <p className="font-serif text-lg text-foreground">No question matches</p>
            <p className="mt-1 text-sm text-muted-foreground">{vocab.emptyHint}</p>
          </div>
        ) : (
          <ul aria-label="Questions" className="divide-y divide-separator">
            {problems.map((p) => {
              const pr = progress[p.id];
              const on = p.id === selectedId;
              return (
                <li key={p.id}>
                  <button
                    ref={(el) => { if (el) rows.current.set(p.id, el); else rows.current.delete(p.id); }}
                    type="button" data-ro onClick={() => onSelect(p.id)} aria-current={on ? 'true' : undefined}
                    className={`flex w-full items-start gap-2.5 px-2 py-2.5 text-left transition-colors ${on ? 'bg-accent/[0.07]' : 'hover:bg-accent/[0.04]'}`}
                  >
                    <span className="mt-0.5 shrink-0"><StatusIcon pr={pr} vocab={vocab} /></span>
                    <span className="min-w-0 flex-1">
                      <span className={`block ${vocab.twoLines ? 'line-clamp-2' : 'truncate'} font-body text-[15px] leading-snug ${on ? 'text-accent' : 'text-foreground'}`}>{p.title}</span>
                      <span className="block truncate font-body text-[12px] leading-snug text-muted-foreground">{vocab.meta(p)}</span>
                    </span>
                    {pr?.flagged && <Flag aria-label={vocab.flagged} className="mt-1 h-3.5 w-3.5 shrink-0 fill-amber-500 text-amber-600" />}
                    {p.hidden && <EyeOff aria-label="Hidden from members" className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </CareerCard>
  );
}

export default ProblemList;
