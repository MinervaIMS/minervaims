import { useState, useMemo, useEffect } from 'react';
import { TeamMember, Division, divisionLabels, fundLabels } from '@/lib/types';

interface MembersDirectoryProps {
  members: TeamMember[];
  initialDivisionFilter?: Division;
}

type TabKey = 'executive' | Division | 'media-ops';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'executive', label: 'Executive Board' },
  { key: 'equity', label: 'Equity Research' },
  { key: 'investment', label: 'Investment Research' },
  { key: 'macro', label: 'Macro Research' },
  { key: 'portfolio', label: 'Portfolio Management' },
  { key: 'quant', label: 'Quantitative Research' },
  { key: 'media-ops', label: 'Media & Ops' },
];

const DIVISION_BLURBS: Record<TabKey, string> = {
  executive: 'The board oversees strategy, governance and the day-to-day running of MIMS.',
  equity: 'Single-name and sector equity research across European and global markets.',
  investment: 'Cross-asset and private market research on deals, themes and capital flows.',
  macro: 'Top-down research on growth, inflation, central banks and global asset allocation.',
  portfolio: 'Managing MIMS\u2019 virtual funds through disciplined, research-driven decisions.',
  quant: 'Systematic strategies, factor research and quantitative portfolio construction.',
  'media-ops': 'Editorial, design and operational support across the organisation.',
};

const POSITION_ORDER: Record<string, number> = {
  'President': 1,
  'Vice President': 2,
  'Head of Asset Management': 3,
  'Advisor': 4,
  'Head of Equity Research': 10,
  'Co-Head of Equity Research': 11,
  'Head of Investment Research': 10,
  'Co-Head of Investment Research': 11,
  'Head of Macro Research': 10,
  'Co-Head of Macro Research': 11,
  'Head of Portfolio Management': 10,
  'Co-Head of Portfolio Management': 11,
  'Head of Quantitative Research': 10,
  'Co-Head of Quantitative Research': 11,
  'Head of Operations': 10,
  'Co-Head of Operations': 11,
  'Head of Media': 10,
  'Co-Head of Media': 11,
  'Portfolio Manager': 20,
  'Senior Analyst': 30,
  'Analyst': 40,
  'Operations': 50,
  'Media': 50,
};

