import { Fragment } from "react";
import { Seo } from '@/components/shared/Seo';
import { PageIntroduction, PageLoader } from "@/components/shared";
import { useImagePreload } from "@/hooks/useImagePreload";
import { HERO_OVERLAY_URL } from "@/lib/hero-overlay";
import milanBgAsset from "@/assets/MIMS_Milan_Background-v2.webp.asset.json";

interface Format {
  title: string;
  duration: string;
  audience: string;
  format: string;
  description: string;
}

const FORMATS: Format[] = [
  {
    title: "1. On-campus Guest Speakers Panel",
    duration: "60 - 90 minutes, between 18:30 and 20:30",
    audience: "50 - 150 students, open to the Bocconi community",
    format: "In person, moderated by a Bocconi Core Faculty member",
    description:
      "A member of your team participates in a structured panel discussion on a theme of substantive professional and academic interest. All on-campus events with external speakers require the presence of a Bocconi Core Faculty member acting as moderator.",
  },
  {
    title: "2. In-company Visit",
    duration: "Few hours, half or full day",
    audience: "15 - 45 Society members",
    format: "On-site at your offices",
    description:
      "A selected delegation of Society members visits your offices for a structured programme covering divisional operations, current areas of focus, and exchanges with junior and senior professionals.\n",
  },
  {
    title: "3. Online Seminar or Guest Speakers Panel",
    duration: "45 - 90 minutes",
    audience: "Variable; open to the community or reserved to members",
    format: "Remote, via Microsoft Teams",
    description:
      "Professionals deliver a session in a structured online format. When open to the broader community, the session follows the same moderation and panel requirements as on-campus events.",
  },
  {
    title: "4. Case Study & Editorial Exchange",
    duration: "60 - 120 minutes\n",
    audience: "Society analysts and division heads",
    format: "In person or remote",
    description:
      "A private engagement with our research divisions, structured around a specific theme or area of inquiry. This may take the form of a briefing, a closed roundtable, or an informal exchange in connection with one of our publications.\n",
  },
];

const FRAMEWORK: { topic: string; terms: string }[] = [
  {
    topic: "Content and theme",
    terms:
      "All events must address a topic of substantive and general interest. Sessions may not function as a presentation of a single firm, product, or service.",
  },
  {
    topic: "Panel composition",
    terms:
      "A minimum of two external speakers is required for on-campus and online events. No more than two speakers from the same organisation may participate. Gender diversity within every panel is mandatory.",
  },
  {
    topic: "Academic moderation",
    terms:
      "A Bocconi Core Faculty member must moderate all events involving external speakers open to the student community.",
  },
  {
    topic: "Lead time",
    terms:
      "A minimum of five to six weeks is required prior to the proposed date to accommodate internal approvals, room allocation, and faculty coordination.",
  },
  {
    topic: "Branding and logos",
    terms:
      "Partner logos may not appear on event materials, posters, social media content, or the Society website. Where pre-approved by the University, the written acknowledgement \u201Cin collaboration with\u2026\u201D may be used.",
  },
  {
    topic: "Continuative agreements",
    terms:
      "The Society cannot enter into formal multi-initiative framework agreements. Each engagement is submitted for approval individually.",
  },
  {
    topic: "Financial sponsorship",
    terms:
      "Where a company wishes to provide financial support for an initiative, such arrangements are managed through Bocconi\u2019s Market & Partners office and are not administered by the Society directly.",
  },
  {
    topic: "Approval process",
    terms:
      "Initiatives open to the student community are subject to approval by the Comitato CASA, Bocconi\u2019s student activity committee.",
  },
];

/**
 * The three practical facts, which sit together beneath the explanation.
 *
 * `description` is deliberately NOT here: it is the sentence that says
 * what the format is, and it is set as prose above rather than as the
 * fourth row of a specification.
 */
const SPEC_LABELS: { key: 'duration' | 'audience' | 'format'; label: string }[] = [
  { key: "duration", label: "Duration" },
  { key: "audience", label: "Audience" },
  { key: "format", label: "Format" },
];

/**
 * "1. On-campus Guest Speakers Panel" -> "On-campus Guest Speakers Panel".
 *
 * The numbers used to be typed into the titles. They are drawn from the
 * list's own order now, so this removes a prefix if one is still there and
 * leaves a title that never had one alone. It means the copy can be edited
 * either way round without the numeral appearing twice.
 */
const stripLeadingNumber = (title: string) => title.replace(/^\s*\d+[.)]\s*/, '');

