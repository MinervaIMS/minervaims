import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { DeclarationBody } from '@/components/shared/DeclarationBody';
import { workspacePath } from '@/lib/workspace-nav';
import {
  ONE_ASSOCIATION, declarationSettings, launchCommitment, listDeclarations,
  saveCommitmentSettings, sendDeclarationTests,
  type CommitmentCampaign, type CommitmentSettings, type DeclarationSwitches, type SignedDocument,
} from '@/lib/declarations-api';

// =====================================================================
// Settings, Declarations (Step 97).
// ---------------------------------------------------------------------
// What the Board keeps about signatures:
//   * the one-association declaration: its text, and where it is asked
//     for at the moment. The three switches themselves are on Recruiting >
//     Application Page, with the rest of the round; here they are read;
//   * the semester commitment: from which semester it launches with the
//     application window, when its one reminder goes, and a launch by hand;
//   * the register of signed declarations. The signature in the Workspace
//     is the record: nothing is printed and nobody countersigns.
// =====================================================================

const shortDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

const SWITCH_LABELS: [keyof DeclarationSwitches, string][] = [
  ['declaration_at_offer', 'Signed to accept an offer'],
  ['declaration_at_commitment', 'Signed with the semester commitment'],
  ['declaration_on_join', 'Explained on the Join page'],
];

