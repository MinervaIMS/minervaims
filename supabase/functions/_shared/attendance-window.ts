// =====================================================================
// Attendance is recorded for a week, and then it is the record.
// ---------------------------------------------------------------------
// The list is taken at the door and tidied in the days after: a walk-in
// added, a name ticked that was missed. A week is enough for that. After
// it, the list is what happened, and changes to it were more often
// accidents than corrections - a tap on the wrong row of an old event.
//
// So ticking, unticking, adding a walk-in and removing somebody are all
// refused once seven days have passed since the event's date. The day
// counts on the association's clock, Rome's, and the whole seventh day is
// included: an event on the 1st can be edited until the end of the 8th.
//
// Mirrored by `attendanceWindow` in src/lib/events-api.ts, so the page
// shows the list as closed before anybody tries.
// =====================================================================

export const ATTENDANCE_OPEN_DAYS = 7;

/** Today's date on the association's clock, as YYYY-MM-DD. */
export function romeToday(at: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** The last day attendance can be changed, as YYYY-MM-DD. */
export function attendanceClosesOn(eventDate: string): string {
  const [y, m, d] = eventDate.slice(0, 10).split('-').map(Number);
  const last = new Date(Date.UTC(y, m - 1, d + ATTENDANCE_OPEN_DAYS));
  return last.toISOString().slice(0, 10);
}

/** Is attendance for an event on this date still open today? */
export function attendanceOpen(eventDate: string | null | undefined, at: Date = new Date()): boolean {
  if (!eventDate) return true;
  return romeToday(at) <= attendanceClosesOn(eventDate);
}
