// =====================================================================
// Attendance stays open for the whole semester, and then it is the record.
// ---------------------------------------------------------------------
// The list is taken at the door and tidied afterwards: a walk-in added, a
// name ticked that was missed, a name linked to the right member. Those
// corrections can come weeks later, when somebody notices their count in
// People > Members or Events > My events, so the list stays open until
// the END OF THE SEMESTER the event belongs to:
//
//   Fall   = 1 September to 31 January  (closes on 31 January)
//   Spring = 1 February to 31 August    (closes on 31 August)
//
// the same semesters as everywhere else in the workspace (src/lib/semester.ts
// and public.semester_key). An event late in a semester never gets less
// than it had before: at least FOURTEEN DAYS after its date, so an event on
// 28 January can still be corrected until 11 February.
//
// After that, the list is read-only for everyone except the President and
// the Vice President (and the association's own account), who can still
// correct it; every change they make is recorded in Activity tracking like
// any other. The day counts on the association's clock, Rome's, and the
// last day is included.
//
// Mirrored by `attendanceWindow` in src/lib/events-api.ts, so the page
// shows the list as closed before anybody tries.
// =====================================================================

/** The minimum time attendance stays open after an event, in days. */
export const ATTENDANCE_MIN_OPEN_DAYS = 14;

/** Roles that can still correct attendance after it has closed. */
export const ATTENDANCE_OVERRIDE_ROLES = ['admin', 'president', 'vice_president'];
const ADMIN_EMAIL = 'as.minerva@unibocconi.it';

/** Today's date on the association's clock, as YYYY-MM-DD. */
export function romeToday(at: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** The last day of the semester a date belongs to, as YYYY-MM-DD. */
export function semesterEndOf(day: string): string {
  const [y, m] = day.slice(0, 10).split('-').map(Number);
  if (m >= 9) return `${y + 1}-01-31`;
  if (m === 1) return `${y}-01-31`;
  return `${y}-08-31`;
}

/** The last day attendance can be changed, as YYYY-MM-DD. */
export function attendanceClosesOn(eventDate: string): string {
  const [y, m, d] = eventDate.slice(0, 10).split('-').map(Number);
  const floor = new Date(Date.UTC(y, m - 1, d + ATTENDANCE_MIN_OPEN_DAYS)).toISOString().slice(0, 10);
  const end = semesterEndOf(eventDate);
  return end > floor ? end : floor;
}

/** Is attendance for an event on this date still open today? */
export function attendanceOpen(eventDate: string | null | undefined, at: Date = new Date()): boolean {
  if (!eventDate) return true;
  return romeToday(at) <= attendanceClosesOn(eventDate);
}

/** Can this person still correct attendance after it has closed? */
export function canOverrideClosedAttendance(roles: string[], email: string | null | undefined): boolean {
  return (email || '').trim().toLowerCase() === ADMIN_EMAIL || roles.some((r) => ATTENDANCE_OVERRIDE_ROLES.includes(r));
}
