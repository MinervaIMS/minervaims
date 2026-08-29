import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { CalendarClock, CheckCircle2, Loader2, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { divisionLabels, roleLabel as composeRoleLabel, type AppRole } from '@/lib/roles';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { useMyApplication } from '@/hooks/useMyApplication';
import { acceptOffer, declineOffer, isOfferLive } from '@/lib/applications-api';

// =====================================================================
// CandidateOffer — the applicant's offer, on a page of its own.
// ---------------------------------------------------------------------
// The offer used to be a card beside the status progression, which put
// the single most consequential decision an applicant makes on this site
// - accept or decline a place in the association - in the margin of a
// page about something else. It now has its own section, and that
// section only exists once an offer has actually been sent, so its
// presence in the rail IS the news.
//
// WHAT IT SHOWS DEPENDS ON WHERE THE OFFER IS:
//
//   live      - the offer, its terms and its deadline, with Accept and
//               Decline. The only state with actions.
//   accepted  - what they accepted and what happens next.
//   declined  - the record of the decision, so it is never ambiguous
//               whether it went through.
//   expired   - the offer lapsed; who to speak to.
//
// Every one of those is a fact about their own application, so none of
// them is hidden. An applicant who declines and then wonders whether
// they really did should be able to look.
// =====================================================================

export default function CandidateOffer() {
  const { session } = useAuth();
  const { toast } = useToast();
  const { application: app, loading, refresh } = useMyApplication();
  const [busy, setBusy] = useState(false);

  const doAccept = async () => {
    setBusy(true);
    try {
      await acceptOffer(session);
      toast({ title: 'Offer accepted', description: 'Welcome to Minerva. Your account is being upgraded: if your new role is not visible yet, please wait a few minutes and come back.' });
      await refresh();
    } catch (e) {
      toast({ title: 'Could not accept the offer', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const doDecline = async () => {
    setBusy(true);
    try {
      await declineOffer(session);
      toast({ title: 'Offer declined' });
      await refresh();
    } catch (e) {
      toast({ title: 'Could not decline the offer', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  if (loading) {
    return <div><WorkspacePageHeader title="Offer" description="Your offer to join Minerva IMS." /><WorkspaceLoader /></div>;
  }

  // Reached directly, before there is anything to show. Not a refusal: the
  // page exists, it simply has no offer on it yet.
  if (!app || !app.offer_sent_at) {
    return (
      <div>
        <WorkspacePageHeader title="Offer" description="Your offer to join Minerva IMS." />
        <Card className="max-w-2xl">
          <CardContent className="py-12 text-center">
            <Mail className="h-10 w-10 mx-auto mb-4 text-muted-foreground/60" />
            <p className="font-body text-muted-foreground">
              No offer has been sent to you yet. If you are selected, your offer appears here with the role, the division and the date to reply by, and you will receive an email at the same time.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const live = isOfferLive(app);
  const joined = app.status === 'joined' || app.status === 'offer_accepted';
  const declined = app.status === 'offer_declined';
  // Sent, unanswered, and past its deadline.
  const expired = !live && !joined && !declined;

  const roleText = app.offer_role
    ? composeRoleLabel(app.offer_role as AppRole, app.offer_division ?? null)
    : null;
  const deadlineText = app.offer_deadline
    ? new Date(app.offer_deadline).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <div>
      <WorkspacePageHeader title="Offer" description="Your offer to join Minerva IMS." />

      <div className="font-body max-w-2xl space-y-5">
        <Card className={live ? 'border-accent/40 bg-accent/5' : joined ? 'border-emerald-200 bg-emerald-50' : ''}>
          <CardContent className="py-6">
            <div className="text-xs uppercase tracking-wider text-accent font-semibold">
              {live ? 'Your offer' : joined ? 'Offer accepted' : declined ? 'Offer declined' : 'Offer expired'}
            </div>
            <h2 className="mt-1 font-serif text-2xl text-accent">An offer to join Minerva</h2>

            {/* THE TERMS, AS A LIST OF FACTS. An offer is a set of terms
                and it is read as one: what is being offered, in which
                division, and by when it must be answered. Prose would
                bury the division inside a sentence. */}
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex gap-3">
                <dt className="w-28 shrink-0 text-muted-foreground">Role</dt>
                <dd className="text-foreground">{roleText ?? 'To be confirmed'}</dd>
              </div>
              {app.offer_division && (
                <div className="flex gap-3">
                  <dt className="w-28 shrink-0 text-muted-foreground">Division</dt>
                  <dd className="text-foreground">{divisionLabels[app.offer_division]}</dd>
                </div>
              )}
              {deadlineText && (
                <div className="flex gap-3">
                  <dt className="w-28 shrink-0 text-muted-foreground">Reply by</dt>
                  <dd className={live ? 'text-foreground' : 'text-muted-foreground'}>{deadlineText}</dd>
                </div>
              )}
              {app.offer_fee_due === false && (
                <div className="flex gap-3">
                  <dt className="w-28 shrink-0 text-muted-foreground">Membership fee</dt>
                  <dd className="text-foreground">Not due for this semester.</dd>
                </div>
              )}
            </dl>

            {live && (
              <>
                <p className="mt-5 text-sm text-muted-foreground">
                  Accepting turns your account into a member account, unlocks your full profile and gives you the member workspace. It cannot be undone, and it can take a few minutes for your new role to appear.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Accept offer'}</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Accept your offer to join?</AlertDialogTitle>
                        <AlertDialogDescription>You will become a member of Minerva IMS with the offered role and will be asked to complete your member profile. This cannot be undone. It can take a few minutes for your account to be upgraded and your new role to appear. If it has not updated straight away, please be patient and come back shortly.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Not yet</AlertDialogCancel>
                        <AlertDialogAction onClick={doAccept}>Accept and join</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" disabled={busy}>Decline</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Decline the offer?</AlertDialogTitle>
                        <AlertDialogDescription>You are declining your offer to join Minerva IMS. This cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep it</AlertDialogCancel>
                        <AlertDialogAction onClick={doDecline}>Decline offer</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </>
            )}

            {joined && (
              <div className="mt-5 flex items-start gap-2 text-sm text-emerald-800">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <p>You accepted this offer. Welcome to Minerva IMS.</p>
                  <p className="mt-2 text-xs text-emerald-700">Your account is being upgraded to your new role. If the workspace still shows the applicant view, please be patient; it can take a few minutes. Refresh or come back shortly and your full member workspace will appear, starting with My Profile.</p>
                </div>
              </div>
            )}

            {declined && (
              <p className="mt-5 text-sm text-muted-foreground">
                You declined this offer. If that was not what you intended, write to the association as soon as possible: a declined offer cannot be reopened from this page.
              </p>
            )}

            {expired && (
              <div className="mt-5 flex items-start gap-2 text-sm text-muted-foreground">
                <CalendarClock className="h-4 w-4 mt-0.5 shrink-0" />
                <p>
                  This offer was not answered before its deadline and has lapsed. If you still wish to join, write to the association: an offer can be sent again, though we cannot guarantee a place remains.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          The full history of your application is in <strong>Status</strong>. What you submitted is in <strong>My Profile</strong>.
        </p>
      </div>
    </div>
  );
}
