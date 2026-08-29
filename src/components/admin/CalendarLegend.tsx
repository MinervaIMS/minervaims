import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

// =====================================================================
// CalendarLegend — the colour key, folded away until it is asked for.
// ---------------------------------------------------------------------
// Both calendars used to print their key as a permanent band above the
// grid. On the main workspace calendar that band is ten entries long and
// wraps to two rows on a laptop, so a reader who already knows what
// amber means gave up the top of the screen to be told again, every
// visit, for ever. The editorial calendar had a shorter version of the
// same thing.
//
// The key itself is unchanged - every entry, every colour, the same
// wording. It is simply behind a control that sits WITH the calendar's
// other controls, and it opens OVER the calendar rather than pushing it
// down, so consulting the key never moves the grid a reader is reading.
//
// The open state is per calendar and per visit. Deliberately not
// remembered: it is a reference, consulted and then closed, and a key
// that silently reopens itself is back to occupying the screen.
//
// ---------------------------------------------------------------------
// THE CONTROL ASKS THE READER'S QUESTION, it does not name the object.
//
// It used to read "Colour key" beside a palette icon. "Colour key" is
// the name of the thing behind the button, which is only useful to
// somebody who already knows what is behind the button; a reader looking
// at a grid of coloured blocks and wondering what they mean does not
// think "I need the colour key", they think "what do these colours
// mean?". So the button asks that, and the panel it opens answers it in
// the same words. The question mark replaces the palette for the same
// reason: it says there is an explanation here, where a palette says
// there are colours here, which the reader can already see.
// ---------------------------------------------------------------------

export interface LegendItem {
  /** Tailwind classes for the swatch: background, and a border where needed. */
  swatch: string;
  label: string;
}

export function CalendarLegend({ items, className = '' }: { items: LegendItem[]; className?: string }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Dismissed the way any small overlay should be: click away, or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="calendar-legend-panel"
        className="inline-flex h-9 items-center gap-2 border border-separator bg-background px-3 font-body text-sm text-foreground transition-colors hover:border-accent hover:text-accent"
      >
        <HelpCircle aria-hidden className="h-4 w-4" />
        What do the colours mean?
        {open ? <ChevronUp aria-hidden className="h-4 w-4" /> : <ChevronDown aria-hidden className="h-4 w-4" />}
      </button>

      {open && (
        /* Right-aligned and floating: the trigger sits at the right-hand end
           of a control row, and the panel is wider than it, so anchoring it
           to the left edge would push it off the screen.
           z-30 clears the calendar's own sticky month headings at z-10 and
           stays well under the overlay layer. */
        <div
          id="calendar-legend-panel"
          className="absolute right-0 top-full z-30 mt-2 w-[min(78vw,30rem)] border border-separator bg-background p-3 shadow-elevated"
        >
          <p className="font-body text-xs uppercase tracking-wider text-muted-foreground mb-2">What the colours mean</p>
          <p className="font-body text-xs text-muted-foreground mb-2.5 -mt-1">Each block on the calendar is coloured by what it is.</p>
          <div className="flex flex-col gap-1.5 font-body text-xs text-foreground/85">
            {items.map((item) => (
              <span key={item.label} className="inline-flex items-start">
                <span aria-hidden className={`mr-2 mt-[3px] inline-block h-3 w-3 shrink-0 rounded-sm ${item.swatch}`} />
                {item.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default CalendarLegend;
