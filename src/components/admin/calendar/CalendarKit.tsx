import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  WEEKDAYS_SHORT, addDays, addMonths, longDay, monthTitle, monthWeeks, sameMonth, todayYmd,
} from '@/lib/calendar-dates';

// =====================================================================
// The pieces both month calendars are built from (Calendar, Editorial).
// ---------------------------------------------------------------------
// ONE MONTH AT A TIME, WITH A WAY BACK TO TODAY. The calendars used to be
// an endless column of months in a scrolling box, which put the reader in
// charge of finding where they were. A month now has a title, arrows and
// a Today button, the way every calendar a member already uses works.
//
// THE GRID IS A GRID for assistive technology too: rows, column headers
// and cells, a label on every day ("Thursday 1 October 2026, 2 items"),
// and the arrow keys move between days (a week with up and down, a month
// with Page Up and Page Down, Home and End for the ends of a week).
//
// Everything that only changes what is on screen is marked `data-ro`, so a
// role that may only read a page keeps its navigation (see
// ReadOnlyRegion.tsx).
// =====================================================================

export type ViewOption<V extends string> = { value: V; label: string; icon?: ReactNode };

/** Month title, arrows, Today, and the view switch. */
export function CalendarToolbar<V extends string>({ cursor, onCursor, views, view, onView, extra, title }: {
  cursor: string;
  /** Instead of the month's name, for a view that shows more than one month. */
  title?: string;
  onCursor: (ymd: string) => void;
  views?: ViewOption<V>[];
  view?: V;
  onView?: (v: V) => void;
  /** Anything that belongs on the right of the title, before the views. */
  extra?: ReactNode;
}) {
  const today = todayYmd();
  const onThisMonth = sameMonth(cursor, today);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <div className="flex items-center gap-1">
        <button
          data-ro type="button" onClick={() => onCursor(today)} disabled={onThisMonth}
          className="h-9 px-3 border border-separator bg-background font-body text-sm text-foreground hover:border-accent hover:text-accent disabled:opacity-100 disabled:text-muted-foreground disabled:hover:border-separator"
        >
          Today
        </button>
        <button data-ro type="button" onClick={() => onCursor(addMonths(cursor, -1))} aria-label="Previous month"
          className="h-9 w-9 inline-flex items-center justify-center border border-separator bg-background text-foreground hover:border-accent hover:text-accent">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button data-ro type="button" onClick={() => onCursor(addMonths(cursor, 1))} aria-label="Next month"
          className="h-9 w-9 inline-flex items-center justify-center border border-separator bg-background text-foreground hover:border-accent hover:text-accent">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <h2 className="font-serif text-2xl text-accent min-w-[10ch]" aria-live="polite">{title ?? monthTitle(cursor)}</h2>
      <div className="flex-1" />
      {extra}
      {views && view && onView && <ViewTabs views={views} value={view} onChange={onView} />}
    </div>
  );
}

/** A segmented switch between views. Tabs, so a read-only role keeps it. */
export function ViewTabs<V extends string>({ views, value, onChange }: { views: ViewOption<V>[]; value: V; onChange: (v: V) => void }) {
  return (
    <div role="tablist" aria-label="View" className="inline-flex border border-separator bg-background">
      {views.map((v) => (
        <button
          key={v.value} data-ro type="button" role="tab" aria-selected={value === v.value}
          onClick={() => onChange(v.value)}
          className={`h-9 px-3 inline-flex items-center gap-1.5 font-body text-sm transition-colors ${
            value === v.value ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-accent hover:bg-accent/5'
          }`}
        >
          {v.icon}{v.label}
        </button>
      ))}
    </div>
  );
}

/**
 * A filter that is also the colour key: swatch, icon and name together,
 * so no colour has to be decoded from a separate legend, and nothing is
 * told by colour alone.
 */
