import { Link } from "react-router-dom";
import logoWhite from "@/assets/footer-logo.svg";
import { HeroFigure } from "@/components/numbers/HeroFigure";
import { describeKeyNumber, type KeyNumber } from "@/lib/key-numbers";
import { HeroMarketBackground } from "@/components/home/HeroMarketBackground";
import { ApplicationsOpenLabel } from "@/components/shared/ApplicationsOpenLabel";
import { HIGH_FETCH_PRIORITY } from '@/lib/fetch-priority';

/** The homepage logo, which is also the first screen's largest picture. */
export const HOME_HERO_LOGO = logoWhite;

interface HomeHeroProps {
  reportsFigure: KeyNumber | null;
  membersFigure: KeyNumber | null;
  alumniFigure: KeyNumber | null;
  /** The "Applications Are Open" button is shown. */
  acceptingApplications: boolean;
  /**
   * Reads when the figures start counting, if the first screen was drawn
   * from the HTML and is counting already (lib/prerender.ts); they carry on
   * from there instead of starting again.
   */
  countFrom?: (() => number) | null;
}

/**
 * THE HOMEPAGE HERO, AS ONE PIECE (Step 102).
 *
 * The markup is the homepage's own, moved here unchanged from pages/Index.tsx
 * so that two things draw exactly the same first screen: the app, and the
 * build, which writes it into the HTML of the homepage (vite.prerender.ts) so
 * that it is on screen before the app's scripts have arrived. Anything
 * changed here changes both, which is the point.
 */
export function HomeHero({
  reportsFigure, membersFigure, alumniFigure, acceptingApplications, countFrom = null,
}: HomeHeroProps) {
  return (
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
              width={2300}
              height={2300}
              className="h-48 md:h-64 lg:h-80 w-auto mx-auto drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]"
              data-hero-keepout="logo"
              {...HIGH_FETCH_PRIORITY}
            />
            {/* `acceptingApplications`: the button disappears when the
                window closes AND when every division has filled its
                places, which is the same thing to somebody looking for a
                way in. */}
            {acceptingApplications && (
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
                  <HeroFigure figure={reportsFigure} countFrom={countFrom} />
                </p>
                <p className="font-body text-[0.65rem] sm:text-xs md:text-body text-muted-foreground uppercase tracking-wider">Research Reports</p>
              </Link>
              <Link
                to="/people/members"
                title={membersFigure ? describeKeyNumber(membersFigure) : undefined}
                className="text-center py-4 md:py-6 border-r border-separator last:border-r-0 hover:opacity-80 transition-opacity"
              >
                <p className="font-serif text-[clamp(1.95rem,9.6vw,2.25rem)] sm:text-5xl md:text-hero text-primary mb-1 md:mb-2 whitespace-nowrap">
                  <HeroFigure figure={membersFigure} countFrom={countFrom} />
                </p>
                <p className="font-body text-[0.65rem] sm:text-xs md:text-body text-muted-foreground uppercase tracking-wider">Active Members</p>
              </Link>
              <Link
                to="/people/alumni"
                title={alumniFigure ? describeKeyNumber(alumniFigure) : undefined}
                className="text-center py-4 md:py-6 hover:opacity-80 transition-opacity"
              >
                <p className="font-serif text-[clamp(1.95rem,9.6vw,2.25rem)] sm:text-5xl md:text-hero text-primary mb-1 md:mb-2 whitespace-nowrap">
                  <HeroFigure figure={alumniFigure} countFrom={countFrom} />
                </p>
                <p className="font-body text-[0.65rem] sm:text-xs md:text-body text-muted-foreground uppercase tracking-wider">Alumni Network</p>
              </Link>
            </div>
          </div>
        </div>
      </section>
  );
}

export default HomeHero;
