import { useState, useEffect } from "react";
import { Seo } from '@/components/shared/Seo';
import { Link } from "react-router-dom";
import logoWhite from "@/assets/footer-logo.svg";
import homepageBgAsset from "@/assets/mims-homepage.webp.asset.json";
import { ReportsSection, archiveFilesToReports, ArchiveFileRow } from "@/components/shared/ReportsSection";
import AlumniTicker from "@/components/shared/AlumniTicker";
import { TestimonialsSection } from "@/components/shared/TestimonialsSection";
import { PageLoader } from "@/components/shared";
import DivisionScrollStack from "@/components/shared/DivisionScrollStack";
import { FundPerformanceChart } from "@/components/shared/FundPerformanceChart";
import { useKeyFigures } from "@/hooks/useKeyFigures";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import { useApplicationSettings } from "@/hooks/useApplicationSettings";
import { useImagePreload } from "@/hooks/useImagePreload";
import { HERO_OVERLAY_URL } from "@/lib/hero-overlay";
import { supabase } from "@/integrations/supabase/client";
import { ApplicationsOpenLabel } from "@/components/shared/ApplicationsOpenLabel";
import { HIGH_FETCH_PRIORITY } from '@/lib/fetch-priority';

interface ArchiveFile extends ArchiveFileRow {
  id: string;
}

/**
 * One of the three key figures.
 *
 * TWO THINGS USED TO PRODUCE A ZERO ON THE HOMEPAGE.
 *
 * The count-up only runs against a real value, but the component was
 * called with `isLoading={false}` regardless, so from the first paint
 * until the figures arrived - and FOREVER if the request failed - the
 * page announced "0+ Research Reports". It now takes the hook's real
 * loading state, and treats a zero as "not here yet" in its own right,
 * because zero is never a true answer for any of these three.
 *
 * A SPAN, NOT A `<Skeleton>`, WHICH IS A DIV. The placeholder stands
 * inside the `<p>` that carries the numeral's typography, and a `<div>`
 * is not valid inside a `<p>`: the parser closes the paragraph early and
 * lets the placeholder out of it, so during loading the figure's box sat
 * outside the type context it is measured against. It is a span carrying
 * the same pulse `Skeleton` uses. (The same fault was fixed on /join; see
 * JoinFigures.)
 *
 * IT IS SIZED IN `em`, so it tracks the type it stands in for at every
 * breakpoint by itself. A fixed height would have to be restated for each
 * of the three sizes the numeral takes - 2.25rem on a phone, 3rem, 4rem -
 * and would move the line the moment any of them changed. One line box
 * high and about four digits wide, whatever those happen to be.
 */
const AnimatedFigure = ({ value, isLoading }: { value: number; isLoading: boolean }) => {
  const animatedValue = useAnimatedCounter(value, 3200, !isLoading && value > 0);

  if (isLoading || value <= 0) {
    return (
      <span
        aria-hidden="true"
        className="mx-auto block animate-pulse rounded-md bg-muted"
        style={{ height: '1.2em', width: '2.2em' }}
      />
    );
  }

  return <>{animatedValue}+</>;
};

const Index = () => {
  const homepageBg = homepageBgAsset.url;
  const { counts, isLoading: isKeyFiguresLoading } = useKeyFigures();
  const { settings: appSettings } = useApplicationSettings();
  const [carouselFiles, setCarouselFiles] = useState<ArchiveFile[]>([]);
  const [isCarouselLoading, setIsCarouselLoading] = useState(true);
  // BOTH LAYERS OF THE HERO, NOT ONE OF THEM.
  // The dark wash over the photograph is a second downloaded image (see
  // lib/hero-overlay.ts), and it used to be absent from this list. So the
  // photograph was fetched from mount while the overlay was not started
  // until the hero rendered: the picture was GUARANTEED to be ready first,
  // and the reader met the bright, unshaded image before the wash arrived.
  // Preloading them together is what makes the hero one state instead of two.
  const imagesLoaded = useImagePreload([homepageBg, HERO_OVERLAY_URL, logoWhite]);


  useEffect(() => {
    fetchCarouselFiles();
  }, []);

  const fetchCarouselFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('archive_files')
        .select('id, title, description, file_url, date, division, fund')
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
  if (isKeyFiguresLoading || isCarouselLoading || !imagesLoaded) {
    return <PageLoader />;
  }

  return (
    <>
      <Seo page="/" />

      {/* Hero Section */}
      <section data-page-hero className="relative min-h-screen flex flex-col">
        {/* THE DARK BLOCK, AND ONLY IT, CARRIES THE PHOTOGRAPH.
            The image used to be `inset-0` on the whole hero, which includes
            the white figures band beneath: `bg-center` therefore centred the
            picture on a box whose bottom third is covered, so what a reader
            actually saw was the top of the photograph and never its middle.
            Bounding the image to the block it is seen in makes `bg-center`
            mean what it says.

            It is also the element the navbar measures. `data-nav-flip`
            marks the end of the dark ground, so the header turns solid the
            moment the white band reaches it rather than a whole band
            later. */}
        <div
          data-nav-flip
          className="relative flex-1 flex items-center justify-center text-center px-6 pt-20 pb-20 md:pt-24 md:pb-24"
        >
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${homepageBg})` }} />
          <div className="absolute inset-0 hero-overlay" />
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
            <img
              src={logoWhite}
              alt="Minerva Investment Management Society"
              className="h-48 md:h-64 lg:h-80 w-auto mx-auto drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]"
              {...HIGH_FETCH_PRIORITY}
            />
            {appSettings.applicationsOpen && (
              <Link
                to="/join"
                className="inline-block mt-16 px-14 py-5 bg-background text-foreground font-serif text-xl hover:opacity-90 transition-opacity"
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
                className="text-center py-4 md:py-6 border-r border-separator last:border-r-0 hover:opacity-80 transition-opacity"
              >
                <p className="font-serif text-[clamp(1.95rem,9.6vw,2.25rem)] sm:text-5xl md:text-hero text-primary mb-1 md:mb-2 whitespace-nowrap">
                  <AnimatedFigure value={counts.reports} isLoading={isKeyFiguresLoading} />
                </p>
                <p className="font-body text-[0.65rem] sm:text-xs md:text-body text-muted-foreground uppercase tracking-wider">Research Reports</p>
              </Link>
              <Link
                to="/people/members"
                className="text-center py-4 md:py-6 border-r border-separator last:border-r-0 hover:opacity-80 transition-opacity"
              >
                <p className="font-serif text-[clamp(1.95rem,9.6vw,2.25rem)] sm:text-5xl md:text-hero text-primary mb-1 md:mb-2 whitespace-nowrap">
                  <AnimatedFigure value={counts.members} isLoading={isKeyFiguresLoading} />
                </p>
                <p className="font-body text-[0.65rem] sm:text-xs md:text-body text-muted-foreground uppercase tracking-wider">Active Members</p>
              </Link>
              <Link to="/people/alumni" className="text-center py-4 md:py-6 hover:opacity-80 transition-opacity">
                <p className="font-serif text-[clamp(1.95rem,9.6vw,2.25rem)] sm:text-5xl md:text-hero text-primary mb-1 md:mb-2 whitespace-nowrap">
                  <AnimatedFigure value={counts.alumni} isLoading={isKeyFiguresLoading} />
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
    </>
  );
};

export default Index;
