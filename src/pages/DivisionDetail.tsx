import { useState, useEffect } from 'react';
import { Seo } from '@/components/shared/Seo';
import { DIVISION_META } from '@/lib/seo/routes';
import { FundPerformanceChart } from '@/components/shared/FundPerformanceChart';
import { useParams, Link, Navigate } from 'react-router-dom';
import { PageIntroduction, PageLoader } from '@/components/shared';
import { Division, divisionLabels, Fund, fundLabels, activeFunds, closedFunds } from '@/lib/types';
import { ReportsSection, archiveFilesToReports, ArchiveFileRow } from '@/components/shared/ReportsSection';
import { supabase } from '@/integrations/supabase/client';
import { HeroMarketBackground } from '@/components/home/HeroMarketBackground';
import type { SceneKey } from '@/components/home/market-scene/content';
import { NumbersSection } from '@/components/numbers/NumbersSection';
import { DIVISION_CONTENT, FUND_DESCRIPTIONS } from '@/lib/public-content';
import { DivisionWork, type DivisionPageRow } from '@/components/divisions/DivisionWork';
import { pageDataKey, readPageData } from '@/lib/page-data';

interface ArchiveFile extends ArchiveFileRow {
  id: string;
}

/** What the static copy of a division page embeds for the app (lib/page-data.ts). */
export interface DivisionPageData {
  reports: ArchiveFile[];
  page: DivisionPageRow | null;
  flagship: ArchiveFile[];
}


const divisionContent = DIVISION_CONTENT;

const fundDescriptions = FUND_DESCRIPTIONS;

