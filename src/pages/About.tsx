import { Link } from 'react-router-dom';
import { OrgChart } from '@/components/shared/OrgChart';

const About = () => {
  return (
    <>
      {/* Section 1 - Black Background Hero */}
      <section className="bg-foreground text-background relative">
        <div className="container py-20 md:py-28 lg:py-32">
          <h1 className="font-serif text-display md:text-hero uppercase tracking-wide mb-12 md:mb-16">
            About Us
          </h1>
          
          <div className="max-w-4xl">
            <p className="font-body text-body-lg md:text-[1.25rem] leading-[1.8] md:leading-[1.9] text-background/90">
              Minerva Investment Management Society (MIMS) is an association promoted and run by students of Università Bocconi. Founded in 2017 as Bocconi's first student association dedicated to asset management, MIMS has been built around a single standard: institutional-grade work delivered in a strictly educational setting.
            </p>
            
            <p className="font-body text-body-lg md:text-[1.25rem] leading-[1.8] md:leading-[1.9] text-background/90 mt-6 md:mt-8">
              Our operating model mirrors buy-side practice. Five specialised teams generate and refine views across equity, macro, investment research and quantitative risk, while portfolio management sits at the centre to translate validated research into allocations. Investment theses are debated, stress-tested and converted into implementable exposures with explicit risk/return reasoning; the resulting allocations are reviewed on a semester cycle, with risk analytics independently validated before publication.
            </p>
            
            <p className="font-body text-body-lg md:text-[1.25rem] leading-[1.8] md:leading-[1.9] text-background/90 mt-6 md:mt-8">
              MIMS directly manages proprietary student-run virtual funds with full composition disclosure and portfolio risk-metrics analysis, updated once per semester. This transparency is integral to our process: it forces precision, accountability and repeatability, and it allows members to learn by measuring decisions against outcomes. Over time, the Society has developed an international Alumni community, with former members progressing to leading investment banks, hedge funds and asset managers across global financial centres.
            </p>
          </div>
        </div>
      </section>

      {/* Section 2 - White Background Mission */}
      <section className="bg-background text-foreground">
        <div className="container py-20 md:py-28">
          <h2 className="font-serif text-heading md:text-display uppercase tracking-wide mb-10 md:mb-12">
            Mission
          </h2>
          
          <div className="max-w-3xl">
            <div className="border-l-2 border-foreground pl-8 md:pl-10">
              <p className="font-serif text-subheading uppercase tracking-widest text-muted-foreground mb-6">
                Purpose
              </p>
              
              <p className="font-body text-body-lg mb-6">
                MIMS exists to:
              </p>
              
              <ol className="space-y-4 font-body text-body-lg">
                <li className="flex">
                  <span className="font-serif text-body-lg mr-4 text-muted-foreground">1.</span>
                  <span>develop disciplined investors through rigorous peer learning, structured debate and continuous feedback;</span>
                </li>
                <li className="flex">
                  <span className="font-serif text-body-lg mr-4 text-muted-foreground">2.</span>
                  <span>convert research into decision-making through repeatable processes, explicit assumptions and risk awareness; and</span>
                </li>
                <li className="flex">
                  <span className="font-serif text-body-lg mr-4 text-muted-foreground">3.</span>
                  <span>connect members with the investment industry through trainings, competitions, public events and an active Alumni Network.</span>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3 - Organisational Structure */}
      <section className="bg-secondary text-foreground">
        <div className="container py-20 md:py-28">
          <h2 className="font-serif text-heading md:text-display uppercase tracking-wide mb-12 md:mb-16">
            Organisational Structure
          </h2>
          
          {/* Role Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 md:mb-20">
            <div className="bg-background p-6 md:p-8 shadow-elevated">
              <h3 className="font-serif text-subheading mb-3">President</h3>
              <p className="font-body text-body text-muted-foreground">
                Overall leadership and strategic direction of the Society.
              </p>
            </div>
            
            <div className="bg-background p-6 md:p-8 shadow-elevated">
              <h3 className="font-serif text-subheading mb-3">Vice President</h3>
              <p className="font-body text-body text-muted-foreground">
                Supports the President and coordinates the Operations Team.
              </p>
            </div>
            
            <div className="bg-background p-6 md:p-8 shadow-elevated">
              <h3 className="font-serif text-subheading mb-3">Head of Asset Management</h3>
              <p className="font-body text-body text-muted-foreground">
                Oversight and coordination of funds management and research activities.
              </p>
            </div>
          </div>
          
          {/* Org Chart */}
          <OrgChart />
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-background">
        <div className="container py-16 md:py-20 text-center">
          <Link 
            to="/members/team" 
            className="inline-block font-serif text-body-lg uppercase tracking-widest border-b-2 border-foreground pb-1 hover:opacity-70 transition-opacity"
          >
            Meet the Team
          </Link>
        </div>
      </section>
    </>
  );
};

export default About;
