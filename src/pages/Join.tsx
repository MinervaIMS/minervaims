import { Helmet } from 'react-helmet-async';
import AlumniTicker from '@/components/shared/AlumniTicker';
import ApplicationCta from '@/components/join/ApplicationCta';
import DivisionVideoRail from '@/components/join/DivisionVideoRail';
import JoinFaq from '@/components/join/JoinFaq';
import JoinFigures from '@/components/join/JoinFigures';
import JoinHeroStage from '@/components/join/JoinHeroStage';
import JoinJourney from '@/components/join/JoinJourney';
import WrittenQuestions from '@/components/join/WrittenQuestions';
import { useApplicationSettings } from '@/hooks/useApplicationSettings';
import {
  JOIN_JOURNEY,
  JOIN_SOCIETY,
  JOIN_STATUS_COPY,
  JOIN_WRITTEN,
} from '@/lib/join-content';

// Note on splitting: the heavy things on this page are the particle canvas and
// the five cinemagraphs, and both are deferred at the point of use (DotField is
// a lazy import inside JoinHeroStage; the videos carry poster frames and
// preload="metadata" and only the visible card plays). The rail and FAQ
// components themselves are a few kilobytes of markup, so importing them
// eagerly keeps the section heights reserved from first paint and avoids the
// large layout shift a Suspense swap would otherwise introduce.
const META_DESCRIPTION =
  'Admissions to Minerva Investment Management Society, the Bocconi student society founded in 2019 and dedicated to asset management. Five core research divisions, two student-managed funds, one intake each academic semester.';

const Join = () => {
  const { settings, isLoading } = useApplicationSettings();

  const status = {
    applicationsOpen: settings.applicationsOpen,
    semesterLabel: settings.semesterLabel,
    endDate: settings.endDate,
    isConfigured: settings.isConfigured,
    isLoading,
  };

  return (
    <>
      <Helmet>
        <title>Join Us | MIMS</title>
        <meta name="description" content={META_DESCRIPTION} />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Minerva Investment Management Society',
            alternateName: 'MIMS',
            foundingDate: '2019',
            description: META_DESCRIPTION,
            url: 'https://minervaims.org/join',
            parentOrganization: { '@type': 'CollegeOrUniversity', name: 'Bocconi University' },
          })}
        </script>
      </Helmet>

      {/* Hero + Status share the dark stage; the white band below carries the cue. */}
      <JoinHeroStage figures={<JoinFigures tone="dark" />}>
        <ApplicationCta
          {...status}
          tone="light"
          closedBody={JOIN_STATUS_COPY.closedBodyTop}
          headingId="join-status-heading"
        />
      </JoinHeroStage>

      {/* 01 The Society */}
      <section aria-labelledby="join-society-heading" className="bg-background py-section-sm md:py-section">
        <div className="container">
          <h2
            id="join-society-heading"
            className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent"
          >
            {JOIN_SOCIETY.heading}
          </h2>
          <p className="font-body text-body-lg text-muted-foreground max-w-3xl">
            {JOIN_SOCIETY.lead}
          </p>

          <div className="mt-12 grid grid-cols-1 gap-10 md:mt-16 md:grid-cols-2 md:gap-14">
            {JOIN_SOCIETY.statements.map((statement) => (
              <div key={statement.title} className="grid grid-cols-[auto_1fr] gap-5 md:gap-7">
                <span
                  aria-hidden="true"
                  className="select-none leading-[0.8] text-accent/25"
                  style={{
                    fontFamily: "'Times New Roman', Times, Georgia, serif",
                    fontSize: 'clamp(4.5rem, 13.2vw, 7.8rem)',
                  }}
                >
                  {statement.figure}
                </span>
                <div>
                  <h3 className="font-serif text-subheading text-accent">
                    <span className="sr-only">{statement.figure} </span>
                    {statement.title}
                  </h3>
                  <p className="font-body text-body text-muted-foreground mt-3 leading-relaxed">
                    {statement.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 02 The Divisions */}
      <DivisionVideoRail />

      {/* 03 Alumni: the homepage section, unchanged. */}
      <AlumniTicker />

      {/* 04 Admissions */}
      <section aria-labelledby="join-journey-heading" className="bg-background py-section-sm md:py-section">
        <div className="container">
          <h2
            id="join-journey-heading"
            className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent"
          >
            {JOIN_JOURNEY.heading}
          </h2>
          <p className="font-body text-body-lg text-muted-foreground max-w-3xl mb-12">
            {JOIN_JOURNEY.lead}
          </p>
          <JoinJourney />
        </div>
      </section>

      {/* 05 The Written Question */}
      <section aria-labelledby="join-written-heading" className="bg-background pb-section-sm md:pb-section">
        <div className="container">
          <h2
            id="join-written-heading"
            className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent"
          >
            {JOIN_WRITTEN.heading}
          </h2>
          <WrittenQuestions />
        </div>
      </section>

      {/* Close: mirrors the Status block, same source, same two states. */}
      <section aria-labelledby="join-close-heading" className="bg-background pb-section-sm md:pb-section">
        <div className="container">
          <ApplicationCta
            {...status}
            tone="dark"
            closedBody={JOIN_STATUS_COPY.closedBodyBottom}
            headingId="join-close-heading"
          />
        </div>
      </section>

      {/* FAQs */}
      <JoinFaq />
    </>
  );
};

export default Join;
