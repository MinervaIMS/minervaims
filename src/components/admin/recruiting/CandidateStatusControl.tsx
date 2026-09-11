import { useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HelpDot } from '@/components/admin/help/HelpSystem';
import { useToast } from '@/hooks/use-toast';
import { divisionLabels, type OrgDivision } from '@/lib/roles';
import {
  updateApplicationStatus, allowedNextStatuses, isLockedStatus,
  STATUS_LABELS, statusBadgeClass, evaluationDivision,
  type ApplicationRow, type ApplicationStatus,
} from '@/lib/applications-api';
import { listSlots, isFutureSlot } from '@/lib/interviews-api';

// =====================================================================
// MOVING A CANDIDACY, IN ONE PLACE.
// ---------------------------------------------------------------------
// This was written inside Candidates Screening, which was the only page
// that could move a candidate. The Interview Calendar can now open the
// candidate who booked a slot, and the thing an examiner wants to do
// immediately after an interview is exactly this: record the outcome.
//
// SO IT IS ONE COMPONENT AND NOT TWO COPIES. The rule that a candidacy
// only moves forward, the confirmation before anything that emails the
// applicant, and above all the check that an invitation is never sent to
// a division with no slot a candidate could book, are not rules that
// survive being written twice. A second copy is a second place to forget
// them, and the one that would be forgotten is the one that stops an
// applicant being told to book a time in an empty calendar.
// =====================================================================

// Statuses whose selection sends an automatic email to the candidate: these
// require an explicit confirmation before they are applied.
const EMAIL_ON_STATUS: Record<string, string> = {
  interview_invitation_sent: 'The candidate will be invited to interview, will gain access to the Interview Calendar, and will receive an interview-invitation email.',
  rejected: 'The candidate will be moved to “Rejected” and will receive a rejection email (before- or after-interview, chosen automatically).',
  offer_accepted: 'The candidate will receive a welcome email and be prompted to complete their member profile.',
};

interface Props {
  session: Session | null;
  /** The candidacy being looked at. */
  app: ApplicationRow;
  /** May this reader move candidacies at all (role, and not an archived semester)? */
  canChangeStatus: boolean;
  /**
   * Is THIS candidacy one the reader may ADVANCE? Progression belongs to
   * the assessing division; moving a candidate to another division does
   * not, and is offered separately by the page.
   */
  canProgress: boolean;
  /** Applied after a successful change, so the host can patch its own rows. */
  onChanged: (change: { id: string; status: ApplicationStatus; division?: OrgDivision | null }) => void;
  /** Screening carries the help dots; other pages have their own help. */
  showHelp?: boolean;
}

