// =====================================================================
// "Add to calendar" links, for the workspace Calendar and the public
// registration page. The same links as the event emails: every one opens
// the `event-ics` function, which reads the event when it is opened, so
// the calendar always receives its current time and place. See
// supabase/functions/_shared/calendar.ts.
// =====================================================================

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? 'https://asjudzdgsccacpjbzsue.supabase.co';

export interface CalendarLinks { apple: string; google: string; outlook: string; outlookcom: string; ics: string }

export function calendarLinks(eventId: string): CalendarLinks {
  const base = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/event-ics?e=${encodeURIComponent(eventId)}`;
  return {
    apple: base,
    google: `${base}&to=google`,
    outlook: `${base}&to=outlook`,
    outlookcom: `${base}&to=outlookcom`,
    ics: base,
  };
}

/** The same links for an interview booking: the candidate's entry, or the examiner's. */
export function interviewCalendarLinks(bookingId: string, who: 'candidate' | 'examiner'): CalendarLinks {
  const base = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/event-ics?i=${encodeURIComponent(bookingId)}&who=${who}`;
  return { apple: base, google: `${base}&to=google`, outlook: `${base}&to=outlook`, outlookcom: `${base}&to=outlookcom`, ics: base };
}
