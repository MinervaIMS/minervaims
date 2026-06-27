import { useEffect, useMemo, useState, useCallback, FormEvent } from "react";
import { Helmet } from "react-helmet-async";
import { Calendar, MapPin, X, ChevronLeft, ChevronRight } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PageIntroduction, PageLoader } from "@/components/shared";
import { PdfThumbnail } from "@/components/shared/PdfThumbnail";

const isPdf = (url?: string | null) => !!url && url.toLowerCase().split("?")[0].endsWith(".pdf");
import { useImagePreload } from "@/hooks/useImagePreload";
import eventsBgAsset from "@/assets/MIMS_Events.webp.asset.json";

interface DbEvent {
  id: string;
  title: string;
  date: string;
  place: string;
  moderator?: string | null;
  guest?: string[] | null;
  description?: string | null;
  poster_url?: string | null;
}

/**
 * Upcoming event placeholder model.
 *
 * Currently there are no upcoming events. When one is scheduled, populate this
 * object (or wire it up to the database) and the "Upcoming" band will render
 * automatically.
 */
interface UpcomingEvent {
  title: string;
  date: string;
  doors?: string | null;
  place: string;
  description?: string | null;
  photoUrl?: string | null;
  isFlagship?: boolean;
  registrationUrl?: string | null;
  registrationState?: "open" | "soon" | "closed";
}

// TODO: replace with real data when an upcoming event is announced.
const UPCOMING_EVENT: UpcomingEvent | null = null;

const ITEMS_PER_PAGE = 10;

function formatLongDateUpper(iso: string) {
  const d = new Date(iso);
  return d
    .toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    .toUpperCase();
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  if (hh === "00" && mm === "00") return null;
  return `${hh}:${mm}`;
}