export default function SettingsDeclarations() {
  const { session } = useAuth();
  const { toast } = useToast();
  const { canManage } = useAccess();
  const manage = canManage('settings-declarations');

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState<CommitmentSettings | null>(null);
  const [campaigns, setCampaigns] = useState<CommitmentCampaign[]>([]);
  const [applications, setApplications] = useState<({ semester_label: string; start_date: string | null; end_date: string | null } & Partial<DeclarationSwitches>) | null>(null);
  const [docs, setDocs] = useState<SignedDocument[]>([]);
  const [first, setFirst] = useState('');
  const [days, setDays] = useState('5');
  const [confirmLaunch, setConfirmLaunch] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [s, d] = await Promise.all([declarationSettings(session), listDeclarations(session)]);
      setSettings(s.settings); setCampaigns(s.campaigns); setApplications(s.applications);
      setFirst(s.settings.commitment_first_semester); setDays(String(s.settings.commitment_reminder_days));
      setDocs(d);
    } catch (e) {
      toast({ title: 'Could not load the declarations', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setLoading(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const run = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try { await fn(); toast({ title: done }); await load(); }
    catch (e) { toast({ title: 'That did not work', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  const label = applications?.semester_label ?? '';
  const launched = campaigns.some((c) => c.semester_label === label);

  if (loading && !settings) return <div><WorkspacePageHeader title="Declarations" description="The one-association declaration and the semester commitment." /><WorkspaceLoader /></div>;

  return (
    // Phone-sized fields and buttons (Step 98).
    <div className="font-body ws-form-touch">
      <WorkspacePageHeader
        title="Declarations"
        description="The one-association declaration and the semester commitment: where the declaration is asked for, the commitment of each semester, and who has signed."
      />

      {/* ── The declaration ─────────────────────────────────────── */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <h2 className="font-serif text-lg text-accent">{ONE_ASSOCIATION.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-3xl">
            A signature of its own, in the Workspace: a typed name, a ticked box and the time, exactly as an offer is
            accepted. The signer receives a short email confirming it. The Statute in force does not deal with
            membership of other associations, so the declaration is a condition of membership approved by the Board of
            Directors.
          </p>
          <dl className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl">
            {SWITCH_LABELS.map(([k, l]) => (
              <div key={k} className="border border-separator p-3">
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">{l}</dt>
                <dd className={`mt-1 text-sm ${applications?.[k] ? 'text-accent' : 'text-muted-foreground'}`}>{applications?.[k] ? 'On' : 'Off'}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-sm">
            <Link to={workspacePath('applications', 'applications-website')} className="text-accent underline underline-offset-4">
              Switch these on or off in Recruiting, Application Page
            </Link>
          </p>
          <div className="mt-4 border border-separator p-4 text-sm text-foreground space-y-2 max-w-3xl">
            <DeclarationBody text={ONE_ASSOCIATION} className="space-y-2" />
            <p className="text-xs text-muted-foreground">Text version {ONE_ASSOCIATION.version}. Every signature keeps the version and a fingerprint of the words it signed.</p>
          </div>
        </CardContent>
      </Card>

      {/* ── The semester commitment ────────────────────────────── */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <h2 className="font-serif text-lg text-accent">Semester commitment</h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-3xl">
            When a semester&rsquo;s application window opens, every active member (Advisors excepted) is asked by email to
            confirm or decline their commitment, in My Profile, and receives one reminder if they have not answered. Each
            member&rsquo;s answer shows in People, Members.
          </p>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl">
            <div className="space-y-1.5">
              <Label htmlFor="c-first">Launch with the application window from</Label>
              <Input id="c-first" className="rounded-none" value={first} disabled={!manage} onChange={(e) => setFirst(e.target.value)} placeholder="Spring 2027" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-days">The one reminder, after</Label>
              <Select value={days} onValueChange={setDays} disabled={!manage}>
                <SelectTrigger id="c-days" className="rounded-none"><SelectValue /></SelectTrigger>
                <SelectContent>{[2, 3, 4, 5, 7, 10, 14].map((n) => <SelectItem key={n} value={String(n)}>{n} days</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" disabled={!manage || busy} onClick={() => run(() => saveCommitmentSettings(session, { commitment_first_semester: first.trim(), commitment_reminder_days: Number(days) }), 'Saved')}>Save</Button>
            </div>
          </div>
          <div className="mt-6 text-sm">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Campaigns</div>
            {campaigns.length === 0 ? <p className="text-muted-foreground">None launched yet.</p> : (
              <ul className="space-y-1">
                {campaigns.map((c) => <li key={c.semester_label}>{c.semester_label}: launched {shortDate(c.launched_at)}{c.launch_kind === 'manual' ? ' by hand' : ' with the application window'}.</li>)}
              </ul>
            )}
          </div>
          {manage && (
            <div className="mt-4 flex flex-wrap gap-3">
              {label && !launched && (
                <Button disabled={busy} onClick={() => setConfirmLaunch(true)}>Launch the commitment for {label} now</Button>
              )}
              <Button variant="outline" disabled={busy} onClick={() => run(() => sendDeclarationTests(session), 'Test emails sent to your address')}>Send me a test of the emails</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Who has signed ─────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="font-serif text-lg text-accent">Signed declarations</h2>
          {docs.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Nobody has signed the declaration yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-separator">
                    <th className="py-2 pr-3 font-normal">Signed by</th>
                    <th className="py-2 pr-3 font-normal">When</th>
                    <th className="py-2 pr-3 font-normal">Semester</th>
                    <th className="py-2 font-normal">Text</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((d) => (
                    <tr key={d.id} className="border-b border-separator/60">
                      <td className="py-2 pr-3">{d.typed_name}<div className="text-xs text-muted-foreground">{d.person_email}</div></td>
                      <td className="py-2 pr-3">{shortDate(d.signed_at)}<div className="text-xs text-muted-foreground">{d.context === 'offer' ? 'On accepting an offer' : 'With the semester commitment'}</div></td>
                      <td className="py-2 pr-3">{d.semester_label}</td>
                      <td className="py-2 text-xs text-muted-foreground">{d.text_version}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmLaunch} onOpenChange={setConfirmLaunch}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Launch the commitment for {label}?</AlertDialogTitle>
            <AlertDialogDescription>
              Every active member, Advisors excepted, receives the email asking them to confirm or decline, now, and one reminder later if they have not answered. This happens once per semester and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 lg:h-10">Cancel</AlertDialogCancel>
            <AlertDialogAction className="h-11 lg:h-10" onClick={() => { setConfirmLaunch(false); run(() => launchCommitment(session, label), `The commitment for ${label} is launched`); }}>Launch and send</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
