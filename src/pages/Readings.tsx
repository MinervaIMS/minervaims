import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageIntroduction, PageLoader } from '@/components/shared';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Search } from 'lucide-react';
import readingsBg from '@/assets/readings-bg.webp';

type ReadingType = 'academic_papers' | 'technical_textbooks' | 'free_time_readings';

interface Reading {
  id: string;
  title: string;
  author: string;
  description: string;
  reading_type: ReadingType;
  contributor_name: string;
  contributor_surname: string;
  contributor_role: string;
  display_order: number;
  created_at: string;
  publication_year?: number | null;
}

const readingTypeLabels: Record<ReadingType, string> = {
  academic_papers: 'Academic Papers',
  technical_textbooks: 'Technical Textbooks',
  free_time_readings: 'Free Time Readings',
};

// Roles that can access the readings dashboard section
const readingsAccessRoles = [
  'admin', 'president', 'vice_president', 'head_of_asset_management',
  'head_of_equity', 'head_of_investment', 'head_of_macro', 'head_of_portfolio', 'head_of_quant',
  'portfolio_manager'
];

const Readings = () => {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<ReadingType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { user, roles } = useAuth();
  const navigate = useNavigate();

  // Check if user can submit readings
  const canSubmit = user && roles.some(r => readingsAccessRoles.includes(r.role));

  useEffect(() => {
    const fetchReadings = async () => {
      try {
        const { data, error } = await supabase
          .from('readings')
          .select('*')
          .order('display_order', { ascending: true });

        if (error) throw error;
        setReadings((data as Reading[]) || []);
      } catch (error) {
        console.error('Error fetching readings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReadings();
  }, []);

  const filteredReadings = readings.filter(r => {
    const matchesCategory = activeCategory === 'all' || r.reading_type === activeCategory;
    const matchesSearch = searchQuery === '' || 
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${r.contributor_name} ${r.contributor_surname}`.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSubmitClick = () => {
    if (canSubmit) {
      navigate('/admin?tab=readings');
    }
  };

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <>
      {/* First Section: Title with Background */}
      <div className="relative">
        <div 
          className="absolute inset-0 bg-cover bg-center" 
          style={{ backgroundImage: `url(${readingsBg})` }} 
        />
        <div className="relative z-10">
          <PageIntroduction
            title="Reading Recommendations"
            transparentBackground
          />
        </div>
      </div>

      {/* Second Section: Description */}
      <section className="pt-section-sm md:pt-section pb-6 md:pb-8 bg-background">
        <div className="container px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-lg sm:text-xl md:text-heading mb-4 sm:mb-6 pb-3 border-b border-separator text-accent">
            Curated Readings to Share Knowledge
          </h2>
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 sm:gap-6 lg:gap-12">
            <p className="font-body text-sm sm:text-body-lg text-muted-foreground max-w-3xl leading-relaxed">
              Reading Recommendations is MIMS' curated collection of books, academic papers and technical references selected to support serious learning in finance and investment management. The library is designed to share knowledge across students, Society members and alumni, and to provide a common foundation built on the most influential writings in the field. Each entry includes a brief rationale and is attributed to the contributor, supporting a culture of disciplined study and open exchange.
            </p>
            <div className="shrink-0 w-full lg:w-auto">
              {canSubmit ? (
                <button
                  onClick={handleSubmitClick}
                  className="w-full lg:w-auto inline-block px-6 sm:px-10 py-3 sm:py-4 bg-background text-accent border border-accent font-serif text-base sm:text-lg shadow-none hover:bg-accent hover:text-background hover:shadow-[0_4px_10px_rgba(0,0,0,0.15)] transition-all duration-200 text-center"
                >
                  Submit a Recommendation
                </button>
              ) : (
                <div className="text-center lg:text-left">
                  <span className="w-full lg:w-auto inline-block px-6 sm:px-10 py-3 sm:py-4 bg-muted text-muted-foreground border border-separator font-serif text-base sm:text-lg cursor-not-allowed text-center">
                    Submit a Recommendation
                  </span>
                  <p className="font-body text-xs sm:text-small text-muted-foreground mt-2 max-w-xs mx-auto lg:mx-0">
                    Submissions are available only to selected contributors in the society.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Third Section: Readings List */}
      <section className="pt-6 md:pt-8 pb-section-sm md:pb-section bg-background">
        <div className="container px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-lg sm:text-xl md:text-heading mb-4 sm:mb-6 pb-3 border-b border-separator text-accent">
            Our Library
          </h2>

          {/* Category Filter and Search */}
          <div className="flex flex-col gap-4 mb-6 sm:mb-8">
            {/* Search bar - full width on mobile, comes first */}
            <div className="relative w-full order-first md:order-last md:flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-accent/60" />
              <input
                type="text"
                placeholder="Search readings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2.5 sm:py-2 pl-9 border border-accent/40 bg-transparent text-accent placeholder:text-accent/50 focus:border-accent focus:outline-none transition-all duration-200 text-sm sm:text-base"
                style={{ fontFamily: '"Times New Roman", Times, serif' }}
              />
            </div>
            
            {/* Category buttons - scrollable on mobile */}
            <div className="flex md:flex-row md:items-center gap-4">
              <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 md:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide md:flex-wrap">
                <button
                  onClick={() => setActiveCategory('all')}
                  className={`px-3 sm:px-4 py-2 border transition-all duration-200 uppercase text-xs sm:text-sm whitespace-nowrap shrink-0 ${
                    activeCategory === 'all'
                      ? 'bg-accent text-background border-accent'
                      : 'bg-transparent text-accent border-accent/40 hover:border-accent'
                  }`}
                  style={{ fontFamily: '"Times New Roman", Times, serif' }}
                >
                  All
                </button>
                {(Object.keys(readingTypeLabels) as ReadingType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setActiveCategory(type)}
                    className={`px-3 sm:px-4 py-2 border transition-all duration-200 uppercase text-xs sm:text-sm whitespace-nowrap shrink-0 ${
                      activeCategory === type
                        ? 'bg-accent text-background border-accent'
                        : 'bg-transparent text-accent border-accent/40 hover:border-accent'
                    }`}
                    style={{ fontFamily: '"Times New Roman", Times, serif' }}
                  >
                    {readingTypeLabels[type]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filteredReadings.length === 0 ? (
            <p className="font-body text-sm sm:text-body-lg text-muted-foreground text-center py-8">
              {activeCategory === 'all' 
                ? 'No reading recommendations have been added yet.'
                : `No ${readingTypeLabels[activeCategory].toLowerCase()} have been added yet.`}
            </p>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {filteredReadings.map((reading) => (
                <div
                  key={reading.id}
                  className="bg-background p-4 sm:p-6 transition-all duration-300 hover:shadow-lg border-b border-separator/30 last:border-b-0"
                >
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-[10px] sm:text-xs font-body uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        {readingTypeLabels[reading.reading_type]}
                      </span>
                    </div>
                    <h3 className="font-serif text-lg sm:text-xl md:text-2xl text-accent mb-1 leading-tight">
                      {reading.title}
                    </h3>
                    <p className="font-body text-sm sm:text-base text-muted-foreground mb-2 sm:mb-3">
                      by {reading.author}{reading.reading_type === 'academic_papers' && reading.publication_year ? ` (${reading.publication_year})` : ''}
                    </p>
                    <p className="font-body text-sm sm:text-body text-foreground mb-3 sm:mb-4 leading-relaxed">
                      {reading.description}
                    </p>
                    <p className="font-body text-xs sm:text-small text-muted-foreground italic">
                      Recommended by {reading.contributor_name} {reading.contributor_surname}, {reading.contributor_role}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Disclaimer Section */}
      <section className="py-6 sm:py-8 bg-muted">
        <div className="container px-4 sm:px-6 lg:px-8">
          <h3 className="font-serif text-base sm:text-xl mb-3 sm:mb-4 text-foreground text-center">
            Recommended Readings Disclaimer
          </h3>
          <p className="font-body text-xs sm:text-sm text-foreground text-center max-w-4xl mx-auto leading-relaxed">
            MIMS is not affiliated with, endorsed by, or associated with any authors, publishers, or editorial organisations referenced on this page. Recommendations are shared solely for educational purposes, reflecting the Society's commitment to knowledge-sharing across current members and alumni.
          </p>
        </div>
      </section>
    </>
  );
};

export default Readings;
