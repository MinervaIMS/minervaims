import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDays, Loader2, MapPin } from 'lucide-react';
import { useHideSiteFooter } from '@/components/layout/ChromeContext';
import { EventCardShell } from '@/components/events/EventCardShell';
import { cancelByLink, lookupCancelLink, type CancelLookup } from '@/lib/events-api';
import { formatEventWhen } from '@/lib/event-time';

// =====================================================================
// /events/:id/cancel?t=…  "Can't make it?"
// ---------------------------------------------------------------------
// Opened from the link in the confirmation email and the reminder the day
// before (or "Leave the waiting list" in the waiting list email). It shows
// what the link is for and asks once; nothing happens until the button is
// pressed, so a mail app that opens links to preview them cancels nothing.
// A freed place goes at once to the first person on the waiting list.
// =====================================================================

const PRIMARY = 'w-full py-3.5 font-serif text-lg border border-accent bg-accent text-accent-foreground hover:bg-white hover:text-accent transition-colors duration-200 disabled:opacity-70';

export default function EventCancel() {
  useHideSiteFooter();
  const [params] = useSearchParams();
  const token = (params.get('t') || '').trim().toLowerCase();
  const [info, setInfo] = useState<CancelLookup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<'registration' | 'waitlist' | null>(null);

  useEffect(() => {
    if (!token) { setError('This link is not complete. Open it again from your email.'); return; }
    lookupCancelLink(token).then(setInfo, (e) => setError(e instanceof Error ? e.message : 'This link could not be read.'));
  }, [token]);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await cancelByLink(token);
      setDone(res.cancelled);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'It could not be cancelled. Please try again.');
    } finally { setBusy(false); }
  };

  const title = (text: string) => <h1 className="font-serif text-2xl sm:text-3xl text-accent mb-3 text-center text-balance">{text}</h1>;
  const lead = (text: React.ReactNode) => <p className="font-body text-muted-foreground text-center max-w-[460px] mx-auto">{text}</p>;
  const back = <div className="text-center mt-7"><Link to="/events" className="text-accent underline underline-offset-2 font-body">See the events</Link></div>;

  let body: React.ReactNode;
  if (error && !info) {
    body = <>{title('This link cannot be used')}{lead(error)}{back}</>;
  } else if (!info) {
    body = <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  } else if (info.kind === 'sample') {
    body = <>{title('A sample link')}{lead('This link comes from a test email, so there is no registration behind it. In a real email it cancels the registration it was sent for.')}{back}</>;
  } else if (info.kind === 'gone' && !done) {
    body = <>{title('Nothing to cancel')}{lead('This registration no longer exists: it has already been cancelled, or removed by the organisers.')}{back}</>;
  } else if (done) {
    body = done === 'registration'
      ? <>{title('Your registration is cancelled')}{lead(<>Thank you for letting us know. Your place at <span className="text-foreground">{info.event?.title}</span> can now go to somebody else, and a confirmation is on its way to your inbox.</>)}{back}</>
      : <>{title('You have left the waiting list')}{lead(<>You will not receive any more emails about places at <span className="text-foreground">{info.event?.title}</span>.</>)}{back}</>;
  } else {
    const ev = info.event!;
    const waitlist = info.kind === 'waitlist';
    body = (
      <>
        <div className="text-center mb-5">
          <div className="font-body text-xs uppercase tracking-[0.12em] font-semibold text-muted-foreground mb-2">{waitlist ? 'Waiting list' : "Can't make it?"}</div>
          <h1 className="font-serif text-2xl sm:text-3xl text-accent text-balance">{ev.title}</h1>
        </div>
        <div className="font-body text-sm text-muted-foreground space-y-2 mb-6 max-w-[470px] mx-auto">
          <div className="flex items-start gap-2.5"><CalendarDays className="h-4 w-4 shrink-0 mt-0.5" />{formatEventWhen(ev)}</div>
          <div className="flex items-start gap-2.5"><MapPin className="h-4 w-4 shrink-0 mt-0.5" />{ev.online ? 'Online' : (ev.place || 'To be confirmed')}</div>
        </div>
        <div className="max-w-[460px] mx-auto font-body">
          {info.attended ? (
            <p className="text-center text-muted-foreground">You have already been checked in at this event, so there is nothing to cancel.</p>
          ) : info.started ? (
            <p className="text-center text-muted-foreground">This event has already started, so there is nothing to cancel.</p>
          ) : (
            <>
              <p className="text-center text-muted-foreground mb-5">
                {waitlist
                  ? <>{info.name ? `${info.name}, you` : 'You'} are number {info.position ?? 1} on the waiting list. Leave it if you can no longer come.</>
                  : <>{info.name ? `${info.name}, you` : 'You'} are registered. If you cannot come, cancel your registration so that somebody else can take your place.</>}
              </p>
              {error && <p className="mb-4 text-center text-sm text-destructive">{error}</p>}
              <button type="button" onClick={confirm} disabled={busy} className={PRIMARY}>
                {busy ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Please wait</span>
                  : waitlist ? 'Leave the waiting list' : 'Cancel my registration'}
              </button>
              <div className="text-center mt-4">
                <Link to="/events" className="text-sm text-muted-foreground underline underline-offset-2">Keep my {waitlist ? 'place in the queue' : 'place'}</Link>
              </div>
            </>
          )}
        </div>
      </>
    );
  }

  return <EventCardShell title="Cancel a registration" description="Cancel a registration for an event held by Minerva Investment Management Society.">{body}</EventCardShell>;
}
