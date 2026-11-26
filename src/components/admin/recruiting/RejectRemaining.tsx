import { useEffect, useMemo, useState } from 'react';
import { Loader2, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { invokeFunction, friendlyError } from '@/lib/errors';
import { EVALUATION_DIVISIONS, applyDivisionLabel, evaluationDivision, intakeDivision, type ApplicationRow } from '@/lib/applications-api';
import type { OrgDivision } from '@/lib/roles';

// =====================================================================
// REJECT THE REMAINING CANDIDATES (Step 110), Candidates Screening.
// ---------------------------------------------------------------------
// At the end of a round, every candidate nobody progressed is rejected in
// one act, for one division (the one assessing them) or for every one,
// each receiving the rejection email the single reject sends. Offered
// only to the President, the Vice-President and the association account,
// and only once that division or the whole round has closed; the server
// (`admin-applications`, `reject-remaining`) checks all of it again and
// leaves alone anyone with an interview or a phone call still standing.
// =====================================================================

/** Waiting for a decision, with nothing standing (as the server reads it). */
const WAITING = ['received', 'cv_opened', 'under_review', 'on_hold_pre_interview', 'to_be_contacted',
  'interview_invitation_sent', 'interview_completed', 'on_hold_post_interview', 'plausible_offer', 'to_be_rejected', 'call_on_hold'];
/** An interview or a phone call still standing: decided one by one. */
const STANDING = ['waiting_interview_confirmation', 'interview_confirmed', 'call_invitation_sent', 'call_confirmed'];

const PRESIDENCY = ['president', 'vice_president'];
const ASSOCIATION_ACCOUNT = 'as.minerva@unibocconi.it';

interface RoundSettings { semester_label: string | null; start_date: string | null; end_date: string | null; closed_divisions: string[] | null }

/** May this reader reject the remaining candidates? The President, the Vice-President and the association account. */
export function useCanRejectRemaining(): boolean {
  const { user, roles } = useAuth();
  return user?.email === ASSOCIATION_ACCOUNT || (roles || []).some((r) => PRESIDENCY.includes(String(r.role)));
}

export function RejectRemainingDialog({ open, onOpenChange, apps, onDone }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Every application the page has read. */
  apps: ApplicationRow[];
  onDone: () => void;
}) {
  const { session } = useAuth();
  const { toast } = useToast();
  const [division, setDivision] = useState<string>('all');
  const [settings, setSettings] = useState<RoundSettings | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    let live = true;
    (supabase.from('application_settings') as unknown as { select: (c: string) => { limit: (n: number) => { maybeSingle: () => Promise<{ data: RoundSettings | null }> } } })
      .select('semester_label, start_date, end_date, closed_divisions').limit(1).maybeSingle()
      .then(({ data }) => { if (live) setSettings(data ?? null); })
      .catch(() => { if (live) setSettings(null); });
    return () => { live = false; };
  }, [open]);

  const round = settings?.semester_label ?? null;
  const end = settings?.end_date ? Date.parse(settings.end_date) : NaN;
  const roundOver = !!settings && (!settings.start_date || !settings.end_date || Number.isNaN(end) || Date.now() > end);
  const closedEarly = new Set<string>((settings?.closed_divisions ?? []).map((d) => intakeDivision(d as OrgDivision)));
  const closed = division === 'all'
    ? roundOver || EVALUATION_DIVISIONS.every((d) => closedEarly.has(d))
    : roundOver || closedEarly.has(division);

  const inScope = useMemo(() => apps.filter((a) => (!round || a.semester_label === round)
    && (division === 'all' || evaluationDivision(a) === division)), [apps, round, division]);
  const waiting = inScope.filter((a) => WAITING.includes(a.status));
  const standing = inScope.filter((a) => STANDING.includes(a.status));
  const scopeName = division === 'all' ? 'every division' : applyDivisionLabel(division as OrgDivision);

  const run = async () => {
    setBusy(true);
    try {
      const res = await invokeFunction<{ rejected: number; kept: { name: string }[] }>('admin-applications', { body: { action: 'reject-remaining', division }, session });
      toast({
        title: `${res.rejected} ${res.rejected === 1 ? 'candidate' : 'candidates'} rejected`,
        description: res.kept?.length ? `Left for a decision one by one, with an interview or a call standing: ${res.kept.map((k) => k.name).join(', ')}.` : 'Each receives the usual rejection email.',
      });
      onOpenChange(false);
      onDone();
    } catch (e) {
      toast({ title: 'Not rejected', description: friendlyError(e), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) onOpenChange(o); }}>
      <DialogContent className="max-w-lg ws-form-touch font-body">
        <DialogHeader>
          <DialogTitle className="font-serif">Reject the remaining candidates</DialogTitle>
          <DialogDescription>
            Every candidate{round ? ` of ${round}` : ''} still waiting for a decision is rejected and receives the usual rejection email. Anyone with an interview or a phone call still standing is left for you to decide one by one.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-muted-foreground" htmlFor="reject-remaining-division">Candidates assessed by</label>
            <Select value={division} onValueChange={setDivision}>
              <SelectTrigger id="reject-remaining-division" className="h-11 lg:h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Every division</SelectItem>
                {EVALUATION_DIVISIONS.map((d) => <SelectItem key={d} value={d}>{applyDivisionLabel(d)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-lg border border-separator px-4 py-3 text-sm" aria-live="polite">
            {!settings ? (
              <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Reading the round</span>
            ) : !closed ? (
              <span className="text-foreground">
                {division === 'all' ? 'Applications are still open.' : `${applyDivisionLabel(division as OrgDivision)} is still taking applications.`}{' '}
                <span className="text-muted-foreground">This is possible once {division === 'all' ? 'the round' : 'it'} has closed.</span>
              </span>
            ) : (
              <>
                <p className="text-foreground"><strong className="font-semibold">{waiting.length}</strong> {waiting.length === 1 ? 'candidate' : 'candidates'} of {scopeName} will be rejected.</p>
                {standing.length > 0 && (
                  <p className="mt-1 text-muted-foreground">{standing.length} with an interview or a call standing {standing.length === 1 ? 'stays' : 'stay'} as {standing.length === 1 ? 'it is' : 'they are'}.</p>
                )}
              </>
            )}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" className="h-11 lg:h-10" disabled={busy} onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90 lg:h-10" disabled={busy || !settings || !closed || waiting.length === 0} onClick={run}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserX className="mr-2 h-4 w-4" />}
            Reject {waiting.length} {waiting.length === 1 ? 'candidate' : 'candidates'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
