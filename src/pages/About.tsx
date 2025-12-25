import { Link } from 'react-router-dom';
import { PageIntroduction } from '@/components/shared';

const About = () => {
  return (
    <>
      <PageIntroduction
        title="About Us"
        description="Understanding our mission, history, and organisational structure."
      />

      <div className="container py-section-sm md:py-section">
        {/* Mission */}
        <section className="mb-16">
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator">Mission</h2>
          <div className="max-w-3xl">
            <p className="font-body text-body-lg text-muted-foreground">
              Our mission is to provide students with practical experience in investment research 
              and portfolio management. Through rigorous analysis and collaborative work, we aim 
              to develop the analytical and professional skills necessary for careers in finance.
            </p>
          </div>
        </section>

        {/* History */}
        <section className="mb-16">
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator">History</h2>
          <div className="max-w-3xl">
            <p className="font-body text-body-lg text-muted-foreground mb-4">
              Minerva Investment Management Society was established by students of Università 
              Bocconi with the objective of bridging academic learning with practical application 
              in financial markets.
            </p>
            <p className="font-body text-body text-muted-foreground">
              Since our founding, we have produced research reports across equity, fixed income, 
              and alternative investments, whilst developing a growing alumni network in leading 
              financial institutions.
            </p>
          </div>
        </section>

        {/* Values */}
        <section className="mb-16">
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator">Values</h2>
          <div className="max-w-3xl space-y-6">
            <div>
              <h3 className="font-serif text-subheading mb-2">Rigour</h3>
              <p className="font-body text-body text-muted-foreground">
                We apply disciplined analytical frameworks to all research activities.
              </p>
            </div>
            <div>
              <h3 className="font-serif text-subheading mb-2">Integrity</h3>
              <p className="font-body text-body text-muted-foreground">
                We maintain the highest ethical standards in our research and conduct.
              </p>
            </div>
            <div>
              <h3 className="font-serif text-subheading mb-2">Collaboration</h3>
              <p className="font-body text-body text-muted-foreground">
                We work together across divisions to produce comprehensive analysis.
              </p>
            </div>
          </div>
        </section>

        {/* Organisational Structure */}
        <section>
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator">
            Organisational Structure
          </h2>
          <div className="max-w-4xl">
            <div className="space-y-6">
              {/* President */}
              <div className="py-4 border-b border-separator">
                <h3 className="font-serif text-subheading">President</h3>
                <p className="font-body text-small text-muted-foreground mt-1">
                  Overall leadership and strategic direction of the Society.
                </p>
              </div>

              {/* Vice President */}
              <div className="py-4 border-b border-separator pl-6">
                <h3 className="font-serif text-subheading">Vice President</h3>
                <p className="font-body text-small text-muted-foreground mt-1">
                  Supports the President and oversees operational coordination.
                </p>
              </div>

              {/* Head of Asset Management */}
              <div className="py-4 border-b border-separator pl-6">
                <h3 className="font-serif text-subheading">Head of Asset Management</h3>
                <p className="font-body text-small text-muted-foreground mt-1">
                  Oversight of portfolio management activities and fund operations.
                </p>
              </div>

              {/* Division Heads */}
              <div className="py-4 border-b border-separator pl-12">
                <h3 className="font-serif text-subheading">Division Heads</h3>
                <p className="font-body text-small text-muted-foreground mt-1">
                  Leadership of Equity Research, Investment Research, Macro Research, 
                  Portfolio Management, and Quant Research divisions.
                </p>
              </div>

              {/* Portfolio Managers */}
              <div className="py-4 border-b border-separator pl-12">
                <h3 className="font-serif text-subheading">Portfolio Managers</h3>
                <p className="font-body text-small text-muted-foreground mt-1">
                  Management of Long Short Equity Fund and Multi Asset Global Opportunities Fund.
                </p>
              </div>

              {/* Analysts */}
              <div className="py-4 border-b border-separator pl-12">
                <h3 className="font-serif text-subheading">Senior Analysts & Analysts</h3>
                <p className="font-body text-small text-muted-foreground mt-1">
                  Research production and analysis across all divisions.
                </p>
              </div>

              {/* Operations & Media */}
              <div className="py-4 pl-6">
                <h3 className="font-serif text-subheading">Operations & Media</h3>
                <p className="font-body text-small text-muted-foreground mt-1">
                  Administrative support, event coordination, and communications.
                </p>
              </div>
            </div>

            <div className="mt-8">
              <Link 
                to="/members/team" 
                className="inline-block font-body text-body text-primary hover:underline"
              >
                View our current team
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default About;
