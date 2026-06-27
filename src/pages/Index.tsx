import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import logoWhite from "@/assets/footer-logo.svg";
import homepageBgAsset from "@/assets/mims-homepage.webp.asset.json";
import { ReportsSection, archiveFilesToReports, ArchiveFileRow } from "@/components/shared/ReportsSection";
import AlumniTicker from "@/components/shared/AlumniTicker";
import { TestimonialsSection } from "@/components/shared/TestimonialsSection";
import { PageLoader } from "@/components/shared";
import { useKeyFigures } from "@/hooks/useKeyFigures";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import { useApplicationSettings } from "@/hooks/useApplicationSettings";
import { useImagePreload } from "@/hooks/useImagePreload";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

interface ArchiveFile extends ArchiveFileRow {
  id: string;
}

const AnimatedFigure = ({ value, isLoading }: { value: number; isLoading: boolean }) => {
  const animatedValue = useAnimatedCounter(value, 3200, !isLoading && value > 0);

  if (isLoading) {
    return <Skeleton className="h-16 w-24 mx-auto" />;
  }

  return <>{animatedValue}+</>;
};

const Index = () => {
  const homepageBg = homepageBgAsset.url;
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
        .select('id, title, description, file_url, date, division, fund')
        .order('date', { ascending: false })
        .limit(12);

      if (error) throw error;
      setCarouselFiles(data || []);
    } catch (error) {
      console.error('Error fetching carousel files:', error);
    } finally {
      setIsCarouselLoading(false);
    }
  };

  // Only block on data loading, not images - let hero render immediately for better LCP
  if (isKeyFiguresLoading || isCarouselLoading) {
    return <PageLoader />;
  }

  return (
    <>
      <Helmet>
        <title>Minerva Investment Management Society | MIMS</title>
      </Helmet>

      {/* Hero Section */}
      <section data-page-hero className="relative min-h-screen flex flex-col pt-20 md:pt-24">
        {/* Background image - extends behind transparent header */}
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${homepageBg})` }} />
        <div className="absolute inset-0 hero-overlay" />

        {/* Content */}
        <div className="relative z-10 flex-1 flex items-center justify-center text-center px-6 py-12">
          <div>
            <img
              src={logoWhite}
              alt="Minerva Investment Management Society"
              className="h-48 md:h-64 lg:h-80 w-auto mx-auto drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]"
              fetchPriority="high"
            />
            {appSettings.applicationsOpen && (
              <Link
                to="/join"
                className="inline-block mt-16 px-14 py-5 bg-background text-foreground font-serif text-xl hover:opacity-90 transition-opacity"
              >
                APPLY NOW
              </Link>
            )}
          </div>
        </div>

        {/* Key Figures - inside hero so it appears within initial viewport */}
        <div className="relative z-10 bg-background">
          <div className="container py-section-sm md:py-section">

            <div className="grid grid-cols-3 gap-2 md:gap-12">
              <Link
                to="/archive"
                className="text-center py-4 md:py-6 border-r border-separator last:border-r-0 hover:opacity-80 transition-opacity"
              >
                <p className="font-serif text-3xl sm:text-5xl md:text-hero text-primary mb-1 md:mb-2">
                  <AnimatedFigure value={counts.reports} isLoading={false} />
                </p>
                <p className="font-body text-[0.65rem] sm:text-xs md:text-body text-muted-foreground uppercase tracking-wider">Research Reports</p>
              </Link>
              <Link
                to="/people/members"
                className="text-center py-4 md:py-6 border-r border-separator last:border-r-0 hover:opacity-80 transition-opacity"
              >
                <p className="font-serif text-3xl sm:text-5xl md:text-hero text-primary mb-1 md:mb-2">
                  <AnimatedFigure value={counts.members} isLoading={false} />
                </p>
                <p className="font-body text-[0.65rem] sm:text-xs md:text-body text-muted-foreground uppercase tracking-wider">Active Members</p>
              </Link>
              <Link to="/people/alumni" className="text-center py-4 md:py-6 hover:opacity-80 transition-opacity">
                <p className="font-serif text-3xl sm:text-5xl md:text-hero text-primary mb-1 md:mb-2">
                  <AnimatedFigure value={counts.alumni} isLoading={false} />
                </p>
                <p className="font-body text-[0.65rem] sm:text-xs md:text-body text-muted-foreground uppercase tracking-wider">Alumni Network</p>
              </Link>
            </div>
          </div>
        </div>
      </section>



      {/* About Preview */}
      <section className="py-section-sm md:py-section bg-background">
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
                MIMS has also developed an international alumni network. Former members now work across major financial centres in leading financial institutions, including investment banks, hedge funds and asset managers, as well as consultancies and top academic programmes worldwide. The organisations shown below highlight where members have gone on to pursue MSc and PhD studies and where they have built their careers, underscoring the reach and strength of a truly global, high-performing community shaped at Bocconi.
              </p>
            </div>
            <Link
              to="/people/alumni"
              className="cta-link whitespace-nowrap shrink-0"
            >
              Discover Alumni Network
            </Link>
          </div>
        </div>
      </section>

      {/* Alumni Ticker */}
      <AlumniTicker />




      {/* Alumni Testimonials */}
      <TestimonialsSection />

      {/* Latest Reports */}
      <ReportsSection
        variant="cards"
        heading="Latest Reports"
        archiveHref="/archive"
        archiveLabel="Browse The Reports"
        reports={archiveFilesToReports(carouselFiles, { preferDivision: true })}
        useRealCover
      />
    </>
  );
};

export default Index;
