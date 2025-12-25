import { Link } from "react-router-dom";
import { PageIntroduction } from "@/components/shared";
import { OrgChart } from "@/components/shared/OrgChart";

const About = () => {
  return (
    <>
      {/* SECTION 0 - Hero with title and photo background */}
      <PageIntroduction
        title="About Us"
        description="Understanding what we do, our mission, and organisational structure."
      />

      {/* SECTION 1 - Black background / White text */}
      <section className="bg-foreground text-background py-section-sm md:py-section">
        <div className="container">
          <h2 className="font-serif text-heading mb-8 pb-3 border-b border-background/20 text-left">What we do</h2>
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

      {/* SECTION 2 - White background / Black text - Mission */}
      <section className="bg-background text-foreground py-section-sm md:py-section">
        <div className="container">
          <h2 className="font-serif text-heading mb-8 pb-3 border-b border-separator">Mission</h2>
          <div className="space-y-4">
            <p className="font-body text-body text-foreground">MIMS aims to and succeed in:</p>
            <ol className="font-body text-body text-foreground list-decimal list-inside space-y-2 pl-4">
              <li>
                develop disciplined investors through rigorous peer learning, structured debate and continuous feedback;
              </li>
              <li>
                build technical capability through recurring internal work, targeted trainings and practical
                application;
              </li>
              <li>
                convert research into decision-making through repeatable processes, explicit assumptions and risk
                awareness;
              </li>
              <li>
                set clear standards of transparency and accountability in portfolio construction and reporting; and
              </li>
              <li>
                connect members with the investment industry through trainings, competitions, public events and an
                active Alumni Network.
              </li>
            </ol>
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
              className="inline-block px-10 py-4 bg-accent text-accent-foreground font-serif text-lg hover:opacity-90 transition-opacity"
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
