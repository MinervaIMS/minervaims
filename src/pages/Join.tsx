import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { PageIntroduction, ApplicationStatus, PageLoader } from "@/components/shared";
import joinBg from "@/assets/join-bg.webp";
import { useApplicationSettings } from "@/hooks/useApplicationSettings";
import { useImagePreload } from "@/hooks/useImagePreload";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const WHY_JOIN = [
  {
    title: "The only student-managed virtual funds at Bocconi",
    description:
      "MIMS is Bocconi's first and only association running student-managed virtual funds, with processes, reports and disclosures that replicate professional-industry standards.",
  },
  {
    title: "The only ones producing market outlooks",
    description:
      "Across Equity, Investment, Macro and Quantitative Research, members publish cross-asset outlooks and trade ideas — work no other society on campus produces.",
  },
  {
    title: "Best-in-class equity research",
    description:
      "Fundamental coverage of listed companies — business models, valuation, and investment theses with clear catalysts and risks — written to a standard recruiters recognise.",
  },
  {
    title: "Industry-level quantitative research",
    description:
      "Statistical and machine-learning models, derivatives pricing and risk measures (CVaR/EVaR) — the kind of work usually reserved for the desk, not the classroom.",
  },
];

type Figure = { num: string; label: string; count?: number; suffix?: string };
const FIGURES: Figure[] = [
  { num: "2017", label: "Founded" },
  { num: "80+", label: "Active Members", count: 80, suffix: "+" },
  { num: "250+", label: "Alumni Network", count: 250, suffix: "+" },
  { num: "120+", label: "Research Reports", count: 120, suffix: "+" },
  { num: "5", label: "Research Divisions", count: 5, suffix: "" },
];

const WHAT_YOU_GAIN = [
  {
    title: "A research-driven community",
    description:
      "Specialist divisions and a central Portfolio Management team that meet regularly to discuss markets, review ideas and develop theses.",
  },
  {
    title: "Professional-standard training",
    description:
      "An onboarding programme covering research methodology and financial modelling — you learn the craft by producing real, disclosed work.",
  },
  {
    title: "Industry exposure & events",
    description:
      "One flagship event each semester with industry professionals, company visits, and internal presentations and debate forums.",
  },
  {
    title: "An alumni network that opens doors",
    description:
      "Alumni now work at top investment banks, hedge funds, asset managers and consultancies worldwide — reachable through the Society's alumni-call programme.",
  },
];

const WRITTEN_ANSWERS = [
  {
    division: "Equity Research",
    question:
      "Submit an equity investment pitch (maximum one page). Place any charts/tables in an Appendix after the first page.",
  },
  {
    division: "Investment Research",
    question:
      "How do you keep your knowledge of business and finance current? Which recent financial markets story has interested you most, and why? Explain in detail.",
  },
  {
    division: "Macro Research",
    question: "Choose a macroeconomic topic and explain how it may impact any of Minerva's funds.",
  },
  {
    division: "Portfolio Management",
    question:
      "Submit a one-page investment pitch. It may cover a stock, bond, ETP, derivatives strategy, or a full portfolio. Place any charts/tables/math formulas in an Appendix after the first page.",
  },
  {
    division: "Quantitative Research",
    question:
      "Provide brief answers to both: a topic in quantitative finance, risk management, or financial machine learning you are interested in; and a project (academic/personal/work) in which you wrote code (what you built and what you learned).",
  },
];

