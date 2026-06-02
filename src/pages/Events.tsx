import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { PageIntroduction, PageLoader } from "@/components/shared";
import { supabase } from "@/integrations/supabase/client";
import { useImagePreload } from "@/hooks/useImagePreload";
import eventsBg from "@/assets/events-bg.webp";

interface DbEvent {
  id: string;
  title: string;
  date: string;
  place: string;
  moderator?: string | null;
  guest?: string[] | null;
  description?: string | null;
}

/**
 * Upcoming event placeholder model.
 *
 * Currently there are no upcoming events. When one is scheduled, populate this
 * object (or wire it up to the database) and the "Upcoming" band will render
 * automatically. Required: title, date (ISO), place. Optional: doors,
 * description, photoUrl, isFlagship, registrationUrl, registrationState
 * ("open" | "soon" | "closed").
 */
interface UpcomingEvent {
  title: string;
  date: string;            // ISO string
  doors?: string | null;   // e.g. "18:30"
  place: string;
  description?: string | null;
  photoUrl?: string | null;
  isFlagship?: boolean;
  registrationUrl?: string | null;
  registrationState?: "open" | "soon" | "closed";
}

// TODO: replace with real data when an upcoming event is announced.
const UPCOMING_EVENT: UpcomingEvent | null = null;

const ITEMS_PER_PAGE = 8;

const MONTHS_SHORT = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

function formatLongDate(iso: string) {
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
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
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
        setEvents(data || []);
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setIsDataLoading(false);
      }
    };
    fetchEvents();
  }, []);

  // Past events = anything strictly before now.
  const pastEvents = useMemo(() => {
    const now = Date.now();
    return events
      .filter((e) => new Date(e.date).getTime() < now)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [events]);

  const availableYears = useMemo(() => {
    const set = new Set<number>();
    pastEvents.forEach((e) => set.add(new Date(e.date).getFullYear()));
    return Array.from(set).sort((a, b) => b - a);
  }, [pastEvents]);

  const filteredEvents = useMemo(() => {
    if (yearFilter === "all") return pastEvents;
    return pastEvents.filter(
      (e) => new Date(e.date).getFullYear().toString() === yearFilter,
    );
  }, [pastEvents, yearFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedEvents = filteredEvents.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Group paginated events by year for the date-rail layout.
  const groupedByYear = useMemo(() => {
    const groups = new Map<number, DbEvent[]>();
    paginatedEvents.forEach((e) => {
      const y = new Date(e.date).getFullYear();
      if (!groups.has(y)) groups.set(y, []);
      groups.get(y)!.push(e);
    });
    return Array.from(groups.entries()).sort((a, b) => b[0] - a[0]);
  }, [paginatedEvents]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setYearFilter(e.target.value);
    setCurrentPage(1);
  };

  if (isDataLoading || !imagesLoaded) {
    return <PageLoader />;
  }

  return (
    <>
      <Helmet>
        <title>Events | MIMS</title>
      </Helmet>

      <div className="relative">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${eventsBg})` }}
        />
        <div className="relative z-10">
          <PageIntroduction title="Events" transparentBackground />
        </div>
      </div>

      {/* Description Section */}
      <section className="pt-section-sm md:pt-section pb-6 md:pb-8 bg-background">
        <div className="container">
          <h2 className="font-serif text-xl sm:text-heading mb-6 pb-3 border-b border-separator text-accent">
            Professional Exposure, Strong Network, Personal Development
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
      <section className="pb-section-sm md:pb-section bg-background">
        <div className="container">
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">
            Upcoming
          </h2>

          {UPCOMING_EVENT ? (
            <UpcomingBand event={UPCOMING_EVENT} />
          ) : (
            <div className="border border-separator px-6 py-10 md:py-14 text-center">
              <p className="font-body text-sm tracking-[0.18em] uppercase text-muted-foreground mb-2">
                No upcoming event scheduled
              </p>
              <p className="font-body text-body text-muted-foreground max-w-2xl mx-auto">
                The next Society event will be announced here. Members will be notified by email when
                registration opens.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Past Events */}
      <section className="pb-section-sm md:pb-section bg-background">
        <div className="container">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 pb-3 border-b border-separator">
            <h2 className="font-serif text-heading text-accent">
              Past events
            </h2>

            {availableYears.length > 1 && (
              <div className="flex items-center gap-3">
                <label
                  htmlFor="event-year"
                  className="font-body text-xs tracking-[0.18em] uppercase text-muted-foreground"
                >
                  Year
                </label>
                <select
                  id="event-year"
                  value={yearFilter}
                  onChange={handleYearChange}
                  className="font-serif uppercase text-sm tracking-wider border border-separator bg-background text-foreground px-3 py-2 focus:outline-none focus:border-accent"
                >
                  <option value="all">All years</option>
                  {availableYears.map((y) => (
                    <option key={y} value={y.toString()}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {filteredEvents.length === 0 ? (
            <p className="font-body text-muted-foreground py-8">
              No past events to display.
            </p>
          ) : (
            <>
              <p className="font-body text-small text-muted-foreground mb-6">
                Showing {startIndex + 1}-
                {Math.min(startIndex + ITEMS_PER_PAGE, filteredEvents.length)} of{" "}
                {filteredEvents.length} events
              </p>

              <div className="space-y-10">
                {groupedByYear.map(([year, items]) => (
                  <div key={year}>
                    <h3 className="font-serif text-2xl text-accent mb-4">{year}</h3>
                    <div className="border-t border-separator">
                      {items.map((event) => (
                        <PastEventRow key={event.id} event={event} />
                      ))}
                    </div>
                  </div>
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
      {/* Photo */}
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

      {/* Metadata */}
      <div className="p-6 md:p-8 flex flex-col">
        <div className="font-body text-xs tracking-[0.18em] uppercase text-muted-foreground mb-3">
          {formatLongDate(event.date)}
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

function PastEventRow({ event }: { event: DbEvent }) {
  const d = new Date(event.date);
  const day = String(d.getDate()).padStart(2, "0");
  const monthYear = `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;

  return (
    <article className="grid grid-cols-[88px_1fr] md:grid-cols-[120px_1fr] gap-4 md:gap-6 py-6 border-b border-separator">
      {/* Date rail */}
      <div className="text-accent">
        <div className="font-serif text-3xl md:text-4xl leading-none">{day}</div>
        <div className="font-body text-[10px] md:text-xs tracking-[0.18em] uppercase text-muted-foreground mt-2">
          {monthYear}
        </div>
      </div>

      {/* Body */}
      <div>
        <h4 className="font-serif text-lg md:text-xl text-foreground mb-2 break-words">
          {event.title}
        </h4>

        <div className="font-body text-xs tracking-[0.18em] uppercase text-muted-foreground mb-3">
          {event.place}
        </div>

        {event.description && (
          <p className="font-body text-body text-muted-foreground mb-3 line-clamp-3">
            {event.description}
          </p>
        )}

        {(event.moderator || (event.guest && event.guest.length > 0)) && (
          <div className="font-body text-sm text-muted-foreground space-y-1">
            {event.moderator && (
              <div>
                <span className="font-medium text-foreground">Moderator:</span> {event.moderator}
              </div>
            )}
            {event.guest && event.guest.length > 0 && (
              <div>
                <span className="font-medium text-foreground">
                  Guest{event.guest.length > 1 ? "s" : ""}:
                </span>{" "}
                {event.guest.join(", ")}
              </div>
            )}
          </div>
        )}
      </div>
    </article>
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
