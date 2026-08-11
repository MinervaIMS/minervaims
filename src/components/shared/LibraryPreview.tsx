import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  READING_TYPE_ORDER, readingTypeLabels, spineGeometry, type ReadingType,
} from '@/components/readings/types';

// =====================================================================
// LibraryPreview — a real bay of the /readings case, on /about.
// ---------------------------------------------------------------------
// The section that introduces the library used to describe it in a
// paragraph. This shows it: the same architecture the Reading
// Recommendations page draws, at a third of the height, holding the
// association's own newest recommendations.
//
// IT IS THE REAL LIBRARY, NOT A PICTURE OF ONE. The spine widths and
// heights come from `spineGeometry`, the same deterministic function the
// full case uses, so a book is exactly as wide here as it is there; the
// titles are the live `readings` rows; and the three columns are the
// three categories in their fixed order.
//
// THE MOTION IS ONE THING, ONCE. The shelves are drawn, then the books
// rise into them in the order they stand, and that is the whole of it.
// It is triggered by an IntersectionObserver so it plays when the section
// is reached rather than while it is still off screen; it is a transform
// and an opacity, so it runs on the compositor and never touches layout;
// it is armed once and disarmed immediately, so it cannot replay or
// stutter on a scroll back; and under `prefers-reduced-motion` the books
// are simply already there.
//
// IF THE QUERY FAILS OR RETURNS NOTHING, the case is still drawn and the
// invitation still stands: nothing here depends on the data arriving.
// =====================================================================

const SOFT = 'hsl(var(--accent-soft))';

interface Spine {
  id: string;
  title: string;
  reading_type: ReadingType;
}

/** Books shown per shelf, by breakpoint. */
const WIDE_PER_SHELF = 3;
const NARROW_PER_SHELF = 3;

