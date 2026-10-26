import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

// =====================================================================
// Several recommendations, one band (Step 98 kit).
// ---------------------------------------------------------------------
// Two `Recommendation` bands one under the other took half of a phone's
// first screen before the list they advise on, and on a computer read as
// two warnings. Grouped, they are one band with the same identity (the
// bulb, the navy rule on the left, "Non-binding"), a count, and one line
// per recommendation that opens on its own and says the same words as
// before.
// =====================================================================

export interface RecommendationItem { title: string; body: ReactNode }

export function RecommendationGroup({ items }: { items: RecommendationItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="border border-accent/40 border-l-4 border-l-accent bg-accent/[0.06] font-body shadow-[0_1px_0_rgba(31,15,77,0.06)]">
      <div className="flex items-center gap-3 px-4 pt-3 pb-1">
        <span aria-hidden className="text-xl leading-none shrink-0">💡</span>
        <span className="block text-[11px] uppercase tracking-[0.14em] text-accent font-semibold">
          {items.length} non-binding recommendations
        </span>
      </div>
      <ul className="pb-1">
        {items.map((it, i) => {
          const isOpen = open === i;
          return (
            <li key={it.title} className={i > 0 ? 'border-t border-accent/20' : ''}>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex min-h-11 w-full items-center gap-3 px-4 py-2 pl-12 text-left"
              >
                <span className="min-w-0 font-serif text-[15px] text-foreground leading-snug">{it.title}</span>
                <span className="ml-auto shrink-0 inline-flex items-center gap-1.5 text-xs text-accent">
                  {isOpen ? 'Hide' : 'Read'}
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </span>
              </button>
              {isOpen && (
                <div className="px-4 pb-3 pl-12 text-sm text-muted-foreground space-y-2 leading-relaxed">
                  {it.body}
                  <p className="text-xs text-muted-foreground/80 border-t border-accent/20 pt-2">
                    This is advice based on the past experience of association members. It is not a rule: it never replaces
                    the judgement of the people responsible for the decision.
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default RecommendationGroup;
