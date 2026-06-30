import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, User as UserIcon, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { roleLabel as composeRoleLabel } from '@/lib/roles';
import { redeemProfile, type ClaimableMember } from '@/lib/members-api';

interface Props {
  open: boolean;
  claimable: ClaimableMember[];
  onRedeemed: () => void;
}

/**
 * First-login redemption: a user whose email is not yet linked to a member
 * chooses their existing placeholder, or confirms they are new. On success
 * the page reloads so the session-wide profile (header photo, My Profile,
 * roster) refreshes from the now-linked record.
 */
export default function RedeemProfileDialog({ open, claimable, onRedeemed }: Props) {
  const { session } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return claimable.filter((c) => !q || `${c.first_name} ${c.surname}`.toLowerCase().includes(q));
  }, [claimable, search]);

  const submit = async (choice: { memberId?: string; create?: boolean }) => {
    setSubmitting(true);
    try {
      await redeemProfile(session, choice);
      toast({ title: 'Welcome', description: 'Your profile has been set up.' });
      onRedeemed();
    } catch (e) {
      toast({ title: 'Could not complete', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="font-serif">Set up your profile</DialogTitle>
          <DialogDescription className="font-body">
            Your login isn’t linked to a member profile yet. If you find yourself in the list below, select your name to claim your profile. Otherwise, continue as a new member.
          </DialogDescription>
        </DialogHeader>

        {claimable.length > 0 && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-10 font-body" placeholder="Find your name…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="max-h-64 overflow-y-auto border border-separator divide-y divide-separator">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelected(c.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left font-body ${selected === c.id ? 'bg-[#ece9f4]' : 'hover:bg-muted/60'}`}
                >
                  <span className="w-9 h-9 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0">
                    {c.photo_url ? <img src={c.photo_url} alt="" className="w-full h-full object-cover" /> : <UserIcon className="h-4 w-4 text-muted-foreground" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-foreground truncate">{c.first_name} {c.surname}</span>
                    <span className="block text-xs text-muted-foreground truncate">{composeRoleLabel(c.role, c.division)}</span>
                  </span>
                </button>
              ))}
              {filtered.length === 0 && <div className="px-3 py-6 text-center text-sm text-muted-foreground font-body">No matches.</div>}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button className="flex-1 font-body" disabled={!selected || submitting} onClick={() => selected && submit({ memberId: selected })}>
            {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Claiming</> : 'Claim selected profile'}
          </Button>
          <Button variant="outline" className="font-body" disabled={submitting} onClick={() => submit({ create: true })}>
            I’m new here
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
