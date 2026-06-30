import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { Save, Loader2 } from 'lucide-react';
import { divisionLabels, type OrgDivision } from '@/lib/roles';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { listQuestions, setDivisionQuestion } from '@/lib/applications-api';

const CORE: OrgDivision[] = ['equity', 'investment', 'macro', 'portfolio', 'quant'];

// timestamptz <-> datetime-local helpers
const toLocal = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
};
const toIso = (local: string) => (local ? new Date(local).toISOString() : null);

const ApplicationSettings = () => {
  const { session } = useAuth();
  const access = useAccess();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ applications_open: false, semester_label: '', auto_open: true, start_local: '', end_local: '' });
  const [questions, setQuestions] = useState<Record<string, string>>({});
  const [savingQ, setSavingQ] = useState<string | null>(null);

  const editableDivisions = useMemo<OrgDivision[]>(() => {
    if (access.isFullAccess) return CORE;
    return (access.allowedDivisions || []).filter((d) => (CORE as string[]).includes(d)) as OrgDivision[];
  }, [access]);

  useEffect(() => {
    if (!session?.access_token) return;
    (async () => {
      try {
        const { data } = await supabase.functions.invoke('admin-settings', {
          body: { action: 'get' }, headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const s = data?.data;
        if (s) setForm({
          applications_open: s.applications_open, semester_label: s.semester_label,
          auto_open: s.auto_open ?? true, start_local: toLocal(s.start_date), end_local: toLocal(s.end_date),
        });
        const qs = await listQuestions();
        setQuestions(Object.fromEntries(qs.map((q) => [q.division, q.question])));
      } catch (e) {
        toast({ title: 'Failed to load', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
      } finally { setLoading(false); }
    })();
  }, [session?.access_token, toast]);

  const save = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-settings', {
        body: {
          action: 'update',
          settings: {
            applications_open: form.applications_open, semester_label: form.semester_label,
            auto_open: form.auto_open, start_date: toIso(form.start_local), end_date: toIso(form.end_local),
          },
        },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: 'Settings saved' });
    } catch (e) {
      toast({ title: 'Could not save', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const saveQuestion = async (division: OrgDivision) => {
    setSavingQ(division);
    try {
      await setDivisionQuestion(session, division, questions[division] ?? '');
      toast({ title: `${divisionLabels[division]} question saved` });
    } catch (e) {
      toast({ title: 'Could not save question', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setSavingQ(null); }
  };

  if (loading) {
    return <div><WorkspacePageHeader title="Website Page" description="Control the public application area of the website." /><WorkspaceLoader /></div>;
  }

  return (
    <div className="space-y-8">
      <WorkspacePageHeader
        title="Website Page"
        description="Control the public application area: open or close applications, schedule the window, set the semester label, and manage each division’s written question."
      />

      {access.isFullAccess && (
        <div className="space-y-6 max-w-2xl">
          <div className="flex items-center justify-between p-4 border border-separator rounded-lg">
            <div>
              <p className="font-body font-medium">Applications open</p>
              <p className="font-body text-sm text-muted-foreground">
                {form.applications_open ? 'The internal application form is currently available on the website.' : 'Applications are closed; the form is not available.'}
              </p>
            </div>
            <Switch checked={form.applications_open} onCheckedChange={(v) => setForm({ ...form, applications_open: v })} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-body">
            <div className="space-y-1">
              <Label>Semester label</Label>
              <Input value={form.semester_label} onChange={(e) => setForm({ ...form, semester_label: e.target.value })} placeholder="e.g. Autumn 2026" />
            </div>
            <div className="flex items-center justify-between sm:pt-6">
              <Label htmlFor="auto">Open/close automatically by schedule</Label>
              <Switch id="auto" checked={form.auto_open} onCheckedChange={(v) => setForm({ ...form, auto_open: v })} />
            </div>
            <div className="space-y-1">
              <Label>Opens at</Label>
              <Input type="datetime-local" value={form.start_local} onChange={(e) => setForm({ ...form, start_local: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Closes at</Label>
              <Input type="datetime-local" value={form.end_local} onChange={(e) => setForm({ ...form, end_local: e.target.value })} />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={save} disabled={saving} className="font-body">
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving</> : <><Save className="h-4 w-4 mr-2" />Save settings</>}
            </Button>
          </div>
        </div>
      )}

      {/* Per-division written questions */}
      <div className="space-y-4 max-w-2xl">
        <div>
          <h2 className="font-serif text-xl text-accent">Division questions</h2>
          <p className="font-body text-sm text-muted-foreground">
            Each division’s written question shown to candidates. {access.isFullAccess ? 'You can edit all divisions.' : 'You can edit your own division.'}
          </p>
        </div>
        {editableDivisions.length === 0 && <p className="font-body text-sm text-muted-foreground">No divisions available to edit.</p>}
        {editableDivisions.map((d) => (
          <div key={d} className="space-y-2 border border-separator p-4">
            <Label className="font-body">{divisionLabels[d]}</Label>
            <Textarea rows={3} value={questions[d] ?? ''} onChange={(e) => setQuestions({ ...questions, [d]: e.target.value })} />
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={() => saveQuestion(d)} disabled={savingQ === d}>
                {savingQ === d ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Save question
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ApplicationSettings;
