import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { ArrowRight, Loader2 } from 'lucide-react';
import { divisionLabels } from '@/lib/roles';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { useMyApplication } from '@/hooks/useMyApplication';
import {
  candidateStatus, isOfferLive, evaluationDivision, isReEvaluated,
  canWithdraw, isWithdrawn, withdrawApplication, applyDivisionLabel
} from '@/lib/applications-api';

// The four candidate-facing stages, in the association's own words.
//
// ONE SENTENCE EACH. The previous version carried a description AND a
// note per step, which made a status page read like a guide: eight
// paragraphs to say where a candidacy has got to. What an applicant
// wants here is the stage and what it means, and everything beyond that
// is answered in FAQs, which is the page written for it.
const STEPS = [
  {
    t: 'Application received',
    d: "We've got your CV and written answer. Thanks for applying!",
  },
  {
    t: 'Under review',
    d: 'Our Talent Recruiting Team reads through your profile.',
  },
  {
    t: 'Interview',
    d: 'Invited candidates book their time slot. The invite shows which division has invited you, which might not be one of your original choices.',
  },
  {
    t: 'Outcome',
    d: "The final decision. If it's good news, you'll have 48 hours to sign and accept.",
  },
];

export default function ApplicationStatus({ onOpenOffer }: { onOpenOffer?: () => void } = {}) {
  // ONE APPLICATION ROW FOR THE WHOLE APPLICANT WORKSPACE. The rail reads
  // it to decide whether Interview and Offer exist; this page reads it to
  // draw the journey; the Offer page reads it to draw the offer. They
  // share the hook, so there is one request and one truth.
  const { application: app, loading, refresh } = useMyApplication();
  const { session } = useAuth();
  const { toast } = useToast();
  const [litCount, setLitCount] = useState(0);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [signature, setSignature] = useState('');
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const cs = app ? candidateStatus(app.status) : null;
  const rejected = cs?.step === 5;
  // The candidate's own decision to stop. Read from the row rather than
  // from the step, because it is not an outcome and does not read as one.
  const withdrawn = isWithdrawn(app);
  const mayWithdraw = canWithdraw(app);
  // A live offer the candidate can act on. The decision itself lives in
  // the Offer section; this page only says that it is waiting.
  const offerLive = isOfferLive(app);
  // Is a division that the candidate never named now assessing them?
  const reEvaluated = !!app && isReEvaluated(app);
  // An internal "accepted" (no offer sent yet) must NOT be revealed (report 14).
  const internalAccepted = !!app && app.status === 'accepted' && !app.offer_sent_at;
  // Journey progress: hide an internal acceptance at the interview stage.
  // A withdrawn candidacy lights the whole journey, exactly as a rejected
  // one does: the process has finished, and the last step says how.
  const targetLit = cs
    ? (internalAccepted ? 3 : rejected || withdrawn ? 4 : Math.min(cs.step, 4))
    : 0;

  useEffect(() => {
    if (!targetLit) return;
    const prefersReduced = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) { setLitCount(targetLit); return; }
    setLitCount(0);
    const timers: number[] = [];
    for (let i = 1; i <= targetLit; i++) timers.push(window.setTimeout(() => setLitCount(i), 250 + (i - 1) * 400));
    return () => timers.forEach(clearTimeout);
  }, [targetLit]);

  // WHAT COUNTS AS A SIGNATURE, decided exactly as it is for accepting an
  // offer: two words, and nothing compared against the name on file. This
  // is a moment of deliberation, not an identity check; the applicant is
  // already authenticated as themselves. All it guards against is an empty
  // box submitted by accident.
  const canSign = signature.trim().split(/\s+/).filter(Boolean).length >= 2;

  const doWithdraw = async () => {
    setBusy(true);
    try {
      await withdrawApplication(session);
      setWithdrawOpen(false);
      setSignature('');
      toast({
        title: 'Application withdrawn',
        description: 'Your candidacy is closed and a confirmation is on its way to your email address.',
      });
      await refresh();
    } catch (e) {
      toast({
        title: 'Could not withdraw your application',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      });
    } finally { setBusy(false); }
  };

  if (loading) {
    return <div><WorkspacePageHeader title="Application status" description="The current status of your application." /><WorkspaceLoader /></div>;
  }
  if (!app || !cs) {
    return (
      <div>
        <WorkspacePageHeader title="Application status" description="The current status of your application." />
        <Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">We couldn’t find an application linked to your account.</p></CardContent></Card>
      </div>
    );
  }

  const statusLabel = withdrawn ? 'Application withdrawn'
    : offerLive ? 'You have received an offer to join'
    : internalAccepted ? 'Application under review' : cs.label;

  const withdrawnOn = app.withdrawn_at
    ? new Date(app.withdrawn_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  // =================================================================
  // THE STATUS IS THE ANSWER, SO IT IS THE THING THAT LOOKS LIKE ONE.
  // -----------------------------------------------------------------
  // It used to be two lines of plain type at the top of the left
  // column: a small grey label and a serif line, immediately above a
  // four-step progression that occupies the rest of the page. An
  // applicant opens this page to read one fact, and that fact was the
  // least emphatic thing on it.
  //
  // It is now a filled card in the top right corner, in the
  // association's own accent purple with everything on it in white,
  // which is the treatment the workspace already reserves for the one
  // thing on a page worth reading first. The offer, when there is one,
  // sits directly under it, so the corner holds the news and the left
  // column holds the process.
  //
  // The grid is now unconditional. It used to collapse to one column
  // when there was no offer, which is what put the status inline in the
  // first place; with the status itself living in the right column
  // there is always something there.
  // =================================================================
  const sideExtras = offerLive || app.status === 'joined';

  return (
    <div>
      <WorkspacePageHeader title="Application status" description={`Your application for ${app.semester_label}.`} />

      {/* TWO HALVES ON A WIDE SCREEN, ONE COLUMN ON A NARROW ONE.
          The progression is the page; the offer, when there is one, is the
          news, so it sits beside it rather than on top of it. On a phone the
          two stack with THE OFFER FIRST, because a candidate opening this
          page with an offer waiting should meet it without scrolling, and a
          phone has no "beside".
          With no offer the grid collapses to a single column, so nothing is
          left holding an empty half.

          THE OFFER ITSELF IS NO LONGER HERE. Accepting or declining a place
          in the association is the single most consequential thing an
          applicant does on this site, and it used to be decided from a card
          in the margin of a page about something else. It now has its own
          section, which appears in the rail the moment an offer is sent.
          What stands here is the ANNOUNCEMENT of it, and the way in: the
          news belongs on the status page, the decision does not. */}
      <div className="font-body grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start">
          <div className="order-1 space-y-4 lg:order-2 lg:sticky lg:top-4">
            {/* CURRENT STATUS. The one fact this page exists to give. */}
            <div className="rounded-xl bg-accent px-6 py-6 text-accent-foreground shadow-elevated">
              <div className="text-xs uppercase tracking-[0.14em] text-accent-foreground/75">Current status</div>
              <div className="mt-1.5 font-serif text-2xl leading-tight text-accent-foreground">{statusLabel}</div>
              <div className="mt-3 border-t border-accent-foreground/20 pt-3 text-xs text-accent-foreground/80">
                {app.semester_label} intake
                {reEvaluated && !rejected && !withdrawn && (
                  <> · being considered by {applyDivisionLabel(evaluationDivision(app))}</>
                )}
                {withdrawn && withdrawnOn && <> · withdrawn on {withdrawnOn}</>}
              </div>
            </div>

            {offerLive && !withdrawn && (
              <Card className="border-accent/40 bg-accent/5">
                <CardContent className="py-6">
                  <div className="text-xs uppercase tracking-wider text-accent font-semibold">Your offer</div>
                  <h2 className="mt-1 font-serif text-xl text-accent">
                    An offer to join Minerva
                  </h2>
                  <p className="mt-3 text-sm text-foreground">
                    You have been offered a place{app.offer_division ? ` in ${divisionLabels[app.offer_division]}` : ''}.
                  </p>
                  {app.offer_deadline && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Please respond by <strong>{new Date(app.offer_deadline).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.
                    </p>
                  )}
                  <div className="mt-5">
                    <Button onClick={onOpenOffer} disabled={!onOpenOffer}>
                      Open your offer<ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    The <strong>Offer</strong> section holds the role, the division and the deadline, and is where you accept or decline.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* =============================================================
                WITHDRAWING: THE ONE THING ON THIS PAGE THE CANDIDATE DECIDES.
                -------------------------------------------------------------
                Everything else here reports what the association has done.
                This is the applicant's own decision, so it belongs on the
                page that is about their candidacy rather than buried in a
                help article or left to an email nobody answers.

                IT IS QUIET ON PURPOSE. It sits at the foot of the column,
                outlined rather than filled, below the status and below the
                offer when there is one. A candidate who wants it will find
                it; a candidate reading their status will not meet a
                prominent button inviting them to give up.
                ============================================================= */}
            {mayWithdraw && (
              <Card className="border-separator">
                <CardContent className="py-5">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Withdrawing</div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    If you no longer wish to be considered, you can withdraw your application at any point.
                    We will confirm it by email and stop writing to you about this round.
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Only one application per person is accepted in each round, so a withdrawn application
                    cannot be replaced with a new one for {app.semester_label}. You are welcome to apply again
                    in a future round.
                  </p>
                  <div className="mt-4">
                    <Dialog open={withdrawOpen} onOpenChange={(o) => { setWithdrawOpen(o); if (!o) setSignature(''); }}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" disabled={busy}>Withdraw my application</Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle className="font-serif text-xl">Withdraw your application</DialogTitle>
                          <DialogDescription>
                            Your candidacy for {app.semester_label} will be closed, any interview slot you are
                            holding will be released, and you will hear nothing further about this round. This
                            cannot be undone, and you cannot apply again in this recruitment cycle.
                          </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 font-body">
                          <div className="border border-separator bg-muted/40 p-3 text-sm">
                            <div className="text-xs uppercase tracking-wider text-muted-foreground">You are withdrawing</div>
                            <div className="mt-1 text-foreground">
                              Your application to {applyDivisionLabel(evaluationDivision(app))}, {app.semester_label}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="withdraw-signature">Sign by writing your full name</Label>
                            <Input
                              id="withdraw-signature"
                              value={signature}
                              onChange={(e) => setSignature(e.target.value)}
                              placeholder="Your full name"
                              autoComplete="off"
                              /* The serif at a larger size, because it is a
                                 signature line and should not look like one
                                 more form field. The same treatment as the
                                 offer, because it is the same act. */
                              className="font-serif text-lg h-12"
                              onKeyDown={(e) => { if (e.key === 'Enter' && canSign && !busy) doWithdraw(); }}
                            />
                            <p className="text-xs text-muted-foreground">
                              Writing your name here records your decision to withdraw. It has the same effect
                              as signing it.
                            </p>
                          </div>

                          <div className="flex gap-3 pt-1">
                            <Button variant="destructive" className="flex-1" disabled={!canSign || busy} onClick={doWithdraw}>
                              {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Withdrawing</> : 'Sign and withdraw'}
                            </Button>
                            <Button variant="outline" disabled={busy} onClick={() => setWithdrawOpen(false)}>Keep my application</Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* THE RECORD OF IT. An applicant who withdraws and then wonders
                whether it went through should be able to look and see that
                it did, with the date. */}
            {withdrawn && (
              <Card className="border-separator bg-muted/40">
                <CardContent className="py-5">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Withdrawn</div>
                  <p className="mt-2 text-sm text-foreground">
                    You withdrew your application{withdrawnOn ? ` on ${withdrawnOn}` : ''}. Your candidacy for{' '}
                    {app.semester_label} is closed and we will not write to you about it again.
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Only one application per person is accepted in each round, so a new application cannot be
                    submitted for this intake. If you did not mean to withdraw, write to the association as soon
                    as possible: it cannot be reversed from this page.
                  </p>
                </CardContent>
              </Card>
            )}

            {app.status === 'joined' && (
              <Card className="border-emerald-200 bg-emerald-50">
                <CardContent className="py-5">
                  <p className="text-sm text-emerald-800">Welcome to Minerva IMS! Head to <strong>My Profile</strong> to add your photo and complete your member details.</p>
                  <p className="mt-2 text-xs text-emerald-700">Your account is being upgraded to your new role. If the workspace still shows the applicant view, please be patient; it can take a few minutes. Refresh or come back shortly and your full member workspace will appear.</p>
                </CardContent>
              </Card>
            )}
          </div>

        <div className="space-y-8 order-2 lg:order-1">
          {/* BEING LOOKED AT BY A DIVISION THEY DID NOT NAME.
              A candidate whose evaluation moves goes back a step, and a
              progress bar that quietly retreats with no explanation is
              alarming. This says what happened and why, in the one place
              they will look for it. It appears only while the outcome is
              still open: after an offer or a rejection the news is the
              outcome, not the route to it. */}
          {reEvaluated && !rejected && !withdrawn && !offerLive && app.status !== 'joined' && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="text-sm text-amber-900">
                You are currently being re-evaluated for another division:{' '}
                <strong>{applyDivisionLabel(evaluationDivision(app))}</strong>.
              </div>
              <p className="mt-1.5 text-xs text-amber-800">
                After reading your application, our reviewers believe this division suits you better than the
                ones you named. Your candidacy has returned to the review stage so that {applyDivisionLabel(evaluationDivision(app))}{' '}
                can consider it from the start, and any interview you had booked has been released. Everything
                you hear from us next will be about this division.
              </p>
            </div>
          )}

          {/* Animated journey: only the reached steps light up. */}
          <div ref={rootRef} className="journey">
            {STEPS.map((s, i) => {
              const lit = i < litCount;
              const outcomeStep = i === 3;
              const label = outcomeStep && withdrawn ? 'Withdrawn'
                : outcomeStep && rejected ? 'Not selected' : s.t;
              return (
                <div key={s.t} className={`jstep${lit ? ' lit' : ''}`}>
                  <div className="jrail">
                    <div className="jdot">{i + 1}</div>
                    <div className="jline" aria-hidden><div className="fill" style={lit ? { height: 'calc(100% + var(--jstep-gap))' } : undefined} /></div>
                  </div>
                  <div>
                    <h3 className="jt-t">{label}</h3>
                    {/* "The divisions you chose" stops being true once a
                        different division has taken the candidacy on, and a
                        step that contradicts the notice above it is worse
                        than one that says nothing. */}
                    <div className="jt-d">
                      {outcomeStep && withdrawn
                        ? `You withdrew your application${withdrawnOn ? ` on ${withdrawnOn}` : ''}, so no decision was taken.`
                        : i === 1 && reEvaluated && !withdrawn
                        ? `Our Talent Recruiting Team is reading your profile for ${applyDivisionLabel(evaluationDivision(app))}.`
                        : s.d}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground">
            What you submitted - your details, your division preferences and your documents - is in <strong>My Profile</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
