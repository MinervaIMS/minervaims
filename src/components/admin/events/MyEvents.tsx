import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarCheck, CalendarX2, History, Loader2, Mail, MessageCircle, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { useToast } from '@/hooks/use-toast';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { HelpDot } from '@/components/admin/help/HelpSystem';
import { DateBlock, RegBadge } from '@/components/admin/calendar/CalendarItems';
import { EmptyState } from '@/components/admin/calendar/CalendarKit';
import { JoinMeetingLink } from '@/components/shared/JoinMeetingLink';
import { friendlyError } from '@/lib/errors';
import { formatDay, formatTime, romeYmd } from '@/lib/event-time';
import { currentSemester } from '@/lib/semester';
import {
  AUDIENCE_LABELS, EVENT_TYPE_LABELS, cancelMyRegistration, myEvents, registerForEvent,
  type MyEventsData, type MyHistoryStatus, type MyOpenEvent,
} from '@/lib/events-api';
import { AttendanceStatus } from './attendance-status';

// =====================================================================
// Events > My events: one member's own record of the semester's events.
// ---------------------------------------------------------------------
// Three questions, in the order a member asks them:
//   1. What can I still sign up for?   Open events, registered in one
//      click (the same registration as the website, with its emails),
//      cancelled in one click, and the way in to an online event once a
//      place is held: its link is private and reaches only them.
//   2. How have I done this semester?  The events held so far where
//      attendance was taken, each attended or missed, counted as People >
//      Members counts them, so the two never disagree.
//   3. Is something wrong?             Who to tell, and how, while the
//      list can still be corrected (two weeks after the event).
//
// Every action here is the member's own, so it stays live where the page
// is read-only (data-ro), as signing up for Association on Display does.
// =====================================================================

const OPS_EMAIL = 'as.minerva@unibocconi.it';

type Filter = 'all' | 'attended' | 'missed';

function placesLeft(e: MyOpenEvent): string {
  if (!e.capacity) return '';
  const left = Math.max(0, e.capacity - e.taken);
  return left > 0 ? `${left} of ${e.capacity} places left` : `Full${e.waiting ? `, ${e.waiting} waiting` : ''}`;
}

