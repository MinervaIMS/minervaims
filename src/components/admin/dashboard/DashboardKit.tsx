import { type ReactNode } from 'react';
import { useAnimatedCounter } from '@/hooks/useAnimatedCounter';
import type { Comparison } from './useDashboardData';

// =====================================================================
// DashboardKit — the shared shell every block on the Dashboard sits in.
// ---------------------------------------------------------------------
// This is an internal instrument panel, so the rules are the same for
// every block and they are enforced here rather than repeated:
//
//  * A BLOCK IS A FIXED HEIGHT. The chart fits the block; the block does
//    not grow to fit the chart. That is what keeps the whole page inside
//    one screen and what stops the grid reflowing as data arrives.
//  * A SKELETON HAS THE SAME HEIGHT AS ITS BLOCK, for the same reason.
//  * NOTHING OVERFLOWS ITS CARD. Every decorative layer is clipped by
//    the card, and every caption is a single line of fixed height, so a
//    long one can never make its card taller than the one beside it.
// =====================================================================

interface BlockProps {
  title: string;
  /** Sits on the title line, right aligned. */
  aside?: ReactNode;
  /** One line under the title, for a legend. Never a sentence. */
  legend?: ReactNode;
  children: ReactNode;
  /** The one filled block on the page. */
  filled?: boolean;
  delay?: number;
  /**
   * The block's height, as one class so two competing `h-` utilities can
   * never both apply. 300px on the desktop grid; a block whose content
   * includes a control below the chart asks for more on a phone, where
   * the chart still has to reach 220px.
   */
  heightClass?: string;
  className?: string;
}

/** A lower-grid block: fixed height, title, optional legend, then content. */
export function Block({
  title, aside, legend, children, filled = false, delay = 0,
  heightClass = 'h-[300px]', className = '',
}: BlockProps) {
  return (
    <section
      className={`${heightClass} flex flex-col overflow-hidden border p-5 font-body animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-both motion-reduce:animate-none ${
        filled ? 'bg-accent text-accent-foreground border-accent' : 'bg-background border-separator'
      } ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="shrink-0 flex items-baseline justify-between gap-3">
        <h2 className={`font-serif text-lg leading-tight ${filled ? '' : 'text-accent'}`}>{title}</h2>
        {aside && <div className="shrink-0 text-xs">{aside}</div>}
      </div>
      {legend && <div className="shrink-0 mt-1.5 text-[11px] leading-tight">{legend}</div>}
      <div className="flex-1 min-h-0 mt-2">{children}</div>
    </section>
  );
}

/** A block-shaped placeholder, so the grid never moves as data arrives. */
export function BlockSkeleton({ title, filled = false, heightClass = 'h-[300px]' }: {
  title: string; filled?: boolean; heightClass?: string;
}) {
  return (
    <section className={`${heightClass} flex flex-col overflow-hidden border p-5 font-body ${
      filled ? 'bg-accent text-accent-foreground border-accent' : 'bg-background border-separator'
    }`}>
      <h2 className={`font-serif text-lg leading-tight ${filled ? '' : 'text-accent'}`}>{title}</h2>
      <div className={`flex-1 min-h-0 mt-3 animate-pulse ${filled ? 'bg-accent-foreground/10' : 'bg-muted/50'}`} />
    </section>
  );
}

/** The comparison line under a KPI number. One line, fixed height. */
function ComparisonLine({ comparison }: { comparison: Comparison | null }) {
  if (!comparison) return <span className="text-muted-foreground/70">&mdash;</span>;
  if (comparison.delta === undefined) {
    return <span className="text-muted-foreground">{comparison.reference}</span>;
  }
  const { delta, reference, tone } = comparison;
  const arrow = delta > 0 ? '↑' : delta < 0 ? '↓' : '→';
  const sign = delta > 0 ? '+' : '';
  return (
    <span className={tone === 'up' ? 'text-[hsl(142_52%_34%)]' : 'text-muted-foreground'}>
      {arrow} {sign}{delta} vs {reference}
    </span>
  );
}

interface KpiProps {
  label: string;
  /** null renders a dash: the figure could not be read. */
  value: number | null;
  comparison: Comparison | null;
  /** Clipped to the right 45% of the card. */
  decoration?: ReactNode;
  delay: number;
  animate: boolean;
  /**
   * While the queries are in flight the card shows a placeholder. Once
   * they have finished, a null value means the figure could not be read
   * and shows a dash. The two are different statements and must not look
   * the same.
   */
  loading: boolean;
}

/**
 * One KPI. The number takes the left 55%, the ornament the right 45%, and
 * the ornament is clipped by the card so it can never reach the label.
 */
export function KpiCard({ label, value, comparison, decoration, delay, animate, loading }: KpiProps) {
  const shown = useAnimatedCounter(value ?? 0, 1000, animate && value !== null);
  return (
    <div
      className="relative overflow-hidden border border-separator bg-background p-5 h-[150px] sm:h-[160px] xl:aspect-[2.2/1] xl:h-auto xl:min-h-[150px] xl:max-h-[175px] animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both motion-reduce:animate-none"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* The ornament lives in its own clipped column and is never a
          sibling the text has to flow around. */}
      {decoration && (
        <div className="pointer-events-none absolute inset-y-0 right-0 w-[45%] overflow-hidden" aria-hidden="true">
          {decoration}
        </div>
      )}
      {/* The label and the number keep to the left 55%, clear of the
          ornament. The comparison line is allowed the full width: it reads
          over the ornament's faded edge, and on a 320px phone confining it
          to half a card would truncate the one thing it has to say. */}
      <div className="relative z-10 h-full flex flex-col justify-between">
        <span className="w-[55%] font-body text-[11px] uppercase tracking-wider text-muted-foreground truncate">{label}</span>
        {loading ? (
          <span className="block h-9 xl:h-12 w-20 bg-muted/60 animate-pulse" aria-hidden="true" />
        ) : (
          <span className="w-[55%] font-serif text-4xl xl:text-5xl leading-none text-accent tabular-nums">
            {value === null ? '—' : shown}
          </span>
        )}
        <span className="font-body text-[11px] leading-4 h-4 truncate">
          {loading
            ? <span className="block h-3 w-28 bg-muted/50 animate-pulse" aria-hidden="true" />
            : <ComparisonLine comparison={comparison} />}
        </span>
      </div>
    </div>
  );
}
