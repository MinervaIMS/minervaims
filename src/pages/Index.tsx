import { useState, useEffect } from "react";
import { Seo } from '@/components/shared/Seo';
import { Link } from "react-router-dom";
import logoWhite from "@/assets/footer-logo.svg";
import { ReportsSection, archiveFilesToReports, ArchiveFileRow } from "@/components/shared/ReportsSection";
import AlumniTicker from "@/components/shared/AlumniTicker";
import { TestimonialsSection } from "@/components/shared/TestimonialsSection";
import { WorkspaceSection } from "@/components/shared/WorkspaceSection";
import { PageLoader } from "@/components/shared";
import DivisionScrollStack from "@/components/shared/DivisionScrollStack";
import { FundPerformanceChart } from "@/components/shared/FundPerformanceChart";
import { useKeyNumber } from "@/hooks/useKeyNumbers";
import { HeroFigure } from "@/components/numbers/HeroFigure";
import { NumbersSection } from "@/components/numbers/NumbersSection";
import { describeKeyNumber } from "@/lib/key-numbers";
import { useApplicationSettings } from "@/hooks/useApplicationSettings";
import { useImagePreload } from "@/hooks/useImagePreload";
import { HeroMarketBackground } from "@/components/home/HeroMarketBackground";
import { loadMarketScene } from "@/components/home/market-scene/load";
import { loadFundSeries } from "@/components/home/market-scene/fund-series";
import { supabase } from "@/integrations/supabase/client";
import { ApplicationsOpenLabel } from "@/components/shared/ApplicationsOpenLabel";
import { HIGH_FETCH_PRIORITY } from '@/lib/fetch-priority';

