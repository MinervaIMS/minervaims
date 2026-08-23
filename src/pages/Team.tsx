import { useCallback, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { PageIntroduction, MembersDirectory, PageLoader } from '@/components/shared';
import { OrgChart } from '@/components/shared/OrgChart';
import { supabase } from '@/integrations/supabase/client';
import { Division } from '@/lib/types';
import { useImagePreload } from '@/hooks/useImagePreload';
import { HERO_OVERLAY_URL } from '@/lib/hero-overlay';
import teamBgAsset from '@/assets/mims-members.webp.asset.json';

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
  const teamBg = teamBgAsset.url;
  const [searchParams] = useSearchParams();
  const divisionParam = searchParams.get('division') as Division | null;
  const [members, setMembers] = useState<DbTeamMember[]>([]);
  // Which team the directory is showing, so the chart below opens on it.
  const [activeTab, setActiveTab] = useState<string>(divisionParam ?? 'executive');
  const [isDataLoading, setIsDataLoading] = useState(true);
    // The dark wash over the hero is a SECOND downloaded image, not a gradient
  // (see lib/hero-overlay.ts). Preloading it with the photograph is what stops
  // the page opening on the bright, unshaded picture and darkening a moment
  // later. Both `.hero-overlay` and `.page-intro-overlay` use this same asset.
  const imagesLoaded = useImagePreload([teamBg, HERO_OVERLAY_URL]);


  useEffect(() => {
    (async () => {
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
    })();
  }, []);

  const transformedMembers = members.map((m) => ({
    id: m.id,
    name: m.name,
    surname: m.surname,
    position: m.position as any,
    division: (m.division as Division | null) ?? undefined,
    fund: (m.fund as any) ?? undefined,
    photoUrl: m.photo_url || undefined,
    linkedinUrl: m.linkedin_url || undefined,
    isBoard: m.is_board,
    displayOrder: m.display_order,
  }));

  if (isDataLoading || !imagesLoaded) {
    return <PageLoader />;
  }

  const totalMembers = transformedMembers.length;

  return (
    <>
      <Helmet>
        <title>Members | MIMS</title>
      </Helmet>
      <div data-page-hero>
        <PageIntroduction
          title="Members"
          backgroundImage={teamBg}
        />
      </div>

      {/* Intro block */}
      <section className="pt-section-sm md:pt-section pb-10 md:pb-12 bg-background">
        <div className="container">
          <div className="flex items-baseline justify-between gap-4 mb-6 pb-3 border-b border-separator">
            <h2 className="font-serif text-heading text-accent">
              The Team Behind the Work
            </h2>
          </div>
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <p className="font-body text-body-lg text-muted-foreground max-w-[46rem] flex-1">
              Our members operate in a structured, professional environment modelled on a real investment firm: four&nbsp;research divisions feeding a central Portfolio Management team, supported by Media, Communication &amp; Operations. Each team meets regularly to develop investment views, produce publishable research and support disciplined portfolio decisions.
            </p>
            <a
              href="#organisational-structure"
              className="cta-link whitespace-nowrap shrink-0"
            >
              Roles &amp; Divisions
            </a>
          </div>
        </div>
      </section>

      {/* Members directory */}
      <section className="pb-section-sm md:pb-section bg-background">
        <div className="container">
          <MembersDirectory
            members={transformedMembers}
            initialDivisionFilter={divisionParam || undefined}
            onActiveTabChange={setActiveTab}
          />
        </div>
      </section>

      {/* The same chart that explains the structure on /about, closing this
          page already open on the team the directory is showing, so the
          reader sees where those people sit without changing page. The call
          to action is dropped: this IS the team page. */}
      <section id="organisational-structure" className="bg-background pb-section-sm md:pb-section">
        <div className="container">
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">
            Roles &amp; Divisions
          </h2>
          <OrgChart initialFocus={activeTab} showCta={false} />
        </div>
      </section>
    </>
  );
};

export default Team;
