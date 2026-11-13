import { dayMonthYear } from './workspace-dates';

// =====================================================================
// EVENT ATTENDANCE IN THE MEMBERS REGISTER DOWNLOAD (Step 105C).
// ---------------------------------------------------------------------
// People > Members, Download CSV (members-register.csv) carries the same
// attendance the Members page shows in its Events column: the semester's
// events held so far where attendance was taken (Association on Display
// days included), as counted by admin-event-reg's member-attendance, the
// one count every page shares (AGENTS.md). Each figure is its own column
// and a plain number, never "3/10": a spreadsheet reads that as a date.
// Relative imports only, so the test can load it as it is.
// =====================================================================

export interface RegisterAttendance {
  total: number;
  label: string;
  counts: Record<string, number>;
  events: { id: string; title: string; date: string }[];
  attended: Record<string, string[]>;
  registered: Record<string, string[]>;
}

export interface AttendanceCells {
  events_attended: number;
  events_held: number;
  attendance_rate: string;
  registered_not_present: number;
  events_attended_list: string;
  events_missed_list: string;
}

/** One member's attendance, as the columns of the register. */
export function attendanceCells(att: RegisterAttendance, memberId: string): AttendanceCells {
  const went = new Set(att.attended[memberId] ?? []);
  const signed = new Set(att.registered[memberId] ?? []);
  const name = (e: { title: string; date: string }) => `${dayMonthYear(e.date)} ${e.title}`.trim();
  const attended = att.events.filter((e) => went.has(e.id));
  const missedAfterRegistering = att.events.filter((e) => !went.has(e.id) && signed.has(e.id));
  // The count comes from the server, as on the page; the list from the
  // same answer. They agree, and the count is what the page shows.
  const count = att.counts[memberId] ?? attended.length;
  return {
    events_attended: count,
    events_held: att.total,
    attendance_rate: att.total > 0 ? `${Math.round((count / att.total) * 100)}%` : '',
    registered_not_present: missedAfterRegistering.length,
    events_attended_list: attended.map(name).join('; '),
    events_missed_list: missedAfterRegistering.map(name).join('; '),
  };
}

/** The headers of those columns, naming the semester they count. */
export function attendanceHeaders(label: string): { key: keyof AttendanceCells; header: string }[] {
  return [
    { key: 'events_attended', header: `Events attended (${label})` },
    { key: 'events_held', header: `Events held (${label})` },
    { key: 'attendance_rate', header: `Attendance rate (${label})` },
    { key: 'registered_not_present', header: `Registered, not present (${label})` },
    { key: 'events_attended_list', header: `Events attended, list (${label})` },
    { key: 'events_missed_list', header: `Registered, not present, list (${label})` },
  ];
}
