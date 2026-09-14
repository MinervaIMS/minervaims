import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Send, RotateCcw, Ban, MailPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { divisionLabels, type OrgDivision } from '@/lib/roles';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { HelpDot } from '@/components/admin/help/HelpSystem';
import {
  listInvites, sendInvite, resendInvite, revokeInvite,
  inviteState, INVITE_STATE_LABELS, INVITE_STATE_CLASS,
  INVITABLE_ROLE_LABELS, INVITABLE_ROLE_HELP,
  type AccountInvite, type InvitableRole,
} from '@/lib/invites-api';

// =====================================================================
// Invites — accounts for the people who cannot create their own.
// ---------------------------------------------------------------------
// The association restricts new accounts to the university's three
// domains, which is right for students and wrong for advisors and alumni:
// both have left Bocconi, and the address they now use is their own.
// Until this page existed there was no way to give either of them an
// account at all, short of asking them to find a university address they
// no longer have.
//
// AN INVITATION IS NOT A WAY ROUND THE DOMAIN RULE, it is a different
// thing entirely. Nobody signs up: the association creates the account,
// server-side, and the auth server sends its own invitation email. The
// sign-up form is not involved and has no idea any of this exists. See
// supabase/functions/admin-invites for the whole of that reasoning.
//
// WHAT THE PAGE IS FOR, once the invitation is gone, is the register.
// "Did anyone ever invite her?" and "has he actually accepted?" are the
// two questions that get asked afterwards, and both are answered here,
// with who sent it and when.
// =====================================================================

/** Advisors are not divisional; alumni may be remembered by theirs. */
const DIVISION_OPTIONS: OrgDivision[] = [
  'equity', 'investment', 'macro', 'portfolio', 'quant', 'media', 'operations', 'board',
];

