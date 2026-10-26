import { useLayoutEffect, useRef, type ReactNode } from 'react';

// =====================================================================
// A register on a computer, with its header kept in view (Step 98 kit).
// ---------------------------------------------------------------------
// THE HEADER STAYS AT THE TOP OF THE PAGE WHILE THE ROWS SCROLL UNDER
// IT, so the columns, and the filters in them, are named at row forty as
// at row one.
//
// A sticky header needs the page itself to be the thing that scrolls:
// a box with its own sideways scroll bar is also a box that scrolls up
// and down, and the header would stick inside a box that never moves.
// So the frame has no scroll bar of its own. A register wider than the
// page (Candidates Screening at most widths) widens the page instead:
// the workspace's content pane scrolls sideways, with its bar at the
// bottom of the window, always in reach rather than after the last row.
//
// The rest of the page must not slide away with it, so:
//   `RegisterPage` wraps the whole page and is as wide as the register
//   needs, never narrower than the pane;
//   `Pinned` wraps each part above and below the register, keeps the
//   width of the pane and stays where it was drawn while the register
//   moves under the reader's hand;
//   the register's first column, which says whose row it is, stays too.
//
// From `lg` up only: on a phone the page shows its rows as cards
// (`RecordList`) and none of this applies.
// =====================================================================

export function RegisterPage({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  // The pane's inner width, for `Pinned`. Measured, because CSS has no
  // unit for "the width of the box that scrolls" from inside it.
  useLayoutEffect(() => {
    const page = ref.current;
    const pane = page?.closest<HTMLElement>('[data-ws-pane]');
    if (!page || !pane) return;
    const set = () => {
      const cs = getComputedStyle(pane);
      const inner = pane.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      page.style.setProperty('--ws-pane-inner', `${Math.max(0, Math.floor(inner))}px`);
    };
    set();
    const ro = new ResizeObserver(set);
    ro.observe(pane);
    return () => ro.disconnect();
  }, []);
  // `w-fit`, not `w-max`: the register wraps its cells to the pane's width
  // as it always did, and widens the page only by what it cannot wrap.
  return <div ref={ref} className={`lg:w-fit lg:min-w-full ${className}`}>{children}</div>;
}

/**
 * A part of the page that stays in place while a wide register scrolls
 * the pane sideways. A sticky offset is measured from inside the pane's
 * padding, so `left-0` keeps the part exactly where it was drawn.
 */
export function Pinned({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`lg:sticky lg:left-0 lg:w-[var(--ws-pane-inner,100%)] ${className}`}>{children}</div>;
}

/** The register's frame: no scroll bar of its own (see above). Hidden on a phone. */
export function RegisterFrame({ children }: { children: ReactNode }) {
  return <div className="hidden lg:block border border-separator">{children}</div>;
}

/**
 * The `<thead>` of a register: held against the top edge of the pane
 * (`-top-6` cancels the pane's own top padding, which a sticky box keeps
 * clear), on the register's grey laid over white so that no row shows
 * through it.
 */
export const REGISTER_HEAD = 'sticky -top-6 z-10 text-muted-foreground shadow-[0_1px_0_hsl(var(--separator))] [&_th]:[background:linear-gradient(hsl(var(--muted)/0.4),hsl(var(--muted)/0.4)),hsl(var(--background))]';

/**
 * The column that says whose row it is stays in view while the register
 * scrolls sideways. On the `<th>` and every `<td>` of that column.
 *
 * REGISTER_FIRST_COLUMN is for the register's first column: its white
 * `::before` also covers the strip of the pane's padding to its left,
 * where the columns scrolling under it would otherwise show.
 * REGISTER_HELD_COLUMN is for a later one (the name after a date or a
 * photograph), which has a column of its own on its left and so no strip
 * to cover.
 */
export const REGISTER_HELD_COLUMN = 'sticky left-0 z-[1] shadow-[1px_0_0_hsl(var(--separator))] [td&]:bg-background';
export const REGISTER_FIRST_COLUMN = `${REGISTER_HELD_COLUMN} before:absolute before:inset-y-0 before:-left-6 before:w-6 before:bg-background before:content-['']`;
