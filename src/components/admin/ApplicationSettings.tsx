import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Save, Loader2 } from 'lucide-react';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';

// timestamptz <-> datetime-local helpers
const toLocal = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const toIso = (local: string) => (local ? new Date(local).toISOString() : null);

function windowState(startLocal: string, endLocal: string): { label: string; tone: string } {
  if (!startLocal || !endLocal) return { label: 'Schedule incomplete — applications stay closed until both dates are set.', tone: 'text-amber-700' };
  const now = Date.now();
  const s = new Date(startLocal).getTime();
  const e = new Date(endLocal).getTime();
  if (e <= s) return { label: 'The closing time must be after the opening time.', tone: 'text-destructive' };
  if (now < s) return { label: 'Scheduled — applications will open automatically at the start time.', tone: 'text-muted-foreground' };
  if (now > e) return { label: 'Closed — the scheduled window has ended.', tone: 'text-muted-foreground' };
  return { label: 'Open now — applications are accepting submissions.', tone: 'text-green-700' };
}

const ApplicationSettings = () => {
  const { session } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ semester_label: '', start_local: '', end_local: '' });

  useEffect(() => {
    if (!session?.access_token) return;
    (async () => {
      try {
        const { data } = await supabase.functions.invoke('admin-settings', {
          body: { action: 'get' }, headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const s = data?.data;
        if (s) setForm({ semester_label: s.semester_label || '', start_local: toLocal(s.start_date), end_local: toLocal(s.end_date) });
      } catch (e) {
        toast({ title: 'Failed to load', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
      } finally { setLoading(false); }
    })();
  }, [session?.access_token, toast]);

  const save = async () => {
    if (!form.start_local || !form.end_local) {
      toast({ title: 'Both dates are required', description: 'Applications open and close strictly by schedule.', variant: 'destructive' });
      return;
    }
    if (new Date(form.end_local).getTime() <= new Date(form.start_local).getTime()) {
      toast({ title: 'Invalid window', description: 'The closing time must be after the opening time.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      // Keep the legacy boolean consistent with the schedule for any reader
      // that still checks it; the schedule is the source of truth.
      const now = Date.now();
      const open = now >= new Date(form.start_local).getTime() && now <= new Date(form.end_local).getTime();
      const { data, error } = await supabase.functions.invoke('admin-settings', {
        body: { action: 'update', settings: { semester_label: form.semester_label, start_date: toIso(form.start_local), end_date: toIso(form.end_local), auto_open: true, applications_open: open } },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: 'Schedule saved' });
    } catch (e) {
      toast({ title: 'Could not save', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  if (loading) {
    return <div><WorkspacePageHeader title="Website Page" description="Control the public application area of the website." /><WorkspaceLoader /></div>;
  }

  const state = windowState(form.start_local, form.end_local);

  return (
    <div className="space-y-8">
      <WorkspacePageHeader
        title="Website Page"
        description="Applications open and close automatically by schedule. Set the recruitment window and the semester label; the public Join page and the application form follow this schedule."
      />

      <div className="space-y-6 max-w-2xl font-body">
        <div className={`p-4 border border-separator rounded-lg ${state.tone}`}>
          <p className="font-medium">Recruitment status</p>
          <p className="text-sm">{state.label}</p>
        </div>

        <div className="space-y-1">
          <Label>Semester label</Label>
          <Input value={form.semester_label} onChange={(e) => setForm({ ...form, semester_label: e.target.value })} placeholder="e.g. Autumn 2026" />
          <p className="text-xs text-muted-foreground">Shown on the Join page and the application form.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Applications open at *</Label>
            <Input type="datetime-local" value={form.start_local} onChange={(e) => setForm({ ...form, start_local: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Applications close at *</Label>
            <Input type="datetime-local" value={form.end_local} onChange={(e) => setForm({ ...form, end_local: e.target.value })} />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving</> : <><Save className="h-4 w-4 mr-2" />Save schedule</>}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Division-specific written questions are managed in the <span className="text-foreground">Questions</span> subsection.
        </p>
      </div>
    </div>
  );
};

export default ApplicationSettings;
