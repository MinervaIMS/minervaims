import { useMemo } from 'react';
import { MiniAlumniGlobe } from '@/components/AlumniGlobe';
import type { AvatarRow } from './useDashboardData';

// =====================================================================
// The four KPI ornaments.
// ---------------------------------------------------------------------
// Each one lives inside the card's clipped right-hand column and is
// masked so it fades towards the card edge. Two rules govern all of them:
//
//   * AN ORNAMENT NEVER COMPETES WITH A NUMBER. Everything here runs at
//     low opacity and low amplitude. If it pulls the eye off the figure
//     beside it, it is too strong.
//   * AN ORNAMENT NEVER COSTS ANYTHING WHEN IT IS NOT BEING WATCHED.
//     Every loop is a CSS animation, paused by class when the tab is
//     hidden and not started at all under reduced motion.
//
// The keyframes are declared here rather than in the global stylesheet so
// the Dashboard carries its own motion and nothing outside this directory
// has to change.
// =====================================================================

export function DashboardMotionStyles() {
  return (
    <style>{`
      @keyframes dash-column-up { from { transform: translateY(0); } to { transform: translateY(-50%); } }
      @keyframes dash-drift { 0%,100% { transform: translate(0,0); } 50% { transform: translate(var(--dx), var(--dy)); } }
      @keyframes dash-book-rise { from { transform: scaleY(0.2); opacity: 0; } to { transform: scaleY(1); opacity: 1; } }
      .dash-paused, .dash-paused * { animation-play-state: paused !important; }
      @media (prefers-reduced-motion: reduce) {
        .dash-col, .dash-node { animation: none !important; }
        .dash-book { animation: none !important; transform: none !important; opacity: 1 !important; }
      }
    `}</style>
  );
}

/** Right-edge fade, shared by every ornament. */
const FADE: React.CSSProperties = {
  WebkitMaskImage: 'linear-gradient(to right, transparent 0%, #000 38%, #000 82%, transparent 100%)',
  maskImage: 'linear-gradient(to right, transparent 0%, #000 38%, #000 82%, transparent 100%)',
};

// --- Reports ----------------------------------------------------------

/** One miniature report: a cover block with a header bar and rule lines. */
function MiniReport({ tall }: { tall: boolean }) {
  return (
    <div
      className="w-full border border-accent/25 bg-accent/[0.07] p-[3px] flex flex-col gap-[2px]"
      style={{ height: tall ? 26 : 21 }}
    >
      <span className="block h-[3px] w-2/3 bg-accent/40" />
      <span className="block h-[2px] w-full bg-accent/20" />
      <span className="block h-[2px] w-5/6 bg-accent/20" />
      <span className="block h-[2px] w-3/4 bg-accent/20" />
    </div>
  );
}

/**
 * Three narrow columns of report thumbnails travelling upward, each at its
 * own speed. The column is rendered twice and translated by exactly half
 * its height, which is what makes the loop seamless.
 *
 * These are drawn, not rendered from the PDFs: nine live PDF renders would
 * cost more than the whole rest of the page for an ornament at 7% opacity.
 */
