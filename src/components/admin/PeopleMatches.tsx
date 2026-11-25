import { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { friendlyError } from '@/lib/errors';
import { HelpDot } from '@/components/admin/help/HelpSystem';
import { decideMatch, fetchMatchProposals, type MatchPair, type MatchSide } from '@/lib/rosters-api';

// =====================================================================
// POSSIBLY THE SAME PERSON (Step 108), in People > Time Machine.
// ---------------------------------------------------------------------
// Two records that may be one person: a middle name more or less
// ("Matteo Persico" and "Matteo Luigi Persico"), or the same words in
// another order. The database never joins them on its own; the
// President or the Vice-President answers, with what each record holds
// side by side. "Same person" joins them under the name chosen, with
// their semesters, reports, alumni entry and event attendance; "Not the
// same" keeps them apart, and the pair is not asked again. Names that
// are the same once accents are set aside were joined automatically.
// =====================================================================

const RECORD_LABEL: Record<string, string> = { member: 'Member record', alumni: 'Alumni entry' };

function Side({ side, chosen, choosing, onChoose }: { side: MatchSide; chosen: boolean; choosing: boolean; onChoose: () => void }) {
  const span = side.semesters
    ? `${side.first === side.last ? side.first : `${side.first} to ${side.last}`} · ${side.semesters} ${side.semesters === 1 ? 'semester' : 'semesters'}`
    : 'No semester in the history';
  const records = side.records.length ? side.records.map((r) => RECORD_LABEL[r] ?? r).join(', ') : 'History only';
  return (
    <div className={`min-w-0 flex-1 border px-3 py-2.5 ${chosen && choosing ? 'border-accent bg-accent/[0.04]' : 'border-separator bg-background'}`}>
      {choosing ? (
        <label className="flex cursor-pointer items-start gap-2">
          <input type="radio" className="mt-1 accent-[hsl(var(--accent))]" checked={chosen} onChange={onChoose} name="keep-name" />
          <span className="min-w-0">
            <span className="block font-serif text-lg leading-tight text-accent">{side.name}</span>
            <span className="block text-xs text-muted-foreground">Keep this name</span>
          </span>
        </label>
      ) : (
        <p className="font-serif text-lg leading-tight text-accent">{side.name}</p>
      )}
      <dl className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
        <div><dt className="sr-only">Records</dt><dd>{records}</dd></div>
        <div><dt className="sr-only">Semesters</dt><dd>{span}</dd></div>
        {side.last_role && <div><dt className="sr-only">Last role</dt><dd className="text-foreground/80">{side.last_role}</dd></div>}
      </dl>
    </div>
  );
}

export function PeopleMatches({ onChanged }: { onChanged?: () => void }) {
  const { session } = useAuth();
  const { toast } = useToast();
  const [pairs, setPairs] = useState<MatchPair[] | null>(null);
  const [joining, setJoining] = useState<{ index: number; keep: string } | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(() => {
    fetchMatchProposals(session).then(setPairs).catch(() => setPairs([]));
  }, [session]);
  useEffect(() => { load(); }, [load]);

  if (!pairs || pairs.length === 0) return null;

  const answer = async (index: number, decision: 'same' | 'different', keep?: string) => {
    const p = pairs[index];
    setBusy(index);
    try {
      await decideMatch(session, p.a.id, p.b.id, decision, keep);
      toast({
        title: decision === 'same' ? 'Joined into one person' : 'Kept as two people',
        description: decision === 'same'
          ? `${keep === p.b.id ? p.b.name : p.a.name} now holds the semesters, reports and records of both.`
          : 'This pair will not be asked again.',
      });
      setJoining(null);
      setPairs((cur) => (cur ? cur.filter((_, i) => i !== index) : cur));
      onChanged?.();
    } catch (e) {
      toast({ title: 'Not saved', description: friendlyError(e), variant: 'destructive' });
      load();
    } finally {
      setBusy(null);
    }
  };

  return (
    <section aria-labelledby="people-matches" className="mb-5 border border-separator bg-muted/30 p-4 font-body">
      <div className="mb-1 flex items-center gap-2">
        <Users className="h-4 w-4 text-accent" aria-hidden="true" />
        <h2 id="people-matches" className="font-serif text-xl text-accent">Possibly the same person</h2>
        <span className="text-sm text-muted-foreground">({pairs.length})</span>
        <HelpDot page="people-rosters" topic="same-person" />
      </div>
      <p className="mb-3 text-sm text-muted-foreground">
        Two records whose names differ by a middle name or by the order of the words. Nothing is joined until you answer.
      </p>
      <ul className="space-y-3">
        {pairs.map((p, i) => {
          const choosing = joining?.index === i;
          return (
            <li key={`${p.a.id}-${p.b.id}`} className="border border-separator bg-background p-3">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Side side={p.a} choosing={choosing} chosen={joining?.keep === p.a.id} onChoose={() => setJoining({ index: i, keep: p.a.id })} />
                <Side side={p.b} choosing={choosing} chosen={joining?.keep === p.b.id} onChoose={() => setJoining({ index: i, keep: p.b.id })} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {choosing ? (
                  <>
                    <Button size="sm" className="h-11 lg:h-9" disabled={busy === i} onClick={() => answer(i, 'same', joining.keep)}>
                      {busy === i ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
                      Join them under this name
                    </Button>
                    <Button size="sm" variant="ghost" className="h-11 lg:h-9" disabled={busy === i} onClick={() => setJoining(null)}>Cancel</Button>
                    <span className="text-xs text-muted-foreground">Their semesters, reports, alumni entry and event attendance all move to one record.</span>
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="outline" className="h-11 lg:h-9" disabled={busy === i}
                      onClick={() => setJoining({ index: i, keep: p.b.semesters >= p.a.semesters ? p.b.id : p.a.id })}>
                      <Check className="h-4 w-4" aria-hidden="true" />Same person
                    </Button>
                    <Button size="sm" variant="ghost" className="h-11 lg:h-9" disabled={busy === i} onClick={() => answer(i, 'different')}>
                      {busy === i ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <X className="h-4 w-4" aria-hidden="true" />}
                      Not the same
                    </Button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