const Events = () => {
  const [events, setEvents] = useState<DbEvent[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [eventEmail, setEventEmail] = useState('');
  const { toast } = useToast();
  const eventsBg = eventsBgAsset.url;
  const imagesLoaded = useImagePreload([eventsBg]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const { data, error } = await supabase
          .from("events")
          .select("*")
          .order("date", { ascending: false });
        if (error) {
          console.error("Error fetching events:", error);
          return;
        }
        setEvents((data as DbEvent[]) || []);
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setIsDataLoading(false);
      }
    };
    fetchEvents();
  }, []);

  // Past events = anything strictly before now, newest first.
  const pastEvents = useMemo(() => {
    const now = Date.now();
    return events
      .filter((e) => new Date(e.date).getTime() < now)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [events]);

  // Posters carousel for the lightbox: only events that have a poster, in display order.
  const posterEvents = useMemo(
    () => pastEvents.filter((e) => !!e.poster_url),
    [pastEvents],
  );

  const totalPages = Math.max(1, Math.ceil(pastEvents.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedEvents = pastEvents.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
  };

  const openLightboxForEvent = useCallback((eventId: string) => {
    const idx = posterEvents.findIndex((e) => e.id === eventId);
    if (idx >= 0) setLightboxIndex(idx);
  }, [posterEvents]);

  const emailSchema = z.string().trim().email().max(255);

  const handleEventEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = emailSchema.safeParse(eventEmail);
    if (!parsed.success) {
      toast({ title: 'Please enter a valid email address.', variant: 'destructive' });
      return;
    }
    const { error } = await supabase
      .from('newsletter_subscribers')
      .insert({ email: parsed.data, consent: true, source: 'events' });

    if (error) {
      if (error.code === '23505') {
        toast({ title: "You're already subscribed." });
      } else {
        toast({ title: 'Subscription failed. Please try again later.', variant: 'destructive' });
        return;
      }
    } else {
      toast({ title: 'Thank you for subscribing.' });
    }
    setEventEmail('');
  };

  if (isDataLoading || !imagesLoaded) {
    return <PageLoader />;
  }

  return (
    <>
      <Helmet>
        <title>Events | MIMS</title>
      </Helmet>

      <div data-page-hero className="relative">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${eventsBg})` }}
        />
        <div className="absolute inset-0 hero-overlay" />
        <div className="relative z-10">
          <PageIntroduction title="Events" transparentBackground />
        </div>
      </div>

      {/* Description Section */}
      <section className="pt-section-sm md:pt-section bg-background">
        <div className="container">
          <h2 className="font-serif text-xl sm:text-heading mb-6 pb-3 border-b border-separator text-accent">
            Minerva Events, bridging the gap between academia and industry
          </h2>
          <p className="font-body text-body-lg text-muted-foreground mb-4 max-w-4xl">
            Beyond research and portfolio management, MIMS delivers a year-round programme designed to develop technical
            judgement and long-term connections across the membership. Each semester, the Society hosts one flagship
            event with industry professionals, offering direct exposure to real-world investment processes. We
            complement this with company visits and internal forums where each team presents its work to the full
            Society, followed by structured discussions and debates to challenge assumptions and improve
            decision-making.
          </p>
          <p className="font-body text-body-lg text-muted-foreground max-w-4xl">
            To strengthen cohesion, MIMS also organises division-only and association-wide aperitivos, creating
            consistent touchpoints between members. Finally, frequent alumni calls give current members direct access to
            a truly international network, enabling candid Q&A on academic choices, recruitment pathways, and the
            realities of roles across banks, boutiques, hedge funds and asset managers.
          </p>
        </div>
      </section>

      {/* Upcoming Section */}
      <section className="pt-section-sm md:pt-section bg-background">
        <div className="container">
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">
            Upcoming
          </h2>

          {UPCOMING_EVENT ? (
            <UpcomingBand event={UPCOMING_EVENT} />
          ) : (
            <div className="px-6 py-16 md:py-20 text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="mx-auto mb-6 h-10 w-10 text-accent"
              >
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
              <h3 className="font-serif text-2xl md:text-3xl text-accent mb-4">
                No upcoming events right now
              </h3>
              <p className="font-body text-body text-muted-foreground max-w-2xl mx-auto mb-6">
                New events are announced each semester. Browse our past events below,
                or follow along to hear about the next one first.
              </p>
              <form onSubmit={handleEventEmailSubmit} className="max-w-xl mx-auto">
                <div className="flex border border-accent">
                  <input
                    type="email"
                    required
                    placeholder="Enter your email here"
                    value={eventEmail}
                    onChange={(e) => setEventEmail(e.target.value)}
                    className="flex-1 min-w-0 bg-background px-3 py-2 font-body text-body text-foreground placeholder:text-muted-foreground border-0 focus:outline-none focus:ring-0"
                  />
                  <button
                    type="submit"
                    className="shrink-0 bg-accent text-background font-serif tracking-wider text-sm px-5 py-2 border border-transparent hover:bg-background hover:text-accent hover:border-accent transition-colors"
                  >
                    Sign Up
                  </button>
                </div>
                <p className="font-body text-small text-muted-foreground leading-snug mt-4">
                  By signing up, you agree to receive email updates from us. You can unsubscribe at any time.
                </p>
              </form>
            </div>
          )}
        </div>
      </section>

      {/* Past Events */}
      <section className="py-section-sm md:py-section bg-background">
        <div className="container">
          <h2 className="font-serif text-heading text-accent mb-6 pb-3 border-b border-separator">
            Past events
          </h2>

          {pastEvents.length === 0 ? (
            <p className="font-body text-muted-foreground py-8">
              No past events to display.
            </p>
          ) : (
            <>
              <div>
                {paginatedEvents.map((event) => (
                  <PastEventRow
                    key={event.id}
                    event={event}
                    onPosterClick={() => openLightboxForEvent(event.id)}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <SquarePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              )}
            </>
          )}
        </div>
      </section>

      {lightboxIndex !== null && posterEvents.length > 0 && (
        <PosterLightbox
          events={posterEvents}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
        />
      )}
    </>
  );
};

/* ------------------------------ Upcoming band ------------------------------ */

function UpcomingBand({ event }: { event: UpcomingEvent }) {
  const time = formatTime(event.date);
  const state = event.registrationState ?? (event.registrationUrl ? "open" : "soon");

  const stateLabel =
    state === "open" ? "Registration open" :
    state === "closed" ? "Registration closed" :
    "Registration opens soon";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 border border-separator">
      <div className="relative bg-muted aspect-[4/3] md:aspect-auto md:min-h-[320px]">
        {event.photoUrl ? (
          <img
            src={event.photoUrl}
            alt={event.title}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-serif text-muted-foreground">Event Photo</span>
          </div>
        )}
        {event.isFlagship && (
          <div className="absolute top-0 left-0 bg-accent text-background font-body text-xs tracking-[0.18em] uppercase px-3 py-1">
            Flagship
          </div>
        )}
      </div>

      <div className="p-6 md:p-8 flex flex-col">
        <div className="font-body text-xs tracking-[0.18em] uppercase text-muted-foreground mb-3">
          {formatLongDateUpper(event.date)}
          {time && <span> &middot; {time}</span>}
          {event.doors && <span> &middot; DOORS {event.doors}</span>}
        </div>

        <h3 className="font-serif text-2xl md:text-3xl text-accent mb-3">
          {event.title}
        </h3>

        <p className="font-body text-body text-foreground mb-2">
          <span className="font-medium">Location:</span> {event.place}
        </p>

        {event.description && (
          <p className="font-body text-body text-muted-foreground mb-6">
            {event.description}
          </p>
        )}

        <div className="mt-auto pt-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="font-body text-xs tracking-[0.18em] uppercase text-muted-foreground">
            {stateLabel}
          </span>
          {state === "open" && event.registrationUrl && (
            <a
              href={event.registrationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center font-serif uppercase tracking-wider text-sm px-5 py-2 border border-accent text-accent hover:bg-accent hover:text-background transition-colors"
            >
              Register
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Past event row ----------------------------- */

function PastEventRow({
  event,
  onPosterClick,
}: {
  event: DbEvent;
  onPosterClick: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const hasMeta = Boolean(event.moderator || (event.guest && event.guest.length > 0));
  const hasMore = Boolean(event.description) || hasMeta;

  return (
    <article className="flex flex-col sm:grid sm:grid-cols-[260px_1fr] gap-5 sm:gap-8 py-8 border-b border-separator">
      {/* Poster column */}
      <div className="w-full max-w-[240px] sm:max-w-none mx-auto sm:mx-0">
        {event.poster_url ? (
          <button
            type="button"
            onClick={onPosterClick}
            className="block w-full cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-accent"
            aria-label={`Open poster for ${event.title}`}
          >
            {isPdf(event.poster_url) ? (
              <PdfThumbnail
                url={event.poster_url!}
                alt={`${event.title} poster`}
                className="block w-full h-auto bg-muted"
                renderWidth={400}
              />
            ) : (
              <img
                src={event.poster_url}
                alt={`${event.title} poster`}
                loading="lazy"
                className="block w-full h-auto object-contain bg-muted"
              />
            )}
          </button>
        ) : (
          <div className="w-full aspect-[3/4] bg-muted flex items-center justify-center">
            <span className="font-serif text-xs text-muted-foreground text-center px-2">
              No poster
            </span>
          </div>
        )}
      </div>

      {/* Info column */}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-body text-xs tracking-[0.12em] uppercase text-muted-foreground mb-3">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
            {formatLongDateUpper(event.date)}
          </span>
          <span aria-hidden="true" className="text-separator">|</span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {event.place}
          </span>
        </div>

        <h3 className="font-serif text-xl md:text-2xl text-foreground mb-3 break-words">
          {event.title}
        </h3>

        {event.description && !expanded && (
          <p className="font-body text-body text-muted-foreground mb-3 line-clamp-4 sm:line-clamp-6 md:line-clamp-7">
            {event.description}
          </p>
        )}

        {expanded && (
          <div className="space-y-3 mb-3">
            {event.description && (
              <p className="font-body text-body text-muted-foreground whitespace-pre-line">
                {event.description}
              </p>
            )}

            {hasMeta && (
              <div className="font-body text-sm text-muted-foreground space-y-2">
                {event.moderator && (
                  <div>
                    <span className="font-medium text-foreground">Moderator:</span>{" "}
                    {event.moderator}
                  </div>
                )}
                {event.guest && event.guest.length > 0 && (
                  <div>
                    <div className="font-medium text-foreground mb-1">
                      Guest{event.guest.length > 1 ? "s" : ""}:
                    </div>
                    <ul className="list-disc list-inside space-y-0.5">
                      {event.guest.map((g, i) => (
                        <li key={i}>{g}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {hasMore && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="font-body text-sm text-accent underline underline-offset-4 hover:opacity-80 transition-opacity"
            aria-expanded={expanded}
          >
            {expanded ? "Read less" : "Read more"}
          </button>
        )}
      </div>
    </article>
  );
}

/* ------------------------------ Poster Lightbox ---------------------------- */

function PosterLightbox({
  events,
  index,
  onClose,
  onIndexChange,
}: {
  events: DbEvent[];
  index: number;
  onClose: () => void;
  onIndexChange: (i: number) => void;
}) {
  const current = events[index];

  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") onIndexChange((index + 1) % events.length);
      else if (e.key === "ArrowLeft") onIndexChange((index - 1 + events.length) % events.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, events.length, onClose, onIndexChange]);

  if (!current) return null;

  const goPrev = () => onIndexChange((index - 1 + events.length) % events.length);
  const goNext = () => onIndexChange((index + 1) % events.length);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Poster: ${current.title}`}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/80 backdrop-blur-md p-4 md:p-8"
      onClick={onClose}
    >
      {/* Close */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        aria-label="Close poster"
        className="absolute top-4 right-4 md:top-6 md:right-6 text-background hover:opacity-80 transition-opacity"
      >
        <X className="h-7 w-7 md:h-8 md:w-8" />
      </button>

      {/* Prev */}
      {events.length > 1 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          aria-label="Previous poster"
          className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 text-background hover:opacity-80 transition-opacity p-2"
        >
          <ChevronLeft className="h-8 w-8 md:h-10 md:w-10" />
        </button>
      )}

      {/* Poster */}
      <div
        className="relative flex flex-col items-center max-w-full max-h-full"
        onClick={(e) => e.stopPropagation()}
      >
        {isPdf(current.poster_url) ? (
          <iframe
            src={`${current.poster_url}#view=FitH`}
            title={`${current.title} poster`}
            className="block w-[90vw] h-[80vh] bg-background"
          />
        ) : (
          <img
            src={current.poster_url ?? ""}
            alt={`${current.title} poster`}
            className="block max-w-[90vw] max-h-[80vh] w-auto h-auto object-contain"
          />
        )}
        <div className="mt-4 text-center max-w-[90vw]">
          <div className="font-body text-xs tracking-[0.18em] uppercase text-background/80 mb-1">
            {formatLongDateUpper(current.date)}
          </div>
          <div className="font-serif text-base md:text-lg text-background">
            {current.title}
          </div>
        </div>
      </div>

      {/* Next */}
      {events.length > 1 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          aria-label="Next poster"
          className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 text-background hover:opacity-80 transition-opacity p-2"
        >
          <ChevronRight className="h-8 w-8 md:h-10 md:w-10" />
        </button>
      )}
    </div>
  );
}

