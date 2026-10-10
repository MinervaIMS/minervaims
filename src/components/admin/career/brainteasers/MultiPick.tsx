import { useMemo, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Facet } from './model';

// =====================================================================
// A filter that takes several values: "All firms", "Jane Street", "3
// firms". A button that opens a list with counts, a search box when the
// list is long, and Clear. An empty selection shows everything.
// =====================================================================

export function MultiPick({ label, all, options, selected, onChange, searchable = false, className = '' }: {
  /** "Type", "Firm": names the control for screen readers. */
  label: string;
  /** "All types": what the button says when nothing is picked. */
  all: string;
  options: Facet[];
  selected: string[];
  onChange: (next: string[]) => void;
  searchable?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const chosen = useMemo(() => new Set(selected), [selected]);
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? options.filter((o) => o.label.toLowerCase().includes(t)) : options;
  }, [options, q]);
  const toggle = (v: string) => {
    const next = new Set(chosen);
    if (next.has(v)) next.delete(v); else next.add(v);
    onChange(options.map((o) => o.value).filter((x) => next.has(x)));
  };
  const text = selected.length === 0 ? all
    : selected.length === 1 ? (options.find((o) => o.value === selected[0])?.label ?? all)
      : `${selected.length} ${label.toLowerCase()}s`;

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQ(''); }}>
      <PopoverTrigger asChild>
        <button
          type="button" data-ro aria-label={`${label}: ${text}`}
          className={`inline-flex h-9 min-w-0 items-center justify-between gap-2 rounded-md border px-3 font-body text-sm transition-colors ${selected.length ? 'border-accent bg-accent/5 text-accent' : 'border-input bg-background text-foreground hover:border-accent/50'} ${className}`}
        >
          <span className="truncate">{text}</span>
          <ChevronDown aria-hidden className="h-4 w-4 shrink-0 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent data-ro align="start" className="w-72 p-0">
        <div className="flex items-center justify-between border-b border-separator px-3 py-2">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
          <button type="button" className="text-xs text-accent underline-offset-4 hover:underline disabled:opacity-40" disabled={!selected.length} onClick={() => onChange([])}>Clear</button>
        </div>
        {searchable && (
          <div className="border-b border-separator p-2">
            <label className="flex items-center gap-2 rounded-md border border-input px-2">
              <Search aria-hidden className="h-4 w-4 text-muted-foreground" />
              <input
                value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Find a ${label.toLowerCase()}`}
                aria-label={`Find a ${label.toLowerCase()}`}
                className="h-8 w-full bg-transparent font-body text-sm outline-none"
              />
            </label>
          </div>
        )}
        <ul role="listbox" aria-multiselectable="true" aria-label={label} className="max-h-72 overflow-y-auto py-1">
          {shown.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">Nothing matches.</li>}
          {shown.map((o) => {
            const on = chosen.has(o.value);
            return (
              <li key={o.value} role="option" aria-selected={on}>
                <button
                  type="button" onClick={() => toggle(o.value)}
                  className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left font-body text-sm hover:bg-accent/[0.06]"
                >
                  <span aria-hidden className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${on ? 'border-accent bg-accent text-accent-foreground' : 'border-input'}`}>
                    {on && <Check className="h-3 w-3" />}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  <span className="shrink-0 tabular-nums text-xs text-muted-foreground">{o.count}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

export default MultiPick;
