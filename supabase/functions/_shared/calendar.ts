// =====================================================================
// "Add to calendar", for the event emails, the workspace calendar and the
// registration page.
// ---------------------------------------------------------------------
// Every link points at the `event-ics` function with the event's id, and
// the function reads the event when the link is opened. So a link in an
// email sent a fortnight ago still adds the event at its CURRENT time and
// place, if either has changed since.
//
//   (no `to`)        an .ics file: Apple Calendar on an iPhone, iPad or
//                    Mac opens it straight into "Add to calendar"; Outlook
//                    on a computer and every other calendar app read it.
//   to=google        Google Calendar's "new event" page, filled in: on an
//                    Android phone it opens in the Calendar app or the web.
//   to=outlook       Outlook on the web for Microsoft 365 accounts, which
//                    is what Bocconi addresses use.
//   to=outlookcom    Outlook.com, for personal Microsoft accounts.
//
// Times are written as exact instants (UTC), so each calendar shows the
// event at the right local time wherever the reader is. An event with no
// end is given one hour; an event with no time of day is an all-day event.
// `e=sample` is the placeholder used by previews and test emails.
// Mirrored for the emails by public.event_calendar_block (migration
// 20260929090000_event_places_waitlist.sql).
// =====================================================================

export const SITE = 'https://minervaims.org';

export interface CalendarEvent {
  id: string;
  title: string;
  start_at: string | null;
  end_at: string | null;
  date: string | null;
  place: string | null;
  online: boolean | null;
  description: string | null;
  updated_at?: string | null;
  /** An interview is not an event: its own page and its own calendar id. */
  url?: string;
  uid?: string;
}

export type CalendarTarget = 'ics' | 'google' | 'outlook' | 'outlookcom';

export const SAMPLE_EVENT = (): CalendarEvent => {
  const start = new Date(Date.now() + 7 * 86400000);
  start.setUTCHours(16, 30, 0, 0);
  return {
    id: 'sample', title: 'Sample event', start_at: start.toISOString(),
    end_at: new Date(start.getTime() + 90 * 60000).toISOString(), date: start.toISOString().slice(0, 10),
    place: 'Bocconi University, Milan', online: false, description: 'This is a sample event from a test email.', updated_at: null,
  };
};

