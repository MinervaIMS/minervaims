import { useState, useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { PageIntroduction, PageLoader } from '@/components/shared';
import { Division, divisionLabels, Fund, fundLabels, activeFunds, closedFunds } from '@/lib/types';
import { ReportsSection, archiveFilesToReports, ArchiveFileRow } from '@/components/shared/ReportsSection';
import { supabase } from '@/integrations/supabase/client';
import { useImagePreload } from '@/hooks/useImagePreload';

// Background images for each division
import equityBgAsset from '@/assets/MIMS_Equity_Research.webp.asset.json';
import investmentBgAsset from '@/assets/mims-investment-research.webp.asset.json';
import macroBgAsset from '@/assets/MIMS_Macro_Research.webp.asset.json';
import portfolioBgAsset from '@/assets/MIMS_Portfolio_Management.webp.asset.json';
import quantBgAsset from '@/assets/mims-quant-research.webp.asset.json';

interface ArchiveFile extends ArchiveFileRow {
  id: string;
}

// Division content configuration
interface DivisionContent {
  title: string;
  subtitle: string;
  description: string;
  sectionTitle: string;
}

const divisionContent: Record<Division, DivisionContent> = {
  equity: {
    title: 'Equity Research',
    subtitle: 'Company analysis with valuation models and investment theses.',
    description: 'Equity Research produces single-name coverage reports across sectors, translating business fundamentals into actionable, risk-aware views. Each report combines industry and competitive analysis, full financial statement modelling, and a dual valuation framework (discounted cash flow and relative multiples) to derive a target price and recommendation. Work is organised in small coverage teams led by a Lead Analyst, under the oversight of the Division\'s Co-Heads, with standardised sections on thesis, catalysts, and key risks.',
    sectionTitle: 'Latest Reports',
  },
  investment: {
    title: 'Investment Research',
    subtitle: 'Cross-asset views, scenarios, and actionable market positioning',
    description: 'Investment Research delivers cross-asset strategy for MIMS\' virtual portfolios, translating macro conditions into actionable positioning. The team publishes periodic Global Outlooks and Trade Ideas covering growth, inflation and policy scenarios, tactical asset-allocation views, and focused recommendations across equities, rates/credit, FX and commodities. Structured under a Head/Co-Head, research is organised into specialist desks — Equities Strategy, Fixed Income, and FX & Commodities — each led by senior strategists and supported by analysts.',
    sectionTitle: 'Latest Outlooks',
  },
  macro: {
    title: 'Macro Research',
    subtitle: 'Global policy analysis with clear market transmission channels.',
    description: 'Macro Research produces thematic reports on global policy regimes and structural shifts in the international economy, linking macro narratives to market channels. Recent work spans monetary-policy scenarios across major economies, Europe\'s growth divergences and fiscal sustainability, China\'s rebalancing/deflation risks, and the move from dollarisation toward a more multipolar monetary system, including payments infrastructure. The division is led by a Head and Co-Head, supported by group leaders and analysts who build data-backed frameworks, scenarios and cross-asset implications.',
    sectionTitle: 'Latest Reports',
  },
  portfolio: {
    title: 'Portfolio Management',
    subtitle: 'Converts research into disciplined portfolios and rebalancing',
    description: 'The Portfolio Management Division designs, runs and reports on MIMS\'s proprietary student-managed portfolios, translating research into implementable allocations across equities, rates and commodities. The team sets strategic views, builds diversified portfolios, sizes positions via risk contribution and liquidity, and rebalances semi-annually with interim adjustments around market dislocations. Analysts conduct security and trade due diligence, monitor performance and exposures, and maintain transparent holdings disclosure. Derivatives are used only to hedge currency and tail risks, not to add net leverage.',
    sectionTitle: 'Latest Funds Updates',
  },
  quant: {
    title: 'Quantitative Research',
    subtitle: 'Models and tools for risk, forecasting, derivatives.',
    description: 'Quantitative Research applies advanced mathematical and statistical methods to open problems at the frontier of financial markets. The division develops models for risk measurement, forecasting and derivatives pricing, drawing on probability theory, statistical inference, optimisation and machine learning. Since the most interesting problems sit at the intersection of disciplines, the team deliberately brings together students from different quantitative backgrounds. Mathematics, economics, finance, AI and computer science all have a seat at the table: each member brings their own expertise and way of framing problems, and builds new ones by working alongside people who were trained entirely differently, replicating the collaborative structure of a real quantitative research team.',
    sectionTitle: 'Latest Research Publications',
  },
};

// Background images mapping
const divisionBackgrounds: Record<Division, string> = {
  equity: equityBgAsset.url,
  investment: investmentBgAsset.url,
  macro: macroBgAsset.url,
  portfolio: portfolioBgAsset.url,
  quant: quantBgAsset.url,
};

// Fund descriptions for the Portfolio Management page
const fundDescriptions: Record<Fund, string> = {
  'multi-asset': 'Global diversified portfolio across equities, bonds, commodities.',
  'long-short': 'Market-neutral equity strategy driven by multi-factor signals.',
  'dps': 'ETF-based allocation delivering diversified, low-idiosyncratic exposure.',
  'pir': 'Italian equity portfolio aligned with PIR investment rules.',
};

const DivisionDetail = () => {
  const { division } = useParams<{ division: string }>();
  const [files, setFiles] = useState<ArchiveFile[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  
  // Get the background image for the current division
  const backgroundImage = division && divisionLabels[division as Division] 
    ? divisionBackgrounds[division as Division] 
    : '';
  
  const imagesLoaded = useImagePreload(backgroundImage ? [backgroundImage] : []);

  useEffect(() => {
    if (division && divisionLabels[division as Division]) {
      fetchFiles();
    } else {
      setIsDataLoading(false);
    }
  }, [division]);

  const fetchFiles = async () => {
    setIsDataLoading(true);
    try {
      const { data, error } = await supabase
        .from('archive_files')
        .select('id, title, description, file_url, date, division, fund')
        .eq('division', division)
        .order('date', { ascending: false })
        .limit(9);

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setIsDataLoading(false);
    }
  };

  if (!division || !divisionLabels[division as Division]) {
    return <Navigate to="/divisions" replace />;
  }

  if (isDataLoading || !imagesLoaded) {
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
      <Helmet>
        <title>{content.title} | MIMS</title>
      </Helmet>
      {/* First Section: Title and Subtitle with Background */}
      <div data-page-hero className="relative">
        <div 
          className="absolute inset-0 bg-cover bg-center" 
          style={{ backgroundImage: `url(${backgroundImage})` }} 
        />
        <div className="absolute inset-0 hero-overlay" />
        <div className="relative z-10">
          <PageIntroduction
            title={content.title}
            transparentBackground
          />
        </div>
      </div>

      {/* Second Section: Our Expertise */}
      <section className="py-section-sm md:py-section bg-background">
        <div className="container">
          <h2 className="font-serif text-xl sm:text-heading mb-6 pb-3 border-b border-separator text-accent">
            {content.subtitle}
          </h2>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 md:gap-12">
            <p className="font-body text-body-lg text-muted-foreground max-w-3xl">
              {content.description}
            </p>
            <Link
              to="/people/members"
              className="cta-link whitespace-nowrap shrink-0"
            >
              Meet the Team
            </Link>
          </div>
        </div>
      </section>

      {/* Portfolio Management: MIMS Virtual Portfolios Section */}
      {isPortfolio && (
        <section className="pt-0 pb-section-sm md:pt-0 md:pb-section bg-background">
          <div className="container">
            <h2 className="font-serif text-xl sm:text-heading mb-8 pb-3 border-b border-separator text-accent">
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

      {/* Third Section: Latest Reports/Publications */}
      <ReportsSection
        variant="navy"
        heading={content.sectionTitle}
        archiveHref={`/archive?division=${divisionKey}`}
        archiveLabel="Browse The Archive"
        reports={archiveFilesToReports(files)}
        useRealCover
      />
    </div>
  );
};

export default DivisionDetail;