export function LibraryPreview() {
  const [rows, setRows] = useState<Spine[] | null>(null);
  const [entered, setEntered] = useState(false);
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768,
  );
  const caseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // The newest few of each category. `display_order` is the order the
  // library itself shelves them in, so the preview agrees with the page.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('readings')
          .select('id, title, reading_type')
          .order('display_order', { ascending: true })
          .limit(60);
        if (error) throw error;
        if (active) setRows((data ?? []) as Spine[]);
      } catch {
        // The case is drawn either way.
        if (active) setRows([]);
      }
    })();
    return () => { active = false; };
  }, []);

  // Armed once, disarmed immediately: the books rise when the case is
  // reached and never again for the life of the page.
  useEffect(() => {
    const el = caseRef.current;
    if (!el) return;
    if (typeof IntersectionObserver !== 'function') { setEntered(true); return; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setEntered(true);
        io.disconnect();
      }
    }, { rootMargin: '0px 0px -12% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const perShelf = narrow ? NARROW_PER_SHELF : WIDE_PER_SHELF;

  const columns = useMemo(
    () => READING_TYPE_ORDER.map((type) => ({
      type,
      books: (rows ?? []).filter((r) => r.reading_type === type).slice(0, perShelf),
    })),
    [rows, perShelf],
  );

  // The tallest spine on the whole case sets the scale, so the three
  // shelves read as one piece of furniture rather than three.
  const tallest = Math.max(
    1,
    ...columns.flatMap((c) => c.books.map((b) => spineGeometry(b.id).h)),
  );

  const hairline = { borderColor: SOFT } as const;
  let riseIndex = 0;

  return (
    <div className="select-none">
      <style>{`
        @keyframes lib-rise { from { transform: translate3d(0,18px,0); opacity: 0; } to { transform: none; opacity: 1; } }
        .lib-spine { opacity: 0; }
        .lib-in .lib-spine { animation: lib-rise 620ms cubic-bezier(.22,1,.36,1) both; }
        @media (prefers-reduced-motion: reduce) {
          .lib-spine, .lib-in .lib-spine { animation: none !important; opacity: 1 !important; transform: none !important; }
        }
      `}</style>

      <Link
        to="/readings"
        aria-label="Open the Reading Recommendations library"
        className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <div ref={caseRef} className={`relative ${entered ? 'lib-in' : ''}`}>
          {/* Cornice: the same three stepped boards the full case opens on. */}
          <div aria-hidden className="h-2 -mx-2 sm:-mx-6 rounded-t-[6px] border-[1.5px] border-b-0" style={{ ...hairline, backgroundColor: 'hsl(var(--accent-soft)/0.06)' }} />
          <div aria-hidden className="h-[9px] -mx-2 sm:-mx-6 rounded-t-[2px] border-[1.5px]" style={{ ...hairline, backgroundColor: 'hsl(var(--accent-soft)/0.04)' }} />
          <div aria-hidden className="h-[7px] -mx-1 sm:-mx-3 border-x-[1.5px] border-b" style={hairline} />
          <div aria-hidden className="h-[5px] -mx-0.5 sm:-mx-1.5 border-x-[1.5px] border-b" style={hairline} />

          {/* THE THREE CATEGORIES SIT SIDE BY SIDE ON A WIDE SCREEN AND
              STACK ON A PHONE, which is exactly what the full library
              does: three bays between four pilasters where there is room
              for three, one bay of three shelves where there is not.
              Squeezing three columns into 390px turns every category name
              into an ellipsis and every book into a sliver. */}
          {narrow ? (
            <div className="border-x-[1.5px] flex" style={hairline}>
              <Pilaster hairline={hairline} narrow />
              <div className="flex-1 min-w-0">
                {columns.map((col) => (
                  <Bay key={col.type} col={col} tallest={tallest} narrow nextDelay={() => 120 + (riseIndex += 1) * 55} />
                ))}
              </div>
              <Pilaster hairline={hairline} narrow />
            </div>
          ) : (
            <div
              className="border-x-[1.5px] grid grid-cols-[24px_minmax(0,1fr)_24px_minmax(0,1fr)_24px_minmax(0,1fr)_24px]"
              style={hairline}
            >
              {columns.map((col) => (
                <div key={col.type} className="contents">
                  <Pilaster hairline={hairline} narrow={false} />
                  <div className="min-w-0">
                    <Bay col={col} tallest={tallest} narrow={false} nextDelay={() => 120 + (riseIndex += 1) * 55} />
                  </div>
                </div>
              ))}
              <Pilaster hairline={hairline} narrow={false} />
            </div>
          )}

          {/* Base: the stepped plinth, mirroring the cornice. */}
          <div aria-hidden className="h-[5px] -mx-0.5 sm:-mx-1.5 border-x-[1.5px] border-t" style={hairline} />
          <div aria-hidden className="h-[11px] -mx-2 sm:-mx-6 border-[1.5px]" style={{ ...hairline, backgroundColor: 'hsl(var(--accent-soft)/0.05)' }} />
        </div>
      </Link>

      {/* Every title on the case, for anyone who is not looking at it. */}
      <ul className="sr-only">
        {(rows ?? []).slice(0, 12).map((r) => (
          <li key={r.id}>{readingTypeLabels[r.reading_type]}: {r.title}</li>
        ))}
      </ul>
    </div>
  );
}

/** One bay: the category's name, and one shelf of its books. */
function Bay({ col, tallest, narrow, nextDelay }: {
  col: { type: ReadingType; books: Spine[] };
  tallest: number;
  narrow: boolean;
  nextDelay: () => number;
}) {
  const hairline = { borderColor: SOFT } as const;
  return (
    <>
      {/* The category, exactly as the library labels it. */}
      <div className="h-9 flex items-center justify-center border-b px-2 relative" style={hairline}>
        <span aria-hidden className="absolute left-2 right-2 bottom-[3px] border-t" style={{ borderColor: 'hsl(var(--accent-soft)/0.55)' }} />
        <span className="min-w-0 truncate font-body text-[10px] sm:text-[11px] uppercase tracking-[0.16em] sm:tracking-[0.18em] text-accent">
          {readingTypeLabels[col.type]}
        </span>
      </div>

      {/* One shelf. The books stand on its board and the board carries the
          double stroke the drawing gives it. */}
      <div className="relative border-b-2 h-[120px] sm:h-[136px]" style={hairline}>
        <span aria-hidden className="absolute left-0 right-0 bottom-[3px] border-t" style={{ borderColor: 'hsl(var(--accent-soft)/0.45)' }} />
        <div className="absolute inset-x-0 top-0 bottom-[2px] flex items-end justify-center gap-[6px] sm:gap-[7px] px-3 sm:px-3.5 overflow-hidden">
          {col.books.map((book) => {
            const g = spineGeometry(book.id);
            return (
              <span
                key={book.id}
                className="lib-spine relative shrink-0 rounded-t-[3px] border-[1.5px] transition-transform duration-300 group-hover:-translate-y-[3px]"
                style={{
                  width: narrow ? Math.round(g.w * 0.92) : g.w,
                  height: `${Math.round((g.h / tallest) * 88)}%`,
                  borderColor: SOFT,
                  backgroundColor: 'hsl(var(--accent-soft)/0.08)',
                  animationDelay: `${nextDelay()}ms`,
                }}
              >
                <span className="absolute left-[3px] right-[3px] top-2 border-t" style={hairline} />
                <span className="absolute left-[3px] right-[3px] bottom-2 border-t" style={hairline} />
                <span className="absolute inset-x-0 top-[14%] bottom-[14%] flex items-center justify-center overflow-hidden">
                  <span
                    className="max-h-full overflow-hidden whitespace-nowrap font-serif text-[9px] leading-none text-accent/85"
                    style={{ writingMode: 'vertical-rl' }}
                  >
                    {book.title}
                  </span>
                </span>
              </span>
            );
          })}
        </div>
      </div>
    </>
  );
}

/** One fluted pilaster: capital, shaft, base block. */
function Pilaster({ hairline, narrow }: { hairline: { borderColor: string }; narrow: boolean }) {
  return (
    <div
      aria-hidden
      className={`flex flex-col border-x-[1.5px] shrink-0 ${narrow ? 'w-[14px]' : ''}`}
      style={hairline}
    >
      <span className="h-3 shrink-0 border-b" style={{ ...hairline, backgroundColor: 'hsl(var(--accent-soft)/0.06)' }} />
      <span className="flex-1 flex justify-center py-1">
        <span className="h-full w-[7px] sm:w-[9px] border-x" style={hairline}>
          <span className="block h-full w-px mx-auto" style={{ backgroundColor: SOFT }} />
        </span>
      </span>
      <span className="h-3 shrink-0 border-t" style={{ ...hairline, backgroundColor: 'hsl(var(--accent-soft)/0.06)' }} />
    </div>
  );
}

export default LibraryPreview;
