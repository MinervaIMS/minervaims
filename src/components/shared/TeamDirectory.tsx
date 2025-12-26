import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TeamMember, Division, divisionLabels } from '@/lib/types';
import { Linkedin } from 'lucide-react';

interface TeamDirectoryProps {
  members: TeamMember[];
  showFilters?: boolean;
  initialDivisionFilter?: Division;
}

export function TeamDirectory({ members, showFilters = false, initialDivisionFilter }: TeamDirectoryProps) {
  const [divisionFilter, setDivisionFilter] = useState<Division | 'all'>(initialDivisionFilter || 'all');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const roles = useMemo(() => {
    const uniqueRoles = [...new Set(members.map(m => m.position))];
    return uniqueRoles;
  }, [members]);

  const filteredMembers = useMemo(() => {
    return members.filter(member => {
      if (divisionFilter !== 'all' && member.division !== divisionFilter) return false;
      if (roleFilter !== 'all' && member.position !== roleFilter) return false;
      return true;
    });
  }, [members, divisionFilter, roleFilter]);

  const boardMembers = filteredMembers.filter(m => m.isBoard);
  const divisionMembers = filteredMembers.filter(m => !m.isBoard);

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
        <div className="mb-8 pb-6 border-b border-separator">
          <div className="flex flex-col sm:flex-row gap-4">
            <div>
              <label className="font-body text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                Division
              </label>
              <select
                value={divisionFilter}
                onChange={(e) => setDivisionFilter(e.target.value as Division | 'all')}
                className="font-body text-small bg-background border border-separator px-3 py-2 min-w-[200px]"
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
                className="font-body text-small bg-background border border-separator px-3 py-2 min-w-[200px]"
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
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator">
            Board
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {boardMembers.map((member) => (
              <MemberCard key={member.id} member={member} />
            ))}
          </div>
        </section>
      )}

      {/* Division Members */}
      {Object.entries(groupedByDivision).map(([division, members]) => (
        <section key={division} className="mb-12">
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator">
            {divisionLabels[division as Division] || 'Operations & Media'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
      <div className="relative aspect-square bg-muted mb-4 flex items-center justify-center overflow-hidden">
        {member.photoUrl ? (
          <img 
            src={member.photoUrl} 
            alt={`${member.name} ${member.surname}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="font-serif text-muted-foreground text-heading">
            {member.name.charAt(0)}{member.surname.charAt(0)}
          </span>
        )}
        {member.linkedinUrl && (
          <Link
            to={member.linkedinUrl}
            className="absolute bottom-2 right-2 w-8 h-8 bg-primary flex items-center justify-center hover:opacity-80 transition-opacity"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${member.name} ${member.surname} LinkedIn profile`}
          >
            <Linkedin className="w-4 h-4 text-primary-foreground" />
          </Link>
        )}
      </div>
      <h3 className="font-serif text-body-lg">
        {member.name} {member.surname}
      </h3>
      <p className="font-body text-small text-muted-foreground mt-1">
        {member.position}
      </p>
    </article>
  );
}
