import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Send, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { logActivity } from '@/lib/activity-log';
import { useAccess } from '@/hooks/useAccess';
import { Lock } from 'lucide-react';
import { divisionLabels, roleLabel as composeRoleLabel, divisionsForRole, type OrgDivision, type AppRole } from '@/lib/roles';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { HelpDot } from '@/components/admin/help/HelpSystem';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { useEmailConfirm } from '@/components/admin/EmailConfirmDialog';
import { listApplications, sendOffer, addApplicationNote, type ApplicationRow } from '@/lib/applications-api';
import { useCandidateDetail } from '@/components/admin/recruiting/useCandidateDetail';
import { CandidateProfile, CandidateStage } from '@/components/admin/recruiting/CandidateProfile';
import { currentSemester, semesterOf, semestersInData } from '@/lib/semester';

const JOIN_ROLES: AppRole[] = ['analyst', 'senior_analyst', 'team_leader', 'portfolio_manager', 'media_analyst'];

// =====================================================================
// THE DIVISION A CANDIDATE WAS SELECTED FOR - not the two they asked for.
// ---------------------------------------------------------------------
// The column used to read "Preference" and print both choices, e.g.
// "Equity Research / Macro Research". By the time a candidacy reaches
// Offers the preferences have been settled: the person was interviewed
// by one division and it is that division that decided to take them.
// Printing the original pair here asks the reader to work out which of
// the two actually happened, and a candidate transferred after interview
// is shown neither.
//
// So the column reads DIVISION and prints the one the offer concerns, in
// the same precedence the offer dialog itself uses:
//
//   offer_division    - the division on an offer already prepared or sent
//   interview_division - otherwise, the division of the LAST interview,
//                        which is what a post-interview transfer updates
//   first_choice      - and only if no interview was ever recorded
//
// Because it is the same precedence, the column and the dialog can never
// disagree, and changing the division in the confirmation pop-up (still
// possible, and still the only place it can be changed) is reflected here
// as soon as the offer is saved.
// =====================================================================
const selectedDivision = (a: ApplicationRow): OrgDivision =>
  (a.offer_division as OrgDivision) || a.interview_division || a.first_choice;

