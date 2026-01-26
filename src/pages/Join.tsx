import { Link } from "react-router-dom";
import { PageIntroduction, ApplicationStatus, PageLoader } from "@/components/shared";
import joinBg from "@/assets/join-bg.webp";
import { useApplicationSettings } from "@/hooks/useApplicationSettings";
import { useImagePreload } from "@/hooks/useImagePreload";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const ELIGIBILITY_CRITERIA = [
  "Undoubtable academic integrity, humility, eagerness to learn, respect for other members, and full compliance with Università Bocconi's Honor Code.",
  "Currently enrolled at Università Bocconi (undergraduate or postgraduate).",
  "Demonstrated interest in financial markets and investment research.",
  "Commitment to participate actively in Society activities.",
];

const APPLICATION_STEPS = [
  {
    step: 1,
    title: "Online Application",
    description:
      "Complete the application form and submit your CV, motivation letter, and the required written answers and/or investment pitch for the division you are applying for. (See below)",
  },
  {
    step: 2,
    title: "Interview",
    description:
      "Selected candidates are invited to interview with current members and Board representatives to discuss their application, assess cultural fit, and test hard skills and market knowledge. Historically, more than 50% of applicants are invited to interview.",
  },
  {
    step: 3,
    title: "Onboarding",
    description:
      "Successful candidates join MIMS and begin the training programme, including research methodology and financial modelling. Historically, c.4% of applicants are selected; intake capacity is typically higher at the start of the academic year.",
  },
];

const FAQS = [
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
    question: "Is it possible to apply again?",
    answer:
      "Yes. We encourage reapplication, particularly for first-year undergraduates. The February intake is typically more competitive due to fewer available places.",
  },
  {
    question: "Are referrals a thing?",
    answer:
      "No. Members are not permitted to refer candidates during the application process. All candidates follow the same assessment. We still encourage applicants to connect with members on LinkedIn.",
  },
];

const Join = () => {
  const { settings } = useApplicationSettings();
  const imagesLoaded = useImagePreload([joinBg]);

  if (!imagesLoaded) {
    return <PageLoader />;
  }

  return (
    <>
      <div className="relative">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${joinBg})` }} />
        <div className="relative z-10">
          <PageIntroduction title="Join Us" transparentBackground />
        </div>
      </div>

      <div className="container py-section md:py-section-lg">
        {/* Application Status */}
        <ApplicationStatus
          applicationsOpen={settings.applicationsOpen}
          semesterLabel={settings.semesterLabel}
          applyFormUrl={settings.applyFormUrl}
        />

        {/* Eligibility Criteria */}
        <section className="mb-20 md:mb-24">
          <h2 className="font-serif text-xl sm:text-heading mb-6 pb-3 border-b border-separator text-accent">
            Eligibility Criteria
          </h2>
          <div className="max-w-3xl">
            <ul className="space-y-4">
              {ELIGIBILITY_CRITERIA.map((criterion, index) => (
                <li
                  key={index}
                  className="font-body text-body-lg text-muted-foreground pl-6 relative before:content-['•'] before:absolute before:left-0 before:text-muted-foreground"
                >
                  {criterion}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Application Process */}
        <section className="mb-20 md:mb-24">
          <h2 className="font-serif text-xl sm:text-heading mb-6 pb-3 border-b border-separator text-accent">
            Application Process
          </h2>
          <div className="max-w-3xl">
            {APPLICATION_STEPS.map((step, index) => (
              <div key={step.step} className="flex gap-5">
                {/* Timeline Column */}
                <div className="flex flex-col items-center">
                  {/* Circled Step Number */}
                  <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-accent flex items-center justify-center bg-background">
                    <span className="font-serif text-lg sm:text-xl text-accent">{step.step}</span>
                  </div>
                  {/* Vertical Line */}
                  {index < APPLICATION_STEPS.length - 1 && <div className="w-px flex-1 bg-separator my-2" />}
                </div>
                {/* Step Content */}
                <div className={`flex-1 pt-1 ${index < APPLICATION_STEPS.length - 1 ? "pb-8" : ""}`}>
                  <h3 className="font-serif text-lg sm:text-subheading mb-2">{step.title}</h3>
                  <p className="font-body text-body-lg text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How To Prepare For The Interview */}
        <section className="mb-20 md:mb-24">
          <h2 className="font-serif text-xl sm:text-heading mb-6 pb-3 border-b border-separator text-accent">
            How To Prepare For The Interview
          </h2>
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
              <Link
                to="/archive"
                className="inline-block px-10 py-4 bg-background text-accent border border-accent font-serif text-lg shadow-none hover:bg-accent hover:text-background hover:shadow-[0_4px_10px_rgba(0,0,0,0.15)] transition-all duration-200"
              >
                View Divisions Reports
              </Link>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section>
          <h2 className="font-serif text-xl sm:text-heading mb-6 pb-3 border-b border-separator text-accent">FAQs</h2>
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
        </section>
      </div>
    </>
  );
};

export default Join;
