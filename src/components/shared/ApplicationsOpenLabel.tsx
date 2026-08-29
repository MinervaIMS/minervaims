// =====================================================================
// ApplicationsOpenLabel — the homepage call to action while the
// recruitment window is open.
// ---------------------------------------------------------------------
// The button used to read APPLY NOW: an instruction, in full capitals,
// which is the loudest thing the homepage says and says nothing a reader
// did not already know they could do. "Applications are open" is a
// statement of fact, and the fact is the news.
//
// ONE WEIGHT, THROUGHOUT. The initial of each word used to be set at
// 700 while the rest of the word stayed at the serif's normal weight -
// three heavier letters meant as a rhythm. In practice it does not read
// as a rhythm: at the size the button uses, three letters in a different
// weight from the letters beside them read as a rendering fault, as
// though the font had failed to load for part of the phrase. A statement
// of fact is best set as one.
//
// IT LIVES HERE BECAUSE TWO PLACES DRAW IT. The homepage draws the real
// button; Workspace, Recruiting, Application Page draws a preview of it
// so an administrator can see what opening the window does to the public
// site. A preview that is a second, hand-typed copy of the label is a
// preview that will eventually be wrong. Both render this component, so
// the preview cannot drift from the page it previews.
// =====================================================================

/** The wording, in one place, for the two surfaces that draw it. */
const APPLICATIONS_OPEN_TEXT = 'Applications are open';

/**
 * The label, as one line of type in the weight its container sets.
 *
 * It is a single text node, so it wraps, selects and is read aloud exactly
 * as the sentence it is - and it inherits the button's own typography
 * rather than overriding part of it.
 */
export function ApplicationsOpenLabel({ className = '' }: { className?: string }) {
  return <span className={className}>{APPLICATIONS_OPEN_TEXT}</span>;
}

export default ApplicationsOpenLabel;
