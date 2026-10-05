// =====================================================================
// Where an event happens, and who may see its meeting link.
// ---------------------------------------------------------------------
// An online event keeps its meeting link in `place`. The registration
// confirmation email carries it (public.event_join_block, mirrored by
// emailJoinBlock in supabase/functions/_shared/calendar.ts), and members
// see it in the workspace. The PUBLIC website shows "Online" instead:
// a link published on a web page is a link anyone can join.
// =====================================================================

/** A meeting link as the emails accept it: http(s), no spaces. Mirrors admin-events. */
export const MEETING_LINK_RE = /^https?:\/\/[^\s<>"']{3,2000}$/i;

export const isMeetingLink = (place: string | null | undefined): boolean => MEETING_LINK_RE.test(String(place ?? '').trim());

/** "Microsoft Teams", "Zoom", ... from a meeting link, or null. */
export function meetingPlatform(url: string | null | undefined): string | null {
  const u = String(url ?? '').toLowerCase();
  if (u.includes('teams.microsoft.com') || u.includes('teams.live.com')) return 'Microsoft Teams';
  if (u.includes('zoom.us')) return 'Zoom';
  if (u.includes('meet.google.com')) return 'Google Meet';
  if (u.includes('webex.com')) return 'Webex';
  return null;
}

/** "Join on Microsoft Teams", or "Join the event" for a link it does not recognise. */
export function joinLabel(url: string): string {
  const p = meetingPlatform(url);
  return p ? `Join on ${p}` : 'Join the event';
}

/** Whether an event takes place online, by its switch or by its place. */
export const isOnlineEvent = (e: { online?: boolean | null; place?: string | null }): boolean =>
  !!e.online || isMeetingLink(e.place) || /^\s*online\s*$/i.test(String(e.place ?? ''));

/** Where an event is, as the public website shows it. */
export function publicPlace(e: { online?: boolean | null; place?: string | null }): string {
  return isOnlineEvent(e) ? 'Online' : String(e.place ?? '').trim();
}

/** Why a meeting link cannot be used, or null. */
export function meetingLinkProblem(place: string): string | null {
  const t = place.trim();
  if (!t) return 'Add the meeting link: registrants receive it in their confirmation email.';
  if (!isMeetingLink(t)) return 'Paste the full meeting link, starting with https:// (Teams, Zoom, Google Meet...).';
  return null;
}
