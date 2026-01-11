import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TeamMember, Division, divisionLabels } from '@/lib/types';
import linkedinIcon from '@/assets/linkedin-icon.png';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface TeamDirectoryProps {
  members: TeamMember[];
  showFilters?: boolean;
  initialDivisionFilter?: Division;
}

// Position priority for sorting division members
const POSITION_ORDER: Record<string, number> = {
  'Head of Equity Research': 1,
  'Co-Head of Equity Research': 1,
  'Head of Investment Research': 1,
  'Co-Head of Investment Research': 1,
  'Head of Macro Research': 1,
  'Co-Head of Macro Research': 1,
  'Head of Portfolio Management': 1,
  'Co-Head of Portfolio Management': 1,
  'Head of Quantitative Research': 1,
  'Co-Head of Quantitative Research': 1,
  'Head of Operations': 1,
  'Co-Head of Operations': 1,
  'Head of Media': 1,
  'Co-Head of Media': 1,
  'Portfolio Manager': 2,
  'Senior Analyst': 3,
  'Analyst': 4,
  'Operations': 5,
  'Media': 5,
};

export function TeamDirectory({ members, showFilters = false, initialDivisionFilter }: TeamDirectoryProps) {
  const [divisionFilter, setDivisionFilter] = useState<Division | 'all'>(initialDivisionFilter || 'all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const roles = useMemo(() => {
    const uniqueRoles = [...new Set(members.map(m => m.position))];
    return uniqueRoles;
  }, [members]);

  const filteredMembers = useMemo(() => {
    return members.filter(member => {
      if (divisionFilter !== 'all' && member.division !== divisionFilter) return false;
      if (roleFilter !== 'all' && member.position !== roleFilter) return false;
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const fullName = `${member.name} ${member.surname}`.toLowerCase();
        if (!fullName.includes(query)) return false;
      }
      return true;
    });
  }, [members, divisionFilter, roleFilter, searchQuery]);

  // Board members: sorted by display_order (manual ordering)
  const boardMembers = filteredMembers.filter(m => m.isBoard);
  
  // Division members: sorted by position priority, then alphabetically by surname
  const divisionMembers = useMemo(() => {
    return filteredMembers
      .filter(m => !m.isBoard)
      .sort((a, b) => {
        const orderA = POSITION_ORDER[a.position] || 99;
        const orderB = POSITION_ORDER[b.position] || 99;
        if (orderA !== orderB) return orderA - orderB;
        return a.surname.localeCompare(b.surname);
      });
  }, [filteredMembers]);

  const groupedByDivision = useMemo(() => {
    const groups: Record<string, TeamMember[]> = {};
    divisionMembers.forEach(member => {
      const key = member.division || 'operations';
      if (!groups[key]) groups[key] = [];
      groups[key].push(member);
    });
    return groups;
  }, [divisionMembers]);

  return (
    <div>
      {/* Filters */}
      {showFilters && (
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
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 font-body text-small h-10"
                />
              </div>
            </div>
            <div>
              <label className="font-body text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                Division
              </label>
              <select
                value={divisionFilter}
                onChange={(e) => setDivisionFilter(e.target.value as Division | 'all')}
                className="font-body text-small bg-background border border-separator px-3 h-10 min-w-[200px]"
              >
                <option value="all">All Divisions</option>
                {Object.entries(divisionLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-body text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                Role
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="font-body text-small bg-background border border-separator px-3 h-10 min-w-[200px]"
              >
                <option value="all">All Roles</option>
                {roles.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Board Members */}
      {boardMembers.length > 0 && (
        <section className="mb-12">
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">
            Executive Board
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {boardMembers.map((member) => (
              <MemberCard key={member.id} member={member} />
            ))}
          </div>
        </section>
      )}

      {/* Division Members */}
      {Object.entries(groupedByDivision).map(([division, members]) => (
        <section key={division} className="mb-12">
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">
            {divisionLabels[division as Division] || 'Operations & Media'}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {members.map((member) => (
              <MemberCard key={member.id} member={member} />
            ))}
          </div>
        </section>
      ))}

      {filteredMembers.length === 0 && (
        <p className="font-body text-muted-foreground py-8">
          No team members match the selected filters.
        </p>
      )}
    </div>
  );
}

function MemberCard({ member }: { member: TeamMember }) {
  return (
    <article className="group">
      {/* Photo - squared */}
      <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
        {member.photoUrl ? (
          <img 
            src={member.photoUrl} 
            alt={`${member.name} ${member.surname}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="font-serif text-muted-foreground text-subheading">
            {member.name.charAt(0)}{member.surname.charAt(0)}
          </span>
        )}
      </div>
      {/* Name and position */}
      <div className="mt-3">
        <h3 className="font-serif text-body-lg">
          {member.name} {member.surname}
        </h3>
        <p className="font-body text-small text-muted-foreground mt-1">
          {member.position}
        </p>
        {/* LinkedIn icon below */}
        {member.linkedinUrl && (
          <Link
            to={member.linkedinUrl}
            className="inline-block mt-2 hover:opacity-80 transition-opacity"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${member.name} ${member.surname} LinkedIn profile`}
          >
            <img src={linkedinIcon} alt="LinkedIn" className="w-6 h-6" />
          </Link>
        )}
      </div>
    </article>
  );
}
