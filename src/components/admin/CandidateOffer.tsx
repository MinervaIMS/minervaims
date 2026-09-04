import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
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
  const [signOpen, setSignOpen] = useState(false);
  const [signature, setSignature] = useState('');

  // WHAT COUNTS AS A SIGNATURE. Deliberately not compared against the name
  // on the application: this is a moment of deliberation, not an identity
  // check, and the applicant is already authenticated as themselves. All it
  // guards against is submitting an empty box by accident, so it asks for
  // two words, which is what "your full name" means.
  const canSign = signature.trim().split(/\s+/).filter(Boolean).length >= 2;

  const doAccept = async () => {
    setBusy(true);
    try {
      await acceptOffer(session);
      setSignOpen(false);
      setSignature('');
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
                  {/* =========================================================
                      ACCEPTING IS SIGNING, AND IT IS MEANT TO FEEL LIKE IT.
                      ---------------------------------------------------------
                      Joining the association is a commitment, and a
                      commitment entered by clicking a button reads as one
                      more confirmation dialog among the dozen a person
                      dismisses in a day. Writing your own name out is a
                      small, deliberate act: it takes a moment, it cannot be
                      done by accident, and it is the convention everybody
                      already understands for accepting terms.
                      ========================================================= */}
                  <Dialog open={signOpen} onOpenChange={(o) => { setSignOpen(o); if (!o) setSignature(''); }}>
                    <DialogTrigger asChild>
                      <Button disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Accept offer'}</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle className="font-serif text-xl">Accept your offer to join</DialogTitle>
                        <DialogDescription>
                          You will become a member of Minerva IMS with the role and division above, and will be asked
                          to complete your member profile. This cannot be undone, and it can take a few minutes for
                          your new role to appear.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-4 font-body">
                        {roleText && (
                          <div className="border border-accent/30 bg-accent/5 p-3 text-sm">
                            <div className="text-xs uppercase tracking-wider text-accent">You are accepting</div>
                            <div className="mt-1 text-foreground">{roleText}</div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label htmlFor="offer-signature">Sign by writing your full name</Label>
                          <Input
                            id="offer-signature"
                            value={signature}
                            onChange={(e) => setSignature(e.target.value)}
                            placeholder="Your full name"
                            autoComplete="off"
                            /* The serif at a larger size, because it is a
                               signature line and should not look like one
                               more form field. */
                            className="font-serif text-lg h-12"
                            onKeyDown={(e) => { if (e.key === 'Enter' && canSign && !busy) doAccept(); }}
                          />
                          <p className="text-xs text-muted-foreground">
                            Writing your name here records your acceptance of the offer above. It has the same
                            effect as signing it.
                          </p>
                        </div>

                        <div className="flex gap-3 pt-1">
                          <Button className="flex-1" disabled={!canSign || busy} onClick={doAccept}>
                            {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Accepting</> : 'Sign and join'}
                          </Button>
                          <Button variant="outline" disabled={busy} onClick={() => setSignOpen(false)}>Not yet</Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
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
