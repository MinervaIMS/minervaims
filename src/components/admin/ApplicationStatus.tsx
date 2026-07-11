import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { divisionLabels } from '@/lib/roles';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { getMyApplication, candidateStatus, ACADEMIC_YEAR_LABELS, type ApplicationRow } from '@/lib/applications-api';

// Four candidate-facing stages, mirroring "The Application Journey" on /join.
const STEPS = [
  { t: 'Application received', d: 'We have received your application and documents.' },
  { t: 'Application under review', d: 'Our reviewers are evaluating your CV and written answer.' },
  { t: 'Interview stage', d: 'You have been invited to interview. Book your slot in the Interview Calendar.' },
  { t: 'Outcome', d: 'The final outcome of your application.' },
];

export default function ApplicationStatus() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [app, setApp] = useState<ApplicationRow | null>(null);
  // How many steps are lit right now (animated up to the real progress).
  const [litCount, setLitCount] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try { const a = await getMyApplication(); if (active) setApp(a); }
      catch (e) { toast({ title: 'Could not load your application', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [toast]);

  const cs = app ? candidateStatus(app.status) : null;
  const rejected = cs?.step === 5;
  // Steps that should end up lit: rejected reaches the outcome (negative);
  // otherwise light up to the candidate's current step (capped at 4).
  const targetLit = cs ? (rejected ? 4 : Math.min(cs.step, 4)) : 0;

  // Sequentially light the reached steps (same feel as the /join journey).
  useEffect(() => {
    if (!targetLit) return;
    const prefersReduced = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) { setLitCount(targetLit); return; }
    setLitCount(0);
    const timers: number[] = [];
    for (let i = 1; i <= targetLit; i++) {
      timers.push(window.setTimeout(() => setLitCount(i), 250 + (i - 1) * 400));
    }
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

  return (
    <div>
      <WorkspacePageHeader title="Application status" description={`Your application for ${app.semester_label}.`} />

      <div className="max-w-2xl space-y-8 font-body">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Current status</div>
          <div className={`text-2xl font-serif ${rejected ? 'text-muted-foreground' : 'text-accent'}`}>{cs.label}</div>
        </div>

        {/* Animated journey — same dot-and-line style as /join, but only the
            steps the candidate has actually reached light up. */}
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

        {/* Submitted documents */}
        <div className="pt-2 border-t border-separator">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Your submitted documents</div>
          <div className="space-y-2">
            <DocRow label="Curriculum Vitae (CV)" present={!!app.cv_path} />
            <DocRow label="Written answer" present={!!app.answer_path} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-separator">
          <Field label="First choice" value={divisionLabels[app.first_choice]} />
          <Field label="Second choice" value={app.second_choice ? divisionLabels[app.second_choice] : '-'} />
          <Field label="Academic year" value={ACADEMIC_YEAR_LABELS[app.academic_year]} />
          <Field label="Submitted" value={new Date(app.created_at).toLocaleString()} />
        </div>

        <p className="text-xs text-muted-foreground">
          Your submitted application and documents cannot be edited. If you need a correction, contact the association.
        </p>
      </div>
    </div>
  );
}

function DocRow({ label, present }: { label: string; present: boolean }) {
  return (
    <div className="flex items-center justify-between border border-separator px-3 py-2 text-sm">
      <span className="flex items-center gap-2 text-foreground"><FileText className="h-4 w-4 text-accent" />{label}</span>
      <span className={`text-xs px-2 py-0.5 border ${present ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-muted text-muted-foreground border-separator'}`}>
        {present ? 'Attached' : 'Not provided'}
      </span>
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
