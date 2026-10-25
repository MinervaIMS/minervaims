import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Clock, Phone, User, CheckCircle2, CalendarClock, Loader2, MessageCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { formatClockRange } from '@/lib/event-time';
import { AddToCalendar } from '@/components/shared/AddToCalendar';
import {
  availableCallSlots, bookCall, cancelCall, myCallContext,
  type AvailableCallSlot, type MyCallContext,
} from '@/lib/calls-api';

// =====================================================================
// CallCandidate: the applicant's Phone Call (Step 97).
// ---------------------------------------------------------------------
// After a good interview, and before any decision, the President or the
// Vice President calls the candidate. The page appears in the candidate's
// menu with the invitation, as Interview does, and it says first what
// the call is for, because a candidate who has just come through a
// technical interview will otherwise prepare for another one.
// =====================================================================

const TITLE = 'Phone Call';
const DESCRIPTION = 'A short call with the President or the Vice President, after your interview.';

const CALL_RULES = [
  'Please book within 72 hours (3 days) of the invitation email.',
  'You can move your call ONCE, from this page, up to one hour before it starts.',
  'We call you on the phone number in your application. If the call has not arrived five minutes after the start, call the number shown with your booking.',
];

function AboutTheCall() {
  return (
    <Card className="max-w-2xl mb-5 border-accent/30 bg-accent/5">
      <CardContent className="pt-6 font-body">
        <div className="flex items-center gap-2 text-accent">
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
          <h2 className="font-serif text-lg">What the call is about</h2>
        </div>
        <p className="mt-3 text-foreground leading-relaxed">
          It is about Minerva Investment Management Society as a whole: how it works, what membership involves and
          what you hope to find in it.
        </p>
        <p className="mt-2 text-foreground leading-relaxed">
          It is <strong>not</strong> a technical conversation about markets, and there is nothing to prepare.
        </p>
      </CardContent>
    </Card>
  );
}

