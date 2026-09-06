import { useCallback, useMemo } from 'react';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { useAccess } from '@/hooks/useAccess';
import type { ResourceKey } from '@/lib/access/matrix';
import { useDashboardData } from '@/components/admin/dashboard/useDashboardData';
import { KpiCard } from '@/components/admin/dashboard/DashboardKit';
import { useMediaMatch, usePageVisible, usePaintedAfter, useReducedMotion, useSettled } from '@/components/admin/dashboard/motion';
import { useReportCovers } from '@/components/admin/dashboard/useReportCovers';
import {
  DashboardMotionStyles, GlobeOrnament, LibraryCorner, MemberRings, ReportColumns,
} from '@/components/admin/dashboard/DashboardDecorations';
import DashboardGreeting from '@/components/admin/dashboard/DashboardGreeting';
import FundPerformanceBlock from '@/components/admin/dashboard/FundPerformanceBlock';
import CurrentUpdateBlock from '@/components/admin/dashboard/CurrentUpdateBlock';
import ResearchByDivisionBlock from '@/components/admin/dashboard/ResearchByDivisionBlock';
import AlumniGrowthBlock from '@/components/admin/dashboard/AlumniGrowthBlock';
import ReportsMixBlock from '@/components/admin/dashboard/ReportsMixBlock';

// =====================================================================
// Dashboard.
// ---------------------------------------------------------------------
//   greeting, centred
//   Reports | Readings | Members | Alumni Network
//   research by division (40%)  |  current update (60%)
//   fund performance (35%) | reports mix (25%) | alumni growth (40%)
//
// THE WHOLE PAGE IS ONE DESKTOP SCREEN. The root is a height-bounded
// flex column inside the workspace's content pane, the greeting and the
// KPI row take what they need, and the two lower rows share everything
// that is left. Nothing is measured in fixed pixels, so the page fits
// whatever the chrome above it happens to occupy at any window height.
// Below `lg` that constraint is dropped and the cards stack and scroll.
//
// IT ALSO LOADS AS ONE THING. The workspace loader holds the pane until
// every query has answered, so a member never watches cards arrive one
// after another. When it lifts, the full structure is already mounted
// and the entry animations start together, in the same frame.
//
// Words here exist to make a number understandable, not to comment on
// it: there is no editorial caption anywhere, and no KPI carries a
// comparison line competing with its own figure.
// =====================================================================

/**
 * WHERE EACH KPI LEADS.
 *
 * The four figures at the top are the four things a member most often
 * arrives wanting, so the whole card is the way into the subsection that
 * holds them. The destinations are the workspace's own nav keys and the
 * card opens them through the workspace's own navigation, exactly as the
 * side nav and the Current update card do: no route, no reload, no
 * second navigation system to keep in step with the first.
 */
const KPI_TARGETS = [
  { section: 'reports', sub: 'reports-archive', name: 'Report Archive' },
  { section: 'website', sub: 'website-readings', name: 'Readings' },
  { section: 'people', sub: 'people-members', name: 'Members' },
  { section: 'people', sub: 'people-alumni', name: 'Alumni' },
] as const;

/** The stagger between one card's entry and the next. One place. */
const STAGGER_MS = 45;

/**
 * When the page has finished arriving, measured from the moment it mounts.
 *
 * The longest thread of the entry is a chart's: its card's stagger (up to
 * five steps of STAGGER_MS), then the 200ms pause before the series
 * starts, then the 900ms draw, then the 250ms the chart holds before it
 * stops treating itself as entering. 1800 covers all of it with a little
 * room, and it is the one number the ambient ornaments wait for.
 */
const ENTRY_SETTLES_AT_MS = 1800;

