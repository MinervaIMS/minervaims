import { useIsDesktop } from '@/hooks/use-desktop';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { useDashboardData } from '@/components/admin/dashboard/useDashboardData';
import { KpiCard } from '@/components/admin/dashboard/DashboardKit';
import { usePageVisible, useReducedMotion } from '@/components/admin/dashboard/motion';
import { useReportCovers } from '@/components/admin/dashboard/useReportCovers';
import {
  DashboardMotionStyles, GlobeOrnament, LibraryCorner, MemberRings, ReportColumns,
} from '@/components/admin/dashboard/DashboardDecorations';
import DashboardGreeting from '@/components/admin/dashboard/DashboardGreeting';
import FundPerformanceBlock from '@/components/admin/dashboard/FundPerformanceBlock';
import CurrentUpdateBlock from '@/components/admin/dashboard/CurrentUpdateBlock';
import ResearchByDivisionBlock from '@/components/admin/dashboard/ResearchByDivisionBlock';
import AlumniGrowthBlock from '@/components/admin/dashboard/AlumniGrowthBlock';

// =====================================================================
// Dashboard.
// ---------------------------------------------------------------------
//   greeting                                        full Minerva mark
//   Reports | Readings | Members | Alumni Network
//   research by division (40%)   |  current update (60%)
//   fund performance    (55%)    |  alumni growth  (45%)
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

export default function WorkspaceDashboard({ onNavigate }: {
  onNavigate?: (section: string, sub: string | null) => void;
}) {
  const data = useDashboardData();
  const reduced = useReducedMotion();
  const visible = usePageVisible();
  const isDesktop = useIsDesktop();
  const covers = useReportCovers(data.reportFiles);

  const animate = !reduced;
  const ambientPaused = reduced || !visible;

  // One gate for the whole page. Everything below mounts together.
  if (data.loading) return <div className="h-full"><WorkspaceLoader /></div>;

  return (
    <div className="flex flex-col gap-3 font-body lg:h-full lg:min-h-0 pb-16 lg:pb-0">
      <DashboardMotionStyles />

      <DashboardGreeting userId={data.userId} vars={data.greetingVars} />

      {/* KPI row. Reports carries the filled treatment; the other three
          are light, so the row reads as one instrument panel with a
          single point of emphasis. */}
      <div className="shrink-0 grid grid-cols-2 xl:grid-cols-4 gap-3 h-[132px] sm:h-[148px] xl:h-[156px]">
        <KpiCard
          label="Reports" value={data.reportsAllTime} filled animate={animate}
          decoration={<ReportColumns covers={covers} paused={ambientPaused} />}
        />
        <KpiCard
          label="Readings" value={data.readings} animate={animate}
          decoration={<LibraryCorner readings={data.readingRows} animate={animate} />}
        />
        <KpiCard
          label="Members" value={data.members} animate={animate}
          decoration={<MemberRings avatars={data.avatars} compact={!isDesktop} paused={ambientPaused} />}
        />
        <KpiCard
          label="Alumni Network" value={data.alumni} animate={animate}
          decoration={<GlobeOrnament paused={ambientPaused} />}
        />
      </div>

      {/* Lower grid. Two rows of unequal halves on a wide screen, each
          row with its own split, so the two rows are separate grids. On a
          narrow screen every card is full width, in the same order, at a
          height that keeps its chart readable. */}
      <div className="flex-1 min-h-0 flex flex-col gap-3">
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[40fr_60fr] gap-3">
          <div className="h-[300px] lg:h-auto min-h-0">
            <ResearchByDivisionBlock
              rows={data.divisionCounts}
              currentLabel={data.semester.label}
              previousLabel={data.previous.label}
              animate={animate}
            />
          </div>
          <div className="h-[300px] lg:h-auto min-h-0">
            <CurrentUpdateBlock update={data.latestUpdate} ok={data.latestUpdateOk} onNavigate={onNavigate} />
          </div>
        </div>
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[55fr_45fr] gap-3">
          <div className="h-[320px] lg:h-auto min-h-0">
            <FundPerformanceBlock series={data.fundSeries} animate={animate} />
          </div>
          <div className="h-[300px] lg:h-auto min-h-0">
            <AlumniGrowthBlock years={data.alumniYears} animate={animate} />
          </div>
        </div>
      </div>
    </div>
  );
}
