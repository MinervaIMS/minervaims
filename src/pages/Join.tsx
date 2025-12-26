import { PageIntroduction } from '@/components/shared';

const Join = () => {
  return (
    <>
      <PageIntroduction
        title="Join Us"
        description="Information on how to apply and become a member of MIMS."
      />

      <div className="container py-section-sm md:py-section">
        {/* Application Instructions */}
        <section className="mb-16">
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator">
            Application Process
          </h2>
          <div className="max-w-3xl">
            <p className="font-body text-body-lg text-muted-foreground mb-6">
              We recruit new members at the beginning of each academic year. The application 
              process is designed to assess analytical skills, motivation, and fit with our 
              research-focused culture.
            </p>
          </div>
        </section>

        {/* Steps */}
        <section className="mb-16">
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator">
            Application Steps
          </h2>
          <div className="max-w-3xl space-y-0">
            <div className="py-6 border-b border-separator">
              <p className="font-body text-xs text-muted-foreground uppercase tracking-wider mb-2">
                Step 1
              </p>
              <h3 className="font-serif text-subheading mb-2">Online Application</h3>
              <p className="font-body text-body text-muted-foreground">
                Submit your CV and complete the application form with details of your 
                academic background and interest in financial markets.
              </p>
            </div>

            <div className="py-6 border-b border-separator">
              <p className="font-body text-xs text-muted-foreground uppercase tracking-wider mb-2">
                Step 2
              </p>
              <h3 className="font-serif text-subheading mb-2">Written Assessment</h3>
              <p className="font-body text-body text-muted-foreground">
                Shortlisted candidates complete a written assessment covering financial 
                analysis, market knowledge, and analytical reasoning.
              </p>
            </div>

            <div className="py-6 border-b border-separator">
              <p className="font-body text-xs text-muted-foreground uppercase tracking-wider mb-2">
                Step 3
              </p>
              <h3 className="font-serif text-subheading mb-2">Interview</h3>
              <p className="font-body text-body text-muted-foreground">
                Final candidates are invited for interviews with current members to 
                discuss their application and assess cultural fit.
              </p>
            </div>

            <div className="py-6">
              <p className="font-body text-xs text-muted-foreground uppercase tracking-wider mb-2">
                Step 4
              </p>
              <h3 className="font-serif text-subheading mb-2">Onboarding</h3>
              <p className="font-body text-body text-muted-foreground">
                Successful candidates join MIMS and begin their training programme, 
                which includes research methodology and financial modelling.
              </p>
            </div>
          </div>
        </section>

        {/* Eligibility */}
        <section className="mb-16">
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator">
            Eligibility Requirements
          </h2>
          <div className="max-w-3xl">
            <ul className="space-y-3">
              <li className="font-body text-body text-muted-foreground">
                Currently enrolled at Università Bocconi (undergraduate or postgraduate)
              </li>
              <li className="font-body text-body text-muted-foreground">
                Strong academic performance
              </li>
              <li className="font-body text-body text-muted-foreground">
                Demonstrated interest in financial markets and investment research
              </li>
              <li className="font-body text-body text-muted-foreground">
                Commitment to participate actively in Society activities
              </li>
            </ul>
          </div>
        </section>

        {/* Apply Button */}
        <section>
          <a
            href="#"
            className="inline-block px-10 py-4 bg-background text-foreground border border-foreground font-serif text-lg hover:opacity-90 transition-opacity"
          >
            Apply Now
          </a>
          <p className="font-body text-small text-muted-foreground mt-4">
            Applications for the next intake will open in September.
          </p>
        </section>
      </div>
    </>
  );
};

export default Join;