export function calendarUrl(supabaseUrl: string, eventId: string, to: CalendarTarget = 'ics'): string {
  const base = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/event-ics?e=${encodeURIComponent(eventId)}`;
  return to === 'ics' ? base : `${base}&to=${to}`;
}

/** The span the calendar receives: exact instants, or whole days. */
function span(ev: CalendarEvent): { allDay: boolean; start: Date; end: Date } | null {
  if (ev.start_at && !Number.isNaN(Date.parse(ev.start_at))) {
    const start = new Date(ev.start_at);
    const end = ev.end_at && !Number.isNaN(Date.parse(ev.end_at)) && Date.parse(ev.end_at) > start.getTime()
      ? new Date(ev.end_at) : new Date(start.getTime() + 60 * 60000);
    return { allDay: false, start, end };
  }
  if (ev.date && /^\d{4}-\d{2}-\d{2}/.test(ev.date)) {
    const start = new Date(`${ev.date.slice(0, 10)}T00:00:00Z`);
    return { allDay: true, start, end: new Date(start.getTime() + 86400000) };
  }
  return null;
}

const utcStamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const dayStamp = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');
const location = (ev: CalendarEvent) => (ev.online ? 'Online' : (ev.place || '').trim());
const pageUrl = (ev: CalendarEvent) => ev.url ?? (ev.id === 'sample' ? SITE : `${SITE}/events/${ev.id}/register`);
const details = (ev: CalendarEvent) => [(ev.description || '').trim(), `Minerva Investment Management Society: ${pageUrl(ev)}`].filter(Boolean).join('\n\n');

export function googleUrl(ev: CalendarEvent): string | null {
  const s = span(ev);
  if (!s) return null;
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates: s.allDay ? `${dayStamp(s.start)}/${dayStamp(s.end)}` : `${utcStamp(s.start)}/${utcStamp(s.end)}`,
    details: details(ev),
    location: location(ev),
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

export function outlookUrl(ev: CalendarEvent, host: 'office' | 'live'): string | null {
  const s = span(ev);
  if (!s) return null;
  const q = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: ev.title,
    startdt: s.allDay ? s.start.toISOString().slice(0, 10) : s.start.toISOString().replace(/\.\d{3}Z$/, 'Z'),
    enddt: s.allDay ? s.end.toISOString().slice(0, 10) : s.end.toISOString().replace(/\.\d{3}Z$/, 'Z'),
    location: location(ev),
    body: details(ev),
  });
  if (s.allDay) q.set('allday', 'true');
  const origin = host === 'office' ? 'https://outlook.office.com' : 'https://outlook.live.com';
  return `${origin}/calendar/0/deeplink/compose?${q.toString()}`;
}

// ── The .ics file (RFC 5545) ─────────────────────────────────────────
const escapeText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Lines longer than 75 octets are folded, as calendars expect. */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let cur = '';
  let curLen = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (curLen + n > (out.length ? 74 : 75)) { out.push(cur); cur = ''; curLen = 0; }
    cur += ch; curLen += n;
  }
  out.push(cur);
  return out.join('\r\n ');
}

export function buildIcs(ev: CalendarEvent, now: Date = new Date()): string | null {
  const s = span(ev);
  if (!s) return null;
  const updated = ev.updated_at && !Number.isNaN(Date.parse(ev.updated_at)) ? Date.parse(ev.updated_at) : 0;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Minerva Investment Management Society//Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${ev.uid ?? `event-${ev.id}`}@minervaims.org`,
    // A later version of the same event replaces the earlier one.
    `SEQUENCE:${Math.max(0, Math.floor(updated / 60000) - 29_000_000)}`,
    `DTSTAMP:${utcStamp(now)}`,
    s.allDay ? `DTSTART;VALUE=DATE:${dayStamp(s.start)}` : `DTSTART:${utcStamp(s.start)}`,
    s.allDay ? `DTEND;VALUE=DATE:${dayStamp(s.end)}` : `DTEND:${utcStamp(s.end)}`,
    `SUMMARY:${escapeText(ev.title)}`,
    ...(location(ev) ? [`LOCATION:${escapeText(location(ev))}`] : []),
    `DESCRIPTION:${escapeText(details(ev))}`,
    `URL:${pageUrl(ev)}`,
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    // A reminder an hour before, for a timed event.
    ...(s.allDay ? [] : ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeText(ev.title)}`, 'TRIGGER:-PT1H', 'END:VALARM']),
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

export function icsFileName(ev: CalendarEvent): string {
  const slug = ev.title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  return `Minerva-${slug || 'event'}.ics`;
}

// ── The two rows the event emails carry ─────────────────────────────
// Mirrored EXACTLY by public.event_calendar_block and
// public.event_cancel_block in the database, which is what the emails are
// actually built with; these copies give the previews the same rows.
const FONT = "font-family:Calibri,'Segoe UI',Helvetica,Arial,sans-serif;";
const LINK = 'color:#1F0F4D;text-decoration:underline;';
const SEP = '<span style="color:#D9D9D9;"> &nbsp;&middot;&nbsp; </span>';

export function emailCalendarBlock(supabaseUrl: string, eventId: string): string {
  if (!/^([0-9a-f-]{36}|sample)$/.test(eventId)) return '';
  return calendarRow(`${supabaseUrl.replace(/\/$/, '')}/functions/v1/event-ics?e=${eventId}`);
}

/**
 * "Add to your calendar" for an interview booking: the candidate's entry
 * (who=candidate) or the examiner's (who=examiner). The link reads the
 * booking when it is opened, so a changed slot adds the new time.
 */
export function emailInterviewCalendarBlock(supabaseUrl: string, bookingId: string, who: 'candidate' | 'examiner'): string {
  if (!/^([0-9a-f-]{36}|sample)$/.test(bookingId)) return '';
  return calendarRow(`${supabaseUrl.replace(/\/$/, '')}/functions/v1/event-ics?i=${bookingId}&amp;who=${who}`);
}

function calendarRow(base: string): string {
  return '<tr><td class="mims-pad" style="padding:0 40px 24px;">'
    + `<p class="mims-xsmall" style="margin:0 0 6px;${FONT}font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#737373;">Add to your calendar</p>`
    + `<p class="mims-body" style="margin:0;${FONT}font-size:15px;line-height:1.9;color:#141414;">`
    + `<a href="${base}" style="${LINK}">Apple Calendar</a>${SEP}`
    + `<a href="${base}&amp;to=google" style="${LINK}">Google Calendar</a>${SEP}`
    + `<a href="${base}&amp;to=outlook" style="${LINK}">Outlook</a>${SEP}`
    + `<a href="${base}" style="${LINK}">Other apps (.ics)</a>`
    + '</p></td></tr>';
}

// ── Online events: the join box ─────────────────────────────────────
// Mirrored EXACTLY by public.event_join_block in the database. An online
// event keeps its meeting link in `place`; when that is a web address,
// the confirmation carries it in a box nobody can miss: a heading, a
// button named after the platform, and the address itself to copy.

/** A meeting link as the emails accept it: http(s), no spaces, not too long. */
export const MEETING_LINK_RE = /^https?:\/\/[^\s<>"']{3,2000}$/i;

/** "Join on Microsoft Teams", "Join on Zoom", ... from the address. */
export function joinLabel(url: string): string {
  const u = url.toLowerCase();
  if (u.includes('teams.microsoft.com') || u.includes('teams.live.com')) return 'Join on Microsoft Teams';
  if (u.includes('zoom.us')) return 'Join on Zoom';
  if (u.includes('meet.google.com')) return 'Join on Google Meet';
  if (u.includes('webex.com')) return 'Join on Webex';
  return 'Join the event';
}

export function emailJoinBlock(place: string | null | undefined): string {
  const url = String(place ?? '').trim();
  if (!MEETING_LINK_RE.test(url)) return '';
  const href = url.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  return '<tr><td class="mims-pad" style="padding:0 40px 26px;">'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:2px solid #1F0F4D;background:#F3F1F9;"><tr><td style="padding:20px 22px 22px;">'
    + `<p style="margin:0 0 6px;${FONT}font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#1F0F4D;">This event is online</p>`
    + `<p style="margin:0 0 16px;font-family:'EB Garamond','Times New Roman',Georgia,serif;font-size:22px;line-height:1.3;color:#141414;">Join from this link at the start time</p>`
    + `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#1F0F4D" style="background:#1F0F4D;"><a href="${href}" style="display:inline-block;padding:15px 34px;${FONT}font-size:12px;font-weight:600;letter-spacing:1.6px;text-transform:uppercase;color:#FFFFFF;text-decoration:none;">${joinLabel(url)}</a></td></tr></table>`
    + `<p style="margin:16px 0 0;${FONT}font-size:13px;line-height:1.6;color:#4D4D4D;">If the button does not open, copy this address into your browser:<br /><a href="${href}" style="color:#1F0F4D;text-decoration:underline;word-break:break-all;">${href}</a></p>`
    + '</td></tr></table></td></tr>';
}

