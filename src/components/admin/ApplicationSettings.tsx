import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logActivity } from '@/lib/activity-log';
import { useAccess } from '@/hooks/useAccess';
import { Save, Loader2 } from 'lucide-react';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import logoWhite from '@/assets/logo-white.svg';

// timestamptz <-> datetime-local helpers
const toLocal = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const toIso = (local: string) => (local ? new Date(local).toISOString() : null);

function windowState(startLocal: string, endLocal: string): { label: string; tone: string } {
  if (!startLocal || !endLocal) return { label: 'Schedule incomplete - applications stay closed until both dates are set.', tone: 'text-amber-700' };
  const now = Date.now();
  const s = new Date(startLocal).getTime();
  const e = new Date(endLocal).getTime();
  if (e <= s) return { label: 'The closing time must be after the opening time.', tone: 'text-destructive' };
  if (now < s) return { label: 'Scheduled - applications will open automatically at the start time.', tone: 'text-muted-foreground' };
  if (now > e) return { label: 'Closed - the scheduled window has ended.', tone: 'text-muted-foreground' };
  return { label: 'Open now - applications are accepting submissions.', tone: 'text-green-700' };
}

const ApplicationSettings = () => {
  const { session } = useAuth();
  const { primaryRole } = useAccess();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ semester_label: '', start_local: '', end_local: '' });
  const [previewOpen, setPreviewOpen] = useState(true);

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
      logActivity(session, primaryRole, { action: 'update', section: 'Recruiting', subsection: 'Application page', entityType: 'application_settings', entityName: form.semester_label || 'Application window' });
      toast({ title: 'Schedule saved' });
    } catch (e) {
      toast({ title: 'Could not save', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  if (loading) {
    return <div><WorkspacePageHeader title="Application page" description="Control the public application area of the website." /><WorkspaceLoader /></div>;
  }

  const state = windowState(form.start_local, form.end_local);
  const now = Date.now();
  const s = form.start_local ? new Date(form.start_local).getTime() : NaN;
  const e = form.end_local ? new Date(form.end_local).getTime() : NaN;
  const isOpenNow = !Number.isNaN(s) && !Number.isNaN(e) && e > s && now >= s && now <= e;

  return (
    <div>
      <WorkspacePageHeader
        title="Application page"
        description="Applications open and close automatically by schedule. Set the recruitment window and the semester label; the public Join page and the application form follow this schedule."
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-12 gap-y-10 items-start">
      <div className="space-y-6 font-body">
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
          Division-specific written questions are managed in the <span className="text-foreground">Form &amp; Questions</span> subsection.
        </p>
      </div>

      {/* Preview of the public-facing changes when applications open */}
      <div className="space-y-4 font-body xl:border-l xl:border-separator xl:pl-12 border-t xl:border-t-0 border-separator pt-8 xl:pt-0">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h3 className="font-serif text-lg text-accent">What changes on the website</h3>
            <p className="text-sm text-muted-foreground">
              While the window is open, two public pages change automatically.{' '}
              {isOpenNow ? 'The open state is live to visitors right now.' : 'Visitors currently see the closed state.'}
            </p>
          </div>
          <div className="inline-flex rounded-md border border-separator overflow-hidden text-sm shrink-0">
            <button type="button" onClick={() => setPreviewOpen(true)} className={`px-3 py-1.5 ${previewOpen ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}`}>Open</button>
            <button type="button" onClick={() => setPreviewOpen(false)} className={`px-3 py-1.5 ${!previewOpen ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}`}>Closed</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Homepage hero mock */}
          <div className="border border-separator rounded-lg overflow-hidden">
            <div className="px-3 py-2 bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">Homepage hero</div>
            <div className="p-6 text-center" style={{ backgroundColor: '#0b0720' }}>
              <img src={logoWhite} alt="" className="h-9 mx-auto opacity-95" />
              {previewOpen ? (
                <span className="inline-block mt-5 px-6 py-2 bg-background text-foreground font-serif text-sm">APPLY NOW</span>
              ) : (
                <div className="mt-5 h-[36px]" aria-hidden />
              )}
            </div>
            <p className="px-3 py-2 text-xs text-muted-foreground">
              {previewOpen
                ? <>An <span className="text-foreground font-medium">APPLY NOW</span> button appears under the logo, linking to the Join page.</>
                : <>No button; the hero shows the logo only.</>}
            </p>
          </div>

          {/* Join page hero mock */}
          <div className="border border-separator rounded-lg overflow-hidden">
            <div className="px-3 py-2 bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">Join page (/join) hero band</div>
            <div className="p-5" style={{ backgroundColor: '#0b0720' }}>
              {previewOpen ? (
                <>
                  <div className="font-serif text-background text-base leading-tight">Prepare a strong application — then apply.</div>
                  <div className="font-body text-background/70 text-xs mt-2">Applications for {form.semester_label || '<semester label>'} are open. Submit the form with your CV, motivation letter and written answer.</div>
                  <span className="inline-block mt-3 px-4 py-2 bg-background text-foreground font-serif text-xs">Submit Application Form →</span>
                </>
              ) : (
                <>
                  <div className="font-serif text-background text-base leading-tight">Applications are closed. Start preparing now.</div>
                  <div className="font-body text-background/70 text-xs mt-2">Use the roadmap below to guide your journey. The next intake will be announced at the start of the upcoming semester.</div>
                </>
              )}
            </div>
            <p className="px-3 py-2 text-xs text-muted-foreground">
              {previewOpen
                ? <>The band invites applications and links to the <span className="text-foreground font-medium">/apply</span> form.</>
                : <>The band explains applications are closed and points to the preparation roadmap, without an apply button.</>}
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          These states switch automatically at the scheduled open and close times, with no manual publishing needed. The <span className="text-foreground">/apply</span> form itself only accepts submissions while the window is open.
        </p>
      </div>
      </div>
    </div>
  );
};

export default ApplicationSettings;
