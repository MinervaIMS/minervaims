import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, Loader2, RefreshCw, Search, Undo2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { friendlyError } from '@/lib/errors';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { HelpDot } from '@/components/admin/help/HelpSystem';
import { Segmented } from '@/components/admin/career/gpa/shared';
import { Pinned, REGISTER_FIRST_COLUMN, REGISTER_HEAD, RegisterFrame, RegisterPage } from '@/components/admin/kit/Register';
import { Detail, RecordCard, RecordList } from '@/components/admin/kit/RecordCard';
import { bringBack, leaveOut, readNetwork, recomputeNetwork, type NetworkPerson, type NetworkRead } from '@/lib/people-network-api';
import NetworkMap from './network/NetworkMap';
import NetworkTrend, { type TrendSeries } from './network/NetworkTrend';
import PersonPanel from './network/PersonPanel';
import {
  MEASURES, TIE_TABLE, climbers, communitiesOf, communityColour, dateTime, groupsLine, movement, periodOf, plural,
  previousPoint, rankIn, rankOf, shortDate, tiesByPerson, timeOf, upperPart, valueOf, type Measure,
} from './network/network-view';

// =====================================================================
// PEOPLE > NETWORK (Step 111).
// ---------------------------------------------------------------------
// The network of the Society, after Soda, Iorio and Rizzo (Social
// Networks, 2025): everyone who is or was a member, tied to the people
// they wrote a report with, served on a Board with (the President and the
// Vice-President most closely), shared a division with in the same
// semester, or interviewed as new joiners of their division (or were
// interviewed by), each kind of tie with its own weight. Who is
// best placed in it, by status, mediation and coalition building, and how
// that moves week by week and semester by semester.
//
// Everyone is measured in the one network. "In the Society now" only
// narrows the lists to this semester's members, the people who could hold
// an office next, as the study ranked only the cardinals who could vote.
//
// Open to the Board, alumni and advisors (the role matrix, `people-
// network`); the President and the Vice-President also recalculate and
// leave out a person who objected. The analysis runs on the server
// (`people-network`, nightly); the page only shows it.
// =====================================================================

type View = 'best' | 'map' | 'time' | 'method';
type Who = 'all' | 'now';
const VIEWS: { value: View; label: string }[] = [
  { value: 'best', label: 'Best placed' },
  { value: 'map', label: 'Map' },
  { value: 'time', label: 'Over time' },
  { value: 'method', label: 'Method' },
];
const WHO: { value: Who; label: string }[] = [
  { value: 'all', label: 'Everyone' },
  { value: 'now', label: 'In the Society now' },
];
const FIRST_ROWS = 25;
const MAX_SERIES = 8;

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function Movement({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-muted-foreground">New</span>;
  if (value === 0) return <span className="text-xs text-muted-foreground">Same</span>;
  return value > 0
    ? <span className="inline-flex items-center gap-0.5 text-xs text-green-700"><ArrowUp className="h-3 w-3" aria-hidden="true" />{value}<span className="sr-only"> places up</span></span>
    : <span className="inline-flex items-center gap-0.5 text-xs text-destructive"><ArrowDown className="h-3 w-3" aria-hidden="true" />{-value}<span className="sr-only"> places down</span></span>;
}

/** A figure of the summary, as My Profile draws its own. */
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-separator bg-background px-3 py-2.5 sm:px-4 sm:py-3">
      <div className="truncate font-serif text-lg leading-tight text-accent tabular-nums sm:text-2xl">{value}</div>
      <div className="mt-0.5 text-[11px] uppercase leading-snug tracking-wider text-muted-foreground sm:text-xs">{label}</div>
    </div>
  );
}

/** How strong a measure is for this person, against the first: a thin bar. */
function Bar({ share }: { share: number }) {
  return (
    <span className="mt-1 block h-1 w-full bg-muted" aria-hidden="true">
      <span className="block h-1 bg-accent" style={{ width: `${Math.max(2, Math.round(share * 100))}%` }} />
    </span>
  );
}

