import { type ReactNode } from 'react';
import { useAnimatedCounter } from '@/hooks/useAnimatedCounter';

// =====================================================================
// DashboardKit — the shell every card on the Dashboard sits in.
// ---------------------------------------------------------------------
// Three rules, enforced here rather than repeated in eight components:
//
//  * A CARD IS A ROUNDED, SEPARATED OBJECT. Rounded corners and a real
//    gap between cards are what made the earlier Dashboard read as a set
//    of instruments rather than as a table of hairlines. `overflow-hidden`
//    on the same element is what lets a decorative layer run to the edge
//    and be CUT BY THE CURVE, which is the effect that makes an ornament
//    look embedded in its card rather than pasted on top of it.
//
//  * A CARD FILLS THE HEIGHT IT IS GIVEN. The grid decides how tall a
//    row is; the chart inside adapts. That is what keeps the whole page
//    inside one desktop viewport without anything being cropped.
//
//  * A KPI IS A NUMBER AND A LABEL. Nothing else. The number is large
//    enough to be read across a room, the label never truncates, and
//    there is no comparison line competing with either.
// =====================================================================

interface BlockProps {
  title?: string;
  /** Sits on the title line, right aligned. */
  aside?: ReactNode;
  children: ReactNode;
  /** The one filled card on the page. */
  filled?: boolean;
  className?: string;
}

/** A lower-grid card: fills its grid cell, title optional, then content. */
export function Block({ title, aside, children, filled = false, className = '' }: BlockProps) {
  return (
    <section
      className={`h-full min-h-0 flex flex-col overflow-hidden rounded-xl border p-4 font-body ${
        filled ? 'bg-accent text-accent-foreground border-accent' : 'bg-background border-separator'
      } ${className}`}
    >
      {(title || aside) && (
        <div className="shrink-0 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1.5 mb-2">
          {title && <h2 className={`font-serif text-lg leading-tight ${filled ? '' : 'text-accent'}`}>{title}</h2>}
          {aside && <div className="font-body text-[11px] text-muted-foreground">{aside}</div>}
        </div>
      )}
      <div className="flex-1 min-h-0">{children}</div>
    </section>
  );
}

interface KpiProps {
  label: string;
  /** null renders a dash: the figure could not be read. */
  value: number | null;
  /** Runs edge to edge behind the text and is clipped by the card's curve. */
  decoration?: ReactNode;
  /** The one filled KPI, first in the row. */
  filled?: boolean;
  animate: boolean;
}

/**
 * One KPI. The number and the label keep to the left; the ornament has
 * the rest of the card and is deliberately cut by the rounded boundary.
 */
export function KpiCard({ label, value, decoration, filled = false, animate }: KpiProps) {
  const shown = useAnimatedCounter(value ?? 0, 1100, animate && value !== null);
  return (
    <div
      className={`relative h-full min-h-0 overflow-hidden rounded-xl border ${
        filled ? 'bg-accent text-accent-foreground border-accent' : 'bg-background border-separator'
      }`}
    >
      {decoration && (
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">{decoration}</div>
      )}
      <div className="relative z-10 h-full flex flex-col justify-center gap-1 p-4 sm:p-5">
        <span
          className={`font-body text-[11px] sm:text-xs uppercase tracking-[0.14em] whitespace-nowrap ${
            filled ? 'text-accent-foreground/75' : 'text-muted-foreground'
          }`}
        >
          {label}
        </span>
        <span
          className={`font-serif leading-[0.95] tabular-nums text-[2.75rem] sm:text-5xl xl:text-[3.5rem] ${
            filled ? '' : 'text-accent'
          }`}
        >
          {value === null ? '—' : shown}
        </span>
      </div>
    </div>
  );
}
