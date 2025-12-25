import { Link } from 'react-router-dom';
import { PageIntroduction } from '@/components/shared';
import { OrganizationalChart } from '@/components/about/OrganizationalChart';

const About = () => {
  return (
    <>
      {/* Section 0 - Keep existing hero */}
      <PageIntroduction
        title="About Us"
        description="Understanding our mission, history, and organisational structure."
      />

      {/* Section 1 - Black background, white text */}
      <section className="bg-foreground text-background py-section-sm md:py-section">
        <div className="container">
          <div className="max-w-4xl">
            <h1 className="font-serif text-display md:text-hero mb-10 tracking-tight">
              ABOUT US
            </h1>
            <div className="space-y-6 font-body text-body-lg leading-relaxed text-background/90">
              <p>
                Minerva Investment Management Society (MIMS) is a student-run society at Università Bocconi. Founded in 2017, it's Bocconi's first student association focused on asset management. MIMS operates under a single standard: delivering institutional-grade work in a strictly educational setting.
              </p>
              <p>
                Our model mirrors buy-side practice. Five specialised divisions generate and refine views on equity, macro, investment research and quantitative risk; portfolio management then translates this validated research into allocations. Investment theses are debated, stress-tested and converted into implementable exposures with clear risk/return reasoning. These allocations are reviewed every semester, with risk analytics independently validated before publication.
              </p>
              <p>
                MIMS directly manages proprietary student-run virtual funds. These funds are fully composed and portfolio risk metrics are analysed and updated once a semester. This transparency is crucial to our process. It demands precision, accountability and repeatability, allowing members to learn by comparing decisions to outcomes. Over time, MIMS has grown an international alumni community. Many former members have gone on to lead investment banks hedge funds and asset managers in global financial centres.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2 - White background, black text - Mission */}
      <section className="bg-background text-foreground py-section-sm md:py-section">
        <div className="container">
          <h2 className="font-serif text-heading md:text-display mb-10 pb-4 border-b border-separator">
            MISSION
          </h2>
          <div className="max-w-3xl">
            {/* Statute-style text */}
            <div className="font-body">
              <p className="text-small uppercase tracking-widest text-muted-foreground mb-6">
                Purpose
              </p>
              <p className="text-body-lg mb-6">
                MIMS exists to:
              </p>
              <ol className="list-none space-y-4 text-body-lg pl-0">
                <li className="flex">
                  <span className="font-serif text-body-lg mr-3 text-muted-foreground">1.</span>
                  <span>develop disciplined investors through rigorous peer learning, structured debate and continuous feedback;</span>
                </li>
                <li className="flex">
                  <span className="font-serif text-body-lg mr-3 text-muted-foreground">2.</span>
                  <span>convert research into decision-making through repeatable processes, explicit assumptions and risk awareness; and</span>
                </li>
                <li className="flex">
                  <span className="font-serif text-body-lg mr-3 text-muted-foreground">3.</span>
                  <span>connect members with the investment industry through trainings, competitions, public events and an active Alumni Network.</span>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3 - Organisational Structure */}
      <section className="bg-secondary text-foreground py-section-sm md:py-section">
        <div className="container">
          <h2 className="font-serif text-heading md:text-display mb-10 pb-4 border-b border-separator">
            ORGANISATIONAL STRUCTURE
          </h2>
          
          {/* Role Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            <div className="bg-background p-6 shadow-elevated">
              <h3 className="font-serif text-subheading mb-2">President</h3>
              <p className="font-body text-body text-muted-foreground">
                Overall leadership and strategic direction of the Society.
              </p>
            </div>
            <div className="bg-background p-6 shadow-elevated">
              <h3 className="font-serif text-subheading mb-2">Vice President</h3>
              <p className="font-body text-body text-muted-foreground">
                Supports the President and coordinates the Operations Team.
              </p>
            </div>
            <div className="bg-background p-6 shadow-elevated">
              <h3 className="font-serif text-subheading mb-2">Head of Asset Management</h3>
              <p className="font-body text-body text-muted-foreground">
                Oversight and coordination of funds management and research activities.
              </p>
            </div>
          </div>

          {/* Organizational Chart */}
          <OrganizationalChart />
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-background py-section-sm md:py-section border-t border-separator">
        <div className="container text-center">
          <Link 
            to="/members/team" 
            className="inline-block font-serif text-body-lg uppercase tracking-widest border-b-2 border-foreground pb-1 hover:opacity-70 transition-opacity"
          >
            MEET THE TEAM
          </Link>
        </div>
      </section>
    </>
  );
};

export default About;
