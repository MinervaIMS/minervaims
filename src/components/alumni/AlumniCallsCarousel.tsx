import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// =====================================================================
// AlumniCallsCarousel — the five most recent alumni calls, by their posters.
// ---------------------------------------------------------------------
// The Alumni page said, in prose, that former members "stay actively
// engaged through mentoring and alumni calls". A visitor had no way to
// see one. The calls are the most concrete evidence the page has that
// the network is alive, and each already has the artefact that shows it:
// the poster, with the names, the roles and the date on it.
//
// IT READS `events`, NOT `alumni_calls`. A call is planned in the
// workspace and, once it has a poster and a date, mirrored into `events`
// as an event of type `alumni_call`. So this page reads the same public
// table the Events page reads, under the same row-level security, and
// the internal planning tracker is never exposed.
//
// ---------------------------------------------------------------------
// IT SCROLLS LIKE THE HOMEPAGE, BECAUSE IT IS THE SAME KIND OF OBJECT.
//
// The first version was its own small invention: two circular arrows
// floating over the edges, and no indication of how far along the strip
// a reader had come. The homepage has carried a horizontal rail of cards
// since long before this section existed, and it answers both questions
// differently: no arrows at all, and a row of dots underneath that both
// REPORTS the position and MOVES to one when pressed.
//
// This now uses that model exactly, down to the arithmetic:
//
//   * the step is one card plus one gap, measured from the first card
//     rather than assumed, so it stays right at every breakpoint;
//   * the active dot is `round(scrollLeft / step)`, so it changes at the
//     half-way point between two cards rather than on the first pixel;
//   * pressing a dot scrolls to `step * i`, which lands the card flush
//     against the rail's start edge;
//   * `scroll-snap-align: start` on the cards and a matching
//     `scroll-padding-inline-start` make a swipe settle in the same
//     places the dots do, so the two can never disagree;
//   * the edges fade only where there is something beyond them, from the
//     same `data-at-start` / `data-at-end` pair the homepage uses.
//
// The dots use the shared `.rdots` / `.rdot` rules in index.css, which is
// where the homepage's dots come from, so a change to the dot is a change
// in both places.
// =====================================================================

interface AlumniCallEvent {
  id: string;
  title: string;
  date: string;
  poster_url: string | null;
  guest: string[] | null;
  description: string | null;
}

