import { Link } from "react-router-dom";
import logoWhite from "@/assets/logo-white.png";
import homepageBg from "@/assets/homepage-bg.png";
import { LatestArchiveCarousel } from "@/components/shared/LatestArchiveCarousel";
import { Division, divisionLabels } from "@/lib/types";
import { useKeyFigures } from "@/hooks/useKeyFigures";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import { Skeleton } from "@/components/ui/skeleton";

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

const AnimatedFigure = ({ value, isLoading }: { value: number; isLoading: boolean }) => {
  const animatedValue = useAnimatedCounter(value, 1500, !isLoading && value > 0);

  if (isLoading) {
    return <Skeleton className="h-16 w-24 mx-auto" />;
  }

  return <>{animatedValue}+</>;
};

const Index = () => {
  const { counts, isLoading } = useKeyFigures();

  return (
    <>
      {/* Preload LCP image for faster discovery */}
      <img
        src={homepageBg}
        alt=""
        fetchPriority="high"
        aria-hidden="true"
        className="absolute w-0 h-0 opacity-0 pointer-events-none"
      />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center">
        {/* Background image */}
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${homepageBg})` }} />

        {/* Content */}
        <div className="relative z-10 text-center px-6 py-20">
          <img
            src={logoWhite}
            alt="MIMS"
            width={192}
            height={192}
            className="h-32 md:h-40 lg:h-48 w-auto mx-auto mb-8 drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]"
            fetchPriority="high"
          />
          <h1 className="font-serif text-hero md:text-[4.5rem] text-background tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
            Minerva Investment
            <br />
            Management Society
          </h1>
        </div>
      </section>

      {/* Key Figures */}
      <section className="py-section-sm md:py-section bg-background">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            <div className="text-center py-6 border-b md:border-b-0 md:border-r border-separator last:border-b-0 last:border-r-0">
              <p className="font-serif text-hero text-primary mb-2">
                <AnimatedFigure value={counts.reports} isLoading={isLoading} />
              </p>
              <p className="font-body text-body text-muted-foreground uppercase tracking-wider">Research Reports</p>
            </div>
            <div className="text-center py-6 border-b md:border-b-0 md:border-r border-separator last:border-b-0 last:border-r-0">
              <p className="font-serif text-hero text-primary mb-2">
                <AnimatedFigure value={counts.members} isLoading={isLoading} />
              </p>
              <p className="font-body text-body text-muted-foreground uppercase tracking-wider">Active Members</p>
            </div>
            <div className="text-center py-6">
              <p className="font-serif text-hero text-primary mb-2">
                <AnimatedFigure value={counts.alumni} isLoading={isLoading} />
              </p>
              <p className="font-body text-body text-muted-foreground uppercase tracking-wider">Alumni Network</p>
            </div>
          </div>
        </div>
      </section>

      {/* About Preview */}
      <section className="py-section-sm md:py-section">
        <div className="container">
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator">About Minerva Investment Management Society</h2>
          <div className="font-body text-body-lg text-muted-foreground space-y-4 max-w-4xl">
            <p>
              Minerva Investment Management Society (MIMS) is an association promoted and run by students of Università Bocconi. Founded in 2017, it operates student-managed virtual funds supported by structured research and portfolio management processes. Members work across specialist research divisions and Portfolio Management, producing professional-standard reports and documenting decisions through due diligence and risk analysis.
            </p>
            <p>
              MIMS complements its investment work with a targeted programme of engagement. The Society hosts one event per semester with industry professionals, alongside company visits and internal presentations where teams share their work and debate key market questions. Regular division and association-wide aperitivos strengthen relationships across the membership.
            </p>
            <p>
              MIMS has also developed an international alumni network. Former members work across major financial centres in investment banking, hedge funds and asset management, including Goldman Sachs, J.P. Morgan, Citi, UBS and other leading institutions.
            </p>
          </div>
        </div>
      </section>

      {/* Divisions Section */}
      <section className="py-section-sm md:py-section bg-background">
        <div className="container">
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator">Our Divisions</h2>
          <div className="flex flex-col gap-4 max-w-4xl">
            {divisionData.map(({ division, description }) => (
              <Link
                key={division}
                to={`/divisions/${division}`}
                className="group block bg-secondary p-6 transition-all duration-300 hover:bg-foreground hover:shadow-lg"
              >
                <h3 className="font-serif text-xl md:text-2xl mb-2 group-hover:text-background transition-colors duration-300">
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

      {/* Latest Reports */}
      <section className="py-section-sm md:py-section bg-foreground">
        <div className="container">
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-background/20 text-background">
            Latest Reports
          </h2>
          <LatestArchiveCarousel />
        </div>
      </section>

      {/* Activities & Events Section */}
      <section className="py-section-sm md:py-section bg-background">
        <div className="container">
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator">Activities & Events</h2>
          <p className="font-body text-body-lg text-muted-foreground mb-6 max-w-3xl">
            Beyond research and portfolio management, MIMS organises events connecting members with industry
            professionals, workshops developing practical skills, and our annual investment conference.
          </p>
          <Link
            to="/events?view=past"
            className="inline-block px-10 py-4 bg-background text-foreground border border-foreground font-serif text-lg hover:opacity-90 transition-opacity"
          >
            View Past Events
          </Link>
        </div>
      </section>

      {/* Join MIMS Section */}
      <section className="py-section-sm md:py-section bg-background">
        <div className="container">
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator">Join MIMS</h2>
          <p className="font-body text-body-lg text-muted-foreground mb-6 max-w-3xl">
            Recruitment is open to all Bocconi students. We seek motivated individuals with genuine interest in
            financial markets, regardless of academic background or prior experience.
          </p>
          <Link
            to="/join"
            className="inline-block px-10 py-4 bg-background text-foreground border border-foreground font-serif text-lg hover:opacity-90 transition-opacity"
          >
            Apply Now
          </Link>
        </div>
      </section>
    </>
  );
};

export default Index;
