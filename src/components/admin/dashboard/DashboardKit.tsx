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
          {aside && (
            <div className={`font-body text-[11px] ${filled ? 'text-accent-foreground/80' : 'text-muted-foreground'}`}>
              {aside}
            </div>
          )}
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
  /** Lives in its own column and is clipped by it and by the card's curve. */
  decoration?: ReactNode;
  /** The one filled KPI, first in the row. */
  filled?: boolean;
  /** Gives the ornament a wider column, for a composition that needs it. */
  wideDecoration?: boolean;
  animate: boolean;
  /**
   * Where this figure leads. `null` when the reader's role cannot open
   * that subsection, which leaves the card inert rather than promising a
   * destination it would be refused.
   */
  onOpen?: (() => void) | null;
  /** The destination, named for the tooltip and for a screen reader. */
  destination?: string;
}

/**
 * One KPI: a number, a label and an ornament, in two COLUMNS.
 *
 * The ornament used to be an absolutely positioned overlay held off the
 * text by a mask. On a phone the card is half as wide and the mask no
 * longer cleared the figure, so a report cover sat across "164" and a
 * ring of portraits across "97". A column cannot do that: the text and
 * the ornament are siblings in a flex row, each clipping its own
 * overflow, so an overlap is structurally impossible at ANY width while
 * the ornament is still cut by the card's rounded corner.
 */
export function KpiCard({
  label, value, decoration, filled = false, wideDecoration = false, animate,
  onOpen = null, destination,
}: KpiProps) {
  const shown = useAnimatedCounter(value ?? 0, 1100, animate && value !== null);
  /*
   * THE WHOLE CARD IS THE CONTROL, and it is a BUTTON AT EVERY RENDER,
   * enabled or not.
   *
   * Swapping the element between a div and a button once a role settles
   * would replace the node, and replacing the node restarts the CSS entry
   * on its wrapper AND the ornament's own long animation from its first
   * frame: the report columns would jump back to the top, the swarm would
   * resnap. Rendering the button always and only toggling `disabled`
   * keeps the element, and therefore every animation on and inside it,
   * exactly where it was.
   *
   * Hover moves NOTHING. The card's border changes colour and that is
   * all: no scale, no lift, no shadow that grows the box. A transform on
   * this element would re-rasterise the dozen report covers and forty
   * portraits underneath it for the length of the transition, which is
   * the one thing these ornaments cannot afford.
   */
  const openable = typeof onOpen === 'function';
  return (
    <button
      type="button"
      disabled={!openable}
      onClick={openable ? onOpen : undefined}
      title={openable && destination ? `Open ${destination}` : undefined}
      aria-label={openable && destination
        ? `${label}: ${value === null ? 'unavailable' : value}. Open ${destination}.`
        : undefined}
      className={`h-full min-h-0 w-full flex overflow-hidden rounded-xl border text-left appearance-none transition-colors duration-200 outline-none ${
        filled ? 'bg-accent text-accent-foreground border-accent' : 'bg-background border-separator'
      } ${openable
        ? `cursor-pointer ${filled
          ? 'hover:border-accent-foreground/45 focus-visible:border-accent-foreground/70'
          : 'hover:border-accent/60 focus-visible:border-accent'}`
        : 'cursor-default'}`}
    >
      {/* The pair sits slightly ABOVE the card's centre: the extra bottom
          padding shortens the centring box, which lifts the label and the
          figure together without moving either off the optical middle. */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-2 pl-4 pr-1 sm:pl-5 sm:pr-2 pt-4 pb-8">
        {/* ONE TYPOGRAPHY AND ONE POSITION FOR ALL FOUR LABELS: the body
            face, bold, one size at every breakpoint, and TEN per cent
            letter spacing.

            ALUMNI NETWORK is the one that sets the size: at 12px with
            this tracking it measures 129px, and the text column of a KPI
            card is about 196px wide on the screen this Dashboard is
            actually used on, so all four stand on one line. */}
        <span
          className={`font-body text-[12px] font-bold uppercase tracking-[0.1em] leading-tight ${
            filled ? 'text-accent-foreground/85' : 'text-muted-foreground'
          }`}
        >
          {label}
        </span>
        <span
          className={`font-serif leading-[0.95] tabular-nums text-[2.5rem] sm:text-5xl xl:text-[3.5rem] ${
            filled ? '' : 'text-accent'
          }`}
        >
          {value === null ? '\u2014' : shown}
        </span>
      </div>
      {decoration && (
        /* THE ORNAMENT IS INERT AND SEALED.
           `pointer-events: none` means the cursor never enters it, so no
           hover rule, no canvas listener and no React handler inside it
           can ever fire: moving the mouse across the card cannot reach
           the animation to disturb it. This was lost when the ornament
           moved from an overlay into a column, and losing it is what let
           hover reach the globe and the portraits.
           `contain` seals the column off from the rest of the page, so
           nothing inside can trigger a layout or paint outside it. */
        <div
          className={`relative shrink-0 overflow-hidden pointer-events-none select-none ${
            wideDecoration ? 'w-[44%] sm:w-[52%]' : 'w-[42%] sm:w-[46%]'
          }`}
          style={{ contain: 'layout paint style' }}
          aria-hidden="true"
        >
          {decoration}
        </div>
      )}
    </button>
  );
}
