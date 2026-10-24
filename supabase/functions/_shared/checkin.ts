// =====================================================================
// Check-in at the door: the ticket every registration carries.
// ---------------------------------------------------------------------
// Each row of event_registrations has a private `checkin_token` (32 hex
// characters, set by the database). The confirmation email and the
// reminder the day before carry it as a QR code; at the door, Events,
// Attendance scans it and ticks the person as present.
//
// The QR code holds `MIMS-CHECKIN:<token>` and nothing else: no name, no
// address, no event. The token only means something to a person who can
// already take attendance for that event.
//
// The email block below is mirrored, character for character, by the
// database function public.event_checkin_block (migration
// 20260928090100_event_checkin.sql), which builds it for the reminder.
// =====================================================================

import { SANS, T } from './email-layout.ts';

export const CHECKIN_PREFIX = 'MIMS-CHECKIN:';
const TOKEN_RE = /^[a-f0-9]{32}$/;

/** The token inside a scanned code, or null when it is not a ticket. */
export function tokenFromScan(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  const t = (s.toUpperCase().startsWith(CHECKIN_PREFIX) ? s.slice(CHECKIN_PREFIX.length) : s).trim().toLowerCase();
  return TOKEN_RE.test(t) ? t : null;
}

/** A token as the QR image endpoint accepts it; `sample` is for previews and tests. */
export function isRenderableToken(t: unknown): t is string {
  return typeof t === 'string' && (TOKEN_RE.test(t) || t === 'sample');
}

export function qrImageUrl(supabaseUrl: string, token: string): string {
  return `${supabaseUrl.replace(/\/+$/, '')}/functions/v1/checkin-qr?t=${token}`;
}

/**
 * The ticket, as a row of the event emails: the code beside two lines
 * that say what it is for. Empty without a token. Mirrored EXACTLY by
 * public.event_checkin_block (written from checkinBlockFrame by the Step
 * 96 migration).
 */
export function checkinBlockFrame(src: string): string {
  return '<tr><td class="m-pad" style="padding:0 40px 22px;">'
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-line" style="border:1px solid ${T.line};"><tr>`
    + `<td valign="middle" style="padding:14px;width:140px;"><img src="${src}" width="140" height="140" alt="Your entry code" style="display:block;width:140px;height:140px;border:0;background:#FFFFFF;" /></td>`
    + `<td valign="middle" style="padding:14px 18px 14px 4px;"><p class="m-ink" style="margin:0 0 4px;font-family:${SANS};font-size:16px;font-weight:700;line-height:1.4;color:${T.ink};">Your entry code</p>`
    + `<p class="m-muted" style="margin:0;font-family:${SANS};font-size:14px;line-height:1.5;color:${T.muted};">Show it at the entrance to be checked in.</p></td>`
    + '</tr></table></td></tr>';
}

export function checkinBlock(supabaseUrl: string, token: string | null | undefined): string {
  if (!token || !isRenderableToken(token)) return '';
  return checkinBlockFrame(qrImageUrl(supabaseUrl, token));
}
