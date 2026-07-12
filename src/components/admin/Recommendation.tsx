import { useState } from 'react';
import { Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';

// =====================================================================
// Non-binding recommendation callout. Advice distilled from the past
// experience of association members: clearly presented as guidance, not
// as a rule, so it informs decisions without limiting discretion.
// =====================================================================
export function Recommendation({ title, children, collapsible = true }: {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(!collapsible);
  return (
    <div className="border border-accent/30 bg-accent/5 rounded-lg font-body">
      <button
        type="button"
        onClick={() => collapsible && setOpen((o) => !o)}
        className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left ${collapsible ? '' : 'cursor-default'}`}
      >
        <Lightbulb className="h-4 w-4 text-accent shrink-0" />
        <span className="text-[11px] uppercase tracking-wider text-accent shrink-0">Non-binding recommendation</span>
        <span className="text-sm text-foreground truncate">{title}</span>
        {collapsible && <span className="ml-auto text-muted-foreground">{open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</span>}
      </button>
      {open && (
        <div className="px-4 pb-3 pt-0.5 text-sm text-muted-foreground space-y-2 leading-relaxed">
          {children}
          <p className="text-xs text-muted-foreground/80">
            This is advice based on the past experience of association members. It is not a rule: it never replaces
            the judgement of the people responsible for the decision.
          </p>
        </div>
      )}
    </div>
  );
}
