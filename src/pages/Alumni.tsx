import { useState, useEffect, useMemo } from 'react';
import { PageIntroduction } from '@/components/shared';
import { supabase } from '@/integrations/supabase/client';
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

type SortKey = 'name' | 'graduationYear' | 'company' | 'city';
type SortDirection = 'asc' | 'desc';

const Alumni = () => {
  const [alumni, setAlumni] = useState<AlumniRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('graduationYear');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

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

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedAlumni = useMemo(() => {
    return [...alumni].sort((a, b) => {
      let comparison = 0;
      
      switch (sortKey) {
        case 'name':
          comparison = `${a.surname} ${a.name}`.localeCompare(`${b.surname} ${b.name}`);
          break;
        case 'graduationYear':
          comparison = a.graduation_year - b.graduation_year;
          break;
        case 'company':
          comparison = a.company.localeCompare(b.company);
          break;
        case 'city':
          comparison = (a.city || '').localeCompare(b.city || '');
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [alumni, sortKey, sortDirection]);

  const SortIndicator = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) return <span className="ml-1 text-muted-foreground">(sort)</span>;
    return <span className="ml-1">{sortDirection === 'asc' ? '▲' : '▼'}</span>;
  };

  return (
    <>
      <PageIntroduction
        title="Alumni"
        description="Our alumni network spans leading financial institutions globally."
      />

      <div className="container py-section-sm md:py-section">
        {isLoading ? (
          <p className="font-body text-muted-foreground">Loading alumni...</p>
        ) : alumni.length === 0 ? (
          <p className="font-body text-muted-foreground">No alumni data available yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-separator">
                  <th className="text-left py-4 pr-4">
                    <button
                      onClick={() => handleSort('name')}
                      className="font-serif text-small uppercase tracking-wider hover:text-primary transition-colors"
                    >
                      Name
                      <SortIndicator columnKey="name" />
                    </button>
                  </th>
                  <th className="text-left py-4 pr-4 w-12">
                    <span className="font-serif text-small uppercase tracking-wider">
                      LinkedIn
                    </span>
                  </th>
                  <th className="text-left py-4 pr-4">
                    <button
                      onClick={() => handleSort('graduationYear')}
                      className="font-serif text-small uppercase tracking-wider hover:text-primary transition-colors"
                    >
                      Year
                      <SortIndicator columnKey="graduationYear" />
                    </button>
                  </th>
                  <th className="text-left py-4 pr-4">
                    <button
                      onClick={() => handleSort('company')}
                      className="font-serif text-small uppercase tracking-wider hover:text-primary transition-colors"
                    >
                      Company
                      <SortIndicator columnKey="company" />
                    </button>
                  </th>
                  <th className="text-left py-4">
                    <button
                      onClick={() => handleSort('city')}
                      className="font-serif text-small uppercase tracking-wider hover:text-primary transition-colors"
                    >
                      City
                      <SortIndicator columnKey="city" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedAlumni.map((alumnus) => (
                  <tr key={alumnus.id} className="border-b border-separator">
                    <td className="py-4 pr-4">
                      <span className="font-body text-body">
                        {alumnus.name} {alumnus.surname}
                      </span>
                    </td>
                    <td className="py-4 pr-4">
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
                    </td>
                    <td className="py-4 pr-4">
                      <span className="font-body text-body text-muted-foreground">
                        {alumnus.graduation_year}
                      </span>
                    </td>
                    <td className="py-4 pr-4">
                      <span className="font-body text-body">
                        {alumnus.company}
                      </span>
                    </td>
                    <td className="py-4">
                      <span className="font-body text-body text-muted-foreground">
                        {alumnus.city || '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

export default Alumni;
