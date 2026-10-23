import { useState, useEffect } from 'react';
import { Seo } from '@/components/shared/Seo';
import { FUND_META } from '@/lib/seo/routes';
import { fundDatasetSchema, fundSchema } from '@/lib/seo/structured-data';
import { FundPerformanceChart } from '@/components/shared/FundPerformanceChart';
import { useParams, Navigate } from 'react-router-dom';
import { PageIntroduction, PageLoader } from '@/components/shared';
import { HeroMarketBackground } from '@/components/home/HeroMarketBackground';
import type { SceneKey } from '@/components/home/market-scene/content';
import { Fund, fundLabels, closedFunds } from '@/lib/types';
import { ReportsSection, archiveFilesToReports, ArchiveFileRow } from '@/components/shared/ReportsSection';
import { supabase } from '@/integrations/supabase/client';
import { formatFundValue, listFundYears } from '@/lib/funds-api';

// Background images for funds
import { NumbersSection } from '@/components/numbers/NumbersSection';
import { FUND_CONTENT } from '@/lib/public-content';
import { FundTrackRecord } from '@/components/funds/FundTrackRecord';
import { fetchFundRecords } from '@/lib/fund-record-api';
import { fundRecordShown, type FundEntry, type RecordFund } from '@/lib/fund-record';
import { pageDataKey, readPageData } from '@/lib/page-data';

interface ArchiveFile extends ArchiveFileRow {
  id: string;
}

/** What the static copy of a fund page embeds for the app (lib/page-data.ts). */
export interface FundPageData {
  entry: FundEntry | null;
  reports: ArchiveFile[];
}
interface FundYearRow {
  year: number;
  itd: string;
  months: string[];
  ytd: string;
  vol: string;
  sharpe: string;
}

const fundContent = FUND_CONTENT;

