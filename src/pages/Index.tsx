import { Link } from 'react-router-dom';
import logoWhite from '@/assets/logo-white.png';
import { keyFigures } from '@/lib/data';

const Index = () => {
  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center">
        {/* Background placeholder */}
        <div className="absolute inset-0 bg-muted" />
        <div className="absolute inset-0 hero-overlay" />
        
        {/* Content */}
        <div className="relative z-10 text-center px-6 py-20">
          <img 
            src={logoWhite} 
            alt="MIMS" 
            className="h-32 md:h-40 lg:h-48 w-auto mx-auto mb-8" 
          />
          <h1 className="font-serif text-display md:text-hero text-background tracking-tight">
            Minerva Investment<br />Management Society
          </h1>
        </div>
      </section>

      {/* Key Figures */}
      <section className="py-section-sm md:py-section bg-background">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            <div className="text-center py-6 border-b md:border-b-0 md:border-r border-separator last:border-b-0 last:border-r-0">
              <p className="font-serif text-hero text-primary mb-2">{keyFigures.totalReports}+</p>
              <p className="font-body text-body text-muted-foreground uppercase tracking-wider">
                Research Reports
              </p>
            </div>
            <div className="text-center py-6 border-b md:border-b-0 md:border-r border-separator last:border-b-0 last:border-r-0">
              <p className="font-serif text-hero text-primary mb-2">{keyFigures.totalMembers}+</p>
              <p className="font-body text-body text-muted-foreground uppercase tracking-wider">
                Active Members
              </p>
            </div>
            <div className="text-center py-6">
              <p className="font-serif text-hero text-primary mb-2">{keyFigures.totalAlumni}+</p>
              <p className="font-body text-body text-muted-foreground uppercase tracking-wider">
                Alumni Network
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About Preview */}
      <section className="py-section-sm md:py-section border-t border-separator">
        <div className="container">
          <div className="max-w-3xl">
            <h2 className="font-serif text-display mb-6">About MIMS</h2>
            <p className="font-body text-body-lg text-muted-foreground mb-6">
              Minerva Investment Management Society is an association promoted and run by students 
              of Università Bocconi. We provide hands-on experience in financial research, portfolio 
              management, and investment analysis through rigorous academic and practical training.
            </p>
            <Link 
              to="/about" 
              className="inline-block font-body text-body text-primary hover:underline"
            >
              Learn more about our mission
            </Link>
          </div>
        </div>
      </section>

      {/* Divisions Preview */}
      <section className="py-section-sm md:py-section border-t border-separator bg-secondary">
        <div className="container">
          <h2 className="font-serif text-display mb-8">Our Divisions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <DivisionPreview 
              title="Equity Research" 
              href="/divisions/equity"
              description="Fundamental analysis of public equities across sectors and geographies."
            />
            <DivisionPreview 
              title="Investment Research" 
              href="/divisions/investment"
              description="Analysis of private market opportunities and M&A transactions."
            />
            <DivisionPreview 
              title="Macro Research" 
              href="/divisions/macro"
              description="Macroeconomic analysis and monetary policy research."
            />
            <DivisionPreview 
              title="Portfolio Management" 
              href="/divisions/portfolio"
              description="Management of simulated investment portfolios."
            />
            <DivisionPreview 
              title="Quant Research" 
              href="/divisions/quant"
              description="Quantitative strategies and systematic investment research."
            />
          </div>
          <div className="mt-8">
            <Link 
              to="/divisions" 
              className="inline-block font-body text-body text-primary hover:underline"
            >
              View all divisions
            </Link>
          </div>
        </div>
      </section>

      {/* Activities Preview */}
      <section className="py-section-sm md:py-section border-t border-separator">
        <div className="container">
          <div className="max-w-3xl">
            <h2 className="font-serif text-display mb-6">Events & Activities</h2>
            <p className="font-body text-body-lg text-muted-foreground mb-6">
              We organise conferences, workshops, and seminars featuring industry professionals 
              and academics. Our events provide members with networking opportunities and 
              exposure to current market themes.
            </p>
            <Link 
              to="/events" 
              className="inline-block font-body text-body text-primary hover:underline"
            >
              View upcoming events
            </Link>
          </div>
        </div>
      </section>
    </>
  );
};

function DivisionPreview({ 
  title, 
  href, 
  description 
}: { 
  title: string; 
  href: string; 
  description: string;
}) {
  return (
    <Link to={href} className="group block bg-background p-6 shadow-subtle hover:shadow-elevated transition-shadow">
      <h3 className="font-serif text-subheading group-hover:text-primary transition-colors mb-2">
        {title}
      </h3>
      <p className="font-body text-small text-muted-foreground">
        {description}
      </p>
    </Link>
  );
}

export default Index;
