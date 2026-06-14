import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Testimonial {
  quote: string;
  name: string;
  role: string;
}

const testimonials: Testimonial[] = [
  {
    quote:
      "The perfect place to apply classroom knowledge in an industry-like setting while meeting inspiring students who share your passion.",
    name: "Anna Maruccio",
    role: "Former President",
  },
  {
    quote:
      "Joining Minerva was one of the best choices I made throughout my studies. Beyond everything I learned, it was the people I met and the moments we shared that made this experience so meaningful and unforgettable.",
    name: "Luigi Savarese",
    role: "Former President",
  },
  {
    quote:
      "Come for the finance, stay for the people. You will join expecting to contribute to interesting work, but what you might not expect is to build relationships that will last long after graduation while having lots of fun.",
    name: "Matteo Consalvo",
    role: "Former Head of Portfolio Management",
  },
  {
    quote:
      "A community of students, peers, and friends united by a passion for financial markets, creating bonds that last far beyond in life.",
    name: "Michele Rinaldi",
    role: "Former Vice-president",
  },
  {
    quote:
      "An awesome place to meet people passionate about markets, exchange ideas and support peers in a friendly environment.",
    name: "Marco Neri",
    role: "Former Vice-president",
  },
];

const AUTO_ADVANCE_MS = 15680;

const makeKey = (name: string) => name.trim().toLowerCase().replace(/\s+/g, " ");

export function TestimonialsSection() {
  const [index, setIndex] = useState(() =>
    Math.floor(Math.random() * testimonials.length)
  );
  const [direction, setDirection] = useState<"left" | "right">("left");
  const [animKey, setAnimKey] = useState(0);
  const [companies, setCompanies] = useState<Record<string, string>>({});

  const go = useCallback((next: number, dir: "left" | "right") => {
    const len = testimonials.length;
    const normalized = ((next % len) + len) % len;
    setDirection(dir);
    setIndex(normalized);
    setAnimKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      go(index + 1, "left");
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [index, go]);

  // Fetch alumni company info + subscribe to live updates. Failures degrade silently.
  useEffect(() => {
    let cancelled = false;

    const fetchCompanies = async () => {
      try {
        const surnames = testimonials.map((t) => t.name.split(" ").slice(-1)[0]);
        const { data, error } = await supabase
          .from("alumni")
          .select("name, surname, company")
          .in("surname", surnames);
        if (error || !data || cancelled) return;

        const map: Record<string, string> = {};
        for (const t of testimonials) {
          const parts = t.name.trim().split(/\s+/);
          const firstName = parts[0];
          const lastName = parts.slice(1).join(" ");
          const match = data.find(
            (a: { name: string; surname: string; company: string | null }) =>
              a?.name?.trim().toLowerCase() === firstName.toLowerCase() &&
              a?.surname?.trim().toLowerCase() === lastName.toLowerCase()
          );
          const company = match?.company?.trim();
          if (company && company.length > 0) {
            map[makeKey(t.name)] = company;
          }
        }
        if (!cancelled) setCompanies(map);
      } catch {
        // Silently keep current state
      }
    };

    fetchCompanies();

    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel("testimonials-alumni-sync")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "alumni" },
          () => {
            fetchCompanies();
          }
        )
        .subscribe();
    } catch {
      // Realtime not available — static data still works
    }

    return () => {
      cancelled = true;
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {
          /* noop */
        }
      }
    };
  }, []);

  const current = testimonials[index];
  const company = companies[makeKey(current.name)];
  const displayedRole = company ? `${current.role}, currently at ${company}` : current.role;

  return (
    <section className="relative bg-accent text-background py-section-sm md:py-section overflow-hidden">
      {/* Arrows — desktop only */}
      <button
        type="button"
        aria-label="Previous testimonial"
        onClick={() => go(index - 1, "right")}
        className="hidden md:inline-flex absolute left-4 md:left-8 top-1/2 -translate-y-1/2 text-background/80 hover:text-background transition-colors p-2"
      >
        <ChevronLeft className="h-8 w-8 md:h-10 md:w-10" strokeWidth={1} />
      </button>
      <button
        type="button"
        aria-label="Next testimonial"
        onClick={() => go(index + 1, "left")}
        className="hidden md:inline-flex absolute right-4 md:right-8 top-1/2 -translate-y-1/2 text-background/80 hover:text-background transition-colors p-2"
      >
        <ChevronRight className="h-8 w-8 md:h-10 md:w-10" strokeWidth={1} />
      </button>

      <div className="container relative">
        <div className="relative max-w-4xl mx-auto px-5 sm:px-8 md:px-20 text-center flex flex-col justify-center min-h-[560px] sm:min-h-[520px] md:min-h-[480px] lg:min-h-[460px]">
          <div
            key={animKey}
            className={
              direction === "left"
                ? "animate-testimonial-in-left"
                : "animate-testimonial-in-right"
            }
          >
            {/* Quote area */}
            <div className="relative isolate">
              <span
                aria-hidden="true"
                className="font-serif text-background/90 select-none absolute -top-16 sm:-top-20 md:top-0 -left-2 sm:-left-4 md:-left-32 leading-none pointer-events-none text-[6rem] sm:text-[8rem] md:text-[16rem]"
              >
                “
              </span>
              <span
                aria-hidden="true"
                className="font-serif text-background/90 select-none absolute -bottom-20 sm:-bottom-24 md:-bottom-20 -right-2 sm:-right-4 md:-right-32 leading-none pointer-events-none text-[6rem] sm:text-[8rem] md:text-[16rem]"
              >
                ”
              </span>
              <p className="relative z-10 font-serif text-[1.55rem] sm:text-2xl md:text-3xl lg:text-4xl leading-snug text-background flex items-center justify-center px-1 sm:px-6 md:px-0" style={{ minHeight: 'calc(1.375em * 7)' }}>
                <span>{current.quote}</span>
              </p>
            </div>
            <p className="font-body text-base md:text-lg text-background mt-10 md:mt-16">
              {current.name}
            </p>
            <p className="font-body text-sm md:text-base text-background/70 mt-2">
              {displayedRole}
            </p>
          </div>
        </div>
      </div>

    </section>
  );
}
