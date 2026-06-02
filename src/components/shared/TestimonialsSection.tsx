import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Testimonial {
  quote: string;
  name: string;
  role: string;
}

const testimonials: Testimonial[] = [
  {
    quote:
      "Among the many professionals whom I have met, those that I admire most are still my friends from Bocconi, many of whom were also part of the Society.",
    name: "Placeholder Name One",
    role: "Placeholder Role / Placeholder Institution",
  },
  {
    quote:
      "Minerva gave me the analytical rigour and the network that have shaped every step of my career since graduation.",
    name: "Placeholder Name Two",
    role: "Placeholder Role / Placeholder Institution",
  },
  {
    quote:
      "The discussions and research we ran together at the Society remain a benchmark for the quality of work I expect today.",
    name: "Placeholder Name Three",
    role: "Placeholder Role / Placeholder Institution",
  },
  {
    quote:
      "What I valued most was the culture: ambitious, curious, and built on a genuine respect for ideas and evidence.",
    name: "Placeholder Name Four",
    role: "Placeholder Role / Placeholder Institution",
  },
  {
    quote:
      "The friendships and intellectual habits formed in the Society have outlasted any single role or institution.",
    name: "Placeholder Name Five",
    role: "Placeholder Role / Placeholder Institution",
  },
];

const AUTO_ADVANCE_MS = 7000;

export function TestimonialsSection() {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<"left" | "right">("left");
  const [animKey, setAnimKey] = useState(0);

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

  const current = testimonials[index];

  return (
    <section className="relative bg-accent text-background py-20 md:py-28 overflow-hidden">
      {/* Arrows */}
      <button
        type="button"
        aria-label="Previous testimonial"
        onClick={() => go(index - 1, "right")}
        className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 text-background/80 hover:text-background transition-colors p-2"
      >
        <ChevronLeft className="h-8 w-8 md:h-10 md:w-10" strokeWidth={1} />
      </button>
      <button
        type="button"
        aria-label="Next testimonial"
        onClick={() => go(index + 1, "left")}
        className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 text-background/80 hover:text-background transition-colors p-2"
      >
        <ChevronRight className="h-8 w-8 md:h-10 md:w-10" strokeWidth={1} />
      </button>

      <div className="container relative">
        <div className="relative max-w-4xl mx-auto px-12 md:px-20 text-center">
          <div
            key={animKey}
            className={
              direction === "left"
                ? "animate-testimonial-in-left"
                : "animate-testimonial-in-right"
            }
          >
            {/* Quote area with fixed height for up to 4 lines */}
            <div className="relative">
              <span
                aria-hidden="true"
                className="font-serif text-background select-none absolute -top-6 md:-top-10 left-0 leading-none"
                style={{ fontSize: "8rem" }}
              >
                “
              </span>
              <span
                aria-hidden="true"
                className="font-serif text-background select-none absolute -bottom-10 md:-bottom-14 right-0 leading-none"
                style={{ fontSize: "8rem" }}
              >
                ”
              </span>
              <p
                className="font-serif text-2xl md:text-3xl lg:text-4xl leading-snug text-background flex items-center justify-center"
                style={{ minHeight: "calc(1.375em * 4)" }}
              >
                <span>{current.quote}</span>
              </p>
            </div>
            <p className="font-serif text-base md:text-lg text-background mt-16">
              {current.name}
            </p>
            <p className="font-serif text-sm md:text-base text-background/70 mt-2">
              {current.role}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
