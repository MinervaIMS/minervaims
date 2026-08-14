import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { PageIntroduction, PageLoader } from "@/components/shared";
import { OrgChart } from "@/components/shared/OrgChart";
import { HistoryTimeline } from "@/components/shared/HistoryTimeline";
import { LibraryPreview } from "@/components/shared/LibraryPreview";
import { useImagePreload } from "@/hooks/useImagePreload";
import aboutBgAsset from "@/assets/mims-about-us.webp.asset.json";

/**
 * What We Do, as three labelled blocks.
 *
 * The copy lives here rather than in the markup so the three blocks are
 * unmistakably one set: they are rendered by one loop, so no block can
 * drift out of the layout the other two share, and adding or reordering
 * one is an edit to this list rather than to the page.
 */
const WHAT_WE_DO: { label: string; body: string }[] = [
  {
    label: "Learn",
    body:
      "Members research markets within specialised divisions and publish what they find: equity reports, " +
      "macroeconomic articles, investment outlooks and quantitative papers, all structured to professional " +
      "investment-industry standards. Publications carry their authors' names and are released through the Society's archive.",
  },
  {
    label: "Meet",
    body:
      "Work here is done in teams, under deadlines, alongside peers who are ambitious and generous with what they " +
      "know. Members develop professional experience in a firm-style environment and build relationships lasting " +
      "far beyond their time in the Society. Internal presentations, regular aperitivos, and more keep the membership " +
      "close across divisions.",
  },
  {
    label: "Engage",
    body:
      "Each semester Minerva hosts professionals from leading financial institutions for panels and talks, organises " +
      "company visits, and runs calls with an alumni network now working across major financial centres. The result " +
      "is a view of the industry formed from the people inside it, not from a brochure.",
  },
];

const About = () => {
  const aboutBg = aboutBgAsset.url;
  const imagesLoaded = useImagePreload([aboutBg]);


  if (!imagesLoaded) {
    return <PageLoader />;
  }

  return (
    <>
      <Helmet>
        <title>About | MIMS</title>
      </Helmet>
      {/* SECTION 0 - Hero with title and photo background */}
      <div data-page-hero className="relative">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${aboutBg})` }} />
        <div className="absolute inset-0 hero-overlay" />
        <div className="relative z-10">
          <PageIntroduction
            title="About"
            transparentBackground
          />
        </div>
      </div>

      {/* SECTION 1 - What We Do
          The bottom half of the rhythm is halved because the section below
          is the pinned timeline, a full viewport that opens with a band of
          its own. Counting both in full is what left a gap here that no
          other boundary on the page has. */}
      <section className="bg-background text-foreground pt-section-sm md:pt-section pb-10 md:pb-16">
        <div className="container">
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator text-left text-accent">What We Do</h2>
          {/* A LEAD, THEN THREE LABELLED BLOCKS. Four paragraphs of equal
              weight gave the reader nothing to navigate by; a label in the
              margin tells them what each block is before they read it, and
              lets them read only the one they came for. */}
          <div className="text-left">
            {/* The lead reads at the section heading's size, on a measure
                two fifths narrower than the section, centred in it. A
                sentence set across the full width of this page is a line
                of about a hundred and forty characters; at this measure it
                is closer to seventy, which is where a reader stops losing
                their place between lines. */}
            <p className="mx-auto max-w-[50.4rem] text-center font-serif text-heading leading-snug text-muted-foreground whitespace-pre-line">
              {" "}Minerva Investment Management Society is promoted and run by students of Bocconi University. Founded in
              2019, it's Bocconi's first association dedicated to asset management and the only one with
              student-managed virtual funds.{"  "}
            </p>

            {/* The three blocks stay at their previous measure, now centred
                in the section. The container carries a top rule as well as
                the dividing ones, so the lead is separated from LEARN by
                exactly the line that separates LEARN from MEET. */}
            <div className="mx-auto max-w-4xl mt-8 md:mt-10 border-t border-separator divide-y divide-separator">
              {WHAT_WE_DO.map((block) => (
                <div
                  key={block.label}
                  className="grid gap-y-2 py-8 md:py-10 md:grid-cols-[8rem_1fr] md:gap-x-10"
                >
                  <h3 className="font-serif text-heading italic tracking-wide text-accent md:pt-1">
                    {block.label}
                  </h3>
                  <p className="font-body text-body-lg leading-relaxed text-muted-foreground">
                    {block.body}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* SECTION 1b - Our History */}
      <HistoryTimeline />

      {/* SECTION 2 - Readings Curated By Our Members
          Half rhythm on top for the same reason as above. */}
      <section className="bg-background pt-10 md:pt-16 pb-section-sm md:pb-section">
        <div className="container">
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">
            Readings Curated By Our Members
          </h2>
          {/* DESCRIPTION AND CTA FIRST, THEN THE LIBRARY. The sentence and
              the way in are read before the visual bookcase is shown. */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-10 md:mb-14">
            <p className="font-body text-body-lg text-muted-foreground max-w-3xl">
              A curated set of essential finance readings, built by MIMS and shared across students, members and alumni. Explore landmark papers, technical textbooks and free-time books, each recommended with a clear rationale to accelerate learning.
            </p>
            <Link
              to="/readings"
              className="cta-link whitespace-nowrap shrink-0"
            >
              Discover Our Library
            </Link>
          </div>
          <div>
            <LibraryPreview />
          </div>
        </div>
      </section>

      {/* SECTION 4 - Organisational Structure */}
      <section id="organisational-structure" className="bg-background py-section-sm md:py-section">
        <div className="container">
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">Roles &amp; Divisions</h2>

          {/* The chart carries its own call to action: the label follows the
              selected division, so it lands on that division's team. */}
          <OrgChart />
        </div>
      </section>
    </>
  );
};

export default About;
