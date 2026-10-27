import { useState, useEffect, startTransition } from "react";
import { Seo } from '@/components/shared/Seo';
import { ReportsSection, archiveFilesToReports, ArchiveFileRow } from "@/components/shared/ReportsSection";
import AlumniTicker from "@/components/shared/AlumniTicker";
import { TestimonialsSection } from "@/components/shared/TestimonialsSection";
import { WorkspaceSection } from "@/components/shared/WorkspaceSection";
import { PageLoader } from "@/components/shared";
import DivisionScrollStack from "@/components/shared/DivisionScrollStack";
import { useKeyNumber } from "@/hooks/useKeyNumbers";
import { NumbersSection } from "@/components/numbers/NumbersSection";
import {
  applicationSettingsFromRow, useApplicationSettings, type ApplicationSettingsRow,
} from "@/hooks/useApplicationSettings";
import { useImagePreload } from "@/hooks/useImagePreload";
import { HomeHero, HOME_HERO_LOGO } from "@/components/home/HomeHero";
import { loadMarketScene } from "@/components/home/market-scene/load";
import { loadFundSeries } from "@/components/home/market-scene/fund-series";
import { supabase } from "@/integrations/supabase/client";
import { HOME_HERO_FIGURES, readBuildApplicationRow, takePrerenderedHome } from "@/lib/prerender";

interface ArchiveFile extends ArchiveFileRow {
  id: string;
}

// THE FUNDS CHART IS FETCHED WITH THE PAGE'S DATA, NOT WITH THE PAGE (Step
// 102). It is drawn with a charting library that was almost half of the
// homepage's script, for a section several screens down. The module is
// fetched as the page mounts, alongside the reports, and the part of the
// page below the hero waits for both, as it already waited for the reports,
// so it still arrives in one piece.
type FundChartModule = typeof import("@/components/shared/FundPerformanceChart");
let fundChart: FundChartModule | null = null;
const loadFundChart = () => import("@/components/shared/FundPerformanceChart").then((m) => { fundChart = m; return m; });

/**
 * THE THREE HERO FIGURES (Step 92, revised in Step 93).
 *
 * People see them as they always have: counting up over 3.2 seconds to
 * the figure rounded down to its ten, with a "+". The page text of each
 * figure is that final "250+" from the first frame, and the moving digits
 * are drawn over it without ever becoming text (see HeroFigure), so a
 * crawler or an assistant reading the page at any moment records the
 * final value. The values come from the key numbers registry, embedded in
 * the page by the build, so nothing waits for a request. The definition
 * and the as-of date are the tooltip.
 */
