import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { PageIntroduction, PageLoader } from "@/components/shared";
import { OrgChart } from "@/components/shared/OrgChart";
import { HistoryTimeline } from "@/components/shared/HistoryTimeline";
import { useImagePreload } from "@/hooks/useImagePreload";
import aboutBgAsset from "@/assets/mims-about-us.webp.asset.json";

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
          <div className="max-w-4xl text-left space-y-6">
            <p className="font-body text-body-lg leading-relaxed text-muted-foreground">
              Minerva Investment Management Society (MIMS) is a society promoted and run by students of Bocconi University. Founded in 2019, MIMS is Bocconi's first student association dedicated to asset management and the only one with student-managed virtual funds.
            </p>
            <p className="font-body text-body-lg leading-relaxed text-muted-foreground">
              We are organised as an investment management firm. Members work in specialised research divisions and in portfolio management. Each research team meets regularly to discuss market developments, review ideas, and develop investment theses. Each team's work is consolidated into written research reports and publications structured to professional investment-industry standards.
            </p>
            <p className="font-body text-body-lg leading-relaxed text-muted-foreground">
              Portfolio management sits at the centre of the structure, leveraging the research work to build and update proprietary funds' allocations. Decisions are documented and reviewed through strict due diligence and evaluated with risk-metrics analysis. The Society publishes outputs in line with market standards.
            </p>
            <p className="font-body text-body-lg leading-relaxed text-muted-foreground">
              Over time, MIMS has built an international alumni community. Former members have gone on to pursue MSc and PhD studies and to build careers across major financial centres, joining leading investment banks, hedge funds, asset managers and consultancies worldwide.
            </p>
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
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
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