interface ArchiveFile extends ArchiveFileRow {
  id: string;
}

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
  const reportsFigure = useKeyNumber('reports_published');
  const membersFigure = useKeyNumber('active_members');
  const alumniFigure = useKeyNumber('alumni');
  const { settings: appSettings } = useApplicationSettings();
  const [carouselFiles, setCarouselFiles] = useState<ArchiveFile[]>([]);
  const [isCarouselLoading, setIsCarouselLoading] = useState(true);
  // THE LOGO IS THE ONLY IMAGE THE HERO WAITS FOR NOW.
  // It used to wait for the photograph (2.1 MB) and the purple wash laid
  // over it as well, both of them before the loader could lift. The hero
  // ground is now drawn rather than downloaded (see HeroMarketBackground),
  // so neither is fetched on this page any more, and the only picture
  // left on the critical path is the one the reader actually looks at.
  const imagesLoaded = useImagePreload([logoWhite]);

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
      setCarouselFiles(data || []);
    } catch (error) {
      console.error('Error fetching carousel files:', error);
    } finally {
      setIsCarouselLoading(false);
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
  if (isCarouselLoading || !imagesLoaded) {
    return <PageLoader />;
  }

  return (
    <>
      <Seo page="/" />

      {/* Hero Section */}
      <section data-page-hero className="relative min-h-screen flex flex-col">
        {/* THE DARK BLOCK, AND ONLY IT, CARRIES THE BACKGROUND.
            It used to be `inset-0` on the whole hero, which includes the
            white figures band beneath, so the part a reader saw was never
            the middle of it. Bounding it to the block it is seen in keeps
            the composition centred on the logo. It is the moving research
            scene now, where it was a photograph: see HeroMarketBackground.

            It is also the element the navbar measures. `data-nav-flip`
            marks the end of the dark ground, so the header turns solid the
            moment the white band reaches it rather than a whole band
            later. */}
        <div
          data-nav-flip
          className="relative flex-1 flex items-center justify-center text-center px-6 pt-20 pb-20 md:pt-24 md:pb-24"
        >
          <HeroMarketBackground />
          <div className="relative z-10">
            {/* THE PAGE HAS A HEADING NOW.
                The homepage's title is a logotype, which is right for the
                design and wrong for everything that reads structure: the
                document had no <h1> at all, so a screen reader announcing
                the page and a search engine deciding what it is about both
                had only the <title> to work from. A visually hidden h1
                states it in words, changing nothing on screen. */}
            <h1 className="sr-only">
              Minerva Investment Management Society, the Bocconi University student society for investment research and portfolio management
            </h1>
            {/* `data-hero-keepout` marks what the moving background lays
                itself out around: it measures these two and keeps its
                legible pieces clear of them. */}
            <img
              src={logoWhite}
              alt="Minerva Investment Management Society"
              className="h-48 md:h-64 lg:h-80 w-auto mx-auto drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]"
              data-hero-keepout="logo"
              {...HIGH_FETCH_PRIORITY}
            />
            {/* `acceptingApplications`: the button disappears when the
                window closes AND when every division has filled its
                places, which is the same thing to somebody looking for a
                way in. */}
            {appSettings.acceptingApplications && (
              <Link
                to="/join"
                className="inline-block mt-16 px-14 py-5 bg-background text-foreground font-serif text-xl hover:opacity-90 transition-opacity"
                data-hero-keepout="action"
              >
                {/* Wording and weighting come from the shared label, which the
                    Recruiting preview renders too. See
                    components/shared/ApplicationsOpenLabel.tsx. */}
                <ApplicationsOpenLabel />
              </Link>
            )}
          </div>
        </div>

        {/* Key Figures - inside hero so it appears within initial viewport.
            The three figures are centred in the band: the padding is
            SYMMETRIC and the row aligns on its centre, so the block sits in
            the middle of the white rather than riding its top edge. That is
            also why re-centring them needs no separate change - it follows
            from the padding staying equal top and bottom.

            A FIFTH TALLER ON A PHONE, AND ONLY ON A PHONE. Measured at
            390x844 the band was 231px: 64px of padding at each end around a
            103px row, which is 27% of the hero. 87px at each end around the
            same row is 277px, a 19.9% increase, and the photograph above
            gives up exactly those 46px because it is the flexible element in
            a full-height column. From `md` upwards the padding is 96px as
            before, so the desktop composition - 344px of white over a 556px
            photograph at 1440x900 - is untouched. */}
        <div className="relative z-10 bg-background">
          <div className="container py-[5.4375rem] md:py-24">

            {/* ALIGNED BY THE NUMERALS, NOT BY THE MIDDLE OF EACH CELL.
                With `items-center`, a cell whose label wraps onto a second
                line is taller than its neighbours and its contents are
                centred against theirs - so on a narrow screen, where
                "Research Reports" wraps and "Alumni Network" does not, the
                three figures sat at three different heights. `items-start`
                puts the three numerals on one line, which is what the row
                is for, and lets the labels below run to whatever depth they
                need. On a desktop no label wraps, so nothing changes. */}
            <div className="grid grid-cols-3 items-start gap-2 md:gap-12">
              <Link
                to="/archive"
                title={reportsFigure ? describeKeyNumber(reportsFigure) : undefined}
                className="text-center py-4 md:py-6 border-r border-separator last:border-r-0 hover:opacity-80 transition-opacity"
              >
                <p className="font-serif text-[clamp(1.95rem,9.6vw,2.25rem)] sm:text-5xl md:text-hero text-primary mb-1 md:mb-2 whitespace-nowrap">
                  <HeroFigure figure={reportsFigure} />
                </p>
                <p className="font-body text-[0.65rem] sm:text-xs md:text-body text-muted-foreground uppercase tracking-wider">Research Reports</p>
              </Link>
              <Link
                to="/people/members"
                title={membersFigure ? describeKeyNumber(membersFigure) : undefined}
                className="text-center py-4 md:py-6 border-r border-separator last:border-r-0 hover:opacity-80 transition-opacity"
              >
                <p className="font-serif text-[clamp(1.95rem,9.6vw,2.25rem)] sm:text-5xl md:text-hero text-primary mb-1 md:mb-2 whitespace-nowrap">
                  <HeroFigure figure={membersFigure} />
                </p>
                <p className="font-body text-[0.65rem] sm:text-xs md:text-body text-muted-foreground uppercase tracking-wider">Active Members</p>
              </Link>
              <Link
                to="/people/alumni"
                title={alumniFigure ? describeKeyNumber(alumniFigure) : undefined}
                className="text-center py-4 md:py-6 hover:opacity-80 transition-opacity"
              >
                <p className="font-serif text-[clamp(1.95rem,9.6vw,2.25rem)] sm:text-5xl md:text-hero text-primary mb-1 md:mb-2 whitespace-nowrap">
                  <HeroFigure figure={alumniFigure} />
                </p>
                <p className="font-body text-[0.65rem] sm:text-xs md:text-body text-muted-foreground uppercase tracking-wider">Alumni Network</p>
              </Link>
            </div>
          </div>
        </div>
      </section>



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
        <FundPerformanceChart funds={['long-short', 'multi-asset']} title="Funds Performance" />
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
    </>
  );
};

export default Index;
