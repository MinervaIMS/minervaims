import { useCallback, useMemo } from 'react';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { useAccess } from '@/hooks/useAccess';
import type { ResourceKey } from '@/lib/access/matrix';
import { useDashboardData } from '@/components/admin/dashboard/useDashboardData';
import { KpiCard } from '@/components/admin/dashboard/DashboardKit';
import { useMediaMatch, usePageVisible, useReducedMotion } from '@/components/admin/dashboard/motion';
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
// THE PAGE PREFERS ONE DESKTOP SCREEN, BUT READABILITY COMES FIRST.
// The root fills the content pane and the two lower rows share what the
// greeting and the KPI row leave, which on a tall window puts everything
// on one screen with nothing to scroll.
//
// It used to insist on that. The rows were bounded to whatever was left,
// so on a laptop, or a window a person had made shorter, the charts were
// squeezed until the axis of Research by division showed one tick and
// the doughnut's labels shrank with their viewBox into something nobody
// could read. A chart that fits and cannot be read has not fitted.
//
// So each row now carries a FLOOR. Above it the rows still stretch to
// fill the screen; below it they stop, the page grows past the viewport,
// and the pane scrolls. Scrolling is the compromise, and it is the right
// way round: a reader can scroll, and cannot un-shrink a label.
// Below `lg` the cards stack at their own heights, as they always did.
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
  const { covers, ready: coversReady } = useReportCovers(data.reportFiles);

  const animate = !reduced;
  const ambientPaused = reduced || !visible;
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

  // ONE GATE FOR THE WHOLE PAGE. The loader holds the pane until every
  // query has answered, the reader's NAME has settled and the decorative
  // assets are drawn, so when it lifts the structure is complete, no
  // chart is missing and nothing pops in afterwards. The cover renderer
  // reports ready on a cap as well as on success, so a slow PDF can never
  // hold the Dashboard hostage.
  //
  // The name is part of the gate because the greeting is chosen from it:
  // without it the sentence was picked from the unnamed pool and then
  // REPLACED a moment later, in front of the reader. Every query runs in
  // parallel, so waiting for the name costs nothing beyond the slowest of
  // them.
  if (!data.greetingReady || !coversReady) return <div className="h-full"><WorkspaceLoader /></div>;

  return (
    <div className="flex flex-col gap-3 font-body lg:min-h-full pb-16 lg:pb-0">
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
      <div className="shrink-0 grid grid-cols-2 xl:grid-cols-4 gap-3 auto-rows-[160px] sm:auto-rows-[168px] xl:auto-rows-[156px]">
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
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[40fr_60fr] gap-3 lg:min-h-[300px]">
          <div className="dash-enter order-2 lg:order-1 h-[264px] lg:h-auto lg:min-h-[300px]" style={enter(4)}>
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
          <div className="dash-enter order-1 lg:order-2 h-[360px] lg:h-auto lg:min-h-[300px]" style={enter(5)}>
            <CurrentUpdateBlock update={data.latestUpdate} ok={data.latestUpdateOk} onNavigate={onNavigate} />
          </div>
        </div>
        {/* Three cards across, 35 / 25 / 40 of the row once the two gaps
            are taken out of the width. On a phone they stack, with the
            doughnut last: it is the most compact reading and the least
            urgent. */}
        <div className="flex-1 grid grid-cols-1 xl:grid-cols-[35fr_25fr_40fr] gap-3 xl:min-h-[310px]">
          <div className="dash-enter h-[320px] xl:h-auto xl:min-h-[310px]" style={enter(6)}>
            <FundPerformanceBlock series={data.fundSeries} animate={animate} enterDelay={chartDelay(6)} />
          </div>
          <div className="dash-enter order-3 lg:order-none h-[320px] xl:h-auto xl:min-h-[310px]" style={enter(7)}>
            <ReportsMixBlock shares={data.divisionShares} animate={animate} />
          </div>
          <div className="dash-enter h-[320px] xl:h-auto xl:min-h-[310px]" style={enter(8)}>
            <AlumniGrowthBlock years={data.alumniYears} narrow={!isDesktop} animate={animate} enterDelay={chartDelay(8)} />
          </div>
        </div>
      </div>
    </div>
  );
}
