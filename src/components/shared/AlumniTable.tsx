import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Alumni } from '@/lib/types';

interface AlumniTableProps {
  alumni: Alumni[];
}

type SortKey = 'name' | 'graduationYear' | 'company';
type SortDirection = 'asc' | 'desc';

export function AlumniTable({ alumni }: AlumniTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('graduationYear');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

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
          comparison = a.graduationYear - b.graduationYear;
          break;
        case 'company':
          comparison = a.company.localeCompare(b.company);
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
              <span className="font-serif text-small uppercase tracking-wider">
                Current Role
              </span>
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
              <span className="font-serif text-small uppercase tracking-wider">
                Contact
              </span>
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
                <span className="font-body text-body text-muted-foreground">
                  {alumnus.graduationYear}
                </span>
              </td>
              <td className="py-4 pr-4">
                <span className="font-body text-body">
                  {alumnus.currentRole}
                </span>
              </td>
              <td className="py-4 pr-4">
                <span className="font-body text-body">
                  {alumnus.company}
                </span>
              </td>
              <td className="py-4">
                {alumnus.linkedinUrl && (
                  <Link
                    to={alumnus.linkedinUrl}
                    className="font-body text-small text-primary hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    LinkedIn
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