export default function InvitesManagement() {
  const { session } = useAuth();
  const { toast } = useToast();
  const access = useAccess();
  const canManage = access.canManage('people-invites');

  const [invites, setInvites] = useState<AccountInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [pendingRevoke, setPendingRevoke] = useState<AccountInvite | null>(null);

  const [form, setForm] = useState<{
    email: string; full_name: string; role: InvitableRole; division: string; note: string;
  }>({ email: '', full_name: '', role: 'advisor', division: 'none', note: '' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await listInvites(session);
      setInvites(res.invites);
    } catch (e) {
      toast({ title: 'Could not load the invitations', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setLoading(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  // The form is only worth submitting once it holds an address and a name.
  // Checked here so the button says so, and again on the server, which is
  // the one that decides.
  const formValid = form.email.trim().includes('@') && form.full_name.trim().length > 0;

  const submit = async () => {
    if (!formValid || sending) return;
    setSending(true);
    try {
      await sendInvite(session, {
        email: form.email.trim(),
        full_name: form.full_name.trim(),
        role: form.role,
        division: form.division === 'none' ? null : (form.division as OrgDivision),
        note: form.note.trim() || undefined,
      });
      toast({
        title: 'Invitation sent',
        description: `${form.full_name.trim()} has been emailed a link to set a password. They appear here as Waiting until they use it.`,
      });
      setForm({ email: '', full_name: '', role: 'advisor', division: 'none', note: '' });
      await load();
    } catch (e) {
      toast({ title: 'Could not send the invitation', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setSending(false); }
  };

  const doResend = async (i: AccountInvite) => {
    setBusy(i.id);
    try {
      await resendInvite(session, i.id);
      toast({ title: 'Invitation sent again', description: `A fresh link is on its way to ${i.email}.` });
      await load();
    } catch (e) {
      toast({ title: 'Could not send it again', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setBusy(null); }
  };

  const doRevoke = async (i: AccountInvite) => {
    setBusy(i.id);
    try {
      await revokeInvite(session, i.id);
      toast({ title: 'Invitation revoked', description: `${i.full_name} can no longer use the link, and the access it carried has been withdrawn.` });
      await load();
    } catch (e) {
      toast({ title: 'Could not revoke it', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setBusy(null); setPendingRevoke(null); }
  };

  // Waiting first: those are the ones somebody may still need to chase.
  const ordered = useMemo(() => {
    const rank = (i: AccountInvite) => (inviteState(i) === 'pending' ? 0 : inviteState(i) === 'accepted' ? 1 : 2);
    return [...invites].sort((a, b) =>
      rank(a) - rank(b) || b.created_at.localeCompare(a.created_at));
  }, [invites]);

  const waiting = invites.filter((i) => inviteState(i) === 'pending').length;

  return (
    <div>
      <WorkspacePageHeader
        title="Invites"
        description="Accounts for advisors and alumni, who no longer hold a university address and cannot register themselves."
      />

      {canManage && (
        <Card className="mb-6">
          <CardContent className="py-5 font-body">
            <div className="text-xs uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5 mb-3">
              <MailPlus className="h-3.5 w-3.5" aria-hidden />Invite someone
              <HelpDot page="people-invites" topic="how-it-works" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="invite-name">Full name</Label>
                <Input
                  id="invite-name" value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="e.g. Marco Rossi" autoComplete="off"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email" type="email" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="their own address" autoComplete="off"
                />
                {/* SAID PLAINLY, because everywhere else on this site an
                    address outside the university is refused, and somebody
                    typing one here would reasonably expect the same. */}
                <p className="text-xs text-muted-foreground">
                  Any address. An invited account does not go through the Bocconi domain rule, because the
                  people invited here no longer have a university address.
                </p>
              </div>
              <div className="space-y-1">
                <Label>Invite as</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as InvitableRole })}>
                  <SelectTrigger className="font-body"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(INVITABLE_ROLE_LABELS) as InvitableRole[]).map((r) => (
                      <SelectItem key={r} value={r}>{INVITABLE_ROLE_LABELS[r]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{INVITABLE_ROLE_HELP[form.role]}</p>
              </div>
              <div className="space-y-1">
                <Label>Division (optional)</Label>
                <Select value={form.division} onValueChange={(v) => setForm({ ...form, division: v })}>
                  <SelectTrigger className="font-body"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No division</SelectItem>
                    {DIVISION_OPTIONS.map((d) => (
                      <SelectItem key={d} value={d}>{divisionLabels[d]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Only a record of where they belonged. It grants nothing.</p>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="invite-note">Note (optional)</Label>
                <Textarea
                  id="invite-note" rows={2} value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="Why they are being invited, for whoever reads this register later."
                />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <Button onClick={submit} disabled={!formValid || sending}>
                {sending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending</> : <><Send className="h-4 w-4 mr-2" />Send invitation</>}
              </Button>
              <p className="text-xs text-muted-foreground">
                They receive an email with a link to set a password. Their access is ready from the moment they use it.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ==============================================================
          THE REGISTER. Who was invited, as what, by whom, and whether
          they ever arrived. Kept forever, including revoked invitations,
          because "did anyone ever invite her?" is asked months later.
          ============================================================== */}
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <h3 className="font-serif text-lg text-accent">Invitations</h3>
        <span className="font-body text-xs text-muted-foreground">
          {invites.length === 0 ? 'none yet'
            : `${invites.length} in total${waiting ? ` · ${waiting} waiting` : ''}`}
        </span>
      </div>

      {loading ? <WorkspaceLoader /> : invites.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <p className="font-body text-muted-foreground">
            Nobody has been invited yet. Advisors and alumni invited from here get an account without needing a
            university address.
          </p>
        </CardContent></Card>
      ) : (
        <div className="border border-separator overflow-x-auto">
          <table className="w-full text-left font-body text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-normal">Name</th>
                <th className="px-3 py-2 font-normal">Email</th>
                <th className="px-3 py-2 font-normal">Invited as</th>
                <th className="px-3 py-2 font-normal">Division</th>
                <th className="px-3 py-2 font-normal">State</th>
                <th className="px-3 py-2 font-normal">Sent</th>
                <th className="px-3 py-2 font-normal">By</th>
                {canManage && <th className="px-3 py-2 font-normal text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {ordered.map((i) => {
                const state = inviteState(i);
                return (
                  <tr key={i.id} className="border-t border-separator align-top">
                    <td className="px-3 py-2 text-foreground whitespace-nowrap">{i.full_name}</td>
                    <td className="px-3 py-2 break-all">{i.email}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{INVITABLE_ROLE_LABELS[i.role]}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {i.division ? divisionLabels[i.division] : <span className="text-muted-foreground">-</span>}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 text-xs border ${INVITE_STATE_CLASS[state]}`}>
                        {INVITE_STATE_LABELS[state]}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                      {new Date(i.last_sent_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                      {i.send_count > 1 && <span className="text-xs"> · {i.send_count}x</span>}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{i.invited_name || '-'}</td>
                    {canManage && (
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {state === 'pending' ? (
                          <div className="inline-flex gap-1.5">
                            <Button variant="outline" size="sm" disabled={busy === i.id} onClick={() => doResend(i)}>
                              {busy === i.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><RotateCcw className="h-3.5 w-3.5 mr-1.5" />Resend</>}
                            </Button>
                            <Button variant="outline" size="sm" className="text-destructive border-destructive/40 hover:bg-destructive/10"
                              disabled={busy === i.id} onClick={() => setPendingRevoke(i)}>
                              <Ban className="h-3.5 w-3.5 mr-1.5" />Revoke
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {state === 'accepted' ? 'Manage in Settings, Users' : 'No longer valid'}
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AlertDialog open={!!pendingRevoke} onOpenChange={(o) => { if (!o && !busy) setPendingRevoke(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRevoke && (
                <>
                  {pendingRevoke.full_name} will no longer be able to use the link sent to {pendingRevoke.email},
                  and the access it carried is withdrawn. The record of the invitation is kept, so it stays
                  clear who invited whom and when. You can send a new invitation to the same address afterwards.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingRevoke && doRevoke(pendingRevoke)}>Revoke invitation</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
