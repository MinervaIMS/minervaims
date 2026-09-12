import { applyDivisionLabel } from '@/lib/applications-api';
import { formatFilledDivisionsSentence } from '@/lib/join-content';
import type { OrgDivision } from '@/lib/roles';

// =====================================================================
// "These divisions are full", said out loud.
// ---------------------------------------------------------------------
// A division can now stop taking applications before the round ends,
// which means the form a candidate opens today can be shorter than the
// one their friend filled in last week. An absence explains nothing on
// its own: a division missing from the list reads as discontinued, or as
// a fault, long before it reads as popular.
//
// So it is stated, immediately under the block carrying the Apply button,
// where somebody deciding whether to apply is already looking. It is
// written as what it is - good news for the people who got in, and useful
// news for everybody else, because it says plainly that the other
// divisions are still open.
//
// IT RENDERS NOTHING IN THE ORDINARY CASE. No division closed early, no
// paragraph; not an empty one, and no reserved space.
//
// IT IS ALSO SILENT OUTSIDE THE WINDOW, for a reason worth keeping: once
// the closing date has passed, "filled ahead of the deadline" is no
// longer news, and the block above has already said the round is over.
// The sentence belongs to a round that is still running.
// =====================================================================

interface Props {
  /** Divisions that closed early, already narrowed to the form's own list. */
  closedDivisions: OrgDivision[];
  /** The scheduled window is running. Nothing is said outside it. */
  scheduleOpen: boolean;
  /** True when every division has closed: the round has ended early. */
  everyDivisionClosed: boolean;
  /** The settings request is still in flight. */
  isLoading: boolean;
}

export function DivisionsFilledNote({
  closedDivisions, scheduleOpen, everyDivisionClosed, isLoading,
}: Props) {
  if (isLoading || !scheduleOpen || closedDivisions.length === 0) return null;

  const sentence = formatFilledDivisionsSentence(
    closedDivisions.map(applyDivisionLabel),
    everyDivisionClosed,
  );
  if (!sentence) return null;

  return (
    <p className="font-body text-body text-muted-foreground mt-5 max-w-3xl leading-relaxed">
      {sentence}
    </p>
  );
}

export default DivisionsFilledNote;