const Index = () => {
  const reportsFigure = useKeyNumber(HOME_HERO_FIGURES[0]);
  const membersFigure = useKeyNumber(HOME_HERO_FIGURES[1]);
  const alumniFigure = useKeyNumber(HOME_HERO_FIGURES[2]);
  const { settings: appSettings, isLoading: appSettingsLoading } = useApplicationSettings();
  // THE FIRST SCREEN MAY ALREADY BE ON SCREEN (Step 102, lib/prerender.ts).
  // When the homepage was opened directly, the build's copy of the hero is
  // in the page and the browser has drawn it: this mount draws the same
  // hero over it at once, carries on its count, and shows "Applications Are
  // Open" by the same row the build read until the live one has been read.
  // Reached in any other way, the page behaves exactly as before.
  const [firstScreen] = useState(takePrerenderedHome);
  const [builtRow] = useState(() => (firstScreen ? readBuildApplicationRow<ApplicationSettingsRow>() : null));
  const acceptingApplications = firstScreen && appSettingsLoading && builtRow
    ? applicationSettingsFromRow(builtRow).acceptingApplications
    : appSettings.acceptingApplications;
  const [carouselFiles, setCarouselFiles] = useState<ArchiveFile[]>([]);
  const [isCarouselLoading, setIsCarouselLoading] = useState(true);
  const [chartReady, setChartReady] = useState(() => fundChart !== null);
  // THE LOGO IS THE ONLY IMAGE THE HERO WAITS FOR NOW.
  // It used to wait for the photograph (2.1 MB) and the purple wash laid
  // over it as well, both of them before the loader could lift. The hero
  // ground is now drawn rather than downloaded (see HeroMarketBackground),
  // so neither is fetched on this page any more, and the only picture
  // left on the critical path is the one the reader actually looks at.
  const imagesLoaded = useImagePreload([HOME_HERO_LOGO]);

  // The moving scene's script is fetched NOW, alongside the page's data,
  // so it is already here when the hero mounts; so are the funds' records
  // its chart line is drawn from, which the performance chart further
  // down reads anyway (the two requests are one: see fund-series.ts).
  // Fetched, not waited for: nothing is drawn until the hero has painted,
  // and the loader never waits on either.
  useEffect(() => {
    loadMarketScene().catch(() => {
      // The CSS ground stands in; there is nothing to recover.
    });
    void loadFundSeries();
  }, []);


  useEffect(() => {
    fetchCarouselFiles();
  }, []);

  useEffect(() => {
    if (fundChart) return;
    let live = true;
    // A chunk that cannot be fetched does not hold the page: the section is
    // left out, and the failure reaches the site's usual recovery (main.tsx),
    // which reloads a page whose scripts a newer deploy has replaced.
    loadFundChart().finally(() => { if (live) startTransition(() => setChartReady(true)); });
    return () => { live = false; };
  }, []);

  const fetchCarouselFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('archive_files')
        .select('*')
        // Public surface: published reports only, and never a deleted one.
        .eq('status', 'published')
        .is('deleted_at', null)
        .order('date', { ascending: false })
        .limit(12);

      if (error) throw error;
      // Below the hero, out of sight: drawn in slices (Step 102), which
      // changes nothing on screen and keeps the page answering meanwhile.
      startTransition(() => setCarouselFiles(data || []));
    } catch (error) {
      console.error('Error fetching carousel files:', error);
    } finally {
      startTransition(() => setIsCarouselLoading(false));
    }
  };

  // ONE GATE, AND THE HERO IS COMPLETE WHEN IT LIFTS.
  //
  // This used to wait on the data alone, with a comment about letting the
  // hero render immediately for a better LCP. In practice the opposite
  // happened: the hero rendered, and what it rendered was an unfinished
  // composition that then changed brightness in front of the reader. An LCP
  // measured against a picture the design never intended to show is not a
  // faster page, it is an earlier wrong one.
  //
  // `imagesLoaded` was already being computed here and simply never used.
  // Adding it to the gate costs nothing on the ordinary path, because the two
  // Supabase queries above are almost always the slower half, and it cannot
  // strand anybody: the preload hook gives up after its own cap and reports
  // ready regardless. This is the site's existing loader, unchanged; no new
  // loading system is introduced.
  // The figures no longer hold the page: they are in it from the start.
  //
  // Over the first screen drawn from the HTML the hero is complete already
  // (its logo is the picture that screen waited for), so only what lies
  // below it waits for the reports, out of sight, and arrives in one piece.
  if (!firstScreen && (isCarouselLoading || !imagesLoaded || !chartReady)) {
    return <PageLoader />;
  }
  const restReady = !isCarouselLoading && chartReady;
  const FundPerformanceChart = fundChart?.FundPerformanceChart;

  return (
    <>
      <Seo page="/" />

      {/* Hero Section (components/home/HomeHero: the build draws the same one) */}
      <HomeHero
        reportsFigure={reportsFigure}
        membersFigure={membersFigure}
        alumniFigure={alumniFigure}
        acceptingApplications={acceptingApplications}
        countFrom={firstScreen?.countFrom ?? null}
      />

      {restReady && (<>
      {/* About Preview */}
      <section className="py-section-sm md:py-section bg-background">
        <div className="container">
          {/* TWO SENTENCES, CENTRED, AND NOTHING ELSE. */}
          <div className="mx-auto max-w-4xl text-center py-4 md:py-10">
            <p className="font-serif text-heading md:text-display leading-[1.2] text-accent text-balance whitespace-pre-line">
              We research <em>markets</em>, author quantitative <em>publications</em>, run virtual <em>funds</em>,&nbsp;
              {"\n"}while learning from each other and from the <em>best professionals</em> in the industry.{"\n"}
            </p>
            <div className="mx-auto mt-10 md:mt-14 w-12 border-t border-separator" />
            <p className="mx-auto mt-10 md:mt-14 max-w-2xl font-body text-body md:text-body-lg leading-relaxed text-muted-foreground">
              Founded at Bocconi in 2017, Minerva Investment Management Society is the University's leading association
              dedicated to asset management, organised as an investment management firm, with research divisions and a
              portfolio management team accountable for the funds.
            </p>
          </div>
        </div>
      </section>


      {/* Our Divisions (scroll-driven card stack) */}
      <section className="pt-section-sm md:pt-section pb-section-sm md:pb-section bg-background">
        <DivisionScrollStack />
      </section>

      {/* Funds Performance (same chart as Portfolio Management).
          THE ONE UNEVEN BOUNDARY ON THE PAGE. The chart section opens with
          `pt-0` because on a division or fund page it follows a block of
          its own; here it followed a section that had already closed, so
          this was the only join on the homepage with half the rhythm. The
          wrapper restores it without touching the component or the other
          pages that use it. */}
      <div className="bg-background pt-section-sm md:pt-section">
        {FundPerformanceChart && <FundPerformanceChart funds={['long-short', 'multi-asset']} title="Funds Performance" />}
      </div>

      {/* Alumni Ticker */}
      <AlumniTicker />

      {/* Alumni Testimonials, immediately above the reports they introduce */}
      <TestimonialsSection />

      {/* Latest Reports */}
      <ReportsSection
        variant="cards"
        heading="Latest Reports"
        archiveHref="/archive"
        archiveLabel="Browse The Reports"
        reports={archiveFilesToReports(carouselFiles, { preferDivision: true })}
        useRealCover
      />

      {/* The workspace the association is run from. Last on the page on
          purpose: it is the one section addressed to somebody who has
          already read what Minerva does and is now wondering how it is
          actually operated. */}
      <WorkspaceSection />

      {/* Minerva in numbers: the last section before the footer (Step 92). */}
      <NumbersSection pageKey="home" />
      </>)}
    </>
  );
};

export default Index;
