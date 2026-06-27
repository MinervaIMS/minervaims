import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { PageIntroduction, PageLoader } from "@/components/shared";
import { OrgChart } from "@/components/shared/OrgChart";
import { Division, divisionLabels } from "@/lib/types";
import { useImagePreload } from "@/hooks/useImagePreload";
import aboutBg from "@/assets/mims-about-us.webp.asset.json";

const divisionData: { division: Division; description: string }[] = [
  {
    division: "equity",
    description: "Equity Research covers listed companies through fundamental analysis. The team studies business models, industry dynamics and financial statements, builds valuation models, and publishes clear investment theses with key catalysts and risks."
  },
  {
    division: "investment",
    description: "Investment Research provides cross-asset market views. The team analyses macro conditions and valuations across equities, fixed income, FX and commodities, and publishes outlooks and trade ideas to guide portfolio positioning and risk-taking."
  },
  {
    division: "macro",
    description: "Macro Research analyses global growth, inflation and policy. The team develops scenarios on central banks, fiscal policy and structural trends, and explains how these drivers affect markets, asset prices and portfolio risks."
  },
  {
    division: "portfolio",
    description: "Portfolio Management runs MIMS' student-managed portfolios. The team turns research into allocations, sizes positions, monitors exposures and performance, and documents rebalancing decisions through due diligence and transparent reporting."
  },
  {
    division: "quant",
    description: "Quantitative Research builds data-driven models and tools. The team applies statistics, machine learning and derivatives modelling to support forecasting, portfolio construction and risk measurement, publishing technical research and practical frameworks."
  }
];

const About = () => {
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
        <div className="relative z-10">
          <PageIntroduction
            title="About"
            transparentBackground
          />
        </div>
      </div>

      {/* SECTION 1 - What We Do */}
      <section className="bg-background text-foreground pt-10 md:pt-14 pb-6 md:pb-8">
        <div className="container">
          <h2 className="font-serif text-heading mb-8 pb-3 border-b border-separator text-left text-accent">What We Do</h2>
          <div className="max-w-4xl text-left space-y-6">
            <p className="font-body text-body-lg leading-relaxed text-muted-foreground">
              Minerva Investment Management Society (MIMS) is a society promoted and run by students of Bocconi University. Founded in 2017, MIMS is Bocconi's first student association dedicated to asset management and the only one with student-managed virtual funds.
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

      {/* SECTION 2 - Readings Curated By Our Members */}
      <section className="pt-6 md:pt-8 pb-6 md:pb-8 bg-background">
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

      {/* SECTION 3 - Our Divisions */}
      <section className="pt-6 md:pt-8 pb-6 md:pb-8 bg-background">
        <div className="container">
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">Our Divisions</h2>
          <div className="flex flex-col gap-4 max-w-4xl">
          {divisionData.map(({ division, description }) => (
              <Link
                key={division}
                to={`/divisions/${division}`}
                className="group block bg-secondary p-6 transition-all duration-300 hover:bg-accent hover:shadow-lg hover:-translate-y-1 hover:scale-[1.01]"
              >
                <h3 className="font-serif text-xl md:text-2xl mb-2 text-accent group-hover:text-background transition-colors duration-300">
                  {divisionLabels[division]}
                </h3>
                <p className="font-body text-body-lg text-muted-foreground group-hover:text-background/80 transition-colors duration-300">
                  {description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4 - Organisational Structure */}
      <section id="organisational-structure" className="bg-background pt-6 md:pt-8 pb-16 md:pb-24">
        <div className="container">
          <h2 className="font-serif text-heading mb-8 pb-3 border-b border-separator text-accent">Organisational Structure</h2>

          {/* Org Chart with integrated role descriptions */}
          <div className="mb-12">
            <OrgChart />
          </div>

          {/* CTA */}
          <div className="text-center">
            <Link
              to="/people/members"
              className="cta-link"
            >
              Meet the Team
            </Link>
          </div>
        </div>
      </section>
    </>
  );
};

export default About;