const APPLICATION_STEPS = [
  {
    step: 1,
    title: "Prepare Your Application",
    description:
      "Get your materials ready before you submit: a CV, a motivation letter, and the written answer for your first-choice division. In the form you rank your division preferences from 1 (first choice) to 5 (fifth choice); prepare your response as a single PDF named",
    fileName: "Surname_Name_Answer.pdf",
    written: WRITTEN_ANSWERS,
  },
  {
    step: 2,
    title: "Online Application",
    description:
      "Complete the application form and submit your CV, motivation letter, and the required written answers and/or investment pitch for the division you are applying for.",
  },
  {
    step: 3,
    title: "Interview",
    description:
      "Selected candidates are invited to interview with current members and Board representatives to discuss their application, assess cultural fit, and test hard skills and market knowledge. Historically, more than 50% of applicants are invited to interview.",
  },
  {
    step: 4,
    title: "Onboarding",
    description:
      "Successful candidates join MIMS and begin the training programme, including research methodology and financial modelling. Historically, c.4% of applicants are selected; intake capacity is typically higher at the start of the academic year.",
  },
];

const FAQS = [
  {
    question: "Who should apply?",
    answer:
      "MIMS is open to students currently enrolled at Università Bocconi (undergraduate or postgraduate) who show a genuine interest in financial markets and investment research, and who are ready to participate actively in the Society. We value academic integrity, humility, eagerness to learn, respect for other members, and full compliance with Università Bocconi's Honor Code. Prior experience is not required — we value potential, rigour, and a consistent commitment to learning.",
  },
  {
    question: "Are undergraduate first-year students considered in the application process?",
    answer:
      "Yes. We value potential, especially at the start of an academic journey. Admission may be more challenging due to limited prior exposure to finance.",
  },
  {
    question: "Are questions different based on experience?",
    answer:
      "Yes. Questions vary by academic year and individual profile. We assess both current knowledge and long-term potential.",
  },
  {
    question: "Which division's written question do I need to answer?",
    answer:
      "You are required to answer only the question for your first-choice division — the division you ranked 1 in the application form.",
  },
  {
    question: "Can I answer more than one division's question?",
    answer:
      "Yes. You may also answer additional division questions. If you do, combine all of your answers into one PDF and upload it as a single file.",
  },
  {
    question: "Is it possible to apply again?",
    answer:
      "Yes. We encourage reapplication, particularly for first-year undergraduates. The February intake is typically more competitive due to fewer available places.",
  },
  {
    question: "Are referrals a thing?",
    answer:
      "Yes. Members are permitted to refer a maximum of 2 candidates each per round of application. Referred applicants are not required to submit written answers, cover letter, and do not need to submit the application form. More information about the application process is provided privately by the member who makes the referral. Referrals may be based upon a long and well-established academic or professional relationship. Applicants cannot request a referral through LinkedIn. We still encourage applicants to connect with members on LinkedIn.",
  },
];

/* ---------------------- Animation primitives (page-local) ---------------------- */

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function useInView<T extends HTMLElement>(options: IntersectionObserverInit = { threshold: 0.15 }) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (prefersReducedMotion()) {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          setInView(true);
          io.unobserve(e.target);
        }
      });
    }, options);
    io.observe(node);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { ref, inView };
}

