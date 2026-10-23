// =====================================================================
// THE RULES OF AN ALUMNI CALL, in one place for the server and the page.
// ---------------------------------------------------------------------
// Since Step 91 an alumni call is an event of type `alumni_call`, created
// from Events > Create. Its planning (status, responsible person, internal
// notes) is in `event_alumni_calls` and the alumni taking part are in
// `event_alumni`; the event's public guest list is written from them.
//
// This file is copied byte for byte to src/lib/alumni-call.ts, so the line
// an organiser sees while typing is the line the website prints. It imports
// nothing, so both sides can load it as it is.
// =====================================================================

/** Where a call stands, from the first idea to the day it happened. */
export const ALUMNI_CALL_STATUSES = ['planned', 'invited', 'accepted', 'completed', 'declined'] as const;
export type AlumniCallStatus = (typeof ALUMNI_CALL_STATUSES)[number];

export const ALUMNI_CALL_STATUS_LABELS: Record<AlumniCallStatus, string> = {
  planned: 'Planned',
  invited: 'Invited',
  accepted: 'Accepted',
  completed: 'Completed',
  declined: 'Declined',
};

/** A call is a group of two to five alumni, as it has been since the tracker began. */
export const ALUMNI_CALL_MIN = 2;
export const ALUMNI_CALL_MAX = 5;

/** Who can organise one: a research division, or the Board. */
export const ALUMNI_CALL_ORGANISERS = ['equity', 'investment', 'macro', 'portfolio', 'quant', 'board'] as const;

/** Divisions an alumnus may have been part of at Minerva. */
export const ALUMNI_FORMER_DIVISIONS = ['equity', 'investment', 'macro', 'portfolio', 'quant', 'media', 'operations', 'board'] as const;

const DIVISION_NAMES: Record<string, string> = {
  equity: 'Equity Research',
  investment: 'Investment Research',
  macro: 'Macro Research',
  portfolio: 'Portfolio Management',
  quant: 'Quantitative Research',
  media: 'Media and Communication',
  operations: 'Operations',
  board: 'Board',
};

/** One alumnus on a call: from the directory (`alumni_id`) or typed by hand. */
export interface AlumniGuest {
  alumni_id?: string | null;
  name: string;
  company?: string | null;
  position?: string | null;
  former_role?: string | null;
  former_division?: string | null;
  /** How they are introduced after their name; empty to use `describeAlumnus`. */
  headline?: string | null;
}

const clean = (v: string | null | undefined): string => (v ?? '').replace(/\s+/g, ' ').trim();

/**
 * Where they are now and what they were at Minerva, in the words the
 * posters use: "Equity Research Analyst at Goldman Sachs, former Analyst in
 * Equity Research".
 */
export function describeAlumnus(p: AlumniGuest): string {
  const now = [clean(p.position), clean(p.company)].filter(Boolean).join(' at ');
  const division = p.former_division ? DIVISION_NAMES[p.former_division] ?? '' : '';
  const role = clean(p.former_role);
  const former = role
    ? `former ${role}${division ? ` in ${division}` : ''}`
    : division ? `former member of ${division}` : '';
  return [now, former].filter(Boolean).join(', ');
}

/** What the website prints after their name: the organisers' words, or the description. */
export function alumnusHeadline(p: AlumniGuest): string {
  return clean(p.headline) || describeAlumnus(p);
}

/** One line of the event's public guest list: "Name - headline". */
export function alumnusGuestLine(p: AlumniGuest): string {
  const headline = alumnusHeadline(p);
  return headline ? `${clean(p.name)} - ${headline}` : clean(p.name);
}

/** The title a call is given when nobody has typed one. */
export function alumniCallTitle(organiser: string | null | undefined): string {
  const name = organiser ? DIVISION_NAMES[organiser] ?? '' : '';
  return name ? `Alumni Call: ${name}` : 'Alumni Call';
}
