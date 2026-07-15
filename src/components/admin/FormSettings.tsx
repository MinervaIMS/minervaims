import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ExternalLink, Eye } from 'lucide-react';
import { divisionLabels, type OrgDivision } from '@/lib/roles';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { listQuestions, ACADEMIC_YEAR_LABELS, type ApplicationQuestion } from '@/lib/applications-api';

const FIELDS = [
  'First name', 'Surname', 'Bocconi ID / matriculation number', 'Bocconi email address',
  'Phone number', 'LinkedIn profile', 'Degree or course code', 'Academic year',
  'CV upload (PDF)', 'PDF answer to the division-specific question',
  'First-choice division', 'Second-choice division',
];

export default function FormSettings() {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<ApplicationQuestion[]>([]);

  useEffect(() => {
    (async () => { try { setQuestions(await listQuestions()); } finally { setLoading(false); } })();
  }, []);

  return (
    <div className="space-y-8">
      <WorkspacePageHeader
        title="Form & Questions"
        description="The internal application form is part of the website. Applicants can only submit it while applications are open, but authorised members can preview it at any time. Its structure is fixed for consistency; the division-specific questions are managed in the Questions subsection."
        actions={<Button variant="outline" className="font-body" onClick={() => window.open('/apply?preview=1', '_blank', 'noopener')}><Eye className="h-4 w-4 mr-2" />Preview the form</Button>}
      />

      <div className="max-w-2xl space-y-6 font-body">
        <Card><CardContent className="py-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Fields collected</div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-foreground list-disc pl-5">
            {FIELDS.map((f) => <li key={f}>{f}</li>)}
          </ul>
          <div className="text-xs text-muted-foreground mt-4">
            Academic year options: {Object.values(ACADEMIC_YEAR_LABELS).join(' · ')}.
          </div>
        </CardContent></Card>

        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Division questions (preview)</div>
          {loading ? <WorkspaceLoader className="py-8" /> : (
            <div className="space-y-3">
              {questions.map((q) => (
                <div key={q.division} className="border border-separator p-3 text-sm">
                  <div className="font-medium text-foreground">{divisionLabels[q.division as OrgDivision] ?? q.division}</div>
                  <div className="text-muted-foreground mt-1">{q.question || '-'}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-sm text-muted-foreground">
          Public form: <Link to="/apply" className="text-accent underline inline-flex items-center gap-1">/apply <ExternalLink className="h-3 w-3" /></Link>.
          Applications are locked after submission and cannot be edited by the candidate.
        </p>
      </div>
    </div>
  );
}
