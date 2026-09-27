// =====================================================================
// The time of an event in an email, as the workspace shows it:
// "6:30 pm to 8:00 pm CEST". Twelve-hour clock, Rome's zone named (CET in
// winter, CEST in summer), because guests read the email from anywhere.
// Mirrors src/lib/event-time.ts in the application and public.event_clock
// in the database (migration 20260928090100_event_checkin.sql).
// =====================================================================

const ROME = 'Europe/Rome';

function romeClock(at: Date): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: ROME, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(at);
  return {
    hour: Number(parts.find((p) => p.type === 'hour')?.value ?? 0) % 24,
    minute: Number(parts.find((p) => p.type === 'minute')?.value ?? 0),
  };
}

/** "CEST" or "CET" at an instant. */
export function romeZone(at: Date): string {
  const v = new Intl.DateTimeFormat('en-GB', { timeZone: ROME, timeZoneName: 'short' })
    .formatToParts(at).find((p) => p.type === 'timeZoneName')?.value ?? '';
  if (v === 'CET' || v === 'CEST') return v;
  return /\+2/.test(v) ? 'CEST' : 'CET';
}

/** An instant as "6:30 pm", or "6:30 pm CEST" with the zone. */
export function romeClock12(at: Date, withZone = true): string {
  const { hour, minute } = romeClock(at);
  const t = `${hour % 12 === 0 ? 12 : hour % 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'pm' : 'am'}`;
  return withZone ? `${t} ${romeZone(at)}` : t;
}

/** "6:30 pm to 8:00 pm CEST"; "To be confirmed" without a start. */
export function formatEventTime(startAt: string | null, endAt: string | null): string {
  const s = startAt ? new Date(startAt) : null;
  if (!s || Number.isNaN(s.getTime())) return 'To be confirmed';
  const e = endAt ? new Date(endAt) : null;
  if (!e || Number.isNaN(e.getTime())) return romeClock12(s);
  return romeZone(s) === romeZone(e)
    ? `${romeClock12(s, false)} to ${romeClock12(e)}`
    : `${romeClock12(s)} to ${romeClock12(e)}`;
}
