// =====================================================================
// WHAT A CANDIDATE'S DOCUMENT IS CALLED.
// ---------------------------------------------------------------------
// This module used to hold two answers: a title for the browser TAB the
// "Open" link produced, and a name for the saved FILE. The Open link is
// gone - the pane shows 72vh of the document itself and the button under
// it saves the file, so a third copy in a tab had nothing left to do -
// and its title went with it. One answer remains.
// =====================================================================
/**
 * The file name a downloaded document is saved under.
 *
 * `CV_Name_Surname` and `WA_Name_Surname`, which is what the association
 * asked for and what makes a folder of fifty downloads sortable by
 * person. Separate from `documentTitle` above, which names a browser TAB
 * and reads as a sentence; a file name has to survive a file system, so
 * spaces become underscores and anything a file system dislikes is
 * dropped rather than escaped.
 */
export function documentFileName(
  application: { first_name: string; surname: string },
  kind: 'cv' | 'answer',
): string {
  const clean = (v: string) =>
    (v || '')
      .normalize('NFKD')
      // Accents off, so "Niccolò" saves as "Niccolo" rather than as an
      // escape sequence on a system that cannot store the character.
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  const first = clean(application.first_name);
  const last = clean(application.surname);
  const who = [first, last].filter(Boolean).join('_') || 'candidate';
  return `${kind === 'cv' ? 'CV' : 'WA'}_${who}`;
}
