import { useSearchParams } from 'react-router-dom';
import { PageIntroduction, TeamDirectory } from '@/components/shared';
import { teamMembers } from '@/lib/data';
import { Division } from '@/lib/types';

const Team = () => {
  const [searchParams] = useSearchParams();
  const divisionParam = searchParams.get('division') as Division | null;

  return (
    <>
      <PageIntroduction
        title="Our Team"
        description="The people behind our research and portfolio management activities."
      />

      <div className="container py-section-sm md:py-section">
        <TeamDirectory 
          members={teamMembers} 
          showFilters={true}
          initialDivisionFilter={divisionParam || undefined}
        />
      </div>
    </>
  );
};

export default Team;
