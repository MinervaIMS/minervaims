import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { divisionLabels, type OrgDivision } from '@/lib/roles';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { listQuestions, setDivisionQuestion } from '@/lib/applications-api';

const CORE: OrgDivision[] = ['equity', 'investment', 'macro', 'portfolio', 'quant'];

export default function QuestionsManagement() {
  const { session } = useAuth();
  const access = useAccess();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Record<string, string>>({});
  const [savingQ, setSavingQ] = useState<string | null>(null);

  const editableDivisions = useMemo<OrgDivision[]>(() => {
    if (access.isFullAccess) return CORE;
    return (access.allowedDivisions || []).filter((d) => (CORE as string[]).includes(d)) as OrgDivision[];
  }, [access]);

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
      toast({ title: `${divisionLabels[division]} question saved`, description: 'It now appears on the public Join page and in the application form.' });
    } catch (e) {
      toast({ title: 'Could not save', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setSavingQ(null); }
  };

  if (loading) {
    return <div><WorkspacePageHeader title="Questions" description="The written question each division asks applicants." /><WorkspaceLoader /></div>;
  }

  return (
    <div>
      <WorkspacePageHeader
        title="Questions"
        description="The written question each division asks applicants. Changes appear immediately on the public Join page and inside the application form. You can edit your own division’s question; full-access roles can edit all."
      />

      <div className="max-w-2xl space-y-4">
        {editableDivisions.length === 0 && (
          <p className="font-body text-sm text-muted-foreground">You don’t have a division question to edit.</p>
        )}
        {editableDivisions.map((d) => (
          <div key={d} className="space-y-2 border border-separator p-4">
            <Label className="font-body text-base text-accent">{divisionLabels[d]}</Label>
            <Textarea rows={4} className="font-body" value={questions[d] ?? ''} onChange={(e) => setQuestions({ ...questions, [d]: e.target.value })} />
            <div className="flex justify-end">
              <Button size="sm" variant="outline" className="font-body" onClick={() => saveQuestion(d)} disabled={savingQ === d}>
                {savingQ === d ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Save question
              </Button>
            </div>
          </div>
        ))}

        {/* Read-only view of other divisions for context (full access already edits all). */}
        {!access.isFullAccess && (
          <p className="font-body text-xs text-muted-foreground pt-2">
            Only your division’s question is editable here.
          </p>
        )}
      </div>
    </div>
  );
}