const Partnerships = () => {
  const milanBg = milanBgAsset.url;
    // The dark wash over the hero is a SECOND downloaded image, not a gradient
  // (see lib/hero-overlay.ts). Preloading it with the photograph is what stops
  // the page opening on the bright, unshaded picture and darkening a moment
  // later. Both `.hero-overlay` and `.page-intro-overlay` use this same asset.
  const imagesLoaded = useImagePreload([milanBg, HERO_OVERLAY_URL]);

  if (!imagesLoaded) {
    return <PageLoader />;
  }

  return (
    <>
      <Seo page="/partnerships" />

      <div data-page-hero className="relative">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${milanBg})` }}
        />
        <div className="absolute inset-0 hero-overlay" />
        <div className="relative z-10">
          <PageIntroduction title="Partnerships" transparentBackground />
        </div>
      </div>

      {/* SECTION 1: Lead + intro */}
      <section className="py-section-sm md:py-section bg-background">
        <div className="container">
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">
            Let's make it happen
          </h2>
          <p className="font-body text-body-lg text-muted-foreground max-w-3xl">
            Minerva Investment Management Society welcomes engagement with partners whose interests align with our commitment to rigorous financial research and academic excellence.&nbsp;
            <br />
            We offer a range of structured formats, each governed by the framework Bocconi University establishes for its recognised student associations.
          </p>
        </div>
      </section>

      {/* SECTION 2: Establish a partnership (navy block) */}
      <section className="pb-section-sm md:pb-section bg-background">
        <div className="container">
          <div className="bg-accent p-8 md:p-12">
            <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-8 md:gap-10 items-center">
              <div>
                <h2 className="font-serif text-heading text-background">
                  Begin the Conversation to Partner with Minerva
                </h2>
                <p className="font-body text-body-lg text-background/85 mt-4 max-w-xl leading-relaxed">
                  Write to us with a brief description of the proposed format, the relevant theme, and those likely to be involved.&nbsp;
                </p>
              </div>
              <div className="md:justify-self-end md:text-right">
                <div className="font-body uppercase tracking-[.1em] text-xs text-background/70">
                  Write to
                </div>
                <a
                  href="mailto:as.minerva@unibocconi.it"
                  className="block font-serif text-2xl md:text-3xl text-background mt-2.5 underline-offset-4 hover:underline break-words"
                >
                  as.minerva@unibocconi.it
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: Formats */}
      <section className="pb-section-sm md:pb-section bg-background">
        <div className="container">
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">
            Collaboration Formats
          </h2>

          <p className="font-body text-body-lg text-muted-foreground mb-8 max-w-3xl">
            Four ways an organisation works with the Society. Each card explains what the format is, and closes with what it costs in practical terms: how long, for whom, and where.
          </p>

          {/* ═══════════════════════════════════════════════════════════════
              FOUR FORMATS, EACH READ IN THE ORDER SOMEBODY ASKS ABOUT IT.
              ---------------------------------------------------------------
              The cards used to be a title over a four-row description list:
              Duration, Audience, Format and Description, each label the same
              size and the same colour as the last, and the paragraph that
              explains what the thing actually IS sitting fourth, in the same
              treatment as "45 - 90 minutes". A reader deciding between four
              formats had to read sixteen equally weighted lines to find the
              four sentences that distinguish them.

              The order is now the order of the question. The number and the
              name identify it; the paragraph explains it, in the body size
              the site uses for reading; and the three practical facts sit
              beneath a hairline as a specification strip, three to a row,
              small and uppercase, which is how the rest of the site sets
              metadata. Nothing was removed and no wording changed.

              The numeral is drawn from the position in the list rather than
              typed into the title, so the four can be reordered without
              renumbering them by hand.
              ═══════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {FORMATS.map((f, i) => (
              <article
                key={f.title}
                /* The accent rule along the top is the treatment the site
                   already gives a card that is one of a set: it separates
                   the four without four boxes of visible border, and it is
                   what turns the hover into a considered change of state
                   rather than a grey square going slightly less grey. */
                className="flex flex-col bg-muted border-t-2 border-accent p-6 md:p-7 transition-colors hover:bg-[#ece9f4]"
              >
                <div className="flex items-baseline gap-3">
                  <span aria-hidden className="font-serif text-display leading-none text-accent/30 tabular-nums">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="font-serif text-subheading text-accent">
                    {stripLeadingNumber(f.title)}
                  </h3>
                </div>

                {/* `flex-1` so the specification strips of two cards side by
                    side sit on the same line however long the paragraphs are. */}
                <p className="font-body text-body leading-relaxed text-muted-foreground mt-4 flex-1">
                  {f.description.trim()}
                </p>

                <dl className="mt-6 pt-4 border-t border-separator grid grid-cols-1 sm:grid-cols-3 gap-x-5 gap-y-4">
                  {SPEC_LABELS.map(({ key, label }) => (
                    <div key={label}>
                      <dt className="font-body text-xs uppercase tracking-[.08em] text-muted-foreground">
                        {label}
                      </dt>
                      <dd className="font-body text-small leading-snug text-foreground mt-1">
                        {f[key].trim()}
                      </dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4: Engagement framework */}
      <section className="py-section-sm md:py-section bg-muted">
        <div className="container">
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">
            Regulatory&nbsp;Framework for&nbsp;Engagement
          </h2>
          <p className="font-body text-body-lg text-muted-foreground mt-2">
            All initiatives are conducted within the regulatory framework Bocconi University establishes for its recognised student associations.
          </p>

          <div className="mt-6 border-b border-separator">
            {FRAMEWORK.map((row) => (
              <div
                key={row.topic}
                className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-3 md:gap-8 py-5 border-t border-separator"
              >
                <div className="font-serif text-lg md:text-xl text-accent">
                  {row.topic}
                </div>
                <div className="font-body text-body leading-relaxed text-muted-foreground">
                  {row.terms}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default Partnerships;
