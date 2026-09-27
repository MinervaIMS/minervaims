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

/** The ticket, as a row of the event emails. Empty without a token. */
export function checkinBlock(supabaseUrl: string, token: string | null | undefined): string {
  if (!token || !isRenderableToken(token)) return '';
  return '<tr><td align="center" style="padding:4px 40px 26px;">'
    + '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #E0E0E0;background:#FFFFFF;"><tr><td align="center" style="padding:18px 24px 16px;">'
    + `<img src="${qrImageUrl(supabaseUrl, token)}" width="168" height="168" alt="Your entry code" style="display:block;width:168px;height:168px;border:0;" />`
    + '<p style="margin:12px 0 0;font-family:Calibri,\'Segoe UI\',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#737373;">Your entry code</p>'
    + '<p style="margin:4px 0 0;font-family:Calibri,\'Segoe UI\',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.5;color:#141414;">Show it at the entrance to be checked in.</p>'
    + '</td></tr></table></td></tr>';
}
