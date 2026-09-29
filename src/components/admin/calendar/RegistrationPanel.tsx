import { useState } from 'react';
import { CalendarCheck, ChevronDown, ChevronUp, CircleHelp, Ticket } from 'lucide-react';
import type { EventPlaces, EventRow } from '@/lib/events-api';
import { AUDIENCE_LABELS, EVENT_TYPE_LABELS } from '@/lib/events-api';
import { formatTime } from '@/lib/event-time';
import { relativeDay, shortDay } from '@/lib/calendar-dates';
import { EmptyState } from './CalendarKit';
import { DateBlock, RegBadge, RegisterButton, RegistrationSteps } from './CalendarItems';
import { eventDay, placesLine, type RegState } from './calendar-model';

// =====================================================================
// REGISTER FOR EVENTS: the first thing on the Calendar.
// ---------------------------------------------------------------------
// The question a member opens the Calendar with is "what is on that I
// should sign up for?", and the grid never answered it: an event you
// could register for looked like every other coloured block, and you had
// to click each one to find out. So the answer comes first, as a list:
// every upcoming event with registration open that you have not yet
// registered for, soonest first, each with its own Register button, and
// beside it the events you are already down for.
// =====================================================================

export interface OpenEvent { event: EventRow; state: RegState; places: EventPlaces | null }

const SHOWN = 3;

export function RegistrationPanel({ open, mine, busyId, onRegister, onOpen }: {
  open: OpenEvent[];
  mine: OpenEvent[];
  busyId: string | null;
  onRegister: (e: EventRow) => void;
  onOpen: (e: EventRow) => void;
}) {
  const [howOpen, setHowOpen] = useState(false);
  const [all, setAll] = useState(false);
  const shown = all ? open : open.slice(0, SHOWN);

  return (
    <section aria-labelledby="register-heading" className="mb-8">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 id="register-heading" className="font-serif text-2xl text-accent">Register for events</h2>
          <p className="mt-0.5 font-body text-sm text-muted-foreground">
            Upcoming events you can still sign up for. One click registers you, and your entry code arrives by email.
          </p>
        </div>
        <button
          data-ro type="button" aria-expanded={howOpen} onClick={() => setHowOpen((v) => !v)}
          className="inline-flex h-9 items-center gap-1.5 border border-separator bg-background px-3 font-body text-sm text-foreground hover:border-accent hover:text-accent"
        >
          <CircleHelp className="h-4 w-4" />How registration works
          {howOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>
      {howOpen && <div className="mb-4"><RegistrationSteps /></div>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,330px)]">
        {/* ---- Open now ------------------------------------------------ */}
        <div className="min-w-0">
          <h3 className="mb-2 flex items-center gap-2 font-body text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
            <Ticket className="h-4 w-4" />Open now
            <span className="tabular-nums">{open.length}</span>
          </h3>
          {open.length === 0 ? (
            <EmptyState icon={<Ticket className="h-5 w-5" />} title="Nothing to register for right now">
              You are signed up for everything that is open. New events appear here as soon as their registration opens.
            </EmptyState>
          ) : (
            <ul className="space-y-2">
              {shown.map(({ event: e, state, places }) => {
                const day = eventDay(e);
                const time = e.start_at ? formatTime(e.start_at) : '';
                const meta = [EVENT_TYPE_LABELS[e.event_type], e.place, AUDIENCE_LABELS[e.registration_audience], placesLine(places)].filter(Boolean);
                return (
                  <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 border border-separator bg-background px-3 py-2.5 transition-colors hover:border-accent/40 sm:flex-nowrap">
                    <DateBlock ymd={day} />
                    <button data-ro type="button" onClick={() => onOpen(e)} className="group min-w-0 flex-1 text-left" aria-label={`${e.title}, details`}>
                      <span className="block font-body text-[12px] uppercase tracking-wider text-accent">
                        {relativeDay(day)}{time ? ` · ${time}` : ''}
                      </span>
                      <span className="block truncate font-serif text-[18px] leading-snug text-foreground group-hover:text-accent group-hover:underline underline-offset-4">{e.title}</span>
                      <span className="block truncate font-body text-[13px] leading-snug text-muted-foreground">{meta.join(' · ')}</span>
                    </button>
                    <div className="w-full pl-[3.75rem] sm:w-auto sm:shrink-0 sm:pl-0">
                      <RegisterButton state={state} busy={busyId === e.id} onClick={() => onRegister(e)} className="w-full sm:w-auto" />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {open.length > SHOWN && (
            <button data-ro type="button" onClick={() => setAll((v) => !v)} className="mt-2 font-body text-sm text-accent underline-offset-4 hover:underline">
              {all ? 'Show fewer' : `Show all ${open.length} open events`}
            </button>
          )}
        </div>

        {/* ---- Yours --------------------------------------------------- */}
        <aside aria-labelledby="mine-heading" className="min-w-0">
          <h3 id="mine-heading" className="mb-2 flex items-center gap-2 font-body text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
            <CalendarCheck className="h-4 w-4" />Your upcoming events
            <span className="tabular-nums">{mine.length}</span>
          </h3>
          {mine.length === 0 ? (
            <p className="border border-dashed border-separator px-4 py-5 font-body text-sm text-muted-foreground">
              You are not registered for any upcoming event yet. Register from the list, the calendar or the agenda.
            </p>
          ) : (
            <ul className="divide-y divide-separator border border-separator bg-background">
              {mine.map(({ event: e, state }) => {
                const day = eventDay(e);
                return (
                  <li key={e.id}>
                    <button data-ro type="button" onClick={() => onOpen(e)} className="flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-accent/[0.04]">
                      <span className="w-[4.25rem] shrink-0 pt-0.5 font-body text-[12px] leading-tight text-muted-foreground">
                        <span className="block text-foreground">{shortDay(day)}</span>
                        {e.start_at ? formatTime(e.start_at, false) : 'All day'}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-body text-[14px] font-medium leading-snug text-foreground">{e.title}</span>
                        <span className="mt-1 block"><RegBadge state={state} compact /></span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>
    </section>
  );
}
