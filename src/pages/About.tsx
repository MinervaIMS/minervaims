import { Link } from 'react-router-dom';
import { PageIntroduction } from '@/components/shared';

const About = () => {
  return (
    <>
      {/* Page Introduction */}
      <PageIntroduction
        title="About Us"
        description="Minerva Investment Management Society (MIMS) is an association promoted and run by students of Università Bocconi. We operate as a student-led investment management platform spanning research and portfolio management, built to mirror professional buy-side workflows while remaining strictly educational."
      />

      <div className="container py-section-sm md:py-section">
        {/* WHO WE ARE & MISSION */}
        <section className="mb-16 md:mb-20">
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator">
            Who We Are & Mission
          </h2>
          <div className="max-w-3xl space-y-6">
            <p className="font-body text-body-lg text-muted-foreground leading-relaxed">
              MIMS brings together motivated students with a shared interest in investment management. 
              Across five research streams and a central portfolio management function, members develop 
              ideas, debate theses, and publish outputs aligned with market standards, while building 
              technical and professional judgement through structured internal work.
            </p>
            <p className="font-body text-body text-foreground font-medium leading-relaxed">
              Our mission is to connect high-potential students and prepare them for investment careers 
              through rigorous peer learning and execution discipline.
            </p>
            <ul className="space-y-3 font-body text-body text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1.5 text-xs">●</span>
                <span>Build a merit-driven environment where members learn from each other through structured debate and feedback.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1.5 text-xs">●</span>
                <span>Translate research into portfolio decisions using repeatable processes, clear assumptions, and risk awareness.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1.5 text-xs">●</span>
                <span>Bridge the academic environment with the investment industry through trainings, events, and the Alumni Network.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* WHAT WE DO */}
        <section className="mb-16 md:mb-20">
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator">
            What We Do
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
            {/* Card 1 - Research */}
            <div className="py-6 md:py-8 md:pr-8">
              <h3 className="font-serif text-subheading mb-3">Research</h3>
              <p className="font-body text-body text-muted-foreground leading-relaxed">
                We produce research reports originating from weekly internal discussions and thesis review.
              </p>
            </div>
            
            {/* Hairline separator */}
            <div className="hidden md:block absolute left-1/3 top-0 bottom-0 w-px bg-separator" />
            
            {/* Card 2 - Training */}
            <div className="py-6 md:py-8 md:px-8 border-t md:border-t-0 md:border-l border-separator">
              <h3 className="font-serif text-subheading mb-3">Training</h3>
              <p className="font-body text-body text-muted-foreground leading-relaxed">
                We deliver trainings and workshops led by industry professionals and our Alumni Network.
              </p>
            </div>
            
            {/* Card 3 - Events */}
            <div className="py-6 md:py-8 md:pl-8 border-t md:border-t-0 md:border-l border-separator">
              <h3 className="font-serif text-subheading mb-3">Events</h3>
              <p className="font-body text-body text-muted-foreground leading-relaxed">
                We organise investment competitions and public events with professionals from leading financial institutions.
              </p>
            </div>
          </div>
        </section>

        {/* HISTORY */}
        <section className="mb-16 md:mb-20">
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator">
            History
          </h2>
          <div className="max-w-3xl">
            <p className="font-body text-body-lg text-muted-foreground leading-relaxed">
              Founded in 2017, MIMS was established as Bocconi's first student association dedicated to 
              asset management. Over time, the Society has developed an international Alumni community, 
              with former members progressing to leading investment banks, hedge funds, and asset managers 
              across global financial centres.
            </p>
          </div>
        </section>

        {/* ORGANISATIONAL STRUCTURE */}
        <section className="mb-16 md:mb-20">
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator">
            Organisational Structure
          </h2>
          
          {/* Role Definition Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-muted/30 p-6 shadow-subtle">
              <h3 className="font-serif text-subheading mb-2">President</h3>
              <p className="font-body text-small text-muted-foreground">
                Overall leadership and strategic direction of the Society.
              </p>
            </div>
            <div className="bg-muted/30 p-6 shadow-subtle">
              <h3 className="font-serif text-subheading mb-2">Vice President</h3>
              <p className="font-body text-small text-muted-foreground">
                Supports the President and coordinates the Operations Team.
              </p>
            </div>
            <div className="bg-muted/30 p-6 shadow-subtle">
              <h3 className="font-serif text-subheading mb-2">Head of Asset Management</h3>
              <p className="font-body text-small text-muted-foreground">
                Oversight and coordination of funds management and research activities.
              </p>
            </div>
          </div>

          {/* Organisation Hierarchy Diagram */}
          <div className="overflow-x-auto">
            <div className="min-w-[800px] py-8">
              {/* Level 1: President */}
              <div className="flex justify-center mb-6">
                <div className="bg-primary text-primary-foreground px-6 py-3 font-serif text-small font-medium">
                  President
                </div>
              </div>
              
              {/* Connector lines from President */}
              <div className="flex justify-center mb-6">
                <div className="w-px h-6 bg-separator" />
              </div>
              
              {/* Level 2: VP and Head of AM */}
              <div className="flex justify-center gap-24 mb-6 relative">
                {/* Horizontal connector */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px bg-separator" />
                
                <div className="flex flex-col items-center">
                  <div className="w-px h-6 bg-separator mb-0" />
                  <div className="bg-foreground text-background px-5 py-2.5 font-serif text-small">
                    Vice President
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-px h-6 bg-separator mb-0" />
                  <div className="bg-foreground text-background px-5 py-2.5 font-serif text-small">
                    Head of Asset Management
                  </div>
                </div>
              </div>

              {/* Operations Team - dotted line from VP */}
              <div className="flex justify-start ml-[calc(50%-200px)] mb-8">
                <div className="flex flex-col items-center">
                  <div className="w-px h-6 border-l border-dashed border-muted-foreground" />
                  <div className="border border-dashed border-muted-foreground px-4 py-2 font-serif text-xs text-muted-foreground">
                    Operations & Media Team
                  </div>
                </div>
              </div>
              
              {/* Connector line to Division Heads */}
              <div className="flex justify-center mb-6">
                <div className="w-px h-8 bg-separator" />
              </div>
              
              {/* Level 3: Division Heads */}
              <div className="flex justify-center gap-4 mb-6 relative">
                {/* Horizontal connector */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-px bg-separator" />
                
                {['Portfolio Management', 'Macro Research', 'Investment Research', 'Equity Research', 'Quant Research'].map((division, idx) => (
                  <div key={division} className="flex flex-col items-center">
                    <div className="w-px h-6 bg-separator" />
                    <div className="bg-muted px-3 py-2 font-serif text-xs text-center whitespace-nowrap">
                      Head of Division:<br/>{division}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Portfolio Managers under Portfolio Management */}
              <div className="flex justify-center gap-4 mb-6">
                <div className="flex flex-col items-center mr-[calc(4*120px+4*16px)]">
                  <div className="w-px h-6 bg-separator" />
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="bg-muted/60 px-3 py-1.5 font-serif text-xs text-center">
                        PM: Multi Asset
                      </div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="bg-muted/60 px-3 py-1.5 font-serif text-xs text-center">
                        PM: Long/Short
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Connector to Senior Analysts */}
              <div className="flex justify-center mb-6">
                <div className="w-px h-6 bg-separator" />
              </div>
              
              {/* Level 4: Senior Analysts */}
              <div className="flex justify-center mb-6">
                <div className="border border-separator px-6 py-2 font-serif text-small">
                  Senior Analysts
                </div>
              </div>
              
              {/* Connector to Analysts */}
              <div className="flex justify-center mb-6">
                <div className="w-px h-6 bg-separator" />
              </div>
              
              {/* Level 5: Analysts */}
              <div className="flex justify-center">
                <div className="border border-separator px-6 py-2 font-serif text-small">
                  Analysts
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="pt-8 border-t border-separator">
          <Link 
            to="/members/team" 
            className="inline-block font-serif text-body text-primary hover:underline uppercase tracking-wide"
          >
            Meet the Team →
          </Link>
        </section>
      </div>
    </>
  );
};

export default About;