// Human-readable state of the offer for a candidate row.
function offerState(a: ApplicationRow): { label: string; tone: string; canOffer: boolean; resend: boolean } {
  if (a.status === 'joined') return { label: 'Joined', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200', canOffer: false, resend: false };
  if (a.status === 'offer_declined') return { label: 'Declined / expired', tone: 'bg-orange-50 text-orange-700 border-orange-200', canOffer: true, resend: true };
  if (a.status === 'accepted' && a.offer_sent_at) {
    const by = a.offer_deadline ? ` · by ${new Date(a.offer_deadline).toLocaleDateString()}` : '';
    return { label: `Offer sent · awaiting reply${by}`, tone: 'bg-amber-50 text-amber-700 border-amber-200', canOffer: true, resend: true };
  }
  return { label: 'Ready to offer', tone: 'bg-muted text-muted-foreground border-separator', canOffer: true, resend: false };
}

export default function NewJoiners() {
  const { session } = useAuth();
  const { primaryRole } = useAccess();
  const { toast } = useToast();
  const { canManage } = useAccess();
  // Some roles may open this page only to understand the offer flow; every
  // action is disabled for them (see the role permissions matrix).
  const canSendOffers = canManage('applications-joiners');
  // THE SAME CANDIDATE, READ THE SAME WAY. Preparing an offer means knowing
  // how the person reached this stage, and that used to mean leaving Offers,
  // going back to Candidate Screening and finding them again. The profile,
  // the documents and the screening notes are the same component and the same
  // hook here as there, so there is one source and one behaviour rather than
  // a second, competing candidate view.
  const {
    openId, detail, cvUrl, answerUrl, loading: detailLoading, docsLoading,
    open: openCandidate, close: closeCandidate, refresh: refreshCandidate,
  } = useCandidateDetail(session);
  const { hasSpecial } = useAccess();
  // Notes are part of assessing a candidate, so anyone who may comment during
  // screening may comment here too. The offer itself is a separate permission.
  const canAddNotes = canManage('applications-screening') || hasSpecial('applications-screening', 'candidates_notes_only');
  const { confirm: confirmEmail, dialog: emailDialog } = useEmailConfirm();
  const [apps, setApps] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<ApplicationRow | null>(null);
  const [role, setRole] = useState<AppRole>('analyst');
  const [division, setDivision] = useState<OrgDivision>('equity');
  const [feeDue, setFeeDue] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setApps(await listApplications(session)); }
    catch (e) { toast({ title: 'Failed to load', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setLoading(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  // Semester scope: offers are an active workflow for THIS semester only;
  // previous semesters remain consultable as a read-only archive.
  const [semKey, setSemKey] = useState(currentSemester().key);
  const viewingArchived = semKey !== currentSemester().key;

  const semesterOptions = useMemo(() => {
    const withOffers = apps.filter((a) => ['accepted', 'joined', 'offer_declined'].includes(a.status));
    const list = semestersInData(withOffers.map((a) => a.created_at));
    if (!list.some((s) => s.key === currentSemester().key)) list.unshift(currentSemester());
    return list;
  }, [apps]);

  // Accepted candidates (offer ready / sent), those who joined, and declined /
  // expired offers (which can be re-sent).
  const joiners = useMemo(
    () => apps.filter((a) => ['accepted', 'joined', 'offer_declined'].includes(a.status))
      .filter((a) => semesterOf(a.created_at).key === semKey),
    [apps, semKey],
  );

  const openOffer = (a: ApplicationRow) => {
    setTarget(a);
    setRole((a.offer_role as AppRole) || 'analyst');
    setDivision(selectedDivision(a));
    setFeeDue(a.offer_fee_due !== false);
  };

  const confirm = async () => {
    if (!target) return;
    // Explicit confirmation: sending an offer emails the candidate automatically.
    const ok = await confirmEmail({
      title: 'Send this offer by email?',
      description: (
        <>
          <p>
            <strong>{target.first_name} {target.surname}</strong> will receive an automatic email inviting them to join as{' '}
            <strong>{composeRoleLabel(role, division)}</strong>. They have three days to accept from their workspace
            (a reminder email is sent after two days).
          </p>
          <p>This action cannot be reversed. Have you checked the role and division are correct?</p>
        </>
      ),
      confirmLabel: 'Yes, send the offer',
    });
    if (!ok) return;
    setBusy(true);
    try {
      await sendOffer(session, target.id, role, division, feeDue);
      logActivity(session, primaryRole, { action: 'approval', section: 'Recruiting', subsection: 'Offers', entityType: 'application', entityId: target.id, entityName: `${target.first_name} ${target.surname}`, details: { role, division } });
      toast({ title: 'Offer sent', description: `${target.first_name} ${target.surname} has 3 days to accept. They will receive an email.` });
      setTarget(null);
      await load();
    } catch (e) {
      toast({ title: 'Could not send the offer', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  return (
    <div>
      <WorkspacePageHeader
        title="Offers"
        description="Candidates who passed the selection. Send an offer to join with a specific role and division; the candidate has three days to accept from their workspace (a reminder is sent after two days). Accepting turns their account into a member automatically."
      />

      {!canSendOffers && (
        <div className="flex items-start gap-2 mb-6 rounded-lg border border-separator bg-muted/30 px-4 py-3 font-body text-sm">
          <Lock className="h-4 w-4 mt-0.5 text-accent shrink-0" />
          <span className="text-muted-foreground">This page is <span className="text-foreground">view-only</span> for your role. You can see the offer process to understand how it works, but sending, resending and editing offers is reserved for the President and Admin.</span>
        </div>
      )}

      <div className="mb-4 flex items-center gap-3">
        <Select value={semKey} onValueChange={setSemKey}>
          <SelectTrigger className="w-[220px] font-body"><SelectValue /></SelectTrigger>
          <SelectContent>
            {semesterOptions.map((s) => (
              <SelectItem key={s.key} value={s.key}>{s.label}{s.key === currentSemester().key ? ' (current)' : ' (archive)'}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {viewingArchived && (
          <span className="font-body text-sm text-muted-foreground">Archived semester: a read-only record of past offers.</span>
        )}
      </div>

      {loading ? <WorkspaceLoader /> : joiners.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">{viewingArchived ? 'No offers were recorded in this semester.' : 'No candidates ready for an offer.'}</p></CardContent></Card>
      ) : (
        <div className="max-w-full border border-separator overflow-x-auto">
          <table className="w-full text-left font-body text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-normal">Name</th>
                <th className="px-3 py-2 font-normal">Division</th>
                <th className="px-3 py-2 font-normal">Email</th>
                <th className="px-3 py-2 font-normal"><span className="inline-flex items-center gap-1.5">Offer <HelpDot page="applications-joiners" topic="offer-flow" /></span></th>
                <th className="px-3 py-2 font-normal text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {joiners.map((a) => {
                const st = offerState(a);
                return (
                  <tr key={a.id} className="border-t border-separator">
                    <td className="px-3 py-2 text-foreground whitespace-nowrap">{a.first_name} {a.surname}</td>
                    <td className="px-3 py-2">{divisionLabels[selectedDivision(a)]}</td>
                    <td className="px-3 py-2">{a.email}</td>
                    <td className="px-3 py-2"><span className={`inline-block px-2 py-0.5 text-xs border ${st.tone}`}>{st.label}</span></td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => openCandidate(a.id)}>Open</Button>
                        {st.canOffer && canSendOffers && !viewingArchived && (
                          <Button size="sm" onClick={() => openOffer(a)}>
                            <Send className="h-4 w-4 mr-2" />{st.resend ? 'Resend offer' : 'Send offer'}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* The candidate, in full, without leaving Offers. */}
      <Dialog open={!!openId} onOpenChange={(o) => { if (!o) closeCandidate(); }}>
        <DialogContent className="max-w-[96vw] w-[96vw] max-h-[94vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">
              {detail ? `${detail.application.first_name} ${detail.application.surname}` : 'Candidate'}
            </DialogTitle>
            <DialogDescription className="font-body">
              The same information the reviewers saw during screening, including their notes. Progression is not changed from here.
            </DialogDescription>
          </DialogHeader>
          {detailLoading || !detail ? <WorkspaceLoader inline /> : (
            <CandidateProfile
              session={session}
              detail={detail}
              cvUrl={cvUrl}
              answerUrl={answerUrl}
              docsLoading={docsLoading}
              canAddNotes={canAddNotes && !viewingArchived}
              addNote={async (b) => { await addApplicationNote(session, detail.application.id, b); }}
              onNoteAdded={async () => { await refreshCandidate(detail.application.id); }}
              onError={(m) => toast({ title: 'Something went wrong', description: m, variant: 'destructive' })}
            >
              <CandidateStage status={detail.application.status} />
              <div className="border border-separator p-3 space-y-1">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Offer</div>
                <span className={`inline-block px-2 py-0.5 text-xs border ${offerState(detail.application).tone}`}>
                  {offerState(detail.application).label}
                </span>
                {detail.application.offer_role && (
                  <p className="text-xs text-muted-foreground">
                    Offered as {composeRoleLabel(detail.application.offer_role as AppRole, (detail.application.offer_division as OrgDivision) || null)}.
                  </p>
                )}
              </div>
            </CandidateProfile>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Send an offer to {target?.first_name} {target?.surname}</DialogTitle>
            <DialogDescription className="font-body">
              Choose the role and division for the offer. The candidate has three days to accept from their workspace; on acceptance their account becomes a member with this role. An email is sent now.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 font-body">
            <div className="space-y-1">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => {
                const next = v as AppRole;
                setRole(next);
                const opts = divisionsForRole(next);
                if (opts.length === 1) setDivision(opts[0]);
                else if (!opts.includes(division)) setDivision(opts[0] ?? 'equity');
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{JOIN_ROLES.map((r) => <SelectItem key={r} value={r}>{composeRoleLabel(r, null)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Division</Label>
              <Select value={division} onValueChange={(v) => setDivision(v as OrgDivision)} disabled={divisionsForRole(role).length === 1}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{divisionsForRole(role).map((d) => <SelectItem key={d} value={d}>{divisionLabels[d]}</SelectItem>)}</SelectContent>
              </Select>
              {divisionsForRole(role).length === 1 && (
                <p className="text-xs text-muted-foreground">{composeRoleLabel(role, null)} always belongs to {divisionLabels[divisionsForRole(role)[0]]}.</p>
              )}
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="feeDue">Membership fee due</Label>
              <Switch id="feeDue" checked={feeDue} onCheckedChange={setFeeDue} />
            </div>
            <p className="text-xs text-muted-foreground">
              Only Bocconi students can become members, and payment of the membership fee is a condition of membership.
            </p>
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <Mail className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Sending an offer emails the candidate automatically. You will be asked to confirm.</span>
            </div>
            <div className="flex gap-3 pt-1">
              <Button className="flex-1" onClick={confirm} disabled={busy}>
                {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending</> : 'Send offer'}
              </Button>
              <Button variant="outline" onClick={() => setTarget(null)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {emailDialog}
    </div>
  );
}
