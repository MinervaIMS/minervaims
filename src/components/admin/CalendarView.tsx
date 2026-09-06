import { useCallback, useEffect, useState, type ReactNode, type RefObject } from 'react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

// =====================================================================
// CalendarView — the behaviour the two month grids share.
// ---------------------------------------------------------------------
// The workspace has two calendars, the main one and the Media team's
// editorial one. They are separate components because they hold separate
// data, but everything a reader DOES with a month grid is the same in
// both, and until now each had its own answer, or no answer at all:
//
//   * ADDING ON A DAY was a single click, and only on the day NUMBER -
//     a five-pixel target, unlabelled, that nothing on the page
//     suggested. Most people never found it. It is now a DOUBLE CLICK
//     anywhere in the day, which is what a calendar grid has meant since
//     calendars had grids, with a "+" that appears on hover so the
//     gesture is discoverable rather than folklore.
//
//   * READING AN ENTRY meant opening it. A month cell can hold three
//     words of a title before it truncates, so finding out what
//     something actually was required opening a dialog and closing it
//     again. HOVERING now shows the whole thing: the full title, the
//     date, and whatever else that calendar knows.
//
//   * THE GRID WAS ONE SIZE, and that size was 92px a day - roughly
//     three months on a laptop screen before scrolling, which for
//     planning a semester is not enough to see. The zoom below goes down
//     to 56px, which is most of a term at once, and up to 108px for
//     working inside a single busy week.
//
// The zoom is remembered per calendar, because the two are used for
// different things and a reader who wants the editorial plan wide does
// not necessarily want the main calendar wide.
// =====================================================================

export type CalendarZoom = 'far' | 'mid' | 'near';

interface ZoomSpec {
  /** Minimum height of a day cell. */
  cell: string;
  /** Padding inside a day cell. */
  pad: string;
  /** The day number. */
  day: string;
  /** An entry chip. */
  chip: string;
  /** How many entries a day shows before it summarises the rest. */
  max: number;
}

export const CALENDAR_ZOOM: Record<CalendarZoom, ZoomSpec> = {
  far: { cell: 'min-h-[56px]', pad: 'p-1', day: 'text-[11px]', chip: 'text-[10px] leading-[1.15] px-1 py-[1px]', max: 2 },
  mid: { cell: 'min-h-[74px]', pad: 'p-1.5', day: 'text-xs', chip: 'text-[11px] leading-tight px-1.5 py-0.5', max: 3 },
  near: { cell: 'min-h-[108px]', pad: 'p-2', day: 'text-sm', chip: 'text-xs leading-tight px-1.5 py-1', max: 6 },
};

const ZOOM_ORDER: CalendarZoom[] = ['far', 'mid', 'near'];
const ZOOM_LABEL: Record<CalendarZoom, string> = { far: 'Small', mid: 'Medium', near: 'Large' };

/**
 * The remembered zoom for one calendar.
 *
 * `far` is the default, and deliberately so: the complaint was that the
 * grid was too big, and a calendar that opens showing a term is more
 * useful than one that opens showing six weeks. Anybody who wants the
 * old size is one click away from it, and that click is remembered.
 */
export function useCalendarZoom(storageKey: string): [CalendarZoom, (z: CalendarZoom) => void] {
  const [zoom, setZoom] = useState<CalendarZoom>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === 'far' || saved === 'mid' || saved === 'near') return saved;
    } catch {
      // Private browsing, or storage switched off. The default is fine.
    }
    return 'far';
  });
  const set = useCallback((z: CalendarZoom) => {
    setZoom(z);
    try { localStorage.setItem(storageKey, z); } catch { /* nothing worth reporting */ }
  }, [storageKey]);
  return [zoom, set];
}

/**
 * Three sizes, shown as three sizes.
 *
 * `data-ro` because changing how big the grid is drawn is not an edit:
 * a role with view-only access keeps it, exactly as it keeps the search
 * box and the filters.
 */
export function CalendarZoomControl({ value, onChange }: {
  value: CalendarZoom;
  onChange: (z: CalendarZoom) => void;
}) {
  return (
    <div data-ro className="flex items-center border border-separator w-full" role="group" aria-label="Calendar size">
      {ZOOM_ORDER.map((z) => (
        <button
          key={z}
          data-ro
          type="button"
          onClick={() => onChange(z)}
          aria-pressed={value === z}
          title={`${ZOOM_LABEL[z]} month view`}
          className={`h-9 flex-1 px-3 font-body text-xs transition-colors ${
            value === z ? 'bg-accent text-accent-foreground' : 'bg-background text-muted-foreground hover:bg-muted'
          }`}
        >
          {ZOOM_LABEL[z]}
        </button>
      ))}
    </div>
  );
}

