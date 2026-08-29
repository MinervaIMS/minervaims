import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { divisionLabels } from '@/lib/roles';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { useMyApplication } from '@/hooks/useMyApplication';
import { candidateStatus, isOfferLive } from '@/lib/applications-api';

// Four candidate-facing stages, mirroring "The Application Journey" on /join.
//
// EACH ONE NOW SAYS WHAT IT MEANS FOR THE CANDIDATE, in one sentence and one
// short note: what is happening, and whether anything is expected of them.
// The wording follows the recruiting workflow the workspace actually runs -
// review, invitation, interview, outcome - rather than describing a different
// process. It stays deliberately short: this page is a status, not a guide,
// and the FAQs section answers everything beyond it.
const STEPS = [
  {
    t: 'Application received',
    d: 'Your form, your CV and your written answer are with us.',
    n: 'Nothing is expected from you at this point.',
  },
  {
    t: 'Application under review',
    d: 'Reviewers from the divisions you chose are reading what you submitted.',
    n: 'They share notes internally before any decision is taken.',
  },
  {
    t: 'Interview stage',
    d: 'You have been invited to interview.',
    n: 'The Interview section appears in your menu. Book your slot there; it shows the division that invited you.',
  },
  {
    t: 'Outcome',
    d: 'The decision on your application.',
    n: 'If you are selected, an Offer section appears in your menu with the role, the division and the date to reply by.',
  },
];

export default function ApplicationStatus({ onOpenOffer }: { onOpenOffer?: () => void } = {}) {
  // ONE APPLICATION ROW FOR THE WHOLE APPLICANT WORKSPACE. The rail reads
  // it to decide whether Interview and Offer exist; this page reads it to
  // draw the journey; the Offer page reads it to draw the offer. They
  // share the hook, so there is one request and one truth.
  const { application: app, loading } = useMyApplication();
  const [litCount, setLitCount] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const cs = app ? candidateStatus(app.status) : null;
  const rejected = cs?.step === 5;
  // A live offer the candidate can act on. The decision itself lives in
  // the Offer section; this page only says that it is waiting.
  const offerLive = isOfferLive(app);
  // An internal "accepted" (no offer sent yet) must NOT be revealed (report 14).
  const internalAccepted = !!app && app.status === 'accepted' && !app.offer_sent_at;
  // Journey progress: hide an internal acceptance at the interview stage.
  const targetLit = cs ? (internalAccepted ? 3 : rejected ? 4 : Math.min(cs.step, 4)) : 0;

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

  const statusLabel = offerLive ? 'You have received an offer to join'
    : internalAccepted ? 'Application under review' : cs.label;
  // Is there anything to put beside the progression?
  const hasSideCard = offerLive || app.status === 'joined';

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
      <div className={`font-body ${hasSideCard ? 'grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start' : 'max-w-2xl'}`}>
        {hasSideCard && (
          <div className="order-1 space-y-4 lg:order-2 lg:sticky lg:top-4">
            {offerLive && (
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

            {app.status === 'joined' && (
              <Card className="border-emerald-200 bg-emerald-50">
                <CardContent className="py-5">
                  <p className="text-sm text-emerald-800">Welcome to Minerva IMS! Head to <strong>My Profile</strong> to add your photo and complete your member details.</p>
                  <p className="mt-2 text-xs text-emerald-700">Your account is being upgraded to your new role. If the workspace still shows the applicant view, please be patient; it can take a few minutes. Refresh or come back shortly and your full member workspace will appear.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <div className={`space-y-8 ${hasSideCard ? 'order-2 lg:order-1' : ''}`}>
          <div>
            <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Current status</div>
            <div className={`font-serif text-2xl ${rejected ? 'text-muted-foreground' : 'text-accent'}`}>{statusLabel}</div>
          </div>

          {/* Animated journey: only the reached steps light up. */}
          <div ref={rootRef} className="journey">
            {STEPS.map((s, i) => {
              const lit = i < litCount;
              const outcomeStep = i === 3;
              const label = outcomeStep && rejected ? 'Not selected' : s.t;
              return (
                <div key={s.t} className={`jstep${lit ? ' lit' : ''}`}>
                  <div className="jrail">
                    <div className="jdot">{i + 1}</div>
                    <div className="jline" aria-hidden><div className="fill" style={lit ? { height: 'calc(100% + var(--jstep-gap))' } : undefined} /></div>
                  </div>
                  <div>
                    <h3 className="jt-t">{label}</h3>
                    <div className="jt-d">{s.d}</div>
                    <div className="jt-n">{s.n}</div>
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
