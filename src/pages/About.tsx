import { Link } from "react-router-dom";
import { PageIntroduction } from "@/components/shared";
import { OrgChart } from "@/components/shared/OrgChart";
import { DivisionCard } from "@/components/shared/DivisionCard";
import { Division } from "@/lib/types";
import aboutBg from "@/assets/about-bg.png";

const divisionDescriptions: Record<Division, string> = {
  equity:
    "Fundamental analysis of public equities across sectors and geographies, producing initiations of coverage and sector reports.",
  investment: "Analysis of private market opportunities, M&A transactions, and alternative investments.",
  macro: "Macroeconomic analysis covering monetary policy, inflation dynamics, and global growth.",
  portfolio: "Management of simulated investment portfolios with defined risk parameters and investment mandates.",
  quant: "Quantitative research on factor strategies, systematic investing, and machine learning applications.",
};

const About = () => {
  return (
    <>
      {/* SECTION 0 - Hero with title and photo background */}
      <div className="relative">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${aboutBg})` }} />
        <div className="relative z-10">
          <PageIntroduction
            title="About Us"
            description="Understanding what we do, our mission, and organisational structure."
            transparentBackground
          />
        </div>
      </div>

      {/* SECTION 1 - White background / Black text */}
      <section className="bg-background text-foreground py-section-sm md:py-section">
        <div className="container">
          <h2 className="font-serif text-heading mb-8 pb-3 border-b border-separator text-left">What we do</h2>
          <div className=" mx-auto text-left space-y-6">
            <p className="font-body text-body-lg leading-relaxed">
              Minerva Investment Management Society (MIMS) is society promoted and run by students of Bocconi
              University. Founded in 2017, MIMS is Bocconi's first student association dedicated to asset management and
              the only with student-managed virtual funds.
            </p>
            <p className="font-body text-body-lg leading-relaxed">
              We are organised as an investment management firm. Members work in specialised research divisions and in
              portfolio management. Each research team meets weekly to discuss markets, review ideas and develop
              investment theses. The output of this work is written research and publications produced to professional
              standards.
            </p>
            <p className="font-body text-body-lg leading-relaxed">
              Portfolio management sits at the centre of the structure. It uses the research work to build and update
              propriety funds allocations. Decisions are documented and reviewed through strict due diligence and
              evaluated with risk-metrics analysis. The Society publishes outputs in line with market standards.
            </p>
            <p className="font-body text-body-lg leading-relaxed">
              Over time, MIMS has built an international Alumni community. Former members have progressed to leading
              investment banks, hedge funds and asset managers across global financial centres.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 2 - Our Divisions */}
      <section className="py-section-sm md:py-section bg-background">
        <div className="container">
          <h2 className="font-serif text-heading mb-7 pb-3 border-b border-separator">Our Divisions</h2>
          <div className="max-w-3xl">
            {(Object.keys(divisionDescriptions) as Division[]).map((division) => (
              <DivisionCard key={division} division={division} description={divisionDescriptions[division]} />
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3 - Organisational Structure */}
      <section className="bg-background py-section-sm md:py-section">
        <div className="container">
          <h2 className="font-serif text-heading mb-8 pb-3 border-b border-separator">Organisational Structure</h2>

          {/* Org Chart with integrated role descriptions */}
          <div className="mb-12">
            <OrgChart />
          </div>

          {/* CTA */}
          <div className="text-center">
            <Link
              to="/members/team"
              className="inline-block px-10 py-4 bg-background text-foreground border border-foreground font-serif text-lg hover:opacity-90 transition-opacity"
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
