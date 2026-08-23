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
