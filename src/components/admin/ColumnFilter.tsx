import { useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Filter } from 'lucide-react';

export interface FilterOption { value: string; label: string }

interface Props {
  label: string;
  options: FilterOption[];
  /** Currently selected values. Empty array means "show all". */
  selected: string[];
  onChange: (next: string[]) => void;
}

/**
 * An Excel-style header filter: the column header carries a funnel button that
 * opens a checkbox list. Several values can be selected at once; an empty
 * selection shows everything. Reused across every workspace table.
 */
export function ColumnFilter({ label, options, selected, onChange }: Props) {
  const active = selected.length > 0;
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const toggle = (value: string) => {
    const next = new Set(selectedSet);
    if (next.has(value)) next.delete(value); else next.add(value);
    onChange([...next]);
  };

  return (
    <div className="flex items-center gap-1">
      <span>{label}</span>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            title={`Filter by ${label.toLowerCase()}`}
            className={`inline-flex items-center justify-center h-5 w-5 border ${active ? 'border-accent text-accent' : 'border-transparent text-muted-foreground'} hover:text-accent`}
          >
            <Filter className={`h-3 w-3 ${active ? 'fill-accent' : ''}`} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56 p-0 rounded-none">
          <div className="flex items-center justify-between px-3 py-2 border-b border-separator">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
            <button type="button" className="text-xs text-accent underline disabled:opacity-40" disabled={!active} onClick={() => onChange([])}>Clear</button>
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {options.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">No values</div>
            ) : options.map((o) => (
              <label key={o.value} className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-muted/50">
                <Checkbox checked={selectedSet.has(o.value)} onCheckedChange={() => toggle(o.value)} />
                <span className="truncate">{o.label}</span>
              </label>
            ))}
          </div>
          {options.length > 0 && (
            <div className="flex gap-2 px-3 py-2 border-t border-separator">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => onChange(options.map((o) => o.value))}>Select all</Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