/* ------------------------------ Pagination --------------------------------- */

function SquarePagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  const getPages = (): (number | "ellipsis")[] => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 3) return [1, 2, 3, 4, "ellipsis", totalPages];
    if (currentPage >= totalPages - 2)
      return [1, "ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages];
  };

  const baseBtn =
    "h-10 min-w-10 px-3 inline-flex items-center justify-center border border-separator font-serif text-sm tracking-wider uppercase bg-background text-foreground hover:border-accent hover:text-accent transition-colors";
  const activeBtn =
    "h-10 min-w-10 px-3 inline-flex items-center justify-center border border-accent font-serif text-sm tracking-wider uppercase bg-accent text-background";
  const disabledBtn = "opacity-40 pointer-events-none";

  return (
    <nav
      aria-label="Past events pagination"
      className="mt-10 flex items-center justify-center gap-2 flex-wrap"
    >
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        className={`${baseBtn} ${currentPage === 1 ? disabledBtn : ""}`}
        aria-label="Previous page"
      >
        Prev
      </button>

      {getPages().map((p, i) =>
        p === "ellipsis" ? (
          <span
            key={`e-${i}`}
            className="h-10 min-w-10 inline-flex items-center justify-center font-body text-sm text-muted-foreground"
          >
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={p === currentPage ? activeBtn : baseBtn}
            aria-current={p === currentPage ? "page" : undefined}
          >
            {p}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        className={`${baseBtn} ${currentPage === totalPages ? disabledBtn : ""}`}
        aria-label="Next page"
      >
        Next
      </button>
    </nav>
  );
}

export default Events;