/**
 * One line of a hover preview: a label and its value, or nothing at all
 * when there is no value. Rows that would print "Responsible: -" are
 * simply absent, so a preview is always as long as it has something to
 * say and no longer.
 */
export function PreviewRow({ label, value }: { label: string; value?: ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

/**
 * The preview itself, wrapped around whatever chip the calendar draws.
 *
 * OPENING IS QUICK AND CLOSING IS QUICKER. 220ms in means a cursor
 * crossing the grid on its way somewhere else does not trail a card
 * behind it; no delay out means the card is gone the moment the reader
 * has finished with it. `pointer-events-none` on the content is what
 * stops the card from covering the chip it describes and stealing the
 * click that opens it.
 */
export function CalendarHoverPreview({ title, children, meta }: {
  title: string;
  /** The chip. */
  children: ReactNode;
  /** The rows. Usually a fragment of `PreviewRow`s. */
  meta: ReactNode;
}) {
  return (
    <HoverCard openDelay={220} closeDelay={0}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        side="top"
        align="start"
        className="pointer-events-none w-72 space-y-1.5 font-body"
      >
        <p className="font-serif text-base leading-snug text-accent">{title}</p>
        <div className="space-y-0.5">{meta}</div>
      </HoverCardContent>
    </HoverCard>
  );
}

/**
 * A day cell that adds on a double click.
 *
 * WHY DOUBLE AND NOT SINGLE. A day holds entries, and those entries are
 * buttons: a single click on the cell would fire whenever somebody
 * clicked slightly off one of them, and the failure mode of that is a
 * blank "add" dialog opening on top of the thing they were trying to
 * read. Double-clicking is unambiguous, it is what every calendar
 * application already uses, and it leaves single clicks to the entries.
 *
 * `onDoubleClick` is not reachable by keyboard, so the "+" that appears
 * on hover is a real button rather than an icon: it carries the same
 * action, it is in the tab order, and it is how anybody working without
 * a mouse adds an entry to a specific day.
 */
export function CalendarDayCell({ className, onAdd, canAdd, date, children }: {
  className: string;
  onAdd: (date: string) => void;
  canAdd: boolean;
  date: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`group relative ${className}`}
      onDoubleClick={canAdd ? () => onAdd(date) : undefined}
    >
      {canAdd && (
        <button
          type="button"
          onClick={() => onAdd(date)}
          title="Add on this day"
          aria-label={`Add on ${date}`}
          className="absolute right-0.5 top-0.5 z-[1] hidden h-5 w-5 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-accent focus-visible:opacity-100 group-hover:opacity-100 sm:flex"
        >
          <span aria-hidden className="text-sm leading-none">+</span>
        </button>
      )}
      {children}
    </div>
  );
}

// =====================================================================
// OPENING ON THE CURRENT MONTH WITHOUT DRAGGING THE PAGE WITH IT.
// ---------------------------------------------------------------------
// This is why the calendars opened halfway down the page, with the title
// and the description already scrolled off the top.
//
// `scrollIntoView` does not scroll one box. It walks EVERY scrollable
// ancestor until the element is visible in all of them, and the month
// grid sits inside the workspace's own content pane, which scrolls. So
// asking for September brought September into view inside the grid AND
// pulled the whole pane down far enough to put September on screen,
// which meant the page header went off the top of it. The workspace
// resets that pane to zero when a subsection opens; this ran afterwards,
// on the tick the data arrived, and undid it.
//
// So the box is scrolled by arithmetic instead, and only ever the box.
// The main calendar already worked this way and carried a comment saying
// exactly this; the shared hook, written later, reintroduced the fault
// for the editorial calendar. Both go through this now, so there is one
// implementation and one place for it to be right.
//
// THE SECOND FRAME MATTERS. The effect fires on the commit that renders
// the months, before the browser has laid them out, so on a cold load the
// measurement can be taken against a grid that is not its final height.
// One repeat on the next frame costs nothing and is the difference
// between landing on the current month and landing near it.
// =====================================================================
export function useScrollToCurrentMonth(
  ready: boolean,
  boxRef: RefObject<HTMLElement>,
  idFor: (y: number, m: number) => string,
) {
  useEffect(() => {
    if (!ready) return;
    let frame = 0;
    const run = () => {
      const box = boxRef.current;
      if (!box) return;
      const now = new Date();
      const el = document.getElementById(idFor(now.getFullYear(), now.getMonth()));
      if (!el) return;
      box.scrollTop = box.scrollTop + el.getBoundingClientRect().top - box.getBoundingClientRect().top;
    };
    run();
    frame = requestAnimationFrame(run);
    return () => cancelAnimationFrame(frame);
  }, [ready, boxRef, idFor]);
}
