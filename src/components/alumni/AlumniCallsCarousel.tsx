import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
// as an event of type `alumni_call` (see the admin-alumni-calls edge
// function). So this page reads the same public table the Events page
// reads, under the same row-level security, and the internal planning
// tracker - which holds calls that have not happened and alumni who have
// not yet agreed to appear - is never exposed.
//
// ONLY CALLS WITH A POSTER. A carousel of posters with a blank card in
// it is worse than a shorter carousel, and the poster is what makes the
// call recognisable in the first place.
//
// NO CAROUSEL LIBRARY. The strip is a scroll container with scroll-snap:
// on a phone that is the platform's own momentum scrolling, with no
// gesture handling to get wrong, and on a desktop the two arrows scroll
// it by exactly one card. Nothing is hidden from the reader who prefers
// to swipe, and nothing new is added to the bundle of a public page.
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
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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

  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    measure();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      el.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [measure, calls.length]);

  /** Scroll by one card, measured from the first card rather than guessed. */
  const scrollByCard = (direction: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>('[data-call-card]');
    const step = card ? card.offsetWidth + 24 : el.clientWidth * 0.8;
    el.scrollBy({ left: direction * step, behavior: 'smooth' });
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
          See all past events
        </Link>
      </div>

      <p className="font-body text-body text-muted-foreground mb-6 max-w-4xl">
        Each semester our divisions bring former members back for an open conversation with the current
        cohort: academic choices, recruitment, and what the work is actually like. These are the most recent.
      </p>

      <div className="relative">
        {/* The arrows are an ADDITION to scrolling, never the only way to
            it: the strip scrolls with a finger, a trackpad and the
            keyboard whether or not they are shown, and each disables
            itself at the end it would scroll past. */}
        <button
          type="button"
          onClick={() => scrollByCard(-1)}
          disabled={!canScrollLeft}
          aria-label="Previous alumni calls"
          className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center border border-separator bg-background text-accent transition-opacity hover:bg-muted disabled:opacity-0 disabled:pointer-events-none"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div
          ref={trackRef}
          tabIndex={0}
          role="group"
          aria-label="Recent alumni calls"
          className="flex gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {calls.map((call) => (
            <article
              key={call.id}
              data-call-card
              className="snap-start shrink-0 w-[78%] sm:w-[46%] lg:w-[30%] xl:w-[23%]"
            >
              {/* The poster is shown WHOLE. These are designed sheets with
                  names and times on them; a crop would cut a guest out. */}
              <img
                src={call.poster_url ?? ''}
                alt={`${call.title} poster`}
                loading="lazy"
                decoding="async"
                className="block w-full h-auto border border-separator bg-muted object-contain"
              />
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

        <button
          type="button"
          onClick={() => scrollByCard(1)}
          disabled={!canScrollRight}
          aria-label="More alumni calls"
          className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center border border-separator bg-background text-accent transition-opacity hover:bg-muted disabled:opacity-0 disabled:pointer-events-none"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </section>
  );
}

export default AlumniCallsCarousel;
