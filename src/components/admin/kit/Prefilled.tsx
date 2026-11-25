import { useCallback, useState } from 'react';
import { History } from 'lucide-react';

// =====================================================================
// A FIELD FILLED IN FROM THE RECORDS (Step 108).
// ---------------------------------------------------------------------
// When a form fills a field for the reader from what the Society already
// holds (an alumnus's company, the role a member holds today), the field
// says so: a small "From the records" beside its label, and a faint
// accent edge on the field itself. The value is probably right and stays
// editable; the moment the reader changes it, it is theirs and the mark
// goes. The same mark, in the same words, on every form that fills in.
//
// Screen readers hear the mark with the field (`aria-describedby` on the
// field, pointing at `prefilledNoteId`).
// =====================================================================

export const PREFILLED_LABEL = 'From the records';
export const PREFILLED_NOTE = 'Filled in from the records: probably right, but check it and change it if it is out of date.';

/** The edge a pre-filled field carries, added to its own classes. */
export const PREFILLED_FIELD = 'border-accent/50 bg-accent/[0.04]';

/** The id of the spoken note for a field's `aria-describedby`. */
export const prefilledNoteId = (fieldId: string) => `${fieldId}-prefilled`;

export function PrefilledTag({ fieldId, className = '' }: { fieldId: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap font-body text-[11px] leading-none text-accent ${className}`}
      title={PREFILLED_NOTE}
      data-prefilled-tag=""
    >
      <History className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span aria-hidden="true">{PREFILLED_LABEL}</span>
      <span id={prefilledNoteId(fieldId)} className="sr-only">{PREFILLED_NOTE}</span>
    </span>
  );
}

/**
 * Which fields were filled from the records and not touched since.
 * `mark` after a fill; `release` when the reader edits the field.
 */
export function usePrefilled() {
  const [marks, setMarks] = useState<ReadonlySet<string>>(() => new Set());
  const mark = useCallback((keys: string[]) => {
    if (!keys.length) return;
    setMarks((m) => new Set([...m, ...keys]));
  }, []);
  const release = useCallback((key: string) => {
    setMarks((m) => {
      if (!m.has(key)) return m;
      const next = new Set(m);
      next.delete(key);
      return next;
    });
  }, []);
  const releaseWhere = useCallback((test: (key: string) => boolean) => {
    setMarks((m) => {
      const next = new Set([...m].filter((k) => !test(k)));
      return next.size === m.size ? m : next;
    });
  }, []);
  const has = useCallback((key: string) => marks.has(key), [marks]);
  return { has, mark, release, releaseWhere };
}