export function ReportColumns({ columns = 3, paused }: { columns?: number; paused: boolean }) {
  const speeds = [17, 13, 21];
  return (
    <div className={`absolute inset-0 flex justify-end gap-1.5 pr-3 opacity-[0.55] ${paused ? 'dash-paused' : ''}`} style={FADE}>
      {Array.from({ length: columns }).map((_, col) => (
        <div key={col} className="relative w-8 overflow-hidden">
          <div
            className="dash-col absolute inset-x-0 top-0 flex flex-col gap-1.5"
            style={{ animation: `dash-column-up ${speeds[col % speeds.length]}s linear infinite` }}
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <MiniReport key={i} tall={(i + col) % 3 === 0} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Members ----------------------------------------------------------

/** Deterministic placement, so the cluster does not jump between renders. */
function clusterSeed(index: number, count: number) {
  const golden = 2.399963;
  const angle = index * golden;
  const radius = count <= 1 ? 0 : Math.sqrt(index / count);
  return {
    x: 50 + Math.cos(angle) * radius * 33,
    y: 50 + Math.sin(angle) * radius * 33,
  };
}

function initials(a: AvatarRow) {
  return `${(a.name || '')[0] ?? ''}${(a.surname || '')[0] ?? ''}`.toUpperCase();
}

/**
 * The team swarm at card scale: one connected group rather than scattered
 * points, so the connecting web is drawn first and the photos sit on it.
 */
export function MemberSwarm({ avatars, count, paused }: { avatars: AvatarRow[] | null; count: number; paused: boolean }) {
  const nodes = useMemo(() => {
    const list = (avatars ?? []).slice(0, count);
    return list.map((a, i) => ({ avatar: a, ...clusterSeed(i, list.length) }));
  }, [avatars, count]);

  if (!nodes.length) return null;

  return (
    <div className={`absolute inset-0 opacity-[0.75] ${paused ? 'dash-paused' : ''}`} style={FADE}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
        {nodes.map((n, i) => nodes.slice(i + 1).map((m, j) => {
          const d = Math.hypot(n.x - m.x, n.y - m.y);
          if (d > 34) return null;
          return (
            <line
              key={`${i}-${j}`} x1={n.x} y1={n.y} x2={m.x} y2={m.y}
              stroke="hsl(var(--accent))" strokeOpacity={0.16} strokeWidth={0.4} vectorEffect="non-scaling-stroke"
            />
          );
        }))}
      </svg>
      {nodes.map((n, i) => (
        <span
          key={`${n.avatar.name}-${n.avatar.surname}-${i}`}
          className="dash-node absolute -translate-x-1/2 -translate-y-1/2 rounded-full overflow-hidden bg-muted border border-background flex items-center justify-center"
          style={{
            left: `${n.x}%`,
            top: `${n.y}%`,
            width: 22,
            height: 22,
            // Low amplitude by design: a couple of pixels over many seconds.
            ['--dx' as string]: `${((i % 3) - 1) * 2}px`,
            ['--dy' as string]: `${((i % 2) === 0 ? 1 : -1) * 2}px`,
            animation: `dash-drift ${9 + (i % 5)}s ease-in-out infinite`,
            animationDelay: `${i * 0.4}s`,
          }}
        >
          {n.avatar.photo_url
            ? <img src={n.avatar.photo_url} alt="" loading="lazy" className="h-full w-full object-cover" />
            : <span className="font-body text-[8px] text-muted-foreground">{initials(n.avatar)}</span>}
        </span>
      ))}
    </div>
  );
}

// --- Alumni -----------------------------------------------------------

/**
 * The same globe as the alumni page, sized to sit ENTIRELY inside the
 * card. It used to be positioned with negative offsets, which is why it
 * spilled over its own label on both desktop and mobile.
 */
export function GlobeOrnament({ paused }: { paused: boolean }) {
  return (
    <div className={`absolute inset-0 flex items-center justify-center opacity-90 ${paused ? 'dash-paused' : ''}`} style={FADE}>
      <div className="h-[86%] aspect-square">
        <MiniAlumniGlobe />
      </div>
    </div>
  );
}

// --- Readings ---------------------------------------------------------

/**
 * Books of varying height standing on the card's lower edge, in the
 * language of the /readings bookcase. They rise once on load and hold.
 */
export function BookShelf({ animate }: { animate: boolean }) {
  const books = [
    { h: 62, w: 13, tone: 'bg-accent/25' },
    { h: 78, w: 10, tone: 'bg-accent/40' },
    { h: 52, w: 15, tone: 'bg-accent-soft/50' },
    { h: 70, w: 11, tone: 'bg-accent/30' },
  ];
  return (
    <div className="absolute inset-0 flex items-end justify-center gap-1.5 pb-0" style={FADE} aria-hidden="true">
      {books.map((b, i) => (
        <span
          key={i}
          className={`dash-book block origin-bottom ${b.tone}`}
          style={{
            height: b.h,
            width: b.w,
            animation: animate ? `dash-book-rise 620ms cubic-bezier(.22,1,.36,1) ${i * 90}ms both` : undefined,
          }}
        />
      ))}
      <span className="absolute inset-x-0 bottom-0 h-px bg-accent/30" />
    </div>
  );
}