const Reveal = ({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}) => {
  const { ref, inView } = useInView<HTMLDivElement>();
  const Component = Tag as any;
  return (
    <Component
      ref={ref as any}
      className={`transition-[opacity,transform] duration-700 ease-out ${
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-[22px]"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Component>
  );
};

const CountUp = ({
  value,
  suffix = "",
  start,
  duration = 1600,
}: {
  value: number;
  suffix?: string;
  start: boolean;
  duration?: number;
}) => {
  const [n, setN] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (!start || started.current) return;
    started.current = true;
    if (prefersReducedMotion()) {
      setN(value);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, value, duration]);
  return (
    <>
      {n}
      {suffix}
    </>
  );
};

/* ---------------------- Page ---------------------- */

const Join = () => {
  const { settings } = useApplicationSettings();
  const imagesLoaded = useImagePreload([joinBg]);

  // Figures band trigger
  const figures = useInView<HTMLDivElement>({ threshold: 0.3 });

  // Journey "lit" sequential effect
  const journey = useInView<HTMLDivElement>({ threshold: 0.2 });
  const [litStep, setLitStep] = useState(-1);
  useEffect(() => {
    if (!journey.inView) return;
    if (prefersReducedMotion()) {
      setLitStep(APPLICATION_STEPS.length - 1);
      return;
    }
    const timers: number[] = [];
    APPLICATION_STEPS.forEach((_, i) => {
      timers.push(
        window.setTimeout(() => setLitStep((s) => Math.max(s, i)), 250 + i * 400)
      );
    });
    return () => timers.forEach(clearTimeout);
  }, [journey.inView]);

  if (!imagesLoaded) {
    return <PageLoader />;
  }

  return (
    <>
      <Helmet>
        <title>Join Us | MIMS</title>
      </Helmet>
      <div data-page-hero className="relative">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${joinBg})` }} />
        <div className="relative z-10">
          <PageIntroduction
            title="Join Minerva"
            description="Built like an investment firm, run by students. Your first step toward a career in finance."
            transparentBackground
          />
        </div>
      </div>

      <div className="container py-section md:py-section-lg">
        {/* Application Status */}
        <Reveal>
          <ApplicationStatus
            applicationsOpen={settings.applicationsOpen}
            semesterLabel={settings.semesterLabel}
            applyFormUrl={settings.applyFormUrl}
          />
        </Reveal>

        {/* Why Join */}
        <section className="mb-20 md:mb-24">
          <h2 className="font-serif text-xl sm:text-heading mb-6 pb-3 border-b border-separator text-accent">
            Why Join
          </h2>
          <Reveal>
            <p className="font-body text-body-lg text-muted-foreground max-w-3xl mb-10">
              No other society at Bocconi does what we do. Membership puts professional-standard research, real
              portfolio decisions and a global alumni network within reach — well before your first internship.
            </p>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {WHY_JOIN.map((item, i) => (
              <Reveal key={item.title} delay={i * 90}>
                <div className="group relative bg-background border border-separator p-8 overflow-hidden transition-[transform,box-shadow,border-color] duration-300 ease-out hover:-translate-y-1.5 hover:shadow-elevated hover:border-accent h-full">
                  <span
                    aria-hidden
                    className="absolute left-0 top-0 w-[3px] h-0 bg-accent transition-[height] duration-500 ease-out group-hover:h-full"
                  />
                  <div className="font-serif text-sm tracking-[0.1em] text-muted-foreground mb-2">
                    0{i + 1}
                  </div>
                  <h3 className="font-serif text-subheading text-accent mb-3 leading-snug">{item.title}</h3>
                  <p className="font-body text-body text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Figures */}
        <section className="mb-20 md:mb-24 -mx-6 md:-mx-0">
          <div ref={figures.ref} className="bg-accent text-accent-foreground py-10 md:py-14 px-6 md:px-12">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-y-8 gap-x-4">
              {FIGURES.map((f, i) => (
                <Reveal key={f.label} delay={i * 80} className="text-center">
                  <div className="font-serif text-3xl md:text-5xl text-accent-foreground leading-none">
                    {f.count !== undefined ? (
                      <CountUp value={f.count} suffix={f.suffix ?? ""} start={figures.inView} />
                    ) : (
                      f.num
                    )}
                  </div>
                  <div className="font-body text-xs uppercase tracking-[0.12em] text-accent-foreground/70 mt-3">
                    {f.label}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* What You Gain */}
        <section className="mb-20 md:mb-24">
          <h2 className="font-serif text-xl sm:text-heading mb-6 pb-3 border-b border-separator text-accent">
            What You Gain
          </h2>
          <div className="border-t border-separator">
            {WHAT_YOU_GAIN.map((item, i) => (
              <Reveal key={item.title} delay={i * 70}>
                <div className="grid grid-cols-1 md:grid-cols-[3rem_minmax(0,1.1fr)_minmax(0,1.6fr)] gap-y-2 md:gap-x-8 py-6 md:py-8 border-b border-separator transition-[background-color,padding] duration-300 ease-out hover:bg-secondary hover:pl-5">
                  <div className="font-serif text-xl text-muted-foreground">0{i + 1}</div>
                  <h3 className="font-serif text-subheading text-accent">{item.title}</h3>
                  <p className="font-body text-body-lg text-muted-foreground">{item.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Selectivity */}
        <section className="mb-20 md:mb-24 -mx-6 md:-mx-0">
          <Reveal>
            <div className="bg-secondary px-6 md:px-12 py-12 md:py-16">
              <div className="max-w-3xl">
                <h2 className="font-serif text-heading text-accent mb-5">Demanding by design</h2>
                <p className="font-serif text-xl md:text-2xl leading-snug text-foreground">
                  We don't lead with acceptance rates — they understate the truth. The application itself is rigorous,
                  so candidates effectively self-select before they ever submit. The bar is the preparation. Treat the
                  steps below as the syllabus: meet them properly and you are already most of the way there.
                </p>
              </div>
            </div>
          </Reveal>
        </section>

        {/* Application Journey */}
        <section className="mb-20 md:mb-24">
          <h2 className="font-serif text-xl sm:text-heading mb-6 pb-3 border-b border-separator text-accent">
            The Application Journey
          </h2>
          <div ref={journey.ref} className="max-w-4xl">
            {APPLICATION_STEPS.map((step, index) => {
              const lit = index <= litStep;
              const isLast = index === APPLICATION_STEPS.length - 1;
              return (
                <Reveal key={step.step} delay={index * 70}>
                  <div className="flex gap-5">
                    {/* Timeline Column */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-accent flex items-center justify-center transition-[background-color,color,box-shadow] duration-500 ease-out ${
                          lit
                            ? "bg-accent text-background shadow-[0_0_0_6px_rgba(31,15,77,0.1),0_10px_28px_rgba(31,15,77,0.3)]"
                            : "bg-background text-accent"
                        }`}
                      >
                        <span className="font-serif text-lg sm:text-xl">{step.step}</span>
                      </div>
                      {!isLast && (
                        <div className="relative w-px flex-1 bg-separator my-2 overflow-hidden">
                          <div
                            className="absolute inset-x-0 top-0 bg-accent transition-[height] duration-1000 ease-out"
                            style={{ height: lit ? "100%" : "0%" }}
                          />
                        </div>
                      )}
                    </div>
                    {/* Step Content */}
                    <div className={`flex-1 pt-1 ${!isLast ? "pb-10" : ""}`}>
                      <h3 className="font-serif text-lg sm:text-subheading mb-2">{step.title}</h3>
                      <p className="font-body text-body-lg text-muted-foreground">
                        {step.description}
                        {step.fileName && (
                          <>
                            {": "}
                            <span className="font-serif text-accent bg-secondary px-1.5 py-0.5">{step.fileName}</span>
                            {"."}
                          </>
                        )}
                      </p>

                      {step.written && (
                        <div className="mt-5 pt-5 border-t border-separator max-w-2xl flex flex-col gap-4">
                          <p className="font-body text-small text-muted-foreground">
                            Answer the question for your first-choice division below. You may answer additional divisions
                            too — if you do, combine everything into the same PDF.
                          </p>
                          {step.written.map((w) => (
                            <div
                              key={w.division}
                              className="grid grid-cols-1 sm:grid-cols-[11rem_1fr] gap-y-1 gap-x-4"
                            >
                              <div className="font-body font-semibold text-xs uppercase tracking-wider text-accent">
                                {w.division}
                              </div>
                              <div className="font-body text-small text-muted-foreground">{w.question}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* How To Prepare For The Interview */}
        <section className="mb-20 md:mb-24">
          <h2 className="font-serif text-xl sm:text-heading mb-6 pb-3 border-b border-separator text-accent">
            How To Prepare For The Interview
          </h2>
          <Reveal>
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
              <div className="lg:flex-1">
                <p className="font-body text-body-lg text-muted-foreground mb-6">
                  To prepare effectively, we recommend reviewing our division-specific publications to understand our
                  analytical approach, reporting standards, and recurring themes. This will help you align your reasoning,
                  structure, and level of depth with the work produced within MIMS. Applicants, with due respect, may also
                  contact society members on LinkedIn to ask further questions.
                </p>
                <p className="font-body text-body-lg text-muted-foreground mb-4">
                  In addition, candidates are expected to demonstrate a clear awareness of the current market environment.
                  In practice, this means being comfortable discussing:
                </p>
                <ul className="space-y-3">
                  <li className="font-body text-body-lg text-muted-foreground pl-6 relative before:content-['•'] before:absolute before:left-0 before:text-muted-foreground">
                    Macroeconomic data (inflation, growth, labour market dynamics, central bank stance).
                  </li>
                  <li className="font-body text-body-lg text-muted-foreground pl-6 relative before:content-['•'] before:absolute before:left-0 before:text-muted-foreground">
                    Relevant market data and recent performance (rates, credit, equities, FX, commodities; key moves and
                    drivers).
                  </li>
                  <li className="font-body text-body-lg text-muted-foreground pl-6 relative before:content-['•'] before:absolute before:left-0 before:text-muted-foreground">
                    The most relevant market news from the last two weeks and its implications across asset classes.
                  </li>
                </ul>
              </div>
              <div className="lg:flex-shrink-0">
                <Link to="/archive" className="cta-link">
                  View Divisions Reports
                </Link>
              </div>
            </div>
          </Reveal>
        </section>

        {/* FAQs */}
        <section className="mb-20 md:mb-24">
          <h2 className="font-serif text-xl sm:text-heading mb-6 pb-3 border-b border-separator text-accent">FAQs</h2>
          <Reveal>
            <div className="max-w-3xl">
              <Accordion type="multiple" className="w-full">
                {FAQS.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`} className="border-separator">
                    <AccordionTrigger className="font-serif text-lg sm:text-subheading text-left hover:no-underline py-6 [&>svg]:text-accent [&>svg]:w-5 [&>svg]:h-5">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="font-body text-body-lg text-muted-foreground pb-6 text-base sm:text-lg">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </Reveal>
        </section>

        {/* Final CTA */}
        <section className="-mx-6 md:-mx-0">
          <Reveal>
            <div
              className="relative overflow-hidden"
              style={{ backgroundColor: "#0b0720" }}
            >
              <div
                className="absolute inset-0 bg-cover bg-center opacity-30"
                style={{ backgroundImage: `url(${joinBg})` }}
                aria-hidden
              />
              <div className="relative z-10 px-6 md:px-12 py-16 md:py-24 max-w-3xl">
                <p className="font-body text-xs uppercase tracking-[0.16em] text-background/70 mb-5">The next step</p>
                {settings.applicationsOpen ? (
                  <>
                    <h2 className="font-serif text-display md:text-hero text-background leading-tight">
                      Prepare a strong application — then apply.
                    </h2>
                    <p className="font-body text-body-lg text-background/80 mt-5">
                      Applications for {settings.semesterLabel} are open. Submit the form with your CV, motivation
                      letter and written answer.
                    </p>
                    <div className="flex flex-wrap gap-4 items-center mt-8">
                      <a
                        href={settings.applyFormUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-background text-foreground font-serif text-body-lg px-8 py-4 hover:bg-background/90 transition-colors"
                      >
                        Submit Application Form <span aria-hidden>↗</span>
                      </a>
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="font-serif text-display md:text-hero text-background leading-tight">
                      Applications are closed — start preparing now.
                    </h2>
                    <p className="font-body text-body-lg text-background/80 mt-5">
                      Use the journey above as your syllabus. The next intake will be announced at the start of the
                      upcoming semester.
                    </p>
                  </>
                )}
              </div>
            </div>
          </Reveal>
        </section>
      </div>
    </>
  );
};

export default Join;