export default function PeopleNetwork() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<NetworkRead | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<View>('best');
  const [who, setWho] = useState<Who>('all');
  const [measure, setMeasure] = useState<Measure>('overall');
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [community, setCommunity] = useState<number | null>(null);
  const [strongOnly, setStrongOnly] = useState(false);
  const [trendMode, setTrendMode] = useState<'semesters' | 'weeks'>('semesters');
  const [picked, setPicked] = useState<string[] | null>(null);
  const [leaving, setLeaving] = useState<NetworkPerson | null>(null);
  const [note, setNote] = useState('');
  /** Raised by Show on the map: once the map is drawn, bring it into view. */
  const [reveal, setReveal] = useState(0);
  const mapBox = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!reveal) return;
    const t = window.setTimeout(() => mapBox.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 120);
    return () => window.clearTimeout(t);
  }, [reveal]);

  const load = useCallback(async () => {
    try {
      setFailed(null);
      setData(await readNetwork(session));
    } catch (e) {
      setFailed(friendlyError(e));
    }
  }, [session]);
  useEffect(() => { void load(); }, [load]);

  const people = useMemo(() => data?.latest?.scores ?? [], [data]);
  const ties = useMemo(() => data?.latest?.ties ?? [], [data]);
  const tiesOf = useMemo(() => tiesByPerson(ties, people.length), [ties, people.length]);
  const indexOf = useMemo(() => new Map(people.map((p, i) => [p.node, i])), [people]);
  const prev = useMemo(() => (data ? previousPoint(data) : null), [data]);
  const lastSemester = data?.semesters[data.semesters.length - 1];
  const communities = useMemo(() => communitiesOf(people), [people]);
  const nowCount = useMemo(() => people.filter((p) => p.is_current).length, [people]);
  const best = useMemo(() => {
    const max = (m: Measure) => Math.max(1e-9, ...people.map((p) => valueOf(p, m)));
    return { overall: max('overall'), status: max('status'), mediation: max('mediation'), coalition: max('coalition') } as Record<Measure, number>;
  }, [people]);

  /** The people the lists show: everyone, or this semester's members. */
  const pool = useMemo(() => (who === 'now' ? people.filter((p) => p.is_current) : people), [people, who]);
  const ranked = useMemo(() => {
    const q = fold(query.trim());
    return [...pool]
      .sort((a, b) => rankOf(a, measure) - rankOf(b, measure) || a.name.localeCompare(b.name))
      .map((p, k) => ({ p, place: k + 1 }))
      .filter(({ p }) => !q || fold(p.name).includes(q));
  }, [pool, measure, query]);
  const shown = showAll || query ? ranked : ranked.slice(0, FIRST_ROWS);

  const run = async () => {
    setBusy(true);
    try {
      const r = await recomputeNetwork(session);
      toast({
        title: 'Network recalculated',
        description: `${plural(r.summary.people, 'person', 'people')}, ${plural(r.summary.ties, 'tie')}.${r.history.pending ? ` ${plural(r.history.pending, 'semester')} still to analyse: they follow tonight.` : ''}`,
      });
      await load();
    } catch (e) {
      toast({ title: 'Not recalculated', description: friendlyError(e), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const confirmLeave = async () => {
    if (!leaving) return;
    setBusy(true);
    try {
      await leaveOut(session, leaving.node, leaving.name, note);
      toast({ title: `${leaving.name} is left out`, description: 'Their results are deleted and the network is recalculated without them.' });
      setLeaving(null); setNote(''); setOpen(null); setSelected(null);
      await load();
    } catch (e) {
      toast({ title: 'Not left out', description: friendlyError(e), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const restore = async (node: string, name: string) => {
    setBusy(true);
    try {
      await bringBack(session, node);
      toast({ title: `${name} is back in the analysis` });
      await load();
    } catch (e) {
      toast({ title: 'Not brought back', description: friendlyError(e), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const openPerson = (i: number | null) => { setSelected(i); setOpen(i); };
  const openNode = (node: string) => openPerson(indexOf.get(node) ?? null);

  const header = (
    <WorkspacePageHeader
      title="Network"
      description="Who is best placed in the network of the Society: everyone who is or was a member, tied by the reports they wrote together, the Boards they served on together, the divisions they shared and the heads who interviewed them."
      actions={data?.canManage ? (
        <Button variant="outline" className="h-11 font-body lg:h-10" disabled={busy} onClick={run}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Recalculate now
        </Button>
      ) : undefined}
    />
  );

  if (!data && !failed) return <div className="ws-network">{header}<WorkspaceLoader /></div>;
  if (failed && !data) {
    return (
      <div className="ws-network">
        {header}
        <div className="border border-dashed border-separator px-4 py-6 font-body text-sm">
          <p className="text-foreground">The network could not be read just now.</p>
          <p className="mt-1 text-muted-foreground">{failed}</p>
          <Button data-ro variant="outline" className="mt-3 h-11 lg:h-10" onClick={() => void load()}>Try again</Button>
        </div>
      </div>
    );
  }
  if (!data) return null;

  if (!data.latest) {
    return (
      <div className="ws-network">
        {header}
        <div className="border border-dashed border-separator px-4 py-6 font-body text-sm" data-network-empty>
          <p className="text-foreground">The network has not been analysed yet.</p>
          <p className="mt-1 text-muted-foreground">
            The analysis runs every night. {data.canManage ? 'Recalculate now to see it straight away.' : 'Come back tomorrow to see it.'}
          </p>
        </div>
      </div>
    );
  }

  const s = data.latest.summary;
  const openP = open !== null ? people[open] ?? null : null;
  const whoLabel = who === 'now' ? 'in the Society now' : 'in the network';

  // ── Over time ────────────────────────────────────────────────────────
  const seriesNodes = (picked ?? [...pool].sort((a, b) => rankOf(a, measure) - rankOf(b, measure)).slice(0, 5).map((p) => p.node))
    .filter((n) => indexOf.has(n));
  const series: TrendSeries[] = seriesNodes.map((n, k) => ({ key: n, name: people[indexOf.get(n)!].name, colour: communityColour(k + 1) }));
  const nowRow = Object.fromEntries([['label', 'Now'], ...seriesNodes.map((n) => [n, rankOf(people[indexOf.get(n)!], measure)])]);
  const points = trendMode === 'semesters'
    ? [...data.semesters.map((p) => Object.fromEntries([['label', p.label], ...seriesNodes.map((n) => [n, rankIn(p.ranks, n, measure)])])), nowRow]
    : [...data.weeks.map((w) => Object.fromEntries([['label', w.week.replace(/^\d{4}-W/, 'Week ')], ...seriesNodes.map((n) => [n, rankIn(w.ranks, n, measure)])])),
      ...(data.latest.kind === 'update' ? [nowRow] : [])];
  const risers = climbers(pool, lastSemester?.ranks, measure, 5, people.length);

  const measureHead = (m: Measure) => {
    const label = MEASURES.find((x) => x.key === m)!;
    return (
      <th key={m} className="px-3 py-2 text-right font-normal" aria-sort={measure === m ? 'ascending' : 'none'}>
        <button type="button" data-ro onClick={() => setMeasure(m)}
          className={`inline-flex items-center gap-1 ${measure === m ? 'text-foreground' : 'hover:text-foreground'}`}
          title={`Rank by ${label.label.toLowerCase()}`}>
          {label.short}
          {measure === m && <ChevronDown className="h-3 w-3" aria-hidden="true" />}
        </button>
      </th>
    );
  };

  return (
    <RegisterPage className="ws-network">
      <Pinned>
        {header}
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3" data-network-summary>
          <Stat value={s.people.toLocaleString('en-GB')} label="People" />
          <Stat value={s.ties.toLocaleString('en-GB')} label="Ties" />
          <Stat value={String(s.communities)} label="Communities" />
          <Stat value={shortDate(data.latest.computed_at)} label={`Updated at ${timeOf(data.latest.computed_at)}`} />
        </div>
        <p className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 font-body text-xs text-muted-foreground" data-network-status>
          <span>Recalculated every night, with a point kept each week.</span>
          {!data.upToDate && <span>New data arrived since the last analysis: it is included tonight.</span>}
          {data.history.ready < data.history.total && (
            <span>Past semesters: {data.history.ready} of {data.history.total} analysed, the rest tonight.</span>
          )}
          <HelpDot page="people-network" />
        </p>
        <div className="mb-6" data-ro>
          <Segmented<View> value={view} onChange={setView} options={VIEWS} label="View of the network" nowrap className="w-full sm:inline-flex sm:w-auto" />
        </div>
      </Pinned>

      {view === 'best' && (
        <>
          <Pinned>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3" data-ro>
              <Segmented<Who> value={who} onChange={(v) => { setWho(v); setShowAll(false); }} options={WHO} label="Who to list" nowrap className="w-full sm:w-auto sm:shrink-0" />
              <span className="font-body text-xs text-muted-foreground">
                {who === 'now'
                  ? `${plural(nowCount, 'member')} of ${data.currentLabel}: those who could hold an office next. Their ranks are still read in the whole network.`
                  : 'Members of today and of the past, in one network.'}
              </span>
            </div>
            <ul className="mb-6 grid grid-cols-1 gap-px border border-separator bg-separator sm:grid-cols-2 xl:grid-cols-4" data-network-firsts>
              {MEASURES.map((m) => {
                const top = [...pool].sort((a, b) => rankOf(a, m.key) - rankOf(b, m.key)).slice(0, 3);
                return (
                  <li key={m.key} className="flex flex-col bg-background px-4 py-4">
                    <span className="font-body text-[11px] uppercase tracking-wider text-muted-foreground">First by {m.label.toLowerCase()}</span>
                    {top[0] ? (
                      <>
                        <button type="button" data-ro onClick={() => openNode(top[0].node)} className="mt-1 text-left font-serif text-xl leading-snug text-accent hover:underline">
                          {top[0].name}
                        </button>
                        <span className="font-body text-xs text-muted-foreground">Tied to {plural(top[0].degree, 'person', 'people')}; {groupsLine(top[0].groups)}</span>
                        <ol className="mt-2 space-y-0.5 font-body text-sm">
                          {top.slice(1).map((p, k) => (
                            <li key={p.node}>
                              <button type="button" data-ro onClick={() => openNode(p.node)} className="text-left text-foreground hover:text-accent">
                                <span className="tabular-nums text-muted-foreground">{k + 2}.</span> {p.name}
                              </button>
                            </li>
                          ))}
                        </ol>
                      </>
                    ) : <span className="mt-1 font-body text-sm text-muted-foreground">Nobody yet.</span>}
                    <span className="mt-auto pt-2 font-body text-xs leading-relaxed text-muted-foreground">{m.explain}</span>
                  </li>
                );
              })}
            </ul>
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center" data-ro>
              <Segmented<Measure> value={measure} onChange={setMeasure} label="Rank by"
                options={MEASURES.map((m) => ({ value: m.key, label: m.short }))} className="w-full sm:w-auto" />
              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input data-ro value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a person" aria-label="Find a person" className="h-11 pl-9 font-body lg:h-10" />
              </div>
            </div>
            <p className="mb-3 font-body text-sm text-muted-foreground" aria-live="polite">
              Showing {shown.length} of {ranked.length} {whoLabel}, by {MEASURES.find((m) => m.key === measure)?.label.toLowerCase()}.
              {prev ? ` Change: since ${prev.label}.` : ''}
            </p>
          </Pinned>

          <RegisterFrame>
            <table className="w-full font-body text-sm" data-network-ranking>
              <thead className={REGISTER_HEAD}>
                <tr className="text-left">
                  <th className="px-3 py-2 font-normal">#</th>
                  <th className={`px-3 py-2 font-normal ${REGISTER_FIRST_COLUMN}`}>Name</th>
                  <th className="px-3 py-2 font-normal">In the Society</th>
                  <th className="px-3 py-2 text-right font-normal">People tied</th>
                  <th className="px-3 py-2 text-right font-normal">Reports</th>
                  <th className="px-3 py-2 text-right font-normal">Boards</th>
                  {MEASURES.map((m) => measureHead(m.key))}
                  {prev && <th className="px-3 py-2 text-right font-normal">Change</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-separator">
                {shown.map(({ p, place }) => (
                  <tr key={p.node} className="hover:bg-muted/30">
                    <td className={`px-3 py-2 tabular-nums ${place <= 3 ? 'font-serif text-base text-accent' : 'text-muted-foreground'}`}>{place}</td>
                    <td className={`px-3 py-2 ${REGISTER_FIRST_COLUMN}`}>
                      <button type="button" data-ro onClick={() => openNode(p.node)} className="text-left text-accent hover:underline">{p.name}</button>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{periodOf(p, data.current)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{p.degree}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{p.groups.report}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{p.groups.board}</td>
                    {MEASURES.map((m) => (
                      <td key={m.key} className={`px-3 py-2 text-right tabular-nums ${measure === m.key ? 'w-28 text-foreground' : 'text-muted-foreground'}`}>
                        #{rankOf(p, m.key)}
                        {measure === m.key && <Bar share={valueOf(p, m.key) / best[m.key]} />}
                      </td>
                    ))}
                    {prev && (
                      <td className="px-3 py-2 text-right">
                        <Movement value={movement(rankOf(p, measure), rankIn(prev.ranks, p.node, measure))} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </RegisterFrame>

          <RecordList label="Ranking">
            {shown.map(({ p, place }) => (
              <RecordCard
                key={p.node}
                title={<button type="button" data-ro onClick={() => openNode(p.node)} className="text-left text-accent">{place}. {p.name}</button>}
                meta={periodOf(p, data.current)}
                aside={prev ? <Movement value={movement(rankOf(p, measure), rankIn(prev.ranks, p.node, measure))} /> : undefined}
                lines={(
                  <span className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    {MEASURES.map((m) => (
                      <span key={m.key} className={measure === m.key ? 'text-foreground' : ''}>{m.short} #{rankOf(p, m.key)}</span>
                    ))}
                  </span>
                )}
                details={(
                  <>
                    <Detail label="People tied">{p.degree}</Detail>
                    <Detail label="Took part in">{groupsLine(p.groups)}</Detail>
                  </>
                )}
              />
            ))}
          </RecordList>

          <Pinned>
            {!query && ranked.length > FIRST_ROWS && (
              <Button data-ro variant="outline" className="mt-3 h-11 lg:h-10" onClick={() => setShowAll((v) => !v)}>
                {showAll ? `Show the first ${FIRST_ROWS}` : `Show all ${ranked.length}`}
              </Button>
            )}
            {query && ranked.length === 0 && <p className="mt-3 font-body text-sm text-muted-foreground">Nobody {whoLabel} matches.</p>}
          </Pinned>
        </>
      )}

      {view === 'map' && (
        <Pinned>
          <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between" data-ro>
            <Select value={selected !== null ? people[selected]?.node : ''} onValueChange={(v) => openNode(v)}>
              <SelectTrigger className="h-11 w-full font-body lg:h-10 lg:w-64" aria-label="Find a person on the map"><SelectValue placeholder="Find a person on the map" /></SelectTrigger>
              <SelectContent>
                {[...people].sort((a, b) => a.name.localeCompare(b.name)).map((p) => <SelectItem key={p.node} value={p.node}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <label className="flex min-h-11 items-center gap-3 font-body text-sm text-foreground">
              <Switch checked={strongOnly} onCheckedChange={setStrongOnly} aria-label="Strong ties only" />
              <span>
                <span className="block">Strong ties only</span>
                <span className="block text-xs text-muted-foreground">A report or a Board together, or more</span>
              </span>
            </label>
          </div>
          <div ref={mapBox} className="border border-separator">
            <NetworkMap people={people} ties={ties} selected={selected} onSelect={openPerson} colourOf={communityColour} community={community} strongOnly={strongOnly} />
          </div>
          <p className="mt-2 font-body text-xs text-muted-foreground">
            Closer means more tied; colour is the community, size is status. Zoom with the plus and minus buttons, or a pinch; drag to move. Press a person for their ties.
            {selected !== null && (
              <button type="button" data-ro onClick={() => setSelected(null)} className="ml-2 inline-flex items-center gap-1 text-accent hover:underline">
                <X className="h-3 w-3" aria-hidden="true" />Clear the choice
              </button>
            )}
          </p>
          <div className="mt-4" data-ro>
            <h3 className="mb-2 font-serif text-lg text-accent">Communities</h3>
            <ul className="grid grid-cols-1 gap-1 font-body text-sm sm:grid-cols-2 xl:grid-cols-3" data-network-communities>
              <li>
                <button type="button" onClick={() => setCommunity(null)} aria-pressed={community === null}
                  className={`flex min-h-11 w-full items-center gap-2 border px-3 py-2 text-left ${community === null ? 'border-accent bg-accent/5' : 'border-separator hover:bg-muted/40'}`}>
                  <span className="text-foreground">All communities</span>
                </button>
              </li>
              {communities.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => setCommunity(community === c.id ? null : c.id)} aria-pressed={community === c.id}
                    className={`flex min-h-11 w-full items-start gap-2 border px-3 py-2 text-left ${community === c.id ? 'border-accent bg-accent/5' : 'border-separator hover:bg-muted/40'}`}>
                    <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ background: communityColour(c.id) }} aria-hidden="true" />
                    <span>
                      <span className="text-foreground">Community {c.id}</span>
                      <span className="text-muted-foreground">: {plural(c.size, 'person', 'people')}, around {c.lead.name}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </Pinned>
      )}

      {view === 'time' && (
        <Pinned>
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center" data-ro>
            <Segmented<'semesters' | 'weeks'> value={trendMode} onChange={setTrendMode} label="Points in time"
              options={[{ value: 'semesters', label: 'Semesters' }, { value: 'weeks', label: 'Weeks' }]} className="w-full sm:w-auto" />
            <Segmented<Measure> value={measure} onChange={setMeasure} label="Rank by"
              options={MEASURES.map((m) => ({ value: m.key, label: m.short }))} className="w-full sm:w-auto" />
            <Segmented<Who> value={who} onChange={(v) => { setWho(v); setPicked(null); }} options={WHO} label="Who to follow" nowrap className="w-full sm:w-auto" />
            <Select value="" onValueChange={(v) => setPicked([...new Set([...(picked ?? seriesNodes), v])].slice(-MAX_SERIES))}>
              <SelectTrigger className="h-11 w-full font-body sm:w-56 lg:h-10" aria-label="Add a person"><SelectValue placeholder="Add a person" /></SelectTrigger>
              <SelectContent>
                {[...people].sort((a, b) => a.name.localeCompare(b.name)).filter((p) => !seriesNodes.includes(p.node))
                  .map((p) => <SelectItem key={p.node} value={p.node}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <ul className="mb-3 flex flex-wrap gap-2" data-ro>
            {series.map((sr) => (
              <li key={sr.key}>
                <button type="button" onClick={() => setPicked(seriesNodes.filter((n) => n !== sr.key))}
                  className="inline-flex min-h-9 items-center gap-1.5 border border-separator px-2.5 font-body text-xs text-foreground hover:bg-muted/40"
                  aria-label={`Remove ${sr.name}`}>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: sr.colour }} aria-hidden="true" />{sr.name}<X className="h-3 w-3" aria-hidden="true" />
                </button>
              </li>
            ))}
            {picked && (
              <li>
                <button type="button" onClick={() => setPicked(null)} className="inline-flex min-h-9 items-center px-2.5 font-body text-xs text-accent hover:underline">Back to the first five</button>
              </li>
            )}
          </ul>
          {points.length < 2 ? (
            <p className="border border-dashed border-separator px-4 py-5 font-body text-sm text-muted-foreground">
              {trendMode === 'weeks' ? 'A point is kept every week: the line starts once two weeks are recorded.' : 'The past semesters are being analysed: they appear after tonight.'}
            </p>
          ) : (
            <div className="border border-separator px-2 py-3"><NetworkTrend points={points} series={series} /></div>
          )}

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section>
              <h3 className="mb-2 font-serif text-lg text-accent">Climbed most into the first {upperPart(people.length)} since {lastSemester ? `the end of ${lastSemester.label}` : 'last semester'}</h3>
              <ol className="divide-y divide-separator border border-separator font-body text-sm" data-network-climbers>
                {risers.map(({ p, move }) => (
                  <li key={p.node}>
                    <button type="button" data-ro onClick={() => openNode(p.node)} className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-muted/40">
                      <span className="text-foreground">{p.name} <span className="text-muted-foreground">#{rankOf(p, measure)}</span></span>
                      <Movement value={move} />
                    </button>
                  </li>
                ))}
                {!risers.length && <li className="px-3 py-3 text-muted-foreground">Nobody to compare yet.</li>}
              </ol>
            </section>
            <section>
              <h3 className="mb-2 font-serif text-lg text-accent">The network, semester by semester</h3>
              <table className="w-full border border-separator font-body text-sm" data-network-growth>
                <thead className="bg-muted/40 text-left text-muted-foreground">
                  <tr><th className="px-3 py-1.5 font-normal">At the end of</th><th className="px-3 py-1.5 text-right font-normal">People</th><th className="px-3 py-1.5 text-right font-normal">Ties</th><th className="px-3 py-1.5 text-right font-normal">Communities</th></tr>
                </thead>
                <tbody className="divide-y divide-separator">
                  {data.semesters.map((p) => (
                    <tr key={p.semester}><td className="px-3 py-1.5">{p.label}</td><td className="px-3 py-1.5 text-right tabular-nums">{p.summary?.people ?? 0}</td><td className="px-3 py-1.5 text-right tabular-nums">{p.summary?.ties ?? 0}</td><td className="px-3 py-1.5 text-right tabular-nums">{p.summary?.communities ?? 0}</td></tr>
                  ))}
                  <tr className="text-foreground"><td className="px-3 py-1.5">Now ({data.currentLabel})</td><td className="px-3 py-1.5 text-right tabular-nums">{s.people}</td><td className="px-3 py-1.5 text-right tabular-nums">{s.ties}</td><td className="px-3 py-1.5 text-right tabular-nums">{s.communities}</td></tr>
                </tbody>
              </table>
            </section>
          </div>
        </Pinned>
      )}

      {view === 'method' && (
        <Pinned>
          <div className="max-w-3xl space-y-5 font-body text-[15px] leading-relaxed text-foreground" data-network-method>
            <section>
              <h3 className="mb-1 font-serif text-lg text-accent">The method</h3>
              <p>
                The page applies the method with which Giuseppe Soda, Alessandro Iorio and Leonardo Rizzo of Bocconi University read the
                network of the College of Cardinals before the 2025 conclave (Social Networks 83, 2025, pages 215 to 232): people are tied
                by the bodies they belong to together, and three measures of position are read from the network those ties form.
              </p>
            </section>
            <section>
              <h3 className="mb-1 font-serif text-lg text-accent">Who is tied to whom, and how strongly</h3>
              <p>
                Two people are tied when they shared a group. Each shared group adds to their tie by its kind, and the ties add up
                over the years, so people who worked together more, and for longer, are tied more strongly. Members of today and of the
                past are one network: nobody is set apart.
              </p>
              <table className="mt-3 w-full max-w-xl border border-separator text-sm" data-network-weights>
                <thead className="bg-muted/40 text-left text-muted-foreground">
                  <tr><th className="px-3 py-1.5 font-normal">Shared, each time</th><th className="px-3 py-1.5 text-right font-normal">Weight</th></tr>
                </thead>
                <tbody className="divide-y divide-separator">
                  {TIE_TABLE.map((t) => (
                    <tr key={t.label}><td className="px-3 py-1.5">{t.label}</td><td className="px-3 py-1.5 text-right tabular-nums">{t.weight}</td></tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-sm text-muted-foreground">
                The heads are every other office of the Board: the heads and co-heads of the divisions, the Head of Asset Management, the Head
                of Research and the other Board members. The interviewer is each head or co-head of the division a member joined, in the
                semester they got in; the first semester on record is left out, because the rosters begin after the Society did and who was
                new in it cannot be told.
              </p>
            </section>
            <section>
              <h3 className="mb-1 font-serif text-lg text-accent">The three measures</h3>
              <ul className="list-disc space-y-1 pl-5">
                {MEASURES.filter((m) => m.key !== 'overall').map((m) => <li key={m.key}><strong className="font-semibold">{m.label}.</strong> {m.explain}</li>)}
                <li><strong className="font-semibold">Overall.</strong> {MEASURES[0].explain}</li>
              </ul>
              <p className="mt-2 text-muted-foreground">
                Communities are the groups more tied inside than outside, found by the same deterministic method the study used. The same data always gives the same result.
                In the Society now narrows the lists to this semester&apos;s members, as the study ranked only the cardinals who could vote; everyone is still measured in the whole network.
              </p>
            </section>
            <section>
              <h3 className="mb-1 font-serif text-lg text-accent">How often, and how solid</h3>
              <p>
                The analysis runs every night with the new reports, rosters and members; a point is kept each week, and the network is also
                read as it stood at the end of each past semester. As in the study, the rankings are checked against a version that ignores
                how strong each tie is.
                {s.robustness ? ` Here the two versions agree at ${Math.round(s.robustness.status * 100)}% for status and ${Math.round(s.robustness.mediation * 100)}% for mediation (rank correlation).` : ''}
              </p>
            </section>
            <section>
              <h3 className="mb-1 font-serif text-lg text-accent">Who sees it</h3>
              <p>
                The Board, alumni and advisors with a Workspace account. It is never published, and no decision about anyone is taken from it.
                A person who objects is left out of the analysis (Privacy Policy, section 8).
              </p>
            </section>
          </div>

          {data.canManage && (
            <section className="mt-8 max-w-3xl" data-network-excluded>
              <h3 className="mb-1 font-serif text-lg text-accent">Left out of the analysis</h3>
              <p className="mb-3 font-body text-sm text-muted-foreground">
                To leave a person out, open them from the ranking or the map. Only the President, the Vice-President and the association account see this list.
              </p>
              {data.excluded.length === 0 ? (
                <p className="border border-dashed border-separator px-4 py-4 font-body text-sm text-muted-foreground">Nobody is left out.</p>
              ) : (
                <ul className="divide-y divide-separator border border-separator font-body text-sm">
                  {data.excluded.map((x) => (
                    <li key={x.node} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                      <span>
                        <span className="block text-foreground">{x.name}</span>
                        <span className="block text-xs text-muted-foreground">Since {dateTime(x.created_at)}{x.note ? `. ${x.note}` : ''}</span>
                      </span>
                      <Button variant="outline" className="h-11 lg:h-9" disabled={busy} onClick={() => void restore(x.node, x.name)}>
                        <Undo2 className="mr-2 h-4 w-4" aria-hidden="true" />Bring back
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </Pinned>
      )}

      <PersonPanel
        person={openP}
        index={open}
        data={data}
        people={people}
        ties={open !== null ? tiesOf[open] ?? [] : []}
        best={best}
        onClose={() => setOpen(null)}
        onPick={(i) => openPerson(i)}
        onShowOnMap={(i) => { setOpen(null); setSelected(i); setCommunity(null); setView('map'); setReveal((n) => n + 1); }}
        onLeaveOut={data.canManage ? (p) => { setLeaving(p); setNote(''); } : undefined}
      />

      <Dialog open={!!leaving} onOpenChange={(o) => { if (!o && !busy) setLeaving(null); }}>
        <DialogContent className="max-w-lg font-body ws-form-touch">
          <DialogHeader>
            <DialogTitle className="font-serif">Leave {leaving?.name} out of the analysis?</DialogTitle>
            <DialogDescription>
              For a person who objected. They are taken out of the network, every stored result about them is deleted at once, and the network is recalculated without them. They can be brought back from Method.
            </DialogDescription>
          </DialogHeader>
          <label className="block text-sm text-muted-foreground" htmlFor="network-leave-note">Note (optional): when and how they asked</label>
          <Textarea id="network-leave-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} rows={3} />
          <DialogFooter className="gap-2">
            <Button variant="outline" className="h-11 lg:h-10" disabled={busy} onClick={() => setLeaving(null)}>Keep them</Button>
            <Button className="h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90 lg:h-10" disabled={busy} onClick={() => void confirmLeave()}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Leave out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RegisterPage>
  );
}
