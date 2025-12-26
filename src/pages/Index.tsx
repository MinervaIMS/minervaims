import { Link } from "react-router-dom";
import logoWhite from "@/assets/logo-white.png";
import homepageBg from "@/assets/homepage-bg.png";
import { keyFigures } from "@/lib/data";
import { LatestArchiveCarousel } from "@/components/shared/LatestArchiveCarousel";
import { DivisionCard } from "@/components/shared/DivisionCard";
import { Division } from "@/lib/types";

const divisionDescriptions: Record<Division, string> = {
  equity: 'Fundamental analysis of public equities across sectors and geographies, producing initiations of coverage and sector reports.',
  investment: 'Analysis of private market opportunities, M&A transactions, and alternative investments.',
  macro: 'Macroeconomic analysis covering monetary policy, inflation dynamics, and global growth.',
  portfolio: 'Management of simulated investment portfolios with defined risk parameters and investment mandates.',
  quant: 'Quantitative research on factor strategies, systematic investing, and machine learning applications.',
};

const Index = () => {
  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center">
        {/* Background image */}
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${homepageBg})` }} />
        <div className="absolute inset-0 bg-black/30" />

        {/* Content */}
        <div className="relative z-10 text-center px-6 py-20">
          <img
            src={logoWhite}
            alt="MIMS"
            className="h-32 md:h-40 lg:h-48 w-auto mx-auto mb-8 drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]"
          />
          <h1 className="font-serif text-hero md:text-[4.5rem] text-background tracking-tight drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
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
              <p className="font-serif text-hero text-primary mb-2">{keyFigures.totalReports}+</p>
              <p className="font-body text-body text-muted-foreground uppercase tracking-wider">Research Reports</p>
            </div>
            <div className="text-center py-6 border-b md:border-b-0 md:border-r border-separator last:border-b-0 last:border-r-0">
              <p className="font-serif text-hero text-primary mb-2">{keyFigures.totalMembers}+</p>
              <p className="font-body text-body text-muted-foreground uppercase tracking-wider">Active Members</p>
            </div>
            <div className="text-center py-6">
              <p className="font-serif text-hero text-primary mb-2">{keyFigures.totalAlumni}+</p>
              <p className="font-body text-body text-muted-foreground uppercase tracking-wider">Alumni Network</p>
            </div>
          </div>
        </div>
      </section>

      {/* About Preview */}
      <section className="py-section-sm md:py-section">
        <div className="container">
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator">About Minerva IMS</h2>
          <p className="font-body text-body-lg text-muted-foreground">
            Minerva Investment Management Society is an association promoted and run by students of Università Bocconi.
            We provide hands-on experience in financial research, portfolio management, and investment analysis through
            rigorous academic and practical training.
          </p>
        </div>
      </section>

      {/* Divisions Section - moved from Divisions page */}
      <section className="py-section-sm md:py-section bg-background">
        <div className="container">
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator">Our Divisions</h2>
          <div className="max-w-3xl">
            {(Object.keys(divisionDescriptions) as Division[]).map((division) => (
              <DivisionCard
                key={division}
                division={division}
                description={divisionDescriptions[division]}
              />
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

      {/* Activities & Join Section */}
      <section className="py-section-sm md:py-section bg-background">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16">
            {/* Activities & Events */}
            <div>
              <h2 className="font-serif text-heading mb-6">Activities & Events</h2>
              <p className="font-body text-body-lg text-muted-foreground mb-6">
                Beyond research and portfolio management, MIMS organises events connecting members with industry
                professionals, workshops developing practical skills, and our annual investment conference.
              </p>
              <Link
                to="/events"
                className="inline-flex items-center gap-2 font-body underline text-lg text-foreground hover:opacity-80 transition-opacity"
              >
                View upcoming events
                <span aria-hidden="true">→</span>
              </Link>
            </div>

            {/* Join MIMS */}
            <div className="md:border-l md:border-separator md:pl-16">
              <h2 className="font-serif text-heading mb-6">Join MIMS</h2>
              <p className="font-body text-body-lg text-muted-foreground mb-6">
                Recruitment is open to all Bocconi students. We seek motivated individuals with genuine interest in
                financial markets, regardless of academic background or prior experience.
              </p>
              <Link
                to="/join"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-10 py-4 text-lg font-serif hover:opacity-90 transition-opacity"
              >
                APPLY NOW
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Index;
