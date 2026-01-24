import { useState, useEffect, useMemo, useRef } from 'react';
import { PageIntroduction, PageLoader } from '@/components/shared';
import alumniBg from '@/assets/alumni-bg.webp';
import companiesImage from '@/assets/companies.webp';
import { supabase } from '@/integrations/supabase/client';
import { useImagePreload } from '@/hooks/useImagePreload';
import { Search } from 'lucide-react';
import linkedinIcon from '@/assets/linkedin-icon.png';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface AlumniRecord {
  id: string;
  name: string;
  surname: string;
  graduation_year: number;
  company: string;
  city: string | null;
  linkedin_url: string | null;
  job_area: string | null;
}

const ALUMNI_PER_PAGE = 25;

const Alumni = () => {
  const [alumni, setAlumni] = useState<AlumniRecord[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [jobAreaFilter, setJobAreaFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isSticky, setIsSticky] = useState(false);
  const searchBarRef = useRef<HTMLDivElement>(null);
  const imagesLoaded = useImagePreload([alumniBg]);

  useEffect(() => {
    fetchAlumni();
  }, []);

  // Detect sticky state
  useEffect(() => {
    const handleScroll = () => {
      if (searchBarRef.current) {
        const rect = searchBarRef.current.getBoundingClientRect();
        setIsSticky(rect.top <= 64); // 64px = top-16 (4rem)
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
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
      setIsDataLoading(false);
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

  const uniqueJobAreas = useMemo(() => {
    const areas = [...new Set(alumni.map(a => a.job_area).filter(Boolean))].sort() as string[];
    return areas;
  }, [alumni]);

  // Filter alumni based on search and filters
  const filteredAlumni = useMemo(() => {
    return alumni.filter(alumnus => {
      const matchesSearch = searchQuery === '' || 
        `${alumnus.name} ${alumnus.surname}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alumnus.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (alumnus.city?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (alumnus.job_area?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      
      const matchesCompany = companyFilter === 'all' || alumnus.company === companyFilter;
      const matchesCity = cityFilter === 'all' || alumnus.city === cityFilter;
      const matchesJobArea = jobAreaFilter === 'all' || alumnus.job_area === jobAreaFilter;
      
      return matchesSearch && matchesCompany && matchesCity && matchesJobArea;
    });
  }, [alumni, searchQuery, companyFilter, cityFilter, jobAreaFilter]);

  // Pagination for filtered alumni
  const totalPages = Math.ceil(filteredAlumni.length / ALUMNI_PER_PAGE);
  const paginatedAlumni = useMemo(() => {
    const startIndex = (currentPage - 1) * ALUMNI_PER_PAGE;
    return filteredAlumni.slice(startIndex, startIndex + ALUMNI_PER_PAGE);
  }, [filteredAlumni, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, companyFilter, cityFilter, jobAreaFilter]);

  // Group paginated alumni by graduation year
  const groupedAlumni = useMemo(() => {
    const groups: Record<number, AlumniRecord[]> = {};
    paginatedAlumni.forEach(alumnus => {
      if (!groups[alumnus.graduation_year]) {
        groups[alumnus.graduation_year] = [];
      }
      groups[alumnus.graduation_year].push(alumnus);
    });
    return groups;
  }, [paginatedAlumni]);

  // Sort years descending
  const sortedYears = useMemo(() => {
    return Object.keys(groupedAlumni).map(Number).sort((a, b) => b - a);
  }, [groupedAlumni]);

  // Fixed founders list - always show these 5 in alphabetical order with full details from alumni database
  const founders = [
    { id: 'founder-1', name: 'Lucrezia', surname: 'Cimiotti', degree: 'MSc Economics - ESS', graduation_year: 2020, job_area: 'Markets (Structuring)', company: 'J.P.Morgan', city: 'Paris', linkedin_url: 'https://www.linkedin.com/in/lucrezia-cimiotti-5b2aa1151/' },
    { id: 'founder-2', name: 'Francesca', surname: 'Rigante', degree: 'MSc Economics - ESS', graduation_year: 2020, job_area: 'Markets', company: 'Citi', city: 'London', linkedin_url: 'https://www.linkedin.com/in/francesca-rigante-79b121143/' },
    { id: 'founder-3', name: 'Massimiliano', surname: 'Rizzo', degree: 'MSc Finance', graduation_year: 2019, job_area: 'Markets (Treasury & Trading)', company: 'Banca Popolare Pugliese', city: 'Lecce', linkedin_url: 'https://www.linkedin.com/in/massimiliano-rizzo-0b9316144/' },
    { id: 'founder-4', name: 'Arturo', surname: 'Schembri', degree: 'MSc Economics - ESS', graduation_year: 2020, job_area: 'Brokerage', company: 'Hercle', city: 'Milan', linkedin_url: 'https://www.linkedin.com/in/arturo-schembri/' },
    { id: 'founder-5', name: 'Stefano', surname: 'Serio', degree: 'MSc Finance', graduation_year: 2020, job_area: 'Consulting', company: 'McKinsey&Co', city: 'Milan', linkedin_url: 'https://www.linkedin.com/in/stefano-serio-a272a6136/' },
  ];

  if (isDataLoading || !imagesLoaded) {
    return <PageLoader />;
  }

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
          <h2 className="font-serif text-xl sm:text-heading mb-6 pb-3 border-b border-separator text-accent">
            A Global Network, Still Close
          </h2>
          <p className="font-body text-body-lg text-muted-foreground">
            MIMS alumni form an international community across leading banks, boutiques, hedge funds and asset managers. Former members remain actively engaged through mentoring and alumni calls, offering current students practical guidance on academic choices, recruitment processes and early-career development.
          </p>
        </div>
      </section>

      <div className="container pb-section-sm md:pb-section">
        {/* Companies Image */}
        <div className="mb-16 sm:mb-20">
          <div className="overflow-x-auto sm:overflow-visible">
            <img 
              src={companiesImage} 
              alt="Companies where MIMS alumni work" 
              className="w-full min-w-[500px] sm:min-w-0 max-w-4xl mx-auto"
            />
          </div>
        </div>

        {/* Our Founders */}
        <div className="mb-24">
          <h2 className="font-serif text-xl sm:text-heading mb-6 pb-3 border-b border-separator text-accent">Our Founders back in 2017</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {founders.map((founder) => (
              <div
                key={founder.id}
                className="border border-separator rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-serif text-body-lg font-medium leading-tight">
                    {founder.surname} {founder.name}
                  </h3>
                  <a
                    href={founder.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 ml-2"
                  >
                    <img src={linkedinIcon} alt="LinkedIn" className="w-5 h-5" />
                  </a>
                </div>
                <p className="text-muted-foreground text-small">
                  {founder.degree}
                </p>
                <p className="text-muted-foreground text-small mb-2">
                  Class of {founder.graduation_year}
                </p>
                <p className="font-body text-small text-muted-foreground">
                  {founder.job_area}
                </p>
                <p className="font-serif text-body">
                  {founder.company}
                </p>
                <p className="font-body text-small text-muted-foreground/70">
                  {founder.city}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Search and Filters */}
        <div 
          ref={searchBarRef}
          className={`sticky top-16 z-20 bg-background py-4 mb-4 -mx-4 px-4 md:-mx-6 md:px-6 border-b border-separator transition-shadow duration-200 ${isSticky ? 'shadow-md' : ''}`}
        >
          <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <label className={`font-body text-xs text-muted-foreground uppercase tracking-wider block mb-2 ${isSticky ? 'sm:block hidden' : ''}`}>
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by name, company, city, or job area..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 h-10 border border-separator bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent transition-colors"
                  style={{ fontFamily: '"Times New Roman", Times, serif' }}
                />
              </div>
            </div>
            
            {/* Job Area Filter - hidden on mobile when sticky */}
            <div className={`${isSticky ? 'hidden sm:block' : ''}`}>
              <label className="font-body text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                Job Area
              </label>
              <select
                value={jobAreaFilter}
                onChange={(e) => setJobAreaFilter(e.target.value)}
                className="bg-background border border-separator px-3 h-10 min-w-[200px]"
                style={{ fontFamily: '"Times New Roman", Times, serif' }}
              >
                <option value="all">All Job Areas</option>
                {uniqueJobAreas.map((area) => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>

            {/* Company Filter - hidden on mobile when sticky */}
            <div className={`${isSticky ? 'hidden sm:block' : ''}`}>
              <label className="font-body text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                Company
              </label>
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="bg-background border border-separator px-3 h-10 min-w-[200px]"
                style={{ fontFamily: '"Times New Roman", Times, serif' }}
              >
                <option value="all">All Companies</option>
                {uniqueCompanies.map((company) => (
                  <option key={company} value={company}>{company}</option>
                ))}
              </select>
            </div>

            {/* City Filter - hidden on mobile when sticky */}
            <div className={`${isSticky ? 'hidden sm:block' : ''}`}>
              <label className="font-body text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                City
              </label>
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="bg-background border border-separator px-3 h-10 min-w-[200px]"
                style={{ fontFamily: '"Times New Roman", Times, serif' }}
              >
                <option value="all">All Cities</option>
                {uniqueCities.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
          </div>
          
          <p className={`text-small text-muted-foreground mt-4 ${isSticky ? 'hidden sm:block' : ''}`}>
            Showing {paginatedAlumni.length} of {filteredAlumni.length} alumni
            {filteredAlumni.length !== alumni.length && ` (${alumni.length} total)`}
          </p>
        </div>

        {/* Alumni List */}
        {alumni.length === 0 ? (
          <p className="font-body text-muted-foreground">No alumni data available yet.</p>
        ) : filteredAlumni.length === 0 ? (
          <p className="font-body text-muted-foreground">No alumni match your search criteria.</p>
        ) : (
          <div className="space-y-8">
            {sortedYears.map((year) => (
              <div key={year}>
                <h3 className="font-serif text-xl sm:text-heading mb-4 pb-2 border-b border-separator text-accent">
                  Class of {year}
                </h3>
                <div className="space-y-1">
                  {groupedAlumni[year]
                    .sort((a, b) => a.surname.localeCompare(b.surname))
                    .map((alumnus) => (
                      <div
                        key={alumnus.id}
                        className="px-4 py-3 hover:bg-muted/50 transition-colors"
                      >
                        {/* Mobile layout - stacked */}
                        <div className="sm:hidden">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-body-lg font-medium" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                              {alumnus.surname} {alumnus.name}
                            </span>
                            {alumnus.linkedin_url ? (
                              <a
                                href={alumnus.linkedin_url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <img src={linkedinIcon} alt="LinkedIn" className="w-5 h-5" />
                              </a>
                            ) : null}
                          </div>
                          <p className="font-body text-small text-muted-foreground">
                            {alumnus.company}{alumnus.city ? ` • ${alumnus.city}` : ''}
                          </p>
                          {alumnus.job_area && (
                            <p className="font-body text-xs text-muted-foreground/70 mt-0.5">
                              {alumnus.job_area}
                            </p>
                          )}
                        </div>
                        
                        {/* Desktop layout - 5 columns */}
                        <div className="hidden sm:flex items-center">
                          <span className="text-body-lg font-medium w-[20%] truncate text-left" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                            {alumnus.surname} {alumnus.name}
                          </span>
                          <span className="w-[10%] flex justify-start">
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
                          <span className="font-body text-body text-muted-foreground w-[25%] truncate text-left">
                            {alumnus.job_area || '—'}
                          </span>
                          <span className="font-body text-body text-muted-foreground w-[25%] truncate text-left">
                            {alumnus.company}
                          </span>
                          <span className="font-body text-body text-muted-foreground w-[20%] truncate text-left">
                            {alumnus.city || '—'}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination className="mt-8 overflow-x-auto">
            <PaginationContent className="flex-wrap justify-center gap-1">
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              
              {(() => {
                const pages: (number | 'ellipsis')[] = [];
                if (totalPages <= 5) {
                  for (let i = 1; i <= totalPages; i++) pages.push(i);
                } else {
                  if (currentPage <= 3) {
                    pages.push(1, 2, 3, 4, 'ellipsis', totalPages);
                  } else if (currentPage >= totalPages - 2) {
                    pages.push(1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
                  } else {
                    pages.push(1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages);
                  }
                }
                return pages.map((page, index) => (
                  <PaginationItem key={index}>
                    {page === 'ellipsis' ? (
                      <span className="px-3 py-2">...</span>
                    ) : (
                      <PaginationLink
                        isActive={currentPage === page}
                        onClick={() => setCurrentPage(page)}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ));
              })()}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </>
  );
};

export default Alumni;
