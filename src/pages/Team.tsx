import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { PageIntroduction, TeamDirectory, PageLoader } from '@/components/shared';
import { supabase } from '@/integrations/supabase/client';
import { Division } from '@/lib/types';
import { useImagePreload } from '@/hooks/useImagePreload';
import teamBg from '@/assets/team-bg.webp';

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
  const [isDataLoading, setIsDataLoading] = useState(true);
  const imagesLoaded = useImagePreload([teamBg]);

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
      setIsDataLoading(false);
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
    displayOrder: m.display_order,
  }));

  if (isDataLoading || !imagesLoaded) {
    return <PageLoader />;
  }

  return (
    <>
      <Helmet>
        <title>Members | MIMS</title>
      </Helmet>
      <PageIntroduction
        title="Members"
        backgroundImage={teamBg}
      />

      {/* Description Section */}
      <section className="pt-section-sm md:pt-section pb-12 md:pb-16 bg-background">
        <div className="container">
          <h2 className="font-serif text-xl sm:text-heading mb-6 pb-3 border-b border-separator text-accent">
            The Team Behind the Work
          </h2>
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <p className="font-body text-body-lg text-muted-foreground max-w-3xl flex-1">
              Our members operate in a structured, professional environment across research divisions and portfolio management. Each team meets regularly to develop investment views, produce publishable outputs, and support disciplined portfolio decisions.
            </p>
            <Link
              to="/about#organisational-structure"
              className="cta-link whitespace-nowrap shrink-0"
            >
              How We Are Structured
            </Link>
          </div>
        </div>
      </section>

      <div className="container pb-section-sm md:pb-section">
        <TeamDirectory 
          members={transformedMembers} 
          showFilters={true}
          initialDivisionFilter={divisionParam || undefined}
        />
      </div>
    </>
  );
};

export default Team;
