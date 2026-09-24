// =====================================================================
// An interview slot is opened with the meeting it will be held in.
// ---------------------------------------------------------------------
// Interviews are held online, and the candidate's booking confirmation
// and calendar entry carry the slot's link. A slot opened without one
// sent the candidate a confirmation for an interview with nowhere to go:
// the link had to be found and forwarded by hand, one candidate at a
// time, usually on the morning itself. So the link is required when a
// slot is opened, and it must be a Microsoft Teams or Zoom meeting, which
// is what the association interviews on.
//
// Mirrored by `meetingLinkError` in src/lib/interviews-api.ts, so the
// dialog says the same thing before sending that this says after.
// =====================================================================

/** Hosts a meeting link may point at; subdomains count (us06web.zoom.us). */
export const MEETING_HOSTS = ['teams.microsoft.com', 'teams.live.com', 'zoom.us', 'zoom.com'];

/** Why this is not an acceptable meeting link, or null if it is one. */
export function meetingLinkError(raw: unknown): string | null {
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (!value) return 'Add the Microsoft Teams or Zoom link for this interview. Candidates receive it when they book.';
  let url: URL;
  try { url = new URL(value); } catch {
    return 'The meeting link is not a complete web address. Paste the whole link, starting with https://.';
  }
  if (url.protocol !== 'https:') return 'The meeting link must start with https://.';
  const host = url.hostname.toLowerCase();
  if (!MEETING_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) {
    return 'Use a Microsoft Teams or Zoom meeting link (teams.microsoft.com, teams.live.com or zoom.us).';
  }
  return null;
}