export function FilterChip({ active, onToggle, swatch, icon, label, count }: {
  active: boolean;
  onToggle: () => void;
  /** Tailwind classes for the swatch. */
  swatch?: string;
  icon?: ReactNode;
  label: string;
  count?: number;
}) {
  return (
    <button
      data-ro type="button" aria-pressed={active} onClick={onToggle}
      className={`h-8 pl-2 pr-2.5 inline-flex items-center gap-1.5 border font-body text-[13px] transition-colors ${
        active ? 'border-accent/40 bg-background text-foreground' : 'border-dashed border-separator bg-muted/30 text-muted-foreground line-through decoration-muted-foreground/50'
      } hover:border-accent`}
    >
      {swatch && <span aria-hidden className={`h-2.5 w-2.5 shrink-0 ${swatch} ${active ? '' : 'opacity-40'}`} />}
      {icon && <span aria-hidden className={`inline-flex ${active ? '' : 'opacity-50'}`}>{icon}</span>}
      <span>{label}</span>
      {typeof count === 'number' && <span className="tabular-nums text-muted-foreground">{count}</span>}
      <span className="sr-only">{active ? '(shown)' : '(hidden)'}</span>
    </button>
  );
}

export interface DayState { inMonth: boolean; isToday: boolean; isSelected: boolean; isPast: boolean }

/**
 * A month as a grid of weeks. The page draws the inside of each day; the
 * grid draws the frame, the day number, today and the selection, and
 * handles the keyboard.
 */