export default function CallCandidate() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [ctx, setCtx] = useState<MyCallContext | null>(null);
  const [available, setAvailable] = useState<AvailableCallSlot[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const c = await myCallContext(session);
      setCtx(c);
      if (c.invited && !c.booking) setAvailable(await availableCallSlots(session));
      else setAvailable([]);
    } catch (e) {
      toast({ title: 'Could not load your phone call', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const byDay = useMemo(() => {
    const map = new Map<string, AvailableCallSlot[]>();
    for (const s of available) {
      if (!map.has(s.slot_date)) map.set(s.slot_date, []);
      map.get(s.slot_date)!.push(s);
    }
    for (const list of map.values()) list.sort((a, b) => a.start_time.localeCompare(b.start_time));
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [available]);

  const book = async (slotId: string) => {
    setBusy(true);
    try { await bookCall(session, slotId); toast({ title: 'Phone call booked', description: 'Your time is confirmed.' }); await load(); }
    catch (e) { toast({ title: 'Could not book this time', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); await load(); }
    finally { setBusy(false); }
  };

  const cancel = async () => {
    setBusy(true);
    try { await cancelCall(session); toast({ title: 'Booking cancelled', description: 'You can choose another time.' }); await load(); }
    catch (e) { toast({ title: 'Could not cancel', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  if (loading) return <div><WorkspacePageHeader title={TITLE} description={DESCRIPTION} /><WorkspaceLoader /></div>;

  const notice = (text: React.ReactNode) => (
    <div>
      <WorkspacePageHeader title={TITLE} description={DESCRIPTION} />
      <Card className="max-w-2xl">
        <CardContent className="py-12 text-center">
          <CalendarClock className="h-10 w-10 mx-auto mb-4 text-muted-foreground/60" aria-hidden="true" />
          <p className="font-body text-muted-foreground">{text}</p>
        </CardContent>
      </Card>
    </div>
  );

  if (ctx?.withdrawn) return notice(<>You have withdrawn your application, so there is no call to book. Any time you were holding has been released. Your application status is in <strong>Status</strong>.</>);
  // The call is behind them. What was decided is told by email, and on
  // Status, when the association acts on it: never early, from here.
  if (ctx?.done) return notice('Your phone call has taken place. Thank you for your time: you will hear from us by email.');
  if (!ctx?.invited) return notice('You have not been invited to a phone call. After your interview, if the division would like to take your application further, an invitation and the times to book appear here.');

  // Booked: everything for the day.
  if (ctx.booking?.slot) {
    const s = ctx.booking.slot;
    return (
      <div>
        <WorkspacePageHeader title={TITLE} description={DESCRIPTION} />
        <AboutTheCall />
        <Card className="max-w-2xl">
          <CardContent className="pt-6 font-body">
            <div className="flex items-center gap-2 text-accent mb-4">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              <span className="font-serif text-lg">Your phone call is confirmed</span>
            </div>
            <div className="space-y-2 text-foreground">
              <div className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-accent" aria-hidden="true" /> {format(parseISO(s.slot_date), 'EEEE, d MMMM yyyy')}</div>
              <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-accent" aria-hidden="true" /> {formatClockRange(s.start_time, s.end_time, s.slot_date)}</div>
              <div className="flex items-center gap-2"><User className="h-4 w-4 text-accent" aria-hidden="true" /> {s.caller_name || 'The President or the Vice President'}</div>
              <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-accent" aria-hidden="true" /> We will call you on <strong className="font-medium">{ctx.phone || 'the number in your application'}</strong></div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              If the call has not arrived five minutes after the start, call <a className="text-accent underline underline-offset-4" href={`tel:${s.caller_phone.replace(/[^0-9+]/g, '')}`}>{s.caller_phone}</a>.
            </p>
            {ctx.booking.id && <div className="mt-4"><AddToCalendar call={{ bookingId: ctx.booking.id, who: 'candidate' }} /></div>}
            <div className="mt-6 pt-4 border-t border-separator">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Moving your call</div>
              <ul className="space-y-1.5 text-sm text-foreground">
                {CALL_RULES.map((r) => (
                  <li key={r} className="pl-4 relative leading-relaxed before:content-['·'] before:absolute before:left-0 before:text-accent">{r}</li>
                ))}
              </ul>
            </div>
            <div className="mt-6 pt-4 border-t border-separator">
              {ctx.changesLeft === 0 ? (
                <p className="text-sm text-muted-foreground">
                  You have already moved your call once, so this time is now final. If you genuinely cannot take it,
                  write to the association rather than missing it.
                </p>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="rounded-none" disabled={busy}>Cancel / choose another time</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel this call?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Your time will be released and you can pick another available one, though we cannot always
                        guarantee that one remains. <strong>This is the only change you may make.</strong>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-none">Keep it</AlertDialogCancel>
                      <AlertDialogAction className="rounded-none" onClick={cancel}>Cancel booking</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invited, not yet booked: choose a time.
  return (
    <div>
      <WorkspacePageHeader
        title={TITLE}
        description="Congratulations on your interview. Choose a time below; your booking confirms the call."
      />
      <AboutTheCall />
      {ctx.bookBy && (
        <p className="max-w-2xl mb-4 font-body text-sm text-foreground">
          Please book by <strong>{ctx.bookBy}</strong>. We will call you on <strong>{ctx.phone || 'the number in your application'}</strong>.
        </p>
      )}
      {available.length === 0 ? (
        <Card className="max-w-2xl"><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">No times are open at the moment. Please check back shortly: new times are added regularly.</p></CardContent></Card>
      ) : (
        <Card className="max-w-2xl">
          <CardContent className="pt-6">
            <div className="space-y-6">
              {byDay.map(([day, slots], di) => (
                <div key={day} className={di > 0 ? 'pt-6 border-t border-separator' : ''}>
                  <h3 className="font-serif text-lg text-accent mb-3">{format(parseISO(day), 'EEEE, d MMMM yyyy')}</h3>
                  <div className="space-y-3">
                    {slots.map((s) => (
                      <div key={s.id} className="flex items-center justify-between gap-3 border border-separator p-3">
                        <div>
                          <div className="flex items-center gap-2 font-body font-medium text-foreground">
                            <Clock className="h-4 w-4 text-accent" aria-hidden="true" /> {formatClockRange(s.start_time, s.end_time, s.slot_date)}
                          </div>
                          {s.caller_name && (
                            <div className="mt-1 flex items-center gap-1.5 text-xs font-body text-muted-foreground">
                              <User className="h-3.5 w-3.5" aria-hidden="true" /> {s.caller_name}
                            </div>
                          )}
                        </div>
                        <Button className="rounded-none shrink-0" disabled={busy} onClick={() => book(s.id)}>
                          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Book'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
