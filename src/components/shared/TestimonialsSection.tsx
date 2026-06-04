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
                className="font-serif text-background select-none absolute -top-6 md:-top-10 -left-[3.75rem] md:-left-[3.75rem] leading-none"
                style={{ fontSize: "8rem" }}
              >
                “
              </span>
              <span
                aria-hidden="true"
                className="font-serif text-background select-none absolute -bottom-10 md:-bottom-14 -right-[3.75rem] md:-right-[3.75rem] leading-none"
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
            <p className="font-body text-base md:text-lg text-background mt-16">
              {current.name}
            </p>
            <p className="font-body text-sm md:text-base text-background/70 mt-2">
              {current.role}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
