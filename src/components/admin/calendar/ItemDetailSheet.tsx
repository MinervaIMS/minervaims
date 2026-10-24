import type { ReactNode } from 'react';
import { CalendarClock, CircleCheck, Clock, ExternalLink, Hourglass, Loader2, MapPin, Pencil, Settings2, Users } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { AddToCalendar } from '@/components/shared/AddToCalendar';
import { AUDIENCE_LABELS, EVENT_TYPE_LABELS, type EventPlaces } from '@/lib/events-api';
import { CALENDAR_ENTRY_LABELS } from '@/lib/calendar-api';
import { divisionLabels } from '@/lib/roles';
import { formatEventWhen } from '@/lib/event-time';
import { longDay, relativeDay } from '@/lib/calendar-dates';
import { useMedia } from './calendar-hooks';
import { RegisterButton, RegistrationSteps } from './CalendarItems';
import { CATEGORY, categoryOf, isBoardOnly, type CalItem, type RegState } from './calendar-model';
import { JoinMeetingLink } from '@/components/shared/JoinMeetingLink';

// =====================================================================
// Everything about one item, and what you can do with it.
// ---------------------------------------------------------------------
// A panel from the side on a computer, so the calendar stays in view
// behind it, and a sheet from the bottom on a phone, where the thumb is.
// For an event the panel leads with where the reader stands (open, full,
// registered, waiting, over) and the one action that follows from it,
// then the steps still to come.
// =====================================================================

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  if (children === null || children === undefined || children === '') return null;
  return (
    <div className="flex gap-3">
      <span aria-hidden className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <dt className="sr-only">{label}</dt>
        <dd className="font-body text-[15px] leading-snug text-foreground">{children}</dd>
      </div>
    </div>
  );
}

