/**
 * A document title a human can read at a glance in a browser tab.
 *
 * A signed storage URL ends in an object key, so a tab opened straight at
 * one was called something like `a3f1c8...-cv.pdf`: a reviewer with four
 * candidates open could not tell them apart. Kept in its own module so both
 * recruiting pages can name a document identically without importing a
 * component to do it.
 */
export function documentTitle(
  application: { first_name: string; surname: string },
  kind: 'cv' | 'answer',
): string {
  const who = `${application.first_name} ${application.surname}`.trim();
  return `${who} - ${kind === 'cv' ? 'CV' : 'Submitted work'}`;
}


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
