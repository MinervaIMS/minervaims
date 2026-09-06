// =====================================================================
// interview-slots — one definition of "a slot a candidate could book".
// ---------------------------------------------------------------------
// Two functions need this answer and they must never disagree:
//
//   * admin-interviews lists the slots a candidate may choose from;
//   * admin-applications refuses to invite anybody to interview for a
//     division that has none.
//
// If the gate counted slots the booking list would not show, an examiner
// would be told they could invite and the candidate would then find an
// empty calendar, which is worse than being stopped. So both ask here.
//
// A SLOT IS BOOKABLE WHEN ALL FOUR ARE TRUE:
//   · it is active           (not withdrawn by the examiner)
//   · it is not booked       (nobody else holds it)
//   · it is for the division doing the inviting
//   · IT HAS NOT HAPPENED YET
//
// The last one is the reason this file exists. `slot_date` is a date and
// `start_time` is a time, both without a zone, so "in the future" is a
// comparison of two halves and not a single timestamp: a slot at 09:00
// today is in the past by lunchtime, and an invitation that points at it
// is an invitation to a calendar with nothing on it.
//
// TIME ZONE. The association's calendar is Rome's, and the slots were
// typed in Rome. An edge function runs in UTC, so comparing against a UTC
// clock would call a 00:30 Rome slot "past" for the first hour or two of
// every day. Every comparison below is therefore made against the local
// wall clock in Europe/Rome, which is the clock the times were written on.
// =====================================================================

/** The association's own clock, the one the slot times were typed on. */
export const ASSOCIATION_TZ = 'Europe/Rome';

/** `{ date: 'YYYY-MM-DD', time: 'HH:MM:SS' }` right now, in Rome. */
export function nowInAssociationTime(at: Date = new Date()): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: ASSOCIATION_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    // `en-GB` renders midnight as 24 in some runtimes; normalise it.
    time: `${get('hour') === '24' ? '00' : get('hour')}:${get('minute')}:${get('second')}`,
  };
}

export interface SlotShape {
  slot_date: string;
  start_time: string;
  is_active?: boolean;
  is_booked?: boolean;
}

/** Is this slot still ahead of the association's clock? */
export function isFutureSlot(slot: SlotShape, now = nowInAssociationTime()): boolean {
  if (slot.slot_date > now.date) return true;
  if (slot.slot_date < now.date) return false;
  // Same day: compare the times as written. Both are zero-padded 24-hour
  // strings, so a string comparison is a chronological one. `start_time`
  // may arrive as HH:MM or HH:MM:SS; only the first five characters are
  // needed and they compare correctly either way.
  return (slot.start_time ?? '').slice(0, 5) > now.time.slice(0, 5);
}

/** Bookable = active, unbooked and still to come. */
export function isBookableSlot(slot: SlotShape, now = nowInAssociationTime()): boolean {
  if (slot.is_active === false) return false;
  if (slot.is_booked === true) return false;
  return isFutureSlot(slot, now);
}

/**
 * How many slots this division has that a candidate could actually book.
 *
 * The date filter is pushed to the database (cheap, and it keeps the row
 * count small); the time-of-day comparison is made here, because a
 * PostgREST filter cannot combine "later today" with "any day after".
 */
export async function countBookableSlots(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  division: string,
): Promise<number> {
  const now = nowInAssociationTime();
  const { data, error } = await supabase
    .from('interview_slots')
    .select('slot_date, start_time, is_active, is_booked')
    .eq('division', division)
    .eq('is_active', true)
    .eq('is_booked', false)
    .gte('slot_date', now.date);
  if (error) throw error;
  return (data ?? []).filter((s: SlotShape) => isBookableSlot(s, now)).length;
}