export function ItemDetailSheet({
  item, state, places, busy, cancelling, onClose, onRegister, onCancel,
  canEditEvent, onEditEvent, canEditEntry, onEditEntry, canOpenForms, onOpenForms, onOpenAod, joinUrl,
}: {
  item: CalItem | null;
  /** The meeting link, only for an online event the reader holds a place at. */
  joinUrl?: string | null;
  state?: RegState;
  places?: EventPlaces | null;
  busy: boolean;
  cancelling: boolean;
  onClose: () => void;
  onRegister: () => void;
  onCancel: () => void;
  canEditEvent: boolean;
  onEditEvent: () => void;
  canEditEntry: boolean;
  onEditEntry: () => void;
  canOpenForms: boolean;
  onOpenForms: () => void;
  onOpenAod?: () => void;
}) {
  const wide = useMedia('(min-width: 640px)');
  const open = !!item;
  const cat = item ? CATEGORY[categoryOf(item)] : null;
  const e = item?.event;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side={wide ? 'right' : 'bottom'}
        className={wide ? 'w-full sm:max-w-[30rem] overflow-y-auto p-0' : 'max-h-[88vh] overflow-y-auto p-0'}
      >
        {item && cat && (
          <div className="font-body">
            <SheetHeader className="space-y-2 border-b border-separator px-6 pb-5 pt-6 text-left">
              <div className="flex flex-wrap items-center gap-2 pr-8">
                <span className={`inline-flex h-6 items-center gap-1.5 px-2 text-[12px] ${cat.chip}`}>
                  {cat.icon('h-3.5 w-3.5')}{e ? EVENT_TYPE_LABELS[e.event_type] : item.entry ? CALENDAR_ENTRY_LABELS[item.entry.entry_type] : cat.label}
                </span>
                {isBoardOnly(item) && <span className="border border-separator px-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">Board only</span>}
                {e?.division && <span className="text-[12px] text-muted-foreground">{divisionLabels[e.division]}</span>}
              </div>
              <SheetTitle className="font-serif text-[26px] font-normal leading-tight text-accent">{item.title}</SheetTitle>
              <SheetDescription className="text-[14px] text-muted-foreground">
                {relativeDay(item.date)}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 px-6 py-5">
              <dl className="space-y-3">
                <Row icon={<Clock className="h-4 w-4" />} label="When">{e ? formatEventWhen(e) : longDay(item.date)}</Row>
                <Row icon={<MapPin className="h-4 w-4" />} label="Where">
                  {e?.place || item.entry?.location || ''}
                  {joinUrl && state === 'registered' && <span className="mt-1.5 block"><JoinMeetingLink url={joinUrl} /></span>}
                </Row>
                {e && e.registration_enabled && !e.aod_day_id && (
                  <Row icon={<Users className="h-4 w-4" />} label="Who can register">
                    {AUDIENCE_LABELS[e.registration_audience]}
                    {places && places.capacity ? (
                      <span className="mt-2 block">
                        <span className="flex justify-between text-[13px] text-muted-foreground">
                          <span>{Math.min(places.taken, places.capacity)} of {places.capacity} places taken</span>
                          {places.waiting > 0 && <span>{places.waiting} waiting</span>}
                        </span>
                        <span className="mt-1 block h-1.5 bg-muted" aria-hidden>
                          <span className="block h-1.5 bg-accent" style={{ width: `${Math.min(100, Math.round((places.taken / places.capacity) * 100))}%` }} />
                        </span>
                      </span>
                    ) : null}
                  </Row>
                )}
                {item.note && <Row icon={<CalendarClock className="h-4 w-4" />} label="About">{item.note}</Row>}
              </dl>

              {(e?.description || item.entry?.description) && (
                <p className="whitespace-pre-line text-[15px] leading-relaxed text-foreground/90">{e?.description || item.entry?.description}</p>
              )}

              {/* ---- Where you stand, and what to do ------------------- */}
              {e && state && (
                <section aria-label="Registration" className="space-y-4">
                  {state === 'open' && (
                    <div className="border border-accent/30 bg-accent/[0.04] p-4">
                      <p className="font-medium text-foreground">Registration is open</p>
                      <p className="mt-1 text-[14px] text-muted-foreground">Registering takes one click. Your confirmation, with your entry code, arrives by email.</p>
                      <RegisterButton state={state} busy={busy} onClick={onRegister} size="default" className="mt-3 w-full" />
                    </div>
                  )}
                  {state === 'full' && (
                    <div className="border border-accent/30 bg-background p-4">
                      <p className="font-medium text-foreground">The event is full</p>
                      <p className="mt-1 text-[14px] text-muted-foreground">Join the waiting list: if a place opens up you are registered at once and emailed your entry code.</p>
                      <RegisterButton state={state} busy={busy} onClick={onRegister} size="default" className="mt-3 w-full" />
                    </div>
                  )}
                  {state === 'registered' && (
                    <div className="border border-emerald-600/40 bg-emerald-50 p-4">
                      <p className="flex items-center gap-2 font-medium text-emerald-900"><CircleCheck className="h-5 w-5" />You are registered</p>
                      <p className="mt-1 text-[14px] text-emerald-900/80">Your entry code is in your confirmation email and comes again in the reminder the day before.</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <AddToCalendar eventId={e.id} />
                        <Button data-ro variant="outline" size="sm" onClick={onCancel} disabled={cancelling} className="font-body">
                          {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Can't make it? Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                  {state === 'waiting' && (
                    <div className="border border-amber-500/50 bg-amber-50 p-4">
                      <p className="flex items-center gap-2 font-medium text-amber-950"><Hourglass className="h-5 w-5" />You are on the waiting list</p>
                      <p className="mt-1 text-[14px] text-amber-950/80">If a place opens up you are registered at once and emailed your entry code. Nothing else to do.</p>
                      <Button data-ro variant="outline" size="sm" onClick={onCancel} disabled={cancelling} className="mt-3 font-body">
                        {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Leave the waiting list
                      </Button>
                    </div>
                  )}
                  {state === 'started' && <p className="border border-separator bg-muted/30 p-4 text-[14px] text-muted-foreground">The event is under way, so registration has closed.</p>}
                  {state === 'past' && <p className="border border-separator bg-muted/30 p-4 text-[14px] text-muted-foreground">This event has taken place.</p>}
                  {state === 'none' && !e.aod_day_id && (
                    <div className="border border-separator p-4">
                      <p className="text-[14px] text-muted-foreground">No registration is needed for this event.</p>
                      <div className="mt-3"><AddToCalendar eventId={e.id} /></div>
                    </div>
                  )}

                  {(state === 'open' || state === 'full' || state === 'registered' || state === 'waiting') && (
                    <div>
                      <p className="mb-2 text-[12px] font-medium uppercase tracking-wider text-muted-foreground">What happens</p>
                      <RegistrationSteps state={state === 'open' || state === 'full' ? undefined : state} compact />
                    </div>
                  )}
                </section>
              )}

              {item.kind === 'aod' && (
                <div className="border border-amber-500/40 bg-amber-50 p-4">
                  <p className="text-[14px] text-amber-950">Staff the association's stand: choose a slot on the Association on Display page.</p>
                  {onOpenAod && (
                    <Button data-ro variant="outline" size="sm" className="mt-3 font-body" onClick={onOpenAod}>
                      <ExternalLink className="h-4 w-4" />Open Association on Display
                    </Button>
                  )}
                </div>
              )}

              {/* ---- For the people who run it ------------------------- */}
              {((e && (canEditEvent || canOpenForms)) || (item.entry && canEditEntry)) && (
                <div className="flex flex-wrap gap-2 border-t border-separator pt-4">
                  {e && canEditEvent && (
                    <Button variant="outline" size="sm" className="font-body" onClick={onEditEvent}><Pencil className="h-4 w-4" />Edit details</Button>
                  )}
                  {e && canOpenForms && !e.aod_day_id && (
                    <Button data-ro variant="ghost" size="sm" className="font-body" onClick={onOpenForms}><Settings2 className="h-4 w-4" />Registration settings</Button>
                  )}
                  {item.entry && canEditEntry && (
                    <Button variant="outline" size="sm" className="font-body" onClick={onEditEntry}><Pencil className="h-4 w-4" />Edit entry</Button>
                  )}
                  {item.entry?.author_name && (
                    <p className="w-full text-[12px] text-muted-foreground">Added by {item.entry.author_name}{item.entry.author_role ? `, ${item.entry.author_role}` : ''}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