/** How many calls the carousel shows. The five most recent. */
const MAX_CALLS = 5;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function AlumniCallsCarousel() {
  const [calls, setCalls] = useState<AlumniCallEvent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  /** Which poster is open full size, or null. */
  const [lightbox, setLightbox] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, date, poster_url, guest, description')
        .eq('event_type', 'alumni_call')
        .eq('show_on_website', true)
        .not('poster_url', 'is', null)
        .order('date', { ascending: false })
        .limit(MAX_CALLS);
      if (cancelled) return;
      // A failure here must not take the Alumni page down with it: the
      // carousel simply does not render, and everything else is intact.
      if (error) { setLoaded(true); return; }
      setCalls((data as AlumniCallEvent[]) ?? []);
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, []);

  /**
   * One card plus one gap, measured rather than assumed.
   *
   * The card width is a clamp on the viewport and the gap is a clamp too,
   * so neither can be hardcoded here without going wrong at some width.
   */
  const stepWidth = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return 1;
    const card = rail.querySelector<HTMLElement>('[data-call-card]');
    const gap = parseFloat(getComputedStyle(rail).columnGap || '24');
    return Math.max(1, (card?.offsetWidth || 280) + (Number.isNaN(gap) ? 24 : gap));
  }, []);

  /**
   * ONE DOT PER POSITION THE RAIL CAN ACTUALLY REACH.
   *
   * The obvious thing is one dot per card, and it is wrong here. Five
   * posters on a laptop leaves three of them already on screen, so the
   * rail can only travel about one card's width before it hits the end:
   * clicking the fourth or fifth dot moved nothing, and the dot never
   * lit, because the position it pointed at does not exist. Three dead
   * controls is a worse affordance than the arrows this replaced.
   *
   * The number of reachable positions is how many whole steps fit inside
   * the leftover scroll, plus the resting position at zero. That is the
   * same reasoning CarouselScrollIndicator already uses elsewhere on the
   * site, so the two agree. The scroll model itself is untouched: the
   * step is still one card plus one gap, and the rail still comes to
   * rest on a card's leading edge.
   */
  const [dotCount, setDotCount] = useState(1);

  const update = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    const step = stepWidth();
    const max = Math.max(0, rail.scrollWidth - rail.clientWidth);
    const positions = Math.max(1, Math.min(calls.length, 1 + Math.ceil(max / step - 0.02)));
    const ended = rail.scrollLeft >= max - 2;
    setDotCount(positions);
    // The final position is the end of the rail, and the end is not always
    // a whole number of steps from the start: at 1440px the last card runs
    // out 40px after the previous step, so `round(scrollLeft / step)` names
    // the second-to-last dot while the rail is sitting at the last one.
    // Reading the end as the last dot rather than rounding to it is what
    // keeps the pressed dot and the lit dot the same dot.
    setActiveIdx(ended ? positions - 1 : Math.min(Math.round(rail.scrollLeft / step), positions - 1));
    setAtStart(rail.scrollLeft <= 2);
    setAtEnd(ended);
  }, [stepWidth, calls.length]);

  useLayoutEffect(() => {
    update();
    const onResize = () => update();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [update, calls.length]);

  const scrollToIdx = (i: number) => {
    const rail = railRef.current;
    if (!rail) return;
    // The last dot means "the end", which is not always a whole number of
    // steps away. Clamping here rather than letting the browser do it
    // keeps the dot that was pressed the dot that lights up.
    const max = Math.max(0, rail.scrollWidth - rail.clientWidth);
    rail.scrollTo({ left: Math.min(stepWidth() * i, max), behavior: 'smooth' });
  };

  // Nothing to show and nothing to explain: the section is simply absent
  // rather than announcing an empty shelf.
  if (!loaded || calls.length === 0) return null;

  return (
    <section aria-labelledby="alumni-calls-heading" className="mb-24">
      <div className="mb-6 pb-3 border-b border-separator flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <h2 id="alumni-calls-heading" className="font-serif text-heading text-accent">
          Alumni Calls: Our Stories Are Endless
        </h2>
        <Link
          to="/events"
          className="font-body text-sm text-accent underline underline-offset-4 hover:opacity-80 transition-opacity"
        >
          {"\n"}
        </Link>
      </div>

      <p className="font-body text-body text-muted-foreground mb-6 max-w-4xl">
        Each semester our divisions bring former members back for an open conversation with the current
        cohort: academic choices, recruitment, and what the work is actually like.&nbsp;
      </p>

      <div className="ac-rail-fade" data-at-start={atStart} data-at-end={atEnd}>
        <div className="ac-rail" ref={railRef} onScroll={update}>
          {calls.map((call, i) => (
            <article key={call.id} data-call-card className="ac-card">
              {/* The poster is a button, because pressing it does
                  something: it opens the sheet at a size where the names
                  and the times printed on it can actually be read. At
                  card size a poster is a thumbnail of a document, which
                  is an invitation nobody could accept until now. */}
              <button
                type="button"
                onClick={() => setLightbox(i)}
                className="block w-full cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                aria-label={`Open the poster for ${call.title}`}
              >
                <img
                  src={call.poster_url ?? ''}
                  alt={`${call.title} poster`}
                  loading="lazy"
                  decoding="async"
                  className="block w-full h-auto border border-separator bg-muted object-contain"
                />
              </button>
              <div className="mt-3">
                <div className="font-body text-xs tracking-[0.12em] uppercase text-muted-foreground">
                  {formatDate(call.date)}
                </div>
                <h3 className="font-serif text-lg text-foreground mt-1">{call.title}</h3>
                {call.guest && call.guest.length > 0 && (
                  <p className="font-body text-sm text-muted-foreground mt-1">
                    {/* The names only: the roles are on the poster above, and
                        repeating them here would set four lines of small
                        type under every card. */}
                    {call.guest.map((g) => g.split(' - ')[0]).join(', ')}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* The dots, in the shared style, doing the job the arrows used to. */}
      {dotCount > 1 && (
        <div className="v3-foot">
          <div className="rdots v3-dots" role="tablist" aria-label="Alumni calls pagination">
            {Array.from({ length: dotCount }).map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === activeIdx}
                aria-label={`Scroll to position ${i + 1} of ${dotCount}`}
                className={`rdot${i === activeIdx ? ' is-active' : ''}`}
                onClick={() => scrollToIdx(i)}
              />
            ))}
          </div>
        </div>
      )}

      {lightbox !== null && calls[lightbox] && (
        <PosterLightbox
          calls={calls}
          index={lightbox}
          onClose={() => setLightbox(null)}
          onIndexChange={setLightbox}
        />
      )}
    </section>
  );
}

/**
 * One poster, as large as the window allows.
 *
 * The arrows removed from the strip belong HERE instead: on the rail they
 * duplicated a gesture the reader already has, whereas in a full-screen
 * view there is no other way to reach the next sheet without closing and
 * reopening. It is the same object the Events page uses for its own
 * posters, so a reader who has opened one knows how this one behaves.
 */
function PosterLightbox({
  calls, index, onClose, onIndexChange,
}: {
  calls: AlumniCallEvent[];
  index: number;
  onClose: () => void;
  onIndexChange: (i: number) => void;
}) {
  const current = calls[index];

  // The page behind must not scroll under the overlay.
  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => { document.documentElement.style.overflow = prev; };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') onIndexChange((index + 1) % calls.length);
      else if (e.key === 'ArrowLeft') onIndexChange((index - 1 + calls.length) % calls.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, calls.length, onClose, onIndexChange]);

  if (!current) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Poster: ${current.title}`}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/80 backdrop-blur-md p-4 md:p-8"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        aria-label="Close poster"
        className="absolute top-4 right-4 md:top-6 md:right-6 text-background hover:opacity-80 transition-opacity"
      >
        <X className="h-7 w-7 md:h-8 md:w-8" />
      </button>

      {calls.length > 1 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onIndexChange((index - 1 + calls.length) % calls.length); }}
          aria-label="Previous poster"
          className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 p-2 text-background hover:opacity-80 transition-opacity"
        >
          <ChevronLeft className="h-8 w-8 md:h-10 md:w-10" />
        </button>
      )}

      <div className="relative flex flex-col items-center max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
        <img
          src={current.poster_url ?? ''}
          alt={`${current.title} poster`}
          className="block max-w-[90vw] max-h-[80vh] w-auto h-auto object-contain"
        />
        <div className="mt-4 text-center max-w-[90vw]">
          <div className="font-body text-xs tracking-[0.18em] uppercase text-background/80 mb-1">
            {formatDate(current.date)}
          </div>
          <div className="font-serif text-base md:text-lg text-background">{current.title}</div>
        </div>
      </div>

      {calls.length > 1 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onIndexChange((index + 1) % calls.length); }}
          aria-label="Next poster"
          className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 p-2 text-background hover:opacity-80 transition-opacity"
        >
          <ChevronRight className="h-8 w-8 md:h-10 md:w-10" />
        </button>
      )}
    </div>
  );
}

export default AlumniCallsCarousel;