export default function MyEvents({ onNavigate }: { onNavigate?: (section: string, sub: string | null) => void }) {
  const { session } = useAuth();
  const access = useAccess();
  const { toast } = useToast();
  const semester = useMemo(() => currentSemester(), []);
  const [data, setData] = useState<MyEventsData | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<MyOpenEvent | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  const load = useCallback(async () => {
    try {
      setData(await myEvents(session, semester.start, semester.end));
      setFailed(null);
    } catch (e) {
      setFailed(friendlyError(e));
    }
  }, [session, semester.start, semester.end]);
  useEffect(() => { load(); }, [load]);

  const register = async (e: MyOpenEvent) => {
    setBusyId(e.id);
    try {
      const res = await registerForEvent(session, { event_id: e.id }) as { waitlisted?: boolean; position?: number | null; alreadyRegistered?: boolean };
      if (res?.waitlisted) {
        toast({ title: 'You are on the waiting list', description: `${e.title} is full${res.position ? `: you are number ${res.position}` : ''}. If a place opens up you are registered and emailed at once.` });
      } else {
        toast({
          title: res?.alreadyRegistered ? 'You were already registered' : `Registered for ${e.title}`,
          description: e.online
            ? 'Your confirmation, with the link to join, is on its way to your inbox. The link is also here and on your Dashboard.'
            : 'Your confirmation, with your entry code, is on its way to your inbox.',
        });
      }
      await load();
    } catch (err) {
      toast({ title: 'Could not register', description: friendlyError(err), variant: 'destructive' });
    } finally { setBusyId(null); }
  };

  const cancel = async (e: MyOpenEvent) => {
    setBusyId(e.id);
    try {
      const res = await cancelMyRegistration(session, e.id);
      toast({
        title: res?.cancelled === 'waitlist' ? 'You have left the waiting list' : 'Registration cancelled',
        description: res?.cancelled === 'waitlist' ? undefined : 'Your place goes to the next person waiting, if there is one. Thank you for letting us know.',
      });
      await load();
    } catch (err) {
      toast({ title: 'Could not cancel', description: friendlyError(err), variant: 'destructive' });
    } finally { setBusyId(null); setConfirmCancel(null); }
  };

  const history = data?.history ?? [];
  const attended = history.filter((h) => h.status === 'attended').length;
  const missed = history.length - attended;
  const registeredAbsent = history.filter((h) => h.status === 'registered_absent').length;
  const shown = history.filter((h) => filter === 'all' || (filter === 'attended' ? h.status === 'attended' : h.status !== 'attended'));
  const upcoming = data?.upcoming ?? [];
  const mine = upcoming.filter((u) => u.status !== 'none');
  const toJoin = upcoming.filter((u) => u.status === 'none');

  if (!data && !failed) return <div className="h-full"><WorkspaceLoader /></div>;

  return (
    <div className="font-body">
      <WorkspacePageHeader
        title="My Events"
        description={`Your events this semester (${semester.label}): what you can still register for, what you attended and what you missed.`}
      />

      {failed && (
        <div role="alert" className="mb-6 border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {failed} <button type="button" data-ro onClick={load} className="ml-1 underline underline-offset-4">Try again</button>
        </div>
      )}

      {data && (
        <div className="space-y-8">
          {/* ---- 1. Coming up ---------------------------------------- */}
          <section aria-labelledby="my-upcoming" className="space-y-3">
            <h2 id="my-upcoming" className="flex items-center gap-2 font-serif text-xl text-accent">
              <Ticket aria-hidden className="h-5 w-5" />Coming up
              <HelpDot page="events-mine" topic="register" />
            </h2>

            {mine.length > 0 && (
              <ul className="divide-y divide-separator border border-separator bg-background" aria-label="Events you are registered for">
                {mine.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-start gap-x-3 gap-y-2 px-3 py-3 sm:flex-nowrap">
                    <DateBlock ymd={e.start_at ? romeYmd(e.start_at) : e.date} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] uppercase tracking-wider text-accent">{formatDay(e.start_at || e.date)}{e.start_at ? ` · ${formatTime(e.start_at)}` : ''}</p>
                      <p className="font-serif text-[18px] leading-snug text-foreground">{e.title}</p>
                      <p className="text-[13px] text-muted-foreground">{[EVENT_TYPE_LABELS[e.event_type], e.place].filter(Boolean).join(' · ')}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                        <RegBadge state={e.status === 'registered' ? 'registered' : 'waiting'} />
                        {e.join_url && <JoinMeetingLink url={e.join_url} variant="button" />}
                        {e.online && e.status === 'registered' && !e.join_url && (
                          <span className="text-[13px] text-muted-foreground">The link to join will be in your emails and here once the organisers add it.</span>
                        )}
                      </div>
                    </div>
                    <div className="w-full pl-[3.75rem] sm:w-auto sm:shrink-0 sm:pl-0">
                      <Button data-ro variant="outline" size="sm" className="w-full sm:w-auto" disabled={busyId === e.id} onClick={() => setConfirmCancel(e)}>
                        {busyId === e.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {e.status === 'registered' ? "Can't make it" : 'Leave the waiting list'}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {toJoin.length > 0 ? (
              <ul className="space-y-2" aria-label="Events open for registration">
                {toJoin.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-start gap-x-3 gap-y-2 border border-separator bg-background px-3 py-3 sm:flex-nowrap sm:items-center">
                    <DateBlock ymd={e.start_at ? romeYmd(e.start_at) : e.date} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] uppercase tracking-wider text-accent">{formatDay(e.start_at || e.date)}{e.start_at ? ` · ${formatTime(e.start_at)}` : ''}</p>
                      <p className="font-serif text-[18px] leading-snug text-foreground">{e.title}</p>
                      <p className="text-[13px] text-muted-foreground">
                        {[EVENT_TYPE_LABELS[e.event_type], e.place, AUDIENCE_LABELS[e.audience], placesLeft(e)].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <div className="w-full pl-[3.75rem] sm:w-auto sm:shrink-0 sm:pl-0">
                      <Button
                        data-ro size="sm" className="w-full sm:w-auto"
                        variant={e.capacity && e.taken >= e.capacity ? 'outline' : 'solid'}
                        disabled={busyId === e.id} onClick={() => register(e)}
                        aria-label={`${e.capacity && e.taken >= e.capacity ? 'Join the waiting list for' : 'Register for'} ${e.title}`}
                      >
                        {busyId === e.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {e.capacity && e.taken >= e.capacity ? 'Join the waiting list' : 'Register'}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : mine.length === 0 ? (
              <EmptyState icon={<CalendarCheck className="h-5 w-5" />} title="Nothing open for registration right now">
                New events appear here as soon as their registration opens.
                {access.canView('events-on-display') ? ' Association on Display days are signed up for in Events > Association on Display.' : ''}
              </EmptyState>
            ) : null}
            {toJoin.length > 0 && (
              <p className="text-[13px] text-muted-foreground">
                One click registers you with your account: the confirmation email follows at once, with your entry code, or the link to join for an online event.
              </p>
            )}
          </section>

          {/* ---- 2. This semester ------------------------------------- */}
          <section aria-labelledby="my-history" className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 id="my-history" className="flex items-center gap-2 font-serif text-xl text-accent">
                <History aria-hidden className="h-5 w-5" />This semester
                <HelpDot page="events-mine" topic="history" />
              </h2>
              {history.length > 0 && (
                <div role="group" aria-label="Show" className="inline-flex border border-separator">
                  {(['all', 'attended', 'missed'] as Filter[]).map((f) => (
                    <button
                      key={f} type="button" data-ro aria-pressed={filter === f} onClick={() => setFilter(f)}
                      className={`px-3 py-1.5 text-[13px] capitalize transition-colors ${filter === f ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-accent'}`}
                    >
                      {f === 'all' ? `All ${history.length}` : f === 'attended' ? `Attended ${attended}` : `Missed ${missed}`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {history.length > 0 && (
              <div className="grid grid-cols-3 border border-separator bg-background">
                {[
                  { label: 'Attended', value: attended, cls: 'text-accent' },
                  { label: 'Missed', value: missed, cls: missed ? 'text-foreground' : 'text-muted-foreground' },
                  { label: 'Events counted', value: history.length, cls: 'text-muted-foreground' },
                ].map((k, i) => (
                  <div key={k.label} className={`px-4 py-3 ${i ? 'border-l border-separator' : ''}`}>
                    <p className={`font-serif text-[28px] leading-none ${k.cls}`}>{k.value}</p>
                    <p className="mt-1 text-[12px] uppercase tracking-wider text-muted-foreground">{k.label}</p>
                  </div>
                ))}
              </div>
            )}

            {history.length === 0 ? (
              <EmptyState icon={<CalendarX2 className="h-5 w-5" />} title="No attendance taken yet this semester">
                Events appear here once they have taken place and their attendance has been recorded.
              </EmptyState>
            ) : shown.length === 0 ? (
              <p className="border border-dashed border-separator px-4 py-5 text-sm text-muted-foreground">
                {filter === 'missed' ? 'You have not missed any event this semester.' : 'No event attended yet this semester.'}
              </p>
            ) : (
              <ul className="divide-y divide-separator border border-separator bg-background">
                {shown.map((h) => (
                  <li key={h.id} className="flex flex-col gap-1.5 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-3">
                    <span className="w-28 shrink-0 text-[13px] text-muted-foreground">{formatDay(h.start_at || h.date, { month: 'short', weekday: false })}</span>
                    <span className="min-w-0 flex-1 text-[15px] leading-snug text-foreground">{h.title}</span>
                    <span className="shrink-0"><AttendanceStatus status={h.status as MyHistoryStatus} short /></span>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[13px] text-muted-foreground">
              Counted: the events of {semester.label} held so far where attendance was taken, Association on Display days included, as in People &gt; Members.
              Attended means you were marked present at the event.
            </p>
          </section>

          {/* ---- 3. Something wrong? ---------------------------------- */}
          <section aria-labelledby="my-correction" className={`border-l-4 p-4 sm:p-5 ${registeredAbsent ? 'border-amber-500 bg-amber-50' : 'border-accent bg-accent/[0.04]'}`}>
            <h2 id="my-correction" className="font-serif text-lg text-accent">Was your attendance not recorded correctly?</h2>
            <p className="mt-1.5 max-w-3xl text-[15px] leading-relaxed text-foreground">
              {registeredAbsent
                ? `${registeredAbsent === 1 ? 'One event shows' : `${registeredAbsent} events show`} you as registered but not present. `
                : ''}
              If you were at an event that shows as missed, tell the Head of Operations{data.head_of_operations ? `, ${data.head_of_operations},` : ''} on
              WhatsApp, or write to <a data-ro href={`mailto:${OPS_EMAIL}?subject=${encodeURIComponent('Attendance correction')}`} className="text-accent underline underline-offset-4">{OPS_EMAIL}</a>,
              with the event's name and date. The list can be corrected up to two weeks after the event.
            </p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><MessageCircle aria-hidden className="h-4 w-4" />WhatsApp: the Head of Operations</span>
              <span className="inline-flex items-center gap-1.5"><Mail aria-hidden className="h-4 w-4" />{OPS_EMAIL}</span>
              {onNavigate && access.canView('events-on-display') && (
                <button type="button" data-ro onClick={() => onNavigate('events', 'events-on-display')} className="text-accent underline-offset-4 hover:underline">
                  Sign up for Association on Display
                </button>
              )}
            </div>
          </section>
        </div>
      )}

      <AlertDialog open={!!confirmCancel} onOpenChange={(o) => { if (!o) setConfirmCancel(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmCancel?.status === 'waitlisted' ? 'Leave the waiting list?' : 'Cancel your registration?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmCancel?.status === 'waitlisted'
                ? `You will no longer be offered a place at ${confirmCancel?.title ?? 'this event'}.`
                : `Your place at ${confirmCancel?.title ?? 'this event'} goes to the next person waiting, if there is one, and you receive an email to confirm. You can register again while places are left.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ro>Keep it</AlertDialogCancel>
            <AlertDialogAction data-ro onClick={(ev) => { ev.preventDefault(); if (confirmCancel) cancel(confirmCancel); }} disabled={!!busyId}>
              {busyId ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {confirmCancel?.status === 'waitlisted' ? 'Leave the list' : 'Cancel my place'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
