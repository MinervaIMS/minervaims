import { useMemo, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { BottomSheet } from '@/components/admin/kit/BottomSheet';
import type { FilterOption } from '@/components/admin/ColumnFilter';

// =====================================================================
// Filters, seen and undone (Step 98 kit).
// ---------------------------------------------------------------------
// A register's filters live in its column headers on a computer, where
// a funnel turns navy when it is on. That is easy to miss once the
// header has scrolled away, and on a phone the columns are cards and the
// funnels are gone altogether. So:
//
// FilterSummary, under the toolbar, says in the same words on every page
// how many records are showing out of how many, names each filter that
// is on as a chip that removes it, and offers "Clear filters".
//
// FilterSheet is the phone's way to the same filters: one "Filters"
// button, with the number on, opening a sheet with every filter of the
// page, a live count, and "Show 12 candidates" to go back to them. It
// sets the very same state the column funnels set, so the two can never
// disagree.
// =====================================================================

export interface FilterGroup {
  key: string;
  label: string;
  options: FilterOption[];
  /** The values ticked. Empty means every value is shown. */
  selected: string[];
  onChange: (next: string[]) => void;
}

/** "candidate" / "candidates", chosen by the count. */
export interface Noun { one: string; many: string }
const nounFor = (n: number, noun: Noun) => (n === 1 ? noun.one : noun.many);

/** The chips that name what is filtered: one per filter that is on. */
export function filterChips(groups: FilterGroup[], search?: { value: string; clear: () => void }) {
  const chips: { key: string; label: string; onRemove: () => void }[] = [];
  if (search && search.value.trim()) chips.push({ key: 'search', label: `Search: “${search.value.trim()}”`, onRemove: search.clear });
  for (const g of groups) {
    if (g.selected.length === 0) continue;
    const names = g.selected.map((v) => g.options.find((o) => o.value === v)?.label ?? v);
    const shown = names.length > 2 ? `${names.slice(0, 2).join(', ')} and ${names.length - 2} more` : names.join(', ');
    chips.push({ key: g.key, label: `${g.label}: ${shown}`, onRemove: () => g.onChange([]) });
  }
  return chips;
}

export function FilterSummary({ shown, total, noun, chips, onClearAll, note }: {
  shown: number;
  total: number;
  noun: Noun;
  chips: { key: string; label: string; onRemove: () => void }[];
  onClearAll: () => void;
  /** A few words after the count, such as the order of the list. */
  note?: string;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 font-body text-sm" role="status" aria-live="polite">
      <span className="text-muted-foreground">
        Showing <span className="tabular-nums text-foreground">{shown}</span> of <span className="tabular-nums">{total}</span> {nounFor(total, noun)}{note ? `, ${note}` : ''}.
      </span>
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          data-ro
          onClick={c.onRemove}
          title={`Remove the filter ${c.label}`}
          className="inline-flex h-11 max-w-full items-center gap-1.5 border border-accent/40 bg-accent/5 px-2.5 text-xs text-accent hover:border-accent lg:h-7"
        >
          <span className="truncate">{c.label}</span>
          <X className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="sr-only">, remove this filter</span>
        </button>
      ))}
      {chips.length > 0 && (
        <button
          type="button"
          data-ro
          onClick={onClearAll}
          className="inline-flex h-11 items-center px-1 text-xs text-accent underline underline-offset-2 lg:h-7"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

/** The phone's "Filters" button and its sheet. Hidden from `lg` up, where the columns carry the funnels. */
export function FilterSheet({ groups, shown, noun, onClearAll, className = '' }: {
  groups: FilterGroup[];
  /** How many records the filters let through, as they stand now. */
  shown: number;
  noun: Noun;
  onClearAll: () => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const active = useMemo(() => groups.filter((g) => g.selected.length > 0).length, [groups]);
  return (
    <>
      <Button
        type="button"
        data-ro
        variant={active ? 'solid' : 'outline'}
        className={`h-11 font-body lg:hidden ${className}`}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        <SlidersHorizontal className="mr-2 h-4 w-4" aria-hidden="true" />
        Filters{active ? ` (${active})` : ''}
      </Button>
      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title="Filters"
        description={`${shown} ${nounFor(shown, noun)} shown`}
        readOnly
        footer={(
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="h-11" disabled={active === 0} onClick={onClearAll}>Clear filters</Button>
            <Button type="button" className="h-11 flex-1" onClick={() => setOpen(false)}>
              Show {shown} {nounFor(shown, noun)}
            </Button>
          </div>
        )}
      >
        {groups.map((g) => (
          <fieldset key={g.key} className="border-b border-separator px-4 py-3 last:border-b-0">
            <legend className="sr-only">{g.label}</legend>
            <div className="mb-1 flex items-center justify-between">
              <span aria-hidden="true" className="text-xs uppercase tracking-wider text-muted-foreground">{g.label}</span>
              {g.selected.length > 0 && (
                <button type="button" className="h-11 px-1 text-xs text-accent underline underline-offset-2" onClick={() => g.onChange([])}>
                  Clear
                </button>
              )}
            </div>
            {g.options.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">No values</p>
            ) : g.options.map((o) => {
              const on = g.selected.includes(o.value);
              const id = `fs-${g.key}-${o.value}`;
              return (
                <label key={o.value} htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-foreground">
                  <Checkbox
                    id={id}
                    checked={on}
                    onCheckedChange={() => g.onChange(on ? g.selected.filter((v) => v !== o.value) : [...g.selected, o.value])}
                  />
                  <span className="min-w-0 flex-1">{o.label}</span>
                </label>
              );
            })}
          </fieldset>
        ))}
      </BottomSheet>
    </>
  );
}
