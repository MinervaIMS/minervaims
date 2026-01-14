import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageIntroduction } from '@/components/shared';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

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

  const filteredReadings = activeCategory === 'all'
    ? readings
    : readings.filter(r => r.reading_type === activeCategory);

  const handleSubmitClick = () => {
    if (canSubmit) {
      navigate('/admin?tab=readings');
    }
  };

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
      <section className="py-section-sm md:py-section bg-background">
        <div className="container">
          <h2 className="font-serif text-xl sm:text-heading mb-6 pb-3 border-b border-separator text-accent">
            Curated Readings to Share Knowledge
          </h2>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 md:gap-12">
            <p className="font-body text-body-lg text-muted-foreground max-w-3xl">
              Reading Recommendations is MIMS' curated collection of books, academic papers and technical references selected to support serious learning in finance and investment management. The library is designed to share knowledge across students, Society members and alumni, and to provide a common foundation built on the most influential writings in the field. Each entry includes a brief rationale and is attributed to the contributor, supporting a culture of disciplined study and open exchange.
            </p>
            <div className="shrink-0">
              {canSubmit ? (
                <button
                  onClick={handleSubmitClick}
                  className="inline-block px-10 py-4 bg-background text-accent border border-accent font-serif text-lg shadow-none hover:bg-accent hover:text-background hover:shadow-[0_4px_10px_rgba(0,0,0,0.15)] transition-all duration-200 whitespace-nowrap"
                >
                  Submit a Recommendation
                </button>
              ) : (
                <div className="text-center">
                  <span className="inline-block px-10 py-4 bg-muted text-muted-foreground border border-separator font-serif text-lg cursor-not-allowed whitespace-nowrap">
                    Submit a Recommendation
                  </span>
                  <p className="font-body text-small text-muted-foreground mt-2 max-w-xs">
                    Submissions are available only to selected contributors in the society.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Third Section: Readings List */}
      <section className="py-section-sm md:py-section bg-background">
        <div className="container">
          <h2 className="font-serif text-xl sm:text-heading mb-6 pb-3 border-b border-separator text-accent">
            Our Library
          </h2>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-3 mb-8">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-4 py-2 border transition-all duration-200 uppercase ${
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
                className={`px-4 py-2 border transition-all duration-200 uppercase ${
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

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-accent/60" />
            </div>
          ) : filteredReadings.length === 0 ? (
            <p className="font-body text-body-lg text-muted-foreground">
              {activeCategory === 'all' 
                ? 'No reading recommendations have been added yet.'
                : `No ${readingTypeLabels[activeCategory].toLowerCase()} have been added yet.`}
            </p>
          ) : (
            <div className="space-y-6">
              {filteredReadings.map((reading) => (
                <div
                  key={reading.id}
                  className="bg-background p-6 transition-all duration-300 hover:shadow-lg"
                >
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-xs font-body uppercase tracking-wider text-muted-foreground">
                        {readingTypeLabels[reading.reading_type]}
                      </span>
                    </div>
                    <h3 className="font-serif text-xl md:text-2xl text-accent mb-1">
                      {reading.title}
                    </h3>
                    <p className="font-body text-muted-foreground mb-3">
                      by {reading.author}{reading.reading_type === 'academic_papers' && reading.publication_year ? ` (${reading.publication_year})` : ''}
                    </p>
                    <p className="font-body text-body text-foreground mb-4">
                      {reading.description}
                    </p>
                    <p className="font-body text-small text-muted-foreground italic">
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
      <section className="py-8 bg-muted">
        <div className="container">
          <h3 className="font-serif text-xl mb-4 text-foreground text-center">
            Recommended Readings Disclaimer
          </h3>
          <p className="font-body text-sm text-foreground text-center max-w-4xl mx-auto">
            MIMS is not affiliated with, endorsed by, or associated with any authors, publishers, or editorial organisations referenced on this page. Recommendations are shared solely for educational purposes, reflecting the Society's commitment to knowledge-sharing across current members and alumni.
          </p>
        </div>
      </section>
    </>
  );
};

export default Readings;