const FundDetail = () => {
  const { fund } = useParams<{ fund: string }>();
  const [files, setFiles] = useState<ArchiveFile[]>([]);
  // The track record, computed by the database (Step 93). `null` until it
  // arrives, or when it cannot be read: then the typed table below is
  // shown instead, exactly as before.
  const [entry, setEntry] = useState<FundEntry | null>(null);
  const [perfRows, setPerfRows] = useState<FundYearRow[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);


  useEffect(() => {
    if (fund && fundLabels[fund as Fund]) {
      // A direct visit carries the build's copy of the figures: the page
      // shows exactly those, and reads nothing again (the number rule).
      const embedded = readPageData<FundPageData>(pageDataKey.fund(fund));
      if (embedded) {
        setFiles(embedded.reports);
        setEntry(embedded.entry);
        setPerfRows([]);
        setIsDataLoading(false);
        return;
      }
      fetchFiles();
    } else {
      setIsDataLoading(false);
    }
  }, [fund]);

  const fetchFiles = async () => {
    setIsDataLoading(true);
    try {
      const [filesRes, record] = await Promise.all([
        supabase
          .from('archive_files')
          .select('*')
          .eq('fund', fund)
          // Public surface: published reports only, and never a deleted one.
          .eq('status', 'published')
          .is('deleted_at', null)
          .order('date', { ascending: false })
          .limit(9),
        fetchFundRecords().then((snap) => snap.funds[fund as RecordFund] ?? null).catch(() => null),
      ]);

      if (filesRes.error) throw filesRes.error;
      setFiles(filesRes.data || []);
      setEntry(record);

      // THE TYPED TABLE, ONLY AS A FALLBACK. Before the track-record
      // function exists (or if it cannot be read) the page shows the cells
      // as the PM team typed them, as it always did. `listFundYears` is the
      // read the chart makes, so it costs no extra request.
      if (!record && (fund === 'long-short' || fund === 'multi-asset')) {
        const rows = await listFundYears().then((all) => all.filter((r) => r.fund === fund)).catch(() => []);
        setPerfRows(rows.map((r) => ({
          year: r.year,
          itd: r.itd ?? '',
          months: Array.from({ length: 12 }, (_, i) => (Array.isArray(r.months) ? (r.months[i] ?? '') : '')),
          ytd: r.ytd ?? '',
          vol: r.vol ?? '',
          sharpe: r.sharpe ?? '',
        })));
      } else {
        setPerfRows([]);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setIsDataLoading(false);
    }
  };

  if (!fund || !fundLabels[fund as Fund]) {
    return <Navigate to="/" replace />;
  }

  // The loader waits for the page's data only. The top of the page is a
  // moving scene drawn from the fund's latest reports (Step 93B): nothing
  // is downloaded for it, and the page never waits for it.
  if (isDataLoading) {
    return <PageLoader />;
  }

  const fundKey = fund as Fund;
  const content = fundContent[fundKey];
  const isClosed = closedFunds.includes(fundKey);
  const recordShown = fundRecordShown(entry);
  const legacyTable = !entry && perfRows.length > 0;

  return (
    <>
      {/* Each fund is its own subject, and each is described as an
          investment product as well as in prose, so a reader asking an
          assistant what Minerva actually runs gets the strategy rather
          than a page title. */}
      <Seo
        page={`/funds/${fundKey}`}
        title={FUND_META[fundKey]?.title ?? content.title}
        description={FUND_META[fundKey]?.description ?? content.subtitle}
        socialTitle={content.title}
        breadcrumbs={[
          { name: 'About', path: '/about' },
          { name: content.title, path: `/funds/${fundKey}` },
        ]}
        structuredData={[fundSchema(fundKey), recordShown && entry ? fundDatasetSchema(fundKey, entry, content.title) : null]}
      />
      {/* First Section: Title and Subtitle with Background */}
      {/* The title over the fund's own scene: its formulas and exhibits,
          from its latest reports (up to seven), passing above and below the title
          (Step 93B; market-scene/content.ts). */}
      <div data-page-hero className="relative overflow-hidden" style={{ backgroundColor: '#030209' }}>
        <HeroMarketBackground scene={`fund:${fundKey}` as SceneKey} form="band" />
        <div className="relative z-10">
          <PageIntroduction
            title={content.title}
            transparentBackground
            keepout
          />
        </div>
      </div>

      {/* Second Section: Fund Overview */}
      <section className="py-section-sm md:py-section bg-background">
        <div className="container">
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">
            {content.subtitle}
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

      {/* The track record as a curve, above the numbers it is drawn from. */}
      {(fundKey === 'long-short' || fundKey === 'multi-asset') && <FundPerformanceChart funds={[fundKey]} />}

      {/* THE TRACK RECORD (Step 93): the table, the statistics, the market
          references and the method, every figure computed from the monthly
          returns. A closed fund shows it once the PM team has typed its
          returns and its dates. */}
      {recordShown && entry && (
        <FundTrackRecord fund={fundKey as RecordFund} entry={entry} benchmarkNote={content.benchmarkNote} />
      )}

      {/* Performance Summary - long-short only */}
      {legacyTable && fundKey === 'long-short' && (
        <section className="pt-0 pb-section-sm md:pt-0 md:pb-section bg-background">
          <div className="container">
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
                  {perfRows.map(row => (
                    <tr key={row.year} className="border-b border-separator/60">
                      <td className="py-3 pr-4 font-body text-accent text-center">{row.year}</td>
                      <td className="py-3 px-3 font-semibold text-accent bg-muted text-center">{formatFundValue(row.itd, 'pct')}</td>
                      {row.months.map((v, i) => (
                        <td key={i} className="py-3 px-2 whitespace-nowrap text-center">{formatFundValue(v, 'signed-pct')}</td>
                      ))}
                      <td className="py-3 px-3 font-semibold text-accent bg-muted text-center">{formatFundValue(row.ytd, 'signed-pct')}</td>
                      <td className="py-3 px-2 text-center">{formatFundValue(row.vol, 'pct')}</td>
                      <td className="py-3 px-2 text-center">{formatFundValue(row.sharpe, 'ratio')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-6 font-body text-sm text-muted-foreground italic">
              Given its semi-automated approach and zero-net investment 'multi-factor' strategy, the portfolio does not have a reference benchmark upon which to calculate the alpha.
            </p>
            <ol className="mt-4 font-body text-xs text-muted-foreground space-y-1 list-none">
              <li><sup>1</sup> ITD: Inception-to-date. Inception = 03/12/2018.</li>
              <li><sup>2</sup> Sharpe Ratio computed with US 3-Months Treasury Bills Yields as risk-free rate proxy.</li>
              <li><sup>3</sup> Sortino Ratio computed with US 3-Months Treasury Bills Yields as risk-free rate proxy.</li>
              <li><sup>4</sup> The fund performance is calculated based on an evolving model with a simulated NAV.</li>
            </ol>
          </div>
        </section>
      )}

      {/* Performance Summary - multi-asset */}
      {legacyTable && fundKey === 'multi-asset' && (
        <section className="pt-0 pb-section-sm md:pt-0 md:pb-section bg-background">
          <div className="container">
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
                  {perfRows.map(row => (
                    <tr key={row.year} className="border-b border-separator/60">
                      <td className="py-3 pr-4 font-body text-accent text-center">{row.year}</td>
                      <td className="py-3 px-3 font-semibold text-accent bg-muted text-center">{formatFundValue(row.itd, 'pct')}</td>
                      {row.months.map((v, i) => (
                        <td key={i} className="py-3 px-2 whitespace-nowrap text-center">{formatFundValue(v, 'signed-pct')}</td>
                      ))}
                      <td className="py-3 px-3 font-semibold text-accent bg-muted text-center">{formatFundValue(row.ytd, 'signed-pct')}</td>
                      <td className="py-3 px-2 text-center">{formatFundValue(row.vol, 'pct')}</td>
                      <td className="py-3 px-2 text-center">{formatFundValue(row.sharpe, 'ratio')}</td>
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
      <ReportsSection
        variant="navy"
        heading={content.sectionTitle}
        archiveHref={`/archive?fund=${fundKey}`}
        archiveLabel="Browse The Full Archive"
        reports={archiveFilesToReports(files)}
        useRealCover
      />

      {/* <Page> in numbers: the last section before the footer (Step 92). */}
      <NumbersSection pageKey={`fund-${fundKey}`} />
    </>
  );
};

export default FundDetail;
