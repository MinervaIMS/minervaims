// =====================================================================
// One way to write a date in the workspace (Step 98): "15 Oct 2026".
// ---------------------------------------------------------------------
// Pages that printed a date with the browser's own settings showed
// "10/15/2026" on one computer and "15/10/2026" on another, next to pages
// that write "15 Oct 2026". This writes the workspace's way everywhere.
//
// A plain date ("2026-10-15", a date column) is a day, not a moment: it
// is read at noon UTC and written in UTC, so no time zone can move it to
// the day before or after. A moment (a timestamp) is written in Rome's
// time, the association's clock.
// =====================================================================

const PLAIN_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** "15 Oct 2026"; an empty string for no date or one that cannot be read. */
export function dayMonthYear(value: string | Date | null | undefined): string {
  if (!value) return '';
  const plain = typeof value === 'string' && PLAIN_DATE.test(value);
  const at = plain ? new Date(`${value}T12:00:00Z`) : new Date(value);
  if (Number.isNaN(at.getTime())) return '';
  return at.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    timeZone: plain ? 'UTC' : 'Europe/Rome',
  });
}
