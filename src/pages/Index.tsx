import { Link } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import logoWhite from '@/assets/logo-white.png';
import homepageBg from '@/assets/homepage-bg.png';
import { keyFigures } from '@/lib/data';
import { supabase } from '@/integrations/supabase/client';
import { divisionLabels } from '@/lib/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ArchiveFile {
  id: string;
  title: string;
  file_url: string;
  date: string;
  division: string;
}

const Index = () => {
  const [latestReports, setLatestReports] = useState<ArchiveFile[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchLatestReports = async () => {
      const { data, error } = await supabase
        .from('archive_files')
        .select('id, title, file_url, date, division')
        .order('date', { ascending: false })
        .limit(6);

      if (!error && data) {
        setLatestReports(data);
      }
    };
    fetchLatestReports();
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = scrollContainerRef.current.clientWidth;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center">
        {/* Background image */}
        <div 
          className="absolute inset-0 bg-cover bg-center" 
          style={{ backgroundImage: `url(${homepageBg})` }} 
        />
        <div className="absolute inset-0 hero-overlay" />
        
        {/* Content */}
        <div className="relative z-10 text-center px-6 py-20">
          <img 
            src={logoWhite} 
            alt="MIMS" 
            className="h-32 md:h-40 lg:h-48 w-auto mx-auto mb-8"
            style={{ filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5))' }}
          />
          <h1 
            className="font-serif text-display md:text-hero text-background tracking-tight"
            style={{ textShadow: '0 4px 12px rgba(0, 0, 0, 0.5)' }}
          >
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
              className="inline-block font-serif italic underline text-xl text-primary hover:opacity-80 transition-opacity"
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
              title="Quantitative Research" 
              href="/divisions/quant"
              description="Quantitative strategies and systematic investment research."
            />
          </div>
          <div className="mt-8">
            <Link 
              to="/divisions" 
              className="inline-block font-serif italic underline text-xl text-primary hover:opacity-80 transition-opacity"
            >
              View all divisions
            </Link>
          </div>
        </div>
      </section>

      {/* Latest Reports */}
      {latestReports.length > 0 && (
        <section className="py-section-sm md:py-section border-t border-separator">
          <div className="container">
            <h2 className="font-serif text-display mb-8">Latest Reports</h2>
            
            <div className="relative">
              {/* Scroll buttons */}
              <button
                onClick={() => scroll('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 bg-background border border-separator p-2 shadow-subtle hover:shadow-elevated transition-shadow hidden md:block"
                aria-label="Scroll left"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => scroll('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 bg-background border border-separator p-2 shadow-subtle hover:shadow-elevated transition-shadow hidden md:block"
                aria-label="Scroll right"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              {/* Scrollable container */}
              <div
                ref={scrollContainerRef}
                className="flex gap-6 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {latestReports.map((report) => (
                  <ReportCard key={report.id} report={report} />
                ))}
              </div>
            </div>

            <div className="mt-8">
              <Link 
                to="/archive" 
                className="inline-block font-serif italic underline text-xl text-primary hover:opacity-80 transition-opacity"
              >
                Browse all reports
              </Link>
            </div>
          </div>
        </section>
      )}

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
              className="inline-block font-serif italic underline text-xl text-primary hover:opacity-80 transition-opacity"
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

function ReportCard({ report }: { report: ArchiveFile }) {
  const divisionLabel = divisionLabels[report.division as keyof typeof divisionLabels] || report.division;
  const formattedDate = new Date(report.date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <a
      href={report.file_url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex-shrink-0 w-[calc(100%-1rem)] sm:w-[calc(50%-0.75rem)] md:w-[calc(33.333%-1rem)] snap-start group"
    >
      <div className="bg-secondary p-4 shadow-subtle hover:shadow-elevated transition-shadow">
        {/* PDF Preview */}
        <div className="aspect-[4/3] bg-muted mb-4 overflow-hidden">
          <iframe
            src={`${report.file_url}#page=1&view=FitH`}
            className="w-full h-full pointer-events-none"
            title={report.title}
            style={{ transform: 'scale(1)', transformOrigin: 'top left' }}
          />
        </div>
        
        {/* Content */}
        <p className="font-body text-xs text-muted-foreground uppercase tracking-wider mb-1">
          {divisionLabel}
        </p>
        <h3 className="font-serif text-body-lg group-hover:text-primary transition-colors line-clamp-2 mb-2">
          {report.title}
        </h3>
        <p className="font-body text-small text-muted-foreground">
          {formattedDate}
        </p>
      </div>
    </a>
  );
}

export default Index;
