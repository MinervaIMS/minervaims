import type { ReactNode } from 'react';
import { CalendarDays, Flag, GraduationCap, Megaphone, Users } from 'lucide-react';
import type { EventRow, EventPlaces } from '@/lib/events-api';
import type { CalendarEntry } from '@/lib/calendar-api';
import { formatTime, romeYmd } from '@/lib/event-time';
import { todayYmd } from '@/lib/calendar-dates';

// =====================================================================
// What the workspace Calendar holds, and how each thing is shown.
// ---------------------------------------------------------------------
// FIVE CATEGORIES, NOT TEN COLOURS. The old key listed ten colours; a
// reader had to learn them before the grid meant anything. Items are now
// grouped the way a member thinks about them, and each group has ONE
// colour, ONE icon and a name, shown together on the filter chips above
// the grid, which double as the key. Colour is never the only signal
// (WCAG 1.4.1): the icon and the words say the same thing.
//
//   events    association events (the ones you can register for)
//   aod       Association on Display days
//   alumni    alumni calls
//   deadlines application windows, the membership fee, deadlines and
//             reminders the team adds (and CASA request deadlines)
//   team      meetings, socials and other team entries (and CASA
//             Committee meetings, which only the board can see)
// =====================================================================

export type Kind = 'event' | 'aod' | 'alumni' | 'application' | 'fee' | 'custom';
export type Category = 'events' | 'aod' | 'alumni' | 'deadlines' | 'team';

export interface CalItem {
  key: string;
  date: string;
  kind: Kind;
  title: string;
  /** For ordering within a day: the start instant, or the date for all-day items. */
  sort: string;
  event?: EventRow;
  entry?: CalendarEntry;
  /** A short second line: "Spring 2027 semester". */
  note?: string;
}

export const CATEGORY_ORDER: Category[] = ['events', 'aod', 'alumni', 'deadlines', 'team'];

export const CATEGORY: Record<Category, {
  label: string;
  /** Solid swatch and left bar. */
  bar: string;
  /** Chip background and text. */
  chip: string;
  /** Dot on the phone grid. */
  dot: string;
  icon: (cls?: string) => ReactNode;
}> = {
  events: { label: 'Events', bar: 'bg-accent', chip: 'bg-accent/[0.07] text-foreground', dot: 'bg-accent', icon: (c = 'h-3.5 w-3.5') => <CalendarDays className={c} /> },
  aod: { label: 'Association on Display', bar: 'bg-amber-500', chip: 'bg-amber-50 text-amber-950', dot: 'bg-amber-500', icon: (c = 'h-3.5 w-3.5') => <Megaphone className={c} /> },
  alumni: { label: 'Alumni calls', bar: 'bg-emerald-600', chip: 'bg-emerald-50 text-emerald-950', dot: 'bg-emerald-600', icon: (c = 'h-3.5 w-3.5') => <GraduationCap className={c} /> },
  deadlines: { label: 'Deadlines', bar: 'bg-rose-600', chip: 'bg-rose-50 text-rose-950', dot: 'bg-rose-600', icon: (c = 'h-3.5 w-3.5') => <Flag className={c} /> },
  team: { label: 'Team entries', bar: 'bg-slate-500', chip: 'bg-slate-100 text-slate-900', dot: 'bg-slate-500', icon: (c = 'h-3.5 w-3.5') => <Users className={c} /> },
};

export function categoryOf(it: CalItem): Category {
  if (it.kind === 'event') return 'events';
  if (it.kind === 'aod') return 'aod';
  if (it.kind === 'alumni') return 'alumni';
  if (it.kind === 'application' || it.kind === 'fee') return 'deadlines';
  const t = it.entry?.entry_type;
  return t === 'deadline' || t === 'reminder' || t === 'casa_deadline' ? 'deadlines' : 'team';
}

/** Board-only entries say so wherever they appear. */
export function isBoardOnly(it: CalItem): boolean {
  return it.entry?.entry_type === 'casa_committee' || it.entry?.entry_type === 'casa_deadline';
}

/** "6:30 pm", or '' for an all-day item. */
export function itemTime(it: CalItem): string {
  return it.event?.start_at ? formatTime(it.event.start_at, false) : '';
}

// ---------------------------------------------------------------------
// Where a member stands with an event.
// ---------------------------------------------------------------------
export type RegState =
  | 'registered'   // on the list
  | 'waiting'      // on the waiting list
  | 'open'         // registration open, places left (or no limit)
  | 'full'         // registration open, no places left: the waiting list
  | 'none'         // no registration for this event
  | 'started'      // it has begun: registering is over
  | 'past';        // it has taken place

/** The day an event falls on, on Rome's calendar. */
export function eventDay(e: EventRow): string {
  return e.start_at ? romeYmd(e.start_at) : (e.date || '').slice(0, 10);
}

/**
 * Has the event begun? Only an event with a time of day can be under way:
 * one without a time stays open for registration through its own day, and
 * is over the day after (see `isOver`).
 */
export function hasStarted(e: EventRow, now = new Date()): boolean {
  return !!e.start_at && new Date(e.start_at).getTime() <= now.getTime();
}

/** Is it over? After its end, or after its day. */
export function isOver(e: EventRow, now = new Date()): boolean {
  if (e.end_at) return new Date(e.end_at).getTime() < now.getTime();
  return eventDay(e) < todayYmd();
}

export function regState(e: EventRow, registered: Set<string>, waiting: Set<string>, places?: EventPlaces | null): RegState {
  if (registered.has(e.id)) return isOver(e) ? 'past' : 'registered';
  if (waiting.has(e.id)) return isOver(e) ? 'past' : 'waiting';
  if (isOver(e)) return 'past';
  if (!e.registration_enabled || e.aod_day_id) return 'none';
  if (hasStarted(e)) return 'started';
  if (places && places.capacity && places.taken >= places.capacity) return 'full';
  return 'open';
}

/** Short words for a state, for badges. */
export const REG_LABEL: Record<RegState, string> = {
  registered: 'Registered',
  waiting: 'On the waiting list',
  open: 'Registration open',
  full: 'Full: waiting list open',
  none: 'No registration needed',
  started: 'Under way',
  past: 'Taken place',
};

/** "12 places left", "Full", or '' when there is no limit. */
export function placesLine(p: EventPlaces | null | undefined): string {
  if (!p || !p.capacity) return '';
  const left = Math.max(0, p.capacity - p.taken);
  if (left === 0) return p.waiting ? `Full · ${p.waiting} waiting` : 'Full';
  return left === 1 ? '1 place left' : `${left} places left`;
}