export function emailCancelBlock(eventId: string, token: string, kind: 'registration' | 'waitlist'): string {
  if (!/^([0-9a-f-]{36}|sample)$/.test(eventId) || !/^([a-f0-9]{32}|sample)$/.test(token)) return '';
  const url = `${SITE}/events/${eventId}/cancel?t=${token}`;
  const text = kind === 'waitlist'
    ? `No longer able to come? <a href="${url}" style="${LINK}">Leave the waiting list</a>.`
    : `Can&rsquo;t make it? <a href="${url}" style="${LINK}">Cancel your registration</a>, so that somebody else can take your place.`;
  return `<tr><td class="mims-pad" style="padding:0 40px;"><p class="mims-small" style="margin:0 0 18px;${FONT}font-size:13px;line-height:1.7;color:#737373;">${text}</p></td></tr>`;
}


// ── Interviews ───────────────────────────────────────────────────────
// A slot is stored as a date and wall-clock times typed on Rome's clock.

/** A date and a wall-clock time on Rome's clock, as an instant. */
export function romeWallToDate(ymd: string, hhmm: string): Date | null {
  const dm = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd || '');
  const tm = /^(\d{1,2}):(\d{2})/.exec(hhmm || '');
  if (!dm || !tm) return null;
  const wall = Date.UTC(Number(dm[1]), Number(dm[2]) - 1, Number(dm[3]), Number(tm[1]), Number(tm[2]));
  const offsetAt = (ms: number) => {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(ms));
    const g = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
    return Date.UTC(g('year'), g('month') - 1, g('day'), g('hour') % 24, g('minute')) - ms;
  };
  let at = wall - offsetAt(wall);
  at = wall - offsetAt(at);
  return new Date(at);
}

export interface InterviewForCalendar {
  bookingId: string;
  divisionLabel: string;
  candidateName: string;
  examinerName: string | null;
  slotDate: string;
  startTime: string;
  endTime: string;
  meetingLink: string | null;
}

/** An interview as a calendar entry, for the candidate or for the examiner. */
export function interviewAsEvent(i: InterviewForCalendar, who: 'candidate' | 'examiner'): CalendarEvent | null {
  const start = romeWallToDate(i.slotDate, i.startTime);
  const end = romeWallToDate(i.slotDate, i.endTime);
  if (!start) return null;
  const link = (i.meetingLink || '').trim();
  const lines = who === 'candidate'
    ? [`Your interview with Minerva Investment Management Society (${i.divisionLabel}).`, i.examinerName ? `Examiner: ${i.examinerName}.` : '', link ? `Join: ${link}` : '']
    : [`Interview with ${i.candidateName}, ${i.divisionLabel}.`, link ? `Join: ${link}` : ''];
  return {
    id: i.bookingId,
    uid: `interview-${i.bookingId}-${who}`,
    url: 'https://minervaims.org/workspace',
    title: who === 'candidate' ? `Minerva IMS interview: ${i.divisionLabel}` : `Interview: ${i.candidateName} (${i.divisionLabel})`,
    start_at: start.toISOString(),
    end_at: end && end > start ? end.toISOString() : null,
    date: i.slotDate.slice(0, 10),
    place: link || 'Online',
    online: false,
    description: lines.filter(Boolean).join('\n'),
  };
}
