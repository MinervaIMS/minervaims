import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

// =====================================================================
// Non-binding recommendation callout. Advice distilled from the past
// experience of association members: clearly presented as guidance, not
// as a rule, so it informs decisions without limiting discretion.
//
// Visual identity: this is deliberately the ONE element in the workspace
// that uses an emoji and a strong tinted band, so recommendations can
// never be mistaken for ordinary cards, filters or page furniture.
// =====================================================================
export function Recommendation({ title, children, collapsible = true }: {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(!collapsible);
  return (
    <div className="border border-accent/40 border-l-4 border-l-accent bg-accent/[0.06] font-body shadow-[0_1px_0_rgba(31,15,77,0.06)]">
      <button
        type="button"
        onClick={() => collapsible && setOpen((o) => !o)}
        aria-expanded={open}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left ${collapsible ? '' : 'cursor-default'}`}
      >
        <span aria-hidden className="flex items-center justify-center w-8 h-8 shrink-0 bg-accent/10 border border-accent/30 text-base">💡</span>
        <span className="min-w-0">
          <span className="block text-[11px] uppercase tracking-[0.14em] text-accent font-semibold">Non-binding recommendation</span>
          <span className="block font-serif text-[15px] text-foreground leading-snug truncate">{title}</span>
        </span>
        {collapsible && (
          <span className="ml-auto shrink-0 inline-flex items-center gap-1.5 text-xs text-accent">
            {open ? 'Hide' : 'Read'}
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
        )}
      </button>
      {open && (
        <div className="px-4 pb-3 pl-[60px] text-sm text-muted-foreground space-y-2 leading-relaxed">
          {children}
          <p className="text-xs text-muted-foreground/80 border-t border-accent/20 pt-2">
            This is advice based on the past experience of association members. It is not a rule: it never replaces
            the judgement of the people responsible for the decision.
          </p>
        </div>
      )}
    </div>
  );
}
