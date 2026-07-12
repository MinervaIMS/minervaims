import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { FileText, PartyPopper, Loader2, Eye, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { divisionLabels } from '@/lib/roles';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { getMyApplication, candidateStatus, acceptOffer, declineOffer, signMyDocument, ACADEMIC_YEAR_LABELS, type ApplicationRow } from '@/lib/applications-api';
import type { Session } from '@supabase/supabase-js';

// Four candidate-facing stages, mirroring "The Application Journey" on /join.
const STEPS = [
  { t: 'Application received', d: 'We have received your application and documents.' },
  { t: 'Application under review', d: 'Our reviewers are evaluating your CV and written answer.' },
  { t: 'Interview stage', d: 'You have been invited to interview. Book your slot in the Interview Calendar.' },
  { t: 'Outcome', d: 'The final outcome of your application.' },
];

export default function ApplicationStatus() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [app, setApp] = useState<ApplicationRow | null>(null);
  const [litCount, setLitCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try { const a = await getMyApplication(); setApp(a); }
    catch (e) { toast({ title: 'Could not load your application', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cs = app ? candidateStatus(app.status) : null;
  const rejected = cs?.step === 5;
  // A live offer the candidate can act on.
  const offerLive = !!app && app.status === 'accepted' && !!app.offer_sent_at
    && (!app.offer_deadline || new Date(app.offer_deadline) > new Date());
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

  const doAccept = async () => {
    setBusy(true);
    try { await acceptOffer(session); toast({ title: 'Offer accepted', description: 'Welcome to Minerva! Your account is being upgraded — if your new role isn’t visible yet, please wait a few minutes and come back.' }); await load(); }
    catch (e) { toast({ title: 'Could not accept the offer', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setBusy(false); }
  };
  const doDecline = async () => {
    setBusy(true);
    try { await declineOffer(session); toast({ title: 'Offer declined' }); await load(); }
    catch (e) { toast({ title: 'Could not decline the offer', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setBusy(false); }
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

  const statusLabel = offerLive ? 'You have received an offer to join'
    : internalAccepted ? 'Application under review' : cs.label;

  return (
    <div>
      <WorkspacePageHeader title="Application status" description={`Your application for ${app.semester_label}.`} />

      <div className="max-w-2xl space-y-8 font-body">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Current status</div>
          <div className={`text-2xl font-serif ${rejected ? 'text-muted-foreground' : 'text-accent'}`}>{statusLabel}</div>
        </div>

        {/* Live offer to join */}
        {offerLive && (
          <Card className="border-accent/40 bg-accent/5">
            <CardContent className="py-6">
              <div className="flex items-center gap-2 text-accent mb-2">
                <PartyPopper className="h-5 w-5" />
                <span className="font-serif text-lg">Congratulations, you have an offer to join!</span>
              </div>
              <p className="text-sm text-foreground mb-1">
                You have been offered a place{app.offer_division ? ` in ${divisionLabels[app.offer_division]}` : ''}.
              </p>
              {app.offer_deadline && (
                <p className="text-sm text-muted-foreground mb-4">
                  Please respond by <strong>{new Date(app.offer_deadline).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</strong>. Accepting turns your account into a member and unlocks your full profile.
                </p>
              )}
              <div className="flex gap-3">
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
            </CardContent>
          </Card>
        )}

        {app.status === 'joined' && (
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="py-5">
              <p className="text-sm text-emerald-800">Welcome to Minerva IMS! Head to <strong>My Profile</strong> to add your photo and complete your member details.</p>
              <p className="text-xs text-emerald-700 mt-2">Your account is being upgraded to your new role. If the workspace still shows the applicant view, please be patient; it can take a few minutes. Refresh or come back shortly and your full member workspace will appear.</p>
            </CardContent>
          </Card>
        )}

        {/* Animated journey — only the reached steps light up. */}
        <div ref={rootRef} className="journey">
          {STEPS.map((s, i) => {
            const lit = i < litCount;
            const outcomeStep = i === 3;
            const label = outcomeStep && rejected ? 'Not selected' : s.t;
            return (
              <div key={s.t} className={`jstep${lit ? ' lit' : ''}`}>
                <div className="jrail">
                  <div className="jdot">{i + 1}</div>
                  <div className="jline" aria-hidden><div className="fill" style={lit ? { height: 'calc(100% + 2.5rem)' } : undefined} /></div>
                </div>
                <div>
                  <h3 className="jt-t">{label}</h3>
                  <div className="jt-d">{s.d}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Submitted documents — preview / download only (read-only). */}
        <div className="pt-2 border-t border-separator">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Your submitted documents</div>
          <div className="space-y-2">
            <DocRow label="Curriculum Vitae (CV)" kind="cv" present={!!app.cv_path} session={session} />
            <DocRow label="Written answer" kind="answer" present={!!app.answer_path} session={session} />
          </div>
          <p className="text-xs text-muted-foreground mt-2">You can preview and download what you submitted, but these documents cannot be changed or replaced.</p>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-separator">
          <Field label="Programme" value={app.degree_course || '-'} />
          <Field label="Academic year" value={ACADEMIC_YEAR_LABELS[app.academic_year]} />
          <Field label="First choice" value={divisionLabels[app.first_choice]} />
          <Field label="Second choice" value={app.second_choice ? divisionLabels[app.second_choice] : '-'} />
          <Field label="Submitted" value={new Date(app.created_at).toLocaleString()} />
        </div>

        <p className="text-xs text-muted-foreground">
          Your submitted application and documents cannot be edited. If you need a correction, contact the association.
        </p>
      </div>
    </div>
  );
}

function DocRow({ label, kind, present, session }: { label: string; kind: 'cv' | 'answer'; present: boolean; session: Session | null }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState<'preview' | 'download' | null>(null);

  const open = async (mode: 'preview' | 'download') => {
    setBusy(mode);
    try {
      const url = await signMyDocument(session, kind, mode);
      if (mode === 'download') {
        const a = document.createElement('a');
        a.href = url; a.rel = 'noopener';
        document.body.appendChild(a); a.click(); a.remove();
      } else {
        window.open(url, '_blank', 'noopener');
      }
    } catch (e) {
      toast({ title: 'Could not open the document', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setBusy(null); }
  };

  return (
    <div className="flex items-center justify-between border border-separator px-3 py-2 text-sm gap-3">
      <span className="flex items-center gap-2 text-foreground min-w-0"><FileText className="h-4 w-4 text-accent shrink-0" /><span className="truncate">{label}</span></span>
      {present ? (
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => open('preview')}>
            {busy === 'preview' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Eye className="h-3.5 w-3.5 mr-1" />Preview</>}
          </Button>
          <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => open('download')}>
            {busy === 'download' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Download className="h-3.5 w-3.5 mr-1" />Download</>}
          </Button>
        </div>
      ) : (
        <span className="text-xs px-2 py-0.5 border bg-muted text-muted-foreground border-separator shrink-0">Not provided</span>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className="text-foreground">{value}</div>
    </div>
  );
}
