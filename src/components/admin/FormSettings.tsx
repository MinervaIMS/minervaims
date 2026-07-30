import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Eye, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { useApplicationSettings } from '@/hooks/useApplicationSettings';
import { logActivity } from '@/lib/activity-log';
import { divisionLabels, type OrgDivision } from '@/lib/roles';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { listQuestions, setDivisionQuestion } from '@/lib/applications-api';

// =====================================================================
// Form & Questions — the division-specific written questions that make up
// the editable part of the application form. The form's fixed structure
// is not restated here: it never changes and can be inspected directly
// with "Preview the form". A single top-to-bottom column, per the
// workspace design rules (static panels, no hover effects).
// =====================================================================

const CORE: OrgDivision[] = ['equity', 'investment', 'macro', 'portfolio', 'quant'];

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] uppercase tracking-[0.14em] text-accent font-semibold mb-3 pb-2 border-b border-separator">
      {children}
    </div>
  );
}

export default function FormSettings() {
  const { session } = useAuth();
  const access = useAccess();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Record<string, string>>({});
  const [savingQ, setSavingQ] = useState<string | null>(null);

  const editableDivisions: OrgDivision[] =
    access.isFullAccess || !access.allowedDivisions?.length
      ? CORE
      : (access.allowedDivisions.filter((d) => (CORE as string[]).includes(d)) as OrgDivision[]);
  // Questions freeze while applications are open: from the scheduled opening
  // until the close, no question can be edited (the server enforces this too).
  const { settings: appSettings } = useApplicationSettings();
  const questionsLocked = appSettings.applicationsOpen;
  const canEditQuestions = access.canManage('applications-form') && !questionsLocked;

  useEffect(() => {
    (async () => {
      try {
        const qs = await listQuestions();
        setQuestions(Object.fromEntries(qs.map((q) => [q.division, q.question])));
      } catch (e) {
        toast({ title: 'Failed to load questions', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
      } finally { setLoading(false); }
    })();
  }, [toast]);

  const saveQuestion = async (division: OrgDivision) => {
    setSavingQ(division);
    try {
      await setDivisionQuestion(session, division, questions[division] ?? '');
      logActivity(session, access.primaryRole, { action: 'update', section: 'Recruiting', subsection: 'Form & Questions', entityType: 'application_question', entityName: divisionLabels[division] });
      toast({ title: `${divisionLabels[division]} question saved`, description: 'It now appears on the public Join page and in the application form.' });
    } catch (e) {
      toast({ title: 'Could not save', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setSavingQ(null); }
  };

  return (
    <div>
      <WorkspacePageHeader
        title="Form & Questions"
        description="The written question each division asks its applicants, answered with a PDF upload. Changes appear immediately on the public Join page and inside the application form. The rest of the form is fixed for consistency across semesters and divisions; use Preview the form to see it as applicants do."
        actions={<Button variant="outline" className="font-body" onClick={() => window.open('/apply?preview=1', '_blank', 'noopener')}><Eye className="h-4 w-4 mr-2" />Preview the form</Button>}
      />

      {/* One column: the division questions, which are the editable part
          of the application form. */}
      <div className="max-w-3xl space-y-10 font-body">
        <section className="space-y-4">
          <div>
            <Kicker>Division questions</Kicker>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Each division asks applicants one written question, answered with a PDF upload.
              {canEditQuestions
                ? ' A Head of Division edits their own division’s question and consults the others; full-access roles edit all.'
                : ' The questions are shown for consultation.'}
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2 border border-separator bg-muted/40 px-3 py-2">
              Questions are locked while applications are open: from the scheduled opening date until the
              closing date they cannot be edited, so every applicant answers the same question.
              {questionsLocked && <span className="text-foreground"> Applications are open now, so editing is disabled.</span>}
            </p>
          </div>

          {loading ? <WorkspaceLoader inline className="py-10" /> : (
            <div className="space-y-3">
              {CORE.map((d) => {
                const editable = canEditQuestions && editableDivisions.includes(d);
                if (!editable) {
                  return (
                    <div key={d} className="border border-separator p-4">
                      <div className="text-sm text-accent font-medium">{divisionLabels[d]}</div>
                      <p className="text-sm text-muted-foreground mt-1.5 whitespace-pre-wrap">{questions[d] || 'No question set yet.'}</p>
                    </div>
                  );
                }
                return (
                  <div key={d} className="border border-separator p-4 space-y-2">
                    <Label className="text-base text-accent">{divisionLabels[d]}</Label>
                    <Textarea rows={4} value={questions[d] ?? ''} onChange={(e) => setQuestions({ ...questions, [d]: e.target.value })} />
                    <div className="flex justify-end">
                      <Button size="sm" variant="outline" onClick={() => saveQuestion(d)} disabled={savingQ === d}>
                        {savingQ === d ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Save question
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {canEditQuestions && !access.isFullAccess && (
            <p className="text-xs text-muted-foreground">Only your division&rsquo;s question is editable here.</p>
          )}
        </section>
      </div>
    </div>
  );
}
