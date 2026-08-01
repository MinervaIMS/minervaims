import { useIsDesktop } from '@/hooks/use-desktop';
import { useDashboardData } from '@/components/admin/dashboard/useDashboardData';
import { KpiCard } from '@/components/admin/dashboard/DashboardKit';
import { useEntered, usePageVisible, useReducedMotion } from '@/components/admin/dashboard/motion';
import {
  BookShelf, DashboardMotionStyles, GlobeOrnament, MemberSwarm, ReportColumns,
} from '@/components/admin/dashboard/DashboardDecorations';
import DashboardGreeting from '@/components/admin/dashboard/DashboardGreeting';
import FundPerformanceBlock from '@/components/admin/dashboard/FundPerformanceBlock';
import LatestUpdateBlock from '@/components/admin/dashboard/LatestUpdateBlock';
import ResearchByDivisionBlock from '@/components/admin/dashboard/ResearchByDivisionBlock';
import AlumniGrowthBlock from '@/components/admin/dashboard/AlumniGrowthBlock';

// =====================================================================
// Dashboard. An internal instrument panel, not a marketing page.
// ---------------------------------------------------------------------
//   greeting                                      full Minerva mark
//   KPI  |  KPI  |  KPI  |  KPI
//   fund performance          |  latest update
//   research by division      |  alumni growth
//
// Words on this page exist to make a number understandable, not to
// comment on it, so every editorial caption is gone. The only filled
// block is Latest update, because it is the only one that asks the
// reader to do something.
//
// Every figure comes from `useDashboardData`, and every source there
// fails alone: a block whose data could not be read shows a skeleton or a
// dash AT ITS FINAL HEIGHT, so the grid never reflows as data arrives and
// no number on this page is ever a placeholder.
//
// The entry sequence is staggered to finish inside 1.2s. Ambient loops
// stop when the tab is hidden and never start under reduced motion.
//
// The bottom padding is not decoration: the workspace help button is
// fixed to the bottom right, and this is the clearance that stops it
// landing on the last card.
// =====================================================================

export default function WorkspaceDashboard(_props: { onNavigate?: (section: string, sub: string | null) => void }) {
  const data = useDashboardData();
  const reduced = useReducedMotion();
  const visible = usePageVisible();
  const isDesktop = useIsDesktop();
  const entered = useEntered(40);

  const animate = !reduced;
  const ambientPaused = reduced || !visible;

  return (
    <div className="flex flex-col gap-4 font-body pb-20">
      <DashboardMotionStyles />

      <DashboardGreeting userId={data.userId} vars={data.greetingVars} ready={data.greetingReady} />

      {/* KPI row. One treatment for all four, so the row reads as one
          instrument panel, and one fixed-height caption line, so a card
          can never be taller than the one beside it. */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Reports"
          value={data.reportsAllTime}
          comparison={data.reportsComparison}
          delay={0}
          animate={animate}
          loading={data.loading}
          decoration={<ReportColumns columns={isDesktop ? 3 : 2} paused={ambientPaused} />}
        />
        <KpiCard
          label="Members"
          value={data.members}
          comparison={data.membersComparison}
          delay={60}
          animate={animate}
          loading={data.loading}
          decoration={<MemberSwarm avatars={data.avatars} count={isDesktop ? 9 : 5} paused={ambientPaused} />}
        />
        <KpiCard
          label="Alumni"
          value={data.alumni}
          comparison={data.alumniComparison}
          delay={120}
          animate={animate}
          loading={data.loading}
          decoration={<GlobeOrnament paused={ambientPaused} />}
        />
        <KpiCard
          label="Readings"
          value={data.readings}
          comparison={data.readingsComparison}
          delay={180}
          animate={animate}
          loading={data.loading}
          decoration={<BookShelf animate={animate && entered} />}
        />
      </div>

      {/* Lower grid: two equal halves, two rows. On a phone the blocks
          stack with the actionable one first. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="order-2 lg:order-1">
          <FundPerformanceBlock series={data.fundSeries} delay={240} animate={animate} />
        </div>
        <div className="order-1 lg:order-2">
          <LatestUpdateBlock update={data.latestUpdate} ok={data.latestUpdateOk} loading={data.loading} delay={300} />
        </div>
        <div className="order-3">
          <ResearchByDivisionBlock
            rows={data.divisionCounts}
            currentLabel={data.semester.label}
            previousLabel={data.previous.label}
            delay={360}
            animate={animate}
          />
        </div>
        <div className="order-4">
          <AlumniGrowthBlock points={data.alumniHistory} delay={420} animate={animate} />
        </div>
      </div>
    </div>
  );
}
