import { useState, useEffect, useMemo } from 'react';
import { PageIntroduction } from '@/components/shared';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
      <PageIntroduction
        title="Alumni"
        description="Our alumni network spans leading financial institutions globally."
      />

      <div className="container py-section-sm md:py-section">
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
        <div className="mb-8 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by company" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {uniqueCompanies.map((company) => (
                  <SelectItem key={company} value={company}>
                    {company}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by city" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {uniqueCities.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by name, company, or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <p className="text-small text-muted-foreground">
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
                <h3 className="font-serif text-h4 mb-4 pb-2 border-b border-separator">
                  Class of {year}
                </h3>
                <div className="space-y-2">
                  {groupedAlumni[year]
                    .sort((a, b) => a.surname.localeCompare(b.surname))
                    .map((alumnus) => (
                      <div
                        key={alumnus.id}
                        className="flex items-center px-4 py-3 border border-separator hover:bg-muted/50 transition-colors"
                      >
                        <span className="font-body text-body font-medium w-1/4 truncate">
                          {alumnus.name} {alumnus.surname}
                        </span>
                        <span className="w-1/4 flex justify-center">
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
                        <span className="font-body text-body text-muted-foreground w-1/4 truncate text-center">
                          {alumnus.company}
                        </span>
                        <span className="font-body text-body text-muted-foreground w-1/4 truncate text-right">
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