export default function WorkspaceDashboard({ onNavigate }: {
  onNavigate?: (section: string, sub: string | null) => void;
}) {
  const data = useDashboardData();
  const reduced = useReducedMotion();
  const visible = usePageVisible();
  // BOTH BREAKPOINTS ARE ANSWERED ON THE FIRST RENDER, never in an effect
  // a frame later: an ornament that is one long CSS animation restarts
  // when its element is replaced, and a breakpoint that changes its mind
  // after mount is exactly such a replacement.
  const isDesktop = useMediaMatch('(min-width: 1024px)');
  // The KPI cards are two to a row until `xl`, so the only genuinely
  // narrow ornament column is a phone's.
  const isPhone = useMediaMatch('(max-width: 639px)');
  const { covers } = useReportCovers(data.reportFiles);

  const animate = !reduced;

  // ═══════════════════════════════════════════════════════════════════
  // THE ORNAMENTS HOLD STILL WHILE THE PAGE IS ARRIVING.
  // -------------------------------------------------------------------
  // This is the whole of the "the Dashboard's animations are glitchy"
  // report, and it was measured rather than guessed at. A CPU profile of
  // the first five seconds of the page, throttled 4x, attributes the
  // largest named cost to the globe ornament: 585ms of script in that
  // window, more than React itself, and it is spent from the moment the
  // page mounts and then for ever afterwards. It is a rotating canvas
  // running at 24fps behind one card.
  //
  // The entry sequence runs in the same second: four cards staggered in,
  // three charts drawing themselves, an ornament per card. On a machine
  // with a spare core nobody notices; on anything else the two compete,
  // the entry animations lose frames, and what a member sees is a page
  // that stutters as it opens. The measured worst frame in that window
  // was over 300ms - a fifth of a second where nothing moves at all.
  //
  // So the ambient loops do not start until the entry sequence has
  // finished. `pause` on these ornaments STOPS THE LOOP AND KEEPS THE
  // LAST FRAME, so nothing is missing while they wait: the globe, the
  // rings and the report columns are all on screen from the first frame,
  // still, and they begin to move once the page has finished composing
  // itself. That is also the better reading of the page.
  // ═══════════════════════════════════════════════════════════════════
  // Counted from the moment the page actually appears, not from the
  // moment this component mounts: the loader is up until the data lands.
  const settled = useSettled(data.greetingReady, ENTRY_SETTLES_AT_MS);

  // ═══════════════════════════════════════════════════════════════════
  // NOTHING MOVES UNTIL THE PAGE HAS BEEN PAINTED ONCE.
  // -------------------------------------------------------------------
  // See usePaintedAfter. `dash-paused` is the class the ornaments already
  // use to hold still; put on the root it holds EVERY animation on the
  // page, entry included, at its first frame. It comes off two animation
  // frames later, once the big commit has been painted and the main
  // thread is free, so the entry plays from its beginning on frames the
  // reader can actually see instead of starting under a blocked one.
  // ═══════════════════════════════════════════════════════════════════
  const painted = usePaintedAfter(data.greetingReady);
  const ambientPaused = reduced || !visible || !settled;
  /** The stagger. One place, so the sequence is obvious and orderable. */
  const enter = (i: number) => ({ animationDelay: `${i * STAGGER_MS}ms` });
  /**
   * The same stagger, handed to the two charts that draw themselves in.
   * Each adds its own short pause on top, so a series starts while its
   * card is still settling rather than after it: the frame of the chart
   * is on screen from the first frame, and the line arrives into it.
   */
  const chartDelay = (i: number) => (animate ? i * STAGGER_MS : 0);

  // A KPI opens its subsection only if this role may actually see it:
  // `null` leaves the card inert rather than offering a destination the
  // workspace would refuse. Memoised so the four handlers keep their
  // identity across the counter's renders and never re-render a card.
  const access = useAccess();
  const openTarget = useCallback((i: number) => {
    const t = KPI_TARGETS[i];
    onNavigate?.(t.section, t.sub);
  }, [onNavigate]);
  const openers = useMemo(
    () => KPI_TARGETS.map((t, i) => (
      onNavigate && access.canView(t.sub as ResourceKey) ? () => openTarget(i) : null
    )),
    [onNavigate, access, openTarget],
  );

  // =================================================================
  // THE GATE WAITS FOR THE DATA. IT NO LONGER WAITS FOR THE PICTURES.
  // -----------------------------------------------------------------
  // It used to wait for both, and the second half was what a member
  // actually experienced as the Dashboard being slow. The covers are six
  // PDFs fetched and rasterised in the browser; on a cold session that is
  // most of a second of work, with a backstop that lets it run to 1.6,
  // and for every millisecond of it the whole page was a spinner. Not one
  // card, not one chart: the greeting, the four figures, the four charts
  // and the update, all held behind a decoration.
  //
  // The figures and the charts are the page. The covers are a texture
  // behind one number, and the card is complete without them, so they are
  // not something to keep the reader waiting for.
  //
  // NOTHING POPS. `ReportColumns` latches the first cover list it is
  // given and builds its loop once from that, so a list arriving after
  // the page has opened starts its animation from the first frame exactly
  // as it would have done behind the loader; and the ornament carries a
  // 420ms fade of its own, so what the reader sees is a texture arriving
  // rather than an image appearing.
  //
  // The name stays part of the gate, because the greeting is CHOSEN from
  // it: without it the sentence is picked from the unnamed pool and then
  // replaced a moment later, in front of the reader. That is a word
  // changing on the page, which is a different thing from a picture
  // arriving on it. Every query runs in parallel, so waiting for the name
  // costs nothing beyond the slowest of them.
  // =================================================================
  if (!data.greetingReady) return <div className="h-full"><WorkspaceLoader /></div>;

  return (
    <div className={`flex flex-col gap-3 font-body lg:h-full lg:min-h-0 pb-16 lg:pb-0${painted ? '' : ' dash-paused'}`}>
      <DashboardMotionStyles />

      <DashboardGreeting userId={data.userId} vars={data.greetingVars} />

      {/* KPI row. Reports carries the filled treatment; the other three
          are light, so the row reads as one instrument panel with a
          single point of emphasis. */}
      {/* Taller on a phone: the ornament has its own column, and the
          column needs enough height for the composition inside it to be
          worth looking at. */}
      {/* ONE ENTRY FOR THE WHOLE PAGE, staggered 45ms per card. The KPI
          cards fade only: three of the four hold a canvas or a dozen
          images, and translating an ancestor of those forces the browser
          to re-rasterise them for the length of the animation. The four
          chart cards below, which are vector, get the small rise too. */}
      <div className="shrink-0 grid grid-cols-2 xl:grid-cols-4 gap-3 auto-rows-[160px] sm:auto-rows-[168px] xl:auto-rows-[clamp(116px,15vh,156px)]">
        <div className="dash-enter-soft min-h-0" style={enter(0)}>
          <KpiCard
            label="Reports" value={data.reportsAllTime} filled animate={animate}
            onOpen={openers[0]} destination={KPI_TARGETS[0].name}
            decoration={<ReportColumns covers={covers} paused={ambientPaused} />}
          />
        </div>
        <div className="dash-enter-soft min-h-0" style={enter(1)}>
          <KpiCard
            label="Readings" value={data.readings} animate={animate}
            onOpen={openers[1]} destination={KPI_TARGETS[1].name}
            decoration={<LibraryCorner readings={data.readingRows} compact={isPhone} animate={animate} />}
          />
        </div>
        {/* The swarm gets a wider column than the other three ornaments.
            It is the only composition here that is a GROUP rather than a
            single object, and a group needs room to be one: at 46% it was
            a handful of faces in a corner. */}
        <div className="dash-enter-soft min-h-0" style={enter(2)}>
          <KpiCard
            label="Members" value={data.members} animate={animate} wideDecoration
            onOpen={openers[2]} destination={KPI_TARGETS[2].name}
            decoration={<MemberRings avatars={data.avatars} compact={isPhone} paused={ambientPaused} />}
          />
        </div>
        <div className="dash-enter-soft min-h-0" style={enter(3)}>
          <KpiCard
            label="Alumni Network" value={data.alumni} animate={animate}
            onOpen={openers[3]} destination={KPI_TARGETS[3].name}
            decoration={<GlobeOrnament paused={ambientPaused} />}
          />
        </div>
      </div>

      {/* Lower grid. Two rows of unequal halves on a wide screen, each
          row with its own split, so the two rows are separate grids. On a
          narrow screen every card is full width, in the same order, at a
          height that keeps its chart readable. */}
      <div className="flex-1 min-h-0 flex flex-col gap-3">
        {/* ORDER DIFFERS BY BREAKPOINT, deliberately. On a wide screen
            Research sits left of the Current update. On a phone the
            Current update comes FIRST, directly under the KPI row: it is
            the only card that asks the reader to do something, and it was
            arriving under three charts. */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[40fr_60fr] gap-3 lg:min-h-[clamp(210px,25vh,300px)]">
          <div className="dash-enter order-2 lg:order-1 h-[264px] lg:h-auto min-h-0" style={enter(4)}>
            <ResearchByDivisionBlock
              rows={data.divisionCounts}
              currentLabel={data.semester.label}
              previousLabel={data.previous.label}
            />
          </div>
          {/* Taller on a phone than the other cards. It is the only one
              that carries a sentence, a picture and an action at once,
              and the Association on Display state needs all three to
              stand in it without the photograph being reduced to a
              strip. */}
          <div className="dash-enter order-1 lg:order-2 h-[360px] lg:h-auto min-h-0" style={enter(5)}>
            <CurrentUpdateBlock update={data.latestUpdate} ok={data.latestUpdateOk} onNavigate={onNavigate} />
          </div>
        </div>
        {/* Three cards across, 34 / 30 / 36 of the row once the two gaps
            are taken out of the width. The doughnut used to take 25, the
            smallest share of the three, and it is the one chart of the
            four that carries labels on BOTH SIDES of its drawing: width
            is exactly what it is short of, and at 25 per cent of a
            laptop's row its captions were rendering at four pixels.
            The three share a row from xl up. Between lg and xl they were
            slivers of about 207px, where the doughnut's captions rendered
            at six pixels; below xl they now take the full width one under
            another, which is the shape a chart with side labels needs.
            Every width where that adds scrolling was already scrolling.
            On a phone they stack too, with the doughnut last: it is the
            most compact reading and the least urgent. */}
        <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-[34fr_30fr_36fr] gap-3 xl:min-h-[clamp(210px,25vh,300px)]">
          <div className="dash-enter h-[300px] xl:h-auto min-h-0" style={enter(6)}>
            <FundPerformanceBlock series={data.fundSeries} animate={animate} enterDelay={chartDelay(6)} />
          </div>
          <div className="dash-enter order-3 lg:order-none h-[300px] xl:h-auto min-h-0" style={enter(7)}>
            <ReportsMixBlock shares={data.divisionShares} animate={animate} />
          </div>
          <div className="dash-enter h-[300px] xl:h-auto min-h-0" style={enter(8)}>
            <AlumniGrowthBlock years={data.alumniYears} narrow={!isDesktop} animate={animate} enterDelay={chartDelay(8)} />
          </div>
        </div>
      </div>
    </div>
  );
}
