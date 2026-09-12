import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { callFunction, friendlyError } from '@/lib/errors';
import { useAuth } from '@/contexts/AuthContext';
import { logActivity } from '@/lib/activity-log';
import { Save, Loader2, Lock, Unlock } from 'lucide-react';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { APPLY_DIVISIONS, applyDivisionLabel, closedApplyDivisions } from '@/lib/applications-api';
import { formatFilledDivisionsSentence } from '@/lib/join-content';
import type { OrgDivision } from '@/lib/roles';
import logoWhite from '@/assets/logo-white.svg';
import { JOIN_STATUS_COPY, formatDeadlineSentence } from '@/lib/join-content';
import { ApplicationsOpenLabel } from '@/components/shared/ApplicationsOpenLabel';

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
  const { session, roles } = useAuth();
  const primaryRole = roles?.[0]?.role ?? null;
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ semester_label: '', start_local: '', end_local: '' });
  const [previewOpen, setPreviewOpen] = useState(true);

  // ═══════════════════════════════════════════════════════════════════
  // THE DIVISIONS THAT HAVE FILLED THEIR PLACES.
  // -------------------------------------------------------------------
  // Saved the moment a switch is moved, rather than waiting for the Save
  // button beside the dates. The dates are a plan, drafted and then
  // committed; closing a division is a fact that has already happened,
  // and a switch that has visibly moved but not taken effect is the kind
  // of control somebody walks away from believing they have used it.
  //
  // The one exception is closing the LAST division, which ends the round
  // for everybody and changes what the whole public site says. That is
  // confirmed first.
  // ═══════════════════════════════════════════════════════════════════
  const [closed, setClosed] = useState<OrgDivision[]>([]);
  const [savingDivision, setSavingDivision] = useState<OrgDivision | null>(null);
  const [confirmLast, setConfirmLast] = useState<OrgDivision | null>(null);

  useEffect(() => {
    if (!session?.access_token) return;
    (async () => {
      try {
        const { data } = await callFunction('admin-settings', { body: { action: 'get' }, headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const s = data?.data;
        if (s) {
          setForm({ semester_label: s.semester_label || '', start_local: toLocal(s.start_date), end_local: toLocal(s.end_date) });
          setClosed(closedApplyDivisions(s.closed_divisions));
        }
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
      const { data, error } = await callFunction('admin-settings', {
        body: { action: 'update', settings: { semester_label: form.semester_label, start_date: toIso(form.start_local), end_date: toIso(form.end_local), auto_open: true, applications_open: open } }, session });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: 'Schedule saved' });
    } catch (e) {
      toast({ title: 'Could not save', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  /** Write the whole list, which is what the column holds. */
  const persistClosed = async (next: OrgDivision[], division: OrgDivision, nowClosed: boolean) => {
    const previous = closed;
    setSavingDivision(division);
    setClosed(next);
    try {
      const { data, error } = await callFunction('admin-settings', {
        body: { action: 'update', settings: { closed_divisions: next } }, session,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      logActivity(session, primaryRole, {
        action: nowClosed ? 'close' : 'open',
        section: 'Recruiting', subsection: 'Application page',
        entityType: 'division_applications',
        entityName: applyDivisionLabel(division),
        details: { closed_divisions: next },
      });
      toast({
        title: nowClosed
          ? `${applyDivisionLabel(division)} is no longer taking applications`
          : `${applyDivisionLabel(division)} is taking applications again`,
        description: nowClosed
          ? 'It has been removed from the application form, and the Join page says its places are filled.'
          : 'It is back on the application form.',
      });
    } catch (e) {
      // The switch goes back where it was: a control that stays moved
      // after a failed write is a control that is lying.
      setClosed(previous);
      toast({ title: 'Could not change the division', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setSavingDivision(null); }
  };

  const toggleDivision = (division: OrgDivision, open: boolean) => {
    const next = open ? closed.filter((d) => d !== division) : [...closed, division];
    // Closing the last one ends the round for everybody: confirm first.
    if (!open && next.length >= APPLY_DIVISIONS.length) { setConfirmLast(division); return; }
    persistClosed(closedApplyDivisions(next), division, !open);
  };

  if (loading) {
    return <div><WorkspacePageHeader title="Application Page" description="Control the public application area of the website." /><WorkspaceLoader /></div>;
  }

  const state = windowState(form.start_local, form.end_local);
  const now = Date.now();
  const s = form.start_local ? new Date(form.start_local).getTime() : NaN;
  const e = form.end_local ? new Date(form.end_local).getTime() : NaN;
  const isOpenNow = !Number.isNaN(s) && !Number.isNaN(e) && e > s && now >= s && now <= e;

  return (
    <div>
      <WorkspacePageHeader
        title="Application Page"
        description="The recruitment window that opens and closes applications."
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

        {/* ═══════════════════════════════════════════════════════════
            CLOSING ONE DIVISION BEFORE THE ROUND ENDS.
            -----------------------------------------------------------
            The dates above decide when the round runs. These decide who
            is taking part in it. A division that has filled its places
            three days into a fortnight has nothing left to offer, and
            every application it receives afterwards is a candidate who
            will be turned away and a CV somebody has to read.
            ═══════════════════════════════════════════════════════════ */}
        <div className="pt-2 border-t border-separator">
          <h3 className="font-serif text-lg text-accent">Divisions taking applications</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Switch a division off once its places are filled. It disappears from the application form immediately,
            and the Join page congratulates the students who got in. Nothing else about the round changes, and it
            can be switched back on at any time.
          </p>

          <div className="border border-separator divide-y divide-separator">
            {APPLY_DIVISIONS.map((d) => {
              const isClosed = closed.includes(d);
              const busy = savingDivision === d;
              return (
                <div key={d} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <div className="text-foreground">{applyDivisionLabel(d)}</div>
                    <div className={`text-xs ${isClosed ? 'text-amber-700' : 'text-green-700'}`}>
                      {isClosed ? 'Places filled, not on the form' : 'Taking applications'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    {isClosed
                      ? <Lock className="h-4 w-4 text-amber-700" aria-hidden />
                      : <Unlock className="h-4 w-4 text-muted-foreground" aria-hidden />}
                    <Switch
                      checked={!isClosed}
                      disabled={busy}
                      onCheckedChange={(v) => toggleDivision(d, v === true)}
                      aria-label={`${applyDivisionLabel(d)} is taking applications`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* What the public will read, built by the same function /join
              calls, so this is the sentence and not a description of it. */}
          {closed.length > 0 && (
            <div className="mt-4 border border-separator bg-muted/30 p-3">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">On the Join page, under the Apply block</div>
              <p className="text-sm text-foreground">
                {formatFilledDivisionsSentence(closed.map(applyDivisionLabel), closed.length >= APPLY_DIVISIONS.length)}
              </p>
            </div>
          )}

          {closed.length >= APPLY_DIVISIONS.length && (
            <p className="mt-3 text-sm text-amber-700">
              Every division is closed, so the whole site shows the round as finished: the homepage drops its
              applications button and the Join page shows its closed state, exactly as it does after the closing date.
            </p>
          )}

          <p className="mt-3 text-xs text-muted-foreground">
            Closing a division here does not affect the candidates already in the process, and the Heads can still
            move an applicant into a closed division from <span className="text-foreground">Candidates Screening</span>:
            this controls the public form, not the association's own assessment.
          </p>
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
          {/* `data-ro`: these two only choose WHICH PREVIEW IS SHOWN below.
              They write nothing, so a reader keeps them: the preview is the
              part of this page a reader came for. */}
          <div className="inline-flex rounded-md border border-separator overflow-hidden text-sm shrink-0">
            <button data-ro type="button" onClick={() => setPreviewOpen(true)} className={`px-3 py-1.5 ${previewOpen ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}`}>Open</button>
            <button data-ro type="button" onClick={() => setPreviewOpen(false)} className={`px-3 py-1.5 ${!previewOpen ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}`}>Closed</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Homepage hero mock */}
          <div className="border border-separator rounded-lg overflow-hidden">
            <div className="px-3 py-2 bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">Homepage hero</div>
            <div className="p-6 text-center" style={{ backgroundColor: '#0b0720' }}>
              <img src={logoWhite} alt="" className="h-9 mx-auto opacity-95" />
              {/* THE SAME COMPONENT THE HOMEPAGE RENDERS, at the mock's size.
                  The label used to be typed out here as a second copy, which
                  is how a preview quietly stops matching the page it claims
                  to preview. See components/shared/ApplicationsOpenLabel.tsx. */}
              {previewOpen ? (
                <span className="inline-block mt-5 px-6 py-2 bg-background text-foreground font-serif text-sm">
                  <ApplicationsOpenLabel />
                </span>
              ) : (
                <div className="mt-5 h-[36px]" aria-hidden />
              )}
            </div>
            <p className="px-3 py-2 text-xs text-muted-foreground">
              {previewOpen
                ? <>An <span className="text-foreground font-medium"><ApplicationsOpenLabel /></span> button appears under the logo, linking to the Join page.</>
                : <>No button; the hero shows the logo only.</>}
            </p>
          </div>

          {/* Join page mock.
              MIRRORS WHAT /join ACTUALLY DOES NOW. The band this used to draw
              belonged to the old landing page: a dark stage holding the
              application state, with copy that no longer exists anywhere. The
              page has since been rebuilt, and the application state moved OUT
              of the dark introduction and onto the first white section, in the
              accent rectangle the closing block already used. The mock is that
              rectangle: the same serif heading, the same sentence from
              JOIN_STATUS_COPY, the same white button, on white. If the real
              component changes again, the strings below are the ones to check
              against src/components/join/ApplicationCta.tsx. */}
          <div className="border border-separator rounded-lg overflow-hidden">
            <div className="px-3 py-2 bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">Join page (/join), first white section</div>
            <div className="p-4 bg-background">
              <div className="bg-accent text-background p-4">
                <div className="font-serif text-lg leading-tight">
                  {previewOpen ? JOIN_STATUS_COPY.openHeading : JOIN_STATUS_COPY.closedHeading}
                </div>
                {/* THE SENTENCE THE PAGE WILL ACTUALLY PRINT. This was a
                    paraphrase - "open until the closing time above" - while
                    /join builds the sentence from the closing date through
                    formatDeadlineSentence. An administrator setting a window
                    should see the date they are about to publish, so the
                    mock now calls the same builder with the same inputs. */}
                <div className="font-body text-background/85 text-xs mt-2">
                  {previewOpen
                    ? formatDeadlineSentence(
                        form.semester_label || 'the coming semester',
                        form.end_local ? new Date(form.end_local) : null,
                      )
                    : JOIN_STATUS_COPY.closedBodyTop}
                </div>
                <span className="inline-block mt-3 border border-background bg-background px-4 py-2 font-serif text-xs text-accent">
                  {previewOpen ? JOIN_STATUS_COPY.applyLabel : JOIN_STATUS_COPY.archiveLabel}
                </span>
              </div>
            </div>
            <p className="px-3 py-2 text-xs text-muted-foreground">
              {previewOpen
                ? <>The rectangle sits directly under the dark introduction and its button leads to the <span className="text-foreground font-medium">/apply</span> form. The deadline sentence is built from the closing time.</>
                : <>The same rectangle explains that admissions open each semester, and its button sends the reader to the research archive instead.</>}
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          The dark introduction at the top of <span className="text-foreground">/join</span> - the title, the payoff and the live key figures - does not change with the application window. The same rectangle also closes the page, so both states appear twice.
        </p>

        <p className="text-xs text-muted-foreground">
          These states switch automatically at the scheduled open and close times, with no manual publishing needed. The <span className="text-foreground">/apply</span> form itself only accepts submissions while the window is open.
        </p>
      </div>
      </div>

      {/* Closing the LAST division ends the round for everybody. */}
      <AlertDialog open={!!confirmLast} onOpenChange={(o) => { if (!o) setConfirmLast(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close the last division still open?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmLast ? applyDivisionLabel(confirmLast) : 'This division'} is the only one still taking
              applications. Closing it ends the round for everybody: the application form stops accepting
              submissions, the homepage drops its applications button, and the Join page shows the same closed
              state it shows after the closing date. You can switch any division back on at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, keep it open</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                const d = confirmLast;
                setConfirmLast(null);
                if (d) persistClosed(closedApplyDivisions([...closed, d]), d, true);
              }}
            >
              Yes, close the round
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ApplicationSettings;