const sortMembers = (a: TeamMember, b: TeamMember) => {
  const pa = POSITION_ORDER[a.position] ?? 100;
  const pb = POSITION_ORDER[b.position] ?? 100;
  if (pa !== pb) return pa - pb;
  return (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
};

const isLeadership = (m: TeamMember) =>
  m.position.includes('Head of') || m.position === 'Portfolio Manager' || m.position === 'Senior Analyst';

const getInitials = (m: TeamMember) =>
  `${m.name?.charAt(0) ?? ''}${m.surname?.charAt(0) ?? ''}`.toUpperCase();

export function MembersDirectory({ members, initialDivisionFilter }: MembersDirectoryProps) {
  const [active, setActive] = useState<TabKey>(initialDivisionFilter ?? 'executive');

  useEffect(() => {
    if (initialDivisionFilter) setActive(initialDivisionFilter);
  }, [initialDivisionFilter]);

  const grouped = useMemo(() => {
    const executive = members.filter((m) => m.isBoard).sort(sortMembers);
    const byDivision: Record<Division, TeamMember[]> = {
      equity: [], investment: [], macro: [], portfolio: [], quant: [],
    };
    const divisionHeadMap: Record<string, Division> = {
      'Equity Research': 'equity',
      'Investment Research': 'investment',
      'Macro Research': 'macro',
      'Portfolio Management': 'portfolio',
      'Quantitative Research': 'quant',
    };
    members.forEach((m) => {
      if (!m.isBoard) {
        if (m.division && m.division in byDivision) {
          byDivision[m.division as Division].push(m);
        }
        return;
      }
      // Board members who are heads of a division also appear in that division tab
      for (const [key, div] of Object.entries(divisionHeadMap)) {
        if (m.position.includes(key)) {
          byDivision[div].push(m);
          break;
        }
      }
    });
    (Object.keys(byDivision) as Division[]).forEach((k) => byDivision[k].sort(sortMembers));
    return { executive, byDivision };
  }, [members]);

  const currentMembers: TeamMember[] =
    active === 'executive'
      ? grouped.executive
      : active === 'media-ops'
      ? []
      : grouped.byDivision[active];

  const activeTab = TABS.find((t) => t.key === active)!;

  return (
    <div>
      {/* Tab bar */}
      <nav
        className="flex flex-nowrap overflow-x-auto border-b border-separator -mx-4 px-4 md:mx-0 md:px-0"
        aria-label="Members section"
      >
        {TABS.map((t) => {
          const isActive = t.key === active;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActive(t.key)}
              className={[
                'whitespace-nowrap font-serif transition-colors duration-200',
                'px-[.9rem] py-[.7rem] md:px-[1.15rem] md:py-[.8rem]',
                'text-[.96rem] md:text-[1.05rem]',
                '-mb-px border-b-2',
                isActive
                  ? 'text-accent font-bold border-accent'
                  : 'text-foreground/70 border-transparent hover:text-accent',
              ].join(' ')}
              aria-current={isActive ? 'page' : undefined}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      {/* Section header */}
      <div className="mt-10 mb-6 flex items-baseline justify-between gap-4">
        <h2 className="font-serif text-heading text-accent">{activeTab.label}</h2>
        <span className="font-body text-xs uppercase tracking-[.08em] text-muted-foreground shrink-0">
          {currentMembers.length} {currentMembers.length === 1 ? 'member' : 'members'}
        </span>
      </div>

      {/* Body */}
      {active === 'executive' && <FeatureGrid members={currentMembers} />}

      {active !== 'executive' && active !== 'media-ops' && (
        <DivisionGroups members={currentMembers} />
      )}

      {active === 'media-ops' && <EmptyDivision />}
    </div>
  );
}

/* ---------- Executive board feature grid ---------- */

function FeatureGrid({ members }: { members: TeamMember[] }) {
  if (members.length === 0) {
    return (
      <p className="font-body text-muted-foreground">No board members to display.</p>
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-[.7rem] md:gap-5">
      {members.map((m) => (
        <FeatureCard key={m.id} member={m} />
      ))}
    </div>
  );
}

function FeatureCard({ member }: { member: TeamMember }) {
  return (
    <article className="group bg-muted p-[1.1rem] flex flex-col transition-colors duration-300 ease-out hover:bg-[#ece9f4] focus-within:bg-[#ece9f4]">
      <div className="w-full aspect-square bg-background flex items-center justify-center overflow-hidden transition-transform duration-300 ease-out group-hover:-translate-y-[6px] group-focus-within:-translate-y-[6px]">
        {member.photoUrl ? (
          <img
            src={member.photoUrl}
            alt={`${member.name} ${member.surname}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="font-serif text-[2.3rem] leading-none text-accent">
            {getInitials(member)}
          </span>
        )}
      </div>
      <h3 className="font-serif text-[1.12rem] mt-4 text-foreground">
        {member.name} {member.surname}
      </h3>
      <p className="font-body text-[.74rem] uppercase tracking-[.08em] text-muted-foreground mt-1">
        {member.position}
      </p>
      <div className="mt-auto pt-4">
        {member.linkedinUrl && (
          <LinkedInGlyph
            href={member.linkedinUrl}
            label={`${member.name} ${member.surname} LinkedIn profile`}
            className="text-accent"
          />
        )}
      </div>
    </article>
  );
}

/* ---------- Division compact grid ---------- */

function DivisionGroups({ members }: { members: TeamMember[] }) {
  const leadership = members.filter(isLeadership);
  const analysts = members.filter((m) => !isLeadership(m));

  if (members.length === 0) {
    return (
      <p className="font-body text-muted-foreground">No members in this division yet.</p>
    );
  }

  return (
    <div className="space-y-10">
      {leadership.length > 0 && (
        <div>
          <SubLabel>Leadership</SubLabel>
          <CompactGrid members={leadership} variant="leadership" />
        </div>
      )}
      {analysts.length > 0 && (
        <div>
          <SubLabel>Analysts</SubLabel>
          <CompactGrid members={analysts} variant="analyst" />
        </div>
      )}
    </div>
  );
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-body text-[.72rem] uppercase tracking-[.16em] text-muted-foreground mb-4 pb-2 border-b border-separator">
      {children}
    </div>
  );
}

function CompactGrid({
  members,
  variant,
}: {
  members: TeamMember[];
  variant: 'leadership' | 'analyst';
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {members.map((m) => (
        <CompactCard key={m.id} member={m} variant={variant} />
      ))}
    </div>
  );
}

function CompactCard({
  member,
  variant,
}: {
  member: TeamMember;
  variant: 'leadership' | 'analyst';
}) {
  const isLead = variant === 'leadership';
  return (
    <article
      className={[
        'group flex items-center gap-4 p-[.9rem] transition-colors duration-300 ease-out',
        'bg-muted hover:bg-[#ece9f4] focus-within:bg-[#ece9f4]',
      ].join(' ')}
    >
      <div className="shrink-0 w-[76px] h-[76px] md:w-[109px] md:h-[109px] bg-background flex items-center justify-center overflow-hidden">
        {member.photoUrl ? (
          <img
            src={member.photoUrl}
            alt={`${member.name} ${member.surname}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="font-serif text-[1.9rem] leading-none text-accent">
            {getInitials(member)}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3
          className={[
            'font-serif text-[1.08rem] leading-tight truncate',
            isLead ? 'text-accent' : 'text-foreground',
          ].join(' ')}
        >
          {member.name} {member.surname}
        </h3>
        <p className="font-body text-[.8rem] text-muted-foreground mt-1">
          {member.position}
          {member.division === 'portfolio' &&
            member.fund &&
            !member.position.includes('Head of Portfolio Management') && (
              <span className="text-accent/70 italic"> · {fundLabels[member.fund]}</span>
            )}
        </p>
      </div>
      {member.linkedinUrl && (
        <LinkedInGlyph
          href={member.linkedinUrl}
          label={`${member.name} ${member.surname} LinkedIn profile`}
          className="text-accent shrink-0"
        />
      )}
    </article>
  );
}

/* ---------- Empty state ---------- */

function EmptyDivision() {
  return (
    <div className="border border-separator p-10 flex flex-col items-center text-center">
      <div className="w-20 h-20 bg-muted flex items-center justify-center mb-5">
        <span className="font-serif text-[1.7rem] text-accent">M&amp;O</span>
      </div>
      <h3 className="font-serif text-subheading text-foreground mb-2">
        Roster coming soon
      </h3>
      <p className="font-body text-muted-foreground max-w-md">
        The Media, Communication &amp; Operations division is being formed. Member profiles will be published here shortly.
      </p>
    </div>
  );
}

/* ---------- LinkedIn glyph ---------- */

function LinkedInGlyph({
  href,
  label,
  className = '',
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={`inline-flex ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        width="23"
        height="23"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.66H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
      </svg>
    </a>
  );
}
