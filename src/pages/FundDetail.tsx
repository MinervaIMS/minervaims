import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { PageIntroduction, PageLoader } from '@/components/shared';
import { Fund, fundLabels, closedFunds } from '@/lib/types';
import { FundArchiveCarousel } from '@/components/shared/FundArchiveCarousel';
import { supabase } from '@/integrations/supabase/client';

// Background images for funds
import longShortBg from '@/assets/fund-long-short-bg.webp';
import multiAssetBg from '@/assets/fund-multi-asset-bg.webp';
import pirBg from '@/assets/fund-pir-bg.webp';
import dpsBg from '@/assets/fund-dps-bg.webp';

interface ArchiveFile {
  id: string;
  title: string;
  file_url: string;
  date: string;
  fund: string;
}
interface FundContent {
  title: string;
  subtitle: string;
  description: string;
  sectionTitle: string;
}

const fundContent: Record<Fund, FundContent> = {
  'multi-asset': {
    title: 'Multi Asset Global Opportunities Fund',
    subtitle: 'Global diversified portfolio across equities, bonds, commodities.',
    description: 'The Multi Asset Global Opportunities Fund is MIMS\' actively managed, disclosed portfolio investing in listed equities, sovereign and credit instruments, and commodities. The mandate targets long-term capital growth with controlled volatility through diversified, opportunity-driven allocation across geographies, currencies and sectors. Position sizing is guided by marginal risk contribution, correlations and liquidity, typically across ~30 holdings. The team publishes semi-annual rebalancing reports and interim adjustments around market dislocations. Derivatives are used only for currency and tail-risk hedging, never for net leverage.',
    sectionTitle: 'Latest Fund Updates',
  },
  'long-short': {
    title: 'Long Short Equity Fund',
    subtitle: 'Market-neutral equity strategy driven by multi-factor signals.',
    description: 'MIMS\' Long Short Equity Fund is a semi-automated, actively managed, zero-net-investment portfolio designed to deliver positive absolute returns across market regimes. The team builds a market-neutral book across US and European equities by ranking stocks through a proprietary multi-factor model (value, momentum, quality, low volatility, yield and illiquidity) and taking offsetting long and short positions. Signals are standardised and winsorised, with sector and geographic balance checks. Allocations are reviewed at each rebalancing and documented in periodic reports.',
    sectionTitle: 'Latest Fund Updates',
  },
  'dps': {
    title: 'Diversified Passive Selection Fund',
    subtitle: 'ETF-based allocation delivering diversified, low-idiosyncratic exposure.',
    description: 'ETF-only portfolio selecting UCITS instruments to express sector and macro themes while minimising idiosyncratic risk. The team sets strategic weights across equities, fixed income and commodities, diversified by region, sector and duration, and implements currency hedging where appropriate. Allocation is reviewed through semi-annual reports and interim adjustment notes when regimes shift (e.g., tariffs, fiscal shocks, rate repricing). Risk is monitored via VaR/Expected Shortfall and stress-aware duration management.',
    sectionTitle: 'Latest Fund Updates',
  },
  'pir': {
    title: 'Italian Equity PIR Fund',
    subtitle: 'Italian equity portfolio aligned with PIR investment rules.',
    description: 'The Italian Equity PIR Fund is MIMS\' actively managed, long-only portfolio investing exclusively in Italian equities within the PIR (Piano Individuale di Risparmio) framework. Portfolio construction combines a top-down view on the Italian macro backdrop with bottom-up single-name selection, while respecting PIR constraints on domestic issuers and minimum exposure to non-FTSE MIB constituents. Performance is assessed versus a blended FTSE MIB / FTSE Italia Mid-Small PIR benchmark, supported by VaR/Expected Shortfall risk monitoring.',
    sectionTitle: 'Latest Fund Updates',
  },
};

// Background images mapping
const fundBackgrounds: Record<Fund, string> = {
  'multi-asset': multiAssetBg,
  'long-short': longShortBg,
  'dps': dpsBg,
  'pir': pirBg,
};

const FundDetail = () => {
  const { fund } = useParams<{ fund: string }>();
  const [files, setFiles] = useState<ArchiveFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (fund && fundLabels[fund as Fund]) {
      fetchFiles();
    } else {
      setIsLoading(false);
    }
  }, [fund]);

  const fetchFiles = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('archive_files')
        .select('id, title, file_url, date, fund')
        .eq('fund', fund)
        .order('date', { ascending: false })
        .limit(8);

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!fund || !fundLabels[fund as Fund]) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return <PageLoader />;
  }

  const fundKey = fund as Fund;
  const content = fundContent[fundKey];
  const isClosed = closedFunds.includes(fundKey);
  const backgroundImage = fundBackgrounds[fundKey];

  return (
    <>
      {/* First Section: Title and Subtitle with Background */}
      <div className="relative">
        <div 
          className="absolute inset-0 bg-cover bg-center" 
          style={{ backgroundImage: `url(${backgroundImage})` }} 
        />
        <div className="relative z-10">
          <PageIntroduction
            title={content.title}
            description={content.subtitle}
            transparentBackground
          />
        </div>
      </div>

      {/* Second Section: Fund Overview */}
      <section className="py-section-sm md:py-section bg-background">
        <div className="container">
          <h2 className="font-serif text-xl sm:text-heading mb-6 pb-3 border-b border-separator text-accent">
            Fund Overview
          </h2>
          {isClosed && (
            <div className="mb-6 p-4 bg-muted border-l-2 border-primary">
              <p className="font-body text-body-lg text-muted-foreground">
                This fund is now closed. Historical reports are available below.
              </p>
            </div>
          )}
          <p className="font-body text-body-lg text-muted-foreground max-w-4xl">
            {content.description}
          </p>
        </div>
      </section>

      {/* Third Section: Latest Fund Updates */}
      <section className="py-section-sm md:py-section bg-accent">
        <div className="container">
          <h2 className="font-serif text-xl sm:text-heading mb-6 pb-3 border-b border-background/20 text-background">
            {content.sectionTitle}
          </h2>
          <FundArchiveCarousel fund={fundKey} files={files} />
        </div>
      </section>
    </>
  );
};

export default FundDetail;
