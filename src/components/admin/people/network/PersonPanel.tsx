import { MapPin, UserMinus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { NetworkPerson, NetworkRead, NetworkTieRow } from '@/lib/people-network-api';
import { MEASURES, groupsLine, periodOf, plural, rankIn, rankOf, sharedLine, valueOf, type Measure } from './network-view';

// =====================================================================
// One person in the network (People > Network, Step 111): their four
// ranks (with how close they come to the first), what they took part in,
// their community, their strongest ties and how strong each is, and their
// overall rank at the end of each semester.
// =====================================================================

/** "3.25" from 3.25, "2" from 2. */
const weightText = (w: number) => (Math.round(w * 100) / 100).toLocaleString('en-GB', { maximumFractionDigits: 2 });

export function PersonPanel({ person, index, data, people, ties, best, onClose, onPick, onShowOnMap, onLeaveOut }: {
  person: NetworkPerson | null;
  index: number | null;
  data: NetworkRead;
  people: NetworkPerson[];
  /** This person's ties, strongest first. */
  ties: NetworkTieRow[];
  /** The highest score on each measure, for the bars. */
  best: Record<Measure, number>;
  onClose: () => void;
  onPick: (index: number) => void;
  /** Close the panel and show this person on the map. */
  onShowOnMap: (index: number) => void;
  /** Only for the people who manage the page. */
  onLeaveOut?: (p: NetworkPerson) => void;
}) {
  const total = people.length;
  const community = person?.community ? people.filter((p) => p.community === person.community) : [];
  const lead = community.reduce<NetworkPerson | null>((a, b) => (!a || b.rank_overall < a.rank_overall ? b : a), null);
  const path = person
    ? data.semesters.map((s) => ({ label: s.label, rank: rankIn(s.ranks, person.node, 'overall'), of: s.summary?.people ?? 0 }))
      .filter((x) => x.rank !== null)
    : [];
  const strongest = ties.slice(0, 8);
  const heaviest = strongest[0]?.[2] ?? 1;
  return (
    <Dialog open={!!person} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
        {person && (
          <>
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl font-normal text-accent">{person.name}</DialogTitle>
              <DialogDescription>
                {periodOf(person, data.current)}. Tied to {plural(person.degree, 'person', 'people')} through {groupsLine(person.groups)}.
              </DialogDescription>
            </DialogHeader>

            <dl className="grid grid-cols-2 gap-px border border-separator bg-separator font-body sm:grid-cols-4" data-network-ranks>
              {MEASURES.map((m) => {
                const share = Math.max(0, Math.min(1, valueOf(person, m.key) / (best[m.key] || 1)));
                return (
                  <div key={m.key} className="bg-background px-3 py-3">
                    <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{m.label}</dt>
                    <dd className="mt-1 font-serif text-2xl text-foreground">
                      #{rankOf(person, m.key)}
                      <span className="ml-1 font-body text-xs text-muted-foreground">of {total}</span>
                    </dd>
                    <dd className="mt-1.5" aria-hidden="true">
                      <span className="block h-1 w-full bg-muted">
                        <span className="block h-1 bg-accent" style={{ width: `${Math.max(2, Math.round(share * 100))}%` }} />
                      </span>
                    </dd>
                    <dd className="mt-1 text-[11px] text-muted-foreground">{Math.round(share * 100)}% of the first</dd>
                  </div>
                );
              })}
            </dl>

            {person.community > 0 && (
              <p className="font-body text-sm text-muted-foreground">
                Community {person.community}: {plural(community.length, 'person', 'people')}
                {lead && lead.node !== person.node ? `, the best placed of whom is ${lead.name}` : ', and this person is the best placed in it'}.
              </p>
            )}

            <section>
              <h3 className="mb-1 font-serif text-lg text-accent">Strongest ties</h3>
              <p className="mb-2 font-body text-xs text-muted-foreground">
                The strength adds up what two people shared, each time: 1.5 for President and Vice-President, 1.25 for a head with either of them, 1 for a report together or two heads on the same Board, 0.5 for a semester in the same division, and 0.5 for the head and a new joiner of their division.
              </p>
              {strongest.length === 0 ? (
                <p className="font-body text-sm text-muted-foreground">No ties yet.</p>
              ) : (
                <ul className="divide-y divide-separator border border-separator font-body" data-network-person-ties>
                  {strongest.map((t) => {
                    const other = t[0] === index ? t[1] : t[0];
                    const p = people[other];
                    return (
                      <li key={`${t[0]}-${t[1]}`}>
                        <button
                          type="button"
                          data-ro
                          onClick={() => onPick(other)}
                          className="flex w-full min-h-11 flex-col items-stretch gap-1 px-3 py-2 text-left hover:bg-muted/40"
                        >
                          <span className="flex items-baseline justify-between gap-3">
                            <span className="text-[15px] text-foreground">{p?.name}</span>
                            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">Strength {weightText(t[2])}</span>
                          </span>
                          <span className="block h-1 w-full bg-muted" aria-hidden="true">
                            <span className="block h-1 bg-accent/70" style={{ width: `${Math.max(3, Math.round((t[2] / heaviest) * 100))}%` }} />
                          </span>
                          <span className="text-xs text-muted-foreground">{sharedLine(t) || 'President and Vice-President together'}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {ties.length > strongest.length && (
                <p className="mt-1 font-body text-xs text-muted-foreground">And {plural(ties.length - strongest.length, 'other tie')}: see them on the map.</p>
              )}
            </section>

            {path.length > 0 && (
              <section>
                <h3 className="mb-2 font-serif text-lg text-accent">Overall rank at the end of each semester</h3>
                <ol className="flex flex-wrap gap-x-4 gap-y-1 font-body text-sm" data-network-path>
                  {path.map((x) => (
                    <li key={x.label} className="text-muted-foreground">
                      {x.label} <span className="text-foreground">#{x.rank}</span><span className="text-xs"> of {x.of}</span>
                    </li>
                  ))}
                  <li className="text-muted-foreground">Now <span className="text-foreground">#{person.rank_overall}</span><span className="text-xs"> of {total}</span></li>
                </ol>
              </section>
            )}

            <div className="flex flex-col gap-3 border-t border-separator pt-3">
              <div className="flex flex-wrap gap-2">
                {index !== null && (
                  <Button data-ro variant="outline" className="h-11 lg:h-10" onClick={() => onShowOnMap(index)}>
                    <MapPin className="mr-2 h-4 w-4" aria-hidden="true" />
                    Show on the map
                  </Button>
                )}
                {onLeaveOut && (
                  <Button variant="outline" className="h-11 lg:h-10" onClick={() => onLeaveOut(person)}>
                    <UserMinus className="mr-2 h-4 w-4" aria-hidden="true" />
                    Leave out of the analysis
                  </Button>
                )}
              </div>
              {onLeaveOut && (
                <p className="font-body text-xs text-muted-foreground">
                  Leave out is for a person who objected (Privacy Policy, section 8): they are taken out of the network and every stored result about them is deleted.
                </p>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default PersonPanel;
