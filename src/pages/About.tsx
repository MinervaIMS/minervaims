import { Link } from "react-router-dom";
import { PageIntroduction } from "@/components/shared";
import { OrgChart } from "@/components/shared/OrgChart";
import { Division, divisionLabels } from "@/lib/types";
import aboutBg from "@/assets/about-bg.webp";

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
  return (
    <>
      {/* SECTION 0 - Hero with title and photo background */}
      <div className="relative">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${aboutBg})` }} />
        <div className="relative z-10">
          <PageIntroduction
            title="About Us"
            transparentBackground
          />
        </div>
      </div>

      {/* SECTION 1 - White background / Black text */}
      <section className="bg-background text-foreground py-section-sm md:py-section">
        <div className="container">
          <h2 className="font-serif text-xl sm:text-heading mb-8 pb-3 border-b border-separator text-left text-accent">What We Do</h2>
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
              Over time, MIMS has built an international Alumni community. Former members have progressed to leading investment banks, hedge funds, and asset managers across global financial centres.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 2 - Our Divisions */}
      <section className="py-section-sm md:py-section bg-background">
        <div className="container">
          <h2 className="font-serif text-xl sm:text-heading mb-6 pb-3 border-b border-separator text-accent">Our Divisions</h2>
          <div className="flex flex-col gap-4 max-w-4xl">
          {divisionData.map(({ division, description }) => (
              <Link
                key={division}
                to={`/divisions/${division}`}
                className="group block bg-secondary p-6 transition-all duration-300 hover:bg-accent hover:shadow-lg hover:-translate-y-1 hover:scale-[1.01]"
              >
                <h3 className="font-serif text-xl md:text-2xl mb-2 text-accent group-hover:text-white transition-colors duration-300">
                  {divisionLabels[division]}
                </h3>
                <p className="font-body text-body-lg text-muted-foreground group-hover:text-white/80 transition-colors duration-300">
                  {description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3 - Organisational Structure */}
      <section id="organisational-structure" className="bg-background py-section-sm md:py-section">
        <div className="container">
          <h2 className="font-serif text-xl sm:text-heading mb-8 pb-3 border-b border-separator text-accent">Organisational Structure</h2>

          {/* Org Chart with integrated role descriptions */}
          <div className="mb-12">
            <OrgChart />
          </div>

          {/* CTA */}
          <div className="text-center">
            <Link
              to="/members/team"
              className="inline-block px-10 py-4 bg-background text-accent border border-accent font-serif text-lg shadow-none hover:bg-accent hover:text-background hover:shadow-[0_4px_10px_rgba(0,0,0,0.15)] transition-all duration-200"
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
