import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  listPublishedTestimonials, listAlumniLite, resolveAlumnus,
  type Testimonial, type AlumniLite,
} from "@/lib/testimonials-api";

// Fallback used ONLY if the database has no published testimonials yet, so the
// homepage never renders empty. Mirrors the original seed; the workspace
// (Website → Testimonials) is the source of truth once populated.
const FALLBACK: Testimonial[] = [
  { id: "f1", quote: "The perfect place to apply classroom knowledge in an industry-like setting while meeting inspiring students who share your passion.", alumni_id: null, name: "Anna Maruccio", role_label: "Former President", display_order: 1, published: true, created_at: "" },
  { id: "f2", quote: "Joining Minerva was one of the best choices I made throughout my studies. Beyond everything I learned, it was the people I met and the moments we shared that made this experience so meaningful and unforgettable.", alumni_id: null, name: "Luigi Savarese", role_label: "Former President", display_order: 2, published: true, created_at: "" },
  { id: "f3", quote: "Come for the finance, stay for the people. You will join expecting to contribute to interesting work, but what you might not expect is to build relationships that will last long after graduation while having lots of fun.", alumni_id: null, name: "Matteo Consalvo", role_label: "Former Head of Portfolio Management", display_order: 3, published: true, created_at: "" },
  { id: "f4", quote: "A community of students, peers, and friends united by a passion for financial markets, creating bonds that last far beyond in life.", alumni_id: null, name: "Michele Rinaldi", role_label: "Former Vice-president", display_order: 4, published: true, created_at: "" },
  { id: "f5", quote: "An awesome place to meet people passionate about markets, exchange ideas and support peers in a friendly environment.", alumni_id: null, name: "Marco Neri", role_label: "Former Vice-president", display_order: 5, published: true, created_at: "" },
];

const AUTO_ADVANCE_MS = 15680;

export function TestimonialsSection() {
  const [list, setList] = useState<Testimonial[]>(FALLBACK);
  const [alumni, setAlumni] = useState<AlumniLite[]>([]);
  const [index, setIndex] = useState(() => Math.floor(Math.random() * FALLBACK.length));
  const [direction, setDirection] = useState<"left" | "right">("left");
  const [animKey, setAnimKey] = useState(0);

  // Load testimonials + alumni from the database, and live-update on changes.
  useEffect(() => {
    let cancelled = false;

    const loadAll = async () => {
      const [ts, al] = await Promise.all([
        listPublishedTestimonials().catch(() => [] as Testimonial[]),
        listAlumniLite().catch(() => [] as AlumniLite[]),
      ]);
      if (cancelled) return;
      if (ts.length > 0) setList(ts); // keep FALLBACK only while the table is empty
      setAlumni(al);
    };

    loadAll();

    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel("testimonials-homepage-sync")
        .on("postgres_changes", { event: "*", schema: "public", table: "testimonials" }, loadAll)
        .on("postgres_changes", { event: "*", schema: "public", table: "alumni" }, loadAll)
        .subscribe();
    } catch {
      // Realtime unavailable — the initial load still works.
    }

    return () => {
      cancelled = true;
      if (channel) { try { supabase.removeChannel(channel); } catch { /* noop */ } }
    };
  }, []);

  const len = list.length;

  const go = useCallback((next: number, dir: "left" | "right") => {
    const normalized = ((next % len) + len) % len;
    setDirection(dir);
    setIndex(normalized);
    setAnimKey((k) => k + 1);
  }, [len]);

  useEffect(() => {
    const id = setInterval(() => {
      go(index + 1, "left");
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [index, go]);

  const safeIndex = Math.min(index, Math.max(0, len - 1));
  const current = list[safeIndex] ?? FALLBACK[0];
  const { alumnus } = resolveAlumnus(current, alumni);
  const company = alumnus?.company?.trim();
  const displayedRole = company ? `${current.role_label}, currently at ${company}` : current.role_label;

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
