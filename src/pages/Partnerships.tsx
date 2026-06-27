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
      "A member of your team participates in a structured panel discussion on a theme of substantive professional and academic interest. All on-campus events with external speakers require the presence of a Bocconi Core Faculty member acting as moderator.",
  },
  {
    title: "In-company visit",
    duration: "Couple of hours, half or full day",
    audience: "15–45 Society members",
    format: "On-site at your offices",
    description:
      "A selected delegation of Society members visits your offices for a structured programme covering divisional operations, current areas of focus, and exchanges with junior and senior professionals.",
  },
  {
    title: "Online seminar or panel",
    duration: "45–75 minutes",
    audience: "Variable; open to the Bocconi community or reserved to Society members",
    format: "Remote, via Microsoft Teams",
    description:
      "Professionals deliver a session in a structured online format. When open to the broader community, the session follows the same moderation and panel requirements as on-campus events.",
  },
  {
    title: "Editorial exchange",
    duration: "By arrangement",
    audience: "Society analysts and division heads",
    format: "In person or remote",
    description:
      "A private engagement with our research divisions, structured around a specific theme or area of inquiry. This may take the form of a briefing, a closed roundtable, or an informal exchange in connection with one of our publications.",
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
          content="Partnership formats and engagement framework for companies and financial institutions collaborating with Minerva Investment Management Society."
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

      {/* SECTION 1 — Introduction */}
      <section className="py-section-sm md:py-section bg-background">
        <div className="container">
          <div className="max-w-4xl">
            <p className="font-body text-body-lg text-muted-foreground">
              Minerva Investment Management Society welcomes engagement with financial institutions, asset managers, advisory firms, and corporates whose interests align with our commitment to rigorous financial research and academic excellence. We offer a range of structured formats for collaboration, governed by the framework Bocconi University establishes for its recognised student associations. The following sets out what we can offer and the terms under which engagements are conducted.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 2 — Formats */}
      <section className="py-section-sm md:py-section bg-background">
        <div className="container">
          <h2 className="font-serif text-xl sm:text-heading mb-6 pb-3 border-b border-separator text-accent">
            Formats
          </h2>
          <p className="font-body text-body-lg text-muted-foreground mb-8">
            We can accommodate the following types of engagement.
          </p>

          {/* Mobile: cards */}
          <div className="md:hidden space-y-4">
            {FORMATS.map((f) => (
              <article
                key={f.title}
                className="bg-muted p-[1.1rem] flex flex-col"
              >
                <h3 className="font-serif text-[1.12rem] text-accent">{f.title}</h3>
                <dl className="mt-4 space-y-3">
                  {ROW_LABELS.map(({ key, label }) => (
                    <div key={label}>
                      <dt className="font-body text-[.72rem] uppercase tracking-[.08em] text-muted-foreground">
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
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left align-bottom font-body text-[.72rem] uppercase tracking-[.16em] text-muted-foreground p-4 border-b border-separator w-[140px]">
                    &nbsp;
                  </th>
                  {FORMATS.map((f) => (
                    <th
                      key={f.title}
                      className="text-left align-bottom font-serif text-[1.05rem] text-accent p-4 border-b border-separator"
                    >
                      {f.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROW_LABELS.map(({ key, label }, idx) => (
                  <tr
                    key={label}
                    className={idx % 2 === 1 ? "bg-[#F2F2F2]" : ""}
                  >
                    <td className="align-top font-body text-[.72rem] uppercase tracking-[.16em] text-muted-foreground p-4 border-b border-separator">
                      {label}
                    </td>
                    {FORMATS.map((f) => (
                      <td
                        key={f.title + label}
                        className="align-top font-body text-body text-foreground p-4 border-b border-separator"
                      >
                        {f[key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SECTION 3 — Framework */}
      <section className="py-section-sm md:py-section bg-background">
        <div className="container">
          <h2 className="font-serif text-xl sm:text-heading mb-6 pb-3 border-b border-separator text-accent">
            Framework
          </h2>
          <p className="font-body text-body-lg text-muted-foreground mb-8">
            All partnerships are conducted within the regulatory framework of the CASA Committee, Universit&agrave; Bocconi&rsquo;s student association oversight committee. The following parameters apply.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left font-serif text-[1.05rem] text-accent p-4 border-b border-separator w-1/3">
                    Topic
                  </th>
                  <th className="text-left font-serif text-[1.05rem] text-accent p-4 border-b border-separator">
                    Terms
                  </th>
                </tr>
              </thead>
              <tbody>
                {FRAMEWORK.map((row, idx) => (
                  <tr key={row.topic} className={idx % 2 === 1 ? "bg-[#F2F2F2]" : ""}>
                    <td className="align-top font-body text-body text-foreground p-4 border-b border-separator">
                      {row.topic}
                    </td>
                    <td className="align-top font-body text-body text-muted-foreground p-4 border-b border-separator">
                      {row.terms}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SECTION 4 — Establish a partnership */}
      <section className="py-section-sm md:py-section bg-background">
        <div className="container">
          <h2 className="font-serif text-xl sm:text-heading mb-6 pb-3 border-b border-separator text-accent">
            Establish a partnership
          </h2>
          <div className="max-w-4xl">
            <p className="font-body text-body-lg text-muted-foreground">
              To explore a collaboration, please write to{" "}
              <a
                href="mailto:as.minerva@unibocconi.it"
                className="underline underline-offset-4 text-accent"
              >
                as.minerva@unibocconi.it
              </a>{" "}
              with a brief description of the proposed format, the relevant topic or theme, and the individuals likely to be involved. We will respond within two business days to confirm next steps.
            </p>
          </div>
        </div>
      </section>
    </>
  );
};

export default Partnerships;
