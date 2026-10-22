import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, UserCheck, UserX } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { divisionLabels, type OrgDivision } from '@/lib/roles';
import { listAttendanceMembers, linkRegistrationMember, type AttendanceMember, type EventRegistration } from '@/lib/events-api';

// =====================================================================
// "Link to member": settle who a registration is.
// ---------------------------------------------------------------------
// A name two members share is counted for nobody ("Needs linking") until
// somebody says which of them it is. The members carrying that name come
// first; anybody else on the register can be searched; and "Not a member"
// says the row is a guest who happens to share a name. Whatever is chosen
// is stored on the row and never changed automatically afterwards, so the
// count in People > Members follows it at once and stays put.
// =====================================================================

export interface LinkResult {
  member_id: string | null;
  member_name: string | null;
  member_division: OrgDivision | null;
}

const fullName = (m: Pick<AttendanceMember, 'first_name' | 'surname'>) => `${m.first_name ?? ''} ${m.surname ?? ''}`.trim();

export function LinkMemberDialog({ reg, onOpenChange, onLinked }: {
  reg: EventRegistration | null;
  onOpenChange: (open: boolean) => void;
  onLinked: (reg: EventRegistration, result: LinkResult) => void;
}) {
  const { session } = useAuth();
  const { toast } = useToast();
  const [roster, setRoster] = useState<AttendanceMember[] | null>(null);
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!reg) return;
    setQuery('');
    if (roster === null) {
      listAttendanceMembers(session).then(setRoster).catch(() => setRoster([]));
    }
  }, [reg, roster, session]);

  const candidates = useMemo(() => reg?.member_candidates ?? [], [reg]);
  const found = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !roster) return [];
    const skip = new Set(candidates.map((c) => c.id));
    return roster
      .filter((m) => !skip.has(m.id) && `${fullName(m)} ${m.email ?? ''}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, roster, candidates]);

  const choose = async (memberId: string | null, name: string | null, division: OrgDivision | null) => {
    if (!reg) return;
    setSaving(memberId ?? 'none');
    try {
      await linkRegistrationMember(session, reg.id, memberId);
      onLinked(reg, { member_id: memberId, member_name: name, member_division: division });
      toast({ title: memberId ? `Linked to ${name}` : 'Marked as not a member', description: memberId ? 'Counted for this member in People, Members.' : 'Counted for nobody.' });
      onOpenChange(false);
    } catch (e) {
      toast({ title: 'Could not link', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const row = (id: string, name: string, division: OrgDivision | null, hint?: string | null) => (
    <button
      key={id}
      type="button"
      disabled={!!saving}
      onClick={() => choose(id, name, division)}
      className="flex w-full items-center justify-between gap-3 border border-separator px-3 py-2.5 text-left text-sm hover:border-accent hover:bg-accent/5 disabled:opacity-60"
    >
      <span className="min-w-0">
        <span className="block truncate text-foreground">{name}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {[division ? divisionLabels[division] : null, hint].filter(Boolean).join(' · ') || 'Member'}
        </span>
      </span>
      {saving === id ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden /> : <UserCheck className="h-4 w-4 shrink-0 text-accent" aria-hidden />}
    </button>
  );

  return (
    <Dialog open={!!reg} onOpenChange={(o) => { if (!saving) onOpenChange(o); }}>
      <DialogContent className="w-[min(96vw,30rem)] max-w-[min(96vw,30rem)] font-body">
        <DialogHeader className="text-left">
          <DialogTitle className="font-serif">Link to member</DialogTitle>
          <DialogDescription>
            {reg?.member_ambiguous
              ? <>“{reg?.name}” matches more than one member by name, so it is counted for nobody. Choose who it is.</>
              : <>Who is “{reg?.name}”? The choice is kept, and the events-attended count in People, Members follows it.</>}
          </DialogDescription>
        </DialogHeader>

        {candidates.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Members with this name</div>
            {candidates.map((c) => row(c.id, c.name, c.division))}
          </div>
        )}

        <div className="space-y-2">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{candidates.length ? 'Somebody else' : 'Find the member'}</div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={roster === null ? 'Loading the register…' : 'Search by name or email'}
              className="pl-9"
              autoComplete="off"
              aria-label="Search the register of members"
            />
          </div>
          {found.map((m) => row(m.id, fullName(m), m.division, m.email))}
          {query.trim() && roster && found.length === 0 && (
            <p className="text-xs text-muted-foreground">Nobody on the register matches.</p>
          )}
        </div>

        <div className="flex justify-end border-t border-separator pt-4">
          <Button variant="outline" disabled={!!saving} onClick={() => choose(null, null, null)}>
            {saving === 'none' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <UserX className="mr-2 h-4 w-4" aria-hidden />}
            Not a member
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
