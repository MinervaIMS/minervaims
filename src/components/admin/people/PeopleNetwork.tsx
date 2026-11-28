import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, Loader2, Search, Undo2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { friendlyError } from '@/lib/errors';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { HelpDot } from '@/components/admin/help/HelpSystem';
import { Segmented } from '@/components/admin/career/gpa/shared';
import { Pinned, REGISTER_FIRST_COLUMN, REGISTER_HEAD, RegisterFrame, RegisterPage } from '@/components/admin/kit/Register';
import { Detail, RecordCard, RecordList } from '@/components/admin/kit/RecordCard';
import { bringBack, leaveOut, readNetwork, type NetworkPerson, type NetworkRead } from '@/lib/people-network-api';
import NetworkMap from './network/NetworkMap';
import NetworkTrend, { type TrendSeries } from './network/NetworkTrend';
import PersonPanel from './network/PersonPanel';
import PersonSearch from './network/PersonSearch';
import {
  DIVISIONS, FACTORS, TIE_TABLE, dateTime, divisionColour, divisionLabel, divisionsOf, factorOf, fold, groupsLine,
  movingUp, periodOf, plural, positionIn, shortDate, tiesByPerson, timeOf, type Factor,
} from './network/network-view';

// =====================================================================
// PEOPLE > NETWORK (Steps 111 and 112).
// ---------------------------------------------------------------------
// Who is well connected in the Society, past and present, and so whom to
// ask: everyone who is or was a member, tied to the people they wrote a
// report with, served on a Board with, shared a division with, or
// interviewed as new joiners, and lightly to the President and the
// Vice-President of their semesters, each kind of tie with its own weight
// (after Soda, Iorio and Rizzo, Social Networks, 2025).
//
// SIMPLE ON PURPOSE (Step 112). One overall position per person, with the
// three things that make it up shown in the person's window and never as
// rankings of their own; semesters only, no weekly points; nobody picked
// in advance for the lines over time; people grouped by their division,
// not by communities named after single members. The members are peers:
// the page shows who is well connected, it does not rank merit.
//
// Open to the Board, alumni and advisors (the role matrix, `people-
// network`); the President and the Vice-President also leave out a person
// who objected. The analysis runs on the server by itself, twice a month
// (once in January, July and August); the page only shows it.
// =====================================================================

type View = 'people' | 'map' | 'time' | 'how';
type Who = 'all' | 'now';
const VIEWS: { value: View; label: string }[] = [
  { value: 'people', label: 'Well connected' },
  { value: 'map', label: 'Map' },
  { value: 'time', label: 'Over time' },
  { value: 'how', label: 'How it works' },
];
const WHO: { value: Who; label: string }[] = [
  { value: 'all', label: 'Everyone' },
  { value: 'now', label: 'In the Society now' },
];
const FIRST_ROWS = 25;
const MAX_SERIES = 8;
const SERIES_COLOURS = DIVISIONS.slice(1).map((d) => d.colour).filter((c) => c !== 'var(--net-other)');

/** A figure of the summary, as My Profile draws its own. */
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-separator bg-background px-3 py-2.5 sm:px-4 sm:py-3">
      <div className="truncate font-serif text-lg leading-tight text-accent tabular-nums sm:text-2xl">{value}</div>
      <div className="mt-0.5 text-[11px] uppercase leading-snug tracking-wider text-muted-foreground sm:text-xs">{label}</div>
    </div>
  );
}

