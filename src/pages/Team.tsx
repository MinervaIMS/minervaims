import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageIntroduction, TeamDirectory } from '@/components/shared';
import { supabase } from '@/integrations/supabase/client';
import { Division } from '@/lib/types';
import teamBg from '@/assets/team-bg.png';

interface DbTeamMember {
  id: string;
  name: string;
  surname: string;
  position: string;
  division: string | null;
  fund: string | null;
  photo_url: string | null;
  linkedin_url: string | null;
  is_board: boolean;
  display_order: number;
}

const Team = () => {
  const [searchParams] = useSearchParams();
  const divisionParam = searchParams.get('division') as Division | null;
  const [members, setMembers] = useState<DbTeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .order('display_order', { ascending: true })
        .order('surname', { ascending: true });

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching team members:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Transform database members to the format expected by TeamDirectory
  const transformedMembers = members.map(m => ({
    id: m.id,
    name: m.name,
    surname: m.surname,
    position: m.position as any,
    division: m.division as Division | undefined,
    fund: m.fund as any,
    photoUrl: m.photo_url || undefined,
    linkedinUrl: m.linkedin_url || undefined,
    isBoard: m.is_board,
  }));

  return (
    <>
      <PageIntroduction
        title="Our Team"
        backgroundImage={teamBg}
      />

      {/* Description Section */}
      <section className="py-section-sm md:py-section bg-background">
        <div className="container">
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator">
            The Team Behind the Work
          </h2>
          <p className="font-body text-body-lg text-muted-foreground max-w-4xl">
            Our members operate in a structured, professional environment across research divisions and portfolio management. Each team meets regularly to develop investment views, produce publishable outputs, and support disciplined portfolio decisions.
          </p>
        </div>
      </section>

      <div className="container py-section-sm md:py-section">
        {isLoading ? (
          <p className="font-body text-muted-foreground">Loading team...</p>
        ) : (
          <TeamDirectory 
            members={transformedMembers} 
            showFilters={true}
            initialDivisionFilter={divisionParam || undefined}
          />
        )}
      </div>
    </>
  );
};

export default Team;
