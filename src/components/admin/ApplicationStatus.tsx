import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { divisionLabels } from '@/lib/roles';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { getMyApplication, candidateStatus, ACADEMIC_YEAR_LABELS, type ApplicationRow } from '@/lib/applications-api';

const STEPS = ['Application received', 'Application under review', 'Interview stage', 'Outcome'];

export default function ApplicationStatus() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [app, setApp] = useState<ApplicationRow | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try { const a = await getMyApplication(); if (active) setApp(a); }
      catch (e) { toast({ title: 'Could not load your application', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [toast]);

  if (loading) {
    return <div><WorkspacePageHeader title="Application status" description="The current status of your application." /><WorkspaceLoader /></div>;
  }

  if (!app) {
    return (
      <div>
        <WorkspacePageHeader title="Application status" description="The current status of your application." />
        <Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">We couldn’t find an application linked to your account.</p></CardContent></Card>
      </div>
    );
  }

  const cs = candidateStatus(app.status);
  const rejected = cs.step === 5;

  return (
    <div>
      <WorkspacePageHeader title="Application status" description={`Your application for ${app.semester_label}.`} />

      <div className="max-w-2xl space-y-8 font-body">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Current status</div>
          <div className={`text-2xl font-serif ${rejected ? 'text-muted-foreground' : 'text-accent'}`}>{cs.label}</div>
        </div>

        {!rejected && (
          <ol className="space-y-3">
            {STEPS.map((label, i) => {
              const stepNo = i + 1;
              const done = cs.step > stepNo;
              const current = cs.step === stepNo || (stepNo === 4 && cs.step === 4);
              return (
                <li key={label} className="flex items-center gap-3">
                  <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs shrink-0 ${done ? 'bg-accent text-accent-foreground' : current ? 'border-2 border-accent text-accent' : 'border border-separator text-muted-foreground'}`}>
                    {done ? <Check className="h-3.5 w-3.5" /> : stepNo}
                  </span>
                  <span className={current ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
                </li>
              );
            })}
          </ol>
        )}

        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-separator">
          <Field label="First choice" value={divisionLabels[app.first_choice]} />
          <Field label="Second choice" value={app.second_choice ? divisionLabels[app.second_choice] : '-'} />
          <Field label="Academic year" value={ACADEMIC_YEAR_LABELS[app.academic_year]} />
          <Field label="Submitted" value={new Date(app.created_at).toLocaleDateString()} />
        </div>

        <p className="text-xs text-muted-foreground">
          Your submitted application and documents cannot be edited. If you need a correction, contact the association.
        </p>
      </div>
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
