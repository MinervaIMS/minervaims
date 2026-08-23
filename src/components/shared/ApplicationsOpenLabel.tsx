// =====================================================================
// ApplicationsOpenLabel — the homepage call to action while the
// recruitment window is open.
// ---------------------------------------------------------------------
// The button used to read APPLY NOW: an instruction, in full capitals,
// which is the loudest thing the homepage says and says nothing a reader
// did not already know they could do. "Applications are open" is a
// statement of fact, and the fact is the news.
//
// ONLY THE INITIAL OF EACH WORD IS BOLD. Three heavier letters across
// three words give the phrase a rhythm at a glance while the sentence
// itself stays in the serif's normal weight, so the button reads as a
// line of type rather than as a shout.
//
// IT LIVES HERE BECAUSE TWO PLACES DRAW IT. The homepage draws the real
// button; Workspace, Recruiting, Application Page draws a preview of it
// so an administrator can see what opening the window does to the public
// site. A preview that is a second, hand-typed copy of the label is a
// preview that will eventually be wrong. Both render this component, so
// the preview cannot drift from the page it previews.
// =====================================================================

/** The words of the label, in order. The single source of the wording. */
const APPLICATIONS_OPEN_WORDS = ['Applications', 'are', 'open'] as const;

/**
 * The label, with each word's first letter set at a heavier weight.
 *
 * The bold letters are rendered inside the same text flow rather than as
 * separate positioned spans, so the phrase wraps, selects, and is read aloud
 * by a screen reader exactly as the plain sentence "Applications are open".
 */
export function ApplicationsOpenLabel({ className = '' }: { className?: string }) {
  return (
    <span className={className}>
      {APPLICATIONS_OPEN_WORDS.map((word, i) => (
        <span key={word}>
          {i > 0 && ' '}
          <span style={{ fontWeight: 700 }}>{word.charAt(0)}</span>
          {word.slice(1)}
        </span>
      ))}
    </span>
  );
}

export default ApplicationsOpenLabel;