export function MonthGrid({
  cursor, selected, onSelect, onCursor, renderDay, dayClass, dayLabel, onDayDoubleClick, compact = false, cellMinHeight = 'min-h-[118px]', onDayDrop, hideOutside = false,
}: {
  cursor: string;
  selected: string | null;
  onSelect: (ymd: string) => void;
  /** Called when the keyboard walks into another month. */
  onCursor: (ymd: string) => void;
  renderDay: (ymd: string, s: DayState) => ReactNode;
  /** Extra classes for a day: holidays, breaks. */
  dayClass?: (ymd: string, s: DayState) => string;
  /** Extra words for a day's accessible name: "2 items, exam session break". */
  dayLabel?: (ymd: string) => string;
  onDayDoubleClick?: (ymd: string) => void;
  /** Phone size: small cells, the page draws dots rather than titles. */
  compact?: boolean;
  cellMinHeight?: string;
  /** Something was dragged onto a day: the dragged item's id, and the day. */
  onDayDrop?: (ymd: string, id: string) => void;
  /** Leave the days of the neighbouring months blank (several months shown together). */
  hideOutside?: boolean;
}) {
  const today = todayYmd();
  const [dropDay, setDropDay] = useState<string | null>(null);
  const weeks = monthWeeks(cursor);
  const focusDay = selected && sameMonth(selected, cursor) ? selected : sameMonth(today, cursor) ? today : `${cursor.slice(0, 7)}-01`;
  const wrapRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<string | null>(null);

  // After the keyboard has moved the cursor into another month, focus the
  // day it arrived on once that month has drawn.
  useEffect(() => {
    const want = pendingFocus.current;
    if (!want) return;
    pendingFocus.current = null;
    const scope = wrapRef.current?.closest('[data-calendar-scope]') ?? wrapRef.current;
    scope?.querySelector<HTMLButtonElement>(`[data-day="${want}"][data-inmonth="1"]`)?.focus();
  }, [cursor]);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const day = target.getAttribute('data-day');
    if (!day) return;
    const move: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    let next: string | null = null;
    if (e.key in move) next = addDays(day, move[e.key]);
    else if (e.key === 'PageUp') next = addMonths(day, -1).slice(0, 8) + day.slice(8);
    else if (e.key === 'PageDown') next = addMonths(day, 1).slice(0, 8) + day.slice(8);
    else if (e.key === 'Home') next = addDays(day, -((new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7));
    else if (e.key === 'End') next = addDays(day, 6 - ((new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7));
    if (!next) return;
    // A 31st moved to a shorter month lands on that month's last day.
    const probe = new Date(`${next}T12:00:00Z`);
    if (Number.isNaN(probe.getTime()) || probe.toISOString().slice(0, 10) !== next) {
      next = addDays(addMonths(`${next.slice(0, 8)}01`, 1), -1);
    }
    e.preventDefault();
    onSelect(next);
    // The day may be in this grid or, with several months shown, in a
    // neighbouring one: focus it wherever it is drawn as its own month.
    const scope = wrapRef.current?.closest('[data-calendar-scope]') ?? wrapRef.current;
    const cell = scope?.querySelector<HTMLButtonElement>(`[data-day="${next}"][data-inmonth="1"]`);
    if (cell) cell.focus();
    else { pendingFocus.current = next; onCursor(next); }
  };

  return (
    <div ref={wrapRef} role="grid" aria-label={monthTitle(cursor)} onKeyDown={onKey} className="border-l border-t border-separator bg-background font-body">
      <div role="row" className="grid grid-cols-7">
        {WEEKDAYS_SHORT.map((d, i) => (
          <div key={d} role="columnheader" aria-label={['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][i]}
            className={`border-b border-r border-separator bg-muted/50 text-muted-foreground text-[11px] uppercase tracking-wider text-center ${compact ? 'py-1.5' : 'px-2 py-2'}`}>
            {compact ? d.slice(0, 1) : d}
          </div>
        ))}
      </div>
      {weeks.map((week) => (
        <div key={week[0]} role="row" className="grid grid-cols-7">
          {week.map((ymd) => {
            const s: DayState = { inMonth: sameMonth(ymd, cursor), isToday: ymd === today, isSelected: ymd === selected, isPast: ymd < today };
            const extra = dayLabel?.(ymd);
            if (hideOutside && !s.inMonth) {
              return <div key={ymd} role="gridcell" aria-hidden className={`border-b border-r border-separator bg-muted/20 ${compact ? 'min-h-[52px]' : cellMinHeight}`} />;
            }
            return (
              <div
                key={ymd} role="gridcell" aria-selected={s.isSelected}
                onClick={() => onSelect(ymd)}
                onDoubleClick={onDayDoubleClick ? () => onDayDoubleClick(ymd) : undefined}
                onDragOver={onDayDrop ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dropDay !== ymd) setDropDay(ymd); } : undefined}
                onDragLeave={onDayDrop ? () => setDropDay((d) => (d === ymd ? null : d)) : undefined}
                onDrop={onDayDrop ? (e) => { e.preventDefault(); setDropDay(null); const id = e.dataTransfer.getData('text/plain'); if (id) onDayDrop(ymd, id); } : undefined}
                className={`relative flex flex-col border-b border-r border-separator ${dropDay === ymd ? 'ring-2 ring-inset ring-accent bg-accent/[0.06]' : ''} ${compact ? 'min-h-[52px] items-center pt-1 pb-1.5' : `${cellMinHeight} p-1.5`} ${
                  s.inMonth ? 'bg-background' : 'bg-muted/30'
                } ${s.isSelected ? 'outline outline-2 -outline-offset-2 outline-accent/70' : ''} ${dayClass?.(ymd, s) ?? ''} cursor-pointer`}
              >
                <button
                  data-ro type="button" data-day={ymd} data-inmonth={s.inMonth ? '1' : '0'}
                  tabIndex={ymd === focusDay ? 0 : -1}
                  onClick={(e) => { e.stopPropagation(); onSelect(ymd); }}
                  aria-label={`${longDay(ymd)}${s.isToday ? ', today' : ''}${extra ? `, ${extra}` : ''}`}
                  aria-current={s.isToday ? 'date' : undefined}
                  className={`inline-flex h-7 min-w-[1.75rem] items-center justify-center px-1 text-[13px] tabular-nums leading-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                    s.isToday ? 'bg-accent text-accent-foreground font-semibold'
                      : s.inMonth ? 'text-foreground hover:bg-accent/10' : 'text-muted-foreground/70 hover:bg-accent/10'
                  } ${compact ? '' : 'self-start'}`}
                >
                  {Number(ymd.slice(8, 10))}
                </button>
                {renderDay(ymd, s)}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** An empty state that says why it is empty and what to do next. */
export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="border border-dashed border-separator px-5 py-8 text-center font-body">
      {icon && <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center bg-accent/5 text-accent">{icon}</div>}
      <p className="font-serif text-lg text-foreground">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{children}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
