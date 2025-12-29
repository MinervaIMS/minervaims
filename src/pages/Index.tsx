import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import logoWhite from "@/assets/logo-white.png";
import homepageBg from "@/assets/homepage-bg.png";
import { LatestArchiveCarousel } from "@/components/shared/LatestArchiveCarousel";
import { Division, divisionLabels } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";

const divisions: Division[] = ["equity", "investment", "macro", "portfolio", "quant"];

const roundDownToTen = (n: number) => Math.floor(n / 10) * 10;

const Index = () => {
  const [counts, setCounts] = useState({ reports: 0, members: 0, alumni: 0 });

  useEffect(() => {
    const fetchCounts = async () => {
      const [reportsRes, membersRes, alumniRes] = await Promise.all([
        supabase.from('archive_files').select('id', { count: 'exact', head: true }),
        supabase.from('team_members').select('id', { count: 'exact', head: true }),
        supabase.from('alumni').select('id', { count: 'exact', head: true }),
      ]);
      setCounts({
        reports: roundDownToTen(reportsRes.count || 0),
        members: roundDownToTen(membersRes.count || 0),
        alumni: roundDownToTen(alumniRes.count || 0),
      });
    };
    fetchCounts();
  }, []);

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
              <p className="font-serif text-hero text-primary mb-2">{counts.reports}+</p>
              <p className="font-body text-body text-muted-foreground uppercase tracking-wider">Research Reports</p>
            </div>
            <div className="text-center py-6 border-b md:border-b-0 md:border-r border-separator last:border-b-0 last:border-r-0">
              <p className="font-serif text-hero text-primary mb-2">{counts.members}+</p>
              <p className="font-body text-body text-muted-foreground uppercase tracking-wider">Active Members</p>
            </div>
            <div className="text-center py-6">
              <p className="font-serif text-hero text-primary mb-2">{counts.alumni}+</p>
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

      {/* Divisions Section */}
      <section className="py-section-sm md:py-section bg-background">
        <div className="container">
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator">Our Divisions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {divisions.map((division) => (
              <Link
                key={division}
                to={`/divisions/${division}`}
                className="block bg-secondary p-6 text-center transition-all duration-300 hover:bg-foreground hover:text-background hover:shadow-lg hover:-translate-y-1"
              >
                <span className="font-serif text-lg md:text-xl">{divisionLabels[division]}</span>
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
            APPLY NOW
          </Link>
        </div>
      </section>
    </>
  );
};

export default Index;
