// =====================================================================
// Times of day, one way everywhere in the workspace: "6:30 pm CEST".
// ---------------------------------------------------------------------
// Twelve-hour clock with am/pm, and the time zone named, because the
// association meets in Milan while its members, alumni and guests read the
// workspace from anywhere. Every time is shown on Rome's clock (CET in
// winter, CEST in summer), whatever the reader's own computer is set to, so
// two people comparing a slot on different machines see the same thing.
//
// Two kinds of stored time:
//   * an INSTANT (events.start_at, a check-in): an ISO timestamp;
//   * a WALL-CLOCK TIME on a date (interview slots, Association on Display
//     slots): "18:30" on "2026-10-01", already in Rome's time.
// =====================================================================

const TZ = 'Europe/Rome';

/** "18", "30" -> "6:30 pm". */
export function clock12(hour: number, minute: number): string {
  const suffix = hour >= 12 ? 'pm' : 'am';
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}:${String(minute).padStart(2, '0')} ${suffix}`;
}

/** Rome's hour and minute at an instant. */
function romeClock(at: Date): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(at);
  return {
    hour: Number(parts.find((p) => p.type === 'hour')?.value ?? 0) % 24,
    minute: Number(parts.find((p) => p.type === 'minute')?.value ?? 0),
  };
}

/** "CEST" or "CET": the name of Rome's time at an instant. */
export function zoneName(at: Date = new Date()): string {
  const v = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, timeZoneName: 'short' })
    .formatToParts(at).find((p) => p.type === 'timeZoneName')?.value ?? '';
  if (v === 'CET' || v === 'CEST') return v;
  // A browser that names zones by offset: Rome is +1 in winter, +2 in summer.
  return /\+2/.test(v) ? 'CEST' : 'CET';
}

/** The zone that applies on a calendar date, read at midday. */
export function zoneOnDate(ymd: string): string {
  const d = new Date(`${ymd.slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? zoneName() : zoneName(d);
}

const asDate = (iso: string | Date | null | undefined): Date | null => {
  if (!iso) return null;
  const d = iso instanceof Date ? iso : new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** An instant as "6:30 pm CEST". */
export function formatTime(iso: string | Date | null | undefined, withZone = true): string {
  const d = asDate(iso);
  if (!d) return '';
  const { hour, minute } = romeClock(d);
  return withZone ? `${clock12(hour, minute)} ${zoneName(d)}` : clock12(hour, minute);
}

/** A span as "6:30 pm to 8:00 pm CEST"; the zone once, unless it changes in between. */
export function formatTimeRange(start: string | Date | null | undefined, end?: string | Date | null): string {
  const s = asDate(start);
  if (!s) return '';
  const e = asDate(end);
  if (!e) return formatTime(s);
  const zs = zoneName(s);
  const ze = zoneName(e);
  return zs === ze ? `${formatTime(s, false)} to ${formatTime(e, false)} ${ze}` : `${formatTime(s)} to ${formatTime(e)}`;
}

/** Rome's calendar date of an instant, as "Thursday 1 October 2026". */
export function formatDay(iso: string | Date | null | undefined, opts: { weekday?: boolean; month?: 'long' | 'short' } = {}): string {
  const d = asDate(iso);
  if (!d) return '';
  // Assembled from its parts: browsers disagree on a comma after the weekday.
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, day: 'numeric', month: opts.month ?? 'long', year: 'numeric', weekday: 'long',
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const date = `${get('day')} ${get('month')} ${get('year')}`;
  return opts.weekday === false ? date : `${get('weekday')} ${date}`;
}

/** Rome's calendar date of an instant, as "YYYY-MM-DD". */
export function romeYmd(iso: string | Date | null | undefined): string {
  const d = asDate(iso);
  return d ? d.toLocaleDateString('en-CA', { timeZone: TZ }) : '';
}

/**
 * An event's when, in full: "Thursday 1 October 2026, 6:30 pm to 8:00 pm
 * CEST". An event with no time of day gives the date alone.
 */
export function formatEventWhen(ev: { start_at?: string | null; end_at?: string | null; date?: string | null }, opts: { weekday?: boolean; month?: 'long' | 'short' } = {}): string {
  if (ev.start_at) {
    const day = formatDay(ev.start_at, opts);
    const time = formatTimeRange(ev.start_at, ev.end_at);
    return time ? `${day}, ${time}` : day;
  }
  if (ev.date) return formatDay(`${ev.date.slice(0, 10)}T12:00:00Z`, opts);
  return '';
}

/** A wall-clock "18:30" (Rome) as "6:30 pm", with the zone of its date when given. */
export function formatClock(hhmm: string | null | undefined, onDate?: string | null): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm ?? '');
  if (!m) return hhmm ?? '';
  const t = clock12(Number(m[1]), Number(m[2]));
  return onDate ? `${t} ${zoneOnDate(onDate)}` : t;
}