const DivisionDetail = () => {
  const { division } = useParams<{ division: string }>();
  const [files, setFiles] = useState<ArchiveFile[]>([]);
  // "How we work" and "Flagship work" (Step 93), written by the Head.
  const [work, setWork] = useState<DivisionPageRow | null>(null);
  const [flagship, setFlagship] = useState<ArchiveFile[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  

  useEffect(() => {
    if (division && divisionLabels[division as Division]) {
      const embedded = readPageData<DivisionPageData>(pageDataKey.division(division));
      if (embedded) {
        setFiles(embedded.reports);
        setWork(embedded.page);
        setFlagship(embedded.flagship);
        setIsDataLoading(false);
        return;
      }
      fetchFiles();
    } else {
      setIsDataLoading(false);
    }
  }, [division]);

  const fetchFiles = async () => {
    setIsDataLoading(true);
    try {
      const [filesRes, pageRes] = await Promise.all([
        supabase
          .from('archive_files')
          .select('*')
          .eq('division', division)
          // Public surface: published reports only, and never a deleted one.
          .eq('status', 'published')
          .is('deleted_at', null)
          .order('date', { ascending: false })
          .limit(9),
        // Before the Step 93 migration the table does not exist: the
        // read fails quietly and the two blocks simply stay hidden.
        supabase.from('division_pages').select('*').eq('division', division).maybeSingle(),
      ]);

      if (filesRes.error) throw filesRes.error;
      setFiles(filesRes.data || []);
      const page = pageRes.error ? null : (pageRes.data as DivisionPageRow | null);
      setWork(page);
      const ids = page?.flagship_ids ?? [];
      if (ids.length) {
        const { data: picked } = await supabase
          .from('archive_files').select('*').in('id', ids)
          .eq('status', 'published').is('deleted_at', null);
        // In the order the Head chose them.
        setFlagship(ids.map((id) => (picked || []).find((f) => f.id === id)).filter((f): f is NonNullable<typeof f> => !!f));
      } else {
        setFlagship([]);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setIsDataLoading(false);
    }
  };

  if (!division || !divisionLabels[division as Division]) {
    return <Navigate to="/divisions" replace />;
  }

  // The loader waits for the page's data only. The top of the page is a
  // moving scene drawn from the division's latest reports (Step 93B):
  // nothing is downloaded for it, and the page never waits for it.
  if (isDataLoading) {
    return <PageLoader />;
  }

  const divisionKey = division as Division;
  const content = divisionContent[divisionKey];
  const isPortfolio = divisionKey === 'portfolio';

  // Combine active and closed funds for the portfolio section
  const allFunds: { fund: Fund; isActive: boolean }[] = [
    ...activeFunds.map(f => ({ fund: f, isActive: true })),
    ...closedFunds.map(f => ({ fund: f, isActive: false })),
  ];

  return (
    <div className="theme-division-accent">
      {/* A division is a subject of its own: somebody searching for
          "student equity research Bocconi" should land here rather than on
          the homepage. The title and the sentence come from the SEO
          registry, which holds a description written for a search result;
          the page's own longer prose stays where it is. */}
      <Seo
        page={`/divisions/${divisionKey}`}
        title={DIVISION_META[divisionKey]?.title ?? content.title}
        description={DIVISION_META[divisionKey]?.description ?? content.subtitle}
        socialTitle={content.title}
        breadcrumbs={[
          { name: 'About', path: '/about' },
          { name: content.title, path: `/divisions/${divisionKey}` },
        ]}
      />
      {/* First Section: the title over the division's own scene: its
          formulas and exhibits, from its latest seven reports, passing
          above and below the title (Step 93B; market-scene/content.ts). */}
      <div data-page-hero className="relative overflow-hidden" style={{ backgroundColor: '#030209' }}>
        <HeroMarketBackground scene={`division:${divisionKey}` as SceneKey} form="band" />
        <div className="relative z-10">
          <PageIntroduction
            title={content.title}
            transparentBackground
            keepout
          />
        </div>
      </div>

      {/* Second Section: Our Expertise */}
      <section className="py-section-sm md:py-section bg-background">
        <div className="container">
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">
            {content.subtitle}
          </h2>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 md:gap-12">
            <p className="font-body text-body-lg text-muted-foreground max-w-3xl">
              {content.description}
            </p>
            <Link
              to={`/people/members?division=${divisionKey}`}
              className="cta-link whitespace-nowrap shrink-0"
            >
              Meet the Team
            </Link>
          </div>
        </div>
      </section>

      {/* Both live mandates on one pair of axes, directly below the funds
          they belong to, so the two track records can be read together.
          Either line can be switched off on the chart itself. */}
      {isPortfolio && (
        <FundPerformanceChart
          funds={['long-short', 'multi-asset']}
          title="Funds Performance"
        />
      )}

      {/* Portfolio Management: MIMS Virtual Portfolios Section */}
      {isPortfolio && (
        <section className="pt-0 pb-section-sm md:pt-0 md:pb-section bg-background">
          <div className="container">
            <h2 className="font-serif text-heading mb-8 pb-3 border-b border-separator text-accent">
              MIMS Virtual Funds
            </h2>
            <div className="flex flex-col gap-[.7rem] md:gap-4">
              {allFunds.map(({ fund }) => (
                <Link
                  key={fund}
                  to={`/funds/${fund}`}
                  className="group bg-muted p-6 md:p-7 grid grid-cols-1 md:grid-cols-[minmax(0,18rem)_1fr] gap-3 md:gap-10 items-baseline transition-colors duration-300 ease-out hover:bg-[#ece9f4] focus-within:bg-[#ece9f4]"
                >
                  <h3 className="font-serif text-subheading text-foreground transition-transform duration-300 ease-out group-hover:-translate-y-[2px]">
                    {fundLabels[fund]}
                  </h3>
                  <p className="font-body text-body-lg text-muted-foreground">
                    {fundDescriptions[fund]}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How we work, and the three reports the Head chose (Step 93). Each
          block stays hidden while it is empty. */}
      <DivisionWork page={work} flagship={flagship} />

      {/* Third Section: Latest Reports/Publications */}
      <ReportsSection
        variant="navy"
        heading={content.sectionTitle}
        archiveHref={`/archive?division=${divisionKey}`}
        archiveLabel="Browse The Full Archive"
        reports={archiveFilesToReports(files)}
        useRealCover
      />

      {/* <Page> in numbers: the last section before the footer (Step 92). */}
      <NumbersSection pageKey={`division-${divisionKey}`} />
    </div>
  );
};

export default DivisionDetail;
