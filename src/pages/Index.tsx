import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import logoWhite from "@/assets/logo-white.svg";
import homepageBg from "@/assets/homepage-bg.webp";
import companiesImage from "@/assets/companies.webp";
import { LatestArchiveCarousel } from "@/components/shared/LatestArchiveCarousel";
import { PageLoader } from "@/components/shared";
import { Division, divisionLabels } from "@/lib/types";
import { useKeyFigures } from "@/hooks/useKeyFigures";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import { useApplicationSettings } from "@/hooks/useApplicationSettings";
import { useImagePreload } from "@/hooks/useImagePreload";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

const divisions: Division[] = ["equity", "investment", "macro", "portfolio", "quant"];

interface ArchiveFile {
  id: string;
  title: string;
  file_url: string;
  date: string;
  division: string;
}

const AnimatedFigure = ({ value, isLoading }: { value: number; isLoading: boolean }) => {
  const animatedValue = useAnimatedCounter(value, 4000, !isLoading && value > 0);

  if (isLoading) {
    return <Skeleton className="h-16 w-24 mx-auto" />;
  }

  return <>{animatedValue}+</>;
};

const Index = () => {
  const { counts, isLoading: isKeyFiguresLoading } = useKeyFigures();
  const { settings: appSettings } = useApplicationSettings();
  const [carouselFiles, setCarouselFiles] = useState<ArchiveFile[]>([]);
  const [isCarouselLoading, setIsCarouselLoading] = useState(true);
  const imagesLoaded = useImagePreload([homepageBg, logoWhite]);

  useEffect(() => {
    fetchCarouselFiles();
  }, []);

  const fetchCarouselFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('archive_files')
        .select('id, title, file_url, date, division')
        .order('date', { ascending: false })
        .limit(15);

      if (error) throw error;
      setCarouselFiles(data || []);
    } catch (error) {
      console.error('Error fetching carousel files:', error);
    } finally {
      setIsCarouselLoading(false);
    }
  };

  if (isKeyFiguresLoading || isCarouselLoading || !imagesLoaded) {
    return <PageLoader />;
  }

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
      <section className="relative min-h-screen flex items-center justify-center pt-20 md:pt-24">
        {/* Background image - extends behind transparent header */}
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
          {appSettings.applicationsOpen && (
            <Link
              to="/join"
              className="inline-block mt-16 px-14 py-5 bg-background text-foreground font-serif text-xl hover:opacity-90 transition-opacity"
            >
              How To Apply
            </Link>
          )}
        </div>
      </section>

      {/* Key Figures */}
      <section className="py-12 md:py-16 bg-background">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            <Link
              to="/archive"
              className="text-center py-6 border-b md:border-b-0 md:border-r border-separator last:border-b-0 last:border-r-0 hover:opacity-80 transition-opacity"
            >
              <p className="font-serif text-hero text-primary mb-2">
                <AnimatedFigure value={counts.reports} isLoading={false} />
              </p>
              <p className="font-body text-body text-muted-foreground uppercase tracking-wider">Research Reports</p>
            </Link>
            <Link
              to="/members/team"
              className="text-center py-6 border-b md:border-b-0 md:border-r border-separator last:border-b-0 last:border-r-0 hover:opacity-80 transition-opacity"
            >
              <p className="font-serif text-hero text-primary mb-2">
                <AnimatedFigure value={counts.members} isLoading={false} />
              </p>
              <p className="font-body text-body text-muted-foreground uppercase tracking-wider">Active Members</p>
            </Link>
            <Link to="/members/alumni" className="text-center py-6 hover:opacity-80 transition-opacity">
              <p className="font-serif text-hero text-primary mb-2">
                <AnimatedFigure value={counts.alumni} isLoading={false} />
              </p>
              <p className="font-body text-body text-muted-foreground uppercase tracking-wider">Alumni Network</p>
            </Link>
          </div>
        </div>
      </section>

      {/* About Preview */}
      <section className="py-12 md:py-16 bg-background">
        <div className="container">
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">About Minerva IMS</h2>
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="max-w-3xl">
              <p className="font-body text-body-lg text-muted-foreground mb-6">
                Minerva Investment Management Society (MIMS) is an association promoted and run by students of Bocconi
                University. Founded in 2017, it operates student-managed virtual funds supported by structured research
                and portfolio management processes. Members work across specialist research divisions and Portfolio
                Management, producing professional-standard reports and documenting decisions through due diligence and
                risk analysis.
              </p>
              <p className="font-body text-body-lg text-muted-foreground mb-6">
                MIMS complements its investment work with a targeted programme of engagement. The Society hosts one
                event per semester with industry professionals, alongside company visits and internal presentations
                where teams share their work and debate key market questions. Regular division and association-wide
                aperitivos strengthen relationships across the membership.
              </p>
              <p className="font-body text-body-lg text-muted-foreground">
                MIMS has also developed an international alumni network. Former members work across major financial
                centres in investment banking, hedge funds and asset management, including Goldman Sachs, J.P. Morgan,
                Citi, UBS and other leading institutions.
              </p>
            </div>
            <Link
              to="/members/alumni"
              className="inline-block px-10 py-4 bg-background text-accent border border-accent font-serif text-lg shadow-none hover:bg-accent hover:text-background hover:shadow-[0_4px_10px_rgba(0,0,0,0.15)] transition-all duration-200 whitespace-nowrap shrink-0"
            >
              Discover Alumni Network
            </Link>
          </div>
        </div>
      </section>

      {/* Companies Image */}
      <section className="py-6 sm:py-8 md:py-12 bg-background">
        <div className="container">
          <div className="overflow-x-auto sm:overflow-visible">
            <img 
              src={companiesImage} 
              alt="Companies where MIMS alumni work" 
              className="w-full min-w-[500px] sm:min-w-0 max-w-5xl mx-auto px-4 sm:px-0"
            />
          </div>
        </div>
      </section>

      {/* Divisions Section */}
      <section className="py-12 md:py-16 bg-background">
        <div className="container">
          <h2 className="font-serif text-heading mb-8 pb-3 border-b border-separator text-accent">Our Divisions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {divisions.map((division) => (
              <Link
                key={division}
                to={`/divisions/${division}`}
                className="group block bg-secondary p-6 text-center transition-all duration-300 hover:bg-accent hover:shadow-lg hover:-translate-y-1"
              >
                <span className="font-serif text-lg md:text-xl text-accent transition-colors duration-300 group-hover:text-white">{divisionLabels[division]}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Activities & Events Section */}
      <section className="pt-12 md:pt-16 pb-6 md:pb-8 bg-background">
        <div className="container">
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">
            Activities & Events
          </h2>
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <p className="font-body text-body-lg text-muted-foreground max-w-3xl">
              Each semester we host one flagship event with industry professionals, organise company visits, and hold
              internal sessions where teams present their work and debate markets. Regular aperitivos and frequent
              alumni calls strengthen relationships and provide guidance on academic and career paths.
            </p>
            <Link
              to="/events?view=past"
              className="inline-block px-10 py-4 bg-background text-accent border border-accent font-serif text-lg shadow-none hover:bg-accent hover:text-background hover:shadow-[0_4px_10px_rgba(0,0,0,0.15)] transition-all duration-200 whitespace-nowrap shrink-0"
            >
              View Past Events
            </Link>
          </div>
        </div>
      </section>

      {/* Join MIMS Section */}
      <section className="pt-6 md:pt-8 pb-20 md:pb-28 bg-background">
        <div className="container">
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">Join MIMS</h2>
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <p className="font-body text-body-lg text-muted-foreground max-w-3xl">
              We select candidates with strong academic integrity, a clear interest in financial markets, and the
              discipline to contribute to a research-driven community. Prior experience is not required; we value
              potential, rigour, and a consistent commitment to learning.
            </p>
            <Link
              to="/join"
              className="inline-block px-10 py-4 bg-background text-accent border border-accent font-serif text-lg shadow-none hover:bg-accent hover:text-background hover:shadow-[0_4px_10px_rgba(0,0,0,0.15)] transition-all duration-200 whitespace-nowrap shrink-0"
            >
              How To Apply
            </Link>
          </div>
        </div>
      </section>


      {/* Latest Reports */}
      <section className="py-12 md:py-16 bg-accent">
        <div className="container">
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-background/20 text-background">
            Latest Reports
          </h2>
          <LatestArchiveCarousel files={carouselFiles} />
        </div>
      </section>
    </>
  );
};

export default Index;
