import { useState, useEffect, useMemo } from 'react';
import { PageIntroduction } from '@/components/shared';
import alumniBg from '@/assets/alumni-bg.webp';
import alumniCommunityLogo from '@/assets/alumni-community-logo.svg';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import linkedinIcon from '@/assets/linkedin-icon.png';
interface AlumniRecord {
  id: string;
  name: string;
  surname: string;
  graduation_year: number;
  company: string;
  city: string | null;
  linkedin_url: string | null;
}

const Alumni = () => {
  const [alumni, setAlumni] = useState<AlumniRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');

  useEffect(() => {
    fetchAlumni();
  }, []);

  const fetchAlumni = async () => {
    try {
      const { data, error } = await supabase
        .from('alumni')
        .select('*')
        .order('graduation_year', { ascending: false });

      if (error) throw error;
      setAlumni(data || []);
    } catch (error) {
      console.error('Error fetching alumni:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get unique companies and cities for filters
  const uniqueCompanies = useMemo(() => {
    const companies = [...new Set(alumni.map(a => a.company))].sort();
    return companies;
  }, [alumni]);

  const uniqueCities = useMemo(() => {
    const cities = [...new Set(alumni.map(a => a.city).filter(Boolean))].sort() as string[];
    return cities;
  }, [alumni]);

  // Filter alumni based on search and filters
  const filteredAlumni = useMemo(() => {
    return alumni.filter(alumnus => {
      const matchesSearch = searchQuery === '' || 
        `${alumnus.name} ${alumnus.surname}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alumnus.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (alumnus.city?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      
      const matchesCompany = companyFilter === 'all' || alumnus.company === companyFilter;
      const matchesCity = cityFilter === 'all' || alumnus.city === cityFilter;
      
      return matchesSearch && matchesCompany && matchesCity;
    });
  }, [alumni, searchQuery, companyFilter, cityFilter]);

  // Group filtered alumni by graduation year
  const groupedAlumni = useMemo(() => {
    const groups: Record<number, AlumniRecord[]> = {};
    filteredAlumni.forEach(alumnus => {
      if (!groups[alumnus.graduation_year]) {
        groups[alumnus.graduation_year] = [];
      }
      groups[alumnus.graduation_year].push(alumnus);
    });
    return groups;
  }, [filteredAlumni]);

  // Sort years descending
  const sortedYears = useMemo(() => {
    return Object.keys(groupedAlumni).map(Number).sort((a, b) => b - a);
  }, [groupedAlumni]);

  // Get spotlight alumni (first 3 with LinkedIn profiles)
  const spotlightAlumni = useMemo(() => {
    return alumni.filter(a => a.linkedin_url).slice(0, 3);
  }, [alumni]);

  return (
    <>
      <div className="relative">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${alumniBg})` }} />
        <div className="relative z-10">
          <PageIntroduction
            title="Alumni"
            transparentBackground
          />
        </div>
      </div>

      {/* Description Section */}
      <section className="pt-section-sm md:pt-section pb-12 md:pb-16 bg-background">
        <div className="container">
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">
            A Global Network, Still Close
          </h2>
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
            <p className="font-body text-body-lg text-muted-foreground max-w-3xl flex-1">
              MIMS alumni form an international community across leading banks, boutiques, hedge funds and asset managers. Former members remain actively engaged through mentoring and alumni calls, offering current students practical guidance on academic choices, recruitment processes and early-career development.
            </p>
            <img 
              src={alumniCommunityLogo} 
              alt="MIMS Alumni Community" 
              className="w-36 h-36 md:w-48 md:h-48 flex-shrink-0 md:ml-28"
            />
          </div>
        </div>
      </section>

      <div className="container pb-section-sm md:pb-section">
        {/* Alumni Spotlight */}
        {spotlightAlumni.length > 0 && (
          <div className="mb-12">
            <h2 className="font-serif text-h3 mb-6">Alumni Spotlight</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {spotlightAlumni.map((alumnus) => (
                <div
                  key={alumnus.id}
                  className="border border-separator p-6 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-serif text-body-lg font-medium">
                        {alumnus.name} {alumnus.surname}
                      </h3>
                      <p className="text-muted-foreground text-small">
                        Class of {alumnus.graduation_year}
                      </p>
                    </div>
                    {alumnus.linkedin_url && (
                      <a
                        href={alumnus.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block"
                      >
                        <img src={linkedinIcon} alt="LinkedIn" className="w-5 h-5" />
                      </a>
                    )}
                  </div>
                  <p className="font-body text-body">{alumnus.company}</p>
                  {alumnus.city && (
                    <p className="font-body text-small text-muted-foreground">
                      {alumnus.city}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="mb-8 pb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <label className="font-body text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by name, company, or city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 font-body text-small h-10"
                />
              </div>
            </div>
            
            {/* Company Filter */}
            <div>
              <label className="font-body text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                Company
              </label>
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="font-body text-small bg-background border border-separator px-3 h-10 min-w-[200px]"
              >
                <option value="all">All Companies</option>
                {uniqueCompanies.map((company) => (
                  <option key={company} value={company}>{company}</option>
                ))}
              </select>
            </div>

            {/* City Filter */}
            <div>
              <label className="font-body text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                City
              </label>
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="font-body text-small bg-background border border-separator px-3 h-10 min-w-[200px]"
              >
                <option value="all">All Cities</option>
                {uniqueCities.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
          </div>
          
          <p className="text-small text-muted-foreground mt-4">
            Showing {filteredAlumni.length} of {alumni.length} alumni
          </p>
        </div>

        {/* Alumni List */}
        {isLoading ? (
          <p className="font-body text-muted-foreground">Loading alumni...</p>
        ) : alumni.length === 0 ? (
          <p className="font-body text-muted-foreground">No alumni data available yet.</p>
        ) : filteredAlumni.length === 0 ? (
          <p className="font-body text-muted-foreground">No alumni match your search criteria.</p>
        ) : (
          <div className="space-y-8">
            {sortedYears.map((year) => (
              <div key={year}>
                <h3 className="font-serif text-heading mb-4 pb-2 border-b border-separator text-accent">
                  Class of {year}
                </h3>
                <div className="space-y-1">
                  {groupedAlumni[year]
                    .sort((a, b) => a.surname.localeCompare(b.surname))
                    .map((alumnus) => (
                      <div
                        key={alumnus.id}
                        className="flex items-center px-4 py-3 hover:bg-muted/50 transition-colors"
                      >
                        <span className="font-body text-body font-medium w-1/4 truncate text-left">
                          {alumnus.name} {alumnus.surname}
                        </span>
                        <span className="w-1/4 flex justify-start">
                          {alumnus.linkedin_url ? (
                            <a
                              href={alumnus.linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <img src={linkedinIcon} alt="LinkedIn" className="w-5 h-5" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </span>
                        <span className="font-body text-body text-muted-foreground w-1/4 truncate text-left">
                          {alumnus.company}
                        </span>
                        <span className="font-body text-body text-muted-foreground w-1/4 truncate text-left">
                          {alumnus.city || '—'}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default Alumni;
