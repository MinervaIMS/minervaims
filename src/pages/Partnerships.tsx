import { Fragment } from "react";
import { Helmet } from "react-helmet-async";
import { PageIntroduction, PageLoader } from "@/components/shared";
import { useImagePreload } from "@/hooks/useImagePreload";
import milanBgAsset from "@/assets/MIMS_Milan_Background.webp.asset.json";

interface Format {
  title: string;
  duration: string;
  audience: string;
  format: string;
  description: string;
}

const FORMATS: Format[] = [
  {
    title: "On-campus panel or lecture",
    duration: "60–90 minutes, between 18:30 and 20:30",
    audience: "50–200 students, open to the Bocconi community",
    format: "In person, moderated by a Bocconi Core Faculty member",
    description:
      "A member of your team joins a structured panel discussion on a theme of substantive professional and academic interest. On-campus events with external speakers require a Bocconi Core Faculty moderator.",
  },
  {
    title: "In-company visit",
    duration: "Couple of hours, half or full day",
    audience: "15–45 Society members",
    format: "On-site at your offices",
    description:
      "A selected delegation visits your offices for a structured programme covering divisional operations, current areas of focus, and exchanges with junior and senior professionals.",
  },
  {
    title: "Online seminar or panel",
    duration: "45–75 minutes",
    audience: "Variable; open to the community or reserved to members",
    format: "Remote, via Microsoft Teams",
    description:
      "Professionals deliver a session in a structured online format. When open to the community, the same moderation and panel requirements as on-campus events apply.",
  },
  {
    title: "Editorial exchange",
    duration: "By arrangement",
    audience: "Society analysts and division heads",
    format: "In person or remote",
    description:
      "A private engagement with our research divisions around a specific theme — a briefing, closed roundtable, or informal exchange in connection with one of our publications.",
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

const ROW_LABELS: { key: keyof Format; label: string }[] = [
  { key: "duration", label: "Duration" },
  { key: "audience", label: "Audience" },
  { key: "format", label: "Format" },
  { key: "description", label: "Description" },
];

const Partnerships = () => {
  const milanBg = milanBgAsset.url;
  const imagesLoaded = useImagePreload([milanBg]);

  if (!imagesLoaded) {
    return <PageLoader />;
  }

  return (
    <>
      <Helmet>
        <title>Partnerships | MIMS</title>
        <meta
          name="description"
          content="Structured formats for collaboration between Minerva Investment Management Society and financial institutions, asset managers, advisory firms, and corporates."
        />
      </Helmet>

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

      {/* SECTION 1 — Lead + intro */}
      <section className="py-section-sm md:py-section bg-background">
        <div className="container">
          <p className="font-serif text-xl sm:text-2xl md:text-subheading leading-snug text-accent max-w-3xl">
            Structured formats for collaboration with financial institutions, asset managers, advisory firms, and corporates.
          </p>
          <p className="font-body text-body-lg text-muted-foreground max-w-3xl mt-5">
            Minerva Investment Management Society welcomes engagement with partners whose interests align with our commitment to rigorous financial research and academic excellence. We offer a range of structured formats, governed by the framework Bocconi University establishes for its recognised student associations.
          </p>
        </div>
      </section>

      {/* SECTION 2 — Formats */}
      <section className="pb-section-sm md:pb-section bg-background">
        <div className="container">
          <h2 className="font-serif text-xl sm:text-heading mb-6 pb-3 border-b border-separator text-accent">
            Formats
          </h2>

          {/* Mobile: cards */}
          <div className="md:hidden space-y-4">
            {FORMATS.map((f) => (
              <article
                key={f.title}
                className="bg-muted p-5 transition-colors hover:bg-[#ece9f4]"
              >
                <h3 className="font-serif text-subheading text-accent">{f.title}</h3>
                <dl className="mt-4 space-y-3">
                  {ROW_LABELS.map(({ key, label }) => (
                    <div key={label}>
                      <dt className="font-body text-xs uppercase tracking-[.08em] text-muted-foreground">
                        {label}
                      </dt>
                      <dd className="font-body text-body text-foreground mt-1">
                        {f[key]}
                      </dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>

          {/* Tablet/desktop: comparison matrix */}
          <div className="hidden md:block overflow-x-auto">
            <div className="grid grid-cols-[128px_repeat(4,1fr)] min-w-[860px]">
              {/* header row */}
              <div />
              {FORMATS.map((f) => (
                <div
                  key={`h-${f.title}`}
                  className="p-[18px] border-l border-separator font-serif text-lg text-accent leading-snug"
                >
                  {f.title}
                </div>
              ))}

              {/* attribute rows */}
              {ROW_LABELS.map(({ key, label }) => (
                <Fragment key={label}>
                  <div className="py-4 pr-4 font-body uppercase tracking-[.1em] text-xs text-muted-foreground self-start">
                    {label}
                  </div>
                  {FORMATS.map((f) => (
                    <div
                      key={`${label}-${f.title}`}
                      className={`p-4 border-l border-separator font-body text-small leading-relaxed ${
                        key === "description" ? "text-muted-foreground" : "text-foreground"
                      }`}
                    >
                      {f[key]}
                    </div>
                  ))}
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3 — Establish a partnership (navy block) */}
      <section className="pb-section-sm md:pb-section bg-background">
        <div className="container">
          <div className="bg-accent p-8 md:p-12">
            <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-8 md:gap-10 items-center">
              <div>
                <h2 className="font-serif text-xl sm:text-heading text-background">
                  Let's talk about your goals with Minerva IMS
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

      {/* SECTION 4 — Engagement framework */}
      <section className="py-section-sm md:py-section bg-muted">
        <div className="container">
          <h2 className="font-serif text-xl sm:text-heading mb-6 pb-3 border-b border-separator text-accent">
            Engagement framework
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
