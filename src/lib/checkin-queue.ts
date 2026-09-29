import type { Session } from '@supabase/supabase-js';
import { checkInTicket, type CheckinResult } from '@/lib/events-api';

// =====================================================================
// Scans kept on the phone when the signal drops, at the door.
// ---------------------------------------------------------------------
// A hall with poor reception must not stop the queue. When a ticket
// cannot reach the server because there is no connection, the scanner
// keeps it here, on this phone, with the moment it was read, and says so.
// As soon as the connection is back the scans are sent in order and the
// check-in time is the moment of the scan, not the moment of sending.
//
// Only connection failures are kept. A refusal from the server (a ticket
// for another event, a list that has closed) is an answer, and is shown.
// The same ticket read twice while offline is kept once. Nothing personal
// is stored: only the ticket's code, the event and the time.
// =====================================================================

export interface QueuedScan { eventId: string; token: string; scannedAt: string }

const KEY = 'mims.checkin.queue';

// The code inside a scanned ticket, as the server reads it
// (supabase/functions/_shared/checkin.ts): known here too, so a code that
// is not a ticket is answered at once, signal or not.
const PREFIX = 'MIMS-CHECKIN:';
export function ticketToken(raw: string): string | null {
  const s = raw.trim();
  const t = (s.toUpperCase().startsWith(PREFIX) ? s.slice(PREFIX.length) : s).trim().toLowerCase();
  return /^[a-f0-9]{32}$/.test(t) ? t : null;
}

// Kept in the browser's storage, and in memory as well for a browser that
// refuses storage (some private windows): then the scans survive until the
// page is closed rather than until the phone restarts.
let memory: QueuedScan[] = [];

function load(): QueuedScan[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw === null ? null : JSON.parse(raw);
    if (Array.isArray(list)) {
      memory = list.filter((x): x is QueuedScan => !!x && typeof x.eventId === 'string' && typeof x.token === 'string' && typeof x.scannedAt === 'string');
    }
  } catch { /* storage unavailable: the copy in memory stands */ }
  return memory;
}

function save(list: QueuedScan[]) {
  memory = list;
  try { window.localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* kept in memory only */ }
}

/** The scans of one event still waiting to be sent from this phone. */
export function queuedScans(eventId: string): QueuedScan[] {
  return load().filter((s) => s.eventId === eventId);
}

/** Keep a scan (the token from `ticketToken`). False when the same ticket is already waiting. */
export function queueScan(eventId: string, token: string): boolean {
  const list = load();
  if (list.some((s) => s.eventId === eventId && s.token === token)) return false;
  save([...list, { eventId, token, scannedAt: new Date().toISOString() }]);
  return true;
}

function remove(scan: QueuedScan) {
  save(load().filter((s) => !(s.eventId === scan.eventId && s.token === scan.token)));
}

/** A failure with no answer from the server behind it: no signal, or too slow. */
export function isConnectionError(e: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const m = e instanceof Error ? e.message : String(e ?? '');
  return /appear to be offline|could not reach the server|took too long|failed to fetch|networkerror|network request failed/i.test(m);
}

export interface FlushReport {
  /** Sent and ticked now. */
  checkedIn: { id: string; name: string; at: string | null }[];
  /** Sent, and already ticked (by another phone, or before). */
  already: { id: string; name: string; at: string | null }[];
  /** Sent and not accepted, with the reason in words. */
  problems: string[];
  /** Still waiting: the connection dropped again while sending. */
  left: number;
}

// One sending at a time, however many places ask for it.
let running: Promise<FlushReport> | null = null;

/** Send what this phone kept for the event, oldest first. */
export function flushQueue(session: Session | null, eventId: string): Promise<FlushReport> {
  if (running) return running;
  running = (async () => {
    const report: FlushReport = { checkedIn: [], already: [], problems: [], left: 0 };
    const waiting = queuedScans(eventId);
    // Known to be offline: nothing is tried, everything stays.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) { report.left = waiting.length; return report; }
    for (let i = 0; i < waiting.length; i++) {
      const scan = waiting[i];
      let r: CheckinResult;
      try {
        r = await checkInTicket(session, eventId, scan.token, scan.scannedAt);
      } catch (e) {
        if (isConnectionError(e)) { report.left = waiting.length - i; break; }
        report.problems.push(e instanceof Error ? e.message : 'A saved ticket could not be checked.');
        remove(scan);
        continue;
      }
      remove(scan);
      if (r.result === 'checked_in') report.checkedIn.push({ id: r.id, name: r.name, at: r.checked_in_at });
      else if (r.result === 'already') report.already.push({ id: r.id, name: r.name, at: r.checked_in_at });
      else if (r.result === 'other_event') report.problems.push(`${r.name}: the ticket is for another event${r.event_title ? ` (${r.event_title})` : ''}.`);
      else if (r.result === 'unknown') report.problems.push('A saved ticket is not on any registration list.');
      else report.problems.push('A saved code was not a Minerva ticket.');
    }
    return report;
  })().finally(() => { running = null; });
  return running;
}
