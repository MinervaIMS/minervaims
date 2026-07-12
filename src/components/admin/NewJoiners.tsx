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
import { useAccess } from '@/hooks/useAccess';
import { Lock } from 'lucide-react';
import { divisionLabels, roleLabel as composeRoleLabel, type OrgDivision, type AppRole } from '@/lib/roles';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { useEmailConfirm } from '@/components/admin/EmailConfirmDialog';
import { listApplications, sendOffer, type ApplicationRow } from '@/lib/applications-api';

const JOIN_ROLES: AppRole[] = ['analyst', 'senior_analyst', 'team_leader', 'portfolio_manager', 'media_analyst'];
const CORE: OrgDivision[] = ['equity', 'investment', 'macro', 'portfolio', 'quant', 'media', 'operations'];

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
  const { toast } = useToast();
  const { canManage } = useAccess();
  // Some roles may open this page only to understand the offer flow; every
  // action is disabled for them (see the role permissions matrix).
  const canSendOffers = canManage('applications-joiners');
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

  // Accepted candidates (offer ready / sent), those who joined, and declined /
  // expired offers (which can be re-sent).
  const joiners = useMemo(
    () => apps.filter((a) => ['accepted', 'joined', 'offer_declined'].includes(a.status)),
    [apps],
  );

  const openOffer = (a: ApplicationRow) => {
    setTarget(a);
    setRole((a.offer_role as AppRole) || 'analyst');
    setDivision((a.offer_division as OrgDivision) || a.interview_division || a.first_choice);
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

      {loading ? <WorkspaceLoader /> : joiners.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">No candidates ready for an offer.</p></CardContent></Card>
      ) : (
        <div className="border border-separator overflow-x-auto">
          <table className="w-full text-left font-body text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-normal">Name</th>
                <th className="px-3 py-2 font-normal">Preference</th>
                <th className="px-3 py-2 font-normal">Email</th>
                <th className="px-3 py-2 font-normal">Offer</th>
                <th className="px-3 py-2 font-normal text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {joiners.map((a) => {
                const st = offerState(a);
                return (
                  <tr key={a.id} className="border-t border-separator">
                    <td className="px-3 py-2 text-foreground whitespace-nowrap">{a.first_name} {a.surname}</td>
                    <td className="px-3 py-2">{divisionLabels[a.first_choice]}{a.second_choice ? ` / ${divisionLabels[a.second_choice]}` : ''}</td>
                    <td className="px-3 py-2">{a.email}</td>
                    <td className="px-3 py-2"><span className={`inline-block px-2 py-0.5 text-xs border ${st.tone}`}>{st.label}</span></td>
                    <td className="px-3 py-2 text-right">
                      {st.canOffer && canSendOffers && (
                        <Button size="sm" onClick={() => openOffer(a)}>
                          <Send className="h-4 w-4 mr-2" />{st.resend ? 'Resend offer' : 'Send offer'}
                        </Button>
                      )}
                      {st.canOffer && !canSendOffers && <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

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
              <Label>Division</Label>
              <Select value={division} onValueChange={(v) => setDivision(v as OrgDivision)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CORE.map((d) => <SelectItem key={d} value={d}>{divisionLabels[d]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{JOIN_ROLES.map((r) => <SelectItem key={r} value={r}>{composeRoleLabel(r, division)}</SelectItem>)}</SelectContent>
              </Select>
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
