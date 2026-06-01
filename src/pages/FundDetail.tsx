import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { PageIntroduction, PageLoader } from '@/components/shared';
import { Fund, fundLabels, closedFunds } from '@/lib/types';
import { FundArchiveCarousel } from '@/components/shared/FundArchiveCarousel';
import { supabase } from '@/integrations/supabase/client';
import { useImagePreload } from '@/hooks/useImagePreload';

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
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Get the background image for the current fund
  const backgroundImage = fund && fundLabels[fund as Fund] 
    ? fundBackgrounds[fund as Fund] 
    : '';
  
  const imagesLoaded = useImagePreload(backgroundImage ? [backgroundImage] : []);

  useEffect(() => {
    if (fund && fundLabels[fund as Fund]) {
      fetchFiles();
    } else {
      setIsDataLoading(false);
    }
  }, [fund]);

  const fetchFiles = async () => {
    setIsDataLoading(true);
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
      setIsDataLoading(false);
    }
  };

  if (!fund || !fundLabels[fund as Fund]) {
    return <Navigate to="/" replace />;
  }

  if (isDataLoading || !imagesLoaded) {
    return <PageLoader />;
  }

  const fundKey = fund as Fund;
  const content = fundContent[fundKey];
  const isClosed = closedFunds.includes(fundKey);

  return (
    <>
      <Helmet>
        <title>{content.title} | MIMS</title>
      </Helmet>
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

      {/* Performance Summary - long-short only */}
      {fundKey === 'long-short' && (
        <section className="py-section-sm md:py-section bg-background">
          <div className="container">
            <h2 className="font-serif text-xl sm:text-heading mb-6 pb-3 border-b border-separator text-accent">
              Performance Summary
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-body border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-separator bg-accent text-background font-body">
                    <th className="text-center py-3 pr-4"></th>
                    <th className="text-center py-3 px-3 font-semibold">ITD<sup>1,4</sup></th>
                    {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map(m => (
                      <th key={m} className="text-center py-3 px-2 font-normal">{m}</th>
                    ))}
                    <th className="text-center py-3 px-3 font-semibold">YTD<sup>4</sup></th>
                    <th className="text-center py-3 px-2">Vol<sup>4</sup></th>
                    <th className="text-center py-3 px-2">Sharpe<sup>2,4</sup></th>
                  </tr>
                </thead>
                <tbody className="text-foreground">
                  {[
                    { y: '2021', itd: '7.9%', months: ['','','','','','','','','','','+0.9%','+6.9%'], ytd: '+7.9%', vol: '4.6%', sharpe: '1.68' },
                    { y: '2022', itd: '29.1%', months: ['+9.3%','+0.1%','+0.7%','+4.9%','+2.2%','+0.6%','-3.7%','+2.2%','+0.9%','+1.0%','-1.0%','+1.5%'], ytd: '+19.6%', vol: '10.1%', sharpe: '1.61' },
                    { y: '2023', itd: '29.8%', months: ['-2.2%','+0.3%','+2.5%','+1.6%','-0.4%','+0.1%','-3.8%','+5.2%','+1.6%','+1.7%','-4.0%','-1.8%'], ytd: '+0.5%', vol: '7.0%', sharpe: '-0.64' },
                    { y: '2024', itd: '46.5%', months: ['+6.6%','+0.9%','-0.3%','+1.2%','+0.9%','-1.7%','+0.5%','+0.7%','-2.4%','+3.1%','+1.6%','+1.4%'], ytd: '+12.9%', vol: '6.0%', sharpe: '1.20' },
                    { y: '2025', itd: '58.3%', months: ['-1.1%','+0.3%','+1.0%','-1.6%','+2.1%','+2.4%','+2.2%','+0.5%','+1.6%','+0.3%','-0.85%','+0.86%'], ytd: '+8.01%', vol: '5.5%', sharpe: '0.73' },
                    { y: '2026', itd: '52.8%', months: ['-1.37%','-1.04%','-1.09%','','','','','','','','',''], ytd: '-2.17%', vol: '3.1%', sharpe: '-1.06' },
                  ].map(row => (
                    <tr key={row.y} className="border-b border-separator/60">
                      <td className="py-3 pr-4 font-serif text-accent text-center">{row.y}</td>
                      <td className="py-3 px-3 font-semibold text-accent bg-muted text-center">{row.itd}</td>
                      {row.months.map((v, i) => (
                        <td key={i} className="py-3 px-2 whitespace-nowrap text-center">{v}</td>
                      ))}
                      <td className="py-3 px-3 font-semibold text-accent bg-muted text-center">{row.ytd}</td>
                      <td className="py-3 px-2 text-center">{row.vol}</td>
                      <td className="py-3 px-2 text-center">{row.sharpe}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-6 font-body text-sm text-muted-foreground italic">
              Given its semi-automated approach and zero-net investment 'multi-factor' strategy, the portfolio does not have a reference benchmark<sup>3</sup> upon which to calculate the alpha.
            </p>
            <ol className="mt-4 font-body text-xs text-muted-foreground space-y-1 list-none">
              <li><sup>1</sup> ITD: Inception-to-date. Inception = 21/11/2021, Date = 24/04/2026.</li>
              <li><sup>2</sup> Sharpe Ratio computed with US 3-Months Treasury Bills Yields as risk-free rate proxy.</li>
              <li><sup>3</sup> Sortino Ratio computed with US 3-Months Treasury Bills Yields as risk-free rate proxy.</li>
              <li><sup>4</sup> The fund performance is calculated based on an evolving model with a simulated NAV.</li>
            </ol>
          </div>
        </section>
      )}

      {/* Performance Summary - multi-asset */}
      {fundKey === 'multi-asset' && (
        <section className="py-section-sm md:py-section bg-background">
          <div className="container">
            <h2 className="font-serif text-xl sm:text-heading mb-6 pb-3 border-b border-separator text-accent">
              Performance Summary
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-body border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-separator bg-accent text-background font-body">
                    <th className="text-center py-3 pr-4"></th>
                    <th className="text-center py-3 px-3 font-semibold">ITD<sup>1</sup></th>
                    {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map(m => (
                      <th key={m} className="text-center py-3 px-2 font-normal">{m}</th>
                    ))}
                    <th className="text-center py-3 px-3 font-semibold">YTD</th>
                    <th className="text-center py-3 px-2">Vol</th>
                    <th className="text-center py-3 px-2">Sharpe<sup>2</sup></th>
                  </tr>
                </thead>
                <tbody className="text-foreground">
                  {[
                    { y: '2020', itd: '15.1%', months: ['+0.1%','-0.3%','+0.1%','+1.4%','+3.4%','+1.9%','-1.8%','+1.2%','-1.4%','+2.2%','+5.0%','+2.6%'], ytd: '+15.1%', vol: '6.9%', sharpe: '2.18' },
                    { y: '2021', itd: '45.2%', months: ['+3.0%','+2.3%','+1.5%','+0.7%','+0.5%','+2.4%','+2.0%','+1.5%','-2.3%','+4.7%','+2.4%','+4.9%'], ytd: '+26.1%', vol: '6.6%', sharpe: '3.94' },
                    { y: '2022', itd: '35.7%', months: ['-2.0%','+0.4%','+2.1%','-2.8%','-0.2%','-7.8%','+6.5%','+5.1%','-9.2%','+3.7%','+2.9%','-4.1%'], ytd: '-6.6%', vol: '17.1%', sharpe: '-0.53' },
                    { y: '2023', itd: '36.6%', months: ['+0.2%','-2.1%','-0.3%','-0.3%','-1.0%','+1.3%','-1.5%','+0.1%','-3.7%','-0.7%','+7.3%','+1.8%'], ytd: '+0.7%', vol: '9.4%', sharpe: '-0.49' },
                    { y: '2024', itd: '38.4%', months: ['+0.5%','+0.2%','+1.6%','-0.4%','+0.4%','-0.1%','+0.7%','0.0%','-0.4%','-0.2%','+0.9%','-1.9%'], ytd: '+1.3%', vol: '3.0%', sharpe: '-1.24' },
                    { y: '2025', itd: '58.8%', months: ['+0.6%','+4.5%','-3.3%','+1.6%','+1.7%','-0.2%','+0.2%','+2.7%','+2.1%','+3.7%','-0.01%','+0.4%'], ytd: '+14.8%', vol: '7.1%', sharpe: '1.51' },
                    { y: '2026', itd: '69.9%', months: ['+5.8%','+1.1%','-2.0%','+4.1%','','','','','','','',''], ytd: '+9.1%', vol: '11.8%', sharpe: '0.67' },
                  ].map(row => (
                    <tr key={row.y} className="border-b border-separator/60">
                      <td className="py-3 pr-4 font-serif text-accent text-center">{row.y}</td>
                      <td className="py-3 px-3 font-semibold text-accent bg-muted text-center">{row.itd}</td>
                      {row.months.map((v, i) => (
                        <td key={i} className="py-3 px-2 whitespace-nowrap text-center">{v}</td>
                      ))}
                      <td className="py-3 px-3 font-semibold text-accent bg-muted text-center">{row.ytd}</td>
                      <td className="py-3 px-2 text-center">{row.vol}</td>
                      <td className="py-3 px-2 text-center">{row.sharpe}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-6 font-body text-sm text-muted-foreground italic">
              Given its dynamic, opportunity-driven mandate and its wide investment universe, the portfolio does not have a reference benchmark<sup>3</sup> upon which to calculate the alpha.
            </p>
            <ol className="mt-4 font-body text-xs text-muted-foreground space-y-1 list-none">
              <li><sup>1</sup> ITD: Inception-to-date. Inception = 31/1/2020.</li>
              <li><sup>2</sup> Sharpe Ratio computed with US 3-Months Treasury Bills Yields as risk-free rate proxy.</li>
              <li><sup>3</sup> Considering multi-strategy absolute-returns (HFRI index) would be the best proxy, but still far from our long-only no-leverage strategy.</li>
            </ol>
          </div>
        </section>
      )}

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