/** Wall-clock span on a date: "6:30 pm to 7:00 pm CEST". */
export function formatClockRange(from: string, to: string, onDate?: string | null): string {
  const a = formatClock(from);
  const b = formatClock(to);
  return onDate ? `${a} to ${b} ${zoneOnDate(onDate)}` : `${a} to ${b}`;
}

/** An instant as the two form fields want it, on Rome's clock: 'YYYY-MM-DD' and 'HH:MM'. */
export function romeWall(iso: string | Date | null | undefined): { date: string; time: string } {
  const d = asDate(iso);
  if (!d) return { date: '', time: '' };
  const { hour, minute } = romeClock(d);
  return { date: romeYmd(d), time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}` };
}

/**
 * A date and a wall-clock time typed on Rome's clock, as an instant (ISO).
 * The same for everyone: a member abroad who types 18:30 means 6:30 pm in
 * Milan, which is what every page then shows. Null when either is unreadable.
 */
export function romeWallToIso(ymd: string, hhmm: string): string | null {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec((ymd ?? '').slice(0, 10));
  const tm = /^(\d{1,2}):(\d{2})/.exec(hhmm ?? '');
  if (!dm || !tm) return null;
  const wall = Date.UTC(Number(dm[1]), Number(dm[2]) - 1, Number(dm[3]), Number(tm[1]), Number(tm[2]));
  if (Number.isNaN(wall)) return null;
  // Rome's offset from UTC at a guess, then at the corrected instant: two
  // passes settle it on either side of a clock change.
  const offsetAt = (ms: number) => {
    const { hour, minute } = romeClock(new Date(ms));
    const [y, m, d] = romeYmd(new Date(ms)).split('-').map(Number);
    return Date.UTC(y, m - 1, d, hour, minute) - ms;
  };
  let at = wall - offsetAt(wall);
  at = wall - offsetAt(at);
  return new Date(at).toISOString();
}

/** A 'YYYY-MM-DDTHH:MM' field value, typed on Rome's clock, as an instant. */
export function romeLocalToIso(local: string): string | null {
  const [d, t] = (local ?? '').split('T');
  return d && t ? romeWallToIso(d, t) : null;
}

/** An instant as a 'YYYY-MM-DDTHH:MM' field value on Rome's clock. */
export function isoToRomeLocal(iso: string | null | undefined): string {
  const w = romeWall(iso);
  return w.date && w.time ? `${w.date}T${w.time}` : '';
}

/** A moment something happened, for logs and lists: "27 Sep 2026, 6:30 pm CEST". */
export function formatStamp(iso: string | Date | null | undefined): string {
  const d = asDate(iso);
  return d ? `${formatDay(d, { weekday: false, month: 'short' })}, ${formatTime(d)}` : '';
}

/**
 * The event a page about the day's events should open on: the one
 * happening now or coming up soonest. An event counts as still to come
 * until it ends (its end time, or three hours after its start when it has
 * none, or the end of its day in Rome when it has no time at all). When
 * every event is over, the most recent one. Null for an empty list.
 */
export function nearestEvent<T extends { id: string; date?: string | null; start_at?: string | null; end_at?: string | null }>(
  events: T[],
  now: Date = new Date(),
): T | null {
  if (!events.length) return null;
  const today = romeYmd(now);
  const nowMs = now.getTime();
  const startOf = (e: T) => (e.start_at ? new Date(e.start_at).getTime() : e.date ? Date.parse(`${e.date}T00:00:00Z`) : 0);
  const isOver = (e: T) => {
    if (e.end_at) return new Date(e.end_at).getTime() <= nowMs;
    if (e.start_at) return new Date(e.start_at).getTime() + 3 * 3600_000 <= nowMs;
    return !!e.date && e.date < today;
  };
  const coming = events.filter((e) => !isOver(e)).sort((a, b) => startOf(a) - startOf(b));
  if (coming.length) return coming[0];
  return [...events].sort((a, b) => startOf(b) - startOf(a))[0];
}
