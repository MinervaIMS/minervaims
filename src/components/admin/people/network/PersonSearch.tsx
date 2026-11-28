import { useId, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { NetworkPerson } from '@/lib/people-network-api';
import { divisionLabel, fold } from './network-view';

// =====================================================================
// Find a person by typing (People > Network, Step 112): in place of a
// drop-down of four hundred names, a search field that lists the first
// matches under it. Arrows move through them, Enter picks one, Escape
// closes the list. Read-only viewers use it too (`data-ro`).
// =====================================================================

const MAX_MATCHES = 8;

export function PersonSearch({ people, onPick, placeholder, exclude, className = '' }: {
  people: NetworkPerson[];
  onPick: (node: string) => void;
  placeholder: string;
  /** People not to offer (already chosen). */
  exclude?: ReadonlySet<string>;
  className?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const box = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    const q = fold(query.trim());
    if (!q) return [];
    return people
      .filter((p) => !exclude?.has(p.node) && fold(p.name).includes(q))
      .sort((a, b) => Number(!fold(a.name).startsWith(q)) - Number(!fold(b.name).startsWith(q)) || a.name.localeCompare(b.name))
      .slice(0, MAX_MATCHES);
  }, [people, query, exclude]);

  const pick = (p: NetworkPerson) => {
    onPick(p.node);
    setQuery('');
    setOpen(false);
    setActive(0);
  };

  const shown = open && matches.length > 0;
  return (
    <div ref={box} className={`relative ${className}`} data-ro
      onBlur={(e) => { if (!box.current?.contains(e.relatedTarget as Node)) setOpen(false); }}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input
        data-ro
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(matches.length - 1, i + 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
          else if (e.key === 'Enter' && matches[active]) { e.preventDefault(); pick(matches[active]); }
          else if (e.key === 'Escape') setOpen(false);
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        role="combobox"
        aria-expanded={shown}
        aria-controls={listId}
        aria-autocomplete="list"
        className="h-11 pl-9 font-body lg:h-10"
      />
      {shown && (
        <ul id={listId} role="listbox" className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto border border-separator bg-background shadow-md">
          {matches.map((p, i) => (
            <li key={p.node} role="option" aria-selected={i === active}>
              <button
                type="button"
                data-ro
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(p)}
                onMouseEnter={() => setActive(i)}
                className={`flex min-h-11 w-full flex-col items-start px-3 py-1.5 text-left font-body text-sm ${i === active ? 'bg-muted' : ''}`}
              >
                <span className="text-foreground">{p.name}</span>
                <span className="text-xs text-muted-foreground">{divisionLabel(p.division)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && query.trim() && matches.length === 0 && (
        <p className="absolute left-0 right-0 top-full z-20 mt-1 border border-separator bg-background px-3 py-2 font-body text-sm text-muted-foreground">Nobody by that name.</p>
      )}
    </div>
  );
}

export default PersonSearch;
