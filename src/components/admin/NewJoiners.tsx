import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, UserCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { divisionLabels, roleLabel as composeRoleLabel, type OrgDivision, type AppRole } from '@/lib/roles';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { listApplications, convertToMember, STATUS_LABELS, type ApplicationRow } from '@/lib/applications-api';

const JOIN_ROLES: AppRole[] = ['analyst', 'team_leader', 'portfolio_manager', 'media_analyst'];
const CORE: OrgDivision[] = ['equity', 'investment', 'macro', 'portfolio', 'quant', 'media', 'operations'];

export default function NewJoiners() {
  const { session } = useAuth();
  const { toast } = useToast();
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

  // Accepted candidates who have not yet been converted.
  const joiners = useMemo(
    () => apps.filter((a) => ['accepted', 'offer_accepted'].includes(a.status)),
    [apps],
  );

  const openConvert = (a: ApplicationRow) => {
    setTarget(a); setRole('analyst'); setDivision(a.first_choice); setFeeDue(true);
  };

  const confirm = async () => {
    if (!target) return;
    setBusy(true);
    try {
      await convertToMember(session, target.id, role, division, feeDue);
      toast({ title: 'Member created', description: `${target.first_name} ${target.surname} is now a member.` });
      setTarget(null);
      await load();
    } catch (e) {
      toast({ title: 'Could not convert', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  return (
    <div>
      <WorkspacePageHeader
        title="New joiners"
        description="Accepted candidates who join Minerva. Approve, assign a specific role and division, and mark the membership fee as due — this converts the candidate account into a member."
      />

      {loading ? <WorkspaceLoader /> : joiners.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">No accepted candidates awaiting onboarding.</p></CardContent></Card>
      ) : (
        <div className="border border-separator overflow-x-auto">
          <table className="w-full text-left font-body text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-normal">Name</th>
                <th className="px-3 py-2 font-normal">Preference</th>
                <th className="px-3 py-2 font-normal">Email</th>
                <th className="px-3 py-2 font-normal">Status</th>
                <th className="px-3 py-2 font-normal text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {joiners.map((a) => (
                <tr key={a.id} className="border-t border-separator">
                  <td className="px-3 py-2 text-foreground whitespace-nowrap">{a.first_name} {a.surname}</td>
                  <td className="px-3 py-2">{divisionLabels[a.first_choice]}{a.second_choice ? ` / ${divisionLabels[a.second_choice]}` : ''}</td>
                  <td className="px-3 py-2">{a.email}</td>
                  <td className="px-3 py-2">{STATUS_LABELS[a.status]}</td>
                  <td className="px-3 py-2 text-right">
                    <Button size="sm" onClick={() => openConvert(a)}><UserCheck className="h-4 w-4 mr-2" />Approve as member</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Approve {target?.first_name} {target?.surname}</DialogTitle>
            <DialogDescription className="font-body">
              Every member has a specific role. This converts the candidate account into a member and assigns it.
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
            <div className="flex gap-3 pt-1">
              <Button className="flex-1" onClick={confirm} disabled={busy}>
                {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Converting</> : 'Confirm'}
              </Button>
              <Button variant="outline" onClick={() => setTarget(null)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