/** How well connected a person is, against the best connected: a thin bar. */
function Bar({ share }: { share: number }) {
  return (
    <span className="block h-1 w-full bg-muted" aria-hidden="true">
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
  const [view, setView] = useState<View>('people');
  const [who, setWho] = useState<Who>('all');
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
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
  const lastSemester = data?.semesters[data.semesters.length - 1];
  const nowCount = useMemo(() => people.filter((p) => p.is_current).length, [people]);
  const bestOverall = useMemo(() => Math.max(1e-9, ...people.map((p) => p.overall)), [people]);
  const bestFactor = useMemo(() => {
    const max = (f: Factor) => Math.max(1e-9, ...people.map((p) => factorOf(p, f)));
    return { status: max('status'), mediation: max('mediation'), coalition: max('coalition') } as Record<Factor, number>;
  }, [people]);
  const divisions = useMemo(() => {
    const present = divisionsOf(people);
    const central = new Map((data?.latest?.summary.divisions ?? []).map((d) => [d.key, d.centrality]));
    return present.map((d) => ({ ...d, centrality: central.get(d.key) ?? null }));
  }, [people, data]);

  /** The people the list shows: everyone, or this semester's members, in order of position. */
  const ranked = useMemo(() => {
    const q = fold(query.trim());
    return [...people]
      .filter((p) => who === 'all' || p.is_current)
      .sort((a, b) => a.rank_overall - b.rank_overall || a.name.localeCompare(b.name))
      .filter((p) => !q || fold(p.name).includes(q));
  }, [people, who, query]);
  const shown = showAll || query ? ranked : ranked.slice(0, FIRST_ROWS);

  const confirmLeave = async () => {
    if (!leaving) return;
    setBusy(true);
    try {
      await leaveOut(session, leaving.node, leaving.name, note);
      toast({ title: `${leaving.name} is left out`, description: 'Their results are deleted at once; the network is analysed again without them in a minute.' });
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
      toast({ title: `${name} is back in the analysis`, description: 'The network is analysed again with them in a minute.' });
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
      description="Who is well connected in the Society, past and present, and so whom to ask: everyone who is or was a member, tied by the reports they wrote together, the Boards and the divisions they shared and the heads who interviewed them."
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
          <p className="mt-1 text-muted-foreground">It is analysed by itself on the 1st and the 15th of each month (the 1st only in January, July and August). Come back after the next run.</p>
        </div>
      </div>
    );
  }

  const s = data.latest.summary;
  const openP = open !== null ? people[open] ?? null : null;
  const whoLabel = who === 'now' ? 'in the Society now' : 'in the network';

  // ── Over time: only the people added by hand, semester by semester ──
  const seriesNodes = picked.filter((n) => indexOf.has(n));
  const series: TrendSeries[] = seriesNodes.map((n, k) => ({ key: n, name: people[indexOf.get(n)!].name, colour: SERIES_COLOURS[k % SERIES_COLOURS.length] }));
  const nowRow = Object.fromEntries([['label', 'Now'], ...seriesNodes.map((n) => [n, people[indexOf.get(n)!].rank_overall])]);
  const points = [...data.semesters.map((p) => Object.fromEntries([['label', p.label], ...seriesNodes.map((n) => [n, positionIn(p.ranks, n)])])), nowRow];
  const risers = movingUp(people, lastSemester?.ranks);
  const analysed = new Map(data.semesters.map((p) => [p.semester, p]));
  const allSemesters = data.allSemesters ?? data.semesters.map((p) => ({ semester: p.semester, label: p.label }));
  const pending = allSemesters.filter((p) => !analysed.has(p.semester)).length;
  const centralOf = (summary: NetworkRead['semesters'][number]['summary'] | undefined) => {
    const top = summary?.divisions?.filter((d) => d.people >= 3 && d.key !== 'board')[0];
    return top ? divisionLabel(top.key) : '';
  };

  return (
    <RegisterPage className="ws-network">
      <Pinned>
        {header}
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3" data-network-summary>
          <Stat value={s.people.toLocaleString('en-GB')} label="People" />
          <Stat value={s.ties.toLocaleString('en-GB')} label="Ties" />
          <Stat value={String(divisions.length)} label="Divisions" />
          <Stat value={shortDate(data.latest.computed_at)} label={`Updated at ${timeOf(data.latest.computed_at)}`} />
        </div>
        <p className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 font-body text-xs text-muted-foreground" data-network-status>
          <span>Updated by itself twice a month, once in January, July and August.</span>
          {pending > 0 && <span>{plural(pending, 'past semester')} still being analysed.</span>}
          <HelpDot page="people-network" />
        </p>
        <div className="mb-6" data-ro>
          <Segmented<View> value={view} onChange={setView} options={VIEWS} label="View of the network" nowrap className="w-full sm:inline-flex sm:w-auto" />
        </div>
      </Pinned>

      {view === 'people' && (
        <>
          <Pinned>
            <p className="mb-4 max-w-3xl border-l-2 border-accent/40 pl-3 font-body text-sm text-muted-foreground" data-network-peers>
              Everyone here is a peer. The position shows how well connected a person is in the Society&apos;s history, and so whom to ask; it is not a measure of merit.
            </p>
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center" data-ro>
              <Segmented<Who> value={who} onChange={(v) => { setWho(v); setShowAll(false); }} options={WHO} label="Who to list" nowrap className="w-full sm:w-auto sm:shrink-0" />
              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input data-ro value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a person" aria-label="Find a person" className="h-11 pl-9 font-body lg:h-10" />
              </div>
            </div>
            <p className="mb-3 font-body text-sm text-muted-foreground" aria-live="polite">
              {who === 'now'
                ? `${plural(nowCount, 'member')} of ${data.currentLabel}, placed in the whole network. `
                : 'Members of today and of the past, in one network. '}
              Showing {shown.length} of {ranked.length} {whoLabel}.
            </p>
          </Pinned>

          <RegisterFrame>
            <table className="w-full font-body text-sm" data-network-list>
              <thead className={REGISTER_HEAD}>
                <tr className="text-left">
                  <th className="px-3 py-2 font-normal">Position</th>
                  <th className={`px-3 py-2 font-normal ${REGISTER_FIRST_COLUMN}`}>Name</th>
                  <th className="px-3 py-2 font-normal">In the Society</th>
                  <th className="px-3 py-2 font-normal">Division</th>
                  <th className="px-3 py-2 text-right font-normal">People tied</th>
                  <th className="px-3 py-2 text-right font-normal">Reports</th>
                  <th className="px-3 py-2 text-right font-normal">Boards</th>
                  <th className="w-40 px-3 py-2 font-normal">Connected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-separator">
                {shown.map((p) => (
                  <tr key={p.node} className="hover:bg-muted/30">
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">{p.rank_overall}</td>
                    <td className={`px-3 py-2 ${REGISTER_FIRST_COLUMN}`}>
                      <button type="button" data-ro onClick={() => openNode(p.node)} className="text-left text-accent hover:underline">{p.name}</button>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{periodOf(p, data.current)}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: divisionColour(p.division) }} aria-hidden="true" />
                        {divisionLabel(p.division)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{p.degree}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{p.groups.report}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{p.groups.board}</td>
                    <td className="px-3 py-2"><Bar share={p.overall / bestOverall} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </RegisterFrame>

          <RecordList label="People">
            {shown.map((p) => (
              <RecordCard
                key={p.node}
                title={<button type="button" data-ro onClick={() => openNode(p.node)} className="text-left text-accent">{p.name}</button>}
                meta={`${periodOf(p, data.current)} · ${divisionLabel(p.division)}`}
                aside={<span className="text-xs tabular-nums text-muted-foreground">#{p.rank_overall}</span>}
                lines={<span className="block w-full pt-1"><Bar share={p.overall / bestOverall} /></span>}
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
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <PersonSearch people={people} onPick={(n) => { openNode(n); setFocus(null); }} placeholder="Find a person on the map" className="w-full sm:max-w-xs" />
            {selected !== null && (
              <button type="button" data-ro onClick={() => setSelected(null)} className="inline-flex min-h-11 items-center gap-1 self-start font-body text-sm text-accent hover:underline sm:self-auto">
                <X className="h-3.5 w-3.5" aria-hidden="true" />Clear {people[selected]?.name ?? 'the choice'}
              </button>
            )}
          </div>
          <div ref={mapBox} className="border border-separator">
            <NetworkMap people={people} ties={ties} selected={selected} onSelect={openPerson} colourOf={(p) => divisionColour(p.division)} focus={focus} />
          </div>
          <p className="mt-2 font-body text-xs text-muted-foreground">
            Closer means more tied; the colour is the division, the size how well connected a person is. Zoom with the plus and minus buttons or a pinch, and drag to move. Press a person for their ties.
          </p>
          <div className="mt-4" data-ro>
            <h3 className="mb-1 font-serif text-lg text-accent">Divisions</h3>
            <p className="mb-2 font-body text-xs text-muted-foreground">Each person in the division of most of their semesters. The bar is how central the division&apos;s people are, on average. Press a division to light it up.</p>
            <ul className="grid grid-cols-1 gap-1 font-body text-sm sm:grid-cols-2 xl:grid-cols-3" data-network-divisions>
              {divisions.map((d) => (
                <li key={d.key}>
                  <button type="button" onClick={() => setFocus(focus === d.key ? null : d.key)} aria-pressed={focus === d.key}
                    className={`flex min-h-11 w-full flex-col gap-1.5 border px-3 py-2 text-left ${focus === d.key ? 'border-accent bg-accent/5' : 'border-separator hover:bg-muted/40'}`}>
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: d.colour }} aria-hidden="true" />
                      <span className="text-foreground">{d.label}</span>
                      <span className="ml-auto text-xs tabular-nums text-muted-foreground">{plural(d.size, 'person', 'people')}</span>
                    </span>
                    {d.centrality !== null && <Bar share={d.centrality} />}
                  </button>
                </li>
              ))}
            </ul>
            {focus && (
              <button type="button" onClick={() => setFocus(null)} className="mt-2 inline-flex min-h-11 items-center gap-1 font-body text-sm text-accent hover:underline">
                <X className="h-3.5 w-3.5" aria-hidden="true" />Every division
              </button>
            )}
          </div>
        </Pinned>
      )}

      {view === 'time' && (
        <Pinned>
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <PersonSearch
              people={people}
              exclude={new Set(seriesNodes)}
              onPick={(n) => setPicked((list) => [...new Set([...list, n])].slice(-MAX_SERIES))}
              placeholder="Add a person to follow"
              className="w-full sm:max-w-sm"
            />
            <span className="font-body text-xs text-muted-foreground">Up to {MAX_SERIES} people at a time.</span>
          </div>
          {series.length > 0 && (
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
              <li>
                <button type="button" onClick={() => setPicked([])} className="inline-flex min-h-9 items-center px-2.5 font-body text-xs text-accent hover:underline">Clear all</button>
              </li>
            </ul>
          )}
          {series.length === 0 ? (
            <p className="border border-dashed border-separator px-4 py-6 font-body text-sm text-muted-foreground" data-network-trend-empty>
              Add the people you want to follow: their position at the end of each semester appears here. Nobody is shown until you choose.
            </p>
          ) : points.length < 2 ? (
            <p className="border border-dashed border-separator px-4 py-5 font-body text-sm text-muted-foreground">The past semesters are still being analysed: their points appear shortly.</p>
          ) : (
            <div className="border border-separator px-2 py-3"><NetworkTrend points={points} series={series} /></div>
          )}

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section>
              <h3 className="mb-2 font-serif text-lg text-accent">Moving up fastest among the members of today</h3>
              <p className="mb-2 font-body text-xs text-muted-foreground">{lastSemester ? `Since the end of ${lastSemester.label}, in the whole network.` : 'Once a past semester is analysed.'}</p>
              <ol className="divide-y divide-separator border border-separator font-body text-sm" data-network-moving-up>
                {risers.map(({ p, move }) => (
                  <li key={p.node}>
                    <button type="button" data-ro onClick={() => openNode(p.node)} className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-muted/40">
                      <span className="text-foreground">{p.name} <span className="text-muted-foreground">{divisionLabel(p.division)}</span></span>
                      <span className="inline-flex items-center gap-0.5 text-xs text-green-700"><ArrowUp className="h-3 w-3" aria-hidden="true" />{move}<span className="sr-only"> places up</span></span>
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
                  <tr><th className="px-3 py-1.5 font-normal">At the end of</th><th className="px-3 py-1.5 text-right font-normal">People</th><th className="px-3 py-1.5 text-right font-normal">Ties</th><th className="px-3 py-1.5 font-normal">Most central division</th></tr>
                </thead>
                <tbody className="divide-y divide-separator">
                  {allSemesters.map((p) => {
                    const run = analysed.get(p.semester);
                    return run ? (
                      <tr key={p.semester}><td className="px-3 py-1.5">{p.label}</td><td className="px-3 py-1.5 text-right tabular-nums">{run.summary?.people ?? 0}</td><td className="px-3 py-1.5 text-right tabular-nums">{run.summary?.ties ?? 0}</td><td className="px-3 py-1.5 text-muted-foreground">{centralOf(run.summary)}</td></tr>
                    ) : (
                      <tr key={p.semester}><td className="px-3 py-1.5">{p.label}</td><td colSpan={3} className="px-3 py-1.5 text-muted-foreground">Being analysed</td></tr>
                    );
                  })}
                  <tr className="text-foreground"><td className="px-3 py-1.5">Now ({data.currentLabel})</td><td className="px-3 py-1.5 text-right tabular-nums">{s.people}</td><td className="px-3 py-1.5 text-right tabular-nums">{s.ties}</td><td className="px-3 py-1.5">{centralOf(s)}</td></tr>
                </tbody>
              </table>
            </section>
          </div>
        </Pinned>
      )}

      {view === 'how' && (
        <Pinned>
          <div className="max-w-3xl space-y-5 font-body text-[15px] leading-relaxed text-foreground" data-network-method>
            <section>
              <h3 className="mb-1 font-serif text-lg text-accent">What the page is for</h3>
              <p>
                To see who has been well connected in the Society&apos;s history, and so whom to ask: useful above all to new members and to a new
                Board. Everyone is a peer, and the position is not a measure of merit. The method is the one with which Giuseppe Soda,
                Alessandro Iorio and Leonardo Rizzo of Bocconi University read the network of the College of Cardinals before the 2025
                conclave (Social Networks 83, 2025, pages 215 to 232).
              </p>
            </section>
            <section>
              <h3 className="mb-1 font-serif text-lg text-accent">Who is tied to whom, and how strongly</h3>
              <p>
                Two people are tied when they shared something. Each time adds to their tie by its kind, and the ties add up over the years,
                so people who worked together more, and for longer, are tied more strongly. Members of today and of the past are one network.
              </p>
              <table className="mt-3 w-full max-w-2xl border border-separator text-sm" data-network-weights>
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
                The heads are every other office of the Board. Media and Operations count as one division, Media &amp; Operations. The interviewer is
                each head of the division a member joined, in the semester they got in; the first semester on record has no interviewer ties,
                because the rosters begin after the Society did. The association&apos;s own account is not a person and is not in the network.
              </p>
            </section>
            <section>
              <h3 className="mb-1 font-serif text-lg text-accent">The position, and what makes it up</h3>
              <p>Each person has one overall position. Three things make it up, read together:</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {FACTORS.map((f) => <li key={f.key}><strong className="font-semibold">{f.label}.</strong> {f.explain}</li>)}
              </ul>
              <p className="mt-2 text-muted-foreground">
                They are shown in each person&apos;s window, as parts of the one position, never as rankings of their own.
              </p>
            </section>
            <section>
              <h3 className="mb-1 font-serif text-lg text-accent">Divisions</h3>
              <p>
                People are grouped by the division they spent most semesters in, a Board office counting only for someone who held nothing
                else. On the Society&apos;s data the divisions describe the network almost as well as the best grouping an algorithm can find
                {typeof s.modularity === 'number' ? ` (modularity ${s.modularity.toFixed(2)})` : ''}, and they say something everyone understands. A division is
                more central when its people are, on average, better connected.
              </p>
            </section>
            <section>
              <h3 className="mb-1 font-serif text-lg text-accent">When it updates</h3>
              <p>
                By itself, on the 1st and the 15th of each month from February to June and from September to December, and on the 1st only in
                January, July and August. Each run reads the new reports, rosters and members, and the network as it stood at the end of
                each past semester. As in the study, the positions are checked against a version that ignores how strong each tie is.
                {s.robustness ? ` Here the two agree at ${Math.round(s.robustness.status * 100)}% on ties to the well connected and ${Math.round(s.robustness.mediation * 100)}% on bridges between groups (rank correlation).` : ''}
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
                To leave a person out, open them from the list or the map. Only the President, the Vice-President and the association account see this list.
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
        best={bestFactor}
        onClose={() => setOpen(null)}
        onPick={(i) => openPerson(i)}
        onShowOnMap={(i) => { setOpen(null); setSelected(i); setFocus(null); setView('map'); setReveal((n) => n + 1); }}
        onLeaveOut={data.canManage ? (p) => { setLeaving(p); setNote(''); } : undefined}
      />

      <Dialog open={!!leaving} onOpenChange={(o) => { if (!o && !busy) setLeaving(null); }}>
        <DialogContent className="max-w-lg font-body ws-form-touch">
          <DialogHeader>
            <DialogTitle className="font-serif">Leave {leaving?.name} out of the analysis?</DialogTitle>
            <DialogDescription>
              For a person who objected. They are taken out of the network, every stored result about them is deleted at once, and the network is analysed again without them. They can be brought back from How it works.
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
