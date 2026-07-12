import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Clock, Video, User, CheckCircle2, CalendarClock, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { divisionLabels } from '@/lib/roles';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import {
  getInterviewContext, listAvailableSlots, bookSlot, cancelBooking,
  type CandidateContext, type AvailableSlot,
} from '@/lib/interviews-api';

const hhmm = (t: string) => t.slice(0, 5);

// Cancellation / rescheduling rules, kept consistent with the invitation email.
const INTERVIEW_RULES = [
  'You may cancel your slot up to 90 minutes before it begins, from this page.',
  'After cancelling you can pick another available slot, but we cannot always guarantee that a cancelled interview can be rescheduled if none remain.',
  'Please book within 72 hours (3 days) of receiving your invitation email.',
  'A short delay of 5–10 minutes may occur if a previous interview overruns — thank you for your patience.',
];

export default function InterviewCalendarCandidate() {
  const { session } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [ctx, setCtx] = useState<CandidateContext | null>(null);
  const [available, setAvailable] = useState<AvailableSlot[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const c = await getInterviewContext(session);
      setCtx(c);
      if (c.invited && !c.booking) setAvailable(await listAvailableSlots(session));
      else setAvailable([]);
    } catch (e) {
      toast({ title: 'Could not load your interview', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Available slots grouped by day and sorted, so the applicant sees everything
  // at once with a divider between days.
  const slotsByDay = useMemo(() => {
    const map = new Map<string, AvailableSlot[]>();
    for (const s of available) {
      if (!map.has(s.slot_date)) map.set(s.slot_date, []);
      map.get(s.slot_date)!.push(s);
    }
    for (const list of map.values()) list.sort((a, b) => a.start_time.localeCompare(b.start_time));
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [available]);

  const book = async (slotId: string) => {
    setBusy(true);
    try { await bookSlot(session, slotId); toast({ title: 'Interview booked', description: 'Your slot is confirmed.' }); await load(); }
    catch (e) { toast({ title: 'Could not book this slot', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  const cancel = async () => {
    setBusy(true);
    try { await cancelBooking(session); toast({ title: 'Booking cancelled', description: 'You can choose another slot.' }); await load(); }
    catch (e) { toast({ title: 'Could not cancel', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  if (loading) {
    return <div><WorkspacePageHeader title="Interview Calendar" description="Book your interview slot." /><WorkspaceLoader /></div>;
  }

  // Not invited yet.
  if (!ctx?.invited || !ctx.division) {
    return (
      <div>
        <WorkspacePageHeader title="Interview Calendar" description="Book your interview slot." />
        <Card>
          <CardContent className="py-12 text-center max-w-xl mx-auto">
            <CalendarClock className="h-10 w-10 mx-auto mb-4 text-muted-foreground/60" />
            <p className="font-body text-muted-foreground">
              You haven’t been invited to an interview yet. When a division invites you, your interview slots will appear here for you to book.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const divisionName = divisionLabels[ctx.division];

  // Already booked — show the confirmation.
  if (ctx.booking?.slot) {
    const s = ctx.booking.slot;
    return (
      <div>
        <WorkspacePageHeader title="Interview Calendar" description={`Your ${divisionName} interview.`} />
        <Card className="max-w-2xl">
          <CardContent className="pt-6 font-body">
            <div className="flex items-center gap-2 text-accent mb-4">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-serif text-lg">Your interview is confirmed</span>
            </div>
            <div className="space-y-2 text-foreground">
              <div className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-accent" /> {format(parseISO(s.slot_date), 'EEEE, d MMMM yyyy')}</div>
              <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-accent" /> {hhmm(s.start_time)} – {hhmm(s.end_time)}</div>
              <div className="flex items-center gap-2"><User className="h-4 w-4 text-accent" /> {divisionName}{s.examiner_name ? ` · ${s.examiner_name}` : ''}</div>
              {s.meeting_link ? (
                <a href={s.meeting_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-accent hover:underline break-all">
                  <Video className="h-4 w-4 shrink-0" /> Join the meeting
                </a>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground"><Video className="h-4 w-4" /> A member of the association will share the meeting link before the interview.</div>
              )}
            </div>
            {/* Cancellation & rescheduling rules — mirrors the invitation email. */}
            <div className="mt-6 pt-4 border-t border-separator">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Cancellation &amp; rescheduling</div>
              <ul className="space-y-1.5 text-sm text-foreground">
                {INTERVIEW_RULES.map((r, i) => (
                  <li key={i} className="pl-4 relative leading-relaxed before:content-['•'] before:absolute before:left-0 before:text-accent">{r}</li>
                ))}
              </ul>
            </div>

            <div className="mt-6 pt-4 border-t border-separator">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="rounded-none" disabled={busy}>Cancel / choose another slot</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
                    <AlertDialogDescription>You may cancel up to <strong>90 minutes</strong> before your slot begins. Your current slot will be released and you can pick another available time, though we cannot always guarantee a cancelled interview can be rescheduled if none remain.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-none">Keep it</AlertDialogCancel>
                    <AlertDialogAction className="rounded-none" onClick={cancel}>Cancel booking</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invited, not yet booked — pick a slot.
  return (
    <div>
      <WorkspacePageHeader
        title="Interview Calendar"
        description={`You have been invited to interview with ${divisionName}. Choose an available slot below; your booking confirms your interview.`}
      />
      {available.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">No interview slots are open yet. Please check back shortly. {divisionName} will publish availability soon.</p></CardContent></Card>
      ) : (
        <Card className="max-w-2xl">
          <CardContent className="pt-6">
            {/* All available slots listed straight away, grouped by day with a
                divider between days (like the examiner view). */}
            <div className="space-y-6">
              {slotsByDay.map(([day, slots], di) => (
                <div key={day} className={di > 0 ? 'pt-6 border-t border-separator' : ''}>
                  <h3 className="font-serif text-lg text-accent mb-3">{format(parseISO(day), 'EEEE, d MMMM yyyy')}</h3>
                  <div className="space-y-3">
                    {slots.map((s) => (
                      <div key={s.id} className="flex items-center justify-between gap-3 border border-separator p-3">
                        <div>
                          <div className="flex items-center gap-2 font-body font-medium text-foreground">
                            <Clock className="h-4 w-4 text-accent" /> {hhmm(s.start_time)} – {hhmm(s.end_time)}
                          </div>
                          {s.examiner_name && (
                            <div className="mt-1 flex items-center gap-1.5 text-xs font-body text-muted-foreground">
                              <User className="h-3.5 w-3.5" /> {s.examiner_name}
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
