import { Check, Loader2, UserRound, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { knownPersonLine, type KnownPerson } from '@/lib/events-api';

// =====================================================================
// "SAME PERSON?" (Step 108).
// ---------------------------------------------------------------------
// A guest whose name is the name of somebody we know (an alumnus, a
// former member) is asked about, never linked on the name alone: two
// people can share a name, and only the organiser at the door or behind
// the Teams report knows. One question, the person beside it, two
// answers. Used by the walk-in form, the list and the Teams import.
// =====================================================================

export function SamePersonPrompt({ person, onYes, onNo, busy = false, compact = false, answered }: {
  person: KnownPerson;
  onYes: () => void;
  onNo: () => void;
  busy?: boolean;
  /** One line, for a row of the list or of the Teams import. */
  compact?: boolean;
  /** Already answered here: say so instead of asking again. */
  answered?: 'yes' | 'no' | null;
}) {
  const who = (
    <span className="min-w-0">
      <span className="text-foreground">{person.name}</span>
      <span className="text-muted-foreground"> · {knownPersonLine(person)}</span>
    </span>
  );
  if (answered) {
    return (
      <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        {answered === 'yes'
          ? <span className="inline-flex items-center gap-1 text-accent"><Check className="h-3.5 w-3.5" aria-hidden="true" />Same person as {person.name}</span>
          : <span className="text-muted-foreground">Not {person.name}</span>}
        <button type="button" className="text-muted-foreground underline underline-offset-2 max-lg:min-h-11" onClick={answered === 'yes' ? onNo : onYes}>
          Change
        </button>
      </span>
    );
  }
  return (
    <div
      role="group"
      aria-label={`Is this ${person.name}?`}
      className={compact
        ? 'flex flex-wrap items-center gap-x-2 gap-y-1 border-l-2 border-accent pl-2 text-xs'
        : 'flex flex-col gap-2 border border-accent/40 bg-accent/[0.04] p-3 text-sm sm:flex-row sm:items-center'}
    >
      <span className="inline-flex min-w-0 flex-1 items-start gap-2">
        <UserRound className={`${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} mt-0.5 shrink-0 text-accent`} aria-hidden="true" />
        <span className="min-w-0">
          {compact ? 'Same person as ' : 'We found this name in our records: '}{who}{compact ? '?' : '. Same person?'}
        </span>
      </span>
      <span className="flex shrink-0 gap-2">
        <Button type="button" size="sm" variant="outline" className={compact ? 'h-11 px-2 text-xs lg:h-7' : 'h-11 lg:h-9'} disabled={busy} onClick={onYes}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Check className="h-3.5 w-3.5" aria-hidden="true" />}
          Same person
        </Button>
        <Button type="button" size="sm" variant="ghost" className={compact ? 'h-11 px-2 text-xs lg:h-7' : 'h-11 lg:h-9'} disabled={busy} onClick={onNo}>
          <X className="h-3.5 w-3.5" aria-hidden="true" />No
        </Button>
      </span>
    </div>
  );
}