export function CandidateStatusControl({
  session, app, canChangeStatus, canProgress, onChanged, showHelp = true,
}: Props) {
  const { toast } = useToast();
  const [pendingStatus, setPendingStatus] = useState<ApplicationStatus | null>(null);
  const [confirming, setConfirming] = useState(false);

  const changeStatus = async (status: ApplicationStatus, division?: OrgDivision | null) => {
    try {
      await updateApplicationStatus(session, app.id, status, division);
      onChanged({ id: app.id, status, division });
      toast({ title: 'Status updated' });
    } catch (e) { toast({ title: 'Could not update', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
  };

  // Status changes that send an email need explicit confirmation first.
  const requestStatusChange = (status: ApplicationStatus) => {
    if (EMAIL_ON_STATUS[status]) setPendingStatus(status);
    else changeStatus(status);
  };

  // Confirm the pending change. For "Invited to interview" this enforces that
  // the inviting division has at least one slot the candidate could book.
  const confirmPendingStatus = async () => {
    if (!pendingStatus) return;
    if (pendingStatus === 'interview_invitation_sent') {
      // The invitation goes out for the division that is evaluating the
      // candidate: the "Evaluated for" column is the one place that is set.
      const division = evaluationDivision(app);
      if (!division) { toast({ title: 'Choose an interview division first', variant: 'destructive' }); return; }
      setConfirming(true);
      try {
        const res = await listSlots(session, division);
        // ═════════════════════════════════════════════════════════════
        // A SLOT THAT HAS ALREADY HAPPENED IS NOT AN OPEN SLOT.
        // -------------------------------------------------------------
        // Counting `is_active && !is_booked` alone lets a division whose
        // only remaining slots were this morning pass the check: the
        // invitation goes out, the email tells the candidate to book a
        // time, and the Interview Calendar they open is empty. The stage
        // cannot be undone afterwards except through the division
        // transfer. The rule here is the same one the candidate's own
        // booking list uses and the same one the server enforces before
        // it sends anything: active, unbooked, and still to come.
        const open = res.slots.filter((s) => s.is_active && !s.is_booked && isFutureSlot(s)).length;
        if (open === 0) {
          const stale = res.slots.filter((s) => s.is_active && !s.is_booked).length;
          toast({
            title: 'No interview slot this candidate could book',
            description: stale > 0
              ? `Every open slot for ${divisionLabels[division]} is already in the past. Add a future slot in Recruiting, Interview Calendar before inviting this candidate.`
              : `Open at least one slot for ${divisionLabels[division]} in Recruiting, Interview Calendar before inviting this candidate.`,
            variant: 'destructive',
          });
          return;
        }
      } catch (e) {
        toast({ title: 'Could not verify interview slots', description: e instanceof Error ? e.message : 'Please try again.', variant: 'destructive' });
        return;
      } finally { setConfirming(false); }
      changeStatus(pendingStatus, division);
    } else {
      changeStatus(pendingStatus);
    }
    setPendingStatus(null);
  };

  return (
    <>
      <div className="border border-accent/30 bg-accent/5 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-wider text-accent font-semibold inline-flex items-center gap-1.5">
            Candidate status {showHelp && <HelpDot page="applications-screening" topic="status" />}
          </div>
          <span className={`inline-block px-2 py-0.5 text-xs border ${statusBadgeClass(app.status)}`}>{STATUS_LABELS[app.status]}</span>
        </div>
        {!canChangeStatus ? (
          <p className="text-xs text-muted-foreground border border-separator bg-muted/40 p-2">
            You can review this candidate and add notes below, but changing the status is reserved for the President, Vice President and the Heads. Your notes are visible to them.
          </p>
        ) : !canProgress ? (
          <p className="text-xs text-muted-foreground border border-separator bg-muted/40 p-2">
            This candidate is being assessed by <strong>{divisionLabels[evaluationDivision(app)]}</strong>.
            You can read their whole application, add a note their division will see, and move them to
            another division if they belong in one. Inviting, rejecting and advancing them is theirs to do,
            or the President's.
          </p>
        ) : isLockedStatus(app.status) ? (
          <p className="text-xs text-muted-foreground border border-separator bg-muted/40 p-2">
            This is an offer outcome, managed automatically by the offer process (New Joiners) and the applicant’s response. It cannot be changed here.
          </p>
        ) : (
          <>
            <Select
              key={app.status}
              value={undefined}
              onValueChange={(v) => requestStatusChange(v as ApplicationStatus)}
            >
              <SelectTrigger className="font-body"><SelectValue placeholder="Advance to…" /></SelectTrigger>
              <SelectContent>
                {allowedNextStatuses(app.status).map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}{o.effect === 'action' ? '  ·  sends an email / action' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              A candidacy only moves <strong>forward</strong>: once a stage is reached it cannot be taken back, so only later stages are offered here. Statuses marked <strong>“sends an email / action”</strong> notify the applicant or unlock a step (e.g. “Invited to interview” emails them and opens booking). Offer outcomes are handled in <strong>New Joiners</strong> and can’t be set here.
            </p>
          </>
        )}
        {app.status === 'accepted' && (
          <p className="text-xs text-amber-700 border-t border-amber-200 pt-2">
            “Accepted” is <strong>not</strong> yet visible to the candidate. They still see their outcome as pending until the president sends the final offers to <strong>New Joiners</strong>. Only then are they told they passed the selection.
          </p>
        )}
      </div>

      {/* Confirmation before an email-triggering status change. */}
      <AlertDialog open={!!pendingStatus} onOpenChange={(o) => { if (!o) setPendingStatus(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send this update to the candidate?</AlertDialogTitle>
            <AlertDialogDescription>
              By changing this status to “{pendingStatus ? STATUS_LABELS[pendingStatus] : ''}”, the candidate moves to the next step and <strong>receives an automatic email</strong>.
              {pendingStatus && EMAIL_ON_STATUS[pendingStatus] ? ` ${EMAIL_ON_STATUS[pendingStatus]}` : ''}
              {' '}Please check the details are correct; this cannot be undone. Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingStatus === 'interview_invitation_sent' && (
            <div className="font-body">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Interview division</div>
              <div className="border border-separator bg-muted/30 px-3 py-2 text-sm text-foreground">
                {divisionLabels[evaluationDivision(app)]}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                The division this candidate is being evaluated for, and the only one they will be able to book
                an interview with. To invite them for a different division, change <strong>Evaluated for</strong> first.
              </p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>No, cancel</AlertDialogCancel>
            <AlertDialogAction disabled={confirming} onClick={(e) => { e.preventDefault(); confirmPendingStatus(); }}>
              {confirming ? 'Checking…' : 'Yes, proceed'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default CandidateStatusControl;
