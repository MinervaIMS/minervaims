import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BookSpine } from './BookSpine';
import OpenBook from './OpenBook';
import {
  READING_TYPE_ORDER, readingAuthorLine, readingMatchesSearch, readingTypeLabels,
  spineGeometry, type Reading, type ReadingType,
} from './types';

// =====================================================================
// The library as a single stylised bookcase: an architectural line
// drawing (cornice, fluted pilasters, base) holding three columns, one
// per reading category, in the light-purple stroke of --accent-soft.
// Every reading is one spine on a shelf; books wrap onto lower shelves
// as the collection grows, entirely data-driven. The search input and
// the category filter above drive what the case shows. Selecting a book
// hands over to the OpenBook reader.
// =====================================================================

const SOFT = 'hsl(var(--accent-soft))';
const SHELF_H = 150; // px, must exceed the tallest spine (128) plus lift
const SHELF_GAP = 7; // px between spines
const SHELF_PAD = 28; // horizontal padding inside a column (14 + 14)
const MIN_ROWS = 3;

function useMedia(query: string): boolean {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

// Greedy left-to-right fill: a book goes on the current shelf until the
// next spine would overflow the usable width, then a new shelf starts.
function packShelves(items: Reading[], usable: number): Reading[][] {
  const shelves: Reading[][] = [];
  let current: Reading[] = [];
  let width = 0;
  for (const r of items) {
    const w = spineGeometry(r.id).w;
    if (current.length > 0 && width + SHELF_GAP + w > usable) {
      shelves.push(current);
      current = [r];
      width = w;
    } else {
      width += (current.length > 0 ? SHELF_GAP : 0) + w;
      current.push(r);
    }
  }
  if (current.length > 0) shelves.push(current);
  return shelves;
}

interface Props {
  readings: Reading[];
  activeCategory: ReadingType | 'all';
  searchQuery: string;
}

export default function Bookcase({ readings, activeCategory, searchQuery }: Props) {
  const isMobile = useMedia('(max-width: 767px)');
  const reducedMotion = useMedia('(prefers-reduced-motion: reduce)');

  // One column is measured; all three share the same width (1fr tracks on
  // desktop, full width stacked on mobile), so one number packs them all.
  const measureRef = useRef<HTMLDivElement>(null);
  const [colWidth, setColWidth] = useState(0);
  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0].contentRect.width);
      setColWidth((prev) => (prev === w ? prev : w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const searchFiltered = useMemo(
    () => readings.filter((r) => readingMatchesSearch(r, searchQuery)),
    [readings, searchQuery],
  );

  // The set the reader pages through: the filtered readings, in the same
  // display_order the page has always used.
  const navSet = useMemo(
    () => (activeCategory === 'all' ? searchFiltered : searchFiltered.filter((r) => r.reading_type === activeCategory)),
    [searchFiltered, activeCategory],
  );

  const columns = useMemo(() => {
    const usable = Math.max(120, (colWidth || 320) - SHELF_PAD);
    return READING_TYPE_ORDER.map((type) => {
      const all = readings.filter((r) => r.reading_type === type);
      const visible = searchFiltered.filter((r) => r.reading_type === type);
      return { type, all, visible, shelves: packShelves(visible, usable) };
    });
  }, [readings, searchFiltered, colWidth]);

  const rows = Math.max(MIN_ROWS, ...columns.map((c) => c.shelves.length));

  // ---- reader state ---------------------------------------------------
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const originRectRef = useRef<DOMRect | null>(null);
  const originIdRef = useRef<string | null>(null);
  const openReading = openIdx !== null ? navSet[openIdx] : undefined;

  const openBook = (id: string, el: HTMLButtonElement) => {
    const idx = navSet.findIndex((r) => r.id === id);
    if (idx < 0) return;
    originRectRef.current = el.getBoundingClientRect();
    originIdRef.current = id;
    setOpenIdx(idx);
  };

  const closeBook = () => {
    setOpenIdx(null);
    const id = originIdRef.current;
    if (id) {
      window.setTimeout(() => {
        (document.querySelector(`[data-book-id="${CSS.escape(id)}"]`) as HTMLElement | null)?.focus();
      }, 0);
    }
  };

  // The page behind the reader must not scroll while a book is open, so
  // the shelf slot the book returns to stays exactly where it was.
  useEffect(() => {
    if (openIdx === null) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [openIdx]);

  const hairline = { borderColor: SOFT } as const;

  return (
    <div>
      {/* ---- the case ---- */}
      <div className="relative select-none">
        {/* Cornice: overhanging top boards. */}
        <div aria-hidden className="h-3 -mx-1.5 sm:-mx-4 border-[1.5px]" style={{ ...hairline, backgroundColor: 'hsl(var(--accent-soft)/0.05)' }} />
        <div aria-hidden className="h-2 -mx-0.5 sm:-mx-2 border-x-[1.5px] border-b" style={hairline} />

        {/* Body: three columns separated by fluted pilasters on desktop,
            stacked full-width below md. */}
        <div className="border-x-[1.5px] md:grid md:grid-cols-[1fr_22px_1fr_22px_1fr]" style={hairline}>
          {columns.map((col, ci) => {
            const dimmed = activeCategory !== 'all' && col.type !== activeCategory;
            const emptyCopy =
              col.all.length === 0
                ? `No ${readingTypeLabels[col.type].toLowerCase()} have been added yet.`
                : 'No readings match your search.';
            return (
              <Fragment key={col.type}>
                {ci > 0 && (
                  <div aria-hidden className="hidden md:flex justify-center border-x-[1.5px]" style={hairline}>
                    {/* Flutes of the pilaster. */}
                    <span className="h-full w-[7px] border-x" style={hairline} />
                  </div>
                )}
                <div
                  ref={ci === 0 ? measureRef : undefined}
                  className={`transition-opacity duration-300 ${dimmed ? 'opacity-25' : ''}`}
                  aria-hidden={dimmed || undefined}
                >
                  <div className="h-9 flex items-center justify-center border-b px-2" style={hairline}>
                    <span className="font-body text-[11px] uppercase tracking-[0.18em] text-accent truncate">
                      {readingTypeLabels[col.type]}
                    </span>
                  </div>
                  {col.visible.length === 0 ? (
                    <div className="flex items-center justify-center text-center px-6" style={{ height: rows * SHELF_H }}>
                      <p className="font-body text-sm text-muted-foreground max-w-[220px]">{emptyCopy}</p>
                    </div>
                  ) : (
                    Array.from({ length: rows }, (_, si) => (
                      <div
                        key={si}
                        className="flex items-end border-b-2 px-3.5 overflow-hidden"
                        style={{ ...hairline, height: SHELF_H, gap: SHELF_GAP }}
                      >
                        {(col.shelves[si] ?? []).map((r) => (
                          <BookSpine
                            key={r.id}
                            reading={r}
                            dimmed={dimmed}
                            vanished={openIdx !== null && originIdRef.current === r.id}
                            onOpen={openBook}
                          />
                        ))}
                      </div>
                    ))
                  )}
                </div>
              </Fragment>
            );
          })}
        </div>

        {/* Base: mirrored plinth boards. */}
        <div aria-hidden className="h-2 -mx-0.5 sm:-mx-2 border-x-[1.5px] border-t" style={hairline} />
        <div aria-hidden className="h-3.5 -mx-1.5 sm:-mx-4 border-[1.5px]" style={{ ...hairline, backgroundColor: 'hsl(var(--accent-soft)/0.05)' }} />
      </div>

      {/* ---- the reader ---- */}
      {openIdx !== null && openReading && (
        <OpenBook
          readings={navSet}
          index={openIdx}
          originRect={originRectRef.current}
          mobile={isMobile}
          reducedMotion={reducedMotion}
          onNavigate={setOpenIdx}
          onClose={closeBook}
        />
      )}

      {/* Every reading, reachable without the animation. */}
      <ul className="sr-only">
        {readings.map((r) => (
          <li key={r.id}>
            {readingTypeLabels[r.reading_type]}: {r.title}, {readingAuthorLine(r)}. {r.description} Recommended by {r.contributor_name} {r.contributor_surname}, {r.contributor_role}.
          </li>
        ))}
      </ul>
    </div>
  );
}
